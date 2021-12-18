const express = require("express");
const dotenv = require("dotenv").config();
const DB = require("./database").connectToDb;
const app = express();

const authRouter = require("./routes/authRoutes");
const userRouter = require("./routes/userRoutes");

// connect to DB server
DB();

app.use(express.json());
//app.use(express.urlencoded({ extended: false }));

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);

app.listen(process.env.PORT, () => {
  console.log("listening on port " + process.env.PORT);
});
