/**
 * Vitest グローバルセットアップ
 *
 * @testing-library/jest-dom をインポートすることで、
 * toBeInTheDocument(), toHaveValue() 等のカスタムマッチャーが
 * expect() で使えるようになる。
 *
 * このファイルは vitest.config.ts の setupFiles に指定されており、
 * 各テストファイルより先に実行される。
 */
import "@testing-library/jest-dom";
