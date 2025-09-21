// Stock Management System JavaScript

// API Base URL - Dinamik olarak ayarlanıyor
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '/api' 
    : '/api';
let currentPage = 'dashboard';
let categories = [];
let products = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    setInterval(updateTime, 1000);
    loadDashboard();
    loadCategories();
});

// Update current time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('currentTime').textContent = timeString;
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.innerHTML = `
        <strong>${type === 'success' ? 'Başarılı!' : 'Hata!'}</strong> ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Show loading overlay
function showLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Yükleniyor...</span></div>';
    overlay.id = 'loadingOverlay';
    document.body.appendChild(overlay);
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// API request helper
async function apiRequest(url, options = {}) {
    try {
        showLoading();
        const response = await fetch(API_BASE + url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Bir hata oluştu');
        }
        
        return data;
    } catch (error) {
        showNotification(error.message, 'danger');
        throw error;
    } finally {
        hideLoading();
    }
}

// Page navigation
function showPage(pageName) {
    // Close mobile navbar if open
    const navbarCollapse = document.getElementById('navbarNav');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
            toggle: false
        });
        bsCollapse.hide();
    }
    
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    // Show selected page
    document.getElementById(pageName + '-page').style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    currentPage = pageName;
    
    // Load page data
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'products':
            loadProducts();
            break;
        case 'stock':
            loadStockMovements();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Show products page with filter from dashboard cards
function showProductsPage(filter = 'all') {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    // Show products page
    document.getElementById('products-page').style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('[onclick="showPage(\'products\')"]').classList.add('active');
    
    currentPage = 'products';
    
    // Load products with filter
    loadProductsWithFilter(filter);
}

// Dashboard functions
async function loadDashboard() {
    try {
        const summary = await apiRequest('/stock/summary');
        
        document.getElementById('total-products').textContent = summary.totalProducts;
        document.getElementById('out-of-stock').textContent = summary.outOfStock;
        document.getElementById('critical-stock').textContent = summary.criticalStock;
        
        // Load recent movements
        const movementsHtml = summary.recentMovements.map(movement => `
            <tr>
                <td>${new Date(movement.createdAt).toLocaleString('tr-TR')}</td>
                <td>${movement.product.name}</td>
                <td><span class="badge bg-${getMovementTypeColor(movement.type)}">${movement.type}</span></td>
                <td>${movement.quantity} ${movement.product.unit}</td>
                <td>${movement.user}</td>
            </tr>
        `).join('');
        
        document.getElementById('recent-movements').innerHTML = movementsHtml || '<tr><td colspan="5" class="text-center">Henüz hareket yok</td></tr>';
    } catch (error) {
        console.error('Dashboard yüklenirken hata:', error);
    }
}

function getMovementTypeColor(type) {
    switch(type) {
        case 'giriş': return 'success';
        case 'çıkış': return 'danger';
        case 'düzeltme': return 'warning';
        case 'fire': return 'secondary';
        default: return 'primary';
    }
}

// Category functions
async function loadCategories() {
    try {
        categories = await apiRequest('/categories');
        
        const container = document.getElementById('categories-container');
        const categoriesHtml = categories.map(category => `
            <div class="col-md-4 mb-3">
                <div class="card category-card category-${category.type}" style="border-left-color: ${category.color}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5 class="card-title">${category.name}</h5>
                                <p class="card-text text-muted">${category.description || 'Açıklama yok'}</p>
                                <span class="badge category-type-badge" style="background-color: ${category.color}">${category.type}</span>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onclick="editCategory('${category._id}')"><i class="fas fa-edit me-2"></i>Düzenle</a></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteCategory('${category._id}')"><i class="fas fa-trash me-2"></i>Sil</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = categoriesHtml || '<div class="col-12 text-center"><p>Henüz kategori eklenmemiş</p></div>';
        
        // Update category filters
        updateCategoryFilters();
    } catch (error) {
        console.error('Kategoriler yüklenirken hata:', error);
    }
}

function updateCategoryFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const productCategory = document.getElementById('productCategory');
    const stockProduct = document.getElementById('stockProduct');
    
    const categoryOptions = categories.map(cat => 
        `<option value="${cat._id}">${cat.name}</option>`
    ).join('');
    
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">Tüm Kategoriler</option>' + categoryOptions;
    }
    
    if (productCategory) {
        productCategory.innerHTML = '<option value="">Seçiniz</option>' + categoryOptions;
    }
    
    if (stockProduct) {
        const productOptions = products.map(product => 
            `<option value="${product._id}">${product.name} (${product.currentStock} ${product.unit})</option>`
        ).join('');
        stockProduct.innerHTML = '<option value="">Ürün seçiniz</option>' + productOptions;
    }
}

function showCategoryModal(categoryId = null) {
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    const form = document.getElementById('categoryForm');
    const title = document.getElementById('categoryModalTitle');
    
    form.reset();
    document.getElementById('categoryId').value = '';
    
    if (categoryId) {
        title.textContent = 'Kategori Düzenle';
        const category = categories.find(c => c._id === categoryId);
        if (category) {
            document.getElementById('categoryId').value = category._id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryDescription').value = category.description || '';
            document.getElementById('categoryType').value = category.type;
            document.getElementById('categoryColor').value = category.color;
        }
    } else {
        title.textContent = 'Yeni Kategori';
    }
    
    modal.show();
}

async function saveCategory() {
    try {
        const form = document.getElementById('categoryForm');
        const formData = new FormData(form);
        
        const categoryData = {
            name: document.getElementById('categoryName').value,
            description: document.getElementById('categoryDescription').value,
            type: document.getElementById('categoryType').value,
            color: document.getElementById('categoryColor').value
        };
        
        const categoryId = document.getElementById('categoryId').value;
        
        if (categoryId) {
            await apiRequest(`/categories/${categoryId}`, {
                method: 'PUT',
                body: JSON.stringify(categoryData)
            });
            showNotification('Kategori başarıyla güncellendi');
        } else {
            await apiRequest('/categories', {
                method: 'POST',
                body: JSON.stringify(categoryData)
            });
            showNotification('Kategori başarıyla eklendi');
        }
        
        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
        loadCategories();
    } catch (error) {
        console.error('Kategori kaydedilirken hata:', error);
    }
}

function editCategory(categoryId) {
    showCategoryModal(categoryId);
}

async function deleteCategory(categoryId) {
    if (confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
        try {
            await apiRequest(`/categories/${categoryId}`, {
                method: 'DELETE'
            });
            showNotification('Kategori başarıyla silindi');
            loadCategories();
        } catch (error) {
            console.error('Kategori silinirken hata:', error);
        }
    }
}

// Product functions
async function loadProducts() {
    try {
        const categoryFilter = document.getElementById('category-filter').value;
        const stockStatusFilter = document.getElementById('stock-status-filter').value;
        const searchTerm = document.getElementById('search-input').value;
        
        let url = '/products?';
        if (categoryFilter) url += `category=${categoryFilter}&`;
        if (stockStatusFilter) url += `stockStatus=${stockStatusFilter}&`;
        if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
        
        const response = await apiRequest(url);
        products = response.products || response;

// Load products with specific filter from dashboard cards
async function loadProductsWithFilter(filter) {
    try {
        let url = '/products?';
        
        // Apply filter based on dashboard card clicked
        switch(filter) {
            case 'out-of-stock':
                url = '/products/alerts/out-of-stock';
                // Set the filter dropdown to match
                document.getElementById('stock-status-filter').value = 'Tükendi';
                break;
            case 'critical':
                url = '/products/alerts/critical';
                // Set the filter dropdown to match
                document.getElementById('stock-status-filter').value = 'Kritik';
                break;
            case 'all':
            default:
                // Clear filters for all products
                document.getElementById('stock-status-filter').value = '';
                document.getElementById('category-filter').value = '';
                document.getElementById('search-input').value = '';
                break;
        }
        
        const response = await apiRequest(url);
        products = response.products || response;
        
        const tableBody = document.getElementById('products-table');
        const productsHtml = products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.category.name}</td>
                <td>${product.currentStock} ${product.unit}</td>
                <td>${product.minStock} ${product.unit}</td>
                <td>${product.unit}</td>
                <td><span class="stock-status stock-${product.stockStatus}">${product.stockStatus}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editProduct('${product._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${product._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = productsHtml || '<tr><td colspan="7" class="text-center">Ürün bulunamadı</td></tr>';
        
        updateCategoryFilters();
    } catch (error) {
        console.error('Ürünler yüklenirken hata:', error);
    }
}
        
        const tableBody = document.getElementById('products-table');
        const productsHtml = products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.category.name}</td>
                <td>${product.currentStock} ${product.unit}</td>
                <td>${product.minStock} ${product.unit}</td>
                <td>${product.unit}</td>
                <td><span class="stock-status stock-${product.stockStatus}">${product.stockStatus}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editProduct('${product._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${product._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = productsHtml || '<tr><td colspan="7" class="text-center">Ürün bulunamadı</td></tr>';
        
        updateCategoryFilters();
    } catch (error) {
        console.error('Ürünler yüklenirken hata:', error);
    }
}

