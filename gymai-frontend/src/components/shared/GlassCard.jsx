export default function GlassCard({
  children,
  variant = 'glass',
  style = {},
  className = '',
  ...rest
}) {
  return (
    <div
      className={`${variant} ${className}`}
      style={{ borderRadius: 'var(--r2)', ...style }}
      {...rest}
    >
      {children}
    </div>
  )
}
