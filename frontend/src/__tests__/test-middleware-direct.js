/**
 * Standalone middleware test script
 *
 * This is a direct script for testing Next.js middleware without relying on Jest's environment,
 * as the middleware uses Request/Response which aren't available in Node.js by default.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const dirPath = path.dirname(__filename);

const middlewarePaths = [
  path.join(dirPath, '../../src/middleware/auth.ts'),
  path.join(dirPath, '../../src/middleware/error.ts'),
  path.join(dirPath, '../../src/middleware/logging.ts')
];

// Test middleware loading
console.log('Testing middleware loading...');

async function testMiddleware() {
  try {
    for (const middlewarePath of middlewarePaths) {
      console.log(`Loading middleware from ${middlewarePath}...`);
      const middleware = await import(middlewarePath);
      if (!middleware) {
        throw new Error(`Failed to load middleware from ${middlewarePath}`);
      }
      console.log(`✅ Successfully loaded middleware from ${middlewarePath}`);
    }
    console.log('\n✅ All middleware files loaded successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error testing middleware:', error);
    process.exit(1);
  }
}

testMiddleware();
