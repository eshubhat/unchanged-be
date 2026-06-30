import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductReview } from './product-review.entity';

@Entity('product_review_images')
@Index(['reviewId', 'displayOrder'])
export class ProductReviewImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId: string;

  @Column({ name: 'url', type: 'varchar' })
  url: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => ProductReview, (review) => review.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_id' })
  review: ProductReview;
}
