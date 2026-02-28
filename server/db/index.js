import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'game_night_guru',
    password: 'postgres',
    port: 5432,
}); 

export default pool;