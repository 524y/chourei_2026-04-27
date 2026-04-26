/**
 * ログインページ
 *
 * セキュリティ上の考慮点:
 *   - ユーザー名・パスワードのどちらが間違っているかを区別しない
 *     （ユーザー列挙攻撃を防ぐため、常に同じエラーメッセージを表示）
 *   - ログインフォームにも CSRF トークンを付与する
 *     （ログイン CSRF: 攻撃者が用意した認証情報でサイレントにログインさせる攻撃を防ぐ）
 *   - redirectTo パラメータはオープンリダイレクト対策として
 *     同一オリジンのパス（/ で始まる文字列）のみ受け付ける
 */

import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/cloudflare";
import { Form, useActionData, useLoaderData, useSearchParams } from "@remix-run/react";
import { verifyLogin } from "~/lib/auth.server";
import { getCsrfToken, verifyCsrfToken } from "~/lib/csrf.server";
import { getSession, getSessionStorage } from "~/lib/session.server";
import { LoginSchema } from "~/lib/validation";

export async function loader({ request, context }: LoaderFunctionArgs) {
  // すでにログイン済みならトップページへリダイレクト
  const session = await getSession(request, context);
  if (session.get("isLoggedIn")) {
    return redirect("/");
  }

  // CSRF トークンを取得（セッション未設定なら新規生成）
  const { token, session: updatedSession } = await getCsrfToken(request, context);
  const storage = getSessionStorage(context);

  return json(
    { csrfToken: token },
    { headers: { "Set-Cookie": await storage.commitSession(updatedSession) } }
  );
}

export async function action({ request, context }: ActionFunctionArgs) {
  // リクエストボディを一度だけ読み込む（ストリームは再利用不可）
  const formData = await request.formData();

  // CSRF 検証（不一致なら 403 を throw）
  await verifyCsrfToken(request, formData, context);

  // 入力値のバリデーション
  const result = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return json(
      {
        error: "入力内容を確認してください",
        fieldErrors: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // 認証検証（タイミングセーフな HMAC 比較）
  const isValid = await verifyLogin(
    result.data.username,
    result.data.password,
    context
  );

  if (!isValid) {
    // ユーザー名・パスワードのどちらが不正かを区別しない（ユーザー列挙防止）
    return json(
      { error: "ユーザー名またはパスワードが正しくありません", fieldErrors: {} },
      { status: 401 }
    );
  }

  // 認証成功: セッションにフラグを設定
  const session = await getSession(request, context);
  session.set("isLoggedIn", true);

  // redirectTo 検証: / で始まるパスのみ受け付け（オープンリダイレクト対策）
  const url = new URL(request.url);
  const rawRedirect = url.searchParams.get("redirectTo") ?? "/";
  const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
    ? rawRedirect
    : "/";

  const storage = getSessionStorage(context);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await storage.commitSession(session) },
  });
}

export default function LoginPage() {
  const { csrfToken } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">住所録</h1>
          <p className="mt-2 text-sm text-gray-600">ログインしてください</p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {actionData?.error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{actionData.error}</p>
            </div>
          )}

          <Form method="post" className="space-y-6">
            {/* CSRF トークン（hidden フィールド） */}
            <input type="hidden" name="_csrf" value={csrfToken} />
            {/* ログイン後のリダイレクト先（同一オリジンのパスのみ） */}
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <div>
              <label htmlFor="username" className="form-label">
                ユーザー名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="form-input mt-1"
                aria-describedby={
                  actionData?.fieldErrors?.username ? "username-error" : undefined
                }
              />
              {actionData?.fieldErrors?.username && (
                <p id="username-error" className="form-error">
                  {actionData.fieldErrors.username[0]}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="form-input mt-1"
                aria-describedby={
                  actionData?.fieldErrors?.password ? "password-error" : undefined
                }
              />
              {actionData?.fieldErrors?.password && (
                <p id="password-error" className="form-error">
                  {actionData.fieldErrors.password[0]}
                </p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full">
              ログイン
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}
