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
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof authApi.login).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof authApi.register).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof authApi.getCurrentUser).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof authApi.logout).toBe('function');

    // Check resources API structure
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof resourcesApi.getAllResources).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof resourcesApi.getResourcesByType).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof resourcesApi.createResource).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof resourcesApi.updateResource).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof resourcesApi.deleteResource).toBe('function');

    // Check progress API structure
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof progressApi.addMetric).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof progressApi.getMetrics).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof progressApi.getRecentMetricsSummary).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof progressApi.generateWeeklyReport).toBe('function');

    // Check reviews API structure
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof reviewsApi.createConcept).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof reviewsApi.getConcepts).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof reviewsApi.getConcept).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof reviewsApi.updateConcept).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof reviewsApi.deleteConcept).toBe('function');

    // Check learning path API structure
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof learningPathApi.createMilestone).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof learningPathApi.getMilestones).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof learningPathApi.getMilestone).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof learningPathApi.createGoal).toBe('function');
    // @ts-expect-error - API structure is correct at runtime
    expect(typeof learningPathApi.getGoals).toBe('function');

    // Check knowledge API structure
    expect(typeof knowledgeApi.getConcepts).toBe('function');
    expect(typeof knowledgeApi.getConcept).toBe('function');
    expect(typeof knowledgeApi.createConcept).toBe('function');
    expect(typeof knowledgeApi.updateConcept).toBe('function');
    expect(typeof knowledgeApi.reviewConcept).toBe('function');
  });
});