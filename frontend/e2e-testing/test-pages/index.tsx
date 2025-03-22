'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Index page for e2e test pages
 * This page provides information about the available test pages
 * and how to access them via the API route
 */
const TestPagesIndex: React.FC = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Learning Platform E2E Test Pages</h1>

      <p className="mb-4">
        These test pages provide isolated testing environments for specific features,
        allowing tests to run without authentication or API dependencies.
      </p>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-yellow-700">
          <strong>Note:</strong> These pages are only available in development mode and are meant for testing purposes.
        </p>
      </div>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Available Test Pages</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h3 className="text-xl font-medium mb-2">Resources Test</h3>
          <p className="text-gray-600 mb-4">
            Test page for resources management functionality without authentication
          </p>
          <div className="mt-4">
            <Link href="/api/e2e-test-page?page=resources" className="text-blue-600 hover:underline">
              Visit Resources Test Page
            </Link>
          </div>
        </div>

        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h3 className="text-xl font-medium mb-2">Knowledge Test</h3>
          <p className="text-gray-600 mb-4">
            Test page for knowledge management functionality without authentication
          </p>
          <div className="mt-4">
            <Link href="/api/e2e-test-page?page=knowledge" className="text-blue-600 hover:underline">
              Visit Knowledge Test Page
            </Link>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Using in Cypress Tests</h2>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <pre className="text-sm overflow-x-auto">
          {`// In your Cypress test:
cy.visitTestPage('resources');
// or
cy.visitTestPage('knowledge');`}
        </pre>
      </div>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Adding New Test Pages</h2>

      <ol className="list-decimal pl-6 mb-6 space-y-2">
        <li>Create the test page component in <code className="bg-gray-100 px-1 py-0.5 rounded">e2e-testing/test-pages/</code></li>
        <li>Update the API route in <code className="bg-gray-100 px-1 py-0.5 rounded">src/app/api/e2e-test-page/route.ts</code></li>
        <li>Add test files in <code className="bg-gray-100 px-1 py-0.5 rounded">e2e-testing/cypress/e2e/</code></li>
      </ol>

      <div className="mt-12 border-t pt-6 text-gray-500 text-sm">
        <p>Learning Platform - E2E Testing Infrastructure</p>
      </div>
    </div>
  );
};

export default TestPagesIndex;