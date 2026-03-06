import { createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk/v2/client'

// cache remote clients to reuse connections
const clients = new Map<number, OpencodeClient>()

export const getRemoteClient = (port: number): OpencodeClient => {
  const existing = clients.get(port)
  if (existing) {
    return existing
  }

  const client = createOpencodeClient({
    baseUrl: `http://127.0.0.1:${port}`,
  })

  clients.set(port, client)
  return client
}
