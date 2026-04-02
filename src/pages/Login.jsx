import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import logoUnited from '../assets/logo-united.png';

const API_URL = import.meta.env.VITE_API_URL || 'https://united-hub-3a6p.onrender.com';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!API_URL) { setError('API_URL não configurada.'); return; }
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
    <div style={{ minHeight: '100vh', display: 'flex', background: '#fff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Left — decorative panel */}
      <div style={{
        width: '50%',
        position: 'relative',
        overflow: 'hidden',
        display: 'none',
        background: '#f5f5f5',
      }} className="login-image-panel">
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
        }}>
          <img src={logoUnited} alt="United Hub" style={{ width: 220, marginBottom: 32 }} />
          <h2 style={{ color: '#000', fontSize: 24, fontWeight: 700, textAlign: 'center', lineHeight: 1.4, marginBottom: 12 }}>
            Gerencie sua performance em um só lugar.
          </h2>
          <p style={{ color: '#888', fontSize: 14, textAlign: 'center', maxWidth: 320 }}>
            Produção, métricas e resultados — tudo no United Hub.
          </p>
        </div>
      </div>

      {/* Right — login form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Brand */}
          <div style={{ marginBottom: 40 }}>
            <img src={logoUnited} alt="United Hub" style={{ height: 36 }} />
          </div>

          <h1 style={{ color: '#000', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Bem-vindo de volta
          </h1>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 32 }}>
            Acesse sua área de Produção e Performance.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#555', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="seu@email.com"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  border: '1px solid #ddd', background: '#fafafa', color: '#000',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#555', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Senha</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  border: '1px solid #ddd', background: '#fafafa', color: '#000',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{ color: '#EF4444', fontSize: 12, background: 'rgba(239,68,68,0.08)', padding: '10px 16px', borderRadius: 8, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none',
              background: '#000', color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1,
            }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <button type="button" disabled={loading} style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #0000FF',
              background: 'transparent', color: '#0000FF', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', marginTop: 10,
            }}>
              Criar conta
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .login-image-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
