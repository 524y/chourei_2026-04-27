/**
 * 新規連絡先追加ページ (/contacts/new)
 *
 * action の設計:
 *   1. CSRF トークン検証（フォームからの正規リクエストか確認）
 *   2. Zod でバリデーション（型安全、SQL インジェクション対策はDrizzleが担う）
 *   3. Drizzle ORM で INSERT（プリペアドステートメントにより SQL インジェクション防止）
 *   4. 作成後は詳細ページへリダイレクト（POST-Redirect-GET パターン）
 *
 * POST-Redirect-GET パターンを使う理由:
 *   ページリロード時に再度 POST が送信されるブラウザの動作を防ぐ。
 *   「フォームの再送信」ダイアログを表示させないための標準的な手法。
 */

import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/cloudflare";
import { useActionData, useLoaderData } from "@remix-run/react";
import { getDb } from "~/lib/db.server";
import { getCsrfToken, verifyCsrfToken } from "~/lib/csrf.server";
import { getSessionStorage } from "~/lib/session.server";
import { requireUserSession } from "~/lib/session.server";
import { ContactSchema } from "~/lib/validation";
import { contacts } from "../../drizzle/schema";
import ContactForm from "~/components/ContactForm";

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireUserSession(request, context);

  const { token, session } = await getCsrfToken(request, context);
  const storage = getSessionStorage(context);

  return json(
    { csrfToken: token },
    { headers: { "Set-Cookie": await storage.commitSession(session) } }
  );
}

export async function action({ request, context }: ActionFunctionArgs) {
  await requireUserSession(request, context);

  const formData = await request.formData();
  await verifyCsrfToken(request, formData, context);

  const result = ContactSchema.safeParse({
    name: formData.get("name"),
    nameKana: formData.get("nameKana"),
    postalCode: formData.get("postalCode"),
    prefecture: formData.get("prefecture"),
    city: formData.get("city"),
    address: formData.get("address"),
    building: formData.get("building"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });

  if (!result.success) {
    return json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const db = getDb(context);

  // Drizzle ORM の insert でプリペアドステートメントを使用（SQL インジェクション防止）
  const [created] = await db
    .insert(contacts)
    .values({
      // UUID は Worker の Web Crypto API で生成（Math.random() は使わない）
      id: crypto.randomUUID(),
      ...result.data,
    })
    .returning({ id: contacts.id });

  // 作成完了後は詳細ページへ（POST-Redirect-GET）
  return redirect(`/contacts/${created.id}`);
}

export default function NewContactPage() {
  const { csrfToken } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <nav className="text-sm text-gray-500 mb-1">
            <a href="/contacts" className="hover:text-gray-700">住所録</a>
            {" › "}
            <span>新規追加</span>
          </nav>
          <h1 className="text-xl font-bold text-gray-900">新規連絡先の追加</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white shadow rounded-lg p-6">
          <ContactForm
            csrfToken={csrfToken}
            action="/contacts/new"
            errors={actionData?.errors}
            submitLabel="追加する"
            cancelHref="/contacts"
          />
        </div>
      </main>
    </div>
  );
}
