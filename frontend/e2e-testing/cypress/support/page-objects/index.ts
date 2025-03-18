/**
 * Page Object exports for easier imports in test files
 */

import { BasePage } from './BasePage';
import { AuthPage } from './AuthPage';
import { DashboardPage } from './DashboardPage';
import { ResourcesPage } from './ResourcesPage';

// Export all page object classes
export { BasePage, AuthPage, DashboardPage, ResourcesPage };

// Singleton instances for convenience
export const authPage = new AuthPage();
export const dashboardPage = new DashboardPage();
export const resourcesPage = new ResourcesPage();
