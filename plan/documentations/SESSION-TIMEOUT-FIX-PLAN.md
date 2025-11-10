# Session Timeout Fix - Implementation Plan

## Problem Statement

**Issue:** LHIMS logs users out after a period of inactivity, causing extraction to fail mid-process.

**Impact:**
- Extraction stops when session expires
- Remaining months are not downloaded
- User must manually restart extraction
- Time and bandwidth wasted on failed attempts

**Example Scenario:**
```
[1/34] Extracting 2023_Jan... ✓ Successfully downloaded
[2/34] Extracting 2023_Feb... ✓ Successfully downloaded
...
[15/34] Extracting 2024_Mar... ✗ Error: Login page detected (session expired)
[16/34] Extracting 2024_Apr... ✗ Error: Login page detected (session expired)
...
```

---

## Root Cause Analysis

### Why Sessions Expire

1. **LHIMS Session Timeout:**
   - Server-side timeout (likely 15-30 minutes of inactivity)
   - Session cookie expires
   - Server invalidates session after timeout

2. **Long Extraction Times:**
   - 34 months × 7 minutes per file = ~4 hours total
   - 3-second delay between requests
   - Network slowness adds time

3. **No Activity Detection:**
   - Scripts don't detect when logged out
   - Continue trying to download without valid session
   - All subsequent downloads fail

### How to Detect Session Expiry

**Symptoms:**
- Redirect to login page (`login.php` in URL)
- Response contains login form HTML instead of Excel file
- Download fails with small file size (< 1KB)
- HTTP 302 redirect to login page

---

## Solution Design

### Strategy: Automatic Re-login on Session Expiry

**Approach:**
1. **Detect session expiry** before/after each download attempt
2. **Automatically re-login** when session expires
3. **Retry the failed download** with new session
4. **Continue extraction** seamlessly

### Implementation Components

#### 1. Session Check Function

```javascript
/**
 * Check if current session is still valid
 * Returns true if logged in, false if session expired
 */
async function isSessionValid(page) {
  const currentUrl = page.url();

  // If we're on login page, session expired
  if (currentUrl.includes('login.php')) {
    return false;
  }

  // Try to navigate to a known authenticated page
  try {
    const response = await page.goto(CONFIG.lhimsUrl + '/index.php', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    const url = page.url();
    return !url.includes('login.php');
  } catch (error) {
    return false;
  }
}
```

#### 2. Auto Re-login Function

```javascript
/**
 * Re-login when session expires
 */
async function relogin(page) {
  console.log('⚠ Session expired - logging in again...');

  try {
    await login(page);
    console.log('✓ Successfully re-logged in');
    return true;
  } catch (error) {
    console.error('✗ Re-login failed:', error.message);
    return false;
  }
}
```

#### 3. Enhanced Download Function

```javascript
async function extractDateRange(page, range, retryCount = 0) {
  const MAX_RETRIES = 3;

  try {
    // Check session before download
    const sessionValid = await isSessionValid(page);
    if (!sessionValid) {
      const reloginSuccess = await relogin(page);
      if (!reloginSuccess && retryCount < MAX_RETRIES) {
        // Retry with fresh login
        return await extractDateRange(page, range, retryCount + 1);
      }
    }

    // Proceed with download
    const params = new URLSearchParams({...});
    const downloadUrl = `${CONFIG.endpoint}?${params.toString()}`;

    const downloadPromise = page.waitForEvent('download', { timeout: CONFIG.timeout });

    try {
      await page.goto(downloadUrl, { timeout: CONFIG.timeout, waitUntil: 'commit' });
    } catch (error) {
      if (!error.message.includes('Download is starting')) {
        // Check if we got redirected to login page
        const currentUrl = page.url();
        if (currentUrl.includes('login.php')) {
          throw new Error('Session expired during download');
        }
        throw error;
      }
    }

    const download = await downloadPromise;
    const savePath = path.join(CONFIG.outputDir, filename);
    await download.saveAs(savePath);

    // Verify file was saved and is valid size
    if (!fs.existsSync(savePath)) {
      throw new Error('File was not saved successfully');
    }

    const stats = fs.statSync(savePath);
    if (stats.size < 1000) {
      // Small file might be login page HTML
      throw new Error(`File too small (${stats.size} bytes) - possible session expiry`);
    }

    return true;

  } catch (error) {
    // If session expired, retry with re-login
    if (error.message.includes('Session expired') || error.message.includes('possible session expiry')) {
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying download after session expiry (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        await relogin(page);
        return await extractDateRange(page, range, retryCount + 1);
      }
    }
    throw error;
  }
}
```

#### 4. Periodic Session Refresh

