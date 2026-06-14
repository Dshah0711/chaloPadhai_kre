import Course from '../models/Course.js';
import { generateSyllabus, generateQuizzesForModule } from '../services/geminiService.js';
import { searchYouTubeVideo } from '../services/youtubeService.js';

// Helper to normalize search queries by stripping stop words and extra spaces
function cleanTopic(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars
    .replace(/\b(course|cource|tutorial|training|crash|bootcamp|mastery|class|learn|learning|master|introduction|intro|fundamentals|basics|advanced|complete|intensive|study|blueprint|guide|for beginners|beginners|zero to hero|from zero to hero|day|days)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper to check if one set of words is fully contained in another
function containsAllWords(source, target) {
  if (!source || !target) return false;
  const targetWords = target.split(/\s+/).filter(Boolean);
  const sourceWords = source.split(/\s+/).filter(Boolean);
  if (targetWords.length === 0) return false;
  return targetWords.every(tw => sourceWords.includes(tw));
}

/**
 * Generate a new course using the 4-step decoupled generation pipeline:
 * 1. The Instructional Designer (LLM) - Syllabus skeleton
 * 2. The Video Hunter (YouTube API) - Fetch video IDs
 * 3. The Examiner (LLM) - Custom quizzes for each module
 * 4. The Database Saver (MongoDB) - Save and return payload
 */
export async function createCourse(req, res) {
  try {
    const { topic, duration } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return res.status(400).json({ error: 'Please provide a valid topic.' });
    }

    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || (durationNum !== 1 && (durationNum < 5 || durationNum > 30))) {
      return res.status(400).json({ error: 'Duration must be 1 day or between 5 and 30 days.' });
    }

    // CHECK CACHE: See if the user already generated a course for this exact topic and duration
    const normalizedTopic = topic.trim().toLowerCase();
    const cleanedSearch = cleanTopic(normalizedTopic);

    const userCourses = await Course.find({ userId: req.user.id, duration: durationNum });
    let existingCourse = null;

    for (const c of userCourses) {
      const cleanedQuery = cleanTopic(c.queryTopic || '');
      const cleanedTitle = cleanTopic(c.title || '');

      // Check for matching search words
      if (
        (cleanedQuery && (cleanedQuery === cleanedSearch || containsAllWords(cleanedQuery, cleanedSearch) || containsAllWords(cleanedSearch, cleanedQuery))) ||
        (cleanedTitle && (containsAllWords(cleanedTitle, cleanedSearch) || containsAllWords(cleanedSearch, cleanedTitle)))
      ) {
        existingCourse = c;
        break;
      }
    }

    if (existingCourse) {
      console.log(`[Cache Hit] Cleaned match found: "${existingCourse.title}" (${existingCourse.duration} days) for query "${topic}"`);
      return res.status(200).json(existingCourse);
    }

    // STEP 1: The Instructional Designer (LLM)
    console.log(`[STAGE 1] Designing curriculum structure for: "${topic}" (${durationNum} days)`);
    const syllabus = await generateSyllabus(topic, durationNum);

    if (!syllabus || !syllabus.modules) {
      throw new Error('Syllabus designer failed to return a valid module structure.');
    }

    // Force 'one shot' query keywords for 1-day crash courses
    if (durationNum === 1) {
      syllabus.modules = syllabus.modules.map((module) => {
        if (module.topics && module.topics.length > 0) {
          module.topics = module.topics.map((t) => {
            let q = t.searchQuery || '';
            if (!q.toLowerCase().includes('one shot') && !q.toLowerCase().includes('oneshot') && !q.toLowerCase().includes('crash course')) {
              q = `${q.trim()} one shot`;
            }
            return { ...t, searchQuery: q };
          });
        }
        return module;
      });
    }

    // STAGES 2 & 3: The Video Hunter (YouTube API) & The Examiner (LLM)
    console.log('[STAGE 2] Hunting video tutorials in parallel...');
    // Run YouTube searches in parallel since they do not hit Gemini API quotas
    const videoHunterPromises = syllabus.modules.map(async (module) => {
      let enrichedTopics = [];
      let videoId = '';
      let firstSearchQuery = '';

      if (module.topics && module.topics.length > 0) {
        const topicPromises = module.topics.map(async (topicItem) => {
          let tVideoId = '';
          if (topicItem.searchQuery) {
            tVideoId = await searchYouTubeVideo(topicItem.searchQuery);
          }
          return {
            title: topicItem.title,
            searchQuery: topicItem.searchQuery,
            videoId: tVideoId
          };
        });
        
        enrichedTopics = await Promise.all(topicPromises);
        if (enrichedTopics.length > 0) {
          videoId = enrichedTopics[0].videoId;
          firstSearchQuery = enrichedTopics[0].searchQuery;
        }
      }

      return {
        day: module.day,
        title: module.title,
        description: module.description,
        searchQuery: firstSearchQuery || module.searchQuery || '',
        assignment: module.assignment || '',
        assignmentQuestionnaire: module.assignmentQuestionnaire || [],
        videoId,
        topics: enrichedTopics
      };
    });

    const modulesWithVideos = await Promise.all(videoHunterPromises);

    console.log('[STAGE 3] Generating custom quizzes (Day 1 only for instant loading)...');
    const enrichedModules = [];
    for (const mod of modulesWithVideos) {
      let quizzes = [];
      if (mod.day === 1) {
        console.log(`Generating Day 1 quiz questions: "${mod.title}"`);
        quizzes = await generateQuizzesForModule(
          syllabus.title || topic,
          mod.title,
          mod.description
        );
      }
      enrichedModules.push({
        ...mod,
        quizzes
      });
    }

    // STEP 4: The Database Saver (MongoDB)
    console.log('[STAGE 4] Saving completed blueprint to MongoDB...');
    const newCourse = new Course({
      userId: req.user.id,
      title: syllabus.title || topic,
      queryTopic: topic.trim().toLowerCase(), // Save original query topic for caching lookup
      duration: durationNum,
      modules: enrichedModules,
      completedDays: []
    });

    const savedCourse = await newCourse.save();
    console.log(`Course successfully created: "${savedCourse.title}"`);
    res.status(201).json(savedCourse);

  } catch (error) {
    console.error('Error in createCourse pipeline:', error);
    res.status(500).json({ 
      error: 'An error occurred while building the course.', 
      details: error.message 
    });
  }
}

