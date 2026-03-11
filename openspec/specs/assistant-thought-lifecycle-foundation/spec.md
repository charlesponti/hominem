# assistant-thought-lifecycle-foundation Specification

## Purpose
Defines the canonical twin-surface thought contract shared by the mobile app and the Notes app for the thought-to-artifact assistant experience. Establishes thought lineage, text capture persistence, artifact classification semantics, the separation of thinking from durable memory, canonical logged-in home/dashboard behavior, cross-surface parity rules, and parity-focused verification requirements.

## Requirements

### Requirement: The product SHALL define a canonical twin-surface thought contract
The mobile app and Notes app SHALL share one canonical contract for the thought-to-artifact assistant experience before feature-specific implementation is considered complete.

#### Scenario: A team plans assistant feature work
- **WHEN** an assistant feature is proposed or implemented
- **THEN** the feature refers to the canonical twin-surface thought contract rather than redefining capture, session, classification, or canonization behavior independently

### Requirement: The product SHALL define canonical thought lineage
The assistant experience SHALL preserve the lineage between a captured thought, any session derived from it, and any canonical artifact created or updated from that flow.

#### Scenario: A user starts with a thought
- **WHEN** a user types or speaks a thought
- **THEN** the system can preserve that thought as the source input for later conversation, classification, and canonical persistence

#### Scenario: A session produces a canonical artifact
- **WHEN** a conversation about a thought results in a note, task, task list, or tracker
- **THEN** the resulting artifact retains a relationship to the originating thought or session

### Requirement: The product SHALL preserve text capture across core surfaces
The assistant experience SHALL keep text capture available across the logged-in home/dashboard, session surfaces, and artifact-adjacent surfaces because persistent text entry is foundational to the product.

#### Scenario: A user moves between core surfaces
- **WHEN** a user navigates between home, session, or artifact-adjacent surfaces
- **THEN** the user retains an available text input path to capture a new thought or continue an existing one

### Requirement: The product SHALL define artifact classification semantics
The assistant experience SHALL define how a thought or session result is classified into the approved canonical artifact types.

#### Scenario: A captured thought is ready for persistence
- **WHEN** the system or user decides to persist a thought
- **THEN** the persisted result is classified as exactly one of `note`, `task`, `task_list`, or `tracker` unless the canonical contract is updated

#### Scenario: A user starts a chat from an existing note
- **WHEN** a user opens a session from an existing canonical note
- **THEN** the system preserves the note as the session context and can produce updated or new canonical artifacts with explicit lineage

### Requirement: The product SHALL separate thinking from memory
The assistant experience SHALL use sessions as the primary interface for thinking and canonical artifacts as the primary interface for durable memory and action.

#### Scenario: A user thinks through an idea
- **WHEN** a user is still clarifying or exploring a thought
- **THEN** the product keeps the user in a session-oriented interface rather than forcing immediate structured persistence

#### Scenario: A user is ready to keep something
- **WHEN** a thought or session result is ready to become durable
- **THEN** the product persists it as a canonical artifact with explicit classification and lineage

### Requirement: The product SHALL define a canonical logged-in home/dashboard
The assistant experience SHALL define a logged-in home/dashboard that routes users into capture, sessions, review, and canonical artifacts without duplicating the primary session interface.

#### Scenario: A signed-in user lands in the product
- **WHEN** a signed-in user opens the logged-in home/dashboard
- **THEN** the product foregrounds capture, resumable sessions, important artifacts, and pending review items

#### Scenario: The product offers a launch surface for signed-in users
- **WHEN** the mobile product offers launch behavior that was previously handled by `start`
- **THEN** that behavior is absorbed into the canonical logged-in home/dashboard rather than preserved as a separate long-term core surface

### Requirement: The product SHALL define parity rules for the assistant experience
The assistant experience SHALL define which cross-surface behaviors must match, which may differ by platform, and which differences require explicit approval.

#### Scenario: A surface needs a platform-specific behavior
- **WHEN** a platform-specific implementation difference is proposed
- **THEN** the difference is evaluated against the parity rules before the feature ships

### Requirement: The product SHALL define parity-focused verification requirements
The assistant experience SHALL define the contract and workflow tests required for future mirrored feature delivery.

#### Scenario: A parity-critical workflow changes
- **WHEN** a later change modifies capture, session behavior, classification, persistence, or recovery behavior
- **THEN** parity-focused verification requirements exist for both surfaces before the change is considered complete
