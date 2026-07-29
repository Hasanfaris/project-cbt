const express = require('express');
const attemptService = require('../services/attemptService');
const examService = require('../services/examService');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('siswa'));

router.get('/exams', async (req, res) => {
  try {
    const exams = await attemptService.getActiveExamsForStudent(req.session.user.id);
    res.render('siswa/exams/index', {
      title: 'Daftar Ujian',
      appName: req.app.locals.appName,
      user: req.session.user,
      exams,
      flash: req.session.flash,
    });
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal memuat daftar ujian.' };
    res.redirect('/dashboard');
  } finally {
    delete req.session.flash;
  }
});

router.post('/exams/:id/start', async (req, res) => {
  const exam = await examService.getExamById(req.params.id);
  if (!exam || !exam.is_active) {
    req.session.flash = { type: 'error', message: 'Ujian tidak aktif atau tidak ditemukan.' };
    return res.redirect('/siswa/exams');
  }

  const existing = await attemptService.getAttemptByUserAndExam(req.session.user.id, exam.id);
  if (existing) {
    if (existing.status === 'submitted') {
      req.session.flash = { type: 'error', message: 'Anda sudah mengerjakan ujian ini.' };
      return res.redirect(`/siswa/exams/${exam.id}/result/${existing.id}`);
    }
    return res.redirect(`/siswa/exams/${exam.id}/take/${existing.id}`);
  }

  const questions = await examService.getQuestionsByExam(exam.id);
  if (questions.length === 0) {
    req.session.flash = { type: 'error', message: 'Ujian belum memiliki soal.' };
    return res.redirect('/siswa/exams');
  }

  try {
    const attemptId = await attemptService.startAttempt(req.session.user.id, exam.id);
    res.redirect(`/siswa/exams/${exam.id}/take/${attemptId}`);
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Gagal memulai ujian.' };
    res.redirect('/siswa/exams');
  }
});

router.get('/exams/:examId/take/:attemptId', async (req, res) => {
  const attempt = await attemptService.getAttemptById(req.params.attemptId);
  if (!attempt || attempt.user_id !== req.session.user.id || attempt.exam_id !== Number(req.params.examId)) {
    req.session.flash = { type: 'error', message: 'Sesi ujian tidak valid.' };
    return res.redirect('/siswa/exams');
  }

  if (attempt.status === 'submitted') {
    return res.redirect(`/siswa/exams/${req.params.examId}/result/${attempt.id}`);
  }

  const startedAt = new Date(attempt.started_at);
  const durationMs = attempt.duration_minutes * 60 * 1000;
  const endsAt = new Date(startedAt.getTime() + durationMs);
  const now = new Date();

  if (now >= endsAt) {
    req.session.flash = { type: 'error', message: 'Waktu ujian telah habis.' };
    return res.redirect('/siswa/exams');
  }

  const questions = await attemptService.getExamQuestionsWithOptions(req.params.examId);
  const remainingSeconds = Math.floor((endsAt - now) / 1000);

  res.render('siswa/exams/take', {
    title: `Kerjakan - ${attempt.exam_title}`,
    appName: req.app.locals.appName,
    user: req.session.user,
    attempt,
    questions,
    remainingSeconds,
    flash: req.session.flash,
  });
  delete req.session.flash;
});

router.post('/exams/:examId/submit/:attemptId', async (req, res) => {
  const attempt = await attemptService.getAttemptById(req.params.attemptId);
  if (!attempt || attempt.user_id !== req.session.user.id) {
    req.session.flash = { type: 'error', message: 'Sesi ujian tidak valid.' };
    return res.redirect('/siswa/exams');
  }

  const questions = await attemptService.getExamQuestionsWithOptions(req.params.examId);
  const answers = questions.map((q) => ({
    question_id: q.id,
    option_id: req.body[`answer_${q.id}`] ? parseInt(req.body[`answer_${q.id}`], 10) : null,
  }));

  try {
    const result = await attemptService.submitAttempt(req.params.attemptId, answers);
    req.session.flash = {
      type: 'success',
      message: `Ujian selesai! Nilai Anda: ${result.score}`,
    };
    res.redirect(`/siswa/exams/${req.params.examId}/result/${req.params.attemptId}`);
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message || 'Gagal mengirim jawaban.' };
    res.redirect(`/siswa/exams/${req.params.examId}/take/${req.params.attemptId}`);
  }
});

router.get('/exams/:examId/result/:attemptId', async (req, res) => {
  const result = await attemptService.getAttemptResult(req.params.attemptId);
  if (!result || result.attempt.user_id !== req.session.user.id) {
    req.session.flash = { type: 'error', message: 'Hasil ujian tidak ditemukan.' };
    return res.redirect('/siswa/exams');
  }

  res.render('siswa/exams/result', {
    title: 'Hasil Ujian',
    appName: req.app.locals.appName,
    user: req.session.user,
    result,
    flash: req.session.flash,
  });
  delete req.session.flash;
});

module.exports = router;
