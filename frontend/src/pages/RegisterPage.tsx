import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Button, Input, FormField } from '../components/ui';

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  phoneNumber?: string;
}

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError('');
    try {
      const { user, token } = await authApi.register(data);
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
      justifyContent: 'center', background: '#f8fafc', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 20,
        border: '1.5px solid #e2e8f0', padding: '40px 44px',
        boxShadow: '0 4px 40px rgba(0,0,0,0.06)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚛</div>
          <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.5px', color: '#0f172a' }}>
            Dispatch<span style={{ color: '#2563eb' }}>Flow</span>
          </span>
        </div>

        <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          Create your account
        </h3>
        <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 28px' }}>
          Start managing your dispatch business today.
        </p>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8,
            fontSize: 14, marginBottom: 20 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
            <Input type="password" placeholder="At least 8 characters"
              {...register('password', { required: 'Required', minLength: { value: 8, message: 'Minimum 8 characters' } })}
              error={errors.password?.message} />
          </FormField>

          <Button type="submit" loading={loading} style={{ width: '100%', marginTop: 8 }} size="lg">
            {loading ? 'Creating account…' : 'Create Account — Free'}
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
