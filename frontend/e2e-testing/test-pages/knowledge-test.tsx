'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { Concept, SpacedRepetitionAlgorithm } from '@/types/knowledge';

// This is a special version of the knowledge page for testing
// It doesn't require authentication and directly renders the components

export default function KnowledgeTestPage() {
  const [activeTab, setActiveTab] = useState<'concepts' | 'review' | 'statistics'>('concepts');
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [inReviewMode, setInReviewMode] = useState(false);
  const authStore = useAuthStore();

  // Mock authentication for test
  useEffect(() => {
    if (!authStore.isAuthenticated) {
      // Set a test token directly in auth store for tests
      authStore.setDirectAuthState('test-token', true);
    }
  }, [authStore]);

  // Mock data for concepts
  useEffect(() => {
    // Initialize with some mock concepts
    setConcepts([
      {
        id: 'concept-1',
        title: 'Machine Learning Fundamentals',
        content: 'Machine learning is a subset of artificial intelligence that focuses on building systems that learn from data.',
        topics: ['ML', 'AI'],
        difficulty: 'intermediate',
        confidence_level: 3,
        last_reviewed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        next_review_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'concept-2',
        title: 'Neural Networks',
        content: 'Neural networks are computing systems inspired by the biological neural networks that constitute animal brains.',
        topics: ['ML', 'Neural Networks'],
        difficulty: 'advanced',
        confidence_level: 2,
        last_reviewed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        next_review_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'concept-3',
        title: 'Data Preprocessing',
        content: 'Data preprocessing is a crucial step in machine learning that involves transforming raw data into a format suitable for model training.',
        topics: ['ML', 'Data Science'],
        difficulty: 'beginner',
        confidence_level: 4,
        last_reviewed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        next_review_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]);
  }, []);

  // Handle concept creation
  const handleCreateConcept = (newConcept: Partial<Concept>) => {
    const concept: Concept = {
      id: `concept-${Date.now()}`,
      title: newConcept.title || 'Untitled Concept',
      content: newConcept.content || '',
      topics: newConcept.topics || [],
      difficulty: newConcept.difficulty || 'beginner',
      confidence_level: 0,
      last_reviewed_at: null,
      next_review_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setConcepts([concept, ...concepts]);
    setShowForm(false);
  };

  // Handle review submission
  const handleReviewSubmit = (conceptId: string, confidenceLevel: number) => {
    setConcepts(
      concepts.map(concept =>
        concept.id === conceptId
          ? {
              ...concept,
              confidence_level: confidenceLevel,
              last_reviewed_at: new Date().toISOString(),
              next_review_at: new Date(Date.now() + (6 - confidenceLevel) * 24 * 60 * 60 * 1000).toISOString()
            }
          : concept
      )
    );

    // Move to next concept or end review
    if (selectedConcept) {
      const currentIndex = concepts.findIndex(c => c.id === selectedConcept.id);
      if (currentIndex < concepts.length - 1) {
        setSelectedConcept(concepts[currentIndex + 1]);
      } else {
        setInReviewMode(false);
        setSelectedConcept(null);
      }
    }
  };

  // Start review session
  const startReview = () => {
    if (concepts.length > 0) {
      setActiveTab('review');
      setInReviewMode(true);
      setSelectedConcept(concepts[0]);
    }
  };

  return (
    <div className="container mx-auto p-4" data-testid="concepts-container">
      <h1 className="text-2xl font-bold mb-4">Test Knowledge Management</h1>

      {/* Navigation Tabs */}
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button
          className={`px-4 py-2 rounded-md ${activeTab === 'concepts' ? 'bg-white shadow' : ''}`}
          onClick={() => setActiveTab('concepts')}
          data-testid="nav-knowledge-concepts"
        >
          Concepts
        </button>
        <button
          className={`px-4 py-2 rounded-md ${activeTab === 'review' ? 'bg-white shadow' : ''}`}
          onClick={() => setActiveTab('review')}
          data-testid="nav-knowledge-review"
        >
          Review
        </button>
        <button
          className={`px-4 py-2 rounded-md ${activeTab === 'statistics' ? 'bg-white shadow' : ''}`}
          onClick={() => setActiveTab('statistics')}
          data-testid="nav-knowledge-stats"
        >
          Statistics
        </button>
      </div>

      {/* Concepts Tab */}
      {activeTab === 'concepts' && (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">Concepts</h2>
            <button
              onClick={() => setShowForm(true)}
              data-testid="add-concept-button"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Concept
            </button>
          </div>

          {showForm && (
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4" data-testid="concept-form">
              <h3 className="text-lg font-medium mb-4">Create New Concept</h3>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                  Title
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="title"
                  type="text"
                  placeholder="Concept Title"
                  data-testid="concept-title-input"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="content">
                  Content
                </label>
                <textarea
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="content"
                  placeholder="Concept Content"
                  rows={6}
                  data-testid="concept-description-input"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="difficulty">
                  Difficulty
                </label>
                <select
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="difficulty"
                  data-testid="concept-difficulty"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="topics">
                  Topics (comma separated)
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="topics"
                  type="text"
                  placeholder="ML, AI, Data Science"
                  data-testid="concept-topics"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  type="button"
                  onClick={() => handleCreateConcept({
                    title: (document.getElementById('title') as HTMLInputElement)?.value,
                    content: (document.getElementById('content') as HTMLTextAreaElement)?.value,
                    difficulty: (document.getElementById('difficulty') as HTMLSelectElement)?.value as any,
                    topics: (document.getElementById('topics') as HTMLInputElement)?.value.split(',').map(t => t.trim())
                  })}
                  data-testid="save-concept-button"
                >
                  Save Concept
                </button>
                <button
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  type="button"
                  onClick={() => setShowForm(false)}
                  data-testid="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mt-4" data-testid="concepts-list">
            {concepts.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded" data-testid="empty-concepts-state">
                No concepts created yet. Add your first concept to get started.
              </div>
            ) : (
              concepts.map(concept => (
                <div
                  key={concept.id}
                  className="bg-white shadow-md rounded p-4 mb-4 cursor-pointer hover:bg-gray-50"
                  data-testid="concept-item"
                  onClick={() => setSelectedConcept(concept)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium" data-testid="concept-title">{concept.title}</h3>
                    <div className="flex space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        concept.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                        concept.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {concept.difficulty}
                      </span>
                      {concept.last_reviewed_at && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          !concept.confidence_level ? 'bg-gray-100 text-gray-800' :
                          concept.confidence_level <= 2 ? 'bg-red-100 text-red-800' :
                          concept.confidence_level === 3 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          Confidence: {concept.confidence_level || 'Unknown'}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 truncate" data-testid="concept-content">
                    {concept.content.substring(0, 100)}{concept.content.length > 100 ? '...' : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {concept.topics.map(topic => (
                      <span
                        key={topic}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Review Tab */}
      {activeTab === 'review' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Review Dashboard</h2>

          {!inReviewMode ? (
            <div data-testid="review-dashboard">
              <div className="bg-white shadow-md rounded p-6 mb-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">Concepts Due for Review</h3>
                  <p className="text-3xl font-bold text-blue-600">{concepts.length}</p>
                  <button
                    className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={startReview}
                    data-testid="start-review-button"
                  >
                    Start Review ({concepts.length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white shadow-md rounded p-4">
                  <h3 className="text-md font-medium mb-2">Concepts by Status</h3>
                  <div data-testid="concepts-by-status-chart" className="h-32 flex items-end justify-around">
                    <div className="flex flex-col items-center">
                      <div className="bg-green-500 w-8" style={{ height: '80%' }}></div>
                      <span className="mt-2 text-xs">Mastered</span>
                      <span className="text-sm font-medium">2</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="bg-yellow-500 w-8" style={{ height: '60%' }}></div>
                      <span className="mt-2 text-xs">Learning</span>
                      <span className="text-sm font-medium">4</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="bg-red-500 w-8" style={{ height: '40%' }}></div>
                      <span className="mt-2 text-xs">New</span>
                      <span className="text-sm font-medium">3</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow-md rounded p-4">
                  <h3 className="text-md font-medium mb-2">Review History</h3>
                  <div data-testid="review-history-chart" className="h-32 flex items-end justify-around">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div
                          className="bg-blue-500 w-5"
                          style={{ height: `${Math.random() * 70 + 10}%` }}
                        ></div>
                        <span className="mt-2 text-xs">{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white shadow-md rounded p-4">
                  <h3 className="text-md font-medium mb-2">Recall Performance</h3>
                  <div data-testid="recall-performance-chart" className="h-32 flex items-center justify-center">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden">
                      <div className="absolute inset-0 bg-green-500" style={{ clipPath: 'polygon(50% 50%, 0 0, 70% 0)' }}></div>
                      <div className="absolute inset-0 bg-yellow-500" style={{ clipPath: 'polygon(50% 50%, 70% 0, 100% 30%)' }}></div>
                      <div className="absolute inset-0 bg-red-500" style={{ clipPath: 'polygon(50% 50%, 100% 30%, 100% 100%, 0 100%, 0 0)' }}></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">75%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div data-testid="review-session">
              {selectedConcept && (
                <div className="bg-white shadow-md rounded p-6 mb-4" data-testid="review-card">
                  <h3 className="text-xl font-semibold mb-4" data-testid="concept-title">
                    {selectedConcept.title}
                  </h3>
                  <div className="mb-8 p-4 bg-gray-50 rounded" data-testid="concept-content">
                    {selectedConcept.content}
                  </div>
                  <div className="mt-6">
                    <h4 className="text-lg font-medium mb-2">Rate your recall:</h4>
                    <div className="flex justify-between">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <button
                          key={rating}
                          className={`px-4 py-2 rounded font-medium ${
                            rating <= 2 ? 'bg-red-100 text-red-800' :
                            rating === 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}
                          onClick={() => handleReviewSubmit(selectedConcept.id, rating)}
                          data-testid={`recall-rating-${rating}`}
                        >
                          {rating === 1 ? 'Very Hard' :
                           rating === 2 ? 'Hard' :
                           rating === 3 ? 'Medium' :
                           rating === 4 ? 'Easy' :
                           'Very Easy'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!selectedConcept && (
                <div className="text-center py-8 bg-white shadow-md rounded" data-testid="review-complete">
                  <h3 className="text-xl font-semibold mb-2">Review Complete!</h3>
                  <p className="mb-4">You've reviewed all concepts for today.</p>
                  <button
                    className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => setActiveTab('concepts')}
                    data-testid="return-to-dashboard-button"
                  >
                    Return to Dashboard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && (
        <div data-testid="knowledge-statistics">
          <h2 className="text-xl font-semibold mb-4">Knowledge Statistics</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white shadow-md rounded p-4 text-center">
              <h3 className="text-sm font-medium text-gray-500">Total Concepts</h3>
              <p className="text-3xl font-bold text-blue-600">{concepts.length}</p>
            </div>
            <div className="bg-white shadow-md rounded p-4 text-center">
              <h3 className="text-sm font-medium text-gray-500">Mastered</h3>
              <p className="text-3xl font-bold text-green-600">
                {concepts.filter(c => c.confidence_level && c.confidence_level >= 4).length}
              </p>
            </div>
            <div className="bg-white shadow-md rounded p-4 text-center">
              <h3 className="text-sm font-medium text-gray-500">Learning</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {concepts.filter(c => c.confidence_level && c.confidence_level === 3).length}
              </p>
            </div>
            <div className="bg-white shadow-md rounded p-4 text-center">
              <h3 className="text-sm font-medium text-gray-500">Needs Work</h3>
              <p className="text-3xl font-bold text-red-600">
                {concepts.filter(c => !c.confidence_level || c.confidence_level <= 2).length}
              </p>
            </div>
          </div>

          <div className="bg-white shadow-md rounded p-6 mb-4">
            <h3 className="text-lg font-medium mb-4">Concept Review Statistics</h3>
            <div className="mb-6" data-testid="review-history-chart">
              <h4 className="text-md font-medium mb-2">Weekly Review Activity</h4>
              <div className="h-40 flex items-end justify-around">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div key={day} className="flex flex-col items-center">
                    <div
                      className="bg-blue-500 w-8"
                      style={{ height: `${Math.random() * 70 + 10}%` }}
                    ></div>
                    <span className="mt-2 text-xs">{day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div data-testid="concepts-by-status-chart">
                <h4 className="text-md font-medium mb-2">Concepts by Status</h4>
                <div className="h-40 flex items-center justify-center">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-green-500" style={{ clipPath: 'polygon(50% 50%, 0 0, 70% 0)' }}></div>
                    <div className="absolute inset-0 bg-yellow-500" style={{ clipPath: 'polygon(50% 50%, 70% 0, 100% 30%)' }}></div>
                    <div className="absolute inset-0 bg-red-500" style={{ clipPath: 'polygon(50% 50%, 100% 30%, 100% 100%, 0 100%, 0 0)' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white w-24 h-24 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div data-testid="recall-performance-chart">
                <h4 className="text-md font-medium mb-2">Recall Performance</h4>
                <div className="h-40 bg-gray-50 rounded p-4 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">75%</p>
                    <p className="text-sm text-gray-500">Average accuracy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}