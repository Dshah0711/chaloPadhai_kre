import mongoose from 'mongoose';

const QuizSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // Index of the correct option (0-3)
  explanation: { type: String, required: true }
});

const VideoSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  title: { type: String, required: true }
});

const TopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  searchQuery: { type: String, required: true },
  videoId: { type: String, default: '' }
});

const AssignmentQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  correctAnswer: { type: String, required: true }
});

const ModuleSchema = new mongoose.Schema({
  day: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  searchQuery: { type: String, required: true },
  videoId: { type: String, default: '' },
  videos: [VideoSchema], // Playlist array
  topics: [TopicSchema], // Sub-topics playlist array
  assignment: { type: String, default: '' },
  assignmentQuestionnaire: [AssignmentQuestionSchema], // 3 practice questions with correct answers
  quizzes: [QuizSchema]
});

const CourseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  queryTopic: { type: String }, // Stores original user search query for cache lookup
  duration: { type: Number, required: true },
  modules: [ModuleSchema],
  completedDays: [{ type: Number }], // Array of completed day numbers
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Course', CourseSchema);
