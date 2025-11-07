/**
 * LHIMS Network Capture Analysis Script
 *
 * Analyzes captured network traffic (JSON format) to identify API endpoints,
 * authentication mechanisms, and data download patterns.
 *
 * Usage:
 *   node scripts/analyze-capture.js <capture-filename>
 *   node scripts/analyze-capture.js lhims-capture_2025-11-07T14-30-00.json
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  captureDir: path.join(__dirname, '..', 'data', 'captures'),
  analysisDir: path.join(__dirname, '..', 'analysis'),
};

function analyzeCapture(captureFilePath) {
  console.log('='.repeat(70));
  console.log('LHIMS NETWORK CAPTURE ANALYSIS');
  console.log('='.repeat(70));
  console.log(`\nAnalyzing: ${path.basename(captureFilePath)}\n`);

  // Read capture file
  let captureData;
  try {
    const captureContent = fs.readFileSync(captureFilePath, 'utf8');
    captureData = JSON.parse(captureContent);
  } catch (error) {
    console.error('✗ Error reading capture file:');
    console.error(`  ${error.message}`);
    process.exit(1);
  }

  console.log(`Total requests captured: ${captureData.totalRequests}`);
  console.log(`Total responses captured: ${captureData.totalResponses}`);
  console.log(`Downloads detected: ${captureData.downloadsDetected}\n`);

  // Analysis categories
  const analysis = {
    loginRequests: [],
    downloadRequests: [],
    xlsRequests: [],
    postRequests: [],
    getRequests: [],
    cookies: new Set(),
    lhimsEndpoints: [],
  };

  console.log('Analyzing requests and responses...\n');

  // Analyze responses (more detailed info)
  captureData.responses.forEach(response => {
    const url = response.url;
    const method = response.method;
    const status = response.status;
    const contentType = response.contentType || '';

    // Extract cookies
    if (response.requestHeaders) {
      const cookieHeader = response.requestHeaders['cookie'];
      if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
          analysis.cookies.add(cookie.trim());
        });
      }
    }

    // Identify LHIMS endpoints
    if (url.includes('10.10.0.59') || url.includes('lhims')) {
      analysis.lhimsEndpoints.push({
        method,
        url,
        status,
        contentType,
      });
    }

    // Identify login/authentication
    if (url.includes('login') || url.includes('auth') || url.includes('signin')) {
      analysis.loginRequests.push({
        method,
        url,
        status,
        postData: response.requestPostData,
        headers: response.headers,
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
      (url.includes('download') && !url.includes('chrome'))
    ) {
      analysis.downloadRequests.push({
        method,
        url,
        status,
        contentType,
        postData: response.requestPostData,
        queryParams: parseQueryParams(url),
        requestHeaders: response.requestHeaders,
        responseHeaders: response.headers,
      });
    }

    // Identify XLS-specific
    if (url.includes('.xls') || contentType.includes('excel')) {
      analysis.xlsRequests.push({
        method,
        url,
        status,
        contentType,
        postData: response.requestPostData,
        queryParams: parseQueryParams(url),
      });
    }

    // Track POST requests
    if (method === 'POST' && url.includes('10.10.0.59')) {
      analysis.postRequests.push({
        url,
        status,
        postData: response.requestPostData,
        contentType: response.requestHeaders?.['content-type'],
      });
    }

    // Track GET requests to LHIMS
    if (method === 'GET' && url.includes('10.10.0.59')) {
      analysis.getRequests.push({
        url,
        status,
        queryParams: parseQueryParams(url),
      });
    }
  });

  // Also check download events from requests
  captureData.requests.forEach(request => {
    if (request.type === 'download') {
      console.log(`\n📥 Download Event Found:`);
      console.log(`   Filename: ${request.filename}`);
      console.log(`   URL: ${request.url}`);

      // Try to find matching response
      const matchingResponse = captureData.responses.find(r => r.url === request.url);
      if (matchingResponse) {
        analysis.downloadRequests.push({
          method: matchingResponse.method,
          url: matchingResponse.url,
          status: matchingResponse.status,
          contentType: matchingResponse.contentType,
          filename: request.filename,
          postData: matchingResponse.requestPostData,
          queryParams: parseQueryParams(matchingResponse.url),
          requestHeaders: matchingResponse.requestHeaders,
        });
      }
    }
  });

  // Display analysis results
  console.log('\n' + '='.repeat(70));
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
        console.log(`      POST Data: ${req.postData.substring(0, 200)}`);
      }
    });
  }

  console.log(`\nUnique cookies found: ${analysis.cookies.size}`);
  if (analysis.cookies.size > 0 && analysis.cookies.size < 20) {
    console.log('Cookies:');
    Array.from(analysis.cookies).forEach(cookie => {
      const cookieName = cookie.split('=')[0];
      console.log(`  - ${cookieName}`);
    });
  }

  // 2. Excel Downloads (MOST IMPORTANT)
  console.log('\n\n2. ⭐ EXCEL/FILE DOWNLOADS (OPD MORBIDITY REPORTS) ⭐');
  console.log('-'.repeat(70));
  console.log(`Download requests found: ${analysis.downloadRequests.length}`);

  if (analysis.downloadRequests.length > 0) {
    console.log('\n*** THESE ARE THE OPD REPORT ENDPOINTS ***\n');
    analysis.downloadRequests.forEach((req, i) => {
      console.log(`\n[${i + 1}] ${req.method} REQUEST`);
      console.log(`    URL: ${req.url}`);
      console.log(`    Status: ${req.status}`);
      console.log(`    Content-Type: ${req.contentType}`);
      if (req.filename) {
        console.log(`    Filename: ${req.filename}`);
      }

      if (req.queryParams && Object.keys(req.queryParams).length > 0) {
        console.log(`\n    ✓ Query Parameters (IMPORTANT - these control what data is returned):`);
        Object.entries(req.queryParams).forEach(([key, value]) => {
          console.log(`      - ${key}: ${value}`);
        });
      }

      if (req.postData) {
        console.log(`\n    POST Data:`);
        console.log(`      ${req.postData.substring(0, 500)}`);
      }

      // Show important headers
      if (req.requestHeaders) {
        const importantHeaders = ['cookie', 'authorization', 'x-csrf-token', 'x-requested-with'];
        const headers = Object.entries(req.requestHeaders).filter(([name]) =>
          importantHeaders.includes(name.toLowerCase())
        );
        if (headers.length > 0) {
          console.log(`\n    Important Headers:`);
          headers.forEach(([name, value]) => {
            const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
            console.log(`      - ${name}: ${displayValue}`);
          });
        }
      }

      console.log(`\n    ${'-'.repeat(66)}`);
    });
  } else {
    console.log('\n⚠ WARNING: No Excel download requests found!');
    console.log('   Did you actually download an Excel file during capture?');
    console.log('   The browser might have blocked the download.');
    console.log('   Try running the capture again and make sure to:');
    console.log('   1. Navigate to OPD Morbidity report');
    console.log('   2. Click the download/export button');
    console.log('   3. Allow the download in the browser');
    console.log('   4. Wait for the file to download');
    console.log('   5. Then press Ctrl+C to save\n');
  }

  // 3. LHIMS Endpoints
  console.log('\n\n3. ALL LHIMS ENDPOINTS');
  console.log('-'.repeat(70));
  const uniqueLhimsUrls = [...new Set(analysis.lhimsEndpoints.map(e => e.url))];
  console.log(`Unique LHIMS endpoints accessed: ${uniqueLhimsUrls.length}\n`);

  if (uniqueLhimsUrls.length > 0 && uniqueLhimsUrls.length < 30) {
    uniqueLhimsUrls.forEach((url, i) => {
      // Shorten for display
      const shortUrl = url.replace('http://10.10.0.59/lhims_182/', '');
      console.log(`  [${i + 1}] ${shortUrl}`);
    });
  }

  // 4. POST Requests
  console.log('\n\n4. POST REQUESTS TO LHIMS');
  console.log('-'.repeat(70));
  console.log(`POST requests found: ${analysis.postRequests.length}`);

  if (analysis.postRequests.length > 0 && analysis.postRequests.length < 20) {
    analysis.postRequests.forEach((req, i) => {
      const shortUrl = req.url.replace('http://10.10.0.59/lhims_182/', '');
      console.log(`\n  [${i + 1}] POST ${shortUrl}`);
      console.log(`      Status: ${req.status}`);
      if (req.postData) {
        console.log(`      Data: ${req.postData.substring(0, 100)}...`);
      }
    });
  }

  // Save analysis to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
  const analysisFilename = `analysis_${timestamp}.json`;
  const analysisPath = path.join(CONFIG.analysisDir, analysisFilename);

  // Ensure analysis directory exists
  if (!fs.existsSync(CONFIG.analysisDir)) {
    fs.mkdirSync(CONFIG.analysisDir, { recursive: true });
  }

  const analysisOutput = {
    timestamp: new Date().toISOString(),
    captureFile: path.basename(captureFilePath),
    totalRequests: captureData.totalRequests,
    totalResponses: captureData.totalResponses,
    summary: {
      loginRequests: analysis.loginRequests.length,
      downloadRequests: analysis.downloadRequests.length,
      xlsRequests: analysis.xlsRequests.length,
      postRequests: analysis.postRequests.length,
      uniqueCookies: analysis.cookies.size,
      lhimsEndpoints: uniqueLhimsUrls.length,
    },
    authentication: {
      loginEndpoints: analysis.loginRequests,
      cookies: Array.from(analysis.cookies),
    },
    downloads: analysis.downloadRequests,
    xlsFiles: analysis.xlsRequests,
    lhimsEndpoints: uniqueLhimsUrls,
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
  console.log('RECOMMENDATIONS & NEXT STEPS');
  console.log('='.repeat(70));

  if (analysis.downloadRequests.length > 0) {
    console.log('\n✅ SUCCESS: Excel download endpoint(s) discovered!\n');
    console.log('WHAT WE FOUND:');
    analysis.downloadRequests.forEach((req, i) => {
      console.log(`\n${i + 1}. ${req.method} ${req.url}`);
      if (req.queryParams && Object.keys(req.queryParams).length > 0) {
        console.log('   Parameters to change for different months:');
        Object.entries(req.queryParams).forEach(([key, value]) => {
          console.log(`   - ${key}: ${value}`);
        });
      }
    });

    console.log('\n\nNEXT STEPS:');
    console.log('  1. Share this analysis output with me');
    console.log('  2. I will customize the extraction script with this endpoint');
    console.log('  3. We will test it with a single month');
    console.log('  4. Then run full historical extraction\n');

  } else {
    console.log('\n⚠ WARNING: No Excel downloads detected!\n');
    console.log('POSSIBLE ISSUES:');
    console.log('  1. The download might have been blocked by the browser');
    console.log('  2. You might not have clicked the download button');
    console.log('  3. The report might use a different download mechanism\n');

    console.log('TROUBLESHOOTING:');
    console.log('  1. Run the capture script again:');
    console.log('     node scripts/playwright-network-capture.js');
    console.log('  2. In the browser, manually trigger the Excel download');
    console.log('  3. Check the browser downloads folder');
    console.log('  4. Make sure you see "EXCEL DOWNLOAD DETECTED" in the terminal');
    console.log('  5. Then press Ctrl+C to save\n');

    // Check if there are any suspicious endpoints that might be the download
    const possibleDownloadEndpoints = uniqueLhimsUrls.filter(url =>
      url.includes('report') ||
      url.includes('export') ||
      url.includes('opd') ||
      url.includes('morbidity')
    );

    if (possibleDownloadEndpoints.length > 0) {
      console.log('POSSIBLE DOWNLOAD ENDPOINTS (found in traffic):');
      possibleDownloadEndpoints.forEach(url => {
        console.log(`  - ${url}`);
      });
      console.log('\nThese might be the report endpoints. Try accessing them directly.\n');
    }
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
    // If URL parsing fails, try manual extraction
    const queryStart = url.indexOf('?');
    if (queryStart > -1) {
      const queryString = url.substring(queryStart + 1);
      const params = {};
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key) params[key] = value || '';
      });
      return params;
    }
    return {};
  }
}

// Main
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/analyze-capture.js <capture-filename>');
    console.log('\nExample:');
    console.log('  node scripts/analyze-capture.js lhims-capture_2025-11-07T14-30-00.json');
    console.log('\nAvailable capture files:');

    try {
      const files = fs.readdirSync(CONFIG.captureDir).filter(f => f.endsWith('.json'));
      if (files.length > 0) {
        files.forEach((file, i) => {
          const stats = fs.statSync(path.join(CONFIG.captureDir, file));
          const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          console.log(`  [${i + 1}] ${file} (${sizeMB} MB)`);
        });
      } else {
        console.log('  (none found in data/captures/)');
        console.log('\n  Run: node scripts/playwright-network-capture.js');
      }
    } catch (error) {
      console.log('  Error reading captures directory');
    }

    process.exit(1);
  }

  const captureFilename = args[0];
  let capturePath = captureFilename;

  // If just filename provided, look in captures directory
  if (!path.isAbsolute(captureFilename) && !fs.existsSync(captureFilename)) {
    capturePath = path.join(CONFIG.captureDir, captureFilename);
  }

  if (!fs.existsSync(capturePath)) {
    console.error(`✗ Error: Capture file not found: ${capturePath}`);
    process.exit(1);
  }

  analyzeCapture(capturePath);
}

main();
