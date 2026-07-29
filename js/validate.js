/**
 * validate.js — Full Validation Engine (Browser-Side Port of validationEngine.js)
 * All 10 rules run 100% in the browser. No server needed.
 */

window.EVValidate = (function () {

  const MANDATORY_COLS = [
    'department', 'roll_number', 'student_name', 'staff_id',
    'staff_name', 'subject_code', 'subject_name', 'section',
    'year', 'batch', 'academic_year'
  ];

  const ROLL_PATTERN = /^[A-Za-z0-9]{5,20}$/;

  /* ── Helpers ─────────────────────────────────────────────────────── */
  const isEmpty = (val) => val === null || val === undefined || String(val).trim() === '';
  const norm = (val) => String(val ?? '').trim().toLowerCase();

  const makeError = (ruleId, severity, errorType, desc, fix, extras = {}) => ({
    severity, ruleId, errorType,
    rowNumber: extras.rowNumber || null,
    columnName: extras.columnName || null,
    rollNumber: extras.rollNumber || null,
    studentName: extras.studentName || null,
    description: desc,
    suggestedFix: fix
  });

  /* ── Rule 2: Empty File ─────────────────────────────────────────── */
  const rule2 = (rows) => {
    if (rows.length === 0) {
      return [makeError(2, 'error', 'Empty File',
        'The uploaded file has no data rows.',
        'Please upload a file containing student feedback data.')];
    }
    return [];
  };

  /* ── Rule 3: Required Column Check ─────────────────────────────── */
  const rule3 = (rows) => {
    const errors = [];
    if (rows.length === 0) return errors;
    const sampleRow = rows[0];
    const missing = MANDATORY_COLS.filter(col => !(col in sampleRow));
    if (missing.length > 0) {
      errors.push(makeError(3, 'error', 'Missing Required Columns',
        `The file is missing these required columns: ${missing.join(', ')}.`,
        'Ensure your Excel file has all 11 required column headers (see the column guide below).',
        {}));
    }
    return errors;
  };

  /* ── Rule 4: Blank Cells in Mandatory Columns ───────────────────── */
  const rule4 = (rows) => {
    const errors = [];
    rows.forEach(row => {
      MANDATORY_COLS.forEach(col => {
        if (isEmpty(row[col])) {
          errors.push(makeError(4, 'error', 'Missing Information',
            `The "${col}" column is empty in row ${row._rowIndex}.`,
            `Please fill in the missing "${col}" value in the Excel file.`,
            { rowNumber: row._rowIndex, columnName: col, rollNumber: row.roll_number, studentName: row.student_name }
          ));
        }
      });
    });
    return errors;
  };

  /* ── Rule 5: Exact Duplicate Rows ──────────────────────────────── */
  const rule5 = (rows) => {
    const errors = [];
    const seen = new Map();
    rows.forEach(row => {
      const key = MANDATORY_COLS.map(c => norm(row[c])).join('||');
      if (seen.has(key)) {
        errors.push(makeError(5, 'error', 'Exact Duplicate Row',
          `Row ${row._rowIndex} is exactly the same as Row ${seen.get(key)}.`,
          'Delete the extra duplicate row from the file.',
          { rowNumber: row._rowIndex, rollNumber: row.roll_number, studentName: row.student_name }
        ));
      } else {
        seen.set(key, row._rowIndex);
      }
    });
    return errors;
  };

  /* ── Rule 6: Duplicate Student + Subject Combo ──────────────────── */
  const rule6 = (rows) => {
    const errors = [];
    const seen = new Map();
    rows.forEach(row => {
      const key = `${norm(row.roll_number)}||${norm(row.subject_code)}`;
      if (seen.has(key)) {
        errors.push(makeError(6, 'error', 'Rated Same Subject Twice',
          `Student (Roll: ${row.roll_number}) rated subject "${row.subject_code}" more than once (also in row ${seen.get(key)}).`,
          'Delete the duplicate row so the student rates this subject only once.',
          { rowNumber: row._rowIndex, rollNumber: row.roll_number, studentName: row.student_name, columnName: 'subject_code' }
        ));
      } else {
        seen.set(key, row._rowIndex);
      }
    });
    return errors;
  };

  /* ── Rule 7: Expected Student Count ────────────────────────────── */
  const rule7 = (rows, expectedCount) => {
    const errors = [];
    if (!expectedCount || isNaN(parseInt(expectedCount))) return errors;
    const expected = parseInt(expectedCount);
    const uniqueRolls = new Set(rows.map(r => norm(r.roll_number)).filter(r => r !== ''));
    const actual = uniqueRolls.size;
    const diff = expected - actual;
    if (diff > 0) {
      errors.push(makeError(7, 'error', 'Missing Students',
        `Expected ${expected} students, but only found ${actual}. ${diff} student(s) are missing.`,
        `Add the missing ${diff} student(s) to the file, or correct the expected count to ${actual}.`
      ));
    } else if (diff < 0) {
      errors.push(makeError(7, 'error', 'Extra Students Found',
        `Expected ${expected} students, but found ${actual}. There are ${Math.abs(diff)} extra student(s).`,
        `Remove the extra ${Math.abs(diff)} student(s), or correct the expected count to ${actual}.`
      ));
    }
    return errors;
  };

  /* ── Rule 8/9/10: Subject Count Per Student ─────────────────────── */
  const rule8_9_10 = (rows, expectedSubjects) => {
    const errors = [];
    if (!expectedSubjects || isNaN(parseInt(expectedSubjects))) return errors;
    const expected = parseInt(expectedSubjects);
    const studentMap = new Map();
    rows.forEach(row => {
      const roll = norm(row.roll_number);
      if (!roll) return;
      if (!studentMap.has(roll)) {
        studentMap.set(roll, { roll_number: row.roll_number, student_name: row.student_name, subjects: [], rows: [] });
      }
      studentMap.get(roll).subjects.push(norm(row.subject_code));
      studentMap.get(roll).rows.push(row._rowIndex);
    });

    studentMap.forEach((student) => {
      const codes = student.subjects;
      const unique = [...new Set(codes)];

      // Rule 10: duplicates within same student
      if (codes.length > unique.length) {
        const dups = codes.filter((s, i) => codes.indexOf(s) !== i);
        errors.push(makeError(10, 'error', 'Rated Same Subject Twice',
          `Student "${student.student_name}" (Roll: ${student.roll_number}) rated subject(s) ${[...new Set(dups)].join(', ')} multiple times.`,
          'Keep only one row per subject for this student.',
          { rollNumber: student.roll_number, studentName: student.student_name, columnName: 'subject_code' }
        ));
      }
      // Rule 8: Too few subjects
      if (unique.length < expected) {
        errors.push(makeError(8, 'error', 'Not Enough Subjects',
          `Student "${student.student_name}" (Roll: ${student.roll_number}) has only ${unique.length} subject(s), expected ${expected}.`,
          `Add the missing ${expected - unique.length} subject(s) for this student.`,
          { rollNumber: student.roll_number, studentName: student.student_name, columnName: 'subject_code' }
        ));
      }
      // Rule 9: Too many subjects
      if (unique.length > expected) {
        errors.push(makeError(9, 'warning', 'Too Many Subjects',
          `Student "${student.student_name}" (Roll: ${student.roll_number}) has ${unique.length} subjects, but expected ${expected}.`,
          `Remove the extra ${unique.length - expected} subject(s) for this student.`,
          { rollNumber: student.roll_number, studentName: student.student_name, columnName: 'subject_code' }
        ));
      }
    });
    return errors;
  };

  /* ── Rule 11: Roll Number ↔ Name Conflict ───────────────────────── */
  const rule11 = (rows) => {
    const errors = [];
    const rollNameMap = new Map();
    const nameRollMap = new Map();
    rows.forEach(row => {
      const roll = norm(row.roll_number);
      const name = norm(row.student_name);
      if (!roll || !name) return;
      if (!rollNameMap.has(roll)) {
        rollNameMap.set(roll, { name, rowIndex: row._rowIndex, originalName: row.student_name });
      } else if (rollNameMap.get(roll).name !== name) {
        errors.push(makeError(11, 'error', 'Roll Number Mismatch',
          `Roll number "${row.roll_number}" is linked to two different names: "${rollNameMap.get(roll).originalName}" and "${row.student_name}".`,
          'Ensure this roll number belongs to only one student.',
          { rowNumber: row._rowIndex, rollNumber: row.roll_number, studentName: row.student_name, columnName: 'student_name' }
        ));
      }
      if (!nameRollMap.has(name)) {
        nameRollMap.set(name, { roll, rowIndex: row._rowIndex, originalRoll: row.roll_number });
      } else if (nameRollMap.get(name).roll !== roll) {
        errors.push(makeError(11, 'error', 'Student Name Mismatch',
          `Student "${row.student_name}" is given two different roll numbers: "${nameRollMap.get(name).originalRoll}" and "${row.roll_number}".`,
          'Ensure this student has only one correct roll number.',
          { rowNumber: row._rowIndex, rollNumber: row.roll_number, studentName: row.student_name, columnName: 'roll_number' }
        ));
      }
    });
    return errors;
  };

  /* ── Rule 12: Staff ID ↔ Name Conflict ──────────────────────────── */
  const rule12 = (rows) => {
    const errors = [];
    const staffMap = new Map();
    rows.forEach(row => {
      const id = norm(row.staff_id);
      const name = norm(row.staff_name);
      if (!id) return;
      if (!staffMap.has(id)) {
        staffMap.set(id, { name, rowIndex: row._rowIndex, originalName: row.staff_name });
      } else if (staffMap.get(id).name !== name) {
        errors.push(makeError(12, 'error', 'Staff Name Mismatch',
          `Staff ID "${row.staff_id}" is linked to two different names: "${staffMap.get(id).originalName}" and "${row.staff_name}".`,
          'Ensure this staff ID always maps to the same name.',
          { rowNumber: row._rowIndex, rollNumber: row.roll_number, columnName: 'staff_name' }
        ));
      }
    });
    return errors;
  };

  /* ── Rule 13: Subject Code ↔ Name Conflict ──────────────────────── */
  const rule13 = (rows) => {
    const errors = [];
    const subjectMap = new Map();
    rows.forEach(row => {
      const code = norm(row.subject_code);
      const name = norm(row.subject_name);
      if (!code) return;
      if (!subjectMap.has(code)) {
        subjectMap.set(code, { name, rowIndex: row._rowIndex, originalName: row.subject_name });
      } else if (subjectMap.get(code).name !== name) {
        errors.push(makeError(13, 'error', 'Subject Name Mismatch',
          `Subject code "${row.subject_code}" is linked to two different names: "${subjectMap.get(code).originalName}" and "${row.subject_name}".`,
          'Ensure the subject code always maps to the same subject name.',
          { rowNumber: row._rowIndex, rollNumber: row.roll_number, columnName: 'subject_name' }
        ));
      }
    });
    return errors;
  };

  /* ── Rule 19: Roll Number Format ────────────────────────────────── */
  const rule19 = (rows) => {
    const errors = [];
    const seen = new Set();
    rows.forEach(row => {
      const roll = String(row.roll_number || '').trim();
      if (!roll || seen.has(roll)) return;
      seen.add(roll);
      if (!ROLL_PATTERN.test(roll)) {
        errors.push(makeError(19, 'warning', 'Invalid Roll Number Format',
          `Roll number "${roll}" contains spaces, special characters, or is too short/long (allowed: 5–20 alphanumeric characters).`,
          'Use only letters and numbers, no spaces or special characters.',
          { rowNumber: row._rowIndex, rollNumber: roll, studentName: row.student_name, columnName: 'roll_number' }
        ));
      }
    });
    return errors;
  };

  /* ── Main: Run All Rules ─────────────────────────────────────────── */
  const runValidation = (rows, adminInputs = {}) => {
    const startTime = Date.now();
    let allErrors = [];

    // Rule 2: Empty check
    const r2 = rule2(rows);
    allErrors = allErrors.concat(r2);
    if (r2.length > 0) return buildResult(rows, allErrors, adminInputs, startTime);

    // Rule 3: Column check
    const r3 = rule3(rows);
    allErrors = allErrors.concat(r3);
    if (r3.length > 0) return buildResult(rows, allErrors, adminInputs, startTime);

    // Rules 4–19
    allErrors = allErrors.concat(rule4(rows));
    allErrors = allErrors.concat(rule5(rows));
    allErrors = allErrors.concat(rule6(rows));
    allErrors = allErrors.concat(rule7(rows, adminInputs.expectedStudents));
    allErrors = allErrors.concat(rule8_9_10(rows, adminInputs.expectedSubjects));
    allErrors = allErrors.concat(rule11(rows));
    allErrors = allErrors.concat(rule12(rows));
    allErrors = allErrors.concat(rule13(rows));
    allErrors = allErrors.concat(rule19(rows));

    return buildResult(rows, allErrors, adminInputs, startTime);
  };

  const buildResult = (rows, allErrors, adminInputs, startTime) => {
    const errors = allErrors.filter(e => e.severity === 'error');
    const warnings = allErrors.filter(e => e.severity === 'warning');
    const uniqueRolls = new Set(rows.map(r => norm(r.roll_number)).filter(r => r !== ''));
    const isReady = errors.length === 0;

    return {
      isReady,
      overallStatus: isReady ? 'READY FOR FEEDBACK UPLOAD' : 'NOT READY — ERRORS FOUND',
      summary: {
        totalRows: rows.length,
        uniqueStudents: uniqueRolls.size,
        expectedStudents: parseInt(adminInputs.expectedStudents || 0) || 0,
        expectedSubjects: parseInt(adminInputs.expectedSubjects || 0) || 0,
        duplicateRows: allErrors.filter(e => e.ruleId === 5).length,
        blankCells: allErrors.filter(e => e.ruleId === 4).length,
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        validationDurationMs: Date.now() - startTime,
        validationTimestamp: new Date().toISOString()
      },
      errors: allErrors,
      rows
    };
  };

  /* ── Report Builders ─────────────────────────────────────────────── */
  const buildExcelReport = (result, filename = 'EduVerify_Report.xlsx') => {
    const { Download } = window.EV;
    const { summary, errors } = result;

    // Sheet 1: Summary
    const summaryData = [
      ['EduVerify Validation Report'],
      ['Generated at', new Date().toLocaleString()],
      ['Overall Status', result.overallStatus],
      [],
      ['SUMMARY', ''],
      ['Total Rows', summary.totalRows],
      ['Unique Students Found', summary.uniqueStudents],
      ['Expected Students', summary.expectedStudents],
      ['Expected Subjects Per Student', summary.expectedSubjects],
      ['Total Errors', summary.totalErrors],
      ['Total Warnings', summary.totalWarnings],
      ['Blank Cells', summary.blankCells],
      ['Duplicate Rows', summary.duplicateRows],
      ['Validation Duration (ms)', summary.validationDurationMs],
    ];

    // Sheet 2: Error Details
    const errorHeaders = ['Severity', 'Rule ID', 'Error Type', 'Row Number', 'Column', 'Roll Number', 'Student Name', 'Description', 'Suggested Fix'];
    const errorRows = errors.map(e => [
      e.severity.toUpperCase(), e.ruleId, e.errorType,
      e.rowNumber || '', e.columnName || '', e.rollNumber || '', e.studentName || '',
      e.description, e.suggestedFix
    ]);

    if (typeof XLSX === 'undefined') { window.EV.Toast.error('SheetJS not loaded.'); return; }
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 30 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    const ws2 = XLSX.utils.aoa_to_sheet([errorHeaders, ...errorRows]);
    ws2['!cols'] = errorHeaders.map((h, i) => ({
      wch: Math.max(h.length, ...(errorRows.map(r => String(r[i] ?? '').length))) + 2
    }));
    XLSX.utils.book_append_sheet(wb, ws2, 'Errors & Warnings');

    XLSX.writeFile(wb, filename);
  };

  const buildCsvReport = (result, filename = 'EduVerify_Report.csv') => {
    const { errors, summary } = result;
    const headers = ['Severity', 'Rule ID', 'Error Type', 'Row Number', 'Column', 'Roll Number', 'Student Name', 'Description', 'Suggested Fix'];
    const rows = errors.map(e => [
      e.severity, e.ruleId, e.errorType, e.rowNumber || '', e.columnName || '',
      e.rollNumber || '', e.studentName || '', e.description, e.suggestedFix
    ]);
    window.EV.Download.csv([headers, ...rows], filename);
  };

  const buildJsonReport = (result, filename = 'EduVerify_Report.json') => {
    const report = {
      generatedAt: new Date().toISOString(),
      overallStatus: result.overallStatus,
      summary: result.summary,
      errors: result.errors
    };
    window.EV.Download.json(report, filename);
  };

  return { runValidation, buildExcelReport, buildCsvReport, buildJsonReport, MANDATORY_COLS };

})();
