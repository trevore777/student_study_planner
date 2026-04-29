function requireTeacherAuth(req, res, next) {
  const auth = req.signedCookies?.teacher_auth;

  if (!auth || !auth.teacherId || !auth.schoolId) {
    return res.redirect('/teacher/login');
  }

  req.teacherAuth = auth;
  next();
}

module.exports = requireTeacherAuth;