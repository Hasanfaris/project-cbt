const nodemailer = require('nodemailer');
const config = require('../config/env');

// Buat transporter SMTP
const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  auth: {
    user: config.mail.user,
    pass: config.mail.pass,
  },
});

/**
 * Kirim email verifikasi ke user baru
 * @param {Object} user   - { id, name, email }
 * @param {string} token  - token verifikasi unik
 */
async function sendVerificationEmail(user, token) {
  const verifyUrl = `${config.app.url}/verify-email?token=${token}`;

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verifikasi Email — ${config.app.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f0f4ff; font-family: 'Segoe UI', Arial, sans-serif; padding: 40px 20px; }
    .wrapper { max-width: 560px; margin: 0 auto; }
    .card {
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(99,102,241,0.10);
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      padding: 36px 40px;
      text-align: center;
    }
    .header h1 { color: #fff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p  { color: rgba(255,255,255,0.80); font-size: 13px; margin-top: 4px; }
    .logo {
      display: inline-flex; align-items: center; gap: 8px;
      margin-bottom: 16px;
    }
    .logo-icon {
      width: 40px; height: 40px; background: rgba(255,255,255,0.20);
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
    }
    .logo-text { color: #fff; font-size: 18px; font-weight: 800; }
    .body { padding: 36px 40px; }
    .greeting { font-size: 16px; color: #1e1b4b; font-weight: 600; margin-bottom: 12px; }
    .message { font-size: 14px; color: #4b5563; line-height: 1.7; margin-bottom: 28px; }
    .btn-wrap { text-align: center; margin-bottom: 28px; }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .link-fallback { font-size: 12px; color: #6b7280; line-height: 1.6; }
    .link-fallback a { color: #6366f1; word-break: break-all; }
    .footer { padding: 20px 40px; background: #f9fafb; text-align: center; }
    .footer p { font-size: 12px; color: #9ca3af; line-height: 1.5; }
    .warning { 
      background: #fff7ed; border: 1px solid #fed7aa;
      border-radius: 8px; padding: 12px 16px;
      font-size: 12px; color: #92400e; margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">
          <div class="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <span class="logo-text">${config.app.name}</span>
        </div>
        <h1>Verifikasi Alamat Email Anda</h1>
        <p>Platform Ujian Online CBT</p>
      </div>

      <div class="body">
        <p class="greeting">Halo, ${user.name}! 👋</p>
        <p class="message">
          Akun Anda di <strong>${config.app.name}</strong> telah berhasil dibuat oleh administrator.
          Untuk mengaktifkan akun dan dapat login, silakan verifikasi alamat email Anda dengan mengklik tombol di bawah.
        </p>

        <div class="btn-wrap">
          <a href="${verifyUrl}" class="btn">
            ✅ &nbsp; Verifikasi Email Saya
          </a>
        </div>

        <div class="warning">
          ⏰ <strong>Perhatian:</strong> Link verifikasi ini hanya berlaku selama <strong>24 jam</strong>.
          Jika sudah kedaluwarsa, hubungi administrator untuk meminta link baru.
        </div>

        <hr class="divider" />

        <div class="link-fallback">
          <p>Jika tombol di atas tidak berfungsi, salin dan tempel link berikut ke browser Anda:</p>
          <br/>
          <a href="${verifyUrl}">${verifyUrl}</a>
        </div>
      </div>

      <div class="footer">
        <p>Email ini dikirim otomatis oleh sistem <strong>${config.app.name}</strong>.<br/>
        Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"${config.mail.fromName}" <${config.mail.from}>`,
    to: user.email,
    subject: `[${config.app.name}] Verifikasi Email Anda`,
    html,
  });
}

/**
 * Kirim email notifikasi verifikasi berhasil
 * @param {Object} user - { name, email }
 */
async function sendVerificationSuccessEmail(user) {
  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <style>
    body { background:#f0f4ff; font-family:'Segoe UI',Arial,sans-serif; padding:40px 20px; }
    .card { max-width:560px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(99,102,241,0.10); }
    .header { background:linear-gradient(135deg,#10b981 0%,#059669 100%); padding:36px 40px; text-align:center; }
    .header h1 { color:#fff; font-size:22px; font-weight:700; }
    .header p { color:rgba(255,255,255,0.80); font-size:13px; margin-top:4px; }
    .body { padding:36px 40px; }
    .icon { font-size:48px; text-align:center; margin-bottom:16px; }
    .message { font-size:14px; color:#4b5563; line-height:1.7; }
    .login-btn { display:block; text-align:center; margin:28px 0; }
    .login-btn a { background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%); color:#fff!important; text-decoration:none; padding:14px 36px; border-radius:10px; font-size:15px; font-weight:600; }
    .footer { padding:20px 40px; background:#f9fafb; text-align:center; font-size:12px; color:#9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Email Berhasil Diverifikasi! 🎉</h1>
      <p>${config.app.name} — Platform Ujian Online</p>
    </div>
    <div class="body">
      <div class="icon">✅</div>
      <p class="message">
        Halo <strong>${user.name}</strong>,<br/><br/>
        Selamat! Alamat email Anda telah berhasil diverifikasi. Akun Anda kini aktif dan Anda dapat login ke <strong>${config.app.name}</strong>.
      </p>
      <div class="login-btn">
        <a href="${config.app.url}/login">Login Sekarang →</a>
      </div>
    </div>
    <div class="footer">Email otomatis dari ${config.app.name}. Jangan balas email ini.</div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"${config.mail.fromName}" <${config.mail.from}>`,
    to: user.email,
    subject: `[${config.app.name}] Akun Anda Berhasil Diverifikasi`,
    html,
  });
}

module.exports = {
  sendVerificationEmail,
  sendVerificationSuccessEmail,
};
