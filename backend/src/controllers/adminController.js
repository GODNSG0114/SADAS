const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// @route   GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let idx = 1;
    let where = '';

    if (search) {
      where = ` AND (name ILIKE $${idx} OR email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users WHERE 1=1${where}`,
      params.slice(0, search ? 1 : 0)
    );
    const total = parseInt(countResult.rows[0].count);

    const query = `SELECT id, name, email, role, is_active, created_at FROM users WHERE 1=1${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

// @route   PUT /api/admin/user/:id
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, is_active } = req.body;
    const result = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), role = COALESCE($3, role), is_active = COALESCE($4, is_active), updated_at = NOW() WHERE id = $5 RETURNING id, name, email, role, is_active`,
      [name, email, role, is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
};

// @route   DELETE /api/admin/user/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
};

// @route   GET /api/admin/analytics
const getAnalytics = async (req, res) => {
  try {
    const summaryResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as "totalUsers",
        (SELECT COUNT(*) FROM students) as "totalStudents",
        (
          (SELECT COUNT(*) FROM activities) +
          (SELECT COUNT(*) FROM field_projects) +
          (SELECT COUNT(*) FROM club_activities) +
          (SELECT COUNT(*) FROM sports_activities) +
          (SELECT COUNT(*) FROM hackathons) +
          (SELECT COUNT(*) FROM examinations) +
          (SELECT COUNT(*) FROM extra_curriculars) +
          (SELECT COUNT(*) FROM higher_education)
        ) as "totalActivities",
        (SELECT COUNT(*) FROM internships) as "totalInternships",
        (SELECT COUNT(*) FROM certifications) as "totalCertifications"
    `);

    const topStudentsResult = await pool.query(`
      SELECT u.name, s.department, s.year, s.cgpa,
        COALESCE(act.activity_count, 0) as activity_count
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN (SELECT student_id, COUNT(*) as activity_count FROM activities GROUP BY student_id) act ON act.student_id = s.id
      ORDER BY activity_count DESC, s.cgpa DESC
      LIMIT 5
    `);

    const deptResult = await pool.query(
      `SELECT department, COUNT(*) as count FROM students GROUP BY department ORDER BY count DESC`
    );

    res.json({
      success: true,
      data: {
        summary: summaryResult.rows[0],
        topStudents: topStudentsResult.rows,
        departmentDistribution: deptResult.rows
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics.' });
  }
};

// @route   GET /api/analytics/department
const getDepartmentAnalytics = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.department,
        COUNT(DISTINCT s.id) as total_students,
        COUNT(a.id) as total_activities,
        COUNT(DISTINCT i.id) as total_internships,
        COUNT(DISTINCT c.id) as total_certifications,
        ROUND(AVG(s.cgpa)::numeric, 2) as avg_cgpa
      FROM students s
      LEFT JOIN activities a ON a.student_id = s.id
      LEFT JOIN internships i ON i.student_id = s.id
      LEFT JOIN certifications c ON c.student_id = s.id
      GROUP BY s.department
      ORDER BY total_activities DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Dept analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch department analytics.' });
  }
};

// @route   GET /api/analytics/year
const getYearAnalytics = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.year,
        COUNT(DISTINCT s.id) as total_students,
        COUNT(a.id) as total_activities,
        COUNT(DISTINCT i.id) as total_internships,
        ROUND(AVG(s.cgpa)::numeric, 2) as avg_cgpa
      FROM students s
      LEFT JOIN activities a ON a.student_id = s.id
      LEFT JOIN internships i ON i.student_id = s.id
      GROUP BY s.year
      ORDER BY s.year ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Year analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch year analytics.' });
  }
};

// @route   GET /api/analytics/activity-category
const getActivityCategoryAnalytics = async (req, res) => {
  try {
    const { department, year } = req.query;
    const params = [];
    let idx = 1;
    let where = '';

    if (department) { where += ` AND s.department = $${idx++}`; params.push(department); }
    if (year) { where += ` AND s.year = $${idx++}`; params.push(parseInt(year)); }

    const result = await pool.query(
      `SELECT a.category, COUNT(*) as count, COUNT(DISTINCT a.student_id) as students_participated
       FROM activities a JOIN students s ON a.student_id = s.id
       WHERE 1=1${where}
       GROUP BY a.category ORDER BY count DESC`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Activity category analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity category analytics.' });
  }
};

// @route   GET /api/analytics/internship-stats
const getInternshipStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.department,
        COUNT(i.id) as total_internships,
        COUNT(DISTINCT i.student_id) as students_with_internship,
        ROUND(AVG(i.duration)::numeric, 1) as avg_duration_weeks,
        ROUND(AVG(i.stipend)::numeric, 2) as avg_stipend
      FROM students s
      LEFT JOIN internships i ON i.student_id = s.id
      GROUP BY s.department
      ORDER BY total_internships DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Internship stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch internship stats.' });
  }
};

// @route   GET /api/admin/students
const getAllStudents = async (req, res) => {
  try {
    const { department, year, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let idx = 1;
    let where = '';

    if (department) { where += ` AND s.department = $${idx++}`; params.push(department); }
    if (year) { where += ` AND s.year = $${idx++}`; params.push(parseInt(year)); }
    if (search) { where += ` AND (u.name ILIKE $${idx} OR s.roll_number ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM students s JOIN users u ON s.user_id = u.id WHERE u.is_active = TRUE${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT s.*, u.name, u.email,
        COALESCE(act.activity_count, 0) as activity_count,
        COALESCE(intn.internship_count, 0) as internship_count,
        COALESCE(cert.cert_count, 0) as cert_count
      FROM students s JOIN users u ON s.user_id = u.id
      LEFT JOIN (SELECT student_id, COUNT(*) as activity_count FROM activities GROUP BY student_id) act ON act.student_id = s.id
      LEFT JOIN (SELECT student_id, COUNT(*) as internship_count FROM internships GROUP BY student_id) intn ON intn.student_id = s.id
      LEFT JOIN (SELECT student_id, COUNT(*) as cert_count FROM certifications GROUP BY student_id) cert ON cert.student_id = s.id
      WHERE u.is_active = TRUE${where}
      ORDER BY u.name ASC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Admin get students error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students.' });
  }
};

// @route   GET /api/admin/activities
const getAllActivities = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id, u.name as student_name, s.roll_number, s.department,
             a.title, a.category, a.date::text as date,
             a.verification_status, a.certificate_url, 'activity' as record_type, NULL::text as rejection_reason
      FROM activities a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.user_id = u.id

      UNION ALL

      SELECT fp.id, u.name as student_name, s.roll_number, s.department,
             fp.project_name as title, 'Field Project' as category, fp.year as date,
             COALESCE(fp.verification_status, 'Pending') as verification_status, fp.document_url as certificate_url, 'field-project' as record_type, fp.rejection_reason
      FROM field_projects fp
      JOIN students s ON fp.student_id = s.id
      JOIN users u ON s.user_id = u.id

      UNION ALL

      SELECT i.id, u.name as student_name, s.roll_number, s.department,
             COALESCE(i.agency_name, i.company, 'Internship') as title, 'Internship' as category, i.year as date,
             COALESCE(i.verification_status, 'Pending') as verification_status, i.document_url as certificate_url, 'internship' as record_type, i.rejection_reason
      FROM internships i
      JOIN students s ON i.student_id = s.id
      JOIN users u ON s.user_id = u.id

      UNION ALL

      SELECT ca.id, u.name as student_name, s.roll_number, s.department,
             ca.activity_name as title, 'Club Activity' as category, ca.year as date,
             COALESCE(ca.verification_status, 'Pending') as verification_status, ca.document_url as certificate_url, 'club-activity' as record_type, ca.rejection_reason
      FROM club_activities ca
      JOIN students s ON ca.student_id = s.id
      JOIN users u ON s.user_id = u.id

      UNION ALL

      SELECT sa.id, u.name as student_name, s.roll_number, s.department,
             sa.sport_name as title, 'Sports Activity' as category, sa.year as date,
             COALESCE(sa.verification_status, 'Pending') as verification_status, sa.document_url as certificate_url, 'sports-activity' as record_type, sa.rejection_reason
      FROM sports_activities sa
      JOIN students s ON sa.student_id = s.id
      JOIN users u ON s.user_id = u.id

      UNION ALL

      SELECT he.id, u.name as student_name, s.roll_number, s.department,
             he.institution_joined as title, 'Higher Education' as category, he.year_of_passing as date,
             COALESCE(he.verification_status, 'Pending') as verification_status, NULL as certificate_url, 'higher-education' as record_type, he.rejection_reason
      FROM higher_education he
      JOIN students s ON he.student_id = s.id
      JOIN users u ON s.user_id = u.id

      UNION ALL

      SELECT e.id, u.name as student_name, s.roll_number, s.department,
             e.exam_name as title, 'Examination' as category, e.year as date,
             COALESCE(e.verification_status, 'Pending') as verification_status, e.result_document_url as certificate_url, 'examination' as record_type, e.rejection_reason
      FROM examinations e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.user_id = u.id

      UNION ALL

      SELECT h.id, u.name as student_name, s.roll_number, s.department,
             h.project_name as title, 'Hackathon' as category, h.year as date,
             COALESCE(h.verification_status, 'Pending') as verification_status, h.document_url as certificate_url, 'hackathon' as record_type, h.rejection_reason
      FROM hackathons h
      JOIN students s ON h.student_id = s.id
      JOIN users u ON s.user_id = u.id

      UNION ALL

      SELECT ec.id, u.name as student_name, s.roll_number, s.department,
             ec.activity_name as title, 'Extra-Curricular' as category, ec.year as date,
             COALESCE(ec.verification_status, 'Pending') as verification_status, ec.document_url as certificate_url, 'extra-curricular' as record_type, ec.rejection_reason
      FROM extra_curriculars ec
      JOIN students s ON ec.student_id = s.id
      JOIN users u ON s.user_id = u.id

      ORDER BY record_type, id DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all activities error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activities.' });
  }
};

