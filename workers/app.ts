/**
 * Cloudflare Workers エントリーポイント
 *
 * このファイルが wrangler.toml の main として指定され、
 * Cloudflare Edge で実行される起点となる。
 *
 * createRequestHandler の役割:
 *   Remix のサーバーサイドランタイム（ルートの loader/action 実行、SSR）を
 *   Workers の fetch イベントに接続する。
 *
 * getLoadContext で context.cloudflare を構成する理由:
 *   Workers の fetch ハンドラが受け取る env（バインディング）と ctx（実行コンテキスト）を
 *   Remix の loader/action に渡すための標準的な方法。
 *   ローダーでは `context.cloudflare.env.DB` のように参照する。
 *
 * virtual:remix/server-build:
 *   Vite ビルド時に remix vite:build が生成する仮想モジュール。
 *   ビルド成果物（SSR バンドル）を Workers から参照するための Vite プラグインの仕組み。
 */

import { createRequestHandler } from "@remix-run/cloudflare-workers";

// ビルド時に Vite が解決する仮想モジュール（型エラーは無視）
// @ts-expect-error - virtual module provided by remix vite:build
import * as build from "virtual:remix/server-build";

const handler = createRequestHandler({
  build,
  getLoadContext(
    _request: Request,
    { env, ctx }: { env: Env; ctx: ExecutionContext }
  ) {
    // Remix の AppLoadContext を構成する
    // ルートの loader/action で context.cloudflare.env として参照される
    return { cloudflare: { env, ctx } };
  },
});

export default {
  fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return handler(request, { env, ctx });
  },
} satisfies ExportedHandler<Env>;
