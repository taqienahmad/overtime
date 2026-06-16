const XLSX = require("xlsx");

function readExcel(filePath) {

  const workbook =
    XLSX.readFile(filePath);

  const sheetName =
    workbook.SheetNames[0];

  const worksheet =
    workbook.Sheets[sheetName];

  const rows =
    XLSX.utils.sheet_to_json(
      worksheet,
      {
        defval: ""
      }
    );

  return rows;

}

module.exports = {
  readExcel
};