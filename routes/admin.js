const express = require("express");
const router = express.Router();

const adminOnly = require("../middleware/adminOnly");
const supabase = require("../supabaseClient");
const supabaseAdmin = require("../supabaseAdmin");

/**
 * GET ALL USERS (ADMIN ONLY)
 * GET /api/admin/users
 */
router.get("/users", adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, role, created_at")
      .eq("tenant_id", req.user.tenant_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, users: data });
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * CREATE USER (ADMIN ONLY)
 * POST /api/admin/users
 */
router.post("/users", adminOnly, async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 1️⃣ Create AUTH user (Service Role)
    const { data: authData, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authErr) {
      console.error("Auth create error:", authErr);
      return res.status(400).json({ error: authErr.message });
    }

    // 2️⃣ Insert into users table
    const { error: dbErr } = await supabase.from("users").insert({
      auth_user_id: authData.user.id,
      email,
      full_name,
      role,
      tenant_id: req.user.tenant_id,
      is_active: true,
    });

    if (dbErr) {
      console.error("DB insert error:", dbErr);
      return res.status(500).json({ error: dbErr.message });
    }

    res.status(201).json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        full_name,
        role,
      },
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

module.exports = router;

