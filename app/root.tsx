/**
 * Remix ルートコンポーネント
 *
 * すべてのルートの共通レイアウト・メタデータ・グローバルスタイルを定義する。
 * エラーバウンダリもここで実装し、未処理のエラーをユーザーフレンドリーに表示する。
 */

import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/cloudflare";

import stylesheet from "./app.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* 検索エンジンによるインデックスを無効化（個人情報を含む住所録のため） */}
        <meta name="robots" content="noindex, nofollow" />
        {/* テーマをハイドレーション前に適用してフラッシュを防ぐ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t&&t!=='indigo')document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-50 min-h-screen">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// グローバルエラーバウンダリ
// ルートの loader/action が throw した Response や Error を捕捉して表示する
export function ErrorBoundary() {
  const error = useRouteError();

  let title = "エラーが発生しました";
  let message = "予期しないエラーが発生しました。しばらく待ってから再試行してください。";
  let status = 500;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = "ページが見つかりません";
      message = "お探しのページは存在しないか、削除された可能性があります。";
    } else if (error.status === 403) {
      title = "アクセスが拒否されました";
      // 403 の詳細メッセージは外部に漏らさない（攻撃者への情報提供を防ぐ）
      message = "このページへのアクセス権限がありません。";
    } else if (error.status === 401) {
      title = "ログインが必要です";
      message = "このページを表示するにはログインが必要です。";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <p className="text-6xl font-bold text-primary">{status}</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-600">{message}</p>
        <a
          href="/"
          className="mt-6 inline-block btn-primary"
        >
          トップページへ戻る
        </a>
      </div>
    </div>
  );
}
