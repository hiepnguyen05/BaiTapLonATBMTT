// Socket.IO client
const socket = io();

// Global variables
let currentUser = null;
let currentRoom = null;
let currentPartner = null;
let isAuthenticated = false;
let handshakeComplete = false;
let keyExchangeComplete = false;

// DOM elements
const authPanel = document.getElementById('auth-panel');
const chatInterface = document.getElementById('chat-interface');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const usersList = document.getElementById('users-list');
const refreshUsersBtn = document.getElementById('refresh-users');
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const messageInputArea = document.getElementById('message-input-area');
const roomTitle = document.getElementById('room-title');
const securityStatus = document.getElementById('security-status');
const connectionStatus = document.getElementById('connection-status');
const notifications = document.getElementById('notifications');
const loadingOverlay = document.getElementById('loading-overlay');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updateConnectionStatus('connecting');
});

// Event Listeners
function setupEventListeners() {
    // Auth forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    showRegisterLink.addEventListener('click', showRegister);
    showLoginLink.addEventListener('click', showLogin);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Chat functions
    messageForm.addEventListener('submit', handleSendMessage);
    refreshUsersBtn.addEventListener('click', refreshUsers);
    
    // Socket events
    setupSocketListeners();
}

function setupSocketListeners() {
    // Connection events
    socket.on('connect', () => {
        updateConnectionStatus('connected');
        if (currentUser) {
            refreshUsers();
        }
    });
    
    socket.on('disconnect', () => {
        updateConnectionStatus('disconnected');
        showNotification('Mất kết nối với server', 'error');
    });
    
    // Auth events
    socket.on('register_response', handleRegisterResponse);
    socket.on('login_response', handleLoginResponse);
    socket.on('users_list', handleUsersList);
    
    // Room events
    socket.on('room_created', handleRoomCreated);
    socket.on('room_invitation', handleRoomInvitation);
    socket.on('room_joined', handleRoomJoined);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    
    // Handshake events
    socket.on('start_handshake', handleStartHandshake);
    socket.on('handshake_ready', handleHandshakeReady);
    
    // Key exchange events
    socket.on('key_exchange', handleKeyExchange);
    
    // Message events
    socket.on('encrypted_message', handleEncryptedMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('message_ack', handleMessageAck);
    socket.on('decrypt_response', handleDecryptResponse);
    
    // Error events
    socket.on('error', handleError);
}

// Authentication functions
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username || !password) {
        showNotification('Vui lòng nhập tên người dùng và mật khẩu', 'error');
        return;
    }
    showLoading(true);
    socket.emit('login_user', { username, password });
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    if (!username || !password) {
        showNotification('Vui lòng nhập tên người dùng và mật khẩu', 'error');
        return;
    }
    showLoading(true);
    socket.emit('register_user', { username, password });
}

function handleLoginResponse(data) {
    showLoading(false);
    if (data.success) {
        currentUser = data.username;
        isAuthenticated = true;
        showChatInterface();
        showNotification('Đăng nhập thành công!', 'success');
        refreshUsers();
    } else {
        showNotification(data.message, 'error');
    }
}

function handleRegisterResponse(data) {
    showLoading(false);
    if (data.success) {
        showNotification('Đăng ký thành công! Hãy đăng nhập.', 'success');
        showLogin();
    } else {
        showNotification(data.message, 'error');
    }
}

function handleLogout() {
    currentUser = null;
    currentRoom = null;
    currentPartner = null;
    isAuthenticated = false;
    handshakeComplete = false;
    keyExchangeComplete = false;
    
    showAuthPanel();
    socket.disconnect();
    socket.connect();
    showNotification('Đã đăng xuất', 'info');
}

// UI functions
function showAuthPanel() {
    authPanel.style.display = 'flex';
    chatInterface.style.display = 'none';
    usernameDisplay.textContent = 'Chưa đăng nhập';
    logoutBtn.style.display = 'none';
}

function showChatInterface() {
    authPanel.style.display = 'none';
    chatInterface.style.display = 'flex';
    usernameDisplay.textContent = currentUser;
    logoutBtn.style.display = 'block';
}

