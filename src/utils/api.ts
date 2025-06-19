export const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''; // browser should use relative url
  if (process.env.NEXT_PUBLIC_URL_BASE) return process.env.NEXT_PUBLIC_URL_BASE;
  return 'http://localhost:3000'; // dev SSR should use localhost
};

export const getWebSocketUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'wss://gonzaapp.vercel.app';
  }
  return 'ws://localhost:3001';
};
