require('dotenv').config();

module.exports = {
  app: {
    name: process.env.APP_NAME || 'MauBelajar',
    env: process.env.APP_ENV || 'local',
    debug: process.env.APP_DEBUG === 'true',
    url: process.env.APP_URL || 'http://localhost:3000',
    port: parseInt(process.env.APP_PORT, 10) || 3000,
    timezone: process.env.TIMEZONE || 'Asia/Jakarta',
  },
  db: {
    connection: process.env.DB_CONNECTION || 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_DATABASE || 'cbt_db',
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change_this_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  session: {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'change_this_secret_key',
  },
  mail: {
    host: process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.MAIL_PORT, 10) || 2525,
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || '',
    from: process.env.MAIL_FROM || 'noreply@maubelajar.id',
    fromName: process.env.MAIL_FROM_NAME || 'MauBelajar',
  },
};

