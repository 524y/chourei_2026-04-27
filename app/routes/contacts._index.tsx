/**
 * 住所一覧ページ (/contacts)
 *
 * 機能:
 *   - 氏名・ふりがな・メールアドレス・電話番号でのキーワード検索
 *   - ふりがな順でのソート（ふりがながない場合は氏名でフォールバック）
 *   - ページネーション（1ページ20件）
 *
 * D1 の LIKE 検索について:
 *   D1 は SQLite 互換なので LIKE '%keyword%' パターンが使える。
 *   ただし大文字小文字の区別は Unicode 文字（日本語等）では常に区別される。
 *   英数字のみ COLLATE NOCASE が有効だが、日本語検索では問題なし。
 *
 * ページネーション実装方針:
 *   - OFFSET ベースのページネーション（シンプルな実装を優先）
 *   - 欠点: データ件数が多い場合は OFFSET 値が大きくなるにつれて遅くなる
 *   - 住所録の規模（数千件以下）では実用上問題なし
 *   - 将来的に件数が増えたら cursor ベースへの移行を検討する
 */

import {
  type LoaderFunctionArgs,
  json,
} from "@remix-run/cloudflare";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { ThemeToggle } from "~/components/ThemeToggle";
import { count, like, or, asc } from "drizzle-orm";
import { contacts } from "../../drizzle/schema";
import { getDb } from "~/lib/db.server";
import { getCsrfToken } from "~/lib/csrf.server";
import { getSessionStorage, requireUserSession } from "~/lib/session.server";

const PAGE_SIZE = 20;

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireUserSession(request, context);

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const db = getDb(context);

  // 検索条件を構築（Drizzle の型安全なクエリビルダーで SQL インジェクションを防止）
  const searchCondition = query
    ? or(
        like(contacts.name, `%${query}%`),
        like(contacts.nameKana, `%${query}%`),
        like(contacts.email, `%${query}%`),
        like(contacts.phone, `%${query}%`),
        like(contacts.address, `%${query}%`),
      )
    : undefined;

  // 総件数を取得（ページネーション用）
  const [{ total }] = await db
    .select({ total: count() })
    .from(contacts)
    .where(searchCondition);

  // 一覧取得（ふりがな → 氏名の優先順でソート）
  const rows = await db
    .select()
    .from(contacts)
    .where(searchCondition)
    .orderBy(asc(contacts.nameKana), asc(contacts.name))
    .limit(PAGE_SIZE)
    .offset(offset);

  // CSRF トークンをセッションに設定（ログアウトボタン用）
  const { token, session } = await getCsrfToken(request, context);
  const storage = getSessionStorage(context);

  return json(
    {
      contacts: rows,
      query,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
      total,
      csrfToken: token,
    },
    { headers: { "Set-Cookie": await storage.commitSession(session) } }
  );
}

export default function ContactsIndex() {
  const { contacts: rows, query, page, totalPages, total, csrfToken } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">住所録</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Form method="post" action="/logout">
              <input type="hidden" name="_csrf" value={csrfToken} />
              <button type="submit" className="btn-secondary text-sm">
                ログアウト
              </button>
            </Form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* 検索バー + 新規追加ボタン */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Form method="get" className="flex-1 flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="氏名・ふりがな・メール・電話番号で検索"
              className="form-input flex-1"
            />
            <button type="submit" className="btn-secondary shrink-0">
              検索
            </button>
            {query && (
              <Link to="/contacts" className="btn-secondary shrink-0">
                クリア
              </Link>
            )}
          </Form>
          <Link to="/contacts/new" className="btn-primary shrink-0">
            + 新規追加
          </Link>
        </div>

        {/* 検索結果件数 */}
        {query && (
          <p className="text-sm text-gray-600">
            「{query}」の検索結果: {total}件
          </p>
        )}

        {/* 一覧テーブル */}
        {rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            {query ? "検索結果がありません" : "住所録にデータがありません"}
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <ul className="divide-y divide-gray-200">
              {rows.map((contact) => (
                <li key={contact.id}>
                  <Link
                    to={`/contacts/${contact.id}`}
                    className="block px-4 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-medium text-gray-900">
                          {contact.name}
                        </p>
                        {contact.nameKana && (
                          <p className="text-xs text-gray-500">{contact.nameKana}</p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          {contact.phone && <span>📞 {contact.phone}</span>}
                          {contact.email && <span>✉ {contact.email}</span>}
                          {(contact.prefecture || contact.city) && (
                            <span>
                              📍 {contact.prefecture}
                              {contact.city}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-400 text-sm">›</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <nav className="flex justify-center gap-2">
            {page > 1 && (
              <Link
                to={`/contacts?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(page - 1) })}`}
                className="btn-secondary"
              >
                ← 前へ
              </Link>
            )}
            <span className="py-2 px-3 text-sm text-gray-700">
              {page} / {totalPages} ページ
            </span>
            {page < totalPages && (
              <Link
                to={`/contacts?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(page + 1) })}`}
                className="btn-secondary"
              >
                次へ →
              </Link>
            )}
          </nav>
        )}
      </main>
    </div>
  );
}
