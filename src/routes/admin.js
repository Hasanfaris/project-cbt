const express = require('express');
const userService = require('../services/userService');
const subjectService = require('../services/subjectService');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/users', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.render('admin/users/index', {
      title: 'Kelola User',
      appName: req.app.locals.appName,
      user: req.session.user,
      users,
      flash: req.session.flash,
    });
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal memuat data user.' };
    res.redirect('/dashboard');
  } finally {
    delete req.session.flash;
  }
});

router.get('/users/create', async (req, res) => {
  const roles = await userService.getRoles();
  res.render('admin/users/form', {
    title: 'Tambah User',
    appName: req.app.locals.appName,
    user: req.session.user,
    roles,
    editUser: null,
    flash: req.session.flash,
  });
  delete req.session.flash;
});

router.post('/users', async (req, res) => {
  const { name, email, password, role_id } = req.body;
  if (!name || !email || !password || !role_id) {
    req.session.flash = { type: 'error', message: 'Semua field wajib diisi.' };
    // Cek dari mana request datang (dashboard atau halaman create)
    const referer = req.get('Referer') || '';
    return res.redirect(referer.includes('/dashboard') ? '/dashboard' : '/admin/users/create');
  }

  try {
    const { verificationCode } = await userService.createUser({ name, email, password, role_id });
    const isAdmin = Number(role_id) === 1;

    if (isAdmin || !verificationCode) {
      req.session.flash = { type: 'success', message: 'User berhasil ditambahkan.' };
    } else {
      req.session.flash = {
        type: 'code',
        message: `User berhasil ditambahkan. Kode verifikasi: ${verificationCode}`,
        code: verificationCode,
      };
    }

    // Redirect ke tempat asal (dashboard atau halaman users)
    const referer = req.get('Referer') || '';
    return res.redirect(referer.includes('/dashboard') ? '/dashboard' : '/admin/users');
  } catch (err) {
    console.error('[admin] createUser error:', err.message);
    req.session.flash = { type: 'error', message: 'Gagal menambah user. Email mungkin sudah digunakan.' };
    const referer = req.get('Referer') || '';
    return res.redirect(referer.includes('/dashboard') ? '/dashboard' : '/admin/users/create');
  }
});

router.get('/users/:id/edit', async (req, res) => {
  const editUser = await userService.getUserById(req.params.id);
  if (!editUser) {
    req.session.flash = { type: 'error', message: 'User tidak ditemukan.' };
    return res.redirect('/admin/users');
  }

  const roles = await userService.getRoles();
  res.render('admin/users/form', {
    title: 'Edit User',
    appName: req.app.locals.appName,
    user: req.session.user,
    roles,
    editUser,
    flash: req.session.flash,
  });
  delete req.session.flash;
});

router.post('/users/:id', async (req, res) => {
  const { name, email, role_id, is_active, password } = req.body;
  try {
    await userService.updateUser(req.params.id, {
      name,
      email,
      role_id,
      is_active: is_active ? 1 : 0,
      password: password || null,
    });
    req.session.flash = { type: 'success', message: 'User berhasil diperbarui.' };
    res.redirect('/admin/users');
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal memperbarui user.' };
    res.redirect(`/admin/users/${req.params.id}/edit`);
  }
});

router.post('/users/:id/delete', async (req, res) => {
  if (Number(req.params.id) === req.session.user.id) {
    req.session.flash = { type: 'error', message: 'Tidak dapat menghapus akun sendiri.' };
    return res.redirect('/admin/users');
  }

  try {
    await userService.deleteUser(req.params.id);
    req.session.flash = { type: 'success', message: 'User berhasil dihapus.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal menghapus user.' };
  }
  res.redirect('/admin/users');
});

// Generate ulang kode verifikasi (oleh Admin)
router.post('/users/:id/regenerate-code', async (req, res) => {
  try {
    const newCode = await userService.regenerateVerificationCode(req.params.id);
    if (newCode) {
      req.session.flash = {
        type: 'code',
        message: `Kode verifikasi baru berhasil dibuat: ${newCode}`,
        code: newCode,
      };
    } else {
      req.session.flash = {
        type: 'info',
        message: 'User sudah terverifikasi atau tidak ditemukan.',
      };
    }
  } catch (err) {
    console.error('[admin] regenerateCode error:', err.message);
    req.session.flash = { type: 'error', message: 'Gagal membuat kode verifikasi baru.' };
  }
  res.redirect('/admin/users');
});

// --- Subject Routes ---
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await subjectService.getAllSubjects();
    res.render('admin/subjects/index', {
      title: 'Kelola Mata Pelajaran',
      appName: req.app.locals.appName,
      user: req.session.user,
      subjects,
      flash: req.session.flash,
    });
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal memuat data mata pelajaran.' };
    res.redirect('/dashboard');
  } finally {
    delete req.session.flash;
  }
});

router.get('/subjects/create', async (req, res) => {
  res.render('admin/subjects/form', {
    title: 'Tambah Mata Pelajaran',
    appName: req.app.locals.appName,
    user: req.session.user,
    editSubject: null,
    flash: req.session.flash,
  });
  delete req.session.flash;
});

router.post('/subjects', async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    req.session.flash = { type: 'error', message: 'Nama mata pelajaran wajib diisi.' };
    return res.redirect('/admin/subjects/create');
  }

  try {
    await subjectService.createSubject({ name, description, created_by: req.session.user.id });
    req.session.flash = { type: 'success', message: 'Mata pelajaran berhasil ditambahkan.' };
    res.redirect('/admin/subjects');
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal menambah mata pelajaran.' };
    res.redirect('/admin/subjects/create');
  }
});

router.get('/subjects/:id/edit', async (req, res) => {
  const editSubject = await subjectService.getSubjectById(req.params.id);
  if (!editSubject) {
    req.session.flash = { type: 'error', message: 'Mata pelajaran tidak ditemukan.' };
    return res.redirect('/admin/subjects');
  }

  res.render('admin/subjects/form', {
    title: 'Edit Mata Pelajaran',
    appName: req.app.locals.appName,
    user: req.session.user,
    editSubject,
    flash: req.session.flash,
  });
  delete req.session.flash;
});

router.post('/subjects/:id', async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    req.session.flash = { type: 'error', message: 'Nama mata pelajaran wajib diisi.' };
    return res.redirect(`/admin/subjects/${req.params.id}/edit`);
  }

  try {
    await subjectService.updateSubject(req.params.id, { name, description });
    req.session.flash = { type: 'success', message: 'Mata pelajaran berhasil diperbarui.' };
    res.redirect('/admin/subjects');
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal memperbarui mata pelajaran.' };
    res.redirect(`/admin/subjects/${req.params.id}/edit`);
  }
});

router.post('/subjects/:id/delete', async (req, res) => {
  try {
    await subjectService.deleteSubject(req.params.id);
    req.session.flash = { type: 'success', message: 'Mata pelajaran berhasil dihapus.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal menghapus mata pelajaran. Pastikan tidak ada data yang terkait.' };
  }
  res.redirect('/admin/subjects');
});

module.exports = router;
