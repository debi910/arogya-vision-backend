const router = require("express").Router()
const supabase = require("../supabaseClient")

/**
 * GET ALL CONSULTATIONS (ADMIN / DASHBOARD)
 * GET /api/consultations
 */
router.get("/", async (req, res) => {
  try {
    const tenant_id = req.tenant_id

    // 1️⃣ Fetch consultations ONLY (NO JOINS)
    const { data: consultations, error } = await supabase
      .from("consultations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("created_at", { ascending: false })

    if (error) throw error

    if (!consultations.length) {
      return res.json({ consultations: [] })
    }

    // 2️⃣ Collect patient & doctor IDs
    const patientIds = [...new Set(consultations.map(c => c.patient_id))]
    const doctorIds = [...new Set(consultations.map(c => c.doctor_id))]

    // 3️⃣ Fetch patients
    const { data: patients, error: pErr } = await supabase
      .from("patients")
      .select("id, full_name, age, gender")
      .in("id", patientIds)

    if (pErr) throw pErr

    // 4️⃣ Fetch doctors
    const { data: doctors, error: dErr } = await supabase
      .from("doctors")
      .select("id, full_name")
      .in("id", doctorIds)

    if (dErr) throw dErr

    // 5️⃣ Map for fast lookup
    const patientMap = {}
    patients.forEach(p => (patientMap[p.id] = p))

    const doctorMap = {}
    doctors.forEach(d => (doctorMap[d.id] = d))

    // 6️⃣ Attach manually
    const enriched = consultations.map(c => ({
      ...c,
      patient: patientMap[c.patient_id] || null,
      doctor: doctorMap[c.doctor_id] || null,
    }))

    res.json({ consultations: enriched })

  } catch (err) {
    console.error("Fetch consultations error:", err)
    res.status(500).json({ error: "Failed to fetch consultations" })
  }
})

/**
 * CREATE CONSULTATION
 * POST /api/consultations
 */
router.post("/", async (req, res) => {
  try {
    const {
      appointment_id,
      patient_id,
      doctor_id,
      symptoms,
      medicines,
      notes,
    } = req.body

    const { data, error } = await supabase
      .from("consultations")
      .insert({
        tenant_id: req.tenant_id,
        appointment_id,
        patient_id,
        doctor_id,
        symptoms,
        medicines,
        notes,
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ consultation: data })

  } catch (err) {
    console.error("Create consultation error:", err)
    res.status(500).json({ error: "Failed to save consultation" })
  }
})

module.exports = router
