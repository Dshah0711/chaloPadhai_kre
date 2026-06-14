import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';

export default function GeneratingPage({ topic, duration }) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { label: 'Instructional Design', desc: 'Gemini AI splitting topic into daily modules...' },
    { label: 'Video Hunting', desc: 'Querying YouTube for top tutorial guides...' },
    { label: 'Examiner Phase', desc: 'Gemini AI composing relevant quiz assessments...' },
    { label: 'Finalizing Workspace', desc: 'Caching blueprint and opening dashboard...' }
  ];

  useEffect(() => {
    // Progressively highlight steps to simulate real backend pipeline progression
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="generator-loading-container">
      {/* Spinning holographic loader */}
      <div className="spinning-rings-container">
        <div className="ring ring-outer"></div>
        <div className="ring ring-middle"></div>
        <div className="ring ring-inner">
          <Loader2 className="logo-icon animate-spin" style={{ width: '40px', height: '40px', color: 'var(--accent-primary)', animation: 'spin 1.5s linear infinite' }} />
        </div>
      </div>

      <h2 style={{ fontSize: '2rem', marginBottom: '8px', fontWeight: '800' }}>
        Building Custom Course
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '500px', fontSize: '1rem' }}>
        Analyzing <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>"{topic}"</span> across a <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{duration}-day</span> duration.
      </p>

      {/* Steps List */}
      <div className="loader-status-list">
        {steps.map((step, idx) => {
          const isCompleted = idx < activeStep;
          const isActive = idx === activeStep;
          
          let cardClass = 'status-step';
          if (isCompleted) cardClass += ' completed';
          if (isActive) cardClass += ' active';

          return (
            <div key={idx} className={cardClass}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{step.label}</span>
                <span style={{ fontSize: '0.8rem', color: isCompleted ? 'rgba(16, 185, 129, 0.7)' : isActive ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                  {step.desc}
                </span>
              </div>
              
              <div>
                {isCompleted ? (
                  <CheckCircle2 size={20} color="var(--success)" />
                ) : isActive ? (
                  <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Circle size={20} color="rgba(255, 255, 255, 0.15)" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
