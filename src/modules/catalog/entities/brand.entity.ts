import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';

@Entity('brands')
@Index(['slug'], { unique: true })
@Index(['isActive'])
export class Brand extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'slug', type: 'varchar', length: 200 })
  slug: string;

  @Column({ name: 'logo_url', type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({ name: 'banner_url', type: 'varchar', nullable: true })
  bannerUrl: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'website', type: 'varchar', nullable: true })
  website: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @OneToMany(() => Product, (product) => product.brand)
  products: Product[];
}
