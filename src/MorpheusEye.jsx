// ============================================
// MORPHEUS EYE — The Living Avatar
// 
// This is Morpheus's face. It breathes, thinks,
// reacts, and communicates state through color,
// motion, and pupil dilation. Pure CSS + React.
// Not decorative — it's a real-time status display.
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// State-to-visual mapping
const STATE_CONFIG = {
  idle: {
    irisClass: '',
    outerSpeed: 'slow',
    pupilState: '',
    label: 'Awaiting input',
    sublabel: 'Drop a screenshot to begin',
    ringColor: 'rgba(167, 139, 250, 0.15)',
    particleColor: '#a78bfa',
  },
  analyzing: {
    irisClass: 'analyzing',
    outerSpeed: 'fast',
    pupilState: 'dilated',
    label: 'Seeing',
    sublabel: 'Analyzing the interface...',
    ringColor: 'rgba(34, 211, 238, 0.25)',
    particleColor: '#22d3ee',
  },
  planning: {
    irisClass: 'thinking',
    outerSpeed: 'medium',
    pupilState: 'contracted',
    label: 'Thinking',
    sublabel: 'Planning architecture...',
    ringColor: 'rgba(167, 139, 250, 0.25)',
    particleColor: '#a78bfa',
  },
  building: {
    irisClass: 'building',
    outerSpeed: 'fast',
    pupilState: '',
    label: 'Building',
    sublabel: '',
    ringColor: 'rgba(52, 211, 153, 0.25)',
    particleColor: '#34d399',
  },
  reviewing: {
    irisClass: 'thinking',
    outerSpeed: 'medium',
    pupilState: 'contracted',
    label: 'Reviewing',
    sublabel: 'Checking for issues...',
    ringColor: 'rgba(251, 191, 36, 0.25)',
    particleColor: '#fbbf24',
  },
  fixing: {
    irisClass: 'building',
    outerSpeed: 'fast',
    pupilState: 'dilated',
    label: 'Fixing',
    sublabel: 'Correcting issues...',
    ringColor: 'rgba(251, 191, 36, 0.3)',
    particleColor: '#fbbf24',
  },
  error: {
    irisClass: 'error',
    outerSpeed: 'slow',
    pupilState: 'dilated',
    label: 'Error',
    sublabel: 'Something went wrong',
    ringColor: 'rgba(248, 113, 113, 0.25)',
    particleColor: '#f87171',
  },
  complete: {
    irisClass: 'complete',
    outerSpeed: 'slow',
    pupilState: '',
    label: 'Complete',
    sublabel: 'Project ready',
    ringColor: 'rgba(167, 139, 250, 0.35)',
    particleColor: '#c4b5fd',
  },
}

// Floating particles around the eye
function Particle({ index, color, active }) {
  const angle = (index / 8) * Math.PI * 2
  const radius = 52
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 3,
        height: 3,
        backgroundColor: color,
        left: '50%',
        top: '50%',
      }}
      animate={{
        x: active ? [x * 0.8, x * 1.1, x * 0.8] : x * 0.9,
        y: active ? [y * 0.8, y * 1.1, y * 0.8] : y * 0.9,
        opacity: active ? [0.3, 0.8, 0.3] : 0.15,
        scale: active ? [0.8, 1.2, 0.8] : 0.6,
      }}
      transition={{
        duration: active ? 2 + index * 0.3 : 4,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: index * 0.15,
      }}
    />
  )
}

// Neural connection lines
function NeuralLine({ index, active, color }) {
  const angle = (index / 6) * Math.PI * 2
  const length = active ? 35 : 20

  return (
    <motion.div
      className="absolute origin-center"
      style={{
        width: 1,
        height: length,
        left: '50%',
        top: '50%',
        transform: `rotate(${(angle * 180) / Math.PI}deg)`,
        transformOrigin: '0 0',
      }}
      animate={{
        opacity: active ? [0.1, 0.4, 0.1] : 0.05,
        scaleY: active ? [0.6, 1, 0.6] : 0.4,
      }}
      transition={{
        duration: 2 + index * 0.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `linear-gradient(to bottom, ${color}, transparent)`,
        }}
      />
    </motion.div>
  )
}

