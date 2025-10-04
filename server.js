const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'stok-takip-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/stok_takip',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: false, // Railway'de HTTPS proxy kullanıldığı için false yapıyoruz
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax' // CSRF koruması için
  },
  rolling: true // Her istekte session süresini yenile
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB bağlantısı
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stok_takip';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB bağlantısı başarılı'))
.catch(err => console.error('MongoDB bağlantı hatası:', err));

// Import middleware
const { requireAuth, optionalAuth } = require('./middleware/auth');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', requireAuth, require('./routes/categories'));
app.use('/api/products', requireAuth, require('./routes/products'));
app.use('/api/stock', requireAuth, require('./routes/stock'));
app.use('/api/reports', requireAuth, require('./routes/reports'));
app.use('/api/users', requireAuth, require('./routes/users'));

// Frontend için ana route
app.get('/', optionalAuth, (req, res) => {
  // Eğer kullanıcı giriş yapmamışsa login sayfasına yönlendir
  if (!req.user) {
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Index.html için direkt route (authentication gerekli)
app.get('/index.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login ve register sayfaları için özel route'lar
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// HTML sayfaları için authentication kontrolü
app.get('/users.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'users.html'));
});

app.get('/products.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

app.get('/categories.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'categories.html'));
});

app.get('/stock.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stock.html'));
});

app.get('/reports.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Sunucu hatası!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});