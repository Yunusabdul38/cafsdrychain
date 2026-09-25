import { prisma } from '../lib/prisma.js';

/** The single settings row, created on first read. */
export async function getSettings() {
  return prisma.appSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

export async function updateSettings(input: { feesEnabled: boolean }) {
  return prisma.appSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...input },
    update: input,
  });
}

/**
 * Whether a drying fee should be charged for a batch at this hub.
 *
 * Two switches, deliberately. `AppSettings.feesEnabled` is the master — off
 * means nobody collects anywhere, which is how the system runs until payments
 * are signed off. With it on, each hub decides for itself, so a pilot hub can
 * charge while the rest stay free.
 *
 * A hub with no matching row does not charge. Collecting a fee is something an
 * admin turns on deliberately — the same reason new hubs start off — so an
 * unrecognised hub should never be the reason a supplier is asked for money.
 */
export async function feesApplyAt(locationName: string | null | undefined): Promise<boolean> {
  const settings = await getSettings();
  if (!settings.feesEnabled) return false;
  if (!locationName) return true;

  const hub = await prisma.location.findUnique({
    where: { name: locationName },
    select: { feesEnabled: true },
  });
  return hub?.feesEnabled ?? false;
}
