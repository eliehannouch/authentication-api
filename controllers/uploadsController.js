const sharp = require("sharp");
const multer = require("multer");
const cloudinary = require("../utils/cloudinary");
const User = require("../models/userModel");

// Version 1 Upload images locally

// 1- Create the multerStorage
const multerStorage = multer.memoryStorage();

// 2- Create a filter to only allow images upload
const filter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image. Please upload only images"), false);
  }
};

// 3- Create the image upload instance
const upload = multer({
  storage: multerStorage,
  fileFilter: filter,
});

// 4- upload image (populate the file object on our req)
exports.uploadImage = upload.single("photo");

// 5- process the populated file
exports.uploadProfilePic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json("There is no uploaded image");
    } else {
      const type = req.file.mimetype.split("/")[1];
      var timestamp = new Date().getTime();
      req.file.filename = `img-${timestamp}.${type}`;
      var filePath = `./uploads/images/${req.file.filename}`;

      await sharp(req.file.buffer).toFormat(type).toFile(filePath);
      //.jpeg({ quality: 100 });
      // .resize(200, 200);

      req.user = await User.findByIdAndUpdate(req.user._id, {
        profilePic: filePath,
      });
      return res.status(200).json({ message: "Image uploaded successfully" });
    }
  } catch (err) {
    console.log(err);
  }
};

// Version 2  Upload images to the cloud
// 1 - create multerstorage to deal with cloudinary
const multerstorageV2 = multer.diskStorage({});

// 2- Create the upload instance
const uploadV2 = multer({
  storage: multerstorageV2,
  fileFilter: filter,
});

// 3- upload the image to populate the file object
exports.uploadImageV2 = uploadV2.single("photo");

exports.uploadViaCloudinary = async (req, res) => {
  try {
    // upload the img to cloudinary
    const image = await cloudinary.uploader.upload(req.file.path, {
      folder: "gdgnodecourse",
    });

    req.user = await User.findByIdAndUpdate(req.user._id, {
      profilePic: image.secure_url,
      cloudinary_id: image.public_id,
    });
    return res.status(200).json({ message: "Image uploaded successfully" });
  } catch (err) {
    console.log(err);
  }
};
