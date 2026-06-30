import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../../common/enums';

/**
 * Immutable state transition map for the order lifecycle.
 *
 * Flow:
 *   PENDING → CONFIRMED → PROCESSING (Packed) → SHIPPED
 *          → OUT_FOR_DELIVERY → DELIVERED → RETURNED → REFUNDED
 *
 * Side exits:
 *   PENDING | CONFIRMED | PROCESSING → CANCELLED
 *
 * Terminal states: DELIVERED (happy path), CANCELLED, REFUNDED
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]:          [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]:        [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]:       [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]:          [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]:        [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]:        [],
  [OrderStatus.RETURNED]:         [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]:         [],
};

/** Human-readable labels for Swagger / emails */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]:          'Pending',
  [OrderStatus.CONFIRMED]:        'Confirmed',
  [OrderStatus.PROCESSING]:       'Packed',
  [OrderStatus.SHIPPED]:          'Shipped',
  [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [OrderStatus.DELIVERED]:        'Delivered',
  [OrderStatus.CANCELLED]:        'Cancelled',
  [OrderStatus.RETURNED]:         'Returned',
  [OrderStatus.REFUNDED]:         'Refunded',
};

export class OrderStateMachine {
  /**
   * Validates and returns allowed next states for a given current status.
   */
  static getAllowedTransitions(current: OrderStatus): OrderStatus[] {
    return VALID_TRANSITIONS[current] ?? [];
  }

  /**
   * Returns true if the transition is permitted.
   */
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Asserts the transition is valid — throws BadRequestException otherwise.
   * Use inside services before persisting a status change.
   */
  static assertTransition(from: OrderStatus, to: OrderStatus): void {
    if (!OrderStateMachine.canTransition(from, to)) {
      throw new BadRequestException(
        `Cannot transition order from '${ORDER_STATUS_LABELS[from]}' to '${ORDER_STATUS_LABELS[to]}'. ` +
          `Allowed: [${OrderStateMachine.getAllowedTransitions(from)
            .map((s) => ORDER_STATUS_LABELS[s])
            .join(', ') || 'none — terminal state'}]`,
      );
    }
  }

  /**
   * Returns true if the status is a terminal state.
   */
  static isTerminal(status: OrderStatus): boolean {
    return VALID_TRANSITIONS[status]?.length === 0;
  }

  /**
   * Returns true if cancellation is still allowed by the customer.
   * (Only before order is shipped)
   */
  static isCancellableByCustomer(status: OrderStatus): boolean {
    return [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
    ].includes(status);
  }

  /**
   * Returns true if a return request can be placed.
   * (Only after delivery)
   */
  static isReturnable(status: OrderStatus): boolean {
    return status === OrderStatus.DELIVERED;
  }
}
