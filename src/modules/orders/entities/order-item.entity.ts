import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Check,
} from 'typeorm';
import { Order } from './order.entity';
import { ProductVariant } from '../../catalog/entities/product-variant.entity';

@Entity('order_items')
@Index(['orderId'])
@Index(['variantId'])
@Check(`"quantity" > 0`)
@Check(`"unit_price" >= 0`)
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId: string | null;

  /**
   * Full product/variant snapshot: name, sku, image, color, size, brand.
   * Immutable — survives product deletion or edits.
   */
  @Column({ name: 'product_snapshot', type: 'jsonb' })
  productSnapshot: Record<string, any>;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ name: 'total_price', type: 'numeric', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => ProductVariant, (v) => v.orderItems, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;
}
