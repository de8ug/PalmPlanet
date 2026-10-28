export interface HandSample { x: number; y: number; pinch: number }
export type GestureAction = { type: 'rotate'; dx: number; dy: number } | { type: 'zoom'; amount: number } | { type: 'click'; x: number; y: number };
export class GestureEngine {
  private pinched = [false, false];
  private mode: 'none' | 'one' | 'two' = 'none';
  private previous?: HandSample;
  private previousGap = 0;
  private startTime = 0;
  private travel = 0;
  private clicksAllowed = false;
  reset() { this.pinched = [false, false]; this.mode = 'none'; this.previous = undefined; this.previousGap = 0; this.clicksAllowed = false; }
  step(hands: HandSample[], now: number): GestureAction[] {
    if (!hands.length) { this.reset(); return []; }
    const actions: GestureAction[] = [];
    const sorted = [...hands].sort((a, b) => a.x - b.x).slice(0, 2);
    sorted.forEach((h, i) => { this.pinched[i] = h.pinch < (this.pinched[i] ? 0.65 : 0.4); });
    if (sorted.length < 2) this.pinched[1] = false;
    const active = sorted.filter((_, i) => this.pinched[i]);
    if (active.length === 2) {
      const gap = Math.hypot(active[0].x - active[1].x, active[0].y - active[1].y);
      if (this.mode === 'two' && this.previousGap > 0.07 && gap > 0.07) actions.push({ type: 'zoom', amount: Math.max(-0.12, Math.min(0.12, (gap / this.previousGap - 1) * 1.5)) });
      this.mode = 'two'; this.previousGap = gap; this.clicksAllowed = false; this.previous = undefined;
    } else if (active.length === 1) {
      const hand = active[0];
      if (this.mode !== 'one') {
        this.startTime = now; this.travel = 0; this.clicksAllowed = this.mode !== 'two';
      } else if (this.previous) {
        const dx = hand.x - this.previous.x, dy = hand.y - this.previous.y;
        this.travel += Math.hypot(dx, dy);
        if (Math.hypot(dx, dy) < 0.12) actions.push({ type: 'rotate', dx, dy });
        else this.clicksAllowed = false;
      }
      this.mode = 'one'; this.previous = hand;
    } else {
      if (this.mode === 'one' && this.previous && this.clicksAllowed && now - this.startTime < 400 && this.travel < 0.035) actions.push({ type: 'click', x: this.previous.x, y: this.previous.y });
      this.mode = 'none'; this.previous = undefined; this.clicksAllowed = false;
    }
    return actions;
  }
  get label() { return this.mode === 'two' ? '双手捏住 · 拉开或靠拢来缩放' : this.mode === 'one' ? '抓住了 · 移动手来转动地球' : '找到手了 · 试着用拇指和食指捏合'; }
}
