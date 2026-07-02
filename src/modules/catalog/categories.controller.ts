import { Controller, Get, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';
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
}
