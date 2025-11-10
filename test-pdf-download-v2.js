/**
 * Test PDF download using browser download event (more reliable)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  loginUrl: 'http://10.10.0.59/lhims_182/login.php',
  credentials: {
    username: 'sno-411',
    password: 'monamourd11',
  },
};

async function testPDFDownload() {
  console.log('='.repeat(70));
  console.log('TEST PDF DOWNLOAD V2 - Using Browser Download Event');
  console.log('='.repeat(70));
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    acceptDownloads: true
  });
  const page = await context.newPage();

  try {
    // Login
    console.log('[1/6] Logging in...');
    await page.goto(CONFIG.loginUrl);
    await page.fill('input[name="username"]', CONFIG.credentials.username);
    await page.fill('input[name="password"]', CONFIG.credentials.password);
    await Promise.all([
      page.waitForNavigation(),
      page.click('input[name="submit"]'),
    ]);
    console.log('      ✓ Logged in');

    // Test with a known patient: VR-A01-AAA0002
    const testPatientNo = 'VR-A01-AAA0002';
    console.log(`\n[2/6] Searching for test patient: ${testPatientNo}...`);

    const patientId = await page.evaluate(async (patientNo) => {
      const formData = new URLSearchParams();
      formData.append('fnam', '');
      formData.append('pregno', patientNo);
      formData.append('InputPatientClinicSrting', '');
      formData.append('InputPatientClinic', '');
      formData.append('area', '');
      formData.append('iPatientID', '');
      formData.append('iPatientMobileNo', '');
      formData.append('iPatientUniqueNo', '');
      formData.append('idPatientTag', '');

      const res = await fetch('http://10.10.0.59/lhims_182/searchPatientResult.php', {
        method: 'POST',
        body: formData
      });

      const response = await res.text();
      const match = response.match(/patient_id[=\s]*['":]?\s*(\d+)/i);
      return match ? match[1] : null;
    }, testPatientNo);

    if (!patientId) {
      throw new Error('Patient not found');
    }

    console.log(`      ✓ Found patient ID: ${patientId}`);

    // Open patient record
    console.log('\n[3/6] Opening patient record...');
    const recordUrl = `http://10.10.0.59/lhims_182/patientRecord.php?patient_id=${patientId}`;
    await page.goto(recordUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log('      ✓ Patient record opened');

    // Get consultations
    console.log('\n[4/6] Getting consultations...');
    const consultations = await page.evaluate(async (patientId) => {
      const formData = new URLSearchParams();
      formData.append('_isAjax', 'true');
      formData.append('iPatientID', patientId);
      formData.append('draw', '1');
      formData.append('start', '0');
      formData.append('length', '1000');

      const res = await fetch('http://10.10.0.59/lhims_182/getDynamicPatientEncounterDetails.php', {
        method: 'POST',
        body: formData
      });

      const text = await res.text();
      const result = JSON.parse(text);
      return result.data || [];
    }, patientId);

    console.log(`      ✓ Found ${consultations.length} consultations`);

    if (consultations.length === 0) {
      console.log('      ✗ No consultations to export');
      await browser.close();
      return;
    }

    // Extract IDs
    const consultationIDs = [];
    const serviceIDs = [];

    for (const consultation of consultations) {
      if (Array.isArray(consultation)) {
        const html = consultation[4] || '';
        const scheduleMatch = html.match(/data-schedule-id='(\d+)'/);
        const consultId = scheduleMatch ? scheduleMatch[1] : null;
        const serviceId = consultation[9] || '0';
        if (consultId) {
          consultationIDs.push(consultId);
          serviceIDs.push(serviceId);
        }
      }
    }

    console.log(`      ✓ Extracted ${consultationIDs.length} consultation/schedule IDs`);

    // Request PDF export token
    console.log('\n[5/6] Requesting PDF export token...');
    const token = await page.evaluate(async (data) => {
      const { patientId, consultationIDs, serviceIDs } = data;

      const formData = new URLSearchParams();
      formData.append('_isAjax', 'true');

      consultationIDs.forEach(id => {
        formData.append('aConsultationID[]', id);
      });

      serviceIDs.forEach(id => {
        formData.append('aServiceID[]', id);
      });

      formData.append('iStaffClinicID', '2');
      formData.append('iLoggedInStaffID', '411');
      formData.append('iPatientID', patientId);
      formData.append('bPrintAllPrintableEntities', 'true');

      const res = await fetch('http://10.10.0.59/lhims_182/exportServiceReportsInSinglePDF.php', {
        method: 'POST',
        body: formData
      });

      return await res.text();
    }, { patientId, consultationIDs, serviceIDs });

    console.log(`      ✓ Token received (${token.length} chars)`);
    console.log(`      Token preview: ${token.substring(0, 100)}...`);

    if (!token || token.trim().length === 0) {
      console.log('      ✗ Empty token received');
      await browser.close();
      return;
    }

    // Download PDF using browser download event (like a real browser!)
    console.log('\n[6/6] Downloading PDF using browser download...');
    const pdfUrl = `http://10.10.0.59/lhims_182/viewFile.php?token=${encodeURIComponent(token.trim())}`;

    // Method 1: Try to trigger download by creating a link and clicking it
    console.log('      Method 1: Triggering download via link click...');

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    await page.evaluate((url) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = 'test-opd.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, pdfUrl);

    try {
      const download = await downloadPromise;
      console.log(`      ✓ Download started: ${download.suggestedFilename()}`);

      const testPdfPath = path.join(__dirname, 'test-pdf-browser-download.pdf');
      await download.saveAs(testPdfPath);
      console.log(`      ✓ Saved to: ${testPdfPath}`);

      const stats = fs.statSync(testPdfPath);
      console.log(`      ✓ File size: ${stats.size} bytes`);

      // Check if it's a valid PDF
      const buffer = fs.readFileSync(testPdfPath);
      const first4 = buffer.slice(0, 4).toString();
      console.log(`      First 4 bytes: "${first4}" (should be "%PDF")`);

      if (first4 === '%PDF') {
        console.log('      ✓ ✓ ✓ VALID PDF FILE! ✓ ✓ ✓');
      } else {
        console.log('      ✗ Not a valid PDF file');
        console.log('      First 200 bytes:');
        console.log(buffer.slice(0, 200).toString());
      }

    } catch (downloadError) {
      console.log('      ✗ Download event not triggered, trying Method 2...');

      // Method 2: Direct fetch and save
      console.log('      Method 2: Direct fetch with response headers...');

      const response = await page.request.fetch(pdfUrl);
      console.log(`      Response status: ${response.status()}`);
      console.log(`      Content-Type: ${response.headers()['content-type']}`);

      const pdfBuffer = await response.body();
      console.log(`      Buffer size: ${pdfBuffer.length} bytes`);

      const testPdfPath2 = path.join(__dirname, 'test-pdf-fetch-method.pdf');
      fs.writeFileSync(testPdfPath2, pdfBuffer);
      console.log(`      ✓ Saved to: ${testPdfPath2}`);

      const first4 = pdfBuffer.slice(0, 4).toString();
      console.log(`      First 4 bytes: "${first4}" (should be "%PDF")`);

      if (first4 === '%PDF') {
        console.log('      ✓ ✓ ✓ VALID PDF FILE! ✓ ✓ ✓');
      } else {
        console.log('      ✗ Not a valid PDF');
        console.log('      First 200 bytes:');
        console.log(pdfBuffer.slice(0, 200).toString());
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('TEST COMPLETE');
    console.log('Try opening the PDF file(s) to verify they work');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testPDFDownload();
