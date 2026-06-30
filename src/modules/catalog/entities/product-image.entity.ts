import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';

@Entity('product_images')
@Index(['productId', 'isPrimary'])
@Index(['productId', 'displayOrder'])
export class ProductImage extends BaseEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'url', type: 'varchar' })
  url: string;

  @Column({ name: 'alt_text', type: 'varchar', length: 255, nullable: true })
  altText: string | null;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  /**
   * Links to the variant this image specifically represents, if any.
   * NULL = applies to the base product.
   */
  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId: string | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
