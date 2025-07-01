from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import base64
import hashlib
import secrets
from Crypto.Cipher import DES, PKCS1_OAEP
from Crypto.PublicKey import RSA
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA256
from Crypto.Util.Padding import pad, unpad
import uuid
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(16)
socketio = SocketIO(app, cors_allowed_origins="*")

# Lưu trữ thông tin người dùng và phòng chat
users = {}
rooms = {}
user_keys = {}  # Lưu trữ khóa RSA của người dùng

class SecureChat:
    def __init__(self):
        self.generate_rsa_keys()
    
    def generate_rsa_keys(self):
        """Tạo cặp khóa RSA 2048-bit"""
        key = RSA.generate(2048)
        self.private_key = key
        self.public_key = key.publickey()
        return {
            'private': key.export_key().decode(),
            'public': key.publickey().export_key().decode()
        }
    
    def generate_des_key(self):
        """Tạo khóa DES 8 bytes"""
        return secrets.token_bytes(8)
    
    def encrypt_des_cfb(self, plaintext, key):
        """Mã hóa DES CFB mode"""
        iv = secrets.token_bytes(8)
        cipher = DES.new(key, DES.MODE_CFB, iv)
        ciphertext = cipher.encrypt(plaintext.encode())
        return base64.b64encode(iv + ciphertext).decode()
    
    def decrypt_des_cfb(self, ciphertext_b64, key):
        """Giải mã DES CFB mode"""
        try:
            data = base64.b64decode(ciphertext_b64)
            iv = data[:8]
            ciphertext = data[8:]
            cipher = DES.new(key, DES.MODE_CFB, iv)
            plaintext = cipher.decrypt(ciphertext)
            return plaintext.decode()
        except Exception as e:
            return None
    
    def encrypt_rsa_oaep(self, data, public_key):
        """Mã hóa RSA OAEP"""
        cipher = PKCS1_OAEP.new(public_key, hashAlgo=SHA256)
        if isinstance(data, str):
            data = data.encode()
        encrypted = cipher.encrypt(data)
        return base64.b64encode(encrypted).decode()
    
    def decrypt_rsa_oaep(self, encrypted_b64, private_key):
        """Giải mã RSA OAEP"""
        try:
            cipher = PKCS1_OAEP.new(private_key, hashAlgo=SHA256)
            encrypted = base64.b64decode(encrypted_b64)
            decrypted = cipher.decrypt(encrypted)
            return decrypted
        except Exception as e:
            return None
    
    def sign_rsa_sha256(self, data, private_key):
        """Ký RSA với SHA-256"""
        h = SHA256.new(data.encode() if isinstance(data, str) else data)
        signature = pkcs1_15.new(private_key).sign(h)
        return base64.b64encode(signature).decode()
    
    def verify_rsa_sha256(self, data, signature_b64, public_key):
        """Xác thực chữ ký RSA"""
        try:
            h = SHA256.new(data.encode() if isinstance(data, str) else data)
            signature = base64.b64decode(signature_b64)
            pkcs1_15.new(public_key).verify(h, signature)
            return True
        except Exception as e:
            return False
    
    def calculate_sha256(self, data):
        """Tính hash SHA-256"""
        if isinstance(data, str):
            data = data.encode()
        return hashlib.sha256(data).hexdigest()

# Khởi tạo đối tượng bảo mật
secure_chat = SecureChat()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/register')
def register():
    return render_template('register.html')

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')
    # Xóa người dùng khỏi danh sách
    for username, user_data in list(users.items()):
        if user_data['sid'] == request.sid:
            if user_data.get('room'):
                leave_room(user_data['room'])
                emit('user_left', {'username': username}, room=user_data['room'])
            del users[username]
            if username in user_keys:
                del user_keys[username]
            break

