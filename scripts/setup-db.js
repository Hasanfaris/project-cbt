const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

async function setupDatabase() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const connection = await mysql.createConnection(config);
  await connection.query(schema);
  await connection.end();

  console.log('Database berhasil disetup.');
}

setupDatabase().catch((err) => {
  console.error('Gagal setup database:', err.message);
  process.exit(1);
});
