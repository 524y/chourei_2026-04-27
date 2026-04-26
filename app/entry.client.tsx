/**
 * Remix クライアントエントリーポイント
 *
 * ブラウザ側でのハイドレーション（サーバーが生成した HTML に
 * React イベントリスナーを取り付ける処理）を行う。
 *
 * startTransition を使う理由:
 *   ハイドレーションを非緊急のトランジションとしてマークすることで、
 *   ユーザー操作（クリック等）を優先して処理できる。
 *   React 18 の Concurrent Features を活用するための推奨パターン。
 */

import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
