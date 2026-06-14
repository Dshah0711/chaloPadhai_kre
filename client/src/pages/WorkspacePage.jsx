import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, CheckCircle, Circle, Play, Award, 
  HelpCircle, BookOpen, ExternalLink, RefreshCw, Download 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function WorkspacePage({ courseId, onBack }) {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeDay, setActiveDay] = useState(1);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // Stores chosen answers per question index: { [qIdx]: optionIdx }
  const [submittedQuiz, setSubmittedQuiz] = useState(false); // Tracks whether quiz has been evaluated
  const [quizScore, setQuizScore] = useState(0);

  // New tab and quiz expander states
  const [activeTab, setActiveTab] = useState('quiz'); // 'quiz' | 'assignment'
  const [generatingMore, setGeneratingMore] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState('');
  const [revealedSolutions, setRevealedSolutions] = useState({});

  const { authFetch } = useAuth();

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  // Reset quiz and set active video when active day or course changes
  useEffect(() => {
    setSelectedAnswers({});
    setSubmittedQuiz(false);
    setQuizScore(0);
    setActiveTab('quiz'); // Reset back to quiz tab
    setRevealedSolutions({});
    
    if (course) {
      const activeMod = course.modules.find((m) => m.day === activeDay) || course.modules[0];
      if (activeMod) {
        if (activeMod.topics && activeMod.topics.length > 0) {
          setActiveVideoId(activeMod.topics[0].videoId);
        } else {
          setActiveVideoId(activeMod.videoId || '');
        }
      }
    }
  }, [activeDay, course]);

  const fetchCourseDetails = async () => {
    const cacheKey = `ai_course_cache_${courseId}`;
    const cachedData = localStorage.getItem(cacheKey);
    let loadedFromCache = false;

    // STEP 4 Caching: Load immediately from local permanent cache if present
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setCourse(parsed);
        setLoading(false);
        loadedFromCache = true;

        if (parsed.modules && parsed.modules.length > 0) {
          const firstIncomplete = parsed.modules.find(
            m => !parsed.completedDays.includes(m.day)
          );
          setActiveDay(firstIncomplete ? firstIncomplete.day : 1);
        }
      } catch (e) {
        console.error('Failed to parse cached course blueprint:', e);
      }
    }

    try {
      if (!loadedFromCache) {
        setLoading(true);
      }
      const response = await authFetch(`http://localhost:5000/api/courses/${courseId}`);
      if (response.ok) {
        const data = await response.json();
        setCourse(data);
        
        // Cache the blueprint permanently in localStorage
        localStorage.setItem(cacheKey, JSON.stringify(data));
        
        if (!loadedFromCache && data.modules && data.modules.length > 0) {
          const firstIncomplete = data.modules.find(
            m => !data.completedDays.includes(m.day)
          );
          setActiveDay(firstIncomplete ? firstIncomplete.day : 1);
        }
      } else {
        if (!loadedFromCache) {
          setError('Failed to fetch course details.');
        }
      }
    } catch (err) {
      if (!loadedFromCache) {
        setError('Connection error while fetching course.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = async (dayNum, isCompleted) => {
    try {
      const response = await authFetch(`http://localhost:5000/api/courses/${courseId}/toggle-day`, {
        method: 'PUT',
        body: JSON.stringify({ day: dayNum, completed: isCompleted })
      });

      if (response.ok) {
        const updatedCourse = await response.json();
        setCourse(updatedCourse);
        // Sync the local permanent cache
        localStorage.setItem(`ai_course_cache_${courseId}`, JSON.stringify(updatedCourse));
      }
    } catch (err) {
      console.error('Error toggling completion status:', err);
    }
  };

  const handleGenerateMoreQuestions = async () => {
    try {
      setGeneratingMore(true);
      const response = await authFetch(`http://localhost:5000/api/courses/${courseId}/modules/${activeDay}/more-questions`, {
        method: 'POST'
      });

      if (response.ok) {
        const updatedCourse = await response.json();
        setCourse(updatedCourse);
        // Sync the local permanent cache
        localStorage.setItem(`ai_course_cache_${courseId}`, JSON.stringify(updatedCourse));
        
        setSelectedAnswers({});
        setSubmittedQuiz(false);
        setQuizScore(0);
      } else {
        alert('Failed to generate more questions. Please try again.');
      }
    } catch (err) {
      console.error('Error generating more questions:', err);
      alert('Network error while generating more questions.');
    } finally {
      setGeneratingMore(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '16px' }}>
        <RefreshCw className="animate-spin" size={32} color="var(--accent-primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading learning environment...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '16px', padding: '2rem' }}>
        <p style={{ color: 'var(--danger)' }}>{error || 'Course not found.'}</p>
        <button className="btn-secondary" onClick={onBack}>Go Back Home</button>
      </div>
    );
  }

  const activeModule = course.modules.find((m) => m.day === activeDay) || course.modules[0];
  const completedCount = course.completedDays.length;
  const progressPercent = Math.round((completedCount / course.duration) * 100);

  const handleSelectOption = (qIdx, optIdx) => {
    if (submittedQuiz) return;
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmitQuiz = () => {
    if (submittedQuiz || !activeModule.quizzes) return;
    
    let score = 0;
    activeModule.quizzes.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });

    setQuizScore(score);
    setSubmittedQuiz(true);

  };

  const toggleSolution = (qIdx) => {
    setRevealedSolutions(prev => ({ ...prev, [qIdx]: !prev[qIdx] }));
  };

  const handleDownloadPDF = () => {
    if (!course || !activeModule) return;
    const printWindow = window.open('', '_blank');
    const questionnaireHtml = activeModule.assignmentQuestionnaire && activeModule.assignmentQuestionnaire.length > 0
      ? activeModule.assignmentQuestionnaire.map((q, idx) => `
          <div class="questionnaire-card">
            <div class="question-title">Q${idx + 1}: ${q.question}</div>
            <div class="solution-box">
              <strong>Answer/Solution:</strong><br/>
              ${q.correctAnswer.replace(/\n/g, '<br/>')}
            </div>
          </div>
        `).join('')
      : '<p>No questionnaire practice questions available for this day.</p>';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${course.title} - Day ${activeDay} Assignment</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              color: #1f2937;
              padding: 2.5rem;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 2px solid #6366f1;
              padding-bottom: 1.5rem;
              margin-bottom: 2rem;
            }
            .course-title {
              font-size: 1.25rem;
              color: #6366f1;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin: 0;
            }
            .module-title {
              font-size: 2.25rem;
              color: #111827;
              margin: 0.5rem 0 0 0;
              font-weight: 800;
              letter-spacing: -0.025em;
            }
            .section-title {
              font-size: 1.35rem;
              color: #111827;
              border-bottom: 2px solid #f3f4f6;
              padding-bottom: 0.5rem;
              margin-top: 2.5rem;
              margin-bottom: 1rem;
              font-weight: 700;
            }
            .assignment-box {
              background: #f9fafb;
              border: 1px dashed #d1d5db;
              border-radius: 12px;
              padding: 1.5rem;
              white-space: pre-wrap;
              color: #374151;
              font-size: 0.95rem;
            }
            .questionnaire-card {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 1.25rem;
              margin-bottom: 1.5rem;
              background: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .question-title {
              font-weight: 700;
              color: #111827;
              font-size: 1.05rem;
              margin-bottom: 0.75rem;
            }
            .solution-box {
              margin-top: 0.75rem;
              padding: 1rem;
              background: #f0fdf4;
              border-left: 4px solid #10b981;
              border-radius: 4px;
              color: #065f46;
              font-size: 0.95rem;
            }
            .footer-info {
              margin-top: 3rem;
              border-top: 1px solid #e5e7eb;
              padding-top: 1rem;
              text-align: center;
              font-size: 0.8rem;
              color: #9ca3af;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 class="course-title">${course.title}</h2>
            <h1 class="module-title">Day ${activeDay}: ${activeModule.title}</h1>
          </div>
          
          <h3 class="section-title">Practical Project Assignment</h3>
          <div class="assignment-box">${activeModule.assignment}</div>
          
          <h3 class="section-title">Comprehension Questionnaire & Exercises</h3>
          <div>
            ${questionnaireHtml}
          </div>
          
          <div class="footer-info">
            Generated by Antigravity AI Course Builder.
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="workspace-layout">
      {/* LEFT PANEL - Navigation Tree & Timeline */}
      <div className="workspace-left">
        <button 
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            marginBottom: '1rem',
            alignSelf: 'flex-start'
          }}
        >
          <ChevronLeft size={16} /> Home Dashboard
        </button>

        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-primary)' }}>{course.title}</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <span>Progress: {completedCount} / {course.duration} Days</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
          {course.modules.map((m) => {
            const isCompleted = course.completedDays.includes(m.day);
            const isActive = m.day === activeDay;
            
            return (
              <button
                key={m._id || m.day}
                className={`module-nav-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => setActiveDay(m.day)}
              >
                <div className="day-badge">
                  {m.day}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: '600', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                  }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: isCompleted ? 'var(--success)' : 'var(--text-muted)' }}>
                    {isCompleted ? 'Completed' : 'Pending'}
                  </div>
                </div>
                <div>
                  {isCompleted ? (
                    <CheckCircle size={18} color="var(--success)" style={{ flexShrink: 0 }} />
                  ) : (
                    <Circle size={18} color="rgba(255,255,255,0.15)" style={{ flexShrink: 0 }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER PANEL - Video Frame and Details */}
      <div className="workspace-center">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '4px 10px', borderRadius: '6px' }}>
              DAY {activeDay} OF {course.duration}
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px' }}>
            {activeModule.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {activeModule.description}
          </p>
        </div>

        {/* Embedded Video frame */}
        {activeVideoId ? (
          <div className="video-container">
            <iframe
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=0&rel=0`}
              title={activeModule.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '1px dashed rgba(255,255,255,0.08)',
            padding: '4rem 2rem',
            textAlign: 'center',
            gap: '12px'
          }}>
            <Play size={40} color="var(--text-muted)" />
            <div>
              <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>No video tutorial automatically matched.</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>You can lookup the tutorial query manually below.</p>
            </div>
            <a 
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(activeModule.searchQuery)}`} 
              target="_blank" 
              rel="noreferrer"
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '8px 16px' }}
            >
              Search YouTube manually <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* Study Playlist Section */}
        {activeModule.topics && activeModule.topics.length > 0 && (
          <div className="glass-panel" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={16} color="var(--accent-primary)" /> Today's Playlist ({activeModule.topics.length} topics)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeModule.topics.map((topicItem, tIdx) => {
                const isActive = topicItem.videoId && topicItem.videoId === activeVideoId;
                return (
                  <button
                    key={`topic-${activeDay}-${tIdx}`}
                    onClick={() => topicItem.videoId && setActiveVideoId(topicItem.videoId)}
                    className={`playlist-item ${isActive ? 'active' : ''}`}
                    disabled={!topicItem.videoId}
                    style={{ opacity: topicItem.videoId ? 1 : 0.5, cursor: topicItem.videoId ? 'pointer' : 'not-allowed' }}
                  >
                    <span className="playlist-badge">
                      {tIdx + 1}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.3' }}>
                      {topicItem.title}
                    </span>
                    <span className="playlist-status">
                      {topicItem.videoId ? (isActive ? 'Playing' : 'Watch') : 'No Video'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Course Completion toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Finished studying this module?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Mark it as done to update your syllabus progress.</p>
          </div>
          <button
            onClick={() => handleToggleDay(activeDay, !course.completedDays.includes(activeDay))}
            className={course.completedDays.includes(activeDay) ? 'btn-secondary' : 'btn-primary'}
            style={{ 
              padding: '10px 20px', 
              fontSize: '0.9rem',
              borderColor: course.completedDays.includes(activeDay) ? 'var(--success)' : '',
              color: course.completedDays.includes(activeDay) ? 'var(--success)' : ''
            }}
          >
            {course.completedDays.includes(activeDay) ? 'Completed ✓' : 'Mark Completed'}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL - Quizzes & Interactive Assessments */}
      <div className="workspace-right">
        {/* Tab Selector Segment */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '8px' }}>
          <button 
            onClick={() => setActiveTab('quiz')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '0.85rem',
              background: activeTab === 'quiz' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
              color: activeTab === 'quiz' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: activeTab === 'quiz' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
            }}
          >
            Interactive Quiz
          </button>
          <button 
            onClick={() => setActiveTab('assignment')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '0.85rem',
              background: activeTab === 'assignment' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
              color: activeTab === 'assignment' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: activeTab === 'assignment' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
            }}
          >
            Practice Assignment
          </button>
        </div>

        {activeTab === 'quiz' ? (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <HelpCircle size={16} color="var(--accent-primary)" /> Day {activeDay} Quiz
            </h2>

            {!activeModule.quizzes || activeModule.quizzes.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No quiz generated for this day.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {activeModule.quizzes.map((quiz, qIdx) => {
                  const selectedOpt = selectedAnswers[qIdx];
                  
                  return (
                    <div key={qIdx} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ 
                          background: 'rgba(255,255,255,0.03)', 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '6px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          color: 'var(--text-secondary)',
                          flexShrink: 0
                        }}>
                          {qIdx + 1}
                        </span>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                          {quiz.question}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '32px' }}>
                        {quiz.options.map((opt, optIdx) => {
                          const isSelected = selectedOpt === optIdx;
                          const isCorrect = quiz.correctAnswer === optIdx;
                          
                          let optClass = 'quiz-option-card';
                          if (submittedQuiz) {
                            if (isCorrect) optClass += ' correct';
                            else if (isSelected) optClass += ' incorrect';
                          } else if (isSelected) {
                            optClass += ' selected';
                          }

                          return (
                            <button
                              key={optIdx}
                              className={optClass}
                              onClick={() => handleSelectOption(qIdx, optIdx)}
                              disabled={submittedQuiz}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {submittedQuiz && (
                        <div style={{ 
                          marginLeft: '32px', 
                          padding: '12px', 
                          borderRadius: '8px', 
                          background: selectedOpt === quiz.correctAnswer ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                          borderLeft: `3px solid ${selectedOpt === quiz.correctAnswer ? 'var(--success)' : 'var(--danger)'}`,
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)'
                        }}>
                          <strong style={{ color: selectedOpt === quiz.correctAnswer ? 'var(--success)' : 'var(--danger)', display: 'block', marginBottom: '4px' }}>
                            {selectedOpt === quiz.correctAnswer ? 'Correct!' : 'Incorrect'}
                          </strong>
                          {quiz.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Quiz Action Block */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {submittedQuiz ? (
                    <div className="glass-panel" style={{ 
                      padding: '1.25rem', 
                      textAlign: 'center', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '8px',
                      borderColor: quizScore === activeModule.quizzes.length ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'
                    }}>
                      <Award size={32} color={quizScore === activeModule.quizzes.length ? 'var(--success)' : 'var(--accent-primary)'} />
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: '700' }}>Quiz Complete</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          You scored <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{quizScore} / {activeModule.quizzes.length}</span> correct answers.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '6px' }}>
                        {quizScore < activeModule.quizzes.length && (
                          <button 
                            onClick={() => {
                              setSelectedAnswers({});
                              setSubmittedQuiz(false);
                              setQuizScore(0);
                            }}
                            className="btn-secondary"
                            style={{ flex: 1, fontSize: '0.8rem', padding: '8px 12px' }}
                          >
                            Retry Quiz
                          </button>
                        )}
                        <button 
                          onClick={handleGenerateMoreQuestions}
                          className="btn-primary"
                          style={{ flex: 1, fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid var(--accent-primary)' }}
                          disabled={generatingMore}
                        >
                          {generatingMore ? 'Generating...' : 'Learn More (Add Questions)'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        onClick={handleSubmitQuiz}
                        className="btn-primary"
                        style={{ width: '100%', padding: '12px' }}
                        disabled={Object.keys(selectedAnswers).length < activeModule.quizzes.length}
                      >
                        Submit Quiz Answers
                      </button>
                      <button 
                        onClick={handleGenerateMoreQuestions}
                        className="btn-secondary"
                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                        disabled={generatingMore}
                      >
                        {generatingMore ? 'Generating...' : 'Add More Questions'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} color="var(--accent-primary)" /> Practice Assignment
              </h2>
              <button
                onClick={handleDownloadPDF}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  color: 'var(--text-primary)'
                }}
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
              Complete this targeted project to lock in what you've learned from today's video material.
            </p>

            <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: '600' }}>Tasks & Exercises:</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {activeModule.assignment || "Design a practical codebase solution exploring today's topics and verify the output compiles cleanly."}
              </p>
            </div>

            {/* Questionnaire Section */}
            {activeModule.assignmentQuestionnaire && activeModule.assignmentQuestionnaire.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '8px' }}>
                  Comprehension Questionnaire (Self-Assessment)
                </h3>
                {activeModule.assignmentQuestionnaire.map((item, qIdx) => {
                  const isRevealed = !!revealedSolutions[qIdx];
                  return (
                    <div key={qIdx} className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.01)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '600', lineHeight: '1.4' }}>
                        Q{qIdx + 1}: {item.question}
                      </p>
                      
                      <button
                        onClick={() => toggleSolution(qIdx)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', alignSelf: 'flex-start' }}
                      >
                        {isRevealed ? 'Hide Solution' : 'Reveal Solution'}
                      </button>

                      {isRevealed && (
                        <div style={{ 
                          marginTop: '4px', 
                          padding: '12px', 
                          borderRadius: '8px', 
                          background: 'rgba(16, 185, 129, 0.05)', 
                          borderLeft: '3px solid var(--success)',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.5'
                        }}>
                          <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '4px' }}>Correct Solution / Explanation:</strong>
                          {item.correctAnswer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => handleToggleDay(activeDay, !course.completedDays.includes(activeDay))}
              className={course.completedDays.includes(activeDay) ? 'btn-secondary' : 'btn-primary'}
              style={{ 
                width: '100%', 
                padding: '12px', 
                fontSize: '0.9rem',
                borderColor: course.completedDays.includes(activeDay) ? 'var(--success)' : '',
                color: course.completedDays.includes(activeDay) ? 'var(--success)' : '',
                marginTop: '1rem'
              }}
            >
              {course.completedDays.includes(activeDay) ? 'Assignment Completed ✓' : 'Mark Assignment Completed'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
