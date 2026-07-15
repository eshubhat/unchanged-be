import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Addresses')
@ApiBearerAuth()
@Controller({ path: 'address', version: '1' })
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  // ─── List ────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get all saved addresses for current user' })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  async findAll(@CurrentUser('id') userId: string) {
    const addresses = await this.addressService.findAllByUser(userId);
    return { addresses };
  }

  // ─── Create ──────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a new address' })
  @ApiResponse({ status: 201, description: 'Address created' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    const address = await this.addressService.create(userId, dto);
    return { address };
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing address' })
  @ApiResponse({ status: 200, description: 'Address updated' })
  @ApiResponse({ status: 403, description: 'Not your address' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const address = await this.addressService.update(userId, addressId, dto);
    return { address };
  }

  // ─── Set Default ─────────────────────────────────────────────────────────

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set an address as the default shipping address' })
  @ApiResponse({ status: 200, description: 'Default address updated' })
  async setDefault(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
  ) {
    const address = await this.addressService.setDefault(userId, addressId);
    return { address };
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved address' })
  @ApiResponse({ status: 204, description: 'Address deleted' })
  @ApiResponse({ status: 403, description: 'Not your address' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
  ) {
    await this.addressService.remove(userId, addressId);
  }
}
