# Smart Resume Feature - LHIMS Extraction

## ✅ Feature Implemented!

The extraction scripts now intelligently **skip files that have already been downloaded**, making it safe to re-run the script multiple times without wasting time or bandwidth.

---

## 🎯 How It Works

### Automatic Resume

When you run the extraction script:

1. **Before downloading each file**, the script checks if it already exists
2. **If the file exists and is valid** (size ≥ 1KB), it skips the download
3. **If the file doesn't exist or is too small**, it downloads it
4. **The script shows clear status** for each file

### Example Output

```bash
[1/33] Extracting 2023_Jan (01-01-2023 to 31-01-2023)...
[1/33] ⊙ Already downloaded (2.45 MB) - skipping

[2/33] Extracting 2023_Feb (01-02-2023 to 28-02-2023)...
[2/33] ⊙ Already downloaded (2.13 MB) - skipping

[3/33] Extracting 2023_Mar (01-03-2023 to 31-03-2023)...
[3/33] ✓ Successfully downloaded

[4/33] Extracting 2023_Apr (01-04-2023 to 30-04-2023)...
[4/33] ⚠ File exists but too small (512 bytes) - re-downloading
[4/33] ✓ Successfully downloaded
```

### Status Symbols

- `⊙` - **Skipped** (already exists, valid size)
- `✓` - **Downloaded** (newly downloaded)
- `✗` - **Error** (download failed)
- `⚠` - **Re-downloading** (file too small/corrupted)

---

## 🚀 Usage Examples

### Normal Use (Resume Enabled)

Just run the script as usual. It will automatically skip already-downloaded files:

```bash
npm run extract:opd
```

**Result**: Only downloads missing or invalid files

### Force Re-Download Everything

If you want to re-download ALL files (overwrite existing):

1. Edit the script (`scripts/extract-opd-data.js` or `extract-ipd-data.js`)
2. Change this line:
   ```javascript
   skipExisting: true,  // Change to false
   ```
   to:
   ```javascript
   skipExisting: false,  // Re-download everything
   ```
3. Run the script:
   ```bash
   npm run extract:opd
   ```

### Adjust Minimum File Size

If you want to change what's considered a "valid" file size:

```javascript
minFileSize: 1000,  // Change this (in bytes)
```

Example values:
- `1000` = 1 KB (default)
- `10000` = 10 KB
- `100000` = 100 KB

---

## 📊 Summary Report

At the end of extraction, you'll see a summary:

```
======================================================================
EXTRACTION SUMMARY
======================================================================

✓ Downloaded: 5
⊙ Skipped (already exists): 28
✗ Errors: 0
Total: 33

✓ Files saved to: data/opd-register

======================================================================
```

**Interpreting the summary:**
- **Downloaded**: New files successfully downloaded this run
- **Skipped**: Files that already existed and were valid
- **Errors**: Files that failed to download
- **Total**: Total number of date ranges attempted

---

## 💡 Use Cases

### 1. **Interrupted Extraction**

If the script stops (network issue, power outage, etc.):

```bash
# Just run it again - it will resume where it left off
npm run extract:opd
```

### 2. **Network Problems**

If some months fail due to network issues:

```bash
# Run again - it will skip successful ones and retry failed ones
npm run extract:opd
```

### 3. **Updating Data**

If you want to add more recent months:

1. Edit the `dateRanges` array in the script
2. Add new months at the end
3. Run the script - it will skip existing months and only download new ones

### 4. **Verify Downloads**

To check if any files are corrupted (too small):

```bash
# Run the script
# Files under 1KB will be flagged and re-downloaded
npm run extract:opd
```

---

## 🔧 Technical Details

### How Files Are Identified

Files are identified by their filename, which includes the date label:

**OPD Files:**
```
OPD_Register_2023_Jan.xlsx
OPD_Register_2023_Feb.xlsx
OPD_Register_2024_Jan.xlsx
```

**IPD Files:**
```
IPD_Morbidity_Mortality_2023_Jan.xlsx
IPD_Morbidity_Mortality_2023_Feb.xlsx
```

