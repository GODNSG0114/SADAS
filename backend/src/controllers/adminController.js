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

// @route   GET /api/admin/reports/excel
const generateExcelReport = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('SADAS Report');

    let currentRow = 1;

    const addSection = async (title, query, columns) => {
      const rows = await pool.query(query);

      // Section title row
      ws.getCell(`A${currentRow}`).value = title;
      ws.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
      ws.getRow(currentRow).height = 20;
      currentRow++;

      // Column header row
      columns.forEach((col, i) => {
        const cell = ws.getCell(currentRow, i + 1);
        cell.value = col.header;
        cell.font = { bold: true };
        cell.border = { bottom: { style: 'thin' } };
        ws.getColumn(i + 1).width = Math.max(col.header.length + 4, 18);
      });
      currentRow++;

      // Data rows
      if (rows.rows.length === 0) {
        ws.getCell(`A${currentRow}`).value = 'No approved records.';
        ws.getCell(`A${currentRow}`).font = { italic: true };
        currentRow++;
      } else {
        rows.rows.forEach(r => {
          columns.forEach((col, i) => {
            ws.getCell(currentRow, i + 1).value = r[col.key] ?? '';
          });
          currentRow++;
        });
      }

      // Blank separator row
      currentRow += 2;
    };

    await addSection('Field Projects', 
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, fp.year, fp.project_name, fp.program_code, fp.activity, fp.document_url
       FROM field_projects fp JOIN students s ON fp.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE fp.verification_status = 'Approved' ORDER BY s.department, u.name`,
      [
        { header: 'Student Name', key: 'name' }, { header: 'PRN', key: 'roll_number' },
        { header: 'Department', key: 'department' }, { header: 'Study Year', key: 'study_year' },
        { header: 'Year', key: 'year' }, { header: 'Project Name', key: 'project_name' },
        { header: 'Program Code', key: 'program_code' }, { header: 'Activity', key: 'activity' },
        { header: 'Document URL', key: 'document_url' }
      ]
    );

    await addSection('Internships',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, i.year, i.duration, i.agency_name, i.document_url
       FROM internships i JOIN students s ON i.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE i.verification_status = 'Approved' ORDER BY s.department, u.name`,
      [
        { header: 'Student Name', key: 'name' }, { header: 'PRN', key: 'roll_number' },
        { header: 'Department', key: 'department' }, { header: 'Study Year', key: 'study_year' },
        { header: 'Year', key: 'year' }, { header: 'Duration', key: 'duration' },
        { header: 'Agency Name', key: 'agency_name' }, { header: 'Document URL', key: 'document_url' }
      ]
    );

    await addSection('Club Activities',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, ca.year, ca.club_name, ca.activity_name, ca.duration, ca.document_url
       FROM club_activities ca JOIN students s ON ca.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE ca.verification_status = 'Approved' ORDER BY s.department, u.name`,
      [
        { header: 'Student Name', key: 'name' }, { header: 'PRN', key: 'roll_number' },
        { header: 'Department', key: 'department' }, { header: 'Study Year', key: 'study_year' },
        { header: 'Year', key: 'year' }, { header: 'Club Name', key: 'club_name' },
        { header: 'Activity Name', key: 'activity_name' }, { header: 'Duration', key: 'duration' },
        { header: 'Document URL', key: 'document_url' }
      ]
    );

    await addSection('Sports Activities',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, sa.year, sa.sport_name, sa.venue, sa.achievement, sa.document_url
       FROM sports_activities sa JOIN students s ON sa.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE sa.verification_status = 'Approved' ORDER BY s.department, u.name`,
      [
        { header: 'Student Name', key: 'name' }, { header: 'PRN', key: 'roll_number' },
        { header: 'Department', key: 'department' }, { header: 'Study Year', key: 'study_year' },
        { header: 'Year', key: 'year' }, { header: 'Sport Name', key: 'sport_name' },
        { header: 'Venue', key: 'venue' }, { header: 'Achievement', key: 'achievement' },
        { header: 'Document URL', key: 'document_url' }
      ]
    );

    await addSection('Hackathons',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, h.year, h.organization_name, h.project_name, h.achievement, h.document_url
       FROM hackathons h JOIN students s ON h.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE h.verification_status = 'Approved' ORDER BY s.department, u.name`,
      [
        { header: 'Student Name', key: 'name' }, { header: 'PRN', key: 'roll_number' },
        { header: 'Department', key: 'department' }, { header: 'Study Year', key: 'study_year' },
        { header: 'Year', key: 'year' }, { header: 'Organization', key: 'organization_name' },
        { header: 'Project Name', key: 'project_name' }, { header: 'Achievement', key: 'achievement' },
        { header: 'Document URL', key: 'document_url' }
      ]
    );

    await addSection('Examinations',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, e.year, e.exam_name, e.registration_number, e.score, e.admit_card_url, e.result_document_url
       FROM examinations e JOIN students s ON e.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE e.verification_status = 'Approved' ORDER BY s.department, u.name`,
      [
        { header: 'Student Name', key: 'name' }, { header: 'PRN', key: 'roll_number' },
        { header: 'Department', key: 'department' }, { header: 'Study Year', key: 'study_year' },
        { header: 'Year', key: 'year' }, { header: 'Exam Name', key: 'exam_name' },
        { header: 'Registration No', key: 'registration_number' }, { header: 'Score', key: 'score' },
        { header: 'Admit Card URL', key: 'admit_card_url' }, { header: 'Result Document URL', key: 'result_document_url' }
      ]
    );

    await addSection('Higher Education',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, he.year_of_passing, he.program_graduated, he.institution_joined, he.program_admitted
       FROM higher_education he JOIN students s ON he.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE he.verification_status = 'Approved' ORDER BY s.department, u.name`,
      [
        { header: 'Student Name', key: 'name' }, { header: 'PRN', key: 'roll_number' },
        { header: 'Department', key: 'department' }, { header: 'Study Year', key: 'study_year' },
        { header: 'Year of Passing', key: 'year_of_passing' }, { header: 'Program Graduated', key: 'program_graduated' },
        { header: 'Institution Joined', key: 'institution_joined' }, { header: 'Program Admitted', key: 'program_admitted' }
      ]
    );

    await addSection('Extra-Curriculars',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, ec.year, ec.activity_name, ec.description, ec.document_url
       FROM extra_curriculars ec JOIN students s ON ec.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE ec.verification_status = 'Approved' ORDER BY s.department, u.name`,
      [
        { header: 'Student Name', key: 'name' }, { header: 'PRN', key: 'roll_number' },
        { header: 'Department', key: 'department' }, { header: 'Study Year', key: 'study_year' },
        { header: 'Year', key: 'year' }, { header: 'Activity Name', key: 'activity_name' },
        { header: 'Description', key: 'description' }, { header: 'Document URL', key: 'document_url' }
      ]
    );

    await addSection('Certifications',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, c.title, c.provider, c.completion_date::text as completion_date, c.credential_id, c.certificate_url
       FROM certifications c JOIN students s ON c.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE c.verification_status = 'Approved' ORDER BY s.department, u.name`,
      [
        { header: 'Student Name', key: 'name' }, { header: 'PRN', key: 'roll_number' },
        { header: 'Department', key: 'department' }, { header: 'Study Year', key: 'study_year' },
        { header: 'Title', key: 'title' }, { header: 'Provider', key: 'provider' },
        { header: 'Completion Date', key: 'completion_date' }, { header: 'Credential ID', key: 'credential_id' },
        { header: 'Certificate URL', key: 'certificate_url' }
      ]
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=SADAS_Report_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel report.' });
  }
};

// @route   GET /api/admin/reports/pdf
const generatePDFReport = async (req, res) => {
  try {
    const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=SADAS_Report_${Date.now()}.pdf`);
    doc.pipe(res);

    const LEFT = 50;
    const RIGHT = 545;
    const PAGE_BOTTOM = doc.page.height - 60;
    const ROW_HEIGHT = 16;
    const HEADER_HEIGHT = 18;

    // Draw a table row at a fixed y position
    const drawRow = (cols, colWidths, y, bold = false) => {
      let x = LEFT;
      cols.forEach((val, i) => {
        doc
          .fontSize(7.5)
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(String(val ?? ''), x + 2, y + 3, { width: colWidths[i] - 4, ellipsis: true, lineBreak: false });
        x += colWidths[i];
      });
    };

    const drawSection = async (title, query, headers, keys) => {
      const result = await pool.query(query);

      // Check space for section title + header row
      if (doc.y + 40 > PAGE_BOTTOM) doc.addPage();

      // Section title
      doc.fontSize(11).font('Helvetica-Bold').text(title, LEFT, doc.y);
      doc.moveDown(0.2);
      doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).lineWidth(0.5).stroke();
      doc.moveDown(0.3);

      if (result.rows.length === 0) {
        doc.fontSize(8).font('Helvetica').text('No approved records.', LEFT, doc.y);
        doc.moveDown(1.5);
        return;
      }

      // Calculate column widths proportionally
      const pageWidth = RIGHT - LEFT;
      const colWidths = headers.map(() => pageWidth / headers.length);

      // Header row
      let y = doc.y;
      drawRow(headers, colWidths, y, true);
      y += HEADER_HEIGHT;
      doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.3).stroke();
      y += 2;

      // Data rows
      result.rows.forEach(row => {
        if (y + ROW_HEIGHT > PAGE_BOTTOM) {
          doc.addPage();
          y = 50;
          // Redraw header on new page
          drawRow(headers, colWidths, y, true);
          y += HEADER_HEIGHT;
          doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.3).stroke();
          y += 2;
        }
        drawRow(keys.map(k => row[k] ?? ''), colWidths, y, false);
        y += ROW_HEIGHT;
      });

      // Total line
      y += 4;
      doc.fontSize(7.5).font('Helvetica').text(`Total: ${result.rows.length} record(s)`, LEFT, y);
      doc.y = y + 20;
    };

    // ── Title Page Header ──
    doc.fontSize(15).font('Helvetica-Bold').text('Student Activity Data Analysis System', LEFT, 50, { align: 'center', width: RIGHT - LEFT });
    doc.fontSize(10).font('Helvetica').text('Approved Records Report', LEFT, doc.y, { align: 'center', width: RIGHT - LEFT });
    doc.fontSize(8).font('Helvetica').text(`Generated: ${new Date().toLocaleString('en-IN')}`, LEFT, doc.y, { align: 'center', width: RIGHT - LEFT });
    doc.moveDown(1.5);
    doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).lineWidth(1).stroke();
    doc.moveDown(1);

    await drawSection('Field Projects',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, fp.year, fp.project_name, fp.program_code, fp.activity
       FROM field_projects fp JOIN students s ON fp.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE fp.verification_status = 'Approved' ORDER BY s.department, u.name`,
      ['Student Name', 'PRN', 'Department', 'Study Year', 'Year', 'Project Name', 'Program Code', 'Activity'],
      ['name', 'roll_number', 'department', 'study_year', 'year', 'project_name', 'program_code', 'activity']
    );

    await drawSection('Internships',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, i.year, i.duration, i.agency_name
       FROM internships i JOIN students s ON i.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE i.verification_status = 'Approved' ORDER BY s.department, u.name`,
      ['Student Name', 'PRN', 'Department', 'Study Year', 'Year', 'Duration', 'Agency Name'],
      ['name', 'roll_number', 'department', 'study_year', 'year', 'duration', 'agency_name']
    );

    await drawSection('Club Activities',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, ca.year, ca.club_name, ca.activity_name, ca.duration
       FROM club_activities ca JOIN students s ON ca.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE ca.verification_status = 'Approved' ORDER BY s.department, u.name`,
      ['Student Name', 'PRN', 'Department', 'Study Year', 'Year', 'Club Name', 'Activity', 'Duration'],
      ['name', 'roll_number', 'department', 'study_year', 'year', 'club_name', 'activity_name', 'duration']
    );

    await drawSection('Sports Activities',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, sa.year, sa.sport_name, sa.venue, sa.achievement
       FROM sports_activities sa JOIN students s ON sa.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE sa.verification_status = 'Approved' ORDER BY s.department, u.name`,
      ['Student Name', 'PRN', 'Department', 'Study Year', 'Year', 'Sport', 'Venue', 'Achievement'],
      ['name', 'roll_number', 'department', 'study_year', 'year', 'sport_name', 'venue', 'achievement']
    );

    await drawSection('Hackathons',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, h.year, h.organization_name, h.project_name, h.achievement
       FROM hackathons h JOIN students s ON h.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE h.verification_status = 'Approved' ORDER BY s.department, u.name`,
      ['Student Name', 'PRN', 'Department', 'Study Year', 'Year', 'Organization', 'Project', 'Achievement'],
      ['name', 'roll_number', 'department', 'study_year', 'year', 'organization_name', 'project_name', 'achievement']
    );

    await drawSection('Examinations',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, e.year, e.exam_name, e.registration_number, e.score
       FROM examinations e JOIN students s ON e.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE e.verification_status = 'Approved' ORDER BY s.department, u.name`,
      ['Student Name', 'PRN', 'Department', 'Study Year', 'Year', 'Exam Name', 'Reg No', 'Score'],
      ['name', 'roll_number', 'department', 'study_year', 'year', 'exam_name', 'registration_number', 'score']
    );

    await drawSection('Higher Education',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, he.year_of_passing, he.program_graduated, he.institution_joined, he.program_admitted
       FROM higher_education he JOIN students s ON he.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE he.verification_status = 'Approved' ORDER BY s.department, u.name`,
      ['Student Name', 'PRN', 'Department', 'Study Year', 'Year of Passing', 'Program Graduated', 'Institution Joined', 'Program Admitted'],
      ['name', 'roll_number', 'department', 'study_year', 'year_of_passing', 'program_graduated', 'institution_joined', 'program_admitted']
    );

    await drawSection('Extra-Curriculars',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, ec.year, ec.activity_name, ec.description
       FROM extra_curriculars ec JOIN students s ON ec.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE ec.verification_status = 'Approved' ORDER BY s.department, u.name`,
      ['Student Name', 'PRN', 'Department', 'Study Year', 'Year', 'Activity Name', 'Description'],
      ['name', 'roll_number', 'department', 'study_year', 'year', 'activity_name', 'description']
    );

    await drawSection('Certifications',
      `SELECT u.name, s.roll_number, s.department, s.year as study_year, c.title, c.provider, c.completion_date::text as completion_date, c.credential_id
       FROM certifications c JOIN students s ON c.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE c.verification_status = 'Approved' ORDER BY s.department, u.name`,
      ['Student Name', 'PRN', 'Department', 'Study Year', 'Title', 'Provider', 'Completion Date', 'Credential ID'],
      ['name', 'roll_number', 'department', 'study_year', 'title', 'provider', 'completion_date', 'credential_id']
    );

    doc.fontSize(8).font('Helvetica').text('Generated by SADAS — Student Activity Data Analysis System', LEFT, doc.y, { align: 'center', width: RIGHT - LEFT });
    doc.end();
  } catch (error) {
    console.error('PDF report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report.' });
  }
};

module.exports = {
  getUsers, updateUser, deleteUser,
  getAnalytics, getAllStudents,
  getDepartmentAnalytics, getYearAnalytics, getActivityCategoryAnalytics, getInternshipStats,
  generateExcelReport, generatePDFReport, getAllActivities, updateActivityStatus
};
