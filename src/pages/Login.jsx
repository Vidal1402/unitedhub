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
    <div className="min-h-screen flex bg-[hsl(0,0%,2%)]">
      {/* Left — image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src={loginBg}
          alt="Dashboard analytics"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsla(0,0%,2%,0.6)] to-transparent" />
        <div className="absolute bottom-12 left-12 max-w-md">
          <h2 className="text-white text-3xl font-bold leading-tight mb-3">
            Gerencie sua performance em um só lugar.
          </h2>
          <p className="text-white/60 text-sm">
            Produção, métricas e resultados — tudo no United Growth Hub.
          </p>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <span className="text-black font-black text-lg">U</span>
            </div>
            <div>
              <div className="text-white text-sm font-extrabold tracking-[3px]">UNITED</div>
              <div className="text-[hsl(0,0%,47%)] text-[10px] uppercase tracking-[3px]">
                Growth Hub
              </div>
            </div>
          </div>

          <h1 className="text-white text-2xl font-bold mb-2">Bem-vindo de volta</h1>
          <p className="text-[hsl(0,0%,55%)] text-sm mb-8">
            Acesse sua área de Produção e Performance.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[hsl(0,0%,65%)] text-xs font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[hsl(0,0%,8%)] text-white text-sm placeholder:text-white/25 outline-none focus:border-white/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[hsl(0,0%,65%)] text-xs font-medium mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[hsl(0,0%,8%)] text-white text-sm placeholder:text-white/25 outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {error && (
              <div className="text-[hsl(0,70%,65%)] text-xs bg-[hsl(0,70%,65%)]/10 px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-default"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
