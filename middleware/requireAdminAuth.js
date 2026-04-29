function requireAdminAuth(req, res, next) {
  const auth = req.signedCookies?.admin_auth;

  if (!auth || !auth.teacherId || auth.role !== 'admin') {
    return res.redirect('/admin/login');
  }

  req.adminAuth = auth;
  next();
}

module.exports = requireAdminAuth;