function showRegister() {
    document.getElementById('login-form').parentElement.style.display = 'none';
    document.getElementById('register-card').style.display = 'block';
}

function showLogin() {
    document.getElementById('register-card').style.display = 'none';
    document.getElementById('login-form').parentElement.style.display = 'block';
}

// Users list functions
function refreshUsers() {
    if (!isAuthenticated) return;
    socket.emit('get_users');
}

function handleUsersList(data) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    
    const onlineUsers = data.users.filter(user => user.username !== currentUser);
    
    if (onlineUsers.length === 0) {
        usersList.innerHTML = '<div class="loading">Không có người dùng nào khác online</div>';
        return;
    }
    
    onlineUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="user-name">${user.username}</div>
            <div class="user-status">
                <i class="fas fa-circle"></i>
                Online
            </div>
        `;
        
        userItem.addEventListener('click', () => {
            selectUser(user.username);
        });
        
        usersList.appendChild(userItem);
    });
}

function selectUser(username) {
    // Remove active class from all users
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected user
    event.target.closest('.user-item').classList.add('active');
    
    currentPartner = username;
    createRoom(username);
}

// Room functions
function createRoom(partner) {
    showLoading(true);
    socket.emit('create_room', {
        username: currentUser,
        partner: partner
    });
}

function handleRoomCreated(data) {
    showLoading(false);
    currentRoom = data.room_id;
    currentPartner = data.partner;
    
    updateRoomUI();
    showNotification(`Đã tạo phòng chat với ${currentPartner}`, 'success');
}

function handleRoomInvitation(data) {
    showNotification(`${data.inviter} mời bạn vào phòng chat`, 'info');
    
    // Auto join room
    socket.emit('join_room', {
        username: currentUser,
        room_id: data.room_id
    });
}

function handleRoomJoined(data) {
    currentRoom = data.room_id;
    updateRoomUI();
    updateSecurityStatus('handshaking', 'Đang thực hiện handshake...');
}

function handleUserJoined(data) {
    addSystemMessage(`${data.username} đã tham gia cuộc trò chuyện`);
}

function handleUserLeft(data) {
    addSystemMessage(`${data.username} đã rời khỏi cuộc trò chuyện`);
    resetRoomState();
}

function updateRoomUI() {
    if (currentPartner) {
        roomTitle.textContent = `Chat với ${currentPartner}`;
        messagesContainer.innerHTML = '';
        messageInputArea.style.display = 'block';
    }
}

function resetRoomState() {
    currentRoom = null;
    currentPartner = null;
    handshakeComplete = false;
    keyExchangeComplete = false;
    
    roomTitle.textContent = 'Chọn người để bắt đầu chat';
    updateSecurityStatus('disconnected', 'Chưa kết nối');
    messageInputArea.style.display = 'none';
    
    // Reset welcome message
    messagesContainer.innerHTML = `
        <div class="welcome-message">
            <i class="fas fa-comments"></i>
            <h3>Chào mừng đến với Secure Chat!</h3>
            <p>Chọn một người dùng từ danh sách bên trái để bắt đầu cuộc trò chuyện bảo mật.</p>
            <div class="security-features">
                <div class="feature">
                    <i class="fas fa-lock"></i>
                    <span>Mã hóa DES CFB</span>
                </div>
                <div class="feature">
                    <i class="fas fa-key"></i>
                    <span>Xác thực RSA 2048-bit</span>
                </div>
                <div class="feature">
                    <i class="fas fa-shield-check"></i>
                    <span>Kiểm tra toàn vẹn SHA-256</span>
                </div>
            </div>
        </div>
    `;
}

// Handshake functions
function handleStartHandshake(data) {
    addSystemMessage(`Handshake từ ${data.from}: ${data.message}`, 'handshake');
    
    // Respond with "Ready!"
    socket.emit('handshake_response', {
        username: currentUser,
        room_id: currentRoom
    });
}

function handleHandshakeReady(data) {
    addSystemMessage(`${data.from} phản hồi: ${data.message}`, 'handshake');
    handshakeComplete = true;
    
    updateSecurityStatus('key-exchange', 'Đang trao đổi khóa...');
    
    // Start key exchange
    socket.emit('exchange_keys', {
        username: currentUser,
        room_id: currentRoom
    });
}

function handleKeyExchange(data) {
    addSystemMessage(`Nhận được khóa từ ${data.from}`, 'handshake');
    keyExchangeComplete = true;
    updateSecurityStatus('secure', 'Kết nối bảo mật');
    showNotification('Kết nối bảo mật đã được thiết lập!', 'success');
}

// Message functions
function handleSendMessage(e) {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    if (!currentRoom || !keyExchangeComplete) {
        showNotification('Chưa sẵn sàng gửi tin nhắn', 'error');
        return;
    }
    
    // Add message to UI immediately
    addMessage(message, 'sent', 'Đang gửi...');
    
    // Send encrypted message
    socket.emit('send_message', {
        username: currentUser,
        message: message,
        room_id: currentRoom
    });
    
    messageInput.value = '';
}

function handleEncryptedMessage(data) {
    // Decrypt message
    socket.emit('decrypt_message', {
        username: currentUser,
        room_id: currentRoom,
        package: data
    });
}

function handleDecryptResponse(data) {
    if (data.success) {
        addMessage(data.message, 'received', data.from, data.timestamp);
    } else {
        addSystemMessage(`Lỗi giải mã: ${data.reason}`, 'error');
    }
}

function handleMessageSent(data) {
    updateLastMessageStatus('sent');
}

function handleMessageAck(data) {
    updateLastMessageStatus('delivered');
}

function addMessage(content, type, sender = null, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    const senderName = type === 'sent' ? 'Bạn' : (sender || currentPartner);
    
    messageDiv.innerHTML = `
        <div class="message-content">${content}</div>
        <div class="message-info">
            <span>${senderName}</span>
            <span>${time}</span>
            <div class="message-status">
                <i class="fas fa-clock"></i>
                <span>Đang gửi...</span>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function addSystemMessage(content, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `system-message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas ${type === 'handshake' ? 'fa-handshake' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
        ${content}
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function updateLastMessageStatus(status) {
    const messages = messagesContainer.querySelectorAll('.message.sent');
    if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const statusElement = lastMessage.querySelector('.message-status');
        
        if (statusElement) {
            statusElement.className = `message-status ${status}`;
            
            let icon = 'fa-clock';
            let text = 'Đang gửi...';
            
            switch (status) {
                case 'sent':
                    icon = 'fa-check';
                    text = 'Đã gửi';
                    break;
                case 'delivered':
                    icon = 'fa-check-double';
                    text = 'Đã nhận';
                    break;
                case 'error':
                    icon = 'fa-exclamation-triangle';
                    text = 'Lỗi';
                    break;
            }
            
            statusElement.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${text}</span>
            `;
        }
    }
}

