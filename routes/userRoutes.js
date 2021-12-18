const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController.js");
const userController = require("../controllers/userController");
const uploadsController = require("../controllers/uploadsController");
router.get(
  "/allUsers",
  authController.protect,
  authController.restrictRoutes("admin", "user"),
  userController.getAllUsers
);

router.patch(
  "/uploadImage",
  authController.protect,
  uploadsController.uploadImage,
  uploadsController.uploadProfilePic
);

router.patch(
  "/uploadImageToCloudinary",
  authController.protect,
  uploadsController.uploadImageV2,
  uploadsController.uploadViaCloudinary
);

module.exports = router;
