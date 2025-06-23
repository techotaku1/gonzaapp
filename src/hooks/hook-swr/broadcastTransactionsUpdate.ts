export function broadcastTransactionsUpdate() {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    const channel = new BroadcastChannel('transactions-broadcast');
    channel.postMessage('transactions-updated');
    channel.close();
  }
}
