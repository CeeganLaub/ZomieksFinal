import { prisma } from '@/lib/prisma.js';
import { Order } from '@prisma/client';
import { escrowReleaseQueue } from '@/lib/queue.js';

type TransactionClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// Process initial escrow hold when payment is received
export async function processEscrowHold(
  tx: TransactionClient,
  transactionId: string,
  order: Order
): Promise<void> {
  // Create escrow hold
  const escrowHold = await tx.escrowHold.create({
    data: {
      transactionId,
      orderId: order.id,
      amount: order.totalAmount,
      sellerAmount: order.sellerPayout,
      status: 'HELD',
    },
  });

  // Schedule automatic release based on delivery days
  // Default to 7 days if no milestones
  const releaseDelay = (order.deliveryDays || 7) * 24 * 60 * 60 * 1000;
  
  await escrowReleaseQueue.add(
    'auto-release',
    { orderId: order.id, escrowHoldId: escrowHold.id },
    { delay: releaseDelay }
  );
}

// Release escrow funds to seller
export async function releaseOrderEscrow(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        escrowHolds: {
          where: { status: 'HELD' },
        },
        seller: {
          include: { bankDetails: true },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const escrowHold = order.escrowHolds[0];
    if (!escrowHold || escrowHold.status !== 'HELD') {
      throw new Error('No held escrow found');
    }

    // Update escrow status
    await tx.escrowHold.update({
      where: { id: escrowHold.id },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });

    // Create or update payout record
    const existingPayout = await tx.sellerPayout.findFirst({
      where: {
        sellerId: order.sellerId,
        status: 'PENDING',
      },
    });

    if (existingPayout) {
      // Add to existing pending payout
      await tx.sellerPayout.update({
        where: { id: existingPayout.id },
        data: {
          amount: { increment: escrowHold.sellerAmount },
        },
      });
    } else {
      // Create new payout record
      await tx.sellerPayout.create({
        data: {
          sellerId: order.sellerId,
          amount: escrowHold.sellerAmount,
          status: 'PENDING',
        },
      });
    }

    // Update seller metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await tx.sellerMetrics.upsert({
      where: { userId_date: { userId: order.sellerId, date: today } },
      create: {
        userId: order.sellerId,
        date: today,
        netRevenue: escrowHold.sellerAmount,
        ordersCompleted: 1,
      },
      update: {
        netRevenue: { increment: escrowHold.sellerAmount },
        ordersCompleted: { increment: 1 },
      },
    });
  });
}

// Process refund (release escrow back to buyer)
export async function processRefund(orderId: string, _reason: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        escrowHolds: {
          where: { status: 'HELD' },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const escrowHold = order.escrowHolds[0];
    if (!escrowHold || escrowHold.status !== 'HELD') {
      throw new Error('No held escrow found');
    }

    // Update escrow status
    await tx.escrowHold.update({
      where: { id: escrowHold.id },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    });

    // Update order
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
      },
    });

    // TODO: Process actual refund through gateway
    // For PayFast: Use API to refund
    // For OZOW: Manual process required
  });
}
