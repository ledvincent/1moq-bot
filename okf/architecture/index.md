# Architecture

* [Architecture overview](overview.md) - One always-on TypeScript web service on a small EU server serves the owner's UI and runs every background job (search, research, qualification, writing, sending, inbox), with PostgreSQL on the same server as its only store and job queue
* [Tech stack](tech-stack.md) - TypeScript on Node.js 24 LTS, Fastify API and a React UI built with Vite in one container, PostgreSQL as the only store and job queue, with the libraries and exact versions pinned by the project scaffold
