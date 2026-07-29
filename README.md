# EduVerify 2.0 — College Feedback Excel Tool

> A **100% browser-based** tool for validating and generating college feedback Excel files.  
> No server. No Node.js. Works directly on GitHub Pages.

## 🔗 Live Site
**[https://DeepakUK17.github.io/Feedback-Excel](https://DeepakUK17.github.io/Feedback-Excel)**

---

## ✨ Features

### 🔍 Excel Validation
Upload a feedback Excel and instantly detect:
- Missing students or extra students (count mismatch)
- Missing subjects per student (under/over count)
- Blank cells in required columns
- Exact duplicate rows
- Duplicate student + subject combinations
- Roll number → student name conflicts
- Staff ID → staff name conflicts
- Subject code → subject name conflicts
- Invalid roll number format

**Download error reports** as: `.xlsx`, `.csv`, or `.json`

### 🏗️ Excel Generation
Upload your student list and staff/course details — the tool generates a perfect feedback Excel with zero errors.

- Input 1: **Student List Excel** (roll_number + student_name)
- Input 2: **Staff/Course Excel** (all subject details)
- Output: Cross-joined Excel — each student × each subject = one row

---

## 📋 Excel Format

### Required Format (11 columns)
The feedback Excel file must have exactly these columns:

| Column | Description | Example |
|---|---|---|
| `department` | Department name | Artificial Intelligence and Data Science |
| `roll_number` | Student roll number | 24BTAD001 |
| `student_name` | Full student name | AAKASH P B |
| `staff_id` | Staff employee ID | U1904 |
| `staff_name` | Staff full name | Dr. B. Lanitha |
| `subject_code` | Subject/course code | 24BTAD541 |
| `subject_name` | Subject name | Deep Learning |
| `section` | Section identifier | A |
| `year` | Year of study | 3 |
| `batch` | Batch year | 2024 |
| `academic_year` | Academic year | 2026-2027 |

📎 See `sample/Good.xlsx` for a real working example.

---

## 📁 Input File Formats for Generation

### Student List Excel
| Column | Required | Notes |
|---|---|---|
| `roll_number` | ✅ Yes | Alphanumeric, 5–20 chars |
| `student_name` | ✅ Yes | Full name |

Extra columns (if any) are ignored.

### Staff / Course Excel
| Column | Required | Notes |
|---|---|---|
| `staff_id` | ✅ Yes | Unique staff ID |
| `staff_name` | ✅ Yes | Full name |
| `subject_code` | ✅ Yes | Unique course code |
| `subject_name` | ✅ Yes | Full course name |
| `department` | ✅ Yes | Department name |
| `section` | ✅ Yes | Section (A, B, C…) |
| `year` | ✅ Yes | Year of study |
| `batch` | ✅ Yes | Batch year |
| `academic_year` | ✅ Yes | e.g. 2026-2027 |

One row per subject per staff member. Extra columns are ignored.

> **Formula**: Total rows = Number of students × Number of subjects  
> Example: 60 students × 9 subjects = **540 rows**

---

## 🚀 Hosting on GitHub Pages

1. Push this repository to GitHub
2. Go to **Settings → Pages**
3. Source: **main branch, / (root)**
4. Site will be live at `https://<username>.github.io/<repo-name>`

---

## 🔒 Privacy

All file processing happens **entirely in your browser**. No data is ever uploaded to any server.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | Vanilla CSS (custom design system) |
| Logic | Vanilla JavaScript (ES6+) |
| Excel Read/Write | [SheetJS (xlsx.js)](https://sheetjs.com/) via CDN |
| Hosting | GitHub Pages |

---

## 📂 File Structure

```
├── index.html          ← Landing page
├── validate.html       ← Excel Validation tool
├── generate.html       ← Excel Generation tool
├── css/
│   └── styles.css      ← Complete design system
├── js/
│   ├── utils.js        ← Shared utilities (Toast, Theme, DOM, Download)
│   ├── validate.js     ← Validation engine (10+ rules)
│   └── generate.js     ← Excel generation engine
├── sample/
│   └── Good.xlsx       ← Sample correct feedback Excel
└── README.md
```

---

## 📌 Validation Rules Reference

| Rule | Severity | What It Checks |
|---|---|---|
| Rule 2 | 🔴 Error | Empty file |
| Rule 3 | 🔴 Error | Missing required columns |
| Rule 4 | 🔴 Error | Blank cells in mandatory columns |
| Rule 5 | 🔴 Error | Exact duplicate rows |
| Rule 6 | 🔴 Error | Same student rated same subject twice |
| Rule 7 | 🔴 Error | Student count mismatch |
| Rule 8 | 🔴 Error | Too few subjects per student |
| Rule 9 | ⚠️ Warning | Too many subjects per student |
| Rule 10 | 🔴 Error | Duplicate subject within student |
| Rule 11 | 🔴 Error | Roll number ↔ name conflict |
| Rule 12 | 🔴 Error | Staff ID ↔ name conflict |
| Rule 13 | 🔴 Error | Subject code ↔ name conflict |
| Rule 19 | ⚠️ Warning | Invalid roll number format |
