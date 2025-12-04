import { Scale } from 'lucide-react'

interface AppLogoProps {
  size?: 'small' | 'large' | 'extra-large'
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 'small' }) => {
  const sizeClasses = {
    'small': 'size-6',
    'large': 'size-8',
    'extra-large': 'size-12',
  }

  const iconSizeClasses = {
    'small': 'size-4',
    'large': 'size-5',
    'extra-large': 'size-7',
  }

  return (
    <div
      className={`group flex ${sizeClasses[size]} shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground`}
    >
      <Scale className={`${iconSizeClasses[size]} transition-transform group-hover:scale-110`} />
      <span className="sr-only">2BV Portail</span>
    </div>
  )
}
