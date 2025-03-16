import apiClient from './client';
import * as authApi from './auth';
import * as resourcesApi from './resources';
import * as progressApi from './progress';
import * as reviewsApi from './reviews';
import * as learningPathApi from './learning-path';
import knowledgeApi from './knowledge';

// URL metadata extraction API
export const extractUrlMetadata = async (url: string) => {
  try {
    const response = await fetch('/api/url/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to extract metadata');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export {
  apiClient,
  authApi,
  resourcesApi,
  progressApi,
  reviewsApi,
  learningPathApi,
  knowledgeApi,
};

export * from './auth';
export * from './resources';
export * from './progress';
export * from './reviews';
export * from './learning-path';
// Don't use export * for default exports