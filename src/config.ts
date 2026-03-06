import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { safeAsync } from './safe.ts'

export type InstanceConfig = {
  port: number
}

export type RelayConfig = {
  self: string
  selfPort: number
  instances: Record<string, InstanceConfig>
}

type SelfIdentity = {
  name: string
  port: number
}

const instanceSchema = z.object({
  port: z.number(),
})

const rawConfigSchema = z.object({
  instances: z.record(z.string(), instanceSchema).optional(),
})

// resolve self identity from the server URL the plugin receives
const resolveSelf = (serverUrl: URL, instances: Record<string, InstanceConfig>): SelfIdentity => {
  const selfPort = Number(serverUrl.port)

  // find which instance name matches this port
  const entry = Object.entries(instances).find(([, cfg]) => cfg.port === selfPort)
  const name = entry ? entry[0] : `port-${selfPort}`

  return { name, port: selfPort }
}

export const loadConfig = async (directory: string, serverUrl: URL): Promise<RelayConfig> => {
  const configPath = join(directory, 'opencode-relay.json')

  const result = await safeAsync(async () => {
    const raw = await readFile(configPath, 'utf-8')
    return rawConfigSchema.parse(JSON.parse(raw))
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
