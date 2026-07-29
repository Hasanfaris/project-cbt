const express = require('express');
const router = express.Router();
const attemptService = require('../services/attemptService');
const examService = require('../services/examService');
const { requireAuth } = require('../middleware/auth');

// 1. DAFTAR UJIAN (Menangani Menu "Kelola Ujian" untuk mencegah error 404)
router.get('/exams', requireAuth, async (req, res) => {
  try {
    const exams = await examService.getExamsByGuru(req.session.user.id);
    res.render('guru/exams/index', { // Sesuaikan nama view ini jika berbeda, misal: 'guru/exams'
      title: 'Kelola Ujian',
      appName: req.app.locals.appName,
      user: req.session.user,
      exams,
      flash: req.session.flash,
    });
  } catch (err) {
    console.error('Error memuat daftar ujian guru:', err);
    req.session.flash = { type: 'error', message: 'Gagal memuat daftar ujian.' };
    res.redirect('/dashboard');
  } finally {
    delete req.session.flash;
  }
});

// 2. FORM TAMBAH UJIAN
router.get('/exams/create', requireAuth, async (req, res) => {
  try {
    const subjects = await examService.getSubjects();
    res.render('guru/exams/form', {
      title: 'Buat Ujian',
      appName: req.app.locals.appName,
      user: req.session.user,
      subjects,
      exam: null,
      flash: req.session.flash,
    });
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal memuat formulir pembuatan ujian.' };
    res.redirect('/guru/exams');
  } finally {
    delete req.session.flash;
  }
});

// 3. PROSES SIMPAN UJIAN BARU
router.post('/exams', requireAuth, async (req, res) => {
  const { subject_id, title, description, duration_minutes, tingkat, is_active } = req.body;
  if (!subject_id || !title || !duration_minutes) {
    req.session.flash = { type: 'error', message: 'Mata pelajaran, judul, dan durasi wajib diisi.' };
    return res.redirect('/guru/exams/create');
  }

  try {
    const examId = await examService.createExam({
      subject_id,
      created_by: req.session.user.id,
      title,
      description: description || '',
      duration_minutes: parseInt(duration_minutes, 10),
      tingkat: tingkat || 'Sedang',
      is_active: is_active === '1',
    });
    req.session.flash = { type: 'success', message: 'Ujian berhasil dibuat. Tambahkan soal sekarang.' };
    res.redirect(`/guru/exams/${examId}/questions`);
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal membuat ujian.' };
    res.redirect('/guru/exams/create');
  }
});

// 4. FORM EDIT UJIAN
router.get('/exams/:id/edit', requireAuth, async (req, res) => {
  try {
    const exam = await examService.getExamById(req.params.id);
    if (!exam || exam.created_by !== req.session.user.id) {
      req.session.flash = { type: 'error', message: 'Ujian tidak ditemukan.' };
      return res.redirect('/guru/exams');
    }

    const subjects = await examService.getSubjects();
    res.render('guru/exams/form', {
      title: 'Edit Ujian',
      appName: req.app.locals.appName,
      user: req.session.user,
      subjects,
      exam,
      flash: req.session.flash,
    });
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal memuat data ujian.' };
    res.redirect('/guru/exams');
  } finally {
    delete req.session.flash;
  }
});

// 5. PROSES UPDATE UJIAN
router.post('/exams/:id', requireAuth, async (req, res) => {
  const exam = await examService.getExamById(req.params.id);
  if (!exam || exam.created_by !== req.session.user.id) {
    req.session.flash = { type: 'error', message: 'Ujian tidak ditemukan.' };
    return res.redirect('/guru/exams');
  }

  const { subject_id, title, description, duration_minutes, tingkat, is_active } = req.body;
  try {
    await examService.updateExam(req.params.id, {
      subject_id,
      title,
      description: description || '',
      duration_minutes: parseInt(duration_minutes, 10),
      tingkat: tingkat || 'Sedang',
      is_active: is_active === '1',
    });
    req.session.flash = { type: 'success', message: 'Ujian berhasil diperbarui.' };
    res.redirect('/guru/exams');
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal memperbarui ujian.' };
    res.redirect(`/guru/exams/${req.params.id}/edit`);
  }
});

// 6. PROSES HAPUS UJIAN
router.post('/exams/:id/delete', requireAuth, async (req, res) => {
  const exam = await examService.getExamById(req.params.id);
  if (!exam || exam.created_by !== req.session.user.id) {
    req.session.flash = { type: 'error', message: 'Ujian tidak ditemukan atau bukan milik Anda.' };
    return res.redirect('/guru/exams');
  }

  try {
    await examService.deleteExam(req.params.id);
    req.session.flash = { type: 'success', message: 'Ujian berhasil dihapus permanen.' };
  } catch (err) {
    console.error('Error saat menghapus ujian:', err);
    req.session.flash = { 
      type: 'error', 
      message: 'Gagal menghapus ujian. Pastikan tidak ada data siswa aktif yang terkait.' 
    };
  }
  res.redirect('/guru/exams');
});

