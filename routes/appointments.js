const router = require("express").Router()
const supabase = require("../supabaseClient")

// GET ALL APPOINTMENTS (TENANT SAFE) - WITH PAGINATION
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const status = req.query.status
    const offset = (page - 1) * limit

    let query = supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        appointment_time,
        notes,
        status,
        reason_for_cancellation,
        patient:patients (
          id,
          full_name
        ),
        doctor:doctors (
          id,
          full_name
        )
      `, { count: 'exact' })
      .eq("tenant_id", req.tenant_id)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error, count } = await query
      .order("appointment_date", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    res.json({ 
      success: true, 
      appointments: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    })
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

    if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert([{
        tenant_id: req.tenant_id,
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        notes,
        status: "pending"
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

// UPDATE APPOINTMENT STATUS
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params
    const { status, reason_for_cancellation } = req.body

    const validStatuses = ["pending", "confirmed", "attended", "cancelled", "no-show"]
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid appointment status" })
    }

    const updateData = { status }
    if (status === "cancelled" && reason_for_cancellation) {
      updateData.reason_for_cancellation = reason_for_cancellation
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", req.tenant_id)
      .select()
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Appointment not found" })
    }

    res.json({ success: true, appointment: data })
  } catch (err) {
    console.error("Update appointment status error:", err)
    res.status(500).json({ error: "Failed to update appointment" })
  }
})

// GET AVAILABLE APPOINTMENT SLOTS FOR DOCTOR
router.get("/available-slots/:doctor_id", async (req, res) => {
  try {
    const { doctor_id } = req.params
    const { date } = req.query

    if (!date) {
      return res.status(400).json({ error: "Date parameter required" })
    }

    // Get doctor's schedule for the date
    const { data: schedules, error: scheduleError } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", doctor_id)
      .eq("tenant_id", req.tenant_id)
      .eq("available_date", date)
      .eq("is_available", true)
      .single()

    if (scheduleError || !schedules) {
      return res.json({ success: true, availableSlots: [] })
    }

    // Get booked appointments for this doctor on that date
    const { data: appointments, error: appointmentError } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("doctor_id", doctor_id)
      .eq("appointment_date", date)
      .neq("status", "cancelled")
      .eq("tenant_id", req.tenant_id)

    if (appointmentError) throw appointmentError

    const bookedTimes = appointments.map(apt => apt.appointment_time)
    const allSlots = schedules.available_slots || []
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot))

    res.json({ success: true, availableSlots })
  } catch (err) {
    console.error("Get available slots error:", err)
    res.status(500).json({ error: "Failed to fetch available slots" })
  }
})

module.exports = router
