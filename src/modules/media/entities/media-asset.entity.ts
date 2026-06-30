import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MediaEntityType } from '../../../common/enums';
import { User } from '../../auth/entities/user.entity';

@Entity('media_assets')
@Index(['entityType', 'entityId'])
@Index(['uploadedById'])
@Index(['s3Key'], { unique: true })
export class MediaAsset extends BaseEntity {
  @Column({ name: 'filename', type: 'varchar', length: 255 })
  filename: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  /**
   * File size in bytes.
   */
  @Column({ name: 'size', type: 'int' })
  size: number;

  @Column({ name: 'url', type: 'varchar' })
  url: string;

  @Column({ name: 's3_key', type: 'varchar' })
  s3Key: string;

  @Column({ name: 's3_bucket', type: 'varchar', length: 100 })
  s3Bucket: string;

  @Column({ name: 'width', type: 'int', nullable: true })
  width: number | null;

  @Column({ name: 'height', type: 'int', nullable: true })
  height: number | null;

  @Column({ name: 'uploaded_by_id', type: 'uuid', nullable: true })
  uploadedById: string | null;

  @Column({
    name: 'entity_type',
    type: 'enum',
    enum: MediaEntityType,
    nullable: true,
  })
  entityType: MediaEntityType | null;

  /**
   * Polymorphic FK — references product_id, category_id, etc.
   */
  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User | null;
}
