# DA Reset Flow - Quick Reference

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DA SHEET RESET FLOW                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│   TRIGGER    │  Manual/HTTP trigger to start reset
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Response   │  Return 200 OK acknowledgment
└──────┬───────┘
       │
       ▼
┌───────────────────────┐
│ Get_Current_Sheet     │  GET https://admin.da.live/source/.../ai-image-generation-log.json
│                       │  Headers: Authorization: Bearer {DA_IMS_TOKEN}
└──────┬────────────────┘
       │
       ▼
┌───────────────────────┐
│ Parse_Sheet_Data      │  Extract:
│                       │  - data[] (current rows)
│                       │  - :type, :sheetname, :colWidths (metadata)
└──────┬────────────────┘
       │
       ▼
┌───────────────────────┐
│ Clear_All_Data_Rows   │  Create empty array []
│                       │  Store count of deleted rows
└──────┬────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Build_Empty_Sheet_Object│  {
│                         │    "total": 0,
│                         │    "limit": 0,
│                         │    "offset": 0,
│                         │    "data": [],
│                         │    ":type": "sheet",
│                         │    ":sheetname": "data",
│                         │    ":colWidths": [...]
│                         │  }
└──────┬──────────────────┘
       │
       ▼
┌───────────────────────┐
│ Upload_Sheet_To_DA    │  POST https://admin.da.live/source/.../ai-image-generation-log.json
│                       │  Body: multipart/form-data with JSON file
│                       │  Headers: Authorization: Bearer {DA_IMS_TOKEN}
└──────┬────────────────┘
       │
       ▼
┌───────────────────────┐
│ Wait_for_Excel_Sync   │  Delay: 2 seconds
│                       │  (Allow DA to process changes)
└──────┬────────────────┘
       │
       ▼
┌───────────────────────┐
│ Clear_Cache           │  GET .../ai-image-generation-log.json?bustcache={timestamp}
│                       │  Headers: Cache-Control: no-cache
└──────┬────────────────┘
       │
       ▼
┌───────────────────────┐
│ Force_Code_Refresh    │  POST https://admin.hlx.page/code/.../main
│ (Optional)            │  Headers: x-hlx-auth: {ADMIN_AUTH_TOKEN}
└──────┬────────────────┘
       │
       ▼
┌───────────────────────┐
│ Trigger_JSON_Preview  │  POST https://admin.hlx.page/preview/.../main/ai-image-generation-log.json
│                       │  Headers: x-hlx-auth: {ADMIN_AUTH_TOKEN}
└──────┬────────────────┘
       │
       ▼
┌───────────────────────┐
│ Trigger_JSON_Publish  │  POST https://admin.hlx.page/live/.../main/ai-image-generation-log.json
│                       │  Headers: x-hlx-auth: {ADMIN_AUTH_TOKEN}
└──────┬────────────────┘
       │
       ▼
┌──────────────┐
│   SUCCESS    │  Sheet is now empty and published
└──────────────┘
```

---

## Power Automate Actions Summary

| Step | Action Type | Key Configuration |
|------|-------------|-------------------|
| 1 | Response | Status: 200, Body: `{"message": "Reset initiated"}` |
| 2 | HTTP | GET, URL: `admin.da.live/source/.../ai-image-generation-log.json` |
| 3 | Parse JSON | Schema: DA sheet structure |
| 4 | Compose | Output: `[]` (empty array) |
| 5 | Compose | Output: Empty sheet object with metadata |
| 6 | HTTP | POST multipart/form-data with JSON file |
| 7 | Delay | 2 seconds |
| 8 | HTTP | GET with cache busting parameter |
| 9 | HTTP | POST to `/code/` endpoint (optional) |
| 10 | HTTP | POST to `/preview/` endpoint |
| 11 | HTTP | POST to `/live/` endpoint |

---

## HTTP Request Details

### Get Current Sheet (Step 2)
```
Method: GET
URL: https://admin.da.live/source/meejain/devlive-lab1/ai-image-generation-log.json

Headers:
  Authorization: Bearer {DA_IMS_TOKEN}
```

### Upload Empty Sheet (Step 6)
```
Method: POST
URL: https://admin.da.live/source/meejain/devlive-lab1/ai-image-generation-log.json

Headers:
  Authorization: Bearer {DA_IMS_TOKEN}
  
