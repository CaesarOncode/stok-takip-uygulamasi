const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const { requireAuth } = require('../middleware/auth');

// Tüm kategorileri getir (sadece kullanıcının restoranına ait)
router.get('/', requireAuth, async (req, res) => {
  try {
    const categories = await Category.find({ 
      restaurant: req.restaurant._id,
      isActive: true 
    }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Kategoriler getirilirken hata oluştu', error: error.message });
  }
});

// Kategori detayını getir (sadece kullanıcının restoranına ait)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      restaurant: req.restaurant._id
    });
    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Kategori getirilirken hata oluştu', error: error.message });
  }
});

// Yeni kategori oluştur
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, type, color } = req.body;
    
    // Kategori adı kontrolü (aynı restoranda)
    const existingCategory = await Category.findOne({ 
      name: name.trim(),
      restaurant: req.restaurant._id
    });
    if (existingCategory) {
      return res.status(400).json({ message: 'Bu kategori adı zaten mevcut' });
    }

    const category = new Category({
      name: name.trim(),
      restaurant: req.restaurant._id,
      description: description?.trim(),
      type,
      color: color || '#007bff'
    });

    const savedCategory = await category.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(400).json({ message: 'Kategori oluşturulurken hata oluştu', error: error.message });
  }
});

// Kategori güncelle
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, description, type, color, isActive } = req.body;
    
    // Kategori adı kontrolü (kendisi hariç, aynı restoranda)
    if (name) {
      const existingCategory = await Category.findOne({ 
        name: name.trim(), 
        restaurant: req.restaurant._id,
        _id: { $ne: req.params.id } 
      });
      if (existingCategory) {
        return res.status(400).json({ message: 'Bu kategori adı zaten mevcut' });
      }
    }

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, restaurant: req.restaurant._id },
      {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(type && { type }),
        ...(color && { color }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }

    res.json(category);
  } catch (error) {
    res.status(400).json({ message: 'Kategori güncellenirken hata oluştu', error: error.message });
  }
});

// Kategori sil
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Kategoriye ait ürün var mı kontrol et (aynı restoranda)
    const productsCount = await Product.countDocuments({ 
      category: req.params.id,
      restaurant: req.restaurant._id
    });
    if (productsCount > 0) {
      return res.status(400).json({ 
        message: `Bu kategoriye ait ${productsCount} ürün bulunmaktadır. Önce ürünleri silin veya başka kategoriye taşıyın.` 
      });
    }

    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      restaurant: req.restaurant._id
    });
    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }

    res.json({ message: 'Kategori başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Kategori silinirken hata oluştu', error: error.message });
  }
});

// Kategoriye göre ürün sayısını getir
router.get('/:id/products/count', requireAuth, async (req, res) => {
  try {
    const count = await Product.countDocuments({ 
      category: req.params.id, 
      restaurant: req.restaurant._id,
      isActive: true 
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Ürün sayısı getirilirken hata oluştu', error: error.message });
  }
});

module.exports = router;