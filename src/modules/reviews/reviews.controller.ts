import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, AdminReplyDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER REVIEWS CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * POST /api/v1/reviews/:productId
   * Create a review for a product the authenticated user has purchased and received.
   */
  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a review for a delivered product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({ status: 403, description: 'Not a verified purchaser' })
  @ApiResponse({ status: 409, description: 'Review already submitted' })
  async create(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(userId, productId, dto);
  }

  /**
   * PATCH /api/v1/reviews/:reviewId
   * Edit the authenticated user's own review.
   */
  @Patch(':reviewId')
  @ApiOperation({ summary: 'Edit your own review' })
  @ApiParam({ name: 'reviewId', description: 'Review UUID' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(userId, reviewId, dto);
  }

  /**
   * DELETE /api/v1/reviews/:reviewId
   * Delete the authenticated user's own review.
   */
  @Delete(':reviewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete your own review' })
  @ApiParam({ name: 'reviewId', description: 'Review UUID' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
  ) {
    return this.reviewsService.deleteReview(userId, reviewId);
  }

  /**
   * GET /api/v1/reviews/my/:productId
   * Get the authenticated user's own review for a specific product (if it exists).
   */
  @Get('my/:productId')
  @ApiOperation({ summary: "Get my review for a product" })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  async getMyReview(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.reviewsService.getMyReview(userId, productId);
  }

  /**
   * GET /api/v1/reviews/product/:productId
   * Public endpoint — paginated approved reviews for a product.
   * NOTE: Declared before generic :reviewId routes so "product" isn't misread as a UUID.
   */
  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Get public reviews for a product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getProductReviews(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getProductReviews(productId, page, Math.min(limit, 50));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN REVIEWS CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Admin — Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'admin/reviews', version: '1' })
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * GET /api/v1/admin/reviews
   * List all reviews (optionally filter pending/unapproved).
   */
  @Get()
  @ApiOperation({ summary: 'Admin: List all reviews' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'pendingOnly', required: false, type: Boolean, description: 'Filter only unapproved reviews' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('pendingOnly', new DefaultValuePipe(false), ParseBoolPipe) pendingOnly: boolean,
  ) {
    return this.reviewsService.adminGetAllReviews(page, limit, pendingOnly);
  }

  /**
   * PATCH /api/v1/admin/reviews/:reviewId/moderate
   * Approve/reject a review and optionally add an admin reply.
   */
  @Patch(':reviewId/moderate')
  @ApiOperation({ summary: 'Admin: Approve/reject a review and optionally add an admin reply' })
  @ApiParam({ name: 'reviewId', description: 'Review UUID' })
  async moderate(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: AdminReplyDto,
  ) {
    return this.reviewsService.adminUpdateReview(reviewId, dto);
  }
}
