import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';

@Entity('product_attributes')
@Index(['productId', 'attributeName'])
export class ProductAttribute extends BaseEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  /**
   * e.g. "Material", "Fit", "Care Instructions", "Occasion"
   */
  @Column({ name: 'attribute_name', type: 'varchar', length: 100 })
  attributeName: string;

  @Column({ name: 'attribute_value', type: 'text' })
  attributeValue: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Product, (product) => product.attributes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
