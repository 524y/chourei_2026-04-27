/**
 * 認証モジュールのテスト
 *
 * verifyLogin は内部で crypto.subtle（Web Crypto API）を使用するが、
 * Node 20 では crypto が globalThis に存在するため、モックなしでテストできる。
 *
 * AppLoadContext のモックについて:
 *   テスト対象の verifyLogin は context.cloudflare.env の
 *   AUTH_USERNAME / AUTH_PASSWORD しか参照しないため、
 *   その部分だけを持つ最小構成のオブジェクトを使用する。
 */

import { describe, it, expect } from "vitest";
import type { AppLoadContext } from "@remix-run/cloudflare";
import { verifyLogin } from "./auth.server";

// テスト用の最小 AppLoadContext を生成するヘルパー
function makeContext(username: string, password: string): AppLoadContext {
  return {
    cloudflare: {
      env: {
        AUTH_USERNAME: username,
        AUTH_PASSWORD: password,
      } as Env,
      ctx: {} as ExecutionContext,
    },
  };
}

describe("verifyLogin", () => {
  describe("正常系", () => {
    it("正しいユーザー名とパスワードで true を返す", async () => {
      const ctx = makeContext("admin", "correct-password");
      const result = await verifyLogin("admin", "correct-password", ctx);
      expect(result).toBe(true);
    });

    it("パスワードに記号が含まれていても認証できる", async () => {
      const ctx = makeContext("user", "p@ssw0rd!#$");
      const result = await verifyLogin("user", "p@ssw0rd!#$", ctx);
      expect(result).toBe(true);
    });

    it("ユーザー名に日本語が含まれていても認証できる", async () => {
      const ctx = makeContext("管理者", "pass");
      const result = await verifyLogin("管理者", "pass", ctx);
      expect(result).toBe(true);
    });
  });

  describe("異常系", () => {
    it("パスワードが間違っている場合は false を返す", async () => {
      const ctx = makeContext("admin", "correct-password");
      const result = await verifyLogin("admin", "wrong-password", ctx);
      expect(result).toBe(false);
    });

    it("ユーザー名が間違っている場合は false を返す", async () => {
      const ctx = makeContext("admin", "correct-password");
      const result = await verifyLogin("wrong-user", "correct-password", ctx);
      expect(result).toBe(false);
    });

    it("ユーザー名・パスワード両方が間違っている場合は false を返す", async () => {
      const ctx = makeContext("admin", "correct-password");
      const result = await verifyLogin("wrong", "wrong", ctx);
      expect(result).toBe(false);
    });

    it("空文字のユーザー名は false を返す", async () => {
      const ctx = makeContext("admin", "password");
      const result = await verifyLogin("", "password", ctx);
      expect(result).toBe(false);
    });

    it("空文字のパスワードは false を返す", async () => {
      const ctx = makeContext("admin", "password");
      const result = await verifyLogin("admin", "", ctx);
      expect(result).toBe(false);
    });

    it("大文字小文字が違うユーザー名は false を返す（厳密一致）", async () => {
      const ctx = makeContext("Admin", "password");
      const result = await verifyLogin("admin", "password", ctx);
      expect(result).toBe(false);
    });
  });

  describe("タイミング攻撃対策", () => {
    // タイミングセーフ比較が実装されていることを間接的に確認する。
    // 実際の時間差はテストでは計測しないが、関数が非同期で完了することを確認する。
    it("複数回呼び出しても一貫した結果を返す（非同期処理の安定性）", async () => {
      const ctx = makeContext("admin", "pass");
      const results = await Promise.all([
        verifyLogin("admin", "pass", ctx),
        verifyLogin("admin", "wrong", ctx),
        verifyLogin("bad", "pass", ctx),
      ]);
      expect(results).toEqual([true, false, false]);
    });
  });
});
