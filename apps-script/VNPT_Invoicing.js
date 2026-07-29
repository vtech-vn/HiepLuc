/**
 * Hàm đọc số tiền thành chữ tiếng Việt (Chuẩn kế toán)
 */
function docSoThanhChu(soTien) {
  if (soTien == 0) return "Không đồng";
  var chuSo = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  var donViTien = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

  var docSo3ChuSo = function(baso, hienThiTram) {
    var tram = Math.floor(baso / 100);
    var chuc = Math.floor((baso % 100) / 10);
    var donvi = baso % 10;
    var ketqua = "";

    if (tram > 0 || hienThiTram) {
      ketqua += chuSo[tram] + " trăm ";
    }
    
    if (chuc > 1) {
      ketqua += chuSo[chuc] + " mươi ";
      if (donvi == 1) ketqua += "mốt";
      else if (donvi == 5) ketqua += "lăm";
      else if (donvi > 0) ketqua += chuSo[donvi];
    } else if (chuc == 1) {
      ketqua += "mười ";
      if (donvi == 5) ketqua += "lăm";
      else if (donvi > 0) ketqua += chuSo[donvi];
    } else if (chuc == 0 && donvi > 0) {
      if (tram > 0 || hienThiTram) ketqua += "linh ";
      ketqua += chuSo[donvi];
    }
    return ketqua;
  };

  var str = Math.round(soTien).toString();
  var i = str.length;
  var arr = [];
  while (i > 0) {
    arr.push(str.substring(Math.max(0, i - 3), i));
    i -= 3;
  }

  var result = "";
  for (i = arr.length - 1; i >= 0; i--) {
    var baso = parseInt(arr[i]);
    if (baso > 0) {
      var hienThiTram = (i < arr.length - 1);
      result += docSo3ChuSo(baso, hienThiTram) + " " + donViTien[i] + " ";
    }
  }

  result = result.trim();
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1) + " đồng chẵn";
  }
  return result.replace(/\s+/g, ' ');
}

/**
 * Hàm lấy thông tin cấu hình từ sheet Credentials
 */
function getVNPTConfigs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Credentials");
  if (!sheet) throw new Error("Không tìm thấy sheet 'Credentials'");

  const data = sheet.getDataRange().getValues();
  const configs = {};
  
  data.forEach(row => {
    const key = row[0] ? row[0].toString().trim() : "";
    const value = row[1] ? row[1].toString().trim() : "";
    if (key) configs[key] = value;
  });

  return configs;
}

/**
 * Hàm chính để đẩy hóa đơn vào hệ thống VNPT
 */
