# Excel Data Import Guide - Optimized Version

**Last Updated**: November 10, 2025
**Volta Regional Hospital, Hohoe**

---

## Quick Start

To import all Excel data into the database with maximum performance:

```bash
# 1. Initialize the database (first time only)
npm run db:init

# 2. Run the optimized import (3-7 minutes)
npm run db:import:fast

# 3. Verify the data
npm run db:test

# 4. Start the patient search server
npm start
```

---

## What's New in v2 (Optimized Import)

The new import script is **100-300x faster** than the original version:

| Version | Library | Time | Speed |
|---------|---------|------|-------|
| v1 (old) | sqlite3 | 3-6 hours | ~150 inserts/sec |
| v2 (new) | better-sqlite3 | 3-7 minutes | ~10,000-60,000 inserts/sec |

### Key Improvements

1. **Transaction Batching**: Groups 1000 inserts per commit (50-100x faster)
2. **better-sqlite3**: Synchronous API eliminates callback overhead (3-5x faster)
3. **Prepared Statements**: SQL compiled once, executed many times (1.2-1.5x faster)
4. **Performance PRAGMAs**: Optimized SQLite settings (2-5x faster)
5. **Gender Normalization**: Eliminates constraint errors

**Total Speedup**: 100-300x faster

---

## Available Import Scripts

### Optimized Import (Recommended)

```bash
npm run db:import:fast
```

**Uses**: `scripts/import-excel-data-v2.js`
**Performance**: 3-7 minutes for ~867,000 records
**Features**:
- Transaction batching (1000 rows/commit)
- Prepared statement caching
- Synchronous better-sqlite3 API
- Gender normalization
- Performance PRAGMAs

### Original Import (Fallback)

```bash
npm run db:import
```

**Uses**: `scripts/import-excel-data.js`
**Performance**: 3-6 hours for ~867,000 records
**Features**:
- Individual inserts with auto-commit
- Callback-based sqlite3 API
- Gender normalization
- Performance PRAGMAs

**Note**: Only use this if you encounter issues with the optimized version.

---

## Import Process Details

### What Gets Imported

The import processes **166 Excel files** across **5 categories**:

1. **Consulting Room** (34 files) - Priority 1
   - Best patient demographics
   - Visit records
   - Diagnoses (Principal/Additional, New/Old/Recurring)
   - Medications (Prescribed/Dispensed)

2. **IPD Morbidity & Mortality** (68 files) - Priority 2
   - Admission records
   - Diagnoses (Principal/Additional/Provisional)
   - Patient demographics

3. **OPD Register** (40 files) - Priority 3
   - Outpatient visit records
   - Patient demographics

4. **Medical Laboratory** (12 files) - Priority 4
   - Lab test orders
   - Specimen information
   - Clinician details

5. **ANC Register** (12 files) - Priority 5
   - Antenatal care visits
   - Patient demographics

### Expected Results

After successful import, you should have:

- **~70,000 unique patients** in `patients` table
- **~867,000 visit records** in `excel_visits` table
- **~200,000 diagnosis records** in `excel_diagnoses` table
- **~150,000 medication records** in `excel_medications` table
- **~50,000 lab orders** in `excel_lab_orders` table

---

## Troubleshooting

### Import is Very Slow

**Problem**: Import taking hours instead of minutes
**Solution**: Make sure you're using the optimized script:

```bash
npm run db:import:fast
```

### Gender Constraint Errors

**Problem**: Errors like "CHECK constraint failed: gender IN ('Male', 'Female', 'Other')"
**Solution**: Both v1 and v2 scripts now handle this automatically with `normalizeGender()` function.

### Database Locked

**Problem**: "Database is locked" error
**Solution**:
1. Stop any running import processes
2. Close any database browser tools
3. Delete the database file and reinitialize:
   ```bash
   rm data/database/patient-care-system.db
   npm run db:init
   npm run db:import:fast
   ```

### Missing Dependencies

