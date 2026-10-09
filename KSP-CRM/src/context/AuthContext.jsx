import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const STORAGE_KEY = 'taxbucket_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // true = user ke rights server se aa chuke hain (isse pehle kisi page ko "No access" nahi dikhate)
  const [accessReady, setAccessReady] = useState(false);
  const userRef = useRef(null);

  const saveUser = (next) => {
    userRef.current = next;
    setUser(next);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const logout = useCallback(() => {
    saveUser(null);
    setAccessReady(false);
  }, []);

  // 🔴 Role aur rights server se taaza karna: Admin / CEO ne rights badle hon toh turant lagu ho jayein
  const refreshUser = useCallback(async () => {
    const current = userRef.current;
    if (!current?.token) return;
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${current.token}` }
      });
      if (userRef.current?.token !== current.token) return; // beech me logout / dusra login ho gaya

      if (data.status === 'Inactive') return logout();

      const next = { ...current, name: data.name, role: data.role, permissions: data.permissions || [], fullAccess: data.fullAccess };
      const changed = next.role !== current.role || next.name !== current.name
        || JSON.stringify(next.permissions) !== JSON.stringify(current.permissions || []);
      if (changed) saveUser(next);
    } catch (error) {
      // Token galat / user delete ho gaya
      if (error.response?.status === 401) logout();
    } finally {
      setAccessReady(true);
    }
  }, [logout]);

  useEffect(() => {
    // Check if user is already logged in from local storage
    const userInfo = localStorage.getItem(STORAGE_KEY);
    if (userInfo) {
      const stored = JSON.parse(userInfo);
      userRef.current = stored;
      setUser(stored);
      refreshUser();
    }
    setLoading(false);
  }, [refreshUser]);

  const login = async (email, password) => {
    try {
      // Backend login API call (permissions = asli rights)
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, { email, password });
      saveUser(data);
      setAccessReady(true);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, accessReady, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
