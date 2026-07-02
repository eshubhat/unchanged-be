import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductFilterDto } from '../dto/product-filter.dto';
import { PaginatedProductsDto } from '../dto/product-response.dto';

@Injectable()
export class ProductsRepository {
  public readonly repo: Repository<Product>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(Product);
  }

  // ─── Core Finders ────────────────────────────────────────────────────────────

  async findBySlug(slug: string): Promise<Product | null> {
    return this.repo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.subcategory', 'subcategory')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.images', 'image')
      .leftJoinAndSelect('product.attributes', 'attribute')
      .leftJoinAndSelect('product.variants', 'variant')
      .leftJoinAndSelect('variant.inventory', 'inventory')
      .leftJoinAndSelect('product.collections', 'collection')
      .where('product.slug = :slug', { slug })
      .andWhere('product.isActive = true')
      .orderBy('image.displayOrder', 'ASC')
      .addOrderBy('attribute.displayOrder', 'ASC')
      .getOne();
  }

  async findById(id: string, includeDeleted = false): Promise<Product | null> {
    const qb = this.repo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.subcategory', 'subcategory')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.images', 'image')
      .leftJoinAndSelect('product.attributes', 'attribute')
      .leftJoinAndSelect('product.variants', 'variant')
      .leftJoinAndSelect('variant.inventory', 'inventory')
      .where('product.id = :id', { id });

    if (includeDeleted) {
      qb.withDeleted();
    }

    return qb.getOne();
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('product')
      .where('product.slug = :slug', { slug });

    if (excludeId) {
      qb.andWhere('product.id != :excludeId', { excludeId });
    }

    return qb.getExists();
  }

  async existsBySku(sku: string, excludeId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('product')
      .where('product.sku = :sku', { sku });

    if (excludeId) {
      qb.andWhere('product.id != :excludeId', { excludeId });
    }

    return qb.getExists();
  }

  // ─── Paginated List with Full Filtering ──────────────────────────────────────

  async findWithFilters(filter: ProductFilterDto): Promise<PaginatedProductsDto> {
    const { page = 1, limit = 20 } = filter;
    const offset = (page - 1) * limit;

    const qb = this.buildFilterQuery(filter);

    // Always get total count with a separate lightweight query
    const total = await this.buildFilterQuery(filter, true).getCount();

    // Main query with all joins for rich response
    const items = await qb
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.subcategory', 'subcategory')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.images', 'image')
      .leftJoinAndSelect('product.variants', 'variant', 'variant.isActive = true')
      .leftJoinAndSelect('variant.inventory', 'inventory')
      .leftJoinAndSelect('product.attributes', 'attribute')
      .skip(offset)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data: items as any,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  // ─── Query Builder ───────────────────────────────────────────────────────────

  private buildFilterQuery(
    filter: ProductFilterDto,
    countOnly = false,
  ): SelectQueryBuilder<Product> {
    const qb = this.repo.createQueryBuilder('product');

    // ── Visibility ──────────────────────────────────────────────────────────
    if (!filter.includeInactive) {
      qb.andWhere('product.isActive = true');
    }

    // ── Category / Brand / Collection ───────────────────────────────────────
    if (filter.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: filter.categoryId,
      });
    }

    if (filter.subcategoryId) {
      qb.andWhere('product.subcategoryId = :subcategoryId', {
        subcategoryId: filter.subcategoryId,
      });
    }

    if (filter.brandId) {
      qb.andWhere('product.brandId = :brandId', { brandId: filter.brandId });
    }

    if (filter.collectionId) {
      qb.innerJoin(
        'product.collections',
        'filterCollection',
        'filterCollection.id = :collectionId',
        { collectionId: filter.collectionId },
      );
    }

    // ── Price Range ─────────────────────────────────────────────────────────
    if (filter.minPrice !== undefined) {
      qb.andWhere('product.sellingPrice >= :minPrice', {
        minPrice: filter.minPrice,
      });
    }

    if (filter.maxPrice !== undefined) {
      qb.andWhere('product.sellingPrice <= :maxPrice', {
        maxPrice: filter.maxPrice,
      });
    }

    // ── Featured ────────────────────────────────────────────────────────────
    if (filter.isFeatured !== undefined) {
      qb.andWhere('product.isFeatured = :isFeatured', {
        isFeatured: filter.isFeatured,
      });
    }

    // ── Tags (PostgreSQL array overlap &&) ──────────────────────────────────
    if (filter.tags && filter.tags.length > 0) {
      qb.andWhere('product.tags && ARRAY[:...tags]::varchar[]', {
        tags: filter.tags,
      });
    }

    // ── Sizes & Colors (join on variants) ───────────────────────────────────
    if (
      (filter.sizes && filter.sizes.length > 0) ||
      (filter.colors && filter.colors.length > 0) ||
      filter.inStock
    ) {
      qb.innerJoin('product.variants', 'filterVariant', 'filterVariant.isActive = true');

      if (filter.sizes && filter.sizes.length > 0) {
        qb.andWhere('filterVariant.size IN (:...sizes)', {
          sizes: filter.sizes,
        });
      }

      if (filter.colors && filter.colors.length > 0) {
        qb.andWhere('filterVariant.color IN (:...colors)', {
          colors: filter.colors,
        });
      }

      if (filter.inStock) {
        qb.innerJoin(
          'filterVariant.inventory',
          'filterInventory',
          '(filterInventory.quantity - filterInventory.reservedQuantity) > 0',
        );
      }
    }

    // ── Full-Text Search ────────────────────────────────────────────────────
    if (filter.search) {
      const tsQuery = filter.search
        .trim()
        .split(/\s+/)
        .map((w) => `${w}:*`)
        .join(' & ');

      qb.andWhere(
        `to_tsvector('english', product.name || ' ' || COALESCE(product.short_description, '') || ' ' || COALESCE(array_to_string(product.tags, ' '), ''))
         @@ to_tsquery('english', :tsQuery)`,
        { tsQuery },
      ).addSelect(
        `ts_rank(
           to_tsvector('english', product.name || ' ' || COALESCE(product.short_description, '')),
           to_tsquery('english', :tsQuery)
         )`,
        'relevance_rank',
      );
    }

    // ── Sort ────────────────────────────────────────────────────────────────
    if (!countOnly) {
      this.applySorting(qb, filter.sortBy, !!filter.search);
    }

    // Prevent duplicate rows from joins
    qb.distinct(true);

    return qb;
  }

  private applySorting(
    qb: SelectQueryBuilder<Product>,
    sortBy = 'newest',
    hasSearch = false,
  ): void {
    if (hasSearch && sortBy === 'newest') {
      // When searching, rank by relevance first
      qb.orderBy('relevance_rank', 'DESC');
      qb.addOrderBy('product.createdAt', 'DESC');
      return;
    }

    switch (sortBy) {
      case 'price_asc':
        qb.orderBy('product.sellingPrice', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('product.sellingPrice', 'DESC');
        break;
      case 'newest':
        qb.orderBy('product.createdAt', 'DESC');
        break;
      case 'oldest':
        qb.orderBy('product.createdAt', 'ASC');
        break;
      case 'popular':
        qb.orderBy('product.reviewCount', 'DESC');
        break;
      case 'rating':
        qb.orderBy('product.averageRating', 'DESC');
        qb.addOrderBy('product.reviewCount', 'DESC');
        break;
      case 'name_asc':
        qb.orderBy('product.name', 'ASC');
        break;
      case 'name_desc':
        qb.orderBy('product.name', 'DESC');
        break;
      case 'discount':
        qb.orderBy('product.discountPercent', 'DESC');
        break;
      default:
        qb.orderBy('product.createdAt', 'DESC');
    }
  }

  // ─── Mutations ────────────────────────────────────────────────────────────────

  async save(product: Partial<Product>): Promise<Product> {
    return this.repo.save(product as Product);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repo.restore(id);
  }

  // ─── Admin / Analytics ───────────────────────────────────────────────────────

  async findFeatured(limit = 10): Promise<Product[]> {
    return this.repo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'image', 'image.isPrimary = true')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('product.isActive = true AND product.isFeatured = true')
      .orderBy('product.updatedAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async findRelated(productId: string, categoryId: string, limit = 8): Promise<Product[]> {
    return this.repo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'image', 'image.isPrimary = true')
      .where('product.categoryId = :categoryId', { categoryId })
      .andWhere('product.id != :productId', { productId })
      .andWhere('product.isActive = true')
      .orderBy('product.averageRating', 'DESC')
      .take(limit)
      .getMany();
  }

  async getRawRepo(): Promise<Repository<Product>> {
    return this.repo;
  }
}