```javascript
/**
 * Keep session alive by periodically accessing a page
 */
async function keepSessionAlive(page) {
  try {
    // Navigate to a lightweight page to keep session active
    await page.goto(CONFIG.lhimsUrl + '/index.php', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
  } catch (error) {
    // Ignore errors, will be caught on next download attempt
  }
}

// In main extraction loop:
for (const [index, range] of CONFIG.dateRanges.entries()) {
  // ... download logic ...

  // Every 5 downloads, refresh session
  if ((index + 1) % 5 === 0) {
    await keepSessionAlive(page);
  }
}
```

---

## Implementation Plan

### Phase 1: Add Helper Functions

Add to each extraction script:

```javascript
// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Check if session is still valid
 */
async function isSessionValid(page) {
  const currentUrl = page.url();

  if (currentUrl.includes('login.php')) {
    return false;
  }

  try {
    const response = await page.goto(CONFIG.lhimsUrl + '/index.php', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    const url = page.url();
    return !url.includes('login.php');
  } catch (error) {
    return false;
  }
}

/**
 * Re-login after session expires
 */
async function relogin(page) {
  console.log('      ⚠ Session expired - re-logging in...');

  try {
    await login(page);
    console.log('      ✓ Re-login successful');
    return true;
  } catch (error) {
    console.error('      ✗ Re-login failed:', error.message);
    return false;
  }
}

/**
 * Keep session alive
 */
async function keepSessionAlive(page) {
  try {
    await page.goto(CONFIG.lhimsUrl + '/index.php', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
  } catch (error) {
    // Ignore - will be caught on next download
  }
}
```

### Phase 2: Enhance extractDateRange Function

**Add session checking and retry logic:**

```javascript
async function extractDateRange(page, range, retryCount = 0) {
  const MAX_RETRIES = 2;

  try {
    // Check session validity before download
    const sessionValid = await isSessionValid(page);
    if (!sessionValid) {
      await relogin(page);
    }

    // Build download URL
    const params = new URLSearchParams({
      dFromDate: range.fromDate,
      dToDate: range.toDate,
      // ... other params ...
    });

    const downloadUrl = `${CONFIG.endpoint}?${params.toString()}`;

    // Download file
    const downloadPromise = page.waitForEvent('download', { timeout: CONFIG.timeout });

    try {
      await page.goto(downloadUrl, { timeout: CONFIG.timeout, waitUntil: 'commit' });
    } catch (error) {
      if (!error.message.includes('Download is starting')) {
        // Check if redirected to login
        const currentUrl = page.url();
        if (currentUrl.includes('login.php')) {
          throw new Error('Session expired during download');
        }
        throw error;
      }
    }

    const download = await downloadPromise;
    const filename = `Register_${range.label}.xlsx`;
    const savePath = path.join(CONFIG.outputDir, filename);
    await download.saveAs(savePath);

    await page.waitForTimeout(500);

    // Validate downloaded file
    if (!fs.existsSync(savePath)) {
      throw new Error('File was not saved successfully');
    }

    const stats = fs.statSync(savePath);
    if (stats.size < 1000) {
      throw new Error(`File too small (${stats.size} bytes) - possible session expiry or no data`);
    }

    return true;

  } catch (error) {
    // Retry on session expiry errors
    if ((error.message.includes('Session expired') ||
         error.message.includes('possible session expiry')) &&
        retryCount < MAX_RETRIES) {
      console.log(`      Retry attempt ${retryCount + 1}/${MAX_RETRIES} after session issue...`);
      await relogin(page);
      await page.waitForTimeout(2000); // Wait after re-login
      return await extractDateRange(page, range, retryCount + 1);
    }

    throw error;
  }
}
```

### Phase 3: Add Periodic Session Refresh

**In main extraction loop:**

```javascript
for (const [index, range] of CONFIG.dateRanges.entries()) {
  const progress = `[${index + 1}/${CONFIG.dateRanges.length}]`;
  console.log(`${progress} Extracting ${range.label} (${range.fromDate} to ${range.toDate})...`);

  // ... skip existing file check ...

  try {
    await extractDateRange(page, range);
    successCount++;
    console.log(`${progress} ✓ Successfully downloaded`);
  } catch (error) {
    errorCount++;
    const errorMsg = `${range.label}: ${error.message}`;
    errors.push(errorMsg);
    console.error(`${progress} ✗ Error: ${error.message}`);
  }

  // Delay between requests
  if (index < CONFIG.dateRanges.length - 1) {
    console.log(`${progress} Waiting ${CONFIG.delayBetweenRequests}ms...\n`);
    await page.waitForTimeout(CONFIG.delayBetweenRequests);

    // Refresh session every 10 downloads to keep it alive
    if ((index + 1) % 10 === 0) {
      console.log(`${progress} Refreshing session to keep it alive...`);
      await keepSessionAlive(page);
    }
  }
}
```

---

## Testing Strategy

### Test 1: Simulate Session Expiry

