import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('sadas_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        const userData = {
          ...response.data.data.user,
          token: response.data.data.token
        };
        setUser(userData);
        localStorage.setItem('sadas_user', JSON.stringify(userData));
        toast.success(response.data.message || 'Logged in successfully!');
        return userData;
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to login';
      toast.error(message);
      throw new Error(message);
    }
  };

  const register = async (formData) => {
    try {
      const response = await api.post('/auth/register', formData);
      if (response.data.success) {
        const userData = {
          ...response.data.data.user,
          token: response.data.data.token
        };
        setUser(userData);
        localStorage.setItem('sadas_user', JSON.stringify(userData));
        toast.success('Account created successfully!');
        return userData;
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw new Error(message);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sadas_user');
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
