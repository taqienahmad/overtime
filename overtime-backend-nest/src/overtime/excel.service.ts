import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

export const OVERTIME_TEMPLATE_HEADERS = [
  'No.', 'Date', 'ID', 'Full Name', 'Branch', 'Job Position', 'Schedule',
  'Shift', 'Duty On (Before)', 'Duty Off (Before)', 'Duration (Before)',
  'Break (After)', 'OT (After)', 'Duration (After)',
  'SPL Total Break', 'SPL Total OT',
  'Actual Duty On', 'Actual Duty Off', 'Code',
  'SPL Payment Total',
  'OT Calc 1.5', 'OT Calc 2', 'OT Calc 3', 'OT Calc 4',
  'SPL Indeks Total', 'Overtime Paid', 'Note',
];

@Injectable()
export class ExcelService {
  readExcel(filePath: string): Record<string, any>[] {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const allRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    if (allRows.length < 3) return [];

    const h1 = allRows[0] as any[]; // main header row
    const h2 = allRows[1] as any[]; // sub-header row

    // ---- helpers ----
    const find1 = (test: (v: string) => boolean) =>
      h1.findIndex((v: any) => test(String(v).toLowerCase().trim()));

    const find2From = (start: number, test: (v: string) => boolean) => {
      for (let c = start; c < start + 8 && c < h2.length; c++) {
        if (test(String(h2[c]).toLowerCase().trim())) return c;
      }
      return -1;
    };

    // ---- single-column headers (row 1) ----
    const COL_NO           = find1(v => v === 'no.');
    const COL_DATE         = COL_NO >= 0 ? COL_NO + 1 : 1;
    const COL_ID           = find1(v => v === 'id');
    const COL_NAME         = find1(v => v === 'full name');
    const COL_BRANCH       = find1(v => v === 'branch');
    const COL_JOB          = find1(v => v === 'job position');
    const COL_SCHEDULE     = find1(v => v === 'schedule');
    const COL_SPL_PAYMENT  = find1(v => v.includes('spl payment'));
    const COL_SPL_INDEKS   = find1(v => v.includes('indeks') || v.includes('index'));
    const COL_OT_PAID      = find1(v => v.includes('overtime paid'));
    const COL_NOTE         = find1(v => v === 'note');

    // ---- section headers → sub-columns detected from row 2 ----
    const SEC_BEFORE = find1(v => v.includes('spl before'));
    const COL_SHIFT          = SEC_BEFORE >= 0 ? find2From(SEC_BEFORE, v => v === 'shift') : -1;
    const COL_DUTY_ON_B      = SEC_BEFORE >= 0 ? find2From(SEC_BEFORE, v => v === 'duty on') : -1;
    const COL_DUTY_OFF_B     = SEC_BEFORE >= 0 ? find2From(SEC_BEFORE, v => v === 'duty off') : -1;
    const COL_DURATION_B     = SEC_BEFORE >= 0 ? find2From(SEC_BEFORE, v => v === 'duration') : -1;

    const SEC_AFTER = find1(v => v.includes('spl after'));
    const COL_BREAK_A        = SEC_AFTER >= 0 ? find2From(SEC_AFTER, v => v === 'break') : -1;
    const COL_OT_A           = SEC_AFTER >= 0 ? find2From(SEC_AFTER, v => v === 'ot') : -1;
    const COL_DURATION_A     = SEC_AFTER >= 0 ? find2From(SEC_AFTER, v => v === 'duration') : -1;

    const SEC_SPLTOTAL = find1(v => (v.includes('spl') && v.includes('total') && !v.includes('payment') && !v.includes('indeks') && !v.includes('index')));
    const COL_SPL_BREAK      = SEC_SPLTOTAL >= 0 ? find2From(SEC_SPLTOTAL, v => v === 'break') : -1;
    const COL_SPL_OT         = SEC_SPLTOTAL >= 0 ? find2From(SEC_SPLTOTAL, v => v === 'ot') : -1;

    const SEC_ACTUAL = find1(v => v.includes('actual'));
    const COL_ACT_DUTY_ON    = SEC_ACTUAL >= 0 ? find2From(SEC_ACTUAL, v => v === 'duty on') : -1;
    const COL_ACT_DUTY_OFF   = SEC_ACTUAL >= 0 ? find2From(SEC_ACTUAL, v => v === 'duty off') : -1;
    const COL_CODE            = SEC_ACTUAL >= 0 ? find2From(SEC_ACTUAL, v => v === 'code') : -1;

    const SEC_CALC = find1(v => v.includes('overtime calculate') || v.includes('overtime calc'));
    const COL_CALC_1_5       = SEC_CALC >= 0 ? find2From(SEC_CALC, v => v === '1.5') : -1;
    const COL_CALC_2         = SEC_CALC >= 0 ? find2From(SEC_CALC, v => v === '2') : -1;
    const COL_CALC_3         = SEC_CALC >= 0 ? find2From(SEC_CALC, v => v === '3') : -1;
    const COL_CALC_4         = SEC_CALC >= 0 ? find2From(SEC_CALC, v => v === '4') : -1;

    const num = (v: any) => {
      let s = String(v ?? '').trim();
      if (!s) return 0;
      const hasComma = s.includes(',');
      const hasDot = s.includes('.');
      if (hasComma && hasDot) {
        // Determine decimal separator by which symbol appears last
        if (s.lastIndexOf('.') > s.lastIndexOf(',')) {
          // US format: 1,234.56 → remove commas
          s = s.replace(/,/g, '');
        } else {
          // Indonesian/European format: 1.234,56 → remove dots, comma→dot
          s = s.replace(/\./g, '').replace(',', '.');
        }
      } else if (hasComma) {
        const afterComma = s.split(',').pop() ?? '';
        // If exactly 3 digits after comma → thousands separator (e.g. 70,000)
        s = afterComma.length === 3 ? s.replace(',', '') : s.replace(',', '.');
      }
      return parseFloat(s) || 0;
    };
    const str = (v: any) => String(v ?? '').trim();

    const result: Record<string, any>[] = [];

    for (let i = 2; i < allRows.length; i++) {
      const row = allRows[i] as any[];
      if (!row || row.length === 0) continue;

      const rowNo = str(row[COL_NO]);
      const rowId = str(row[COL_ID]);

      if (rowNo === 'no.' || rowId === 'id') continue;
      if (!rowNo || isNaN(Number(rowNo)) || Number(rowNo) <= 0) continue;
      if (!rowId) continue;

      const totalHours = COL_SPL_PAYMENT >= 0 ? num(row[COL_SPL_PAYMENT]) : 0;

      result.push({
        // existing fields
        NIP:                       rowId,
        Nama:                      str(row[COL_NAME]),
        Project:                   str(row[COL_BRANCH]),
        'Total Overtime (Hours)':  totalHours,
        'Periode Overtime':        str(row[COL_DATE]),
        'Email Address':           '',
        // new detail fields
        job_position:              str(row[COL_JOB]),
        schedule:                  str(row[COL_SCHEDULE]),
        shift:                     str(row[COL_SHIFT]),
        duty_on_before:            str(row[COL_DUTY_ON_B]),
        duty_off_before:           str(row[COL_DUTY_OFF_B]),
        duration_before:           COL_DURATION_B  >= 0 ? num(row[COL_DURATION_B])  : null,
        break_after:               COL_BREAK_A     >= 0 ? num(row[COL_BREAK_A])     : null,
        ot_after:                  COL_OT_A        >= 0 ? num(row[COL_OT_A])        : null,
        duration_after:            COL_DURATION_A  >= 0 ? num(row[COL_DURATION_A])  : null,
        spl_total_break:           COL_SPL_BREAK   >= 0 ? num(row[COL_SPL_BREAK])   : null,
        spl_total_ot:              COL_SPL_OT      >= 0 ? num(row[COL_SPL_OT])      : null,
        actual_duty_on:            str(row[COL_ACT_DUTY_ON]),
        actual_duty_off:           str(row[COL_ACT_DUTY_OFF]),
        attendance_code:           str(row[COL_CODE]),
        ot_calc_1_5:               COL_CALC_1_5 >= 0 ? num(row[COL_CALC_1_5]) : null,
        ot_calc_2:                 COL_CALC_2   >= 0 ? num(row[COL_CALC_2])   : null,
        ot_calc_3:                 COL_CALC_3   >= 0 ? num(row[COL_CALC_3])   : null,
        ot_calc_4:                 COL_CALC_4   >= 0 ? num(row[COL_CALC_4])   : null,
        spl_indeks_total:          COL_SPL_INDEKS >= 0 ? num(row[COL_SPL_INDEKS]) : null,
        overtime_paid:             COL_OT_PAID    >= 0 ? num(row[COL_OT_PAID])    : null,
        note:                      str(row[COL_NOTE]),
      });
    }

    return result;
  }

