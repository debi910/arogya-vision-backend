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

// FETCH PATIENTS (TENANT SAFE) - WITH SEARCH & PAGINATION
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const search = req.query.search || ""
    const offset = (page - 1) * limit

    let query = supabase
      .from("patients")
      .select("*", { count: 'exact' })
      .eq("tenant_id", req.tenant_id)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    res.json({ 
      success: true, 
      patients: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    })
  } catch (err) {
    console.error("Fetch patients error:", err)
    res.status(500).json({ error: "Failed to fetch patients" })
  }
})

// GET PATIENT MEDICAL HISTORY (HIGHLY DETAILED)
router.get("/:id/history", async (req, res) => {
  try {
    const { id } = req.params

    // Get patient basic info
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", req.tenant_id)
      .single()

    if (patientError || !patient) {
      return res.status(404).json({ error: "Patient not found" })
    }

    // Get all appointments
    const { data: appointments, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        notes,
        doctor:doctors (id, full_name)
      `)
      .eq("patient_id", id)
      .eq("tenant_id", req.tenant_id)
      .order("appointment_date", { ascending: false })

    if (appointmentError) throw appointmentError

    // Get all consultations with SOAP notes
    const { data: consultations, error: consultationError } = await supabase
      .from("consultations")
      .select(`
        id,
        created_at,
        diagnosis,
        treatment_plan,
        soap_notes,
        doctor:doctors (id, full_name)
      `)
      .eq("patient_id", id)
      .eq("tenant_id", req.tenant_id)
      .order("created_at", { ascending: false })

    if (consultationError) throw consultationError

    // Get all prescriptions
    const { data: prescriptions, error: prescriptionError } = await supabase
      .from("prescriptions")
      .select(`
        id,
        medicine_name,
        dosage,
        frequency,
        duration,
        created_at,
        consultation:consultations (id)
      `)
      .eq("patient_id", id)
      .eq("tenant_id", req.tenant_id)
      .order("created_at", { ascending: false })

    if (prescriptionError) throw prescriptionError

    // Get vital signs
    const { data: vitalSigns, error: vitalError } = await supabase
      .from("vital_signs")
      .select("*")
      .eq("patient_id", id)
      .eq("tenant_id", req.tenant_id)
      .order("recorded_at", { ascending: false })
      .limit(20)

    if (vitalError) throw vitalError

    res.json({
      success: true,
      history: {
        patient,
        appointments,
        consultations,
        prescriptions,
        vitalSigns,
        statistics: {
          totalAppointments: appointments.length,
          totalConsultations: consultations.length,
          activePrescriptions: prescriptions.filter(p => !p.completed_at).length,
          lastVisit: appointments[0]?.appointment_date || null
        }
      }
    })
  } catch (err) {
    console.error("Fetch patient history error:", err)
    res.status(500).json({ error: "Failed to fetch patient history" })
  }
})

module.exports = router
