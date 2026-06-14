import { GoogleGenerativeAI } from '@google/generative-ai';

// Fallback models list. The service will try these models sequentially if quota limits or availability issues occur.
// We put gemini-2.0-flash first as it has its own quota pool and is highly available.
const FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-1.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-pro'
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper to call model.generateContent with fallback loops for quota recovery.
 */
async function generateContentWithFallback(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment variables.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`[Gemini API] Attempting generation with model: "${modelName}"`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const responseText = result.response.text();
      if (responseText && responseText.trim() !== '') {
        console.log(`[Gemini API] Generation succeeded using model: "${modelName}"`);
        return responseText;
      }
    } catch (error) {
      console.warn(`[Gemini API] Model "${modelName}" failed:`, error.message);
      lastError = error;
      
      // If we hit quota, resource exhaustion, model not found, or bad gateway, try next model
      const isRecoverable = 
        error.message.includes('Quota') || 
        error.message.includes('limit') || 
        error.message.includes('404') || 
        error.message.includes('503') ||
        error.message.includes('high demand') ||
        error.message.includes('exhausted');

      if (isRecoverable) {
        // Wait a short duration before trying the next model to avoid hitting key-level rate limit thresholds
        console.log(`[Gemini API] Recoverable error. Waiting 2 seconds before trying next model...`);
        await sleep(2000);
        continue;
      } else {
        // Break early if it's an API Key validation issue
        if (error.message.includes('API key') || error.message.includes('invalid')) {
          throw error;
        }
      }
    }
  }

  throw new Error(`All fallback Gemini models exhausted. Last error: ${lastError ? lastError.message : 'Unknown error'}`);
}

/**
 * Helper to clean markdown code blocks from response string before parsing.
 */
function parseJsonContent(text) {
  let cleanedText = text.trim();
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?/, '');
    cleanedText = cleanedText.replace(/```$/, '');
    cleanedText = cleanedText.trim();
  }
  return JSON.parse(cleanedText);
}

/**
 * STEP 1: The Instructional Designer (LLM)
 * Generates a structured course syllabus skeleton (without quizzes).
 * @param {string} topic The topic of the course
 * @param {number} duration The duration in days
 * @returns {Promise<Object>} The generated syllabus
 */
export async function generateSyllabus(topic, duration) {
  const prompt = `
    You are an expert instructional designer and educator.
    Create a highly structured, chronological course syllabus on the topic: "${topic}" designed to be completed in exactly ${duration} day(s).
    
    For each day, you must:
    1. Define a clear title and descriptive learning objectives.
    2. Break down the day's curriculum into a list of specific, distinct sub-topics (concepts/tools to cover).
    3. For each sub-topic, provide a clear "title" and an optimized YouTube "searchQuery" targeting a high-quality video tutorial for that specific concept (e.g., if the sub-topic is "Vertical vs Horizontal scaling", the searchQuery should be "vertical vs horizontal scaling system design tutorial").
    4. Design a practical, hands-on project assignment ("assignment") for the student to complete after watching the videos. The assignment MUST be strictly bounded to today's topics and description; do not ask the user to perform tasks requiring advanced features that are outside the scope of this day's lessons.
    5. Prepare exactly 3 questionnaire questions ("assignmentQuestionnaire") testing comprehension of today's topics. For each question, include a "question" (the exercise or problem) and "correctAnswer" (the complete solution/correct response) so the student can verify their work.

    You MUST respond in valid JSON matching the following structure:
    {
      "title": "Title of the course based on the topic",
      "modules": [
        {
          "day": 1,
          "title": "Module Title for Day 1",
          "description": "Comprehensive description of what will be learned on Day 1.",
          "topics": [
            {
              "title": "Sub-topic 1 Title",
              "searchQuery": "optimized YouTube search query for Sub-topic 1"
            },
            {
              "title": "Sub-topic 2 Title",
              "searchQuery": "optimized YouTube search query for Sub-topic 2"
            }
          ],
          "assignment": "A highly targeted, hands-on project or review assignment that matches the day's topics context exactly. Give concrete, step-by-step instructions. Keep tasks strictly limited to the concepts covered in this day's videos.",
          "assignmentQuestionnaire": [
            {
              "question": "Question 1 related to today's topics?",
              "correctAnswer": "Complete solution, code snippet, or explanation for Question 1."
            },
            {
              "question": "Question 2 related to today's topics?",
              "correctAnswer": "Complete solution, code snippet, or explanation for Question 2."
            },
            {
              "question": "Question 3 related to today's topics?",
              "correctAnswer": "Complete solution, code snippet, or explanation for Question 3."
            }
          ]
        }
      ]
    }

    Rules:
    - The number of modules in the array MUST equal exactly the duration of ${duration} day(s).
    - If the duration is exactly 1 day, this represents a "one-shot" crash course. In this case, ensure the "topics" array contains a single topic that targets a complete, comprehensive 'one shot' or 'crash course' video tutorial covering the entire subject (e.g. "React Hooks complete crash course one shot").
    - For multi-day courses (5 to 30 days), provide 3 to 5 sub-topics per day in the "topics" array.
    - Ensure all fields are populated and JSON is clean and valid. Do not include any markdown styling like \`\`\`json or surrounding text.
  `;

  try {
    const responseText = await generateContentWithFallback(prompt);
    const syllabus = parseJsonContent(responseText);
    return syllabus;
  } catch (error) {
    console.error('Error generating course syllabus from Gemini API:', error);
    throw new Error(`Failed to generate course syllabus: ${error.message}`);
  }
}

/**
 * STEP 3: The Examiner (LLM)
 * Generates custom multiple-choice quizzes for a specific module's context.
 * @param {string} courseTitle The overall title of the course
 * @param {string} moduleTitle The title of the current day's module
 * @param {string} moduleDescription The description of the module
 * @returns {Promise<Array>} Array of 3 quiz questions
 */
export async function generateQuizzesForModule(courseTitle, moduleTitle, moduleDescription) {
  const prompt = `
    You are an expert examiner and educator.
    Create a high-quality 3-question multiple choice quiz for a day in the course: "${courseTitle}".
    The sub-topic for this specific day is: "${moduleTitle}"
    Learning context for today: "${moduleDescription}"

    For each of the 3 questions, you must:
    1. Formulate a challenging, clear question testing comprehension of today's context.
    2. Provide exactly 4 plausible options.
    3. Specify the correct answer as a 0-indexed integer (0, 1, 2, or 3).
    4. Provide a helpful, educational explanation of why that option is correct.

    You MUST respond in valid JSON matching the following structure:
    [
      {
        "question": "Question text here?",
        "options": ["Option 0", "Option 1", "Option 2", "Option 3"],
        "correctAnswer": 0,
        "explanation": "Detailed explanation of why Option 0 is correct."
      }
    ]

    Rules:
    - Return exactly 3 questions in the array.
    - Ensure all fields are populated and JSON is clean and valid. Do not include any markdown styling like \`\`\`json or surrounding text.
  `;

  try {
    const responseText = await generateContentWithFallback(prompt);
    const quizzes = parseJsonContent(responseText);
    return quizzes;
  } catch (error) {
    console.error(`Error generating quizzes for module "${moduleTitle}":`, error);
    // Return a graceful fallback quiz if generation fails for this specific module
    return [
      {
        "question": `Review Question: What is the main focus of ${moduleTitle}?`,
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": `Make sure to review the core concepts of: ${moduleDescription}`
      }
    ];
  }
}
