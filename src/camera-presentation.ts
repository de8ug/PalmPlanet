export type CameraLayout = 'window' | 'background';
// Coordinates arrive mirrored, matching the mirrored CSS video. Account for
// object-fit: cover cropping so the cursor stays on the visible fingertip.
export function coverPoint(x: number, y: number, frameWidth: number, frameHeight: number, width: number, height: number) {
  const scale = Math.max(width / frameWidth, height / frameHeight);
  return { x: x * frameWidth * scale - (frameWidth * scale - width) / 2,
    y: y * frameHeight * scale - (frameHeight * scale - height) / 2 };
}
/** Presents an existing local stream; never requests, clones, records or sends media. */
export class CameraPresentation {
  private layout: CameraLayout = 'window';
  constructor(private root: HTMLElement, private source: HTMLVideoElement, private background: HTMLVideoElement, private backdrop: HTMLElement) {
    source.addEventListener?.('loadedmetadata', () => this.sync());
    source.addEventListener?.('emptied', () => this.sync());
  }
  setLayout(layout: CameraLayout) { this.layout = layout; this.sync(); }
  sync() {
    const stream = this.source.srcObject as MediaStream | null;
    const active = Boolean(stream?.getVideoTracks().some(track => track.readyState === 'live'));
    const behind = active && this.layout === 'background';
    this.root.classList.toggle('camera-background', behind);
    this.backdrop.hidden = !behind;
    if (behind) {
      if (this.background.srcObject !== stream) this.background.srcObject = stream;
      if (this.background.paused) void this.background.play().catch(() => {});
    } else {
      this.background.pause(); this.background.srcObject = null;
    }
  }
  clear() { this.background.pause(); this.background.srcObject = null; this.root.classList.remove('camera-background'); this.backdrop.hidden = true; }
}
