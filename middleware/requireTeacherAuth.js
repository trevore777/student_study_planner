function requireTeacherAuth(req, res, next) {
  if (req.signedCookies?.teacher_auth === 'yes') {
    return next();
  }

  return res.redirect('/teacher/login');
}

module.exports = requireTeacherAuth;