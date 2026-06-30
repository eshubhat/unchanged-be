import { OrderStatus } from '../../../common/enums';
import { Order } from '../entities/order.entity';

// ─── Base ─────────────────────────────────────────────────────────────────────

export abstract class OrderBaseEvent {
  readonly occurredAt: Date = new Date();
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly userId: string,
  ) {}
}

// ─── Order Created ────────────────────────────────────────────────────────────

export class OrderCreatedEvent extends OrderBaseEvent {
  static readonly EVENT_NAME = 'order.created';

  constructor(
    public readonly order: Order,
    public readonly userEmail: string,
    public readonly userName: string,
  ) {
    super(order.id, order.orderNumber, order.userId);
  }
}

// ─── Status Changed ───────────────────────────────────────────────────────────

export class OrderStatusChangedEvent extends OrderBaseEvent {
  static readonly EVENT_NAME = 'order.status_changed';

  constructor(
    public readonly order: Order,
    public readonly fromStatus: OrderStatus,
    public readonly toStatus: OrderStatus,
    public readonly changedById: string,
    public readonly note?: string,
  ) {
    super(order.id, order.orderNumber, order.userId);
  }
}

// ─── Delivered ────────────────────────────────────────────────────────────────

export class OrderDeliveredEvent extends OrderBaseEvent {
  static readonly EVENT_NAME = 'order.delivered';

  constructor(
    public readonly order: Order,
    public readonly userEmail: string,
    public readonly userName: string,
  ) {
    super(order.id, order.orderNumber, order.userId);
  }
}

// ─── Cancelled ────────────────────────────────────────────────────────────────

export class OrderCancelledEvent extends OrderBaseEvent {
  static readonly EVENT_NAME = 'order.cancelled';

  constructor(
    public readonly order: Order,
    public readonly reason: string,
    public readonly cancelledById: string,
    /** true = cancelled by customer, false = admin/system */
    public readonly isByCustomer: boolean,
  ) {
    super(order.id, order.orderNumber, order.userId);
  }
}

// ─── Return Requested ─────────────────────────────────────────────────────────

export class ReturnRequestedEvent extends OrderBaseEvent {
  static readonly EVENT_NAME = 'order.return_requested';

  constructor(
    public readonly order: Order,
    public readonly returnRequestId: string,
    public readonly reason: string,
  ) {
    super(order.id, order.orderNumber, order.userId);
  }
}

// ─── Return Approved ─────────────────────────────────────────────────────────

export class ReturnApprovedEvent extends OrderBaseEvent {
  static readonly EVENT_NAME = 'order.return_approved';

  constructor(
    public readonly order: Order,
    public readonly returnRequestId: string,
    public readonly refundAmount: number,
  ) {
    super(order.id, order.orderNumber, order.userId);
  }
}

// ─── Refunded ─────────────────────────────────────────────────────────────────

export class OrderRefundedEvent extends OrderBaseEvent {
  static readonly EVENT_NAME = 'order.refunded';

  constructor(
    public readonly order: Order,
    public readonly refundAmount: number,
    public readonly razorpayRefundId: string,
  ) {
    super(order.id, order.orderNumber, order.userId);
  }
}

// ─── Cancellation Requested ───────────────────────────────────────────────────

export class CancellationRequestedEvent extends OrderBaseEvent {
  static readonly EVENT_NAME = 'order.cancellation_requested';

  constructor(
    public readonly order: Order,
    public readonly cancellationRequestId: string,
    public readonly reason: string,
  ) {
    super(order.id, order.orderNumber, order.userId);
  }
}

// ─── Shipped ──────────────────────────────────────────────────────────────────

export class OrderShippedEvent extends OrderBaseEvent {
  static readonly EVENT_NAME = 'order.shipped';

  constructor(
    public readonly order: Order,
    public readonly trackingNumber: string,
    public readonly trackingUrl: string | null,
    public readonly estimatedDelivery: Date | null,
  ) {
    super(order.id, order.orderNumber, order.userId);
  }
}
