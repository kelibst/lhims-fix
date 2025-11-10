const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/captures/ipd-capture-1762809398507.json', 'utf8'));

// Find the responses that returned PDF
const pdfResponses = data.networkLog.filter(e =>
  e.type === 'response' && e.isPDF && !e.pdfEmpty
);

console.log(`Found ${pdfResponses.length} successful PDF responses\n`);

pdfResponses.forEach((resp, i) => {
  console.log(`PDF ${i + 1}:`);
  console.log('  URL:', resp.url);
  console.log('  Size:', resp.bodySize, 'bytes');
  console.log('  Pages:', resp.pdfPages || 'unknown');
  console.log('');
});
