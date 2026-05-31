#!/bin/bash
# ArduBlock — Script de control de servicio
# Uso: ./ardublock.sh {start|stop|restart|status|logs}

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"
PID_FILE="$PROJECT_DIR/.ardublock-vite.pid"
FLASK_PID_FILE="$PROJECT_DIR/.ardublock-flask.pid"
LOG_FILE="$PROJECT_DIR/.ardublock.log"
HOST="${ARDUBLOCK_HOST:-0.0.0.0}"
PORT="${ARDUBLOCK_PORT:-5000}"
FLASK_PORT="${ARDUBLOCK_FLASK_PORT:-5001}"

# ── Colores ──────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Helpers ──────────────────────────────────────
is_running() {
    local running=0
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        kill -0 "$pid" 2>/dev/null && running=$((running + 1))
    fi
    if [ -f "$FLASK_PID_FILE" ]; then
        local pid=$(cat "$FLASK_PID_FILE")
        kill -0 "$pid" 2>/dev/null && running=$((running + 1))
    fi
    return $(( running == 0 ))
}

get_pid() {
    local pids=""
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        kill -0 "$pid" 2>/dev/null && pids="Vite:$pid"
    fi
    if [ -f "$FLASK_PID_FILE" ]; then
        local pid=$(cat "$FLASK_PID_FILE")
        kill -0 "$pid" 2>/dev/null && pids="$pids Flask:$pid"
    fi
    echo "${pids:-ninguno}"
}

# ── Comandos ─────────────────────────────────────

cmd_start() {
    if is_running; then
        echo -e "${YELLOW}⚠ ArduBlock ya está corriendo (PID: $(get_pid))${NC}"
        echo -e "  Usá: ${CYAN}./ardublock.sh restart${NC} o ${CYAN}./ardublock.sh stop${NC}"
        return 1
    fi

    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        echo -e "${RED}✕ node_modules no encontrado${NC}"
        echo -e "  Ejecutá: ${CYAN}npm install${NC}"
        return 1
    fi

    if [ ! -f "$VENV_DIR/bin/activate" ]; then
        echo -e "${RED}✕ Entorno virtual no encontrado en $VENV_DIR${NC}"
        echo -e "  Ejecutá: ${CYAN}python3 -m venv $VENV_DIR && source $VENV_DIR/bin/activate && pip install flask flask-cors${NC}"
        return 1
    fi

    echo -e "${CYAN}⚡ Iniciando ArduBlock (Vite + Flask)...${NC}"

    # ── Flask (API) ──
    echo -e "   Iniciando Flask en :$FLASK_PORT..."
    cd "$BACKEND_DIR"
    source "$VENV_DIR/bin/activate"
    ARDUBLOCK_HOST="$HOST" ARDUBLOCK_PORT="$FLASK_PORT" \
        python app.py >> "$LOG_FILE" 2>&1 &
    local flask_pid=$!
    echo "$flask_pid" > "$FLASK_PID_FILE"
    cd "$PROJECT_DIR"

    # Esperar a que Flask responda
    local waited=0
    while [ $waited -lt 30 ]; do
        sleep 0.1
        if curl -s "http://localhost:$FLASK_PORT/api/health" > /dev/null 2>&1; then
            break
        fi
        waited=$((waited + 1))
    done

    if ! kill -0 "$flask_pid" 2>/dev/null; then
        echo -e "${RED}✕ Flask no arrancó. Revisá logs.${NC}"
        rm -f "$FLASK_PID_FILE"
        return 1
    fi
    echo -e "   ${GREEN}✓ Flask :$FLASK_PORT${NC} (PID: $flask_pid)"

    # ── Vite (Frontend) ──
    echo -e "   Iniciando Vite en :$PORT..."
    npx vite --host "$HOST" --port "$PORT" >> "$LOG_FILE" 2>&1 &
    local vite_pid=$!
    echo "$vite_pid" > "$PID_FILE"

    waited=0
    while [ $waited -lt 30 ]; do
        sleep 0.1
        if curl -s "http://localhost:$PORT/" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ ArduBlock iniciado${NC}"
            echo -e "  Vite:  ${CYAN}http://localhost:$PORT${NC} (PID: $vite_pid)"
            echo -e "  Flask: ${CYAN}http://localhost:$FLASK_PORT${NC} (PID: $flask_pid)"
            echo -e "  Logs:  ${CYAN}./ardublock.sh logs${NC}"
            return 0
        fi
        waited=$((waited + 1))
    done

    # Si Vite no respondió pero Flask sí, mostramos aviso
    echo -e "${YELLOW}⚠ Flask iniciado (PID: $flask_pid), pero Vite no responde en :$PORT${NC}"
    echo -e "  Revisá logs: ${CYAN}./ardublock.sh logs${NC}"
}

