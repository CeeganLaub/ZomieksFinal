import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { prisma } from '@/lib/prisma.js';
import { validate } from '@/middleware/validate.js';
import { createOrderSchema, orderDeliverySchema, orderRevisionSchema, calculateOrderFees, generateOrderNumber, calculateDeliveryDueDate } from '@zomieks/shared';

const router = Router();

// Get user's orders (as buyer)
router.get('/buying', authenticate, async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const where: any = { buyerId: req.user!.id };
    if (status) where.status = status as string;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          service: {
            select: { id: true, title: true, slug: true, images: true },
          },
          seller: {
            select: { username: true, avatar: true },
          },
          package: { select: { tier: true, name: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: { orders },
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get user's orders (as seller)
router.get('/selling', authenticate, async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const where: any = { sellerId: req.user!.id };
    if (status) where.status = status as string;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          service: {
            select: { id: true, title: true, slug: true, images: true },
          },
          buyer: {
            select: { username: true, avatar: true, firstName: true },
          },
          package: { select: { tier: true, name: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: { orders },
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single order
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id as string,
        OR: [
          { buyerId: req.user!.id },
          { sellerId: req.user!.id },
        ],
      },
      include: {
        service: true,
        buyer: {
          select: { id: true, username: true, avatar: true, firstName: true, lastName: true },
        },
        seller: {
          select: { id: true, username: true, avatar: true, firstName: true, lastName: true },
        },
        package: true,
        deliveries: { orderBy: { createdAt: 'desc' } },
        revisionRequests: { orderBy: { requestedAt: 'desc' } },
        transactions: { orderBy: { createdAt: 'desc' } },
        conversation: { select: { id: true } },
        review: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    res.json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
});

// Create order
router.post(
  '/',
  authenticate,
  validate(createOrderSchema),
  async (req, res, next) => {
    try {
      const { serviceId, packageTier, subscriptionTierId, requirements, paymentGateway } = req.body;

      // Get service and package
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: {
          packages: packageTier ? { where: { tier: packageTier } } : undefined,
          subscriptionTiers: subscriptionTierId ? { where: { id: subscriptionTierId } } : undefined,
          seller: { select: { id: true } },
        },
      });

      if (!service || !service.isActive) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Service not found' },
        });
      }

      // Can't order own service
      if (service.sellerId === req.user!.id) {
        return res.status(400).json({
          success: false,
          error: { code: 'SELF_ORDER', message: 'You cannot order your own service' },
        });
      }

      // Determine pricing
      let baseAmount: number;
      let deliveryDays: number;
      let revisions: number;
      let packageId: string | undefined;

      if (subscriptionTierId && service.subscriptionTiers?.[0]) {
        // Subscription order handled separately via /subscriptions route
        return res.status(400).json({
          success: false,
          error: { code: 'USE_SUBSCRIPTION_ROUTE', message: 'Use /subscriptions route for subscription orders' },
        });
      } else if (packageTier && service.packages?.[0]) {
        const pkg = service.packages[0];
        baseAmount = Number(pkg.price);
        deliveryDays = pkg.deliveryDays;
        revisions = pkg.revisions;
        packageId = pkg.id;
      } else {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_PACKAGE', message: 'Package tier is required' },
        });
      }

      // Calculate fees
      const fees = calculateOrderFees(baseAmount);

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          buyerId: req.user!.id,
          sellerId: service.sellerId,
          serviceId,
          packageId,
          baseAmount: fees.baseAmount,
          buyerFee: fees.buyerFee,
          totalAmount: fees.totalAmount,
          sellerFee: fees.sellerFee,
          sellerPayout: fees.sellerPayout,
          platformRevenue: fees.platformRevenue,
          requirements,
          deliveryDays,
          revisions,
          deliveryDueAt: calculateDeliveryDueDate(deliveryDays),
        },
        include: {
          service: { select: { title: true } },
        },
      });

      // Create or find conversation
      await prisma.conversation.upsert({
        where: {
          buyerId_sellerId: {
            buyerId: req.user!.id,
            sellerId: service.sellerId,
          },
        },
        create: {
          buyerId: req.user!.id,
          sellerId: service.sellerId,
          orderId: order.id,
        },
        update: {},
      });

      res.status(201).json({ 
        success: true, 
        data: { 
          order,
          paymentUrl: `/api/v1/payments/initiate?orderId=${order.id}&gateway=${paymentGateway}`,
        } 
      });
    } catch (error) {
      next(error);
    }
  }
);

