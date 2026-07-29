const express = require('express');
const authService = require('../services/authService');
const userService = require('../services/userService');
const { requireAuth, redirectIfLoggedIn } = require('../middleware/auth');

const router = express.Router();

// ─── Login ─────────────────────────────────────────────────────────────────

router.get('/login', redirectIfLoggedIn, (req, res) => {
  res.render('login', {
    title: 'Masuk - MauBelajar',
    appName: req.app.locals.appName,
    flash: req.session.flash,
  });
  delete req.session.flash;
});

router.post('/login', redirectIfLoggedIn, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.session.flash = { type: 'error', message: 'Email dan password wajib diisi.' };
    return res.redirect('/login');
  }

  try {
    const result = await authService.verifyLogin(email, password);

    switch (result.status) {
      case 'invalid_credentials':
        req.session.flash = { type: 'error', message: 'Email atau password salah.' };
        return res.redirect('/login');

      case 'inactive':
        req.session.flash = {
          type: 'error',
          message: 'Akun Anda dinonaktifkan. Hubungi administrator.',
        };
        return res.redirect('/login');

      case 'unverified':
        // Simpan email ke session agar form verifikasi bisa prefill
        req.session.pendingVerifyEmail = result.email;
        req.session.flash = {
          type: 'warning',
          message: 'Akun Anda masih menunggu verifikasi dari admin.',
        };
        return res.redirect('/verify-email');

      case 'ok':
        req.session.user = result.user;
        req.session.flash = { type: 'success', message: `Selamat datang, ${result.user.name}!` };
        return res.redirect('/dashboard');

      default:
        req.session.flash = { type: 'error', message: 'Terjadi kesalahan saat login.' };
        return res.redirect('/login');
    }
  } catch (err) {
    console.error('[auth] Login error:', err.message);
    req.session.flash = {
      type: 'error',
      message: 'Gagal login. Pastikan database sudah disetup.',
    };
    return res.redirect('/login');
  }
});

// ─── Logout ────────────────────────────────────────────────────────────────

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ─── Halaman Verifikasi Email (GET) ────────────────────────────────────────

/**
 * GET /verify-email
 * Tampilkan form: masukkan email + kode 6 digit dari admin
 */
router.get('/verify-email', (req, res) => {
  const prefillEmail = req.session.pendingVerifyEmail || '';
  res.render('verify-email', {
    title: 'Verifikasi Email - MauBelajar',
    appName: req.app.locals.appName,
    flash: req.session.flash,
    prefillEmail,
  });
  delete req.session.flash;
});

// ─── Proses Verifikasi (POST) ───────────────────────────────────────────────

/**
 * POST /verify-email
 * Cek email + kode yang dimasukkan user
 */
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    req.session.flash = { type: 'error', message: 'Email dan kode verifikasi wajib diisi.' };
    return res.redirect('/verify-email');
  }

  // Validasi: kode harus 6 digit angka
  if (!/^\d{6}$/.test(code.trim())) {
    req.session.flash = { type: 'error', message: 'Kode verifikasi harus berupa 6 digit angka.' };
    req.session.pendingVerifyEmail = email;
    return res.redirect('/verify-email');
  }

  try {
    const user = await userService.verifyEmailCode(email, code);

    if (!user) {
      req.session.pendingVerifyEmail = email;
      req.session.flash = {
        type: 'error',
        message: 'Kode verifikasi tidak valid.',
      };
      return res.redirect('/verify-email');
    }

    // Berhasil — hapus session pending
    delete req.session.pendingVerifyEmail;
    req.session.flash = {
      type: 'success',
      message: 'Email berhasil diverifikasi. Silakan login.',
    };
    return res.redirect('/login');
  } catch (err) {
    console.error('[auth] verifyEmailCode error:', err.message);
    req.session.flash = { type: 'error', message: 'Terjadi kesalahan saat verifikasi.' };
    return res.redirect('/verify-email');
  }
});

module.exports = router;
