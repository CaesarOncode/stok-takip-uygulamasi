const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// Stok hareketlerini getir
router.get('/movements', async (req, res) => {
  try {
    const { product, type, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    let query = {};
    
    // Ürün filtresi
    if (product) {
      query.product = product;
    }
    
    // Hareket tipi filtresi
    if (type) {
      query.type = type;
    }
    
    // Tarih filtresi
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const movements = await StockMovement.find(query)
      .populate('product')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StockMovement.countDocuments(query);
    
    res.json({
      movements,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Stok hareketleri getirilirken hata oluştu', error: error.message });
  }
});

// Ürün stok hareketlerini getir
router.get('/movements/:productId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const movements = await StockMovement.find({ product: req.params.productId })
      .populate('product')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StockMovement.countDocuments({ product: req.params.productId });
    
    res.json({
      movements,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Ürün stok hareketleri getirilirken hata oluştu', error: error.message });
  }
});

// Stok girişi
router.post('/in', async (req, res) => {
  try {
    const { productId, quantity, unitPrice, supplier, invoiceNumber, reason, user = 'Sistem' } = req.body;
    
    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Geçerli ürün ve miktar gereklidir' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Ürün bulunamadı' });
    }

    const previousStock = product.currentStock;
    const newStock = previousStock + quantity;

    // Stok hareketi oluştur
    const stockMovement = new StockMovement({
      product: productId,
      type: 'giriş',
      quantity,
      previousStock,
      newStock,
      unitPrice: unitPrice || product.unitPrice || 0,
      supplier,
      invoiceNumber,
      reason: reason || 'Stok girişi',
      user
    });

    await stockMovement.save();

    // Ürün stokunu güncelle
    product.currentStock = newStock;
    if (unitPrice) {
      product.unitPrice = unitPrice;
    }
    await product.save();

    res.status(201).json({
      message: 'Stok girişi başarılı',
      movement: stockMovement,
      product: await Product.findById(productId).populate('category')
    });
  } catch (error) {
    res.status(400).json({ message: 'Stok girişi yapılırken hata oluştu', error: error.message });
  }
});

// Stok çıkışı
router.post('/out', async (req, res) => {
  try {
    const { productId, quantity, reason, user = 'Sistem' } = req.body;
    
    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Geçerli ürün ve miktar gereklidir' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Ürün bulunamadı' });
    }

    const previousStock = product.currentStock;
    
    if (previousStock < quantity) {
      return res.status(400).json({ 
        message: `Yetersiz stok! Mevcut stok: ${previousStock}, İstenen: ${quantity}` 
      });
    }

    const newStock = previousStock - quantity;

    // Stok hareketi oluştur
    const stockMovement = new StockMovement({
      product: productId,
      type: 'çıkış',
      quantity,
      previousStock,
      newStock,
      unitPrice: product.unitPrice || 0,
      reason: reason || 'Stok çıkışı',
      user
    });

    await stockMovement.save();

    // Ürün stokunu güncelle
    product.currentStock = newStock;
    await product.save();

    res.status(201).json({
      message: 'Stok çıkışı başarılı',
      movement: stockMovement,
      product: await Product.findById(productId).populate('category')
    });
  } catch (error) {
    res.status(400).json({ message: 'Stok çıkışı yapılırken hata oluştu', error: error.message });
  }
});

// Stok düzeltmesi
router.post('/adjust', async (req, res) => {
  try {
    const { productId, newStock, reason, user = 'Sistem' } = req.body;
    
    if (!productId || newStock < 0) {
      return res.status(400).json({ message: 'Geçerli ürün ve stok miktarı gereklidir' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Ürün bulunamadı' });
    }

    const previousStock = product.currentStock;
    const difference = Math.abs(newStock - previousStock);

    if (previousStock === newStock) {
      return res.status(400).json({ message: 'Stok miktarı zaten aynı' });
    }

    // Stok hareketi oluştur
    const stockMovement = new StockMovement({
      product: productId,
      type: 'düzeltme',
      quantity: difference,
      previousStock,
      newStock,
      unitPrice: product.unitPrice || 0,
      reason: reason || 'Stok düzeltmesi',
      user
    });

    await stockMovement.save();

    // Ürün stokunu güncelle
    product.currentStock = newStock;
    await product.save();

    res.status(201).json({
      message: 'Stok düzeltmesi başarılı',
      movement: stockMovement,
      product: await Product.findById(productId).populate('category')
    });
  } catch (error) {
    res.status(400).json({ message: 'Stok düzeltmesi yapılırken hata oluştu', error: error.message });
  }
});

// Stok özeti
router.get('/summary', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });
    const outOfStock = await Product.countDocuments({ isActive: true, currentStock: 0 });
    const criticalStock = await Product.countDocuments({ 
      isActive: true,
      $expr: { $and: [{ $gt: ['$currentStock', 0] }, { $lte: ['$currentStock', '$minStock'] }] }
    });
    
    const totalValue = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$currentStock', '$unitPrice'] } } } }
    ]);

    const recentMovements = await StockMovement.find()
      .populate('product')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      totalProducts,
      outOfStock,
      criticalStock,
      totalValue: totalValue[0]?.total || 0,
      recentMovements
    });
  } catch (error) {
    res.status(500).json({ message: 'Stok özeti getirilirken hata oluştu', error: error.message });
  }
});

module.exports = router;