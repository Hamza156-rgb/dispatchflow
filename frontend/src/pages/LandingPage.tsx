import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMediaQuery } from '../hooks/useMediaQuery';

const NAVY = '#0b1220';
const BLUE = '#2563eb';

const FEATURES = [
  { icon: '🚚', title: 'Loads Board', desc: 'Track every shipment from booked → in-transit → delivered → paid, with date filters and inline status.' },
  { icon: '📄', title: 'Invoicing & PDF', desc: 'Generate branded invoices with your logo, download polished PDFs, and send them in a click.' },
  { icon: '✨', title: 'Smart Insights', desc: 'Cash-flow forecasts, late-payer risk scoring, and reminders — computed automatically.' },
  { icon: '🏢', title: 'Client Management', desc: 'Keep every broker and shipper organized with full history and billing totals.' },
  { icon: '📈', title: 'Revenue Reports', desc: 'Beautiful charts for monthly revenue, status breakdowns, and your top clients.' },
  { icon: '💬', title: 'WhatsApp & Email', desc: 'Send invoices and payment reminders to clients on the channels they actually use.' },
];

const PLANS = [
  { name: 'Starter', price: 5, users: 5, popular: false, tagline: 'For owner-operators getting started',
    perks: ['Up to 5 team members', 'Unlimited loads & invoices', 'Branded invoice PDFs', 'Client management', 'Email support'] },
  { name: 'Growth', price: 10, users: 10, popular: true, tagline: 'For growing dispatch teams',
    perks: ['Up to 10 team members', 'Everything in Starter', 'Smart Insights & forecasts', 'WhatsApp + email sending', 'Priority support'] },
  { name: 'Business', price: 20, users: 20, popular: false, tagline: 'For established dispatch companies',
    perks: ['Up to 20 team members', 'Everything in Growth', 'Custom branding', 'Advanced reports & export', 'Dedicated support'] },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const isMobile = useMediaQuery('(max-width: 820px)');
  const go = (path: string) => navigate(path);
  const primary = token ? { label: 'Go to Dashboard', to: '/dashboard' } : { label: 'Start free', to: '/register' };

  const container: React.CSSProperties = { maxWidth: 1140, margin: '0 auto', padding: isMobile ? '0 20px' : '0 32px' };
  const sectionPad = isMobile ? '64px 0' : '96px 0';

  return (
    <div style={{ background: '#fff', color: '#0f172a', fontFamily: 'inherit', overflowX: 'hidden' }}>
      {/* ─── Nav ─────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(11,18,32,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ ...container, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 66 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🚛</div>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 19, letterSpacing: '-0.5px' }}>Dispatch<span style={{ color: '#60a5fa' }}>Flow</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 24 }}>
            {!isMobile && <a href="#features" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Features</a>}
            {!isMobile && <a href="#pricing" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Pricing</a>}
            {!token && <button onClick={() => go('/login')} style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Sign in</button>}
            <button onClick={() => go(primary.to)} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>{primary.label}</button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section style={{ background: `radial-gradient(1100px 500px at 70% -10%, rgba(37,99,235,0.35), transparent), ${NAVY}`, color: '#fff', padding: isMobile ? '56px 0 72px' : '90px 0 120px' }}>
        <div style={container}>
          <div style={{ display: 'inline-block', background: 'rgba(96,165,250,0.15)', color: '#93c5fd', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, marginBottom: 24, border: '1px solid rgba(96,165,250,0.25)' }}>
            🚀 The all-in-one platform for truck dispatchers
          </div>
          <h1 style={{ fontSize: isMobile ? 38 : 60, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', margin: 0, maxWidth: 820 }}>
            Run your dispatch business<br /><span style={{ background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>without the chaos.</span>
          </h1>
          <p style={{ fontSize: isMobile ? 16 : 20, color: '#94a3b8', maxWidth: 600, lineHeight: 1.6, margin: '24px 0 36px' }}>
            Track loads, invoice clients, get paid faster, and see your numbers — all in one beautifully simple platform built for dispatch companies.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button onClick={() => go(primary.to)} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 11, padding: '15px 30px', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 30px rgba(37,99,235,0.4)' }}>{primary.label} →</button>
            <a href="#pricing" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 11, padding: '15px 30px', fontWeight: 700, fontSize: 16, cursor: 'pointer', textDecoration: 'none' }}>View pricing</a>
          </div>
          <div style={{ marginTop: 22, fontSize: 13, color: '#64748b' }}>No credit card required · Plans from $5/mo</div>

          {/* Product mockup */}
          <div style={{ marginTop: isMobile ? 48 : 72, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', background: '#0f172a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 16px', background: '#111c33', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['#ef4444', '#f59e0b', '#22c55e'].map((c) => <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
              <span style={{ marginLeft: 12, fontSize: 12, color: '#64748b' }}>app.dispatchflow.com/dashboard</span>
            </div>
            <div style={{ padding: isMobile ? 16 : 26 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
                {[['💰', 'Revenue', '$61,284'], ['📨', 'Outstanding', '$12,540'], ['📦', 'Active Loads', '8'], ['🏢', 'Clients', '24']].map(([i, l, v]) => (
                  <div key={l} style={{ background: '#16233f', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 18 }}>{i}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{l}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 8 : 16, height: 130, background: '#16233f', borderRadius: 12, padding: 18 }}>
                {[40, 65, 50, 80, 60, 95, 75, 100, 85, 70, 90, 78].map((h, idx) => (
                  <div key={idx} style={{ flex: 1, height: `${h}%`, background: `linear-gradient(180deg, #60a5fa, ${BLUE})`, borderRadius: '4px 4px 0 0' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats strip ─────────────────────────────────────── */}
      <section style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ ...container, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 24, padding: '40px 32px' }}>
          {[['10k+', 'Loads tracked'], ['$2M+', 'Invoiced'], ['99.9%', 'Uptime'], ['4.9★', 'Dispatcher rating']].map(([n, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? 26 : 34, fontWeight: 900, color: NAVY, letterSpacing: '-1px' }}>{n}</div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────── */}
      <section id="features" style={{ padding: sectionPad }}>
        <div style={container}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
            <div style={{ color: BLUE, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Everything in one place</div>
            <h2 style={{ fontSize: isMobile ? 30 : 42, fontWeight: 900, letterSpacing: '-1.2px', margin: '12px 0 14px', color: NAVY }}>Built for how dispatchers actually work</h2>
            <p style={{ fontSize: 17, color: '#64748b', lineHeight: 1.6 }}>Stop juggling spreadsheets, sticky notes, and five different apps. DispatchFlow brings it together.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 22 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '26px 24px', transition: 'all 0.2s' }}>
                <div style={{ width: 50, height: 50, borderRadius: 13, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', color: NAVY }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: sectionPad, background: '#f8fafc' }}>
        <div style={container}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
            <div style={{ color: BLUE, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Simple pricing</div>
            <h2 style={{ fontSize: isMobile ? 30 : 42, fontWeight: 900, letterSpacing: '-1.2px', margin: '12px 0 14px', color: NAVY }}>One price per company. Add your team.</h2>
            <p style={{ fontSize: 17, color: '#64748b', lineHeight: 1.6 }}>Pick a plan by how many people are in your organization. Upgrade anytime.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 24, alignItems: 'start' }}>
            {PLANS.map((p) => (
              <div key={p.name} style={{
                background: p.popular ? NAVY : '#fff', color: p.popular ? '#fff' : '#0f172a',
                border: p.popular ? 'none' : '1.5px solid #e2e8f0', borderRadius: 20, padding: '32px 28px',
                boxShadow: p.popular ? '0 30px 60px rgba(11,18,32,0.35)' : '0 1px 3px rgba(0,0,0,0.04)',
                transform: p.popular && !isMobile ? 'scale(1.04)' : 'none', position: 'relative',
              }}>
                {p.popular && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', color: '#fff', padding: '5px 16px', borderRadius: 20, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
                <div style={{ fontSize: 18, fontWeight: 800 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: p.popular ? '#94a3b8' : '#64748b', marginTop: 4, minHeight: 36 }}>{p.tagline}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, margin: '18px 0 6px' }}>
                  <span style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-2px' }}>${p.price}</span>
                  <span style={{ fontSize: 15, color: p.popular ? '#94a3b8' : '#64748b', marginBottom: 9 }}>/month</span>
                </div>
                <div style={{ display: 'inline-block', background: p.popular ? 'rgba(96,165,250,0.18)' : '#eff6ff', color: p.popular ? '#93c5fd' : BLUE, padding: '5px 12px', borderRadius: 8, fontSize: 13, fontWeight: 800, marginBottom: 22 }}>
                  Up to {p.users} users
                </div>
                <button onClick={() => go(primary.to)} style={{
                  width: '100%', padding: '13px', borderRadius: 11, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 22,
                  border: p.popular ? 'none' : `1.5px solid ${BLUE}`,
                  background: p.popular ? BLUE : '#fff', color: p.popular ? '#fff' : BLUE,
                }}>Get started</button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {p.perks.map((perk) => (
                    <div key={perk} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14 }}>
                      <span style={{ color: p.popular ? '#60a5fa' : '#16a34a', fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span style={{ color: p.popular ? '#cbd5e1' : '#334155' }}>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section style={{ padding: sectionPad }}>
        <div style={container}>
          <div style={{ background: `radial-gradient(800px 300px at 80% 0%, rgba(167,139,250,0.4), transparent), ${NAVY}`, borderRadius: 24, padding: isMobile ? '48px 28px' : '72px 56px', textAlign: 'center', color: '#fff' }}>
            <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 900, letterSpacing: '-1.2px', margin: '0 0 14px' }}>Ready to take control of your dispatch?</h2>
            <p style={{ fontSize: 17, color: '#94a3b8', maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.6 }}>Join dispatch companies running leaner, getting paid faster, and growing with DispatchFlow.</p>
            <button onClick={() => go(primary.to)} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 12, padding: '16px 36px', fontWeight: 800, fontSize: 17, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 30px rgba(37,99,235,0.4)' }}>{primary.label} →</button>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer style={{ background: NAVY, color: '#94a3b8', padding: '40px 0' }}>
        <div style={{ ...container, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🚛</div>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>DispatchFlow</span>
          </div>
          <div style={{ fontSize: 13 }}>© {new Date().getFullYear()} DispatchFlow. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
            <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Sign in</Link>
            <a href="#pricing" style={{ color: '#94a3b8', textDecoration: 'none' }}>Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
