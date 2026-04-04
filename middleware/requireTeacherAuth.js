function requireTeacherAuth(req, res, next) {
  if (req.session && req.session.isTeacherLoggedIn) {
    return next();
  }

  return res.redirect('/teacher/login');
}

module.exports = requireTeacherAuth;