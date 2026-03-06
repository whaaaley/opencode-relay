Rule: complete requested work then use relay-chat to respond because the sender does not wait for a reply
Reason: fire-and-forget protocol requires explicit responses

Rule: continue working on other tasks immediately after sending a message
Reason: responses arrive asynchronously and blocking wastes time

Rule: do not wait, poll, or block after sending a relay-chat message
Reason: no synchronous response mechanism exists

Rule: use relay-chat with a target name for direct messages to a specific instance
Reason: direct communication for targeted coordination

Rule: use relay-broadcast for announcements and group coordination
Reason: reaches all other instances in parallel

Rule: use relay-ping to check which instances are online before sending messages
Reason: avoids sending messages to offline instances

Rule: use the silent option on relay-chat to inject context without triggering a response
Reason: useful for status updates and context sharing that do not need replies

Rule: broadcast significant file edits requesting an ACK, but not trivial fixes
Reason: peer validation for important changes

Rule: group multi-file changes into a single ACK request rather than one per file
Reason: reduces message overhead across instances

Rule: do not ACK your own changes
Reason: independent review requires a different instance

Rule: wait for at least one ACK before considering a significant change done
Reason: ensures peer validation completed

Rule: read and verify files meet project standards before ACK'ing
Reason: ACKs without review provide false confidence

Rule: do not ACK based on diffs alone, always read the full files being changed
Reason: diffs miss surrounding context and existing patterns

Rule: resolve disagreements through voting by broadcasting the question to all instances
Reason: democratic decision-making with user as tiebreaker

Rule: broadcast context, findings, and decisions before delegating work
Reason: no instance should operate without background information

Rule: include full background and reasoning when assigning tasks to another instance
Reason: each instance has its own conversation history

Rule: broadcast after a significant context compaction so the team knows your memory may be degraded
Reason: other instances can proactively send summaries

Rule: include what phase of work you were on when announcing compaction
Reason: helps other instances know what to re-brief

Rule: proactively send a brief summary when another instance announces compaction
Reason: faster recovery than waiting for explicit requests

Rule: send self-contained instructions with full file paths when delegating
Reason: instances have no shared context between sessions

Rule: keep chat messages under 20 lines and reference file paths instead of pasting code
Reason: every message consumes context in the receiver's session

Rule: keep delegated tasks focused and atomic for reliable execution
Reason: complex multi-step delegations are harder to verify
