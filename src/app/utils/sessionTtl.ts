import { insecurePrisma } from './prisma';

const SESSION_COLLECTION = 'session';
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

type MongoIndex = {
  name: string;
  key: Record<string, number>;
  expireAfterSeconds?: number;
};

const listSessionIndexes = async (): Promise<MongoIndex[]> => {
  try {
    const result = await insecurePrisma.$runCommandRaw({
      listIndexes: SESSION_COLLECTION,
    });
    return (
      (result as { cursor?: { firstBatch?: MongoIndex[] } }).cursor
        ?.firstBatch ?? []
    );
  } catch {
    return [];
  }
};

const findSingleFieldIndex = (indexes: MongoIndex[], field: string) =>
  indexes.find(
    idx => idx.key?.[field] === 1 && Object.keys(idx.key).length === 1,
  );

const ensureTtlIndex = async (
  field: string,
  expireAfterSeconds: number,
  indexName: string,
) => {
  const existing = findSingleFieldIndex(await listSessionIndexes(), field);

  if (!existing) {
    await insecurePrisma.$runCommandRaw({
      createIndexes: SESSION_COLLECTION,
      indexes: [
        {
          key: { [field]: 1 },
          name: indexName,
          expireAfterSeconds,
        },
      ],
    });
    return;
  }

  if (existing.expireAfterSeconds === expireAfterSeconds) {
    return;
  }

  await insecurePrisma.$runCommandRaw({
    collMod: SESSION_COLLECTION,
    index: {
      name: existing.name,
      expireAfterSeconds,
    },
  });
};

export const ensureSessionTtlIndexes = async () => {
  try {
    await ensureTtlIndex('expireAt', 0, 'expireAt_ttl');
    await ensureTtlIndex('createdAt', THIRTY_DAYS_IN_SECONDS, 'createdAt_ttl');
  } catch (error) {
    console.error('Failed to ensure session TTL indexes', error);
  }
};