function pushInvoiceToVNPT(invoiceId) {
  try {
    const CONFIG_VNPT = getVNPTConfigs();
    // Sử dụng invoiceId truyền vào hoặc giá trị mặc định để test
    invoiceId = invoiceId || "c8d80346"; 

    const timestamp = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMddHHmmss");
    const autoFkey = `${invoiceId}-${timestamp}`;

    console.log("=== BẮT ĐẦU XỬ LÝ HÓA ĐƠN ===");
    console.log("Invoice ID:", invoiceId);
    console.log("Fkey tạo mới:", autoFkey);

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Lấy Customer_ID, Payment_Method, Tax_Rate từ sheet AR_INV_HD
    const hdSheet = ss.getSheetByName("AR_INV_HD");
    const hdData = hdSheet.getDataRange().getValues();
    const hdHeader = hdData[0].map(h => h ? h.trim() : "");
    const colHd = {};
    hdHeader.forEach((h, i) => { if (h) colHd[h] = i; });

    let customerId = null;
    let paymentMethod = "CK"; 
    let taxRateHD = "10";     

    for (let i = 1; i < hdData.length; i++) {
      if (hdData[i][colHd["Invoice_ID"]] === invoiceId) {
        customerId = hdData[i][colHd["Customer_ID"]];
        paymentMethod = String(hdData[i][colHd["Payment_Method"]] || "CK");
        if (colHd["Tax_Rate"] !== undefined) {
          taxRateHD = String(hdData[i][colHd["Tax_Rate"]] || "10");
        }
        break;
      }
    }

    if (!customerId) throw new Error("Không tìm thấy Invoice_ID: " + invoiceId + " trong sheet AR_INV_HD");

    // 2. Lấy thông tin chi tiết khách hàng từ sheet Customer
    const cusSheet = ss.getSheetByName("Customer");
    const cusData = cusSheet.getDataRange().getValues();
    const cusHeader = cusData[0].map(h => h ? h.trim() : "");
    const colCus = {};
    cusHeader.forEach((h, i) => { if (h) colCus[h] = i; });

    let customerName = "";
    let customerTaxCode = "";
    let customerAddress = "";
    let vatCustomerCode = "";
    let vatEmail = "";

    let foundCustomer = false;
    for (let i = 1; i < cusData.length; i++) {
      if (cusData[i][colCus["Customer_ID"]] === customerId) {
        customerName = String(cusData[i][colCus["Customer_Name"]] || "");
        customerTaxCode = String(cusData[i][colCus["Tax_Reg"]] || "");
        customerAddress = String(cusData[i][colCus["Address"]] || "");
        vatCustomerCode = String(cusData[i][colCus["VAT_Customer_Code"]] || customerId);
        vatEmail = String(cusData[i][colCus["VAT_Email"]] || "");
        foundCustomer = true;
        break;
      }
    }

    if (!foundCustomer) throw new Error("Không tìm thấy thông tin cho Customer_ID: " + customerId);

    // 3. Lấy line items từ sheet AR_INV_LINE
    const lineSheet = ss.getSheetByName("AR_INV_LINE");
    const lineData = lineSheet.getDataRange().getValues();
    const lineHeader = lineData[0].map(h => h ? h.trim() : "");
    const colLine = {};
    lineHeader.forEach((h, i) => { if (h) colLine[h] = i; });

    const items = [];
    let totalWithoutTax = 0;
    let totalTax = 0;
    let totalWithTax = 0;

    for (let i = 1; i < lineData.length; i++) {
      if (lineData[i][colLine["Invoice_ID"]] === invoiceId) {
        const row = lineData[i];
        const qty = parseFloat(row[colLine["Quantity"]] || 0);
        const price = parseFloat(row[colLine["Price"]] || 0);
        const taxRate = parseFloat(row[colLine["Tax_Rate"]] || parseFloat(taxRateHD) || 10);
        const taxAmt = parseFloat(row[colLine["Tax_Amount"]] || 0);
        const totalAmt = parseFloat(row[colLine["Total_Amount"]] || 0);

        const itemWithoutTax = qty * price;

        items.push({
          STT: items.length + 1,
          TChat: "1",
          THHDVu: String(row[colLine["Description"]] || "Hàng hóa/Dịch vụ"),
          DVTinh: String(row[colLine["UOM"]] || "Cái"),
          SLuong: qty,
          DGia: price,
          ThTien: itemWithoutTax,
          TSuat: String(taxRate),
          TThue: taxAmt,
          ExtThTienSThue: totalAmt
        });

        totalWithoutTax += itemWithoutTax;
        totalTax += taxAmt;
        totalWithTax += totalAmt;
      }
    }

    // 4. Xác thực hệ thống (Authenticate)
    const authUrl = `${CONFIG_VNPT.baseUrl}/admin-api/api/v1/saas/auth`;
    const authRes = UrlFetchApp.fetch(authUrl, {
      method: "post",
      contentType: "application/json",
      headers: { "Client-Id": CONFIG_VNPT.clientId },
      payload: JSON.stringify({ username: CONFIG_VNPT.username, password: CONFIG_VNPT.password }),
      muteHttpExceptions: true
    });

    const authJson = JSON.parse(authRes.getContentText());
    if (authJson.err_code != 0 && authJson.err_code != "0") {
      throw new Error("Lỗi Auth VNPT: " + authJson.message);
    }
    const token = authJson.data.access_token;

    // 5. Chuẩn bị Body và Gọi API tạo hóa đơn
    const invoiceUrl = `${CONFIG_VNPT.baseUrl}/invoice-api/api/v1/saas/invoice/save`;
    const invoiceBody = {
      KHMSHDon: 1,
      KHHDon: CONFIG_VNPT.KHHDon || "C26TAA", 
      HDons: [{
        NLap: Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy"),
        Fkey: autoFkey,
        NMua: {
          Ten: customerName,
          MST: customerTaxCode,
          DChi: customerAddress,
          MKHang: vatCustomerCode,
          DCTDTu: vatEmail,
          HTTToan: paymentMethod, 
          DVTTe: "VND",
          TGia: 1
        },
        HHDVu: items,
        TToan: {
          TgTCThue: Math.round(totalWithoutTax),
          TgTThue: Math.round(totalTax),
          TgTTTBSo: Math.round(totalWithTax),
          TgTTTBChu: docSoThanhChu(Math.round(totalWithTax))
        },
        "THTTLTSuat":[{
          "TSuat": taxRateHD, 
          "ThTien": Math.round(totalWithoutTax),
          "TThue": Math.round(totalTax)
        }]
      }]
    };

    const response = UrlFetchApp.fetch(invoiceUrl, {
      method: "post",
      contentType: "application/json",
      headers: { "Authorization": token, "Client-Id": CONFIG_VNPT.clientId },
      payload: JSON.stringify(invoiceBody),
      muteHttpExceptions: true
    });

    const result = {
      status: response.getResponseCode(),
      body: JSON.parse(response.getContentText()),
      fkey: autoFkey,
      customer: customerName,
      amountInWords: docSoThanhChu(totalWithTax)
    };

    console.log("Kết quả gửi VNPT:", JSON.stringify(result));
    return result;

  } catch (err) {
    console.error("LỖI HỆ THỐNG:", err.message);
    return { status: "error", message: err.message };
  }
}