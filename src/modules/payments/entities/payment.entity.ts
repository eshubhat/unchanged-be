import {
  Entity,
  Column,
  Index,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RazorpayPaymentStatus, PaymentMethod } from '../../../common/enums';
import { Order } from '../../orders/entities/order.entity';
import { Refund } from './refund.entity';

@Entity('payments')
@Index(['razorpayOrderId'], { unique: true })
@Index(['razorpayPaymentId'], { where: '"razorpay_payment_id" IS NOT NULL' })
@Index(['orderId'], { unique: true })
@Index(['status'])
export class Payment extends BaseEntity {
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'razorpay_order_id', type: 'varchar' })
  razorpayOrderId: string;

  @Column({ name: 'razorpay_payment_id', type: 'varchar', nullable: true })
  razorpayPaymentId: string | null;

  @Column({ name: 'razorpay_signature', type: 'varchar', nullable: true })
  razorpaySignature: string | null;

  @Column({ name: 'amount', type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'currency', type: 'varchar', length: 5, default: 'INR' })
  currency: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: RazorpayPaymentStatus,
    default: RazorpayPaymentStatus.CREATED,
  })
  status: RazorpayPaymentStatus;

  @Column({
    name: 'method',
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  method: PaymentMethod | null;

  @Column({ name: 'captured_at', type: 'timestamptz', nullable: true })
  capturedAt: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  /**
   * Raw Razorpay webhook payload for debugging.
   */
  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse: Record<string, any> | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @OneToOne(() => Order, (order) => order.payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @OneToMany(() => Refund, (refund) => refund.payment, { cascade: true })
  refunds: Refund[];
}
