/**
 * 連絡先編集ページ (/contacts/:id/edit)
 *
 * ルートファイル名に _ が入っている理由:
 *   Remix のファイルルーティングでは contacts.$id.edit.tsx とすると
 *   contacts.$id.tsx の子ルートになり Outlet が必要になる。
 *   contacts.$id_.edit.tsx とすることで contacts.$id.tsx とは独立した
 *   フラットなルートとして扱われる（Remix のパスレス親ルート記法）。
 *
 * 更新時刻の明示的な設定:
 *   D1 は UPDATE 時に updated_at を自動更新するトリガーをサポートしないため、
 *   アプリ側で new Date().toISOString() を設定する。
 */

import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/cloudflare";
import { useActionData, useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { contacts } from "../../drizzle/schema";
import { getDb } from "~/lib/db.server";
import { getCsrfToken, verifyCsrfToken } from "~/lib/csrf.server";
import { getSessionStorage } from "~/lib/session.server";
import { requireUserSession } from "~/lib/session.server";
import { ContactSchema } from "~/lib/validation";
import ContactForm from "~/components/ContactForm";

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

  const { token, session } = await getCsrfToken(request, context);
  const storage = getSessionStorage(context);

  return json(
    { contact, csrfToken: token },
    { headers: { "Set-Cookie": await storage.commitSession(session) } }
  );
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  await requireUserSession(request, context);

  const { id } = params;
  if (!id) throw new Response("Not Found", { status: 404 });

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

  // updated_at を明示的に現在時刻に設定（D1 は UPDATE トリガー非対応）
  await db
    .update(contacts)
    .set({
      ...result.data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(contacts.id, id));

  return redirect(`/contacts/${id}`);
}

export default function EditContactPage() {
  const { contact, csrfToken } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <nav className="text-sm text-gray-500 mb-1">
            <a href="/contacts" className="hover:text-gray-700">住所録</a>
            {" › "}
            <a href={`/contacts/${contact.id}`} className="hover:text-gray-700">
              {contact.name}
            </a>
            {" › "}
            <span>編集</span>
          </nav>
          <h1 className="text-xl font-bold text-gray-900">連絡先の編集</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white shadow rounded-lg p-6">
          <ContactForm
            csrfToken={csrfToken}
            action={`/contacts/${contact.id}/edit`}
            defaultValues={contact}
            errors={actionData?.errors}
            submitLabel="更新する"
            cancelHref={`/contacts/${contact.id}`}
          />
        </div>
      </main>
    </div>
  );
}
