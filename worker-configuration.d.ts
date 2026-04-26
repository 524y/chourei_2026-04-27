/**
 * Cloudflare Workers 環境変数・バインディングの型定義
 *
 * `wrangler typegen` コマンドで wrangler.toml から自動生成することもできるが、
 * シークレット（wrangler secret put で設定する値）は wrangler.toml に含まれないため
 * 手動でここに追記する。
 *
 * 本番環境では `wrangler secret put` で設定する値:
 *   - SESSION_SECRET : セッション Cookie の署名に使用する乱数文字列
 *   - AUTH_USERNAME  : 管理者ユーザー名
 *   - AUTH_PASSWORD  : 管理者パスワード
 *
 * ローカル開発では .dev.vars ファイルに同名の変数を記載する。
 */

interface Env {
  // D1 データベース（wrangler.toml の binding 名と一致させる）
  DB: D1Database;

  // セッション Cookie の署名キー（32文字以上の乱数文字列を推奨）
  SESSION_SECRET: string;

  // 管理者認証情報（wrangler secret put で設定する）
  AUTH_USERNAME: string;
  AUTH_PASSWORD: string;
}
