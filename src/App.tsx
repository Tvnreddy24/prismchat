import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Attachment, Chat, Message, ModelId, Settings } from '@/types'
import { dictFor } from '@/i18n'
import { DEFAULT_MODEL } from '@/data/models'
import { ApiError, streamGemini, type ApiErrorKind } from '@/lib/gemini'
import { buildRagSystemPrompt, checkAccess, fetchChatContext, fetchHealth, tempExtract, type ChatContext } from '@/lib/rag'
import { clearAllData, loadChats, loadSettings, saveChats, saveSettings } from '@/lib/storage'
import { applyThemeClass, chatToMarkdown, downloadFile, titleFrom, uid } from '@/lib/utils'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { ChatView } from '@/components/ChatView'
import { Composer } from '@/components/Composer'
import { SettingsModal } from '@/components/SettingsModal'
import { AccessLock } from '@/components/AccessLock'
import { RenameDialog } from '@/components/RenameDialog'
import { Toast, type ToastData } from '@/components/Toast'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const OK_EXT = /\.(pdf|docx?|txt|csv|md|rtf|xlsx?)$/i

const ERROR_KEY: Record<ApiErrorKind, keyof ReturnType<typeof dictFor>> = {
  'no-key': 'errNoKey',
  auth: 'errAuth',
  quota: 'errQuota',
  rate: 'errRate',
  overloaded: 'errOverloaded',
  model: 'errModel',
  network: 'errNetwork',
  unknown: 'errUnknown',
}

