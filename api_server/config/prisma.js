// ============================================================
// Prisma Client Singleton — Connected to Supabase PostgreSQL
// ============================================================

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Test database connection on startup
 */
async function testConnection() {
  try {
    await prisma.$connect();
    // Test a lightweight query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL (Supabase) connected successfully via Prisma');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL (Supabase) connection failed:', error.message);
    return false;
  }
}

module.exports = { prisma, testConnection };
