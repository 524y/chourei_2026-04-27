/**
 * ログアウトルート
 *
 * GET ではなく POST のみ受け付ける理由:
 *   GET でログアウトを実行すると、攻撃者が img タグや iframe 経由で
 *   ユーザーを強制ログアウトさせる CSRF 攻撃（CSRF Logout）が可能になる。
 *   POST + CSRF トークン検証により、正規フォームからの送信のみ受け付ける。
 *
 * セッション破棄には destroySession を使う:
 *   commitSession でフラグをクリアするだけでは、セッション ID が残り
 *   再利用される可能性があるため、セッション自体を完全に破棄する。
 */

import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  redirect,
} from "@remix-run/cloudflare";
import { getSession, getSessionStorage } from "~/lib/session.server";
import { verifyCsrfToken } from "~/lib/csrf.server";

// GET リクエストはトップページへリダイレクト（直接アクセス対策）
// _request: LoaderFunctionArgs の引数は使わないが型定義上必要なため _ プレフィックス
export async function loader(_: LoaderFunctionArgs) {
  return redirect("/");
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();

  // CSRF 検証
  await verifyCsrfToken(request, formData, context);

  // セッションを完全に破棄（単なるフラグクリアではなく、セッション ID ごと削除）
  const session = await getSession(request, context);
  const storage = getSessionStorage(context);

  return redirect("/login", {
    headers: { "Set-Cookie": await storage.destroySession(session) },
  });
}
