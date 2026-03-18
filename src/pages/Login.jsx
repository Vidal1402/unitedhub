import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!API_URL) {
      setError('API_URL não configurada.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Falha no login');
      }
      const data = await res.json().catch(() => ({}));
      // esperado: { token, user: { role, can_producao, can_performance, ... } }
      login(data.token, data.user);
      if (data.user?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#050505',
      padding: 24,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        background: '#111111',
        borderRadius: 16,
        padding: '26px 26px 22px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        color: '#F5F5F5',
      }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: '#000', fontWeight: 900, fontSize: 15 }}>U</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2 }}>UNITED</div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: '#777' }}>
                Growth Hub
              </div>
            </div>
          </div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Entrar</h1>
          <p style={{ fontSize: 12, color: '#A0A0A0', marginTop: 6 }}>
            Acesse sua área de Produção e Performance.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 11, marginBottom: 6, color: '#BBBBBB' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '9px 11px',
              borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#181818',
              color: '#F5F5F5',
              fontSize: 13,
              marginBottom: 14,
              outline: 'none',
            }}
          />
          <label style={{ display: 'block', fontSize: 11, marginBottom: 6, color: '#BBBBBB' }}>
            Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '9px 11px',
              borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#181818',
              color: '#F5F5F5',
              fontSize: 13,
              marginBottom: 16,
              outline: 'none',
            }}
          />
          {error && (
            <div style={{ color: '#F97373', fontSize: 11, marginBottom: 10 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 9,
              border: 'none',
              cursor: loading ? 'default' : 'pointer',
              background: '#FFFFFF',
              color: '#000',
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

