import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Check,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from '../../catalog/entities/product.entity';
import { User } from '../../auth/entities/user.entity';
import { ProductReviewImage } from './product-review-image.entity';

@Entity('product_reviews')
@Index(['productId', 'isApproved'])
@Index(['userId', 'productId'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['productId', 'rating'])
@Check(`"rating" >= 1 AND "rating" <= 5`)
export class ProductReview extends BaseEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'rating', type: 'smallint' })
  rating: number;

  @Column({ name: 'title', type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ name: 'body', type: 'text', nullable: true })
  body: string | null;

  @Column({ name: 'is_verified_purchase', type: 'boolean', default: false })
  isVerifiedPurchase: boolean;

  @Column({ name: 'is_approved', type: 'boolean', default: false })
  isApproved: boolean;

  @Column({ name: 'helpful_count', type: 'int', default: 0 })
  helpfulCount: number;

  @Column({ name: 'admin_reply', type: 'text', nullable: true })
  adminReply: string | null;

  @Column({ name: 'admin_replied_at', type: 'timestamptz', nullable: true })
  adminRepliedAt: Date | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Product, (p) => p.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, (u) => u.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => ProductReviewImage, (img) => img.review, { cascade: true })
  images: ProductReviewImage[];
}
