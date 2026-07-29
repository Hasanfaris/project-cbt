function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { type: 'error', message: 'Silakan login terlebih dahulu.' };
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    if (!roles.includes(req.session.user.role_name)) {
      req.session.flash = { type: 'error', message: 'Anda tidak memiliki akses ke halaman ini.' };
      return res.redirect('/dashboard');
    }
    next();
  };
}

function redirectIfLoggedIn(req, res, next) {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
}

/**
 * Middleware: pastikan user sudah verifikasi email sebelum akses halaman.
 * Dipasang setelah requireAuth.
 */
function requireEmailVerified(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  // Field ini sudah di-set saat verifyLogin berhasil
  if (!req.session.user.email_verified) {
    req.session.flash = {
      type: 'warning',
      message: 'Harap verifikasi email Anda sebelum mengakses halaman ini.',
    };
    return res.redirect('/verify-pending');
  }
  next();
}

module.exports = {
  requireAuth,
  requireRole,
  redirectIfLoggedIn,
  requireEmailVerified,
};
