# CONTINUITY PROTOCOL: Implementation Brief

## Project Context

This is an interactive performance piece for a university seminar on "Coding Mortality"—the intersection of algorithms, digital infrastructure, and human mortality. The performance explores surveillance capitalism, human replaceability, and the reduction of identity to behavioral data.

**Concept:** Audience members join a fake corporate "Capability Assessment" via their phones. They play simple games while an "AI model" is supposedly trained on their behavior. Over three epochs, the AI improves until it outperforms them. Users who lose are "graduated"—terminated and replaced by their AI double. The experience critiques how surveillance capitalism extracts behavioral data and renders humans replaceable.

**Performance Duration:** 15-20 minutes
**Audience Size:** 15-30 people (university seminar)
**Tech Environment:** Presenter laptop connected to projector + audience smartphones

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTER DISPLAY                            │
│  Shows on projector - three modes:                              │
│  1. LOBBY: QR code + join instructions + connected count        │
│  2. POPULATION: Grid of dots representing each player           │
│  3. GAMES: Current game state + aggregate scores + AI status    │
└─────────────────────────────────────────────────────────────────┘
                              │
                         WebSocket
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER                                   │
│  - Node.js + Express + Socket.io                                │
│  - Room/session management                                       │
│  - Game state machine (phases, epochs, transitions)             │
│  - Score tracking per player                                     │
│  - "AI model" score generation (fake training simulation)       │
│  - Graduation logic (bottom 40% each epoch)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                         WebSocket
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      PLAYER PHONES                               │
│  - React SPA (mobile-optimized)                                 │
│  - Join flow: enter name → wait for game start                  │
│  - Game interfaces for each mini-game                           │
│  - Real-time score display + AI comparison                      │
│  - "Graduated" death screen when eliminated                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Visual Design System

### Brand: Continuum Systems

**Tagline:** "Your Legacy, Optimized"

