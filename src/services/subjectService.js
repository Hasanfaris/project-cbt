const pool = require('../db/pool');

async function getAllSubjects() {
  const [rows] = await pool.query(
    `SELECT s.*, u.name AS creator_name 
     FROM subjects s 
     LEFT JOIN users u ON u.id = s.created_by 
     ORDER BY s.id DESC`
  );
  return rows;
}

async function getSubjectById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM subjects WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function createSubject({ name, description, created_by }) {
  const [result] = await pool.query(
    'INSERT INTO subjects (name, description, created_by) VALUES (?, ?, ?)',
    [name, description, created_by]
  );
  return result.insertId;
}

async function updateSubject(id, { name, description }) {
  await pool.query(
    'UPDATE subjects SET name = ?, description = ? WHERE id = ?',
    [name, description, id]
  );
}

async function deleteSubject(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [exams] = await connection.query('SELECT id FROM exams WHERE subject_id = ?', [id]);
    const examIds = exams.map(e => e.id);

    if (examIds.length > 0) {
      await connection.query('DELETE FROM exam_attempts WHERE exam_id IN (?)', [examIds]);
      await connection.query('DELETE FROM exams WHERE subject_id = ?', [id]);
    }

    await connection.query('DELETE FROM subjects WHERE id = ?', [id]);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
};
