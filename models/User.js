const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    role: {
        type: String,
        enum: ['owner', 'manager', 'employee'],
        default: 'employee'
    },
    permissions: {
        canManageProducts: { type: Boolean, default: true },
        canManageCategories: { type: Boolean, default: true },
        canManageStock: { type: Boolean, default: true },
        canViewReports: { type: Boolean, default: true },
        canManageUsers: { type: Boolean, default: false }
    },
    profile: {
        firstName: String,
        lastName: String,
        phone: String,
        avatar: String
    },
    lastLogin: Date,
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

// Şifre hashleme middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Şifre karşılaştırma metodu
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Tam isim getter
userSchema.virtual('fullName').get(function() {
    if (this.profile.firstName && this.profile.lastName) {
        return `${this.profile.firstName} ${this.profile.lastName}`;
    }
    return this.username;
});

module.exports = mongoose.model('User', userSchema);