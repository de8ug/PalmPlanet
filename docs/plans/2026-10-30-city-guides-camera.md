# City discovery and camera presentation

Goal: make selecting and zooming a city educational, and support optional webcam background compositing.

- Add attributed, offline city introductions and landmark coordinates for the six starter cities (Beijing, Shanghai, Tokyo, London, Sydney, Paris). Other locations request nearby encyclopedia pages with source links, fail visibly when unavailable, and never invent facts.
- Preserve exact clicked coordinates. Identify a nearby city as a reference with distance, never silently replace the picked point. Protect against late responses after changing selections.
- Show landmark buttons, labels and fly-to behavior; zoom-to-city selects the detailed street layer.
- Reuse the same on-device webcam stream in a second muted background video. Small-window and holographic-background controls remain available before camera activation; switching view does not request a new stream. Add opacity control, mirror alignment, and cleanup on exit/failure.
- Verify geographic association and input sanitization, offline/network failures, stream switching and cleanup; build, browser QA and GitHub synchronization. Do not capture or commit user camera frames.
