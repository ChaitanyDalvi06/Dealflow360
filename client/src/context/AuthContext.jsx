import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('df360_token');
    const savedUser = localStorage.getItem('df360_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user: userData, token: authToken } = response.data;

    setUser(userData);
    setToken(authToken);
    localStorage.setItem('df360_token', authToken);
    localStorage.setItem('df360_user', JSON.stringify(userData));

    return userData;
  };

  const signup = async (name, email, password, role = 'SALES_REP') => {
    const response = await api.post('/auth/signup', { name, email, password, role });
    const { user: userData, token: authToken } = response.data;

    setUser(userData);
    setToken(authToken);
    localStorage.setItem('df360_token', authToken);
    localStorage.setItem('df360_user', JSON.stringify(userData));

    return userData;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('df360_token');
    localStorage.removeItem('df360_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
