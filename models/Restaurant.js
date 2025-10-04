const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'Türkiye' }
    },
    settings: {
        currency: { type: String, default: 'TL' },
        timezone: { type: String, default: 'Europe/Istanbul' },
        language: { type: String, default: 'tr' }
    },
    subscription: {
        plan: { type: String, enum: ['basic', 'premium', 'enterprise'], default: 'basic' },
        startDate: { type: Date, default: Date.now },
        endDate: Date,
        isActive: { type: Boolean, default: true }
    },
    logo: String,
    theme: {
        primaryColor: { type: String, default: '#007bff' },
        secondaryColor: { type: String, default: '#6c757d' }
    }
}, {
    timestamps: true
});

// Slug oluşturma middleware
restaurantSchema.pre('save', function(next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    next();
});

module.exports = mongoose.model('Restaurant', restaurantSchema);