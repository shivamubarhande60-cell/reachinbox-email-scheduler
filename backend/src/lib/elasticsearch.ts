import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env';

const { apiKey, username, password, node } = env.elasticsearch;

/**
 * Shared Elasticsearch client configured from environment variables.
 */
export const esClient = new Client({
  node,
  ...(apiKey
    ? { auth: { apiKey } }
    : username && password
      ? { auth: { username, password } }
      : {}),
});

/**
 * Ensures the `emails` search index exists with expected field mappings.
 */
export async function initElasticsearch(): Promise<void> {
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

/**
 * Indexes or updates a single lead email document in Elasticsearch.
 */
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
}): Promise<void> {
  await esClient.index({
    index: 'emails',
    id: doc.leadId.toString(),
    document: doc,
    refresh: 'wait_for',
  });
}
