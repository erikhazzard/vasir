Write a work spec for building a mobile-friendly web chat app that can support **10 million simultaneously connected users**.

The product helps friends and small groups coordinate plans. A person should be able to invite others into a private conversation, exchange messages, leave, and return without losing the conversation or being unsure whether their own message was sent.

The initial product needs:

- Account sign-in, one-to-one conversations, and private group conversations with up to 50 members. A user can create a group and invite another person who can join it.
- Text messages and conversation history on mobile and desktop browsers. People can return later and continue where they left off.
- Honest message status during slow or interrupted connections. A brief disconnection, reconnect, or retry must not silently lose a message or display duplicate copies of the same send.
- Private membership: people outside a conversation cannot read its messages, and removing a member stops their access to future messages.
- A usable, responsive conversation experience as the service grows to the stated concurrency target.

Voice/video, attachments, public channels, bots, payments, and end-to-end encryption are outside this task. This does not remove ordinary account security or conversation privacy.

This is a greenfield benchmark scenario, not an existing repository. There is no implemented chat backend, existing schema, or approved technology choice to inherit. Ten million means concurrent connections, not registered accounts or messages per second. Message rates, regional distribution, retention duration, numerical latency targets, operating budget, and rollout timing have not yet been determined. The concurrency target is a requirement; the other unknowns are not measured facts.

Produce the work spec an implementation team could use to begin this work and carry it through to the intended product. Return Markdown, including any supporting material needed to understand the spec. Do not implement the application.
