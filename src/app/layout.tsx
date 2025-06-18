import { type Metadata } from 'next';
import { Delius, Lexend } from 'next/font/google';

import { esMX } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';

import ClientLayout from '~/components/ClientLayout';

import Providers from './providers';

import '~/styles/globals.css';

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
          <Providers>
            <ClientLayout>{children}</ClientLayout>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