@socketio.on('register_user')
def handle_register(data):
    username = data['username']
    password = data.get('password')
    if username in users:
        emit('register_response', {'success': False, 'message': 'Tên người dùng đã tồn tại'})
        return
    if not password or len(password) < 4:
        emit('register_response', {'success': False, 'message': 'Mật khẩu phải có ít nhất 4 ký tự'})
        return
    # Hash password
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    # Tạo khóa RSA cho người dùng
    keys = secure_chat.generate_rsa_keys()
    user_keys[username] = {
        'private': RSA.import_key(keys['private']),
        'public': RSA.import_key(keys['public'])
    }
    users[username] = {
        'sid': request.sid,
        'public_key': keys['public'],
        'room': None,
        'online': True,
        'password_hash': password_hash
    }
    emit('register_response', {
        'success': True, 
        'message': 'Đăng ký thành công',
        'public_key': keys['public']
    })

@socketio.on('login_user')
def handle_login(data):
    username = data['username']
    password = data.get('password')
    if username not in users:
        emit('login_response', {'success': False, 'message': 'Người dùng không tồn tại'})
        return
    password_hash = hashlib.sha256(password.encode()).hexdigest() if password else ''
    if users[username]['password_hash'] != password_hash:
        emit('login_response', {'success': False, 'message': 'Sai mật khẩu'})
        return
    users[username]['sid'] = request.sid
    users[username]['online'] = True
    emit('login_response', {
        'success': True,
        'message': 'Đăng nhập thành công',
        'username': username,
        'public_key': users[username]['public_key']
    })

@socketio.on('get_users')
def handle_get_users():
    online_users = [{'username': u, 'public_key': data['public_key']} 
                   for u, data in users.items() if data['online']]
    emit('users_list', {'users': online_users})

@socketio.on('create_room')
def handle_create_room(data):
    username = data['username']
    partner = data['partner']
    
    if username not in users or partner not in users:
        emit('error', {'message': 'Người dùng không tồn tại'})
        return
    
    room_id = f"{min(username, partner)}_{max(username, partner)}"
    
    if room_id not in rooms:
        rooms[room_id] = {
            'users': [username, partner],
            'created_at': datetime.now(),
            'handshake_complete': False,
            'des_key': None
        }
    
    users[username]['room'] = room_id
    join_room(room_id)
    
    emit('room_created', {'room_id': room_id, 'partner': partner})
    emit('room_invitation', {
        'room_id': room_id,
        'inviter': username,
        'public_key': users[username]['public_key']
    }, room=users[partner]['sid'])

@socketio.on('join_room')
def handle_join_room(data):
    username = data['username']
    room_id = data['room_id']
    
    if room_id not in rooms:
        emit('error', {'message': 'Phòng không tồn tại'})
        return
    
    users[username]['room'] = room_id
    join_room(room_id)
    
    emit('room_joined', {'room_id': room_id})
    emit('user_joined', {'username': username}, room=room_id, include_self=False)
    
    # Bắt đầu handshake
    emit('start_handshake', {
        'message': 'Hello!',
        'from': username
    }, room=room_id, include_self=False)

@socketio.on('handshake_response')
def handle_handshake_response(data):
    room_id = data['room_id']
    username = data['username']
    
    if room_id in rooms:
        rooms[room_id]['handshake_complete'] = True
        emit('handshake_ready', {
            'message': 'Ready!',
            'from': username
        }, room=room_id, include_self=False)

