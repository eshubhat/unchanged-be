import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  // ─── List ───────────────────────────────────────────────────────────────────

  async findAllByUser(userId: string): Promise<Address[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    // If this is the first address, or explicitly set as default, handle flag
    const existingCount = await this.addressRepository.count({ where: { userId } });
    const shouldBeDefault = dto.isDefault === true || existingCount === 0;

    if (shouldBeDefault) {
      // Clear existing default
      await this.addressRepository.update({ userId, isDefault: true }, { isDefault: false });
    }

    const address = this.addressRepository.create({
      ...dto,
      userId,
      country: dto.country ?? 'India',
      isDefault: shouldBeDefault,
    });

    return this.addressRepository.save(address);
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(userId: string, addressId: string, dto: UpdateAddressDto): Promise<Address> {
    const address = await this.assertOwnership(userId, addressId);

    if (dto.isDefault === true) {
      await this.addressRepository.update({ userId, isDefault: true }, { isDefault: false });
    }

    Object.assign(address, dto);
    return this.addressRepository.save(address);
  }

  // ─── Set Default ────────────────────────────────────────────────────────────

  async setDefault(userId: string, addressId: string): Promise<Address> {
    const address = await this.assertOwnership(userId, addressId);

    // Clear old default
    await this.addressRepository.update({ userId, isDefault: true }, { isDefault: false });

    address.isDefault = true;
    return this.addressRepository.save(address);
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async remove(userId: string, addressId: string): Promise<void> {
    const address = await this.assertOwnership(userId, addressId);
    await this.addressRepository.remove(address);

    // If deleted address was default, promote the next oldest to default
    if (address.isDefault) {
      const next = await this.addressRepository.findOne({
        where: { userId },
        order: { createdAt: 'ASC' },
      });
      if (next) {
        next.isDefault = true;
        await this.addressRepository.save(next);
      }
    }
  }

  // ─── Internal helper for auth service (create during registration) ──────────

  async createForUser(
    userId: string,
    fullName: string,
    phone: string,
    addressData: {
      addressLine1: string;
      addressLine2?: string;
      landmark?: string;
      city: string;
      state: string;
      pincode: string;
      country?: string;
    },
  ): Promise<Address> {
    const address = this.addressRepository.create({
      userId,
      fullName,
      phone,
      addressLine1: addressData.addressLine1,
      addressLine2: addressData.addressLine2 ?? null,
      landmark: addressData.landmark ?? null,
      city: addressData.city,
      state: addressData.state,
      pincode: addressData.pincode,
      country: addressData.country ?? 'India',
      isDefault: true,
      label: 'Home',
    });
    return this.addressRepository.save(address);
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async assertOwnership(userId: string, addressId: string): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this address');
    }

    return address;
  }
}
