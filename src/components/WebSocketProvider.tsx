'use client';

import { createContext, type ReactNode, useEffect } from 'react';

import { useSWRConfig } from 'swr';

import { env } from '~/env';
import { type TransactionRecord } from '~/types';

interface WebSocketMessage {
  type: 'UPDATE' | 'CREATE' | 'DELETE';
  data: TransactionRecord[] | string[];
}

const WebSocketContext = createContext<WebSocket | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { mutate } = useSWRConfig();

  useEffect(() => {
    try {
      // Explicit type cast for URL constructor
      const wsUrl = new URL(env.NEXT_PUBLIC_WS_URL as string);
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data as string) as WebSocketMessage;

          switch (message.type) {
            case 'UPDATE': {
              void mutate(
                '/api/transactions',
                (current?: TransactionRecord[]) => {
                  if (!current) return current;
                  const updates = message.data as TransactionRecord[];
                  return current.map((item) => {
                    const update = updates.find((u) => u.id === item.id);
                    return update ? { ...item, ...update } : item;
                  });
                },
                false
              );
              break;
            }
            case 'CREATE': {
              void mutate(
                '/api/transactions',
                (current?: TransactionRecord[]) => {
                  if (!current) return current;
                  const newRecords = message.data as TransactionRecord[];
                  return [...newRecords, ...current];
                },
                false
              );
              break;
            }
            case 'DELETE': {
              void mutate(
                '/api/transactions',
                (current?: TransactionRecord[]) => {
                  if (!current) return current;
                  const deletedIds = message.data as string[];
                  return current.filter((item) => !deletedIds.includes(item.id));
                },
                false
              );
              break;
            }
          }
        } catch (err) {
          console.error(
            'Error processing WebSocket message:',
            err instanceof Error ? err.message : 'Unknown error'
          );
        }
      };

      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('Invalid WebSocket URL:', error);
      return undefined;
    }
  }, [mutate]);

  return (
    <WebSocketContext.Provider value={null}>
      {children}
    </WebSocketContext.Provider>
  );
}

