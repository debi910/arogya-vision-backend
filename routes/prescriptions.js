const express = require("express")
const router = express.Router()
const supabase = require("../supabaseClient")

/**
 * GET ALL PRESCRIPTIONS FOR PATIENT
 * GET /api/prescriptions?patient_id=xyz&active=true
 */
router.get("/", async (req, res) => {
  try {
    const { patient_id, active } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit

    if (!patient_id) {
      return res.status(400).json({ error: "patient_id is required" })
    }

    let query = supabase
      .from("prescriptions")
      .select(`
        id,
        medicine_name,
        dosage,
        frequency,
        duration,
        instructions,
        created_at,
        completed_at,
        doctor:doctors (id, full_name),
        patient:patients (id, full_name)
      `, { count: 'exact' })
      .eq("patient_id", patient_id)
      .eq("tenant_id", req.tenant_id)

    if (active === "true") {
      query = query.is("completed_at", null)
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    res.json({
      success: true,
      prescriptions: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    })
  } catch (err) {
    console.error("Fetch prescriptions error:", err)
    res.status(500).json({ error: "Failed to fetch prescriptions" })
  }
})

/**
 * GET PRESCRIPTION BY ID
 * GET /api/prescriptions/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from("prescriptions")
      .select(`
        id,
        medicine_name,
        dosage,
        frequency,
        duration,
        instructions,
        created_at,
        completed_at,
        doctor:doctors (id, full_name),
        patient:patients (id, full_name),
        consultation:consultations (id, diagnosis)
      `)
      .eq("id", id)
      .eq("tenant_id", req.tenant_id)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Prescription not found" })
    }

    res.json({ success: true, prescription: data })
  } catch (err) {
    console.error("Fetch prescription error:", err)
    res.status(500).json({ error: "Failed to fetch prescription" })
  }
})

/**
 * CREATE PRESCRIPTION
 * POST /api/prescriptions
 */
router.post("/", async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      consultation_id,
      medicine_name,
      dosage,
      frequency,
      duration,
      instructions
    } = req.body

    if (!patient_id || !doctor_id || !medicine_name) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const { data, error } = await supabase
      .from("prescriptions")
      .insert([{
        tenant_id: req.tenant_id,
        patient_id,
        doctor_id,
        consultation_id,
        medicine_name,
        dosage: dosage || "",
        frequency: frequency || "",
        duration: duration || "",
        instructions: instructions || "",
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ success: true, prescription: data })
  } catch (err) {
    console.error("Create prescription error:", err)
    res.status(500).json({ error: "Failed to create prescription" })
  }
})

/**
 * UPDATE PRESCRIPTION
 * PATCH /api/prescriptions/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { medicine_name, dosage, frequency, duration, instructions, mark_completed } = req.body

    const updateData = {}
    if (medicine_name) updateData.medicine_name = medicine_name
    if (dosage) updateData.dosage = dosage
    if (frequency) updateData.frequency = frequency
    if (duration) updateData.duration = duration
    if (instructions) updateData.instructions = instructions
    if (mark_completed === true) updateData.completed_at = new Date().toISOString()

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" })
    }

    const { data, error } = await supabase
      .from("prescriptions")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", req.tenant_id)
      .select()
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Prescription not found" })
    }

    res.json({ success: true, prescription: data })
  } catch (err) {
    console.error("Update prescription error:", err)
    res.status(500).json({ error: "Failed to update prescription" })
  }
})

/**
 * DELETE PRESCRIPTION
 * DELETE /api/prescriptions/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from("prescriptions")
      .delete()
      .eq("id", id)
      .eq("tenant_id", req.tenant_id)

    if (error) throw error

    res.json({ success: true, message: "Prescription deleted" })
  } catch (err) {
    console.error("Delete prescription error:", err)
    res.status(500).json({ error: "Failed to delete prescription" })
  }
})

module.exports = router
