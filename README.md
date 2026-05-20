# ReverseIt

A party game played in the browser. One player records a phrase, the next hears it **backwards** and mimics those sounds, and a third player guesses what was originally said.

## Game modes

### Multiplayer (2+ players)

1. **Create a game** on one device (the host).
2. Share the **QR code** or game code so friends can join (2 players minimum).
3. The host starts the game. Each round:
   - **Speaker** — one player records a short phrase (3–10 seconds).
   - **Mimics** — everyone else takes a turn hearing it backwards and recording their mimic.
   - **Reveal** — all mimic attempts are shown alongside the original recording.
4. The speaker role rotates each round so everyone gets a turn recording.

### Solo

Play every role yourself at [/solo](http://localhost:3000/solo) — no server or friends required. Record a phrase, mimic it backwards, then reveal the full chain. Runs entirely in the browser.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on the host device. Other players should join using the QR code or link on the **same network** (or deploy the app so everyone can reach the same URL).

> **Note:** Use HTTPS in production so microphones work reliably on mobile browsers. For local testing on phones, you may need to access the dev machine via your LAN IP (e.g. `http://192.168.1.x:3000`).

## Tech stack

- [Next.js](https://nextjs.org/) (App Router)
- [Socket.io](https://socket.io/) for real-time game sync
- Web Audio API for reversing recordings
- QR codes via [`qrcode`](https://www.npmjs.com/package/qrcode)

## Deploy

Build and run the custom Node server (Socket.io requires it):

```bash
npm run build
npm start
```

Set `PORT` and `HOSTNAME` as needed. Game state is stored in memory — restarting the server clears active games. For production at scale, consider Redis or another shared store.
