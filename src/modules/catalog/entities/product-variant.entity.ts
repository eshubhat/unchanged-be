import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProductSize } from '../../../common/enums';
import { Product } from './product.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { WishlistItem } from '../../wishlist/entities/wishlist-item.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

@Entity('product_variants')
@Index(['sku'], { unique: true })
@Index(['productId', 'isActive'])
@Index(['productId', 'size', 'color'])
export class ProductVariant extends BaseEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'sku', type: 'varchar', length: 150 })
  sku: string;

  @Column({
    name: 'size',
    type: 'enum',
    enum: ProductSize,
    nullable: true,
  })
  size: ProductSize | null;

  @Column({ name: 'color', type: 'varchar', length: 80, nullable: true })
  color: string | null;

  @Column({ name: 'color_hex', type: 'varchar', length: 7, nullable: true })
  colorHex: string | null;

  /**
   * If set, overrides the parent product's selling_price for this variant.
   */
  @Column({
    name: 'price_override',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  priceOverride: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToOne(() => Inventory, (inv) => inv.variant, { cascade: true })
  inventory: Inventory;

  @OneToMany(() => CartItem, (item) => item.variant)
  cartItems: CartItem[];

  @OneToMany(() => WishlistItem, (item) => item.variant)
  wishlistItems: WishlistItem[];

  @OneToMany(() => OrderItem, (item) => item.variant)
  orderItems: OrderItem[];
}
