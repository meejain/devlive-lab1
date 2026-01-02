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

  // Create complete sheet object with metadata (no empty header row needed)
  const sheetObject = {
    total: sampleData.length,
    limit: sampleData.length,
    offset: 0,
    data: sampleData,  // Just the data rows, column names come from object keys
    ':type': 'sheet',
    ':sheetname': 'data',
    ':colWidths': Object.keys(sampleData[0]).map(() => 50)  // Default width of 50 for each column
  };
  
  const jsonContent = JSON.stringify(sheetObject);
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

  // Step 1: Fetch current data from DA source (with metadata)
  console.log('\n📥 Step 1: Fetching current sheet data...');
  
  // Fetch from the .json file
  const sourceUrl = `https://admin.da.live/source/meejain/devlive-lab1/ai-image-generation-log.json`;
  console.log('   Fetching from DA source (.json file)...');
  
  let currentData = [];
  let sheetMetadata = {};
  try {
    const resp = await fetch(sourceUrl, {
      headers: {
        'Authorization': `Bearer ${daToken}`,
      }
    });
    if (resp.ok) {
      // Parse the full sheet object with metadata
      const sheet = await resp.json();
      currentData = sheet.data || [];
      
      // Preserve metadata fields (those starting with :)
      sheetMetadata = {
        ':type': sheet[':type'] || 'sheet',
        ':sheetname': sheet[':sheetname'] || 'data',
        ':colWidths': sheet[':colWidths'] || []
      };
      
      console.log('   ✅ Current rows:', currentData.length);
      if (currentData.length > 0) {
        console.log('   Columns:', Object.keys(currentData[0] || {}).join(', '));
      }
      console.log('   Metadata preserved:', Object.keys(sheetMetadata).join(', '));
    } else {
      console.log('   ⚠️  Failed to fetch:', resp.status, resp.statusText);
      console.log('   (Sheet might not exist yet, will create new)');
    }
  } catch (e) {
    console.log('   ⚠️  Error fetching:', e.message);
    console.log('   (Sheet might not exist yet, will create new)');
  }

  // Step 2: Clean existing data (remove empty rows including header rows)
  console.log('\n🧹 Step 2: Analyzing existing data...');
  
  // DA sheets don't need an empty "header row" - column names come from object keys
  // Filter out ALL empty rows (including any with all empty values)
  const cleanedData = currentData.filter(row => {
    return Object.values(row).some(val => val && val.toString().trim() !== '');
  });
  
  const removedCount = currentData.length - cleanedData.length;
  console.log('   Current rows:', currentData.length);
  console.log('   Cleaned rows:', cleanedData.length);
  if (removedCount > 0) {
    console.log('   Removed ' + removedCount + ' empty row(s)');
  }
  
  // Get column structure from first row or create default
  let columnKeys = [];
  if (cleanedData.length > 0) {
    columnKeys = Object.keys(cleanedData[0]);
  } else {
    // Default columns if sheet is empty
    columnKeys = ['Timestamp', 'Prompt', 'Status', 'DocumentPath', 'TargetFolder', 
                  'SharePointFile', 'SharePointPath', 'ImageURL', 'EDSURL', 
                  'AEMPreviewURL', 'Source', 'UserHost', 'GeneratedText'];
  }
  
  // Update colWidths if needed
  if (!sheetMetadata[':colWidths'] || sheetMetadata[':colWidths'].length !== columnKeys.length) {
    sheetMetadata[':colWidths'] = Array(columnKeys.length).fill(50);
    console.log('   Set colWidths for', columnKeys.length, 'columns');
  }
  
  // Show existing data summary
  if (cleanedData.length > 0) {
    console.log('\n   📊 Existing Data Summary:');
    cleanedData.slice(0, 3).forEach((row, idx) => {
      console.log(`      Row ${idx + 1}: ${row.Timestamp || '(empty)'} | ${row.Prompt?.substring(0, 30) || '(empty)'}...`);
    });
    if (cleanedData.length > 3) {
      console.log(`      ... and ${cleanedData.length - 3} more rows`);
    }
  } else {
    console.log('   📊 Sheet is empty, no data rows yet');
  }

  // Step 3: Create test row(s) - Testing with multiple rows
  console.log('\n📝 Step 3: Creating test row(s)...');
  
  // Create multiple test rows to verify batch append
  const baseTime = new Date();
  const testRows = [
    {
      Timestamp: new Date(baseTime.getTime()).toISOString(),
      Prompt: 'Test Row 1 - Mountain landscape',
      Status: 'Testing',
      DocumentPath: '/test1',
      TargetFolder: '/images',
      SharePointFile: 'test1.png',
      SharePointPath: '/images/test1.png',
      ImageURL: 'https://example.com/test1.png',
      EDSURL: 'https://main--devlive-lab1--meejain.aem.live/test1',
      AEMPreviewURL: 'https://main--devlive-lab1--meejain.aem.page/test1',
      Source: 'Batch-Test',
      UserHost: 'localhost',
      GeneratedText: 'First test row in batch'
    },
    {
      Timestamp: new Date(baseTime.getTime() + 1000).toISOString(),
      Prompt: 'Test Row 2 - Ocean waves',
      Status: 'Testing',
      DocumentPath: '/test2',
      TargetFolder: '/images',
      SharePointFile: 'test2.png',
      SharePointPath: '/images/test2.png',
      ImageURL: 'https://example.com/test2.png',
      EDSURL: 'https://main--devlive-lab1--meejain.aem.live/test2',
      AEMPreviewURL: 'https://main--devlive-lab1--meejain.aem.page/test2',
      Source: 'Batch-Test',
      UserHost: 'localhost',
      GeneratedText: 'Second test row in batch'
    },
    {
      Timestamp: new Date(baseTime.getTime() + 2000).toISOString(),
      Prompt: 'Test Row 3 - City skyline',
      Status: 'Testing',
      DocumentPath: '/test3',
      TargetFolder: '/images',
      SharePointFile: 'test3.png',
      SharePointPath: '/images/test3.png',
      ImageURL: 'https://example.com/test3.png',
      EDSURL: 'https://main--devlive-lab1--meejain.aem.live/test3',
      AEMPreviewURL: 'https://main--devlive-lab1--meejain.aem.page/test3',
      Source: 'Batch-Test',
      UserHost: 'localhost',
      GeneratedText: 'Third test row in batch'
    }
  ];

  console.log('   Adding', testRows.length, 'new row(s)');

  // Merge with existing data - append new rows after existing data
  const updatedData = [...cleanedData, ...testRows];
  console.log('   Total rows after merge:', updatedData.length, 'data row(s)');

  // Step 4: Create FormData with complete sheet object (data + metadata)
  console.log('\n📤 Step 4: Creating FormData with sheet object...');
  
  // Create complete sheet object with metadata (matching DA sheet format)
  const sheetObject = {
    total: updatedData.length,
    limit: updatedData.length,
    offset: 0,
    data: updatedData,
    ...sheetMetadata  // Include preserved metadata (:type, :sheetname, :colWidths)
  };
  
  const jsonContent = JSON.stringify(sheetObject);
  console.log('   Sheet object preview:', jsonContent.substring(0, 150) + '...');
  console.log('   Total rows:', updatedData.length);
  console.log('   Includes metadata:', Object.keys(sheetMetadata).join(', '));
  
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
      console.log('   Before: ' + cleanedData.length + ' data row(s)');
      console.log('   Added: ' + testRows.length + ' new row(s)');
      console.log('   After: ' + updatedData.length + ' data row(s)');
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
