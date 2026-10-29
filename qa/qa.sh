#!/usr/bin/env bash
# Isolated QA environment: its own PostgreSQL 15 container + volume, its own build of the backend revision and
# its own ports. It never reads the backend .env, never connects to caa_db / caa_sp_db_data_final and never
# runs docker prune. Usage: qa/qa.sh {up|seed|down|reset|status|logs|mail-config|mail-clear|api-restart [real|inert]}
set -euo pipefail

QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT_DIR="$(dirname "$QA_DIR")"
BACKEND_REPO="${BACKEND_REPO:-$FRONT_DIR/../CAA_SP}"
# Backend revision to test: the committed ref, built as is (no patches). Export BACKEND_REF to try another one.
BACKEND_REF="${BACKEND_REF:-main}"
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

# Real e-mail (Resend sandbox) is opt-in: `up` and `seed` always run with inert credentials, so seeding never
# sends mail. The key lives only in your shell (QA_RESEND_API_KEY) or in $MAIL_FILE (mode 600, git-ignored);
# it is never printed, never put on a command line and never written to the repository.
MAIL_FILE="$WORK/mail.env"
DEFAULT_FROM="onboarding@resend.dev"
trap 'rm -f "$WORK/api.env"' EXIT

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

# Reads the Resend settings from the shell or $MAIL_FILE into MAIL_KEY / MAIL_FROM (never prints them).
load_mail() {
  MAIL_KEY="${QA_RESEND_API_KEY:-}"; MAIL_FROM="${QA_RESEND_FROM_EMAIL:-}"
  if [[ -f "$MAIL_FILE" ]]; then
    [[ -n "$MAIL_KEY" ]] || MAIL_KEY="$(grep -E '^QA_RESEND_API_KEY=' "$MAIL_FILE" | head -1 | cut -d= -f2- || true)"
    [[ -n "$MAIL_FROM" ]] || MAIL_FROM="$(grep -E '^QA_RESEND_FROM_EMAIL=' "$MAIL_FILE" | head -1 | cut -d= -f2- || true)"
  fi
  MAIL_FROM="${MAIL_FROM:-$DEFAULT_FROM}"
}

api_running() { [[ -f "$WORK/api.pid" ]] && kill -0 "$(cat "$WORK/api.pid")" 2>/dev/null; }

# Starts ONLY the QA API. mode=inert: placeholder Resend key, nothing is delivered. mode=real: the key from
# load_mail and the Resend start-up check enabled. The settings travel in a 600 file that the child sources
# (so no secret ever appears in a process argument) and that is deleted as soon as the API is up.
api_start() {
  local mode="$1" key="re_qa_inert" from="$DEFAULT_FROM" health=false
  if [[ "$mode" == real ]]; then
    load_mail
    [[ "$MAIL_KEY" == re_* ]] || { echo "No hay una clave de Resend válida. Ejecutá: qa/qa.sh mail-config" >&2; exit 1; }
    key="$MAIL_KEY"; from="$MAIL_FROM"; health=true
  fi
  port_busy "$QA_API_PORT" && { echo "REFUSED: port $QA_API_PORT is busy" >&2; exit 2; }
  (
    umask 077
    {
      printf 'DATASOURCE_URL=%q\n' "jdbc:postgresql://localhost:$QA_DB_PORT/$QA_DB"
      printf 'POSTGRES_USER=%q\nPOSTGRES_PASSWORD=%q\nJWT_SECRET=%q\n' "$QA_DB_USER" "$QA_DB_PASSWORD" "$QA_JWT_SECRET"
      printf 'SERVER_PORT=%q\nCOOKIE_SECURE=false\n' "$QA_API_PORT"
      printf 'CORS_ALLOWED_ORIGINS=%q\nFRONTEND_URL=%q\n' "http://localhost:$QA_FRONT_PORT" "http://localhost:$QA_FRONT_PORT"
      printf 'CLOUDINARY_CLOUD_NAME=qa-inert\nCLOUDINARY_API_KEY=qa-inert\nCLOUDINARY_API_SECRET=qa-inert\nGOOGLE_CLIENT_ID=\n'
      printf 'RESEND_API_KEY=%q\nRESEND_FROM_EMAIL=%q\nRESEND_HEALTH_CHECK_ENABLED=%s\n' "$key" "$from" "$health"
      printf 'RATE_LIMIT_LOGIN_MAX=1000\nRATE_LIMIT_OLVIDE_PASSWORD_MAX=1000\n'
    } > "$WORK/api.env"
  )
  # Only QA values reach the API: the environment is cleared and rebuilt from api.env.
  env -i PATH="$PATH" HOME="$HOME" \
    setsid nohup bash -c 'set -a; . "$1"; set +a; exec java -jar "$2"' _ "$WORK/api.env" "$WORK/backend/target/api-0.0.1-SNAPSHOT.jar" \
    >"$WORK/api.log" 2>&1 </dev/null &
  echo $! > "$WORK/api.pid"
  echo "$mode" > "$WORK/api.mail-mode"
  for _ in $(seq 1 90); do
    if curl -s -o /dev/null "http://localhost:$QA_API_PORT/api/usuarios/me"; then rm -f "$WORK/api.env"; return 0; fi
    kill -0 "$(cat "$WORK/api.pid")" 2>/dev/null || { rm -f "$WORK/api.env"; tail -30 "$WORK/api.log"; exit 1; }
    sleep 1
  done
  rm -f "$WORK/api.env"; echo "QA API did not start" >&2; tail -30 "$WORK/api.log"; exit 1
}

