import { prisma } from '@/lib/prisma.js';
import { payoutQueue } from '@/lib/queue.js';
import { sendNotification } from './notification.service.js';

// Process weekly payouts
export async function processWeeklyPayouts(): Promise<void> {
  // Get all pending payouts
  const pendingPayouts = await prisma.sellerPayout.findMany({
    where: { status: 'PENDING' },
    include: {
      seller: {
        include: { bankDetails: true },
      },
    },
  });

  for (const payout of pendingPayouts) {
    const bankDetails = payout.seller.bankDetails;
    
    if (!bankDetails) {
      // Mark as failed - no bank details
      await prisma.sellerPayout.update({
        where: { id: payout.id },
        data: {
          status: 'FAILED',
          failedReason: 'No bank details on file',
        },
      });

      await sendNotification({
        userId: payout.sellerId,
        type: 'PAYOUT_FAILED',
        title: 'Payout Failed',
        message: 'Please add your bank details to receive payouts',
        data: { payoutId: payout.id },
      });
      continue;
    }

    // Process payout
    try {
      // Mark as processing
      await prisma.sellerPayout.update({
        where: { id: payout.id },
        data: { status: 'PROCESSING', processedAt: new Date() },
      });

      // TODO: Integrate with bank payout API (e.g., Stitch, Peach Payments, or manual EFT)
      // For now, we'll simulate the payout
      const payoutReference = `PAYOUT-${Date.now()}`;

      // Mark as completed
      await prisma.sellerPayout.update({
        where: { id: payout.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          bankReference: payoutReference,
        },
      });

      await sendNotification({
        userId: payout.sellerId,
        type: 'PAYOUT_COMPLETED',
        title: 'Payout Sent',
        message: `R${Number(payout.amount).toFixed(2)} has been sent to your bank account`,
        data: { payoutId: payout.id, amount: Number(payout.amount) },
      });
    } catch (error) {
      console.error(`Payout ${payout.id} failed:`, error);

      await prisma.sellerPayout.update({
        where: { id: payout.id },
        data: {
          status: 'FAILED',
          failedReason: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      await sendNotification({
        userId: payout.sellerId,
        type: 'PAYOUT_FAILED',
        title: 'Payout Failed',
        message: 'Your payout could not be processed. We will retry soon.',
        data: { payoutId: payout.id },
      });
    }
  }
}

// Schedule payout job
export async function schedulePayoutProcessing(): Promise<void> {
  // Run every Wednesday at 6 AM
  await payoutQueue.add(
    'weekly-payout',
    {},
    {
      repeat: {
        pattern: '0 6 * * 3', // Wednesday 6 AM
      },
    }
  );
}
