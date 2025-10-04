const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Kategori adı gereklidir'],
    trim: true,
    maxlength: [50, 'Kategori adı 50 karakterden fazla olamaz']
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restoran referansı gereklidir']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Açıklama 200 karakterden fazla olamaz']
  },
  type: {
    type: String,
    enum: ['yiyecek', 'içecek', 'diğer'],
    required: [true, 'Kategori tipi gereklidir'],
    default: 'diğer'
  },
  color: {
    type: String,
    default: '#007bff'
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

// Update timestamp on save
categorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compound unique index: aynı restoranda aynı isimde kategori olamaz
categorySchema.index({ name: 1, restaurant: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);