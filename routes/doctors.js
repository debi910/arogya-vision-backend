const router = require("express").Router()
const supabase = require("../supabaseClient")

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("tenant_id", req.tenant_id)
      .order("created_at", { ascending: false })

    if (error) throw error

    res.json({ success: true, doctors: data })
  } catch (err) {
    console.error("Fetch doctors error:", err)
    res.status(500).json({ error: "Failed to fetch doctors" })
  }
})

router.post("/", async (req, res) => {
  try {
    const { full_name, specialization, phone } = req.body

    const { data, error } = await supabase
      .from("doctors")
      .insert([{
        tenant_id: req.tenant_id,
        full_name,
        specialization,
        phone
      }])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ success: true, doctor: data })
  } catch (err) {
    console.error("Create doctor error:", err)
    res.status(500).json({ error: "Failed to add doctor" })
  }
})

module.exports = router
