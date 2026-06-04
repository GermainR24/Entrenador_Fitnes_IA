export default function Button({
  children,
  variant = 'primary',
  style = {},
  className = '',
  onClick,
  type = 'button',
  ...rest
}) {
  const cls = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    ghost:     'btn-ghost',
    back:      'back-btn',
  }[variant] ?? 'btn-primary'

  return (
    <button
      type={type}
      className={`${cls} ${className}`}
      style={style}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
}
