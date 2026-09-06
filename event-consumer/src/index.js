import { Kafka } from 'kafkajs';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:19092';
const GROUP_ID = 'dealflow360-consumer-group';

const kafka = new Kafka({
  clientId: 'dealflow360-consumer',
  brokers: [KAFKA_BROKER],
  retry: { retries: 5 },
});

const consumer = kafka.consumer({ groupId: GROUP_ID });

const TOPICS = [
  'deal-events',
  'discount-events',
  'stock-events',
  'audit-events'
];

async function run() {
  console.log(`🔌 Connecting consumer to Redpanda broker at ${KAFKA_BROKER}...`);
  await consumer.connect();
  console.log(`✅ Redpanda Event Consumer connected (Group: ${GROUP_ID})`);

  for (const topic of TOPICS) {
    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`📡 Subscribed to topic: ${topic}`);
  }

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const raw = message.value.toString();
      let event = {};
      try {
        event = JSON.parse(raw);
      } catch {
        event = { raw };
      }

      console.log('\n------------------------------------------------------------');
      console.log(`📨 [EVENT RECEIVED] Topic: ${topic} | Partition: ${partition} | Offset: ${message.offset}`);
      console.log(`⏱️  Timestamp: ${event.timestamp || new Date().toISOString()}`);
      console.log(`🏷️  Type: ${event.eventType || 'GENERIC_EVENT'}`);
      console.log('📦 Payload:', JSON.stringify(event, null, 2));

      // Asynchronous event processing
      switch (topic) {
        case 'deal-events':
          console.log(`💼 Processing Deal Lifecycle Event: ${event.eventType} (Quotation: ${event.quotationNumber || event.quotationId})`);
          break;
        case 'discount-events':
          console.log(`⚠️  Processing Discount Risk Event: Discount ${event.effectiveDiscountPct}% vs Tier ${event.tierLimit}%`);
          break;
        case 'stock-events':
          console.log(`📦 Processing Inventory Movement: Product ${event.productId}, Qty: ${event.quantityDelta}`);
          break;
        case 'audit-events':
          console.log(`🛡️  Processing Audit Stream: ${event.action} by ${event.actorRole}`);
          break;
      }
      console.log('------------------------------------------------------------\n');
    },
  });
}

run().catch((err) => {
  console.error('❌ Consumer fatal error:', err);
  process.exit(1);
});
