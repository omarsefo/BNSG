import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken.js';

const router = express.Router();

export default (connection) => {
    // GET all useres
    router.get('/data', authenticateToken, async (req, res) => {
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
    router.get('/:id_player', authenticateToken, async (req, res) => {
        const { id_player } = req.params;
        const userQuery = 'SELECT * FROM users WHERE id_player = ?';
        const datesQuery = 'SELECT * FROM dates WHERE id_player = ? ORDER BY date';

        try {
            connection.query(userQuery, [id_player], (userErr, userResults) => {
                if (userErr) {
                    console.error('MySQL query error:', userErr);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                if (userResults.length > 0) {
                    connection.query(datesQuery, [id_player], (datesErr, datesResults) => {
                        if (datesErr) {
                            console.error('MySQL query error:', datesErr);
                            return res.status(500).json({ error: 'Internal Server Error' });
                        }

                        const userData = userResults[0];
                        userData.dates = datesResults; 
                        res.status(200).json(userData);
                    });
                } else {
                    res.status(404).json({ error: 'User not found' });
                }
            });
        } catch (error) {
            console.error('Error fetching user data:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });


    router.post('/add', authenticateToken, async (req, res) => {
        const { name, number, type, note, dates } = req.body;

        const checkUserQuery = 'SELECT * FROM users WHERE name = ? AND type = ?';
        connection.query(checkUserQuery, [name, type], (checkUserErr, checkUserResults) => {
            if (checkUserErr) {
                console.error('MySQL query error:', checkUserErr);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (checkUserResults.length > 0) {
                return res.status(400).json({ error: 'اللاعب موجود بالفعل' });
            }

            const generateFormattedID = (id) => {
                const paddedId = String(id).padStart(4, '0');
                return `U${paddedId}`;
            };

            connection.query('SELECT MAX(CAST(SUBSTRING(id_player, 2) AS UNSIGNED)) AS maxId FROM users', async (err, results) => {
                if (err) {
                    console.error('MySQL query error:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                const latestId = results[0].maxId || 0;
                const newId = latestId + 1;
                const formattedId = generateFormattedID(newId);

                try {
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

                    for (const date of dates) { 
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
    });


    router.put('/edit/:id_player', authenticateToken, (req, res) => {
        const { id_player } = req.params;
        const { name, number, type, note, dates } = req.body;

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
                return res.status(404).json({ error: 'User not found' });
            }

            const deleteDatesQuery = 'DELETE FROM dates WHERE id_player = ?';
            connection.query(deleteDatesQuery, [id_player], (deleteErr) => {
                if (deleteErr) {
                    console.error('MySQL delete dates error:', deleteErr);
                    return res.status(500).json({ error: 'Error updating dates' });
                }

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

    router.delete('/delete/:id_player', authenticateToken, async (req, res) => {
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