1. Start extraction
2. After 3-4 downloads, manually log out from another browser window
3. Verify script detects session expiry
4. Verify script re-logs in automatically
5. Verify extraction continues

### Test 2: Long Running Extraction

1. Run full extraction (34 months)
2. Monitor for session expiry during long process
3. Verify no failures due to timeout

### Test 3: Multiple Session Expiries

1. Manually expire session multiple times during extraction
2. Verify script handles each re-login
3. Verify all files are eventually downloaded

---

## Configuration Updates

### Add Session Settings to CONFIG

```javascript
const CONFIG = {
  // ... existing config ...

  // Session management
  sessionRefreshInterval: 10,  // Refresh session every N downloads
  maxRetries: 2,              // Max retry attempts on session expiry
  reloginDelay: 2000,         // Wait after re-login (ms)
};
```

---

## Benefits

### Before Fix

❌ Session expires → All remaining downloads fail
❌ User must manually restart
❌ Wastes time and bandwidth on failed attempts
❌ Risk of incomplete data extraction

### After Fix

✅ Session expires → Auto re-login → Continue seamlessly
✅ No manual intervention needed
✅ Guaranteed complete extraction (with retries)
✅ Robust against network issues and timeouts
✅ Peace of mind for long-running extractions

---

## Rollout Plan

### Priority Order

1. **OPD Script** (high priority, already in use)
2. **IPD Script** (high priority, already in use)
3. **ANC Script** (new, about to use)
4. **Consulting Room Script** (new, about to use)
5. **Medical Lab Script** (new, about to use)

### Implementation Steps

For each script:

1. ✅ Add session management functions
2. ✅ Enhance `extractDateRange()` with retry logic
3. ✅ Add periodic session refresh to main loop
4. ✅ Test with manual session expiry
5. ✅ Run full extraction to verify

### Time Estimate

- Per script: ~15-20 minutes (code + test)
- All 5 scripts: ~1.5-2 hours total

---

## Error Messages

### New Messages to Show User

**Session Expiry Detected:**
```
[15/34] Extracting 2024_Mar (01-03-2024 to 31-03-2024)...
      ⚠ Session expired - re-logging in...
      ✓ Re-login successful
      Retry attempt 1/2 after session issue...
[15/34] ✓ Successfully downloaded
```

**Re-login Failed:**
```
[15/34] Extracting 2024_Mar (01-03-2024 to 31-03-2024)...
      ⚠ Session expired - re-logging in...
      ✗ Re-login failed: Login page still showing
      Retry attempt 1/2 after session issue...
      ⚠ Session expired - re-logging in...
      ✓ Re-login successful
[15/34] ✓ Successfully downloaded
```

**Max Retries Exceeded:**
```
[15/34] Extracting 2024_Mar (01-03-2024 to 31-03-2024)...
      ⚠ Session expired - re-logging in...
      ✗ Re-login failed: Login page still showing
      Retry attempt 1/2 after session issue...
      ⚠ Session expired - re-logging in...
      ✗ Re-login failed: Login page still showing
      Retry attempt 2/2 after session issue...
      ⚠ Session expired - re-logging in...
      ✗ Re-login failed: Login page still showing
[15/34] ✗ Error: Session expired during download (max retries exceeded)
```

---

## Alternative Approaches Considered

### Option 1: Increase Session Timeout (❌ Rejected)

**Pros:** Simple, no code changes
**Cons:** Not under our control, server-side setting

### Option 2: Manual Session Monitoring (❌ Rejected)

**Pros:** User can intervene
**Cons:** Requires constant monitoring, defeats automation purpose

### Option 3: Split into Batches (❌ Rejected)

**Pros:** Shorter sessions reduce timeout risk
**Cons:** More manual work, harder to track progress

### Option 4: Auto Re-login (✅ Selected)

**Pros:** Fully automated, robust, no user intervention
**Cons:** Slightly more complex code (but worth it)

---

## Success Criteria

✅ **Must Have:**
- Script detects session expiry automatically
- Script re-logs in without user intervention
- Extraction continues after re-login
- All 34 months extracted successfully even with session timeouts

✅ **Nice to Have:**
- Periodic session refresh to minimize expiries
- Detailed logging of session events
- Configurable retry limits

✅ **Tested:**
- Manual session expiry during extraction
- Multiple session expiries in one run
- Long-running extraction (4+ hours)

---

## Next Steps

**Ready to implement?**

I can update all 5 extraction scripts with session timeout handling right now. This will make them bulletproof against session expiry issues.

**Proceed with implementation?**

1. Update OPD script with session handling
2. Update IPD script with session handling
3. Update ANC script with session handling
4. Update Consulting Room script with session handling
5. Update Medical Lab script with session handling
6. Test with one script (manual session expiry)
7. Run full extraction to verify

Estimated time: 1.5-2 hours for all scripts.

---

**Status:** Ready to implement - waiting for approval
