/**
 * Debug script to see what's happening with IPD PDF generation
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  loginUrl: 'http://10.10.0.59/lhims_182/login.php',
  credentials: {
    username: 'sno-411',
    password: 'monamourd11',
  },
};

async function debugIPDPDF() {
  console.log('='.repeat(70));
  console.log('DEBUG IPD PDF GENERATION');
  console.log('='.repeat(70));
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    // Login
    console.log('[1/5] Logging in...');
    await page.goto(CONFIG.loginUrl);
    await page.fill('input[name="username"]', CONFIG.credentials.username);
    await page.fill('input[name="password"]', CONFIG.credentials.password);
    await Promise.all([
      page.waitForNavigation(),
      page.click('input[name="submit"]'),
    ]);
    console.log('      ✓ Logged in');

    // Test patient with known IPD admissions: VR-A01-AAA2142
    const testPatientNo = 'VR-A01-AAA2142';
    const patientId = '2239'; // We know this from previous runs

    console.log(`\n[2/5] Testing with patient: ${testPatientNo} (ID: ${patientId})...`);

    // Get admissions
    console.log('\n[3/5] Getting IPD admissions...');
    const admissions = await page.evaluate(async (patientId) => {
      const url = `http://10.10.0.59/lhims_182/ajaxIPDManager.php?sFlag=patientAllAdmitDetails&_isAjax=true&iPatientID=${patientId}`;
      const res = await fetch(url);
      const text = await res.text();
      return JSON.parse(text);
    }, patientId);

    console.log(`      ✓ Found ${admissions.length} admission(s)`);

    if (admissions.length === 0) {
      console.log('      No admissions to test');
      await browser.close();
      return;
    }

    // Show admission details
    console.log('\n      Admission details:');
    admissions.forEach((adm, i) => {
      console.log(`      [${i + 1}] ID: ${adm.admit_id}, Date: ${adm.admission_date}, Discharge: ${adm.discharge_date || 'N/A'}`);
    });

    // Test first admission
    const admission = admissions[0];
    const admitId = admission.admit_id;

    console.log(`\n[4/5] Testing PDF export for admission ${admitId}...`);

    // Try to get PDF token
    const result = await page.evaluate(async (data) => {
      const { patientId, admitId } = data;

      const formData = new URLSearchParams();
      formData.append('_isAjax', 'true');
      formData.append('iAdmitID', admitId);
      formData.append('iPatientID', patientId);
      formData.append('iStaffClinicID', '2');
      formData.append('iLoggedInStaffID', '411');
      formData.append('bPrintAllPrintableEntities', 'true');

      console.log('Sending request with params:', {
        iAdmitID: admitId,
        iPatientID: patientId,
        iStaffClinicID: '2',
        iLoggedInStaffID: '411',
        bPrintAllPrintableEntities: 'true'
      });

      const res = await fetch('http://10.10.0.59/lhims_182/exportServiceReportsInSinglePDF.php', {
        method: 'POST',
        body: formData
      });

      const token = await res.text();

      return {
        token: token,
        tokenLength: token.length,
        first100: token.substring(0, 100),
        last100: token.substring(Math.max(0, token.length - 100))
      };
    }, { patientId, admitId });

    console.log(`      Token length: ${result.tokenLength} characters`);
    console.log(`      First 100 chars: ${result.first100}`);
    console.log(`      Last 100 chars: ${result.last100}`);

    if (!result.token || result.token.trim().length === 0) {
      console.log('      ✗ Empty token received');
      await browser.close();
      return;
    }

    // Download PDF
    console.log('\n[5/5] Downloading PDF...');
    const pdfUrl = `http://10.10.0.59/lhims_182/viewFile.php?token=${encodeURIComponent(result.token.trim())}`;

    const response = await page.request.fetch(pdfUrl);

    console.log(`      Response status: ${response.status()}`);
    console.log(`      Content-Type: ${response.headers()['content-type']}`);

    const pdfBuffer = await response.body();
    console.log(`      Buffer size: ${pdfBuffer.length} bytes`);

    // Check PDF validity
    const first4 = pdfBuffer.slice(0, 4).toString();
    console.log(`      First 4 bytes: "${first4}"`);

    if (first4 === '%PDF') {
      console.log('      ✓ Valid PDF header');

      // Check if it's empty
      const pdfContent = pdfBuffer.toString();
      if (pdfContent.includes('/Count 0')) {
        console.log('      ⚠ WARNING: PDF has 0 pages (empty)');
        console.log('      This means LHIMS generated an empty PDF');
        console.log('      Possible reasons:');
        console.log('        - Admission has no records/data');
        console.log('        - Wrong parameters sent to API');
        console.log('        - IPD records need different export method');
      } else {
        const pageMatch = pdfContent.match(/\/Count (\d+)/);
        if (pageMatch) {
          console.log(`      ✓ PDF has ${pageMatch[1]} page(s)`);
        }
      }
    } else {
      console.log('      ✗ Not a valid PDF');
    }

    // Save for inspection
    fs.writeFileSync('debug-ipd.pdf', pdfBuffer);
    console.log('      ✓ Saved to debug-ipd.pdf');

    console.log('\n' + '='.repeat(70));
    console.log('DEBUG COMPLETE');
    console.log('='.repeat(70));

    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

debugIPDPDF();
