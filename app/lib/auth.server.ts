/**
 * 認証モジュール
 *
 * 設計方針:
 *   - パスワードは Wrangler Secret（AUTH_PASSWORD）として保存する。
 *     Cloudflare Workers のシークレットは保存時に暗号化され、
 *     wrangler.toml やソースコードには平文で現れない。
 *
 *   - タイミング攻撃（Timing Attack）対策:
 *     単純な === 比較では処理時間が文字列の一致度に依存し、
 *     攻撃者がレスポンス時間差を計測することで正しい文字列を推測できる。
 *     HMAC を使った比較では入力に関わらず同一時間で比較できる。
 *
 *   - ユーザー名・パスワードを両方常に検証する:
 *     「ユーザー名が間違っている」「パスワードが間違っている」を区別して
 *     返すと、有効なユーザー名の存在確認（ユーザー列挙）に悪用される。
 *     そのため常に同じエラーメッセージを返す。
 *
 *   - レート制限について:
 *     Cloudflare Workers の無料プランには Cloudflare Rate Limiting は
 *     含まれないため、ログインの連続失敗はアプリ側で制御できない。
 *     本番環境では Cloudflare の WAF や Rate Limiting（有料）の追加を推奨。
 */

import type { AppLoadContext } from "@remix-run/cloudflare";

/**
 * HMAC を用いたタイミングセーフな文字列比較
 *
 * 同一の HMAC キーで両文字列を署名し、固定長のバイト列を XOR で比較する。
 * HMAC 出力は常に 32 バイト（SHA-256）なので比較時間が一定になる。
 * キーはリクエストごとにランダム生成するため、外部から HMAC 値を予測できない。
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();

  // リクエストごとに異なるランダムキーを生成（再利用攻撃を防止）
  const key = await crypto.subtle.importKey(
    "raw",
    crypto.getRandomValues(new Uint8Array(32)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ]);

  const hashA = new Uint8Array(sigA);
  const hashB = new Uint8Array(sigB);

  // XOR で全バイトを比較。早期リターンしないので常に固定時間
  let diff = 0;
  for (let i = 0; i < hashA.length; i++) {
    diff |= hashA[i] ^ hashB[i];
  }
  return diff === 0;
}

/**
 * ユーザー名とパスワードを検証する。
 * 両方を常に比較してからブール値を返す（短絡評価でのタイミング差を防ぐ）。
 */
export async function verifyLogin(
  username: string,
  password: string,
  context: AppLoadContext
): Promise<boolean> {
  const { AUTH_USERNAME, AUTH_PASSWORD } = context.cloudflare.env;

  // 両方を並行して検証し、短絡評価によるタイミング差を排除する
  const [usernameMatch, passwordMatch] = await Promise.all([
    timingSafeEqual(username, AUTH_USERNAME),
    timingSafeEqual(password, AUTH_PASSWORD),
  ]);

  // AND ではなく両方を評価してから判定（短絡評価を避ける）
  return usernameMatch && passwordMatch;
}
