/**
 * Script Reset Demo Verifikasi
 * Mengatur ulang status verifikasi user demo:
 *   - Admin → terverifikasi (tetap)
 *   - Guru & Siswa demo → belum terverifikasi, kode demo digenerate
 * 
 * Jalankan: node scripts/reset-verification-demo.js
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../src/db/pool');

async function resetDemo() {
  const connection = await pool.getConnection();

  try {
    console.log('🔄 Reset status verifikasi demo...');

    // Admin tetap terverifikasi
    await connection.query(
      `UPDATE users SET email_verified_at = created_at, verification_token = NULL
       WHERE role_id = 1`
    );
    console.log('✅ Admin: terverifikasi');

    // Generate kode demo untuk guru dan siswa
    const guruCode  = '173456';
    const siswaCode = '514321';

    await connection.query(
      `UPDATE users SET email_verified_at = NULL, verification_token = ?
       WHERE id = 2 AND role_id = 2`,
      [guruCode]
    );
    console.log(`✅ Guru Demo: kode = ${guruCode}`);

    await connection.query(
      `UPDATE users SET email_verified_at = NULL, verification_token = ?
       WHERE id = 3 AND role_id = 3`,
      [siswaCode]
    );
    console.log(`✅ Siswa Demo: kode = ${siswaCode}`);

    console.log('\n📋 Ringkasan kode demo:');
    console.log(`   Admin:      admin@cbt.local / admin123   → Terverifikasi`);
    console.log(`   Guru Demo:  guru@cbt.local  / guru123    → Kode: ${guruCode}`);
    console.log(`   Siswa Demo: siswa@cbt.local / siswa123   → Kode: ${siswaCode}`);
    console.log('\n🎉 Reset selesai!');
  } catch (err) {
    console.error('❌ Gagal reset:', err.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

resetDemo();
