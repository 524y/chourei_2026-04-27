/**
 * バリデーションスキーマのテスト
 *
 * validation.ts は Zod スキーマのみで構成された純粋関数なので、
 * モック不要で最もテストしやすいモジュール。
 * 境界値・正常系・異常系を網羅してバリデーションルールの仕様を保証する。
 */

import { describe, it, expect } from "vitest";
import { ContactSchema, LoginSchema } from "./validation";

// ============================================================
// ContactSchema
// ============================================================
describe("ContactSchema", () => {
  describe("name（必須）", () => {
    it("有効な氏名でパースできる", () => {
      const result = ContactSchema.safeParse({ name: "山田 太郎" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.name).toBe("山田 太郎");
    });

    it("前後の空白はトリムされる", () => {
      const result = ContactSchema.safeParse({ name: "  山田  " });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.name).toBe("山田");
    });

    it("空文字はエラーになる", () => {
      const result = ContactSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.name).toContain("氏名は必須です");
      }
    });

    it("空白のみはエラーになる（トリム後に空になるため）", () => {
      const result = ContactSchema.safeParse({ name: "   " });
      expect(result.success).toBe(false);
    });

    it("100文字はOK（境界値）", () => {
      const result = ContactSchema.safeParse({ name: "あ".repeat(100) });
      expect(result.success).toBe(true);
    });

    it("101文字はエラーになる（境界値）", () => {
      const result = ContactSchema.safeParse({ name: "あ".repeat(101) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.name).toContain(
          "氏名は100文字以内で入力してください"
        );
      }
    });
  });

  describe("postalCode（任意）", () => {
    it("ハイフンあり郵便番号はOK", () => {
      const result = ContactSchema.safeParse({ name: "テスト", postalCode: "100-0001" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.postalCode).toBe("100-0001");
    });

    it("ハイフンなし郵便番号はOK", () => {
      const result = ContactSchema.safeParse({ name: "テスト", postalCode: "1000001" });
      expect(result.success).toBe(true);
    });

    it("形式が違う郵便番号はエラー", () => {
      const result = ContactSchema.safeParse({ name: "テスト", postalCode: "12345" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.postalCode).toContain(
          "郵便番号の形式が正しくありません（例: 100-0001）"
        );
      }
    });

    it("空文字は undefined になる（任意フィールド）", () => {
      const result = ContactSchema.safeParse({ name: "テスト", postalCode: "" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.postalCode).toBeUndefined();
    });

    it("未指定は undefined になる", () => {
      const result = ContactSchema.safeParse({ name: "テスト" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.postalCode).toBeUndefined();
    });
  });

  describe("email（任意）", () => {
    it("有効なメールアドレスはOK", () => {
      const result = ContactSchema.safeParse({ name: "テスト", email: "test@example.com" });
      expect(result.success).toBe(true);
    });

    it("不正なメールアドレスはエラー", () => {
      const result = ContactSchema.safeParse({ name: "テスト", email: "not-an-email" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toContain(
          "メールアドレスの形式が正しくありません"
        );
      }
    });

    it("空文字は undefined になる", () => {
      const result = ContactSchema.safeParse({ name: "テスト", email: "" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.email).toBeUndefined();
    });
  });

  describe("phone（任意）", () => {
    it("ハイフン区切りの電話番号はOK", () => {
      const result = ContactSchema.safeParse({ name: "テスト", phone: "03-1234-5678" });
      expect(result.success).toBe(true);
    });

    it("国際形式はOK", () => {
      const result = ContactSchema.safeParse({ name: "テスト", phone: "+81-3-1234-5678" });
      expect(result.success).toBe(true);
    });

    it("英字を含む電話番号はエラー", () => {
      const result = ContactSchema.safeParse({ name: "テスト", phone: "090-XXXX-XXXX" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.phone).toContain(
          "電話番号に使用できない文字が含まれています"
        );
      }
    });

    it("空文字は undefined になる", () => {
      const result = ContactSchema.safeParse({ name: "テスト", phone: "" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.phone).toBeUndefined();
    });
  });

  describe("notes（任意）", () => {
    it("1000文字はOK（境界値）", () => {
      const result = ContactSchema.safeParse({ name: "テスト", notes: "あ".repeat(1000) });
      expect(result.success).toBe(true);
    });

    it("1001文字はエラー（境界値）", () => {
      const result = ContactSchema.safeParse({ name: "テスト", notes: "あ".repeat(1001) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.notes).toContain(
          "備考は1000文字以内で入力してください"
        );
      }
    });
  });

  describe("全フィールドが有効", () => {
    it("すべてのフィールドが有効なデータはパースできる", () => {
      const result = ContactSchema.safeParse({
        name: "山田 太郎",
        nameKana: "やまだ たろう",
        postalCode: "100-0001",
        prefecture: "東京都",
        city: "千代田区",
        address: "1-1-1",
        building: "霞が関ビル 101",
        phone: "03-1234-5678",
        email: "taro@example.com",
        notes: "備考欄のテキスト",
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================
// LoginSchema
// ============================================================
describe("LoginSchema", () => {
  it("有効なユーザー名とパスワードはパースできる", () => {
    const result = LoginSchema.safeParse({ username: "admin", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("ユーザー名が空はエラー", () => {
    const result = LoginSchema.safeParse({ username: "", password: "secret" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.username).toContain(
        "ユーザー名を入力してください"
      );
    }
  });

  it("パスワードが空はエラー", () => {
    const result = LoginSchema.safeParse({ username: "admin", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        "パスワードを入力してください"
      );
    }
  });

  it("両方空はエラー（両フィールドにエラーが付く）", () => {
    const result = LoginSchema.safeParse({ username: "", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.username).toBeDefined();
      expect(errors.password).toBeDefined();
    }
  });
});
