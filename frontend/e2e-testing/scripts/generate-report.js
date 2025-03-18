import { merge } from 'mochawesome-merge';
import { create } from 'mochawesome-report-generator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure reports directory exists
const reportsDir = path.join(__dirname, '..', 'reports');
const mochawesomeDir = path.join(reportsDir, 'mochawesome');
const finalReportDir = path.join(reportsDir, 'final');

// Create directories if they don't exist
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}
if (!fs.existsSync(mochawesomeDir)) {
  fs.mkdirSync(mochawesomeDir, { recursive: true });
}
if (!fs.existsSync(finalReportDir)) {
  fs.mkdirSync(finalReportDir, { recursive: true });
}

async function generateReport() {
  console.log('Generating test report...');

  // Merge all JSON reports
  const jsonReport = await merge({
    files: [path.join(mochawesomeDir, '*.json')],
  });

  // Write merged JSON to file
  const jsonFilePath = path.join(finalReportDir, 'mochawesome.json');
  fs.writeFileSync(jsonFilePath, JSON.stringify(jsonReport, null, 2));

  // Create HTML report
  await create({
    reportDir: finalReportDir,
    reportFilename: 'index.html',
    reportTitle: 'Learning Platform E2E Test Report',
    reportPageTitle: 'Learning Platform Test Results',
    inline: true,
    charts: true,
  });

  console.log(`Report generated at: ${path.join(finalReportDir, 'index.html')}`);
}

generateReport().catch(error => {
  console.error('Error generating report:', error);
  process.exit(1);
});