### Validation Logic

```javascript
if (file exists) {
  if (file size >= 1KB) {
    Skip - file is valid
  } else {
    Re-download - file is too small (likely corrupted)
  }
} else {
  Download - file doesn't exist
}
```

### Performance Benefits

**Without Resume:**
- Downloads all 33 months every time
- Takes ~3-4 minutes each run
- Wastes bandwidth and time

**With Resume:**
- Only downloads new/failed files
- Subsequent runs take seconds (if nothing new)
- Saves bandwidth and time

---

## 🎓 Examples

### Scenario 1: First Run

```bash
npm run extract:opd
```

**Result**: Downloads all 33 files (none exist yet)

```
✓ Downloaded: 33
⊙ Skipped: 0
✗ Errors: 0
```

### Scenario 2: Second Run (No Changes)

```bash
npm run extract:opd
```

**Result**: Skips all 33 files (all exist and valid)

```
✓ Downloaded: 0
⊙ Skipped: 33
✗ Errors: 0
```

### Scenario 3: Partial Failure

First run had some errors:

```
✓ Downloaded: 28
⊙ Skipped: 0
✗ Errors: 5
```

Run again to get the failed ones:

```bash
npm run extract:opd
```

**Result**: Skips successful ones, retries failed ones

```
✓ Downloaded: 3  (3 of the failed ones succeeded)
⊙ Skipped: 28   (the ones that succeeded before)
✗ Errors: 2     (2 still failing - may need investigation)
```

### Scenario 4: Add New Months

Edit script to add November 2025:

```javascript
{ fromDate: '01-11-2025', toDate: '30-11-2025', label: '2025_Nov' },
```

Run the script:

```bash
npm run extract:opd
```

**Result**: Skips all existing, downloads only new month

```
✓ Downloaded: 1   (November 2025)
⊙ Skipped: 33    (all previous months)
✗ Errors: 0
```

---

## ⚙️ Configuration Reference

### In `scripts/extract-opd-data.js` and `scripts/extract-ipd-data.js`

```javascript
CONFIG = {
  // ... other settings ...

  // Resume settings
  skipExisting: true,        // Enable/disable resume feature
  minFileSize: 1000,        // Minimum valid file size (bytes)
}
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `skipExisting` | `true` | Skip files that already exist |
| `minFileSize` | `1000` (1KB) | Minimum size for valid file |

---

## 🔍 Troubleshooting

### Problem: Script keeps re-downloading the same file

**Cause**: File is being saved but is too small (< 1KB)

**Solution**:
1. Check the downloaded file manually
2. If it's an error page or empty, there may be an issue with LHIMS access
3. Increase timeout if downloads are slow

### Problem: Want to force re-download a specific month

**Solution**:
1. Delete the file manually:
   ```bash
   rm data/opd-register/OPD_Register_2023_Jan.xlsx
   ```
2. Run the script - it will download the missing file

### Problem: All files showing as "already downloaded" but folder is empty

**Cause**: Looking in wrong directory

**Solution**:
- OPD files: `data/opd-register/`
- IPD files: `data/ipd-morbidity-mortality/`

---

## ✅ Benefits Summary

1. ✅ **Save Time**: Don't re-download files you already have
2. ✅ **Save Bandwidth**: Important for slow hospital network
3. ✅ **Resume Capability**: Pick up where you left off after interruptions
4. ✅ **Retry Failed**: Easily retry failed downloads without re-doing successful ones
5. ✅ **Update Mode**: Add new months without re-downloading old ones
6. ✅ **Smart Validation**: Automatically detects and re-downloads corrupted files

---

## 🎉 Summary

The resume feature makes the extraction process:
- **Smarter** - knows what's already downloaded
- **Faster** - only downloads what's needed
- **More reliable** - handles interruptions gracefully
- **More efficient** - doesn't waste bandwidth

**Just run the script - it handles everything automatically!**

```bash
npm run extract:opd
npm run extract:ipd
```

No special commands needed. Resume works automatically! 🚀
