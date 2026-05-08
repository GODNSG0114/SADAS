const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getProfile, updateProfile,
  getDashboard,
  // old fallback routes
  getActivities, addActivity, updateActivity, deleteActivity,
  getInternships, addInternship, deleteInternship,
  getCertifications, addCertification, deleteCertification,
  getSemesterResults, addSemesterResult,
  // 7 new routes
  getFieldProjects, addFieldProject,
  getClubActivities, addClubActivity,
  getSportsActivities, addSportsActivity,
  getHigherEducation, addHigherEducation,
  getExaminations, addExamination,
  getHackathons, addHackathon,
  getExtraCurriculars, addExtraCurricular,
  editRecord
} = require('../controllers/studentController');

// All routes require student auth
router.use(authenticate, authorize('student'));

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Legacy Activities
router.get('/activities', getActivities);
router.post('/activity', addActivity);
router.put('/activity/:id', updateActivity);
router.delete('/activity/:id', deleteActivity);

// Internships (Updated Schema)
router.get('/internships', getInternships);
router.post('/internship', addInternship);
router.delete('/internship/:id', deleteInternship);

// Certifications
router.get('/certifications', getCertifications);
router.post('/certification', addCertification);
router.delete('/certification/:id', deleteCertification);

// Semester Results
router.get('/semester-results', getSemesterResults);
router.post('/semester-result', addSemesterResult);

// NEW 7 DISCRETE FORM ROUTES
router.get('/field-projects', getFieldProjects);
router.post('/field-project', addFieldProject);

router.get('/club-activities', getClubActivities);
router.post('/club-activity', addClubActivity);

router.get('/sports-activities', getSportsActivities);
router.post('/sports-activity', addSportsActivity);

router.get('/higher-education', getHigherEducation);
router.post('/higher-education', addHigherEducation);

router.get('/examinations', getExaminations);
router.post('/examination', addExamination);

router.get('/hackathons', getHackathons);
router.post('/hackathon', addHackathon);

router.get('/extra-curriculars', getExtraCurriculars);
router.post('/extra-curricular', addExtraCurricular);

// Edit any record type (resets to Pending)
router.put('/record/:record_type/:id', editRecord);

module.exports = router;
