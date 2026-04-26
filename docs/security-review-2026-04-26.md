# Security review (2026-04-26)

## 結論（公開可否）

- **コードベースに直ちに公開停止レベルの脆弱性は見当たりません**（認証必須、CSRF対策、ORM利用、Cookie設定、基本的なセキュリティヘッダーが実装済み）。
- ただし、**インターネット公開（特に GitHub で公開後にデプロイ）を前提とすると、追加で対応すべき運用上のセキュリティ課題**があります。

## 確認した主な実装（良い点）

1. **認証前提のアクセス制御**
   - 主要ルートが `requireUserSession` を通過し、未認証時は `/login` へリダイレクト。
2. **CSRF 対策**
   - Synchronizer Token Pattern を採用し、ログイン/ログアウト/更新/削除系で検証。
3. **SQL インジェクション対策**
   - Drizzle ORM を使用してクエリを構築。
4. **Cookie セキュリティ**
   - `httpOnly`, `sameSite`, `secure(本番時)` を設定。
5. **基本ヘッダー**
   - CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` を設定。
6. **機密情報の管理方針**
   - シークレットは `wrangler secret put` を想定し、リポジトリ内に平文を置かない方針。

## 公開前に対応推奨（優先順）

### P1: ログイン試行のレート制限

- 現状は認証失敗の回数制限がアプリ内に実装されていません。
- 公開後はパスワード総当たり・credential stuffing の対象になります。
- **推奨**: Cloudflare WAF / Rate Limiting（または Turnstile 連携）を導入。

### P1: 認証方式（単一共通ID/パスワード）

- `AUTH_USERNAME` / `AUTH_PASSWORD` による1アカウント運用はシンプルですが、
  パスワード漏えい時の影響が全件に及びます。
- **推奨**: 少なくとも強力な長いパスワード + 定期ローテーション。可能なら IdP 連携（Cloudflare Access / OAuth）へ移行。

### P2: CSP の強化余地

- `script-src 'unsafe-inline'` は XSS 耐性を下げます。
- **推奨**: nonce/hash ベース CSP に段階移行し、`unsafe-inline` を廃止。

### P2: セキュリティ運用ドキュメント整備

- 公開リポジトリでは、脆弱性報告窓口と対応方針の明記が重要です。
- **推奨**: `SECURITY.md` を追加し、報告フロー・SLA・サポート対象バージョンを記載。

## GitHub 公開時のチェックリスト

- [ ] `.dev.vars` が追跡されていないことを再確認（`git status --ignored`）
- [ ] Cloudflare Secrets を本番環境に設定済み
- [ ] 初期パスワードを十分に強い値へ変更
- [ ] Rate Limiting / WAF の有効化
- [ ] `SECURITY.md` の追加

## 今回実行した確認コマンド

- `npm test`（成功）
- `npm run lint`（成功）
- `npm run build`（成功）
- `npm audit --audit-level=moderate`（環境側の 403 により実施不可）

