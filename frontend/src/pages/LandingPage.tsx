import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import './landing.css';

const FEATURES = [
  { icon: '🚚', title: 'Loads Board', desc: 'Track every shipment from booked → in-transit → delivered → paid, with date filters and inline status.' },
  { icon: '📄', title: 'Invoicing & PDF', desc: 'Generate branded invoices with your logo, download polished PDFs, and send them in a click.' },
  { icon: '✨', title: 'Smart Insights', desc: 'Cash-flow forecasts, late-payer risk scoring, and reminders — computed automatically.' },
  { icon: '🏢', title: 'Client Management', desc: 'Keep every broker and shipper organized with full history and billing totals.' },
  { icon: '📈', title: 'Revenue Reports', desc: 'Beautiful charts for monthly revenue, status breakdowns, and your top clients.' },
  { icon: '💬', title: 'WhatsApp & Email', desc: 'Send invoices and payment reminders to clients on the channels they actually use.' },
];

const PLANS = [
  { name: 'Starter', price: 20, users: 5, popular: false, tagline: 'For owner-operators getting started',
    perks: ['Up to 5 team members', 'Unlimited loads & invoices', 'Branded invoice PDFs', 'Client management', 'Email support'] },
  { name: 'Growth', price: 40, users: 10, popular: true, tagline: 'For growing dispatch teams',
    perks: ['Up to 10 team members', 'Everything in Starter', 'Smart Insights & forecasts', 'WhatsApp + email sending', 'Priority support'] },
  { name: 'Business', price: 60, users: 20, popular: false, tagline: 'For established dispatch companies',
    perks: ['Up to 20 team members', 'Everything in Growth', 'Custom branding', 'Advanced reports & export', 'Dedicated support'] },
];

const STATS = [['10k+', 'Loads tracked'], ['$2M+', 'Invoiced'], ['99.9%', 'Uptime'], ['4.9★', 'Dispatcher rating']];
const MOCK_STATS = [['💰', 'Revenue', '$61,284'], ['📨', 'Outstanding', '$12,540'], ['📦', 'Active Loads', '8'], ['🏢', 'Clients', '24']];
const MOCK_BARS = [40, 65, 50, 80, 60, 95, 75, 100, 85, 70, 90, 78];
const YEAR = new Date().getFullYear();

