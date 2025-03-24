import resourcesApi from './resources';
import authApi from './auth';
import knowledgeApi from './knowledge';
import learningPathApi from './learning-path';
import progressApi from './progress';
import notesApi from './notes';
import reviewsApi from './reviews';

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
  resourcesApi,
  authApi,
  knowledgeApi,
  learningPathApi,
  progressApi,
  notesApi,
  reviewsApi
};
