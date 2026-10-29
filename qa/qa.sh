#!/usr/bin/env bash
# Isolated QA environment: its own PostgreSQL 15 container + volume, its own build of the backend revision and
# its own ports. It never reads the backend .env, never connects to caa_db / caa_sp_db_data_final and never
# runs docker prune. Usage: qa/qa.sh {up|down|reset|status|seed|logs|front}
set -euo pipefail

QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT_DIR="$(dirname "$QA_DIR")"
BACKEND_REPO="${BACKEND_REPO:-$FRONT_DIR/../CAA_SP}"
# Backend revision to test. It carries the invitation fix (fix/invitaciones-enum-postgres) until that branch
# is merged; after the merge, set it back to "main" (or export BACKEND_REF=main).
BACKEND_REF="${BACKEND_REF:-fix/invitaciones-enum-postgres}"
WORK="$QA_DIR/.work"            # gitignored: backend copy, jar, logs, generated secrets

# Names and ports are fixed on purpose: every destructive command below acts on exactly these.
QA_CONTAINER="caa_qa_postgres"
QA_VOLUME="caa_qa_pgdata"
QA_DB="caa_qa"
QA_DB_USER="qa_user"
QA_DB_PORT=5455
QA_API_PORT=8081
QA_FRONT_PORT=5174
QA_LABEL="caa.qa=true"

# Hard refusal list: the real databases/volumes/ports of this machine.
FORBIDDEN_PORTS=(5444 54322 8080)
FORBIDDEN_NAMES=(caa_postgres caa_db caa_sp_db_data_final)

guard() {
  local p n
  for p in "${FORBIDDEN_PORTS[@]}"; do
    [[ "$QA_DB_PORT" == "$p" || "$QA_API_PORT" == "$p" ]] && { echo "REFUSED: port $p belongs to a real environment" >&2; exit 2; }
  done
  for n in "${FORBIDDEN_NAMES[@]}"; do
    [[ "$QA_CONTAINER" == "$n" || "$QA_VOLUME" == "$n" || "$QA_DB" == "$n" ]] && { echo "REFUSED: $n is a real resource" >&2; exit 2; }
  done
  return 0
}

