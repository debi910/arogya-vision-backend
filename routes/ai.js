const router = require("express").Router()
const axios = require("axios")

router.post("/suggest", async (req, res) => {
  try {
    const { symptoms } = req.body

    if (!symptoms) {
      return res.status(400).json({ error: "Symptoms required" })
    }

    const prompt = `
You are a clinical assistant for doctors in India.

Respond in EXACTLY this format.
Do NOT add explanations or extra text.

MEDICINES:
- Medicine name | Dose | Frequency | Duration

NOTES:
- Short clinical advice

Symptoms:
${symptoms}
`

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a medical assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    )

    const aiText = response.data.choices[0].message.content
    res.json({ success: true, ai_response: aiText })

  } catch (err) {
    console.error("AI error:", err.response?.data || err.message)
    res.status(500).json({ error: "AI service failed" })
  }
})

module.exports = router