  generateUploadTemplate(): Buffer {
    const sample = [
      {
        'No.': 1, 'Date': '06 Aug 2025', 'ID': '2231179',
        'Full Name': 'Elsi Setyana', 'Branch': 'SMG TIKTOK PJ',
        'Job Position': 'Team Leader SPS TIKTOK PJ SMG', 'Schedule': 'S1',
        'Shift': '', 'Duty On (Before)': '11:00', 'Duty Off (Before)': '20:00', 'Duration (Before)': '0.00',
        'Break (After)': '0.00', 'OT (After)': '2.00', 'Duration (After)': '2.00',
        'SPL Total Break': '0.00', 'SPL Total OT': '2.00',
        'Actual Duty On': '10:34', 'Actual Duty Off': '22:11', 'Code': 'H',
        'SPL Payment Total': 2,
        'OT Calc 1.5': 1, 'OT Calc 2': 1, 'OT Calc 3': 0, 'OT Calc 4': 0,
        'SPL Indeks Total': 3.5, 'Overtime Paid': 95693.64, 'Note': '',
      },
      {
        'No.': 2, 'Date': '02 Aug 2025', 'ID': '2221412',
        'Full Name': 'Irma Rosyanti Sidauruk', 'Branch': 'SMG TIKTOK PJ',
        'Job Position': 'Agent SPS TIKTOK PJ SMG', 'Schedule': 'S4',
        'Shift': '', 'Duty On (Before)': '13:00', 'Duty Off (Before)': '22:00', 'Duration (Before)': '2.00',
        'Break (After)': '0.00', 'OT (After)': '2.00', 'Duration (After)': '0.00',
        'SPL Total Break': '0.00', 'SPL Total OT': '2.00',
        'Actual Duty On': '10:55', 'Actual Duty Off': '22:00', 'Code': 'H',
        'SPL Payment Total': 2,
        'OT Calc 1.5': 1, 'OT Calc 2': 1, 'OT Calc 3': 0, 'OT Calc 4': 0,
        'SPL Indeks Total': 3.5, 'Overtime Paid': 70000, 'Note': '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sample, { header: OVERTIME_TEMPLATE_HEADERS });
    worksheet['!cols'] = OVERTIME_TEMPLATE_HEADERS.map(() => ({ wch: 16 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Overtime');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
