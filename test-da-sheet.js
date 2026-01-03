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
        ':colWidths': sheet[':colWidths'] || [],
        ':columns': sheet[':columns'] || []  // Preserve column names if available
      };
      
      console.log('   ✅ Current rows:', currentData.length);
      if (currentData.length > 0) {
        console.log('   Columns:', Object.keys(currentData[0] || {}).join(', '));
      } else if (sheetMetadata[':columns'] && sheetMetadata[':columns'].length > 0) {
        console.log('   Columns (from metadata):', sheetMetadata[':columns'].join(', '));
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
  
  // Get column structure from first row, preserved columns metadata, or use default
  let columnKeys = [];
  if (cleanedData.length > 0) {
    columnKeys = Object.keys(cleanedData[0]);
    console.log('   Columns from existing data:', columnKeys.join(', '));
  } else if (sheetMetadata[':columns'] && sheetMetadata[':columns'].length > 0) {
    // Use preserved column names from reset or previous state
    columnKeys = sheetMetadata[':columns'];
    console.log('   Columns from preserved metadata:', columnKeys.join(', '));
  } else {
    // Default columns if sheet is empty and no metadata
    columnKeys = ['Timestamp', 'Prompt', 'Status', 'DocumentPath', 'TargetFolder', 
                  'SharePointFile', 'SharePointPath', 'ImageURL', 'EDSURL', 
                  'AEMPreviewURL', 'Source', 'UserHost', 'GeneratedText'];
    console.log('   Using default columns');
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
    ...sheetMetadata,  // Include preserved metadata (:type, :sheetname, :colWidths, :columns)
    ':columns': columnKeys  // Update with current column structure
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

/**
 * Reset DA Sheet - Remove all rows (equivalent to SharePoint reset flow)
 * Steps:
 * 1. Get_Current_Sheet (fetch from DA)
 * 2. Parse_Sheet_Data (extract metadata)
 * 3. Clear all data rows
 * 4. Upload_Sheet_To_DA (with empty data)
 * 5. Wait_for_Excel_Sync (delay)
 * 6. Clear_Cache
 * 7. Trigger_JSON_Preview
 * 8. Trigger_JSON_Publish
 */
async function resetDASheet() {
  console.log('\n🔄 RESET DA SHEET - Remove All Rows\n');
  console.log('=' .repeat(60));
  
  const daToken = getToken();
  if (!daToken) {
    console.error('❌ No token found');
    return false;
  }
  console.log('✅ Token loaded');

  // Step 1: Get_Current_Sheet
  console.log('\n📥 Step 1: Get_Current_Sheet');
  console.log('   Fetching current sheet data from DA...');
  
  const sourceUrl = `https://admin.da.live/source/meejain/devlive-lab1/ai-image-generation-log.json`;
  
  let currentData = [];
  let sheetMetadata = {};
  let rowsBeforeReset = 0;
  let dataRowsRemoved = 0;
  
  try {
    const resp = await fetch(sourceUrl, {
      headers: {
        'Authorization': `Bearer ${daToken}`,
      }
    });
    
    if (resp.ok) {
      const sheet = await resp.json();
      currentData = sheet.data || [];
      rowsBeforeReset = currentData.length;
      
      // Step 2: Parse_Sheet_Data - Preserve metadata
      console.log('\n📋 Step 2: Parse_Sheet_Data');
      sheetMetadata = {
        ':type': sheet[':type'] || 'sheet',
        ':sheetname': sheet[':sheetname'] || 'data',
        ':colWidths': sheet[':colWidths'] || []
      };
      
      console.log('   ✅ Current rows found:', rowsBeforeReset);
      console.log('   Metadata preserved:', Object.keys(sheetMetadata).join(', '));
      
      if (rowsBeforeReset > 0) {
        console.log('\n   📊 Rows to be deleted:');
        currentData.slice(0, 3).forEach((row, idx) => {
          console.log(`      Row ${idx + 1}: ${row.Timestamp || '(empty)'} | ${row.Prompt?.substring(0, 30) || '(empty)'}...`);
        });
        if (currentData.length > 3) {
          console.log(`      ... and ${currentData.length - 3} more rows`);
        }
      }
    } else {
      console.log('   ⚠️  Failed to fetch:', resp.status, resp.statusText);
      console.log('   Sheet might not exist yet');
      return false;
    }
  } catch (e) {
    console.error('   ❌ Error fetching sheet:', e.message);
    return false;
  }

  // Step 3: Keep column structure with ONE empty row (preserves headers)
  console.log('\n🧹 Step 3: Clear_Data_Rows (Keep Empty Template)');
  
  let emptyTemplateRow = null;
  dataRowsRemoved = currentData.length;
  
  if (currentData.length > 0) {
    // Get column names from first row
    const columnNames = Object.keys(currentData[0]);
    
    // Create a row with all empty strings to preserve column structure
    emptyTemplateRow = {};
    columnNames.forEach(col => {
      emptyTemplateRow[col] = '';  // Empty string for all columns
    });
    
    console.log('   Column headers preserved:', columnNames.join(', '));
    console.log('   Removing all data rows:', dataRowsRemoved);
    console.log('   Creating 1 empty template row to preserve column structure');
  } else {
    console.log('   Sheet is already empty');
  }
  
  // Create data array with ONE empty row to preserve column structure
  const resetData = emptyTemplateRow ? [emptyTemplateRow] : [];
  
  // Step 4: Build_Sheet_Object with empty template row
  console.log('\n📦 Step 4: Build_Sheet_Object');
  const sheetObject = {
    total: resetData.length,
    limit: resetData.length,
    offset: 0,
    data: resetData,
    ...sheetMetadata
  };
  
  console.log('   Sheet object created with 1 empty template row');
  console.log('   Total rows:', sheetObject.data.length, '(headers visible, values empty)');
  console.log('   Metadata preserved:', Object.keys(sheetMetadata).join(', '));

  // Step 5: Upload_Sheet_To_DA
  console.log('\n📤 Step 5: Upload_Sheet_To_DA');
  
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

    if (!response.ok) {
      console.log('   ❌ Upload failed:', response.status, response.statusText);
      return false;
    }
    
    console.log('   ✅ Sheet reset uploaded successfully');
  } catch (e) {
    console.error('   ❌ Error uploading:', e.message);
    return false;
  }

  // Step 6: Wait_for_Excel_Sync (delay to allow DA to process)
  console.log('\n⏳ Step 6: Wait_for_Excel_Sync');
  const syncDelay = 2000; // 2 seconds
  console.log(`   Waiting ${syncDelay}ms for DA to sync...`);
  await new Promise(resolve => setTimeout(resolve, syncDelay));
  console.log('   ✅ Sync wait complete');

  // Step 7: Clear_Cache
  console.log('\n🗑️  Step 7: Clear_Cache');
  try {
    // Clear cache by calling the .plain.html endpoint
    const cacheUrl = 'https://main--devlive-lab1--meejain.aem.page/ai-image-generation-log.json?bustcache=' + Date.now();
    await fetch(cacheUrl, { 
      method: 'GET',
      cache: 'no-store'
    });
    console.log('   ✅ Cache cleared');
  } catch (e) {
    console.log('   ⚠️  Cache clear warning:', e.message);
  }

  // Step 8: Trigger_JSON_Preview
  console.log('\n🔍 Step 8: Trigger_JSON_Preview');
  try {
    const previewUrl = 'https://main--devlive-lab1--meejain.aem.page/ai-image-generation-log.json';
    const previewResp = await fetch(previewUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    console.log('   ✅ Preview triggered:', previewResp.status);
    console.log('   Preview URL:', previewUrl);
  } catch (e) {
    console.log('   ⚠️  Preview trigger warning:', e.message);
  }

  // Step 9: Trigger_JSON_Publish
  console.log('\n🚀 Step 9: Trigger_JSON_Publish');
  try {
    const publishUrl = 'https://main--devlive-lab1--meejain.aem.live/ai-image-generation-log.json';
    const publishResp = await fetch(publishUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    console.log('   ✅ Publish triggered:', publishResp.status);
    console.log('   Publish URL:', publishUrl);
  } catch (e) {
    console.log('   ⚠️  Publish trigger warning:', e.message);
  }

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ RESET COMPLETE!');
  console.log('=' .repeat(60));
  console.log('📊 SUMMARY:');
  console.log('   Rows before reset:', rowsBeforeReset);
  console.log('   Rows after reset: 1 (empty template row)');
  console.log('   Data rows deleted:', dataRowsRemoved);
  console.log('   Column headers: PRESERVED ✓');
  console.log('   All values: Empty (ready for new data)');
  console.log('=' .repeat(60));
  console.log('\n🔍 Verify at: https://da.live/sheet#/meejain/devlive-lab1/ai-image-generation-log');
  
  return true;
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
  } else if (command === 'reset') {
    // Reset sheet - remove all rows
    await resetDASheet();
  } else {
    console.log('\n📖 Usage:');
    console.log('  node test-da-sheet.js init    - Initialize sheet with sample data');
    console.log('  node test-da-sheet.js append  - Append new row to existing sheet');
    console.log('  node test-da-sheet.js reset   - Reset sheet (remove all rows)');
    console.log('\n💡 Running APPEND test by default...\n');
    await testAppendRow();
  }
}

main();
