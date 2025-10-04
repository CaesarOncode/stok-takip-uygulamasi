// Kullanıcı yönetimi JavaScript fonksiyonları

let currentUsers = [];
let editingUserId = null;

// Sayfa yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadUsers();
});

// Kullanıcıları yükle
async function loadUsers() {
    try {
        showLoading();
        
        const response = await fetch('/api/users', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            if (response.status === 403) {
                showError('Bu sayfaya erişim yetkiniz yok.');
                return;
            }
            throw new Error('Kullanıcılar yüklenemedi');
        }

        const data = await response.json();
        currentUsers = data.users || [];
        
        hideLoading();
        displayUsers();
        
    } catch (error) {
        console.error('Kullanıcılar yüklenirken hata:', error);
        hideLoading();
        if (error.message.includes('Unexpected token')) {
            window.location.href = '/login.html';
        } else {
            showError('Kullanıcılar yüklenirken bir hata oluştu: ' + error.message);
        }
    }
}

// Kullanıcıları tabloda göster
function displayUsers() {
    const tableBody = document.getElementById('usersTableBody');
    const table = document.getElementById('usersTable');
    const emptyState = document.getElementById('emptyUsers');

    if (currentUsers.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';

    tableBody.innerHTML = '';

    currentUsers.forEach(user => {
        const row = document.createElement('tr');
        
        // Kullanıcı adının ilk harfini avatar için al
        const avatarLetter = (user.profile?.firstName || user.username || 'U').charAt(0).toUpperCase();
        
        // Rol çevirisi
        const roleText = {
            'owner': 'Sahip',
            'manager': 'Yönetici', 
            'employee': 'Çalışan'
        }[user.role] || user.role;

        // Son giriş tarihi formatla
        const lastLogin = user.lastLogin ? 
            new Date(user.lastLogin).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'Hiç giriş yapmamış';

        row.innerHTML = `
            <td>
                <div class="user-info">
                    <div class="user-avatar">${avatarLetter}</div>
                    <div class="user-details">
                        <h4>${user.profile?.firstName || ''} ${user.profile?.lastName || ''}</h4>
                        <p>@${user.username}</p>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="role-badge role-${user.role}">${roleText}</span>
            </td>
            <td>
                <span class="status-badge status-${user.isActive ? 'active' : 'inactive'}">
                    ${user.isActive ? 'Aktif' : 'Pasif'}
                </span>
            </td>
            <td>${lastLogin}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editUser('${user._id}')" title="Düzenle">
                        ✏️
                    </button>
                    <button class="btn-password" onclick="openPasswordModal('${user._id}')" title="Şifre Değiştir">
                        🔑
                    </button>
                    <button class="btn-delete" onclick="deleteUser('${user._id}')" title="Sil">
                        🗑️
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

// Yeni kullanıcı ekleme modalını aç
function openAddUserModal() {
    editingUserId = null;
    document.getElementById('modalTitle').textContent = 'Yeni Kullanıcı Ekle';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('password').required = true;
    document.getElementById('userModal').style.display = 'block';
}

// Kullanıcı düzenleme modalını aç
function editUser(userId) {
    const user = currentUsers.find(u => u._id === userId);
    if (!user) {
        showError('Kullanıcı bulunamadı');
        return;
    }

    editingUserId = userId;
    document.getElementById('modalTitle').textContent = 'Kullanıcı Düzenle';
    
    // Form alanlarını doldur
    document.getElementById('userId').value = user._id;
    document.getElementById('username').value = user.username;
    document.getElementById('email').value = user.email;
    document.getElementById('firstName').value = user.profile?.firstName || '';
    document.getElementById('lastName').value = user.profile?.lastName || '';
    document.getElementById('phone').value = user.profile?.phone || '';
    document.getElementById('role').value = user.role;
    
    // Şifre alanını gizle (düzenlemede şifre değiştirilmez)
    document.getElementById('passwordGroup').style.display = 'none';
    document.getElementById('password').required = false;
    
    document.getElementById('userModal').style.display = 'block';
}

// Kullanıcı modalını kapat
function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    editingUserId = null;
}

// Kullanıcı kaydet
async function saveUser() {
    try {
        const form = document.getElementById('userForm');
        const formData = new FormData(form);
        
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            profile: {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                phone: formData.get('phone')
            },
            role: formData.get('role')
        };

        // Yeni kullanıcı ekleme durumunda şifre zorunlu
        if (!editingUserId) {
            const password = formData.get('password');
            if (!password || password.length < 6) {
                showError('Şifre en az 6 karakter olmalıdır');
                return;
            }
            userData.password = password;
        }

        const url = editingUserId ? `/api/users/${editingUserId}` : '/api/users';
        const method = editingUserId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'İşlem başarısız');
        }

        showSuccess(editingUserId ? 'Kullanıcı başarıyla güncellendi' : 'Kullanıcı başarıyla eklendi');
        closeUserModal();
        loadUsers();

    } catch (error) {
        console.error('Kullanıcı kaydedilirken hata:', error);
        showError('Kullanıcı kaydedilirken bir hata oluştu: ' + error.message);
    }
}

// Kullanıcı sil
async function deleteUser(userId) {
    const user = currentUsers.find(u => u._id === userId);
    if (!user) {
        showError('Kullanıcı bulunamadı');
        return;
    }

    const userName = user.profile?.firstName && user.profile?.lastName ? 
        `${user.profile.firstName} ${user.profile.lastName}` : user.username;

    if (!confirm(`"${userName}" kullanıcısını silmek istediğinizden emin misiniz?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Kullanıcı silinemedi');
        }

        showSuccess('Kullanıcı başarıyla silindi');
        loadUsers();

    } catch (error) {
        console.error('Kullanıcı silinirken hata:', error);
        showError('Kullanıcı silinirken bir hata oluştu: ' + error.message);
    }
}

// Şifre değiştirme modalını aç
function openPasswordModal(userId) {
    const user = currentUsers.find(u => u._id === userId);
    if (!user) {
        showError('Kullanıcı bulunamadı');
        return;
    }

    document.getElementById('passwordUserId').value = userId;
    document.getElementById('passwordForm').reset();
    document.getElementById('passwordModal').style.display = 'block';
}

// Şifre değiştirme modalını kapat
function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
}

