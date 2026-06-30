import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Category } from './category.entity';
import { Product } from './product.entity';

@Entity('subcategories')
@Index(['slug'], { unique: true })
@Index(['categoryId', 'isActive'])
export class SubCategory extends BaseEntity {
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'slug', type: 'varchar', length: 250 })
  slug: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Category, (category) => category.subcategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => Product, (product) => product.subcategory)
  products: Product[];
}
