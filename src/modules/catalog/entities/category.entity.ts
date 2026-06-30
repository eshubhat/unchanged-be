import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SubCategory } from './subcategory.entity';
import { Product } from './product.entity';

@Entity('categories')
@Index(['slug'], { unique: true })
@Index(['isActive'])
export class Category extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'slug', type: 'varchar', length: 200 })
  slug: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'meta_title', type: 'varchar', length: 255, nullable: true })
  metaTitle: string | null;

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription: string | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @OneToMany(() => SubCategory, (sub) => sub.category, { cascade: true })
  subcategories: SubCategory[];

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
