import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  OrderShippedEvent,
  OrderDeliveredEvent,
  OrderCancelledEvent,
  ReturnRequestedEvent,
  ReturnApprovedEvent,
  OrderRefundedEvent,
  CancellationRequestedEvent,
} from '../events/order.events';
import { ORDER_STATUS_LABELS } from '../order-state-machine';

/**
 * OrderEventsListener handles all side effects triggered by order domain events.
 *
 * Each handler is intentionally small and focused:
 * - Notification dispatch (email/SMS/push)
 * - Audit log writes
 * - Inventory adjustments
 * - Analytics updates
 *
 * In production, replace logger calls with actual:
 *   - NotificationsService.sendEmail(...)
 *   - AuditService.log(...)
 *   - AnalyticsService.track(...)
 */
@Injectable()
export class OrderEventsListener {
  private readonly logger = new Logger(OrderEventsListener.name);

  // ─── Order Created ─────────────────────────────────────────────────────────

  @OnEvent(OrderCreatedEvent.EVENT_NAME, { async: true })
  async handleOrderCreated(event: OrderCreatedEvent) {
    this.logger.log(`📦 Order created: ${event.orderNumber} for ${event.userEmail}`);

    /**
     * TODO: Inject NotificationsService and emit:
     *   - Customer: Order confirmation email with items, total, address
     *   - Admin: New order Slack/dashboard notification
     *
     * NotificationsService.sendEmail({
     *   to: event.userEmail,
     *   template: 'order-confirmation',
     *   data: { orderNumber: event.orderNumber, order: event.order },
     * });
     */
  }

  // ─── Status Changed ────────────────────────────────────────────────────────

  @OnEvent(OrderStatusChangedEvent.EVENT_NAME, { async: true })
  async handleStatusChanged(event: OrderStatusChangedEvent) {
    this.logger.log(
      `🔄 Order ${event.orderNumber}: ${ORDER_STATUS_LABELS[event.fromStatus]} → ${ORDER_STATUS_LABELS[event.toStatus]}`,
    );

    /**
     * TODO:
     * - Push notification to customer's device via FCM
     * - Write to AuditLog
     * - Update analytics/BigQuery
     */
  }

  // ─── Shipped ───────────────────────────────────────────────────────────────

  @OnEvent(OrderShippedEvent.EVENT_NAME, { async: true })
  async handleOrderShipped(event: OrderShippedEvent) {
    this.logger.log(
      `🚚 Order ${event.orderNumber} shipped. Tracking: ${event.trackingNumber}`,
    );

    /**
     * TODO: Send SMS with tracking link
     * NotificationsService.sendSms({
     *   to: order.shippingAddress.phone,
     *   message: `Your order ${event.orderNumber} has been shipped! Track: ${event.trackingUrl}`,
     * });
     */
  }

  // ─── Delivered ─────────────────────────────────────────────────────────────

  @OnEvent(OrderDeliveredEvent.EVENT_NAME, { async: true })
  async handleOrderDelivered(event: OrderDeliveredEvent) {
    this.logger.log(`✅ Order ${event.orderNumber} delivered`);

    /**
     * TODO:
     * - Deduct reserved_quantity from inventory (reserved → actual sale)
     * - Schedule review request email after 3 days
     * - Update customer LTV in analytics
     *
     * InventoryService.confirmSale(event.order.items);
     * NotificationsService.scheduleReviewRequest(event.order, { delayDays: 3 });
     */
  }

  // ─── Cancelled ─────────────────────────────────────────────────────────────

  @OnEvent(OrderCancelledEvent.EVENT_NAME, { async: true })
  async handleOrderCancelled(event: OrderCancelledEvent) {
    this.logger.log(
      `❌ Order ${event.orderNumber} cancelled by ${event.isByCustomer ? 'customer' : 'admin'}`,
    );

    /**
     * TODO:
     * - Release inventory reservations (done in service, confirm here)
     * - Initiate refund if payment was captured (via PaymentsService)
     * - Send cancellation confirmation email
     *
     * if (event.order.paymentStatus === PaymentStatus.PAID) {
     *   PaymentsService.initiateRefund(event.order.payment, event.order.totalAmount);
     * }
     */
  }

  // ─── Return Requested ──────────────────────────────────────────────────────

  @OnEvent(ReturnRequestedEvent.EVENT_NAME, { async: true })
  async handleReturnRequested(event: ReturnRequestedEvent) {
    this.logger.log(`↩️  Return requested for order ${event.orderNumber}: ${event.reason}`);

    /**
     * TODO:
     * - Notify admin via email/Slack
     * - Send acknowledgement email to customer
     */
  }

  // ─── Return Approved ───────────────────────────────────────────────────────

  @OnEvent(ReturnApprovedEvent.EVENT_NAME, { async: true })
  async handleReturnApproved(event: ReturnApprovedEvent) {
    this.logger.log(
      `✅ Return approved for order ${event.orderNumber}. Refund: ₹${event.refundAmount}`,
    );

    /**
     * TODO:
     * - Initiate Razorpay refund via PaymentsService
     * - Send refund confirmation email to customer
     *
     * PaymentsService.initiateRefund(event.order.payment, event.refundAmount);
     */
  }

  // ─── Refunded ──────────────────────────────────────────────────────────────

  @OnEvent(OrderRefundedEvent.EVENT_NAME, { async: true })
  async handleOrderRefunded(event: OrderRefundedEvent) {
    this.logger.log(
      `💰 Refund processed for order ${event.orderNumber}: ₹${event.refundAmount}`,
    );
  }

  // ─── Cancellation Requested ────────────────────────────────────────────────

  @OnEvent(CancellationRequestedEvent.EVENT_NAME, { async: true })
  async handleCancellationRequested(event: CancellationRequestedEvent) {
    this.logger.log(
      `🚫 Cancellation requested for order ${event.orderNumber}: ${event.reason}`,
    );
  }
}
