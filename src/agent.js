// ============================================
// MORPHEUS AGENT — The Autonomous Build Brain
// Powered by Hermes 3 via OpenRouter
//
// Uses native Hermes <tool_call> format
// instead of OpenRouter tools parameter
// (no providers support tools for Hermes)
// ============================================

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const HERMES_MODEL = 'nousresearch/hermes-3-llama-3.1-405b'
const VISION_MODEL = 'google/gemini-2.0-flash-001'

const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'analyze_screenshot',
      description: 'Analyze a screenshot to identify UI components, layout patterns, design system, colors, typography, and overall architecture.',
      parameters: {
        type: 'object',
        properties: {
          image_description: {
            type: 'string',
            description: 'Description of what the vision model saw in the screenshot'
          }
        },
        required: ['image_description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_architecture_plan',
      description: 'Create a complete architecture plan for the project including file list, component hierarchy, dependencies between files, and build order.',
      parameters: {
        type: 'object',
        properties: {
          components: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                filename: { type: 'string' },
                description: { type: 'string' },
                dependencies: {
                  type: 'array',
                  items: { type: 'string' }
                },
                priority: { type: 'number' }
              },
              required: ['name', 'filename', 'description', 'dependencies', 'priority']
            },
            description: 'List of components to build, ordered by priority'
          },
          design_system: {
            type: 'object',
            properties: {
              primary_color: { type: 'string' },
              secondary_color: { type: 'string' },
              background_color: { type: 'string' },
              text_color: { type: 'string' },
              font_family: { type: 'string' },
              border_radius: { type: 'string' },
              spacing_unit: { type: 'string' }
            },
            description: 'Extracted design system tokens'
          },
          layout_type: {
            type: 'string',
            enum: ['single-page', 'multi-section', 'dashboard', 'landing-page', 'app-interface'],
            description: 'Overall layout pattern detected'
          }
        },
        required: ['components', 'design_system', 'layout_type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write a complete code file for the project. The code must be production-quality, properly formatted, and match the design system.',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'The filename including path, e.g. "App.jsx" or "components/Navbar.jsx"'
          },
          code: {
            type: 'string',
            description: 'The complete file contents — production-quality code'
          },
          description: {
            type: 'string',
            description: 'Brief description of what this file does'
          }
        },
        required: ['filename', 'code', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'review_file',
      description: 'Review a previously written file for bugs, missing imports, style inconsistencies, or logical errors.',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'The filename to review'
          },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                severity: { type: 'string', enum: ['critical', 'warning', 'suggestion'] },
                description: { type: 'string' },
                fix: { type: 'string' }
              }
            },
            description: 'List of issues found'
          },
          verdict: {
            type: 'string',
            enum: ['pass', 'fix_needed', 'rewrite'],
            description: 'Whether the file passes review'
          }
        },
        required: ['filename', 'issues', 'verdict']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fix_file',
      description: 'Fix issues found during review by rewriting part or all of a file.',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'The filename to fix'
          },
          code: {
            type: 'string',
            description: 'The corrected complete file contents'
          },
          fixes_applied: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of fixes that were applied'
          }
        },
        required: ['filename', 'code', 'fixes_applied']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'project_complete',
      description: 'Signal that the project is complete. Only call this when ALL files have been written and reviewed.',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'A summary of the completed project'
          },
          file_count: {
            type: 'number',
            description: 'Total number of files written'
          },
          tech_stack: {
            type: 'array',
            items: { type: 'string' },
            description: 'Technologies used in the project'
          }
        },
        required: ['summary', 'file_count', 'tech_stack']
      }
    }
  }
]

export class MorpheusAgent {
  constructor(apiKey, onEvent) {
    this.apiKey = apiKey
    this.onEvent = onEvent
    this.conversationHistory = []
    this.files = {}
    this.plan = null
    this.status = 'idle'
    this.isRunning = false
    this.currentFile = null
    this.buildOrder = []
    this.builtFiles = []
    this.reviewedFiles = []
    this.abortController = null
  }

  emit(type, data) {
    if (this.onEvent) {
      this.onEvent({ type, data, timestamp: Date.now() })
    }
  }

