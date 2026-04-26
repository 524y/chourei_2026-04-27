/**
 * 連絡先詳細ページ (/contacts/:id)
 *
 * セキュリティ上の注意:
 *   ID は UUID なので推測困難だが、認証済みユーザーのみアクセス可能にする。
 *   404 と 403 の区別については、このアプリでは認証済み前提なので 404 を返してよい。
 *   （未認証状態では requireUserSession がログインページへリダイレクトするため）
 */

import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/cloudflare";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { contacts } from "../../drizzle/schema";
import { getDb } from "~/lib/db.server";
import { getCsrfToken, verifyCsrfToken } from "~/lib/csrf.server";
import { getSessionStorage, requireUserSession } from "~/lib/session.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  await requireUserSession(request, context);

  const { id } = params;
  if (!id) throw new Response("Not Found", { status: 404 });

  const db = getDb(context);
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);

  if (!contact) {
    throw new Response("この連絡先は存在しません", { status: 404 });
  }

  // 削除フォーム用に CSRF トークンを取得
  const { token, session } = await getCsrfToken(request, context);
  const storage = getSessionStorage(context);

  return json(
    { contact, csrfToken: token },
    { headers: { "Set-Cookie": await storage.commitSession(session) } }
  );
}

// 詳細ページからの削除アクション（ /contacts/:id/destroy ではなくここで処理）
export async function action({ request, context, params }: ActionFunctionArgs) {
  await requireUserSession(request, context);

  const formData = await request.formData();
  await verifyCsrfToken(request, formData, context);

  const intent = formData.get("intent");
  if (intent !== "delete") {
    throw new Response("不正なリクエストです", { status: 400 });
  }

  const { id } = params;
  if (!id) throw new Response("Not Found", { status: 404 });

  const db = getDb(context);
  await db.delete(contacts).where(eq(contacts.id, id));

  return redirect("/contacts");
}

// 住所を整形して表示するヘルパー
function formatAddress(contact: {
  postalCode?: string | null;
  prefecture?: string | null;
  city?: string | null;
  address?: string | null;
  building?: string | null;
}): string {
  const parts = [
    contact.postalCode ? `〒${contact.postalCode}` : null,
    contact.prefecture,
    contact.city,
    contact.address,
    contact.building,
  ].filter(Boolean);
  return parts.join(" ");
}

export default function ContactDetailPage() {
  const { contact, csrfToken } = useLoaderData<typeof loader>();
  const fullAddress = formatAddress(contact);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <nav className="text-sm text-gray-500 mb-1">
            <a href="/contacts" className="hover:text-gray-700">住所録</a>
            {" › "}
            <span>{contact.name}</span>
          </nav>
          <h1 className="text-xl font-bold text-gray-900">{contact.name}</h1>
          {contact.nameKana && (
            <p className="text-sm text-gray-500">{contact.nameKana}</p>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {/* 連絡先情報 */}
          <dl className="px-6 py-4 space-y-4">
            {contact.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">電話番号</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a href={`tel:${contact.phone}`} className="link-primary">
                    {contact.phone}
                  </a>
                </dd>
              </div>
            )}
            {contact.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a href={`mailto:${contact.email}`} className="link-primary">
                    {contact.email}
                  </a>
                </dd>
              </div>
            )}
            {fullAddress && (
              <div>
                <dt className="text-sm font-medium text-gray-500">住所</dt>
                <dd className="mt-1 text-sm text-gray-900">{fullAddress}</dd>
              </div>
            )}
            {contact.notes && (
              <div>
                <dt className="text-sm font-medium text-gray-500">備考</dt>
                {/* whitespace-pre-wrap で改行を保持して表示 */}
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {contact.notes}
                </dd>
              </div>
            )}
          </dl>

          {/* メタ情報 */}
          <div className="px-6 py-3 text-xs text-gray-400">
            登録: {new Date(contact.createdAt).toLocaleDateString("ja-JP")}
            {contact.updatedAt !== contact.createdAt && (
              <span className="ml-3">
                更新: {new Date(contact.updatedAt).toLocaleDateString("ja-JP")}
              </span>
            )}
          </div>
        </div>

        {/* 操作ボタン */}
        <div className="mt-4 flex gap-3">
          <Link
            to={`/contacts/${contact.id}/edit`}
            className="btn-primary"
          >
            編集
          </Link>
          <Link to="/contacts" className="btn-secondary">
            一覧へ戻る
          </Link>

          {/* 削除は確認ダイアログ付きで POST リクエスト（GET で削除しない） */}
          <Form
            method="post"
            className="ml-auto"
            onSubmit={(e) => {
              if (!confirm(`「${contact.name}」を削除しますか？この操作は元に戻せません。`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="_csrf" value={csrfToken} />
            <input type="hidden" name="intent" value="delete" />
            <button type="submit" className="btn-danger">
              削除
            </button>
          </Form>
        </div>
      </main>
    </div>
  );
}
