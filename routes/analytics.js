const router = require("express").Router()
const supabase = require("../supabaseClient")

/**
 * TENANT-SAFE ANALYTICS OVERVIEW
 * GET /api/analytics/overview
 */
router.get("/overview", async (req, res) => {
  try {
    const tenant_id = req.tenant_id
    const today = new Date().toISOString().split("T")[0]

    // STRICT TENANT FILTERING — NO JOINS
    const [{ data: patients }, { data: appointments }, { data: users }] =
      await Promise.all([
        supabase
          .from("patients")
          .select("id, created_at")
          .eq("tenant_id", tenant_id),

        supabase
          .from("appointments")
          .select("id, appointment_date")
          .eq("tenant_id", tenant_id),

        supabase
          .from("users")
          .select("id, role")
          .eq("tenant_id", tenant_id),
      ])

    res.json({
      today: {
        patients: patients.filter(p =>
          p.created_at.startsWith(today)
        ).length,

        appointments: appointments.filter(a =>
          a.appointment_date === today
        ).length,
      },
      totals: {
        users: users.length,
        doctors: users.filter(u => u.role === "doctor").length,
        receptionists: users.filter(u => u.role === "receptionist").length,
      },
    })
  } catch (err) {
    console.error("Analytics error:", err)
    res.status(500).json({ error: "Failed to load analytics" })
  }
})

module.exports = router
