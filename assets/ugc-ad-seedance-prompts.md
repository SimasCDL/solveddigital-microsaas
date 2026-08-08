# Molecule Data UGC ad — teardown + Seedance 2.5 prompt kit for Tourly

Source: `IMG_3049.MP4` (screen recording of the ad running in an IG feed).
22.0s · 9:16 · 30fps · H.264. Analysis is from the picture + burned-in captions.
I did not transcribe the audio — the script below is reconstructed word-for-word
from the karaoke captions, which are frame-accurate.

---

## 1. Beat map

| # | Time | Shot | Line on screen |
|---|------|------|----------------|
| 1 | 0.0–2.3 | A-roll, **medium** (chest-up, laptop lid in frame) | "Your best performing competitor…" |
| 2 | 2.3–4.1 | **Screen insert** — Meta Ads Manager campaign table, rows `Creative_01…09` duplicating down the list. Entered on a white flash cut. | "…is running 30 new creatives this week." |
| 3 | 4.1–5.5 | A-roll, **extreme punch-in** (~2.2×, forehead cropped) | "You've seen zero of them." |
| 4 | 5.5–7.3 | A-roll, back to **medium**, open-hand gesture | "Meanwhile," |
| 5 | 7.3–9.3 | **B-roll insert** — a jewellery DTC site (AURÈLE, *"Wear the light you carry"*), desaturated, with a floating Meta `Budget ↑↓` dropdown ticking **$82.61 → $386.96 Daily**, framed in a red glow | "…your budget is leaking into ads that aren't paying for themselves." |
| 6 | 9.3–12.5 | A-roll, **medium punch-in** (~1.4×) | "And you don't even know which ones…" |
| 7 | 12.5–14.8 | **Product screen** — quiz cards: *"Where does most of your spend go?"*, *"How quickly do you find out a campaign started wasting money?"* | "Answer 7 questions," |
| 8 | 14.8–19.0 | **Product screen** — the diagnostic result page, long auto-scroll over a personalised report with € figures and a **47/100** score | "get a free diagnostic showing exactly where your ad spend is bleeding." |
| 9 | 19.0–22.0 | **End card** — navy gradient, headline + subline + button + logo + dashboard screenshot, mouse cursor drifting onto the button | "FIND OUT WHERE YOUR AD BUDGET IS LEAKING / ANSWER 7 QUICK QUESTIONS / Start the diagnostic →" |

Mix: **~9s talking head (41%) · ~11s real screen capture (50%) · 3s end card.**
8 cuts in 22s ≈ one every 2.4s. No shot runs longer than 4s.

## 2. The single most important production fact

**Shots 1, 3, 4 and 6 are the same continuous take.** Identical background, identical
pendant lamp position, identical grain. The "three angles" are **digital punch-ins
made in the edit** — 1.0× / 2.2× / 1.0× / 1.4×.

That is exactly how you should build it in Seedance: generate every A-roll clip at
**one wide framing from one locked reference image**, then crop in the editor.
Never ask the model for a "close-up" version — that is where identity drift shows up.

## 3. A-roll craft spec (what Seedance has to reproduce)

**Camera** — chest height, dead-on eyeline, ~35mm-equivalent, subject dead centre,
head at the top third. Very slight handheld micro-drift; *not* tripod-locked.
The open laptop lid is cut off by the bottom edge — the phone is obviously propped
on or just behind the laptop. That framing detail is a large part of why it reads
as real.

**Environment** — upscale hotel lobby bar after dark. Backlit bamboo stalks behind
glass, a black caged pendant lamp with an amber bulb hanging dead centre above his
head, dark stone wall, warm wood table edge in the bottom foreground, patterned
armchair at frame left.

**Lighting** — mixed practicals only, no ring light. Warm tungsten key from
front-left, amber pendant behind, cool blue-green uplight from the bamboo.
Slightly under-exposed with visible shadow noise. This is the biggest "not a studio,
not AI" signal in the whole ad — copy it before you copy anything else.

**Talent** — man ~30, Mediterranean, shoulder-length wavy black hair, full dark
beard, **amber-tinted aviator sunglasses worn indoors**, beige ribbed knit polo with
open collar, gold link watch on the left wrist, phone held low in the right hand.

> The sunglasses are doing real work. Eyes are where AI video fails first — blink
> cadence, gaze drift, pupil wobble. Tinted lenses delete the whole failure class.
> Put your Tourly talent in sunglasses, or in a dim enough room that the eyes sit
> in shadow.

**Performance** — straight to lens, dry and faintly accusatory, no smile, no
"hey guys". Head barely moves; the emphasis lives in eyebrows, mouth and small
palm-up hand beats. ~158 wpm.

**Grade** — warm highlights, teal shadows, mild grain, light vignette. Reads as an
iPhone in a dim room, not a camera.

## 4. Caption spec

- Word-by-word karaoke, **2–3 words on screen max**.
- ALL CAPS, heavy grotesque (Poppins ExtraBold / Montserrat Black).
- Already-spoken words **white**; current word **electric blue ≈ #2B4BFF**.
- Black rounded-pill background, ~12px radius, tight padding.
- Anchored at **~55% frame height** — below the chin, above the CTA button, so the IG
  "Learn more" overlay never collides with it.
