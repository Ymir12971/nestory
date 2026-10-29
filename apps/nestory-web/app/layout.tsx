import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nestory',
  description: "Every little moment becomes a story.",
};

// The Story pages are set in the app's DS faces (Inter body, Manrope headings).
// Self-hosted at build time so the page never waits on a font CDN, and exposed
// as CSS variables for the CSS modules.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-manrope' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
