# ArduBlock — Instalación en Servidor de Producción

Guía paso a paso para instalar ArduBlock en un VPS Linux (Debian/Ubuntu).

## Requisitos

- VPS con Debian 11+ o Ubuntu 20.04+
- Python 3.9+ y Node.js 20+
- Puertos: 5000 (aplicación) + el puerto SSH que uses

## Instalación

### 1. Dependencias del sistema

```bash
# Actualizar repositorios
apt-get update

# Python + build tools
apt-get install -y python3-pip python3-venv python3-dev build-essential

# Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Verificar
node --version   # ≥ 20
python3 --version  # ≥ 3.9
```

### 2. Clonar e instalar dependencias

```bash
cd /opt
git clone https://github.com/javdazdaz/ArduBlock.git ardublock
cd ardublock

# Frontend
npm install

# Backend Python
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Build de producción

```bash
cd /opt/ardublock
npm run build          # → frontend/dist/
```

### 4. Systemd service (usuario no-root)

Crear un usuario de sistema dedicado (no correr como root) y darle acceso al
puerto USB para flashear:

```bash
useradd --system --home-dir /var/lib/ardublock --shell /usr/sbin/nologin ardublock
usermod -aG dialout ardublock
chown -R ardublock:ardublock /opt/ardublock
```

Crear `/etc/systemd/system/ardublock.service`:

```ini
[Unit]
Description=ArduBlock — Programación Visual para Arduino
After=network.target

[Service]
Type=simple
User=ardublock
Group=ardublock
WorkingDirectory=/opt/ardublock/backend
Environment="HOME=/var/lib/ardublock"
Environment="ARDUBLOCK_HOST=0.0.0.0"
Environment="ARDUBLOCK_PORT=5000"
Environment="ARDUBLOCK_PRODUCTION=1"
Environment="PATH=/opt/ardublock/backend/.venv/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/opt/ardublock/backend/.venv/bin/python app.py
Restart=always
RestartSec=5
StandardOutput=append:/var/log/ardublock.log
StandardError=append:/var/log/ardublock.log

[Install]
WantedBy=multi-user.target
```

arduino-cli y su data (cores, librerías) quedan en `$HOME` (`/var/lib/ardublock/...`),
no en `/root`. git y build se corren como `ardublock` (`sudo -u ardublock ...`).

```bash
systemctl daemon-reload
systemctl enable --now ardublock

# Verificar
curl http://localhost:5000/api/health
# → {"app":"ArduBlock","status":"ok"}
```

### 5. Firewall

```bash
ufw allow 5000/tcp
```

### 6. Script de deploy (opcional)

```bash
cat > /opt/ardublock/deploy.sh << 'SCRIPT'
#!/bin/bash
set -e
cd /opt/ardublock
echo '→ Pulling latest...'
git pull origin main
echo '→ Installing dependencies...'
npm install --prefer-offline 2>&1 | tail -1
echo '→ Building frontend...'
npm run build 2>&1 | tail -1
echo '→ Installing Python deps...'
cd backend && source .venv/bin/activate
pip install -r requirements.txt -q 2>&1 | tail -1
echo '→ Restarting service...'
systemctl restart ardublock
sleep 2
curl -s http://localhost:5000/api/health
echo ''
echo '✓ Deploy complete'
SCRIPT
chmod +x /opt/ardublock/deploy.sh
```

## Actualizar desde git

```bash
/opt/ardublock/deploy.sh
```

O manualmente (git y build como `ardublock`, dueño del checkout):

```bash
cd /opt/ardublock
sudo -u ardublock git pull origin main
sudo -u ardublock npm install --prefer-offline
sudo -u ardublock npm run build
systemctl restart ardublock
```

## Comandos útiles

```bash
systemctl status ardublock          # estado
journalctl -u ardublock -f          # logs en vivo
tail -f /var/log/ardublock.log      # logs del archivo
```

## Acceso

```
http://<ip-del-servidor>:5000/
http://<ip-del-servidor>:5000/api/health
```

## Notas por distribución

| Distro       | Python   | Notas                                  |
|-------------|----------|----------------------------------------|
| Debian 11   | 3.9      | Sin problemas                          |
| Debian 12   | 3.11     | Requiere `setuptools` en requirements  |
| Debian 13   | 3.13     | Sin problemas                          |
| Ubuntu 22.04| 3.10     | Sin problemas                          |
| Ubuntu 24.04| 3.12     | Igual que Debian 13                    |
