//npm install mongodb express cors dotenv

const express = require("express");
const app = express();
const cors = require("cors");
//require("dotenv").config({ path: "./config.env" });
const port = process.env.PORT || 4001;
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(require("./record"));
// get driver connection
const dbo = require("./database");

app.listen(port, () => {
  // perform a database connection when server starts
});
