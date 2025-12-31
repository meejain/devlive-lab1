/**
 * Test DA Sheet API - Using Native FormData
 * This matches the pattern: fetch(url, { method: 'POST', body: uploadFormData })
 */

const fs = require('fs');
const path = require('path');

// For testing purposes - disable SSL certificate validation
// (In production, you'd want to properly configure certificates)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function getToken() {
  const configPath = path.join(__dirname, 'da-config.txt');
  const content = fs.readFileSync(configPath, 'utf-8');
  const match = content.match(/DA_IMS_TOKEN=["']?([^"'\n]+)["']?/);
  return match ? match[1] : null;
}

// Helper function to initialize sheet with sample data
async function initializeSheetWithSampleData() {
  console.log('\n🔧 INITIALIZING SHEET WITH SAMPLE DATA\n');
  console.log('=' .repeat(60));
  
  const daToken = getToken();
  if (!daToken) {
    console.error('❌ No token');
    return false;
  }

  const sampleData = [
    {
      Timestamp: '2025-12-30T10:00:00.000Z',
      Prompt: 'Sample image 1 - mountain landscape',
      Status: 'Completed',
      DocumentPath: '/content/sample1',
      TargetFolder: '/images',
      SharePointFile: 'mountain.png',
      SharePointPath: '/images/mountain.png',
      ImageURL: 'https://example.com/mountain.png',
      EDSURL: 'https://main--devlive-lab1--meejain.aem.live/sample1',
      AEMPreviewURL: 'https://main--devlive-lab1--meejain.aem.page/sample1',
      Source: 'Initial-Setup',
      UserHost: 'localhost',
      GeneratedText: 'Beautiful mountain landscape at sunset'
    },
    {
      Timestamp: '2025-12-30T11:00:00.000Z',
      Prompt: 'Sample image 2 - ocean waves',
      Status: 'Completed',
      DocumentPath: '/content/sample2',
      TargetFolder: '/images',
      SharePointFile: 'ocean.png',
      SharePointPath: '/images/ocean.png',
      ImageURL: 'https://example.com/ocean.png',
      EDSURL: 'https://main--devlive-lab1--meejain.aem.live/sample2',
      AEMPreviewURL: 'https://main--devlive-lab1--meejain.aem.page/sample2',
      Source: 'Initial-Setup',
      UserHost: 'localhost',
      GeneratedText: 'Crashing ocean waves on rocky shore'
    }
  ];

  console.log('📝 Creating sheet with', sampleData.length, 'sample rows...');

  // Add empty header row
  const headerRow = {};
  Object.keys(sampleData[0]).forEach(key => { headerRow[key] = ''; });
  const dataWithHeader = [headerRow, ...sampleData];

  // Create FormData
  const jsonContent = JSON.stringify({ data: dataWithHeader });
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const formData = new FormData();
  formData.append('data', blob, 'ai-image-generation-log.json');
  
  const uploadUrl = 'https://admin.da.live/source/meejain/devlive-lab1/ai-image-generation-log.json';

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${daToken}`,
      },
      body: formData,
    });

    if (response.ok) {
      console.log('✅ Sheet initialized with sample data!');
      console.log('=' .repeat(60));
      return true;
    } else {
      console.log('❌ Failed:', response.status, response.statusText);
      return false;
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
    return false;
  }
}

async function testAppendRow() {
  console.log('\n🧪 TEST: Append Row to Existing DA Sheet\n');
  console.log('=' .repeat(60));
  
  const daToken = getToken();
  if (!daToken) {
    console.error('❌ No token');
    return;
  }
  console.log('✅ Token loaded');

  // Step 1: Fetch current data from DA source (JSON file)
  console.log('\n📥 Step 1: Fetching current sheet data...');
  
  // Fetch from the .json file
  const sourceUrl = `https://admin.da.live/source/meejain/devlive-lab1/ai-image-generation-log.json`;
  console.log('   Fetching from DA source (.json file)...');
  
  let currentData = [];
  try {
    const resp = await fetch(sourceUrl, {
      headers: {
        'Authorization': `Bearer ${daToken}`,
      }
    });
    if (resp.ok) {
      // Parse as single JSON (not double-encoded)
      const json = await resp.json();
      currentData = json.data || [];
      console.log('   ✅ Current rows:', currentData.length);
      if (currentData.length > 0) {
        console.log('   Columns:', Object.keys(currentData[0] || {}).join(', '));
      }
    } else {
      console.log('   ⚠️  Failed to fetch:', resp.status, resp.statusText);
      console.log('   (Sheet might not exist yet, will create new)');
    }
  } catch (e) {
    console.log('   ⚠️  Error fetching:', e.message);
    console.log('   (Sheet might not exist yet, will create new)');
  }

  // Step 2: Analyze existing data
  console.log('\n🧹 Step 2: Analyzing existing data...');
  
  // Check if first row is header row (all empty values = header row with just column names)
  let hasHeaderRow = currentData.length > 0 && 
    !Object.values(currentData[0]).some(val => val && val.toString().trim() !== '');
  
  console.log('   Has header row:', hasHeaderRow ? 'YES (will preserve)' : 'NO');
  console.log('   Current data rows:', currentData.length);
  
  // Keep the first row if it's a header, filter out any other empty rows
  let cleanedData;
  if (hasHeaderRow && currentData.length > 0) {
    // Keep header row (first row) + any non-empty data rows after it
    const headerRow = currentData[0];
    const dataRows = currentData.slice(1).filter(row => {
      return Object.values(row).some(val => val && val.toString().trim() !== '');
    });
    cleanedData = [headerRow, ...dataRows];
    console.log('   ✅ Preserved header + ' + dataRows.length + ' data row(s)');
  } else {
    // No header row, just filter empty rows
    cleanedData = currentData.filter(row => {
      return Object.values(row).some(val => val && val.toString().trim() !== '');
    });
    console.log('   Cleaned rows:', cleanedData.length);
  }
  
  // Show existing data summary
  if (cleanedData.length > 1) {
    console.log('\n   📊 Existing Data Summary:');
    cleanedData.slice(1, 4).forEach((row, idx) => {
      console.log(`      Row ${idx + 1}: ${row.Timestamp || '(empty)'} | ${row.Prompt?.substring(0, 30) || '(empty)'}...`);
    });
    if (cleanedData.length > 4) {
      console.log(`      ... and ${cleanedData.length - 4} more rows`);
    }
  } else if (cleanedData.length === 1) {
    console.log('   📊 Sheet has headers only, no data rows yet');
  }

  // Step 3: Create test row(s)
  console.log('\n📝 Step 3: Creating test row(s)...');
  
  // Create one or more test rows
  const testRows = [
    {
      Timestamp: new Date().toISOString(),
      Prompt: 'Test Native FormData - Append Row',
      Status: 'Testing',
      DocumentPath: '/test',
      TargetFolder: '/test',
      SharePointFile: 'test.png',
      SharePointPath: '',
      ImageURL: 'https://example.com/test.png',
      EDSURL: 'https://main--devlive-lab1--meejain.aem.live/test',
      AEMPreviewURL: 'https://main--devlive-lab1--meejain.aem.page/test',
      Source: 'Native-FormData',
      UserHost: 'localhost',
      GeneratedText: 'Test using native FormData'
    }
    // Uncomment to test adding multiple rows at once:
    // ,{
    //   Timestamp: new Date().toISOString(),
    //   Prompt: 'Second test row',
    //   Status: 'Testing',
    //   DocumentPath: '/test2',
    //   TargetFolder: '/test2',
    //   SharePointFile: 'test2.png',
    //   SharePointPath: '',
    //   ImageURL: 'https://example.com/test2.png',
    //   EDSURL: 'https://main--devlive-lab1--meejain.aem.live/test2',
    //   AEMPreviewURL: 'https://main--devlive-lab1--meejain.aem.page/test2',
    //   Source: 'Native-FormData',
    //   UserHost: 'localhost',
    //   GeneratedText: 'Second test row'
    // }
  ];

  console.log('   Adding', testRows.length, 'new row(s)');

  // Merge with existing data - append new rows after existing data
  // Note: If sheet has a header row, it will be preserved at position 0
  const updatedData = [...cleanedData, ...testRows];
  console.log('   Total rows after merge:', updatedData.length);
  
  if (hasHeaderRow) {
    console.log('   Structure: 1 header row + ' + (updatedData.length - 1) + ' data row(s)');
  }

  // Step 4: Create FormData with JSON file (matching browser file upload)
  console.log('\n📤 Step 4: Creating FormData with JSON file...');
  
  // Create the data structure as plain JSON (not double-encoded)
  const dataObject = { data: updatedData };
  const jsonContent = JSON.stringify(dataObject);
  console.log('   JSON content preview:', jsonContent.substring(0, 150) + '...');
  console.log('   Total rows:', updatedData.length);
  
  // Create a Blob and FormData (browser-style file upload)
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const formData = new FormData();
  formData.append('data', blob, 'ai-image-generation-log.json');  // filename WITH .json extension

  // Step 5: Upload using POST with FormData (matching reference pattern)
  console.log('\n📤 Step 5: Uploading via POST with FormData...');
  // IMPORTANT: Use the correct file path with .json extension
  const uploadUrl = 'https://admin.da.live/source/meejain/devlive-lab1/ai-image-generation-log.json';
  console.log('   URL:', uploadUrl);
  console.log('   Method: POST with multipart/form-data (matching reference)');

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${daToken}`,
        // Don't set Content-Type - let fetch set it with boundary
      },
      body: formData,
    });

    console.log('\n   Status:', response.status, response.statusText);
    const result = await response.text();
    console.log('   Response:', result);

    if (response.ok) {
      console.log('\n✅ Upload succeeded!');
      
      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 SUMMARY:');
      const beforeDataRows = hasHeaderRow ? currentData.length - 1 : currentData.length;
      const afterDataRows = hasHeaderRow ? updatedData.length - 1 : updatedData.length;
      console.log('   Before: ' + beforeDataRows + ' data row(s)' + (hasHeaderRow ? ' + 1 header row' : ''));
      console.log('   Added: ' + testRows.length + ' new row(s)');
      console.log('   After: ' + afterDataRows + ' data row(s)' + (hasHeaderRow ? ' + 1 header row' : ''));
      console.log('   Total rows in sheet: ' + updatedData.length);
      console.log('='.repeat(60));
    } else {
      console.log('\n❌ Upload failed:', response.status, response.statusText);
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error('   Full error:', e);
  }

  console.log('\n🔍 Check sheet at: https://da.live/sheet#/meejain/devlive-lab1/ai-image-generation-log');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'init') {
    // Initialize sheet with sample data
    await initializeSheetWithSampleData();
  } else if (command === 'append') {
    // Append new row to existing sheet
    await testAppendRow();
  } else {
    console.log('\n📖 Usage:');
    console.log('  node test-da-sheet.js init    - Initialize sheet with sample data');
    console.log('  node test-da-sheet.js append  - Append new row to existing sheet');
    console.log('\n💡 Running APPEND test by default...\n');
    await testAppendRow();
  }
}

main();