- Captions run over the screen inserts too, never pausing.

## 5. Script — word for word

> "Your best performing competitor is running 30 new creatives this week.
> You've seen zero of them. Meanwhile, your budget is leaking into ads that
> aren't paying for themselves. And you don't even know which ones…
> Answer 7 questions, get a free diagnostic showing exactly where your ad
> spend is bleeding."

~50 words over 19s.

**Why it converts, in order:**
1. The hook is about a **rival**, not the product. Envy + FOMO inside 4 seconds.
2. Beat two is a three-word gut punch landing on the **biggest scale change** — the
   picture carries the emotion, not the words.
3. The problem gets a **live-ticking money number**, so the loss feels ongoing.
4. "You don't even know which ones" is the shame beat — it makes a *diagnostic*, not
   a product, the obvious next step.
5. CTA is a **bounded free quiz** ("7 questions"), never a purchase.
6. The end card restates the CTA as text, so the ad still works muted.

---

# Tourly adaptation

Tourly's funnel already matches this shape: cold Meta traffic → *"What does a listing
video actually cost?"* → 6 questions → free listing diagnostic → pack offer. The ad
just has to hand the quiz its opening.

## 6. Scripts — pick one per test cell

Keep every version at **48–54 words**, five beats, same rhythm.

**A — Rival (closest clone, run this first)**
> "The agent who beat you to that listing posts a new walkthrough every single week.
> You've posted none. Meanwhile your listings sit, and the price cut comes out of
> your commission. And you still think a tour costs eight hundred.
> Answer 6 questions — free listing diagnostic, real market rate."

**B — Price myth**
> "You didn't shoot video on your last three listings because a videographer quoted
> you eight hundred euros a property. That number is why your listings look like
> everyone else's. The agents outselling you aren't paying it either.
> Answer 6 questions and find out what a listing video actually costs."

**C — Shame / status**
> "Scroll your own feed. Now scroll the top agent in your city. One of you has
> walkthrough video on every listing and it isn't you. It's not talent and it's not
> budget — it's that nobody told you what it costs.
> Six questions, free listing diagnostic."

Beat mapping is identical across all three: **hook (rival/number) → 3-word gut punch
on the extreme punch-in → quantified loss over b-roll → shame line → bounded CTA.**

## 7. Shot list to build (Tourly)

| # | Duration | Source | Content |
|---|----------|--------|---------|
| 1 | 0.0–4.0 | **Seedance clip 1** | A-roll medium, hook line |
| 2 | 4.0–5.5 | **Real screen rec** | Fast scroll of a competitor agent's IG grid, wall of walkthrough thumbnails |
| 3 | 5.5–7.0 | Seedance clip 1, **cropped 2.2×** | "You've posted none." |
| 4 | 7.0–9.5 | **Real Tourly output** | 2s of an actual generated tour clip, desaturated, with a floating "€800 / listing" price tag tickering up in a red glow |
| 5 | 9.5–12.5 | Seedance clip 2, **cropped 1.4×** | Shame line |
| 6 | 12.5–15.0 | **Real screen rec** | The quiz — `/questions`, two cards |
| 7 | 15.0–19.0 | **Real screen rec** | The diagnostic result — tier ladder, score, market rate |
| 8 | 19.0–22.0 | Static end card | See §10 |

**Generate only shots 1, 3 and 5 in Seedance — two clips total, both at the same wide
framing.** Everything else is a real screen recording. The reference ad does exactly
this, and it's why its UI is legible; AI-rendered UI is instantly fake.

## 8. Workflow in Higgsfield

1. **Lock one hero still first.** Generate the frame in §9.0 as a *still image*
   (Nano Banana 2 / Seedream), regenerate until the face, wardrobe and room are right,
   then save it. This is your character bible.
2. **Image-to-video** from that still for every A-roll clip. Do not go text-to-video
   for clip 2 — you'll get a different person.
3. Seedance 2.5 tops out around 10s per generation on Higgsfield (check your duration
   dropdown). Two clips × ~10s covers the whole 19s VO. If your cell is 5s, split the
   script into four clips instead and keep the same reference image.
4. **Let Seedance speak the line** (native lip-synced dialogue), then in the edit
   decide whether to keep its voice or lay an ElevenLabs read on top and re-sync.
   Generate the visual with the dialogue either way — the mouth shapes come out right.
5. Render 1080×1920. Cut, punch in, caption, end card in CapCut/Premiere.

## 9. Prompts — paste these

### 9.0 — Hero still (do this first)

