import { useState, useCallback } from 'react';
import { extractUrlMetadata } from '@/lib/api';

interface UrlMetadata {
  title?: string;
  description?: string;
  image?: string;
  url: string;
  site_name?: string;
  estimated_time?: number;
  topics?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  resource_type?: 'articles' | 'videos' | 'courses' | 'books';
}

interface UseUrlMetadataResult {
  metadata: UrlMetadata | null;
  isExtracting: boolean;
  error: string | null;
  extractMetadata: (url: string) => Promise<UrlMetadata | void>;
}

export const useUrlMetadata = (): UseUrlMetadataResult => {
  const [metadata, setMetadata] = useState<UrlMetadata | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const extractMetadata = useCallback(async (url: string) => {
    if (!url) {
      setError('Please enter a URL first');
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      const result = await extractUrlMetadata(url);
      setMetadata(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract metadata from URL';
      setError(errorMessage);
      console.error('Metadata extraction error:', err);
      throw err;
    } finally {
      setIsExtracting(false);
    }
  }, []);

  return {
    metadata,
    isExtracting,
    error,
    extractMetadata,
  };
};