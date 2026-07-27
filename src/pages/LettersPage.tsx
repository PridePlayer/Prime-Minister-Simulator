import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { useState } from 'react'

/** 信件页面 */
export default function LettersPage() {
  const pendingLetters = useGameStore((s) => s.pendingLetters)
  const pendingNotes = useGameStore((s) => s.pendingNotes)
  const handleLetter = useGameStore((s) => s.handleLetter)
  const handleNote = useGameStore((s) => s.handleNote)
  const setSidePanelPage = useGameStore((s) => s.setSidePanelPage)
  const [activeTab, setActiveTab] = useState<'letters' | 'notes'>('letters')
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  const selectedLetter = pendingLetters.find((l) => l.id === selectedLetterId)
  const selectedNote = pendingNotes.find((n) => n.id === selectedNoteId)

  if (pendingLetters.length === 0 && pendingNotes.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="text-parchment-200/50 font-serif text-lg mb-4">
          暂无待处理信件
        </div>
        <button
          onClick={() => setSidePanelPage(null)}
          className="btn-gold px-6 py-2"
        >
          返回总览
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          信 件 收 发
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setActiveTab('letters'); setSelectedLetterId(null) }}
          className={`flex-1 px-4 py-2 font-serif text-sm rounded transition-colors ${
            activeTab === 'letters'
              ? 'bg-gold text-ink-900'
              : 'bg-ink-900/40 text-parchment-200 hover:bg-ink-900/60'
          }`}
        >
          选区信件 ({pendingLetters.length})
        </button>
        <button
          onClick={() => { setActiveTab('notes'); setSelectedNoteId(null) }}
          className={`flex-1 px-4 py-2 font-serif text-sm rounded transition-colors ${
            activeTab === 'notes'
              ? 'bg-gold text-ink-900'
              : 'bg-ink-900/40 text-parchment-200 hover:bg-ink-900/60'
          }`}
        >
          外部照会 ({pendingNotes.length})
        </button>
      </div>

      {/* 选区信件 */}
      {activeTab === 'letters' && (
        <div className="space-y-3">
          {pendingLetters.map((letter) => (
            <motion.div
              key={letter.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="doc-card p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-serif text-sm font-semibold text-parchment-100">
                    {letter.from}
                  </div>
                  <div className="font-serif text-xs text-parchment-200/60">
                    主题: {letter.subject}
                  </div>
                </div>
                <span className="text-2xl">📬</span>
              </div>
              <p className="font-serif text-xs text-parchment-200/70 leading-relaxed mb-3">
                {letter.content}
              </p>
              <div className="space-y-2">
                {letter.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleLetter(letter.id, option.id)}
                    className="w-full text-left p-3 rounded border border-gold/20 bg-ink-900/40 hover:border-gold/40 hover:bg-ink-900/60 transition-colors"
                  >
                    <div className="font-serif text-xs font-semibold text-parchment-100 mb-1">
                      {option.label}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {Object.entries(option.effects).map(([key, value]) => {
                        const v = value ?? 0
                        if (v === 0) return null
                        return (
                          <span
                            key={key}
                            className={`font-mono ${v > 0 ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {key === 'approval' ? '民意' : key === 'treasury' ? '国库' : key === 'economy' ? '经济' : key === 'stability' ? '稳定' : key === 'diplomacy' ? '外交' : key === 'prestige' ? '声望' : key} {v > 0 ? '+' : ''}{v}
                          </span>
                        )
                      })}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 外部照会 */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          {pendingNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="doc-card p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-serif text-sm font-semibold text-parchment-100">
                    {note.from}
                  </div>
                  <div className="font-serif text-xs text-parchment-200/60">
                    主题: {note.subject}
                  </div>
                </div>
                <span className="text-2xl">🌐</span>
              </div>
              <p className="font-serif text-xs text-parchment-200/70 leading-relaxed mb-3">
                {note.content}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleNote(note.id, true)}
                  className="p-3 rounded border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                >
                  <div className="font-serif text-xs font-semibold text-green-400 mb-1">
                    接受条款
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {Object.entries(note.acceptEffects).map(([key, value]) => {
                      const v = value ?? 0
                      if (v === 0) return null
                      return (
                        <span
                          key={key}
                          className={`font-mono ${v > 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {key === 'approval' ? '民意' : key === 'treasury' ? '国库' : key === 'economy' ? '经济' : key === 'stability' ? '稳定' : key === 'diplomacy' ? '外交' : key === 'prestige' ? '声望' : key} {v > 0 ? '+' : ''}{v}
                        </span>
                      )
                    })}
                  </div>
                </button>
                <button
                  onClick={() => handleNote(note.id, false)}
                  className="p-3 rounded border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  <div className="font-serif text-xs font-semibold text-red-400 mb-1">
                    拒绝条款
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {Object.entries(note.rejectEffects).map(([key, value]) => {
                      const v = value ?? 0
                      if (v === 0) return null
                      return (
                        <span
                          key={key}
                          className={`font-mono ${v > 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {key === 'approval' ? '民意' : key === 'treasury' ? '国库' : key === 'economy' ? '经济' : key === 'stability' ? '稳定' : key === 'diplomacy' ? '外交' : key === 'prestige' ? '声望' : key} {v > 0 ? '+' : ''}{v}
                        </span>
                      )
                    })}
                  </div>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 空状态提示 */}
      {activeTab === 'letters' && pendingLetters.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <div className="font-serif text-sm text-parchment-200/50">暂无选区信件</div>
        </div>
      )}
      {activeTab === 'notes' && pendingNotes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🌐</div>
          <div className="font-serif text-sm text-parchment-200/50">暂无外部照会</div>
        </div>
      )}
    </div>
  )
}
