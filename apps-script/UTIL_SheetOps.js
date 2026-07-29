function deleteBlankRows() {
  
  var SS = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get sheets
  var sheets = SS.getSheets();
  
  // Loop through sheets. Delete blank rows in each sheet.
  for (var s=0; s < sheets.length; s++) {
    var currentSheet = sheets[s];
    var sheetName = sheets[s].getName();
    var searchDataRange = currentSheet.getRange(1,1,currentSheet.getMaxRows(),currentSheet.getMaxColumns()); // get the ENTIRE sheet. not just where the data is.
    var searchValues = searchDataRange.getValues();
    var numRows = searchValues.length;
    var numCols = searchDataRange.getNumColumns();
    var rowsToDel = [];
    var delRow = -1;
    var prevDelRow = -2;
    var rowClear = false;
    
    // Loop through Rows in this sheet
    for (var r=0; r < numRows; r++) {
      
      // Loop through columns in this row
      for (var c=0; c < numCols; c++) {
        if (searchValues[r][c].toString().trim() === "") {
          rowClear = true;
        } else {
          rowClear = false;
          break;
        }
      }
      
      // If row is clear, add it to rowsToDel
      if (rowClear) {
        if (prevDelRow === r-1) {
          rowsToDel[delRow][1] = parseInt(rowsToDel[delRow][1]) + 1;
        } else {
          rowsToDel.push([[r+1],[1]]);
          delRow += 1;
        }
        prevDelRow = r;
      }
    }
    
    
    Logger.log("numRows: " + numRows);
    Logger.log("rowsToDel.length: " + rowsToDel.length);
    
    // Delete blank rows in this sheet, if we have rows to delete.
    if (rowsToDel.length>0) {
      // We need to make sure we don't delete all rows in the sheet. Sheets must have at least one row.
      if (numRows === rowsToDel[0][1]) {
        // This means the number of rows in the sheet (numRows) equals the number of rows to be deleted in the first set of rows to delete (rowsToDel[0][1]).
        // Delete all but the first row.
        if (numRows > 1) {
          currentSheet.deleteRows(2,numRows-1);
        }
      } else {
        // Go through each set of rows to delete them.
        var rowsToDeleteLen = rowsToDel.length;  
        for (var rowDel = rowsToDeleteLen-1; rowDel >= 0; rowDel--) {
          currentSheet.deleteRows(rowsToDel[rowDel][0],rowsToDel[rowDel][1]);
        }
      }
    }
  }
}