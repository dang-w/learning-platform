// Load environment variables from .env.local for Cypress dashboard integration
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Path to the .env.local file in the frontend root
const envPath = path.resolve(__dirname, '../../.env.local');

// Check if the .env.local file exists
if (fs.existsSync(envPath)) {
  console.log('Loading environment variables from .env.local');
  const envConfig = dotenv.parse(fs.readFileSync(envPath));

  // Set only the Cypress-specific environment variables
  if (envConfig.CYPRESS_PROJECT_ID) {
    process.env.CYPRESS_PROJECT_ID = envConfig.CYPRESS_PROJECT_ID;
    console.log(`Set CYPRESS_PROJECT_ID=${envConfig.CYPRESS_PROJECT_ID}`);
  }

  if (envConfig.CYPRESS_RECORD_KEY) {
    process.env.CYPRESS_RECORD_KEY = envConfig.CYPRESS_RECORD_KEY;
    console.log(`Set CYPRESS_RECORD_KEY=${envConfig.CYPRESS_RECORD_KEY.substring(0, 4)}...`);
  }
} else {
  console.warn('.env.local file not found. Cypress dashboard may not work correctly.');
}