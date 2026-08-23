import { PRIVACY_POLICY } from '@nestory/legal';
import { LegalScreen } from './LegalScreen';

export function PrivacyScreen() {
  return <LegalScreen doc={PRIVACY_POLICY} />;
}
