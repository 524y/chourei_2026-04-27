/**
 * Vite 設定ファイル
 *
 * Remix v2 + Cloudflare Workers 構成。
 * cloudflareDevProxyVitePlugin により、ローカル開発時も Workers の
 * バインディング（D1 等）を wrangler.toml 定義に基づいてエミュレートする。
 * これにより本番と同じコードパスでローカル開発できる。
 */

import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/server-runtime" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    // Cloudflare Workers 環境をローカルでエミュレートするプロキシ
    // wrangler.toml の bindings（D1, KV 等）を miniflare 経由で提供する
    remixCloudflareDevProxy(),

    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),

    // tsconfig.json の paths エイリアス（~/*）を Vite に認識させる
    tsconfigPaths(),
  ],
});
