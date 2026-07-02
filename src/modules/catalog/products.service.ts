import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import slugify from 'slugify';
import { ProductsRepository } from './repositories/products.repository';
import { CreateProductDto, CreateVariantDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { PaginatedProductsDto } from './dto/product-response.dto';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Collection } from './entities/collection.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly dataSource: DataSource,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(ProductAttribute)
    private readonly attributeRepo: Repository<ProductAttribute>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    private readonly uploadsService: UploadsService,
  ) {}

  // ─── Create ──────────────────────────────────────────────────────────────────

  async create(dto: CreateProductDto): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Validate category exists
      const category = await manager.findOne(Category, {
        where: { id: dto.categoryId, isActive: true },
      });
      if (!category) {
        throw new NotFoundException(`Category '${dto.categoryId}' not found`);
      }

      // 2. Validate brand if provided
      if (dto.brandId) {
        const brand = await manager.findOne(Brand, {
          where: { id: dto.brandId },
        });
        if (!brand) {
          throw new NotFoundException(`Brand '${dto.brandId}' not found`);
        }
      }

      // 3. Generate unique slug
      const slug = await this.generateUniqueSlug(dto.slug ?? dto.name);

      // 4. Auto-calculate discount percent
      const discountPercent =
        dto.basePrice > 0
          ? Math.round(((dto.basePrice - dto.sellingPrice) / dto.basePrice) * 100 * 100) / 100
          : 0;

      // 5. Generate SKU from name + timestamp if not in first variant
      const sku = await this.generateUniqueSku(dto.name);

      // 6. Resolve collections
      let collections: Collection[] = [];
      if (dto.collectionIds?.length) {
        collections = await manager.findByIds(Collection, dto.collectionIds);
      }

      // 7. Build product entity
      const product = manager.create(Product, {
        sku,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        shortDescription: dto.shortDescription ?? null,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId ?? null,
        brandId: dto.brandId ?? null,
        basePrice: dto.basePrice,
        sellingPrice: dto.sellingPrice,
        discountPercent,
        isFeatured: dto.isFeatured ?? false,
        isLimitedStock: dto.isLimitedStock ?? false,
        isActive: dto.isActive ?? true,
        tags: dto.tags ?? [],
        metaTitle: dto.metaTitle ?? null,
        metaDescription: dto.metaDescription ?? null,
        collections,
      });

      const savedProduct = await manager.save(Product, product);

      // 8. Create variants
      if (dto.variants?.length) {
        await this.createVariantsInTransaction(manager, savedProduct.id, dto.variants);
      }

      // 9. Create attributes
      if (dto.attributes?.length) {
        const attrs = dto.attributes.map((a, index) =>
          manager.create(ProductAttribute, {
            productId: savedProduct.id,
            attributeName: a.attributeName,
            attributeValue: a.attributeValue,
            displayOrder: a.displayOrder ?? index,
          }),
        );
        await manager.save(ProductAttribute, attrs);
      }

      // 10. Create images
      if (dto.images?.length) {
        const images = dto.images.map((img, index) =>
          manager.create(ProductImage, {
            productId: savedProduct.id,
            url: img.url,
            altText: img.altText ?? null,
            isPrimary: img.isPrimary ?? index === 0,
            displayOrder: img.displayOrder ?? index,
            variantId: img.variantId ?? null,
          }),
        );
        await manager.save(ProductImage, images);
      }

      // Return the full product using the transaction manager so it sees the uncommitted inserts
      return (await manager.findOne(Product, {
        where: { id: savedProduct.id },
        relations: ['category', 'subcategory', 'brand', 'images', 'attributes', 'variants', 'variants.inventory'],
      }))!;
    });
  }

  // ─── List / Search ───────────────────────────────────────────────────────────

  async findAll(filter: ProductFilterDto): Promise<PaginatedProductsDto> {
    return this.productsRepository.findWithFilters(filter);
  }

  // ─── Find One ────────────────────────────────────────────────────────────────

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productsRepository.findBySlug(slug);

    if (!product) {
      throw new NotFoundException(`Product '${slug}' not found`);
    }

    return product;
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return product;
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id },
        relations: ['collections'],
      });

      if (!product) {
        throw new NotFoundException(`Product '${id}' not found`);
      }

      // Slug uniqueness check on update
      if (dto.slug && dto.slug !== product.slug) {
        const slugExists = await this.productsRepository.existsBySlug(dto.slug, id);
        if (slugExists) {
          throw new ConflictException(`Slug '${dto.slug}' is already taken`);
        }
      }

      // Recalculate discount if pricing changed
      const basePrice = dto.basePrice ?? product.basePrice;
      const sellingPrice = dto.sellingPrice ?? product.sellingPrice;
      const discountPercent =
        basePrice > 0
          ? Math.round(((basePrice - sellingPrice) / basePrice) * 100 * 100) / 100
          : 0;

      // Update collections if provided
      if (dto.collectionIds !== undefined) {
        const collections =
          dto.collectionIds.length > 0
            ? await manager.findByIds(Collection, dto.collectionIds)
            : [];
        product.collections = collections;
      }

      Object.assign(product, {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.subcategoryId !== undefined && { subcategoryId: dto.subcategoryId }),
        ...(dto.brandId !== undefined && { brandId: dto.brandId }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.sellingPrice !== undefined && { sellingPrice: dto.sellingPrice }),
        discountPercent,
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.isLimitedStock !== undefined && { isLimitedStock: dto.isLimitedStock }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
      });

      await manager.save(Product, product);

      return (await manager.findOne(Product, {
        where: { id },
        relations: ['category', 'subcategory', 'brand', 'images', 'attributes', 'variants', 'variants.inventory'],
      }))!;
    });
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async remove(id: string): Promise<void> {
    const product = await this.productsRepository.findById(id, true);

    if (!product) {
      throw new NotFoundException(`Product '${id}' not found`);
    }

    // Delete physical image files
    if (product.images?.length) {
      for (const img of product.images) {
        if (!img.url) continue;
        try {
          // Extract the storage key from the public URL.
          // e.g. http://localhost:3000/api/v1/uploads/files/products/123.jpg -> products/123.jpg
          const parts = img.url.split('/uploads/files/');
          if (parts.length === 2) {
            const key = parts[1];
            await this.uploadsService.deleteFile(key);
          }
        } catch (err) {
          // Log error but continue deleting the product
          console.error(`Failed to delete image file for product ${id}:`, err);
        }
      }
    }

    // Hard delete the product (cascades will delete ProductImage, ProductVariant, etc from DB)
    await this.productsRepository.repo.delete(id);
  }

  // ─── Variant Management ───────────────────────────────────────────────────────

  async addVariant(productId: string, dto: CreateVariantDto): Promise<ProductVariant> {
    await this.findById(productId); // ensures product exists

    const existingVariant = await this.variantRepo.findOne({
      where: { sku: dto.sku },
    });
    if (existingVariant) {
      throw new ConflictException(`SKU '${dto.sku}' is already in use`);
    }

    return this.dataSource.transaction(async (manager) => {
      const variant = manager.create(ProductVariant, {
        productId,
        sku: dto.sku,
        size: dto.size ?? null,
        color: dto.color ?? null,
        colorHex: dto.colorHex ?? null,
        priceOverride: dto.priceOverride ?? null,
        isActive: dto.isActive ?? true,
      });

      const savedVariant = await manager.save(ProductVariant, variant);

      // Always create an inventory record for each variant
      const inventory = manager.create(Inventory, {
        variantId: savedVariant.id,
        warehouseId: await this.getDefaultWarehouseId(),
        quantity: dto.stockQuantity ?? 0,
        reservedQuantity: 0,
        lowStockThreshold: 5,
      });

      await manager.save(Inventory, inventory);

      return savedVariant;
    });
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: Partial<CreateVariantDto>,
  ): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException(`Variant '${variantId}' not found`);
    }

    if (dto.sku && dto.sku !== variant.sku) {
      const skuExists = await this.variantRepo.findOne({
        where: { sku: dto.sku },
      });
      if (skuExists) {
        throw new ConflictException(`SKU '${dto.sku}' is already in use`);
      }
    }

    const { stockQuantity, ...variantFields } = dto;
    Object.assign(variant, variantFields);
    return this.variantRepo.save(variant);
  }

  // ─── Stock Management ────────────────────────────────────────────────────────

  async updateVariantStock(
    productId: string,
    variantId: string,
    quantity: number,
  ): Promise<Inventory> {
    // Ensure the variant belongs to this product
    const variant = await this.variantRepo.findOne({
      where: { id: variantId, productId },
    });
    if (!variant) {
      throw new NotFoundException(`Variant '${variantId}' not found on product '${productId}'`);
    }

    const inventory = await this.inventoryRepo.findOne({
      where: { variantId },
    });

    if (!inventory) {
      // Create a new inventory record if missing (edge case)
      const warehouseId = await this.getDefaultWarehouseId();
      const newInventory = this.inventoryRepo.create({
        variantId,
        warehouseId,
        quantity,
        reservedQuantity: 0,
        lowStockThreshold: 5,
      });
      return this.inventoryRepo.save(newInventory);
    }

    inventory.quantity = quantity;
    return this.inventoryRepo.save(inventory);
  }

  // ─── Image Management ────────────────────────────────────────────────────────

  async addImages(
    productId: string,
    images: Array<{ url: string; altText?: string; isPrimary?: boolean; variantId?: string }>,
  ): Promise<ProductImage[]> {
    await this.findById(productId);

    const currentImages = await this.imageRepo.find({ where: { productId } });
    const nextOrder = currentImages.length;

    const newImages = images.map((img, index) =>
      this.imageRepo.create({
        productId,
        url: img.url,
        altText: img.altText ?? null,
        isPrimary: img.isPrimary ?? false,
        displayOrder: nextOrder + index,
        variantId: img.variantId ?? null,
      }),
    );

    return this.imageRepo.save(newImages);
  }

  async removeImage(productId: string, imageId: string): Promise<void> {
    const image = await this.imageRepo.findOne({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException(`Image '${imageId}' not found`);
    }

    await this.imageRepo.remove(image);
  }

  // ─── Additional Finders ───────────────────────────────────────────────────────

  async findFeatured(limit = 10): Promise<Product[]> {
    return this.productsRepository.findFeatured(limit);
  }

  async findRelated(productId: string): Promise<Product[]> {
    const product = await this.findById(productId);
    return this.productsRepository.findRelated(productId, product.categoryId);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private async generateUniqueSlug(base: string): Promise<string> {
    let slug = slugify(base, { lower: true, strict: true, trim: true });
    let suffix = 0;
    let candidate = slug;

    while (await this.productsRepository.existsBySlug(candidate)) {
      suffix++;
      candidate = `${slug}-${suffix}`;
    }

    return candidate;
  }

  private async generateUniqueSku(name: string): Promise<string> {
    const prefix = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4)
      .padEnd(4, 'X');
    const suffix = Date.now().toString(36).toUpperCase().slice(-6);
    return `${prefix}-${suffix}`;
  }

  private async getDefaultWarehouseId(): Promise<string> {
    // In production, this would be resolved from config or a warehouse service.
    // For now we query the first active warehouse.
    const result = await this.dataSource
      .createQueryRunner()
      .query(`SELECT id FROM warehouses WHERE is_active = true LIMIT 1`);

    if (!result?.length) {
      throw new BadRequestException(
        'No active warehouse found. Please configure at least one warehouse.',
      );
    }

    return result[0].id as string;
  }

  private async createVariantsInTransaction(
    manager: any,
    productId: string,
    variants: CreateVariantDto[],
  ): Promise<void> {
    const defaultWarehouseId = await this.getDefaultWarehouseId();

    for (const v of variants) {
      // Check SKU uniqueness
      const skuExists = await manager.findOne(ProductVariant, {
        where: { sku: v.sku },
      });
      if (skuExists) {
        throw new ConflictException(`SKU '${v.sku}' is already in use`);
      }

      const variant = manager.create(ProductVariant, {
        productId,
        sku: v.sku,
        size: v.size ?? null,
        color: v.color ?? null,
        colorHex: v.colorHex ?? null,
        priceOverride: v.priceOverride ?? null,
        isActive: v.isActive ?? true,
      });

      const savedVariant = await manager.save(ProductVariant, variant);

      const inventory = manager.create(Inventory, {
        variantId: savedVariant.id,
        warehouseId: defaultWarehouseId,
        quantity: v.stockQuantity ?? 0,
        reservedQuantity: 0,
        lowStockThreshold: 5,
      });

      await manager.save(Inventory, inventory);
    }
  }
}
