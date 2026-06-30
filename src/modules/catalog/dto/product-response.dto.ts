import { Expose, Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VariantResponseDto {
  @Expose() id: string;
  @Expose() sku: string;
  @Expose() size: string | null;
  @Expose() color: string | null;
  @Expose() colorHex: string | null;
  @Expose() priceOverride: number | null;
  @Expose() isActive: boolean;

  @Expose()
  @Transform(({ obj }) => ({
    quantity: obj.inventory?.quantity ?? 0,
    reserved: obj.inventory?.reservedQuantity ?? 0,
    available: (obj.inventory?.quantity ?? 0) - (obj.inventory?.reservedQuantity ?? 0),
    isLowStock: (obj.inventory?.quantity ?? 0) - (obj.inventory?.reservedQuantity ?? 0) <= (obj.inventory?.lowStockThreshold ?? 5),
  }))
  stock: {
    quantity: number;
    reserved: number;
    available: number;
    isLowStock: boolean;
  };
}

export class ProductImageResponseDto {
  @Expose() id: string;
  @Expose() url: string;
  @Expose() altText: string | null;
  @Expose() isPrimary: boolean;
  @Expose() displayOrder: number;
  @Expose() variantId: string | null;
}

export class ProductAttributeResponseDto {
  @Expose() id: string;
  @Expose() attributeName: string;
  @Expose() attributeValue: string;
  @Expose() displayOrder: number;
}

export class CategoryBriefDto {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() slug: string;
}

export class BrandBriefDto {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() slug: string;
  @Expose() logoUrl: string | null;
}

export class ProductResponseDto {
  @Expose() id: string;
  @Expose() sku: string;
  @Expose() name: string;
  @Expose() slug: string;
  @Expose() description: string | null;
  @Expose() shortDescription: string | null;
  @Expose() basePrice: number;
  @Expose() sellingPrice: number;
  @Expose() discountPercent: number;
  @Expose() isFeatured: boolean;
  @Expose() isActive: boolean;
  @Expose() tags: string[];
  @Expose() metaTitle: string | null;
  @Expose() metaDescription: string | null;
  @Expose() averageRating: number;
  @Expose() reviewCount: number;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  @Expose()
  @Type(() => CategoryBriefDto)
  category: CategoryBriefDto;

  @Expose()
  @Type(() => CategoryBriefDto)
  subcategory: CategoryBriefDto | null;

  @Expose()
  @Type(() => BrandBriefDto)
  brand: BrandBriefDto | null;

  @Expose()
  @Type(() => VariantResponseDto)
  variants: VariantResponseDto[];

  @Expose()
  @Type(() => ProductImageResponseDto)
  images: ProductImageResponseDto[];

  @Expose()
  @Type(() => ProductAttributeResponseDto)
  attributes: ProductAttributeResponseDto[];

  /** Computed: primary image URL for quick access */
  @Expose()
  @Transform(({ obj }) =>
    obj.images?.find((i: any) => i.isPrimary)?.url ?? obj.images?.[0]?.url ?? null,
  )
  primaryImageUrl: string | null;

  /** Computed: available colors across variants */
  @Expose()
  @Transform(({ obj }) =>
    [...new Set(obj.variants?.filter((v: any) => v.color).map((v: any) => v.color))],
  )
  availableColors: string[];

  /** Computed: available sizes across variants */
  @Expose()
  @Transform(({ obj }) =>
    [...new Set(obj.variants?.filter((v: any) => v.size).map((v: any) => v.size))],
  )
  availableSizes: string[];

  /** Computed: true if any variant has available stock */
  @Expose()
  @Transform(({ obj }) =>
    obj.variants?.some(
      (v: any) =>
        v.isActive &&
        ((v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0)) > 0,
    ) ?? false,
  )
  inStock: boolean;
}

export class PaginatedProductsDto {
  data: ProductResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
