import { tool } from '@opencode-ai/plugin'
import { getRemoteClient } from './client.ts'
import type { RelayConfig } from './config.ts'
import { safeAsync } from './safe.ts'

type SendResult = {
  target: string
  success: boolean
  error?: string
}

// find the most recent active session on a remote instance
const findActiveSession = async (port: number): Promise<string | null> => {
  const client = getRemoteClient(port)

  const result = await safeAsync(() => client.session.list({ limit: 10 }))
  if (result.error) {
    return null
  }

  const response = result.data
  if (!response.data) {
    return null
  }

  const sessions = response.data
  if (sessions.length === 0) {
    return null
  }

  // return the most recently updated session
  const first = sessions[0]
  if (!first) {
    return null
  }

  return first.id
}

const checkHealth = async (port: number): Promise<boolean> => {
  const client = getRemoteClient(port)
  const result = await safeAsync(() => client.global.health())
  return !result.error
}

type SendOptions = {
  config: RelayConfig
  targetName: string
  port: number
  message: string
  noReply?: boolean
}

const sendMessage = async (options: SendOptions): Promise<SendResult> => {
  const { config, targetName, port, message, noReply } = options
  const healthy = await checkHealth(port)
  if (!healthy) {
    return { target: targetName, success: false, error: `not running (port ${port})` }
  }

  const sessionID = await findActiveSession(port)
  if (!sessionID) {
    return { target: targetName, success: false, error: 'no active session found' }
  }

  const client = getRemoteClient(port)
  const result = await safeAsync(() => (
    client.session.promptAsync({
      sessionID,
      noReply,
      parts: [{
        type: 'text',
        text: `[Chat from ${config.self}]: ${message}`,
      }],
    })
  ))

  if (result.error) {
    return { target: targetName, success: false, error: result.error.message }
  }

  return { target: targetName, success: true }
}

export const createChatTool = (config: RelayConfig) => {
  const available = Object.keys(config.instances)
    .filter((name) => name !== config.self)

  return tool({
    description: [
      'Send a message to another running OpenCode instance.',
      'Fire-and-forget: sends the message and returns immediately without waiting for a response.',
      'The other instance will process the message and use its own chat tool to send a reply back.',
      `Available targets: ${available.join(', ')}.`,
    ].join(' '),
    args: {
      target: tool.schema.string().describe(`Target instance name: ${available.join(', ')}`),
      message: tool.schema.string().describe('The message to send'),
      silent: tool.schema.boolean().optional().describe(
        'When true, injects context without triggering a response from the target',
      ),
    },
    async execute(args) {
      const target = config.instances[args.target]
      if (!target) {
        return `Unknown instance "${args.target}". Available: ${available.join(', ')}`
      }

      if (args.target === config.self) {
        return `Cannot chat with yourself (${config.self})`
      }

      const result = await sendMessage({
        config,
        targetName: args.target,
        port: target.port,
        message: args.message,
        noReply: args.silent,
      })

      if (!result.success) {
        return `Failed to send to ${args.target}: ${result.error}`
      }

      if (args.silent) {
        return `Context injected into ${args.target} (silent, no reply expected).`
      }

      return `Message sent to ${args.target}. They will chat back when done.`
    },
  })
}

export const createPingTool = (config: RelayConfig) => {
  const allNames = Object.keys(config.instances)

  return tool({
    description: [
      'Health check that reports which instances are online or offline with response times.',
      `Available instances: ${allNames.join(', ')}.`,
    ].join(' '),
    args: {},
    async execute() {
      const entries = Object.entries(config.instances)

      const results = await Promise.all(
        entries.map(async ([name, cfg]) => {
          const start = Date.now()
          const healthy = await checkHealth(cfg.port)
          const elapsed = Date.now() - start

          return {
            name,
            port: cfg.port,
            status: healthy ? 'online' : 'offline',
            ms: healthy ? elapsed : null,
            self: name === config.self,
          }
        }),
      )

      const lines = results.map((r) => {
        const selfTag = r.self ? ' (self)' : ''
        const timing = r.ms !== null ? ` ${r.ms}ms` : ''
        return `${r.name}: ${r.status}${timing}${selfTag}`
      })

      const online = results.filter((r) => r.status === 'online').length
      lines.push(`${online}/${results.length} instances online`)

      return lines.join('\n')
    },
  })
}

// broadcast a silent message to all other instances (used by event hooks)
export const broadcastSilent = async (config: RelayConfig, message: string): Promise<void> => {
  const others = Object.entries(config.instances)
    .filter(([name]) => name !== config.self)

  await Promise.all(
    others.map(([name, cfg]) =>
      sendMessage({
        config,
        targetName: name,
        port: cfg.port,
        message,
        noReply: true,
      })
    ),
  )
}

export const createBroadcastTool = (config: RelayConfig) => {
  return tool({
    description: [
      'Broadcast a message to all other running OpenCode instances.',
      'Fire-and-forget: sends to all others in parallel and returns immediately.',
      'Each instance will process the message and chat back independently.',
    ].join(' '),
    args: {
      message: tool.schema.string().describe('The message to broadcast'),
    },
    async execute(args) {
      const others = Object.entries(config.instances)
        .filter(([name]) => name !== config.self)

      if (others.length === 0) {
        return 'No other instances configured.'
      }

      const results = await Promise.all(
        others.map(([name, cfg]) =>
          sendMessage({
            config,
            targetName: name,
            port: cfg.port,
            message: args.message,
          })
        ),
      )

      const sent = results.filter((r) => r.success).map((r) => r.target)
      const failed = results.filter((r) => !r.success).map((r) => `${r.target}: ${r.error}`)

      const lines = []
      if (sent.length) lines.push(`Sent to: ${sent.join(', ')}`)
      if (failed.length) lines.push(`Failed: ${failed.join('; ')}`)

      return lines.join('\n')
    },
  })
}
