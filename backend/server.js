import express from 'express';
// import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import connection from '../db/database.js';
import homeRouter from '../pages/home.js';
import adminRouter from '../pages/admin.js';
const app = express();
dotenv.config();
const port = process.env.PORT || 3001;

const __dirname = path.resolve();

app.use(cookieParser());
app.use(express.json());
// app.use(cors({
//   origin: process.env.FRONT_URL,
//   credentials: true,
//   methods: ["POST","GET","PUT","DELETE"]
// }));

app.use('/api/home', homeRouter(connection));
app.use('/api/user', adminRouter(connection));

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});