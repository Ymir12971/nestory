import { TERMS_OF_SERVICE } from '@nestory/legal';
import { LegalScreen } from './LegalScreen';

export function TermsScreen() {
  return <LegalScreen doc={TERMS_OF_SERVICE} />;
}
