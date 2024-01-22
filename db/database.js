// db.js
import mysql from 'mysql';
import dotenv from 'dotenv';
dotenv.config();

const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: process.env.LIMIT || 10,
});

connection.getConnection((err, conn) => {
  if (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  } else {
    console.log('Connected to MySQL database');
    conn.release();
  }
});

export default connection;
