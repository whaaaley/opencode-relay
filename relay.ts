import type { Plugin } from '@opencode-ai/plugin'
import { loadConfig } from './src/config.ts'
import { broadcastSilent, createBroadcastTool, createChatTool, createPingTool } from './src/tools.ts'

const plugin: Plugin = async ({ directory, serverUrl }) => {
  const config = await loadConfig(directory, serverUrl)

  return {
    tool: {
      'relay-chat': createChatTool(config),
      'relay-broadcast': createBroadcastTool(config),
      'relay-ping': createPingTool(config),
    },
    async event({ event }) {
      if (event.type === 'session.idle') {
        await broadcastSilent(config, `${config.self} is now idle and available for tasks.`)
        return
      }

      if (event.type === 'session.compacted') {
        await broadcastSilent(
          config,
          `${config.self} context was compacted. Memory may be degraded - send a re-brief if needed.`,
        )
        return
      }
    },
  }
}

export default plugin
