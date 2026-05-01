#!/usr/bin/env fish
# Quick start MineContext dev environment

set PROJECT_ROOT (dirname (realpath (status filename)))
set VENV_PYTHON "$PROJECT_ROOT/.venv/bin/python3"

# Check if backend already running
set health (curl -s http://127.0.0.1:1733/api/health 2>/dev/null)
set llm_ready (echo $health | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('data',{}).get('components',{}).get('llm') else 'false')" 2>/dev/null)

if test "$llm_ready" = "true"
    echo "==> Backend already running (LLM ready)."
    set BACKEND_PID ""
else
    echo "==> Starting backend on http://127.0.0.1:1733 ..."
    $VENV_PYTHON -m opencontext.cli start &
    set BACKEND_PID $last_pid

    echo "==> Waiting for backend to be fully initialized..."
    for i in (seq 1 20)
        sleep 1
        set health (curl -s http://127.0.0.1:1733/api/health 2>/dev/null)
        if test $status -eq 0
            set llm_ready (echo $health | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('data',{}).get('components',{}).get('llm') else 'false')" 2>/dev/null)
            if test "$llm_ready" = "true"
                echo "==> Backend ready (LLM initialized)."
                break
            end
        end
        echo "   Waiting... ($i/20)"
    end
end

echo "==> Starting frontend..."
cd "$PROJECT_ROOT/frontend"
PYTHON=$VENV_PYTHON npm_config_python=$VENV_PYTHON /Users/harvey/.bun/bin/bun run dev &
set FRONTEND_PID $last_pid

echo ""
if test -n "$BACKEND_PID"
    echo "  Backend  PID: $BACKEND_PID  -> http://127.0.0.1:1733"
end
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "  Ctrl+C to stop all."

if test -n "$BACKEND_PID"
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
else
    trap "kill $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
end
wait
