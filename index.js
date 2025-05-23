const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const AuthRouter = require('./Routes/AuthRouter');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.log("❌ MongoDB connection error:", err));

app.use('/auth', AuthRouter);

app.listen(process.env.PORT || 5000, () => {
  console.log("Server is running on 5000");
});
