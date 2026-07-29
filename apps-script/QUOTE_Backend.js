// ============================================================
// FILE CODE.GS HOÀN CHỈNH — COPY TOÀN BỘ VÀO APPS SCRIPT
// ============================================================

/**
 * Lấy dữ liệu từ các sheet cần thiết.
 * - Quote_HD, Quote_Line: chỉ lấy rows khớp quoteId (nhanh hơn)
 * - Customer, Company_profile: lấy toàn bộ (bảng nhỏ, cần tra cứu)
 * Gọi từ client bằng google.script.run.getSheetData(quoteId)
 */
function getSheetData(quoteId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {};

  // Helper: đọc 1 sheet thành array of objects
  function readSheet(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    var headers = data[0].map(function(h) { return String(h).trim(); });
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      var hasValue = false;
      for (var j = 0; j < headers.length; j++) {
        var val = data[i][j];
        row[headers[j]] = (val !== null && val !== undefined) ? String(val) : '';
        if (val !== '' && val !== null && val !== undefined) hasValue = true;
      }
      if (hasValue) rows.push(row);
    }
    return rows;
  }

  // Helper: đọc sheet và lọc theo Quote_ID
  function readSheetFiltered(sheetName, filterQuoteId) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    var headers = data[0].map(function(h) { return String(h).trim(); });
    var qIdx = headers.indexOf('Quote_ID');
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      // Nếu không tìm được cột Quote_ID thì load hết
      if (qIdx >= 0 && String(data[i][qIdx]).trim() !== filterQuoteId) continue;
      var row = {};
      var hasValue = false;
      for (var j = 0; j < headers.length; j++) {
        var val = data[i][j];
        row[headers[j]] = (val !== null && val !== undefined) ? String(val) : '';
        if (val !== '' && val !== null && val !== undefined) hasValue = true;
      }
      if (hasValue) rows.push(row);
    }
    return rows;
  }

  // Load có lọc theo quoteId
  result['Quote_HD']       = readSheetFiltered('Quote_HD', quoteId);
  result['Quote_Line']     = readSheetFiltered('Quote_Line', quoteId);

  // Load toàn bộ (bảng nhỏ)
  result['Customer']       = readSheet('Customer');
  result['Company_profile'] = readSheet('Company_profile');
  
  // MỚI: Load thêm Cust_Contact để lấy thông tin liên hệ
  result['Cust_Contact']   = readSheet('Cust_Contact');
  
  // Load Employees để tra cứu tên người phụ trách (PIC)
  result['Employees']      = readSheet('Employees');

  return result;
}

/**
 * Lấy logo từ Google Drive và trả về dạng base64 data URI.
 * Gọi từ client bằng google.script.run.getLogoBase64(fileId)
 */
function getLogoBase64(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch(e) {
    Logger.log('Lỗi lấy logo: ' + e.message);
    return null;
  }
}