port_busy() { ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$1\$"; }

ensure_env() {
  mkdir -p "$WORK"
  if [[ ! -f "$WORK/env.qa" ]]; then
    # Throw-away secrets for this QA environment only.
    {
      echo "QA_DB_PASSWORD=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"
      echo "QA_JWT_SECRET=$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 64)"
    } > "$WORK/env.qa"
    chmod 600 "$WORK/env.qa"
  fi
  # shellcheck disable=SC1091
  source "$WORK/env.qa"
}

db_up() {
  if docker inspect "$QA_CONTAINER" >/dev/null 2>&1; then
    docker start "$QA_CONTAINER" >/dev/null
  else
    port_busy "$QA_DB_PORT" && { echo "REFUSED: port $QA_DB_PORT is busy" >&2; exit 2; }
    # bootstrap.sql runs only on a new empty volume (canonical empty-database bootstrap, final schema).
    docker run -d --name "$QA_CONTAINER" --label "$QA_LABEL" \
      -e POSTGRES_DB="$QA_DB" -e POSTGRES_USER="$QA_DB_USER" -e POSTGRES_PASSWORD="$QA_DB_PASSWORD" \
      -p "127.0.0.1:$QA_DB_PORT:5432" -v "$QA_VOLUME:/var/lib/postgresql/data" \
      -v "$WORK/backend/bootstrap.sql:/docker-entrypoint-initdb.d/init.sql:ro" \
      postgres:15-alpine >/dev/null
  fi
  for _ in $(seq 1 40); do
    docker exec "$QA_CONTAINER" pg_isready -U "$QA_DB_USER" -d "$QA_DB" >/dev/null 2>&1 && return 0
    sleep 1
  done
  echo "QA database did not become ready" >&2; exit 1
}

backend_build() {
  # Exports the committed BACKEND_REF of the backend (read-only on that repo) and builds it in the QA work dir,
  # so a jar already running elsewhere is never overwritten.
  # The QA copy is the committed BACKEND_REF exactly as it is: no patches are applied.
  local key
  key="$(git -C "$BACKEND_REPO" rev-parse --short "$BACKEND_REF")"
  if [[ ! -f "$WORK/backend/.built-$key" ]]; then
    rm -rf "$WORK/backend"; mkdir -p "$WORK/backend"
    git -C "$BACKEND_REPO" archive "$BACKEND_REF" | tar -x -C "$WORK/backend"
    (cd "$WORK/backend" && sh ./mvnw -q -DskipTests package) >"$WORK/build.log" 2>&1 || { tail -20 "$WORK/build.log"; exit 1; }
    touch "$WORK/backend/.built-$key"
  fi
  echo "$key" > "$WORK/backend-head"
}

api_up() {
  if [[ -f "$WORK/api.pid" ]] && kill -0 "$(cat "$WORK/api.pid")" 2>/dev/null; then return 0; fi
  port_busy "$QA_API_PORT" && { echo "REFUSED: port $QA_API_PORT is busy" >&2; exit 2; }
  # Only QA values are passed: external services (Cloudinary, Resend, Google) get inert placeholders.
  env -i PATH="$PATH" HOME="$HOME" \
    DATASOURCE_URL="jdbc:postgresql://localhost:$QA_DB_PORT/$QA_DB" POSTGRES_USER="$QA_DB_USER" POSTGRES_PASSWORD="$QA_DB_PASSWORD" \
    JWT_SECRET="$QA_JWT_SECRET" SERVER_PORT="$QA_API_PORT" COOKIE_SECURE=false \
    CORS_ALLOWED_ORIGINS="http://localhost:$QA_FRONT_PORT" FRONTEND_URL="http://localhost:$QA_FRONT_PORT" \
    CLOUDINARY_CLOUD_NAME=qa-inert CLOUDINARY_API_KEY=qa-inert CLOUDINARY_API_SECRET=qa-inert \
    RESEND_API_KEY=re_qa_inert RESEND_HEALTH_CHECK_ENABLED=false GOOGLE_CLIENT_ID= \
    RATE_LIMIT_LOGIN_MAX=1000 RATE_LIMIT_OLVIDE_PASSWORD_MAX=1000 \
    setsid nohup java -jar "$WORK/backend/target/api-0.0.1-SNAPSHOT.jar" >"$WORK/api.log" 2>&1 </dev/null &
  echo $! > "$WORK/api.pid"
  for _ in $(seq 1 90); do
    curl -s -o /dev/null "http://localhost:$QA_API_PORT/api/usuarios/me" && return 0
    kill -0 "$(cat "$WORK/api.pid")" 2>/dev/null || { tail -30 "$WORK/api.log"; exit 1; }
    sleep 1
  done
  echo "QA API did not start" >&2; tail -30 "$WORK/api.log"; exit 1
}

front_up() {
  if [[ -f "$WORK/front.pid" ]] && kill -0 "$(cat "$WORK/front.pid")" 2>/dev/null; then return 0; fi
  port_busy "$QA_FRONT_PORT" && { echo "REFUSED: port $QA_FRONT_PORT is busy" >&2; exit 2; }
  # Run vite directly (not through npx) so the recorded pid is the server itself.
  # The subshell is exec'd into vite with ALL its fds redirected, so nothing keeps the caller's pipe open.
  (
    cd "$FRONT_DIR"
    VITE_API_URL="http://localhost:$QA_API_PORT" VITE_GOOGLE_CLIENT_ID= \
      exec setsid node_modules/.bin/vite --port "$QA_FRONT_PORT" --strictPort >"$WORK/front.log" 2>&1 </dev/null
  ) &
  echo $! > "$WORK/front.pid"
  for _ in $(seq 1 30); do curl -s -o /dev/null "http://localhost:$QA_FRONT_PORT/" && return 0; sleep 1; done
  echo "QA frontend did not start" >&2; tail -20 "$WORK/front.log"; exit 1
}

# Stops the recorded process and its children (setsid gives each its own session/process group).
stop_pid() {
  if [[ -f "$WORK/$1.pid" ]]; then
    local pid; pid="$(cat "$WORK/$1.pid")"
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  fi
  rm -f "$WORK/$1.pid"
}

case "${1:-}" in
  up)
    guard; ensure_env; backend_build; db_up; api_up; front_up
    echo "QA ready: app http://localhost:$QA_FRONT_PORT  api http://localhost:$QA_API_PORT  db 127.0.0.1:$QA_DB_PORT/$QA_DB"
    echo "Next: qa/qa.sh seed   (creates the fictional accounts and data)" ;;
  seed) guard; ensure_env; QA_API="http://localhost:$QA_API_PORT" QA_DB_CONTAINER="$QA_CONTAINER" QA_DB_USER="$QA_DB_USER" QA_DB_NAME="$QA_DB" \
          node "$QA_DIR/seed.mjs" ;;
  down) guard; stop_pid front; stop_pid api; docker stop "$QA_CONTAINER" >/dev/null 2>&1 || true; echo "QA stopped (data kept in volume $QA_VOLUME)" ;;
  reset)
    guard; stop_pid front; stop_pid api
    # Only the exact QA container/volume, and only when they carry the QA label.
    if docker inspect "$QA_CONTAINER" --format '{{ index .Config.Labels "caa.qa" }}' 2>/dev/null | grep -qx true; then
      docker rm -f "$QA_CONTAINER" >/dev/null
    fi
    if docker volume inspect "$QA_VOLUME" >/dev/null 2>&1; then docker volume rm "$QA_VOLUME" >/dev/null; fi
    echo "QA database removed; run qa/qa.sh up && qa/qa.sh seed" ;;
  status)
    guard
    docker ps -a --filter "name=^${QA_CONTAINER}\$" --format 'db:  {{.Names}} {{.Status}}'
    for s in api front; do [[ -f "$WORK/$s.pid" ]] && kill -0 "$(cat "$WORK/$s.pid")" 2>/dev/null && echo "$s: running (pid $(cat "$WORK/$s.pid"))" || echo "$s: stopped"; done ;;
  logs) tail -n "${2:-60}" "$WORK/api.log" ;;
  *) echo "usage: qa/qa.sh {up|seed|down|reset|status|logs}" >&2; exit 1 ;;
esac
