import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connection from '../db/database.js';
import homeRouter from '../pages/home.js';
import adminRouter from '../pages/admin.js';
const app = express();
dotenv.config();
const port = process.env.PORT || 3001;

// app.use('/api/uploads', express.static('./uploads'));
app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: process.env.FRONT_URL,
  credentials: true,
  methods: ["POST","GET","PUT","DELETE"]
}));

app.use('/api', homeRouter(connection));
app.use('/api', adminRouter(connection));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});