<div>
<div align="center">
  <h1>🔐 ỨNG DỤNG NHẮN TIN BẢO MẬT BẰNG DES & RSA</h1>
  <p>
    Đây là một ứng dụng web được phát triển bằng <strong>Python Flask</strong>, kết hợp các thuật toán mã hóa và xác thực hiện đại nhằm đảm bảo <strong>tính bảo mật, toàn vẹn và xác thực</strong> trong quá trình trao đổi tin nhắn giữa người dùng.
  </p>
</div>

<div>
  <h2>📌 Giới thiệu ứng dụng</h2>
  <p>
    Ứng dụng nhắn tin bảo mật này cho phép người dùng đăng ký tài khoản, đăng nhập và nhắn tin qua giao diện web. Tất cả tin nhắn được <strong>mã hóa bằng thuật toán DES (Chế độ CFB)</strong> trước khi gửi và <strong>giải mã tại phía nhận</strong>. Ngoài ra, để tăng cường an toàn, hệ thống sử dụng <strong>RSA 2048-bit</strong> để trao đổi khóa và xác thực người dùng.
  </p>
  <p>
    Thông qua đó, hệ thống không chỉ đảm bảo rằng nội dung tin nhắn không bị lộ khi truyền tải, mà còn đảm bảo rằng người gửi và người nhận đều được xác thực, giảm thiểu nguy cơ giả mạo danh tính.
  </p>
</div>

<div>
  <h2>🛠️ Công nghệ và thuật toán sử dụng</h2>
  <ul>
    <li>🌐 Framework: <strong>Flask</strong> (Python)</li>
    <li>📂 Giao diện: HTML, CSS, JavaScript</li>
    <li>🔒 <strong>DES (Data Encryption Standard)</strong> – sử dụng chế độ CFB (Cipher Feedback) để mã hóa nội dung tin nhắn</li>
    <li>🔐 <strong>RSA 2048-bit</strong> – dùng để mã hóa khóa đối xứng, xác thực người gửi (kết hợp OAEP + SHA-256)</li>
    <li>🧾 <strong>SHA-256</strong> – để kiểm tra toàn vẹn nội dung tin nhắn</li>
  </ul>
</div>

<div>
  <h2>✨ Các chức năng nổi bật</h2>
  <ul>
    <li>🔐 <strong>Đăng ký người dùng</strong> với sinh khóa RSA cá nhân</li>
    <li>🔑 <strong>Đăng nhập an toàn</strong> với xác thực người dùng</li>
    <li>💬 <strong>Gửi và nhận tin nhắn</strong> đã được mã hóa toàn bộ bằng DES</li>
    <li>🔁 <strong>Chia sẻ khóa phiên</strong> bằng RSA</li>
    <li>📜 <strong>Xác minh chữ ký</strong> số và kiểm tra toàn vẹn tin nhắn</li>
  </ul>
</div>

<div>
  <h2>🖼️ Hình ảnh minh họa</h2>

  <h3>📥 Trang Đăng Ký</h3>
  <img src="assets/register.png" alt="Giao diện đăng ký" width="600">

  <h3>🔐 Trang Đăng Nhập</h3>
  <img src="assets/login.png" alt="Giao diện đăng nhập" width="600">

  <h3>💬 Giao Diện Nhắn Tin Bảo Mật</h3>
  <img src="assets/chat.png" alt="Giao diện nhắn tin bảo mật" width="600">
</div>

<div>
  <h2>🚀 Cách sử dụng</h2>
  <ol>
    <li>Clone repo về máy: <code>git clone https://github.com/your-username/ten-repo.git</code></li>
    <li>Cài thư viện: <code>pip install -r requirements.txt</code></li>
    <li>Chạy ứng dụng: <code>python app.py</code></li>
    <li>Truy cập: <code>http://localhost:5000</code></li>
  </ol>
</div>

<div>
  <h2>🧠 Ý nghĩa bảo mật</h2>
  <p>
    Ứng dụng mô phỏng nguyên lý bảo mật tin nhắn như trong thực tế:
    <ul>
      <li>📥 Dữ liệu được <strong>mã hóa trước khi gửi</strong>, giúp bảo vệ khỏi rò rỉ thông tin</li>
      <li>🧾 <strong>Chữ ký số RSA</strong> đảm bảo nguồn gốc tin nhắn</li>
      <li>🧮 <strong>Kiểm tra băm SHA-256</strong> bảo vệ toàn vẹn nội dung</li>
    </ul>
  </p>
</div>
</div>
