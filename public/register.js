// Kayıt sayfası JavaScript fonksiyonları
var registerForm = document.getElementById('registerForm');
var registerBtn = document.getElementById('registerBtn');
var alertContainer = document.getElementById('alertContainer');

// Toast bildirimi gösterme fonksiyonu
function showToast(message, type) {
    // Mevcut alert container'ı da güncelle
    var alertClass = type === 'error' ? 'alert-error' : 'alert-success';
    alertContainer.innerHTML = '<div class="alert ' + alertClass + '">' + message + '</div>';
    
    // Modern toast bildirimi oluştur
    var toast = document.createElement('div');
    toast.className = 'alert alert-' + (type === 'error' ? 'danger' : type) + ' notification';
    toast.innerHTML = '<strong>' + (type === 'success' ? 'Başarılı!' : 'Hata!') + '</strong> ' + message +
        '<button type="button" class="btn-close" onclick="this.parentElement.remove()">×</button>';
    
    // Toast'ı sayfaya ekle
    document.body.appendChild(toast);
    
    // 5 saniye sonra otomatik kaldır
    setTimeout(function() {
        if (toast.parentElement) {
            toast.remove();
        }
        alertContainer.innerHTML = '';
    }, 5000);
}

// Loading durumunu kontrol etme
function setLoading(isLoading) {
    if (isLoading) {
        registerBtn.disabled = true;
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kayıt yapılıyor...';
    } else {
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Kayıt Ol';
    }
}

// Form validasyonu
function validateForm() {
    var restaurantName = document.getElementById('restaurantName').value.trim();
    var ownerFirstName = document.getElementById('ownerFirstName').value.trim();
    var ownerLastName = document.getElementById('ownerLastName').value.trim();
    var email = document.getElementById('email').value.trim();
    var phone = document.getElementById('phone').value.trim();
    var password = document.getElementById('password').value;
    var confirmPassword = document.getElementById('confirmPassword').value;
    
    // Zorunlu alanlar kontrolü
    if (!restaurantName || !ownerFirstName || !ownerLastName || !email || !phone || !password || !confirmPassword) {
        showToast('Lütfen tüm zorunlu alanları doldurun.', 'error');
        return false;
    }
    
    // Email formatı kontrolü
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Geçerli bir e-posta adresi girin.', 'error');
        return false;
    }
    
    // Şifre uzunluğu kontrolü
    if (password.length < 6) {
        showToast('Şifre en az 6 karakter olmalıdır.', 'error');
        return false;
    }
    
    // Şifre eşleşme kontrolü
    if (password !== confirmPassword) {
        showToast('Şifreler eşleşmiyor.', 'error');
        return false;
    }
    
    // Telefon formatı kontrolü (basit)
    var phoneRegex = /^[0-9+\-\s\(\)]+$/;
    if (!phoneRegex.test(phone)) {
        showToast('Geçerli bir telefon numarası girin.', 'error');
        return false;
    }
    
    return true;
}

// Form submit eventi
registerForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    setLoading(true);
    alertContainer.innerHTML = '';
    
    // Form verilerini topla
    var formData = {
        restaurantName: document.getElementById('restaurantName').value.trim(),
        ownerFirstName: document.getElementById('ownerFirstName').value.trim(),
        ownerLastName: document.getElementById('ownerLastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        password: document.getElementById('password').value,
        address: document.getElementById('address').value.trim(),
        city: document.getElementById('city').value.trim(),
        plan: document.getElementById('plan').value
    };
    
    // Kayıt API çağrısı
    fetch('/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(function(response) {
        return response.json().then(function(data) {
            return { status: response.status, data: data };
        });
    })
    .then(function(result) {
        setLoading(false);
        
        if (result.status === 201) {
            showToast('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...', 'success');
            
            // 2 saniye sonra login sayfasına yönlendir
            setTimeout(function() {
                window.location.href = '/login.html';
            }, 2000);
        } else {
            showToast(result.data.message || 'Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.', 'error');
        }
    })
    .catch(function(error) {
        setLoading(false);
        console.error('Register error:', error);
        showToast('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    });
});

// Şifre eşleşme kontrolü (real-time)
document.getElementById('confirmPassword').addEventListener('input', function() {
    var password = document.getElementById('password').value;
    var confirmPassword = this.value;
    
    if (confirmPassword && password !== confirmPassword) {
        this.style.borderColor = '#dc3545';
    } else {
        this.style.borderColor = '#e1e5e9';
    }
});

// Sayfa yüklendiğinde focus
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('restaurantName').focus();
});