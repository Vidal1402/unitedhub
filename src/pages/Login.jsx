import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import loginBg from '../assets/login-bg.jpg';

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
    <div style={{ minHeight: '100vh', display: 'flex', background: '#050505' }}>
      {/* Left — image (hidden on small screens) */}
      <div style={{
        width: '50%',
        position: 'relative',
        overflow: 'hidden',
        display: 'none',
      }} className="login-image-panel">
        <img
          src={loginBg}
          alt="Dashboard analytics"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(5,5,5,0.7), transparent)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 48,
          left: 48,
          maxWidth: 400,
        }}>
          <h2 style={{
            color: '#fff',
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.3,
            marginBottom: 12,
            
          }}>
            Gerencie sua performance em um só lugar.
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            
          }}>
            Produção, métricas e resultados — tudo no United Growth Hub.
          </p>
        </div>
      </div>

      {/* Right — login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: '#000', fontWeight: 900, fontSize: 18 }}>U</span>
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: 3 }}>UNITED</div>
              <div style={{ color: '#777', fontSize: 10, textTransform: 'uppercase', letterSpacing: 3 }}>
                Growth Hub
              </div>
            </div>
          </div>

          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 8, fontFamily: 'system-ui, sans-serif' }}>
            Bem-vindo de volta
          </h1>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 32, fontFamily: 'system-ui, sans-serif' }}>
            Acesse sua área de Produção e Performance.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#aaa', fontSize: 12, fontWeight: 500, marginBottom: 8 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#141414',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#aaa', fontSize: 12, fontWeight: 500, marginBottom: 8 }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#141414',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  
                }}
              />
            </div>

            {error && (
              <div style={{
                color: '#f87171',
                fontSize: 12,
                background: 'rgba(248,113,113,0.1)',
                padding: '10px 16px',
                borderRadius: 8,
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: 'none',
                background: '#fff',
                color: '#000',
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.5 : 1,
                
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>

      {/* Media query via style tag for image panel */}
      <style>{`
        @media (min-width: 1024px) {
          .login-image-panel {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
