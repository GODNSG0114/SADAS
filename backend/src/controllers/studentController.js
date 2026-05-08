const { body } = require('express-validator');
const { pool } = require('../config/database');
const { validate } = require('../middleware/errorHandler');
const { evaluateCertificate } = require('../services/aiVerificationService');

// @route   GET /api/student/profile
// @access  Private (Student)
const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name, u.email, u.created_at as account_created,
       COALESCE(act.activity_count, 0) as activity_count,
       COALESCE(intn.internship_count, 0) as internship_count,
       COALESCE(cert.cert_count, 0) as cert_count
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN (SELECT student_id, COUNT(*) as activity_count FROM activities GROUP BY student_id) act ON act.student_id = s.id
       LEFT JOIN (SELECT student_id, COUNT(*) as internship_count FROM internships GROUP BY student_id) intn ON intn.student_id = s.id
       LEFT JOIN (SELECT student_id, COUNT(*) as cert_count FROM certifications GROUP BY student_id) cert ON cert.student_id = s.id
       WHERE s.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
};

// @route   PUT /api/student/profile
// @access  Private (Student)
const updateProfile = [
  body('department').optional().trim().notEmpty(),
  body('year').optional().isInt({ min: 1, max: 4 }),
  body('cgpa').optional().isFloat({ min: 0, max: 10 }),
  body('phone').optional().trim(),
  body('skills').optional().isArray(),
  validate,
  async (req, res) => {
    try {
      const { department, year, cgpa, phone, address, skills, roll_number } = req.body;
      const { name } = req.body;

      // Update user name if provided
      if (name) {
        await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, req.user.id]);
      }

      const result = await pool.query(
        `UPDATE students SET
          department = COALESCE($1, department),
          year = COALESCE($2, year),
          cgpa = COALESCE($3, cgpa),
          phone = COALESCE($4, phone),
          address = COALESCE($5, address),
          skills = COALESCE($6, skills),
          roll_number = COALESCE($7, roll_number),
          updated_at = NOW()
         WHERE user_id = $8
         RETURNING *`,
        [department, year, cgpa, phone, address, skills, roll_number, req.user.id]
      );

      res.json({ success: true, message: 'Profile updated successfully', data: result.rows[0] });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to update profile.' });
    }
  }
];

