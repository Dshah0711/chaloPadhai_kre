import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Clock, Calendar, ArrowRight, Library, Sparkles, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage({ onGenerate, onSelectCourse }) {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(5);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  
  const { authFetch } = useAuth();
  const carouselRef = useRef(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await authFetch('http://localhost:5000/api/courses');
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onGenerate(topic, duration);
  };

  const handleDeleteCourse = async (e, courseId) => {
    e.stopPropagation(); // Avoid triggering card click
    if (!window.confirm("Are you sure you want to delete this course? This action cannot be undone.")) return;

    try {
      const response = await authFetch(`http://localhost:5000/api/courses/${courseId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from UI state
        setCourses(prev => prev.filter(c => c._id !== courseId));
        // Evict from localStorage permanent cache
        localStorage.removeItem(`ai_course_cache_${courseId}`);
      } else {
        alert("Failed to delete course.");
      }
    } catch (err) {
      console.error("Error deleting course:", err);
      alert("Network error while deleting course.");
    }
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '6px 16px', 
          borderRadius: '20px', 
          fontSize: '0.875rem', 
          fontWeight: '600', 
          color: 'var(--text-secondary)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '1.5rem'
        }}>
          <Sparkles size={14} className="animate-pulse-glow" /> Powered by Gemini LLM
        </div>
        <h1 className="gradient-text" style={{ fontSize: '3.8rem', marginBottom: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Your Personal On-Demand University
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
          Stop browsing YouTube manually and dealing with distractions. Type what you want to learn, set your timeframe, and get a completely structured, quiz-enabled course in seconds.
        </p>
      </section>

      {/* Course Generator Input Panel */}
      <section className="glass-panel" style={{ padding: '2.5rem', maxWidth: '750px', margin: '0 auto 4rem auto', position: 'relative' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Input field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="topic-input" style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                What subject do you want to master?
              </label>
              <input
                id="topic-input"
                type="text"
                placeholder="e.g. Data Science with Python, Modern Architecture, French for Beginners"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '8px',
                  background: '#0c0c0c',
                  border: '1px solid var(--panel-border)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--panel-border-hover)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--panel-border)'}
                required
              />
            </div>

            {/* Duration selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="duration-input" style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Course Duration
              </label>
              <select
                id="duration-input"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '8px',
                  background: '#0c0c0c',
                  border: '1px solid var(--panel-border)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="1">1 Day (One-Shot Crash Course)</option>
                {Array.from({ length: 26 }, (_, i) => i + 5).map((d) => (
                  <option key={d} value={d}>
                    {d === 30 ? '30 Days (1 Month)' : `${d} Days`}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn-primary" style={{ padding: '16px 24px', fontSize: '1.05rem', justifyContent: 'center' }}>
              Generate Course Blueprint <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </section>

      {/* Previously Generated Courses catalog */}
      <section style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '3rem', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Library className="logo-icon" size={24} /> Previous Courses
          </h2>
          
          {courses.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={scrollLeft}
                className="carousel-nav-btn"
                title="Scroll Left"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={scrollRight}
                className="carousel-nav-btn"
                title="Scroll Right"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {loadingCourses ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>
            Loading previously generated dashboards...
          </div>
        ) : courses.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem', 
            background: 'rgba(255, 255, 255, 0.01)', 
            borderRadius: '16px', 
            border: '1px dashed rgba(255,255,255,0.05)', 
            color: 'var(--text-secondary)' 
          }}>
            No courses generated yet. Use the tool above to build your first course!
          </div>
        ) : (
          <div 
            ref={carouselRef}
            className="carousel-container"
            style={{ 
              display: 'flex', 
              gap: '20px', 
              overflowX: 'auto', 
              scrollBehavior: 'smooth', 
              padding: '10px 5px',
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none' /* IE 10+ */
            }}
          >
            {courses.map((course) => {
              const completedCount = course.completedDays ? course.completedDays.length : 0;
              const percent = Math.round((completedCount / course.duration) * 100);
              
              return (
                <div 
                  key={course._id} 
                  className="course-card"
                  onClick={() => onSelectCourse(course._id)}
                  style={{
                    flex: '0 0 360px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '200px',
                    position: 'relative'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.35', fontWeight: '600' }} title={course.title}>
                        {course.title}
                      </h3>
                      <button
                        onClick={(e) => handleDeleteCourse(e, course._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          transition: 'color 0.2s, background-color 0.2s',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--danger)';
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-muted)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="Delete Course"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                      <span className="course-meta-pill">
                        <Clock size={12} /> {course.duration} Days
                      </span>
                      <span className="course-meta-pill">
                        <BookOpen size={12} /> {completedCount} / {course.duration} Completed
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      <span>Progress</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