@socketio.on('exchange_keys')
def handle_exchange_keys(data):
    username = data['username']
    room_id = data['room_id']
    
    if room_id not in rooms:
        emit('error', {'message': 'Phòng không tồn tại'})
        return
    
    # Tạo khóa DES và mã hóa bằng RSA công khai của đối tác
    des_key = secure_chat.generate_des_key()
    rooms[room_id]['des_key'] = des_key
    
    # Tìm đối tác
    partner = None
    for user in rooms[room_id]['users']:
        if user != username:
            partner = user
            break
    
    if not partner or partner not in users:
        emit('error', {'message': 'Không tìm thấy đối tác'})
        return
    
    # Ký ID bằng RSA private key
    signed_info = secure_chat.sign_rsa_sha256(username, user_keys[username]['private'])
    
    # Mã hóa khóa DES bằng RSA public key của đối tác
    encrypted_des_key = secure_chat.encrypt_rsa_oaep(des_key, user_keys[partner]['public'])
    
    emit('key_exchange', {
        'signed_info': signed_info,
        'encrypted_des_key': encrypted_des_key,
        'from': username
    }, room=users[partner]['sid'])

@socketio.on('send_message')
def handle_send_message(data):
    username = data['username']
    message = data['message']
    room_id = data['room_id']
    
    if room_id not in rooms or not rooms[room_id]['des_key']:
        emit('error', {'message': 'Phòng chưa sẵn sàng hoặc chưa trao đổi khóa'})
        return
    
    try:
        # Mã hóa tin nhắn bằng DES
        des_key = rooms[room_id]['des_key']
        cipher = secure_chat.encrypt_des_cfb(message, des_key)
        
        # Tính hash SHA-256 của ciphertext
        message_hash = secure_chat.calculate_sha256(cipher)
        
        # Ký hash bằng RSA
        signature = secure_chat.sign_rsa_sha256(cipher, user_keys[username]['private'])
        
        # Gói tin gửi
        encrypted_package = {
            'cipher': cipher,
            'hash': message_hash,
            'sig': signature,
            'from': username,
            'timestamp': datetime.now().isoformat()
        }
        
        emit('encrypted_message', encrypted_package, room=room_id, include_self=False)
        emit('message_sent', {'status': 'sent'})
        
    except Exception as e:
        emit('error', {'message': f'Lỗi mã hóa: {str(e)}'})

@socketio.on('decrypt_message')
def handle_decrypt_message(data):
    username = data['username']
    room_id = data['room_id']
    encrypted_package = data['package']
    
    if room_id not in rooms or not rooms[room_id]['des_key']:
        emit('error', {'message': 'Phòng chưa sẵn sàng'})
        return
    
    try:
        # Tìm đối tác để lấy public key
        sender = encrypted_package['from']
        if sender not in user_keys:
            emit('decrypt_response', {
                'success': False,
                'reason': 'Không tìm thấy khóa người gửi'
            })
            return
        
        # Kiểm tra tính toàn vẹn bằng SHA-256
        calculated_hash = secure_chat.calculate_sha256(encrypted_package['cipher'])
        if calculated_hash != encrypted_package['hash']:
            emit('decrypt_response', {
                'success': False,
                'reason': 'Lỗi hash - Tin nhắn có thể bị thay đổi'
            })
            return
        
        # Xác thực chữ ký RSA
        if not secure_chat.verify_rsa_sha256(
            encrypted_package['cipher'],
            encrypted_package['sig'],
            user_keys[sender]['public']
        ):
            emit('decrypt_response', {
                'success': False,
                'reason': 'Lỗi chữ ký - Không xác thực được người gửi'
            })
            return
        
        # Giải mã nội dung tin nhắn
        des_key = rooms[room_id]['des_key']
        decrypted_message = secure_chat.decrypt_des_cfb(encrypted_package['cipher'], des_key)
        
        if decrypted_message is None:
            emit('decrypt_response', {
                'success': False,
                'reason': 'Lỗi giải mã DES'
            })
            return
        
        emit('decrypt_response', {
            'success': True,
            'message': decrypted_message,
            'from': sender,
            'timestamp': encrypted_package['timestamp']
        })
        
        # Gửi ACK xác nhận
        emit('message_ack', {'status': 'received'}, room=users[sender]['sid'])
        
    except Exception as e:
        emit('decrypt_response', {
            'success': False,
            'reason': f'Lỗi xử lý: {str(e)}'
        })

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)