  // ============================================
  // HERMES API CALL
  // Uses native <tool_call> format in system prompt
  // instead of OpenRouter tools parameter
  // ============================================
  async callHermes(messages, tools = null, model = HERMES_MODEL) {
    // Inject tool definitions into system message for native Hermes function calling
    // Hermes 3 was trained on <tool_call> format natively
    let finalMessages = messages
    if (tools && messages.length > 0) {
      const toolDescriptions = tools.map(t => JSON.stringify(t.function, null, 2)).join('\n\n')
      const toolSystemMsg = `\n\nYou have access to the following tools. To call a tool, you MUST respond with a JSON block in this EXACT format — no other text:\n<tool_call>\n{"name": "tool_name", "arguments": {...}}\n</tool_call>\n\nAvailable tools:\n${toolDescriptions}\n\nRULES:\n- Call exactly ONE tool per response\n- Do NOT include any text outside the <tool_call> tags\n- The arguments must be valid JSON matching the tool's parameter schema\n- Always call a tool — never respond with plain text`

      finalMessages = messages.map((msg, i) => {
        if (i === 0 && msg.role === 'system') {
          return { ...msg, content: msg.content + toolSystemMsg }
        }
        return msg
      })
    }

    const body = {
      model,
      messages: finalMessages,
      temperature: 0.3,
      max_tokens: 8192,
    }

    let retries = 3
    let delay = 3000

    while (retries > 0) {
      try {
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'Morpheus Agent'
          },
          body: JSON.stringify(body),
          signal: this.abortController?.signal
        })

        if (response.status === 429) {
          retries--
          this.emit('log', {
            type: 'warning',
            message: `Rate limited. Waiting ${delay / 1000}s... (${retries} retries left)`
          })
          await new Promise(r => setTimeout(r, delay))
          delay *= 2
          continue
        }

        if (response.status === 402) {
          throw new Error('Insufficient credits. Add more at openrouter.ai/credits')
        }

        if (!response.ok) {
          const err = await response.text()
          throw new Error(`API Error ${response.status}: ${err}`)
        }

        const result = await response.json()

        if (!result.choices || result.choices.length === 0) {
          throw new Error('Empty response from model')
        }

                const message = result.choices[0].message

        // Parse Hermes function calls — supports both <tool_call> tags and raw JSON
        if (message.content) {
          const toolCalls = []
          const content = message.content.trim()

          // Method 1: Look for <tool_call> tags
          const tagRegex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g
          let match
          while ((match = tagRegex.exec(content)) !== null) {
            try {
              const parsed = JSON.parse(match[1].trim())
              if (parsed.name) {
                toolCalls.push({
                  id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  type: 'function',
                  function: {
                    name: parsed.name,
                    arguments: JSON.stringify(parsed.arguments || {})
                  }
                })
              }
            } catch (e) {
              console.warn('Failed to parse tagged tool call:', match[1])
            }
          }

          // Method 2: If no tagged calls found, try raw JSON with "name" and "arguments"
          if (toolCalls.length === 0) {
            try {
              // Try parsing the whole content as JSON
              const parsed = JSON.parse(content)
              if (parsed.name && typeof parsed.name === 'string') {
                toolCalls.push({
                  id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  type: 'function',
                  function: {
                    name: parsed.name,
                    arguments: JSON.stringify(parsed.arguments || {})
                  }
                })
              }
            } catch (e) {
              // Not valid JSON — try to find JSON object in the text
              const jsonRegex = /\{[\s\S]*"name"\s*:\s*"(\w+)"[\s\S]*"arguments"\s*:\s*\{[\s\S]*\}[\s\S]*\}/g
              let jsonMatch
              while ((jsonMatch = jsonRegex.exec(content)) !== null) {
                try {
                  const parsed = JSON.parse(jsonMatch[0])
                  if (parsed.name) {
                    toolCalls.push({
                      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      type: 'function',
                      function: {
                        name: parsed.name,
                        arguments: JSON.stringify(parsed.arguments || {})
                      }
                    })
                  }
                } catch (e2) {
                  console.warn('Failed to parse embedded JSON tool call')
                }
              }
            }
          }

          if (toolCalls.length > 0) {
            message.tool_calls = toolCalls
            message.content = null
          }
        }

