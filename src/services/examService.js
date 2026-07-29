const pool = require('../db/pool');

async function getSubjects() {
  const [rows] = await pool.query('SELECT id, name FROM subjects ORDER BY name ASC');
  return rows;
}

async function getExamsByGuru(guruId) {
  const [rows] = await pool.query(
    `SELECT e.*, s.name AS subject_name,
      (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS question_count
     FROM exams e
     JOIN subjects s ON s.id = e.subject_id
     WHERE e.created_by = ?
     ORDER BY e.created_at DESC`,
    [guruId]
  );
  return rows;
}

async function getExamById(id) {
  const [rows] = await pool.query(
    `SELECT e.*, s.name AS subject_name
     FROM exams e
     JOIN subjects s ON s.id = e.subject_id
     WHERE e.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function createExam(data) {
  const { subject_id, created_by, title, description, duration_minutes, tingkat, is_active } = data;
  const [result] = await pool.query(
    `INSERT INTO exams (subject_id, created_by, title, description, duration_minutes, tingkat, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [subject_id, created_by, title, description, duration_minutes, tingkat || 'Sedang', is_active ? 1 : 0]
  );
  return result.insertId;
}

async function updateExam(id, data) {
  const { subject_id, title, description, duration_minutes, tingkat, is_active } = data;
  await pool.query(
    `UPDATE exams
     SET subject_id = ?, title = ?, description = ?, duration_minutes = ?, tingkat = ?, is_active = ?
     WHERE id = ?`,
    [subject_id, title, description, duration_minutes, tingkat || 'Sedang', is_active ? 1 : 0, id]
  );
}

async function getQuestionsByExam(examId) {
  const [rows] = await pool.query(
    `SELECT q.*,
      (SELECT COUNT(*) FROM options o WHERE o.question_id = q.id) AS option_count
     FROM questions q
     WHERE q.exam_id = ?
     ORDER BY q.order_number ASC, q.id ASC`,
    [examId]
  );
  return rows;
}

async function getQuestionById(id) {
  const [rows] = await pool.query('SELECT * FROM questions WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createQuestion(examId, { question_text, points, order_number, options }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [qResult] = await connection.query(
      'INSERT INTO questions (exam_id, question_text, points, order_number) VALUES (?, ?, ?, ?)',
      [examId, question_text, points, order_number]
    );
    const questionId = qResult.insertId;

    for (const opt of options) {
      await connection.query(
        'INSERT INTO options (question_id, option_label, option_text, is_correct) VALUES (?, ?, ?, ?)',
        [questionId, opt.label, opt.text, opt.is_correct ? 1 : 0]
      );
    }

    await connection.commit();
    return questionId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function deleteQuestion(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query('DELETE FROM student_answers WHERE question_id = ?', [id]);
    await connection.query('DELETE FROM questions WHERE id = ?', [id]);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function deleteExam(examId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [questions] = await connection.query('SELECT id FROM questions WHERE exam_id = ?', [examId]);
    const questionIds = questions.map(q => q.id);

    const [attempts] = await connection.query('SELECT id FROM exam_attempts WHERE exam_id = ?', [examId]);
    const attemptIds = attempts.map(a => a.id);

    if (questionIds.length > 0) {
      await connection.query('DELETE FROM student_answers WHERE question_id IN (?)', [questionIds]);
    }
    if (attemptIds.length > 0) {
      await connection.query('DELETE FROM student_answers WHERE attempt_id IN (?)', [attemptIds]);
    }

    await connection.query('DELETE FROM exam_attempts WHERE exam_id = ?', [examId]);

    if (questionIds.length > 0) {
      await connection.query('DELETE FROM options WHERE question_id IN (?)', [questionIds]);
    }

    await connection.query('DELETE FROM questions WHERE exam_id = ?', [examId]);
    await connection.query('DELETE FROM exams WHERE id = ?', [examId]);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error('Error saat melakukan cascade delete ujian:', err);
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getSubjects,
  getExamsByGuru,
  getExamById,
  createExam,
  updateExam,
  getQuestionsByExam,
  getQuestionById,
  createQuestion,
  deleteQuestion,
  deleteExam,
};