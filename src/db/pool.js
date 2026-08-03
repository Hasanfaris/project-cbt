const mysql = require('mysql2/promise');
const config = require('../config/env');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.username,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  // Vercel functions are serverless; keep this low so we don't exceed
  // Aiven's max connection limit across concurrent function invocations.
  connectionLimit: 3,
  queueLimit: 0,
  ...(config.db.ssl
    ? {
        ssl: {
          // Aiven's ssl-mode=REQUIRED encrypts the connection but doesn't
          // require verifying the CA chain. Set rejectUnauthorized: true
          // and provide Aiven's CA certificate if you want full verification.
          rejectUnauthorized: false,
        },
      }
    : {}),
});

module.exports = pool;
