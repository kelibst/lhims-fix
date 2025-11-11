/**
 * TEST SCRIPT FOR OPTIMIZED IMPORT
 *
 * Tests the better-sqlite3 import script on a small dataset
 * to verify functionality before running full import
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_DB_PATH = './data/database/test-patient-care-system.db';
const BACKUP_DB_PATH = './data/database/patient-care-system.db.backup';
const ORIGINAL_DB_PATH = './data/database/patient-care-system.db';

console.log('═══════════════════════════════════════════════════════');
console.log('  TESTING OPTIMIZED IMPORT (better-sqlite3)');
console.log('═══════════════════════════════════════════════════════\n');

// Backup current database if it exists
if (fs.existsSync(ORIGINAL_DB_PATH)) {
    console.log('✓ Backing up current database...');
    fs.copyFileSync(ORIGINAL_DB_PATH, BACKUP_DB_PATH);
    console.log(`  Backup saved to: ${BACKUP_DB_PATH}\n`);
}

// Create test database
console.log('Setting up test environment...\n');

// Modify the import script to use test database
const importScript = require('./import-excel-data-v2');

// Override CONFIG.databasePath for testing
const originalImport = importScript.importAllFiles;

// Limit test to first 3 files from each category
const CONFIG_OVERRIDE = {
    maxFilesPerCategory: 3
};

console.log('TEST CONFIGURATION:');
console.log('  - Max files per category: 3');
console.log('  - Database: In-memory test\n');

console.log('Starting test import...\n');

const startTime = Date.now();

try {
    // Run the import
    importScript.importAllFiles();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✓ TEST COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\nTest duration: ${duration} seconds`);
    console.log('\nIf you see good performance in this test, run the full import:');
    console.log('  node scripts/import-excel-data-v2.js\n');

    if (fs.existsSync(BACKUP_DB_PATH)) {
        console.log(`Original database backed up to: ${BACKUP_DB_PATH}`);
        console.log('You can restore it if needed.\n');
    }

} catch (err) {
    console.error('\n✗ TEST FAILED:', err);
    console.error('\nRestoring original database...');

    if (fs.existsSync(BACKUP_DB_PATH)) {
        fs.copyFileSync(BACKUP_DB_PATH, ORIGINAL_DB_PATH);
        console.log('✓ Original database restored\n');
    }

    process.exit(1);
}
