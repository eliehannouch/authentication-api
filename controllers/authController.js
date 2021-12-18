const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const validator = require("validator");
const User = require("../models/userModel");
const sendMail = require("../utils/email").sendMail;

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

    // 4) check if the user changed the password after the token was created
    if (currentUser.passwordChangedAfterTokenIssued(decoded.iat)) {
      return res.status(401).json({
        message: " Your password has been changed recently. Please login again",
      });
    }

    // Add the valid logged in user to other requests
    req.user = currentUser;

    next();
  } catch (err) {
    console.log(err);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    // 1 - find if the user with the provided email exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res
        .status(404)
        .json({ message: " The user with the provided email does not exist" });
    }

    // 2 - Create the random token
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3- send the token via email
    //  http://127.0.0.1:3000/api/auth/resetPassword/ec967ac26b88c685a43028a30078bc0b6185653d1a1475ce60995dd1921b776f

    const url = `${req.protocol}://${req.get(
      "host"
    )}/api/auth/resetPassword/${resetToken}`;
    const msg = `Forgot your Password ? Reset it by visting the following link: ${url}`;

    try {
      await sendMail({
        email: user.email,
        subject: "Your Password Reset Token (valid for 10 min)",
        message: msg,
      });
      res.status(200).json({
        status: "success",
        message:
          " The Reset token was successfully sent to your email address.",
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      res.status(500).json({
        status: "success",
        message:
          " An error occurred while sending the email. Please try again in a moment",
      });
    }
  } catch (err) {
    console.log(err);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const hashtoken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashtoken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message:
          " The token is invalid or expired. Please submit another request",
      });
    }

    if (req.body.password.length < 8) {
      return res.status(400).json({
        message: "Password length must be at least 8 characters",
      });
    }

    if (req.body.password !== req.body.passwordConfirm) {
      return res.status(400).json({
        message: "Password and PasswordConfirm does not match",
      });
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    createSendToken(user, 200, res);
  } catch (err) {
    console.log(err);
  }
};

exports.restrictRoutes = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        res
          .status(401)
          .json({ message: "You dont have permission to access this page" })
      );
    }
    next();
  };
};
