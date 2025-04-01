import { merge } from 'mochawesome-merge';
import { create } from 'mochawesome-report-generator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import glob from 'glob';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define base directory for Cypress outputs
const cypressOutputDir = path.join(__dirname, '..', 'cypress');

// Ensure reports directory exists within cypress outputs
const reportsBaseDir = path.join(cypressOutputDir, 'reports');
const mochawesomeInputDir = path.join(reportsBaseDir, 'mochawesome'); // Input directory for JSON files
const finalReportOutputDir = path.join(reportsBaseDir, 'final'); // Output directory for the combined HTML report
const screenshotsDir = path.join(cypressOutputDir, 'screenshots'); // Screenshot directory remains the same relative to cypress dir

// Create directories if they don't exist
if (!fs.existsSync(reportsBaseDir)) {
  fs.mkdirSync(reportsBaseDir, { recursive: true });
}
if (!fs.existsSync(mochawesomeInputDir)) {
  fs.mkdirSync(mochawesomeInputDir, { recursive: true });
}
if (!fs.existsSync(finalReportOutputDir)) {
  fs.mkdirSync(finalReportOutputDir, { recursive: true });
}

// Helper function to copy screenshots to report assets
function copyScreenshotsToAssets() {
  // Create assets directory if it doesn't exist
  const assetsDir = path.join(finalReportOutputDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Create screenshots directory within assets
  const reportScreenshotsDir = path.join(assetsDir, 'screenshots');
  if (!fs.existsSync(reportScreenshotsDir)) {
    fs.mkdirSync(reportScreenshotsDir, { recursive: true });
  }

  // Find all screenshots
  const screenshots = glob.sync(`${screenshotsDir}/**/*.png`);
  console.log(`Found ${screenshots.length} screenshots to include in report`);

  // Copy screenshots to assets directory
  screenshots.forEach(screenshot => {
    const relativePath = path.relative(screenshotsDir, screenshot);
    const destinationPath = path.join(reportScreenshotsDir, relativePath);

    // Create subdirectories if needed
    const destinationDir = path.dirname(destinationPath);
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    // Copy the file
    fs.copyFileSync(screenshot, destinationPath);
  });

  return reportScreenshotsDir;
}

// Process JSON report to add screenshot links
function processReportJson(reportJson) {
  // Map test results to include screenshots
  if (reportJson && reportJson.results && Array.isArray(reportJson.results)) {
    reportJson.results.forEach(result => {
      if (result.suites && Array.isArray(result.suites)) {
        result.suites.forEach(suite => {
          if (suite.tests && Array.isArray(suite.tests)) {
            suite.tests.forEach(test => {
              // If test failed, add screenshot link
              if (test.fail) {
                const specName = result.file.replace(/\.js$|\.ts$/, '').split('/').pop();
                const screenshotName = `${specName} -- ${suite.title} -- ${test.title} (failed).png`;
                const screenshotPath = path.join('assets', 'screenshots', specName, screenshotName);

                // Add screenshot links to context
                test.context = test.context || '';
                test.context += `<div><img src="${screenshotPath}" width="800px"></div>`;
              }
            });
          }
        });
      }
    });
  }
  return reportJson;
}

async function generateReport() {
  console.log('Generating enhanced test report with screenshots...');

  // Copy screenshots to assets directory
  copyScreenshotsToAssets();

  // Merge all JSON reports from the input directory
  const jsonReport = await merge({
    files: [path.join(mochawesomeInputDir, '*.json')], // Read from updated input dir
  });

  // Process report to add screenshot links
  const processedReport = processReportJson(jsonReport);

  // Write merged JSON to the final output directory
  const jsonFilePath = path.join(finalReportOutputDir, 'mochawesome.json'); // Write to updated output dir
  fs.writeFileSync(jsonFilePath, JSON.stringify(processedReport, null, 2));

  // Create HTML report in the final output directory
  await create({
    reportDir: finalReportOutputDir, // Use updated output dir
    reportFilename: 'index.html',
    reportTitle: 'Learning Platform E2E Test Report',
    reportPageTitle: 'Learning Platform Test Results',
    inline: true,
    charts: true,
    enableCharts: true,
    enableCode: true,
    timestamp: new Date().toISOString(),
    showPassed: true,
    showFailed: true,
    showPending: true,
    showSkipped: true,
    displayDuration: true,
  });

  console.log(`Enhanced report generated at: ${path.join(finalReportOutputDir, 'index.html')}`); // Use updated output dir
}

generateReport().catch(error => {
  console.error('Error generating report:', error);
  process.exit(1);
});