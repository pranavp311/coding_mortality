# Continuity Protocol

An interactive performance piece exploring algorithmic obsolescence in the workplace. Audience members join as employees of **Mortality Coders Consulting**, complete a mandatory "performance evaluation" run by the fictional vendor **Continuum Systems**, and discover — in real time, on their own phones — whether they've been "graduated" (replaced by a digital twin).

## How It Works

- A **presenter screen** displays a live population visualisation (HTML Canvas) and controls the flow of the performance
- **Audience members** join via QR code on their phones and complete PM-style tasks across three evaluation epochs
- At the end, **40% of participants are randomly "graduated"** — their phones display a choreographed death sequence including performance metrics, a digital twin activation, an offboarding notice, and a data valuation card
- A **live performer** (the Manager) reads scripted lines that frame and escalate the narrative

## Tech Stack

- **Server:** Node.js + Express + Socket.io
- **Presenter:** HTML Canvas + Web Audio API
- **Player Client:** Mobile-first responsive HTML/JS
- **Tunnel:** Cloudflare (via `start.sh`)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Cloudflare Tunnel (`cloudflared`)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) — for exposing the server to mobile devices on the same network

## Setup

```bash
cd continuity-protocol
npm install
./start.sh
```

The start script launches the server and opens a Cloudflare tunnel for mobile access.

## Controls (Presenter)

| Key | Action |
|-----|--------|
| `SPACE` | Advance to next phase |
| `G` | Trigger graduation |
| `R` | Reset game |
| `D` | Toggle debug overlay |
| `F` | Add demo players |
| `SHIFT+F` | Toggle fullscreen |

## Performance Structure

1. **Lobby** — Players join via QR code, enter their name
2. **Epoch 1: Baseline Evaluation** — Client Briefing task (2 scenarios)
3. **Epoch 2: Competency Analysis** — Stakeholder Alignment task (2 scenarios)
4. **Epoch 3: Final Evaluation** — Escalation Response task (2 scenarios)
5. **Graduation** — 40% of players are "graduated"; red atomisation particles on presenter, private death sequence on phones
6. **End** — Background music fades out; survivors are told their next evaluation is scheduled for Q3 2051

## Project Structure

```
continuity-protocol/
├── server/
│   ├── index.js          # Express + Socket.io server
│   ├── gameState.js      # Game state machine
│   ├── aiModel.js        # Fake AI scoring model
│   └── scoring.js        # Score utilities
├── presenter/
│   ├── index.html        # Presenter display
│   ├── app.js            # Canvas visualisation + audio
│   └── styles.css
├── player/
│   ├── index.html        # Mobile player interface
│   ├── app.js            # Player game logic + death sequence
│   └── styles.css
├── shared/
│   └── constants.js      # Phases, events, game definitions
├── assets/
│   ├── audio/            # Ambient music + Aria voice clips
│   ├── PERFORMANCE_SCRIPTS.md   # Live scripts for the Manager/CEO
│   └── FUTURES_ASSIGNMENT_ANSWERS.md
├── package.json
└── start.sh
```

## Live Scripts

See `assets/PERFORMANCE_SCRIPTS.md` for the Manager and CEO scripts to be read aloud during the performance.
