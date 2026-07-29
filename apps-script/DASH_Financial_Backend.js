function getDashboardData() {
  const ssId = "1KwswK9HqDWYCIDO-nsVIxiIxa6akIgKoPQdU0xDA7jk";
  try {
    const ss = SpreadsheetApp.openById(ssId);
    const data = {};

    const sheetNames = ["Order_HD", "Order_Line", "AR_INV_HD", "AR_INV_LINE", "AP_INV_LINE", "Customer", "Company_profile"];
    
    sheetNames.forEach(name => {
      const sheet = ss.getSheetByName(name);
      if (sheet) {
        const db = sheet.getDataRange().getValues();
        if (db.length > 0) {
          const headers = db[0].map(h => String(h).trim());
          const rows = [];
          for (let i = 1; i < db.length; i++) {
            const rowObj = {};
            let isEmptyRow = true;
            db[i].forEach((cell, index) => {
              if (cell !== "") isEmptyRow = false;
              if (headers[index]) {
                if (cell instanceof Date) {
                   rowObj[headers[index]] = cell.toISOString();
                } else {
                   rowObj[headers[index]] = cell;
                }
              }
            });
            if (!isEmptyRow) {
              rows.push(rowObj);
            }
          }
          data[name] = rows;
        } else {
          data[name] = [];
        }
      } else {
        data[name] = [];
      }
    });

    return JSON.stringify({
      success: true,
      data: data
    });
  } catch (err) {
    return JSON.stringify({
      success: false,
      error: err.message
    });
  }
}
