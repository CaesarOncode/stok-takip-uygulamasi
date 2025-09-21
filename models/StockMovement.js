const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Ürün gereklidir']
  },
  type: {
    type: String,
    enum: ['giriş', 'çıkış', 'düzeltme', 'fire'],
    required: [true, 'Hareket tipi gereklidir']
  },
  quantity: {
    type: Number,
    required: [true, 'Miktar gereklidir'],
    min: [0.01, 'Miktar 0\'dan büyük olmalıdır']
  },
  previousStock: {
    type: Number,
    required: [true, 'Önceki stok gereklidir'],
    min: [0, 'Önceki stok negatif olamaz']
  },
  newStock: {
    type: Number,
    required: [true, 'Yeni stok gereklidir'],
    min: [0, 'Yeni stok negatif olamaz']
  },
  unitPrice: {
    type: Number,
    min: [0, 'Birim fiyat negatif olamaz'],
    default: 0
  },
  totalValue: {
    type: Number,
    min: [0, 'Toplam değer negatif olamaz'],
    default: 0
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [200, 'Sebep 200 karakterden fazla olamaz']
  },
  supplier: {
    type: String,
    trim: true,
    maxlength: [100, 'Tedarikçi adı 100 karakterden fazla olamaz']
  },
  invoiceNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Fatura numarası 50 karakterden fazla olamaz']
  },
  user: {
    type: String,
    required: [true, 'Kullanıcı gereklidir'],
    default: 'Sistem'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate total value before save
stockMovementSchema.pre('save', function(next) {
  this.totalValue = this.quantity * this.unitPrice;
  next();
});

// Populate product on find
stockMovementSchema.pre(/^find/, function(next) {
  this.populate('product');
  next();
});

module.exports = mongoose.model('StockMovement', stockMovementSchema);