import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Controle de Merch',
  description: 'App de controle de merch da banda',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body
        style={{
          background: '#121212',
          color: '#eaeaea',
          minHeight: '100vh',
          margin: 0,
          padding: 0,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Barra de navegação */}
        <nav
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
            padding: '16px 0',
            background: '#1a1a1a',
            borderBottom: '1px solid #333',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <Link
            href="/"
            style={{
              color: '#fff',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              background: '#e11d48', // vermelho
              fontWeight: 500,
            }}
          >
            Venda
          </Link>

          <Link
            href="/ajustar-estoque"
            style={{
              color: '#fff',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              background: '#e11d48',
              fontWeight: 500,
            }}
          >
            Estoque
          </Link>

          <Link
            href="/historico"
            style={{
              color: '#fff',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              background: '#e11d48',
              fontWeight: 500,
            }}
          >
            Histórico
          </Link>

          <Link
            href="/caixa"
            style={{
              color: '#fff',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              background: '#e11d48',
              fontWeight: 500,
            }}
          >
            Caixa
          </Link>
        </nav>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
