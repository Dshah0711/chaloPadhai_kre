import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock, User, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isLogin) {
        const result = await login(email, password);
        if (!result.success) {
          setError(result.error);
        }
      } else {
        const result = await register(name, email, password);
        if (!result.success) {
          setError(result.error);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - var(--header-height))',
      padding: '2rem 1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glowing blobs */}
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'rgba(99, 102, 241, 0.08)',
        filter: 'blur(80px)',
        top: '10%',
        left: '15%',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'rgba(168, 85, 247, 0.08)',
        filter: 'blur(80px)',
        bottom: '10%',
        right: '15%',
        zIndex: 0
      }}></div>

      <div className="glass-panel" style={{
        padding: '2.5rem',
        maxWidth: '420px',
        width: '100%',
        zIndex: 1,
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.03)',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <GraduationCap className="logo-icon animate-pulse-glow" size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px', textAlign: 'center', lineHeight: '1.4' }}>
            {isLogin ? 'Sign in to access your customized study dashboards' : 'Register to design and track your custom courses'}
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#fda4af',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            animation: 'fadeIn 0.3s ease'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Name input (SignUp only) */}
            {!isLogin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="name" style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: focusedField === 'name' ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'color 0.2s' }} />
                  <input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField('')}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      background: 'rgba(8, 12, 22, 0.6)',
                      border: focusedField === 'name' ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid var(--panel-border)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    required
                  />
                </div>
              </div>
            )}

            {/* Email input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="email" style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: focusedField === 'email' ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'color 0.2s' }} />
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField('')}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    background: 'rgba(8, 12, 22, 0.6)',
                    border: focusedField === 'email' ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid var(--panel-border)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  required
                />
              </div>
            </div>

            {/* Password input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="password" style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: focusedField === 'password' ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'color 0.2s' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 40px',
                    background: 'rgba(8, 12, 22, 0.6)',
                    border: focusedField === 'password' ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid var(--panel-border)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '4px'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ padding: '12px', fontSize: '0.95rem', marginTop: '0.5rem' }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <RefreshCw className="animate-spin" size={16} /> Connecting...
                </>
              ) : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </form>

        {/* Footer Toggle */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-primary)',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