// 7. DAFTAR SOAL DALAM UJIAN
router.get('/exams/:id/questions', requireAuth, async (req, res) => {
  try {
    const exam = await examService.getExamById(req.params.id);
    if (!exam || exam.created_by !== req.session.user.id) {
      req.session.flash = { type: 'error', message: 'Ujian tidak ditemukan.' };
      return res.redirect('/guru/exams');
    }

    const questions = await examService.getQuestionsByExam(req.params.id);
    res.render('guru/exams/questions', {
      title: `Soal - ${exam.title}`,
      appName: req.app.locals.appName,
      user: req.session.user,
      exam,
      questions,
      flash: req.session.flash,
    });
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal memuat soal.' };
    res.redirect('/guru/exams');
  } finally {
    delete req.session.flash;
  }
});

// 8. FORM TAMBAH SOAL
router.get('/exams/:id/questions/create', requireAuth, async (req, res) => {
  try {
    const exam = await examService.getExamById(req.params.id);
    if (!exam || exam.created_by !== req.session.user.id) {
      req.session.flash = { type: 'error', message: 'Ujian tidak ditemukan.' };
      return res.redirect('/guru/exams');
    }

    res.render('guru/exams/question-form', {
      title: 'Tambah Soal',
      appName: req.app.locals.appName,
      user: req.session.user,
      exam,
      flash: req.session.flash,
    });
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal memuat form tambah soal.' };
    res.redirect('/guru/exams');
  } finally {
    delete req.session.flash;
  }
});

// 9. PROSES SIMPAN SOAL
router.post('/exams/:id/questions', requireAuth, async (req, res) => {
  const exam = await examService.getExamById(req.params.id);
  if (!exam || exam.created_by !== req.session.user.id) {
    req.session.flash = { type: 'error', message: 'Ujian tidak ditemukan.' };
    return res.redirect('/guru/exams');
  }

  const { question_text, points, order_number, option_a, option_b, option_c, option_d, correct_option } = req.body;
  if (!question_text || !correct_option) {
    req.session.flash = { type: 'error', message: 'Pertanyaan dan jawaban benar wajib diisi.' };
    return res.redirect(`/guru/exams/${req.params.id}/questions/create`);
  }

  const options = [
    { label: 'A', text: option_a, is_correct: correct_option === 'A' },
    { label: 'B', text: option_b, is_correct: correct_option === 'B' },
    { label: 'C', text: option_c, is_correct: correct_option === 'C' },
    { label: 'D', text: option_d, is_correct: correct_option === 'D' },
  ];

  try {
    await examService.createQuestion(req.params.id, {
      question_text,
      points: parseInt(points, 10) || 10,
      order_number: parseInt(order_number, 10) || 1,
      options,
    });
    req.session.flash = { type: 'success', message: 'Soal berhasil ditambahkan.' };
    res.redirect(`/guru/exams/${req.params.id}/questions`);
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal menambah soal.' };
    res.redirect(`/guru/exams/${req.params.id}/questions/create`);
  }
});

// 10. PROSES HAPUS SOAL
router.post('/exams/:examId/questions/:id/delete', requireAuth, async (req, res) => {
  const exam = await examService.getExamById(req.params.examId);
  if (!exam || exam.created_by !== req.session.user.id) {
    req.session.flash = { type: 'error', message: 'Ujian tidak ditemukan.' };
    return res.redirect('/guru/exams');
  }

  try {
    await examService.deleteQuestion(req.params.id);
    req.session.flash = { type: 'success', message: 'Soal berhasil dihapus.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal menghapus soal.' };
  }
  res.redirect(`/guru/exams/${req.params.examId}/questions`);
});

// 11. LIHAT HASIL PENGERJAAN SISWA UNTUK UJIAN SPESIFIK
router.get('/exams/:id/results', requireAuth, async (req, res) => {
  try {
    const exam = await examService.getExamById(req.params.id);
    if (!exam || exam.created_by !== req.session.user.id) {
      req.session.flash = { type: 'error', message: 'Ujian tidak ditemukan.' };
      return res.redirect('/guru/exams');
    }

    const results = await attemptService.getExamResultsByExam(req.params.id);
    res.render('guru/exams/results', {
      title: `Hasil Ujian - ${exam.title}`,
      appName: req.app.locals.appName,
      user: req.session.user,
      exam,
      results,
      flash: req.session.flash,
    });
  } catch (err) {
    console.error("=== ERROR MEMUAT HASIL UJIAN ===", err);
    req.session.flash = { type: 'error', message: 'Gagal memuat hasil ujian.' };
    res.redirect('/guru/exams');
  } finally {
    delete req.session.flash;
  }
});

module.exports = router;