import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

export const OVERTIME_TEMPLATE_HEADERS = [
  'NIP',
  'Nama',
  'Email Address',
  'Project',
  'Total Overtime (Hours)',
  'Periode Overtime',
];

@Injectable()
export class ExcelService {
  readExcel(filePath: string): Record<string, any>[] {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }

  generateUploadTemplate(): Buffer {
    const sampleRows = [
      {
        NIP: '10001',
        Nama: 'Nama10',
        'Email Address': 'achmad.mutaqin@trans-cosmos.co.id',
        Project: 'Project93',
        'Total Overtime (Hours)': 2,
        'Periode Overtime': '01-15 Juni 2026',
      },
      {
        NIP: '10002',
        Nama: 'Nama11',
        'Email Address': 'achmad.mutaqin@trans-cosmos.co.id',
        Project: 'Project93',
        'Total Overtime (Hours)': 3,
        'Periode Overtime': '01-15 Juni 2026',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, {
      header: OVERTIME_TEMPLATE_HEADERS,
    });
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 20 },
      { wch: 35 },
      { wch: 15 },
      { wch: 22 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Overtime');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
