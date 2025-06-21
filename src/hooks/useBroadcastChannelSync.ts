import { useEffect } from 'react';

import { useSWRConfig } from 'swr';

export function useBroadcastChannelSync(
  channelName = 'transactions-broadcast'
) {
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window))
      return;
    const channel = new BroadcastChannel(channelName);
    channel.onmessage = (event) => {
      if (event.data === 'transactions-updated') {
        mutate('/api/transactions');
      }
    };
    return () => channel.close();
  }, [mutate, channelName]);
}
