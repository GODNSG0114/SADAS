const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getUsers, updateUser, deleteUser,
  getAnalytics, getAllStudents,
  getDepartmentAnalytics, getYearAnalytics, getActivityCategoryAnalytics, getInternshipStats,
  generateExcelReport, generatePDFReport, getAllActivities, updateActivityStatus
} = require('../controllers/adminController');

router.use(authenticate, authorize('admin'));

// User management
router.get('/users', getUsers);
router.get('/activities', getAllActivities);
router.put('/activity/:id/status', updateActivityStatus);
router.put('/user/:id', updateUser);
router.delete('/user/:id', deleteUser);

// Students
router.get('/students', getAllStudents);

// Analytics
router.get('/analytics', getAnalytics);
router.get('/analytics/department', getDepartmentAnalytics);
router.get('/analytics/year', getYearAnalytics);
router.get('/analytics/activity-category', getActivityCategoryAnalytics);
router.get('/analytics/internship-stats', getInternshipStats);

// Reports
router.get('/reports/excel', generateExcelReport);
router.get('/reports/pdf', generatePDFReport);

module.exports = router;
