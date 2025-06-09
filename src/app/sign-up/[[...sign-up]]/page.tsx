import { SignUp } from '@clerk/nextjs';

import AuthLayout from '~/components/AuthLayout';

export default function Page() {
  return (
      <AuthLayout>
        <SignUp
          appearance={{
            layout: {
              logoPlacement: 'inside',
              logoImageUrl: '/logo.jpg',
              socialButtonsVariant: 'iconButton',
              showOptionalFields: false,
              shimmer: true,
            },
            variables: {
              colorPrimary: '#6366f1',
              fontFamily: 'var(--font-delius)',
              fontFamilyButtons: 'var(--font-delius)',
              fontSize: '1rem',
              // Make card smaller
              spacingUnit: '0.75rem',
            },
            elements: {
              logoImage: {
                width: '100px',
                height: 'auto',
              },
              // Make the card container smaller
              card: 'max-w-md w-full',
              // Make form inputs smaller
              formFieldInput: 'h-9 text-sm',
              formButtonPrimary: 'h-9 text-sm',
            },
          }}
        />
      </AuthLayout>
  );
}
