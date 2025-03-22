'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define types for our data structures
interface Concept {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  nextReviewDate: string;
  createdAt: string;
  updatedAt: string;
  status: 'learning' | 'mastered' | 'needs_work';
  reviewCount: number;
}

interface ReviewData {
  conceptId: string;
  rating: number;
  notes?: string;
}

interface Statistics {
  totalConcepts: number;
  mastered: number;
  learning: number;
  needsWork: number;
  reviewHistory: { date: string; count: number }[];
  conceptsByStatus: { status: string; count: number }[];
  recallPerformance: { rating: number; count: number }[];
}

// Create mock components for testing
const ConceptsList: React.FC = () => {
  const { fetchConcepts, createConcept, updateConcept, deleteConcept } = useApi();
  const [concepts, setConcepts] = React.useState<Concept[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<Concept>>({
    title: '',
    description: '',
    difficulty: 'intermediate',
    topics: []
  });

  React.useEffect(() => {
    fetchConcepts().then(setConcepts);
  }, [fetchConcepts]);

  const handleCreateConcept = () => {
    createConcept(formData as Omit<Concept, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'reviewCount'>)
      .then(() => {
        setShowForm(false);
        setFormData({
          title: '',
          description: '',
          difficulty: 'intermediate',
          topics: []
        });
        return fetchConcepts();
      })
      .then(setConcepts);
  };

  return (
    <div data-testid="concepts-list">
      <button
        data-testid="add-concept-button"
        className="px-4 py-2 bg-blue-500 text-white rounded mb-4"
        onClick={() => setShowForm(true)}
      >
        Add Concept
      </button>

      {showForm && (
        <div data-testid="concept-form" className="p-4 border rounded mb-4">
          <h3 className="font-bold mb-2">New Concept</h3>
          <div className="mb-2">
            <input
              data-testid="concept-title-input"
              className="w-full p-2 border rounded"
              placeholder="Title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div className="mb-2">
            <textarea
              data-testid="concept-description-input"
              className="w-full p-2 border rounded"
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="mb-2">
            <select
              data-testid="concept-difficulty"
              className="w-full p-2 border rounded"
              value={formData.difficulty}
              onChange={(e) => setFormData({...formData, difficulty: e.target.value as Concept['difficulty']})}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="mb-2">
            <input
              data-testid="concept-topics"
              className="w-full p-2 border rounded"
              placeholder="Topics (comma separated)"
              value={formData.topics?.join(', ') || ''}
              onChange={(e) => setFormData({...formData, topics: e.target.value.split(', ')})}
            />
          </div>
          <div className="flex justify-end">
            <button
              data-testid="save-concept-button"
              className="px-4 py-2 bg-green-500 text-white rounded"
              onClick={handleCreateConcept}
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {concepts.map(concept => (
          <div key={concept.id} className="p-4 border rounded">
            <h3 className="font-bold">{concept.title}</h3>
            <p>{concept.description}</p>
            <div className="flex justify-between mt-2">
              <span className="text-sm text-gray-500">
                Difficulty: {concept.difficulty}
              </span>
              <span className="text-sm text-gray-500">
                Status: {concept.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReviewDashboard: React.FC = () => {
  const { fetchDueReviews, submitReview } = useApi();
  const [reviewing, setReviewing] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [concepts, setConcepts] = React.useState<Concept[]>([]);

  React.useEffect(() => {
    fetchDueReviews().then(setConcepts);
  }, [fetchDueReviews]);

  const startReview = () => {
    setReviewing(true);
    setCurrentIndex(0);
  };

  const handleRating = (rating: number) => {
    const concept = concepts[currentIndex];
    submitReview({ conceptId: concept.id, rating });

    if (currentIndex < concepts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setReviewing(false);
    }
  };

  if (reviewing) {
    const concept = concepts[currentIndex];
    return (
      <div data-testid="review-session">
        <div data-testid="concept-content" className="mb-4 p-4 border rounded">
          <h3 className="font-bold mb-2">{concept.title}</h3>
          <p>{concept.description}</p>
        </div>

        <div className="mb-4">
          <p className="mb-2">How well did you recall this concept?</p>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                data-testid={`recall-rating-${rating}`}
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={() => handleRating(rating)}
              >
                {rating}
              </button>
            ))}
          </div>
        </div>

        {currentIndex === concepts.length - 1 && (
          <div data-testid="review-complete">
            <p>This is the last concept in the review session.</p>
            <button
              data-testid="return-to-dashboard-button"
              className="px-4 py-2 bg-gray-500 text-white rounded mt-4"
              onClick={() => setReviewing(false)}
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="review-dashboard">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Review Dashboard</h2>
        <p>Concepts due for review: {concepts.length}</p>
      </div>

      <button
        data-testid="start-review-button"
        className="px-4 py-2 bg-blue-500 text-white rounded"
        disabled={concepts.length === 0}
        onClick={startReview}
      >
        Start Review
      </button>
    </div>
  );
};

const KnowledgeStatistics: React.FC = () => {
  const { fetchStatistics } = useApi();
  const [stats, setStats] = React.useState<Statistics | null>(null);

  React.useEffect(() => {
    fetchStatistics().then(setStats);
  }, [fetchStatistics]);

  if (!stats) return <div>Loading statistics...</div>;

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 border rounded text-center">
          <div className="text-2xl font-bold">{stats.totalConcepts}</div>
          <div>Total Concepts</div>
        </div>
        <div className="p-4 border rounded text-center">
          <div className="text-2xl font-bold">{stats.mastered}</div>
          <div>Mastered</div>
        </div>
        <div className="p-4 border rounded text-center">
          <div className="text-2xl font-bold">{stats.learning}</div>
          <div>Learning</div>
        </div>
        <div className="p-4 border rounded text-center">
          <div className="text-2xl font-bold">{stats.needsWork}</div>
          <div>Needs Work</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div data-testid="review-history-chart" className="p-4 border rounded">
          <h3 className="font-bold mb-2">Review History</h3>
          <div className="h-40 flex items-end">
            {stats.reviewHistory.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="bg-blue-500 w-full"
                  style={{ height: `${(item.count / 10) * 100}%` }}
                ></div>
                <div className="text-xs mt-1">{item.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div data-testid="concepts-by-status-chart" className="p-4 border rounded">
          <h3 className="font-bold mb-2">Concepts by Status</h3>
          <div className="h-40 flex items-center justify-center">
            <div className="flex">
              {stats.conceptsByStatus.map((item, i) => (
                <div
                  key={i}
                  className="mx-2 w-8"
                  title={`${item.status}: ${item.count}`}
                >
                  <div
                    className="bg-green-500"
                    style={{
                      height: `${(item.count / stats.totalConcepts) * 100}px`,
                      backgroundColor:
                        item.status === 'mastered' ? '#34D399' :
                        item.status === 'learning' ? '#60A5FA' :
                        '#F87171'
                    }}
                  ></div>
                  <div className="text-xs mt-1 text-center">{item.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div data-testid="recall-performance-chart" className="p-4 border rounded">
          <h3 className="font-bold mb-2">Recall Performance</h3>
          <div className="h-40 flex items-end">
            {stats.recallPerformance.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="bg-purple-500 w-full"
                  style={{ height: `${(item.count / 10) * 100}%` }}
                ></div>
                <div className="text-xs mt-1">{item.rating}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Mock data for concepts
const MOCK_CONCEPTS: Concept[] = [
  {
    id: '1',
    title: 'React Hooks',
    description: 'Understanding React hooks and their usage patterns',
    difficulty: 'intermediate',
    topics: ['React', 'Frontend', 'Hooks'],
    nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'learning',
    reviewCount: 3,
  },
  {
    id: '2',
    title: 'TypeScript Generics',
    description: 'Deep dive into TypeScript generics and their applications',
    difficulty: 'advanced',
    topics: ['TypeScript', 'Programming', 'Generics'],
    nextReviewDate: new Date(Date.now() + 172800000).toISOString(),
    createdAt: new Date(Date.now() - 1209600000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    status: 'learning',
    reviewCount: 5,
  },
  {
    id: '3',
    title: 'CSS Grid Layout',
    description: 'Understanding CSS Grid layout system for web design',
    difficulty: 'beginner',
    topics: ['CSS', 'Web Design', 'Layout'],
    nextReviewDate: new Date(Date.now() + 43200000).toISOString(),
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    status: 'mastered',
    reviewCount: 8,
  },
];

// Define API interface
interface ApiInterface {
  fetchConcepts: () => Promise<Concept[]>;
  createConcept: (concept: Omit<Concept, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'reviewCount'>) => Promise<Concept>;
  updateConcept: (concept: Partial<Concept> & { id: string }) => Promise<Concept>;
  deleteConcept: (id: string) => Promise<{ success: boolean }>;
  fetchDueReviews: () => Promise<Concept[]>;
  submitReview: (reviewData: ReviewData) => Promise<{ success: boolean }>;
  fetchStatistics: () => Promise<Statistics>;
}

// Mock API handlers
const mockApiHandlers: ApiInterface = {
  // Concepts handlers
  fetchConcepts: () => Promise.resolve(MOCK_CONCEPTS),
  createConcept: (concept) => {
    return Promise.resolve({
      ...concept,
      id: `new-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'learning',
      reviewCount: 0,
    } as Concept);
  },
  updateConcept: (concept) => Promise.resolve({
    ...MOCK_CONCEPTS.find(c => c.id === concept.id)!,
    ...concept,
    updatedAt: new Date().toISOString()
  } as Concept),
  deleteConcept: () => Promise.resolve({ success: true }),

  // Review handlers
  fetchDueReviews: () => Promise.resolve(MOCK_CONCEPTS.slice(0, 2)),
  submitReview: () => Promise.resolve({ success: true }),

  // Statistics handlers
  fetchStatistics: () => Promise.resolve({
    totalConcepts: MOCK_CONCEPTS.length,
    mastered: MOCK_CONCEPTS.filter(c => c.status === 'mastered').length,
    learning: MOCK_CONCEPTS.filter(c => c.status === 'learning').length,
    needsWork: MOCK_CONCEPTS.filter(c => c.status === 'needs_work').length,
    reviewHistory: [
      { date: '2023-07-01', count: 5 },
      { date: '2023-07-02', count: 3 },
      { date: '2023-07-03', count: 7 },
    ],
    conceptsByStatus: [
      { status: 'mastered', count: 1 },
      { status: 'learning', count: 2 },
      { status: 'needs_work', count: 0 },
    ],
    recallPerformance: [
      { rating: 1, count: 2 },
      { rating: 2, count: 3 },
      { rating: 3, count: 8 },
      { rating: 4, count: 7 },
      { rating: 5, count: 5 },
    ],
  }),
};

// Create API context to provide mock implementations
const ApiContext = React.createContext<ApiInterface>(mockApiHandlers);

export const useApi = () => React.useContext(ApiContext);

// Navigation component
const Navigation: React.FC<{ activeTab: string; setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  return (
    <nav className="mb-6">
      <TabsList className="w-full">
        <TabsTrigger
          data-testid="nav-knowledge-concepts"
          value="concepts"
          onClick={() => setActiveTab('concepts')}
        >
          Concepts
        </TabsTrigger>
        <TabsTrigger
          data-testid="nav-knowledge-review"
          value="review"
          onClick={() => setActiveTab('review')}
        >
          Review
        </TabsTrigger>
        <TabsTrigger
          data-testid="nav-knowledge-stats"
          value="statistics"
          onClick={() => setActiveTab('statistics')}
        >
          Statistics
        </TabsTrigger>
      </TabsList>
    </nav>
  );
};

// Main component
const KnowledgeTestPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('concepts');
  const [concepts, setConcepts] = React.useState<Concept[]>(MOCK_CONCEPTS);

  // Simulate API calls
  const api: ApiInterface = {
    ...mockApiHandlers,
    fetchConcepts: () => Promise.resolve(concepts),
    createConcept: (concept) => {
      const newConcept: Concept = {
        ...(concept as Omit<Concept, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'reviewCount'>),
        id: `new-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'learning',
        reviewCount: 0,
      };
      setConcepts([...concepts, newConcept]);
      return Promise.resolve(newConcept);
    },
    updateConcept: (concept) => {
      const updatedConcepts = concepts.map(c =>
        c.id === concept.id ? { ...c, ...concept, updatedAt: new Date().toISOString() } : c
      );
      setConcepts(updatedConcepts);
      return Promise.resolve({
        ...concepts.find(c => c.id === concept.id)!,
        ...concept,
        updatedAt: new Date().toISOString()
      } as Concept);
    },
    deleteConcept: (id: string) => {
      setConcepts(concepts.filter(c => c.id !== id));
      return Promise.resolve({ success: true });
    },
  };

  return (
    <ApiContext.Provider value={api}>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Test Knowledge Management</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

          <TabsContent value="concepts">
            <div data-testid="concepts-container">
              <ConceptsList />
            </div>
          </TabsContent>

          <TabsContent value="review">
            <div data-testid="review-dashboard">
              <ReviewDashboard />
            </div>
          </TabsContent>

          <TabsContent value="statistics">
            <div data-testid="knowledge-statistics">
              <KnowledgeStatistics />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ApiContext.Provider>
  );
};

export default KnowledgeTestPage;