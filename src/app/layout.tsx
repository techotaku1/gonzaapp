import '~/styles/globals.css';
import { Delius, Lexend, STIX_Two_Text } from 'next/font/google';

import { type Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GonzaApp',
  description: 'Aplicación de gestión de trámites',
  icons: [{ rel: 'icon', url: './favicon.ico' }],
};

const delius = Delius({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-delius',
});

const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
  weight: ['300'], // Light weight for text fields
});

const stixTwoText = STIX_Two_Text({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-stix',
  weight: ['500'], // Semibold for numeric fields
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${delius.variable} ${lexend.variable} ${stixTwoText.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
