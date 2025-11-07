/**
 * Setup Verification Script
 *
 * Tests that all dependencies and directories are properly configured
 *
 * Usage:
 *   node scripts/test-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('LHIMS EXTRACTION PROJECT - SETUP VERIFICATION');
console.log('='.repeat(70));

let allChecksPass = true;

function check(description, condition, details = '') {
  const status = condition ? '✓' : '✗';
  const color = condition ? '\x1b[32m' : '\x1b[31m'; // Green or Red
  const reset = '\x1b[0m';

  console.log(`\n${color}${status}${reset} ${description}`);
  if (details) {
    console.log(`  ${details}`);
  }

  if (!condition) {
    allChecksPass = false;
  }

  return condition;
}

console.log('\n📋 Checking Dependencies...\n');

// Check Node.js version
const nodeVersion = process.version;
const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
check(
  'Node.js version',
  nodeMajor >= 16,
  `Current: ${nodeVersion} (Required: >= 16.0.0)`
);

// Check Playwright
let playwrightInstalled = false;
try {
  require('playwright');
  playwrightInstalled = true;
  const { chromium } = require('playwright');
  check('Playwright installed', true, 'Found playwright module');
} catch (error) {
  check('Playwright installed', false, 'Run: npm install');
}

console.log('\n📁 Checking Directories...\n');

// Check directories
const requiredDirs = [
  'scripts',
  'data',
  'data/captures',
  'data/opd-morbidity',
  'data/laboratory',
  'data/pharmacy',
  'data/database',
  'analysis',
  'docs',
];

requiredDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  const exists = fs.existsSync(fullPath);
  check(`Directory: ${dir}`, exists, exists ? 'Exists' : 'Missing');
});

console.log('\n📄 Checking Scripts...\n');

// Check scripts exist
const requiredScripts = [
  'scripts/playwright-har-capture.js',
  'scripts/analyze-requests.js',
  'scripts/extract-opd-morbidity.template.js',
];

requiredScripts.forEach(script => {
  const fullPath = path.join(__dirname, '..', script);
  const exists = fs.existsSync(fullPath);
  check(`Script: ${path.basename(script)}`, exists, exists ? 'Ready' : 'Missing');
});

console.log('\n📚 Checking Documentation...\n');

// Check documentation files
const requiredDocs = [
  '@CLAUDE.md',
  'README.md',
  'USAGE.md',
  'QUICK-REFERENCE.md',
  'NEXT-STEPS.md',
];

requiredDocs.forEach(doc => {
  const fullPath = path.join(__dirname, '..', doc);
  const exists = fs.existsSync(fullPath);
  check(`Documentation: ${doc}`, exists, exists ? 'Available' : 'Missing');
});

console.log('\n🔧 Checking Configuration...\n');

// Check package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = require(packageJsonPath);
  check('package.json', true, 'Found');
  check(
    'Playwright dependency',
    packageJson.dependencies && packageJson.dependencies.playwright,
    packageJson.dependencies?.playwright || 'Not found'
  );
} else {
  check('package.json', false, 'Missing');
}

// Check .gitignore
const gitignorePath = path.join(__dirname, '..', '.gitignore');
check(
  '.gitignore',
  fs.existsSync(gitignorePath),
  fs.existsSync(gitignorePath) ? 'Configured to protect sensitive data' : 'Missing'
);

console.log('\n🌐 Network Configuration...\n');

console.log('  LHIMS URL: http://10.10.0.59/lhims_182');
console.log('  Network: Hospital local network required');
console.log('  Note: Cannot test connectivity from this script');
console.log('        (must be on hospital network)');

console.log('\n' + '='.repeat(70));

if (allChecksPass) {
  console.log('✅ ALL CHECKS PASSED - PROJECT IS READY!');
  console.log('='.repeat(70));
  console.log('\n📋 Next Steps:\n');
  console.log('  1. Connect to hospital network (10.10.0.59)');
  console.log('  2. Run: npm run capture');
  console.log('  3. Follow on-screen instructions');
  console.log('\n📖 For detailed instructions, read: NEXT-STEPS.md\n');
} else {
  console.log('❌ SOME CHECKS FAILED - SETUP INCOMPLETE');
  console.log('='.repeat(70));
  console.log('\n🔧 Troubleshooting:\n');

  if (!playwrightInstalled) {
    console.log('  Run: npm install');
  }

  console.log('\n  If problems persist, check:');
  console.log('    - Node.js is installed (>= 16.0.0)');
  console.log('    - You are in the correct directory');
  console.log('    - You have write permissions\n');
}

console.log('='.repeat(70));

process.exit(allChecksPass ? 0 : 1);
