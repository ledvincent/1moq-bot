# Integrations

* [Anthropic Claude](anthropic-claude.md) - The AI that profiles leads, picks their client type and writes their emails, Claude Haiku 5.5 through the Anthropic API with the Batch API, prompt caching and a monthly spend cap; business facts and first names are sent, email addresses never
* [Company mailbox](company-mailbox.md) - Sending every outreach email from the company mailbox and reading its inbox for replies, auto-replies and bounces; blocked by the separate mailbox and domain ticket, protocol chosen in row 16
* [Google Maps](google-maps.md) - Finding businesses by type and city, their place details and photos; the Google Places API is the recommended source (not decided, row 4), and Google's terms limit how long Places content other than place IDs is stored
* [Instagram](instagram.md) - Read-only Instagram facts for leads whose handle is known (followers, bio, website, recent posts) through the Graph API's business discovery (recommended, not decided, row 7); the company's own account is never signed in to or automated
* [Jira](jira.md) - How this project's Jira is set up - project key, where acceptance criteria live, issue types, the status for each stage, the dependency link type and the ticket labels; read by /dirox-kit:jira and the other commands
