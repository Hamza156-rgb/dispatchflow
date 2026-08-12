import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useUpdateProfile } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { Button, Input, FormField, Toast, Avatar, PageHeader, Icon } from '../components/ui';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { ProfilePayload } from '../types';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [logo, setLogo] = useState<string | null>(user?.logoUrl ?? null);
  const [logoError, setLogoError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit } = useForm<ProfilePayload>({
    defaultValues: {
      fullName: user?.fullName ?? '',
      companyName: user?.companyName ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      address: user?.address ?? '',
      taxNumber: user?.taxNumber ?? '',
    },
  });

  // Read + downscale the chosen image to a compact base64 data URL (max 400px wide)
  const handleLogoFile = (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) { setLogoError('Please use a PNG or JPEG image.'); return; }
    if (file.size > 3 * 1024 * 1024) { setLogoError('Image must be under 3 MB.'); return; }
    setLogoError('');
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 400;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        setLogo(canvas.toDataURL(mime, 0.9));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const onSave = async (form: ProfilePayload) => {
    try {
      const updated = await updateProfile.mutateAsync({ ...form, logoUrl: logo });
      updateUser(updated);
      setToast({ msg: 'Profile saved', type: 'success' });
    } catch {
      setToast({ msg: 'Failed to save profile', type: 'error' });
    }
  };

  const card: React.CSSProperties = { padding: '22px 24px', marginBottom: 18 };

  return (
    <div style={{ padding: isMobile ? 16 : 26, maxWidth: 980 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader icon="settings" title="Settings" subtitle="Your company details, as they appear to clients." />

      {/* Identity */}
      <div className="df-card" style={{ ...card, display: 'flex', alignItems: 'center', gap: 18 }}>
        <Avatar name={user?.fullName ?? 'User'} size={58} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>{user?.fullName}</div>
          <div style={{ fontSize: 13.5, color: 'var(--color-muted)' }}>{user?.email}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSave)}>
        {/* Company Logo */}
        <div className="df-card" style={card}>
          <h3 style={{ margin: '0 0 5px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Company Logo</h3>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--color-muted)' }}>
            Shown on the invoice PDFs you send to clients. PNG or JPEG, up to 3 MB.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {/* Preview */}
            <div style={{ width: 150, height: 82, borderRadius: 12, border: '1.5px dashed var(--color-border-strong)',
              background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, padding: 8 }}>
              {logo
                ? <img src={logo} alt="Company logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                : <>
                    <span style={{ color: 'var(--color-faint)' }}><Icon name="image" size={20} /></span>
                    <span style={{ fontSize: 11.5, color: 'var(--color-faint)' }}>No logo</span>
                  </>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }}
                onChange={(e) => handleLogoFile(e.target.files?.[0])} />
              <Button type="button" variant="secondary" icon={logo ? 'refresh' : 'upload'} onClick={() => fileRef.current?.click()}>
                {logo ? 'Change logo' : 'Upload logo'}
              </Button>
              {logo && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setLogo(null); if (fileRef.current) fileRef.current.value = ''; }}>
                  Remove
                </Button>
              )}
              {logoError && (
                <span style={{ fontSize: 12, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="alert" size={13} /> {logoError}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Company Profile */}
        <div className="df-card" style={card}>
          <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Company Profile</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 16px' }}>
            <FormField label="Full Name" required><Input {...register('fullName', { required: true })} /></FormField>
            <FormField label="Company Name" required><Input {...register('companyName', { required: true })} /></FormField>
            <FormField label="Phone Number"><Input {...register('phoneNumber')} /></FormField>
            <FormField label="Tax Number"><Input {...register('taxNumber')} /></FormField>
          </div>
          <FormField label="Business Address"><Input {...register('address')} /></FormField>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" icon="check" loading={updateProfile.isPending}>Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
