module.exports = [
  {
    files: ["**/*.html"],
    languageOptions: {
      parser: require("@html-eslint/parser"),
      ecmaVersion: 2021,
      sourceType: "module"
    },
    plugins: {
      "@html-eslint": require("@html-eslint/eslint-plugin")
    },
    rules: {
      "@html-eslint/require-closing-tags": "error",
      "@html-eslint/require-open-tag-name": "error",
      "@html-eslint/no-duplicate-attributes": "error",
      "@html-eslint/no-inline-styles": "off",
      "@html-eslint/element-newline": "off",
      "@html-eslint/no-extra-spacing-attrs": "off"
    }
  }
];