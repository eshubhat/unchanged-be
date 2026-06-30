import {
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsArray,
  IsIn,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductSize } from '../../../common/enums';

export class ProductFilterDto {
  // ─── Pagination ─────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ default: 1, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // ─── Search ─────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Full-text search across name, description, tags' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  // ─── Filters ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collectionId?: string;

  @ApiPropertyOptional({ description: 'Minimum selling price in INR' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum selling price in INR' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Filter by featured products' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Filter by tags (comma-separated)', example: 'summer,casual' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((t: string) => t.trim()) : value,
  )
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filter by sizes (comma-separated)',
    example: 'S,M,L',
    enum: ProductSize,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : value,
  )
  @IsArray()
  @IsEnum(ProductSize, { each: true })
  sizes?: ProductSize[];

  @ApiPropertyOptional({ description: 'Filter by colors (comma-separated)', example: 'Black,White' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((c: string) => c.trim()) : value,
  )
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({ description: 'Show only in-stock products' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ description: 'Admin only — include inactive products' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;

  // ─── Sorting ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['price_asc', 'price_desc', 'newest', 'oldest', 'popular', 'rating', 'name_asc', 'name_desc', 'discount'],
    default: 'newest',
  })
  @IsOptional()
  @IsIn(['price_asc', 'price_desc', 'newest', 'oldest', 'popular', 'rating', 'name_asc', 'name_desc', 'discount'])
  sortBy?: string = 'newest';
}