# `up` keeps an API that is already running (whatever its mail mode); otherwise it starts it inert.
api_up() { api_running && return 0; api_start inert; }

# stopped | inert | real. An API started before this mode was recorded is, by construction, inert.
mail_mode() {
  api_running || { echo stopped; return 0; }
  if [[ -f "$WORK/api.mail-mode" ]]; then cat "$WORK/api.mail-mode"; else echo inert; fi
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
  [[ "$1" == api ]] && rm -f "$WORK/api.mail-mode"
  return 0
}

case "${1:-}" in
  up)
    guard; ensure_env; backend_build; db_up; api_up; front_up
    echo "QA ready: app http://localhost:$QA_FRONT_PORT  api http://localhost:$QA_API_PORT  db 127.0.0.1:$QA_DB_PORT/$QA_DB"
    echo "Next: qa/qa.sh seed   (creates the fictional accounts and data)" ;;
  seed)
    guard; ensure_env
    if [[ "$(mail_mode)" == real ]]; then
      echo "REFUSED: la API está con correo real y el seed enviaría correos de bienvenida a direcciones @qa.test." >&2
      echo "Volvé al modo inerte: qa/qa.sh api-restart inert   (y reiniciá en real después del seed)." >&2
      exit 2
    fi
    QA_API="http://localhost:$QA_API_PORT" QA_DB_CONTAINER="$QA_CONTAINER" QA_DB_USER="$QA_DB_USER" QA_DB_NAME="$QA_DB" \
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
    for s in api front; do [[ -f "$WORK/$s.pid" ]] && kill -0 "$(cat "$WORK/$s.pid")" 2>/dev/null && echo "$s: running (pid $(cat "$WORK/$s.pid"))" || echo "$s: stopped"; done
    load_mail
    if [[ "$MAIL_KEY" == re_* ]]; then echo "mail: clave de Resend configurada, remitente $MAIL_FROM"; else echo "mail: sin clave de Resend (modo inerte)"; fi
    echo "mail en la API: $(mail_mode)" ;;
  mail-config)
    # Interactive: the key is typed without echo, so it never reaches the screen, the shell history or a log.
    [[ -t 0 ]] || { echo "Ejecutalo en una terminal interactiva (la clave se escribe sin eco)." >&2; exit 1; }
    mkdir -p "$WORK"
    read -rsp "Clave de Resend (empieza con re_; no se muestra): " key; echo
    [[ "$key" == re_* ]] || { echo "No parece una clave de Resend (debe empezar con re_). No se guardó nada." >&2; exit 1; }
    read -rp "Remitente [$DEFAULT_FROM]: " from; from="${from:-$DEFAULT_FROM}"
    ( umask 077; printf 'QA_RESEND_API_KEY=%s\nQA_RESEND_FROM_EMAIL=%s\n' "$key" "$from" > "$MAIL_FILE" )
    unset key
    echo "Guardada en qa/.work/mail.env (permisos 600, ignorado por Git). Siguiente: qa/qa.sh api-restart" ;;
  mail-clear) rm -f "$MAIL_FILE"; echo "Clave de Resend borrada de qa/.work/mail.env (las variables de tu shell no se tocan)." ;;
  api-restart)
    # Restarts ONLY the QA API (database and frontend stay as they are). Default mode: real; `inert` goes back.
    guard; ensure_env
    mode="${2:-real}"
    [[ "$mode" == real || "$mode" == inert ]] || { echo "usage: qa/qa.sh api-restart [real|inert]" >&2; exit 1; }
    docker ps --format '{{.Names}}' | grep -qx "$QA_CONTAINER" || { echo "La base de QA no está corriendo: qa/qa.sh up" >&2; exit 1; }
    if [[ "$mode" == real ]]; then
      load_mail
      [[ "$MAIL_KEY" == re_* ]] || { echo "No hay una clave de Resend válida. Ejecutá: qa/qa.sh mail-config" >&2; exit 1; }
    fi
    stop_pid api
    for _ in $(seq 1 30); do port_busy "$QA_API_PORT" || break; sleep 1; done
    api_start "$mode"
    echo "API de QA reiniciada en modo $mode."
    if [[ "$mode" == real ]]; then
      echo "Los correos salen de ${MAIL_FROM}. Con el sandbox solo llegan al email de tu cuenta de Resend."
    fi ;;
  logs) tail -n "${2:-60}" "$WORK/api.log" ;;
  *) echo "usage: qa/qa.sh {up|seed|down|reset|status|logs|mail-config|mail-clear|api-restart [real|inert]}" >&2; exit 1 ;;
esac
