import { createContext, useContext, useEffect, useState } from 'react';

const AuthCtx = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || '';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('united_auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const savedToken = parsed.token || null;
        const savedUser = parsed.user || null;
        setToken(savedToken);
        setUser(savedUser);
        if (savedToken && API_URL) {
          fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          })
            .then((res) => {
              if (res.ok) return res.json().catch(() => ({}));
              if (res.status === 401) throw new Error('unauthorized');
              throw new Error('session check failed');
            })
            .then((data) => {
              if (data && typeof data === 'object') setUser(data);
            })
            .catch(() => {
              setToken(null);
              setUser(null);
              localStorage.removeItem('united_auth');
            })
            .finally(() => setLoading(false));
          return;
        }
      } catch {
        localStorage.removeItem('united_auth');
      }
    }
    setLoading(false);
  }, []);

  const login = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('united_auth', JSON.stringify({ token: nextToken, user: nextUser }));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('united_auth');
  };

  return (
    <AuthCtx.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