```
Vertical 9:16 photo, shot on an iPhone in a dim room, handheld.

A 32-year-old man sits alone in an upscale, empty modern apartment at dusk,
looking straight down the lens. Shoulder-length wavy dark hair, short full beard,
amber-tinted aviator sunglasses worn indoors, a beige ribbed knit polo with an
open collar, a gold link watch on his left wrist. Relaxed, slightly slumped,
phone held low in his right hand.

Framing: chest-up medium shot, camera at chest height, dead-on eyeline, 35mm
equivalent, subject centred with his head in the top third. The open silver lid
of a laptop crosses the very bottom of the frame, out of focus — the camera is
propped behind it.

Behind him: floor-to-ceiling windows with a blue city dusk outside, an empty
staged living room, a single warm floor lamp glowing to camera-left, a dark
accent wall, a pale sofa at frame left.

Lighting: mixed practicals only. Warm tungsten key from front-left, cool blue
window light filling the background, no ring light, no studio softbox. Slightly
under-exposed, shadow noise visible, warm highlights and teal shadows, mild grain,
light vignette.

Looks like a real person filming themselves on a phone. Not a studio portrait,
not a stock photo.
```

Negatives: `ring light, studio backdrop, softbox, glossy skin, symmetrical beauty lighting, 4k cinematic, teeth whitening, plastic skin, watermark, text overlay, extra fingers, warped watch, warped sunglasses`

### 9.1 — Clip 1 (image-to-video, ~10s) — hook + gut punch

```
Reference image locked. The same man, the same room, the same wardrobe.

He talks directly to the camera, unsmiling and matter-of-fact, mildly accusatory.
His head stays almost still; the emphasis comes from his eyebrows, his mouth, and
two small palm-up beats of his left hand. On the last three words he leans two
inches toward the lens and holds.

Camera: locked chest-height medium shot, dead-on, very slight handheld micro-drift,
no zoom, no pan, no rack focus, no cuts. One continuous take.

Lighting unchanged: warm practical key from front-left, cool blue dusk window
behind, under-exposed, grain, warm highlights and teal shadows.

Dialogue (spoken to camera, lip-synced, dry conversational delivery, ~155 words
per minute): "The agent who beat you to that listing posts a new walkthrough
every single week. You've posted none."

Audio: close dry male voice, faint room tone, no music, no reverb.

Style: vertical 9:16, filmed on a phone, real UGC, natural imperfect framing.
```

Negatives: `cut, scene change, camera zoom, camera push in, dolly, jump cut, second person, on-screen text, subtitles, captions, watermark, logo, music, cinematic score, smiling, waving at camera, identity change, changing clothes, changing hairstyle, changing background`

### 9.2 — Clip 2 (image-to-video, ~10s) — problem + shame + CTA

```
Reference image locked. The same man, the same room, the same wardrobe, same
seated position — a direct continuation of the previous take.

He keeps talking straight to the lens. On "sit" he tilts his head slightly and
opens both palms; on the last sentence he points once at the camera, then settles
back. Still no smile until a single flat half-smile on the final word.

Camera: identical locked chest-height medium shot, dead-on, very slight handheld
micro-drift, no zoom, no cuts. One continuous take.

Lighting and grade identical to the reference image.

Dialogue (spoken to camera, lip-synced, dry conversational delivery): "Meanwhile
your listings sit, and the price cut comes out of your commission. And you still
think a tour costs eight hundred. Answer six questions — free listing diagnostic,
real market rate."

Audio: close dry male voice, faint room tone, no music.

Style: vertical 9:16, filmed on a phone, real UGC.
```

Same negatives as 9.1.

### 9.3 — Optional variant setting (test cell 2)

Swap the environment block in 9.0 for:

```
He sits in the driver's seat of a parked car at dusk, phone propped on the
dashboard. Street lights and a lit shopfront blurred through the windscreen
behind him, warm dashboard glow on one side of his face, cool blue window light
on the other. A "For Sale" sign leaning on the passenger seat, slightly out of
focus.
```

Everything else — framing, grade, performance, dialogue — stays identical. The
car version usually beats the interior version on real-estate audiences; worth
one cell.

## 10. End card spec (Tourly)

- Background: deep teal→ink vertical gradient using the brand accent `#13a48c` → `#0e7d6b`,
  matching the quiz's start button.
- Headline, ~34px, ExtraBold, white, two lines:
  **FIND OUT WHAT A LISTING VIDEO ACTUALLY COSTS.**
- Subline, ~15px, 70% white: **ANSWER 6 QUICK QUESTIONS.**
- Pill button, white text on the accent gradient: **Start the diagnostic →**
  (identical wording and shape to the real button on the quiz page, so the click
  target the user just saw is the one they land on)
- Below it: the wordmark, then a cropped screenshot of a delivered tour.
- Animate a mouse cursor drifting onto the button and stopping. The reference ad
  does this and it is a genuinely good trick — it makes the next tap feel decided.
- Hold 3 seconds.

## 11. Checklist before you spend credits

- [ ] Hero still saved and reused for **every** A-roll generation
- [ ] Sunglasses or shadowed eyes on the talent
- [ ] No ring light anywhere in the prompt
- [ ] Both clips generated at the **same** wide framing — punch-ins are done in the edit
- [ ] All UI is a **real screen recording**, never generated
- [ ] Captions capped at 3 words, pinned at 55% height
- [ ] Ad still makes its point with sound off
- [ ] Quiz page headline matches the end-card headline word for word
