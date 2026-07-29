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

function testDraftInvoiceVNPT_SOAP(invoiceId) {
  // ================= 1. LẤY CẤU HÌNH TỪ SHEET CREDENTIALS =================
  const configs = getVNPTConfigs();
  
  const DOMAIN = (configs["DOMAIN"] || "").replace(/\/$/, ""); // Xóa dấu / ở cuối nếu có
  const USERNAME_WEB_ADMIN = configs["USERNAME_WEB_ADMIN"];
  const PASSWORD_WEB_ADMIN = configs["PASSWORD_WEB_ADMIN"];
  const USER_WS = configs["front_end_user_name"] || configs["USER_WS"]; // Ưu tiên front_end_user_name vì nó chứa '0304237988ws'
  const PASS_WS = configs["PASS_WS"];
  const PATTERN = configs["PATTERN"];
  const SERIAL = configs["SERIAL"];


  // ================= 2. DỮ LIỆU HÓA ĐƠN =================
  // Sử dụng invoiceId truyền vào hoặc giá trị mặc định để test
  invoiceId = invoiceId; 

  const timestamp = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMddHHmmss");
  const fkey = `${invoiceId}-${timestamp}`;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Lấy Customer_ID, Payment_Method, Tax_Rate từ sheet AR_INV_HD
  const hdSheet = ss.getSheetByName("AR_INV_HD");
  if (!hdSheet) throw new Error("Không tìm thấy sheet 'AR_INV_HD'");
  const hdData = hdSheet.getDataRange().getValues();
  const hdHeader = hdData[0].map(h => h ? h.trim() : "");
  const colHd = {};
  hdHeader.forEach((h, i) => { if (h) colHd[h] = i; });

  let customerId = null;
  let paymentMethod = "CK"; 
  let taxRateHD = "10";
  let orderId = null;
  let rowIndex = -1;

  for (let i = 1; i < hdData.length; i++) {
    if (hdData[i][colHd["Invoice_ID"]] === invoiceId) {
      customerId = hdData[i][colHd["Customer_ID"]];
      orderId = hdData[i][colHd["Order_ID"]];
      paymentMethod = String(hdData[i][colHd["Payment_Method"]] || "CK");
      if (colHd["Tax_Rate"] !== undefined) {
        taxRateHD = String(hdData[i][colHd["Tax_Rate"]] || "10");
      }
      rowIndex = i + 1; // 1-indexed row number
      break;
    }
  }

  if (!customerId) throw new Error("Không tìm thấy Invoice_ID: " + invoiceId + " trong sheet AR_INV_HD");

  // Lấy thông tin PO từ sheet Order_HD
  let customerPONumber = "";
  const orderSheet = ss.getSheetByName("Order_HD");
  if (orderSheet && orderId) {
    const orderData = orderSheet.getDataRange().getValues();
    const orderHeader = orderData[0].map(h => h ? h.trim() : "");
    const colOrder = {};
    orderHeader.forEach((h, i) => { if (h) colOrder[h] = i; });
    
    for (let i = 1; i < orderData.length; i++) {
      if (orderData[i][colOrder["Order_ID"]] === orderId) {
        customerPONumber = String(orderData[i][colOrder["Customer_PO_Number"]] || "");
        break;
      }
    }
  }

  // 2. Lấy thông tin chi tiết khách hàng từ sheet Customer
  const cusSheet = ss.getSheetByName("Customer");
  if (!cusSheet) throw new Error("Không tìm thấy sheet 'Customer'");
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

  // Escaping hàm tránh lỗi CDATA lồng nhau:
  function escapeXml(unsafe) {
    if (!unsafe) return "";
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
  }

  // 3. Lấy line items từ sheet AR_INV_LINE
  const lineSheet = ss.getSheetByName("AR_INV_LINE");
  if (!lineSheet) throw new Error("Không tìm thấy sheet 'AR_INV_LINE'");
  const lineData = lineSheet.getDataRange().getValues();
  const lineHeader = lineData[0].map(h => h ? h.trim() : "");
  const colLine = {};
  lineHeader.forEach((h, i) => { if (h) colLine[h] = i; });

  let productsXML = "";
  let totalWithoutTax = 0;
  let totalTax = 0;
  let totalWithTax = 0;
  const taxGroups = {};

  for (let i = 1; i < lineData.length; i++) {
    if (lineData[i][colLine["Invoice_ID"]] === invoiceId) {
      const row = lineData[i];
      const qty = parseFloat(row[colLine["Quantity"]] || 0);
      const price = parseFloat(row[colLine["Price"]] || 0);
      const taxRate = parseFloat(row[colLine["Tax_Rate"]] || parseFloat(taxRateHD) || 10);
      const taxAmt = parseFloat(row[colLine["Tax_Amount"]] || 0);
      const totalAmt = parseFloat(row[colLine["Total_Amount"]] || 0);

      const itemWithoutTax = qty * price;

      // Phân bổ vào nhóm thuế suất để sinh thẻ VatAmount tương ứng
      const taxRateKey = String(taxRate);
      if (!taxGroups[taxRateKey]) taxGroups[taxRateKey] = 0;
      taxGroups[taxRateKey] += taxAmt;

      productsXML += `
        <Product>
          <ProdName>${escapeXml(String(row[colLine["Description"]] || "Hàng hóa/Dịch vụ"))}</ProdName>
          <ProdUnit>${escapeXml(String(row[colLine["UOM"]] || "Cái"))}</ProdUnit>
          <ProdQuantity>${qty}</ProdQuantity>
          <ProdPrice>${price}</ProdPrice>
          <Amount>${itemWithoutTax}</Amount>
          <Total>${itemWithoutTax}</Total>
          <VATRate>${taxRate}</VATRate>
          <VATAmount>${Math.round(taxAmt)}</VATAmount>
        </Product>`;

      totalWithoutTax += itemWithoutTax;
      totalTax += taxAmt;
      totalWithTax += totalAmt;
    }
  }

  // Thêm dòng thông tin PO vào cuối danh sách sản phẩm (nếu có PO)
  if (customerPONumber) {
    productsXML += `
        <Product>
          <ProdName>${escapeXml("PO " + customerPONumber)}</ProdName>
          <ProdUnit></ProdUnit>
          <ProdQuantity></ProdQuantity>
          <ProdPrice></ProdPrice>
          <Amount>0</Amount>
          <Total>0</Total>
          <VATRate>${taxRateHD}</VATRate>
          <VATAmount>0</VATAmount>
        </Product>`;
  }

  // Tạo nội dung các thẻ VatAmount tương ứng với từng mức thuế
  let dynamicVatTags = "";
  for (const key in taxGroups) {
    // Chỉ tạo thẻ nếu có mức thuế hợp lệ (VD: 0, 5, 8, 10)
    if (key === "0" || key === "5" || key === "8" || key === "10") {
      dynamicVatTags += `\n      <VatAmount${key}>${Math.round(taxGroups[key])}</VatAmount${key}>`;
    }
  }

  // Nội dung XML của hóa đơn (LƯU Ý: Không dùng CDATA bên trong vì bản thân XML này đã được bọc CDATA lúc ghép SOAP payload)
  const xmlInvData = `
<Invoices>
  <Inv>
    <key>${fkey}</key>
    <Invoice>
      <CusCode>${escapeXml(vatCustomerCode)}</CusCode>
      <CusName>${escapeXml(customerName)}</CusName>
      <CusAddress>${escapeXml(customerAddress)}</CusAddress>
      <CusPhone></CusPhone>
      <CusTaxCode>${escapeXml(customerTaxCode)}</CusTaxCode>
      <PaymentMethod>${escapeXml(paymentMethod)}</PaymentMethod>
      <EmailDeliver>${escapeXml(vatEmail)}</EmailDeliver>
      <Products>${productsXML}
      </Products>
      <Total>${Math.round(totalWithoutTax)}</Total>
      <VATRate>${taxRateHD}</VATRate>
      <VATAmount>${Math.round(totalTax)}</VATAmount>${dynamicVatTags}
      <Amount>${Math.round(totalWithTax)}</Amount>
      <AmountInWords>${escapeXml(docSoThanhChu(Math.round(totalWithTax)))}</AmountInWords>
      <ArisingDate>${Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy")}</ArisingDate>
    </Invoice>
  </Inv>
</Invoices>`;

  // ================= 3. ĐÓNG GÓI SOAP ENVELOPE (LƯU NHÁP) =================
  // Sử dụng thẻ <ImportInvByPattern> để hệ thống biết đây là lệnh Lưu nháp
  const soapPayload = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ImportInvByPattern xmlns="http://tempuri.org/">
      <Account>${USERNAME_WEB_ADMIN}</Account>
      <ACpass>${PASSWORD_WEB_ADMIN}</ACpass>
      <xmlInvData><![CDATA[${xmlInvData}]]></xmlInvData>
      <username>${USER_WS}</username>
      <password>${PASS_WS}</password>
      <convert>0</convert>
      <pattern>${PATTERN}</pattern>
      <serial>${SERIAL}</serial>
    </ImportInvByPattern>
  </soap:Body>
</soap:Envelope>`;

  // ================= 4. GỌI API VNPT =================
  const url = `${DOMAIN}/publishService.asmx`;
  console.log("Bắt đầu gửi tới:", url);
  console.log("Fkey (Nháp):", fkey);

  const options = {
    method: "post",
    contentType: "text/xml; charset=utf-8",
    headers: {
      "SOAPAction": "http://tempuri.org/ImportInvByPattern"
    },
    payload: soapPayload,
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    console.log("Status Code:", statusCode);
    console.log("Response Body:", responseBody);
    
    // Kiểm tra kết quả trả về từ hệ thống VNPT
    if (responseBody.includes("ERR:")) {
      console.error("GẶP LỖI TỪ VNPT. Hãy đọc mã lỗi ERR trong Response Body để biết nguyên nhân.");
      const errMatch = responseBody.match(/<ImportInvByPatternResult>(.*?)<\/ImportInvByPatternResult>/);
      const errMsg = errMatch && errMatch[1] ? errMatch[1] : responseBody;
      return { status: 400, message: "Lỗi từ VNPT: " + errMsg };
    } else if (responseBody.includes("OK:")) {
      console.log("THÀNH CÔNG! Hóa đơn đã được lưu nháp hợp lệ.");
      
      // Ghi lại FKey vào sheet AR_INV_HD
      if (rowIndex !== -1 && colHd["FKey"] !== undefined) {
        hdSheet.getRange(rowIndex, colHd["FKey"] + 1).setValue(fkey);
        console.log(`Đã lưu FKey: ${fkey} vào dòng ${rowIndex}, cột ${colHd["FKey"] + 1}`);
      }

      return { status: 200, fkey: fkey, customer: customerName, amountInWords: docSoThanhChu(totalWithTax) };
    } else {
      console.log("Kết quả:", responseBody);
      return { status: 500, message: "Phản hồi không xác định: " + responseBody };
    }
    
  } catch (error) {
    console.error("Lỗi hệ thống/Network:", error.message);
    return { status: 500, message: "Lỗi hệ thống: " + error.message };
  }
}