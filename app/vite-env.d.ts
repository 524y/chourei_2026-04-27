/**
 * Vite 固有の型宣言
 *
 * `import stylesheet from "./app.css?url"` のように ?url サフィックスを使う
 * Vite の URL インポートは TypeScript が標準では認識しないため、
 * ここでモジュール宣言を追加する。
 *
 * @remix-run/dev の型定義にも同様の宣言が含まれているが、
 * tsconfig で types を明示列挙しているため自動解決されない。
 */

/// <reference types="vite/client" />

declare module "*.css?url" {
  const url: string;
  export default url;
}
