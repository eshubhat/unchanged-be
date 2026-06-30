import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RefundStatus } from '../../../common/enums';
import { Payment } from './payment.entity';

@Entity('refunds')
@Index(['razorpayRefundId'], { unique: true, where: '"razorpay_refund_id" IS NOT NULL' })
@Index(['paymentId', 'status'])
export class Refund extends BaseEntity {
  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @Column({ name: 'razorpay_refund_id', type: 'varchar', nullable: true })
  razorpayRefundId: string | null;

  @Column({ name: 'amount', type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.INITIATED,
  })
  status: RefundStatus;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse: Record<string, any> | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Payment, (payment) => payment.refunds, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;
}
