/**
 * Drizzle Kit 設定ファイル
 *
 * drizzle-kit generate でスキーマ定義（drizzle/schema.ts）から
 * SQL マイグレーションファイルを自動生成するための設定。
 *
 * 生成されたマイグレーションは migrations/ ディレクトリに出力され、
 * wrangler d1 migrations apply コマンドで D1 に適用する。
 * wrangler が migrations/ ディレクトリを直接読む仕様のため、
 * out ディレクトリは migrations/ に設定する。
 */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./migrations",
  // D1 は SQLite 互換なので dialect は "sqlite" を使用
  dialect: "sqlite",
});
