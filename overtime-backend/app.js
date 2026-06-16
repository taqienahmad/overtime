console.log("APP.JS LOADED");

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION");
  console.error(err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION");
  console.error(err);
});

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./db");

const overtimeRoutes =
  require("./routes/overtimeRoutes");

const authRoutes =
  require("./routes/authRoutes");

const app = express();

app.use((req, res, next) => {
  console.log(
    "REQUEST:",
    req.method,
    req.originalUrl
  );
  next();
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  console.log("HOME ROUTE HIT");
  res.send("HOME OK");
});

app.get("/test", (req, res) => {
  console.log("TEST ROUTE HIT");
  res.send("APP TEST OK");
});

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/overtime",
  overtimeRoutes
);

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, async () => {

  console.log("================================");
  console.log("SERVER STARTED");
  console.log("PORT :", PORT);
  console.log("================================");

  try {

    const result =
      await pool.query(
        "SELECT NOW()"
      );

    console.log(
      "DATABASE CONNECTED"
    );

    console.log(
      result.rows
    );

  } catch (err) {

    console.error(
      "DATABASE ERROR"
    );

    console.error(err);

  }

});