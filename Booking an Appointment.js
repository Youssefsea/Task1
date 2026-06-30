
const bookedSlots = ["b3", "a1"];

function bookAppointment(slot) {
  return new Promise((resolve, reject) => {


    setTimeout(() => {
      if (bookedSlots.includes(slot)) {
        reject(`No Book availble `);
      } else {
        resolve(`ADD Your Book.`);
      }
    }, 2000);

  });

}



bookAppointment("a2").then((message) => {
  console.log(message);
}).catch((error) => {
  console.log(error);
} );
