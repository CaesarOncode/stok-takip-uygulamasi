const mongoose = require('mongoose');
require('dotenv').config();

// Model'leri import et
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const Product = require('./models/Product');
const Category = require('./models/Category');
const StockMovement = require('./models/StockMovement');

async function migrateData() {
    try {
        // MongoDB'ye bağlan
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stok-takip');
        console.log('MongoDB bağlantısı başarılı');

        // 1. Mevcut kullanıcıları kontrol et
        const existingUsers = await User.find({});
        console.log(`Mevcut kullanıcı sayısı: ${existingUsers.length}`);

        // 2. Eğer kullanıcılar varsa ve restaurant alanı yoksa, migration yap
        for (const user of existingUsers) {
            if (!user.restaurant) {
                console.log(`Kullanıcı ${user.email} için restoran oluşturuluyor...`);
                
                // Varsayılan restoran oluştur
                const restaurant = new Restaurant({
                    name: user.restaurantName || `${user.firstName || 'Restoran'} Restaurant`,
                    slug: (user.restaurantName || `${user.firstName || 'restoran'}-restaurant`).toLowerCase().replace(/\s+/g, '-'),
                    address: user.address || 'Adres belirtilmemiş',
                    city: user.city || 'Şehir belirtilmemiş',
                    phone: user.phone || '',
                    plan: user.plan || 'basic',
                    isActive: true
                });

                await restaurant.save();
                console.log(`Restoran oluşturuldu: ${restaurant.name}`);

                // Kullanıcıyı güncelle
                user.restaurant = restaurant._id;
                await user.save();
                console.log(`Kullanıcı ${user.email} güncellendi`);
            }
        }

        // 3. Mevcut kategorileri kontrol et ve restaurant alanı ekle
        const existingCategories = await Category.find({});
        console.log(`Mevcut kategori sayısı: ${existingCategories.length}`);

        if (existingCategories.length > 0) {
            // İlk restoranı al (varsayılan olarak)
            const firstRestaurant = await Restaurant.findOne({});
            if (firstRestaurant) {
                for (const category of existingCategories) {
                    if (!category.restaurant) {
                        category.restaurant = firstRestaurant._id;
                        await category.save();
                        console.log(`Kategori ${category.name} güncellendi`);
                    }
                }
            }
        }

        // 4. Mevcut ürünleri kontrol et ve restaurant alanı ekle
        const existingProducts = await Product.find({});
        console.log(`Mevcut ürün sayısı: ${existingProducts.length}`);

        if (existingProducts.length > 0) {
            // İlk restoranı al (varsayılan olarak)
            const firstRestaurant = await Restaurant.findOne({});
            if (firstRestaurant) {
                for (const product of existingProducts) {
                    if (!product.restaurant) {
                        product.restaurant = firstRestaurant._id;
                        await product.save();
                        console.log(`Ürün ${product.name} güncellendi`);
                    }
                }
            }
        }

        // 5. Mevcut stok hareketlerini kontrol et ve restaurant alanı ekle
        const existingMovements = await StockMovement.find({});
        console.log(`Mevcut stok hareketi sayısı: ${existingMovements.length}`);

        if (existingMovements.length > 0) {
            // İlk restoranı al (varsayılan olarak)
            const firstRestaurant = await Restaurant.findOne({});
            if (firstRestaurant) {
                for (const movement of existingMovements) {
                    if (!movement.restaurant) {
                        movement.restaurant = firstRestaurant._id;
                        await movement.save();
                        console.log(`Stok hareketi güncellendi`);
                    }
                }
            }
        }

        console.log('Migration tamamlandı!');
        
    } catch (error) {
        console.error('Migration hatası:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB bağlantısı kapatıldı');
    }
}

// Script'i çalıştır
if (require.main === module) {
    migrateData();
}

module.exports = migrateData;