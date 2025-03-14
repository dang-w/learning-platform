import learningPathApi, {
  Milestone,
  MilestoneCreate,
  MilestoneUpdate,
  Goal,
  GoalCreate,
  GoalUpdate,
  Roadmap,
  RoadmapCreate,
  RoadmapUpdate,
  LearningPathProgress,
} from '@/lib/api/learning-path';
import apiClient from '@/lib/api/client';
import { LearningPath } from '@/types/learning-path';

// Mock the apiClient
jest.mock('@/lib/api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('Learning Path API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Milestones
  describe('createMilestone', () => {
    it('should call the createMilestone endpoint', async () => {
      // Mock response
      const mockMilestone: Milestone = {
        id: '1',
        title: 'Test Milestone',
        description: 'Test Description',
        target_date: '2023-12-31',
        verification_method: 'Project completion',
        resources: ['resource1', 'resource2'],
        completed: false,
        completion_date: null,
        notes: '',
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockMilestone });

      // Test data
      const milestoneData: MilestoneCreate = {
        title: 'Test Milestone',
        description: 'Test Description',
        target_date: '2023-12-31',
        verification_method: 'Project completion',
        resources: ['resource1', 'resource2'],
      };

      // Call the function
      const result = await learningPathApi.createMilestone(milestoneData);

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/api/learning-path/milestones', milestoneData);
      expect(result).toEqual(mockMilestone);
    });
  });

  describe('getMilestones', () => {
    it('should call the getMilestones endpoint without params', async () => {
      // Mock response
      const mockMilestones: Milestone[] = [
        {
          id: '1',
          title: 'Test Milestone',
          description: 'Test Description',
          target_date: '2023-12-31',
          verification_method: 'Project completion',
          resources: ['resource1', 'resource2'],
          completed: false,
          completion_date: null,
          notes: '',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockMilestones });

      // Call the function
      const result = await learningPathApi.getMilestones();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/learning-path/milestones');
      expect(result).toEqual(mockMilestones);
    });

    it('should call the getMilestones endpoint with completed param', async () => {
      // Mock response
      const mockMilestones: Milestone[] = [
        {
          id: '1',
          title: 'Test Milestone',
          description: 'Test Description',
          target_date: '2023-12-31',
          verification_method: 'Project completion',
          resources: ['resource1', 'resource2'],
          completed: true,
          completion_date: '2023-12-15',
          notes: 'Completed early',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockMilestones });

      // Call the function
      const result = await learningPathApi.getMilestones(true);

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/learning-path/milestones?completed=true');
      expect(result).toEqual(mockMilestones);
    });
  });

  describe('getMilestone', () => {
    it('should call the getMilestone endpoint', async () => {
      // Mock response
      const mockMilestone: Milestone = {
        id: '1',
        title: 'Test Milestone',
        description: 'Test Description',
        target_date: '2023-12-31',
        verification_method: 'Project completion',
        resources: ['resource1', 'resource2'],
        completed: false,
        completion_date: null,
        notes: '',
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockMilestone });

      // Call the function
      const result = await learningPathApi.getMilestone('1');

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/learning-path/milestones/1');
      expect(result).toEqual(mockMilestone);
    });
  });

  describe('updateMilestone', () => {
    it('should call the updateMilestone endpoint', async () => {
      // Mock response
      const mockMilestone: Milestone = {
        id: '1',
        title: 'Updated Milestone',
        description: 'Updated Description',
        target_date: '2023-12-31',
        verification_method: 'Project completion',
        resources: ['resource1', 'resource2', 'resource3'],
        completed: true,
        completion_date: '2023-12-15',
        notes: 'Completed early',
      };
      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockMilestone });

      // Test data
      const milestoneId = '1';
      const milestoneData: MilestoneUpdate = {
        title: 'Updated Milestone',
        description: 'Updated Description',
        resources: ['resource1', 'resource2', 'resource3'],
        completed: true,
        notes: 'Completed early',
      };

      // Call the function
      const result = await learningPathApi.updateMilestone(milestoneId, milestoneData);

      // Assertions
      expect(apiClient.put).toHaveBeenCalledWith('/api/learning-path/milestones/1', milestoneData);
      expect(result).toEqual(mockMilestone);
    });
  });

  describe('deleteMilestone', () => {
    it('should call the deleteMilestone endpoint', async () => {
      // Mock response
      (apiClient.delete as jest.Mock).mockResolvedValue({});

      // Call the function
      await learningPathApi.deleteMilestone('1');

      // Assertions
      expect(apiClient.delete).toHaveBeenCalledWith('/api/learning-path/milestones/1');
    });
  });

  // Goals
  describe('createGoal', () => {
    it('should call the createGoal endpoint', async () => {
      // Mock response
      const mockGoal: Goal = {
        id: '1',
        title: 'Test Goal',
        description: 'Test Description',
        target_date: '2023-12-31',
        priority: 1,
        category: 'career',
        completed: false,
        completion_date: null,
        notes: '',
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockGoal });

      // Test data
      const goalData: GoalCreate = {
        title: 'Test Goal',
        description: 'Test Description',
        target_date: '2023-12-31',
        priority: 1,
        category: 'career',
      };

      // Call the function
      const result = await learningPathApi.createGoal(goalData);

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/api/learning-path/goals', goalData);
      expect(result).toEqual(mockGoal);
    });
  });

  describe('getGoals', () => {
    it('should call the getGoals endpoint without params', async () => {
      // Mock response
      const mockGoals: Goal[] = [
        {
          id: '1',
          title: 'Test Goal',
          description: 'Test Description',
          target_date: '2023-12-31',
          priority: 1,
          category: 'career',
          completed: false,
          completion_date: null,
          notes: '',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGoals });

      // Call the function
      const result = await learningPathApi.getGoals();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/learning-path/goals');
      expect(result).toEqual(mockGoals);
    });

    it('should call the getGoals endpoint with params', async () => {
      // Mock response
      const mockGoals: Goal[] = [
        {
          id: '1',
          title: 'Test Goal',
          description: 'Test Description',
          target_date: '2023-12-31',
          priority: 1,
          category: 'career',
          completed: true,
          completion_date: '2023-12-15',
          notes: 'Completed early',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGoals });

      // Call the function
      const result = await learningPathApi.getGoals(true, 'career');

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/learning-path/goals?completed=true&category=career');
      expect(result).toEqual(mockGoals);
    });
  });

  describe('getGoal', () => {
    it('should call the getGoal endpoint', async () => {
      // Mock response
      const mockGoal: Goal = {
        id: '1',
        title: 'Test Goal',
        description: 'Test Description',
        target_date: '2023-12-31',
        priority: 1,
        category: 'career',
        completed: false,
        completion_date: null,
        notes: '',
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockGoal });

      // Call the function
      const result = await learningPathApi.getGoal('1');

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/learning-path/goals/1');
      expect(result).toEqual(mockGoal);
    });
  });

  describe('updateGoal', () => {
    it('should call the updateGoal endpoint', async () => {
      // Mock response
      const mockGoal: Goal = {
        id: '1',
        title: 'Updated Goal',
        description: 'Updated Description',
        target_date: '2023-12-31',
        priority: 2,
        category: 'career',
        completed: true,
        completion_date: '2023-12-15',
        notes: 'Completed early',
      };
      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockGoal });

      // Test data
      const goalId = '1';
      const goalData: GoalUpdate = {
        title: 'Updated Goal',
        description: 'Updated Description',
        priority: 2,
        completed: true,
        notes: 'Completed early',
      };

      // Call the function
      const result = await learningPathApi.updateGoal(goalId, goalData);

      // Assertions
      expect(apiClient.put).toHaveBeenCalledWith('/api/learning-path/goals/1', goalData);
      expect(result).toEqual(mockGoal);
    });
  });

  describe('deleteGoal', () => {
    it('should call the deleteGoal endpoint', async () => {
      // Mock response
      (apiClient.delete as jest.Mock).mockResolvedValue({});

      // Call the function
      await learningPathApi.deleteGoal('1');

      // Assertions
      expect(apiClient.delete).toHaveBeenCalledWith('/api/learning-path/goals/1');
    });
  });

  // Roadmap
  describe('createRoadmap', () => {
    it('should call the createRoadmap endpoint', async () => {
      // Mock response
      const mockRoadmap: Roadmap = {
        id: '1',
        title: 'Test Roadmap',
        description: 'Test Description',
        phases: [
          {
            title: 'Phase 1',
            description: 'Phase 1 Description',
            items: [
              { title: 'Item 1', completed: false },
              { title: 'Item 2', completed: false },
            ],
          },
        ],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockRoadmap });

      // Test data
      const roadmapData: RoadmapCreate = {
        title: 'Test Roadmap',
        description: 'Test Description',
        phases: [
          {
            title: 'Phase 1',
            description: 'Phase 1 Description',
            items: [
              { title: 'Item 1', completed: false },
              { title: 'Item 2', completed: false },
            ],
          },
        ],
      };

      // Call the function
      const result = await learningPathApi.createRoadmap(roadmapData);

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/api/learning-path/roadmap', roadmapData);
      expect(result).toEqual(mockRoadmap);
    });
  });

  describe('getRoadmap', () => {
    it('should call the getRoadmap endpoint', async () => {
      // Mock response
      const mockRoadmap: Roadmap = {
        id: '1',
        title: 'Test Roadmap',
        description: 'Test Description',
        phases: [
          {
            title: 'Phase 1',
            description: 'Phase 1 Description',
            items: [
              { title: 'Item 1', completed: false },
              { title: 'Item 2', completed: false },
            ],
          },
        ],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockRoadmap });

      // Call the function
      const result = await learningPathApi.getRoadmap();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/learning-path/roadmap');
      expect(result).toEqual(mockRoadmap);
    });
  });

  describe('updateRoadmap', () => {
    it('should call the updateRoadmap endpoint', async () => {
      // Mock response
      const mockRoadmap: Roadmap = {
        id: '1',
        title: 'Updated Roadmap',
        description: 'Updated Description',
        phases: [
          {
            title: 'Phase 1',
            description: 'Phase 1 Description',
            items: [
              { title: 'Item 1', completed: true },
              { title: 'Item 2', completed: false },
              { title: 'Item 3', completed: false },
            ],
          },
        ],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
      };
      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockRoadmap });

      // Test data
      const roadmapData: RoadmapUpdate = {
        title: 'Updated Roadmap',
        description: 'Updated Description',
        phases: [
          {
            title: 'Phase 1',
            description: 'Phase 1 Description',
            items: [
              { title: 'Item 1', completed: true },
              { title: 'Item 2', completed: false },
              { title: 'Item 3', completed: false },
            ],
          },
        ],
      };

      // Call the function
      const result = await learningPathApi.updateRoadmap(roadmapData);

      // Assertions
      expect(apiClient.put).toHaveBeenCalledWith('/api/learning-path/roadmap', roadmapData);
      expect(result).toEqual(mockRoadmap);
    });
  });

  // Progress
  describe('getLearningPathProgress', () => {
    it('should call the getLearningPathProgress endpoint', async () => {
      // Mock response
      const mockProgress: LearningPathProgress = {
        goals: {
          total: 5,
          completed: 2,
          completion_percentage: 40,
          by_category: {
            career: {
              total: 3,
              completed: 1,
              completion_percentage: 33.33,
            },
            personal: {
              total: 2,
              completed: 1,
              completion_percentage: 50,
            },
          },
        },
        milestones: {
          total: 3,
          completed: 1,
          completion_percentage: 33.33,
          upcoming: [
            {
              id: '1',
              title: 'Upcoming Milestone',
              target_date: '2023-12-31',
            },
          ],
        },
        roadmap: {
          has_roadmap: true,
          phases: [
            {
              title: 'Phase 1',
              total_items: 3,
              completed_items: 1,
              completion_percentage: 33.33,
            },
          ],
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockProgress });

      // Call the function
      const result = await learningPathApi.getLearningPathProgress();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/learning-path/progress');
      expect(result).toEqual(mockProgress);
    });
  });

  describe('getLearningPath', () => {
    it('should call the getLearningPath endpoint', async () => {
      // Mock response
      const mockLearningPath: LearningPath = {
        goals: [],
        milestones: [],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockLearningPath });

      // Call the function
      const result = await learningPathApi.getLearningPath();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/learning-path');
      expect(result).toEqual(mockLearningPath);
    });
  });
});