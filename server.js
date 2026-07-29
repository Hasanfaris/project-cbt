const express = require('express');
const path = require('path');
const session = require('express-session');
const config = require('./src/config/env');

const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const adminRoutes = require('./src/routes/admin');
const guruRoutes = require('./src/routes/guru');
const siswaRoutes = require('./src/routes/siswa');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.locals.appName = config.app.name;
app.locals.appUrl = config.app.url;

app.get('/', (req, res) => {
  res.render('index', {
    title: 'MauBelajar - Platform Ujian Online',
    appName: config.app.name,
  });
});

app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/guru', guruRoutes);
app.use('/siswa', siswaRoutes);

app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Halaman Tidak Ditemukan',
    appName: config.app.name,
    user: req.session.user || null,
  });
});

app.listen(config.app.port, () => {
  console.log(`MauBelajar berjalan di ${config.app.url}`);
});
