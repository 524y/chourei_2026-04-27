#!/usr/bin/env node
/**
 * workers/app.ts を Cloudflare Workers 向けにバンドルするスクリプト。
 *
 * remix vite:build の後に実行し、virtual:remix/server-build を
 * build/server/index.js へのエイリアスとして解決する。
 *
 * 出力: build/worker/index.js（wrangler がそのままデプロイできる形式）
 */
import { build } from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

await build({
  entryPoints: [resolve(root, "workers/app.ts")],
  bundle: true,
  outfile: resolve(root, "build/worker/index.js"),
  format: "esm",
  platform: "browser",
  conditions: ["workerd", "worker", "browser"],
  minify: true,
  // node:* と cloudflare:* は Workers ランタイムが提供するため外部化
  external: ["node:*", "cloudflare:*"],
  plugins: [
    {
      name: "virtual-remix-server-build",
      setup(build) {
        // Vite の仮想モジュールを remix vite:build の出力先に解決する
        build.onResolve(
          { filter: /^virtual:remix\/server-build$/ },
          () => ({ path: resolve(root, "build/server/index.js") }),
        );
      },
    },
  ],
});

console.log("✓ build/worker/index.js を生成しました");
