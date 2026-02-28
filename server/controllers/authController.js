import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/index.js';

export const register = async (req, res) => {
    const { username, email, password } = req.body;
    console.log('Register attempt:', { username, email, password });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id}, process.env.JWT_SECRET, { expiresIn: '30d'});
        res.json({ token, user });
    } catch (err) {
        res.status(500).json({ error: err.message});
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid Credentials'});
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid Credentials'});
        const token = jwt.sign({ id: user.id}, process.env.JWT_SECRET, { expiresIn: '30d'});
        res.json({ token, user: { id: user.id, username: user.username, email: user.email }});
    } catch (err) {
        res.status(500).json({ error: err.message});
    }
};