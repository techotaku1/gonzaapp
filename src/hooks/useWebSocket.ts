import useSWRSubscription from 'swr/subscription';

import { type TransactionRecord } from '~/types';
import { type BroadcastMessage } from '~/types/broadcast';

export function useWebSocket() {
  return useSWRSubscription('/api/transactions', (_key, { next }) => {
    const eventSource = new EventSource('/api/broadcast');

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as BroadcastMessage;
        if (message.type === 'UPDATE') {
          next(null, message.data as TransactionRecord[]);
        }
      } catch (_error) {
        next(new Error('Failed to parse message'));
      }
    };

    eventSource.onerror = () => {
      next(new Error('EventSource connection error'));
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  });
}
