import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy · Nestory',
  description: 'How Nestory collects, uses, and protects your data.',
};

const EFFECTIVE_DATE = 'May 30, 2026';
const CONTACT_EMAIL  = 'support@nestory.app';

// Placeholder privacy notice — factually accurate to what the app does today.
// Replace with a counsel-reviewed version before public Play / App Store launch.
export default function PrivacyPage() {
  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>Privacy Policy</h1>
      <p style={metaStyle}>Effective {EFFECTIVE_DATE}</p>

      <p>
        Nestory ("we", "us") is a mobile and web app that helps families capture
        photo memories of their children and turn them into AI-generated monthly
        stories. This policy explains what data we collect, why, and how to
        control it.
      </p>

      <h2 style={h2Style}>1. What we collect</h2>
      <ul style={ulStyle}>
        <li><strong>Account info</strong> — your email and name, supplied via Google sign-in or email/password registration.</li>
        <li><strong>Child profile info</strong> you enter — child's name, birthday, gender, height, weight, avatar photo.</li>
        <li><strong>Memories you create</strong> — photos and notes you upload to record moments. Photos are stored in Supabase Storage; metadata in our Supabase Postgres database.</li>
        <li><strong>Generated content</strong> — AI Story documents created from your memories.</li>
        <li><strong>Subscription state</strong> — when you purchase a Premium plan, the store (Google Play / App Store) reports purchase status to us via RevenueCat.</li>
        <li><strong>Device / app context</strong> — operating system, app version, and timezone, used to deliver the service and diagnose issues.</li>
      </ul>
      <p>
        We do <strong>not</strong> use third-party advertising, behavioural
        analytics, or sell your data.
      </p>

      <h2 style={h2Style}>2. How we use it</h2>
      <ul style={ulStyle}>
        <li>Display your memories and generated stories in the app.</li>
        <li>Generate monthly AI stories from photos and notes you provide.</li>
        <li>Manage your account, subscription, and entitlements.</li>
        <li>Respond to your support requests and act on feedback you submit.</li>
        <li>Diagnose crashes and operational issues.</li>
      </ul>

      <h2 style={h2Style}>3. Third parties we share data with</h2>
      <ul style={ulStyle}>
        <li><strong>Supabase</strong> — authentication, database, and photo storage.</li>
        <li><strong>Anthropic</strong> — generates the AI Story from your memory text and metadata (no human review of inputs; outputs are stored in our database).</li>
        <li><strong>Google</strong> — OAuth sign-in, and (when you purchase) Google Play billing.</li>
        <li><strong>RevenueCat</strong> — receives purchase events from the stores so we can grant Premium entitlements.</li>
        <li><strong>Railway / Vercel</strong> — host our backend and web renderer.</li>
      </ul>

      <h2 style={h2Style}>4. How long we keep it</h2>
      <p>
        Account and content data are retained while your account is active.
        When you delete your account from inside the app, your account is
        marked deleted; full data removal completes within 30 days. Deleted
        data cannot be recovered after that window.
      </p>

      <h2 style={h2Style}>5. Your rights</h2>
      <p>
        You can review and edit your profile and memories at any time in the
        app. You can permanently delete your account and content from{' '}
        <em>Settings → Account → Delete Account</em>. For data access requests
        or other questions, contact us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2 style={h2Style}>6. Children</h2>
      <p>
        Nestory is designed for parents and caregivers to record memories of
        their children. The app is intended for users aged 18 and over; we do
        not knowingly collect data from children using the app themselves.
      </p>

      <h2 style={h2Style}>7. Changes</h2>
      <p>
        We may update this policy as the product evolves. Material changes will
        be surfaced in the app the next time you sign in.
      </p>

      <h2 style={h2Style}>8. Contact</h2>
      <p>
        Questions? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '48px 24px 96px',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: '#111',
  lineHeight: 1.6,
  fontSize: 16,
};
const h1Style: React.CSSProperties = { fontSize: 32, fontWeight: 700, marginBottom: 4 };
const h2Style: React.CSSProperties = { fontSize: 20, fontWeight: 600, marginTop: 36, marginBottom: 8 };
const metaStyle: React.CSSProperties = { color: '#666', marginBottom: 24 };
const ulStyle: React.CSSProperties = { paddingLeft: 20 };
