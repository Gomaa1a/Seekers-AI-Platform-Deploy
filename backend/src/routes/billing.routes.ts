import { Router } from 'express';
import { billingService } from '../services/billing.service';
import { authenticate, authenticateAdmin } from '../middleware';
import { asyncHandler } from '../utils/helpers';

const router = Router();

// ============================================
// Public: List available plans
// ============================================

router.get(
  '/plans',
  asyncHandler(async (_req, res) => {
    const plans = await billingService.getAllPlans();
    res.json({ success: true, data: plans });
  })
);

// ============================================
// Client: Subscription & usage
// ============================================

router.get(
  '/subscription',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = (req as any).user!.organizationId;
    const subscription = await billingService.getSubscription(organizationId);

    res.json({ success: true, data: subscription });
  })
);

router.get(
  '/usage',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = (req as any).user!.organizationId;
    const usage = await billingService.getUsageSummary(organizationId);

    res.json({ success: true, data: usage });
  })
);

router.get(
  '/payments',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = (req as any).user!.organizationId;
    const { limit, offset } = req.query;
    const payments = await billingService.getPayments(
      organizationId,
      parseInt(limit as string) || 20,
      parseInt(offset as string) || 0
    );

    res.json({ success: true, data: payments });
  })
);

// ============================================
// Stripe webhook (raw body required)
// ============================================

router.post(
  '/stripe-webhook',
  asyncHandler(async (req, res) => {
    // In production, verify Stripe signature here using req.body (raw buffer)
    // const sig = req.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    await billingService.handleStripeEvent(event);

    res.json({ received: true });
  })
);

// ============================================
// Admin: manage subscriptions
// ============================================

router.put(
  '/admin/subscription/:organizationId',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const subscription = await billingService.updateSubscription(organizationId, req.body);

    res.json({ success: true, message: 'Subscription updated', data: subscription });
  })
);

router.get(
  '/admin/usage/:organizationId',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const usage = await billingService.getUsageSummary(organizationId);

    res.json({ success: true, data: usage });
  })
);

export default router;