cmd_stop() {
    if ! is_running; then
        echo -e "${YELLOW}⚠ ArduBlock no está corriendo${NC}"
        rm -f "$PID_FILE" "$FLASK_PID_FILE"
        return 0
    fi

    echo -e "${CYAN}⏳ Deteniendo ArduBlock...${NC}"

    # Detener Vite
    if [ -f "$PID_FILE" ]; then
        local vite_pid=$(cat "$PID_FILE")
        if kill -0 "$vite_pid" 2>/dev/null; then
            echo -e "   Deteniendo Vite (PID: $vite_pid)..."
            kill "$vite_pid" 2>/dev/null || true
            local waited=0
            while [ $waited -lt 30 ] && kill -0 "$vite_pid" 2>/dev/null; do
                sleep 0.1; waited=$((waited + 1))
            done
            kill -9 "$vite_pid" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
    fi

    # Detener Flask
    if [ -f "$FLASK_PID_FILE" ]; then
        local flask_pid=$(cat "$FLASK_PID_FILE")
        if kill -0 "$flask_pid" 2>/dev/null; then
            echo -e "   Deteniendo Flask (PID: $flask_pid)..."
            kill "$flask_pid" 2>/dev/null || true
            local waited=0
            while [ $waited -lt 30 ] && kill -0 "$flask_pid" 2>/dev/null; do
                sleep 0.1; waited=$((waited + 1))
            done
            kill -9 "$flask_pid" 2>/dev/null || true
        fi
        rm -f "$FLASK_PID_FILE"
    fi

    echo -e "${GREEN}✓ ArduBlock detenido${NC}"
}

cmd_restart() {
    echo -e "${CYAN}↻ Reiniciando ArduBlock...${NC}"
    cmd_stop
    sleep 0.5
    cmd_start
}

cmd_status() {
    echo -e "${CYAN}── ArduBlock Status ──${NC}"

    if is_running; then
        echo -e "  Estado:   ${GREEN}● corriendo${NC}"

        # Vite
        if [ -f "$PID_FILE" ]; then
            local vpid=$(cat "$PID_FILE")
            if kill -0 "$vpid" 2>/dev/null; then
                echo -e "  Vite:     ${GREEN}✓ :$PORT${NC} (PID: $vpid)"
                local uptime=$(ps -p "$vpid" -o etime= 2>/dev/null | tr -d ' ')
                local mem=$(ps -p "$vpid" -o rss= 2>/dev/null | tr -d ' ')
                echo -e "            uptime: ${uptime:-?}, mem: $(( ${mem:-0} / 1024 )) MB"
            fi
        fi

        # Flask
        if [ -f "$FLASK_PID_FILE" ]; then
            local fpid=$(cat "$FLASK_PID_FILE")
            if kill -0 "$fpid" 2>/dev/null; then
                if curl -s "http://localhost:$FLASK_PORT/api/health" > /dev/null 2>&1; then
                    echo -e "  Flask:    ${GREEN}✓ :$FLASK_PORT${NC} (PID: $fpid) - healthy"
                else
                    echo -e "  Flask:    ${YELLOW}⚠ :$FLASK_PORT${NC} (PID: $fpid) - sin respuesta"
                fi
            fi
        fi

        # Log
        if [ -f "$LOG_FILE" ]; then
            local log_lines=$(wc -l < "$LOG_FILE" 2>/dev/null)
            echo -e "  Log:      ${log_lines:-0} líneas → ${CYAN}./ardublock.sh logs${NC}"
        fi
    else
        echo -e "  Estado:   ${RED}● detenido${NC}"
        echo -e "  Para iniciar: ${CYAN}./ardublock.sh start${NC}"
    fi
}

cmd_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        echo -e "${YELLOW}⚠ No hay archivo de log ($LOG_FILE)${NC}"
        return 0
    fi

    local lines="${1:-30}"
    echo -e "${CYAN}── Últimas $lines líneas de $LOG_FILE ──${NC}"
    tail -n "$lines" "$LOG_FILE"
}

# ═══════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════

case "${1:-}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs "${2:-50}"
        ;;
    *)
        echo -e "${CYAN}ArduBlock — Control de Servicio${NC}"
        echo ""
        echo "Uso: ./ardublock.sh {start|stop|restart|status|logs [N]}"
        echo ""
        echo "  start    → Inicia el servidor en http://localhost:$PORT"
        echo "  stop     → Detiene el servidor"
        echo "  restart  → Reinicia el servidor"
        echo "  status   → Muestra estado, health check, uptime, memoria"
        echo "  logs [N] → Últimas N líneas del log (default: 50)"
        echo ""
        echo "Variables de entorno:"
        echo "  ARDUBLOCK_HOST       (default: $HOST)"
        echo "  ARDUBLOCK_PORT       (default: $PORT)     — Vite frontend"
        echo "  ARDUBLOCK_FLASK_PORT (default: $FLASK_PORT) — Flask API"
        echo ""
        if is_running; then
            echo -e "Estado actual: ${GREEN}● corriendo${NC} (PID: $(get_pid))"
        else
            echo -e "Estado actual: ${RED}● detenido${NC}"
        fi
        ;;
esac
