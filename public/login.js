// Login sayfası JavaScript fonksiyonları
var loginForm = document.getElementById('loginForm');
var loginBtn = document.getElementById('loginBtn');
var loading = document.getElementById('loading');
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
        loading.style.display = 'block';
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş yapılıyor...';
    } else {
        loading.style.display = 'none';
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Giriş Yap';
    }
}

// Form submit eventi
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;
    
    // Basit validasyon
    if (!email || !password) {
        showToast('Lütfen tüm alanları doldurun.', 'error');
        return;
    }
    
    // Email formatı kontrolü
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Geçerli bir e-posta adresi girin.', 'error');
        return;
    }
    
    setLoading(true);
    alertContainer.innerHTML = '';
    
    // Login API çağrısı
    fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    .then(function(response) {
        return response.json().then(function(data) {
            return { status: response.status, data: data };
        });
    })
    .then(function(result) {
        setLoading(false);
        
        if (result.status === 200) {
            showToast('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
            
            // 1.5 saniye sonra ana sayfaya yönlendir
            setTimeout(function() {
                window.location.href = '/';
            }, 1500);
        } else {
            showToast(result.data.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.', 'error');
        }
    })
    .catch(function(error) {
        setLoading(false);
        console.error('Login error:', error);
        showToast('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    });
});

// Kayıt ol linki
document.getElementById('registerLink').addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = '/register.html';
});

// Enter tuşu ile form submit
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !loginBtn.disabled) {
        loginForm.dispatchEvent(new Event('submit'));
    }
});

// Sayfa yüklendiğinde focus
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('email').focus();
});