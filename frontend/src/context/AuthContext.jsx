import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { UNAUTHORIZED_EVENT } from '../services/api.js';
import { clearToken, readToken, saveToken } from '../services/tokenStorage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(readToken()));

  const clearSession = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const savedToken = readToken();
    if (!savedToken) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    api.get('/user', { signal: controller.signal })
      .then(({ data }) => {
        if (active) setUser(data.user);
      })
      .catch((error) => {
        if (active && error.code !== 'ERR_CANCELED') clearSession();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [clearSession]);

  useEffect(() => {
    function onUnauthorized() {
      setToken(null);
      setUser(null);
      setLoading(false);
    }
    function onStorage(event) {
      if (event.key === 'poultrystock_token' || event.key === null) {
        if (!readToken()) onUnauthorized();
      }
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const establishSession = useCallback((data) => {
    if (!data?.token || !data?.user) {
      throw new Error('Unexpected login response from the API.');
    }
    if (!saveToken(data.token)) {
      throw new Error('Browser storage is unavailable. Allow site storage and try again.');
    }
    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/login', credentials);
    establishSession(data);
  }, [establishSession]);

  const register = useCallback(async (details) => {
    const { data } = await api.post('/register', details);
    establishSession(data);
  }, [establishSession]);

  const logout = useCallback(async () => {
    let revokeError = null;
    try {
      await api.post('/logout');
    } catch (error) {
      revokeError = error;
    } finally {
      clearSession();
    }
    if (revokeError) {
      throw new Error('Logged out locally, but the server could not confirm token revocation.');
    }
  }, [clearSession]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user && readToken()),
    login,
    register,
    logout,
  }), [user, token, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
