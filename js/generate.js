/**
 * generate.js — Excel Generation Engine for EduVerify 2.0
 *
 * Inputs:
 *   1. Student List Excel: columns → roll_number, student_name
 *   2. Staff/Course Excel: columns → staff_id, staff_name, subject_code,
 *      subject_name, department, section, year, batch, academic_year
 *
 * Output:
 *   Cross-join: each student × each subject = one row
 *   Produces a perfect Excel matching the Good.xlsx format.
 */

window.EVGenerate = (function () {

  const REQUIRED_STUDENT_COLS = ['roll_number', 'student_name'];
  const REQUIRED_STAFF_COLS   = [
    'staff_id', 'staff_name', 'subject_code', 'subject_name',
    'department', 'section', 'year', 'batch', 'academic_year'
  ];
  const OUTPUT_COLS = [
    'department', 'roll_number', 'student_name', 'staff_id', 'staff_name',
    'subject_code', 'subject_name', 'section', 'year', 'batch', 'academic_year'
  ];

  /* ── Normalize column names from uploaded Excel ───────────────── */
  const normalizeColName = (name) =>
    String(name ?? '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const normalizeRows = (rawRows) => {
    return rawRows
      .filter(row => Object.values(row).some(v => String(v ?? '').trim() !== ''))
      .map((row, idx) => {
        const out = { _rowIndex: idx + 2 };
        Object.entries(row).forEach(([k, v]) => {
          out[normalizeColName(k)] = String(v ?? '').trim();
        });
        return out;
      });
  };

  /* ── Validate uploaded columns ─────────────────────────────────── */
  const validateColumns = (rows, requiredCols) => {
    if (!rows.length) return { ok: false, missing: requiredCols };
    const sample = rows[0];
    const missing = requiredCols.filter(col => !(col in sample));
    return { ok: missing.length === 0, missing };
  };

  /* ── Main Generation Function ──────────────────────────────────── */
  const generate = (studentRows, staffRows) => {
    const students = normalizeRows(studentRows);
    const staff = normalizeRows(staffRows);

    // Validate columns
    const studentCheck = validateColumns(students, REQUIRED_STUDENT_COLS);
    if (!studentCheck.ok) {
      return { ok: false, error: `Student list is missing columns: ${studentCheck.missing.join(', ')}` };
    }
    const staffCheck = validateColumns(staff, REQUIRED_STAFF_COLS);
    if (!staffCheck.ok) {
      return { ok: false, error: `Staff/Course list is missing columns: ${staffCheck.missing.join(', ')}` };
    }

    // Deduplicate students by roll_number (keep first occurrence)
    const uniqueStudents = [];
    const seenRolls = new Set();
    students.forEach(s => {
      const roll = s.roll_number?.trim();
      if (roll && !seenRolls.has(roll.toLowerCase())) {
        seenRolls.add(roll.toLowerCase());
        uniqueStudents.push(s);
      }
    });

    // Deduplicate subjects by subject_code (keep first occurrence)
    const uniqueSubjects = [];
    const seenCodes = new Set();
    staff.forEach(s => {
      const code = s.subject_code?.trim();
      if (code && !seenCodes.has(code.toLowerCase())) {
        seenCodes.add(code.toLowerCase());
        uniqueSubjects.push(s);
      }
    });

    if (uniqueStudents.length === 0) return { ok: false, error: 'Student list is empty.' };
    if (uniqueSubjects.length === 0) return { ok: false, error: 'Staff/Course list is empty.' };

    // Cross-join: each student × each subject
    const outputRows = [];
    uniqueStudents.forEach(student => {
      uniqueSubjects.forEach(subject => {
        outputRows.push({
          department:    subject.department,
          roll_number:   student.roll_number,
          student_name:  student.student_name,
          staff_id:      subject.staff_id,
          staff_name:    subject.staff_name,
          subject_code:  subject.subject_code,
          subject_name:  subject.subject_name,
          section:       subject.section,
          year:          subject.year,
          batch:         subject.batch,
          academic_year: subject.academic_year,
        });
      });
    });

    return {
      ok: true,
      rows: outputRows,
      stats: {
        students: uniqueStudents.length,
        subjects: uniqueSubjects.length,
        totalRows: outputRows.length
      }
    };
  };

  /* ── Download as Excel ─────────────────────────────────────────── */
  const downloadExcel = (outputRows, filename = 'Feedback_Excel.xlsx') => {
    if (typeof XLSX === 'undefined') { window.EV.Toast.error('SheetJS not loaded.'); return; }

    // Header row — exactly matching Good.xlsx column names
    const headerRow = OUTPUT_COLS; // ['department', 'roll_number', ...]

    const data = [
      headerRow,
      ...outputRows.map(row => OUTPUT_COLS.map(col => row[col] ?? ''))
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto column widths
    ws['!cols'] = data[0].map((_, ci) => ({
      wch: Math.max(...data.map(row => String(row[ci] ?? '').length)) + 3
    }));

    // Style header row (bold)
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: '4361EE' } },
          alignment: { horizontal: 'center' }
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Feedback Data');
    XLSX.writeFile(wb, filename);
  };

  /* ── Download as CSV ───────────────────────────────────────────── */
  const downloadCsv = (outputRows, filename = 'Feedback_Excel.csv') => {
    const data = [
      OUTPUT_COLS,
      ...outputRows.map(row => OUTPUT_COLS.map(col => row[col] ?? ''))
    ];
    window.EV.Download.csv(data, filename);
  };

  /* ── Preview HTML Table ────────────────────────────────────────── */
  const buildPreviewTable = (outputRows, maxRows = 20) => {
    const preview = outputRows.slice(0, maxRows);
    const headers = OUTPUT_COLS.map(c => `<th>${c}</th>`).join('');
    const rows = preview.map(row =>
      `<tr>${OUTPUT_COLS.map(col => `<td title="${row[col] ?? ''}">${row[col] ?? ''}</td>`).join('')}</tr>`
    ).join('');

    return `
      <table class="preview-table">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${outputRows.length > maxRows ? `<div style="text-align:center;padding:0.75rem;font-size:0.78rem;color:var(--text-muted)">Showing first ${maxRows} of ${outputRows.length} rows</div>` : ''}
    `;
  };

  return {
    generate,
    downloadExcel,
    downloadCsv,
    buildPreviewTable,
    REQUIRED_STUDENT_COLS,
    REQUIRED_STAFF_COLS,
    OUTPUT_COLS
  };

})();
