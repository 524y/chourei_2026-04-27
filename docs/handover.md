最終更新: 2026-04-26（wrangler ビルドパス修正）

# 引き継ぎ情報

## 現在の状態

住所録アプリケーションの初期実装 + テスト・lint・CI の整備が完了。
`wrangler.toml` のビルドパス設定ミスによるデプロイエラーを修正済み。

デプロイはまだ完了していない（要セットアップ）。

## CI ステータス

GitHub Actions（`.github/workflows/ci.yml`）が以下のタイミングで実行される:
- `main` への push / PR
- `claude/**` ブランチへの push

各 CI ステップ: **ESLint** → **型チェック（本番）** → **型チェック（テスト）** → **Vitest**

## 未完了タスク

- [x] **D1 database_id 設定**: `36dc334a-e8f6-46d6-bcdf-5667a89d5706` を wrangler.toml に設定済み
- [ ] **本番 D1 マイグレーション**: `npm run db:migrate:remote` でスキーマを適用
- [ ] **本番デプロイ**: `npm run deploy`
- [ ] **シークレット設定**: `wrangler secret put` で3つのシークレットを設定
- [ ] **E2E テスト**: Playwright によるテスト実装
- [ ] **レート制限**: ログイン試行回数の制限実装（または Cloudflare WAF の設定）

## 初回デプロイ手順

```bash
# 1. D1 データベースを作成してIDを取得
wrangler d1 create chourei-db
# → 出力された database_id を wrangler.toml に記入

# 2. 本番 D1 にマイグレーション適用
npm run db:migrate:remote

# 3. シークレットを設定
wrangler secret put SESSION_SECRET   # openssl rand -hex 32 の出力を使用
wrangler secret put AUTH_USERNAME    # ログインユーザー名
wrangler secret put AUTH_PASSWORD    # ログインパスワード

# 4. ビルド・デプロイ
npm run deploy
```

## ローカル開発手順

```bash
npm install
cp .dev.vars.example .dev.vars
# .dev.vars を編集
npm run db:migrate:local
npm run dev
```

## ディレクトリ構成

```
app/
  components/
    ContactForm.tsx       # 新規追加・編集共通フォーム
  lib/
    auth.server.ts        # 認証（タイミングセーフ比較）
    csrf.server.ts        # CSRF トークン管理
    db.server.ts          # Drizzle ORM 接続
    session.server.ts     # Cookie セッション管理
    validation.ts         # Zod バリデーションスキーマ
  routes/
    _index.tsx            # / → /contacts リダイレクト
    login.tsx             # ログイン
    logout.tsx            # ログアウト
    contacts._index.tsx   # 一覧
    contacts.new.tsx      # 新規追加
    contacts.$id.tsx      # 詳細・削除
    contacts.$id_.edit.tsx  # 編集
  entry.client.tsx
  entry.server.tsx
  root.tsx
  app.css
drizzle/
  schema.ts               # Drizzle ORM スキーマ定義
migrations/
  0001_create_contacts.sql  # 初期テーブル作成
workers/
  app.ts                  # Cloudflare Workers エントリーポイント
docs/
  spec.md                 # 仕様書
  handover.md             # このファイル
  diary/                  # 作業日報
  adr/                    # アーキテクチャ決定記録
```

## 注意点

1. **`.dev.vars` をコミットしない**: 認証情報が含まれる。`.gitignore` に登録済み
2. **`database_id` 設定済み**: `36dc334a-e8f6-46d6-bcdf-5667a89d5706` を wrangler.toml に設定済み
3. **D1 の `updated_at` 自動更新なし**: 編集処理時にアプリ側で `updatedAt` を設定している
4. **Remix routes の `_` 記法**: `contacts.$id_.edit.tsx` の `_` は Remix のフラットルート記法。
   省略すると子ルートになり Outlet が必要になる

## 連絡先

実装担当: Claude (claude/address-book-remix-workers-UrJED)
実装日: 2026-04-26
