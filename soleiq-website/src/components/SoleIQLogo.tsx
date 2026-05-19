interface SoleIQLogoProps {
  width?: number
  height?: number
  id?: string
}

export default function SoleIQLogo({ width = 60, height = 70 }: SoleIQLogoProps) {
  return (
    <img
      src="/soleiq-logo.png"
      alt="SoleIQ"
      width={width}
      height={height}
      style={{ objectFit: 'contain', display: 'block' }}
    />
  )
}
