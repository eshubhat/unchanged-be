import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Category } from './category.entity';
import { SubCategory } from './subcategory.entity';
import { Brand } from './brand.entity';
import { Collection } from './collection.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductImage } from './product-image.entity';
import { ProductAttribute } from './product-attribute.entity';
import { ProductReview } from '../../reviews/entities/product-review.entity';
import { WishlistItem } from '../../wishlist/entities/wishlist-item.entity';

@Entity('products')
@Index(['slug'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['sku'], { unique: true })
@Index(['categoryId', 'isActive'])
@Index(['subcategoryId', 'isActive'])
@Index(['brandId', 'isActive'])
@Index(['sellingPrice'])
@Index(['isFeatured', 'isActive'])
export class Product extends BaseEntity {
  @Column({ name: 'sku', type: 'varchar', length: 100 })
  sku: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'slug', type: 'varchar', length: 350 })
  slug: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'short_description', type: 'varchar', length: 600, nullable: true })
  shortDescription: string | null;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column({ name: 'subcategory_id', type: 'uuid', nullable: true })
  subcategoryId: string | null;

  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId: string | null;

  @Column({ name: 'base_price', type: 'numeric', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ name: 'selling_price', type: 'numeric', precision: 10, scale: 2 })
  sellingPrice: number;

  @Column({
    name: 'discount_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPercent: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ name: 'is_limited', type: 'boolean', default: false })
  isLimited: boolean;

  @Column({ name: 'tags', type: 'varchar', array: true, default: '{}' })
  tags: string[];

  @Column({ name: 'meta_title', type: 'varchar', length: 255, nullable: true })
  metaTitle: string | null;

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription: string | null;

  @Column({ name: 'average_rating', type: 'numeric', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ name: 'review_count', type: 'int', default: 0 })
  reviewCount: number;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Category, (cat) => cat.products, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => SubCategory, (sub) => sub.products, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'subcategory_id' })
  subcategory: SubCategory | null;

  @ManyToOne(() => Brand, (brand) => brand.products, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand | null;

  @ManyToMany(() => Collection, (col) => col.products)
  @JoinTable({
    name: 'product_collections',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'collection_id', referencedColumnName: 'id' },
  })
  collections: Collection[];

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[];

  @OneToMany(() => ProductImage, (image) => image.product, { cascade: true })
  images: ProductImage[];

  @OneToMany(() => ProductAttribute, (attr) => attr.product, { cascade: true })
  attributes: ProductAttribute[];

  @OneToMany(() => ProductReview, (review) => review.product)
  reviews: ProductReview[];

  @OneToMany(() => WishlistItem, (item) => item.product)
  wishlistItems: WishlistItem[];
}
