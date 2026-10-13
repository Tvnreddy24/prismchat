import { CheckIcon } from './Icons'

export type ToastData = { id: number; message: string } | null

export function Toast({ toast }: { toast: ToastData }) {
  if (!toast) return null

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-70 -translate-x-1/2">
      <div
        key={toast.id}
        role="status"
        className="animate-pop flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink shadow-[var(--shadow-lg)]"
      >
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckIcon size={13} />
        </span>
        {toast.message}
      </div>
    </div>
  )
}