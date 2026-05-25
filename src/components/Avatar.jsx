import { getInitials } from '../utils/currency'

export default function Avatar({ name = '', size = 'md' }) {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg'
  }
  return (
    <div className={`${sizeMap[size]} bg-zinc-800 border border-zinc-700 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {getInitials(name)}
    </div>
  )
}
