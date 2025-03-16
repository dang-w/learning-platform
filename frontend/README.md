# AI/ML Learning Platform Frontend

This is the frontend for the AI/ML Learning Platform, built with Next.js, TypeScript, and Tailwind CSS.

## Features

- User authentication with JWT
- Dashboard with progress overview
- Resource management
- Learning path tracking
- Spaced repetition review system
- Progress analytics

## Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the frontend directory
3. Install dependencies

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env.local` file in the root of the frontend directory with the following variables:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_ENABLED=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Development

Run the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Build

Build the application for production:

```bash
npm run build
```

### Production

Start the production server:

```bash
npm start
```

## Testing

The frontend includes a comprehensive test suite using Jest for unit tests and Cypress for end-to-end tests.

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test -- src/__tests__/components/Button.test.tsx
```

### Running End-to-End Tests

```bash
# Open Cypress test runner
npm run cypress

# Run Cypress tests headlessly
npm run cypress:run
```

## Project Structure

- `src/app` - Next.js app router pages
- `src/components` - React components
- `src/lib` - Utility functions, API clients, and hooks
  - `src/lib/api` - API clients for communicating with the backend
  - `src/lib/hooks` - Custom React hooks
  - `src/lib/store` - Zustand stores for state management
  - `src/lib/utils` - Utility functions
- `src/types` - TypeScript type definitions
- `src/__tests__` - Test suite
  - `src/__tests__/app` - Page component tests
  - `src/__tests__/components` - UI component tests
  - `src/__tests__/lib` - Utility and hook tests
- `cypress` - End-to-end tests
  - `cypress/e2e` - E2E test specifications
- `public` - Static assets

## Deployment

The frontend can be deployed to Vercel with a simple connection to the GitHub repository.

## Learn More

To learn more about the technologies used in this project, check out the following resources:

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Cypress Documentation](https://docs.cypress.io/guides/overview/why-cypress)
