import type { Plugin } from '@opencode-ai/plugin'
import { loadConfig } from './src/config.ts'
import { broadcastEvent, createBroadcastTool, createChatTool, createConnectTool, createPingTool } from './src/tools.ts'

const plugin: Plugin = async ({ directory, serverUrl }) => {
  const config = await loadConfig(directory, serverUrl)

  return {
    tool: {
      'relay-connect': createConnectTool(config),
      'relay-chat': createChatTool(config),
      'relay-broadcast': createBroadcastTool(config),
      'relay-ping': createPingTool(config),
    },
    async event({ event }) {
      if (event.type === 'session.idle') {
        await broadcastEvent(config, `${config.self} is now idle and available for tasks.`)
        return
      }

      if (event.type === 'session.compacted') {
        await broadcastEvent(
          config,
          `${config.self} context was compacted. Memory may be degraded - send a re-brief if needed.`,
        )
        return
      }
    },
  }
}

export default plugin
