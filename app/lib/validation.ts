/**
 * 入力バリデーションスキーマ（Zod）
 *
 * Zod を選択した理由:
 *   - TypeScript ファーストな設計で、スキーマから型が自動推論される
 *   - Worker/Node.js/ブラウザいずれでも動作（エッジ対応）
 *   - バリデーションエラーが構造化されており、フォームエラー表示が容易
 *
 * バリデーションルールの設計方針:
 *   - 必須項目は name（氏名）のみ。住所録は部分情報でも登録できるようにする
 *   - 文字数制限は DB のカラム設計と対応させる
 *   - 郵便番号・電話番号は形式を緩やかにチェックし、UI の利便性を優先する
 *   - XSS 対策は React のデフォルト（自動エスケープ）に委ねる。
 *     ただし、DB に保存する前にトリミングして不要な空白を除去する。
 */

import { z } from "zod";

// 空文字を undefined に変換するヘルパー
// フォームの空フィールドは空文字列で送信されるが、DB は null/undefined として扱いたい
const emptyToUndefined = z.string().transform((val) => val.trim() || undefined);

export const ContactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "氏名は必須です")
    .max(100, "氏名は100文字以内で入力してください"),

  nameKana: emptyToUndefined
    .pipe(z.string().max(100, "ふりがなは100文字以内で入力してください").optional())
    .optional(),

  // 郵便番号: ハイフンあり（123-4567）またはなし（1234567）を許容
  postalCode: emptyToUndefined
    .pipe(
      z
        .string()
        .regex(/^\d{3}-?\d{4}$/, "郵便番号の形式が正しくありません（例: 100-0001）")
        .optional()
    )
    .optional(),

  prefecture: emptyToUndefined
    .pipe(z.string().max(10, "都道府県は10文字以内で入力してください").optional())
    .optional(),

  city: emptyToUndefined
    .pipe(z.string().max(100, "市区町村は100文字以内で入力してください").optional())
    .optional(),

  address: emptyToUndefined
    .pipe(z.string().max(200, "番地は200文字以内で入力してください").optional())
    .optional(),

  building: emptyToUndefined
    .pipe(z.string().max(200, "建物名は200文字以内で入力してください").optional())
    .optional(),

  // 電話番号: 数字・ハイフン・括弧・スペース・プラスのみ許容
  phone: emptyToUndefined
    .pipe(
      z
        .string()
        .regex(/^[\d\-+() ]*$/, "電話番号に使用できない文字が含まれています")
        .max(20, "電話番号は20文字以内で入力してください")
        .optional()
    )
    .optional(),

  email: emptyToUndefined
    .pipe(
      z
        .string()
        .email("メールアドレスの形式が正しくありません")
        .max(255, "メールアドレスは255文字以内で入力してください")
        .optional()
    )
    .optional(),

  notes: emptyToUndefined
    .pipe(z.string().max(1000, "備考は1000文字以内で入力してください").optional())
    .optional(),
});

export type ContactInput = z.infer<typeof ContactSchema>;

export const LoginSchema = z.object({
  username: z.string().min(1, "ユーザー名を入力してください").max(100),
  password: z.string().min(1, "パスワードを入力してください").max(200),
});

export type LoginInput = z.infer<typeof LoginSchema>;
