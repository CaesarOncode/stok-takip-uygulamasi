const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Restoran kullanıcılarını listele
router.get('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({ 
            restaurant: req.restaurant._id 
        }).select('-password').populate('restaurant', 'name');

        res.json({
            success: true,
            users: users.map(user => ({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                profile: user.profile,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                permissions: user.permissions
            }))
        });
    } catch (error) {
        console.error('Kullanıcı listesi hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Kullanıcı listesi alınırken hata oluştu' 
        });
    }
});

// Yeni kullanıcı ekle
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { 
            username, 
            email, 
            password, 
            role, 
            firstName, 
            lastName, 
            phone,
            permissions 
        } = req.body;

        // Zorunlu alanları kontrol et
        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kullanıcı adı, email, şifre, ad ve soyad zorunludur' 
            });
        }

        // Email formatını kontrol et
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Geçerli bir email adresi giriniz' 
            });
        }

        // Şifre uzunluğunu kontrol et
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Şifre en az 6 karakter olmalıdır' 
            });
        }

        // Email'in zaten kullanılıp kullanılmadığını kontrol et
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ 
                success: false, 
                message: 'Bu email adresi zaten kullanılıyor' 
            });
        }

        // Username'in zaten kullanılıp kullanılmadığını kontrol et
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ 
                success: false, 
                message: 'Bu kullanıcı adı zaten kullanılıyor' 
            });
        }

        // Sadece owner başka owner oluşturabilir
        if (role === 'owner' && req.user.role !== 'owner') {
            return res.status(403).json({ 
                success: false, 
                message: 'Sadece restoran sahibi başka sahip oluşturabilir' 
            });
        }

        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 10);

        // Yeni kullanıcı oluştur
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            restaurant: req.restaurant._id,
            role: role || 'employee',
            profile: {
                firstName,
                lastName,
                phone: phone || ''
            },
            permissions: permissions || {
                canManageProducts: role === 'manager' || role === 'owner',
                canManageCategories: role === 'manager' || role === 'owner',
                canManageStock: true,
                canViewReports: true,
                canManageUsers: role === 'owner'
            },
            isActive: true
        });

        await newUser.save();

        // Şifreyi response'dan çıkar
        const userResponse = newUser.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'Kullanıcı başarıyla oluşturuldu',
            user: userResponse
        });

    } catch (error) {
        console.error('Kullanıcı oluşturma hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Kullanıcı oluşturulurken hata oluştu' 
        });
    }
});

// Kullanıcı güncelle
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            role, 
            firstName, 
            lastName, 
            phone, 
            permissions,
            isActive 
        } = req.body;

        // Kullanıcının aynı restoranda olduğunu kontrol et
        const user = await User.findOne({ 
            _id: id, 
            restaurant: req.restaurant._id 
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Kullanıcı bulunamadı' 
            });
        }

        // Kendi kendini silmeyi engelle
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kendi hesabınızı bu şekilde güncelleyemezsiniz' 
            });
        }

        // Sadece owner başka owner'ı güncelleyebilir
        if (user.role === 'owner' && req.user.role !== 'owner') {
            return res.status(403).json({ 
                success: false, 
                message: 'Sadece restoran sahibi başka sahipleri güncelleyebilir' 
            });
        }

        // Güncelleme
        if (role) user.role = role;
        if (firstName) user.profile.firstName = firstName;
        if (lastName) user.profile.lastName = lastName;
        if (phone !== undefined) user.profile.phone = phone;
        if (permissions) user.permissions = { ...user.permissions, ...permissions };
        if (isActive !== undefined) user.isActive = isActive;

        await user.save();

        // Şifreyi response'dan çıkar
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            success: true,
            message: 'Kullanıcı başarıyla güncellendi',
            user: userResponse
        });

    } catch (error) {
        console.error('Kullanıcı güncelleme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Kullanıcı güncellenirken hata oluştu' 
        });
    }
});

// Kullanıcı sil
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Kullanıcının aynı restoranda olduğunu kontrol et
        const user = await User.findOne({ 
            _id: id, 
            restaurant: req.restaurant._id 
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Kullanıcı bulunamadı' 
            });
        }

        // Kendi kendini silmeyi engelle
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kendi hesabınızı silemezsiniz' 
            });
        }

        // Sadece owner başka owner'ı silebilir
        if (user.role === 'owner' && req.user.role !== 'owner') {
            return res.status(403).json({ 
                success: false, 
                message: 'Sadece restoran sahibi başka sahipleri silebilir' 
            });
        }

        await User.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Kullanıcı başarıyla silindi'
        });

    } catch (error) {
        console.error('Kullanıcı silme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Kullanıcı silinirken hata oluştu' 
        });
    }
});

// Kullanıcı şifre değiştir
router.put('/:id/password', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Yeni şifre en az 6 karakter olmalıdır' 
            });
        }

        // Kullanıcının aynı restoranda olduğunu kontrol et
        const user = await User.findOne({ 
            _id: id, 
            restaurant: req.restaurant._id 
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Kullanıcı bulunamadı' 
            });
        }

        // Sadece owner başka owner'ın şifresini değiştirebilir
        if (user.role === 'owner' && req.user.role !== 'owner') {
            return res.status(403).json({ 
                success: false, 
                message: 'Sadece restoran sahibi başka sahiplerin şifresini değiştirebilir' 
            });
        }

        // Şifreyi hashle ve güncelle
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Şifre başarıyla değiştirildi'
        });

    } catch (error) {
        console.error('Şifre değiştirme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Şifre değiştirilirken hata oluştu' 
        });
    }
});

module.exports = router;