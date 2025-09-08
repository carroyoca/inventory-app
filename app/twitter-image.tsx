import { ImageResponse } from 'next/og'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(90deg, #532F6E, #C4599D)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 36,
            background: 'rgba(255,255,255,0.9)',
            borderRadius: 24,
            padding: '48px 56px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 96,
                fontWeight: 800,
                color: '#111827',
                lineHeight: 1.1,
                letterSpacing: -2,
              }}
            >
              humkio
            </div>
            <div style={{ fontSize: 30, color: '#374151', marginTop: 10 }}>
              Sistema de inventario basado en proyectos
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
