// ============================================
// LIVE PREVIEW — Sandpack In-Browser Preview
// 
// Renders the generated code LIVE in the browser.
// Real compilation. Real React rendering.
// Not an iframe with a screenshot — actual code running.
// ============================================

import React, { useState, useMemo } from 'react'
import {
  SandpackProvider,
  SandpackPreview,
} from '@codesandbox/sandpack-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { formatForSandpack } from './builder.js'

// Viewport presets
const VIEWPORTS = {
  desktop: { width: '100%', icon: Monitor, label: 'Desktop' },
  tablet: { width: '768px', icon: Tablet, label: 'Tablet' },
  mobile: { width: '375px', icon: Smartphone, label: 'Mobile' },
}

export default function LivePreview({
  files = {},
  designSystem = {},
  isComplete = false,
}) {
  const [viewport, setViewport] = useState('desktop')
  const [refreshKey, setRefreshKey] = useState(0)
  const [expanded, setExpanded] = useState(false)

  // Format files for Sandpack
  const sandpackFiles = useMemo(() => {
    if (Object.keys(files).length === 0) return null
    return formatForSandpack(files, designSystem)
  }, [files, designSystem])

  // Check if we have enough files to preview
  const hasApp = sandpackFiles && sandpackFiles['/App.jsx']
  const canPreview = hasApp && Object.keys(files).length >= 1

  const handleRefresh = () => setRefreshKey((k) => k + 1)

  // Viewport config
  const currentViewport = VIEWPORTS[viewport]

  // Build the font URL
  const fontFamily = designSystem.font_family || 'Inter'
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800&display=swap`

  if (!canPreview) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-morpheus-border/50">
          <div className="flex items-center gap-2">
            <Monitor size={14} className="text-morpheus-faint" />
            <span className="text-xs font-semibold text-morpheus-muted uppercase tracking-wider">
              Live Preview
            </span>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <motion.div
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Monitor size={32} className="text-morpheus-faint mb-3" />
          </motion.div>
          <p className="text-sm text-morpheus-faint">
            Preview appears when Morpheus builds App.jsx
          </p>
          <p className="text-xs text-morpheus-faint/50 mt-1">
            Live rendering — real code, real React
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${expanded ? 'fixed inset-0 z-50 bg-morpheus-deep' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-morpheus-border/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-morpheus-error/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-morpheus-warning/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-morpheus-success/60" />
          </div>
          <span className="text-xs font-semibold text-morpheus-muted uppercase tracking-wider ml-2">
            Preview
          </span>
          {isComplete && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] font-bold text-morpheus-success bg-morpheus-success/10 
                         px-2 py-0.5 rounded-full"
            >
              LIVE
            </motion.span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Viewport toggles */}
          {Object.entries(VIEWPORTS).map(([key, config]) => {
            const Icon = config.icon
            return (
              <button
                key={key}
                onClick={() => setViewport(key)}
                className={`p-1.5 rounded-md transition-colors ${
                  viewport === key
                    ? 'text-morpheus-glow bg-morpheus-glow/10'
                    : 'text-morpheus-faint hover:text-morpheus-muted hover:bg-morpheus-border/30'
                }`}
                title={config.label}
              >
                <Icon size={13} />
              </button>
            )
          })}

          <div className="w-px h-4 bg-morpheus-border/30 mx-1" />

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-md text-morpheus-faint hover:text-morpheus-muted 
                       hover:bg-morpheus-border/30 transition-colors"
            title="Refresh preview"
          >
            <RefreshCw size={13} />
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md text-morpheus-faint hover:text-morpheus-muted 
                       hover:bg-morpheus-border/30 transition-colors"
            title={expanded ? 'Minimize' : 'Fullscreen'}
          >
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Preview Body */}
      <div className="flex-1 overflow-hidden flex items-start justify-center bg-morpheus-dark p-2">
        <motion.div
          layout
          className="h-full bg-white rounded-lg overflow-hidden shadow-2xl"
          style={{
            width: currentViewport.width,
            maxWidth: '100%',
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <SandpackProvider
            key={refreshKey}
            template="react"
            files={sandpackFiles}
            customSetup={{
              dependencies: {
                'lucide-react': 'latest',
              },
            }}
            options={{
              externalResources: [
                // Use the Tailwind CDN play script — more reliable than the CSS-only CDN
                'https://unpkg.com/@tailwindcss/browser@4',
                fontUrl,
              ],
              classes: {
                'sp-wrapper': 'morpheus-sandpack-wrapper',
                'sp-layout': 'morpheus-sandpack-layout',
              },
            }}
          >
            <SandpackPreview
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
              style={{
                height: '100%',
                border: 'none',
              }}
            />
          </SandpackProvider>
        </motion.div>
      </div>

      {/* Expand overlay close button */}
      {expanded && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setExpanded(false)}
          className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-morpheus-panel border border-morpheus-border
                     text-morpheus-muted hover:text-morpheus-text transition-colors"
        >
          <Minimize2 size={18} />
        </motion.button>
      )}
    </div>
  )
}
