import { Client } from '@elastic/elasticsearch';

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
});

export async function initElasticsearch() {
  const exists = await esClient.indices.exists({ index: 'emails' });
  if (!exists) {
    await esClient.indices.create({
      index: 'emails',
      mappings: {
        properties: {
          leadId: { type: 'integer' },
          userId: { type: 'integer' },
          campaignName: { type: 'text' },
          senderId: { type: 'keyword' },
          email: { type: 'keyword' },
          subject: { type: 'text' },
          body: { type: 'text' },
          status: { type: 'keyword' },
          scheduledAt: { type: 'date' },
          sentAt: { type: 'date' },
        },
      },
    });
  }
}

export async function indexEmailDoc(doc: {
  leadId: number;
  userId: number | null;
  campaignName: string;
  senderId: string;
  email: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date | null;
  sentAt: Date | null;
}) {
  await esClient.index({
    index: 'emails',
    id: doc.leadId.toString(),
    document: doc,
    refresh: 'wait_for',
  });
}
