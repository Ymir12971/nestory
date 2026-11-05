import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delete your account · Nestory',
  description: 'How to delete your Nestory account and data, with or without the app.',
};

// The account-deletion URL Google Play's Data safety form asks for: it must
// work for someone who has already uninstalled the app, so the email route is
// what makes it count. Every timing below must match the code and the Termly
// privacy policy — signed out at once, purged on day 30 (accountPurge.ts),
// backups +60 days, transaction records 7 years. Share links die at once
// (shares.ts checks the owner's deletedAt).
export default function DeleteAccountPage() {
  return (
    <main style={s.page}>
      <h1 style={s.h1}>Delete your Nestory account</h1>
      <p style={s.lead}>
        Nestory is made by Blakard Tech. You can delete your account and everything in it at any
        time, whether or not you still have the app installed.
      </p>

      <h2 style={s.h2}>Option 1 · In the app</h2>
      <ol style={s.list}>
        <li>Open Nestory and go to <b>Settings</b>.</li>
        <li>Tap <b>Account</b>, then <b>Delete Account</b>.</li>
        <li>Type DELETE to confirm. You&apos;ll be signed out right away.</li>
      </ol>

      <h2 style={s.h2}>Option 2 · Without the app</h2>
      <p style={s.p}>
        Email <a style={s.a} href="mailto:support@nestory.love?subject=Delete%20my%20account">support@nestory.love</a>{' '}
        from the email address you sign in to Nestory with, and ask us to delete your account. We
        only act on requests sent from that address, and we&apos;ll email you once your account has
        been deleted.
      </p>

      <h2 style={s.h2}>What gets deleted</h2>
      <p style={s.p}>
        Your account, your child profiles, every Moment (photos and notes), every Story, and any
        Story links you&apos;ve shared. Shared links stop working as soon as you ask.
      </p>

      <h2 style={s.h2}>When</h2>
      <ul style={s.list}>
        <li>Your data is permanently deleted 30 days after you ask. Until then you can change your mind by signing back in.</li>
        <li>Copies in our encrypted backups are removed within a further 60 days.</li>
        <li>Purchase and transaction records are kept for 7 years to meet tax and accounting obligations.</li>
      </ul>

      <h2 style={s.h2}>Your subscription</h2>
      <p style={s.p}>
        Deleting your account doesn&apos;t cancel a Premium subscription. Cancel it in Google Play
        or the App Store to avoid future charges.
      </p>

      <p style={s.foot}>
        More detail is in our <a style={s.a} href="/privacy">Privacy Policy</a>.
      </p>
    </main>
  );
}

// Colours from the app's DS: text/primary #1a1a1a, text/secondary #8a8a8a,
// text/brand #177a48.
const s = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '48px 20px 96px',
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    fontSize: 16,
    lineHeight: 1.6,
    color: '#1a1a1a',
    background: '#ffffff',
  },
  h1: { fontFamily: 'var(--font-manrope), system-ui, sans-serif', fontSize: 28, lineHeight: 1.25, margin: '0 0 12px' },
  h2: { fontFamily: 'var(--font-manrope), system-ui, sans-serif', fontSize: 18, margin: '32px 0 8px' },
  lead: { margin: 0, color: '#4a4a4a' },
  p: { margin: 0 },
  list: { margin: 0, paddingLeft: 22 },
  a: { color: '#177a48', fontWeight: 600 },
  foot: { margin: '40px 0 0', fontSize: 14, color: '#8a8a8a' },
} satisfies Record<string, React.CSSProperties>;
