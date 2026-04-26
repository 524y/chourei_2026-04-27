最終更新: 2026-04-26（レッドのカラーテーマを追加）

# 住所録アプリケーション 仕様書

## 概要

Remix + Cloudflare Workers + D1 を使った、個人向け住所録 Web アプリケーション。
認証済みユーザーのみが操作できる、シンプルな CRUD アプリ。

## 技術スタック

| 区分 | 採用技術 | バージョン |
|------|---------|-----------|
| フレームワーク | Remix v2 | ^2.16.0 |
| ランタイム | Cloudflare Workers | Free プラン |
| データベース | Cloudflare D1（SQLite 互換） | Free プラン |
| ORM | Drizzle ORM | ^0.38.0 |
| バリデーション | Zod | ^3.24.0 |
| スタイリング | Tailwind CSS | ^3.4.0 |
| ビルドツール | Vite | ^5.4.0 |

## 機能一覧

### 認証
- ユーザー名・パスワードによるログイン（Workers Secrets で管理）
- セッション管理（署名済み Cookie）
- ログアウト

### 住所録 CRUD
- 一覧表示（キーワード検索、ふりがな順ソート、ページネーション 20件/ページ）
- 新規追加
- 詳細表示
- 編集
- 削除（確認ダイアログあり）

### 検索
- 氏名・ふりがな・メールアドレス・電話番号・番地での部分一致検索

### テーマカラー
- ログイン画面（右上）および住所録一覧ページのヘッダーにテーマ選択セレクトボックスを表示
- インディゴ（デフォルト）・グリーン・レッドの 3 種類
- 選択したテーマは `localStorage` に保存し、次回アクセス時も維持
- CSS カスタムプロパティ（`--color-primary-*`）で色を切り替え、フラッシュ防止のためインラインスクリプトで初期適用

## データモデル

### contacts テーブル

| カラム | 型 | 必須 | 説明 |
|-------|---|------|------|
| id | TEXT (UUID) | ✓ | 主キー |
| name | TEXT | ✓ | 氏名 |
| name_kana | TEXT | | ふりがな |
| postal_code | TEXT | | 郵便番号 |
| prefecture | TEXT | | 都道府県 |
| city | TEXT | | 市区町村 |
| address | TEXT | | 番地 |
| building | TEXT | | 建物名・部屋番号 |
| phone | TEXT | | 電話番号 |
| email | TEXT | | メールアドレス |
| notes | TEXT | | 備考（最大 1000 文字） |
| created_at | TEXT | ✓ | 作成日時（ISO 8601） |
| updated_at | TEXT | ✓ | 更新日時（ISO 8601） |

## URL 構造

| パス | メソッド | 説明 |
|------|---------|------|
| / | GET | → /contacts へリダイレクト |
| /login | GET | ログインフォーム |
| /login | POST | ログイン処理 |
| /logout | POST | ログアウト処理 |
| /contacts | GET | 一覧表示（?q=検索語&page=ページ番号） |
| /contacts/new | GET | 新規追加フォーム |
| /contacts/new | POST | 新規追加処理 |
| /contacts/:id | GET | 詳細表示 |
| /contacts/:id | POST | 削除処理（intent=delete） |
| /contacts/:id/edit | GET | 編集フォーム |
| /contacts/:id/edit | POST | 更新処理 |

## セキュリティ設計

### 認証・認可
- Cookie セッション（HttpOnly, Secure, SameSite=Lax, 署名済み）
- 未認証アクセスは /login へリダイレクト
- セッション有効期限: 8 時間

### CSRF 対策
- Synchronizer Token Pattern
- セッションに CSRF トークン（UUID）を格納
- フォームに hidden input として埋め込み
- POST 処理前にトークン照合

### 入力バリデーション
- Zod によるスキーマバリデーション（サーバーサイド）
- Drizzle ORM のプリペアドステートメントによる SQL インジェクション防止

### レスポンスヘッダー
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### その他
- robots noindex, nofollow（個人情報保護）
- タイミングセーフな認証比較（HMAC）
- ユーザー列挙攻撃防止（認証エラーメッセージを統一）

## Cloudflare Workers シークレット

以下のシークレットを `wrangler secret put` で設定する:

| 名前 | 説明 |
|------|------|
| SESSION_SECRET | セッション署名キー（32文字以上推奨） |
| AUTH_USERNAME | 管理者ユーザー名 |
| AUTH_PASSWORD | 管理者パスワード |

## デプロイ手順

```bash
# 1. D1 データベースを作成
wrangler d1 create chourei-db

# 2. wrangler.toml の database_id を更新

# 3. マイグレーションを適用
npm run db:migrate:remote

# 4. シークレットを設定
wrangler secret put SESSION_SECRET
wrangler secret put AUTH_USERNAME
wrangler secret put AUTH_PASSWORD

# 5. ビルド・デプロイ
npm run deploy
```

## ローカル開発手順

```bash
# 1. 依存パッケージのインストール
npm install

# 2. .dev.vars を作成（.dev.vars.example をコピー）
cp .dev.vars.example .dev.vars
# .dev.vars を編集して値を設定

# 3. ローカル D1 にマイグレーションを適用
npm run db:migrate:local

# 4. 開発サーバー起動
npm run dev
```
