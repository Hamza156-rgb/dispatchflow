import { useState } from 'react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';

// 🔧 EDIT THESE with your real bank / payment details for manual transfers.
const BANK = {
  bankName: 'Meezan Bank',
  accountTitle: 'DispatchFlow',
  accountNumber: '0000 0000 0000 0000',
  iban: 'PK00MEZN0000000000000000',
  note: 'After transferring, email your receipt to billing@dispatchflow.app with your account email. We activate within 24 hours.',
};

const PRICE: Record<string, number> = { STARTER: 20, GROWTH: 40, BUSINESS: 60 };

export default function AccountGate({ status }: { status: 'PENDING' | 'SUSPENDED' }) {
  const { user, logout, updateUser } = useAuthStore();
  const [checking, setChecking] = useState(false);

  const refresh = async () => {
    setChecking(true);
    try {
      const me = await authApi.me();
      updateUser(me);
      if (me.accountStatus === 'ACTIVE') window.location.href = '/dashboard';
    } catch { /* ignore */ } finally { setChecking(false); }
  };

  const suspended = status === 'SUSPENDED';
  const plan = user?.plan || 'STARTER';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1220', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 20, padding: '40px 40px', boxShadow: '0 30px 70px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚛</div>
          <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.5px', color: '#0f172a' }}>Dispatch<span style={{ color: '#2563eb' }}>Flow</span></span>
        </div>

        {suspended ? (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Account suspended</h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
              Your workspace is currently suspended. Please contact support to restore access.
            </p>
          </>
        ) : (
          <>
            <div style={{ display: 'inline-block', background: '#fef3c7', color: '#b45309', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, marginBottom: 14 }}>⏳ Pending activation</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Almost there — complete your payment</h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, margin: '0 0 22px' }}>
              Your <strong>{plan}</strong> plan is <strong>${PRICE[plan] ?? 5}/month</strong>. Send a bank transfer using the details below, and we'll activate your account.
            </p>

            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
              {[
                ['Bank', BANK.bankName],
                ['Account Title', BANK.accountTitle],
                ['Account #', BANK.accountNumber],
                ['IBAN', BANK.iban],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #eef2f7', fontSize: 14 }}>
                  <span style={{ color: '#64748b' }}>{l}</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{v}</span>
                </div>
              ))}
              <p style={{ margin: '12px 0 0', fontSize: 12.5, color: '#64748b', lineHeight: 1.5 }}>{BANK.note}</p>
            </div>

            <button onClick={refresh} disabled={checking}
              style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 11, padding: '13px', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }}>
              {checking ? 'Checking…' : "I've paid — check status"}
            </button>
          </>
        )}

        <button onClick={() => { logout(); window.location.href = '/login'; }}
          style={{ width: '100%', background: 'transparent', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 11, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sign out
        </button>
      </div>
    </div>
  );
}
