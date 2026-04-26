/**
 * トップページ（/ → /contacts へリダイレクト）
 *
 * ルート URL に直接アクセスした場合に住所一覧ページへ誘導する。
 * requireUserSession が未ログインの場合に /login へリダイレクトするため、
 * このルートは実質的に認証ゲートウェイとしても機能する。
 */

import { type LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { requireUserSession } from "~/lib/session.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  // 未ログインなら /login へ（requireUserSession 内でリダイレクト）
  await requireUserSession(request, context);
  return redirect("/contacts");
}

export default function Index() {
  return null;
}
