const express = require('express');
const attemptService = require('../services/attemptService');
const examService = require('../services/examService');
const userService = require('../services/userService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const user = req.session.user;

  try {
    if (user.role_name === 'admin') {
      const stats = await attemptService.getAdminStats();
      const verificationList = await userService.getUsersVerificationStatus();
      return res.render('dashboard/admin', {
        title: 'Dashboard Admin',
        appName: req.app.locals.appName,
        user,
        stats,
        verificationList,
        flash: req.session.flash,
      });
    }

    if (user.role_name === 'guru') {
      const stats = await attemptService.getGuruStats(user.id);
      const exams = await examService.getExamsByGuru(user.id);
      
      // Pelindung internal: jika query nilai bermasalah, dashboard GURU tetap bisa terbuka
      let examResults = [];
      try {
        examResults = await attemptService.getRecentAttemptsForGuru(user.id);
      } catch (queryErr) {
        console.log("=== PEMBERITAHUAN ERROR QUERY HASIL ===");
        console.error(queryErr); // Ini akan memunculkan info kolom database yang salah di terminal
        console.log("=======================================");
      }

      return res.render('dashboard/guru', {
        title: 'Dashboard Guru',
        appName: req.app.locals.appName,
        user,
        stats,
        exams: exams.slice(0, 5),
        examResults: examResults,
        flash: req.session.flash,
      });
    }

    const stats = await attemptService.getStudentStats(user.id);
    const exams = await attemptService.getActiveExamsForStudent(user.id);
    return res.render('dashboard/siswa', {
      title: 'Dashboard Siswa',
      appName: req.app.locals.appName,
      user,
      stats,
      exams: exams.slice(0, 5),
      flash: req.session.flash,
    });
  } catch (err) {
    // Memunculkan pesan error utama ke terminal VS Code
    console.log("=== ERROR UTAMA DASHBOARD ===");
    console.error(err);
    console.log("=============================");
    
    req.session.flash = { type: 'error', message: 'Gagal memuat dashboard. Pastikan database sudah disetup.' };
    return res.render('dashboard/error', {
      title: 'Dashboard',
      appName: req.app.locals.appName,
      user,
      flash: req.session.flash,
    });
  } finally {
    delete req.session.flash;
  }
});

module.exports = router;