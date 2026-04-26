/**
 * ContactForm コンポーネントのテスト
 *
 * テスト方針:
 *   - レンダリングが壊れていないことを確認する（回帰テスト）
 *   - フォームの構造（必須フィールド、ラベル、ボタン）を検証する
 *   - 初期値・エラー表示の動作を確認する
 *
 * @remix-run/react のモック方針:
 *   ContactForm は @remix-run/react の Form と Link を使うが、
 *   これらは DOM レンダリングに関係しないため、標準の HTML 要素に置き換える。
 *   Remix のルーティングロジックはここではテスト対象外。
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ContactForm from "./ContactForm";

// Remix のクライアントサイドルーティングコンポーネントをスタブ化
// テスト環境には Router コンテキストがないため、素の HTML 要素に置き換える
vi.mock("@remix-run/react", () => ({
  Form: ({
    children,
    method,
    action,
  }: {
    children: React.ReactNode;
    method?: string;
    action?: string;
  }) => (
    <form method={method} action={action}>
      {children}
    </form>
  ),
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

const defaultProps = {
  csrfToken: "test-csrf-token",
  action: "/contacts/new",
  submitLabel: "追加する",
  cancelHref: "/contacts",
};

describe("ContactForm", () => {
  describe("基本レンダリング", () => {
    it("送信ボタンが指定のラベルで表示される", () => {
      render(<ContactForm {...defaultProps} />);
      expect(screen.getByRole("button", { name: "追加する" })).toBeInTheDocument();
    });

    it("キャンセルリンクが正しい href で表示される", () => {
      render(<ContactForm {...defaultProps} />);
      const cancelLink = screen.getByRole("link", { name: "キャンセル" });
      expect(cancelLink).toHaveAttribute("href", "/contacts");
    });

    it("CSRF トークンが hidden input として埋め込まれている", () => {
      const { container } = render(<ContactForm {...defaultProps} />);
      const csrfInput = container.querySelector('input[name="_csrf"]') as HTMLInputElement;
      expect(csrfInput).not.toBeNull();
      expect(csrfInput.type).toBe("hidden");
      expect(csrfInput.value).toBe("test-csrf-token");
    });

    it("フォームが正しい action 属性を持つ", () => {
      const { container } = render(<ContactForm {...defaultProps} />);
      const form = container.querySelector("form");
      expect(form).toHaveAttribute("action", "/contacts/new");
    });
  });

  describe("フォームフィールド", () => {
    it("氏名フィールドが必須マーク付きで表示される", () => {
      render(<ContactForm {...defaultProps} />);
      // 「氏名」ラベルと必須アスタリスク（*）の両方が表示される
      expect(screen.getByLabelText(/氏名/)).toBeInTheDocument();
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("氏名フィールドに required 属性が付いている", () => {
      render(<ContactForm {...defaultProps} />);
      const nameInput = screen.getByLabelText(/氏名/);
      expect(nameInput).toBeRequired();
    });

    it("任意フィールド（ふりがな）は required 属性を持たない", () => {
      render(<ContactForm {...defaultProps} />);
      const kanaInput = screen.getByLabelText("ふりがな");
      expect(kanaInput).not.toBeRequired();
    });

    it("メールアドレスフィールドが email type で表示される", () => {
      render(<ContactForm {...defaultProps} />);
      const emailInput = screen.getByLabelText("メールアドレス");
      expect(emailInput).toHaveAttribute("type", "email");
    });

    it("電話番号フィールドが tel type で表示される", () => {
      render(<ContactForm {...defaultProps} />);
      const phoneInput = screen.getByLabelText("電話番号");
      expect(phoneInput).toHaveAttribute("type", "tel");
    });

    it("備考フィールドが textarea で表示される", () => {
      const { container } = render(<ContactForm {...defaultProps} />);
      const notesTextarea = container.querySelector("textarea[name='notes']");
      expect(notesTextarea).not.toBeNull();
    });
  });

  describe("初期値の設定", () => {
    it("defaultValues が渡された場合に入力フィールドに初期値が入る", () => {
      render(
        <ContactForm
          {...defaultProps}
          defaultValues={{
            name: "山田 太郎",
            email: "taro@example.com",
            phone: "03-1234-5678",
          }}
        />
      );
      expect(screen.getByLabelText(/氏名/)).toHaveValue("山田 太郎");
      expect(screen.getByLabelText("メールアドレス")).toHaveValue("taro@example.com");
      expect(screen.getByLabelText("電話番号")).toHaveValue("03-1234-5678");
    });

    it("defaultValues が未指定の場合は入力フィールドが空", () => {
      render(<ContactForm {...defaultProps} />);
      expect(screen.getByLabelText(/氏名/)).toHaveValue("");
    });
  });

  describe("エラー表示", () => {
    it("errors.name がある場合にエラーメッセージが表示される", () => {
      render(
        <ContactForm
          {...defaultProps}
          errors={{ name: ["氏名は必須です"] }}
        />
      );
      expect(screen.getByText("氏名は必須です")).toBeInTheDocument();
    });

    it("errors がない場合はエラーメッセージが表示されない", () => {
      render(<ContactForm {...defaultProps} />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("エラーのあるフィールドの input に aria-invalid が付く", () => {
      render(
        <ContactForm
          {...defaultProps}
          errors={{ name: ["エラーメッセージ"] }}
        />
      );
      const nameInput = screen.getByLabelText(/氏名/);
      expect(nameInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("ラベルバリエーション", () => {
    it("submitLabel に '更新する' を渡すとボタンテキストが変わる", () => {
      render(<ContactForm {...defaultProps} submitLabel="更新する" />);
      expect(screen.getByRole("button", { name: "更新する" })).toBeInTheDocument();
    });
  });
});
