import { prisma } from '@/lib/prisma.js';
import { Order } from '@prisma/client';
import { escrowReleaseQueue } from '@/lib/queue.js';
import { COURSE_FEES } from '@zomieks/shared';

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

// Process refund (release escrow back to buyer) with fee deduction
// buyerId + creditAmount: when provided, the credit balance increment happens
// inside the SAME transaction to guarantee atomicity.
export async function processOrderRefund(
  orderId: string,
  reason: string,
  options: {
    refundAmount?: number; // Custom refund amount (for admin overrides)
    processingFee?: number;
    buyerFeeKept?: number;
    buyerId?: string;      // If set, credit the buyer atomically
    creditAmount?: number; // Amount to add to buyer's creditBalance
  } = {}
): Promise<{ refundId: string; refundAmount: number; processingFee: number; creditBalance?: number }> {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        escrowHolds: {
          where: { status: { in: ['HELD', 'DISPUTED'] } },
        },
        transactions: {
          where: { status: 'COMPLETED' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const escrowHold = order.escrowHolds[0];
    if (!escrowHold) {
      throw new Error('No held/disputed escrow found');
    }

    const actualRefundAmount = options.refundAmount ?? Number(order.totalAmount);
    const processingFee = options.processingFee ?? 0;

    // Update escrow status
    await tx.escrowHold.update({
      where: { id: escrowHold.id },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    });

    // Update order status
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'REFUNDED',
      },
    });

    // Update transaction status if exists
    if (order.transactions[0]) {
      await tx.transaction.update({
        where: { id: order.transactions[0].id },
        data: {
          status: processingFee > 0 ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
        },
      });
    }

    // Create a proper Refund record
    const refund = await tx.refund.create({
      data: {
        transactionId: order.transactions[0]?.id || null,
        orderId: order.id,
        amount: actualRefundAmount,
        processingFee,
        reason,
        refundType: 'GATEWAY',
        status: 'COMPLETED', // Marked as completed (actual gateway refund is a TODO)
        processedAt: new Date(),
      },
    });

    // Credit buyer's balance atomically inside same transaction
    let creditBalance: number | undefined;
    if (options.buyerId && options.creditAmount && options.creditAmount > 0) {
      const user = await tx.user.update({
        where: { id: options.buyerId },
        data: { creditBalance: { increment: options.creditAmount } },
      });
      creditBalance = Number(user.creditBalance);
    }

    // TODO: Process actual refund through payment gateway
    // For PayFast: Use API to refund
    // For OZOW: Manual process required

    return {
      refundId: refund.id,
      refundAmount: actualRefundAmount,
      processingFee,
      creditBalance,
    };
  });
}

// ============ COURSE ESCROW ============

// Create escrow hold for a course enrollment with 24h hold
export async function processCourseEscrowHold(
  tx: TransactionClient,
  enrollmentId: string,
  amount: number,
  sellerAmount: number
): Promise<string> {
  const holdUntil = new Date(Date.now() + COURSE_FEES.ESCROW_HOLD_HOURS * 60 * 60 * 1000);

  const escrowHold = await tx.escrowHold.create({
    data: {
      enrollmentId,
      amount,
      sellerAmount,
      status: 'HELD',
      holdUntil,
    },
  });

  // Schedule automatic release after 24h
  await escrowReleaseQueue.add(
    'course-auto-release',
    { enrollmentId, escrowHoldId: escrowHold.id },
    { delay: COURSE_FEES.ESCROW_HOLD_HOURS * 60 * 60 * 1000 }
  );

  return escrowHold.id;
}

// Release course escrow funds to seller (called by BullMQ worker after 24h)
export async function releaseCourseEscrow(enrollmentId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const enrollment = await tx.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        escrowHold: true,
        course: {
          include: { seller: true },
        },
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const escrowHold = enrollment.escrowHold;
    if (!escrowHold || escrowHold.status !== 'HELD') {
      // Already released or refunded — skip silently
      return;
    }

    // If enrollment was refunded before release, skip
    if (enrollment.refundedAt) {
      return;
    }

    // Release escrow
    await tx.escrowHold.update({
      where: { id: escrowHold.id },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });

    // Add to seller's pending payout
    const sellerId = enrollment.course.sellerId;
    const existingPayout = await tx.sellerPayout.findFirst({
      where: { sellerId, status: 'PENDING' },
    });

    if (existingPayout) {
      await tx.sellerPayout.update({
        where: { id: existingPayout.id },
        data: { amount: { increment: escrowHold.sellerAmount } },
      });
    } else {
      await tx.sellerPayout.create({
        data: {
          sellerId,
          amount: escrowHold.sellerAmount,
          status: 'PENDING',
        },
      });
    }

    // Update seller metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await tx.sellerMetrics.upsert({
      where: { userId_date: { userId: sellerId, date: today } },
      create: {
        userId: sellerId,
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
