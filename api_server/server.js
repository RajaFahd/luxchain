// ============================================================
//
//  ╔══════════════════════════════════════════════════════════╗
//  ║               LUXCHAIN API SERVER                        ║
//  ║     Node.js + Express.js v5 — REST API Backend           ║
//  ║                                                          ║
//  ║  Hybrid Blockchain Luxury Fashion Verification Platform  ║
//  ╚══════════════════════════════════════════════════════════╝
//
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { testConnection } = require('./config/database');
const { initBlockchain } = require('./config/blockchain');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const itemRoutes = require('./routes/items');
const ownershipRoutes = require('./routes/ownership');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const systemLogRoutes = require('./routes/systemLogs');
const customerRoutes = require('./routes/customers');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────
//  Middleware
// ─────────────────────────────────────────────────────────

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
const morgan = require('morgan');
app.use(morgan('dev'));

// Static files (QR codes, uploads)
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────────────────
//  Routes
// ─────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🟢 Luxchain API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/ownership', ownershipRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/system-logs', systemLogRoutes);
app.use('/api/customers', customerRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use(errorHandler);

// ─────────────────────────────────────────────────────────
//  Server Startup
// ─────────────────────────────────────────────────────────

async function startServer() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║               LUXCHAIN API SERVER                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // 1. Test database connection
  const dbConnected = await testConnection();

  // 2. Initialize blockchain connection
  const bcConnected = initBlockchain();

  console.log('');

  // 3. Start Express server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    console.log('');
    console.log('📋 Available endpoints:');
    console.log('   GET  /api/health                — Health check');
    console.log('   POST /api/auth/login             — Admin login');
    console.log('   POST /api/auth/register          — Admin register');
    console.log('   GET  /api/auth/me                — Current admin');
    console.log('   GET  /api/products               — List products');
    console.log('   POST /api/products               — Create product + auto-mint ⛓️');
    console.log('   GET  /api/products/:id            — Product detail');
    console.log('   POST /api/products/:id/mint       — ⛓️  Retry/add items + mint');
    console.log('   GET  /api/items/:uuid             — Get item by UUID');
    console.log('   POST /api/items/:uuid/verify      — ⛓️  Verify product');
    console.log('   POST /api/ownership/claim         — Claim ownership');
    console.log('   POST /api/ownership/transfer      — Transfer ownership');
    console.log('   GET  /api/ownership/:wallet       — Wallet ownership');
    console.log('   GET  /api/transactions            — Transaction list');
    console.log('   GET  /api/categories              — Categories list');
    console.log('   GET  /api/system-logs              — System activity logs');
    console.log('');
    console.log('─'.repeat(58));
    console.log(`   Database: ${dbConnected ? '🟢 Connected' : '🔴 Disconnected'}`);
    console.log(`   Blockchain: ${bcConnected ? '🟢 Connected' : '🟡 Offline mode'}`);
    console.log('─'.repeat(58));
    console.log('');
  });
}

startServer();

module.exports = app;
