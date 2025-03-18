import { defineConfig } from "cypress";

export default defineConfig({
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
    supportFile: "e2e-testing/cypress/support/component.ts",
    indexHtmlFile: "e2e-testing/cypress/support/component-index.html",
    specPattern: "src/**/*.cy.{js,jsx,ts,tsx}"
  },
});
