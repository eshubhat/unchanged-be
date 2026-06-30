import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { BannerPosition } from '../../../common/enums';

@Entity('banners')
@Index(['position', 'isActive', 'startsAt', 'endsAt'])
@Index(['displayOrder'])
export class Banner extends BaseEntity {
  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'subtitle', type: 'varchar', length: 500, nullable: true })
  subtitle: string | null;

  @Column({ name: 'image_url', type: 'varchar' })
  imageUrl: string;

  @Column({ name: 'mobile_image_url', type: 'varchar', nullable: true })
  mobileImageUrl: string | null;

  @Column({ name: 'link_url', type: 'varchar', nullable: true })
  linkUrl: string | null;

  /**
   * Link destination type: "product", "category", "collection", "external"
   */
  @Column({ name: 'link_type', type: 'varchar', length: 50, nullable: true })
  linkType: string | null;

  @Column({ name: 'link_entity_id', type: 'uuid', nullable: true })
  linkEntityId: string | null;

  @Column({
    name: 'position',
    type: 'enum',
    enum: BannerPosition,
    default: BannerPosition.HERO,
  })
  position: BannerPosition;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column({ name: 'cta_text', type: 'varchar', length: 100, nullable: true })
  ctaText: string | null;
}