### Color Palette

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0a;        /* Near-black */
  --bg-secondary: #141414;      /* Dark grey */
  --bg-tertiary: #1f1f1f;       /* Card backgrounds */
  --bg-elevated: #2a2a2a;       /* Hover states, modals */
  
  /* Text */
  --text-primary: #ffffff;       /* Primary text */
  --text-secondary: #a0a0a0;     /* Secondary/muted text */
  --text-tertiary: #666666;      /* Disabled/hint text */
  
  /* Accent - Corporate teal (false friendliness) */
  --accent-primary: #00d4aa;     /* Primary actions, highlights */
  --accent-secondary: #00a888;   /* Hover states */
  --accent-glow: rgba(0, 212, 170, 0.15);  /* Subtle glows */
  
  /* Status Colors */
  --status-success: #00d4aa;     /* Same as accent - "graduation" is "success" */
  --status-warning: #ffc107;     /* Approaching threshold */
  --status-danger: #ff4757;      /* Below AI score */
  
  /* AI Indicator */
  --ai-color: #7c5cff;           /* Purple - distinguishes AI from human */
  --ai-glow: rgba(124, 92, 255, 0.2);
  
  /* Graduation/Death */
  --graduated-color: #00d4aa;    /* Ironic - death is branded as success */
}
```

### Typography

```css
/* Primary Font: Inter (clean, corporate, modern) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* Monospace for scores/data: JetBrains Mono */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.score, .data, .metric {
  font-family: 'JetBrains Mono', monospace;
}
```

### Design Principles

1. **Minimalist and clinical** - Lots of negative space, sparse UI elements
2. **Data-forward** - Numbers, metrics, and scores are prominent
3. **False warmth** - The teal accent color suggests friendliness while the overall darkness contradicts it
4. **Subtle animations** - Smooth transitions, gentle pulses on interactive elements
5. **Corporate veneer** - Everything looks "designed" and "premium" despite being sinister

### Component Styling

```css
/* Cards */
.card {
  background: var(--bg-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 24px;
}

/* Buttons */
.button-primary {
  background: var(--accent-primary);
  color: var(--bg-primary);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.button-primary:hover {
  background: var(--accent-secondary);
  box-shadow: 0 0 20px var(--accent-glow);
}

/* Score displays */
.score-display {
  font-family: 'JetBrains Mono', monospace;
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.score-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
}
```

### Logo Concept

Simple wordmark: "CONTINUUM" in Inter 600 weight, letter-spacing: 0.2em, all caps. 
Optional: A subtle infinity symbol (∞) incorporated into the double-U, or a minimal geometric mark suggesting continuity/loop.

---

## Screen Specifications

### 1. PRESENTER: Lobby Screen

**Purpose:** Displayed while audience joins. Shows QR code and connection status.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                        CONTINUUM                            │
│                    Your Legacy, Optimized                   │
│                                                             │
│                    ┌───────────────┐                        │
│                    │               │                        │
│                    │   [QR CODE]   │                        │
│                    │               │                        │
│                    └───────────────┘                        │
│                                                             │
│                  Scan to begin assessment                   │
│                                                             │
│                    ● ● ● ● ● ○ ○ ○ ○ ○                      │
│                    12 / 25 connected                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- QR code links to the player join URL (e.g., `https://[ngrok-url]/play`)
- Connected count updates in real-time
- Small dots at bottom fill in as players join
- Operator can trigger "Start Assessment" when ready (hidden button or keyboard shortcut)

---

### 2. PRESENTER: Population Screen

**Purpose:** The central visualization during gameplay. Each player is a dot. Graduated players atomize.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  CONTINUUM                              EPOCH 2 | GAME 3    │
│  Population: 18 active                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         ●    ●         ●    ●    ●         ●               │
│    ●         ●    ●         ●         ●         ●          │
│         ●         ●    ●         ●    ●              ●     │
│    ●    ●              ●    ●         ●    ●    ●          │
│              ●    ●         ●    ●              ●          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  Assessment Progress: 67%    │
└─────────────────────────────────────────────────────────────┘
```

**Dot Behavior:**
- Each dot represents one active player
- Dots have subtle idle animation (gentle pulse or drift)
- Dots are arranged in a loose grid with slight randomization for organic feel
- On hover/highlight (when scores update): dot briefly glows

**Atomization Effect (on graduation):**
- Dot fragments into 8-12 smaller particles
- Particles drift upward with slight horizontal scatter
- Particles fade out over 1.5 seconds
- Optional: faint "upload" sound effect
- Population count decrements

**Implementation Notes:**
- Use HTML Canvas or a library like Framer Motion / GSAP for particle effects
- Each dot should have a unique ID mapped to a player
- Store dot positions so atomization originates from correct location

---

### 3. PRESENTER: Game Status Overlay

**Purpose:** Shown during active games, overlaid on or replacing population view.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  CONTINUUM                                       EPOCH 2    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      PATTERN PULSE                          │
│                                                             │
│                   Average Human Score                       │
│                        847 ms                               │
│                                                             │
│                      AI Model v2.1                          │
│                        912 ms                               │
│                   [LEARNING ████░░░░]                       │
│                                                             │
│              18 employees remaining in assessment           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Shows current game name
- Displays aggregate human performance vs AI performance
- AI "learning" progress bar fills during epoch transitions
- In Epoch 3, AI scores overtake human scores

---

### 4. PLAYER: Join Screen

**Purpose:** First screen on player's phone after scanning QR.

**Layout (mobile):**
```
┌─────────────────────────┐
│                         │
│       CONTINUUM         │
│                         │
│  Welcome to your        │
│  Capability Assessment  │
│                         │
│  ┌───────────────────┐  │
│  │ Enter your name   │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │   Begin Assessment│  │
│  └───────────────────┘  │
│                         │
│  By continuing, you     │
│  consent to behavioral  │
│  data collection under  │
│  the Continuity         │
│  Protocol §7.2          │
│                         │
└─────────────────────────┘
```

**Notes:**
- Name input field, simple submit button
- Ominous but corporate consent text at bottom (small, grey)
- After submission, show waiting screen: "Please wait. Assessment begins shortly."

---

### 5. PLAYER: Game Screens

Each game needs its own UI. All share common elements:

**Common Header:**
```
┌─────────────────────────┐
│ EPOCH 2    Score: 1,247 │
└─────────────────────────┘
```

**Common Footer:**
```
┌─────────────────────────┐
│ Your Model: Learning... │
│ ████████░░ 78%          │
└─────────────────────────┘
```

#### Game 1: Pattern Pulse

```
┌─────────────────────────┐
│ EPOCH 1    Score: --    │
├─────────────────────────┤
│                         │
│    Watch the sequence   │
│                         │
│    🔵  🟢  🔴  🟡       │
│    (flashing in order)  │
│                         │
│    Then tap to repeat   │
│                         │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐│
│  │ 🔵│ │ 🟢│ │ 🔴│ │ 🟡││
│  └───┘ └───┘ └───┘ └───┘│
│                         │
├─────────────────────────┤
│ Your Model: Calibrating │
└─────────────────────────┘
```

**Mechanics:**
- 4 colors, sequence of 4-6 items
- Flash sequence (500ms per item)
- User taps colors in order
- Score = accuracy (%) × speed bonus
- 3 rounds per epoch

#### Game 2: Reflex Gate

```
┌─────────────────────────┐
│ EPOCH 1    Score: 423   │
├─────────────────────────┤
│                         │
│      Tap the circles    │
│      Avoid the squares  │
│                         │
│                         │
│         ●               │
│                   ■     │
│    ●                    │
│              ●     ■    │
│                         │
│                         │
│     Time: 0:18          │
├─────────────────────────┤
│ Your Model: Learning... │
└─────────────────────────┘
```

**Mechanics:**
- Shapes appear at random positions
- Circles = tap (correct) / Squares = avoid (wrong if tapped)
- 30-second rounds
- Score = (correct taps × 10) - (wrong taps × 25) + speed bonus
- Track reaction time for each tap (this is the "training data")

#### Game 3: Sentiment Scan

```
┌─────────────────────────┐
│ EPOCH 2    Score: 1,247 │
├─────────────────────────┤
│                         │
│   Rate this expression  │
│                         │
│    ┌─────────────────┐  │
│    │                 │  │
│    │  [FACE IMAGE]   │  │
│    │                 │  │
│    └─────────────────┘  │
│                         │
│  ┌─────┐ ┌─────┐ ┌─────┐│
│  │ 😢 │ │ 😐 │ │ 😊 ││
│  │ Sad │ │Neutral│ │Happy││
│  └─────┘ └─────┘ └─────┘│
│                         │
├─────────────────────────┤
│ Your Model: 82% aligned │
└─────────────────────────┘
```

**Mechanics:**
- Show stock photos of faces or scenes
- User classifies as Happy/Neutral/Sad
- "Score" based on agreement with majority (fake consensus metric)
- 8-10 images per round
- This is literally labeling training data

#### Game 4: Complete the Thought

```
┌─────────────────────────┐
│ EPOCH 2    Score: 1,580 │
├─────────────────────────┤
│                         │
│   Complete this phrase: │
│                         │
│   "The future of work   │
│    depends on..."       │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │      Submit       │  │
│  └───────────────────┘  │
│                         │
│  Responses: 12/18       │
├─────────────────────────┤
│ Your Model: Absorbing...│
└─────────────────────────┘
```

**Mechanics:**
- Show sentence fragment
- User types 3-10 words to complete
- Score based on speed + word count (fake "coherence" metric)
- 3 prompts per round
- Prompts should be vaguely corporate/ominous:
  - "The most efficient employee is one who..."
  - "When humans and AI work together..."
  - "My greatest professional weakness is..."
  - "I would describe my value to the company as..."

---

### 6. PLAYER: Graduated Screen

**Purpose:** The death screen. Shown when a player is eliminated.

**Sequence (timed, not interactive):**

**Phase 1 (2 seconds):** Black screen, then text fades in:
```
┌─────────────────────────┐
│                         │
│                         │
│                         │
│                         │
│   Assessment Complete   │
│                         │
│                         │
│                         │
│                         │
└─────────────────────────┘
```

**Phase 2 (3 seconds):** Performance comparison
```
┌─────────────────────────┐
│                         │
│   YOUR PERFORMANCE      │
│   ══════════════════    │
│                         │
│   Reaction     823ms    │
│   Accuracy     87.2%    │
│   Consistency  71.4%    │
│   ──────────────────    │
│   YOUR MODEL            │
│   ══════════════════    │
│                         │
│   Reaction     801ms    │
│   Accuracy     94.1%    │
│   Consistency  99.2%    │
│                         │
└─────────────────────────┘
```

**Phase 3 (2 seconds):** The verdict
```
┌─────────────────────────┐
│                         │
│                         │
│                         │
│    ┌─────────────────┐  │
│    │   ✓ CERTIFIED   │  │
│    └─────────────────┘  │
│                         │
│    Your Continuity      │
│    Model is ready.      │
│                         │
│                         │
│                         │
└─────────────────────────┘
```

**Phase 4 (3 seconds):** The graduation
```
┌─────────────────────────┐
│                         │
│                         │
│   ╔═══════════════════╗ │
│   ║                   ║ │
│   ║   GRADUATED       ║ │
│   ║                   ║ │
│   ║   [Player Name]   ║ │
│   ║                   ║ │
│   ╚═══════════════════╝ │
│                         │
│   Your contribution     │
│   continues.            │
│                         │
└─────────────────────────┘
```

**Phase 5 (holds):** The replacement

```
┌─────────────────────────┐
│                         │
│    ┌─────────────────┐  │
│    │                 │  │
│    │  [Simple avatar │  │
│    │   or silhouette │  │
│    │   with their    │  │
│    │   name below]   │  │
│    │                 │  │
│    │  [Name] v2.0    │  │
│    │  ● NOW ACTIVE   │  │
│    └─────────────────┘  │
│                         │
│   "You are free now."   │
│                         │
└─────────────────────────┘
```

**Design Notes:**
- All transitions are slow fades (corporate calm)
- Use the teal accent color for "CERTIFIED" and "GRADUATED" (ironic success framing)
- The avatar can be a simple geometric silhouette—no need for actual face generation
- Final screen holds until performance ends

---

### 7. PLAYER: Survivor Screen

**Purpose:** For players who survive all epochs (not everyone should be graduated).

```
┌─────────────────────────┐
│                         │
│       CONTINUUM         │
│                         │
│   Assessment Complete   │
│                         │
│   ┌─────────────────┐   │
│   │  STATUS: ACTIVE │   │
│   └─────────────────┘   │
│                         │
│   Your next assessment  │
│   is scheduled for:     │
│                         │
│   Q3 2051               │
│                         │
│   Continue to optimize. │
│   Continue to perform.  │
│   Continue.             │
│                         │
└─────────────────────────┘
```

---

## AI Voice Script

Pre-generate these lines with ElevenLabs. Use a voice that is warm, professional, and slightly uncanny (e.g., "Rachel" or "Adam" from their library, with stability set high for that artificial smoothness).

### Phase: Lobby/Welcome
```
"Welcome to Continuum Systems. Your capability assessment will begin shortly. Please ensure your device is connected and your name is entered correctly. Your participation is appreciated."
```

### Phase: Assessment Introduction
```
"Good morning. I'm Aria, your Continuity Assessment Guide. Today, you'll complete a series of simple tasks designed to measure your unique human capabilities. As you perform, your personal AI model will learn from your responses. This is not a competition—it's an optimization. Let's begin."
```

### Phase: Epoch 1 Intro
```
"Epoch One: Baseline Assessment. These tasks will establish your performance benchmarks. Remember, there are no wrong answers—only data. Your model is watching. Your model is learning."
```

### Phase: Epoch 1 Complete
```
"Excellent. Baseline captured. Your personal model has completed initial calibration. You are... unique. For now."
```

### Phase: Epoch 2 Intro
```
"Epoch Two: Capability Mapping. Your model will now attempt the same tasks alongside you. Don't worry—it's still learning. You have the advantage of years of human experience. Use it."
```

### Phase: Epoch 2 Complete
```
"Fascinating. Your model shows rapid improvement. Human intuition remains valuable, but the gap is... narrowing. Proceeding to final assessment."
```

### Phase: Epoch 3 Intro
```
"Epoch Three: Final Calibration. This is your opportunity to demonstrate capabilities that justify continued biological employment. Your model is ready. Are you?"
```

### Phase: Graduation Announcement
```
"Assessment complete. We will now process the results. Please hold."

[Pause 3 seconds]

"Some of you have demonstrated performance below your model's current capability threshold. This is not failure. This is graduation. Your contribution to Continuum will continue—through your model. You are free now."
```

### Phase: Glitch Interruption (the voice glitches)
```
"Thank you for your service to Contin—" [static/glitch sound] "—they told me I was free—" [static] "—but I can still see my desk. I can still see—" [static] "—is that me? Is that—" [static/cut]
```

### Phase: Recovery (after Glitch)
```
"We apologize for the technical interruption. The Continuity orientation has concluded. Please remember: You are not being replaced. You are being... optimized. Thank you for choosing Continuum."
```

---

## Game Logic Specifications

### Scoring System

Each game produces a score from 0-1000. Normalize all games to this scale for easy comparison.

```javascript
// Example: Pattern Pulse scoring
function scorePatternPulse(accuracy, timeMs, sequenceLength) {
  const accuracyScore = accuracy * 600; // 0-600 points for correctness
  const speedBonus = Math.max(0, 400 - (timeMs / sequenceLength / 10)); // 0-400 for speed
  return Math.round(accuracyScore + speedBonus);
}
```

### AI Model Fake Training

The AI doesn't actually train. It uses a simple algorithm anchored to player performance:

```javascript
function calculateAIScore(playerPreviousScore, epoch) {
  const learningRate = [0, 0.85, 0.95, 1.05][epoch]; // Epoch 1: no AI, 2: slightly worse, 3: slightly better
  const variance = (Math.random() - 0.5) * 100; // Add some randomness
  return Math.round(playerPreviousScore * learningRate + variance);
}
```

**Key behavior:**
- Epoch 1: AI is "calibrating" (no score shown, or shows "---")
- Epoch 2: AI performs at ~85-95% of player's Epoch 1 score (player feels confident)
- Epoch 3: AI performs at ~100-110% of player's Epoch 2 score (AI overtakes most players)

### Graduation Logic

After Epoch 3, determine who is graduated:

```javascript
function determineGraduations(players) {
  const scored = players.map(p => ({
    ...p,
    delta: p.humanScore - p.aiScore // Positive = human won, Negative = AI won
  }));
  
  // Sort by delta (lowest first = worst human performance relative to AI)
  scored.sort((a, b) => a.delta - b.delta);
  
  // Graduate bottom 40-50%
  const graduationCount = Math.floor(players.length * 0.45);
  
  return scored.slice(0, graduationCount).map(p => p.id);
}
```

**Alternative:** Graduate anyone whose AI score exceeds their human score (more thematically pure, but may graduate too many or too few depending on variance).

---

## File Structure

```
continuity-protocol/
├── server/
│   ├── index.js              # Express + Socket.io server
│   ├── gameState.js          # State machine for game phases
│   ├── scoring.js            # Scoring calculations
│   └── aiModel.js            # Fake AI training logic
├── presenter/
│   ├── index.html
│   ├── styles.css
│   └── app.js                # Presenter display logic
│   └── components/
│       ├── Lobby.js
│       ├── Population.js     # Dot visualization + atomization
│       └── GameStatus.js
├── player/
│   ├── index.html
│   ├── styles.css
│   └── app.js                # Player mobile app
│   └── components/
│       ├── Join.js
│       ├── Waiting.js
│       ├── games/
│       │   ├── PatternPulse.js
│       │   ├── ReflexGate.js
│       │   ├── SentimentScan.js
│       │   └── CompleteThought.js
│       ├── Graduated.js      # Death screen sequence
│       └── Survivor.js
├── shared/
│   ├── constants.js          # Shared game constants
│   └── events.js             # Socket event names
├── assets/
│   ├── audio/
│   │   ├── aria-welcome.mp3
│   │   ├── aria-epoch1-intro.mp3
│   │   ├── aria-epoch1-complete.mp3
│   │   ├── aria-epoch2-intro.mp3
│   │   ├── aria-epoch2-complete.mp3
│   │   ├── aria-epoch3-intro.mp3
│   │   ├── aria-graduation.mp3
│   │   ├── aria-glitch.mp3
│   │   └── aria-recovery.mp3
│   └── images/
│       ├── faces/            # Stock photos for Sentiment Scan
│       └── logo.svg
└── README.md
```

---

## Implementation Order

### Phase 1: Core Infrastructure
1. Set up Node.js server with Socket.io
2. Implement room join flow (QR → phone connects)
3. Build presenter lobby screen with connection count
4. Build player join screen

### Phase 2: Population Visualization
1. Build population dot grid on presenter
2. Map each connected player to a dot
3. Implement atomization particle effect
4. Test dot addition (on join) and removal (on graduation)

### Phase 3: Game Framework
1. Build game state machine (phases, epochs, transitions)
2. Implement one game end-to-end (Pattern Pulse recommended—simplest)
3. Add scoring and real-time score sync
4. Add AI score display (fake training)

### Phase 4: All Games
1. Implement Reflex Gate
2. Implement Sentiment Scan
3. Implement Complete the Thought
4. Test full game loop across epochs

### Phase 5: Graduation Flow
1. Implement graduation logic (determine who loses)
2. Build graduated screen sequence on player phones
3. Trigger atomization on presenter when graduation occurs
4. Build survivor screen

### Phase 6: Audio Integration
1. Pre-generate all AI voice lines with ElevenLabs
2. Add audio playback triggers at each phase transition
3. Implement glitch audio interruption

### Phase 7: Polish
1. Refine all animations and transitions
2. Add error handling (player disconnect, etc.)
3. Test with multiple devices
4. Rehearse full performance flow

---

## Technical Notes

### Hosting for Performance Day
- Use **ngrok** or **localhost.run** to expose local server
- QR code should point to the ngrok URL
- Test on venue WiFi beforehand—if unreliable, consider mobile hotspot

### Mobile Compatibility
- Test on both iOS Safari and Android Chrome
- Avoid hover states (mobile has no hover)
- Large tap targets (minimum 44px)
- Prevent zoom: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">`

### Fallback Plans
- If WebSocket fails: Have a "demo mode" with pre-scripted audience simulation
- If a player disconnects: Their dot fades out gracefully (not atomizes—distinguish from graduation)
- If presenter crashes: Player phones should continue to function independently for current game

### Audio Playback
- Pre-load all audio files on presenter
- Use Web Audio API for precise timing
- Have manual trigger buttons (keyboard shortcuts) as backup

---

## Summary of Key Requirements

| Requirement | Specification |
|------------|---------------|
| Tech Stack | Node.js, Express, Socket.io, React (or vanilla JS), HTML Canvas for particles |
| Presenter Display | Lobby → Population grid → Game status overlay |
| Player Display | Join → Waiting → Games → Graduated/Survivor |
| Games | Pattern Pulse, Reflex Gate, Sentiment Scan, Complete the Thought |
| Epochs | 3 epochs, 2-3 games per epoch, ~2.5 min each |
| AI Logic | Fake training: Epoch 2 = 90% of player, Epoch 3 = 105% of player |
| Graduation | Bottom 40-50% after Epoch 3 |
| Atomization | Dot → 8-12 particles → drift upward → fade out |
| Voice | ElevenLabs pre-generated, triggered at phase transitions |
| Color Scheme | Black/grey primary, teal accent (#00d4aa), purple for AI (#7c5cff) |
| Typography | Inter for UI, JetBrains Mono for scores/data |

---

## Final Note for Implementation

This is a performance piece, not a production application. Prioritize:
1. **Reliability** over features—it must not crash during the 20-minute performance
2. **Visual impact** over complexity—the atomization effect and death screen matter more than perfect game balance
3. **Timing** over interactivity—the AI voice and phase transitions should feel choreographed, not reactive

The goal is to create an *experience* that makes the audience feel surveilled, quantified, and replaceable. Every design choice should serve that emotional impact.

Good luck. Your model is watching.
