import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useUpdateProfile } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { Button, Input, FormField, Toast, Avatar } from '../components/ui';
import type { ProfilePayload } from '../types';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const { register, handleSubmit } = useForm<ProfilePayload>({
    defaultValues: {
      fullName: user?.fullName ?? '',
      companyName: user?.companyName ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      address: user?.address ?? '',
      taxNumber: user?.taxNumber ?? '',
    },
  });

  const onSave = async (form: ProfilePayload) => {
    try {
      const updated = await updateProfile.mutateAsync(form);
      updateUser(updated);
      setToast({ msg: 'Profile saved', type: 'success' });
    } catch {
      setToast({ msg: 'Failed to save profile', type: 'error' });
    }
  };

  const card: React.CSSProperties = {
    background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', padding: '24px 28px', marginBottom: 20,
  };

  return (
    <div style={{ padding: 28, maxWidth: 720, margin: '0 auto' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Identity */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 18 }}>
        <Avatar name={user?.fullName ?? 'User'} size={64} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>{user?.fullName}</div>
          <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>{user?.email}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSave)}>
        <div style={card}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Company Profile</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Full Name" required><Input {...register('fullName', { required: true })} /></FormField>
            <FormField label="Company Name" required><Input {...register('companyName', { required: true })} /></FormField>
            <FormField label="Phone Number"><Input {...register('phoneNumber')} /></FormField>
            <FormField label="Tax Number"><Input {...register('taxNumber')} /></FormField>
          </div>
          <FormField label="Business Address"><Input {...register('address')} /></FormField>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" loading={updateProfile.isPending}>Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
