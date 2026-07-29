const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function getAllUsers() {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.is_active, u.email_verified_at,
            u.verification_token, u.created_at,
            r.name AS role_name, r.id AS role_id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     ORDER BY u.id ASC`
  );
  return rows;
}

async function getRoles() {
  const [rows] = await pool.query('SELECT id, name FROM roles ORDER BY id ASC');
  return rows;
}

async function getUserById(id) {
  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Buat user baru.
 * - Admin (role_id=1) → langsung terverifikasi (tidak butuh kode)
 * - Guru (role_id=2) / Siswa (role_id=3) → generate kode verifikasi 6 digit
 * @returns {{ userId, verificationCode }} kode null jika admin
 */
async function createUser({ name, email, password, role_id }) {
  const hashed = await bcrypt.hash(password, 10);

  const isAdmin = Number(role_id) === 1;

  let verificationCode = null;
  let emailVerifiedAt = null;

  if (isAdmin) {
    // Admin langsung terverifikasi
    emailVerifiedAt = new Date();
  } else {
    // Guru/Siswa: generate kode 6 digit unik
    verificationCode = String(Math.floor(100000 + crypto.randomInt(900000)));
  }

  const [result] = await pool.query(
    `INSERT INTO users (name, email, password, role_id, verification_token, email_verified_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email, hashed, role_id, verificationCode, emailVerifiedAt]
  );

  return { userId: result.insertId, verificationCode };
}

async function updateUser(id, { name, email, role_id, is_active, password }) {
  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET name = ?, email = ?, role_id = ?, is_active = ?, password = ? WHERE id = ?',
      [name, email, role_id, is_active, hashed, id]
    );
  } else {
    await pool.query(
      'UPDATE users SET name = ?, email = ?, role_id = ?, is_active = ? WHERE id = ?',
      [name, email, role_id, is_active, id]
    );
  }
}

async function deleteUser(id) {
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
}

/**
 * Verifikasi email menggunakan email + kode 6 digit dari admin
 * @param {string} email  - email user
 * @param {string} code   - kode 6 digit yang diberikan admin
 * @returns {Object|null} user jika berhasil, null jika gagal
 */
async function verifyEmailCode(email, code) {
  if (!email || !code) return null;

  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = ? AND u.verification_token = ? AND u.email_verified_at IS NULL`,
    [email.trim(), code.trim()]
  );

  const user = rows[0];
  if (!user) return null;

  // Set email_verified_at dan hapus kode verifikasi
  await pool.query(
    `UPDATE users SET email_verified_at = NOW(), verification_token = NULL WHERE id = ?`,
    [user.id]
  );

  return user;
}

/**
 * Generate ulang kode verifikasi untuk user (hanya guru/siswa)
 * @param {number} userId
 * @returns {string|null} kode baru, atau null jika user tidak ditemukan / sudah terverifikasi
 */
async function regenerateVerificationCode(userId) {
  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role_name FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? AND u.email_verified_at IS NULL AND r.name != 'admin'`,
    [userId]
  );
  const user = rows[0];
  if (!user) return null;

  const newCode = String(Math.floor(100000 + crypto.randomInt(900000)));
  await pool.query(
    `UPDATE users SET verification_token = ? WHERE id = ?`,
    [newCode, userId]
  );

  return newCode;
}

/**
 * Ambil daftar user guru/siswa beserta status verifikasi (untuk tabel dashboard admin)
 */
async function getUsersVerificationStatus() {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.email_verified_at, u.verification_token,
            r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name IN ('guru', 'siswa')
     ORDER BY u.id ASC`
  );
  return rows;
}

module.exports = {
  getAllUsers,
  getRoles,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  verifyEmailCode,
  regenerateVerificationCode,
  getUsersVerificationStatus,
};
