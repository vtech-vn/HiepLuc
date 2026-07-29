/**
 * DIAGNOSTIC SCRIPT - Tạm thời để kiểm tra dữ liệu 2 hóa đơn
 * Invoice 233: e0cc2b57
 * Invoice 234: bfe7ce56
 * XÓA FILE NÀY SAU KHI KIỂM TRA XONG
 */
function diagCheckInvoices() {
  const INVOICE_IDS = ["e0cc2b57", "bfe7ce56"];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const output = {};

  // ============ 1. ĐỌC AR_INV_HD ============
  const hdSheet = ss.getSheetByName("AR_INV_HD");
  const hdData = hdSheet.getDataRange().getValues();
  const hdHeader = hdData[0].map(h => h ? h.toString().trim() : "");
  const colHd = {};
  hdHeader.forEach((h, i) => { if (h) colHd[h] = i; });

  output["AR_INV_HD_headers"] = hdHeader;

  for (const invId of INVOICE_IDS) {
    output[invId] = { hd: null, lines: [], taxGroupSummary: {} };
    for (let i = 1; i < hdData.length; i++) {
      if (String(hdData[i][colHd["Invoice_ID"]] || "").trim() === invId) {
        const row = hdData[i];
        output[invId].hd = {
          Invoice_ID:     row[colHd["Invoice_ID"]],
          Customer_ID:    row[colHd["Customer_ID"]],
          Invoice_number: row[colHd["Invoice_number"]],
          Amount:         row[colHd["Amount"]],
          Tax_Rate:       colHd["Tax_Rate"] !== undefined ? row[colHd["Tax_Rate"]] : "COLUMN_NOT_FOUND",
          Payment_Method: row[colHd["Payment_Method"]],
          FKey:           colHd["FKey"] !== undefined ? row[colHd["FKey"]] : "COLUMN_NOT_FOUND",
        };
        break;
      }
    }
    if (!output[invId].hd) output[invId].hd = "NOT FOUND IN AR_INV_HD";
  }

  // ============ 2. ĐỌC AR_INV_LINE ============
  const lineSheet = ss.getSheetByName("AR_INV_LINE");
  const lineData = lineSheet.getDataRange().getValues();
  const lineHeader = lineData[0].map(h => h ? h.toString().trim() : "");
  const colLine = {};
  lineHeader.forEach((h, i) => { if (h) colLine[h] = i; });

  output["AR_INV_LINE_headers"] = lineHeader;

  for (const invId of INVOICE_IDS) {
    for (let i = 1; i < lineData.length; i++) {
      if (String(lineData[i][colLine["Invoice_ID"]] || "").trim() === invId) {
        const row = lineData[i];
        const qty      = parseFloat(row[colLine["Quantity"]]     || 0);
        const price    = parseFloat(row[colLine["Price"]]        || 0);
        const taxRate  = parseFloat(row[colLine["Tax_Rate"]]     || 0);
        const taxAmt   = parseFloat(row[colLine["Tax_Amount"]]   || 0);
        const totalAmt = parseFloat(row[colLine["Total_Amount"]] || 0);
        const itemWithoutTax = qty * price;

        output[invId].lines.push({
          line_row:           i + 1,
          Description:        String(row[colLine["Description"]] || ""),
          Quantity_raw:       row[colLine["Quantity"]],
          Price_raw:          row[colLine["Price"]],
          Tax_Rate_raw:       row[colLine["Tax_Rate"]],
          Tax_Rate_parsed:    taxRate,
          Tax_Amount_raw:     row[colLine["Tax_Amount"]],
          Tax_Amount_parsed:  taxAmt,
          Total_Amount_raw:   row[colLine["Total_Amount"]],
          Total_Amount_parsed:totalAmt,
          computed_itemWithoutTax: itemWithoutTax,
          issues: [
            taxAmt   === 0 ? "⚠️ Tax_Amount = 0 → Thiếu tiền thuế" : null,
            totalAmt === 0 ? "⚠️ Total_Amount = 0 → Thiếu tổng tiền" : null,
            taxRate  === 0 ? "⚠️ Tax_Rate = 0 → Không có thuế suất" : null,
          ].filter(Boolean)
        });
      }
    }

    // ============ 3. MÔ PHỎNG THTTLTSuat ============
    const taxGroups = {};
    let totalWithoutTax = 0, totalTax = 0, totalWithTax = 0;
    for (const line of output[invId].lines) {
      const key = String(line.Tax_Rate_parsed);
      if (!taxGroups[key]) taxGroups[key] = { TSuat: line.Tax_Rate_parsed, ThTien: 0, TThue: 0, issues: [] };
      taxGroups[key].ThTien += line.computed_itemWithoutTax;
      taxGroups[key].TThue  += line.Tax_Amount_parsed;
      totalWithoutTax += line.computed_itemWithoutTax;
      totalTax        += line.Tax_Amount_parsed;
      totalWithTax    += line.Total_Amount_parsed;
    }
    for (const grp of Object.values(taxGroups)) {
      if (grp.ThTien === 0) grp.issues.push("⚠️ ThTien (doanh số chưa thuế) = 0 → VNPT THIẾU DỮ LIỆU BÁO CÁO");
      if (grp.TThue  === 0) grp.issues.push("⚠️ TThue (tiền thuế) = 0 → VNPT THIẾU DỮ LIỆU BÁO CÁO");
    }

    output[invId].taxGroupSummary = {
      groups: taxGroups,
      totalWithoutTax: Math.round(totalWithoutTax),
      totalTax:        Math.round(totalTax),
      totalWithTax:    Math.round(totalWithTax),
      diagnosis: Object.values(taxGroups).flatMap(g => g.issues).length === 0
        ? "✅ Dữ liệu đầy đủ - THTTLTSuat có thể được tạo chính xác"
        : "❌ Dữ liệu THIẾU - THTTLTSuat không đủ dữ liệu để báo cáo thuế"
    };
  }

  return output;
}
