const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Category = require('../models/Category');

// Kategori bazlı stok raporu
router.get('/stock-by-category', async (req, res) => {
  try {
    const report = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$category',
          categoryName: { $first: '$categoryInfo.name' },
          categoryType: { $first: '$categoryInfo.type' },
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: { $sum: { $multiply: ['$currentStock', '$unitPrice'] } },
          outOfStock: {
            $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] }
          },
          criticalStock: {
            $sum: { $cond: [{ $lte: ['$currentStock', '$minStock'] }, 1, 0] }
          }
        }
      },
      { $sort: { categoryName: 1 } }
    ]);

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Kategori raporu oluşturulurken hata oluştu', error: error.message });
  }
});

// Stok hareket raporu
router.get('/stock-movements', async (req, res) => {
  try {
    const { startDate, endDate, type, category } = req.query;
    
    let matchQuery = {};
    
    // Tarih filtresi
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        matchQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchQuery.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Hareket tipi filtresi
    if (type) {
      matchQuery.type = type;
    }

    let pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' }
    ];

    // Kategori filtresi
    if (category) {
      pipeline.push({ $match: { 'categoryInfo._id': mongoose.Types.ObjectId(category) } });
    }

    pipeline.push(
      {
        $group: {
          _id: '$type',
          totalMovements: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalValue' },
          movements: {
            $push: {
              date: '$createdAt',
              product: '$productInfo.name',
              category: '$categoryInfo.name',
              quantity: '$quantity',
              unitPrice: '$unitPrice',
              totalValue: '$totalValue',
              reason: '$reason',
              user: '$user'
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    );

    const report = await StockMovement.aggregate(pipeline);
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Stok hareket raporu oluşturulurken hata oluştu', error: error.message });
  }
});

// En çok hareket eden ürünler
router.get('/most-active-products', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const report = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$product',
          totalMovements: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalValue' },
          inQuantity: {
            $sum: { $cond: [{ $eq: ['$type', 'giriş'] }, '$quantity', 0] }
          },
          outQuantity: {
            $sum: { $cond: [{ $eq: ['$type', 'çıkış'] }, '$quantity', 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          productName: '$productInfo.name',
          categoryName: '$categoryInfo.name',
          currentStock: '$productInfo.currentStock',
          totalMovements: 1,
          totalQuantity: 1,
          totalValue: 1,
          inQuantity: 1,
          outQuantity: 1
        }
      },
      { $sort: { totalMovements: -1 } },
      { $limit: 20 }
    ]);

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'En aktif ürünler raporu oluşturulurken hata oluştu', error: error.message });
  }
});

// Günlük stok özeti
router.get('/daily-summary', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const report = await StockMovement.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          totalMovements: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalValue' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          movements: {
            $push: {
              type: '$_id.type',
              totalMovements: '$totalMovements',
              totalQuantity: '$totalQuantity',
              totalValue: '$totalValue'
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Günlük özet raporu oluşturulurken hata oluştu', error: error.message });
  }
});

// Düşük stok uyarı raporu
router.get('/low-stock-alert', async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minStock'] }
    })
    .populate('category')
    .sort({ currentStock: 1 });

    const report = products.map(product => ({
      _id: product._id,
      name: product.name,
      category: product.category.name,
      currentStock: product.currentStock,
      minStock: product.minStock,
      unit: product.unit,
      stockStatus: product.stockStatus,
      shortage: product.minStock - product.currentStock,
      supplier: product.supplier
    }));

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Düşük stok raporu oluşturulurken hata oluştu', error: error.message });
  }
});

// Değer analizi raporu
router.get('/value-analysis', async (req, res) => {
  try {
    const totalValue = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$currentStock', '$unitPrice'] } },
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$currentStock' }
        }
      }
    ]);

    const categoryValues = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$category',
          categoryName: { $first: '$categoryInfo.name' },
          categoryType: { $first: '$categoryInfo.type' },
          totalValue: { $sum: { $multiply: ['$currentStock', '$unitPrice'] } },
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$currentStock' }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    const topValueProducts = await Product.find({ isActive: true })
      .populate('category')
      .sort({ $expr: { $multiply: ['$currentStock', '$unitPrice'] } })
      .limit(10);

    res.json({
      summary: totalValue[0] || { totalValue: 0, totalProducts: 0, totalStock: 0 },
      categoryValues,
      topValueProducts: topValueProducts.map(product => ({
        _id: product._id,
        name: product.name,
        category: product.category.name,
        currentStock: product.currentStock,
        unitPrice: product.unitPrice,
        totalValue: product.currentStock * product.unitPrice
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Değer analizi raporu oluşturulurken hata oluştu', error: error.message });
  }
});

module.exports = router;