import apiClient from './client';
import authApi from './auth';
import resourcesApi from './resources';
import progressApi from './progress';
import reviewsApi from './reviews';
import learningPathApi from './learning-path';
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
