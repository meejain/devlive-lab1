# DA Sheet Reset Flow - Power Automate Implementation Guide

## Overview
This document outlines the Power Automate workflow steps to reset a DA (Document Authoring) sheet by removing all data rows while preserving the column structure.

## Working Solution
The reset creates ONE empty template row with all column values set to empty strings. This preserves the column headers in the DA UI while effectively clearing all data.

## Comparison: SharePoint vs DA Reset Flow

### SharePoint Reset Flow (Current)
```
Response
Get_All_Rows
Apply_to_each
  └─ Delete_a_row
Wait_for_Excel_Sync
Clear_Cache
Force_Code_Refresh
Trigger_JSON_Preview
Trigger_JSON_Publish
```

### DA Reset Flow (New - Working Implementation)
```
Response
Get_Current_Sheet
Parse_Sheet_Data
Extract_Column_Names
Create_Empty_Template_Row
Build_Sheet_Object
Upload_Sheet_To_DA
Wait_for_Excel_Sync
Clear_Cache
Trigger_JSON_Preview
Trigger_JSON_Publish
```

---

## Detailed Power Automate Steps for DA Reset Flow

### 1. **Response**
- **Action Type**: Response (HTTP)
- **Purpose**: Acknowledge the reset request
- **Configuration**:
  - Status Code: `200`
  - Body: `{ "message": "DA sheet reset initiated" }`

---

### 2. **Get_Current_Sheet**
- **Action Type**: HTTP Request
- **Purpose**: Fetch the current DA sheet data
- **Configuration**:
  - **Method**: `GET`
  - **URI**: `https://admin.da.live/source/meejain/devlive-lab1/ai-image-generation-log.json`
  - **Headers**:
    ```json
    {
      "Authorization": "Bearer @{variables('DA_IMS_TOKEN')}"
    }
    ```
- **Output**: Store response in variable `CurrentSheetData`

---

### 3. **Parse_Sheet_Data**
- **Action Type**: Parse JSON
- **Purpose**: Extract sheet data and metadata
- **Configuration**:
  - **Content**: `@body('Get_Current_Sheet')`
  - **Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "total": { "type": "integer" },
        "limit": { "type": "integer" },
        "offset": { "type": "integer" },
        "data": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "Timestamp": { "type": "string" },
              "Prompt": { "type": "string" },
              "Status": { "type": "string" },
              "DocumentPath": { "type": "string" },
              "TargetFolder": { "type": "string" },
              "SharePointFile": { "type": "string" },
              "SharePointPath": { "type": "string" },
              "ImageURL": { "type": "string" },
              "EDSURL": { "type": "string" },
              "AEMPreviewURL": { "type": "string" },
              "Source": { "type": "string" },
              "UserHost": { "type": "string" },
              "GeneratedText": { "type": "string" }
            }
          }
        },
        ":type": { "type": "string" },
        ":sheetname": { "type": "string" },
        ":colWidths": {
          "type": "array",
          "items": { "type": "integer" }
        }
      }
    }
    ```
- **Store Variables**:
  - `RowsBeforeReset`: `@length(body('Parse_Sheet_Data')?['data'])`
  - `SheetType`: `@body('Parse_Sheet_Data')?[':type']`
  - `SheetName`: `@body('Parse_Sheet_Data')?[':sheetname']`
  - `ColWidths`: `@body('Parse_Sheet_Data')?[':colWidths']`

---

### 4. **Clear_All_Data_Rows**
- **Action Type**: Compose
- **Purpose**: Create an empty data array (equivalent to deleting all rows)
- **Configuration**:
  - **Inputs**: `[]` (empty array)
- **Output**: Store in variable `EmptyDataArray`

---

### 5. **Build_Empty_Sheet_Object**
- **Action Type**: Compose
- **Purpose**: Reconstruct the sheet object with empty data but preserved metadata
- **Configuration**:
  - **Inputs**:
    ```json
    {
      "total": 0,
      "limit": 0,
      "offset": 0,
      "data": [],
      ":type": "@{variables('SheetType')}",
      ":sheetname": "@{variables('SheetName')}",
      ":colWidths": "@{variables('ColWidths')}"
    }
    ```
- **Output**: Store in variable `EmptySheetObject`

---

### 6. **Upload_Sheet_To_DA**
- **Action Type**: HTTP Request
- **Purpose**: Upload the empty sheet back to DA
- **Configuration**:
  - **Method**: `POST`
  - **URI**: `https://admin.da.live/source/meejain/devlive-lab1/ai-image-generation-log.json`
  - **Headers**:
    ```json
    {
      "Authorization": "Bearer @{variables('DA_IMS_TOKEN')}"
    }
    ```
  - **Body**: 
    - Use **multipart/form-data** format
    - Create a file attachment with:
      - **Name**: `data`
      - **Content**: `@{outputs('Build_Empty_Sheet_Object')}`
      - **Content-Type**: `application/json`
      - **Filename**: `ai-image-generation-log.json`

**Power Automate Implementation Notes**:
- You may need to use the "Create file" action first to create a temporary JSON file
- Then use "Get file content" to read it
- Finally attach it to the HTTP request

**Alternative Simpler Approach** (if multipart is complex):
```json
// Some DA implementations might accept direct JSON PUT
Method: PUT
URI: https://admin.da.live/source/meejain/devlive-lab1/ai-image-generation-log.json
Headers: {
  "Authorization": "Bearer @{variables('DA_IMS_TOKEN')}",
  "Content-Type": "application/json"
}
Body: @{outputs('Build_Empty_Sheet_Object')}
```

---