// Utility functions
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    statusElement.className = `connection-status ${status}`;
    
    let icon = 'fa-wifi';
    let text = 'Đang kết nối...';
    
    switch (status) {
        case 'connected':
            icon = 'fa-wifi';
            text = 'Đã kết nối';
            break;
        case 'disconnected':
            icon = 'fa-wifi';
            text = 'Mất kết nối';
            break;
        case 'connecting':
            icon = 'fa-spinner fa-spin';
            text = 'Đang kết nối...';
            break;
    }
    
    statusElement.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${text}</span>
    `;
}

function updateSecurityStatus(status, text) {
    const statusElement = document.getElementById('security-status');
    statusElement.className = `security-status ${status}`;
    statusElement.innerHTML = `
        <i class="fas fa-shield-alt"></i>
        <span>${text}</span>
    `;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'fa-info-circle';
    switch (type) {
        case 'success':
            icon = 'fa-check-circle';
            break;
        case 'error':
            icon = 'fa-exclamation-circle';
            break;
        case 'warning':
            icon = 'fa-exclamation-triangle';
            break;
    }
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    notifications.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

function handleError(data) {
    showNotification(data.message, 'error');
    showLoading(false);
}

// Auto-refresh users every 30 seconds
setInterval(() => {
    if (isAuthenticated) {
        refreshUsers();
    }
}, 30000);