// Şifre değiştir
async function changePassword() {
    try {
        const form = document.getElementById('passwordForm');
        const formData = new FormData(form);
        
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');
        const userId = formData.get('passwordUserId');

        if (!newPassword || newPassword.length < 6) {
            showError('Şifre en az 6 karakter olmalıdır');
            return;
        }

        if (newPassword !== confirmPassword) {
            showError('Şifreler eşleşmiyor');
            return;
        }

        const response = await fetch(`/api/users/${userId}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ newPassword })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Şifre değiştirilemedi');
        }

        showSuccess('Şifre başarıyla değiştirildi');
        closePasswordModal();

    } catch (error) {
        console.error('Şifre değiştirilirken hata:', error);
        showError('Şifre değiştirilirken bir hata oluştu: ' + error.message);
    }
}

// Yükleme durumunu göster
function showLoading() {
    document.getElementById('loadingUsers').style.display = 'block';
    document.getElementById('usersTable').style.display = 'none';
    document.getElementById('emptyUsers').style.display = 'none';
}

// Yükleme durumunu gizle
function hideLoading() {
    document.getElementById('loadingUsers').style.display = 'none';
}

// Başarı mesajı göster
function showSuccess(message) {
    // Basit alert kullanıyoruz, daha sonra toast notification eklenebilir
    alert('✅ ' + message);
}

// Hata mesajı göster
function showError(message) {
    // Basit alert kullanıyoruz, daha sonra toast notification eklenebilir
    alert('❌ ' + message);
}

// Modal dışına tıklandığında kapat
window.onclick = function(event) {
    const userModal = document.getElementById('userModal');
    const passwordModal = document.getElementById('passwordModal');
    
    if (event.target === userModal) {
        closeUserModal();
    }
    
    if (event.target === passwordModal) {
        closePasswordModal();
    }
}

// ESC tuşu ile modal kapat
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeUserModal();
        closePasswordModal();
    }
});

// Yetki kontrolü
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        
        // Sadece owner ve manager rolü bu sayfaya erişebilir
        if (data.data.user.role !== 'owner' && data.data.user.role !== 'manager') {
            showError('Bu sayfaya erişim yetkiniz yok.');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }

        // Kullanıcı bilgilerini navbar'da göster
        if (data.data.restaurant) {
            document.getElementById('restaurantName').textContent = data.data.restaurant.name || 'Restoran';
        }
        
        const userName = data.data.user.profile?.firstName && data.data.user.profile?.lastName ? 
            `${data.data.user.profile.firstName} ${data.data.user.profile.lastName}` : data.data.user.username;
        document.getElementById('userName').textContent = userName;

    } catch (error) {
        console.error('Yetki kontrolü hatası:', error);
        window.location.href = '/login.html';
    }
}

// Çıkış yap
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Çıkış yapılırken hata:', error);
        window.location.href = '/login.html';
    }
}