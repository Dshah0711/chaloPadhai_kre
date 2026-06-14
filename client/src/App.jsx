import React, { useState } from 'react';
import LandingPage from './pages/LandingPage';
import GeneratingPage from './pages/GeneratingPage';
import WorkspacePage from './pages/WorkspacePage';
import AuthPage from './pages/AuthPage';
import { useAuth } from './context/AuthContext';
import { GraduationCap, LogOut, User } from 'lucide-react';

export default function App() {
  const [page, setPage] = useState('landing'); // 'landing' | 'generating' | 'workspace'
  const [generatingTopic, setGeneratingTopic] = useState('');
  const [generatingDuration, setGeneratingDuration] = useState(5);
  const [activeCourseId, setActiveCourseId] = useState(null);

  const { user, loading, logout, authFetch } = useAuth();

  const handleGenerateCourse = async (topic, duration) => {
    setGeneratingTopic(topic);
    setGeneratingDuration(duration);
    setPage('generating');

    try {
      const response = await authFetch('http://localhost:5000/api/courses', {
        method: 'POST',
        body: JSON.stringify({ topic, duration }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate course.');
      }

      const createdCourse = await response.json();
      setActiveCourseId(createdCourse._id);
      setPage('workspace');
    } catch (err) {
      console.error('Generation failed:', err);
      alert(`Error building course: ${err.message}`);
      setPage('landing');
    }
  };

  const handleSelectCourse = (courseId) => {
    setActiveCourseId(courseId);
    setPage('workspace');
  };

  const handleBackToHome = () => {
    setActiveCourseId(null);
    setPage('landing');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', background: 'var(--bg-color)', color: '#fff' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading session...</p>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    return (
      <div className="app-container">
        <header className="main-header">
          <div className="logo-container">
            <GraduationCap className="logo-icon animate-pulse-glow" size={28} />
            <span>Chalo<span className="gradient-text">Padhai</span>Kre</span>
          </div>
        </header>
        <AuthPage />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Premium Header */}
      <header className="main-header">
        <a href="/" className="logo-container" onClick={(e) => { e.preventDefault(); handleBackToHome(); }}>
          <GraduationCap className="logo-icon animate-pulse-glow" size={28} />
          <span>Chalo<span className="gradient-text">Padhai</span>Kre</span>
        </a>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* User badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              fontWeight: 'bold'
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: '500' }}>{user.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {page !== 'landing' && (
              <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={handleBackToHome}>
                Home Dashboard
              </button>
            )}
            
            <button 
              className="btn-secondary" 
              style={{ padding: '8px', borderRadius: '10px', color: 'var(--danger)' }} 
              onClick={logout}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Page Routing/Rendering */}
      <main style={{ flex: 1 }}>
        {page === 'landing' && (
          <LandingPage 
            onGenerate={handleGenerateCourse} 
            onSelectCourse={handleSelectCourse} 
          />
        )}
        
        {page === 'generating' && (
          <GeneratingPage 
            topic={generatingTopic} 
            duration={generatingDuration} 
          />
        )}
        
        {page === 'workspace' && (
          <WorkspacePage 
            courseId={activeCourseId} 
            onBack={handleBackToHome} 
          />
        )}
      </main>
    </div>
  );
}
