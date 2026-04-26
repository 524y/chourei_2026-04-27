/**
 * Remix の AppLoadContext に Cloudflare バインディングの型を追加する
 *
 * @remix-run/cloudflare の AppLoadContext はデフォルトでは空のオブジェクト。
 * モジュール拡張（Module Augmentation）で cloudflare プロパティを追加し、
 * ルートファイルで `context.cloudflare.env` が型安全に参照できるようにする。
 *
 * worker-configuration.d.ts の Env インターフェースと対応している。
 */

import type { AppLoadContext } from "@remix-run/cloudflare";

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

// TypeScript のモジュール拡張には export が必要
export type { AppLoadContext };
