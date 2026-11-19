import { esClient } from '../lib/elasticsearch';
import prisma from '../lib/prisma';

export interface EmailSearchRow {
  id: number;
  email: string;
  subject: string;
  name: string;
  senderId: string;
  status: string;
  scheduledAt: Date | string | null;
  sentAt: Date | string | null;
  errorMessage: string | null;
}

export interface EmailSearchResult {
  source: 'elasticsearch' | 'mysql-fallback';
  data: EmailSearchRow[];
}

/**
 * Searches a user's emails using Elasticsearch, falling back to MySQL if Elasticsearch is unavailable.
 */
export async function searchUserEmails(userId: number, query: string): Promise<EmailSearchResult> {
  try {
    const result = await esClient.search({
      index: 'emails',
      size: 100,
      query: {
        bool: {
          filter: [{ term: { userId } }],
          should: [
            {
              wildcard: {
                email: {
                  value: `*${query.toLowerCase().replace(/[\\*?]/g, '\\$&')}*`,
                  case_insensitive: true,
                },
              },
            },
            {
              multi_match: {
                query,
                fields: ['subject', 'body', 'status'],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    });

    const data: EmailSearchRow[] = result.hits.hits.flatMap((hit) => {
      const source = hit._source as
        | {
            leadId?: number;
            email?: string;
            subject?: string;
            campaignName?: string;
            senderId?: string;
            status?: string;
            scheduledAt?: string | null;
            sentAt?: string | null;
          }
        | undefined;
      if (!source || typeof source.leadId !== 'number' || !source.email) return [];
      return [
        {
          id: source.leadId,
          email: source.email,
          subject: source.subject || '',
          name: source.campaignName || '',
          senderId: source.senderId || '',
          status: source.status || 'PENDING',
          scheduledAt: source.scheduledAt || null,
          sentAt: source.sentAt || null,
          errorMessage: null,
        },
      ];
    });

    return { source: 'elasticsearch', data };
  } catch (error) {
    console.error('Elasticsearch search failed, falling back to MySQL:', error);

    const leads = await prisma.lead.findMany({
      where: {
        campaign: { userId },
        OR: [
          { email: { contains: query } },
          { campaign: { subject: { contains: query } } },
          { campaign: { body: { contains: query } } },
        ],
      },
      include: { campaign: { select: { name: true, subject: true } } },
      take: 100,
    });

    return {
      source: 'mysql-fallback',
      data: leads.map((lead) => ({
        id: lead.id,
        email: lead.email,
        subject: lead.campaign.subject,
        name: lead.campaign.name,
        senderId: lead.senderId,
        status: lead.status,
        scheduledAt: lead.scheduledAt,
        sentAt: lead.sentAt,
        errorMessage: lead.errorMessage,
      })),
    };
  }
}
