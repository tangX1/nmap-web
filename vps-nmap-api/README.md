# vps-nmap-api

A small, self-contained Express API that wraps `nmap` on a Linux host. The
main nmap-web app calls this over HTTP instead of spawning nmap locally —
deploy this folder to your VPS, run it there, and point the main app at it.

It only exposes exactly what nmap-web's scan profiles need (`args` is
checked against a fixed flag allowlist), and every request requires an API
key — do not run it without one, and do not skip the firewall step below.

## 1. Get the code onto the VPS

From your own machine:

```bash
scp -r vps-nmap-api your-user@your-vps-ip:~/vps-nmap-api
```

(Or `git clone` the whole repo on the VPS and `cd` into `vps-nmap-api/` —
either works, only this folder needs to run there.)

## 2. Install Node.js and nmap on the VPS (if not already there)

```bash
# Node.js (NodeSource, adjust for your distro)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# nmap
sudo apt-get install -y nmap
```

## 3. Install dependencies

```bash
cd ~/vps-nmap-api
npm install
```

## 4. Let nmap run privileged scans without running the whole API as root

`-sS` (SYN scan) needs raw-socket access — `setcap` on the nmap binary is
enough for that:

```bash
sudo setcap cap_net_raw,cap_net_admin+eip $(which nmap)
```

`-O` (OS detection) is stricter: this nmap build requires actual root, not
just those capabilities. Rather than running the whole Node process as
root, `index.js` invokes nmap itself via `sudo -n nmap ...` — so the
service user needs passwordless sudo for this to work. If your user
already has general passwordless sudo (`sudo -n true` succeeds with no
prompt), nothing more to do; otherwise add a sudoers rule scoped to just
the nmap binary, e.g. via `sudo visudo -f /etc/sudoers.d/vps-nmap-api`:

```
your-user ALL=(root) NOPASSWD: /usr/bin/nmap
```

## 5. Generate an API key and set environment variables

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy that value — you'll need it on both the VPS and in the main app.

## 6. Run it as a persistent service (systemd)

Don't just run `node index.js` in an SSH session — it dies when you
disconnect. Create `/etc/systemd/system/vps-nmap-api.service`:

```ini
[Unit]
Description=vps-nmap-api
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/home/your-user/vps-nmap-api
Environment=API_KEY=paste-the-key-from-step-5-here
Environment=PORT=4000
ExecStart=/usr/bin/node index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vps-nmap-api
sudo systemctl status vps-nmap-api   # confirm it's running
```

## 7. Open the port in your VPS's firewall

Whatever your provider uses (ufw, iptables, a cloud security group) — open
the port you set above (4000 by default) for inbound TCP. If your provider
supports source-IP restrictions, restrict it to your own IP rather than
leaving it open to the whole internet.

```bash
sudo ufw allow 4000/tcp   # example, if using ufw
```

## 8. Test it

```bash
curl http://your-vps-ip:4000/health
# {"status":"ok"}

curl -X POST http://your-vps-ip:4000/scans \
  -H "Content-Type: application/json" \
  -H "x-api-key: paste-the-key-from-step-5-here" \
  -d '{"target":"scanme.nmap.org","args":["-T4","-F","-sV"]}'
# {"scanId":"..."}

curl http://your-vps-ip:4000/scans/<scanId> \
  -H "x-api-key: paste-the-key-from-step-5-here"
```

(`scanme.nmap.org` is nmap.org's own public test target — safe to scan
without needing separate authorization, useful for this exact kind of
smoke test.)

## 9. Point the main app at it

On the machine running nmap-web's `server/index.js`, set:

```
VPS_API_URL=http://your-vps-ip:4000
VPS_API_KEY=paste-the-key-from-step-5-here
```

(PowerShell: `$env:VPS_API_URL = "http://your-vps-ip:4000"` etc., before
`npm run dev:server` — or set them as permanent environment variables so
you don't have to repeat this every session.)

## Notes

- A VPS can only reach hosts *it* has network access to — public IPs and
  domains, not your home LAN's private `192.168.x.x` devices, unless you
  have a VPN/tunnel back to your home network.
- Scanning must be authorized wherever it lands — you're responsible for
  only pointing this at targets you're allowed to scan.