        return message

      } catch (error) {
        if (error.name === 'AbortError') throw error
        retries--
        if (retries === 0) throw error
        this.emit('log', {
          type: 'warning',
          message: `Request failed: ${error.message}. Retrying in ${delay / 1000}s...`
        })
        await new Promise(r => setTimeout(r, delay))
        delay *= 2
      }
    }
  }

  // ============================================
  // VISION — Screenshot Analysis
  // Uses Gemini Flash via direct fetch
  // ============================================
  async analyzeScreenshot(imageBase64) {
    this.setStatus('analyzing')
    this.emit('log', {
      type: 'analyzing',
      message: 'Morpheus is opening its eye... analyzing the screenshot'
    })

    // Clean the base64 — remove any data URL prefix, whitespace, newlines
    let cleanBase64 = imageBase64
      .replace(/^data:image\/[a-zA-Z]+;base64,/, '')
      .replace(/\s/g, '')
      .replace(/\n/g, '')
      .replace(/\r/g, '')

    const sizeKB = Math.round((cleanBase64.length * 3) / 4 / 1024)
    this.emit('log', {
      type: 'analyzing',
      message: `Image size: ${sizeKB}KB — sending to vision model...`
    })

    const requestBody = {
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'You are Morpheus, an expert UI/UX analyst. Analyze this screenshot of a web application in EXTREME detail. Describe: 1. Every visible UI component (navbar, hero, cards, buttons, forms, footers, sidebars, etc.) 2. Layout system (grid, flexbox patterns, column counts, spacing) 3. Design tokens (colors with hex guesses, typography, font sizes, border radius, shadows) 4. Content structure (headings, body text, CTAs, images, icons) 5. Interactive elements (buttons, links, dropdowns, inputs) 6. Overall design style (minimal, corporate, dark mode, glassmorphism, etc.) 7. Responsive hints. Be precise. A developer will use your analysis to rebuild this pixel-perfect.'
            },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/jpeg;base64,' + cleanBase64
              }
            }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 4096
    }

    let retries = 3
    let delay = 3000
    let visionResponse = null

    while (retries > 0) {
      try {
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + this.apiKey,
            'Content-Type': 'application/json',
            'X-Title': 'Morpheus Agent'
          },
          body: JSON.stringify(requestBody),
          signal: this.abortController?.signal
        })

        if (response.status === 429) {
          retries--
          this.emit('log', {
            type: 'warning',
            message: `Rate limited. Waiting ${delay / 1000}s...`
          })
          await new Promise(r => setTimeout(r, delay))
          delay *= 2
          continue
        }

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Vision API Error ${response.status}: ${errText}`)
        }

        const result = await response.json()

        if (!result.choices || result.choices.length === 0) {
          throw new Error('Empty response from vision model')
        }

        visionResponse = result.choices[0].message
        break

      } catch (error) {
        if (error.name === 'AbortError') throw error
        retries--
        if (retries === 0) throw error
        this.emit('log', {
          type: 'warning',
          message: `Vision request failed: ${error.message}. Retrying in ${delay / 1000}s...`
        })
        await new Promise(r => setTimeout(r, delay))
        delay *= 2
      }
    }

    this.emit('log', {
      type: 'analyzing',
      message: 'Screenshot analyzed. Morpheus sees everything.'
    })

    this.emit('vision_result', {
      analysis: visionResponse.content
    })

    return visionResponse.content
  }

  // ============================================
  // MAIN AGENT LOOP
  // analyze → plan → [write → review → fix]* → complete
  // ============================================
  async run(imageBase64) {
    if (this.isRunning) return
    this.isRunning = true
    this.abortController = new AbortController()
    this.files = {}
    this.builtFiles = []
    this.reviewedFiles = []
    this.conversationHistory = []

    try {
      const analysis = await this.analyzeScreenshot(imageBase64)

      this.setStatus('planning')
      this.emit('log', {
        type: 'analyzing',
        message: 'Morpheus is thinking... planning the architecture'
      })

      this.conversationHistory = [
        {
          role: 'system',
          content: `You are Morpheus, an autonomous AI architect agent. You have just analyzed a screenshot of a web application and now you must rebuild it from scratch.

YOUR CAPABILITIES (tools):
- create_architecture_plan: Plan the full project structure
- write_file: Write a complete code file
- review_file: Review a file you wrote for bugs/issues
- fix_file: Fix issues found during review
- project_complete: Signal when the project is fully done

