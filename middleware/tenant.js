const supabase = require("../supabaseClient")

module.exports = async function tenantMiddleware(req, res, next) {
  try {
    // TEMP: get first admin user
    const { data: admin, error } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("role", "admin")
      .limit(1)
      .single()

    if (error || !admin) {
      return res.status(401).json({ error: "Admin tenant not found" })
    }

    req.tenant_id = admin.tenant_id
    next()

  } catch (err) {
    console.error("Tenant middleware error:", err)
    res.status(500).json({ error: "Tenant resolution failed" })
  }
}

