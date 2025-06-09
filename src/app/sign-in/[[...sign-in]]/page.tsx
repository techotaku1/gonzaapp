'use client';

import { SignIn } from '@clerk/nextjs';

import AuthLayout from '~/components/AuthLayout';

export default function Page() {

  return (
    <AuthLayout>
      <SignIn
        appearance={{
          layout: {
            logoPlacement: 'inside',
            logoImageUrl: '/logo.png',
          },
          variables: {
            colorPrimary: '#6366f1',
            fontFamily: 'var(--font-delius)',
            fontFamilyButtons: 'var(--font-delius)',
            fontSize: '1rem',
          },
          elements: {
            logoImage: {
              width: '100px',
              height: 'auto',
            },
          },
        }}
      />
    </AuthLayout>
  );
}
