/**
 * CSRF 保護モジュールのテスト
 *
 * csrf.server.ts は getSession（session.server.ts）に依存するため、
 * vi.mock でモック化して単体テストを行う。
 *
 * モック設計の方針:
 *   - セッションオブジェクトを Map ライクなストアとして実装する
 *   - getSession が返すオブジェクトの get/set のみモックすれば十分
 *   - AppLoadContext は auth.server.test.ts と同様に最小構成で用意する
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AppLoadContext } from "@remix-run/cloudflare";
import { getCsrfToken, verifyCsrfToken } from "./csrf.server";

// session.server モジュール全体をモック化
// getSession が返すセッションオブジェクトを制御可能にする
vi.mock("./session.server", () => ({
  getSession: vi.fn(),
}));

// モックの型付きインポート（vi.mock 後に利用する）
import { getSession } from "./session.server";
const mockGetSession = vi.mocked(getSession);

// テスト用セッションファクトリ
// key-value ストアとして動作するシンプルなオブジェクトを返す
function createMockSession(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial };
  return {
    get: vi.fn((key: string) => store[key]),
    set: vi.fn((key: string, value: unknown) => {
      store[key] = value;
    }),
    // 以下は csrf.server では使わないが型互換のために定義
    has: vi.fn((key: string) => key in store),
    unset: vi.fn(),
    flash: vi.fn(),
    data: store,
    id: "test-session-id",
  };
}

// テスト用の最小 AppLoadContext
const mockContext = {
  cloudflare: { env: {} as Env, ctx: {} as ExecutionContext },
} as AppLoadContext;

// テスト用リクエスト
const mockRequest = new Request("https://example.com/");

// テスト用 FormData ヘルパー
function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.append(key, value);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// getCsrfToken
// ============================================================
describe("getCsrfToken", () => {
  it("セッションにトークンがない場合は新規 UUID を生成してセッションに格納する", async () => {
    const session = createMockSession(); // トークンなし
    mockGetSession.mockResolvedValue(session as any);

    const { token } = await getCsrfToken(mockRequest, mockContext);

    // UUID 形式であることを確認
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    // セッションに保存されたことを確認
    expect(session.set).toHaveBeenCalledWith("csrfToken", token);
  });

  it("セッションにトークンが存在する場合は既存トークンを返す", async () => {
    const existingToken = "existing-csrf-token";
    const session = createMockSession({ csrfToken: existingToken });
    mockGetSession.mockResolvedValue(session as any);

    const { token } = await getCsrfToken(mockRequest, mockContext);

    expect(token).toBe(existingToken);
    // 既存トークンがある場合は set を呼ばない
    expect(session.set).not.toHaveBeenCalled();
  });

  it("返り値にセッションオブジェクトが含まれる（呼び出し元で commitSession するため）", async () => {
    const session = createMockSession();
    mockGetSession.mockResolvedValue(session as any);

    const { session: returnedSession } = await getCsrfToken(mockRequest, mockContext);

    expect(returnedSession).toBe(session);
  });
});

// ============================================================
// verifyCsrfToken
// ============================================================
describe("verifyCsrfToken", () => {
  it("セッションのトークンとフォームのトークンが一致すれば何もしない（正常系）", async () => {
    const token = "valid-csrf-token";
    const session = createMockSession({ csrfToken: token });
    mockGetSession.mockResolvedValue(session as any);

    const formData = makeFormData({ _csrf: token });

    // throw しないことを確認
    await expect(
      verifyCsrfToken(mockRequest, formData, mockContext)
    ).resolves.toBeUndefined();
  });

  it("トークンが一致しない場合は 403 Response を throw する", async () => {
    const session = createMockSession({ csrfToken: "session-token" });
    mockGetSession.mockResolvedValue(session as any);

    const formData = makeFormData({ _csrf: "different-token" });

    await expect(
      verifyCsrfToken(mockRequest, formData, mockContext)
    ).rejects.toBeInstanceOf(Response);

    try {
      await verifyCsrfToken(mockRequest, formData, mockContext);
    } catch (err) {
      if (err instanceof Response) {
        expect(err.status).toBe(403);
      }
    }
  });

  it("フォームに _csrf フィールドがない場合は 403 を throw する", async () => {
    const session = createMockSession({ csrfToken: "some-token" });
    mockGetSession.mockResolvedValue(session as any);

    const formData = makeFormData({}); // _csrf なし

    await expect(
      verifyCsrfToken(mockRequest, formData, mockContext)
    ).rejects.toBeInstanceOf(Response);
  });

  it("セッションにトークンがない場合は 403 を throw する", async () => {
    const session = createMockSession({}); // csrfToken なし
    mockGetSession.mockResolvedValue(session as any);

    const formData = makeFormData({ _csrf: "some-token" });

    await expect(
      verifyCsrfToken(mockRequest, formData, mockContext)
    ).rejects.toBeInstanceOf(Response);
  });

  it("空文字トークンは 403 を throw する", async () => {
    const session = createMockSession({ csrfToken: "" });
    mockGetSession.mockResolvedValue(session as any);

    const formData = makeFormData({ _csrf: "" });

    await expect(
      verifyCsrfToken(mockRequest, formData, mockContext)
    ).rejects.toBeInstanceOf(Response);
  });
});
