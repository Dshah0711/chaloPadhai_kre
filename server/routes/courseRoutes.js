import express from 'express';
import { 
  createCourse, 
  getCourse, 
  listCourses, 
  toggleDayCompletion,
  generateMoreQuestions,
  deleteCourse
} from '../controllers/courseController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all course routes
router.use(authMiddleware);

// Route to create a new course
router.post('/', createCourse);

// Route to list all courses
router.get('/', listCourses);

// Route to get details of a specific course
router.get('/:id', getCourse);

// Route to toggle the completion of a specific day
router.put('/:id/toggle-day', toggleDayCompletion);

// Route to generate more quiz questions for a specific day
router.post('/:id/modules/:day/more-questions', generateMoreQuestions);

// Route to delete a specific course
router.delete('/:id', deleteCourse);

export default router;
