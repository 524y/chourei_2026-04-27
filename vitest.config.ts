/**
 * Vitest 設定ファイル
 *
 * テストフレームワークに Vitest を選んだ理由:
 *   - このプロジェクトは Vite ベースなので Vitest と相性が良い（設定を共有できる）
 *   - ES Module ネイティブで動作し、Cloudflare Workers の ESM 環境と一致する
 *   - Jest 互換の API なので移行コストが低い
 *   - vite-tsconfig-paths を共有することで ~/lib/... エイリアスがテストでも動作する
 *
 * テスト環境に happy-dom を選んだ理由:
 *   - jsdom より軽量・高速
 *   - React Testing Library と互換性がある
 *   - FormData, crypto 等の Web API が Node 20 ネイティブで利用可能なため
 *     Workers との差異が小さい
 *
 * Cloudflare Workers 固有の API（D1, KV 等）を直接テストしない理由:
 *   - Worker バインディングのテストは @cloudflare/vitest-pool-workers が必要で複雑
 *   - DB アクセスは Drizzle ORM + D1 に委ねており、ここでは単体テストしない
 *   - ビジネスロジック（バリデーション・認証・CSRF）のみをテスト対象とする
 */

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // tsconfig.json の paths エイリアス（~/*）をテスト環境でも解決する
    tsconfigPaths(),
  ],
  test: {
    // DOM API（document, window 等）を提供する軽量環境
    environment: "happy-dom",

    // グローバル（describe, it, expect）は使わず、各テストで明示的にインポートする。
    // 明示的インポートの方が型推論が確実で、IDE の補完も効く。
    globals: false,

    // テスト実行前のセットアップファイル
    setupFiles: ["./test/setup.ts"],

    // カバレッジ設定（npm run test:coverage で実行）
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // カバレッジ対象: ビジネスロジックとコンポーネントのみ
      include: ["app/lib/**/*.ts", "app/components/**/*.tsx"],
      // テストファイル自体はカバレッジ対象外
      exclude: ["**/*.test.ts", "**/*.test.tsx"],
    },
  },
});
