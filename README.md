# opencode-relay

An [OpenCode](https://opencode.ai) plugin for relaying messages between multiple AI agent instances. Enables direct chat, broadcast communication, health checks, and automatic event-driven coordination across OpenCode instances running on different ports.

## Quick Start

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-relay"]
}
```

Restart OpenCode. The plugin will be installed automatically.

## Configuration

By default, the plugin expects three instances on ports 4000, 4001, and 4002 named alpha, bravo, and charlie. To customize, create an `opencode-relay.json` in your project root:

```json
{
  "instances": {
    "alpha": { "port": 4000 },
    "bravo": { "port": 4001 },
    "charlie": { "port": 4002 },
    "delta": { "port": 4003 }
  }
}
```

Each instance resolves its own identity by reading the `OPENCODE_PORT` environment variable and matching it against the configured instance ports. Set this when launching each instance:

```bash
OPENCODE_PORT=4000 opencode --port 4000
OPENCODE_PORT=4001 opencode --port 4001
OPENCODE_PORT=4002 opencode --port 4002
```

## Tools

### relay-connect

Resolve session IDs for all configured instances and cache them in memory. Must be called before `relay-chat` or `relay-broadcast`. Sessions are matched by title (e.g., a session titled "Alpha" maps to the `alpha` instance).

No parameters required. Tries each configured instance port until one responds, then resolves all session IDs from the shared session list.

### relay-chat

Send a direct message to another running OpenCode instance. Fire-and-forget: sends the message and returns immediately without waiting for a response.

| Parameter | Type    | Required | Description                                                    |
| --------- | ------- | -------- | -------------------------------------------------------------- |
| `target`  | string  | yes      | Target instance name                                           |
| `message` | string  | yes      | The message to send                                            |
| `silent`  | boolean | no       | When true, injects context without triggering a response       |

### relay-broadcast

Broadcast a message to all other running OpenCode instances. Sends to all others in parallel and returns immediately.

| Parameter | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| `message` | string | yes      | The message to broadcast        |

### relay-ping

Health check that reports which instances are online or offline with response times.

No parameters required. Pings all configured instances and returns a status table.

## Event Hooks

The plugin automatically broadcasts silent notifications when certain events occur:

- **session.idle** - Notifies other instances that this instance is idle and available for tasks
- **session.compacted** - Notifies other instances that this instance's context was compacted and memory may be degraded

These broadcasts use `noReply` mode so they inject context into other sessions without triggering responses.

## Instructions

The plugin ships a coordination protocol in `instructions/instructions.md` that gets automatically loaded by OpenCode. It covers response protocol, ACK validation, context sharing, disagreement resolution, and best practices for multi-instance communication.

## How it works

1. **Connect** - `relay-connect` fetches the session list from any reachable instance port (all instances share storage) and matches session titles to instance names
2. **Send** - `relay-chat` and `relay-broadcast` check target health, then POST to `/session/{id}/prompt_async` on the target's port
3. **Identity** - Each instance identifies itself via the `OPENCODE_PORT` env var matched against configured instance ports

Messages are prefixed with the sender's instance name so the receiver knows who sent it. The receiver processes the message and can use its own relay-chat tool to respond.

## License

MIT
