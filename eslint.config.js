/**
 * ESLint フラット設定（ESLint 9+）
 *
 * フラット設定（eslint.config.js）を使う理由:
 *   ESLint 9 から従来の .eslintrc.* 形式が非推奨になった。
 *   フラット設定は単一ファイルで全設定を管理でき、
 *   プラグインの適用スコープをファイルグロブで明示的に制御できる。
 *
 * ルール選定方針:
 *   - typescript-eslint recommended: 型安全性に関わるルールを網羅
 *   - react-hooks: Hooks の使い方のバグを防ぐ（依存配列漏れ等）
 *   - 過度に厳しいルールは開発体験を損なうため、error/warn を選別する
 *   - テストファイルは一部ルールを緩和（any 使用等）
 */

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default tseslint.config(
  // JavaScript の推奨ルールセット
  js.configs.recommended,

  // TypeScript の推奨ルールセット
  ...tseslint.configs.recommended,

  // TypeScript / TSX ファイル向け設定
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      // React バージョンを自動検出（react/react-in-jsx-scope の判定に使用）
      react: { version: "detect" },
    },
    rules: {
      // React 17+ では JSX Transform により React の import が不要
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off", // TypeScript で型管理するため不要

      // Hooks の正しい使い方を強制（バグの温床になりやすいルール）
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // any は使わない（型安全性の確保）
      "@typescript-eslint/no-explicit-any": "warn",

      // 使っていない変数はエラー（_ プレフィックスは意図的な無視として許容）
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // 型インポートには import type を使う（バンドルサイズ最適化）
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },

  // テストファイル向けのルール緩和
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "test/**/*.ts"],
    rules: {
      // テストでのモックに any が必要なケースがある
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // ビルド成果物・依存関係はチェック対象外
  {
    ignores: [
      "build/**",
      "public/build/**",
      "node_modules/**",
      ".wrangler/**",
      "dist/**",
    ],
  }
);
