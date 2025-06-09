import '~/styles/globals.css';
import { Delius, Lexend } from 'next/font/google';

import { esMX } from '@clerk/localizations';
import { ClerkProvider, SignedIn } from '@clerk/nextjs';
import { type Metadata } from 'next';

import Background from '~/components/Background';
import Header from '~/components/Header';

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
  weight: ['500'],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider localization={esMX}>
      <html lang="es" className={`${delius.variable} ${lexend.variable}`}>
        <body>
          <Background />
          <SignedIn>
            <Header />
          </SignedIn>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
