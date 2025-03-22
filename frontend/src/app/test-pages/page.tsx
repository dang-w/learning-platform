'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import with no SSR to avoid hydration issues
const TestPagesIndex = dynamic(
  () => import('../../e2e-testing/test-pages/index'),
  { ssr: false }
);

export default function TestPagesRoute() {
  return <TestPagesIndex />;
}