require("dotenv").config()

const express = require("express")
const cors = require("cors")

const authMiddleware = require("./middleware/authMiddleware")
const tenantMiddleware = require("./middleware/tenant")

const app = express()

// ================= GLOBAL =================
app.use(cors())
app.use(express.json())

// ================= PUBLIC ROUTES =================
// 🚨 Auth MUST stay public (NO JWT, NO TENANT)
app.use("/api/auth", require("./routes/auth"))

// ================= PROTECTED ROUTES =================
// 1️⃣ Verify JWT
app.use("/api", authMiddleware)

// 2️⃣ Resolve tenant from JWT
app.use("/api", tenantMiddleware)

// 3️⃣ Tenant-scoped APIs (DO NOT re-add auth here)
app.use("/api/patients", require("./routes/patients"))
app.use("/api/doctors", require("./routes/doctors"))
app.use("/api/appointments", require("./routes/appointments"))
app.use("/api/consultations", require("./routes/consultations"))
app.use("/api/tenant", require("./routes/tenant"))
app.use("/api/admin", require("./routes/admin"))
app.use("/api/ai", require("./routes/ai"))
app.use("/api/analytics", require("./routes/analytics"))

// ================= ROOT =================
app.get("/", (req, res) => {
  res.json({ status: "Backend running" })
})

// ================= SERVER =================
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`)
})
