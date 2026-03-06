import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { safeAsync } from './safe.ts'

export type InstanceConfig = {
  port: number
}

export type ChatConfig = {
  self: string
  selfPort: number
  instances: Record<string, InstanceConfig>
}

type RawConfig = {
  instances?: Record<string, { port: number }>
}

type SelfIdentity = {
  name: string
  port: number
}

const parseRawConfig = (raw: unknown): RawConfig => {
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  const obj = raw as Record<string, unknown>
  if (!obj.instances || typeof obj.instances !== 'object') {
    return {}
  }

  return { instances: obj.instances as Record<string, { port: number }> }
}

// resolve self identity from the server URL the plugin receives
const resolveSelf = (serverUrl: URL, instances: Record<string, InstanceConfig>): SelfIdentity => {
  const selfPort = Number(serverUrl.port)

  // find which instance name matches this port
  const entry = Object.entries(instances).find(([, cfg]) => cfg.port === selfPort)
  const name = entry ? entry[0] : `port-${selfPort}`

  return { name, port: selfPort }
}

export const loadConfig = async (directory: string, serverUrl: URL): Promise<ChatConfig> => {
  const configPath = join(directory, 'opencode-chat.json')

  const result = await safeAsync(async () => {
    const raw = await readFile(configPath, 'utf-8')
    return parseRawConfig(JSON.parse(raw))
  })

  // default: alpha/bravo/charlie on 4000/4001/4002
  const defaultInstances: Record<string, InstanceConfig> = {
    alpha: { port: 4000 },
    bravo: { port: 4001 },
    charlie: { port: 4002 },
  }

  const instances = result.data?.instances ?? defaultInstances
  const self = resolveSelf(serverUrl, instances)

  return {
    self: self.name,
    selfPort: self.port,
    instances,
  }
}
