require('dotenv').config();
const express = require('express');
const app = express();
const connectDB = require('./dataSchema/data');
const router = require('./router');
const cookieParser = require('cookie-parser');
const cors = require('cors');


connectDB();
app.use(express.json());

app.use(cookieParser());

app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));



app.use('/', router);

app.listen(3444, () => {
  console.log("Server is running");
});
