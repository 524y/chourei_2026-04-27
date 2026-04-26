/**
 * 連絡先入力フォームコンポーネント
 *
 * 新規追加・編集の両ページで使い回せるよう共通化している。
 * フォームフィールドの aria-describedby でエラーメッセージを関連付けることで
 * スクリーンリーダー対応（アクセシビリティ）を実現している。
 *
 * React の制御/非制御コンポーネントについて:
 *   編集時は defaultValue を使って非制御コンポーネントとして扱う。
 *   制御コンポーネント（value + onChange）より実装がシンプルで、
 *   Remix の Form と親和性が高い（送信時に FormData を直接使用するため）。
 */

import { Form, Link } from "@remix-run/react";
import type { Contact } from "../../drizzle/schema";

type FieldErrors = Partial<Record<string, string[]>>;

type Props = {
  csrfToken: string;
  action: string;
  defaultValues?: Partial<Contact>;
  errors?: FieldErrors;
  submitLabel: string;
  cancelHref: string;
};

// フォームフィールドの定義（ラベル・name・type の対応表）
// 順序変更や項目追加はここだけ修正すればよいため保守性が高い
const FIELDS: {
  name: keyof Contact;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}[] = [
  { name: "name", label: "氏名", required: true, placeholder: "山田 太郎" },
  { name: "nameKana", label: "ふりがな", placeholder: "やまだ たろう" },
  { name: "postalCode", label: "郵便番号", placeholder: "100-0001" },
  { name: "prefecture", label: "都道府県", placeholder: "東京都" },
  { name: "city", label: "市区町村", placeholder: "千代田区" },
  { name: "address", label: "番地", placeholder: "1-1-1" },
  { name: "building", label: "建物名・部屋番号", placeholder: "○○マンション 101" },
  { name: "phone", label: "電話番号", type: "tel", placeholder: "03-1234-5678" },
  { name: "email", label: "メールアドレス", type: "email", placeholder: "taro@example.com" },
];

function FieldError({ errors, id }: { errors?: string[]; id: string }) {
  if (!errors || errors.length === 0) return null;
  return (
    <p id={id} className="form-error" role="alert">
      {errors[0]}
    </p>
  );
}

export default function ContactForm({
  csrfToken,
  action,
  defaultValues,
  errors,
  submitLabel,
  cancelHref,
}: Props) {
  return (
    <Form method="post" action={action} noValidate>
      {/* CSRF トークン */}
      <input type="hidden" name="_csrf" value={csrfToken} />

      <div className="space-y-4">
        {FIELDS.map(({ name, label, type = "text", placeholder, required }) => {
          const errorId = `${name}-error`;
          const fieldErrors = errors?.[name];
          return (
            <div key={name}>
              <label htmlFor={name} className="form-label">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                id={name}
                name={name}
                type={type}
                defaultValue={(defaultValues?.[name] as string) ?? ""}
                placeholder={placeholder}
                required={required}
                className={`form-input mt-1 ${fieldErrors ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""}`}
                aria-describedby={fieldErrors ? errorId : undefined}
                aria-invalid={fieldErrors ? "true" : undefined}
                autoComplete={name === "email" ? "email" : name === "phone" ? "tel" : "off"}
              />
              <FieldError errors={fieldErrors} id={errorId} />
            </div>
          );
        })}

        {/* 備考はテキストエリア */}
        <div>
          <label htmlFor="notes" className="form-label">
            備考
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={(defaultValues?.notes as string) ?? ""}
            placeholder="メモや追記事項があれば入力してください"
            className={`form-input mt-1 ${errors?.notes ? "border-red-300" : ""}`}
            aria-describedby={errors?.notes ? "notes-error" : undefined}
          />
          <FieldError errors={errors?.notes} id="notes-error" />
        </div>
      </div>

      {/* 操作ボタン */}
      <div className="mt-6 flex gap-3">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
        <Link to={cancelHref} className="btn-secondary">
          キャンセル
        </Link>
      </div>
    </Form>
  );
}
