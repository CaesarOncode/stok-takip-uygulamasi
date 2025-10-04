const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

// Kayıt route'u
router.post('/register', async (req, res) => {
    try {
        const {
            restaurantName,
            ownerFirstName,
            ownerLastName,
            email,
            phone,
            password,
            address,
            city,
            plan
        } = req.body;

        // Zorunlu alanlar kontrolü
        if (!restaurantName || !ownerFirstName || !ownerLastName || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen tüm zorunlu alanları doldurun.'
            });
        }

        // Email zaten kayıtlı mı kontrol et
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Bu e-posta adresi zaten kayıtlı.'
            });
        }

        // Restoran adı zaten kayıtlı mı kontrol et
        const existingRestaurant = await Restaurant.findOne({ 
            name: { $regex: new RegExp('^' + restaurantName + '$', 'i') }
        });
        if (existingRestaurant) {
            return res.status(400).json({
                success: false,
                message: 'Bu restoran adı zaten kayıtlı.'
            });
        }

        // Slug oluştur (restoran adından URL dostu hale getir)
        let slug = restaurantName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Özel karakterleri kaldır
            .replace(/\s+/g, '-') // Boşlukları tire ile değiştir
            .replace(/-+/g, '-') // Çoklu tireleri tek tire yap
            .trim('-'); // Başta ve sonda tire varsa kaldır

        // Slug benzersizliği kontrolü
        let slugCounter = 1;
        let originalSlug = slug;
        while (await Restaurant.findOne({ slug: slug })) {
            slug = `${originalSlug}-${slugCounter}`;
            slugCounter++;
        }

        // Yeni restoran oluştur
        const restaurant = new Restaurant({
            name: restaurantName,
            slug: slug,
            email: email.toLowerCase(),
            phone: phone,
            address: {
                street: address || '',
                city: city || '',
                country: 'Türkiye'
            },
            subscription: {
                plan: plan || 'basic',
                startDate: new Date(),
                isActive: true
            }
        });

        await restaurant.save();

        // Yeni kullanıcı oluştur (restoran sahibi)
        const user = new User({
            username: ownerFirstName + ' ' + ownerLastName,
            email: email.toLowerCase(),
            password: password,
            restaurant: restaurant._id,
            role: 'owner',
            permissions: {
                canManageProducts: true,
                canManageCategories: true,
                canManageStock: true,
                canViewReports: true,
                canManageUsers: true
            },
            profile: {
                firstName: ownerFirstName,
                lastName: ownerLastName,
                phone: phone
            }
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'Kayıt başarılı! Giriş yapabilirsiniz.',
            data: {
                restaurant: {
                    id: restaurant._id,
                    name: restaurant.name,
                    slug: restaurant.slug
                },
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası. Lütfen tekrar deneyin.'
        });
    }
});

// Giriş route'u
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Zorunlu alanlar kontrolü
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'E-posta ve şifre gereklidir.'
            });
        }

        // Kullanıcıyı bul ve restoran bilgilerini de getir
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            isActive: true 
        }).populate('restaurant');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz e-posta veya şifre.'
            });
        }

        // Şifre kontrolü
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz e-posta veya şifre.'
            });
        }

        // Restoran aktif mi kontrol et
        if (!user.restaurant || !user.restaurant.subscription.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Restoran hesabı aktif değil. Lütfen yöneticinizle iletişime geçin.'
            });
        }

        // Son giriş tarihini güncelle
        user.lastLogin = new Date();
        await user.save();

        // Session oluştur
        req.session.userId = user._id;
        req.session.restaurantId = user.restaurant._id;
        req.session.userRole = user.role;

        res.json({
            success: true,
            message: 'Giriş başarılı.',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    fullName: user.fullName,
                    permissions: user.permissions
                },
                restaurant: {
                    id: user.restaurant._id,
                    name: user.restaurant.name,
                    slug: user.restaurant.slug,
                    plan: user.restaurant.subscription.plan
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası. Lütfen tekrar deneyin.'
        });
    }
});

// Çıkış route'u
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Çıkış yapılırken hata oluştu.'
            });
        }
        
        res.clearCookie('connect.sid');
        res.json({
            success: true,
            message: 'Başarıyla çıkış yapıldı.'
        });
    });
});

// Kullanıcı bilgilerini getir
router.get('/me', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Oturum bulunamadı.'
            });
        }

        const user = await User.findById(req.session.userId)
            .populate('restaurant')
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı.'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    fullName: user.fullName,
                    permissions: user.permissions,
                    profile: user.profile
                },
                restaurant: {
                    id: user.restaurant._id,
                    name: user.restaurant.name,
                    slug: user.restaurant.slug,
                    plan: user.restaurant.subscription.plan,
                    settings: user.restaurant.settings
                }
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası.'
        });
    }
});

module.exports = router;