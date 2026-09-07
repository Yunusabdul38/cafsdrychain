import { prisma } from '../lib/prisma.js';

/** The single settings row, created on first read. */
export async function getSettings() {
  return prisma.appSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

export async function updateSettings(input: {
  feesEnabled?: boolean;
  minimumFee?: number;
}) {
  return prisma.appSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...input },
    update: input,
  });
}
