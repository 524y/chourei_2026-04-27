/**
 * CSRF（Cross-Site Request Forgery）対策モジュール
 *
 * 実装パターン: Synchronizer Token Pattern（同期トークンパターン）
 *   1. セッションに CSRF トークン（UUID）を格納する
 *   2. フォームに hidden フィールドとしてトークンを埋め込む
 *   3. フォーム送信（POST）時にセッションのトークンとフォームのトークンを照合する
 *
 * SameSite=Lax Cookie だけでは防げないケース（例: GET リクエストからの遷移後の
 * フォーム送信など）に対する多層防御として、このトークン検証を併用する。
 *
 * Double Submit Cookie パターンを使わず Synchronizer Token を選んだ理由:
 *   - Cloudflare Workers のセッション Cookie は署名済みで改ざん検知可能
 *   - サーバー側でトークンを管理するためより強固
 *   - Workers の Edge 環境でも createCookieSessionStorage が動作する
 */

import type { AppLoadContext } from "@remix-run/cloudflare";
import { getSession } from "./session.server";

const CSRF_SESSION_KEY = "csrfToken";

/**
 * セッションから CSRF トークンを取得する。
 * 存在しない場合は新規生成して返す（セッションへの保存は呼び出し元で行う）。
 */
export async function getCsrfToken(
  request: Request,
  context: AppLoadContext
): Promise<{ token: string; session: Awaited<ReturnType<typeof getSession>> }> {
  const session = await getSession(request, context);
  let token = session.get(CSRF_SESSION_KEY) as string | undefined;

  if (!token) {
    // crypto.randomUUID() は Workers で利用可能（Web Crypto API）
    token = crypto.randomUUID();
    session.set(CSRF_SESSION_KEY, token);
  }

  return { token, session };
}

/**
 * フォーム送信時に CSRF トークンを検証する。
 * 不一致の場合は 403 を throw する（Remix の errorBoundary で捕捉される）。
 *
 * @param formData - アクション内で既に読み込んだ FormData（ストリームを消費しないよう引数で受け取る）
 */
export async function verifyCsrfToken(
  request: Request,
  formData: FormData,
  context: AppLoadContext
): Promise<void> {
  const session = await getSession(request, context);
  const sessionToken = session.get(CSRF_SESSION_KEY) as string | undefined;
  const formToken = formData.get("_csrf");

  // トークン不一致または欠落は CSRF 攻撃の可能性がある
  if (
    !sessionToken ||
    !formToken ||
    typeof formToken !== "string" ||
    sessionToken !== formToken
  ) {
    throw new Response("不正なリクエストです（CSRFトークン不一致）", {
      status: 403,
    });
  }
}
