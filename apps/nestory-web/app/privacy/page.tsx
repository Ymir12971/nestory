import type { Metadata } from 'next';
import { PRIVACY_POLICY } from '@nestory/legal';
import { LegalPage } from '../_components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy · Nestory',
  description: 'How Nestory collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY_POLICY} />;
}