export default function LandingPage() {
  const navigate = useNavigate();
  // Selector form: this page only cares about the token, not the whole store.
  const token = useAuthStore((s) => s.token);
  const go = (path: string) => navigate(path);
  const primary = token ? { label: 'Go to Dashboard', to: '/dashboard' } : { label: 'Get started', to: '/register' };

  return (
    <div className="lp">
      {/* ─── Nav ─────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-container lp-navInner">
          <div className="lp-brand">
            <div className="lp-logo" aria-hidden="true">🚛</div>
            <span className="lp-brandName">Dispatch<span>Flow</span></span>
          </div>
          <div className="lp-navActions">
            <a href="#features" className="lp-navLink">Features</a>
            <a href="#pricing" className="lp-navLink">Pricing</a>
            {!token && <button onClick={() => go('/login')} className="lp-btn lp-btn--text">Sign in</button>}
            <button onClick={() => go(primary.to)} className="lp-btn lp-btn--primary lp-btn--nav">{primary.label}</button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="lp-badge">🚀 The all-in-one platform for truck dispatchers</div>
          <h1 className="lp-h1">
            Run your dispatch business<br />
            <span className="lp-grad">without the chaos.</span>
          </h1>
          <p className="lp-lead">
            Track loads, invoice clients, get paid faster, and see your numbers — all in one beautifully simple platform built for dispatch companies.
          </p>
          <div className="lp-ctaRow">
            <button onClick={() => go(primary.to)} className="lp-btn lp-btn--primary lp-btn--lg">{primary.label} →</button>
            <a href="#pricing" className="lp-btn lp-btn--glass lp-btn--lg">View pricing</a>
          </div>
          <div className="lp-note">No credit card required · Plans from $5/mo</div>

          {/* Product mockup — decorative, so it stays out of the a11y tree */}
          <div className="lp-mock" aria-hidden="true">
            <div className="lp-mockBar">
              {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
                <span key={c} className="lp-dot" style={{ background: c }} />
              ))}
              <span className="lp-mockUrl">app.dispatchflow.com/dashboard</span>
            </div>
            <div className="lp-mockBody">
              <div className="lp-mockStats">
                {MOCK_STATS.map(([icon, label, value]) => (
                  <div key={label} className="lp-mockStat">
                    <div className="lp-mockStatIcon">{icon}</div>
                    <div className="lp-mockStatLabel">{label}</div>
                    <div className="lp-mockStatValue">{value}</div>
                  </div>
                ))}
              </div>
              <div className="lp-chart">
                {MOCK_BARS.map((h, idx) => (
                  <div key={idx} className="lp-bar" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats strip ─────────────────────────────────────── */}
      <section className="lp-stats">
        <div className="lp-container lp-statsGrid">
          {STATS.map(([n, l]) => (
            <div key={l} className="lp-stat">
              <div className="lp-statNum">{n}</div>
              <div className="lp-statLabel">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────── */}
      <section id="features" className="lp-section">
        <div className="lp-container">
          <div className="lp-head">
            <div className="lp-eyebrow">Everything in one place</div>
            <h2 className="lp-h2">Built for how dispatchers actually work</h2>
            <p className="lp-sub">Stop juggling spreadsheets, sticky notes, and five different apps. DispatchFlow brings it together.</p>
          </div>
          <div className="lp-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature">
                <div className="lp-featureIcon" aria-hidden="true">{f.icon}</div>
                <h3 className="lp-featureTitle">{f.title}</h3>
                <p className="lp-featureDesc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="lp-section lp-section--alt">
        <div className="lp-container">
          <div className="lp-head">
            <div className="lp-eyebrow">Simple pricing</div>
            <h2 className="lp-h2">One price per company. Add your team.</h2>
            <p className="lp-sub">Pick a plan by how many people are in your organization. Upgrade anytime.</p>
          </div>
          <div className="lp-plans">
            {PLANS.map((p) => (
              <div key={p.name} className={p.popular ? 'lp-plan lp-plan--popular' : 'lp-plan'}>
                {p.popular && <div className="lp-planBadge">MOST POPULAR</div>}
                <div className="lp-planName">{p.name}</div>
                <div className="lp-planTag">{p.tagline}</div>
                <div className="lp-priceRow">
                  <span className="lp-price">${p.price}</span>
                  <span className="lp-per">/month</span>
                </div>
                <div className="lp-seats">Up to {p.users} users</div>
                <button
                  className="lp-planBtn"
                  onClick={() => go(token ? '/dashboard' : `/register?plan=${p.name.toUpperCase()}`)}
                >
                  Choose {p.name}
                </button>
                <div className="lp-perks">
                  {p.perks.map((perk) => (
                    <div key={perk} className="lp-perk">
                      <span className="lp-check" aria-hidden="true">✓</span>
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-ctaCard">
            <h2 className="lp-h2">Ready to take control of your dispatch?</h2>
            <p className="lp-ctaText">Join dispatch companies running leaner, getting paid faster, and growing with DispatchFlow.</p>
            <button onClick={() => go(primary.to)} className="lp-btn lp-btn--primary lp-btn--xl">{primary.label} →</button>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footerInner">
          <div className="lp-brand">
            <div className="lp-logo" aria-hidden="true">🚛</div>
            <span className="lp-brandName">DispatchFlow</span>
          </div>
          <div className="lp-copy">© {YEAR} DispatchFlow. All rights reserved.</div>
          <div className="lp-footerLinks">
            <Link to="/login">Sign in</Link>
            <a href="#pricing">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
