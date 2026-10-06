'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { authAPI } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = Cookies.get('accessToken');
      if (token) {
        const { data } = await authAPI.getMe();
        if (data.success) {
          setUser(data.data);
        }
      }
    } catch (error) {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    if (data.success) {
      Cookies.set('accessToken', data.data.accessToken, { expires: 7 });
      Cookies.set('refreshToken', data.data.refreshToken, { expires: 30 });
      setUser(data.data.user);
    }
    return data;
  };

  const adminLogin = async (email, password) => {
    const { data } = await authAPI.adminLogin({ email, password });
    if (data.success) {
      Cookies.set('accessToken', data.data.accessToken, { expires: 7 });
      Cookies.set('refreshToken', data.data.refreshToken, { expires: 30 });
      setUser(data.data.user);
    }
    return data;
  };

  const register = async (fullName, email, password) => {
    const { data } = await authAPI.register({ fullName, email, password });
    if (data.success) {
      Cookies.set('accessToken', data.data.accessToken, { expires: 7 });
      Cookies.set('refreshToken', data.data.refreshToken, { expires: 30 });
      setUser(data.data.user);
    }
    return data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Continue logout even if API fails
    }
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const isAdmin = user && ['admin', 'admin_posts', 'admin_support'].includes(user.role);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      adminLogin,
      register,
      logout,
      updateUser,
      isAdmin,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
