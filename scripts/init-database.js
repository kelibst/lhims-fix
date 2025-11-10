/**
 * Initialize SQLite database for patient care system
 * Creates all tables, indexes, views, and triggers
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const CONFIG = {
    databasePath: './data/database/patient-care-system.db',
    schemaPath: './database-schema.sql'
};

async function initializeDatabase() {
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
    return new Promise((resolve, reject) => {
        console.log('\n🗄  Creating database:', CONFIG.databasePath);

        const db = new sqlite3.Database(CONFIG.databasePath, (err) => {
            if (err) {
                return reject(err);
            }

            console.log('   ✓ Database file created\n');

            // Execute schema in a transaction
            db.serialize(() => {
                console.log('📝 Executing schema...');

                // Split schema into individual statements
                const statements = schema
                    .split(';')
                    .map(stmt => stmt.trim())
                    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

                console.log(`   Found ${statements.length} SQL statements`);

                db.run('BEGIN TRANSACTION');

                let completed = 0;
                let failed = 0;

                // Execute each statement
                for (let i = 0; i < statements.length; i++) {
                    const stmt = statements[i] + ';';

                    try {
                        db.run(stmt, (err) => {
                            if (err) {
                                console.error(`   ✗ Statement ${i + 1} failed:`, err.message);
                                console.error('     Statement:', stmt.substring(0, 100) + '...');
                                failed++;
                            } else {
                                completed++;
                                if (completed % 10 === 0) {
                                    console.log(`   Executed ${completed}/${statements.length} statements...`);
                                }
                            }

                            // Check if all done
                            if (completed + failed === statements.length) {
                                if (failed > 0) {
                                    console.log(`\n⚠  ${failed} statements failed, rolling back...`);
                                    db.run('ROLLBACK', () => {
                                        db.close();
                                        reject(new Error(`${failed} statements failed`));
                                    });
                                } else {
                                    db.run('COMMIT', () => {
                                        console.log(`\n   ✓ All ${completed} statements executed successfully`);

                                        // Verify database structure
                                        db.all(`
                                            SELECT name, type FROM sqlite_master
                                            WHERE type IN ('table', 'view', 'trigger')
                                            ORDER BY type, name
                                        `, (err, rows) => {
                                            if (err) {
                                                db.close();
                                                return reject(err);
                                            }

                                            const tables = rows.filter(r => r.type === 'table');
                                            const views = rows.filter(r => r.type === 'view');
                                            const triggers = rows.filter(r => r.type === 'trigger');

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
                                            console.log(`📊 Total objects: ${rows.length} (${tables.length} tables, ${views.length} views, ${triggers.length} triggers)`);
                                            console.log('\n📝 Next Steps:');
                                            console.log('   1. Run: node scripts/import-excel-data.js');
                                            console.log('   2. Wait for import to complete (~867,000 records)');
                                            console.log('   3. Use patient search interface to query data\n');

                                            db.close((err) => {
                                                if (err) reject(err);
                                                else resolve();
                                            });
                                        });
                                    });
                                }
                            }
                        });
                    } catch (err) {
                        console.error(`   ✗ Exception on statement ${i + 1}:`, err.message);
                        failed++;
                    }
                }
            });
        });
    });
}

// Run if called directly
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('\n✗ Database initialization failed:', err);
            process.exit(1);
        });
}

module.exports = { initializeDatabase };
