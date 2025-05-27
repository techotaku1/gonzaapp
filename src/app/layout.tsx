import '~/styles/globals.css';
import { Delius, Lexend } from 'next/font/google';

import { type Metadata } from 'next';

import Background from '~/components/Background';

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
  weight: ['500'], // Cambiado a 500 para mantener consistencia
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${delius.variable} ${lexend.variable}`}>
      <body className="min-h-screen bg-gradient-to-b from-[#0e2a47] to-[#00459e]">
        <Background />
        {children}
      </body>
    </html>
  );
}