/**
 * Retrieve a specific course by ID.
 */
export async function getCourse(req, res) {
  try {
    const { id } = req.params;
    const course = await Course.findOne({ _id: id, userId: req.user.id });

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to retrieve course data.' });
  }
}

/**
 * List all saved courses with summary info.
 */
export async function listCourses(req, res) {
  try {
    const courses = await Course.find({ userId: req.user.id }, 'title duration completedDays createdAt')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error('Error listing courses:', error);
    res.status(500).json({ error: 'Failed to list courses.' });
  }
}

/**
 * Toggle the completion status of a day in the course.
 */
export async function toggleDayCompletion(req, res) {
  try {
    const { id } = req.params;
    const { day, completed } = req.body;

    const course = await Course.findOne({ _id: id, userId: req.user.id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const dayNum = parseInt(day, 10);
    const completedIndex = course.completedDays.indexOf(dayNum);

    if (completed) {
      if (completedIndex === -1) {
        course.completedDays.push(dayNum);
      }
    } else {
      if (completedIndex !== -1) {
        course.completedDays.splice(completedIndex, 1);
      }
    }

    course.completedDays.sort((a, b) => a - b);
    const updatedCourse = await course.save();

    res.json(updatedCourse);
  } catch (error) {
    console.error('Error toggling day completion:', error);
    res.status(500).json({ error: 'Failed to update course progress.' });
  }
}

/**
 * Generate 3 more questions for a specific day's module and append them.
 */
export async function generateMoreQuestions(req, res) {
  try {
    const { id, day } = req.params;
    const course = await Course.findOne({ _id: id, userId: req.user.id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const dayNum = parseInt(day, 10);
    const module = course.modules.find(m => m.day === dayNum);
    if (!module) {
      return res.status(404).json({ error: 'Module for this day not found.' });
    }

    console.log(`Generating 3 more questions for Course ID: ${id}, Day: ${dayNum}`);
    const newQuizzes = await generateQuizzesForModule(
      course.title,
      module.title,
      module.description
    );

    if (newQuizzes && newQuizzes.length > 0) {
      module.quizzes.push(...newQuizzes);
      const updatedCourse = await course.save();
      return res.json(updatedCourse);
    } else {
      throw new Error('Failed to generate additional questions.');
    }
  } catch (error) {
    console.error('Error generating more questions:', error);
    res.status(500).json({ 
      error: 'Failed to generate additional questions.', 
      details: error.message 
    });
  }
}

/**
 * Delete a specific course by ID.
 */
export async function deleteCourse(req, res) {
  try {
    const { id } = req.params;
    const deletedCourse = await Course.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!deletedCourse) {
      return res.status(404).json({ error: 'Course not found or unauthorized.' });
    }

    res.json({ success: true, message: 'Course deleted successfully.', courseId: id });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course.' });
  }
}

/**
 * Lazy load / ensure quiz questions are generated for a specific day.
 */
export async function ensureQuiz(req, res) {
  try {
    const { id, day } = req.params;
    const course = await Course.findOne({ _id: id, userId: req.user.id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const dayNum = parseInt(day, 10);
    const module = course.modules.find(m => m.day === dayNum);
    if (!module) {
      return res.status(404).json({ error: 'Module for this day not found.' });
    }

    // If quizzes are already generated, return them immediately
    if (module.quizzes && module.quizzes.length > 0) {
      return res.json({ quizzes: module.quizzes });
    }

    console.log(`[Lazy Gen] Generating initial quizzes for Course ID: ${id}, Day: ${dayNum}`);
    const quizzes = await generateQuizzesForModule(
      course.title,
      module.title,
      module.description
    );

    if (quizzes && quizzes.length > 0) {
      module.quizzes = quizzes;
      await course.save();
      return res.json({ quizzes });
    } else {
      throw new Error('Failed to generate quizzes.');
    }
  } catch (error) {
    console.error('Error ensuring quiz:', error);
    res.status(500).json({ 
      error: 'Failed to ensure quiz exists.', 
      details: error.message 
    });
  }
}