// @route   GET /api/student/activities
// @access  Private (Student)
const getActivities = async (req, res) => {
  try {
    const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

    const result = await pool.query(
      'SELECT * FROM activities WHERE student_id = $1 ORDER BY date DESC',
      [studentResult.rows[0].id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activities.' });
  }
};

// @route   POST /api/student/activity
// @access  Private (Student)
const addActivity = [
  body('category').isIn(['Technical', 'Cultural', 'Sports', 'Social Service', 'Research', 'Workshop', 'Seminar', 'Conference', 'Other']),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('date').isDate().withMessage('Valid date is required'),
  validate,
  async (req, res) => {
    try {
      const { category, title, description, date, certificate_url, level, award } = req.body;

      const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

      // Run AI verification if certificate URL provided
      let verificationStatus = 'Pending';
      let aiConfidence = null;
      let aiReason = null;
      if (certificate_url) {
        try {
          const aiDecision = await evaluateCertificate(certificate_url, title);
          verificationStatus = aiDecision.status;
          aiConfidence = aiDecision.confidence_score;
          aiReason = aiDecision.reason;
        } catch (aiErr) {
          console.error('[AI] Verification failed, defaulting to Pending:', aiErr.message);
        }
      }

      const result = await pool.query(
        `INSERT INTO activities (student_id, category, title, description, date, certificate_url, level, award, verification_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [studentResult.rows[0].id, category, title, description, date, certificate_url, level, award, verificationStatus]
      );

      res.status(201).json({
        success: true,
        message: `Activity submitted. Status: ${verificationStatus}.`,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Add activity error:', error);
      res.status(500).json({ success: false, message: 'Failed to add activity.' });
    }
  }
];

// @route   PUT /api/student/activity/:id
// @access  Private (Student)
const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, title, description, date, certificate_url, level, award } = req.body;

    const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

    const result = await pool.query(
      `UPDATE activities SET
        category = COALESCE($1, category),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        date = COALESCE($4, date),
        certificate_url = COALESCE($5, certificate_url),
        level = COALESCE($6, level),
        award = COALESCE($7, award),
        updated_at = NOW()
       WHERE id = $8 AND student_id = $9 RETURNING *`,
      [category, title, description, date, certificate_url, level, award, id, studentResult.rows[0].id]
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Activity not found.' });
    res.json({ success: true, message: 'Activity updated', data: result.rows[0] });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to update activity.' });
  }
};

// @route   DELETE /api/student/activity/:id
const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

    const result = await pool.query(
      'DELETE FROM activities WHERE id = $1 AND student_id = $2 RETURNING id',
      [id, studentResult.rows[0].id]
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Activity not found.' });
    res.json({ success: true, message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete activity.' });
  }
};

// @route   GET /api/student/internships
const getInternships = async (req, res) => {
  try {
    const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

    const result = await pool.query(
      'SELECT * FROM internships WHERE student_id = $1 ORDER BY start_date DESC',
      [studentResult.rows[0].id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch internships.' });
  }
};

// @route   POST /api/student/internship
const addInternship = [
  body('agency_name').trim().notEmpty().withMessage('Agency/Company name is required'),
  body('duration').trim().notEmpty().withMessage('Duration is required'),
  validate,
  async (req, res) => {
    try {
      // Frontend sends: year, duration, agency_name, document_url
      const { year, duration, agency_name, document_url } = req.body;

      const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

      const result = await pool.query(
        `INSERT INTO internships (student_id, year, duration, agency_name, document_url)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [studentResult.rows[0].id, year || null, duration, agency_name, document_url || null]
      );

      res.status(201).json({ success: true, message: 'Internship added successfully', data: result.rows[0] });
    } catch (error) {
      console.error('Add internship error:', error);
      res.status(500).json({ success: false, message: 'Failed to add internship.' });
    }
  }
];

// @route   DELETE /api/student/internship/:id
const deleteInternship = async (req, res) => {
  try {
    const { id } = req.params;
    const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query(
      'DELETE FROM internships WHERE id = $1 AND student_id = $2 RETURNING id',
      [id, studentResult.rows[0].id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Internship not found.' });
    res.json({ success: true, message: 'Internship deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete internship.' });
  }
};

// @route   GET /api/student/certifications
const getCertifications = async (req, res) => {
  try {
    const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

    const result = await pool.query(
      'SELECT * FROM certifications WHERE student_id = $1 ORDER BY completion_date DESC',
      [studentResult.rows[0].id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch certifications.' });
  }
};

// @route   POST /api/student/certification
const addCertification = [
  body('title').trim().notEmpty().withMessage('Certification title is required'),
  body('provider').trim().notEmpty().withMessage('Provider is required'),
  body('completion_date').isDate().withMessage('Valid completion date is required'),
  validate,
  async (req, res) => {
    try {
      const { title, provider, completion_date, certificate_url, credential_id, expiry_date } = req.body;

      const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

      const result = await pool.query(
        `INSERT INTO certifications (student_id, title, provider, completion_date, certificate_url, credential_id, expiry_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [studentResult.rows[0].id, title, provider, completion_date, certificate_url, credential_id, expiry_date]
      );

      res.status(201).json({ success: true, message: 'Certification added successfully', data: result.rows[0] });
    } catch (error) {
      console.error('Add certification error:', error);
      res.status(500).json({ success: false, message: 'Failed to add certification.' });
    }
  }
];

// @route   DELETE /api/student/certification/:id
const deleteCertification = async (req, res) => {
  try {
    const { id } = req.params;
    const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query(
      'DELETE FROM certifications WHERE id = $1 AND student_id = $2 RETURNING id',
      [id, studentResult.rows[0].id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Certification not found.' });
    res.json({ success: true, message: 'Certification deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete certification.' });
  }
};

// @route   GET /api/student/semester-results
const getSemesterResults = async (req, res) => {
  try {
    const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

    const result = await pool.query(
      'SELECT * FROM semester_results WHERE student_id = $1 ORDER BY semester ASC',
      [studentResult.rows[0].id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch semester results.' });
  }
};

// @route   POST /api/student/semester-result
const addSemesterResult = [
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
  body('cgpa').isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
  validate,
  async (req, res) => {
    try {
      const { semester, cgpa, sgpa, academic_year, backlogs } = req.body;
      const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

      const result = await pool.query(
        `INSERT INTO semester_results (student_id, semester, cgpa, sgpa, academic_year, backlogs)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_id, semester) DO UPDATE SET
           cgpa = EXCLUDED.cgpa, sgpa = EXCLUDED.sgpa,
           academic_year = EXCLUDED.academic_year, backlogs = EXCLUDED.backlogs
         RETURNING *`,
        [studentResult.rows[0].id, semester, cgpa, sgpa, academic_year, backlogs || 0]
      );

      // Update student's overall CGPA
      await pool.query('UPDATE students SET cgpa = $1, updated_at = NOW() WHERE id = $2',
        [cgpa, studentResult.rows[0].id]);

      res.status(201).json({ success: true, message: 'Semester result saved successfully', data: result.rows[0] });
    } catch (error) {
      console.error('Add semester result error:', error);
      res.status(500).json({ success: false, message: 'Failed to save semester result.' });
    }
  }
];

const getDashboard = async (req, res) => {
  try {
    const studentResult = await pool.query(
      `SELECT s.*, u.name, u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = $1`,
      [req.user.id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }
    const student = studentResult.rows[0];

    const statsResult = await pool.query(`
      SELECT
        (
          (SELECT COUNT(*) FROM activities WHERE student_id = $1) +
          (SELECT COUNT(*) FROM field_projects WHERE student_id = $1) +
          (SELECT COUNT(*) FROM club_activities WHERE student_id = $1) +
          (SELECT COUNT(*) FROM sports_activities WHERE student_id = $1) +
          (SELECT COUNT(*) FROM hackathons WHERE student_id = $1) +
          (SELECT COUNT(*) FROM examinations WHERE student_id = $1) +
          (SELECT COUNT(*) FROM extra_curriculars WHERE student_id = $1) +
          (SELECT COUNT(*) FROM higher_education WHERE student_id = $1)
        ) as "totalActivities",
        (SELECT COUNT(*) FROM internships WHERE student_id = $1) as "totalInternships",
        (SELECT COUNT(*) FROM certifications WHERE student_id = $1) as "totalCertifications"
    `, [student.id]);

    const categoryResult = await pool.query(
      `SELECT category, COUNT(*) as count FROM (
        SELECT category FROM activities WHERE student_id = $1
        UNION ALL
        SELECT 'Field Project' as category FROM field_projects WHERE student_id = $1
        UNION ALL
        SELECT 'Internship' as category FROM internships WHERE student_id = $1
        UNION ALL
        SELECT 'Club Activity' as category FROM club_activities WHERE student_id = $1
        UNION ALL
        SELECT 'Sports Activity' as category FROM sports_activities WHERE student_id = $1
        UNION ALL
        SELECT 'Hackathon' as category FROM hackathons WHERE student_id = $1
        UNION ALL
        SELECT 'Examination' as category FROM examinations WHERE student_id = $1
        UNION ALL
        SELECT 'Extra-Curricular' as category FROM extra_curriculars WHERE student_id = $1
        UNION ALL
        SELECT 'Higher Education' as category FROM higher_education WHERE student_id = $1
      ) all_records GROUP BY category ORDER BY count DESC`,
      [student.id]
    );

    const semesterResults = await pool.query(
      'SELECT * FROM semester_results WHERE student_id = $1 ORDER BY semester ASC',
      [student.id]
    );

    // Fetch all submissions with their status for notifications
    const submissionsResult = await pool.query(`
      SELECT id, 'field-project' as record_type, project_name as title, verification_status, rejection_reason, updated_at FROM field_projects WHERE student_id = $1
      UNION ALL
      SELECT id, 'internship' as record_type, COALESCE(agency_name, 'Internship') as title, verification_status, rejection_reason, updated_at FROM internships WHERE student_id = $1
      UNION ALL
      SELECT id, 'club-activity' as record_type, activity_name as title, verification_status, rejection_reason, updated_at FROM club_activities WHERE student_id = $1
      UNION ALL
      SELECT id, 'sports-activity' as record_type, sport_name as title, verification_status, rejection_reason, updated_at FROM sports_activities WHERE student_id = $1
      UNION ALL
      SELECT id, 'hackathon' as record_type, project_name as title, verification_status, rejection_reason, updated_at FROM hackathons WHERE student_id = $1
      UNION ALL
      SELECT id, 'examination' as record_type, exam_name as title, verification_status, rejection_reason, updated_at FROM examinations WHERE student_id = $1
      UNION ALL
      SELECT id, 'extra-curricular' as record_type, activity_name as title, verification_status, rejection_reason, updated_at FROM extra_curriculars WHERE student_id = $1
      UNION ALL
      SELECT id, 'higher-education' as record_type, institution_joined as title, verification_status, rejection_reason, updated_at FROM higher_education WHERE student_id = $1
      ORDER BY updated_at DESC
    `, [student.id]);

    res.json({
      success: true,
      data: {
        student,
        stats: {
          ...statsResult.rows[0],
          activityByCategory: categoryResult.rows
        },
        semesterResults: semesterResults.rows,
        submissions: submissionsResult.rows
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard.' });
  }
};

// @route   GET /api/student/field-projects
const getFieldProjects = async (req, res) => {
  try {
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (student.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });
    const result = await pool.query('SELECT * FROM field_projects WHERE student_id = $1 ORDER BY created_at DESC', [student.rows[0].id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch field projects.' });
  }
};

// @route   POST /api/student/field-project
const addFieldProject = [
  body('project_name').trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { year, project_name, program_code, activity, document_url } = req.body;
      const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      const result = await pool.query(
        `INSERT INTO field_projects (student_id, year, project_name, program_code, activity, document_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [student.rows[0].id, year, project_name, program_code, activity, document_url]
      );
      res.status(201).json({ success: true, message: 'Added successfully', data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to add.' });
    }
  }
];

const getClubActivities = async (req, res) => {
  try {
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query('SELECT * FROM club_activities WHERE student_id = $1 ORDER BY created_at DESC', [student.rows[0].id]);
    res.json({ success: true, data: result.rows });
  } catch (error) { res.status(500).json({ success: false }); }
};

const addClubActivity = async (req, res) => {
  try {
    const { year, club_name, activity_name, duration, document_url } = req.body;
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query(
      `INSERT INTO club_activities (student_id, year, club_name, activity_name, duration, document_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [student.rows[0].id, year, club_name, activity_name, duration, document_url]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getSportsActivities = async (req, res) => {
  try {
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query('SELECT * FROM sports_activities WHERE student_id = $1 ORDER BY created_at DESC', [student.rows[0].id]);
    res.json({ success: true, data: result.rows });
  } catch (error) { res.status(500).json({ success: false }); }
};

const addSportsActivity = async (req, res) => {
  try {
    const { year, sport_name, venue, achievement, document_url } = req.body;
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query(
      `INSERT INTO sports_activities (student_id, year, sport_name, venue, achievement, document_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [student.rows[0].id, year, sport_name, venue, achievement, document_url]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getHigherEducation = async (req, res) => {
  try {
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query('SELECT * FROM higher_education WHERE student_id = $1 ORDER BY created_at DESC', [student.rows[0].id]);
    res.json({ success: true, data: result.rows });
  } catch (error) { res.status(500).json({ success: false }); }
};

const addHigherEducation = async (req, res) => {
  try {
    const { year_of_passing, program_graduated, institution_joined, program_admitted } = req.body;
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query(
      `INSERT INTO higher_education (student_id, year_of_passing, program_graduated, institution_joined, program_admitted) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [student.rows[0].id, year_of_passing, program_graduated, institution_joined, program_admitted]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getExaminations = async (req, res) => {
  try {
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query('SELECT * FROM examinations WHERE student_id = $1 ORDER BY created_at DESC', [student.rows[0].id]);
    res.json({ success: true, data: result.rows });
  } catch (error) { res.status(500).json({ success: false }); }
};

const addExamination = async (req, res) => {
  try {
    const { year, registration_number, exam_name, score, admit_card_url, result_document_url } = req.body;
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query(
      `INSERT INTO examinations (student_id, year, registration_number, exam_name, score, admit_card_url, result_document_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [student.rows[0].id, year, registration_number, exam_name, score, admit_card_url, result_document_url]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getHackathons = async (req, res) => {
  try {
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query('SELECT * FROM hackathons WHERE student_id = $1 ORDER BY created_at DESC', [student.rows[0].id]);
    res.json({ success: true, data: result.rows });
  } catch (error) { res.status(500).json({ success: false }); }
};

const addHackathon = async (req, res) => {
  try {
    const { year, organization_name, achievement, project_name, document_url } = req.body;
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query(
      `INSERT INTO hackathons (student_id, year, organization_name, achievement, project_name, document_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [student.rows[0].id, year, organization_name, achievement, project_name, document_url]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getExtraCurriculars = async (req, res) => {
  try {
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query('SELECT * FROM extra_curriculars WHERE student_id = $1 ORDER BY created_at DESC', [student.rows[0].id]);
    res.json({ success: true, data: result.rows });
  } catch (error) { res.status(500).json({ success: false }); }
};

const addExtraCurricular = async (req, res) => {
  try {
    const { year, activity_name, description, document_url } = req.body;
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const result = await pool.query(
      `INSERT INTO extra_curriculars (student_id, year, activity_name, description, document_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [student.rows[0].id, year, activity_name, description, document_url]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { res.status(500).json({ success: false }); }
};

// ============================================================
// EDIT ENDPOINTS (reset status to Pending on edit)
// ============================================================
const editRecord = async (req, res) => {
  const { record_type, id } = req.params;
  const tableMap = {
    'field-project':    { table: 'field_projects',   fields: ['year','project_name','program_code','activity','document_url'] },
    'internship':       { table: 'internships',       fields: ['year','duration','agency_name','document_url'] },
    'club-activity':    { table: 'club_activities',   fields: ['year','club_name','activity_name','duration','document_url'] },
    'sports-activity':  { table: 'sports_activities', fields: ['year','sport_name','venue','achievement','document_url'] },
    'higher-education': { table: 'higher_education',  fields: ['year_of_passing','program_graduated','institution_joined','program_admitted'] },
    'examination':      { table: 'examinations',      fields: ['year','registration_number','exam_name','score','admit_card_url','result_document_url'] },
    'hackathon':        { table: 'hackathons',        fields: ['year','organization_name','achievement','project_name','document_url'] },
    'extra-curricular': { table: 'extra_curriculars', fields: ['year','activity_name','description','document_url'] },
  };

  const config = tableMap[record_type];
  if (!config) return res.status(400).json({ success: false, message: 'Invalid record type.' });

  try {
    const student = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (student.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found.' });

    const setClauses = config.fields.map((f, i) => `${f} = COALESCE($${i + 1}, ${f})`).join(', ');
    const values = config.fields.map(f => req.body[f] ?? null);
    values.push(id, student.rows[0].id);

    const result = await pool.query(
      `UPDATE ${config.table} SET ${setClauses}, verification_status = 'Pending', rejection_reason = NULL, updated_at = NOW()
       WHERE id = $${config.fields.length + 1} AND student_id = $${config.fields.length + 2} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Record not found.' });
    res.json({ success: true, message: 'Record updated and resubmitted for approval.', data: result.rows[0] });
  } catch (error) {
    console.error('Edit record error:', error);
    res.status(500).json({ success: false, message: 'Failed to update record.' });
  }
};

module.exports = {
  getProfile, updateProfile,
  getActivities, addActivity, updateActivity, deleteActivity,
  getInternships, addInternship, deleteInternship,
  getCertifications, addCertification, deleteCertification,
  getSemesterResults, addSemesterResult,
  getDashboard,
  getFieldProjects, addFieldProject,
  getClubActivities, addClubActivity,
  getSportsActivities, addSportsActivity,
  getHigherEducation, addHigherEducation,
  getExaminations, addExamination,
  getHackathons, addHackathon,
  getExtraCurriculars, addExtraCurricular,
  editRecord
};
