import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// создаем пул подключений 
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
 

// удобный хелпер для запросов 
export const q = (text, params) => pool.query(text,params);

// проверка подключения 
export async function ping() {
    try{
        const { rows } = await q('SELECT 1 AS ok');
        return rows[0].ok === 1;
    }catch(e){
        return false
    }
}
