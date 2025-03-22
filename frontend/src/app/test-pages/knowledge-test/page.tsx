'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import with no SSR to avoid hydration issues
const KnowledgeTestPage = dynamic(
  () => import('../../../e2e-testing/test-pages/knowledge-test'),
  { ssr: false }
);

export default function KnowledgeTestRoute() {
  return <KnowledgeTestPage />;
}