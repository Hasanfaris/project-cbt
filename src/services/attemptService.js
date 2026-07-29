const pool = require('../db/pool');

async function getActiveExamsForStudent(userId) {
  const [rows] = await pool.query(
    `SELECT e.*, s.name AS subject_name,
      (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS question_count,
      ea.id AS attempt_id, ea.status AS attempt_status, ea.score AS attempt_score
     FROM exams e
     JOIN subjects s ON s.id = e.subject_id
     LEFT JOIN exam_attempts ea ON ea.exam_id = e.id AND ea.user_id = ?
     WHERE e.is_active = 1
     ORDER BY e.created_at DESC`,
    [userId]
  );
  return rows;
}

async function getAttemptById(attemptId) {
  const [rows] = await pool.query(
    `SELECT ea.*, e.title AS exam_title, e.duration_minutes, e.created_by
     FROM exam_attempts ea
     JOIN exams e ON e.id = ea.exam_id
     WHERE ea.id = ?`,
    [attemptId]
  );
  return rows[0] || null;
}

async function getAttemptByUserAndExam(userId, examId) {
  const [rows] = await pool.query(
    'SELECT * FROM exam_attempts WHERE user_id = ? AND exam_id = ?',
    [userId, examId]
  );
  return rows[0] || null;
}

async function startAttempt(userId, examId) {
  const [result] = await pool.query(
    'INSERT INTO exam_attempts (exam_id, user_id, status) VALUES (?, ?, ?)',
    [examId, userId, 'in_progress']
  );
  return result.insertId;
}

async function getExamQuestionsWithOptions(examId) {
  const [questions] = await pool.query(
    'SELECT * FROM questions WHERE exam_id = ? ORDER BY order_number ASC, id ASC',
    [examId]
  );

  for (const q of questions) {
    const [options] = await pool.query(
      'SELECT id, option_label, option_text FROM options WHERE question_id = ? ORDER BY option_label ASC',
      [q.id]
    );
    q.options = options;
  }

  return questions;
}

async function submitAttempt(attemptId, answers) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [attemptRows] = await connection.query(
      'SELECT * FROM exam_attempts WHERE id = ? FOR UPDATE',
      [attemptId]
    );
    const attempt = attemptRows[0];
    if (!attempt || attempt.status !== 'in_progress') {
      throw new Error('Sesi ujian tidak valid.');
    }

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const answer of answers) {
      const [questionRows] = await connection.query(
        'SELECT points FROM questions WHERE id = ?',
        [answer.question_id]
      );
      const question = questionRows[0];
      if (!question) continue;

      totalPoints += question.points;

      let isCorrect = 0;
      if (answer.option_id) {
        const [optionRows] = await connection.query(
          'SELECT is_correct FROM options WHERE id = ? AND question_id = ?',
          [answer.option_id, answer.question_id]
        );
        if (optionRows[0] && optionRows[0].is_correct) {
          isCorrect = 1;
          earnedPoints += question.points;
        }
      }

      await connection.query(
        `INSERT INTO student_answers (exam_attempt_id, question_id, option_id, is_correct)
         VALUES (?, ?, ?, ?)`,
        [attemptId, answer.question_id, answer.option_id || null, isCorrect]
      );
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    await connection.query(
      `UPDATE exam_attempts
       SET status = 'submitted', finished_at = NOW(), score = ?
       WHERE id = ?`,
      [score.toFixed(2), attemptId]
    );

    await connection.commit();
    return { score: score.toFixed(2), earnedPoints, totalPoints };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function getAttemptResult(attemptId) {
  const attempt = await getAttemptById(attemptId);
  if (!attempt) return null;

  const [answers] = await pool.query(
    `SELECT sa.*, q.question_text, q.points, o.option_label, o.option_text
     FROM student_answers sa
     JOIN questions q ON q.id = sa.question_id
     LEFT JOIN options o ON o.id = sa.option_id
     WHERE sa.exam_attempt_id = ?
     ORDER BY q.order_number ASC`,
    [attemptId]
  );

  return { attempt, answers };
}

// FUNGSI UNTUK HALAMAN HASIL UJIAN SPESIFIK GURU
async function getExamResultsByExam(examId) {
  const [rows] = await pool.query(
    `SELECT ea.*, u.name AS student_name, u.email AS student_email, u.class_name
     FROM exam_attempts ea
     JOIN users u ON u.id = ea.user_id
     WHERE ea.exam_id = ? AND ea.status != 'in_progress'
     ORDER BY ea.id DESC`,
    [examId]
  );
  return rows;
}

async function getStudentStats(userId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total_attempts,
      COALESCE(AVG(score), 0) AS avg_score
     FROM exam_attempts
     WHERE user_id = ? AND status != 'in_progress'`,
    [userId]
  );
  return rows[0];
}

async function getAdminStats() {
  const [users] = await pool.query('SELECT COUNT(*) AS total FROM users');
  const [exams] = await pool.query('SELECT COUNT(*) AS total FROM exams');
  const [attempts] = await pool.query("SELECT COUNT(*) AS total FROM exam_attempts WHERE status != 'in_progress'");
  return {
    totalUsers: users[0].total,
    totalExams: exams[0].total,
    totalAttempts: attempts[0].total,
  };
}

async function getGuruStats(guruId) {
  const [exams] = await pool.query('SELECT COUNT(*) AS total FROM exams WHERE created_by = ?', [guruId]);
  const [questions] = await pool.query(
    `SELECT COUNT(*) AS total FROM questions q
     JOIN exams e ON e.id = q.exam_id
     WHERE e.created_by = ?`,
    [guruId]
  );
  return {
    totalExams: exams[0].total,
    totalQuestions: questions[0].total,
  };
}

// Mengambil seluruh riwayat pengerjaan siswa untuk dashboard Guru
async function getRecentAttemptsForGuru(guruId) {
  const [rows] = await pool.query(
    `SELECT 
        ea.score, 
        ea.status, 
        ea.exam_id,
        u.name AS student_name, 
        u.email AS student_email,
        NULL AS class_name
     FROM exam_attempts ea
     JOIN users u ON u.id = ea.user_id
     JOIN exams e ON e.id = ea.exam_id
     WHERE ea.status != 'in_progress'
     ORDER BY ea.id DESC`
  );
  return rows;
}

module.exports = {
  getActiveExamsForStudent,
  getAttemptById,
  getAttemptByUserAndExam,
  startAttempt,
  getExamQuestionsWithOptions,
  submitAttempt,
  getAttemptResult,
  getExamResultsByExam,
  getStudentStats,
  getAdminStats,
  getGuruStats,
  getRecentAttemptsForGuru,
};