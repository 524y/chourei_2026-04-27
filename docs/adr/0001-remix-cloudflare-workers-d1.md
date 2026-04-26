最終更新: 2026-04-26

# ADR 0001: Remix + Cloudflare Workers + D1 の採用

## ステータス

採用済み（2026-04-26）

## コンテキスト

個人向け住所録 Web アプリを無料で公開・運用したい。
要件：
- 無料で運用できること（サーバーコスト ゼロ）
- 公開 URL でアクセスできること
- データを永続化できること
- セキュリティを確保できること

## 決定

Remix v2 + Cloudflare Workers + Cloudflare D1 の組み合わせを採用する。

## 理由

### Cloudflare Workers を選んだ理由

1. **無料プランの充実**: Workers は無料プランでも無制限のリクエストに対応
2. **D1 が無料**: SQLite 互換の D1 データベースが無料枠内で利用可能
3. **エッジ実行**: 世界中のエッジサーバーで実行されるため低レイテンシ
4. **公式 Remix サポート**: `@remix-run/cloudflare-workers` パッケージで公式対応

### Remix を選んだ理由

1. **SSR 標準**: サーバーサイドレンダリングが標準で、SEO や初期表示が速い
2. **Progressive Enhancement**: JavaScript なしでもフォームが動作する
3. **型安全**: TypeScript 対応が強力
4. **Cloudflare Workers 対応**: 公式アダプターあり

### React Router v7 を選ばなかった理由

- ユーザーが Remix と指定したため
- Remix v2 も継続サポート中であり、機能的に問題なし
- React Router v7 への移行は将来の判断に委ねる

### Drizzle ORM を選んだ理由

1. **D1 公式サポート**: `drizzle-orm/d1` ドライバが安定
2. **エッジ対応**: Prisma と違い Workers 環境でも動作する
3. **型安全**: TypeScript のスキーマ定義から型が自動推論される
4. **軽量**: バンドルサイズが小さい

### Cookie セッションを選んだ理由

- KV ストアの書き込み上限（無料プラン: 1,000回/日）を消費しない
- `createCookieSessionStorage` で署名済み Cookie を生成でき、改ざん検知が容易

## トレードオフ・リスク

| リスク | 対策 |
|--------|------|
| パスワードハッシュが bcrypt/argon2 でない | Workers Secrets の暗号化保存 + 強パスワード運用 |
| レート制限なし（無料プラン） | Cloudflare WAF の利用を推奨 |
| D1 の無料枠上限 | 住所録規模（数千件以下）では問題なし |
| 単一管理者のみ | 個人利用を前提としているため許容 |

## 代替案と不採用理由

| 代替案 | 不採用理由 |
|--------|-----------|
| Vercel + Prisma + PostgreSQL | 無料プランのデータベース容量が限られる |
| Supabase | 無料プランは 2 プロジェクト限定、スリープあり |
| Firebase | 学習コスト、Cold Start の問題 |
