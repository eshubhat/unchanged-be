import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { Category } from './entities/category.entity';
import { SubCategory } from './entities/subcategory.entity';
import { Brand } from './entities/brand.entity';
import { Collection } from './entities/collection.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';

// Controllers
import { ProductsController, AdminProductsController } from './products.controller';
import { CategoriesController } from './categories.controller';

// Services & Repositories
import { ProductsService } from './products.service';
import { ProductsRepository } from './repositories/products.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductVariant,
      ProductImage,
      ProductAttribute,
      Category,
      SubCategory,
      Brand,
      Collection,
      Inventory,
      Warehouse,
    ]),
  ],
  controllers: [
    ProductsController,
    AdminProductsController,
    CategoriesController,
  ],
  providers: [
    ProductsService,
    ProductsRepository,
  ],
  exports: [
    ProductsService,
    ProductsRepository,
  ],
})
export class CatalogModule {}
