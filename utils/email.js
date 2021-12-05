const nodemailer = require("nodemailer");

exports.sendMail = async (options) => {
  // 1 - create a transporter instance
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2- Define the email options
  const mailOptions = {
    from: "GDG Lebanon <info@gdglebanon.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // 3 - send the mail

  await transporter.sendMail(mailOptions);
};
