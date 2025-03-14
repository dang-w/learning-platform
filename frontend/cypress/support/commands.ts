// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Add Testing Library commands
import '@testing-library/cypress/add-commands';

// Custom command to login programmatically
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/token',
    form: true,
    body: {
      username,
      password,
    },
  }).then((response) => {
    window.localStorage.setItem('token', response.body.access_token);
  });
});

// Custom command to check if user is logged in
Cypress.Commands.add('isLoggedIn', () => {
  return cy.window().its('localStorage').invoke('getItem', 'token').then(token => Boolean(token));
});