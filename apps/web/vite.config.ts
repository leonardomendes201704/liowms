import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/** Staging dev on company runner: allow Cloudflare quick-tunnel hosts (Vite host-check 403). */
function stagingAllowedHosts(): string[] | true {
  if (process.env.LIOWMS_STAGING_PREVIEW === "1") {
    return true;
  }
  const hosts: string[] = [".trycloudflare.com"];
  const extra = process.env.LIOWMS_VITE_ALLOWED_HOST?.trim();
  if (extra) {
    hosts.push(extra);
  }
  return hosts;
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@liowms/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    allowedHosts: stagingAllowedHosts(),
    proxy: {
      "/health": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
