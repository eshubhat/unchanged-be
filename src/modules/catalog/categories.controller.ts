import { Controller, Get, Post, Body, UseInterceptors, ClassSerializerInterceptor, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';
import slugify from 'slugify';
import { Category } from './entities/category.entity';

@ApiTags('Categories')
@Public()
@Controller({ path: 'categories', version: '1' })
@UseInterceptors(ClassSerializerInterceptor)
export class CategoriesController {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  /**
   * GET /api/v1/categories
   * Returns all active categories (id, name, slug).
   * Used by admin forms and public filtering dropdowns.
   */
  @Get()
  @ApiOperation({ summary: 'List all active categories' })
  @ApiResponse({ status: 200, description: 'Array of categories' })
  async findAll(): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
      select: ['id', 'name', 'slug', 'imageUrl', 'displayOrder'],
    });
  }

  /**
   * POST /api/v1/categories
   * Creates a new category.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async create(@Body() body: { name: string, description?: string }): Promise<Category> {
    if (!body.name || !body.name.trim()) {
      throw new BadRequestException('Category name is required');
    }

    let slug = slugify(body.name, { lower: true, strict: true, trim: true });
    
    // Ensure slug uniqueness
    const existing = await this.categoryRepo.findOne({ where: { slug } });
    if (existing) {
       slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const category = this.categoryRepo.create({
      name: body.name.trim(),
      slug,
      description: body.description ?? null,
      isActive: true,
    });

    return this.categoryRepo.save(category);
  }
}
