const User = require("../models/userModel");

exports.getAllUsers = async (req, res) => {
  try {
    console.log(req.user);
    const users = await User.find();
    if (users.length > 0) {
      return res.status(200).json(users);
    } else {
      return res.status(204).json({ message: "No users found" });
    }
  } catch (err) {
    console.log(err);
  }
};
