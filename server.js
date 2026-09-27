const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());

app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "10mb"
}));

// Frontend files
app.use(express.static(
  path.join(__dirname, "public")
));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Smart Slip Scanner API is running",
    version: "1.0.0"
  });
});

// Main website
app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Smart Slip Scanner running on port ${PORT}`
  );
});
