const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController.js");
const userController = require("../controllers/userController");

router.get("/allUsers", authController.protect, userController.getAllUsers);

module.exports = router;
