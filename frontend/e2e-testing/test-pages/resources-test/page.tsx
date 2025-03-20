'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import with no SSR to avoid hydration issues
const ResourcesTestPage = dynamic(
  () => import('../../../../e2e-testing/test-pages/resources-test'),
  { ssr: false }
);

export default function ResourcesTestRoute() {
  return <ResourcesTestPage />;
}