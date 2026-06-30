import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CouponType } from '../../../common/enums';
import { CouponUsage } from './coupon-usage.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('coupons')
@Index(['code'], { unique: true })
@Index(['isActive', 'startsAt', 'expiresAt'])
export class Coupon extends BaseEntity {
  @Column({ name: 'code', type: 'varchar', length: 60 })
  code: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'type', type: 'enum', enum: CouponType })
  type: CouponType;

  @Column({ name: 'value', type: 'numeric', precision: 10, scale: 2 })
  value: number;

  @Column({
    name: 'min_order_value',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  minOrderValue: number;

  @Column({
    name: 'max_discount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  maxDiscount: number | null;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  @Column({ name: 'per_user_limit', type: 'int', default: 1 })
  perUserLimit: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_first_order_only', type: 'boolean', default: false })
  isFirstOrderOnly: boolean;

  /**
   * Restrict coupon to specific category IDs. Empty = all categories.
   */
  @Column({
    name: 'applicable_category_ids',
    type: 'uuid',
    array: true,
    default: '{}',
  })
  applicableCategoryIds: string[];

  /**
   * Restrict coupon to specific product IDs. Empty = all products.
   */
  @Column({
    name: 'applicable_product_ids',
    type: 'uuid',
    array: true,
    default: '{}',
  })
  applicableProductIds: string[];

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @OneToMany(() => CouponUsage, (usage) => usage.coupon)
  usages: CouponUsage[];

  @OneToMany(() => Order, (order) => order.coupon)
  orders: Order[];
}
