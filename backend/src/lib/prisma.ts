import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma database client instance.
 */
const prisma = new PrismaClient();

export default prisma;