function searchProducts() {
    loadProducts();
}

function showProductModal(productId = null) {
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    const form = document.getElementById('productForm');
    const title = document.getElementById('productModalTitle');
    
    form.reset();
    document.getElementById('productId').value = '';
    
    if (productId) {
        title.textContent = 'Ürün Düzenle';
        const product = products.find(p => p._id === productId);
        if (product) {
            document.getElementById('productId').value = product._id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productCategory').value = product.category._id;
            document.getElementById('productUnit').value = product.unit;
            document.getElementById('productCurrentStock').value = product.currentStock;
            document.getElementById('productMinStock').value = product.minStock;
            document.getElementById('productUnitPrice').value = product.unitPrice;
            document.getElementById('productSupplier').value = product.supplier || '';
            document.getElementById('productBarcode').value = product.barcode || '';
        }
    } else {
        title.textContent = 'Yeni Ürün';
    }
    
    modal.show();
}

async function saveProduct() {
    try {
        const productData = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            category: document.getElementById('productCategory').value,
            unit: document.getElementById('productUnit').value,
            currentStock: parseFloat(document.getElementById('productCurrentStock').value) || 0,
            minStock: parseFloat(document.getElementById('productMinStock').value) || 5,
            unitPrice: parseFloat(document.getElementById('productUnitPrice').value) || 0,
            supplier: document.getElementById('productSupplier').value,
            barcode: document.getElementById('productBarcode').value
        };
        
        const productId = document.getElementById('productId').value;
        
        if (productId) {
            await apiRequest(`/products/${productId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
            showNotification('Ürün başarıyla güncellendi');
        } else {
            await apiRequest('/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
            showNotification('Ürün başarıyla eklendi');
        }
        
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        loadProducts();
        if (currentPage === 'dashboard') loadDashboard();
    } catch (error) {
        console.error('Ürün kaydedilirken hata:', error);
    }
}

function editProduct(productId) {
    showProductModal(productId);
}

async function deleteProduct(productId) {
    if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
        try {
            await apiRequest(`/products/${productId}`, {
                method: 'DELETE'
            });
            showNotification('Ürün başarıyla silindi');
            loadProducts();
            if (currentPage === 'dashboard') loadDashboard();
        } catch (error) {
            console.error('Ürün silinirken hata:', error);
        }
    }
}

// Stock functions
async function loadStockMovements() {
    try {
        const response = await apiRequest('/stock/movements');
        const movements = response.movements || response;
        
        const tableBody = document.getElementById('stock-movements-table');
        const movementsHtml = movements.map(movement => `
            <tr>
                <td>${new Date(movement.createdAt).toLocaleString('tr-TR')}</td>
                <td>${movement.product.name}</td>
                <td><span class="badge bg-${getMovementTypeColor(movement.type)}">${movement.type}</span></td>
                <td>${movement.quantity} ${movement.product.unit}</td>
                <td>${movement.previousStock} ${movement.product.unit}</td>
                <td>${movement.newStock} ${movement.product.unit}</td>
                <td>${movement.user}</td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = movementsHtml || '<tr><td colspan="7" class="text-center">Henüz hareket yok</td></tr>';
    } catch (error) {
        console.error('Stok hareketleri yüklenirken hata:', error);
    }
}

function showStockModal(operation) {
    const modal = new bootstrap.Modal(document.getElementById('stockModal'));
    const form = document.getElementById('stockForm');
    const title = document.getElementById('stockModalTitle');
    
    form.reset();
    document.getElementById('stockOperation').value = operation;
    
    // Hide all conditional fields
    document.getElementById('stockInFields').style.display = 'none';
    document.getElementById('stockAdjustFields').style.display = 'none';
    
    switch(operation) {
        case 'in':
            title.textContent = 'Stok Girişi';
            document.getElementById('stockInFields').style.display = 'block';
            break;
        case 'out':
            title.textContent = 'Stok Çıkışı';
            break;
        case 'adjust':
            title.textContent = 'Stok Düzeltme';
            document.getElementById('stockAdjustFields').style.display = 'block';
            break;
    }
    
    modal.show();
}

function updateProductInfo() {
    const productId = document.getElementById('stockProduct').value;
    const productInfo = document.getElementById('productInfo');
    
    if (productId) {
        const product = products.find(p => p._id === productId);
        if (product) {
            productInfo.innerHTML = `
                <strong>${product.name}</strong><br>
                Mevcut Stok: ${product.currentStock} ${product.unit}<br>
                Minimum Stok: ${product.minStock} ${product.unit}<br>
                Durum: <span class="stock-status stock-${product.stockStatus}">${product.stockStatus}</span>
            `;
            productInfo.style.display = 'block';
            
            // Set current stock for adjustment
            document.getElementById('newStockAmount').value = product.currentStock;
            document.getElementById('stockUnitPrice').value = product.unitPrice;
        }
    } else {
        productInfo.style.display = 'none';
    }
}

async function saveStockOperation() {
    try {
        const operation = document.getElementById('stockOperation').value;
        const productId = document.getElementById('stockProduct').value;
        const quantity = parseFloat(document.getElementById('stockQuantity').value);
        const reason = document.getElementById('stockReason').value;
        
        let requestData = {
            productId,
            reason,
            user: 'Kullanıcı'
        };
        
        let endpoint = '';
        
        switch(operation) {
            case 'in':
                endpoint = '/stock/in';
                requestData.quantity = quantity;
                requestData.unitPrice = parseFloat(document.getElementById('stockUnitPrice').value) || 0;
                requestData.supplier = document.getElementById('stockSupplier').value;
                requestData.invoiceNumber = document.getElementById('stockInvoiceNumber').value;
                break;
            case 'out':
                endpoint = '/stock/out';
                requestData.quantity = quantity;
                break;
            case 'adjust':
                endpoint = '/stock/adjust';
                requestData.newStock = parseFloat(document.getElementById('newStockAmount').value);
                break;
        }
        
        await apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
        
        showNotification('Stok işlemi başarıyla tamamlandı');
        bootstrap.Modal.getInstance(document.getElementById('stockModal')).hide();
        loadStockMovements();
        if (currentPage === 'dashboard') loadDashboard();
        loadProducts(); // Refresh products to update stock levels
    } catch (error) {
        console.error('Stok işlemi yapılırken hata:', error);
    }
}

// Reports functions
async function loadReports() {
    try {
        // Load low stock report
        const lowStockProducts = await apiRequest('/reports/low-stock-alert');
        const lowStockHtml = lowStockProducts.map(product => `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                    <strong>${product.name}</strong><br>
                    <small class="text-muted">${product.category}</small>
                </div>
                <div class="text-end">
                    <span class="stock-status stock-${product.stockStatus}">${product.currentStock} ${product.unit}</span><br>
                    <small class="text-muted">Min: ${product.minStock} ${product.unit}</small>
                </div>
            </div>
        `).join('');
        
        document.getElementById('low-stock-report').innerHTML = lowStockHtml || '<p class="text-center text-muted">Düşük stok uyarısı yok</p>';
        
        // Load category stock report
        const categoryReport = await apiRequest('/reports/stock-by-category');
        const categoryReportHtml = categoryReport.map(category => `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                    <strong>${category.categoryName}</strong><br>
                    <small class="text-muted">${category.totalProducts} ürün</small>
                </div>
                <div class="text-end">
                    <strong>${category.totalStock} adet</strong><br>
                    <small class="text-muted">Kalan miktar</small>
                </div>
            </div>
        `).join('');
        
        document.getElementById('category-stock-report').innerHTML = categoryReportHtml || '<p class="text-center text-muted">Kategori raporu yok</p>';
    } catch (error) {
        console.error('Raporlar yüklenirken hata:', error);
    }
}