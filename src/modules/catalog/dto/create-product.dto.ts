import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductSize } from '../../../common/enums';

// ─── Nested DTOs ─────────────────────────────────────────────────────────────

export class CreateVariantDto {
  @ApiProperty({ example: 'TSS-BLK-M' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  sku: string;

  @ApiPropertyOptional({ example: 'M', enum: ProductSize })
  @IsOptional()
  @IsEnum(ProductSize)
  size?: ProductSize;

  @ApiPropertyOptional({ example: 'Midnight Black' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @ApiPropertyOptional({ example: '#0d0d0d' })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  colorHex?: string;

  @ApiPropertyOptional({ description: 'Override product price for this variant' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceOverride?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Initial stock quantity', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;
}

export class CreateProductAttributeDto {
  @ApiProperty({ example: 'Material' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  attributeName: string;

  @ApiProperty({ example: '100% Cotton' })
  @IsString()
  @IsNotEmpty()
  attributeValue: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://cdn.example.com/product.jpg' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ example: 'Front view' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Variant UUID this image belongs to' })
  @IsOptional()
  @IsUUID()
  variantId?: string;
}

// ─── Main DTO ─────────────────────────────────────────────────────────────────

export class CreateProductDto {
  @ApiProperty({ example: 'The Classic Black Tee' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'classic-black-tee',
    description: 'URL-friendly slug. Auto-generated from name if omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(350)
  @Transform(({ value }) => value?.toLowerCase().trim().replace(/\s+/g, '-'))
  slug?: string;

  @ApiPropertyOptional({ example: 'Full product description in HTML or Markdown.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Minimalist tee for everyday wear.' })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  shortDescription?: string;

  @ApiProperty({ description: 'Category UUID' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ description: 'Subcategory UUID' })
  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @ApiPropertyOptional({ description: 'Brand UUID' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiProperty({ example: 799, description: 'MRP / base price in INR' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice: number;

  @ApiProperty({ example: 599, description: 'Selling price in INR' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  sellingPrice: number;

  @ApiPropertyOptional({ example: ['black', 'tee', 'casual', 'summer'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  tags?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isLimitedStock?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // ─── SEO ─────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'Classic Black Tee | The Souled Store' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaTitle?: string;

  @ApiPropertyOptional({ example: 'Shop the Classic Black Tee by The Souled Store.' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  // ─── Relations ───────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Collection UUIDs to associate this product with' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  collectionIds?: string[];

  @ApiPropertyOptional({ type: [CreateVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];

  @ApiPropertyOptional({ type: [CreateProductAttributeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductAttributeDto)
  attributes?: CreateProductAttributeDto[];

  @ApiPropertyOptional({ type: [CreateProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];
}
