import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Plugin for logging backend errors during test runs
 * This captures backend errors and writes them to a log file
 * that can be included in test reports
 */
class ErrorReporter {
  constructor(options = {}) {
    this.options = {
      // Default options
      logPath: './cypress/backend-errors.log',
      includeTimestamp: true,
      appendToExisting: true,
      includeTestInfo: true,
      ...options,
    };

    this.errors = [];
    this.currentTest = null;
    this.initialized = false;
  }

  /**
   * Initialize the error reporter
   */
  initialize() {
    if (this.initialized) return;

    // Create the directory if it doesn't exist
    const logDir = path.dirname(this.options.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Clear existing log file if not appending
    if (!this.options.appendToExisting) {
      fs.writeFileSync(this.options.logPath, '');
    }

    // Log initial message
    this.logMessage(`Backend logs captured on ${new Date().toUTCString()}\n`);

    this.initialized = true;
  }

  /**
   * Set the current test being run
   * @param {string} testName - Name of the test
   */
  setCurrentTest(testName) {
    this.currentTest = testName;
  }

  /**
   * Log a server error
   * @param {Object} error - The error object
   * @param {string} error.url - The URL that caused the error
   * @param {number} error.status - HTTP status code
   * @param {string} error.message - Error message
   */
  logError(error) {
    this.initialize();

    const timestamp = this.options.includeTimestamp ? `[${new Date().toISOString()}] ` : '';
    const testInfo = this.options.includeTestInfo && this.currentTest ? `[${this.currentTest}] ` : '';

    const errorMsg = `${timestamp}${testInfo}Error ${error.status || 'unknown'}: ${error.message || 'No message'} (${error.url || 'unknown URL'})`;
    this.errors.push(errorMsg);

    // Log to file
    this.logMessage(errorMsg);

    return errorMsg;
  }

  /**
   * Log a message to the error log file
   * @param {string} message - The message to log
   */
  logMessage(message) {
    this.initialize();
    fs.appendFileSync(this.options.logPath, message + os.EOL);
  }

  /**
   * Get all errors captured during the test run
   * @returns {Array<string>} List of error messages
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Check if there were any errors during the test run
   * @returns {boolean} True if errors occurred
   */
  hasErrors() {
    return this.errors.length > 0;
  }

  /**
   * Generate a summary report of the errors
   * @returns {string} HTML summary of errors
   */
  generateSummary() {
    if (!this.hasErrors()) {
      return '<p>No backend errors detected during test run.</p>';
    }

    let summary = '<h3>Backend Errors</h3><ul>';
    this.errors.forEach(error => {
      summary += `<li>${error}</li>`;
    });
    summary += '</ul>';

    return summary;
  }

  /**
   * Reset the error reporter for a new test run
   */
  reset() {
    this.errors = [];
    this.currentTest = null;
  }
}

export default ErrorReporter;