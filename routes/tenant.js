const router = require("express").Router()
const supabase = require("../supabaseClient")

/**
 * GET TENANT PROFILE
 * GET /api/tenant/profile
 */
router.get("/profile", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, logo_url, address, phone")
      .eq("id", req.tenant_id)
      .single()

    if (error || !data) {
      return res.status(404).json({
        error: "Tenant not found"
      })
    }

    res.json({
      success: true,
      tenant: data
    })
  } catch (err) {
    console.error("Tenant profile error:", err)
    res.status(500).json({
      error: "Failed to fetch tenant profile"
    })
  }
})

module.exports = router
