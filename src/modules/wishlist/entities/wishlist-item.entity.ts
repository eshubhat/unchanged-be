import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wishlist } from './wishlist.entity';
import { Product } from '../../catalog/entities/product.entity';
import { ProductVariant } from '../../catalog/entities/product-variant.entity';

@Entity('wishlist_items')
@Unique(['wishlistId', 'variantId'])
@Index(['wishlistId'])
export class WishlistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wishlist_id', type: 'uuid' })
  wishlistId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId: string | null;

  @CreateDateColumn({ name: 'added_at', type: 'timestamptz' })
  addedAt: Date;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Wishlist, (wl) => wl.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wishlist_id' })
  wishlist: Wishlist;

  @ManyToOne(() => Product, (p) => p.wishlistItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => ProductVariant, (v) => v.wishlistItems, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;
}
