// ============================================
// CODE EDITOR — Monaco Live Code Display
// 
// Shows files as they're written in real-time.
// File tabs, syntax highlighting, line numbers.
// This displays REAL generated code, not mock.
// ============================================

import React, { useState, useEffect, useMemo } from 'react'
import Editor from '@monaco-editor/react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileCode, Copy, Check, X } from 'lucide-react'
import { getFileIcon } from './builder.js'

// Monaco editor theme — matches Morpheus aesthetic
const MORPHEUS_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '475569', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c4b5fd' },
    { token: 'string', foreground: '34d399' },
    { token: 'number', foreground: '22d3ee' },
    { token: 'type', foreground: 'fbbf24' },
    { token: 'function', foreground: 'a78bfa' },
    { token: 'variable', foreground: 'e2e8f0' },
    { token: 'tag', foreground: 'f87171' },
    { token: 'attribute.name', foreground: 'fbbf24' },
    { token: 'attribute.value', foreground: '34d399' },
    { token: 'delimiter', foreground: '64748b' },
    { token: 'operator', foreground: '94a3b8' },
  ],
  colors: {
    'editor.background': '#12121a',
    'editor.foreground': '#e2e8f0',
    'editor.lineHighlightBackground': '#1a1a2510',
    'editor.selectionBackground': '#a78bfa30',
    'editor.inactiveSelectionBackground': '#a78bfa15',
    'editorLineNumber.foreground': '#2a2a3a',
    'editorLineNumber.activeForeground': '#64748b',
    'editorCursor.foreground': '#a78bfa',
    'editorIndentGuide.background': '#1e1e2e',
    'editorIndentGuide.activeBackground': '#2a2a3a',
    'editor.selectionHighlightBackground': '#a78bfa15',
    'editorBracketMatch.background': '#a78bfa20',
    'editorBracketMatch.border': '#a78bfa40',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#2a2a3a60',
    'scrollbarSlider.hoverBackground': '#a78bfa40',
    'scrollbarSlider.activeBackground': '#a78bfa60',
  },
}

// Detect language from filename
function getLanguage(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  const map = {
    jsx: 'javascript',
    js: 'javascript',
    tsx: 'typescript',
    ts: 'typescript',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'markdown',
    svg: 'xml',
  }
  return map[ext] || 'javascript'
}

// File tab component
function FileTab({ filename, isActive, onClick, isNew }) {
  const icon = getFileIcon(filename)

  return (
    <motion.button
      layout
      initial={isNew ? { opacity: 0, y: -10, scale: 0.9 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      onClick={onClick}
      className={`file-tab flex items-center gap-1.5 whitespace-nowrap ${
        isActive ? 'active' : ''
      }`}
    >
      <span className="text-[10px]">{icon}</span>
      <span>{filename.replace(/^src\//, '').replace(/^components\//, '')}</span>
      {isNew && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-1.5 h-1.5 rounded-full bg-morpheus-success"
        />
      )}
    </motion.button>
  )
}

export default function CodeEditor({ files = {}, activeFile = null, onFileSelect }) {
  const [copied, setCopied] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  const [newFiles, setNewFiles] = useState(new Set())

  // Track newly added files for the "new" indicator
  const fileNames = Object.keys(files)
  useEffect(() => {
    if (fileNames.length > 0) {
      const latest = fileNames[fileNames.length - 1]
      setNewFiles((prev) => new Set([...prev, latest]))
      // Remove "new" indicator after 3 seconds
      const timer = setTimeout(() => {
        setNewFiles((prev) => {
          const next = new Set(prev)
          next.delete(latest)
          return next
        })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [fileNames.length])

  // Current file data
  const currentFile = activeFile || fileNames[fileNames.length - 1]
  const currentCode = currentFile
    ? typeof files[currentFile] === 'string'
      ? files[currentFile]
      : files[currentFile]?.code || ''
    : ''

  const language = getLanguage(currentFile)

  // Line count
  const lineCount = currentCode ? currentCode.split('\n').length : 0

  // Copy to clipboard
  const handleCopy = async () => {
    if (!currentCode) return
    try {
      await navigator.clipboard.writeText(currentCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = currentCode
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Configure Monaco on mount
  const handleEditorMount = (editor, monaco) => {
    monaco.editor.defineTheme('morpheus', MORPHEUS_THEME)
    monaco.editor.setTheme('morpheus')
    setEditorReady(true)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with file tabs */}
      <div className="flex items-center border-b border-morpheus-border/50">
        {/* File tabs — scrollable */}
        <div className="flex-1 flex items-end overflow-x-auto scrollbar-hide px-2 pt-2 gap-0.5">
          <AnimatePresence mode="popLayout">
            {fileNames.map((filename) => (
              <FileTab
                key={filename}
                filename={filename}
                isActive={filename === currentFile}
                isNew={newFiles.has(filename)}
                onClick={() => onFileSelect?.(filename)}
              />
            ))}
          </AnimatePresence>

          {fileNames.length === 0 && (
            <div className="px-3 py-1.5 text-xs text-morpheus-faint">
              No files yet
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 px-3 py-2">
          {currentFile && (
            <>
              <span className="text-[10px] text-morpheus-faint font-mono mr-2">
                {lineCount} lines
              </span>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md text-morpheus-faint hover:text-morpheus-text 
                           hover:bg-morpheus-border/30 transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <Check size={14} className="text-morpheus-success" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 relative">
        {currentFile ? (
          <Editor
            key={currentFile}
            height="100%"
            language={language}
            value={currentCode}
            onMount={handleEditorMount}
            theme="morpheus"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              lineHeight: 22,
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              renderLineHighlight: 'line',
              renderWhitespace: 'none',
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true,
              },
              wordWrap: 'on',
              contextmenu: false,
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              overviewRulerLanes: 0,
              folding: true,
              lineNumbers: 'on',
              glyphMargin: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
            }}
          />
        ) : (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <FileCode
              size={32}
              className="text-morpheus-faint mb-3 opacity-30"
            />
            <p className="text-sm text-morpheus-faint">
              Code appears here as Morpheus writes
            </p>
            <p className="text-xs text-morpheus-faint/50 mt-1">
              Each file streams in real-time
            </p>
          </div>
        )}

        {/* File transition overlay */}
        <AnimatePresence>
          {currentFile && (
            <motion.div
              key={`overlay-${currentFile}`}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-morpheus-deep pointer-events-none"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
