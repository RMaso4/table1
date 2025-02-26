import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable React Hooks exhaustive-deps rule for now
      "react-hooks/exhaustive-deps": "warn",
      // Allow unused variables for development
      "@typescript-eslint/no-unused-vars": "warn",
      // Allow conditional React hooks for now
      "react-hooks/rules-of-hooks": "warn"
    }
  }
];

export default eslintConfig;