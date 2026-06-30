import {Controller, Get, Param} from '@nestjs/common'

@Controller('clothes')
export class ClothesController {
    @Get()
    getClothes(): string {
        return 'This action returns all clothes';
    }
    @Get(':id')
    getClothesById(@Param('id') id: string): string {
        return `This action returns clothes with ID: ${id}`;
    }
}