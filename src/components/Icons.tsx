import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const MenuIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

export const PanelIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M9.5 4v16" />
  </svg>
)

export const PlusIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const SearchIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const SendIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 20V5" />
    <path d="m5.5 11.5 6.5-6.5 6.5 6.5" />
  </svg>
)

export const StopIcon = ({ size, ...p }: P) => (
  <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2.2" />
  </svg>
)

export const PaperclipIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20 11.5 12.3 19a4.6 4.6 0 0 1-6.5-6.5l7.7-7.6a3 3 0 1 1 4.3 4.3l-7.7 7.6a1.5 1.5 0 0 1-2.1-2.1l7-7" />
  </svg>
)

export const CopyIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.2" />
    <path d="M15 6.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h.5" />
  </svg>
)

export const KeyIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="8" cy="16" r="4" />
    <path d="m11 13 8-8 2 2-1.5 1.5L21 10l-2 2-1.5-1.5L16 12l-2-2" />
  </svg>
)

export const CheckIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
)

export const TrashIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
    <path d="M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
    <path d="M10.5 11v6M13.5 11v6" />
  </svg>
)

export const PencilIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="m14.5 6.5 3 3" />
  </svg>
)

export const PinIcon = ({ size, filled = false, ...p }: P & { filled?: boolean }) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} {...p}>
    <path d="M9.5 3h5l-.7 5.2 3.2 3.1H7l3.2-3.1L9.5 3Z" />
    <path d="M12 11.3V21" />
  </svg>
)

export const SettingsIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
)

export const SunIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
  </svg>
)

export const MoonIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
  </svg>
)

export const CloseIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const ChevronDownIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </svg>
)

export const ChevronRightIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </svg>
)

export const ThumbUpIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 10.5 10.8 4a2 2 0 0 1 3.7 1.4l-.7 3.1h4a2 2 0 0 1 2 2.4l-1.2 6A2 2 0 0 1 16.6 18H7" />
    <rect x="3" y="10.5" width="4" height="7.5" rx="1" />
  </svg>
)

export const ThumbDownIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M17 13.5 13.2 20a2 2 0 0 1-3.7-1.4l.7-3.1h-4a2 2 0 0 1-2-2.4l1.2-6A2 2 0 0 1 7.4 6H17" />
    <rect x="17" y="13.5" width="4" height="7.5" rx="1" />
  </svg>
)

export const RefreshIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20 11.5A8 8 0 1 0 18.4 17" />
    <path d="M20 5v6h-6" />
  </svg>
)

export const MoreIcon = ({ size, ...p }: P) => (
  <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <circle cx="12" cy="5.5" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="12" cy="18.5" r="1.7" />
  </svg>
)

export const DownloadIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 4v11" />
    <path d="m7.5 11 4.5 4.5L16.5 11" />
    <path d="M4.5 19.5h15" />
  </svg>
)

export const SparkIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.5 13.7 9l5.3 1.7-5.3 1.7L12 18l-1.7-5.6L5 10.7 10.3 9 12 3.5Z" />
  </svg>
)

export const ShieldIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3 5 5.6v5.7c0 4.3 2.9 8.2 7 9.2 4.1-1 7-4.9 7-9.2V5.6L12 3Z" />
    <path d="m9.2 12.2 2 2 3.6-4" />
  </svg>
)

export const LogoutIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" />
    <path d="M10 12h10" />
    <path d="m17 9 3 3-3 3" />
  </svg>
)

export const UserIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.8 20a7.5 7.5 0 0 1 14.4 0" />
  </svg>
)

export const GlobeIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.5 9.5h17M3.5 14.5h17" />
    <path d="M12 3c2.4 2.4 3.6 5.4 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3Z" />
  </svg>
)

export const ChatIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20.5 11.6c0 4-3.8 7.2-8.5 7.2a10 10 0 0 1-2.6-.3L4.5 20l1.3-3.4a6.8 6.8 0 0 1-2.3-5c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" />
  </svg>
)

export const FileTextIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14 3.5H7.5A2 2 0 0 0 5.5 5.5v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8l-4.5-4.5Z" />
    <path d="M13.5 3.5V8H18" />
    <path d="M8.5 12.5h7M8.5 16h4.5" />
  </svg>
)

export const VolumeIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.5 9.5h3l4-3.5v12l-4-3.5h-3v-5Z" />
    <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />
  </svg>
)

export const LockIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
  </svg>
)

export const BuildingIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 20V6.2a1.7 1.7 0 0 1 1.7-1.7h6.6A1.7 1.7 0 0 1 14 6.2V20" />
    <path d="M14 10h4.3A1.7 1.7 0 0 1 20 11.7V20" />
    <path d="M2.5 20h19" />
    <path d="M7.5 8h3M7.5 12h3M7.5 16h3M16.5 14h1.5" />
  </svg>
)

export const TrashSmallIcon = CloseIcon

export const FlameIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.5s4.5 3.6 4.5 7.4a4.5 4.5 0 0 1-9 0c0-1.6.8-2.9 1.7-3.8.2 1.3 1 2.1 2 2.1 1.4 0 2.2-1.4 1.9-3.3A9.9 9.9 0 0 0 12 3.5Z" />
    <path d="M7 12.4A5.6 5.6 0 0 0 6.4 15a5.6 5.6 0 0 0 11.2 0c0-1-.2-1.9-.7-2.8" />
  </svg>
)

/** AP Police–inspired prism mark used as the app logo. */
export const PrismLogo = ({ size = 30, ...p }: P) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinejoin="round"
    strokeLinecap="round"
    {...p}
  >
    <path d="M20 4.5 34 30.5H6L20 4.5Z" fill="currentColor" fillOpacity={0.14} />
    <path d="M20 4.5 34 30.5H6L20 4.5Z" />
    <path d="M20 30.5 26 18.5" strokeOpacity={0.7} />
    <circle cx="20" cy="20.5" r="2.1" fill="currentColor" stroke="none" />
  </svg>
)