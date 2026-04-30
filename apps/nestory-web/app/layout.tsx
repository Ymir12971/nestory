import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nestory',
  description: "Every little moment becomes a story.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
