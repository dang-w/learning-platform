#!/bin/bash

# Script to help migrate tests to the Page Object Model pattern
# This script:
# 1. Creates backup copies of all existing tests
# 2. Adds imports for page objects to each test file
# 3. Provides comments suggesting test refactoring

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================================="
echo -e "${BLUE}🔄 Test Migration to Page Object Model Helper${NC}"
echo "=========================================================="

# Check if we're in the right directory
if [ ! -d "./e2e" ]; then
  echo -e "${RED}Error: This script should be run from the cypress directory${NC}"
  echo "Current directory: $(pwd)"
  echo "Please run this script from the cypress directory"
  exit 1
fi

# Create backup directory
BACKUP_DIR="./e2e/backup_$(date '+%Y%m%d_%H%M%S')"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Creating backups of existing tests in: ${BACKUP_DIR}${NC}"

# Copy all existing tests to backup
cp ./e2e/*.cy.ts "$BACKUP_DIR/"

# Function to add imports to test files
add_imports_to_file() {
  local file=$1
  local filename=$(basename "$file")

  echo -e "${YELLOW}Processing: ${filename}${NC}"

  # Create a temporary file
  local temp_file=$(mktemp)

  # Add imports to the top of the file
  echo "/**
 * ${filename} - Updated with Page Object Model
 * Using resilient testing patterns for better test stability
 */
import { authPage, dashboardPage } from '../support/page-objects';
import { setupAuthenticatedTestWithData } from '../support/resilientSeedData';

/* MIGRATION GUIDE:
 * 1. Replace direct cy.visit() calls with page object methods:
 *    - authPage.visitLogin() or authPage.visitRegister() for auth pages
 *    - dashboardPage.visitDashboard() for dashboard pages
 *
 * 2. Replace element interactions with page object methods:
 *    - authPage.login(username, password) instead of direct field interactions
 *    - dashboardPage.goToResources() instead of clicking nav tabs
 *
 * 3. Replace assertions with page object checks:
 *    - dashboardPage.isDashboardLoaded().then(isLoaded => {...})
 *    - authPage.hasValidationErrors().then(hasErrors => {...})
 *
 * 4. Add screenshot documentation at critical points:
 *    - authPage.takeScreenshot('login-attempt')
 *    - dashboardPage.takeScreenshot('dashboard-loaded')
 */

" > "$temp_file"

  # Append the original file contents (except any initial import line)
  sed '1,/^import/d' "$file" >> "$temp_file"

  # Replace the original file with our modified version
  mv "$temp_file" "${file}.updated"

  echo -e "${GREEN}✅ Created updated version: ${filename}.updated${NC}"
}

# Process each test file
for test_file in ./e2e/*.cy.ts; do
  add_imports_to_file "$test_file"
done

echo ""
echo -e "${GREEN}✅ Migration preparation complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the .updated test files"
echo "2. Manually refactor tests to use page objects"
echo "3. Rename .updated files to replace the originals when ready"
echo ""
echo "Example rename command when ready:"
echo -e "${BLUE}for f in ./e2e/*.updated; do mv \$f \${f%.updated}; done${NC}"
echo "=========================================================="