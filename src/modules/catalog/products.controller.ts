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
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, CreateVariantDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../../common/enums';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC PRODUCT CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Products')
@Controller({ path: 'products', version: '1' })
@UseInterceptors(ClassSerializerInterceptor)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * GET /api/v1/products
   * Full-featured product listing with search, filter, sort, and pagination.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'List products with filtering, search, sorting and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated product list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, description: 'Full-text search' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'sizes', required: false, description: 'Comma-separated: S,M,L' })
  @ApiQuery({ name: 'colors', required: false, description: 'Comma-separated: Black,White' })
  @ApiQuery({ name: 'tags', required: false, description: 'Comma-separated tags' })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['price_asc', 'price_desc', 'newest', 'popular', 'rating', 'name_asc', 'discount'],
  })
  async findAll(@Query() filter: ProductFilterDto) {
    // Prevent customers from seeing inactive products
    filter.includeInactive = false;
    return this.productsService.findAll(filter);
  }

  /**
   * GET /api/v1/products/featured
   */
  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  async findFeatured(@Query('limit') limit = 10) {
    return this.productsService.findFeatured(limit);
  }

  /**
   * GET /api/v1/products/:slug
   */
  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a single product by slug' })
  @ApiParam({ name: 'slug', example: 'classic-black-tee' })
  @ApiResponse({ status: 200, description: 'Product detail' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  /**
   * GET /api/v1/products/:id/related
   */
  @Public()
  @Get(':id/related')
  @ApiOperation({ summary: 'Get related products by category' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  async findRelated(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findRelated(id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN PRODUCT CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Admin — Products')
@ApiBearerAuth()
@Controller({ path: 'admin/products', version: '1' })
@Public()
@UseInterceptors(ClassSerializerInterceptor)
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * GET /api/v1/admin/products — admin view with inactive products
   */
  @Get()
  @ApiOperation({ summary: 'Admin: List all products including inactive' })
  async findAll(@Query() filter: ProductFilterDto) {
    return this.productsService.findAll(filter);
  }

  /**
   * GET /api/v1/admin/products/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Admin: Get product by ID' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findById(id);
  }

  /**
   * POST /api/v1/admin/products
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  @ApiResponse({ status: 409, description: 'SKU or slug already exists' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  /**
   * PATCH /api/v1/admin/products/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Admin: Update a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  /**
   * DELETE /api/v1/admin/products/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin: Soft-delete a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  // ─── Variant endpoints ─────────────────────────────────────────────────────

  /**
   * POST /api/v1/admin/products/:id/variants
   */
  @Post(':id/variants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: Add a variant to a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  async addVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.addVariant(productId, dto);
  }

  /**
   * PATCH /api/v1/admin/products/:id/variants/:variantId
   */
  @Patch(':id/variants/:variantId')
  @ApiOperation({ summary: 'Admin: Update a product variant' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'variantId', description: 'Variant UUID' })
  async updateVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: Partial<CreateVariantDto>,
  ) {
    return this.productsService.updateVariant(productId, variantId, dto);
  }

  /**
   * PATCH /api/v1/admin/products/:id/variants/:variantId/stock
   * Directly sets the inventory quantity for a variant.
   */
  @Patch(':id/variants/:variantId/stock')
  @ApiOperation({ summary: 'Admin: Set stock quantity for a variant' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'variantId', description: 'Variant UUID' })
  async setVariantStock(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() body: { quantity: number },
  ) {
    return this.productsService.updateVariantStock(productId, variantId, body.quantity);
  }

  // ─── Image endpoints ───────────────────────────────────────────────────────

  /**
   * POST /api/v1/admin/products/:id/images
   * Accepts JSON array of image objects (URLs from S3 pre-signed uploads).
   */
  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: Add images to a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  async addImages(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() body: { images: Array<{ url: string; altText?: string; isPrimary?: boolean; variantId?: string }> },
  ) {
    return this.productsService.addImages(productId, body.images);
  }

  /**
   * DELETE /api/v1/admin/products/:id/images/:imageId
   */
  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin: Remove a product image' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'imageId', description: 'Image UUID' })
  async removeImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.productsService.removeImage(productId, imageId);
  }
}
