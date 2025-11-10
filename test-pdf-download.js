/**
 * Test PDF download to debug corruption issue
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
  console.log('TEST PDF DOWNLOAD - DEBUG CORRUPTION ISSUE');
  console.log('='.repeat(70));
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

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
    console.log(`      First 3 IDs: ${consultationIDs.slice(0, 3).join(', ')}`);

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

      const responseText = await res.text();

      // Return both the token and some debug info
      return {
        token: responseText,
        tokenLength: responseText.length,
        first100: responseText.substring(0, 100),
        last100: responseText.substring(Math.max(0, responseText.length - 100))
      };
    }, { patientId, consultationIDs, serviceIDs });

    console.log(`      Token received: ${token.tokenLength} characters`);
    console.log(`      First 100 chars: ${token.first100}`);
    console.log(`      Last 100 chars: ${token.last100}`);

    if (!token.token || token.token.trim().length === 0) {
      console.log('      ✗ Empty token received');
      await browser.close();
      return;
    }

    // Download PDF
    console.log('\n[6/6] Downloading PDF...');
    const pdfUrl = `http://10.10.0.59/lhims_182/viewFile.php?token=${encodeURIComponent(token.token.trim())}`;
    console.log(`      URL: ${pdfUrl.substring(0, 100)}...`);

    const response = await page.goto(pdfUrl, { waitUntil: 'networkidle', timeout: 30000 });

    console.log(`      Response status: ${response.status()}`);
    console.log(`      Response OK: ${response.ok()}`);

    const headers = response.headers();
    console.log(`      Content-Type: ${headers['content-type'] || 'unknown'}`);
    console.log(`      Content-Length: ${headers['content-length'] || 'unknown'}`);

    const pdfBuffer = await response.body();
    console.log(`      Buffer size: ${pdfBuffer.length} bytes`);

    // Check if it's actually a PDF
    const first4 = pdfBuffer.slice(0, 4).toString();
    console.log(`      First 4 bytes: ${first4} (should be '%PDF' for valid PDF)`);

    // Check if it's HTML error page
    const first200 = pdfBuffer.slice(0, 200).toString();
    if (first200.includes('<html') || first200.includes('<!DOCTYPE')) {
      console.log('      ✗ WARNING: Response is HTML, not PDF!');
      console.log('      First 200 bytes:');
      console.log(first200);
    } else {
      console.log('      ✓ Appears to be binary data (good sign)');
    }

    // Save to file
    const testPdfPath = path.join(__dirname, 'test-pdf-debug.pdf');
    fs.writeFileSync(testPdfPath, pdfBuffer);
    console.log(`      ✓ Saved to: ${testPdfPath}`);

    // Also save the first 1000 bytes as text for inspection
    const debugPath = path.join(__dirname, 'test-pdf-debug-first1000.txt');
    fs.writeFileSync(debugPath, pdfBuffer.slice(0, 1000));
    console.log(`      ✓ First 1000 bytes saved to: ${debugPath}`);

    console.log('\n' + '='.repeat(70));
    console.log('TEST COMPLETE');
    console.log('Please check the files and see if PDF opens correctly');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testPDFDownload();
