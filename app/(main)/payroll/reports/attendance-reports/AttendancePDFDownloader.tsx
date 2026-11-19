"use client"

import React, { useState } from 'react';
import axios from 'axios';
import { FaDownload } from 'react-icons/fa';
import { CgSpinner } from 'react-icons/cg';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/app/hooks/use-current-user';
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';

const STATUS_LABELS: Record<string, string> = {
  P: 'Present',

  Leave: 'Leave',

  A: 'Absent',
  WO: 'Week Off',
  'Paid Days': 'Paid Days',
  MonthCount: 'Month Days',
};

const STATUS_FIELD_ORDER = [
  'P',

  'Leave',

  'A',
  'WO',
  'Paid Days',
  'MonthCount',
];
const getAttendanceValue = (info: any, code: string) => {
  if (!info) return 0;

  let possibleKeys: string[] = [];

  if (code === 'Holiday') {
    possibleKeys = ['holiday_value', 'Holiday_Value', 'holiday value'];
  } else if (code === 'Leave') {
    // Leave = EL + ML + LWP + PL + L + PLA
    const getValue = (key: string) => {
      const actualKey = Object.keys(info).find(
        k => k.trim() === key.trim()
      );

      return actualKey ? Number(info[actualKey] || 0) : 0;
    };

    return (
      getValue('EL') +
      getValue('ML') +
      getValue('LWP') +
      getValue('PL') +
      getValue('L') +
      getValue('PLA')
    );
  } else {
    possibleKeys = [code];
  }

  const actualKey = Object.keys(info).find(
    key => possibleKeys.some(
      possibleKey => key.trim() === possibleKey.trim()
    )
  );

  if (actualKey) {
    const value = info[actualKey];

    return value === undefined || value === null || value === ''
      ? 0
      : value;
  }

  return 0;
};

