module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2020, sourceType: "module" },
  plugins: ["@typescript-eslint", "prettier"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "next/core-web-vitals",
    "plugin:prettier/recommended", // activa eslint-plugin-prettier y eslint-config-prettier
  ],
  rules: {
    // aquí tus overrides
    "prettier/prettier": "error",
    // p.ej. deshabilita reglas que te molesten:
    // '@typescript-eslint/no-explicit-any': 'off',
  },
};
