/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { normalizeViteBase, viteBasePathSegment } from "./src/vite-base";
import { viteStagingModuleMimePlugin } from "./vite-staging-module-mime";

const viteBase = normalizeViteBase(process.env.LIOWMS_BASE_PATH);
const baseSegment = viteBasePathSegment(viteBase);

/** Staging dev on company runner: allow Cloudflare quick-tunnel hosts (Vite host-check 403). */
function stagingAllowedHosts(): string[] | true {
  if (process.env.LIOWMS_STAGING_PREVIEW === "1") {
    return true;
  }
  const hosts: string[] = [".trycloudflare.com", "preview.insta-ads.online"];
  const extra = process.env.LIOWMS_VITE_ALLOWED_HOST?.trim();
  if (extra) {
    hosts.push(extra);
  }
  return hosts;
}

type ProxyEntry = {
  target: string;
  changeOrigin: boolean;
  rewrite?: (path: string) => string;
};

function stripBasePrefix(path: string): string {
  if (!baseSegment) {
    return path;
  }
  if (path === baseSegment) {
    return "/";
  }
  if (path.startsWith(`${baseSegment}/`)) {
    return path.slice(baseSegment.length) || "/";
  }
  return path;
}

function apiProxyPaths(): Record<string, ProxyEntry> {
  const rewrite = baseSegment ? stripBasePrefix : undefined;
  const health = `${baseSegment}/health`;
  const api = `${baseSegment}/api`;
  return {
    [health]: {
      target: "http://127.0.0.1:3000",
      changeOrigin: true,
      ...(rewrite ? { rewrite } : {}),
    },
    [api]: {
      target: "http://127.0.0.1:3000",
      changeOrigin: true,
      ...(rewrite ? { rewrite } : {}),
    },
  };
}

export default defineConfig({
  base: viteBase,
  plugins: [react(), viteStagingModuleMimePlugin()],
  resolve: {
    alias: {
      "@liowms/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    css: true,
  },
  server: {
    port: 5173,
    allowedHosts: stagingAllowedHosts(),
    proxy: apiProxyPaths(),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