const AttendancePDFDownloader = ({
  url,
  text,
  payload,
  className = '',
  icon,
}: {
  url: string,
  text: string,
  payload: any,
  className?: string,
  icon?: React.ReactNode,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const user = useCurrentUser();

  // ---- Page constants (Landscape A3-ish) ----
  const PAGE_W = 1190;
  const PAGE_H = 842;
  const MARGIN = 22;
  const PAD = 16;
  const LABEL_W = 90;
  const CONTENT_W = PAGE_W - MARGIN * 2 - PAD * 2 - LABEL_W;
  const ROW_H = 13;
  const BLOCK_GAP = 12;
  const SUMMARY_FONT_SIZE = 7.5;
  const SUMMARY_GAP = 16;

  const buildDateDayMap = (dateFromISO: string, datetoISO: string) => {
    const map: Record<string, string> = {};
    if (!dateFromISO || !datetoISO) return map;
    const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let cur = new Date(dateFromISO);
    const end = new Date(datetoISO);
    let guard = 0;
    while (cur <= end && guard < 400) {
      const key = `${String(cur.getDate()).padStart(2, '0')}-${monthAbbr[cur.getMonth()]}`;
      map[key] = dayAbbr[cur.getDay()];
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    return map;
  };

  const wrapSummaryFields = (
    font: PDFFont,
    fields: [string, any][],
    maxWidth: number,
    fontSize: number,
    gap: number
  ) => {
    const columns = 3;
    const columnWidth = maxWidth / columns;

    // Fixed space for label so ALL values start at same position
    const labelWidth = 105;

    const lines: {
      label: string;
      value: any;
      x: number;
    }[][] = [];

    for (let i = 0; i < fields.length; i += columns) {
      const currentLine: {
        label: string;
        value: any;
        x: number;
      }[] = [];

      for (let j = 0; j < columns; j++) {
        const index = i + j;

        if (index >= fields.length) {
          break;
        }

        const [label, value] = fields[index];

        const safeValue =
          value === undefined ||
            value === null ||
            value === ''
            ? 0
            : value;

        currentLine.push({
          label,
          value: safeValue,
          x: j * columnWidth,
        });
      }

      lines.push(currentLine);
    }

    return lines;
  };

  const handleDownload = async () => {
    setIsLoading(true);
    setProgress('Fetching data...');
    try {
      const response = await axios.post(url, payload, {
        headers: { compcode: user?.Comp_Code, name: user?.name, token: user?.email }
      });

      const { companyName, reportName, rows, dateFrom, dateto, reporttype } = response.data;

      if (!rows || rows.length === 0) {
        alert('No data found for selected filters.');
        setIsLoading(false);
        return;
      }

      const dateFromStr = new Date(dateFrom).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
      const dateToStr = new Date(dateto).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

      const allKeys = Object.keys(rows[0]);
      const dateColRegex = /^\d{2}-[A-Za-z]{3}$/;
      const dateCols = allKeys.filter(k => dateColRegex.test(k));

      const dateDayMap = buildDateDayMap(dateFrom, dateto);

      const grouped: Record<string, any[]> = {};

      rows.forEach((r: any) => {
        const empCode = r.Empcode ?? r.Emp_Code ?? r.empcode ?? r.emp_code;

        if (!empCode) {
          console.log("EMP CODE MISSING:", r);
          return;
        }

        if (!grouped[empCode]) {
          grouped[empCode] = [];
        }

        grouped[empCode].push(r);
      });

      const empCodes = Object.keys(grouped);

      console.log("TOTAL ROWS:", rows.length);
      console.log("TOTAL EMPLOYEES:", empCodes.length);
      console.log("FIRST ROW DATA:", rows[0]);
      console.log("FIRST EMPLOYEE ROWS:", grouped[empCodes[0]]);

      setProgress(`Building PDF: 0 / ${empCodes.length}`);

      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const colW = CONTENT_W / Math.max(dateCols.length, 1);
      const summaryMaxWidth = PAGE_W - MARGIN * 2 - PAD * 2;

      let page: PDFPage;
      let y = 0;

      const drawPageHeader = () => {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        let hy = PAGE_H - MARGIN;
        const t1w = fontBold.widthOfTextAtSize(companyName, 16);
        page.drawText(companyName, { x: PAGE_W / 2 - t1w / 2, y: hy, size: 16, font: fontBold });
        hy -= 18;
        const titleLine = `${reportName}   From ${dateFromStr} to ${dateToStr}`;
        const t2w = fontRegular.widthOfTextAtSize(titleLine, 10);
        page.drawText(titleLine, { x: PAGE_W / 2 - t2w / 2, y: hy, size: 10, font: fontRegular });
        y = hy - 20;
      };

      drawPageHeader();

      const dataRowLabels = reporttype == 2
        ? ['In Time', 'Out Time', 'Hours Worked', 'Day Status']
        : ['Status'];

      const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.7, color: rgb(0, 0, 0) });
      };

      const drawText = (t: string, x: number, yy: number, size = 8, bold = false) => {
        page.drawText(String(t ?? ''), { x, y: yy, size, font: bold ? fontBold : fontRegular, color: rgb(0, 0, 0) });
      };

      const drawLabelValue = (label: string, value: any, x: number, yy: number, valueOffset: number) => {
        drawText(label, x, yy, 8, true);
        drawText(value ?? '', x + valueOffset, yy, 9, true);
      };

      // Precompute block height for a given employee so we know when to page-break
      const computeBlockHeight = (empRows: any[]) => {
        const info = empRows[0];
        const summaryFields: [string, any][] = [
          ['Present', getAttendanceValue(info, 'P')],

          ['Leave', getAttendanceValue(info, 'Leave')],

          ['Absent', getAttendanceValue(info, 'A')],
          ['Week Off', getAttendanceValue(info, 'WO')],
          ['Paid Days', getAttendanceValue(info, 'Paid Days')],
          ['Month Days', getAttendanceValue(info, 'MonthCount')],
        ];
        const summaryLines = wrapSummaryFields(fontRegular, summaryFields, summaryMaxWidth, SUMMARY_FONT_SIZE, SUMMARY_GAP);
        const dataLineCount = dataRowLabels.length;

        return {
          height:
            PAD * 2 +
            4 * ROW_H + 8 +          // meta info (2 lines)
            2 * ROW_H + 8 +          // date + day
            summaryLines.length * (ROW_H - 2) + 8 +
            dataLineCount * ROW_H,
          summaryLines,
        };
      };

      const drawEmployeeBlock = (
        empRows: any[],
        summaryLines: {
          label: string;
          value: any;
          x: number;
        }[][]
      ) => {
        const info = empRows[0];

        const byLabel: Record<string, any> = {};

        if (reporttype == 2) {
          empRows.forEach((r: any) => {
            const label = String(r.Type || '').trim();

            if (label) {
              byLabel[label] = r;
            }
          });
        } else {
          byLabel['Status'] = info;
        }

        const blockLeft = MARGIN;
        const blockRight = PAGE_W - MARGIN;



        y -= ROW_H + 4;

        const blockTop = y;
        let ly = blockTop - PAD;

        // ---- Section 1: employee meta as a proper grid (2 rows x 5 cols) ----
        const c1 = blockLeft + PAD;
        const c2 = blockLeft + 245;
        const c3 = blockLeft + 480;
        const c4 = blockLeft + 710;
        const c5 = blockLeft + 945;
        const metaTop = ly + ROW_H + 4;

        const joiningDateStr = info.JoiningDate ? new Date(info.JoiningDate).toLocaleDateString('en-GB') : '';

        drawLabelValue(
          'Emp Code',
          info.Empcode ?? info.Emp_Code ?? info.empcode ?? info.emp_code ?? '',
          c1,
          ly,
          58
        );



        drawLabelValue(
          'Emp Name',
          (info.EmployeeName || '').trim(),
          c3,
          ly,
          58
        );

        ly -= ROW_H;
        drawLine(blockLeft, ly, blockRight, ly);
        ly -= 10;

        // Line 2
        drawLabelValue('Joining Date', joiningDateStr, c1, ly, 78);
        drawLabelValue('Region', info.Region || '', c2, ly, 78);
        drawLabelValue('Channel', info.Channel || '', c3, ly, 78);
        drawLabelValue('Department', info.Department || '', c4, ly, 78);

        ly -= ROW_H;

        // Line 3
        drawLabelValue('Cluster', info.Cluster || '', c1, ly, 78);
        drawLabelValue('Location', info.Location || '', c2, ly, 78);
        drawLabelValue('Section', info.Section || '', c3, ly, 78);
        drawLabelValue('Designation', info.Designation || '', c4, ly, 78);

        ly -= 8;


        const metaBottom = ly + 4;



        drawLine(blockLeft, ly, blockRight, ly);
        ly -= 10;

        // ---- Section 2: Date + Day row ----
        drawText('Date', blockLeft + PAD, ly, 8, true);
        dateCols.forEach((d, i) => {
          drawText(d.split('-')[0], blockLeft + PAD + LABEL_W + i * colW, ly, 7.5);
        });
        ly -= ROW_H;

        drawText('Day', blockLeft + PAD, ly, 8, true);
        dateCols.forEach((d, i) => {
          drawText(dateDayMap[d] || '', blockLeft + PAD + LABEL_W + i * colW, ly, 7.5);
        });
        ly -= 8;

        drawLine(blockLeft, ly, blockRight, ly);
        ly -= 10;

        summaryLines.forEach(line => {
          line.forEach(item => {
            const fieldX = blockLeft + PAD + item.x;

            // Label
            drawText(
              `${item.label}:`,
              fieldX,
              ly,
              SUMMARY_FONT_SIZE,
              true
            );

            // Value starts at SAME position for every field
            drawText(
              String(item.value),
              fieldX + 105,
              ly,
              SUMMARY_FONT_SIZE,
              true
            );
          });

          ly -= (ROW_H - 2);
        });
        ly -= 6;

        drawLine(blockLeft, ly, blockRight, ly);
        ly -= 10;

        // ---- Section 4: per-date data rows ----
        // ---- Section 4: per-date data rows ----
        dataRowLabels.forEach(label => {
          const source = byLabel[label];

          drawText(label, blockLeft + PAD, ly, 8, true);

          if (source) {
            dateCols.forEach((d, i) => {
              let value = source[d] ?? '';

              // In Time / Out Time me seconds remove karo
              if (
                (label === 'In Time' || label === 'Out Time') &&
                typeof value === 'string'
              ) {
                value = value.replace(/:\d{2}$/, '');
              }

              drawText(
                String(value),
                blockLeft + PAD + LABEL_W + i * colW,
                ly,
                7.5
              );
            });
          }

          ly -= ROW_H;
        });

        const blockBottom = ly + ROW_H - PAD + 4;

        page.drawRectangle({
          x: blockLeft,
          y: blockBottom,
          width: blockRight - blockLeft,
          height: blockTop - blockBottom,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        y = blockBottom - BLOCK_GAP;
      };

      const BATCH_SIZE = 20;
      for (let i = 0; i < empCodes.length; i++) {
        const empRows = grouped[empCodes[i]];
        const { height, summaryLines } = computeBlockHeight(empRows);

        if (y - height < MARGIN) {
          drawPageHeader();
        }
        drawEmployeeBlock(empRows, summaryLines);

        if (i % BATCH_SIZE === 0) {
          setProgress(`Building PDF: ${i + 1} / ${empCodes.length}`);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      setProgress('Saving file...');
      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Attendance_Report_${new Date().toDateString()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('PDF download error:', error);
      alert('Failed to generate PDF. Check console for details.');
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  };


return (
  <button
    type="button"
    onClick={handleDownload}
    disabled={isLoading}
    className={`inline-flex h-[24px] min-w-[48px] items-center justify-center gap-1 rounded-[7px] border border-[#e2e8f0] bg-white px-2 text-[10px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-slate-700 ${className}`}
  >
    {isLoading ? (
      <CgSpinner className="animate-spin" size={11} />
    ) : (
      icon || <FaDownload size={11} />
    )}

    <span>{isLoading ? "PDF" : text}</span>
  </button>
);

};

export default AttendancePDFDownloader;