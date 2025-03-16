import {
  authApi,
  resourcesApi,
  progressApi,
  reviewsApi,
  learningPathApi,
  knowledgeApi,
} from '@/lib/api';

describe('API Index', () => {
  it('should export all API modules', () => {
    // Check that all API modules are exported
    expect(authApi).toBeDefined();
    expect(resourcesApi).toBeDefined();
    expect(progressApi).toBeDefined();
    expect(reviewsApi).toBeDefined();
    expect(learningPathApi).toBeDefined();
    expect(knowledgeApi).toBeDefined();
  });

  it('should have the correct structure for each API module', () => {
    // Check auth API structure
    expect(typeof authApi.login).toBe('function');
    expect(typeof authApi.register).toBe('function');
    expect(typeof authApi.getCurrentUser).toBe('function');
    expect(typeof authApi.logout).toBe('function');

    // Check resources API structure
    expect(typeof resourcesApi.getAllResources).toBe('function');
    expect(typeof resourcesApi.getResourcesByType).toBe('function');
    expect(typeof resourcesApi.createResource).toBe('function');
    expect(typeof resourcesApi.updateResource).toBe('function');
    expect(typeof resourcesApi.deleteResource).toBe('function');

    // Check progress API structure
    expect(typeof progressApi.addMetric).toBe('function');
    expect(typeof progressApi.getMetrics).toBe('function');
    expect(typeof progressApi.getRecentMetricsSummary).toBe('function');
    expect(typeof progressApi.generateWeeklyReport).toBe('function');

    // Check reviews API structure
    expect(typeof reviewsApi.createConcept).toBe('function');
    expect(typeof reviewsApi.getConcepts).toBe('function');
    expect(typeof reviewsApi.getConcept).toBe('function');
    expect(typeof reviewsApi.updateConcept).toBe('function');
    expect(typeof reviewsApi.deleteConcept).toBe('function');

    // Check learning path API structure
    expect(typeof learningPathApi.createMilestone).toBe('function');
    expect(typeof learningPathApi.getMilestones).toBe('function');
    expect(typeof learningPathApi.getMilestone).toBe('function');
    expect(typeof learningPathApi.createGoal).toBe('function');
    expect(typeof learningPathApi.getGoals).toBe('function');

    // Check knowledge API structure
    expect(typeof knowledgeApi.getConcepts).toBe('function');
    expect(typeof knowledgeApi.getConcept).toBe('function');
    expect(typeof knowledgeApi.createConcept).toBe('function');
    expect(typeof knowledgeApi.updateConcept).toBe('function');
    expect(typeof knowledgeApi.reviewConcept).toBe('function');
  });
});