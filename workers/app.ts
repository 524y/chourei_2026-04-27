/**
 * Cloudflare Workers エントリーポイント（Module Worker 形式）
 *
 * @remix-run/cloudflare-workers を使わない理由:
 *   同パッケージの createRequestHandler は Service Worker API（FetchEvent）前提で
 *   型定義が `GetLoadContextFunction = (event: FetchEvent) => AppLoadContext` となっており、
 *   Module Worker の `(request, env, ctx)` パターンと型が合わない。
 *
 *   代わりに @remix-run/cloudflare（= @remix-run/server-runtime）の
 *   createRequestHandler を使う。こちらは
 *     `(build, mode?) => (request, loadContext?) => Promise<Response>`
 *   という型で、Module Worker から直接呼べる。
 *
 * D1 等のバインディングの受け渡し:
 *   fetch(request, env, ctx) の env/ctx を loadContext として渡す。
 *   ローダー側では `context.cloudflare.env.DB` で参照する。
 *   AppLoadContext の型拡張は load-context.ts を参照。
 */

import { createRequestHandler } from "@remix-run/cloudflare";

// Vite ビルド時に remix vite:build が解決する仮想モジュール
// @ts-expect-error - virtual module provided by remix vite:build
import * as build from "virtual:remix/server-build";

// ハンドラはモジュールスコープで一度だけ生成する（リクエストごとの生成コストを避ける）
const handleRequest = createRequestHandler(build);

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // env と ctx を cloudflare プロパティに包んで渡す（load-context.ts の型定義と対応）
    return handleRequest(request, { cloudflare: { env, ctx } });
  },
} satisfies ExportedHandler<Env>;
