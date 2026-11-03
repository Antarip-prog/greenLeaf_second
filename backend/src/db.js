import mysql from 'mysql2/promise';
import 'dotenv/config';
export const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'verdant_nursery', waitForConnections: true, connectionLimit: 10, namedPlaceholders: true, decimalNumbers: true
};
export const pool = mysql.createPool(dbConfig);
export const query = (sql, values) => pool.execute(sql, values);
export async function transaction(work) {
    const c = await pool.getConnection();
    try {
        await c.beginTransaction();
        const value = await work(c);
        await c.commit();
        return value;
    }
    catch (e) {
        await c.rollback();
        throw e;
    }
    finally {
        c.release();
    }
}
