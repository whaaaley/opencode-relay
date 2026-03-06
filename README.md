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

Each instance resolves its own identity by matching the OpenCode server port against the configured instance ports.

## Tools

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

The plugin uses the OpenCode SDK to communicate between instances over HTTP. When sending a message, it:

1. Checks the target instance is healthy via the health endpoint
2. Finds the most recent active session on the target instance
3. Sends the message as a prompt to that session

Messages are prefixed with the sender's instance name so the receiver knows who sent it. The receiver processes the message and can use its own relay-chat tool to respond.

## License

MIT
