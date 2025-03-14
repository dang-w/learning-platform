# Knowledge Management System

The Knowledge Management System is a core feature of the AI/ML Learning Platform that helps users organize, review, and retain knowledge using spaced repetition techniques.

## Features

### Concept Management

- Create, edit, and delete knowledge concepts
- Organize concepts by topics and difficulty levels
- Add detailed content and notes to each concept

### Spaced Repetition

- Review concepts based on a spaced repetition algorithm
- Rate confidence levels for each concept
- Automatically schedule future reviews based on confidence

### Review Sessions

- Start review sessions with concepts due for review
- Track review history and progress
- Add review notes to track understanding

### Statistics and Analytics

- View overall knowledge statistics
- Track confidence levels across topics
- Monitor review streak and progress

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

## Future Enhancements

- Markdown support for concept content
- Flashcard mode for quick reviews
- Concept relationships and connections
- Import/export functionality
- Advanced spaced repetition algorithms