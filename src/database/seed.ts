import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source';
import { Product } from '../modules/catalog/entities/product.entity';
import { Category } from '../modules/catalog/entities/category.entity';
import { ProductImage } from '../modules/catalog/entities/product-image.entity';

const slugify = (str: string) => str.toLowerCase().replace(/\s+/g, '-');

async function seed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  console.log('Database connected.');

  // Create Category
  const categoryRepo = dataSource.getRepository(Category);
  let category = await categoryRepo.findOne({ where: { slug: 't-shirts' } });
  
  if (!category) {
    category = categoryRepo.create({
      name: 'T-Shirts',
      slug: 't-shirts',
      description: 'Oversized T-Shirts Collection',
    });
    await categoryRepo.save(category);
    console.log('Category created.');
  }

  const products = [
    {
      title: "The Vintage Oversized Tee",
      price: 799,
      imageFront: "/src/assets/tshirt-designs/Vintage-front.jpg",
      imageBack: "/src/assets/tshirt-designs/Vintage-back.jpg",
      isLimitedStock: true,
    },
    {
      title: "Ferarri Oversized Tee",
      price: 799,
      imageFront: "/src/assets/tshirt-designs/Ferarri-front.jpg",
      imageBack: "/src/assets/tshirt-designs/Ferarri-back.jpg",
      isLimitedStock: true,
    },
    {
      title: "Space Theme Oversized Tee",
      price: 799,
      imageFront: "/src/assets/tshirt-designs/Space-front.jpg",
      imageBack: "/src/assets/tshirt-designs/Space-back.jpg",
      isLimitedStock: true,
    },
    {
      title: "Monte Carlo Oversized Tee",
      price: 799,
      imageFront: "/src/assets/tshirt-designs/monte-carlo-front.jpg",
      imageBack: "/src/assets/tshirt-designs/monte-carlo-back.jpg",
      isLimitedStock: true,
    },
    {
      title: "Peanuts Oversized Tee",
      price: 799,
      imageFront: "/src/assets/tshirt-designs/peanuts_front.jpg",
      imageBack: "/src/assets/tshirt-designs/peanuts-back.jpg",
      isLimitedStock: true,
    },
  ];

  const productRepo = dataSource.getRepository(Product);
  const imageRepo = dataSource.getRepository(ProductImage);

  for (const [index, p] of products.entries()) {
    const slug = slugify(p.title);
    
    let product = await productRepo.findOne({ where: { slug } });
    if (!product) {
      product = productRepo.create({
        name: p.title,
        slug: slug,
        sku: `TEE-${1000 + index}`,
        basePrice: 1299,
        sellingPrice: p.price,
        categoryId: category.id,
        isFeatured: p.isLimitedStock,
        isActive: true,
      });
      await productRepo.save(product);

      // Create Images
      const imgFront = imageRepo.create({
        url: p.imageFront,
        isPrimary: true,
        displayOrder: 1,
        product: product,
      });
      const imgBack = imageRepo.create({
        url: p.imageBack,
        isPrimary: false,
        displayOrder: 2,
        product: product,
      });
      
      await imageRepo.save([imgFront, imgBack]);
      console.log(`Created product: ${p.title}`);
    }
  }

  console.log('Seeding complete.');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
