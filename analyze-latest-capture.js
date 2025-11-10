// Quick analysis of the latest capture
const fs = require('fs');

const captureFile = 'data/captures/lhims-capture_2025-11-09T13-39-37-517Z.json';
const data = JSON.parse(fs.readFileSync(captureFile, 'utf8'));

console.log('='.repeat(70));
console.log('CAPTURE ANALYSIS');
console.log('='.repeat(70));
console.log('');
console.log('Summary:');
console.log(`  Total Requests: ${data.totalRequests}`);
console.log(`  Total Responses: ${data.totalResponses}`);
console.log(`  Downloads Detected: ${data.downloadsDetected}`);
console.log('');

// Find patient search requests
console.log('='.repeat(70));
console.log('PATIENT SEARCH REQUESTS');
console.log('='.repeat(70));
console.log('');

const searchRequests = data.requests.filter(r =>
  r.url.includes('searchPatient') ||
  (r.postData && r.postData.includes('pregno'))
);

if (searchRequests.length > 0) {
  searchRequests.forEach((req, i) => {
    console.log(`[${i + 1}] ${req.method} ${req.url}`);
    console.log(`    Time: ${req.timestamp}`);
    if (req.postData) {
      console.log(`    POST Data: ${req.postData.substring(0, 200)}`);
    }
    console.log('');
  });
} else {
  console.log('  No patient search requests found');
  console.log('');
}

// Find patient search responses
const searchResponses = data.responses.filter(r =>
  r.url.includes('searchPatient')
);

if (searchResponses.length > 0) {
  console.log('='.repeat(70));
  console.log('PATIENT SEARCH RESPONSES');
  console.log('='.repeat(70));
  console.log('');

  searchResponses.forEach((resp, i) => {
    console.log(`[${i + 1}] Status ${resp.status} - ${resp.url}`);
    console.log(`    Content-Type: ${resp.contentType}`);
    if (resp.body) {
      console.log(`    Body preview (first 500 chars):`);
      console.log('    ' + '-'.repeat(66));
      console.log('    ' + resp.body.substring(0, 500).split('\n').join('\n    '));
      console.log('    ' + '-'.repeat(66));
    }
    console.log('');
  });
}

// Find PDF downloads
console.log('='.repeat(70));
console.log('PDF DOWNLOADS');
console.log('='.repeat(70));
console.log('');

const pdfRequests = data.requests.filter(r =>
  r.url.includes('.pdf') ||
  r.url.includes('pdf') ||
  r.type === 'download' ||
  (r.url.includes('patient') && r.url.includes('print'))
);

if (pdfRequests.length > 0) {
  pdfRequests.forEach((req, i) => {
    console.log(`[${i + 1}] ${req.type || req.method} ${req.url}`);
    if (req.filename) {
      console.log(`    Filename: ${req.filename}`);
    }
    if (req.postData) {
      console.log(`    POST Data: ${req.postData.substring(0, 150)}`);
    }
    console.log('');
  });
} else {
  console.log('  No PDF downloads found');
  console.log('');
}

// Find all POST requests to LHIMS (likely API calls)
console.log('='.repeat(70));
console.log('LHIMS API CALLS (POST requests)');
console.log('='.repeat(70));
console.log('');

const apiCalls = data.requests.filter(r =>
  r.method === 'POST' &&
  r.url.includes('lhims_182') &&
  !r.url.includes('.js') &&
  !r.url.includes('.css')
);

const uniqueEndpoints = [...new Set(apiCalls.map(r => {
  const url = r.url.replace('http://10.10.0.59/lhims_182/', '');
  return url.split('?')[0];
}))];

console.log(`Found ${uniqueEndpoints.length} unique POST endpoints:`);
console.log('');
uniqueEndpoints.forEach((endpoint, i) => {
  const calls = apiCalls.filter(r => r.url.includes(endpoint));
  console.log(`  ${i + 1}. ${endpoint} (${calls.length} calls)`);

  // Show sample POST data
  if (calls[0].postData) {
    console.log(`     Sample data: ${calls[0].postData.substring(0, 100)}`);
  }
  console.log('');
});

console.log('='.repeat(70));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(70));
