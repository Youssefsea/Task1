const express = require("express");
const connectDB = require("./dataSchema/data.js");
const routes = require("./router.js");
const app = express();
app.use(express.json());
connectDB();

app.use('/', routes);

app.listen(3444, () => {
  console.log("Server is running", "http://localhost:3444");
});
