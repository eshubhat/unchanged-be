import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Coupon } from './coupon.entity';
import { User } from '../../auth/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('coupon_usages')
@Unique(['couponId', 'orderId'])
@Index(['couponId', 'userId'])
@Index(['userId'])
export class CouponUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'coupon_id', type: 'uuid' })
  couponId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 10, scale: 2 })
  discountAmount: number;

  @CreateDateColumn({ name: 'used_at', type: 'timestamptz' })
  usedAt: Date;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Coupon, (coupon) => coupon.usages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  @ManyToOne(() => User, (user) => user.couponUsages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToOne(() => Order, (order) => order.couponUsage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
