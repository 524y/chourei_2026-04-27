/**
 * Remix サーバーエントリーポイント
 *
 * Workers 上でのサーバーサイドレンダリング（SSR）を担う。
 * React 18 の Streaming SSR（renderToReadableStream）を使用することで
 * HTML を段階的に送信でき、Time To First Byte（TTFB）を改善できる。
 *
 * レスポンスヘッダーにセキュリティヘッダーを付与する:
 *   Content-Security-Policy: スクリプト・スタイルの読み込み元を制限（XSS 対策）
 *   X-Frame-Options: クリックジャッキング防止
 *   X-Content-Type-Options: MIME スニッフィング防止
 *   Referrer-Policy: リファラー情報の漏洩を最小化
 *
 * isbot でボット判定する理由:
 *   クローラー等はストリーミングレスポンスを正しく処理できない場合があるため、
 *   ボット向けには allReady（全レンダリング完了後）を待ってから送信する。
 */

import type { AppLoadContext, EntryContext } from "@remix-run/cloudflare";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext
) {
  const userAgent = request.headers.get("user-agent");

  const body = await renderToReadableStream(
    <RemixServer context={remixContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error: unknown) {
        console.error(error);
        responseStatusCode = 500;
      },
    }
  );

  // ボットには完全にレンダリングが終わってから送信する
  if (isbot(userAgent ?? "")) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");

  // セキュリティヘッダーの付与
  // CSP: 自サイトのリソースのみ許可し、インラインスクリプトは Vite が生成するので
  //       'unsafe-inline' を style-src に追加している（Tailwind の style 注入対応）
  responseHeaders.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Vite HMR・Remix ハイドレーション用
      "style-src 'self' 'unsafe-inline'",  // Tailwind CSS インライン対応
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",            // クリックジャッキング防止（X-Frame-Options と併用）
    ].join("; ")
  );
  responseHeaders.set("X-Frame-Options", "DENY");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
