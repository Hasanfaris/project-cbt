const pool = require('../db/pool');
const bcrypt = require('bcryptjs');

async function findByEmail(email) {
  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = ?`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
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
 * Verifikasi login user
 * @returns {{ user, status }}
 *   status: 'ok' | 'invalid_credentials' | 'inactive' | 'unverified'
 */
async function verifyLogin(email, password) {
  const user = await findByEmail(email);

  if (!user) {
    return { user: null, status: 'invalid_credentials' };
  }

  if (!user.is_active) {
    return { user: null, status: 'inactive' };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { user: null, status: 'invalid_credentials' };
  }

  // Admin selalu terverifikasi — tidak perlu cek email_verified_at
  // Guru/Siswa wajib verifikasi kode dari admin
  if (user.role_name !== 'admin' && !user.email_verified_at) {
    return {
      user: null,
      status: 'unverified',
      email: user.email,
      role: user.role_name,
    };
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
      email_verified: true,
    },
    status: 'ok',
  };
}

module.exports = {
  findByEmail,
  findById,
  verifyLogin,
};
