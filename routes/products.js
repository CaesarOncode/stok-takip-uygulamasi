const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// Tüm ürünleri getir
router.get('/', async (req, res) => {
  try {
    const { category, search, stockStatus, page = 1, limit = 50 } = req.query;
    
    let query = { isActive: true };
    
    // Kategori filtresi
    if (category) {
      query.category = category;
    }
    
    // Arama filtresi
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .populate('category')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Stok durumu filtresi (virtual field olduğu için sonradan filtreleme)
    let filteredProducts = products;
    if (stockStatus) {
      filteredProducts = products.filter(product => {
        const status = product.stockStatus;
        return status === stockStatus;
      });
    }

    const total = await Product.countDocuments(query);
    
    res.json({
      products: filteredProducts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Ürünler getirilirken hata oluştu', error: error.message });
  }
});

// Ürün detayını getir
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) {
      return res.status(404).json({ message: 'Ürün bulunamadı' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Ürün getirilirken hata oluştu', error: error.message });
  }
});

// Yeni ürün oluştur
router.post('/', async (req, res) => {
  try {
    const productData = req.body;
    
    // Barcode kontrolü
    if (productData.barcode) {
      const existingProduct = await Product.findOne({ barcode: productData.barcode });
      if (existingProduct) {
        return res.status(400).json({ message: 'Bu barkod zaten mevcut' });
      }
    }

    const product = new Product(productData);
    const savedProduct = await product.save();
    
    // İlk stok girişi varsa stok hareketi oluştur
    if (savedProduct.currentStock > 0) {
      const stockMovement = new StockMovement({
        product: savedProduct._id,
        type: 'giriş',
        quantity: savedProduct.currentStock,
        previousStock: 0,
        newStock: savedProduct.currentStock,
        unitPrice: savedProduct.unitPrice || 0,
        reason: 'İlk stok girişi',
        user: 'Sistem'
      });
      await stockMovement.save();
    }

    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: 'Ürün oluşturulurken hata oluştu', error: error.message });
  }
});

// Ürün güncelle
router.put('/:id', async (req, res) => {
  try {
    const productData = req.body;
    
    // Barcode kontrolü (kendisi hariç)
    if (productData.barcode) {
      const existingProduct = await Product.findOne({ 
        barcode: productData.barcode, 
        _id: { $ne: req.params.id } 
      });
      if (existingProduct) {
        return res.status(400).json({ message: 'Bu barkod zaten mevcut' });
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...productData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('category');

    if (!product) {
      return res.status(404).json({ message: 'Ürün bulunamadı' });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: 'Ürün güncellenirken hata oluştu', error: error.message });
  }
});

// Ürün sil
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Ürün bulunamadı' });
    }

    res.json({ message: 'Ürün başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Ürün silinirken hata oluştu', error: error.message });
  }
});

// Kritik stok ürünlerini getir
router.get('/alerts/critical', async (req, res) => {
  try {
    const products = await Product.find({ 
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minStock'] }
    }).populate('category').sort({ currentStock: 1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Kritik stok ürünleri getirilirken hata oluştu', error: error.message });
  }
});

// Tükenen ürünleri getir
router.get('/alerts/out-of-stock', async (req, res) => {
  try {
    const products = await Product.find({ 
      isActive: true,
      currentStock: 0
    }).populate('category').sort({ name: 1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Tükenen ürünler getirilirken hata oluştu', error: error.message });
  }
});

module.exports = router;