// ============================================
// ACTIVITY LOG — The Real-Time Nerve Feed
// 
// Every thought, every action, every decision
// Morpheus makes streams here in real-time.
// Not fake logs. These are actual agent events.
// ============================================

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  Brain,
  Code,
  Search,
  Wrench,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  FileCode,
  Layers,
} from 'lucide-react'

// Map log types to visual config
const LOG_CONFIG = {
  analyzing: {
    icon: Eye,
    color: '#22d3ee',
    bg: 'rgba(34, 211, 238, 0.08)',
    borderColor: '#22d3ee',
    label: 'VISION',
  },
  thinking: {
    icon: Brain,
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.08)',
    borderColor: '#a78bfa',
    label: 'THOUGHT',
  },
  planning: {
    icon: Layers,
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.08)',
    borderColor: '#a78bfa',
    label: 'PLAN',
  },
  building: {
    icon: Code,
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.08)',
    borderColor: '#34d399',
    label: 'BUILD',
  },
  reviewing: {
    icon: Search,
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.08)',
    borderColor: '#fbbf24',
    label: 'REVIEW',
  },
  fixing: {
    icon: Wrench,
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.08)',
    borderColor: '#fbbf24',
    label: 'FIX',
  },
  complete: {
    icon: CheckCircle,
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.08)',
    borderColor: '#a78bfa',
    label: 'DONE',
  },
  warning: {
    icon: AlertTriangle,
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.08)',
    borderColor: '#fbbf24',
    label: 'WARN',
  },
  error: {
    icon: XCircle,
    color: '#f87171',
    bg: 'rgba(248, 113, 113, 0.08)',
    borderColor: '#f87171',
    label: 'ERROR',
  },
  success: {
    icon: Sparkles,
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.08)',
    borderColor: '#34d399',
    label: 'OK',
  },
}

// Individual log entry
function LogEntry({ entry, index }) {
  const config = LOG_CONFIG[entry.type] || LOG_CONFIG.thinking
  const Icon = config.icon
  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="log-entry"
      style={{
        borderLeftColor: config.borderColor,
        background: config.bg,
      }}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div
          className="flex-shrink-0 mt-0.5"
          style={{ color: config.color }}
        >
          <Icon size={14} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Label + Timestamp */}
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[10px] font-bold tracking-widest uppercase"
              style={{ color: config.color }}
            >
              {config.label}
            </span>
            <span className="text-[10px] text-morpheus-faint font-mono">
              {time}
            </span>
          </div>

          {/* Message */}
          <p className="text-xs text-morpheus-text leading-relaxed break-words">
            {entry.message}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// File written notification — special rendering
