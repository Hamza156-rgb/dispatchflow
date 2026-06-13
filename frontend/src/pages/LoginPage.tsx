import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Button, Input, FormField } from '../components/ui';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    defaultValues: { email: 'demo@dispatchflow.app', password: 'Demo1234!' },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    try {
      const { user, token } = await authApi.login(data);
      setAuth(user, token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc' }}>
      {/* Hero panel — hidden on mobile */}
      {!isMobile && (
      <div style={{ flex: 1, background: '#0f172a', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
          top: '50%', left: '30%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 64 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🚛</div>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 24, letterSpacing: '-0.5px' }}>
              Dispatch<span style={{ color: '#60a5fa' }}>Flow</span>
            </span>
          </div>
          <h2 style={{ color: '#fff', fontSize: 38, fontWeight: 900, letterSpacing: '-1px',
            margin: '0 0 16px', lineHeight: 1.15 }}>
            Built for truck<br />dispatchers.
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.75, maxWidth: 380, margin: '0 0 48px' }}>
            Professional invoicing, client management, and revenue tracking — everything you need to run your dispatch business.
          </p>
          {[
            { icon: '📄', text: 'Generate professional PDF invoices in seconds' },
            { icon: '📊', text: 'Real-time revenue reports and analytics' },
            { icon: '⚡', text: 'Automated overdue tracking and follow-up' },
            { icon: '📧', text: 'Send invoices directly to clients via email' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{f.icon}</span>
              <span style={{ color: '#cbd5e1', fontSize: 14 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Form panel */}
      <div style={{ width: isMobile ? '100%' : 500, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: isMobile ? '40px 20px' : '48px 56px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Compact logo — shown on mobile in place of the hero panel */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚛</div>
              <span style={{ fontWeight: 900, fontSize: 21, letterSpacing: '-0.5px', color: '#0f172a' }}>
                Dispatch<span style={{ color: '#2563eb' }}>Flow</span>
              </span>
            </div>
          )}
          <h3 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px',
            margin: '0 0 6px' }}>Welcome back</h3>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 32px' }}>Sign in to your DispatchFlow account</p>

          {/* Demo badge */}
          <div style={{ background: '#dbeafe', color: '#1e40af', padding: '10px 16px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, marginBottom: 24, borderLeft: '3px solid #2563eb' }}>
            Demo account pre-filled → just click Sign In
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8,
              fontSize: 14, fontWeight: 500, marginBottom: 20 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <FormField label="Email address" required error={errors.email?.message}>
              <Input
                type="email"
                placeholder="you@company.com"
                {...register('email', { required: 'Email is required' })}
                error={errors.email?.message}
              />
            </FormField>
            <FormField label="Password" required error={errors.password?.message}>
              <Input
                type="password"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
                error={errors.password?.message}
              />
            </FormField>
            <div style={{ textAlign: 'right', marginBottom: 24, marginTop: -8 }}>
              <a href="#" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                Forgot password?
              </a>
            </div>
            <Button type="submit" loading={loading} style={{ width: '100%' }} size="lg">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#64748b' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
