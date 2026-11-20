const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/", "relatorio/", "capturas/", "tools/"] },
  js.configs.recommended,
  {
    files: ["prototipo/**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "script",
      globals: { ...globals.browser, module: "readonly" }
    },
    rules: {
      eqeqeq: "error",
      "no-implicit-globals": "error",
      "no-unused-vars": ["error", { caughtErrors: "none" }]
    }
  },
  {
    files: ["tests/**/*.js", "eslint.config.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node }
  }
];
