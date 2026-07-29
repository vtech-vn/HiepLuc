/**
 * ============================================================
 * FILE: MAIN_Router.gs
 * Chức năng: Điều phối chung (Router) cho các Web App
 * Mọi request HTTP gửi tới Apps Script đều đi qua hàm doGet này.
 * Có thể mở rộng thêm nhiều tính năng mới ở đây sau này.
 * ============================================================
 */

function doGet(e) {
  // 1. Nếu trên URL có biến invoice_id -> Chạy luồng Tạo Hóa Đơn VNPT
  if (e.parameter.invoice_id || e.parameter.invoiceId) {
    const id = e.parameter.invoice_id || e.parameter.invoiceId;
    const result = testDraftInvoiceVNPT_SOAP(id);
    
    // Trả về kết quả dạng Text đơn giản (không giao diện)
    if (result.status == 200) {
      return ContentService.createTextOutput("SUCCESS: Hóa đơn đã được gửi thành công. Fkey: " + result.fkey);
    } else {
      return ContentService.createTextOutput("ERROR: " + (result.message || "Lỗi không xác định"));
    }
  }
  
  // 2. Chạy luồng Dashboard nếu URL có biến view=dashboard
  if (e.parameter.view === 'dashboard') {
    var template = HtmlService.createTemplateFromFile('DASH_Financial_UI');
    return template.evaluate()
      .setTitle('Sales Dashboard - HiepLuc')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  // --- API ROUTING FOR GITHUB PAGES ---
  if (e.parameter.api === 'request_otp') {
    return handleRequestOtp(e);
  }
  
  if (e.parameter.api === 'verify_otp') {
    return handleVerifyOtp(e);
  }
  
  if (e.parameter.api === 'quoteData') {
    const quoteId = (e.parameter.quote_id || e.parameter.id || '').toString().trim();
    if (!quoteId) {
      return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Thiếu mã báo giá (quote_id).'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const data = getSheetData(quoteId);
    return ContentService.createTextOutput(JSON.stringify({success: true, data: data}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (e.parameter.api === 'dashboardData') {
    const session = e.parameter.session;
    let isAuthorized = false;
    
    if (session) {
      const email = PropertiesService.getScriptProperties().getProperty('SESSION_' + session);
      if (email && isEmailAllowed(email)) {
        isAuthorized = true;
      }
    }
    
    if (!isAuthorized) {
      return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(getDashboardData()).setMimeType(ContentService.MimeType.JSON);
  }

  // [TEMP DIAG] Kiểm tra dữ liệu 2 hóa đơn - XÓA SAU KHI DÙNG XONG
  if (e.parameter.api === 'diagInvoice') {
    const result = diagCheckInvoices();
    return ContentService.createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }


  // 3. Nếu không có invoice_id và không phải dashboard -> Mặc định chạy luồng In Báo Giá (Code.gs cũ)
  var template = HtmlService.createTemplateFromFile('QUOTE_UI');
  template.quoteId = e.parameter.quote_id || e.parameter.id || '';

  var html = template.evaluate()
    .setTitle('Báo Giá - HIỆP LỰC')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

// Hàm hỗ trợ cấp quyền (Chạy hàm này một lần trong Editor nếu gặp lỗi Permission)
function authorizeApp() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), "Xác thực Apps Script", "Bạn đã cấp quyền thành công.");
  console.log("Cấp quyền thành công!");
}

function handleRequestOtp(e) {
  const email = (e.parameter.email || '').toLowerCase().trim();
  if (!email) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Vui lòng nhập email'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (!isEmailAllowed(email)) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Email không có quyền xem báo cáo.'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  PropertiesService.getScriptProperties().setProperty('OTP_' + email, otp);
  
  // Send email
  try {
    MailApp.sendEmail({
      to: email,
      subject: "Mã xác thực Đăng nhập Dashboard",
      htmlBody: "<div style='font-family:sans-serif; padding: 20px;'>" +
                "<h2>Xác thực đăng nhập</h2>" +
                "<p>Mã xác thực (OTP) của bạn là: <strong style='font-size:24px; color:#1d4ed8;'>" + otp + "</strong></p>" +
                "<p>Vui lòng nhập mã này trên trang Dashboard để tiếp tục.</p></div>"
    });
    return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Đã gửi mã OTP đến email của bạn.'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Lỗi gửi email: ' + err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleVerifyOtp(e) {
  const email = (e.parameter.email || '').toLowerCase().trim();
  const otp = e.parameter.otp;
  
  const savedOtp = PropertiesService.getScriptProperties().getProperty('OTP_' + email);
  if (!savedOtp || savedOtp !== otp) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Mã OTP không đúng hoặc đã hết hạn.'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Generate Session
  PropertiesService.getScriptProperties().deleteProperty('OTP_' + email); // clear OTP
  const sessionId = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('SESSION_' + sessionId, email);
  
  return ContentService.createTextOutput(JSON.stringify({success: true, session: sessionId, email: email}))
    .setMimeType(ContentService.MimeType.JSON);
}

function isEmailAllowed(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Report_Email');
  if (!sheet) return false;
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toLowerCase() === email) {
      return true;
    }
  }
  return false;
}
