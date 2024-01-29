import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const generateToken = (res, userId) => {
    const token = jwt.sign({userId}, process.env.TOKEN_KEY, {
        expiresIn: '30d'
    });

    res.cookie('jwt', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        MaxAge: 30 * 24 * 60 * 60 * 1000,
    });
};

export default generateToken;