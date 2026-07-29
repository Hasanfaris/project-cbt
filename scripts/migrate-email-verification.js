/**
 * Migration: Tambah kolom email verification ke tabel users
 * Jalankan: node scripts/migrate-email-verification.js
 */

const pool = require('../src/db/pool');

async function migrate() {
  const connection = await pool.getConnection();

  try {
    console.log('🔄 Menjalankan migrasi email verification...');

    // Cek apakah kolom sudah ada
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME IN ('email_verified_at', 'verification_token')
    `);

    const existingCols = columns.map((c) => c.COLUMN_NAME);

    if (!existingCols.includes('email_verified_at')) {
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN email_verified_at TIMESTAMP NULL DEFAULT NULL 
        AFTER is_active
      `);
      console.log('✅ Kolom email_verified_at berhasil ditambahkan.');
    } else {
      console.log('ℹ️  Kolom email_verified_at sudah ada, dilewati.');
    }

    if (!existingCols.includes('verification_token')) {
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN verification_token VARCHAR(255) NULL DEFAULT NULL 
        AFTER email_verified_at
      `);
      console.log('✅ Kolom verification_token berhasil ditambahkan.');
    } else {
      console.log('ℹ️  Kolom verification_token sudah ada, dilewati.');
    }

    // Set admin & user lama sebagai sudah terverifikasi (agar tidak terkunci)
    await connection.query(`
      UPDATE users 
      SET email_verified_at = created_at 
      WHERE email_verified_at IS NULL
    `);
    console.log('✅ User yang sudah ada ditandai sebagai terverifikasi.');

    console.log('\n🎉 Migrasi selesai!');
  } catch (err) {
    console.error('❌ Migrasi gagal:', err.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();
