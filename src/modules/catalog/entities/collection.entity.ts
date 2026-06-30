import {
  Entity,
  Column,
  Index,
  ManyToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';

@Entity('collections')
@Index(['slug'], { unique: true })
@Index(['isActive', 'startsAt', 'endsAt'])
export class Collection extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'slug', type: 'varchar', length: 250 })
  slug: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'banner_url', type: 'varchar', nullable: true })
  bannerUrl: string | null;

  @Column({ name: 'mobile_banner_url', type: 'varchar', nullable: true })
  mobileBannerUrl: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToMany(() => Product, (product) => product.collections)
  products: Product[];
}