### 7. **Wait_for_Excel_Sync**
- **Action Type**: Delay
- **Purpose**: Allow DA to process and sync the changes
- **Configuration**:
  - **Count**: `2`
  - **Unit**: `Second`

---

### 8. **Clear_Cache**
- **Action Type**: HTTP Request
- **Purpose**: Clear the AEM/EDS cache
- **Configuration**:
  - **Method**: `GET`
  - **URI**: `https://main--devlive-lab1--meejain.aem.page/ai-image-generation-log.json?bustcache=@{ticks(utcNow())}`
  - **Headers**:
    ```json
    {
      "Cache-Control": "no-cache"
    }
    ```

---

### 9. **Force_Code_Refresh** (Optional)
- **Action Type**: HTTP Request
- **Purpose**: Force a code refresh if applicable
- **Configuration**:
  - **Method**: `POST`
  - **URI**: `https://admin.hlx.page/code/meejain/devlive-lab1/main`
  - **Headers**:
    ```json
    {
      "x-hlx-auth": "@{variables('ADMIN_AUTH_TOKEN')}"
    }
    ```

---

### 10. **Trigger_JSON_Preview**
- **Action Type**: HTTP Request
- **Purpose**: Trigger the preview environment to pick up changes
- **Configuration**:
  - **Method**: `POST`
  - **URI**: `https://admin.hlx.page/preview/meejain/devlive-lab1/main/ai-image-generation-log.json`
  - **Headers**:
    ```json
    {
      "x-hlx-auth": "@{variables('ADMIN_AUTH_TOKEN')}"
    }
    ```

---

### 11. **Trigger_JSON_Publish**
- **Action Type**: HTTP Request
- **Purpose**: Publish the changes to the live environment
- **Configuration**:
  - **Method**: `POST`
  - **URI**: `https://admin.hlx.page/live/meejain/devlive-lab1/main/ai-image-generation-log.json`
  - **Headers**:
    ```json
    {
      "x-hlx-auth": "@{variables('ADMIN_AUTH_TOKEN')}"
    }
    ```

---

## Variables Required

Create these variables at the beginning of your Power Automate flow:

| Variable Name | Type | Initial Value | Source |
|---------------|------|---------------|--------|
| `DA_IMS_TOKEN` | String | (from secure storage) | da-config.txt |
| `ADMIN_AUTH_TOKEN` | String | (from secure storage) | da-config.txt |
| `CurrentSheetData` | Object | `null` | Runtime |
| `RowsBeforeReset` | Integer | `0` | Runtime |
| `SheetType` | String | `"sheet"` | Runtime |
| `SheetName` | String | `"data"` | Runtime |
| `ColWidths` | Array | `[]` | Runtime |
| `EmptyDataArray` | Array | `[]` | Runtime |
| `EmptySheetObject` | Object | `{}` | Runtime |

---

## Error Handling

Add error handling for each HTTP request:

1. **Scope: Try** - Wrap all steps 2-11
2. **Scope: Catch** - Handle errors
   - Log error details
   - Send notification
   - Return error response

Example error handling:
```json
{
  "status": "error",
  "message": "@{body('Get_Current_Sheet')?['error']}",
  "step": "Get_Current_Sheet",
  "timestamp": "@{utcNow()}"
}
```

---

## Testing the Flow

### Test with Node.js Script
```bash
# Initialize test data
node test-da-sheet.js init

# Verify data exists
# Visit: https://da.live/sheet#/meejain/devlive-lab1/ai-image-generation-log

# Run reset
node test-da-sheet.js reset

# Verify sheet is empty
# Visit: https://da.live/sheet#/meejain/devlive-lab1/ai-image-generation-log
```

### Test Power Automate Flow
1. Trigger the flow via HTTP request or manual trigger
2. Monitor the flow run in Power Automate
3. Verify each step completes successfully
4. Check the DA sheet is empty
5. Verify preview and publish URLs reflect the empty state

---

## Key Differences: SharePoint vs DA

| Aspect | SharePoint | DA Sheet |
|--------|-----------|----------|
| **Row Deletion** | Individual `Delete_a_row` in loop | Replace entire sheet with empty data |
| **API Approach** | Row-by-row operations | Whole-sheet replacement |
| **Metadata** | Managed by SharePoint | Must preserve `:type`, `:sheetname`, `:colWidths` |
| **Authentication** | SharePoint connector | Bearer token (DA_IMS_TOKEN) |
| **Sync Method** | Excel Online sync | DA processing + cache clear |

---

## Success Criteria

The reset flow is successful when:
- ✅ All data rows are removed from the DA sheet
- ✅ Sheet metadata is preserved (`:type`, `:sheetname`, `:colWidths`)
- ✅ Cache is cleared
- ✅ Preview environment reflects empty sheet
- ✅ Live/publish environment reflects empty sheet
- ✅ No errors in Power Automate flow execution

---

## Maintenance Notes

- **Token Expiry**: DA_IMS_TOKEN and ADMIN_AUTH_TOKEN expire periodically. Update them in your secure storage (Azure Key Vault recommended)
- **Rate Limiting**: DA API has rate limits. Add retry logic with exponential backoff
- **Monitoring**: Set up alerts for failed flow runs
- **Backup**: Consider backing up sheet data before reset (optional step 1.5)

---

## Related Files

- `/test-da-sheet.js` - Node.js implementation of DA sheet operations
- `/da-config.txt` - Contains DA_IMS_TOKEN and ADMIN_AUTH_TOKEN (keep secure!)
- `/fstab.yaml` - DA mountpoint configuration

---

## Support

For issues with:
- **DA API**: Check https://da.live documentation
- **AEM/EDS**: Check https://www.aem.live/developer/
- **Power Automate**: Check Microsoft Power Automate documentation

