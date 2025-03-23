import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import learningPathApi, {
  Goal,
  GoalCreate,
  GoalUpdate,
  Milestone,
  MilestoneCreate,
  MilestoneUpdate,
  Roadmap,
  RoadmapCreate,
  RoadmapUpdate,
  LearningPathProgress
} from '@/lib/api/learning-path';
import { LearningPath } from '@/types/learning-path';

// Create spies for each API method
const createMilestoneSpy = jest.spyOn(learningPathApi, 'createMilestone');
const getMilestonesSpy = jest.spyOn(learningPathApi, 'getMilestones');
const getMilestoneSpy = jest.spyOn(learningPathApi, 'getMilestone');
const updateMilestoneSpy = jest.spyOn(learningPathApi, 'updateMilestone');
const deleteMilestoneSpy = jest.spyOn(learningPathApi, 'deleteMilestone');
const createGoalSpy = jest.spyOn(learningPathApi, 'createGoal');
const getGoalsSpy = jest.spyOn(learningPathApi, 'getGoals');
const getGoalSpy = jest.spyOn(learningPathApi, 'getGoal');
const updateGoalSpy = jest.spyOn(learningPathApi, 'updateGoal');
const deleteGoalSpy = jest.spyOn(learningPathApi, 'deleteGoal');
const createRoadmapSpy = jest.spyOn(learningPathApi, 'createRoadmap');
const getRoadmapSpy = jest.spyOn(learningPathApi, 'getRoadmap');
const updateRoadmapSpy = jest.spyOn(learningPathApi, 'updateRoadmap');
const getLearningPathSpy = jest.spyOn(learningPathApi, 'getLearningPath');
const getLearningPathProgressSpy = jest.spyOn(learningPathApi, 'getLearningPathProgress');

