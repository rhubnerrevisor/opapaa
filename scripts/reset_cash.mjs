// scripts/reset_cash.mjs
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.NEON_CONNECTION_STRING);

async function resetCash() {
  try {
    console.log('🧹 Limpando tabela cash_outs...');
    await sql`truncate table cash_outs restart identity;`;
    console.log('✅ Tabela cash_outs zerada com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao limpar tabela:', err.message);
  } finally {
    process.exit(0);
  }
}

resetCash();