Body: multipart/form-data
  - Field name: data
  - File name: ai-image-generation-log.json
  - Content-Type: application/json
  - Content: {empty sheet object}
```

### Clear Cache (Step 8)
```
Method: GET
URL: https://main--devlive-lab1--meejain.aem.page/ai-image-generation-log.json?bustcache={timestamp}

Headers:
  Cache-Control: no-cache
```

### Trigger Preview (Step 10)
```
Method: POST
URL: https://admin.hlx.page/preview/meejain/devlive-lab1/main/ai-image-generation-log.json

Headers:
  x-hlx-auth: {ADMIN_AUTH_TOKEN}
```

### Trigger Publish (Step 11)
```
Method: POST
URL: https://admin.hlx.page/live/meejain/devlive-lab1/main/ai-image-generation-log.json

Headers:
  x-hlx-auth: {ADMIN_AUTH_TOKEN}
```

---

## Empty Sheet Object Structure

```json
{
  "total": 0,
  "limit": 0,
  "offset": 0,
  "data": [],
  ":type": "sheet",
  ":sheetname": "data",
  ":colWidths": []
}
```

**Important**: Always preserve the metadata fields (`:type`, `:sheetname`, `:colWidths`) from the original sheet!

---

## Variables Needed

```
DA_IMS_TOKEN          (String)  - From da-config.txt
ADMIN_AUTH_TOKEN      (String)  - From da-config.txt
CurrentSheetData      (Object)  - Runtime
RowsBeforeReset       (Integer) - Runtime
SheetType             (String)  - Runtime (usually "sheet")
SheetName             (String)  - Runtime (usually "data")
ColWidths             (Array)   - Runtime
EmptyDataArray        (Array)   - Runtime
EmptySheetObject      (Object)  - Runtime
```

---

## Testing Commands

```bash
# Initialize with sample data
node test-da-sheet.js init

# Append test rows
node test-da-sheet.js append

# Reset (remove all rows)
node test-da-sheet.js reset
```

---

## Verification Checklist

After running the reset flow:

- [ ] DA sheet has 0 data rows
- [ ] Sheet metadata is preserved (`:type`, `:sheetname`, `:colWidths`)
- [ ] Preview URL returns empty data: `https://main--devlive-lab1--meejain.aem.page/ai-image-generation-log.json`
- [ ] Live URL returns empty data: `https://main--devlive-lab1--meejain.aem.live/ai-image-generation-log.json`
- [ ] DA interface shows empty sheet: `https://da.live/sheet#/meejain/devlive-lab1/ai-image-generation-log`
- [ ] No errors in Power Automate flow execution
- [ ] Flow execution time < 10 seconds

---

## Troubleshooting

### Issue: "401 Unauthorized"
**Solution**: Update DA_IMS_TOKEN in your secure storage. Tokens expire regularly.

### Issue: "Sheet not found"
**Solution**: Run `node test-da-sheet.js init` to create the sheet first.

### Issue: "Upload failed"
**Solution**: Check that the multipart/form-data is properly formatted. The file field must be named `data`.

### Issue: "Cache not cleared"
**Solution**: Wait longer (increase delay to 5 seconds) and try adding a second cache-busting request.

### Issue: "Preview/Publish not working"
**Solution**: Verify ADMIN_AUTH_TOKEN is valid. Check that the repository and branch names are correct.

---

## Performance Notes

- **Total execution time**: ~5-10 seconds
- **Bottleneck**: DA processing (Step 6)
- **Optimization**: Steps 10-11 can potentially run in parallel if Power Automate supports it

---

## Security Considerations

1. **Never commit tokens to git** - Store in Azure Key Vault or Power Automate secure storage
2. **Use HTTPS** for all API calls
3. **Validate tokens before use** - Check expiration
4. **Log reset operations** - Track who reset and when for audit purposes
5. **Consider backup** - Optionally save a copy of data before reset

---

## Next Steps

1. ✅ Create Power Automate flow with the steps above
2. ✅ Configure variables in Power Automate
3. ✅ Test with sample data
4. ✅ Add error handling
5. ✅ Set up monitoring/alerts
6. ✅ Document the flow for your team
7. ✅ Deploy to production

---

## Related Documentation

- Full implementation guide: `DA-RESET-FLOW.md`
- Node.js test script: `test-da-sheet.js`
- Configuration: `da-config.txt`, `fstab.yaml`

