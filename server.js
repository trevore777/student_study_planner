const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const morgan = require('morgan');
const session = require('express-session');

const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teacher');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use((req, res, next) => {
  res.locals.isTeacherLoggedIn = Boolean(req.session?.isTeacherLoggedIn);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/client', express.static(path.join(__dirname, 'client')));

app.use('/', studentRoutes);
app.use('/teacher', teacherRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Page not found' });
});

app.listen(PORT, () => {
  console.log(`StudyTrack running on http://localhost:${PORT}`);
});