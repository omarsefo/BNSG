import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken.js';
// import bcrypt from 'bcrypt';

const router = express.Router();

export default (connection) => {
    // GET all useres
    router.get('/home/data', authenticateToken, async (req, res) => {
        const sql = `
        SELECT u.id_player, u.name, u.number, u.type, u.note, d.latest_date
        FROM users u
        INNER JOIN (
            SELECT id_player, MAX(date) AS latest_date
            FROM dates
            GROUP BY id_player
        ) d ON u.id_player = d.id_player
    `;
        try {
            connection.query(sql, (err, results) => {
                if (err) {
                    console.error('MySQL query error:', err);
                    res.status(500).json({ error: 'Internal Server Error' });
                } else {
                    res.status(200).json(results);
                }
            });
        } catch (error) {
            console.error('Error fetching user data:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });


    // GET a specific user by ID
    router.get('/home/:id_player', authenticateToken, async (req, res) => {
        const { id_player } = req.params;
        const userQuery = 'SELECT * FROM users WHERE id_player = ?';
        const datesQuery = 'SELECT * FROM dates WHERE id_player = ? ORDER BY date';
    
        try {
            // First, get the user data
            connection.query(userQuery, [id_player], (userErr, userResults) => {
                if (userErr) {
                    console.error('MySQL query error:', userErr);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
    
                // If user is found, get the dates data
                if (userResults.length > 0) {
                    connection.query(datesQuery, [id_player], (datesErr, datesResults) => {
                        if (datesErr) {
                            console.error('MySQL query error:', datesErr);
                            return res.status(500).json({ error: 'Internal Server Error' });
                        }
    
                        // Combine user data with dates and send response
                        const userData = userResults[0];
                        userData.dates = datesResults; // Add the dates to the user data
                        res.status(200).json(userData);
                    });
                } else {
                    // No user found with the given id_player
                    res.status(404).json({ error: 'User not found' });
                }
            });
        } catch (error) {
            console.error('Error fetching user data:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
    

    router.post('/home/add', authenticateToken, async (req, res) => {
        const { name, number, type, note, dates } = req.body;
    
        // Function to generate a formatted ID
        const generateFormattedID = (id) => {
            const paddedId = String(id).padStart(4, '0');
            return `U${paddedId}`;
        };
    
        // Fetch the latest ID from the database
        connection.query('SELECT MAX(CAST(SUBSTRING(id_player, 2) AS UNSIGNED)) AS maxId FROM users', async (err, results) => {
            if (err) {
                console.error('MySQL query error:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
    
            const latestId = results[0].maxId || 0;
            const newId = latestId + 1;
            const formattedId = generateFormattedID(newId);
    
            try {
                // Insert into the "users" table
                const userData = {
                    id_player: formattedId,
                    name,
                    number,
                    type,
                    note,
                };
    
                await new Promise((resolve, reject) => {
                    connection.query('INSERT INTO users SET ?', userData, (err) => {
                        if (err) {
                            console.error('MySQL query error:', err);
                            reject('Internal Server Error');
                        } else {
                            resolve();
                        }
                    });
                });
    
                // Insert multiple dates into the "dates" table
                for (const date of dates) { // Loop through each date
                    const dateData = {
                        id_player: formattedId,
                        date,
                    };
    
                    await new Promise((resolve, reject) => {
                        connection.query('INSERT INTO dates SET ?', dateData, (err) => {
                            if (err) {
                                console.error('MySQL query error:', err);
                                reject('Internal Server Error');
                            } else {
                                resolve();
                            }
                        });
                    });
                }
    
                res.status(200).json({ message: 'User and Dates Data Saved' });
            } catch (error) {
                console.error('Error inserting data:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
    });
    
    



    router.put('/home/edit/:id_player', authenticateToken, (req, res) => {
        const { id_player } = req.params;
        const { name, number, type, note, dates } = req.body;
        console.log(req.body);
    
        if (!id_player || !name || !type || !dates || !Array.isArray(dates)) {
            return res.status(400).json({ error: 'Missing required parameters or invalid format' });
        }
    
        const updateUserQuery = 'UPDATE users SET name = ?, number = ?, type = ?, note = ? WHERE id_player = ?';
    
        connection.query(updateUserQuery, [name, number, type, note, id_player], (err, results) => {
            if (err) {
                console.error('MySQL query error:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
    
            if (results.affectedRows === 0) {
                // No rows were updated, user not found
                return res.status(404).json({ error: 'User not found' });
            }
    
            // Handle dates update logic here
            // This could involve deleting existing dates and inserting new ones,
            // or updating existing dates if they have an identifier such as an ID.
    
            // Example: Delete all existing dates and insert new ones
            const deleteDatesQuery = 'DELETE FROM dates WHERE id_player = ?';
            connection.query(deleteDatesQuery, [id_player], (deleteErr) => {
                if (deleteErr) {
                    console.error('MySQL delete dates error:', deleteErr);
                    return res.status(500).json({ error: 'Error updating dates' });
                }
    
                // Insert new dates
                const insertDatePromises = dates.map((dateObj) => {
                    return new Promise((resolve, reject) => {
                        const insertDateQuery = 'INSERT INTO dates (id_player, date) VALUES (?, ?)';
                        connection.query(insertDateQuery, [id_player, dateObj.date], (insertErr) => {
                            if (insertErr) {
                                reject(insertErr);
                            } else {
                                resolve();
                            }
                        });
                    });
                });
    
                Promise.all(insertDatePromises)
                    .then(() => {
                        res.status(200).json({ message: 'User and dates updated successfully' });
                    })
                    .catch((promiseErr) => {
                        console.error('Promise error:', promiseErr);
                        res.status(500).json({ error: 'Error updating dates' });
                    });
            });
        });
    });
    


    router.delete('/home/delete/:id_player', authenticateToken, async (req, res) => {
        const { id_player } = req.params;
    
        if (!id_player) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        const selectQuery = 'SELECT * FROM users WHERE id_player = ?';
        const deleteDatesQuery = 'DELETE FROM dates WHERE id_player = ?';
        const deleteUserQuery = 'DELETE FROM users WHERE id_player = ?';
        try {
            connection.query(selectQuery, [id_player], (selectErr, selectResults) => {
                if (selectErr) {
                    console.error('MySQL query error:', selectErr);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
                if (selectResults.length === 0) {
                    // user not found
                    return res.status(404).json({ error: 'user not found' });
                }
    
                connection.query(deleteDatesQuery, [id_player], (deleteDatesErr) => {
                    if (deleteDatesErr) {
                        console.error('MySQL query error:', deleteDatesErr);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
    
                    connection.query(deleteUserQuery, [id_player], (deleteUserErr) => {
                        if (deleteUserErr) {
                            console.error('MySQL query error:', deleteUserErr);
                            return res.status(500).json({ error: 'Internal Server Error' });
                        }
    
                        res.status(200).json({ message: 'user and associated dates deleted successfully' });
                    });
                });
            });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
    
    

    return router;
};
