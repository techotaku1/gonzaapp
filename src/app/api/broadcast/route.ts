import { type NextRequest } from 'next/server';

import { z } from 'zod';

import { type BroadcastMessage } from '~/types/broadcast';

// Store for active connections
const clients = new Set<ReadableStreamDefaultController>();

const MessageSchema = z.object({
  type: z.enum(['UPDATE', 'CREATE', 'DELETE']),
  data: z.unknown(),
});

export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') ?? 'unknown';
    await Promise.resolve(); // Para satisfacer require-await

    const stream = new ReadableStream({
      start(controller) {
        clients.add(controller);
        console.log(`Client connected: ${userAgent}`);

        request.signal.addEventListener('abort', () => {
          clients.delete(controller);
          console.log(`Client disconnected: ${userAgent}`);
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (_error) {
    return new Response('Error creating stream', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = MessageSchema.safeParse(body);

    if (!validatedData.success) {
      return Response.json(
        { success: false, error: 'Invalid message format' },
        { status: 400 }
      );
    }

    const message = validatedData.data as BroadcastMessage;

    const messageStr = JSON.stringify(message);

    clients.forEach((client) => {
      try {
        client.enqueue(new TextEncoder().encode(`data: ${messageStr}\n\n`));
      } catch (_error) {
        clients.delete(client);
      }
    });

    return Response.json({ success: true, clientCount: clients.size });
  } catch (_error) {
    return Response.json(
      { success: false, error: 'Invalid message format' },
      { status: 400 }
    );
  }
}

// Only export runtime once at the end of the file
export const runtime = 'edge';