// @route   PUT /api/admin/activity/:id/status
const updateActivityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { verification_status, record_type = 'activity', rejection_reason } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(verification_status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const tableMap = {
      'activity': 'activities',
      'field-project': 'field_projects',
      'internship': 'internships',
      'club-activity': 'club_activities',
      'sports-activity': 'sports_activities',
      'higher-education': 'higher_education',
      'examination': 'examinations',
      'hackathon': 'hackathons',
      'extra-curricular': 'extra_curriculars',
    };

    const table = tableMap[record_type];
    if (!table) return res.status(400).json({ success: false, message: 'Invalid record type.' });

    const result = await pool.query(
      `UPDATE ${table} SET verification_status = $1, rejection_reason = $2, updated_at = NOW() WHERE id = $3 RETURNING id, verification_status, rejection_reason`,
      [verification_status, rejection_reason || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Record not found.' });
    res.json({ success: true, message: 'Status updated', data: result.rows[0] });
  } catch (error) {
    console.error('Update activity status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// NAAC REPORT HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const INSTITUTION_NAME = process.env.INSTITUTION_NAME || 'Institution Name';
const NAAC_ACADEMIC_YEAR = process.env.NAAC_ACADEMIC_YEAR || '2023-24';

// NAAC Criterion 5 — Student Support & Progression
// Each activity type maps to a NAAC sub-criterion reference
const NAAC_SECTIONS = [
  {
    key: 'internships',
    criterion: '5.2.1',
    title: 'Internship / Industrial Training',
    query: `SELECT ROW_NUMBER() OVER (ORDER BY u.name) AS "Sr.No",
              u.name AS "Student Name", s.roll_number AS "PRN / Roll No",
              s.department AS "Department", s.year AS "Class / Year",
              i.year AS "Academic Year", i.agency_name AS "Organisation / Agency",
              i.duration AS "Duration", i.document_url AS "Document Reference"
            FROM internships i
            JOIN students s ON i.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE i.verification_status = 'Approved'
            ORDER BY s.department, u.name`,
    columns: ['Sr.No','Student Name','PRN / Roll No','Department','Class / Year',
              'Academic Year','Organisation / Agency','Duration','Document Reference']
  },
  {
    key: 'field_projects',
    criterion: '5.3.3',
    title: 'Field Projects / Student Projects',
    query: `SELECT ROW_NUMBER() OVER (ORDER BY u.name) AS "Sr.No",
              u.name AS "Student Name", s.roll_number AS "PRN / Roll No",
              s.department AS "Department", s.year AS "Class / Year",
              fp.year AS "Academic Year", fp.project_name AS "Project Title",
              fp.program_code AS "Program Code", fp.activity AS "Activity / Domain",
              fp.document_url AS "Document Reference"
            FROM field_projects fp
            JOIN students s ON fp.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE fp.verification_status = 'Approved'
            ORDER BY s.department, u.name`,
    columns: ['Sr.No','Student Name','PRN / Roll No','Department','Class / Year',
              'Academic Year','Project Title','Program Code','Activity / Domain','Document Reference']
  },
  {
    key: 'club_activities',
    criterion: '5.3.1',
    title: 'Club Activities',
    query: `SELECT ROW_NUMBER() OVER (ORDER BY u.name) AS "Sr.No",
              u.name AS "Student Name", s.roll_number AS "PRN / Roll No",
              s.department AS "Department", s.year AS "Class / Year",
              ca.year AS "Academic Year", ca.club_name AS "Club / Committee Name",
              ca.activity_name AS "Activity / Role", ca.duration AS "Duration",
              ca.document_url AS "Document Reference"
            FROM club_activities ca
            JOIN students s ON ca.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE ca.verification_status = 'Approved'
            ORDER BY s.department, u.name`,
    columns: ['Sr.No','Student Name','PRN / Roll No','Department','Class / Year',
              'Academic Year','Club / Committee Name','Activity / Role','Duration','Document Reference']
  },
  {
    key: 'sports_activities',
    criterion: '5.3.1',
    title: 'Sports & Cultural Activities',
    query: `SELECT ROW_NUMBER() OVER (ORDER BY u.name) AS "Sr.No",
              u.name AS "Student Name", s.roll_number AS "PRN / Roll No",
              s.department AS "Department", s.year AS "Class / Year",
              sa.year AS "Academic Year", sa.sport_name AS "Sport / Event Name",
              sa.venue AS "Venue / Level", sa.achievement AS "Achievement / Award",
              sa.document_url AS "Document Reference"
            FROM sports_activities sa
            JOIN students s ON sa.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE sa.verification_status = 'Approved'
            ORDER BY s.department, u.name`,
    columns: ['Sr.No','Student Name','PRN / Roll No','Department','Class / Year',
              'Academic Year','Sport / Event Name','Venue / Level','Achievement / Award','Document Reference']
  },
  {
    key: 'hackathons',
    criterion: '5.3.1',
    title: 'Hackathons & Competitions',
    query: `SELECT ROW_NUMBER() OVER (ORDER BY u.name) AS "Sr.No",
              u.name AS "Student Name", s.roll_number AS "PRN / Roll No",
              s.department AS "Department", s.year AS "Class / Year",
              h.year AS "Academic Year", h.organization_name AS "Organising Body",
              h.project_name AS "Project / Team Name", h.achievement AS "Achievement / Award",
              h.document_url AS "Document Reference"
            FROM hackathons h
            JOIN students s ON h.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE h.verification_status = 'Approved'
            ORDER BY s.department, u.name`,
    columns: ['Sr.No','Student Name','PRN / Roll No','Department','Class / Year',
              'Academic Year','Organising Body','Project / Team Name','Achievement / Award','Document Reference']
  },
  {
    key: 'examinations',
    criterion: '5.2.2',
    title: 'Professional / Competitive Examinations',
    query: `SELECT ROW_NUMBER() OVER (ORDER BY u.name) AS "Sr.No",
              u.name AS "Student Name", s.roll_number AS "PRN / Roll No",
              s.department AS "Department", s.year AS "Class / Year",
              e.year AS "Academic Year", e.exam_name AS "Examination Name",
              e.registration_number AS "Registration No.", e.score AS "Score / Rank",
              e.result_document_url AS "Document Reference"
            FROM examinations e
            JOIN students s ON e.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE e.verification_status = 'Approved'
            ORDER BY s.department, u.name`,
    columns: ['Sr.No','Student Name','PRN / Roll No','Department','Class / Year',
              'Academic Year','Examination Name','Registration No.','Score / Rank','Document Reference']
  },
  {
    key: 'higher_education',
    criterion: '5.2.1',
    title: 'Higher Education / Progression',
    query: `SELECT ROW_NUMBER() OVER (ORDER BY u.name) AS "Sr.No",
              u.name AS "Student Name", s.roll_number AS "PRN / Roll No",
              s.department AS "Department", s.year AS "Class / Year",
              he.year_of_passing AS "Year of Passing", he.program_graduated AS "Programme Graduated",
              he.institution_joined AS "Institution Joined", he.program_admitted AS "Programme Admitted"
            FROM higher_education he
            JOIN students s ON he.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE he.verification_status = 'Approved'
            ORDER BY s.department, u.name`,
    columns: ['Sr.No','Student Name','PRN / Roll No','Department','Class / Year',
              'Year of Passing','Programme Graduated','Institution Joined','Programme Admitted']
  },
  {
    key: 'extra_curriculars',
    criterion: '5.3.1',
    title: 'Extra-Curricular Activities',
    query: `SELECT ROW_NUMBER() OVER (ORDER BY u.name) AS "Sr.No",
              u.name AS "Student Name", s.roll_number AS "PRN / Roll No",
              s.department AS "Department", s.year AS "Class / Year",
              ec.year AS "Academic Year", ec.activity_name AS "Activity Name",
              ec.description AS "Description", ec.document_url AS "Document Reference"
            FROM extra_curriculars ec
            JOIN students s ON ec.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE ec.verification_status = 'Approved'
            ORDER BY s.department, u.name`,
    columns: ['Sr.No','Student Name','PRN / Roll No','Department','Class / Year',
              'Academic Year','Activity Name','Description','Document Reference']
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// NAAC EXCEL REPORT  (one sheet per criterion section)
// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/admin/reports/excel
const generateExcelReport = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SADAS';
    workbook.created = new Date();

    // ── Cover / Summary sheet ────────────────────────────────────────────────
    const coverSheet = workbook.addWorksheet('NAAC Summary');
    coverSheet.columns = [{ width: 40 }, { width: 20 }];

    const addCoverRow = (label, value, bold = false) => {
      const row = coverSheet.addRow([label, value]);
      if (bold) { row.font = { bold: true, size: 12 }; }
      return row;
    };

    coverSheet.addRow([]);
    addCoverRow('NAAC Self Study Report — Student Activity Data', '', true);
    addCoverRow('Institution', INSTITUTION_NAME);
    addCoverRow('Academic Year', NAAC_ACADEMIC_YEAR);
    addCoverRow('Criterion', 'Criterion V — Student Support and Progression');
    addCoverRow('Generated On', new Date().toLocaleString('en-IN'));
    coverSheet.addRow([]);
    addCoverRow('Section', 'Total Approved Records', true);

    const summaryStartRow = coverSheet.rowCount + 1;

    // ── One sheet per activity section ──────────────────────────────────────
    for (const section of NAAC_SECTIONS) {
      const rows = await pool.query(section.query);
      const count = rows.rows.length;

      // Add to summary
      coverSheet.addRow([`${section.criterion} — ${section.title}`, count]);

      // Create worksheet
      const sheetName = section.title.substring(0, 31); // Excel limit
      const ws = workbook.addWorksheet(sheetName);

      // ── Sheet header block ───────────────────────────────────────────────
      const headerRows = [
        [`${INSTITUTION_NAME}`],
        [`NAAC Criterion ${section.criterion} — ${section.title}`],
        [`Academic Year: ${NAAC_ACADEMIC_YEAR}`],
        [`Total Records: ${count}`],
        [],
      ];
      headerRows.forEach((r, i) => {
        const row = ws.addRow(r);
        if (i === 0) row.font = { bold: true, size: 13 };
        else if (i === 1) row.font = { bold: true, size: 11 };
        else row.font = { size: 10 };
      });

      // ── Column headers ───────────────────────────────────────────────────
      const headerRow = ws.addRow(section.columns);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.height = 22;

      // Set column widths
      section.columns.forEach((col, i) => {
        ws.getColumn(i + 1).width = Math.max(col.length + 4, 18);
      });
      // Sr.No narrow
      ws.getColumn(1).width = 7;

      // ── Data rows ────────────────────────────────────────────────────────
      if (count === 0) {
        const emptyRow = ws.addRow(['No approved records found for this section.']);
        emptyRow.font = { italic: true, color: { argb: 'FF888888' } };
      } else {
        rows.rows.forEach((r, idx) => {
          const values = section.columns.map(col => r[col] ?? '');
          const dataRow = ws.addRow(values);
          dataRow.fill = {
            type: 'pattern', pattern: 'solid',
            fgColor: { argb: idx % 2 === 0 ? 'FFEEF2FF' : 'FFFFFFFF' }
          };
          dataRow.alignment = { vertical: 'middle', wrapText: true };
          dataRow.height = 18;
        });
      }

      // Border on header row
      headerRow.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'medium' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      // Freeze top rows + header
      ws.views = [{ state: 'frozen', ySplit: ws.rowCount - count - (count === 0 ? 1 : 0) }];
    }

    // Style summary sheet
    coverSheet.getColumn(1).width = 50;
    coverSheet.getColumn(2).width = 25;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=NAAC_Criterion5_Report_${NAAC_ACADEMIC_YEAR.replace('/', '-')}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel report.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// NAAC PDF REPORT
// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/admin/reports/pdf
const generatePDFReport = async (req, res) => {
  try {
    const doc = new PDFDocument({ margin: 40, size: 'A4', autoFirstPage: true, layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=NAAC_Criterion5_Report_${NAAC_ACADEMIC_YEAR.replace('/', '-')}.pdf`);
    doc.pipe(res);

    const PAGE_W = doc.page.width;
    const PAGE_H = doc.page.height;
    const MARGIN = 40;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const PAGE_BOTTOM = PAGE_H - 50;
    const ROW_H = 15;
    const HEADER_H = 20;

    // ── Draw a horizontal rule ───────────────────────────────────────────────
    const hRule = (y, weight = 0.5) => {
      doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).lineWidth(weight).stroke('#1F3864');
    };

    // ── Draw one table row ───────────────────────────────────────────────────
    const drawRow = (cells, colWidths, y, opts = {}) => {
      let x = MARGIN;
      cells.forEach((val, i) => {
        if (opts.bg) {
          doc.rect(x, y, colWidths[i], opts.rowH || ROW_H).fill(opts.bg).stroke();
        }
        doc
          .fillColor(opts.color || '#1a1a1a')
          .fontSize(opts.fontSize || 7)
          .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(String(val ?? ''), x + 2, y + 3, {
            width: colWidths[i] - 4,
            height: (opts.rowH || ROW_H) - 4,
            ellipsis: true,
            lineBreak: false
          });
        x += colWidths[i];
      });
    };

    // ── Cover page ───────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, PAGE_H).fill('#1F3864');
    doc.fillColor('#FFFFFF')
      .fontSize(22).font('Helvetica-Bold')
      .text('NAAC Self Study Report', MARGIN, 120, { align: 'center', width: CONTENT_W });
    doc.fontSize(16).font('Helvetica')
      .text('Criterion V — Student Support and Progression', MARGIN, doc.y + 10, { align: 'center', width: CONTENT_W });
    doc.fontSize(13)
      .text(INSTITUTION_NAME, MARGIN, doc.y + 30, { align: 'center', width: CONTENT_W });
    doc.fontSize(11)
      .text(`Academic Year: ${NAAC_ACADEMIC_YEAR}`, MARGIN, doc.y + 10, { align: 'center', width: CONTENT_W });
    doc.fontSize(9)
      .text(`Generated: ${new Date().toLocaleString('en-IN')}`, MARGIN, doc.y + 10, { align: 'center', width: CONTENT_W });
    doc.fontSize(8).fillColor('#AAAAAA')
      .text('Generated by SADAS — Student Activity Data Analysis System', MARGIN, PAGE_H - 60, { align: 'center', width: CONTENT_W });

    // ── One section per activity type ────────────────────────────────────────
    for (const section of NAAC_SECTIONS) {
      const rows = await pool.query(section.query);
      doc.addPage();

      // Section header
      doc.rect(MARGIN, 30, CONTENT_W, 28).fill('#1F3864');
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold')
        .text(`Criterion ${section.criterion} — ${section.title}`, MARGIN + 8, 38, { width: CONTENT_W - 16 });
      doc.fillColor('#CCDDFF').fontSize(8).font('Helvetica')
        .text(`${INSTITUTION_NAME}  |  Academic Year: ${NAAC_ACADEMIC_YEAR}  |  Total Records: ${rows.rows.length}`,
          MARGIN + 8, 52, { width: CONTENT_W - 16 });

      if (rows.rows.length === 0) {
        doc.fillColor('#888888').fontSize(9).font('Helvetica')
          .text('No approved records found for this section.', MARGIN, 80);
        continue;
      }

      // Calculate column widths proportionally
      // Sr.No gets fixed 30px, Document Reference gets 80px, rest share equally
      const fixedCols = { 'Sr.No': 28, 'Document Reference': 75, 'PRN / Roll No': 55 };
      let remaining = CONTENT_W;
      let flexCount = 0;
      section.columns.forEach(col => {
        if (fixedCols[col]) remaining -= fixedCols[col];
        else flexCount++;
      });
      const flexW = flexCount > 0 ? Math.floor(remaining / flexCount) : 0;
      const colWidths = section.columns.map(col => fixedCols[col] || flexW);

      let y = 68;

      // Column header row
      drawRow(section.columns, colWidths, y, { bg: '#2E4A8A', color: '#FFFFFF', bold: true, fontSize: 7.5, rowH: HEADER_H });
      y += HEADER_H;
      hRule(y, 0.3);
      y += 1;

      // Data rows
      rows.rows.forEach((row, idx) => {
        if (y + ROW_H > PAGE_BOTTOM) {
          doc.addPage();
          y = 30;
          // Repeat header
          doc.rect(MARGIN, y - 2, CONTENT_W, 16).fill('#1F3864');
          doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
            .text(`${section.criterion} — ${section.title} (continued)`, MARGIN + 4, y, { width: CONTENT_W - 8 });
          y += 18;
          drawRow(section.columns, colWidths, y, { bg: '#2E4A8A', color: '#FFFFFF', bold: true, fontSize: 7.5, rowH: HEADER_H });
          y += HEADER_H;
          hRule(y, 0.3);
          y += 1;
        }

        const bg = idx % 2 === 0 ? '#EEF2FF' : '#FFFFFF';
        const values = section.columns.map(col => row[col] ?? '');
        drawRow(values, colWidths, y, { bg, fontSize: 7, rowH: ROW_H });
        y += ROW_H;
      });

      // Total line
      hRule(y + 2, 0.5);
      doc.fillColor('#1F3864').fontSize(8).font('Helvetica-Bold')
        .text(`Total Approved Records: ${rows.rows.length}`, MARGIN, y + 6);
    }

    // ── Footer on every page ─────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#888888').fontSize(7).font('Helvetica')
        .text(
          `${INSTITUTION_NAME}  |  NAAC Criterion V  |  Page ${i + 1} of ${range.count}`,
          MARGIN, PAGE_H - 25, { align: 'center', width: CONTENT_W }
        );
    }

    doc.end();
  } catch (error) {
    console.error('PDF report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report.' });
  }
};

// @route   POST /api/admin/make-admin
// @access  super_admin only
const makeAdmin = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || !Number.isInteger(Number(userId)) || Number(userId) <= 0) {
      return res.status(400).json({ success: false, message: 'userId is required and must be a positive integer.' });
    }
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role.' });
    }
    const result = await pool.query(
      `UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role, is_active`,
      [parseInt(userId)]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User promoted to admin.', data: result.rows[0] });
  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to update role.' });
  }
};

// @route   POST /api/admin/demote-admin
// @access  super_admin only
const demoteAdmin = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || !Number.isInteger(Number(userId)) || Number(userId) <= 0) {
      return res.status(400).json({ success: false, message: 'userId is required and must be a positive integer.' });
    }
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role.' });
    }
    const result = await pool.query(
      `UPDATE users SET role = 'student', updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role, is_active`,
      [parseInt(userId)]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User demoted to student.', data: result.rows[0] });
  } catch (error) {
    console.error('Demote admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to update role.' });
  }
};

module.exports = {
  getUsers, updateUser, deleteUser,
  getAnalytics, getAllStudents,
  getDepartmentAnalytics, getYearAnalytics, getActivityCategoryAnalytics, getInternshipStats,
  generateExcelReport, generatePDFReport, getAllActivities, updateActivityStatus,
  makeAdmin, demoteAdmin
};
