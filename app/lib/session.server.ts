/**
 * セッション管理モジュール
 *
 * Remix の createCookieSessionStorage を使用する。
 * Cookie セッションを選んだ理由:
 *   - Cloudflare Workers の無料プランでは KV ストアの書き込み上限が低い（1,000回/日）。
 *     Cookie ベースのセッションならストレージへの書き込みが不要で、コストゼロ。
 *   - セッションデータはサーバー秘密鍵で署名されるため改ざんを検知できる。
 *   - 欠点: Cookie のサイズ制限（約 4KB）があるが、認証フラグのみ格納するため問題なし。
 *
 * Cookie のセキュリティ設定:
 *   httpOnly: true  → JavaScript から Cookie を読めなくする（XSS 対策）
 *   secure: true    → HTTPS 通信のみで Cookie を送信（盗聴対策）
 *   sameSite: "lax" → 外部サイトからの POST による Cookie 送信を制限（CSRF 対策の一層目）
 *   secrets         → HMAC-SHA256 で署名。SESSION_SECRET が漏洩しない限り偽造不可
 */

import { createCookieSessionStorage, redirect } from "@remix-run/cloudflare";
import type { AppLoadContext } from "@remix-run/cloudflare";

const SESSION_COOKIE_NAME = "__session";

// セッションストレージを AppLoadContext（Workers 環境）に基づいて生成する。
// Workers の環境変数（Env）はリクエスト単位で注入されるため、
// モジュールスコープではなく関数スコープで生成する。
export function getSessionStorage(context: AppLoadContext) {
  return createCookieSessionStorage({
    cookie: {
      name: SESSION_COOKIE_NAME,
      httpOnly: true,
      maxAge: 60 * 60 * 8, // 8時間（業務利用を想定した上限）
      path: "/",
      sameSite: "lax",
      // SESSION_SECRET は wrangler secret put で設定する機密情報
      secrets: [context.cloudflare.env.SESSION_SECRET],
      // ローカル開発（HTTP）でも Cookie が送信されるよう条件付き
      secure: process.env.NODE_ENV === "production",
    },
  });
}

export async function getSession(request: Request, context: AppLoadContext) {
  const storage = getSessionStorage(context);
  return storage.getSession(request.headers.get("Cookie"));
}

// ログイン済みユーザーのセッションを取得する。
// 未ログインの場合はログインページへリダイレクトする。
export async function requireUserSession(
  request: Request,
  context: AppLoadContext
) {
  const session = await getSession(request, context);
  const isLoggedIn = session.get("isLoggedIn");
  if (!isLoggedIn) {
    // リダイレクト先を保持して、ログイン後に元のページへ戻れるようにする
    const url = new URL(request.url);
    const redirectTo = url.pathname !== "/login" ? url.pathname : "/";
    throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }
  return session;
}
