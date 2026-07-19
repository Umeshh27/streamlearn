import express from "express";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.get("/api/auth/signup", (req, res) => {
  res.send("Signup Route");
});

app.get("/api/auth/login", (req, res) => {
  res.send("Login Route");
});

app.get("/api/auth/logout", (req, res) => {
  res.send("Logout Route");
});


app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
