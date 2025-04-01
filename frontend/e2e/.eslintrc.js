module.exports = {
  overrides: [
    {
      files: ["cypress.config.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-misused-promises": "off",
        "import/no-commonjs": "off",
        "import/no-dynamic-require": "off",
        "global-require": "off",
      }
    }
  ]
};