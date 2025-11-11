/**
 * Initialize SQLite database for patient care system
 * Creates all tables, indexes, views, and triggers
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    databasePath: './data/database/patient-care-system.db',
    schemaPath: './database-schema.sql'
};

function initializeDatabase() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  DATABASE INITIALIZATION');
    console.log('  Volta Regional Hospital Patient Care System');
    console.log('═══════════════════════════════════════════════════════\n');

    // Ensure database directory exists
    const dbDir = path.dirname(CONFIG.databasePath);
    if (!fs.existsSync(dbDir)) {
        console.log('📁 Creating database directory...');
        fs.mkdirSync(dbDir, { recursive: true });
    }

    // Check if database already exists
    const dbExists = fs.existsSync(CONFIG.databasePath);
    if (dbExists) {
        console.log('⚠  Database already exists at:', CONFIG.databasePath);
        console.log('   Backing up existing database...');
        const backup = CONFIG.databasePath + '.backup.' + Date.now();
        fs.copyFileSync(CONFIG.databasePath, backup);
        console.log('   ✓ Backup created:', backup);
        fs.unlinkSync(CONFIG.databasePath);
    }

    // Read schema file
    console.log('\n📄 Reading schema file:', CONFIG.schemaPath);
    if (!fs.existsSync(CONFIG.schemaPath)) {
        throw new Error(`Schema file not found: ${CONFIG.schemaPath}`);
    }

    const schema = fs.readFileSync(CONFIG.schemaPath, 'utf8');

    // Create database
    console.log('\n🗄  Creating database:', CONFIG.databasePath);
    const db = new Database(CONFIG.databasePath);

    try {
        console.log('   ✓ Database file created\n');
        console.log('📝 Executing schema...');

        // Execute entire schema at once - better-sqlite3 handles this properly
        db.exec(schema);

        // Verify database structure
        const tables = db.prepare(`
            SELECT name FROM sqlite_master
            WHERE type = 'table'
            AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `).all();

        const views = db.prepare(`
            SELECT name FROM sqlite_master
            WHERE type = 'view'
            ORDER BY name
        `).all();

        const triggers = db.prepare(`
            SELECT name FROM sqlite_master
            WHERE type = 'trigger'
            ORDER BY name
        `).all();

        console.log('\n   ✓ Schema executed successfully');
        console.log('\n📊 Database Structure:');
        console.log(`   Tables: ${tables.length}`);
        console.log(`   Views: ${views.length}`);
        console.log(`   Triggers: ${triggers.length}`);

        console.log('\n📋 Tables Created:');
        tables.forEach(t => console.log(`   - ${t.name}`));

        console.log('\n👁  Views Created:');
        views.forEach(v => console.log(`   - ${v.name}`));

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  ✓ DATABASE INITIALIZATION COMPLETE');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`\n💾 Database ready: ${CONFIG.databasePath}`);
        console.log(`📊 Total objects: ${tables.length + views.length + triggers.length} (${tables.length} tables, ${views.length} views, ${triggers.length} triggers)`);
        console.log('\n📝 Next Steps:');
        console.log('   1. Run: node scripts/import-excel-data.js');
        console.log('   2. Wait for import to complete (~867,000 records)');
        console.log('   3. Use patient search interface to query data\n');

    } catch (err) {
        console.error('\n✗ Schema execution failed:', err.message);
        throw err;
    } finally {
        db.close();
    }
}

// Run if called directly
if (require.main === module) {
    try {
        initializeDatabase();
        process.exit(0);
    } catch (err) {
        console.error('\n✗ Database initialization failed:', err);
        process.exit(1);
    }
}

module.exports = { initializeDatabase };
