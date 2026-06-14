import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    const savedToken = localStorage.getItem('ai_course_auth_token');
    const savedUser = localStorage.getItem('ai_course_auth_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to log in.' };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('ai_course_auth_token', data.token);
      localStorage.setItem('ai_course_auth_user', JSON.stringify(data.user));
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Connection error while signing in.' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to register account.' };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('ai_course_auth_token', data.token);
      localStorage.setItem('ai_course_auth_user', JSON.stringify(data.user));
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: 'Connection error while creating account.' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ai_course_auth_token');
    localStorage.removeItem('ai_course_auth_user');
  };

  // Helper function to handle fetch requests with Authorization headers
  const authFetch = async (url, options = {}) => {
    const activeToken = token || localStorage.getItem('ai_course_auth_token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(url, {
      ...options,
      headers
    });

    if (res.status === 401) {
      // Token expired or invalid, log out user
      logout();
    }

    return res;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    authFetch
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
