import { defineConfig } from "vite";

// checker 専用の vitest 設定。プロジェクト本体の vite.config.ts は include を
// tests/** に限定しているため、ダンプ用の *.dump.test.ts は `npm test` では一切実行されない。
// マップを MapData → JSON へ書き出すためだけに、このファイルを明示指定して走らせる:
//   npx vitest run --config checker/checker.vitest.config.ts
export default defineConfig({
  base: "./",
  test: {
    environment: "node",
    include: ["checker/**/*.dump.test.ts"],
    // CHECK_MAP 環境変数でダンプ対象マップを切替（既定 tanada）
    globals: false,
  },
} as never);
