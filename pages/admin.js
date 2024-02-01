import express from 'express';
import bcrypt from 'bcrypt';
import generateToken from './../Utils/generateToken.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
const router = express.Router();

export default (connection) => {
    // router.post('/add',authenticateToken, async (req, res) => {
    //     const { username_admin, password_admin } = req.body;
    //     console.log(req.body);
    //     // Hash the password
    //     const hashedPassword = await bcrypt.hash(password_admin, 10);

    //     // Function to generate a formatted ID
    //     const generateFormattedID = (id) => {
    //         const paddedId = String(id).padStart(4, '0');
    //         return `CA${paddedId}`;
    //     };

    //     // Fetch the latest ID from the database
    //     connection.query('SELECT MAX(CAST(SUBSTRING(id_admin, 4) AS UNSIGNED)) AS maxId FROM admin', async (err, results) => {
    //         if (err) {
    //             console.error('MySQL query error:', err);
    //             return res.status(500).json({ error: 'Internal Server Error' });
    //         }

    //         const latestId = results[0].maxId || 0;
    //         const newId = latestId + 1;

    //         const formattedId = generateFormattedID(newId);
    //         const data = {
    //             id_admin: formattedId,
    //             username: username_admin,
    //             password: hashedPassword,
    //         };

    //         connection.query('INSERT INTO admin SET ?', data, (err) => {
    //             if (err) {
    //                 console.error('MySQL query error:', err);
    //                 res.status(500).json({ error: 'Internal Server Error' });
    //             } else {
    //                 // Return the user data in the response
    //                 res.status(200).json();
    //             }
    //         });
    //     });
    // });

    router.post('/login', async (req, res) => {
        const { username_admin, password_admin } = req.body;

        try {
            const query = 'SELECT * FROM admin WHERE username = ?';

            connection.query(query, [username_admin], async (err, results) => {
                try {
                    if (err) {
                        console.error('MySQL query error:', err);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }

                    if (results.length === 0) {
                        return res.status(401).json({ error: 'Invalid credentials' });
                    }
                    const storedHashedPassword = results[0].password;

                    // Compare the hashed provided password with the stored hashed password
                    const passwordMatch = await bcrypt.compare(password_admin.toString(), storedHashedPassword);

                    if (passwordMatch) {
                        const admin = results[0];
                        generateToken(res, admin.id_admin);
                        const customerData = {
                            id_admin: admin.id_admin,
                            username: admin.username,
                        };
                        res.status(200).json( customerData );
                    } else {
                        return res.status(401).json({ error: 'Invalid credentials' });
                    }
                } catch (error) {
                    console.error('Error comparing passwords:', error);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
            });
        } catch (error) {
            console.error('Error in login route:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });


    router.post('/logout', async (req, res) => {
        res.cookie('jwt', '', {
            httpOnly: true,
            expires: new Date(0)
        })
        return res.status(200).json({ message: 'Logout User success' });
    });

    return router;
};