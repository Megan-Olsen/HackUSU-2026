import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { initializeSockets } from './sockets/index.js';

import authRoutes from './routes/authRoutes.js';
import gameNightRoutes from './routes/gameNightRoutes.js';
import gamesRoutes from './routes/gamesRoutes.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173', //Vite's default port
        methods: ['GET', 'POST'],
    },
});

app.use(cors());
app.use(express.json());


app.use('/api/auth', authRoutes);
app.use('/api/gamenights', gameNightRoutes);
app.use('/api/games', gamesRoutes);

//Test route
app.get('/', (req, res) => {
    res.json({message: 'Game Night Guru API is running!'});
});

// Socket.io connection
initializeSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Test Route 
app.get('/', (req, res) => {
    res.json({ message: 'Game Night Guru API is running!'});
});
