// ============================================================
// Database Seeding Script for Prisma / Supabase
// ============================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminCount = await prisma.admin.count();
  if (adminCount === 0) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await prisma.admin.create({
      data: {
        email: 'admin@luxchain.com',
        password: hashedPassword,
        wallet_address: '0x0000000000000000000000000000000000000000',
      },
    });

    console.log('👤 Default admin created:');
    console.log(`   ID:       ${admin.id_admin}`);
    console.log(`   Email:    ${admin.email}`);
    console.log('   Password: admin123');
  } else {
    console.log(`ℹ️  Admin already exists (${adminCount} found), skipping seed.`);
  }

  // Seed initial sample category & subcategory if empty
  const categoryCount = await prisma.kategori.count();
  if (categoryCount === 0) {
    const tas = await prisma.kategori.create({
      data: {
        nama_kategori: 'Tas',
        sub_kategori: {
          create: [
            { nama_sub_kategori: 'Handbag' },
            { nama_sub_kategori: 'Shoulder Bag' },
            { nama_sub_kategori: 'Backpack' },
          ],
        },
      },
    });

    const pakaian = await prisma.kategori.create({
      data: {
        nama_kategori: 'Pakaian',
        sub_kategori: {
          create: [
            { nama_sub_kategori: 'Outerwear' },
            { nama_sub_kategori: 'Dress' },
            { nama_sub_kategori: 'Shirt' },
          ],
        },
      },
    });

    console.log('📦 Sample categories & subcategories seeded.');
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
