#!/usr/bin/env bash
set -euo pipefail

SESSION="form-builder"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v tmux >/dev/null 2>&1; then
    echo "tmux is not installed. Install with: brew install tmux" >&2
    exit 1
fi

if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "tmux session '$SESSION' already exists. Attaching..."
    exec tmux attach -t "$SESSION"
fi

tmux new-session -d -s "$SESSION" -n app
tmux split-window -v -t "$SESSION:app"
tmux split-window -v -t "$SESSION:app"
tmux select-layout -t "$SESSION:app" even-vertical

tmux send-keys -t "$SESSION:app.0" "cd $ROOT && docker compose up" C-m
tmux send-keys -t "$SESSION:app.1" "cd $ROOT/server && mvn spring-boot:run -Dspring-boot.run.profiles=dev" C-m
tmux send-keys -t "$SESSION:app.2" "cd $ROOT/client && npm run dev" C-m

tmux select-pane -t "$SESSION:app.0"

exec tmux attach -t "$SESSION"
