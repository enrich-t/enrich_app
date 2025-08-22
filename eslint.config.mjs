/** Flat ESLint config to silence "no-explicit-any" only */
import js from "@eslint/js";
import next from "eslint-config-next";
import ts from "typescript-eslint";

export default [
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  next,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    },
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      }
    }
  }
];
