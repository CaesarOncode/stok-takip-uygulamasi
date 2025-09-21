const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');

// Tüm kategorileri getir
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Kategoriler getirilirken hata oluştu', error: error.message });
  }
});

// Kategori detayını getir
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Kategori getirilirken hata oluştu', error: error.message });
  }
});

// Yeni kategori oluştur
router.post('/', async (req, res) => {
  try {
    const { name, description, type, color } = req.body;
    
    // Kategori adı kontrolü
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({ message: 'Bu kategori adı zaten mevcut' });
    }

    const category = new Category({
      name: name.trim(),
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
router.put('/:id', async (req, res) => {
  try {
    const { name, description, type, color, isActive } = req.body;
    
    // Kategori adı kontrolü (kendisi hariç)
    if (name) {
      const existingCategory = await Category.findOne({ 
        name: name.trim(), 
        _id: { $ne: req.params.id } 
      });
      if (existingCategory) {
        return res.status(400).json({ message: 'Bu kategori adı zaten mevcut' });
      }
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
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
router.delete('/:id', async (req, res) => {
  try {
    // Kategoriye ait ürün var mı kontrol et
    const productsCount = await Product.countDocuments({ category: req.params.id });
    if (productsCount > 0) {
      return res.status(400).json({ 
        message: `Bu kategoriye ait ${productsCount} ürün bulunmaktadır. Önce ürünleri silin veya başka kategoriye taşıyın.` 
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }

    res.json({ message: 'Kategori başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Kategori silinirken hata oluştu', error: error.message });
  }
});

// Kategoriye göre ürün sayısını getir
router.get('/:id/products/count', async (req, res) => {
  try {
    const count = await Product.countDocuments({ category: req.params.id, isActive: true });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Ürün sayısı getirilirken hata oluştu', error: error.message });
  }
});

module.exports = router;