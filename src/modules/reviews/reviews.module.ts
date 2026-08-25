import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { ProductReview } from './entities/product-review.entity';
import { ProductReviewImage } from './entities/product-review-image.entity';

// Cross-module entities
import { Product } from '../catalog/entities/product.entity';
import { Order } from '../orders/entities/order.entity';

// Controllers & Service
import { ReviewsController, AdminReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductReview,
      ProductReviewImage,
      Product,
      Order,
    ]),
  ],
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
