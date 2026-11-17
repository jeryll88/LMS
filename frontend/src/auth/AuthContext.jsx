import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Fetch verified session on mount
  useEffect(() => {
    api
      .get('/api/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    const { user, token } = res.data;
    if (token) localStorage.setItem('token', token);
    if (user) {
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    }
    return user;
  };

  const register = async (userData) => {
    const res = await api.post('/api/auth/register', userData);
    const { user, token } = res.data;
    if (token) localStorage.setItem('token', token);
    if (user) {
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    }
    return user;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      console.warn('Logout request error:', e.message);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