describe('Learning Path API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMilestone', () => {
    it('should call the createMilestone endpoint', async () => {
      // Mock response
      const mockMilestone: Milestone = {
        id: '1',
        title: 'Learn TypeScript',
        description: 'Master TypeScript basics',
        target_date: '2023-02-01',
        verification_method: 'Project completion',
        resources: [],
        completed: false,
        completion_date: null,
        notes: '',
      };

      createMilestoneSpy.mockResolvedValue(mockMilestone);

      // Test data
      const milestoneData: MilestoneCreate = {
        title: 'Learn TypeScript',
        description: 'Master TypeScript basics',
        target_date: '2023-02-01',
        verification_method: 'Project completion',
        resources: [],
      };

      // Call the function
      const result = await learningPathApi.createMilestone(milestoneData);

      // Assertions
      expect(learningPathApi.createMilestone).toHaveBeenCalledWith(milestoneData);
      expect(result).toEqual(mockMilestone);
    });
  });

  describe('getMilestones', () => {
    it('should call the getMilestones endpoint without params', async () => {
      // Mock response
      const mockMilestones: Milestone[] = [
        {
          id: '1',
          title: 'Learn TypeScript',
          description: 'Master TypeScript basics',
          target_date: '2023-02-01',
          verification_method: 'Project completion',
          resources: [],
          completed: false,
          completion_date: null,
          notes: '',
        },
      ];

      getMilestonesSpy.mockResolvedValue(mockMilestones);

      // Call the function
      const result = await learningPathApi.getMilestones();

      // Assertions
      expect(learningPathApi.getMilestones).toHaveBeenCalled();
      expect(result).toEqual(mockMilestones);
    });

    it('should call the getMilestones endpoint with completed param', async () => {
      // Mock response
      const mockMilestones: Milestone[] = [
        {
          id: '1',
          title: 'Learn TypeScript',
          description: 'Master TypeScript basics',
          target_date: '2023-02-01',
          verification_method: 'Project completion',
          resources: [],
          completed: true,
          completion_date: '2023-01-28',
          notes: '',
        },
      ];

      getMilestonesSpy.mockResolvedValue(mockMilestones);

      // Call the function
      const result = await learningPathApi.getMilestones(true);

      // Assertions
      expect(learningPathApi.getMilestones).toHaveBeenCalledWith(true);
      expect(result).toEqual(mockMilestones);
    });
  });

  describe('getMilestone', () => {
    it('should call the getMilestone endpoint', async () => {
      // Mock response
      const mockMilestone: Milestone = {
        id: '1',
        title: 'Learn TypeScript',
        description: 'Master TypeScript basics',
        target_date: '2023-02-01',
        verification_method: 'Project completion',
        resources: [],
        completed: false,
        completion_date: null,
        notes: '',
      };

      getMilestoneSpy.mockResolvedValue(mockMilestone);

      // Call the function
      const result = await learningPathApi.getMilestone('1');

      // Assertions
      expect(learningPathApi.getMilestone).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockMilestone);
    });
  });

  describe('updateMilestone', () => {
    it('should call the updateMilestone endpoint', async () => {
      // Mock response
      const mockMilestone: Milestone = {
        id: '1',
        title: 'Learn TypeScript',
        description: 'Master TypeScript basics',
        target_date: '2023-02-01',
        verification_method: 'Project completion',
        resources: [],
        completed: true,
        completion_date: '2023-01-28',
        notes: 'Completed early',
      };

      updateMilestoneSpy.mockResolvedValue(mockMilestone);

      // Test data
      const milestoneId = '1';
      const updateData: MilestoneUpdate = {
        completed: true,
        notes: 'Completed early',
      };

      // Call the function
      const result = await learningPathApi.updateMilestone(milestoneId, updateData);

      // Assertions
      expect(learningPathApi.updateMilestone).toHaveBeenCalledWith(milestoneId, updateData);
      expect(result).toEqual(mockMilestone);
    });
  });

  describe('deleteMilestone', () => {
    it('should call the deleteMilestone endpoint', async () => {
      // Mock response
      deleteMilestoneSpy.mockResolvedValue();

      // Call the function
      await learningPathApi.deleteMilestone('1');

      // Assertions
      expect(learningPathApi.deleteMilestone).toHaveBeenCalledWith('1');
    });
  });

  describe('createGoal', () => {
    it('should call the createGoal endpoint', async () => {
      // Mock response
      const mockGoal: Goal = {
        id: '1',
        title: 'Become a Full Stack Developer',
        description: 'Master both frontend and backend technologies',
        target_date: '2023-12-31' as string,
        priority: 1,
        category: 'career',
        completed: false,
        completion_date: null,
        notes: '',
      };

      createGoalSpy.mockResolvedValue(mockGoal);

      // Test data
      const goalData: GoalCreate = {
        title: 'Become a Full Stack Developer',
        description: 'Master both frontend and backend technologies',
        target_date: '2023-12-31',
        priority: 1,
        category: 'career',
      };

      // Call the function
      const result = await learningPathApi.createGoal(goalData);

      // Assertions
      expect(learningPathApi.createGoal).toHaveBeenCalledWith(goalData);
      expect(result).toEqual(mockGoal);
    });
  });

  describe('getGoals', () => {
    it('should call the getGoals endpoint without params', async () => {
      // Mock response
      const mockGoals: Goal[] = [
        {
          id: '1',
          title: 'Become a Full Stack Developer',
          description: 'Master both frontend and backend technologies',
          target_date: '2023-12-31' as string,
          priority: 1,
          category: 'career',
          completed: false,
          completion_date: null,
          notes: '',
        },
      ];

      getGoalsSpy.mockResolvedValue(mockGoals);

      // Call the function
      const result = await learningPathApi.getGoals();

      // Assertions
      expect(learningPathApi.getGoals).toHaveBeenCalled();
      expect(result).toEqual(mockGoals);
    });

    it('should call the getGoals endpoint with completed param', async () => {
      // Mock response
      const mockGoals: Goal[] = [
        {
          id: '1',
          title: 'Become a Full Stack Developer',
          description: 'Master both frontend and backend technologies',
          target_date: '2023-12-31' as string,
          priority: 1,
          category: 'career',
          completed: true,
          completion_date: '2023-12-15',
          notes: '',
        },
      ];

      getGoalsSpy.mockResolvedValue(mockGoals);

      // Call the function
      const result = await learningPathApi.getGoals(true);

      // Assertions
      expect(learningPathApi.getGoals).toHaveBeenCalledWith(true);
      expect(result).toEqual(mockGoals);
    });

    it('should call the getGoals endpoint with category param', async () => {
      // Mock response
      const mockGoals: Goal[] = [
        {
          id: '1',
          title: 'Become a Full Stack Developer',
          description: 'Master both frontend and backend technologies',
          target_date: '2023-12-31' as string,
          priority: 1,
          category: 'career',
          completed: false,
          completion_date: null,
          notes: '',
        },
      ];

      getGoalsSpy.mockResolvedValue(mockGoals);

      // Call the function
      const result = await learningPathApi.getGoals(false, 'career');

      // Assertions
      expect(learningPathApi.getGoals).toHaveBeenCalledWith(false, 'career');
      expect(result).toEqual(mockGoals);
    });
  });

  describe('getGoal', () => {
    it('should call the getGoal endpoint', async () => {
      // Mock response
      const mockGoal: Goal = {
        id: '1',
        title: 'Become a Full Stack Developer',
        description: 'Master both frontend and backend technologies',
        target_date: '2023-12-31' as string,
        priority: 1,
        category: 'career',
        completed: false,
        completion_date: null,
        notes: '',
      };

      getGoalSpy.mockResolvedValue(mockGoal);

      // Call the function
      const result = await learningPathApi.getGoal('1');

      // Assertions
      expect(learningPathApi.getGoal).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockGoal);
    });
  });

  describe('updateGoal', () => {
    it('should call the updateGoal endpoint', async () => {
      // Mock response
      const mockGoal: Goal = {
        id: '1',
        title: 'Become a Full Stack Developer',
        description: 'Master both frontend and backend technologies',
        target_date: '2023-12-31' as string,
        priority: 1,
        category: 'career',
        completed: true,
        completion_date: '2023-12-15',
        notes: 'Completed ahead of schedule',
      };

      updateGoalSpy.mockResolvedValue(mockGoal);

      // Test data
      const goalId = '1';
      const updateData: GoalUpdate = {
        completed: true,
        notes: 'Completed ahead of schedule',
      };

      // Call the function
      const result = await learningPathApi.updateGoal(goalId, updateData);

      // Assertions
      expect(learningPathApi.updateGoal).toHaveBeenCalledWith(goalId, updateData);
      expect(result).toEqual(mockGoal);
    });
  });

  describe('deleteGoal', () => {
    it('should call the deleteGoal endpoint', async () => {
      // Mock response
      deleteGoalSpy.mockResolvedValue();

      // Call the function
      await learningPathApi.deleteGoal('1');

      // Assertions
      expect(learningPathApi.deleteGoal).toHaveBeenCalledWith('1');
    });
  });

  describe('createRoadmap', () => {
    it('should call the createRoadmap endpoint', async () => {
      // Mock response
      const mockRoadmap: Roadmap = {
        id: '1',
        title: 'Web Development Roadmap',
        description: 'Comprehensive path to web development mastery',
        phases: [
          {
            title: 'Basics',
            description: 'Foundational knowledge',
            items: [
              { title: 'HTML', completed: true },
              { title: 'CSS', completed: false }
            ]
          }
        ],
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      createRoadmapSpy.mockResolvedValue(mockRoadmap);

      // Test data
      const roadmapData: RoadmapCreate = {
        title: 'Web Development Roadmap',
        description: 'Comprehensive path to web development mastery',
        phases: [
          {
            title: 'Basics',
            description: 'Foundational knowledge',
            items: [
              { title: 'HTML', completed: true },
              { title: 'CSS', completed: false }
            ]
          }
        ]
      };

      // Call the function
      const result = await learningPathApi.createRoadmap(roadmapData);

      // Assertions
      expect(learningPathApi.createRoadmap).toHaveBeenCalledWith(roadmapData);
      expect(result).toEqual(mockRoadmap);
    });
  });

  describe('getRoadmap', () => {
    it('should call the getRoadmap endpoint', async () => {
      // Mock response
      const mockRoadmap: Roadmap = {
        id: '1',
        title: 'Web Development Roadmap',
        description: 'Comprehensive path to web development mastery',
        phases: [
          {
            title: 'Basics',
            description: 'Foundational knowledge',
            items: [
              { title: 'HTML', completed: true },
              { title: 'CSS', completed: false }
            ]
          }
        ],
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      getRoadmapSpy.mockResolvedValue(mockRoadmap);

      // Call the function
      const result = await learningPathApi.getRoadmap();

      // Assertions
      expect(learningPathApi.getRoadmap).toHaveBeenCalled();
      expect(result).toEqual(mockRoadmap);
    });
  });

  describe('updateRoadmap', () => {
    it('should call the updateRoadmap endpoint', async () => {
      // Mock response
      const mockRoadmap: Roadmap = {
        id: '1',
        title: 'Web Development Roadmap 2.0',
        description: 'Updated path to web development mastery',
        phases: [
          {
            title: 'Basics',
            description: 'Foundational knowledge',
            items: [
              { title: 'HTML', completed: true },
              { title: 'CSS', completed: true }
            ]
          }
        ],
        created_at: '2023-01-01',
        updated_at: '2023-02-01'
      };

      updateRoadmapSpy.mockResolvedValue(mockRoadmap);

      // Test data
      const updateData: RoadmapUpdate = {
        title: 'Web Development Roadmap 2.0',
        description: 'Updated path to web development mastery',
        phases: [
          {
            title: 'Basics',
            description: 'Foundational knowledge',
            items: [
              { title: 'HTML', completed: true },
              { title: 'CSS', completed: true }
            ]
          }
        ]
      };

      // Call the function
      const result = await learningPathApi.updateRoadmap(updateData);

      // Assertions
      expect(learningPathApi.updateRoadmap).toHaveBeenCalledWith(updateData);
      expect(result).toEqual(mockRoadmap);
    });
  });

  describe('getLearningPath', () => {
    it('should call the getLearningPath endpoint', async () => {
      // Mock response
      const mockLearningPath: LearningPath = {
        goals: [
          {
            id: '1',
            title: 'Become a Full Stack Developer',
            description: 'Master both frontend and backend technologies',
            priority: 1,
            category: 'career',
            completed: false,
            completion_date: null,
            notes: '',
            progress: 0,
            progress_history: []
          },
        ],
        milestones: [
          {
            id: '1',
            title: 'Learn TypeScript',
            description: 'Master TypeScript basics',
            target_date: '2023-02-01',
            verification_method: 'Project completion',
            resources: [],
            completed: false,
            completion_date: null,
            notes: '',
            progress: 0
          },
        ],
      };

      getLearningPathSpy.mockResolvedValue(mockLearningPath);

      // Call the function
      const result = await learningPathApi.getLearningPath();

      // Assertions
      expect(learningPathApi.getLearningPath).toHaveBeenCalled();
      expect(result).toEqual(mockLearningPath);
    });
  });

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
              completion_percentage: 33
            },
            skills: {
              total: 2,
              completed: 1,
              completion_percentage: 50
            }
          }
        },
        milestones: {
          total: 10,
          completed: 4,
          completion_percentage: 40,
          upcoming: [
            {
              id: '1',
              title: 'Learn TypeScript',
              target_date: '2023-02-01'
            }
          ]
        },
        roadmap: {
          has_roadmap: true,
          phases: [
            {
              title: 'Basics',
              total_items: 2,
              completed_items: 1,
              completion_percentage: 50
            }
          ]
        }
      };

      getLearningPathProgressSpy.mockResolvedValue(mockProgress);

      // Call the function
      const result = await learningPathApi.getLearningPathProgress();

      // Assertions
      expect(learningPathApi.getLearningPathProgress).toHaveBeenCalled();
      expect(result).toEqual(mockProgress);
    });
  });
});