**Problem**: "Cannot find module 'better-sqlite3'"
**Solution**: Install dependencies:

```bash
npm install
```

### Out of Memory

**Problem**: Node.js crashes with "JavaScript heap out of memory"
**Solution**: Increase Node.js memory limit:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run db:import:fast
```

---

## Performance Monitoring

### Real-Time Progress

The import script shows progress in real-time:

```
📁 Category: Consulting (34 files)
============================================================

📋 Importing Consulting Room: Consulting_Room_2023_January.xlsx
   Found 9543 rows
   Processed 500/9543 rows...
   Processed 1000/9543 rows...
   Processed 1500/9543 rows...
   ...
   ✓ Completed: 9543 imported, 0 skipped, 0 failed
```

### Import Statistics

At the end, you'll see a summary:

```
═══════════════════════════════════════════════════════
  IMPORT COMPLETED SUCCESSFULLY
═══════════════════════════════════════════════════════

📊 Final Statistics:
   Files processed: 166
   Unique patients: 70,234
   Visit records: 867,452
   Diagnosis records: 198,321
   Medication records: 156,789
   Lab order records: 48,234

⏱ Total time: 5.32 minutes

✓ Database ready: ./data/database/patient-care-system.db
```

---

## Technical Details

### Transaction Batching

The optimized script processes data in batches:

```javascript
// Process 1000 rows per transaction
for (let i = 0; i < rows.length; i += 1000) {
    const batchEnd = Math.min(i + 1000, rows.length);

    const insertBatch = db.transaction(() => {
        for (let j = i; j < batchEnd; j++) {
            processRow(rows[j], j);
        }
    });

    insertBatch(); // Atomic commit
}
```

### Prepared Statements

All SQL statements are prepared once and cached:

```javascript
preparedStatements = {
    insertVisit: db.prepare(`INSERT INTO excel_visits (...) VALUES (...)`),
    insertDiagnosis: db.prepare(`INSERT INTO excel_diagnoses (...) VALUES (...)`),
    // ... etc
};

// Execute many times
preparedStatements.insertVisit.run(params);
```

### Performance PRAGMAs

Both scripts use optimized SQLite settings:

```javascript
db.pragma('journal_mode = WAL');       // Write-Ahead Logging
db.pragma('synchronous = NORMAL');     // Faster commits
db.pragma('cache_size = -64000');      // 64MB cache
db.pragma('temp_store = MEMORY');      // Temp tables in RAM
db.pragma('page_size = 4096');         // Optimal page size
```

---

## Data Validation

After import, verify your data:

```bash
npm run db:test
```

This will show:

1. **Database Statistics**: Patient counts, visit counts, etc.
2. **Sample Patients**: Top 5 patients by visit count
3. **Search Test**: Verify full-text search works
4. **Import Progress**: Breakdown by category

---

## Next Steps

After successful import:

1. **Start the Patient Search Server**:
   ```bash
   npm start
   ```

2. **Access the Web Interface**:
   Open http://localhost:3000 in your browser

3. **Test Patient Search**:
   - Search by patient number, name, NHIS number, or phone
   - View patient demographics
   - Browse visit history
   - Review diagnoses and medications

---

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/init-database.js` | Initialize database schema |
| `scripts/import-excel-data-v2.js` | Optimized import (recommended) |
| `scripts/import-excel-data.js` | Original import (fallback) |
| `scripts/test-biodata.js` | Validate imported data |
| `OPTIMIZATION-STATUS.md` | Detailed optimization documentation |
| `package.json` | npm scripts for all operations |

---

## Support

If you encounter issues:

1. Check [OPTIMIZATION-STATUS.md](OPTIMIZATION-STATUS.md) for technical details
2. Review error messages in console output
3. Verify Excel files are in correct directories under `data/`
4. Ensure database is not open in other tools

---

**Note**: The optimized import script (v2) is production-ready and recommended for all imports. The original script (v1) is kept for fallback purposes only.
