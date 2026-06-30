import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Check,
  Unique,
} from 'typeorm';
import { PrimaryGeneratedColumn } from 'typeorm';
import { Cart } from './cart.entity';
import { ProductVariant } from '../../catalog/entities/product-variant.entity';

@Entity('cart_items')
@Unique(['cartId', 'variantId'])
@Index(['cartId'])
@Check(`"quantity" > 0`)
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cart_id', type: 'uuid' })
  cartId: string;

  @Column({ name: 'variant_id', type: 'uuid' })
  variantId: string;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn({ name: 'added_at', type: 'timestamptz' })
  addedAt: Date;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @ManyToOne(() => ProductVariant, (variant) => variant.cartItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;
}
