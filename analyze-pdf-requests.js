/**
 * Analyze PDF-related requests from capture file
 */

const fs = require('fs');

const captureFile = process.argv[2] || 'data/captures/lhims-capture_2025-11-10T19-38-53-448Z.json';

console.log('Analyzing:', captureFile);
console.log('='.repeat(70));

const data = JSON.parse(fs.readFileSync(captureFile, 'utf8'));

// Get requests and responses arrays
const requests = data.requests || [];
const responses = data.responses || [];

// Combine requests and responses for analysis
const allData = requests.map((req, i) => ({
  request: req,
  response: responses[i]
}));

// Find PDF-related requests
const pdfRequests = allData.filter(item => {
  const url = item.request?.url || '';
  return url.includes('exportServiceReportsInSinglePDF') ||
         url.includes('viewFile.php') ||
         url.includes('.pdf');
});

console.log(`\nFound ${pdfRequests.length} PDF-related requests\n`);

pdfRequests.forEach((req, i) => {
  console.log(`\nRequest ${i + 1}:`);
  console.log(`URL: ${req.request?.url}`);
  console.log(`Method: ${req.request?.method}`);
  console.log(`Status: ${req.response?.status}`);

  const contentType = req.response?.headers?.['content-type'] ||
                      req.response?.headers?.['Content-Type'] ||
                      'unknown';
  console.log(`Content-Type: ${contentType}`);

  if (req.request?.postData) {
    const postData = req.request.postData;
    console.log(`POST Data (first 300 chars):`);
    console.log(postData.substring(0, 300));
    if (postData.length > 300) console.log('...');
  }

  if (req.response?.content?.text) {
    const respText = req.response.content.text;
    console.log(`Response (first 300 chars):`);
    console.log(respText.substring(0, 300));
    if (respText.length > 300) console.log('...');
  }

  console.log('-'.repeat(70));
});
