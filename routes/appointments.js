const router = require("express").Router()
const supabase = require("../supabaseClient")

// GET ALL APPOINTMENTS (TENANT SAFE)
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        appointment_time,
        notes,
        patient:patients (
          id,
          full_name
        ),
        doctor:doctors (
          id,
          full_name
        )
      `)
      .eq("tenant_id", req.tenant_id)
      .order("appointment_date", { ascending: false })

    if (error) throw error

    res.json({ success: true, appointments: data })
  } catch (err) {
    console.error("Fetch appointments error:", err)
    res.status(500).json({ error: "Failed to fetch appointments" })
  }
})

// GET APPOINTMENT BY ID (TENANT SAFE)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        appointment_time,
        notes,
        patient:patients (
          id,
          full_name,
          age,
          gender
        ),
        doctor:doctors (
          id,
          full_name
        )
      `)
      .eq("id", id)
      .eq("tenant_id", req.tenant_id)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Appointment not found" })
    }

    res.json({ appointment: data })
  } catch (err) {
    console.error("Fetch appointment error:", err)
    res.status(500).json({ error: "Failed to fetch appointment" })
  }
})

// CREATE APPOINTMENT
router.post("/", async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      notes
    } = req.body

    const { data, error } = await supabase
      .from("appointments")
      .insert([{
        tenant_id: req.tenant_id,
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        notes
      }])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ success: true, appointment: data })
  } catch (err) {
    console.error("Create appointment error:", err)
    res.status(500).json({ error: "Failed to create appointment" })
  }
})

module.exports = router
