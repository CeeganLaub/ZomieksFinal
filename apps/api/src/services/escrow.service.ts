import { prisma } from '@/lib/prisma.js';
import { Prisma, Order } from '@prisma/client';
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
      totalAmount: order.totalAmount,
      platformFee: Prisma.Decimal.add(order.buyerFee, order.sellerFee),
      sellerAmount: order.sellerPayout,
      status: 'HELD',
      heldAt: new Date(),
    },
  });

  // Update order
  await tx.order.update({
    where: { id: order.id },
    data: { escrowStatus: 'HELD' },
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
        transactions: {
          include: { escrowHold: true },
          where: { status: 'COMPLETED' },
        },
        seller: {
          include: { bankDetails: { where: { isDefault: true } } },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const escrowHold = order.transactions[0]?.escrowHold;
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

    // Update order escrow status
    await tx.order.update({
      where: { id: order.id },
      data: { escrowStatus: 'RELEASED' },
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
    await tx.sellerMetrics.upsert({
      where: { userId: order.sellerId },
      create: {
        userId: order.sellerId,
        totalEarnings: escrowHold.sellerAmount,
        completedOrders: 1,
      },
      update: {
        totalEarnings: { increment: escrowHold.sellerAmount },
        completedOrders: { increment: 1 },
      },
    });
  });
}

// Process refund (release escrow back to buyer)
export async function processRefund(orderId: string, reason: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        transactions: {
          include: { escrowHold: true },
          where: { status: 'COMPLETED' },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const escrowHold = order.transactions[0]?.escrowHold;
    if (!escrowHold || escrowHold.status !== 'HELD') {
      throw new Error('No held escrow found');
    }

    // Update escrow status
    await tx.escrowHold.update({
      where: { id: escrowHold.id },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundReason: reason,
      },
    });

    // Update order
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'REFUNDED',
        escrowStatus: 'REFUNDED',
      },
    });

    // TODO: Process actual refund through gateway
    // For PayFast: Use API to refund
    // For OZOW: Manual process required
  });
}
