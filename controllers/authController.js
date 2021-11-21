const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const User = require("../models/userModel");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = async (req, res) => {
  try {
    const emailCheck = await User.findOne({ email: req.body.email });

    if (emailCheck) {
      return res
        .status(409)
        .json({ message: "The email address is already in use" });
    }

    if (!validator.isEmail(req.body.email)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email address" });
    }

    if (req.body.password !== req.body.passwordConfirm) {
      return res.status(400).json({ message: "Passwords does not match" });
    }

    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      passwordChangedAt: req.body.passwordChangedAt,
    });

    createSendToken(newUser, 201, res);
  } catch (err) {
    res.status(400).json({ message: err.message });
    console.log(err);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) check if the user exists and the password is correct
    const user = await User.findOne({ email });

    if (!user || !(await user.checkPassword(password, user.password))) {
      return res.status(401).json({ message: "Incorrect email or password" });
    }

    // 2) if everything ok, send token to client
    createSendToken(user, 200, res);
  } catch (err) {
    console.log(err);
  }
};

exports.protect = async (req, res, next) => {
  try {
    // 1) check if the user token exist
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        message: "You are not logged in - Please log in to get access",
      });
    }

    // 2) token verification
    let decoded;
    try {
      decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({ message: "Invalid token. Please log in" });
      } else if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Your session token has expired !! Please login again",
        });
      }
    }

    // 3) check if user still exists
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return res.status(401).json({
        message: "The user belonging to this token does no longer exist.",
      });
    }

    // Add the valid logged in user to other requests
    const { password, createdAt, updatedAt, ...filteredUser } =
      currentUser._doc;
    req.user = filteredUser;

    next();
  } catch (err) {
    console.log(err);
  }
};
