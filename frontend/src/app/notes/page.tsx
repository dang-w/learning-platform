'use client';

import React, { Suspense } from 'react';
import { NotesPage } from '@/components/notes';

export default function Notes() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    }>
      <NotesPage />
    </Suspense>
  );
}