function FileNotification({ data }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-3 my-2 p-3 rounded-lg border border-morpheus-success/20 bg-morpheus-success/5"
    >
      <div className="flex items-center gap-2 mb-1">
        <FileCode size={14} className="text-morpheus-success" />
        <span className="text-xs font-semibold text-morpheus-success">
          FILE CREATED
        </span>
        <span className="text-[10px] text-morpheus-faint ml-auto font-mono">
          {data.filesComplete}/{data.filesTotal}
        </span>
      </div>
      <p className="text-sm font-mono text-morpheus-text">
        {data.filename}
      </p>
      {data.description && (
        <p className="text-xs text-morpheus-muted mt-1">
          {data.description}
        </p>
      )}
      {/* Mini progress bar */}
      <div className="morpheus-progress mt-2">
        <motion.div
          className="morpheus-progress-fill"
          initial={{ width: 0 }}
          animate={{
            width: `${(data.filesComplete / Math.max(data.filesTotal, 1)) * 100}%`,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  )
}

// Architecture plan notification
function PlanNotification({ data }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-3 my-2 p-3 rounded-lg border border-morpheus-glow/20 bg-morpheus-glow/5"
    >
      <div className="flex items-center gap-2 mb-2">
        <Layers size={14} className="text-morpheus-glow" />
        <span className="text-xs font-semibold text-morpheus-glow">
          ARCHITECTURE PLAN
        </span>
        <span className="text-[10px] text-morpheus-muted ml-auto">
          {data.layout_type}
        </span>
      </div>

      {/* Build order */}
      <div className="space-y-1">
        {data.components.map((comp, i) => (
          <div key={comp.filename} className="flex items-center gap-2 text-xs">
            <span className="text-morpheus-faint font-mono w-4 text-right">
              {i + 1}.
            </span>
            <span className="text-morpheus-dream font-mono">
              {comp.filename}
            </span>
            <span className="text-morpheus-faint truncate">
              — {comp.description}
            </span>
          </div>
        ))}
      </div>

      {/* Design tokens */}
      {data.design_system && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-morpheus-border/30">
          <span className="text-[10px] text-morpheus-faint uppercase tracking-wider">
            Design:
          </span>
          {data.design_system.primary_color && (
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full border border-morpheus-border"
                style={{ backgroundColor: data.design_system.primary_color }}
              />
              <span className="text-[10px] text-morpheus-muted font-mono">
                {data.design_system.primary_color}
              </span>
            </div>
          )}
          {data.design_system.font_family && (
            <span className="text-[10px] text-morpheus-muted">
              {data.design_system.font_family}
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}

// Completion notification
function CompleteNotification({ data }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="mx-3 my-2 p-4 rounded-lg border border-morpheus-glow/30 bg-gradient-to-br from-morpheus-glow/10 to-morpheus-ghost/5"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-morpheus-dream" />
        <span className="text-sm font-bold text-morpheus-dream">
          PROJECT COMPLETE
        </span>
      </div>
      <p className="text-xs text-morpheus-text leading-relaxed mb-2">
        {data.summary}
      </p>
      <div className="flex items-center gap-3 text-[10px] text-morpheus-muted">
        <span>{data.file_count} files</span>
        {data.tech_stack && (
          <span>{data.tech_stack.join(' · ')}</span>
        )}
      </div>
    </motion.div>
  )
}

// ---- Main ActivityLog Component ----

export default function ActivityLog({ events = [] }) {
  const scrollRef = useRef(null)

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      // Smooth scroll to bottom
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [events.length])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-morpheus-border/50">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-morpheus-glow animate-morpheus-pulse" />
          <span className="text-xs font-semibold text-morpheus-muted uppercase tracking-wider">
            Neural Feed
          </span>
        </div>
        <span className="text-[10px] text-morpheus-faint font-mono">
          {events.length} events
        </span>
      </div>

      {/* Log Entries */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Brain size={24} className="text-morpheus-faint mb-3 animate-morpheus-breathe" />
            <p className="text-xs text-morpheus-faint">
              Morpheus is dormant.
            </p>
            <p className="text-xs text-morpheus-faint mt-1">
              Drop a screenshot to awaken.
            </p>
          </div>
        ) : (
          <div className="py-2 space-y-0.5">
            <AnimatePresence mode="popLayout">
              {events.map((event, index) => {
                // Special rendering for certain event types
                if (event.type === 'file_written') {
                  return (
                    <FileNotification
                      key={`${event.timestamp}-${index}`}
                      data={event.data}
                    />
                  )
                }
                if (event.type === 'plan') {
                  return (
                    <PlanNotification
                      key={`${event.timestamp}-${index}`}
                      data={event.data}
                    />
                  )
                }
                if (event.type === 'complete') {
                  return (
                    <CompleteNotification
                      key={`${event.timestamp}-${index}`}
                      data={event.data}
                    />
                  )
                }
                // Regular log entries
                if (event.type === 'log') {
                  return (
                    <LogEntry
                      key={`${event.timestamp}-${index}`}
                      entry={{
                        ...event.data,
                        timestamp: event.timestamp,
                      }}
                      index={index}
                    />
                  )
                }
                return null
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
