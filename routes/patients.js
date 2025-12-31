const express = require("express")
const router = express.Router()
const supabase = require("../supabaseClient")

// HEALTH
router.get("/health", (req, res) => {
  res.json({ status: "patients route active" })
})

// CREATE PATIENT
router.post("/", async (req, res) => {
  try {
    const { full_name, age, gender, phone, symptoms } = req.body

    if (!full_name || !age || !gender) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const { data, error } = await supabase
      .from("patients")
      .insert([{
        tenant_id: req.tenant_id,
        full_name,
        age,
        gender,
        phone,
        symptoms
      }])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ success: true, patient: data })
  } catch (err) {
    console.error("Create patient error:", err)
    res.status(500).json({ error: "Failed to create patient" })
  }
})

// FETCH PATIENTS (TENANT SAFE)
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("tenant_id", req.tenant_id)
      .order("created_at", { ascending: false })

    if (error) throw error

    res.json({ success: true, patients: data })
  } catch (err) {
    console.error("Fetch patients error:", err)
    res.status(500).json({ error: "Failed to fetch patients" })
  }
})

module.exports = router
