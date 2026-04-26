/**
 * データベース接続ユーティリティ
 *
 * Drizzle ORM を D1 バインディングに接続するファクトリ関数を提供する。
 *
 * drizzle() をリクエスト単位で呼ぶ理由:
 *   Cloudflare Workers はリクエストごとに独立したコンテキストで実行される。
 *   モジュールスコープで DB インスタンスを保持すると、リクエスト間でコンテキストが
 *   混在する可能性があるため、リクエストスコープで生成する。
 *
 * Drizzle ORM を選択した理由:
 *   - TypeScript の型安全なクエリビルダー（SQL インジェクションをコンパイル時に防止）
 *   - D1 公式サポート（drizzle-orm/d1）
 *   - drizzle-kit による SQL マイグレーション自動生成
 *   - Prisma に比べて Workers 環境での動作が安定している（エッジ対応）
 */

import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../drizzle/schema";
import type { AppLoadContext } from "@remix-run/cloudflare";

export function getDb(context: AppLoadContext) {
  return drizzle(context.cloudflare.env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;
