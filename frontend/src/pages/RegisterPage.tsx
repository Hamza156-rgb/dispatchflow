import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Button, Input, FormField } from '../components/ui';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  phoneNumber?: string;
}

const PLANS = [
  { id: 'STARTER', name: 'Starter', price: 20, users: 5 },
  { id: 'GROWTH', name: 'Growth', price: 40, users: 10 },
  { id: 'BUSINESS', name: 'Business', price: 60, users: 20 },
] as const;

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [params] = useSearchParams();

  const initial = (params.get('plan') || '').toUpperCase();
  const [plan, setPlan] = useState(PLANS.some((p) => p.id === initial) ? initial : 'GROWTH');
  const selected = PLANS.find((p) => p.id === plan)!;

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError('');
    try {
      const { user, token } = await authApi.register({ ...data, plan });
      setAuth(user, token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8fafc', padding: isMobile ? 16 : 24 }}>
      <div style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: isMobile ? 16 : 20,
        border: '1.5px solid #e2e8f0', padding: isMobile ? '28px 22px' : '40px 44px',
        boxShadow: '0 4px 40px rgba(0,0,0,0.06)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚛</div>
          <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.5px', color: '#0f172a' }}>
            Dispatch<span style={{ color: '#2563eb' }}>Flow</span>
          </span>
        </div>

        <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          Create your account
        </h3>
        <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px' }}>
          Start managing your dispatch business today.
        </p>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8,
            fontSize: 14, marginBottom: 20 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Plan selector */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700,
            color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Choose your plan</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {PLANS.map((p) => {
              const active = plan === p.id;
              return (
                <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                  style={{
                    textAlign: 'center', cursor: 'pointer', borderRadius: 12, padding: '14px 8px', fontFamily: 'inherit',
                    border: active ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                    background: active ? '#eff6ff' : '#fff', transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{p.name}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: active ? '#2563eb' : '#0f172a', marginTop: 4 }}>${p.price}<span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>/mo</span></div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{p.users} users</div>
                </button>
              );
            })}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: '#64748b' }}>
            Selected: <strong>{selected.name}</strong> — ${selected.price}/mo, up to {selected.users} team members.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <FormField label="Full Name" required error={errors.fullName?.message}>
              <Input placeholder="John Smith"
                {...register('fullName', { required: 'Required', minLength: { value: 2, message: 'Min 2 chars' } })}
                error={errors.fullName?.message} />
            </FormField>
            <FormField label="Company Name" required error={errors.companyName?.message}>
              <Input placeholder="Smith Dispatch LLC"
                {...register('companyName', { required: 'Required' })}
                error={errors.companyName?.message} />
            </FormField>
          </div>
          <FormField label="Email Address" required error={errors.email?.message}>
            <Input type="email" placeholder="you@company.com"
              {...register('email', { required: 'Required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })}
              error={errors.email?.message} />
          </FormField>
          <FormField label="Phone Number">
            <Input placeholder="+1 (555) 000-0000"
              {...register('phoneNumber')} />
          </FormField>
          <FormField label="Password" required error={errors.password?.message}>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="At least 8 characters"
                {...register('password', { required: 'Required', minLength: { value: 8, message: 'Minimum 8 characters' } })}
                style={{
                  width: '100%', padding: '10px 44px 10px 14px', borderRadius: 8, fontSize: 14,
                  border: `1.5px solid ${errors.password ? '#ef4444' : 'var(--color-border)'}`,
                  background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none',
                  boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
              <button type="button" onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4,
                  display: 'flex', alignItems: 'center' }}>
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </FormField>

          <Button type="submit" loading={loading} style={{ width: '100%', marginTop: 8 }} size="lg">
            {loading ? 'Creating account…' : `Create account — ${selected.name} plan`}
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
