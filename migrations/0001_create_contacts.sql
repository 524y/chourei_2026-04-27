-- Migration: 0001_create_contacts
-- 住所録テーブルの初期作成
--
-- wrangler d1 migrations apply chourei-db --local  (ローカル開発)
-- wrangler d1 migrations apply chourei-db --remote (本番デプロイ時)
--
-- wrangler はこのディレクトリ内のファイルを名前順に適用し、
-- d1_migrations テーブルで適用済みマイグレーションを管理する。

CREATE TABLE contacts (
  -- UUID 主キー（連番回避で IDOR リスクを低減）
  id           TEXT    NOT NULL PRIMARY KEY,

  -- 氏名（必須）
  name         TEXT    NOT NULL,

  -- ふりがな（任意）
  name_kana    TEXT,

  -- 郵便番号（例: 100-0001）
  postal_code  TEXT,

  -- 都道府県
  prefecture   TEXT,

  -- 市区町村
  city         TEXT,

  -- 番地
  address      TEXT,

  -- 建物名・部屋番号
  building     TEXT,

  -- 電話番号
  phone        TEXT,

  -- メールアドレス
  email        TEXT,

  -- 備考
  notes        TEXT,

  -- 作成日時（UTC、ISO 8601 形式）
  created_at   TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP),

  -- 更新日時（UPDATE 時にアプリ側で明示的に更新）
  updated_at   TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- 氏名・ふりがな検索用インデックス
CREATE INDEX idx_contacts_name      ON contacts(name);
CREATE INDEX idx_contacts_name_kana ON contacts(name_kana);
