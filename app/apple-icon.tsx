import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

/** Icône générée : pas de binaire à versionner, et les tokens restent la source. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B0C0E',
          color: '#EFF1F3',
          fontSize: 300,
          fontWeight: 700,
          letterSpacing: '-0.04em',
        }}
      >
        A
      </div>
    ),
    size,
  )
}
