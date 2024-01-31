import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import connection from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
dotenv.config();
const port = process.env.PORT || 3001;

app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: process.env.FRONT_URL,
  credentials: true,
  methods: ["POST","GET","PUT","DELETE"]
}));

import homeRouter from '../pages/home.js';
import adminRouter from '../pages/admin.js';

app.use('/api', homeRouter(connection));
app.use('/api', adminRouter(connection));

// Serve static files from the 'dist' directory (Vite build output)
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route to serve 'index.html' for any other route
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
