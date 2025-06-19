import useSWRSubscription from 'swr/subscription';

import { env } from '~/env';

import type { TransactionRecord } from '~/types';

export function useWebSocket() {
  return useSWRSubscription('/api/transactions', (_key, { next }) => {
    try {
      // Validate and create WebSocket URL
      const wsUrl = new URL(env.NEXT_PUBLIC_WS_URL as string);
      const ws = new WebSocket(wsUrl);

      ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as TransactionRecord[];
          next(null, data);
        } catch (_error) {
          next(new Error('Failed to parse WebSocket message'));
        }
      });

      ws.addEventListener('error', () => {
        next(new Error('WebSocket connection error'));
      });

      return () => ws.close();
    } catch (_error) {
      next(new Error('Failed to create WebSocket connection'));
      return () => undefined;
    }
  });
}
