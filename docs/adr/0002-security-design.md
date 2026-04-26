最終更新: 2026-04-26

# ADR 0002: セキュリティ設計の決定事項

## ステータス

採用済み（2026-04-26）

## コンテキスト

住所録アプリは個人情報（氏名・住所・電話番号・メールアドレス）を扱う。
公開 URL でアクセス可能なため、不正アクセスや改ざんから保護する必要がある。

## 決定事項と理由

### 1. CSRF 対策: Synchronizer Token Pattern

**決定**: セッションに UUID トークンを格納し、フォームに hidden input として埋め込む。

**理由**:
- SameSite=Lax だけでは対策が不十分なケースがある（外部サイト経由の遷移後）
- Double Submit Cookie より実装がシンプルで、セッション Cookie が署名済みのため改ざん検知できる

### 2. 認証比較: HMAC ベースのタイミングセーフ比較

**決定**: `crypto.subtle` の HMAC を使って定数時間で文字列を比較する。

**理由**:
- Node.js の `crypto.timingSafeEqual` は Workers では利用不可
- HMAC は入力長に関わらず固定長出力のため、XOR 比較が定数時間になる
- タイミング攻撃（レスポンス時間差でパスワードを推測）を防止できる

### 3. パスワード保存: Workers Secrets（平文 + 暗号化保存）

**決定**: パスワードは Workers Secrets に平文で保存し、Cloudflare の暗号化に委ねる。

**理由**:
- Workers の WebAssembly 制限（一部環境で bcrypt が動かない）を回避
- Workers Secrets は保存時に AES-256-GCM で暗号化される
- PBKDF2 は Web Crypto API で利用可能だが、salt の管理が複雑になる
- 個人利用のシンプルなアプリには Over-Engineering を避けた

**将来的な改善**:
- 利用者が増えた場合は PBKDF2 による派生鍵での比較に移行を検討

### 4. セッション有効期限: 8 時間

**決定**: `maxAge: 60 * 60 * 8`（8時間）

**理由**:
- 1 日の業務時間をカバーしつつ、長期間の放置セッションを防ぐ
- 住所録は頻繁にアクセスするツールではないため、適切な値

### 5. UUID 主キー（IDOR 対策）

**決定**: contacts テーブルの主キーに `crypto.randomUUID()` を使用。

**理由**:
- 連番 ID（1, 2, 3...）は URL から総件数が推測可能で、IDOR（Insecure Direct Object Reference）攻撃に悪用される
- UUID は 128 bit のランダム値なので推測が事実上不可能

### 6. robots noindex, nofollow

**決定**: `<meta name="robots" content="noindex, nofollow">` を付与

**理由**:
- 住所録データが検索エンジンにインデックスされることを防ぐ
- Google Bot 等のクローリングによる個人情報の漏洩を防止

## 既知の制限・将来の課題

| 課題 | 優先度 | 対応策候補 |
|------|--------|----------|
| ログイン失敗回数制限なし | 中 | Cloudflare WAF Rate Limiting / KV 利用 |
| 単一ユーザー認証 | 低 | Workers D1 にユーザーテーブルを追加 |
| パスワードリセット機能なし | 低 | `wrangler secret put` で手動変更 |
| 監査ログなし | 低 | D1 に audit_logs テーブルを追加 |
