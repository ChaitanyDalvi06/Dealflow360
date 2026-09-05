import { Kafka } from 'kafkajs';
import { config } from '../config/env.js';
import { broadcastToDashboard } from '../websocket/dashboard.ws.js';

let producer = null;
let isConnected = false;

/**
 * Initializes the Kafka/Redpanda producer.
 * Fire-and-forget — failure never blocks core operations.
 */
async function initProducer() {
  if (producer) return;

  try {
    const kafka = new Kafka({
      clientId: 'dealflow360-api',
      brokers: [config.kafka.broker],
      connectionTimeout: 3000,
      retry: { retries: 1 },
    });

    producer = kafka.producer();
    await producer.connect();
    isConnected = true;
    console.log('📨 Kafka producer connected to Redpanda');
  } catch (err) {
    console.warn('⚠️ Kafka producer connection failed (dashboard will use polling):', err.message);
    producer = null;
    isConnected = false;
  }
}

// Try to connect on import (non-blocking)
initProducer().catch(() => {});

/**
 * Publishes an event to a Kafka topic.
 * Fire-and-forget: errors are caught and logged, never thrown.
 */
export async function publishEvent(topic, data) {
  // Always broadcast via WebSocket as backup
  broadcastToDashboard(topic, data);

  if (!isConnected || !producer) return;

  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify({ ...data, timestamp: new Date().toISOString() }) }],
    });
  } catch (err) {
    console.warn(`⚠️ Failed to publish to ${topic}:`, err.message);
  }
}

export const TOPICS = {
  DISCOUNT_EVENTS: 'discount-events',
  DEAL_EVENTS: 'deal-events',
  STOCK_EVENTS: 'stock-events',
};
