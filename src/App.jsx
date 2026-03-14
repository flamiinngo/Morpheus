// ============================================
// APP.JSX — The Orchestrator
// 
// This is the main file. It connects the agent
// to the UI, manages all state, handles the
// screenshot drop zone, and lays out the
// three-panel interface.
//
// Morpheus lives here.
// ============================================

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { Toaster, toast } from 'sonner'
import {
  Upload,
  Download,
  Square,
  Zap,
  Github,
  Image,
  Clipboard,
  ChevronLeft,
  ChevronRight,
  Settings,
  Key,
  X,
  Eye,
} from 'lucide-react'

import MorpheusEye from './MorpheusEye.jsx'
import ActivityLog from './ActivityLog.jsx'
import CodeEditor from './CodeEditor.jsx'
import LivePreview from './LivePreview.jsx'
import { MorpheusAgent } from './agent.js'
import { validateImage, resizeImage, createThumbnail, getImageFromClipboard } from './vision.js'
import { downloadProject, estimateComplexity } from './builder.js'

// ---- API Key Modal ----
function ApiKeyModal({ onSubmit, onClose }) {
  const [key, setKey] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (key.trim()) {
      onSubmit(key.trim())
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="morpheus-panel-glow p-8 rounded-2xl max-w-md w-full mx-4"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-morpheus-glow/10 flex items-center justify-center">
            <Key size={20} className="text-morpheus-glow" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-morpheus-text">Awaken Morpheus</h2>
            <p className="text-xs text-morpheus-muted">Enter your OpenRouter API key</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full px-4 py-3 rounded-xl bg-morpheus-dark border border-morpheus-border
                       text-morpheus-text font-mono text-sm placeholder:text-morpheus-faint
                       focus:outline-none focus:border-morpheus-glow/50 focus:ring-1 focus:ring-morpheus-glow/20
                       transition-all"
            autoFocus
          />

          <p className="text-[11px] text-morpheus-faint mt-3 leading-relaxed">
            Get a key from{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-morpheus-glow hover:underline"
            >
              openrouter.ai/keys
            </a>
            . Needs access to Hermes 3 and a vision model. Your key stays in your browser — never sent to any server except OpenRouter.
          </p>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={!key.trim()}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all
                         bg-morpheus-glow text-white hover:bg-morpheus-pulse
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Connect
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-xl text-sm text-morpheus-muted
                           border border-morpheus-border hover:bg-morpheus-border/30 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ---- Screenshot Preview ----
function ScreenshotPreview({ thumbnail, onClear }) {
  if (!thumbnail) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="px-4 py-3 border-b border-morpheus-border/50"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-morpheus-muted uppercase tracking-wider font-semibold">
          Source Screenshot
        </span>
        {onClear && (
          <button
            onClick={onClear}
            className="p-1 rounded text-morpheus-faint hover:text-morpheus-error transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <img
        src={thumbnail}
        alt="Screenshot"
        className="w-full rounded-lg border border-morpheus-border/50 object-cover"
        style={{ maxHeight: 160 }}
      />
    </motion.div>
  )
}

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function App() {
  // ---- State ----
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('morpheus_api_key') || import.meta.env.VITE_OPENROUTER_API_KEY || ''
  })
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [agentStatus, setAgentStatus] = useState('idle')
  const [events, setEvents] = useState([])
  const [files, setFiles] = useState({})
  const [activeFile, setActiveFile] = useState(null)
  const [currentFile, setCurrentFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [thumbnail, setThumbnail] = useState(null)
  const [designSystem, setDesignSystem] = useState({})
  const [isComplete, setIsComplete] = useState(false)
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  const agentRef = useRef(null)

  // Check for API key on mount
  useEffect(() => {
    if (!apiKey) {
      setShowKeyModal(true)
    }
  }, [])

  // ---- Handle API key submission ----
  const handleApiKeySubmit = (key) => {
    setApiKey(key)
    localStorage.setItem('morpheus_api_key', key)
    setShowKeyModal(false)
    toast.success('Morpheus is awake')
  }

  // ---- Agent event handler ----
  const handleAgentEvent = useCallback((event) => {
    setEvents((prev) => [...prev, event])

    switch (event.type) {
      case 'status_change':
        setAgentStatus(event.data.status)
        break

      case 'file_written':
        setFiles((prev) => ({
          ...prev,
          [event.data.filename]: {
            code: event.data.code,
            description: event.data.description,
          },
        }))
        setActiveFile(event.data.filename)
        setCurrentFile(event.data.filename)
        break

      case 'file_fixed':
        setFiles((prev) => ({
          ...prev,
          [event.data.filename]: {
            ...prev[event.data.filename],
            code: event.data.code,
          },
        }))
        setActiveFile(event.data.filename)
        break

      case 'plan':
        if (event.data.design_system) {
          setDesignSystem(event.data.design_system)
        }
        break

      case 'progress':
        setProgress(event.data.percent)
        break

      case 'complete':
        setIsComplete(true)
        setProgress(100)
        toast.success('Project complete! You can preview and download it.')
        break

      case 'log':
        if (event.data.type === 'error') {
          toast.error(event.data.message)
        }
        break
    }
  }, [])

  // ---- Handle screenshot drop ----
  const handleDrop = useCallback(
    async (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (!file) return

      // Validate
      const validation = validateImage(file)
      if (!validation.valid) {
        toast.error(validation.error)
        return
      }

      // Check API key
      if (!apiKey) {
        setShowKeyModal(true)
        toast.error('Enter your API key first')
        return
      }

      // Reset state for new run
      setEvents([])
      setFiles({})
      setActiveFile(null)
      setCurrentFile(null)
      setProgress(0)
      setIsComplete(false)
      setDesignSystem({})

      try {
        // Create thumbnail for display
        const thumb = await createThumbnail(file)
        setThumbnail(thumb)

        // Resize image for vision model
        const imageBase64 = await resizeImage(file)

        toast.success('Screenshot loaded. Morpheus is waking up...')

        // Create agent and run
        const agent = new MorpheusAgent(apiKey, handleAgentEvent)
        agentRef.current = agent
        agent.run(imageBase64)
      } catch (error) {
        toast.error(`Failed to process image: ${error.message}`)
      }
    },
    [apiKey, handleAgentEvent]
  )

  // ---- Handle clipboard paste ----
  useEffect(() => {
    const handlePaste = (e) => {
      const file = getImageFromClipboard(e)
      if (file) {
        e.preventDefault()
        handleDrop([file])
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handleDrop])

  // ---- Stop agent ----
  const handleStop = () => {
    if (agentRef.current) {
      agentRef.current.stop()
      toast.info('Morpheus stopped')
    }
  }

  // ---- Download project ----
  const handleDownload = async () => {
    if (Object.keys(files).length === 0) {
      toast.error('No files to download yet')
      return
    }

    try {
      const result = await downloadProject(files, designSystem)
      toast.success(`Downloaded ${result.fileCount} files`)
    } catch (error) {
      toast.error(`Download failed: ${error.message}`)
    }
  }

  // ---- Clear and reset ----
  const handleClear = () => {
    if (agentRef.current) {
      agentRef.current.stop()
    }
    setEvents([])
    setFiles({})
    setActiveFile(null)
    setCurrentFile(null)
    setProgress(0)
    setIsComplete(false)
    setThumbnail(null)
    setDesignSystem({})
    setAgentStatus('idle')
  }

  // ---- Dropzone config ----
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 1,
    noClick: agentStatus !== 'idle',
    noDrag: agentStatus !== 'idle' && agentStatus !== 'complete',
  })

  // ---- Complexity estimate ----
  const complexity = Object.keys(files).length > 0 ? estimateComplexity(files) : null

  // ---- Is agent working? ----
  const isWorking = !['idle', 'complete', 'error'].includes(agentStatus)

  return (
    <div className="h-screen w-screen flex flex-col bg-morpheus-deep noise-overlay overflow-hidden">
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#1a1a25',
            border: '1px solid #2a2a3a',
            color: '#e2e8f0',
            fontSize: '13px',
          },
        }}
      />

      {/* API Key Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <ApiKeyModal
            onSubmit={handleApiKeySubmit}
            onClose={apiKey ? () => setShowKeyModal(false) : null}
          />
        )}
      </AnimatePresence>

      {/* ---- Top Bar ---- */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-morpheus-border/50 bg-morpheus-dark/50 backdrop-blur-sm z-10">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Eye size={20} className="text-morpheus-glow" />
            <h1 className="text-base font-bold tracking-tight">
              <span className="text-morpheus-glow">MORPH</span>
              <span className="text-morpheus-text">EUS</span>
            </h1>
          </div>
          <div className="hidden sm:block w-px h-5 bg-morpheus-border/50" />
          <span className="hidden sm:block text-[11px] text-morpheus-faint">
            Built on Hermes by Nous Research
          </span>
        </div>

        {/* Center: Progress bar (when active) */}
        {isWorking && (
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-8">
            <div className="morpheus-progress flex-1">
              <motion.div
                className="morpheus-progress-fill"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs font-mono text-morpheus-muted">
              {progress}%
            </span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Status badge */}
          <div
            className={`status-badge ${
              isWorking ? 'working' : isComplete ? 'done' : 'idle'
            }`}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isWorking
                  ? '#c4b5fd'
                  : isComplete
                  ? '#34d399'
                  : '#64748b',
              }}
              animate={isWorking ? { opacity: [0.4, 1, 0.4] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            {isWorking ? 'Working' : isComplete ? 'Complete' : 'Ready'}
          </div>

          {/* Stop button */}
          {isWorking && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleStop}
              className="p-2 rounded-lg text-morpheus-error hover:bg-morpheus-error/10 transition-colors"
              title="Stop Morpheus"
            >
              <Square size={15} />
            </motion.button>
          )}

          {/* Download button */}
          {Object.keys(files).length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                         bg-morpheus-glow/10 text-morpheus-glow hover:bg-morpheus-glow/20 
                         transition-colors border border-morpheus-glow/20"
            >
              <Download size={13} />
              <span>Download</span>
            </motion.button>
          )}

          {/* Settings */}
          <button
            onClick={() => setShowKeyModal(true)}
            className="p-2 rounded-lg text-morpheus-faint hover:text-morpheus-muted 
                       hover:bg-morpheus-border/30 transition-colors"
            title="API Key"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* ---- Main Content ---- */}
      <div className="flex-1 flex overflow-hidden">
        {/* ---- Left Panel: Morpheus Eye + Activity Log ---- */}
        <AnimatePresence mode="wait">
          {leftPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex flex-col border-r border-morpheus-border/50 bg-morpheus-dark/30 overflow-hidden"
              style={{ minWidth: 0 }}
            >
              {/* Morpheus Eye */}
              <div className="flex-shrink-0 flex flex-col items-center py-6 border-b border-morpheus-border/50">
                <MorpheusEye
                  status={agentStatus}
                  currentFile={currentFile}
                  progress={progress}
                />
              </div>

              {/* Screenshot Preview */}
              <ScreenshotPreview
                thumbnail={thumbnail}
                onClear={!isWorking ? handleClear : null}
              />

              {/* Drop Zone (when idle) */}
              {agentStatus === 'idle' && !thumbnail && (
                <div className="flex-shrink-0 px-4 py-4 border-b border-morpheus-border/50">
                  <div
                    {...getRootProps()}
                    className={`drop-zone p-6 ${isDragActive ? 'drag-over' : ''}`}
                  >
                    <input {...getInputProps()} />
                    <Upload
                      size={24}
                      className={`mb-2 ${
                        isDragActive ? 'text-morpheus-glow' : 'text-morpheus-faint'
                      }`}
                    />
                    <p className="text-sm text-morpheus-muted font-medium mb-1">
                      {isDragActive ? 'Drop it here' : 'Drop a screenshot'}
                    </p>
                    <p className="text-[11px] text-morpheus-faint">
                      or click to browse · or paste from clipboard
                    </p>
                  </div>
                </div>
              )}

              {/* New Build Button (when complete) */}
              {(isComplete || agentStatus === 'error') && (
                <div className="flex-shrink-0 px-4 py-3 border-b border-morpheus-border/50">
                  <div
                    {...getRootProps()}
                    className={`drop-zone p-4 ${isDragActive ? 'drag-over' : ''}`}
                  >
                    <input {...getInputProps()} />
                    <Zap
                      size={20}
                      className={`mb-1.5 ${
                        isDragActive ? 'text-morpheus-glow' : 'text-morpheus-faint'
                      }`}
                    />
                    <p className="text-xs text-morpheus-muted font-medium">
                      Drop new screenshot to rebuild
                    </p>
                  </div>
                </div>
              )}

              {/* Activity Log */}
              <div className="flex-1 overflow-hidden">
                <ActivityLog events={events} />
              </div>

              {/* Complexity badge */}
              {complexity && (
                <div className="flex-shrink-0 px-4 py-2 border-t border-morpheus-border/50 
                                flex items-center justify-between">
                  <span className="text-[10px] text-morpheus-faint uppercase tracking-wider">
                    Complexity
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: complexity.color }}
                  >
                    {complexity.label} · {Object.keys(files).length} files
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left panel toggle */}
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className="flex-shrink-0 w-5 flex items-center justify-center
                     hover:bg-morpheus-border/20 transition-colors border-r border-morpheus-border/30"
        >
          {leftPanelOpen ? (
            <ChevronLeft size={12} className="text-morpheus-faint" />
          ) : (
            <ChevronRight size={12} className="text-morpheus-faint" />
          )}
        </button>

        {/* ---- Center: Code Editor ---- */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Show drop zone overlay when no files and idle */}
          {agentStatus === 'idle' && Object.keys(files).length === 0 && !thumbnail ? (
            <div
              {...getRootProps()}
              className="flex-1 flex flex-col items-center justify-center cursor-pointer"
            >
              <input {...getInputProps()} />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                {/* Large Morpheus branding */}
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="mb-8"
                >
                  <Eye size={48} className="text-morpheus-glow mx-auto mb-4" />
                  <h2 className="text-3xl font-bold tracking-tight mb-2">
                    <span className="text-morpheus-glow">MORPH</span>
                    <span className="text-morpheus-text">EUS</span>
                  </h2>
                  <p className="text-morpheus-muted text-sm">
                    Show it any interface. It builds the code.
                  </p>
                </motion.div>

                <div
                  className={`drop-zone px-12 py-10 max-w-lg mx-auto ${
                    isDragActive ? 'drag-over' : ''
                  }`}
                >
                  <Upload
                    size={32}
                    className={`mb-3 mx-auto ${
                      isDragActive ? 'text-morpheus-glow' : 'text-morpheus-faint'
                    }`}
                  />
                  <p className="text-base text-morpheus-muted font-medium mb-2">
                    {isDragActive
                      ? 'Drop your screenshot'
                      : 'Drop a screenshot to begin'}
                  </p>
                  <p className="text-xs text-morpheus-faint">
                    PNG, JPG, or WebP · You can also paste from clipboard (Ctrl+V)
                  </p>

                  <div className="flex items-center justify-center gap-4 mt-6 text-[11px] text-morpheus-faint">
                    <span className="flex items-center gap-1.5">
                      <Image size={12} />
                      Screenshot
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clipboard size={12} />
                      Paste
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-morpheus-faint mt-8">
                  Powered by{' '}
                  <span className="text-morpheus-glow font-semibold">Hermes</span>
                  {' '}from Nous Research
                </p>
              </motion.div>
            </div>
          ) : (
            <CodeEditor
              files={files}
              activeFile={activeFile}
              onFileSelect={setActiveFile}
            />
          )}
        </div>

        {/* Right panel toggle */}
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="flex-shrink-0 w-5 flex items-center justify-center
                     hover:bg-morpheus-border/20 transition-colors border-l border-morpheus-border/30"
        >
          {rightPanelOpen ? (
            <ChevronRight size={12} className="text-morpheus-faint" />
          ) : (
            <ChevronLeft size={12} className="text-morpheus-faint" />
          )}
        </button>

        {/* ---- Right Panel: Live Preview ---- */}
        <AnimatePresence mode="wait">
          {rightPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 480, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex flex-col border-l border-morpheus-border/50 overflow-hidden"
              style={{ minWidth: 0 }}
            >
              <LivePreview
                files={files}
                designSystem={designSystem}
                isComplete={isComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- Bottom Bar ---- */}
      <footer className="flex items-center justify-between px-4 py-1.5 border-t border-morpheus-border/50 bg-morpheus-dark/50">
        <div className="flex items-center gap-3 text-[10px] text-morpheus-faint">
          <span>Morpheus v1.0</span>
          <span>·</span>
          <span>Hermes 3 405B</span>
          <span>·</span>
          <span>Gemini Vision</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-morpheus-faint">
          {isWorking && (
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-morpheus-glow"
            >
              Agent active
            </motion.span>
          )}
          <span>
            Built for the Hermes Agent Hackathon
          </span>
        </div>
      </footer>
    </div>
  )
}
