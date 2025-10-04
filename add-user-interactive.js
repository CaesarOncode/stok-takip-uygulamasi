const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Restaurant = require('./models/Restaurant');
const User = require('./models/User');

// Farklı kullanıcı örnekleri - istediğinizi seçip kullanabilirsiniz
const userExamples = [
    {
        username: 'ahmet_chef',
        email: 'ahmet@restaurant.com',
        password: '123456',
        firstName: 'Ahmet',
        lastName: 'Yılmaz',
        phone: '555-1234',
        role: 'manager'
    },
    {
        username: 'fatma_garson',
        email: 'fatma@restaurant.com',
        password: '123456',
        firstName: 'Fatma',
        lastName: 'Demir',
        phone: '555-5678',
        role: 'employee'
    },
    {
        username: 'mehmet_kasiyer',
        email: 'mehmet@restaurant.com',
        password: '123456',
        firstName: 'Mehmet',
        lastName: 'Kaya',
        phone: '555-9012',
        role: 'employee'
    }
];

async function addUserToRestaurant(restaurantId, userIndex = 0) {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stok-takip');
        console.log('MongoDB bağlantısı başarılı\n');

        // Mevcut restoranları listele
        const restaurants = await Restaurant.find({}).select('name slug _id');
        console.log('=== MEVCUT RESTORANLAR ===');
        restaurants.forEach((restaurant, index) => {
            console.log(`${index + 1}. ${restaurant.name} (ID: ${restaurant._id})`);
        });

        // Kullanıcı örneklerini göster
        console.log('\n=== KULLANICI ÖRNEKLERİ ===');
        userExamples.forEach((user, index) => {
            console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
        });

        // Seçilen kullanıcı bilgilerini al
        const selectedUser = userExamples[userIndex];
        if (!selectedUser) {
            console.error('❌ Geçersiz kullanıcı indeksi!');
            return;
        }

        console.log(`\n=== SEÇİLEN KULLANICI: ${selectedUser.firstName} ${selectedUser.lastName} ===`);

        // Restoranın var olup olmadığını kontrol et
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            console.error('❌ Belirtilen restoran bulunamadı!');
            return;
        }

        console.log(`✅ Restoran bulundu: ${restaurant.name}`);

        // Email'in zaten kullanılıp kullanılmadığını kontrol et
        const existingUser = await User.findOne({ email: selectedUser.email });
        if (existingUser) {
            console.error('❌ Bu email adresi zaten kullanılıyor!');
            return;
        }

        // Username'in zaten kullanılıp kullanılmadığını kontrol et
        const existingUsername = await User.findOne({ username: selectedUser.username });
        if (existingUsername) {
            console.error('❌ Bu kullanıcı adı zaten kullanılıyor!');
            return;
        }

        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(selectedUser.password, 10);

        // Yeni kullanıcı oluştur
        const newUser = new User({
            username: selectedUser.username,
            email: selectedUser.email,
            password: hashedPassword,
            restaurant: restaurantId,
            role: selectedUser.role,
            profile: {
                firstName: selectedUser.firstName,
                lastName: selectedUser.lastName,
                phone: selectedUser.phone
            },
            isActive: true
        });

        await newUser.save();

        console.log('\n🎉 Yeni kullanıcı başarıyla oluşturuldu!');
        console.log(`Kullanıcı ID: ${newUser._id}`);
        console.log(`${restaurant.name} restoranına eklendi`);
        console.log(`Rol: ${selectedUser.role}`);

        // Restoranın güncel kullanıcı sayısını göster
        const userCount = await User.countDocuments({ restaurant: restaurantId });
        console.log(`\n📊 ${restaurant.name} restoranının toplam kullanıcı sayısı: ${userCount}`);

        // Giriş bilgilerini göster
        console.log('\n🔑 GİRİŞ BİLGİLERİ:');
        console.log(`Email: ${selectedUser.email}`);
        console.log(`Şifre: ${selectedUser.password}`);

    } catch (error) {
        console.error('❌ Hata:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 MongoDB bağlantısı kapatıldı');
    }
}

// KULLANIM ÖRNEKLERİ:
// node add-user-interactive.js admin 0    (admin restoranına Ahmet'i ekle)
// node add-user-interactive.js kaan 1     (kaan restoranına Fatma'yı ekle)
// node add-user-interactive.js rabia 2    (rabia restoranına Mehmet'i ekle)

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('❌ Kullanım: node add-user-interactive.js <restoran_adı_veya_id> <kullanıcı_indeksi>');
    console.log('\nÖrnekler:');
    console.log('node add-user-interactive.js admin 0');
    console.log('node add-user-interactive.js kaan 1');
    console.log('node add-user-interactive.js rabia 2');
    process.exit(1);
}

const restaurantIdentifier = args[0];
const userIndex = parseInt(args[1]);

// Restoran ID'sini belirle
async function getRestaurantId() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stok-takip');
    
    let restaurant;
    // Önce ID olarak dene
    if (mongoose.Types.ObjectId.isValid(restaurantIdentifier)) {
        restaurant = await Restaurant.findById(restaurantIdentifier);
    }
    
    // ID değilse, isim veya slug olarak ara
    if (!restaurant) {
        restaurant = await Restaurant.findOne({
            $or: [
                { name: { $regex: restaurantIdentifier, $options: 'i' } },
                { slug: restaurantIdentifier }
            ]
        });
    }
    
    await mongoose.disconnect();
    
    if (!restaurant) {
        console.error(`❌ "${restaurantIdentifier}" adında veya ID'sinde restoran bulunamadı!`);
        process.exit(1);
    }
    
    return restaurant._id;
}

// Script'i çalıştır
getRestaurantId().then(restaurantId => {
    addUserToRestaurant(restaurantId, userIndex);
});