const express = require("express")
const jwt = require("jsonwebtoken")
const supabase = require("../supabaseClient")
const supabaseAdmin = require("../supabaseAdmin")
require("dotenv").config()

const router = express.Router()

/**
 * REGISTER ADMIN + TENANT (PUBLIC)
 * POST /api/auth/register-admin
 */
router.post("/register-admin", async (req, res) => {
  try {
    const {
      clinic_name,
      admin_name,
      email,
      password,
      address,
      phone
    } = req.body

    if (!clinic_name || !admin_name || !email || !password) {
      return res.status(400).json({
        error: "clinic_name, admin_name, email and password are required"
      })
    }

    // 1️⃣ Create Supabase AUTH user
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

    if (authError) throw authError

    // 2️⃣ Create TENANT
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: clinic_name,
        address,
        phone
      })
      .select()
      .single()

    if (tenantError) throw tenantError

    // 3️⃣ Create ADMIN user (app-level)
    const { error: userError } = await supabase
      .from("users")
      .insert({
        auth_user_id: authUser.user.id,
        email,
        full_name: admin_name,
        role: "admin",
        tenant_id: tenant.id,
        is_active: true
      })

    if (userError) throw userError

    // 4️⃣ Issue JWT (LONGER EXPIRY)
    const token = jwt.sign(
      {
        userId: authUser.user.id,
        role: "admin",
        tenant_id: tenant.id
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // ✅ FIXED
    )

    res.status(201).json({
      success: true,
      token,
      role: "admin",
      tenant: {
        id: tenant.id,
        name: tenant.name
      }
    })

  } catch (err) {
    console.error("Admin register error:", err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * LOGIN USER
 * POST /api/auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // 1️⃣ Supabase Auth login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error || !data?.user) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const authUserId = data.user.id

    // 2️⃣ Fetch app user
    const { data: user, error: uErr } = await supabase
      .from("users")
      .select("id, full_name, role, tenant_id, is_active")
      .eq("auth_user_id", authUserId)
      .eq("is_active", true)
      .single()

    if (uErr || !user) {
      return res.status(401).json({ message: "User not registered in system" })
    }

    // 3️⃣ Issue JWT (LONGER EXPIRY)
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        tenant_id: user.tenant_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // ✅ FIXED
    )

    res.json({
      success: true,
      token,
      role: user.role,
      name: user.full_name,
      tenant_id: user.tenant_id
    })

  } catch (err) {
    console.error("Login error:", err)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
