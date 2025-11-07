/**
 * LHIMS HAR File Analysis Script
 *
 * Analyzes captured network traffic (HAR file) to identify API endpoints,
 * authentication mechanisms, and data download patterns.
 *
 * Usage:
 *   node scripts/analyze-requests.js <har-filename>
 *   node scripts/analyze-requests.js lhims-session_2025-11-07_14-30-00.har
 *
 * What this does:
 *   1. Reads the HAR file from data/captures/
 *   2. Analyzes all HTTP requests and responses
 *   3. Identifies authentication endpoints and cookies
 *   4. Finds Excel/file download requests
 *   5. Extracts API endpoint patterns
 *   6. Saves analysis to analysis/discovered-endpoints.json
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  captureDir: path.join(__dirname, '..', 'data', 'captures'),
  analysisDir: path.join(__dirname, '..', 'analysis'),
};

function analyzeHAR(harFilePath) {
  console.log('='.repeat(70));
  console.log('LHIMS HAR FILE ANALYSIS');
  console.log('='.repeat(70));
  console.log(`\nAnalyzing: ${path.basename(harFilePath)}\n`);

  // Read HAR file
  let harData;
  try {
    const harContent = fs.readFileSync(harFilePath, 'utf8');
    harData = JSON.parse(harContent);
  } catch (error) {
    console.error('✗ Error reading HAR file:');
    console.error(`  ${error.message}`);
    process.exit(1);
  }

  const entries = harData.log.entries;
  console.log(`Total HTTP requests captured: ${entries.length}\n`);

  // Analysis categories
  const analysis = {
    loginRequests: [],
    downloadRequests: [],
    apiRequests: [],
    cookies: new Set(),
    authHeaders: new Set(),
    postRequests: [],
    xlsRequests: [],
  };

  console.log('Analyzing requests...\n');

  // Analyze each request
  entries.forEach((entry, index) => {
    const request = entry.request;
    const response = entry.response;
    const url = request.url;
    const method = request.method;
    const status = response.status;
    const contentType = response.content.mimeType || '';

    // Extract cookies
    request.headers.forEach(header => {
      if (header.name.toLowerCase() === 'cookie') {
        header.value.split(';').forEach(cookie => {
          analysis.cookies.add(cookie.trim());
        });
      }
      if (header.name.toLowerCase() === 'authorization') {
        analysis.authHeaders.add(header.value);
      }
    });

    // Identify login/authentication requests
    if (url.includes('login') || url.includes('auth') || url.includes('signin')) {
      analysis.loginRequests.push({
        method,
        url,
        status,
        postData: request.postData,
        responseHeaders: response.headers,
      });
    }

    // Identify Excel/download requests
    if (
      contentType.includes('excel') ||
      contentType.includes('spreadsheet') ||
      contentType.includes('application/vnd.ms-excel') ||
      contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
      url.includes('.xls') ||
      url.includes('.xlsx') ||
      url.includes('export') ||
      url.includes('download')
    ) {
      analysis.downloadRequests.push({
        method,
        url,
        status,
        contentType,
        contentLength: response.content.size,
        postData: request.postData,
        queryParams: parseQueryParams(url),
        requestHeaders: request.headers,
        responseHeaders: response.headers,
      });
    }

    // Identify XLS-specific requests
    if (url.includes('.xls') || contentType.includes('excel')) {
      analysis.xlsRequests.push({
        method,
        url,
        status,
        contentType,
        size: response.content.size,
        postData: request.postData,
        queryParams: parseQueryParams(url),
      });
    }

    // Identify API requests (JSON responses)
    if (contentType.includes('application/json')) {
      analysis.apiRequests.push({
        method,
        url,
        status,
        postData: request.postData,
        queryParams: parseQueryParams(url),
      });
    }

    // Track POST requests (often used for data submission/retrieval)
    if (method === 'POST') {
      analysis.postRequests.push({
        url,
        status,
        postData: request.postData,
        contentType: request.headers.find(h => h.name.toLowerCase() === 'content-type')?.value,
      });
    }
  });

  // Display analysis results
  console.log('='.repeat(70));
  console.log('ANALYSIS RESULTS');
  console.log('='.repeat(70));

  // 1. Authentication
  console.log('\n1. AUTHENTICATION & SESSION MANAGEMENT');
  console.log('-'.repeat(70));
  console.log(`Login/Auth requests found: ${analysis.loginRequests.length}`);

  if (analysis.loginRequests.length > 0) {
    console.log('\nLogin endpoints:');
    analysis.loginRequests.forEach((req, i) => {
      console.log(`\n  [${i + 1}] ${req.method} ${req.url}`);
      console.log(`      Status: ${req.status}`);
      if (req.postData) {
        console.log(`      POST Data: ${JSON.stringify(req.postData, null, 2)}`);
      }
    });
  }

  console.log(`\nUnique cookies found: ${analysis.cookies.size}`);
  if (analysis.cookies.size > 0 && analysis.cookies.size < 20) {
    console.log('Cookies:');
    Array.from(analysis.cookies).forEach(cookie => {
      console.log(`  - ${cookie.substring(0, 100)}${cookie.length > 100 ? '...' : ''}`);
    });
  }

  if (analysis.authHeaders.size > 0) {
    console.log('\nAuthorization headers found:');
    Array.from(analysis.authHeaders).forEach(header => {
      console.log(`  - ${header.substring(0, 50)}...`);
    });
  }

  // 2. Excel Downloads (MOST IMPORTANT)
  console.log('\n\n2. EXCEL/FILE DOWNLOADS (OPD MORBIDITY REPORTS)');
  console.log('-'.repeat(70));
  console.log(`Download requests found: ${analysis.downloadRequests.length}`);

  if (analysis.downloadRequests.length > 0) {
    console.log('\n*** CRITICAL: These are likely the OPD report endpoints ***\n');
    analysis.downloadRequests.forEach((req, i) => {
      console.log(`\n[${i + 1}] ${req.method} REQUEST`);
      console.log(`    URL: ${req.url}`);
      console.log(`    Status: ${req.status}`);
      console.log(`    Content-Type: ${req.contentType}`);
      console.log(`    File Size: ${(req.contentLength / 1024).toFixed(2)} KB`);

      if (req.queryParams && Object.keys(req.queryParams).length > 0) {
        console.log(`    Query Parameters:`);
        Object.entries(req.queryParams).forEach(([key, value]) => {
          console.log(`      - ${key}: ${value}`);
        });
      }

      if (req.postData) {
        console.log(`    POST Data:`);
        if (req.postData.mimeType === 'application/json') {
          try {
            const postJson = JSON.parse(req.postData.text);
            console.log(JSON.stringify(postJson, null, 6));
          } catch {
            console.log(`      ${req.postData.text}`);
          }
        } else if (req.postData.params) {
          req.postData.params.forEach(param => {
            console.log(`      - ${param.name}: ${param.value}`);
          });
        } else {
          console.log(`      ${req.postData.text}`);
        }
      }

      // Show important headers
      const importantHeaders = ['cookie', 'authorization', 'x-csrf-token', 'x-requested-with'];
      const headers = req.requestHeaders.filter(h =>
        importantHeaders.includes(h.name.toLowerCase())
      );
      if (headers.length > 0) {
        console.log(`    Important Headers:`);
        headers.forEach(h => {
          const value = h.value.length > 50 ? h.value.substring(0, 50) + '...' : h.value;
          console.log(`      - ${h.name}: ${value}`);
        });
      }
    });
  } else {
    console.log('\n⚠ WARNING: No Excel download requests found!');
    console.log('   Did you actually download an Excel file during capture?');
    console.log('   Try running the capture again and make sure to:');
    console.log('   1. Navigate to OPD Morbidity report');
    console.log('   2. Click the download/export button');
    console.log('   3. Wait for the file to download');
    console.log('   4. Then press Ctrl+C to save\n');
  }

  // 3. XLS-specific requests
  if (analysis.xlsRequests.length > 0) {
    console.log('\n\n3. SPECIFIC XLS FILE REQUESTS');
    console.log('-'.repeat(70));
    analysis.xlsRequests.forEach((req, i) => {
      console.log(`\n[${i + 1}] ${req.method} ${req.url}`);
      console.log(`    File size: ${(req.size / 1024).toFixed(2)} KB`);
      if (req.queryParams && Object.keys(req.queryParams).length > 0) {
        console.log(`    Query params:`, req.queryParams);
      }
    });
  }

  // 4. API Requests
  console.log('\n\n4. JSON API REQUESTS');
  console.log('-'.repeat(70));
  console.log(`JSON API requests found: ${analysis.apiRequests.length}`);

  if (analysis.apiRequests.length > 0 && analysis.apiRequests.length < 50) {
    // Show sample of API endpoints
    const uniqueEndpoints = [...new Set(analysis.apiRequests.map(r => r.url))];
    console.log('\nUnique API endpoints:');
    uniqueEndpoints.slice(0, 20).forEach((url, i) => {
      console.log(`  [${i + 1}] ${url}`);
    });
    if (uniqueEndpoints.length > 20) {
      console.log(`  ... and ${uniqueEndpoints.length - 20} more`);
    }
  }

  // 5. POST Requests
  console.log('\n\n5. POST REQUESTS (Data Submission)');
  console.log('-'.repeat(70));
  console.log(`POST requests found: ${analysis.postRequests.length}`);

  // Save analysis to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const analysisFilename = `analysis_${timestamp}.json`;
  const analysisPath = path.join(CONFIG.analysisDir, analysisFilename);

  // Ensure analysis directory exists
  if (!fs.existsSync(CONFIG.analysisDir)) {
    fs.mkdirSync(CONFIG.analysisDir, { recursive: true });
  }

  const analysisOutput = {
    timestamp: new Date().toISOString(),
    harFile: path.basename(harFilePath),
    totalRequests: entries.length,
    summary: {
      loginRequests: analysis.loginRequests.length,
      downloadRequests: analysis.downloadRequests.length,
      xlsRequests: analysis.xlsRequests.length,
      apiRequests: analysis.apiRequests.length,
      postRequests: analysis.postRequests.length,
      uniqueCookies: analysis.cookies.size,
    },
    authentication: {
      loginEndpoints: analysis.loginRequests,
      cookies: Array.from(analysis.cookies),
      authHeaders: Array.from(analysis.authHeaders),
    },
    downloads: analysis.downloadRequests,
    xlsFiles: analysis.xlsRequests,
    apiEndpoints: analysis.apiRequests,
    postRequests: analysis.postRequests,
  };

  try {
    fs.writeFileSync(analysisPath, JSON.stringify(analysisOutput, null, 2));
    console.log(`\n\n✓ Detailed analysis saved to: ${analysisFilename}`);
  } catch (error) {
    console.error(`\n✗ Error saving analysis: ${error.message}`);
  }

  // Recommendations
  console.log('\n\n' + '='.repeat(70));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(70));

  if (analysis.downloadRequests.length > 0) {
    console.log('\n✓ SUCCESS: Excel download endpoint(s) discovered!\n');
    console.log('NEXT STEPS:');
    console.log('  1. Review the download request details above');
    console.log('  2. Note the URL, method (GET/POST), and parameters');
    console.log('  3. Check if authentication cookies are required');
    console.log('  4. We can now build an automation script to:');
    console.log('     - Authenticate to LHIMS');
    console.log('     - Call the download endpoint with different date parameters');
    console.log('     - Download historical monthly OPD reports\n');
    console.log('  5. Test the endpoint manually first using curl or Postman');
    console.log('  6. Then automate with a script\n');
  } else {
    console.log('\n⚠ WARNING: No Excel downloads detected!\n');
    console.log('TROUBLESHOOTING:');
    console.log('  1. Run the capture script again');
    console.log('  2. Make sure you actually download an Excel file');
    console.log('  3. Look for "Export to Excel" or "Download" buttons');
    console.log('  4. Wait for the download to complete');
    console.log('  5. Then save the HAR file\n');
  }

  console.log('='.repeat(70));
}

function parseQueryParams(url) {
  try {
    const urlObj = new URL(url);
    const params = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
}

// Main
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/analyze-requests.js <har-filename>');
    console.log('\nExample:');
    console.log('  node scripts/analyze-requests.js lhims-session_2025-11-07_14-30-00.har');
    console.log('\nAvailable HAR files:');

    try {
      const files = fs.readdirSync(CONFIG.captureDir).filter(f => f.endsWith('.har'));
      if (files.length > 0) {
        files.forEach((file, i) => {
          const stats = fs.statSync(path.join(CONFIG.captureDir, file));
          const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          console.log(`  [${i + 1}] ${file} (${sizeMB} MB)`);
        });
      } else {
        console.log('  (none found in data/captures/)');
        console.log('\n  Run: node scripts/playwright-har-capture.js');
      }
    } catch (error) {
      console.log('  Error reading captures directory');
    }

    process.exit(1);
  }

  const harFilename = args[0];
  let harPath = harFilename;

  // If just filename provided, look in captures directory
  if (!path.isAbsolute(harFilename) && !fs.existsSync(harFilename)) {
    harPath = path.join(CONFIG.captureDir, harFilename);
  }

  if (!fs.existsSync(harPath)) {
    console.error(`✗ Error: HAR file not found: ${harPath}`);
    process.exit(1);
  }

  analyzeHAR(harPath);
}

main();
