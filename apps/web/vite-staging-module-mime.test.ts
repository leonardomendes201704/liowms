import { describe, expect, it } from "vitest";

describe("staging module URL detection", () => {
  it("flags Vite dev module paths", () => {
    const urls = [
      "/liowms/@vite/client",
      "/liowms/src/main.tsx",
      "/liowms/node_modules/.vite/deps/react.js?v=1",
      "/liowms/@fs/repo/apps/web/src/App.tsx",
    ];
    for (const url of urls) {
      expect(
        url.includes("/@vite/") ||
          url.includes("/@fs/") ||
          url.includes("/node_modules/") ||
          /\.(tsx?|jsx?|mjs|cjs)(\?|$)/.test(url),
      ).toBe(true);
    }
  });
});