export default function App() {
  const [chats, setChats] = useState<Chat[]>(loadChats)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [streaming, setStreaming] = useState(false)
  const [stopped, setStopped] = useState(false)
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [temp, setTemp] = useState(false)
  const [toast, setToast] = useState<ToastData>(null)
  /** Permission gate: 'locked' = access code needed (backend enforces it too) */
  const [gate, setGate] = useState<'loading' | 'open' | 'locked'>('loading')

  const t = dictFor(settings.language)
  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeId) ?? null,
    [chats, activeId],
  )
  const visibleChats = useMemo(() => chats.filter((c) => !c.temp), [chats])

  const abortRef = useRef<AbortController | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const patchChat = useCallback((id: string, fn: (c: Chat) => Chat) => {
    setChats((prev) => prev.map((c) => (c.id === id ? fn(c) : c)))
  }, [])

  /* ---------------- persistence ---------------- */
  useEffect(() => saveChats(visibleChats), [visibleChats])
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => applyThemeClass(settings.theme), [settings.theme])
  useEffect(() => {
    document.documentElement.lang = settings.language
  }, [settings.language])

  /* ---------------- permission gate (only staff YOU shared the code with) ---------------- */
  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
      if (!settings.backendUrl.trim()) {
        setGate('open') // no backend = direct Gemini mode, nothing to lock
        return
      }
      const health = await fetchHealth(settings.backendUrl)
      if (cancelled) return
      if (!health) {
        setGate('open') // backend down (dev) — chat still works direct; prod must run backend
        return
      }
      if (!health.accessLock) {
        setGate('open')
        return
      }
      setGate((await checkAccess(settings.backendUrl)) ? 'open' : 'locked')
    }
    setGate('loading')
    void resolve()
    return () => {
      cancelled = true
    }
  }, [settings.backendUrl])

  /* ---------------- chat operations ---------------- */
  const handleNewChat = useCallback(() => {
    setActiveId(null)
    setInput('')
    setAttachments([])
    setStopped(false)
  }, [])

  const handleSelect = (id: string) => {
    setActiveId(id)
    setStopped(false)
  }

  const handleDelete = (id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const handleTogglePin = (id: string) => {
    patchChat(id, (c) => ({ ...c, pinned: !c.pinned, updatedAt: Date.now() }))
  }

  const handleExport = (chat: Chat) => {
    const safe = chat.title.replace(/[^\w\d-]+/g, '-').slice(0, 48)
    downloadFile(`prism-${safe}.md`, chatToMarkdown(chat))
    showToast(t.toastExported)
  }

  const handleClearAll = () => {
    if (!window.confirm(t.clearAllConfirm)) return
    setChats([])
    setActiveId(null)
    showToast(t.toastCleared)
  }

  const handleClearData = () => {
    if (!window.confirm(t.clearAllConfirm)) return
    clearAllData()
    setChats([])
    setActiveId(null)
    setSettings(loadSettings())
    setSettingsOpen(false)
    showToast(t.toastCleared)
  }

  const handleFeedback = (messageId: string, value: 'up' | 'down' | null) => {
    if (!activeChat) return
    patchChat(activeChat.id, (c) => ({
      ...c,
      messages: c.messages.map((m) => (m.id === messageId ? { ...m, feedback: value } : m)),
    }))
    if (value) showToast(t.feedbackThanks)
  }

  /* ---------------- files (TEMP per-chat only — never stored in dept DB) ----------------
     User attaches a file + asks one question (ChatGPT-type). Text is extracted
     via /api/temp-extract and used for THAT answer only. Dept feeding stays
     admin-only in Settings → Dept knowledge. */
  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return
    const picked = Array.from(files)
    const accepted: Attachment[] = []
    const withFile: { att: Attachment; file: File }[] = []
    for (const file of picked) {
      if (!OK_EXT.test(file.name)) {
        showToast(t.attachUnsupported)
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        showToast(t.attachTooBig)
        continue
      }
      const ext = file.name.split('.').pop() ?? 'file'
      const att: Attachment = { id: uid('f'), name: file.name, size: file.size, kind: ext.toUpperCase() }
      accepted.push(att)
      withFile.push({ att, file })
    }
    if (!accepted.length) return
    setAttachments((prev) => [...prev, ...accepted].slice(0, 5))
    // Extract readable text in background (needs RAG server; else name-only).
    if (settings.backendUrl.trim()) {
      void (async () => {
        for (const { att, file } of withFile) {
          try {
            const out = await tempExtract(settings.backendUrl, file)
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === att.id ? { ...a, excerpt: out.text, truncated: out.truncated } : a,
              ),
            )
          } catch {
            /* keep name-only — answer still works from dept/web */
          }
        }
      })()
    }
  }

  /* ---------------- streaming (RAG: dept first, web fallback) ---------------- */
  const runStream = useCallback(
    async (
      chatId: string,
      messageId: string,
      history: Message[],
      rag?: { ctx: ChatContext | null; system: string },
    ) => {
      const controller = new AbortController()
      abortRef.current = controller
      setStreaming(true)
      setStopped(false)

      const append = (chunk: string) =>
        setChats((prev) =>
          prev.map((c) =>
            c.id !== chatId
              ? c
              : {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, content: m.content + chunk } : m,
                  ),
                },
          ),
        )

      const replace = (patch: Partial<Message>) =>
        setChats((prev) =>
          prev.map((c) =>
            c.id !== chatId
              ? c
              : {
                  ...c,
                  messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
                },
          ),
        )

      // Attach RAG sources immediately so the user sees "Dept data / Web" badge
      // even while tokens stream.
      if (rag?.ctx) {
        replace({ sources: rag.ctx.sources, sourceMode: rag.ctx.mode })
      }

      try {
        const gen = streamGemini({
          apiKey: settings.apiKey,
          model,
          system: rag?.system ?? settings.systemPrompt,
          messages: history,
          signal: controller.signal,
          onModelSwitch: (from, to) => {
            showToast(t.modelSwitched.replace('{from}', from).replace('{to}', to))
          },
          onRetry: (status, attempt) => {
            showToast(t.modelRetrying.replace('{status}', String(status)).replace('{attempt}', String(attempt)))
          },
        })

        if (settings.streamResponses) {
          for await (const chunk of gen) {
            if (controller.signal.aborted) break
            append(chunk)
          }
        } else {
          let buffer = ''
          for await (const chunk of gen) buffer += chunk
          if (!controller.signal.aborted && buffer) replace({ content: buffer })
        }
        replace({
          streaming: false,
          stopped: controller.signal.aborted,
          ...(rag?.ctx ? { sources: rag.ctx.sources, sourceMode: rag.ctx.mode } : {}),
        })
      } catch (err) {
        const kind = err instanceof ApiError ? err.kind : 'unknown'
        let text = t[ERROR_KEY[kind]]
        // For a withdrawn model, show Google's own explanation so the cause is clear.
        if (kind === 'model' && err instanceof ApiError && err.detail) {
          text = `${t.errModel}\n\n\`\`\`\n${err.detail}\n\`\`\``
        }
        replace({
          streaming: false,
          error: true,
          content: text,
        })
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        setStreaming(false)
        if (controller.signal.aborted) setStopped(true)
      }
    },
    [settings.apiKey, settings.systemPrompt, settings.streamResponses, model, t],
  )

  /** Resolve dept/web context for one user query. Null = RAG off or server down. */
  const resolveRag = useCallback(
    async (query: string, signal?: AbortSignal): Promise<ChatContext | null> => {
      if (!settings.ragEnabled || !settings.backendUrl.trim()) return null
      return fetchChatContext(settings.backendUrl, query, {
        topK: 5,
        useWeb: settings.webFallback,
        signal,
      })
    },
    [settings.ragEnabled, settings.backendUrl, settings.webFallback],
  )

  /** Appends the user turn + a streaming assistant turn, then streams. */
  const submit = useCallback(
    (text: string, files: Attachment[]) => {
      const body = text.trim()
      const prompt = body || files.map((f) => f.name).join(', ') || 'Hello'
      const now = Date.now()
      const chatId = activeId ?? uid('c')
      const assistantId = uid('m')
      const isNew = !activeId

      const userMessage: Message = {
        id: uid('m'),
        role: 'user',
        content: body || t.attached,
        createdAt: now,
        attachments: files.length ? files : undefined,
      }
      const placeholder: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: now + 1,
        streaming: true,
        model,
      }

      const title = settings.autoTitle ? titleFrom(prompt) : 'New chat'
      const history = [...(activeChat?.messages ?? []), userMessage, placeholder]

      setChats((prev) => {
        const existing = prev.find((c) => c.id === chatId)
        if (!existing) {
          const chat: Chat = {
            id: chatId,
            title,
            createdAt: now,
            updatedAt: now,
            pinned: false,
            temp,
            messages: [userMessage, placeholder],
          }
          return [chat, ...prev]
        }
        return prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                title: isNew ? title : c.title,
                updatedAt: now,
                messages: [...c.messages, userMessage, placeholder],
              }
            : c,
        )
      })

      setActiveId(chatId)
      // Answer order: [1] user-attached temp file (this turn only) +
      // [2] dept docs (RAG) -> [3] web fallback -> Gemini with injected context.
      void (async () => {
        const ctx = await resolveRag(prompt)
        let system = buildRagSystemPrompt(settings.systemPrompt, ctx)
        const tempBlocks = files
          .filter((f) => f.excerpt?.trim())
          .map(
            (f) =>
              `FILE: ${f.name}${f.truncated ? ' (first part only)' : ''}\n${f.excerpt}`,
          )
        if (tempBlocks.length) {
          system +=
            `\n\n--- USER-ATTACHED TEMP FILE (this question only, NOT dept data) ---\n` +
            tempBlocks.join('\n\n---\n\n').slice(0, 15000) +
            `\n\nRULES: Prefer the temp file above for this answer. ` +
            `Dept/web context (if any) is secondary. Never store this file.`
        }
        await runStream(chatId, assistantId, history, ctx ? { ctx, system } : { ctx: null, system })
      })()
    },
    [
      activeChat,
      activeId,
      model,
      runStream,
      resolveRag,
      settings.autoTitle,
      settings.systemPrompt,
      t.attached,
      temp,
    ],
  )

  const handleSend = () => {
    if (streaming) return
    if (!input.trim() && attachments.length === 0) return
    submit(input, attachments)
    setInput('')
    setAttachments([])
  }

  const handleStop = () => abortRef.current?.abort()

  const handleRegenerate = useCallback(
    (messageId: string) => {
      if (!activeChat || streaming) return
      const index = activeChat.messages.findIndex((m) => m.id === messageId)
      if (index < 1) return

      const prompt = activeChat.messages
        .slice(0, index)
        .reverse()
        .find((m) => m.role === 'user')?.content
      if (!prompt) return

      const assistantId = uid('m')
      const now = Date.now()
      const placeholder: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: now,
        streaming: true,
        model,
      }
      const history = [...activeChat.messages.slice(0, index), placeholder]

      setChats((prev) =>
        prev.map((c) =>
          c.id !== activeChat.id
            ? c
            : {
                ...c,
                updatedAt: now,
                messages: [...c.messages.slice(0, index), placeholder],
              },
        ),
      )
      void (async () => {
        const ctx = await resolveRag(prompt)
        const system = buildRagSystemPrompt(settings.systemPrompt, ctx)
        await runStream(activeChat.id, assistantId, history, ctx ? { ctx, system } : undefined)
      })()
    },
    [activeChat, streaming, model, runStream, resolveRag, settings.systemPrompt],
  )

  /* ---------------- keyboard shortcuts ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'b') {
        e.preventDefault()
        setCollapsed((c) => !c)
      } else if (k === 'j') {
        e.preventDefault()
        setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
      } else if (k === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      } else if (k === 'k' && e.shiftKey) {
        e.preventDefault()
        handleNewChat()
      } else if (k === 'k') {
        e.preventDefault()
        setMobileOpen(true)
        window.dispatchEvent(new CustomEvent('prism:focus-search'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleNewChat])

  /* ---------------- settings ---------------- */
  const patchSettings = (patch: Partial<Settings>) =>
    setSettings((prev) => ({ ...prev, ...patch }))

  const renameChat = chats.find((c) => c.id === renameId)

  if (gate === 'locked') {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <AccessLock t={t} backendUrl={settings.backendUrl} onUnlocked={() => setGate('open')} />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar
        chats={visibleChats}
        activeId={activeId}
        language={settings.language}
        t={t}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        connected={!!settings.apiKey.trim()}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
        onRename={setRenameId}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
        onExport={handleExport}
        onClearAll={handleClearAll}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onCloseMobile={() => setMobileOpen(false)}
        onOpenSettings={() => {
          setMobileOpen(false)
          setSettingsOpen(true)
        }}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar
          t={t}
          language={settings.language}
          theme={settings.theme}
          model={model}
          temp={temp}
          connected={!!settings.apiKey.trim()}
          onModel={setModel}
          onTheme={() => patchSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          onLanguage={() => patchSettings({ language: settings.language === 'te' ? 'en' : 'te' })}
          onOpenMenu={() => setMobileOpen(true)}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onNewChat={handleNewChat}
          onToggleTemp={() => {
            setTemp((v) => {
              showToast(v ? t.tempChatOff : t.tempChatOn)
              return !v
            })
          }}
        />

        <ChatView
          chat={activeChat}
          t={t}
          language={settings.language}
          model={model}
          showTimestamp={settings.showTimestamps}
          connected={!!settings.apiKey.trim()}
          onOpenSettings={() => setSettingsOpen(true)}
          onRegenerate={handleRegenerate}
          onFeedback={handleFeedback}
          onToast={showToast}
        />

        <Composer
          t={t}
          value={input}
          streaming={streaming}
          stopped={stopped}
          attachments={attachments}
          sendOnEnter={settings.sendOnEnter}
          placeholder={t.placeholder}
          onChange={setInput}
          onSubmit={handleSend}
          onStop={handleStop}
          onFiles={handleFiles}
          onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
        />
      </main>

      {settingsOpen && (
        <SettingsModal
          t={t}
          settings={settings}
          onSettings={patchSettings}
          onClearData={handleClearData}
          onClose={() => setSettingsOpen(false)}
          onToast={showToast}
        />
      )}

      {renameChat && (
        <RenameDialog
          t={t}
          initial={renameChat.title}
          onClose={() => setRenameId(null)}
          onSubmit={(title) => {
            patchChat(renameChat.id, (c) => ({ ...c, title, updatedAt: Date.now() }))
            setRenameId(null)
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}