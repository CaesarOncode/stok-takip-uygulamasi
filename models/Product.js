const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ürün adı gereklidir'],
    trim: true,
    maxlength: [100, 'Ürün adı 100 karakterden fazla olamaz']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Açıklama 500 karakterden fazla olamaz']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Kategori gereklidir']
  },
  unit: {
    type: String,
    required: [true, 'Birim gereklidir'],
    enum: ['adet', 'kg', 'gram', 'litre', 'ml', 'paket', 'kutu', 'şişe'],
    default: 'adet'
  },
  currentStock: {
    type: Number,
    required: [true, 'Mevcut stok gereklidir'],
    min: [0, 'Stok negatif olamaz'],
    default: 0
  },
  minStock: {
    type: Number,
    required: [true, 'Minimum stok gereklidir'],
    min: [0, 'Minimum stok negatif olamaz'],
    default: 5
  },
  maxStock: {
    type: Number,
    min: [0, 'Maksimum stok negatif olamaz'],
    default: 1000
  },
  unitPrice: {
    type: Number,
    min: [0, 'Birim fiyat negatif olamaz'],
    default: 0
  },
  supplier: {
    type: String,
    trim: true,
    maxlength: [100, 'Tedarikçi adı 100 karakterden fazla olamaz']
  },
  barcode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.currentStock <= 0) return 'tükendi';
  if (this.currentStock <= this.minStock) return 'kritik';
  if (this.currentStock >= this.maxStock) return 'fazla';
  return 'normal';
});

// Update timestamp on save
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Populate category on find
productSchema.pre(/^find/, function(next) {
  this.populate('category');
  next();
});

module.exports = mongoose.model('Product', productSchema);