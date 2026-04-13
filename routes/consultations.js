const router = require("express").Router()
const supabase = require("../supabaseClient")

/**
 * GET ALL CONSULTATIONS (ADMIN / DASHBOARD)
 * GET /api/consultations?page=1&limit=10
 */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit
    const tenant_id = req.tenant_id

    // 1️⃣ Fetch consultations ONLY (NO JOINS)
    const { data: consultations, error, count } = await supabase
      .from("consultations")
      .select("*", { count: 'exact' })
      .eq("tenant_id", tenant_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    if (!consultations.length) {
      return res.json({ 
        success: true,
        consultations: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      })
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

    res.json({ 
      success: true, 
      consultations: enriched,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    })

  } catch (err) {
    console.error("Fetch consultations error:", err)
    res.status(500).json({ error: "Failed to fetch consultations" })
  }
})

/**
 * CREATE CONSULTATION WITH SOAP NOTES
 * POST /api/consultations
 * Body: {
 *   appointment_id, patient_id, doctor_id,
 *   symptoms,
 *   soap_notes: { subjective: string, objective: string, assessment: string, plan: string },
 *   medicines (array),
 *   notes
 * }
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
      soap_notes
    } = req.body

    if (!patient_id || !doctor_id) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const { data, error } = await supabase
      .from("consultations")
      .insert({
        tenant_id: req.tenant_id,
        appointment_id,
        patient_id,
        doctor_id,
        symptoms,
        medicines: medicines || [],
        notes,
        soap_notes: soap_notes || {
          subjective: "",
          objective: "",
          assessment: "",
          plan: ""
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ success: true, consultation: data })

  } catch (err) {
    console.error("Create consultation error:", err)
    res.status(500).json({ error: "Failed to save consultation" })
  }
})

/**
 * UPDATE CONSULTATION (INCLUDING SOAP NOTES)
 * PATCH /api/consultations/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { notes, medicines, soap_notes, symptoms } = req.body

    const updateData = {}
    if (notes !== undefined) updateData.notes = notes
    if (medicines !== undefined) updateData.medicines = medicines
    if (soap_notes !== undefined) updateData.soap_notes = soap_notes
    if (symptoms !== undefined) updateData.symptoms = symptoms

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" })
    }

    const { data, error } = await supabase
      .from("consultations")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", req.tenant_id)
      .select()
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Consultation not found" })
    }

    res.json({ success: true, consultation: data })
  } catch (err) {
    console.error("Update consultation error:", err)
    res.status(500).json({ error: "Failed to update consultation" })
  }
})

/**
 * GET CONSULTATION BY ID
 * GET /api/consultations/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from("consultations")
      .select(`
        id,
        appointment_id,
        patient_id,
        doctor_id,
        symptoms,
        medicines,
        notes,
        soap_notes,
        created_at,
        patient:patients (id, full_name, age, gender),
        doctor:doctors (id, full_name)
      `)
      .eq("id", id)
      .eq("tenant_id", req.tenant_id)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Consultation not found" })
    }

    res.json({ success: true, consultation: data })
  } catch (err) {
    console.error("Fetch consultation error:", err)
    res.status(500).json({ error: "Failed to fetch consultation" })
  }
})

module.exports = router