export default function MorpheusEye({ status = 'idle', currentFile = null, progress = 0 }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [blinkState, setBlinkState] = useState(false)
  const eyeRef = useRef(null)
  const config = STATE_CONFIG[status] || STATE_CONFIG.idle
  const isActive = status !== 'idle'

  // Track mouse for pupil movement
  const handleMouseMove = useCallback((e) => {
    if (!eyeRef.current) return
    const rect = eyeRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const deltaX = e.clientX - centerX
    const deltaY = e.clientY - centerY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const maxOffset = 6

    const x = (deltaX / Math.max(distance, 1)) * Math.min(distance * 0.03, maxOffset)
    const y = (deltaY / Math.max(distance, 1)) * Math.min(distance * 0.03, maxOffset)

    setMousePos({ x, y })
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  // Random blinking
  useEffect(() => {
    const blink = () => {
      setBlinkState(true)
      setTimeout(() => setBlinkState(false), 150)
    }

    const interval = setInterval(() => {
      if (Math.random() > 0.6) blink()
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Determine outer ring animation speed
  const outerDuration = config.outerSpeed === 'fast' ? 3 : config.outerSpeed === 'medium' ? 5 : 8

  // Build sublabel — show current file when building
  const displaySublabel = status === 'building' && currentFile
    ? `Writing ${currentFile}...`
    : config.sublabel

  return (
    <div className="flex flex-col items-center gap-4">
      {/* The Eye */}
      <div
        ref={eyeRef}
        className="morpheus-eye-container relative"
        style={{ width: 110, height: 110 }}
      >
        {/* Neural lines radiating outward */}
        {[...Array(6)].map((_, i) => (
          <NeuralLine
            key={`neural-${i}`}
            index={i}
            active={isActive}
            color={config.particleColor}
          />
        ))}

        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <Particle
            key={`particle-${i}`}
            index={i}
            color={config.particleColor}
            active={isActive}
          />
        ))}

        {/* Outer rotating ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 96,
            height: 96,
            left: '50%',
            top: '50%',
            marginLeft: -48,
            marginTop: -48,
            background: `conic-gradient(from 0deg, ${config.particleColor}, transparent, ${config.particleColor}, transparent, ${config.particleColor})`,
            opacity: isActive ? 0.6 : 0.2,
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: outerDuration,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Dark ring to cut out center */}
        <div
          className="absolute rounded-full bg-morpheus-deep"
          style={{
            width: 82,
            height: 82,
            left: '50%',
            top: '50%',
            marginLeft: -41,
            marginTop: -41,
          }}
        />

        {/* Iris */}
        <motion.div
          className={`absolute rounded-full morpheus-eye-iris ${config.irisClass}`}
          style={{
            width: 56,
            height: 56,
            left: '50%',
            top: '50%',
            marginLeft: -28,
            marginTop: -28,
          }}
          animate={{
            scale: blinkState ? [1, 0.15, 1] : isActive ? [1, 1.04, 1] : 1,
          }}
          transition={{
            duration: blinkState ? 0.15 : 3,
            repeat: blinkState ? 0 : Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Pupil — follows mouse */}
          <motion.div
            className={`absolute rounded-full bg-morpheus-void morpheus-eye-pupil ${config.pupilState}`}
            style={{
              left: '50%',
              top: '50%',
              marginLeft: config.pupilState === 'dilated' ? -12 : config.pupilState === 'contracted' ? -5 : -9,
              marginTop: config.pupilState === 'dilated' ? -12 : config.pupilState === 'contracted' ? -5 : -9,
              width: config.pupilState === 'dilated' ? 24 : config.pupilState === 'contracted' ? 10 : 18,
              height: config.pupilState === 'dilated' ? 24 : config.pupilState === 'contracted' ? 10 : 18,
            }}
            animate={{
              x: mousePos.x,
              y: mousePos.y,
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
            }}
          >
            {/* Highlight reflection */}
            <div
              className="absolute rounded-full bg-white"
              style={{
                width: 4,
                height: 4,
                top: 3,
                right: 3,
                opacity: 0.7,
              }}
            />
          </motion.div>

          {/* Inner iris ring detail */}
          <div
            className="absolute inset-2 rounded-full border opacity-20"
            style={{ borderColor: config.particleColor }}
          />
        </motion.div>

        {/* Glow ring around the entire eye */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 108,
            height: 108,
            left: '50%',
            top: '50%',
            marginLeft: -54,
            marginTop: -54,
            border: `1px solid ${config.ringColor}`,
            boxShadow: `0 0 20px ${config.ringColor}, inset 0 0 20px ${config.ringColor}`,
          }}
          animate={{
            opacity: isActive ? [0.4, 0.8, 0.4] : [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Progress ring overlay */}
        {isActive && progress > 0 && (
          <svg
            className="absolute pointer-events-none"
            style={{
              width: 108,
              height: 108,
              left: '50%',
              top: '50%',
              marginLeft: -54,
              marginTop: -54,
              transform: 'rotate(-90deg)',
            }}
          >
            <circle
              cx="54"
              cy="54"
              r="52"
              fill="none"
              stroke={config.particleColor}
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.5s ease',
                opacity: 0.6,
              }}
            />
          </svg>
        )}
      </div>

      {/* Status Label */}
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={config.label}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              {isActive && (
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.particleColor }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              <span
                className="text-sm font-semibold tracking-wider uppercase"
                style={{ color: config.particleColor }}
              >
                {config.label}
              </span>
            </div>
            <p className="text-xs text-morpheus-muted max-w-48 leading-relaxed">
              {displaySublabel}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
