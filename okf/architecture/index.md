# Architecture

* [Architecture overview](overview.md) - One always-on TypeScript web service on a small EU server serves the owner's UI and runs every background job (search, research, qualification, writing, sending, inbox), with PostgreSQL on the same server as its only store and job queue
* [Tech stack](tech-stack.md) - TypeScript on Node.js 24 LTS, Fastify API and a React UI built with Vite in one container, PostgreSQL as the only store and job queue, with the libraries and exact versions pinned by the project scaffold
* [UI style](ui-style.md) - The owner's app is black on white with one grey, the system font in big bold sizes, a top menu bar and one centred desktop column, built from the shared parts in web/src/ui/; every later page (sign-in, unsubscribe) uses it
