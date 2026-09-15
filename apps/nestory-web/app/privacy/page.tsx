import type { Metadata } from 'next';
import { PRIVACY_POLICY } from '@nestory/legal';
import { TermlyEmbed } from '../_components/TermlyEmbed';

export const metadata: Metadata = {
  title: 'Privacy Policy · Nestory',
  description: 'How Nestory collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return <TermlyEmbed policy={PRIVACY_POLICY} />;
}
