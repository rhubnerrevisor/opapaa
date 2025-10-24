import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.NEON_CONNECTION_STRING!);