# Model use
| Date | Step | Model | Effort | Tokens | Time | Result |
|---|---|---|---|---|---|---|
| 2026-10-25 | Write the proposal (start-change) | opus | high | 114566 | 548 s | done |
| 2026-10-25 | Revise the proposal: no backup storage (start-change) | opus | high | 53236 | 288 s | done |
| 2026-10-25 | Rescope the proposal: proven locally, server moved out (start-change) | opus | high | 41572 | 292 s | done |
| 2026-10-26 | Build (implement) | opus | high | 168162 | 866 s | blocked: no Docker, age or shellcheck on this machine, 13/34 tasks proven |
| 2026-10-26 | Build (implement), continued with Docker and age; paused once by the usage limit | opus | high | 192736 (last resume) | 197 s (last resume) | blocked: question on pgboss.instance row count, 32/34 tasks |
| 2026-10-26 | Verify (implement) | opus | high | 100544 | 121 s | done: 1 blocking finding (container tests not run in its shell), resolved by a main-session run |
