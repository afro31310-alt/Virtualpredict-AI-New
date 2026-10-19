const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const plans = {
  regular: { name: "Regular", price: 200, credits: 7 },
  premium: { name: "Premium", price: 450, credits: 24 },
  vip: { name: "VIP", price: 1000, credits: 60 }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.get("/api/plans", (req, res) => {
  res.json(plans);
});

app.post("/api/payment-proof", upload.single("screenshot"), async (req, res) => {
  try {
    const { plan, customerEmail, transactionId } = req.body;
    const selected = plans[plan];

    if (!selected) {
      return res.status(400).json({ error: "Choose a valid plan." });
    }

    if (!customerEmail || !customerEmail.includes("@")) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (!transactionId && !req.file) {
      return res.status(400).json({
        error: "Provide a transaction ID or payment screenshot."
      });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      return res.status(500).json({
        error: "Payment-proof email service is not configured yet."
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });

    const attachments = req.file
      ? [{
          filename: req.file.originalname || "payment-proof.jpg",
          content: req.file.buffer,
          contentType: req.file.mimetype
        }]
      : [];

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "afrobtd@gmail.com",
      subject: `VirtualPredict ${selected.name} payment review`,
      text:
        `Plan: ${selected.name}\n` +
        `Price: GH₵${selected.price}\n` +
        `Credits requested: ${selected.credits}\n` +
        `Customer email: ${customerEmail}\n` +
        `Transaction ID: ${transactionId || "Screenshot attached"}\n\n` +
        `Please manually verify the payment before activating credits.`,
      attachments
    });

    res.json({
      success: true,
      message: "Payment proof sent for manual review. Credits are not active yet."
    });

  } catch (error) {
    console.error("PAYMENT PROOF EMAIL ERROR:", error);

    res.status(500).json({
      error: "Could not send payment proof. Please try again."
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`VirtualPredict new backend listening on ${PORT}`);
});
