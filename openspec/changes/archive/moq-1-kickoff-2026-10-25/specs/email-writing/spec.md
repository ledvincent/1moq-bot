# Spec Delta

## Purpose

Writes each approved lead's outreach messages from the base template for its client type and what is known about it, in English or French, so every email speaks to that client's likely needs.

## ADDED Requirements

### Requirement: Base templates
The system SHALL keep a base template for each client type, each step of the outreach sequence (intro, follow-up 1, follow-up 2, last email, Instagram DM) and each language (English, French). The owner SHALL be able to read and edit them.
Knowledge: `okf/domain/base-templates.md`

#### Scenario: Owner edits a template
- **WHEN** the owner saves a change to the French intro template for cafés
- **THEN** emails written after that use the new version, and emails already sent are unchanged

#### Scenario: Template missing
- **WHEN** no template exists for a lead's client type, step and language
- **THEN** no message is written for that step and the lead is flagged for the owner

### Requirement: Personalised by AI
The system SHALL write each message from the lead's base template and its recorded facts: it names the business, proposes products that suit its client type, and adds one personal line about the business.
Knowledge: `okf/domain/base-templates.md`, `okf/integrations/anthropic-claude.md`

#### Scenario: Intro for a café
- **WHEN** the intro email is written for an approved café
- **THEN** it follows the café intro template and contains one line about that café drawn from its recorded facts

### Requirement: Facts only
The system SHALL base every statement about the lead on its recorded facts. When no recorded fact can carry the personal line, the system SHALL write no email for that lead and SHALL flag it for the owner.
Knowledge: `okf/decisions/MOQ-1-claude-for-ai.md`

#### Scenario: No fact for a personal line
- **WHEN** an approved lead has no recorded fact that can carry a personal line
- **THEN** no email is written for it and the lead is flagged for the owner

### Requirement: Complete messages only
The system SHALL NOT produce a message that still contains a template placeholder or lacks its personal line.
Knowledge: `okf/domain/base-templates.md`

#### Scenario: Placeholder left
- **WHEN** a written email still contains a placeholder such as "[First name]"
- **THEN** the email is not kept for sending and the lead is flagged for the owner

### Requirement: Language of the messages
The system SHALL write each message in the lead's language: French for French-speaking leads, English for the others.
Knowledge: `okf/domain/markets.md`

#### Scenario: French lead
- **WHEN** an email is written for a lead whose language is French
- **THEN** the email is in French and starts from a French template

#### Scenario: English lead
- **WHEN** an email is written for a lead whose language is English
- **THEN** the email is in English and starts from an English template
