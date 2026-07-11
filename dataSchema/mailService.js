const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async ({ to, subject, text, html }) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email sending skipped.");
    return { skipped: true, message: "Email sending skipped" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'noreply@httpsfood-front-rho.me',
      to,
      subject,
      text,
      html,
    });

    if (error) {
      console.error("Resend Error:", error);
      throw new Error("Failed to send email");
    }

    return {
      skipped: false,
      messageId: data?.id,
    };
  } catch (err) {
    console.error("SendMail Error:", err.message);
    throw err;
  }
};

module.exports = {
  sendMail,
};