const express = require("express")
const router = express.Router()
const supabase = require("../supabaseClient")

/**
 * GET DOCTOR'S SCHEDULE
 * GET /api/schedules/:doctor_id
 */
router.get("/:doctor_id", async (req, res) => {
  try {
    const { doctor_id } = req.params

    const { data, error } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", doctor_id)
      .eq("tenant_id", req.tenant_id)
      .order("available_date", { ascending: true })

    if (error) throw error

    res.json({ success: true, schedules: data || [] })
  } catch (err) {
    console.error("Fetch doctor schedule error:", err)
    res.status(500).json({ error: "Failed to fetch schedule" })
  }
})

/**
 * CREATE/UPDATE DOCTOR'S AVAILABILITY SLOT
 * POST /api/schedules/:doctor_id
 */
router.post("/:doctor_id", async (req, res) => {
  try {
    const { doctor_id } = req.params
    const { available_date, time_slots, is_available } = req.body

    if (!available_date || !time_slots) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Check if schedule exists for this date
    const { data: existing } = await supabase
      .from("doctor_schedules")
      .select("id")
      .eq("doctor_id", doctor_id)
      .eq("available_date", available_date)
      .eq("tenant_id", req.tenant_id)
      .single()

    let result
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from("doctor_schedules")
        .update({
          available_slots: time_slots,
          is_available: is_available !== undefined ? is_available : true
        })
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new
      const { data, error } = await supabase
        .from("doctor_schedules")
        .insert([{
          doctor_id,
          tenant_id: req.tenant_id,
          available_date,
          available_slots: time_slots,
          is_available: is_available !== undefined ? is_available : true
        }])
        .select()
        .single()

      if (error) throw error
      result = data
    }

    res.status(201).json({ success: true, schedule: result })
  } catch (err) {
    console.error("Create/update schedule error:", err)
    res.status(500).json({ error: "Failed to save schedule" })
  }
})

/**
 * DELETE AVAILABILITY SLOT
 * DELETE /api/schedules/:schedule_id
 */
router.delete("/:schedule_id", async (req, res) => {
  try {
    const { schedule_id } = req.params

    const { error } = await supabase
      .from("doctor_schedules")
      .delete()
      .eq("id", schedule_id)
      .eq("tenant_id", req.tenant_id)

    if (error) throw error

    res.json({ success: true, message: "Schedule deleted" })
  } catch (err) {
    console.error("Delete schedule error:", err)
    res.status(500).json({ error: "Failed to delete schedule" })
  }
})

/**
 * BULK GET DOCTOR SCHEDULES FOR MULTIPLE DOCTORS
 * GET /api/schedules/doctors/available?date=2024-04-15
 */
router.get("/doctors/available", async (req, res) => {
  try {
    const { date } = req.query

    if (!date) {
      return res.status(400).json({ error: "Date parameter required" })
    }

    const { data, error } = await supabase
      .from("doctor_schedules")
      .select(`
        id,
        doctor_id,
        available_slots,
        doctor:doctors (id, full_name, specialization)
      `)
      .eq("available_date", date)
      .eq("is_available", true)
      .eq("tenant_id", req.tenant_id)
      .order("doctor_id")

    if (error) throw error

    res.json({ success: true, availableDoctors: data || [] })
  } catch (err) {
    console.error("Fetch available doctors error:", err)
    res.status(500).json({ error: "Failed to fetch available doctors" })
  }
})

module.exports = router
