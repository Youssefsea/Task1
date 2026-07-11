const formatReservationDateTime = (reservationDate) => {
  const dateObj = new Date(reservationDate);

  return {
    date: dateObj.toLocaleDateString("en-GB"),
    time: dateObj.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const verificationEmailTemplate = ({ name, code, expiryMinutes }) => ({
  subject: "Verify your account",
  text: `Hi ${name || "there"},\n\nYour verification code is: ${code}\nThis code expires in ${expiryMinutes} minutes.\n\nIf you did not create this account, please ignore this email.`,
  html: `
    <div style="font-family: Arial, sans-serif; line-height:1.6;">
      <h3>Account Verification</h3>
      <p>Hi ${name || "there"},</p>
      <p>Your verification code is:</p>
      <p style="font-size:24px; font-weight:bold; letter-spacing:2px;">${code}</p>
      <p>This code expires in ${expiryMinutes} minutes.</p>
    </div>
  `,
});

const bookingCustomerTemplate = ({ customerName, dishLines, reservationDate }) => {
  const { date, time } = formatReservationDateTime(reservationDate);

  return {
    subject: "Your reservation is confirmed",
    text: `Hi ${customerName || "there"},\n\nWelcome! Your reservation is confirmed.\n\nReserved meals:\n${dishLines}\n\nReservation date: ${date}\nReservation time: ${time}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h3>Reservation Confirmed</h3>
        <p>Hi ${customerName || "there"},</p>
        <p>Welcome! Your reservation is confirmed.</p>
        <p><strong>Reserved meals:</strong><br/>${dishLines.replace(/\n/g, "<br/>")}</p>
        <p><strong>Reservation date:</strong> ${date}</p>
        <p><strong>Reservation time:</strong> ${time}</p>
      </div>
    `,
  };
};

const bookingRestaurantTemplate = ({ restaurantName, customerName, dishLines, reservationDate }) => {
  const { date, time } = formatReservationDateTime(reservationDate);

  return {
    subject: "New booking reservation received",
    text: `Hello ${restaurantName || "team"},\n\nYou have a new reservation${customerName ? ` from ${customerName}` : ""}.\n\nReserved meals:\n${dishLines}\n\nReservation date: ${date}\nReservation time: ${time}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h3>New Booking Reservation</h3>
        <p>Hello ${restaurantName || "team"},</p>
        <p>You have a new reservation${customerName ? ` from <strong>${customerName}</strong>` : ""}.</p>
        <p><strong>Reserved meals:</strong><br/>${dishLines.replace(/\n/g, "<br/>")}</p>
        <p><strong>Reservation date:</strong> ${date}</p>
        <p><strong>Reservation time:</strong> ${time}</p>
      </div>
    `,
  };
};

module.exports = {
  verificationEmailTemplate,
  bookingCustomerTemplate,
  bookingRestaurantTemplate,
};