import { tool } from '@opencode-ai/plugin'
import type { ChatConfig } from './config.ts'
import { getRemoteClient } from './client.ts'
import { safeAsync } from './safe.ts'

type SendResult = {
  target: string
  success: boolean
  error?: string
}

type SessionListResponse = {
  data?: Array<{ id: string }>
}

// find the most recent active session on a remote instance
const findActiveSession = async (port: number): Promise<string | null> => {
  const client = getRemoteClient(port)

  const result = await safeAsync(() => client.session.list({ limit: 10 }))
  if (result.error) {
    return null
  }

  const response = result.data as SessionListResponse
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

const sendMessage = async (config: ChatConfig, targetName: string, port: number, message: string): Promise<SendResult> => {
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

export const createChatTool = (config: ChatConfig) => {
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
    },
    async execute(args) {
      const target = config.instances[args.target]
      if (!target) {
        return `Unknown instance "${args.target}". Available: ${available.join(', ')}`
      }

      if (args.target === config.self) {
        return `Cannot chat with yourself (${config.self})`
      }

      const result = await sendMessage(config, args.target, target.port, args.message)

      if (!result.success) {
        return `Failed to send to ${args.target}: ${result.error}`
      }

      return `Message sent to ${args.target}. They will chat back when done.`
    },
  })
}

export const createBroadcastTool = (config: ChatConfig) => {
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
        others.map(([name, cfg]) => sendMessage(config, name, cfg.port, args.message)),
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
