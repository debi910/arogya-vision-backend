module.exports = function tenantMiddleware(req, res, next) {
  // Tenant ID is already extracted from JWT in authMiddleware
  // This middleware validates that it exists
  if (!req.tenant_id) {
    return res.status(401).json({ error: "Tenant ID not found in token" })
  }
  next()
}

