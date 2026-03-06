import type { Plugin } from '@opencode-ai/plugin'
import { loadConfig } from './src/config.ts'
import { createBroadcastTool, createChatTool } from './src/tools.ts'

const plugin: Plugin = async ({ directory, serverUrl }) => {
  const config = await loadConfig(directory, serverUrl)

  return {
    tool: {
      chat: createChatTool(config),
      broadcast: createBroadcastTool(config),
    },
  }
}

export default plugin