// Deliver order (seller)
router.post(
  '/:id/deliver',
  authenticate,
  validate(orderDeliverySchema),
  async (req, res, next) => {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: req.params.id as string,
          sellerId: req.user!.id,
          status: { in: ['IN_PROGRESS', 'REVISION_REQUESTED'] },
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order not found or cannot be delivered' },
        });
      }

      const [delivery] = await prisma.$transaction([
        prisma.orderDelivery.create({
          data: {
            orderId: order.id,
            message: req.body.message,
            attachments: req.body.attachments,
          },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
          },
        }),
      ]);

      res.json({ success: true, data: { delivery } });
    } catch (error) {
      next(error);
    }
  }
);

// Request revision (buyer)
router.post(
  '/:id/revision',
  authenticate,
  validate(orderRevisionSchema),
  async (req, res, next) => {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: req.params.id as string,
          buyerId: req.user!.id,
          status: 'DELIVERED',
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order not found or cannot request revision' },
        });
      }

      if (order.revisionsUsed >= order.revisions) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_REVISIONS', message: 'No revisions remaining' },
        });
      }

      const [revision] = await prisma.$transaction([
        prisma.orderRevision.create({
          data: {
            orderId: order.id,
            message: req.body.message,
          },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'REVISION_REQUESTED',
            revisionsUsed: { increment: 1 },
          },
        }),
      ]);

      res.json({ success: true, data: { revision } });
    } catch (error) {
      next(error);
    }
  }
);

// Accept delivery (buyer) - triggers escrow release
router.post('/:id/accept', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id as string,
        buyerId: req.user!.id,
        status: 'DELIVERED',
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found or cannot be accepted' },
      });
    }

    // Update order to completed
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Release escrow (handled by escrow service)
    const { releaseOrderEscrow } = await import('@/services/escrow.service.js');
    await releaseOrderEscrow(order.id);

    res.json({ success: true, data: { order: updated } });
  } catch (error) {
    next(error);
  }
});

// Cancel order
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id as string,
        OR: [
          { buyerId: req.user!.id },
          { sellerId: req.user!.id },
        ],
        status: { in: ['PENDING_PAYMENT', 'PAID', 'IN_PROGRESS'] },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found or cannot be cancelled' },
      });
    }

    // If already paid, initiate refund
    if (order.status !== 'PENDING_PAYMENT') {
      // TODO: Initiate refund process
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: req.body.reason,
      },
    });

    res.json({ success: true, data: { order: updated } });
  } catch (error) {
    next(error);
  }
});

// Raise a dispute (buyer or seller)
router.post('/:id/dispute', authenticate, async (req, res, next) => {
  try {
    const { reason, description } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Reason is required' },
      });
    }
    
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id as string,
        OR: [
          { buyerId: req.user!.id },
          { sellerId: req.user!.id },
        ],
        status: { in: ['IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED'] },
      },
      include: { escrowHolds: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found or cannot raise dispute' },
      });
    }
    
    // Check if dispute already exists
    const existingDispute = await prisma.dispute.findFirst({
      where: { orderId: order.id, status: 'OPEN' }
    });
    
    if (existingDispute) {
      return res.status(400).json({
        success: false,
        error: { code: 'DISPUTE_EXISTS', message: 'A dispute is already open for this order' },
      });
    }
    
    const isBuyer = order.buyerId === req.user!.id;

    const [dispute] = await prisma.$transaction([
      prisma.dispute.create({
        data: {
          orderId: order.id,
          raisedBy: req.user!.id,
          reason: description ? `${reason}: ${description}` : reason,
          status: 'OPEN',
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'DISPUTED',
        },
      }),
      // Put escrow on hold (update status to DISPUTED)
      ...order.escrowHolds.map((hold: { id: string }) => 
        prisma.escrowHold.update({
          where: { id: hold.id },
          data: { status: 'DISPUTED' }
        })
      ),
    ]);
    
    // Notify the other party
    const { notificationQueue } = await import('@/lib/queue.js');
    await notificationQueue.add('notification', {
      userId: isBuyer ? order.sellerId : order.buyerId,
      type: 'DISPUTE_RAISED',
      title: 'Dispute Raised',
      message: `A dispute has been raised for order #${order.orderNumber}`,
      data: { orderId: order.id, disputeId: dispute.id }
    });

    res.status(201).json({ success: true, data: { dispute } });
  } catch (error) {
    next(error);
  }
});

// Get dispute details
router.get('/:id/dispute', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id as string,
        OR: [
          { buyerId: req.user!.id },
          { sellerId: req.user!.id },
        ],
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }
    
    const dispute = await prisma.dispute.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: { dispute } });
  } catch (error) {
    next(error);
  }
});

export default router;
