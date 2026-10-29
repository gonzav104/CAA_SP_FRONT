import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // qa/e2e are Playwright specs against the real QA stack (npm run qa:e2e); .claude holds agent worktrees.
    exclude: [...configDefaults.exclude, "qa/**", ".claude/**"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    env: { VITE_API_URL: "http://localhost:8080" },
  },
})
