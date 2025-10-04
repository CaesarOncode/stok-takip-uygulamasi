const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

// Authentication middleware - kullanıcının giriş yapmış olup olmadığını kontrol eder
const requireAuth = async (req, res, next) => {
    try {
        // Session kontrolü
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Giriş yapmanız gerekiyor.',
                redirectTo: '/login.html'
            });
        }

        // Kullanıcı bilgilerini getir
        const user = await User.findById(req.session.userId)
            .populate('restaurant')
            .select('-password');

        if (!user || !user.isActive) {
            req.session.destroy();
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı hesabı bulunamadı veya aktif değil.',
                redirectTo: '/login.html'
            });
        }

        // Restoran aktif mi kontrol et
        if (!user.restaurant || !user.restaurant.subscription.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Restoran hesabı aktif değil.'
            });
        }

        // Request objesine kullanıcı bilgilerini ekle
        req.user = user;
        req.restaurant = user.restaurant;
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası.'
        });
    }
};

// Role-based authorization middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Giriş yapmanız gerekiyor.'
            });
        }

        // Roles array veya string olabilir
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Bu işlem için yetkiniz bulunmuyor.'
            });
        }

        next();
    };
};

// Permission-based authorization middleware
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Giriş yapmanız gerekiyor.'
            });
        }

        if (!req.user.permissions || !req.user.permissions[permission]) {
            return res.status(403).json({
                success: false,
                message: 'Bu işlem için yetkiniz bulunmuyor.'
            });
        }

        next();
    };
};

// Restaurant ownership middleware - sadece aynı restorandan verilere erişim
const requireSameRestaurant = (req, res, next) => {
    if (!req.user || !req.restaurant) {
        return res.status(401).json({
            success: false,
            message: 'Giriş yapmanız gerekiyor.'
        });
    }

    // Request'te restaurant ID varsa kontrol et
    const requestRestaurantId = req.params.restaurantId || req.body.restaurantId || req.query.restaurantId;
    
    if (requestRestaurantId && requestRestaurantId !== req.restaurant._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Başka restoran verilerine erişim yetkiniz yok.'
        });
    }

    next();
};

// Optional auth middleware - giriş yapmış kullanıcı bilgilerini ekler ama zorunlu değil
const optionalAuth = async (req, res, next) => {
    try {
        if (req.session && req.session.userId) {
            const user = await User.findById(req.session.userId)
                .populate('restaurant')
                .select('-password');

            if (user && user.isActive && user.restaurant && user.restaurant.subscription.isActive) {
                req.user = user;
                req.restaurant = user.restaurant;
            }
        }
        next();
    } catch (error) {
        console.error('Optional auth middleware error:', error);
        next(); // Hata olsa bile devam et
    }
};

// Admin middleware - sadece owner ve manager rolleri
const requireAdmin = requireRole(['owner', 'manager']);

// Owner middleware - sadece owner rolü
const requireOwner = requireRole('owner');

module.exports = {
    requireAuth,
    requireRole,
    requirePermission,
    requireSameRestaurant,
    optionalAuth,
    requireAdmin,
    requireOwner
};