/**
 * Drizzle ORM スキーマ定義
 *
 * D1 は SQLite 互換なので drizzle-orm/sqlite-core を使用する。
 * このファイルを編集したら `npm run db:generate` で SQL マイグレーションを再生成すること。
 *
 * ID に crypto.randomUUID() を使う理由:
 *   - 連番 ID（1, 2, 3...）は URL から件数が推測でき、IOR（Insecure Direct Object Reference）
 *     攻撃のリスクがある。UUID なら推測が事実上不可能。
 *
 * 日時カラムに TEXT を使う理由:
 *   - D1（SQLite）には DATETIME 型が存在しない。ISO 8601 形式の文字列として保存し、
 *     JavaScript 側で Date オブジェクトに変換する。
 */

import { sql } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const contacts = sqliteTable(
  "contacts",
  {
    // UUID を主キーとして使用（連番 ID の IDOR リスクを回避）
    id: text("id").primaryKey(),

    // 氏名（必須）
    name: text("name").notNull(),

    // ふりがな（任意）—— 五十音順ソートのために別カラムで管理
    nameKana: text("name_kana"),

    // 郵便番号（ハイフンあり/なし両対応、保存時は正規化済み）
    postalCode: text("postal_code"),

    // 都道府県
    prefecture: text("prefecture"),

    // 市区町村
    city: text("city"),

    // 番地
    address: text("address"),

    // 建物名・部屋番号
    building: text("building"),

    // 電話番号（国際形式含む、フォーマット自由）
    phone: text("phone"),

    // メールアドレス
    email: text("email"),

    // 備考（最大 1000 文字）
    notes: text("notes"),

    // 作成日時（SQLite の CURRENT_TIMESTAMP は UTC）
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),

    // 更新日時（UPDATE 時にアプリ側で明示的に更新する）
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    // 氏名・ふりがなでの検索・ソートを高速化するインデックス
    index("idx_contacts_name").on(table.name),
    index("idx_contacts_name_kana").on(table.nameKana),
  ]
);

// Drizzle が推論する型をエクスポート（ルートファイルで使用）
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
