import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { authApi } from '../services/index.js';
import { clearAuth, getUserInfo, isLoggedIn, saveAuth } from '../utils/authStorage.js';

const AuthContext = createContext(null);

/** 全局认证上下文：登录、注册、退出 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUserInfo());
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success && res.data) {
      saveAuth(res.data);
      setUser(res.data.user);
      setLoggedIn(true);
    }
    return res;
  }, []);

  const register = useCallback(async (form) => {
    const res = await authApi.register(form);
    if (res.success) {
      // 注册成功后自动登录
      return login(form.email, form.password);
    }
    return res;
  }, [login]);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setLoggedIn(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!isLoggedIn()) return null;
    const res = await authApi.me();
    if (res.success && res.data) {
      saveAuth({ user: res.data, access_token: localStorage.getItem('access_token'), refresh_token: localStorage.getItem('refresh_token') });
      setUser(res.data);
      setLoggedIn(true);
    }
    return res;
  }, []);

  const value = useMemo(
    () => ({ user, loggedIn, login, register, logout, refreshProfile }),
    [user, loggedIn, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 须在 AuthProvider 内使用');
  return ctx;
}
