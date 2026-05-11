import {
  ServiceBusClient,
  ServiceBusReceiver,
  ServiceBusSender,
} from "@azure/service-bus";

// ── Payload interfaces (unchanged) ───────────────────────────────────────────
export interface PhotoCreatedPayload {
  mediaId: string;
  userId: string;
  url: string;
  originalName: string;
  size: number;
  uploadedAt: string;
}

export interface PhotoDeletedPayload {
  mediaId: string;
  userId: string;
}

export interface CommentCreatedPayload {
  photoOwnerId: string;
  photoId: string;
  commenterId: string;
}

export interface RatingCreatedPayload {
  photoOwnerId: string;
  photoId: string;
  raterId: string;
}

export const Events = {
  PHOTO_CREATED: "photo-created",
  PHOTO_DELETED: "photo-deleted",
  COMMENT_CREATED: "comment-created",
  RATING_CREATED: "rating-created",
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

// ── Service Bus client ───────────────────────────────────────────────────────
let _client: ServiceBusClient | null = null;

function getClient(): ServiceBusClient {
  if (!_client) {
    _client = new ServiceBusClient(process.env.SERVICE_BUS_CONNECTION_STRING!);
  }
  return _client;
}

// ── Senders cache ─────────────────────────────────────────────────────────────
const senders = new Map<string, ServiceBusSender>();

function getSender(topic: string): ServiceBusSender {
  if (!senders.has(topic)) {
    senders.set(topic, getClient().createSender(topic));
  }
  return senders.get(topic)!;
}

// ── Publish ──────────────────────────────────────────────────────────────────
export async function publish<T>(topic: EventName, payload: T): Promise<void> {
  const sender = getSender(topic);
  await sender.sendMessages({
    body: payload,
    contentType: "application/json",
  });
}

// ── Subscribe ─────────────────────────────────────────────────────────────────
export function subscribe<T>(
  topic: EventName,
  subscriptionName: string,
  handler: (payload: T) => Promise<void>,
): ServiceBusReceiver {
  const receiver = getClient().createReceiver(topic, subscriptionName);

  receiver.subscribe({
    processMessage: async (message) => {
      await handler(message.body as T);
    },
    processError: async (err) => {
      console.error(`[ServiceBus] Error on ${topic}/${subscriptionName}:`, err);
    },
  });

  return receiver;
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
export async function closeEventBus(): Promise<void> {
  for (const sender of senders.values()) await sender.close();
  senders.clear();
  if (_client) {
    await _client.close();
    _client = null;
  }
}
