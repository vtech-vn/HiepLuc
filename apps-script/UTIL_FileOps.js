function renameAppSheetFiles() {
  const sheetName = "Attachment";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Lỗi: Không tìm thấy sheet có tên là '" + sheetName + "'");
    return;
  }

  // Lấy toàn bộ dữ liệu trong sheet
  const data = sheet.getDataRange().getValues();
  const headers = data[0]; // Dòng tiêu đề

  // Tìm vị trí các cột cần thiết (index bắt đầu từ 0)
  const docIdIndex = headers.indexOf("Doc_ID");
  const descriptionIndex = headers.indexOf("Description");
  const fileIndex = headers.indexOf("File");

  if (docIdIndex === -1 || descriptionIndex === -1 || fileIndex === -1) {
    SpreadsheetApp.getUi().alert("Lỗi: Không tìm thấy các cột Doc_ID, Description hoặc File trong dòng tiêu đề.");
    return;
  }

  // Lặp qua từng dòng dữ liệu (bắt đầu từ dòng thứ 2, tức là i=1)
  for (let i = 1; i < data.length; i++) {
    let docId = data[i][docIdIndex];
    let description = data[i][descriptionIndex];
    let filePath = data[i][fileIndex];

    // Chỉ xử lý nếu có đủ dữ liệu
    if (filePath && typeof filePath === 'string' && docId && description) {
      
      // Lấy tên file cũ từ đường dẫn (ví dụ: fa8ce28e.File.045507.013241.pdf)
      let pathParts = filePath.split('/');
      let oldFileName = pathParts[pathParts.length - 1];

      // Lấy phần đuôi file (ví dụ: pdf, png, jpg)
      let extension = oldFileName.split('.').pop();
      
      // Tạo tên file mới theo cấu trúc: Description + "." + Doc_ID + ".đuôi_file"
      let newFileName = description + "." + docId + "." + extension;

      // Nếu tên file đã được đổi đúng định dạng thì bỏ qua dòng này
      if (oldFileName === newFileName) {
        continue; 
      }

      // Tìm file trong Google Drive theo tên cũ
      let files = DriveApp.getFilesByName(oldFileName);

      if (files.hasNext()) {
        let file = files.next();

        // 1. Đổi tên file trực tiếp trên Google Drive
        file.setName(newFileName);

        // 2. Cập nhật lại đường dẫn mới cho cột File để AppSheet vẫn đọc được
        pathParts[pathParts.length - 1] = newFileName;
        let newFilePath = pathParts.join('/');

        // Ghi đè đường dẫn mới vào ô tương ứng trong Sheet
        sheet.getRange(i + 1, fileIndex + 1).setValue(newFilePath);

        Logger.log("Đã đổi tên: " + oldFileName + " -> " + newFileName);
      } else {
        Logger.log("Cảnh báo: Không tìm thấy file trong Drive: " + oldFileName);
      }
    }
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast("Đã hoàn thành quá trình đổi tên file!", "Thành công");
}