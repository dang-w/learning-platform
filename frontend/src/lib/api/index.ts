import resourcesApi from './resources';
import authApi from './auth';
import knowledgeApi from './knowledge';
import learningPathApi from './learning-path';
import progressApi from './progress';
import notesApi from './notes';
import reviewsApi from './reviews';
import apiClient from './client';
import { AxiosError } from 'axios';

// URL metadata extraction API
export const extractUrlMetadata = async (url: string) => {
  try {
    const response = await apiClient.post('/api/url/extract', { url });

    return response.data;
  } catch (error) {
    console.error('Error extracting URL metadata:', error);

    if (error instanceof AxiosError && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error(error instanceof Error ? error.message : 'Failed to extract metadata');
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
