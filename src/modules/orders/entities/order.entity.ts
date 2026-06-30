import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrderStatus, PaymentStatus } from '../../../common/enums';
import { User } from '../../auth/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Coupon } from '../../promotions/entities/coupon.entity';
import { CouponUsage } from '../../promotions/entities/coupon-usage.entity';

@Entity('orders')
@Index(['orderNumber'], { unique: true })
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['paymentStatus'])
export class Order extends BaseEntity {
  /**
   * Human-readable ID: ORD-20240617-XXXXX
   */
  @Column({ name: 'order_number', type: 'varchar', length: 60 })
  orderNumber: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  /**
   * Snapshot of delivery address at time of order — immutable record.
   */
  @Column({ name: 'shipping_address', type: 'jsonb' })
  shippingAddress: Record<string, any>;

  /**
   * Snapshot of billing address at time of order.
   */
  @Column({ name: 'billing_address', type: 'jsonb', nullable: true })
  billingAddress: Record<string, any> | null;

  @Column({ name: 'subtotal', type: 'numeric', precision: 10, scale: 2 })
  subtotal: number;

  @Column({
    name: 'shipping_charge',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  shippingCharge: number;

  @Column({
    name: 'discount_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({
    name: 'tax_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  taxAmount: number;

  @Column({ name: 'total_amount', type: 'numeric', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'coupon_id', type: 'uuid', nullable: true })
  couponId: string | null;

  /**
   * Coupon code snapshot in case coupon is later deleted.
   */
  @Column({ name: 'coupon_code', type: 'varchar', length: 50, nullable: true })
  couponCode: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'tracking_number', type: 'varchar', length: 100, nullable: true })
  trackingNumber: string | null;

  @Column({ name: 'tracking_url', type: 'varchar', nullable: true })
  trackingUrl: string | null;

  @Column({ name: 'estimated_delivery', type: 'date', nullable: true })
  estimatedDelivery: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => OrderStatusHistory, (h) => h.order, { cascade: true })
  statusHistory: OrderStatusHistory[];

  @OneToOne(() => Payment, (payment) => payment.order, { cascade: true })
  payment: Payment;

  @ManyToOne(() => Coupon, (coupon) => coupon.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon | null;

  @OneToOne(() => CouponUsage, (cu) => cu.order)
  couponUsage: CouponUsage;
}
