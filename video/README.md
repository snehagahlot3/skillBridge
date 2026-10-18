# SkillBridge demo video

A ~2-minute narrated feature walkthrough of SkillBridge, built with
[Remotion](https://remotion.dev) using the
[iart-ai presentation-video skill](https://github.com/iart-ai/motion-skills).

- **Rendered video:** `out/skillbridge-demo.mp4` (1920×1080, h264 + AAC, ~2:09)
- **Deck source of truth:** `src/deck.ts` — one slide = one claim + narration line
- **Narration:** Windows TTS clips in `public/audio/*.wav` (per-slide; slide
  durations are measured from the audio at render time, never guessed)
- **Screenshots:** real app captures in `public/shots/*.png` (taken against the
  local dev stack with Playwright: login flows, marketplace, job page, AI
  assistant, code review, chat, mentor queue, profiles, admin)

## Re-render

```sh
cd video
npm install
npm run render          # -> out/skillbridge-demo.mp4
npx remotion studio     # interactive preview
```

### Edit the deck

Change slides in `src/deck.ts`, drop a new narration clip in
`public/audio/<id>.wav`, add screenshots to `public/shots/`, and re-render.
Slide lengths come from the audio clips — no manual timing.

## Verify loop

```sh
npx remotion still SkillBridgeDemo out/f-title.png --frame=60    # title settled
npx remotion still SkillBridgeDemo out/f-end.png   --frame=3874  # last frame
npx remotion ffprobe out/skillbridge-demo.mp4                    # streams check
```