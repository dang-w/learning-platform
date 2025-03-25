/**
 * Page Object exports for easier imports in test files
 */

import { BasePage } from './BasePage';
import { AuthPage } from './AuthPage';
import { DashboardPage } from './DashboardPage';
import { ResourcesPage } from './ResourcesPage';
import { ConceptsPage } from './ConceptsPage';
import { AnalyticsPage } from './AnalyticsPage';
import { ProfilePage } from './ProfilePage';
import { LearningPathPage } from './LearningPathPage';
import { NotesPage } from './NotesPage';

// Export all page object classes
export { BasePage, AuthPage, DashboardPage, ResourcesPage, ConceptsPage, AnalyticsPage, ProfilePage, LearningPathPage, NotesPage };

// Singleton instances for convenience
export const authPage = new AuthPage();
export const dashboardPage = new DashboardPage();
export const resourcesPage = new ResourcesPage();
export const conceptsPage = new ConceptsPage();
export const analyticsPage = new AnalyticsPage();
export const profilePage = new ProfilePage();
export const learningPathPage = new LearningPathPage();
