const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');

async function seed() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(`
      INSERT IGNORE INTO roles (id, name) VALUES
      (1, 'admin'),
      (2, 'guru'),
      (3, 'siswa')
    `);

    const adminPassword = await bcrypt.hash('123', 10);
    const guruPassword = await bcrypt.hash('guru123', 10);
    const siswaPassword = await bcrypt.hash('siswa123', 10);

    await connection.query(
      `INSERT IGNORE INTO users (id, role_id, name, email, password, email_verified_at) VALUES
      (1, 1, 'Administrator', 'admin@gmail.com', ?, NOW()),
      (2, 2, 'Guru Demo', 'guru@cbt.local', ?, NULL),
      (3, 3, 'Siswa Demo', 'siswa@cbt.local', ?, NULL)`,
      [adminPassword, guruPassword, siswaPassword]
    );

    await connection.query(`
      INSERT IGNORE INTO subjects (id, name, description, created_by) VALUES
      (1, 'Pemrograman Web', 'Mata pelajaran pemrograman web dasar', 2)
    `);

    await connection.query(`
      INSERT IGNORE INTO exams (id, subject_id, created_by, title, description, duration_minutes, is_active) VALUES
      (1, 1, 2, 'Ujian Tengah Semester Web', 'Ujian pilihan ganda pemrograman web', 60, 1)
    `);

    await connection.query(`
      INSERT IGNORE INTO questions (id, exam_id, question_text, points, order_number) VALUES
      (1, 1, 'Apa kepanjangan dari HTML?', 10, 1),
      (2, 1, 'Framework JavaScript yang digunakan untuk UI adalah...', 10, 2)
    `);

    await connection.query(`
      INSERT IGNORE INTO options (id, question_id, option_label, option_text, is_correct) VALUES
      (1, 1, 'A', 'Hyper Text Markup Language', 1),
      (2, 1, 'B', 'High Transfer Mark Language', 0),
      (3, 1, 'C', 'Hyper Tool Multi Language', 0),
      (4, 1, 'D', 'Home Text Markup Language', 0),
      (5, 2, 'A', 'Laravel', 0),
      (6, 2, 'B', 'React', 1),
      (7, 2, 'C', 'Django', 0),
      (8, 2, 'D', 'Spring', 0)
    `);

    await connection.commit();
    console.log('Data seed berhasil ditambahkan.');
  } catch (err) {
    await connection.rollback();
    console.error('Gagal seed database:', err.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

seed();
