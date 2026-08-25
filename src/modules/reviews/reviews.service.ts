import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductReview } from './entities/product-review.entity';
import { Product } from '../catalog/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { CreateReviewDto, UpdateReviewDto, AdminReplyDto } from './dto/create-review.dto';
import { OrderStatus } from '../../common/enums';


@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ProductReview)
    private readonly reviewRepo: Repository<ProductReview>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  // ─── Create ──────────────────────────────────────────────────────────────────

  async createReview(
    userId: string,
    productId: string,
    dto: CreateReviewDto,
  ): Promise<ProductReview> {
    // 1. Verify product exists
    const product = await this.productRepo.findOne({ where: { id: productId, isActive: true } });
    if (!product) throw new NotFoundException(`Product not found`);

    // 2. Fool-proof: Verified purchase check
    //    User must have a DELIVERED order containing a variant of this product.
    //    We use a subquery approach via the DataSource queryBuilder for correctness.
    const purchaseCheckResult = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'oi')
      .innerJoin('oi.variant', 'pv')
      .where('o.userId = :userId', { userId })
      .andWhere('o.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere('pv.productId = :productId', { productId })
      .getCount();

    const hasPurchased = purchaseCheckResult > 0;


    if (!hasPurchased) {
      throw new ForbiddenException(
        'You can only review products you have purchased and received.',
      );
    }

    // 3. Fool-proof: One review per product per user
    const existing = await this.reviewRepo.findOne({
      where: { userId, productId },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this product.');
    }

    // 4. Create review
    const review = this.reviewRepo.create({
      userId,
      productId,
      rating: dto.rating,
      title: dto.title ?? null,
      body: dto.body ?? null,
      isVerifiedPurchase: true,
      isApproved: true, // Auto-approve — change to false if manual moderation is needed
    });

    const saved = await this.reviewRepo.save(review);

    // 5. Recalculate product stats
    await this.recalculateProductStats(productId);

    return this.reviewRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    }) as Promise<ProductReview>;
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async updateReview(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<ProductReview> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
      relations: ['user'],
    });
    if (!review) throw new NotFoundException('Review not found');

    // Fool-proof: ownership check
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only edit your own reviews.');
    }

    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.title !== undefined) review.title = dto.title;
    if (dto.body !== undefined) review.body = dto.body;

    const saved = await this.reviewRepo.save(review);
    await this.recalculateProductStats(review.productId);
    return saved;
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async deleteReview(userId: string, reviewId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    // Fool-proof: ownership check
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews.');
    }

    const productId = review.productId;
    await this.reviewRepo.softDelete(reviewId);
    await this.recalculateProductStats(productId);
  }

  // ─── Get Product Reviews (public) ────────────────────────────────────────────

  async getProductReviews(
    productId: string,
    page = 1,
    limit = 10,
  ) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const offset = (page - 1) * limit;

    const [items, total] = await this.reviewRepo.findAndCount({
      where: { productId, isApproved: true },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    return {
      data: items.map(this.toPublicDto),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
      stats: {
        averageRating: product.averageRating,
        reviewCount: product.reviewCount,
      },
    };
  }

  // ─── Get My Review for a product ─────────────────────────────────────────────

  async getMyReview(userId: string, productId: string): Promise<ProductReview | null> {
    return this.reviewRepo.findOne({
      where: { userId, productId },
      relations: ['user'],
    });
  }

  // ─── Admin: Approve / Reply ───────────────────────────────────────────────────

  async adminUpdateReview(reviewId: string, dto: AdminReplyDto): Promise<ProductReview> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId }, relations: ['user'] });
    if (!review) throw new NotFoundException('Review not found');

    if (dto.approved !== undefined) review.isApproved = dto.approved;
    if (dto.adminReply !== undefined) {
      review.adminReply = dto.adminReply;
      review.adminRepliedAt = new Date();
    }

    const saved = await this.reviewRepo.save(review);

    // Recalculate product stats since approval status changed
    await this.recalculateProductStats(review.productId);

    return saved;
  }

  // ─── Get all reviews for admin ────────────────────────────────────────────────

  async adminGetAllReviews(page = 1, limit = 20, pendingOnly = false) {
    const offset = (page - 1) * limit;

    const where = pendingOnly ? { isApproved: false } : {};

    const [items, total] = await this.reviewRepo.findAndCount({
      where,
      relations: ['user', 'product'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Recalculates and persists averageRating and reviewCount on the Product.
   * Called after every create / update / delete so the product always shows live stats.
   */
  private async recalculateProductStats(productId: string): Promise<void> {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.product_id = :productId', { productId })
      .andWhere('r.is_approved = true')
      .andWhere('r.deleted_at IS NULL')
      .getRawOne();

    const avg = result?.avg ? parseFloat(parseFloat(result.avg).toFixed(2)) : 0;
    const count = result?.count ? parseInt(result.count, 10) : 0;

    await this.productRepo.update(productId, {
      averageRating: avg,
      reviewCount: count,
    });
  }

  /**
   * Strip private fields before returning to public callers.
   */
  private toPublicDto(review: ProductReview) {
    return {
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      isVerifiedPurchase: review.isVerifiedPurchase,
      helpfulCount: review.helpfulCount,
      adminReply: review.adminReply,
      adminRepliedAt: review.adminRepliedAt,
      createdAt: review.createdAt,
      user: review.user
        ? {
            firstName: review.user.firstName,
            avatarUrl: review.user.avatarUrl,
          }
        : null,
    };
  }
}
