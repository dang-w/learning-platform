# Knowledge Management System

The Knowledge Management System is a core feature of the AI/ML Learning Platform that helps users organize, review, and retain knowledge using spaced repetition techniques.

## Implemented Features

### Concept Management
- ✅ Create, edit, and delete knowledge concepts
- ✅ Organize concepts by topics and difficulty levels
- ✅ Add detailed content and notes to each concept
- ✅ View concept details with metadata

### Spaced Repetition
- ✅ Review concepts based on a spaced repetition algorithm
- ✅ Rate confidence levels for each concept (1-5 scale)
- ✅ Automatically schedule future reviews based on confidence
- ✅ Track review history and progress

### Review Sessions
- ✅ Start review sessions with concepts due for review
- ✅ Interactive review interface with confidence rating
- ✅ Session progress tracking
- ✅ Review completion and statistics

### Statistics and Analytics
- ✅ View overall knowledge statistics
- ✅ Track confidence levels across topics
- ✅ Monitor review streak and progress
- ✅ Visualize concept distribution by topic

## Components

### Pages
- `/knowledge` - Main knowledge dashboard
- `/knowledge/concepts` - List of all concepts
- `/knowledge/concepts/create` - Create new concept
- `/knowledge/concepts/[id]` - View concept details
- `/knowledge/concepts/[id]/edit` - Edit concept
- `/knowledge/session` - Review session

### API
The knowledge management system connects to the backend API at:
- `/api/reviews/concepts` - Manage concepts
- `/api/reviews/due` - Get concepts due for review
- `/api/reviews/session` - Manage review sessions
- `/api/reviews/statistics` - Get review statistics

## Implementation Details

The knowledge management system uses:
- Zustand for state management
- React Query for data fetching
- React Hook Form for form handling
- Tailwind CSS for styling

### Key Components
- `ConceptForm` - Reusable form for creating and editing concepts
- `ConceptList` - List of concepts with filtering and sorting
- `ConceptDetail` - Detailed view of a concept with review history
- `ReviewSession` - Interactive review interface with confidence rating
- `KnowledgeStatistics` - Visualization of knowledge statistics

### State Management
The knowledge management system uses a dedicated Zustand store (`useKnowledgeStore`) that provides:
- Concept CRUD operations
- Review session management
- Statistics fetching
- Error handling

## Future Enhancements
- Markdown support for concept content
- Flashcard mode for quick reviews
- Concept relationships and connections
- Import/export functionality
- Advanced spaced repetition algorithms
- AI-powered concept recommendations