const express = require("express");
const connectDB = require("./dataSchema/data.js");
const routes = require("./router.js");
const app = express();
app.use(express.json());
async () => {
  await connectDB();
}

app.use('/', routes);

app.listen(3333, () => {
  console.log("Server is running");
});