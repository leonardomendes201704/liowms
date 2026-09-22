import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

/** Paths Vite serves as ES modules; browsers block `type=module` when MIME is `text/html`. */
function isModuleDevUrl(url: string): boolean {
  return (
    url.includes("/@vite/") ||
    url.includes("/@fs/") ||
    url.includes("/@id/") ||
    url.includes("/node_modules/") ||
    /\.(tsx?|jsx?|mjs|cjs)(\?|$)/.test(url)
  );
}

function patchModuleMime(res: ServerResponse): void {
  const end = res.end.bind(res);
  res.end = ((chunk?: unknown, encoding?: unknown, cb?: unknown) => {
    if (res.statusCode === 200) {
      const ct = res.getHeader("Content-Type");
      const ctStr = ct == null ? "" : String(ct);
      if (!ctStr || ctStr.includes("text/html")) {
        res.setHeader("Content-Type", "text/javascript; charset=utf-8");
      }
    }
    return end(
      chunk as Parameters<typeof end>[0],
      encoding as Parameters<typeof end>[1],
      cb as Parameters<typeof end>[2],
    );
  }) as typeof res.end;
}

/**
 * Board preview uses Vite dev behind Caddy; some paths (notably `/@vite/client`)
 * were answered with `Content-Type: text/html`, which yields a blank page in Chrome.
 */
export function viteStagingModuleMimePlugin(): Plugin {
  return {
    name: "liowms-staging-module-mime",
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url ?? "";
        if (!isModuleDevUrl(url)) {
          next();
          return;
        }
        patchModuleMime(res);
        next();
      });
    },
  };
}
