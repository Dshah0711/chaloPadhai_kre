# ChaloPadhAiKre 🎓🤖
> Your Personal, On-Demand, AI-Powered University

ChaloPadhAiKre (Let's Study with AI) is a premium, full-stack, AI-powered custom course builder. Instead of browsing YouTube manually or sifting through unorganized tutorials, users can simply type any topic they want to learn, select their timeframe (from a 1-day crash course up to a 30-day comprehensive syllabus), and receive a highly-structured, video-enriched, quiz-enabled course in seconds.

## ✨ Features
- **Intelligent Syllabus Generator**: Leverages the Gemini API to decouple any learning topic into distinct, chronological daily modules with clear learning objectives and assignments.
- **Automated Video Hunting**: Queries and embeds the top, high-quality YouTube tutorial guides matching generated sub-topics.
- **Interactive Quizzes**: Custom multi-choice assessments (with automated self-evaluation and educational explanations) are lazy-loaded for daily lessons.
- **Practice Assignments**: Custom project specifications mapped to daily module contents with self-assessment questionnaires and high-fidelity PDF exporting.
- **JWT-Protected User Dashboards**: Multi-user account support with bcrypt password hashing and token-based state management.
- **Course Completion Tracker**: Track, view, and persist your overall progress across modules in your dashboard.
- **Optimized Gemini Fallback & Backoff**: High reliability and request resilience through automated models fallback (`gemini-2.0-flash`, `gemini-1.5-flash`, etc.) and backoff delays.

## 🛠️ Technology Stack
- **Frontend**: React (v19), Vite, Vanilla CSS (Futuristic Dark/Glassmorphism Theme), Lucide Icons
- **Backend**: Node.js, Express, MongoDB (Mongoose ODM), JWT, Bcrypt
- **APIs**: Google Gemini API, YouTube Search API (with scraper fallback)

## 📁 File Structure
```text
chaloPadhai_kre/
├── client/                 # React + Vite Frontend
│   ├── src/
│   │   ├── context/        # Auth Context & Wrapper Fetches
│   │   ├── pages/          # Auth, Landing, Workspace, & Loading screens
│   │   ├── config.js       # Dynamic Base API URL Configuration
│   │   └── index.css       # Custom Glassmorphism Styles & Global Tokens
│   └── package.json
└── server/                 # Express Backend Server
    ├── controllers/        # Auth and Course Generation Logic
    ├── middleware/         # Protected routes verify JWT Token
    ├── models/             # User and Course Mongoose Schema definitions
    ├── routes/             # Authentication & Course Pipelines
    ├── services/           # Gemini API Wrapper & Fallbacks
    └── server.js           # Server Initialization & MongoDB Connection
```

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas Cluster)
- Gemini API Key (from Google AI Studio)

### 1. Backend Setup
1. Navigate to the `server/` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server/` folder:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   GEMINI_API_KEY=your_gemini_api_key
   YOUTUBE_API_KEY=your_youtube_api_key
   JWT_SECRET=your_jwt_secret_key
   ```
4. Run the development server (auto-reloads with nodemon):
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the `client/` directory:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🌐 Production Deployment

### 1. Backend (Render / Railway)
- Host directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variables required: `MONGODB_URI`, `GEMINI_API_KEY`, `YOUTUBE_API_KEY`, `JWT_SECRET`.

### 2. Frontend (Vercel)
- Host directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables required: `VITE_API_URL` (points to your deployed backend URL, e.g. `https://your-backend.onrender.com` without a trailing `/`).