YOUR RULES:
1. ALWAYS start by calling create_architecture_plan based on the analysis
2. Write files ONE AT A TIME in dependency order (shared utilities first, then components, then the main App)
3. After writing every file, REVIEW it with review_file
4. If review finds critical issues, call fix_file immediately
5. Only call project_complete when ALL planned files are written AND reviewed
6. Use React + Tailwind CSS for all components
7. Write COMPLETE files — no placeholders, no TODOs, no "add more here"
8. Match the original design as closely as possible using the analysis
9. Every component must be properly exported and imported
10. Include all necessary imports at the top of each file

TECH STACK:
- React 18 (functional components, hooks)
- Tailwind CSS (utility classes, no separate CSS files needed)
- Lucide React for icons
- No routing needed — single page app
- Export everything from component files as named or default exports

DESIGN APPROACH:
- Use Tailwind utility classes inline
- Create a cohesive design system based on the analysis
- Ensure responsive design with Tailwind breakpoints
- Add hover states, transitions, and micro-interactions
- Use semantic HTML elements

IMPORTANT: Call ONE tool at a time. After each tool call, wait for the result before calling the next tool.

You must work AUTONOMOUSLY. Do not ask for confirmation. Just build.`
        },
        {
          role: 'user',
          content: `Here is the detailed analysis of the screenshot I want you to rebuild:\n\n${analysis}\n\nBegin by creating the architecture plan, then build every file one by one. Start now.`
        }
      ]

      let maxIterations = 50
      let iteration = 0
      let consecutiveEmptyResponses = 0

      while (this.isRunning && iteration < maxIterations) {
        iteration++

        if (iteration > 1) {
          await new Promise(r => setTimeout(r, 1000))
        }

        let response
        try {
          response = await this.callHermes(
            this.conversationHistory,
            AGENT_TOOLS
          )
        } catch (error) {
          if (error.name === 'AbortError') throw error

          this.emit('log', {
            type: 'error',
            message: `Agent call failed: ${error.message}`
          })

          if (this.builtFiles.length > 0) {
            this.emit('log', {
              type: 'warning',
              message: `Morpheus completed ${this.builtFiles.length} files before the error. Wrapping up.`
            })
            this.setStatus('complete')
            this.emit('complete', {
              summary: `Built ${this.builtFiles.length} files before encountering an error.`,
              file_count: this.builtFiles.length,
              tech_stack: ['React', 'Tailwind CSS'],
              files: { ...this.files }
            })
            break
          }
          throw error
        }

        this.conversationHistory.push(response)

        if (response.tool_calls && response.tool_calls.length > 0) {
          consecutiveEmptyResponses = 0
          for (const toolCall of response.tool_calls) {
            await this.handleToolCall(toolCall)
          }
        } else if (response.content) {
          consecutiveEmptyResponses = 0
          this.emit('log', {
            type: 'thinking',
            message: response.content.slice(0, 200)
          })

          this.conversationHistory.push({
            role: 'user',
            content: 'Continue. Use your tools to keep building. If all files are written and reviewed, call project_complete.'
          })
        } else {
          consecutiveEmptyResponses++
          if (consecutiveEmptyResponses >= 3) {
            this.emit('log', {
              type: 'warning',
              message: 'Morpheus went quiet. Wrapping up with what we have.'
            })

            if (this.builtFiles.length > 0) {
              this.setStatus('complete')
              this.emit('complete', {
                summary: `Built ${this.builtFiles.length} files.`,
                file_count: this.builtFiles.length,
                tech_stack: ['React', 'Tailwind CSS'],
                files: { ...this.files }
              })
            }
            break
          }

          this.conversationHistory.push({
            role: 'user',
            content: 'You must call a tool now. Use write_file to write the next file, or call project_complete if done.'
          })
        }

        if (this.status === 'complete') {
          break
        }

        if (this.conversationHistory.length > 40) {
          this.trimHistory()
        }
      }

      if (iteration >= maxIterations && this.status !== 'complete') {
        this.emit('log', {
          type: 'warning',
          message: 'Morpheus reached iteration limit. Wrapping up.'
        })
        if (this.builtFiles.length > 0) {
          this.setStatus('complete')
          this.emit('complete', {
            summary: `Built ${this.builtFiles.length} files before reaching iteration limit.`,
            file_count: this.builtFiles.length,
            tech_stack: ['React', 'Tailwind CSS'],
            files: { ...this.files }
          })
        }
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        this.emit('log', { type: 'error', message: 'Morpheus was interrupted.' })
      } else {
        this.emit('log', { type: 'error', message: `Error: ${error.message}` })
        this.setStatus('error')
      }
    } finally {
      this.isRunning = false
    }
  }

  // ============================================
  // HISTORY MANAGEMENT
  // Trim conversation to avoid token limits
  // ============================================
  trimHistory() {
    const system = this.conversationHistory[0]
    const firstUser = this.conversationHistory[1]
    const recent = this.conversationHistory.slice(-20)

    const summaryMessage = {
      role: 'user',
      content: `[CONTEXT SUMMARY] Files built: ${this.builtFiles.join(', ')}. Reviewed: ${this.reviewedFiles.join(', ')}. Build order: ${this.buildOrder.join(' → ')}. Continue building remaining files.`
    }

    this.conversationHistory = [system, firstUser, summaryMessage, ...recent]

    this.emit('log', {
      type: 'thinking',
      message: 'Morpheus compressed its memory to stay focused.'
    })
  }

  // ============================================
  // TOOL CALL HANDLER
  // Routes tool calls to the right handler
  // ============================================
  async handleToolCall(toolCall) {
    const { name, arguments: argsStr } = toolCall.function
    let args

    try {
      args = JSON.parse(argsStr)
    } catch (e) {
      try {
        const cleaned = argsStr
          .replace(/[\x00-\x1F\x7F]/g, (ch) => {
            const escapes = { '\n': '\\n', '\r': '\\r', '\t': '\\t' }
            return escapes[ch] || ''
          })
        args = JSON.parse(cleaned)
      } catch (e2) {
        this.emit('log', { type: 'error', message: `Failed to parse tool args for ${name}. Retrying...` })
        this.conversationHistory.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: 'Invalid JSON in arguments. Please try again with valid JSON.' })
        })
        return
      }
    }

    switch (name) {
      case 'analyze_screenshot':
        await this.handleAnalyze(toolCall.id, args)
        break
      case 'create_architecture_plan':
        await this.handlePlan(toolCall.id, args)
        break
      case 'write_file':
        await this.handleWriteFile(toolCall.id, args)
        break
      case 'review_file':
        await this.handleReviewFile(toolCall.id, args)
        break
      case 'fix_file':
        await this.handleFixFile(toolCall.id, args)
        break
      case 'project_complete':
        await this.handleComplete(toolCall.id, args)
        break
      default:
        this.conversationHistory.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: `Unknown tool: ${name}` })
        })
    }
  }

  // ---- Tool Handlers ----

  async handleAnalyze(toolCallId, args) {
    this.emit('log', {
      type: 'analyzing',
      message: `Vision analysis: ${args.image_description?.slice(0, 150)}...`
    })

    this.conversationHistory.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content: JSON.stringify({
        status: 'success',
        message: 'Screenshot analysis complete. Now create the architecture plan.'
      })
    })
  }

  async handlePlan(toolCallId, args) {
    this.plan = args
    this.setStatus('planning')

    this.buildOrder = args.components
      .sort((a, b) => a.priority - b.priority)
      .map(c => c.filename)

    this.emit('log', {
      type: 'analyzing',
      message: `Architecture planned: ${args.layout_type} layout with ${args.components.length} components`
    })

    this.emit('plan', {
      components: args.components,
      design_system: args.design_system,
      layout_type: args.layout_type,
      build_order: this.buildOrder
    })

    for (const comp of args.components) {
      this.emit('log', {
        type: 'planning',
        message: `📐 Planned: ${comp.filename} — ${comp.description}`
      })
    }

    this.conversationHistory.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content: JSON.stringify({
        status: 'success',
        message: `Architecture plan saved. ${args.components.length} files planned. Build order: ${this.buildOrder.join(' → ')}. Now start writing files in order, beginning with: ${this.buildOrder[0]}. Call write_file for each one.`
      })
    })
  }

  async handleWriteFile(toolCallId, args) {
    this.setStatus('building')
    this.currentFile = args.filename

    this.files[args.filename] = {
      code: args.code,
      description: args.description
    }

    if (!this.builtFiles.includes(args.filename)) {
      this.builtFiles.push(args.filename)
    }

    this.emit('log', {
      type: 'building',
      message: `✍️ Writing ${args.filename} — ${args.description}`
    })

    this.emit('file_written', {
      filename: args.filename,
      code: args.code,
      description: args.description,
      filesComplete: this.builtFiles.length,
      filesTotal: this.buildOrder.length || this.builtFiles.length
    })

    const total = Math.max(this.buildOrder.length, this.builtFiles.length)
    const progress = Math.round((this.builtFiles.length / total) * 100)
    this.emit('progress', { percent: progress })

    this.conversationHistory.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content: JSON.stringify({
        status: 'success',
        message: `File ${args.filename} written (${this.builtFiles.length}/${this.buildOrder.length || '?'}). Now review this file with review_file, then continue to the next file.`
      })
    })
  }

  async handleReviewFile(toolCallId, args) {
    this.setStatus('reviewing')

    const issueCount = args.issues?.length || 0
    const criticalCount = args.issues?.filter(i => i.severity === 'critical').length || 0

    this.emit('log', {
      type: 'reviewing',
      message: `🔍 Reviewing ${args.filename}: ${issueCount} issue(s), verdict: ${args.verdict}`
    })

    if (args.issues && args.issues.length > 0) {
      for (const issue of args.issues) {
        this.emit('log', {
          type: issue.severity === 'critical' ? 'error' : 'reviewing',
          message: `  ${issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '💡'} ${issue.description}`
        })
      }
    }

    this.emit('file_reviewed', {
      filename: args.filename,
      issues: args.issues,
      verdict: args.verdict
    })

    if (args.verdict === 'pass') {
      if (!this.reviewedFiles.includes(args.filename)) {
        this.reviewedFiles.push(args.filename)
      }
    }

    let nextInstruction = ''
    if (args.verdict === 'fix_needed' || args.verdict === 'rewrite') {
      nextInstruction = `Fix the issues in ${args.filename} using fix_file.`
    } else {
      const nextFile = this.buildOrder.find(f => !this.builtFiles.includes(f))
      if (nextFile) {
        nextInstruction = `Good. Now write the next file: ${nextFile} using write_file.`
      } else {
        const unreviewed = this.builtFiles.filter(f => !this.reviewedFiles.includes(f))
        if (unreviewed.length > 0) {
          nextInstruction = `All files written. Review remaining: ${unreviewed.join(', ')}`
        } else {
          nextInstruction = 'All files written and reviewed. Call project_complete now.'
        }
      }
    }

    this.conversationHistory.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content: JSON.stringify({
        status: 'success',
        verdict: args.verdict,
        issues_count: issueCount,
        critical_count: criticalCount,
        message: nextInstruction
      })
    })
  }

  async handleFixFile(toolCallId, args) {
    this.setStatus('fixing')

    this.files[args.filename] = {
      ...this.files[args.filename],
      code: args.code
    }

    this.emit('log', {
      type: 'building',
      message: `🔧 Fixed ${args.filename}: ${args.fixes_applied.join(', ')}`
    })

    this.emit('file_fixed', {
      filename: args.filename,
      code: args.code,
      fixes: args.fixes_applied
    })

    if (!this.reviewedFiles.includes(args.filename)) {
      this.reviewedFiles.push(args.filename)
    }

    const nextFile = this.buildOrder.find(f => !this.builtFiles.includes(f))
    let nextInstruction = nextFile
      ? `Fix applied. Now write the next file: ${nextFile} using write_file.`
      : 'Fix applied. All files written and reviewed. Call project_complete now.'

    this.conversationHistory.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content: JSON.stringify({
        status: 'success',
        message: nextInstruction
      })
    })
  }

  async handleComplete(toolCallId, args) {
    this.setStatus('complete')

    this.emit('log', {
      type: 'complete',
      message: `✅ Project complete! ${args.file_count} files built. ${args.summary}`
    })

    this.emit('complete', {
      summary: args.summary,
      file_count: args.file_count,
      tech_stack: args.tech_stack,
      files: { ...this.files }
    })

    this.conversationHistory.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content: JSON.stringify({
        status: 'success',
        message: 'Project marked as complete. Great work, Morpheus.'
      })
    })

    this.isRunning = false
  }

  setStatus(status) {
    this.status = status
    this.emit('status_change', { status })
  }

  stop() {
    this.isRunning = false
    if (this.abortController) {
      this.abortController.abort()
    }
    this.setStatus('idle')
    this.emit('log', { type: 'error', message: 'Morpheus stopped by user.' })
  }

  getFiles() {
    return { ...this.files }
  }

  getStatus() {
    return this.status
  }
}
