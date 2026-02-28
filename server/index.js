import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

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

//Test route
app.get('/', (req, res) => {
    res.json({message: 'Game Night Guru API is running!'});
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// app.use(cors());
// app.use(express.json());

// app.get('/api/hello', (req, res) => {
// res.json({ message: "Hello from the Express server!" });
// });

// app.listen(PORT, () => {
// console.log(`Server is running on http://localhost:${PORT}`);
// });