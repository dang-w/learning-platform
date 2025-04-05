'use client';

import React from 'react';
// Import Filters from the shared types file
import { Filters } from '@/types/resource'; // Corrected import path
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Transition } from '@headlessui/react'; // For smooth transitions

// Hardcoded options for now - could be fetched or defined elsewhere
const RESOURCE_TYPES = ['article', 'video', 'course', 'book', 'documentation', 'tool', 'other'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'];

interface FilterSidebarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  availableTopics: string[];
  selectedFilters: Filters;
  onFilterChange: (newFilters: Partial<Filters>) => void;
  isOpen: boolean; // Add isOpen prop for mobile control
  onClose: () => void; // Add onClose prop for mobile control
  // TODO: Add props for other filter types (types, difficulty)
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  searchTerm,
  onSearchChange,
  availableTopics,
  selectedFilters,
  onFilterChange,
  isOpen,
  onClose,
}) => {

  const handleCheckboxChange = (
    filterType: keyof Filters,
    value: string
  ) => {
    const currentValues = selectedFilters[filterType] || [];
    const newValues =
      currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
    onFilterChange({ [filterType]: newValues });
  };

  const handleTopicChange = (topic: string) => {
    const currentTopics = selectedFilters.topics || [];
    const newTopics =
      currentTopics.includes(topic)
        ? currentTopics.filter((t: string) => t !== topic)
        : [...currentTopics, topic];
    onFilterChange({ topics: newTopics });
  };

  // TODO: Add handlers for type and difficulty filters

  return (
    <>
      {/* Backdrop for mobile */}
      <Transition
        show={isOpen}
        as={React.Fragment} // Use Fragment to avoid adding extra DOM nodes
        enter="transition-opacity ease-linear duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-linear duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      </Transition>

      {/* Sidebar */}
      <Transition
        show={isOpen}
        as={React.Fragment} // Use Fragment
        enter="transition ease-in-out duration-300 transform"
        enterFrom="-translate-x-full"
        enterTo="translate-x-0"
        leave="transition ease-in-out duration-300 transform"
        leaveFrom="translate-x-0"
        leaveTo="-translate-x-full"
      >
        <aside className="fixed inset-y-0 left-0 z-40 w-64 p-4 bg-gray-50 border-r border-gray-200 h-full overflow-y-auto md:static md:z-auto md:inset-y-auto md:left-auto md:h-auto md:relative md:translate-x-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Filters & Search</h2>
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close filters"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search resources..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Topic Filters */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2 text-gray-700">Topics</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1"> {/* Adjusted max height */}
              {availableTopics.length > 0 ? (
                availableTopics.sort().map((topic) => (
                  <div key={topic} className="flex items-center">
                    <input
                      id={`topic-${topic}`}
                      name="topic"
                      type="checkbox"
                      checked={selectedFilters.topics?.includes(topic) ?? false}
                      onChange={() => handleTopicChange(topic)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      data-testid={`topic-filter-${topic}`}
                    />
                    <label
                      htmlFor={`topic-${topic}`}
                      data-testid={`topic-filter-label-${topic}`}
                      className="ml-2 block text-sm text-gray-900 cursor-pointer capitalize" // Capitalize topic
                    >
                      {topic}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No topics available.</p>
              )}
            </div>
          </div>

          {/* Resource Type Filters */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2 text-gray-700">Resource Type</h3>
            <div className="space-y-2">
              {RESOURCE_TYPES.map((type) => (
                <div key={type} className="flex items-center">
                  <input
                    id={`type-${type}`}
                    name="type"
                    type="checkbox"
                    checked={selectedFilters.types?.includes(type) ?? false}
                    onChange={() => handleCheckboxChange('types', type)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor={`type-${type}`}
                    className="ml-2 block text-sm text-gray-900 cursor-pointer capitalize"
                  >
                    {type}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty Filters */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-gray-700">Difficulty</h3>
            <div className="space-y-2">
              {DIFFICULTIES.map((difficulty) => (
                <div key={difficulty} className="flex items-center">
                  <input
                    id={`difficulty-${difficulty}`}
                    name="difficulty"
                    type="checkbox"
                    checked={selectedFilters.difficulty?.includes(difficulty) ?? false}
                    onChange={() => handleCheckboxChange('difficulty', difficulty)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor={`difficulty-${difficulty}`}
                    className="ml-2 block text-sm text-gray-900 cursor-pointer capitalize"
                  >
                    {difficulty}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </Transition>

      {/* Static sidebar for larger screens (no Transition needed) */}
      <aside
        data-testid="filter-sidebar"
        className="hidden md:block w-64 p-4 border-r border-gray-200 bg-gray-50 h-auto overflow-y-auto relative"
      >
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Filters & Search</h2>

        {/* Search Input */}
        <div className="mb-6">
          <label htmlFor="search-desktop" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            data-testid="library-search-input"
            type="text"
            id="search-desktop"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search resources..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Topic Filters */}
        <div data-testid="topics-filter-section" className="mb-6">
          <h3 className="font-semibold mb-2 text-gray-700">Topics</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1"> {/* Adjusted max height */}
            {availableTopics.length > 0 ? (
              availableTopics.sort().map((topic) => (
                <div
                  key={topic + '-desktop'}
                  data-testid={`topic-filter-${topic}`}
                  className="flex items-center"
                >
                  <input
                    id={`topic-${topic}-desktop`}
                    name="topic-desktop"
                    type="checkbox"
                    checked={selectedFilters.topics?.includes(topic) ?? false}
                    onChange={() => handleTopicChange(topic)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor={`topic-${topic}-desktop`}
                    className="ml-2 block text-sm text-gray-900 cursor-pointer capitalize"
                  >
                    {topic}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No topics available.</p>
            )}
          </div>
        </div>

        {/* Resource Type Filters */}
        <div data-testid="resource-type-filter-section" className="mb-6">
          <h3 className="font-semibold mb-2 text-gray-700">Resource Type</h3>
          <div className="space-y-2">
            {RESOURCE_TYPES.map((type) => (
              <div
                key={type + '-desktop'}
                data-testid={`resource-type-filter-${type}`}
                className="flex items-center"
              >
                <input
                  id={`type-${type}-desktop`}
                  name="type-desktop"
                  type="checkbox"
                  checked={selectedFilters.types?.includes(type) ?? false}
                  onChange={() => handleCheckboxChange('types', type)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor={`type-${type}-desktop`}
                  className="ml-2 block text-sm text-gray-900 cursor-pointer capitalize"
                >
                  {type}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty Filters */}
        <div data-testid="difficulty-filter-section" className="mb-4">
          <h3 className="font-semibold mb-2 text-gray-700">Difficulty</h3>
          <div className="space-y-2">
            {DIFFICULTIES.map((difficulty) => (
              <div
                key={difficulty + '-desktop'}
                data-testid={`difficulty-filter-${difficulty}`}
                className="flex items-center"
              >
                <input
                  id={`difficulty-${difficulty}-desktop`}
                  name="difficulty-desktop"
                  type="checkbox"
                  checked={selectedFilters.difficulty?.includes(difficulty) ?? false}
                  onChange={() => handleCheckboxChange('difficulty', difficulty)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor={`difficulty-${difficulty}-desktop`}
                  className="ml-2 block text-sm text-gray-900 cursor-pointer capitalize"
                >
                  {difficulty}
                </label>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
};