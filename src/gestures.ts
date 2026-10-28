import { GestureEngine } from './gesture-math';
import type { GestureAction } from './gesture-math';
import { dataUrl } from './data';
import type { HandLandmarker } from '@mediapipe/tasks-vision';

export class GestureController {
  private tracker?: HandLandmarker;
  private stream?: MediaStream;
  private running = false;
  private frame = 0;
  private generation = 0;
  private engine = new GestureEngine();
  constructor(private video: HTMLVideoElement, private action: (action: GestureAction) => void,
    private status: (text: string) => void, private cursor: (x?: number, y?: number) => void,
    private failed: (message: string) => void) {}
  async start() {
    if (this.running) return;
    const generation = ++this.generation;
    this.running = true;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('请在 localhost 或 HTTPS 页面中开启摄像头。');
      this.status('请允许使用摄像头 · 画面只在本机处理');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
      if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream; this.video.srcObject = stream;
      await this.video.play();
      this.status('摄像头已打开 · 正在加载本机识别模型…');
      const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(dataUrl('vendor/mediapipe'));
      if (generation !== this.generation) return;
      const options = { runningMode: 'VIDEO' as const, numHands: 2, minHandDetectionConfidence: 0.6, minTrackingConfidence: 0.6 };
      let tracker: HandLandmarker;
      try {
        tracker = await HandLandmarker.createFromOptions(fileset, { ...options,
          baseOptions: { modelAssetPath: dataUrl('models/hand_landmarker.task'), delegate: 'GPU' } });
      } catch {
        if (generation !== this.generation) return;
        this.status('正在尝试兼容模式…');
        tracker = await HandLandmarker.createFromOptions(fileset, { ...options,
          baseOptions: { modelAssetPath: dataUrl('models/hand_landmarker.task'), delegate: 'CPU' } });
      }
      if (generation !== this.generation) { tracker.close(); return; }
      this.tracker = tracker;
      this.status('把手放到摄像头前，坐着也可以玩');
      let lastFrame = 0, lastVideoTime = -1;
      const tick = (now: number) => {
        if (!this.running || generation !== this.generation) return;
        if (document.hidden) { this.engine.reset(); this.cursor(); this.frame = requestAnimationFrame(tick); return; }
        if (now - lastFrame >= 55 && this.video.readyState >= 2 && this.video.currentTime !== lastVideoTime) {
          lastFrame = now; lastVideoTime = this.video.currentTime;
          try {
            const result = tracker.detectForVideo(this.video, now);
            const hands = result.landmarks.map(points => {
              const width = Math.hypot(points[5].x - points[17].x, points[5].y - points[17].y);
              return { x: 1 - points[8].x, y: points[8].y,
                pinch: Math.hypot(points[4].x - points[8].x, points[4].y - points[8].y) / Math.max(width, 0.01) };
            });
            const actions = this.engine.step(hands, now);
            actions.forEach(this.action);
            const pointer = [...hands].sort((a, b) => a.pinch - b.pinch)[0]; this.cursor(pointer?.x, pointer?.y);
            this.status(hands.length ? this.engine.label : '没看到手 · 地球已停住，放下手休息也没关系');
          } catch { this.stop(); this.failed('手势识别暂时中断，摄像头已关闭。可以继续用鼠标，或重新开启手势。'); return; }
        }
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      if (error instanceof DOMException && error.name === 'NotAllowedError') throw new Error('摄像头未获允许。可以继续用鼠标，或在浏览器中允许后重试。');
      if (error instanceof DOMException && error.name === 'NotFoundError') throw new Error('没有找到摄像头，可以继续用鼠标探索。');
      throw error;
    }
  }
  stop() {
    this.generation++; this.running = false; cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    this.video.pause(); this.video.srcObject = null;
    this.tracker?.close(); this.tracker = undefined; this.engine.reset(); this.cursor();
  }
}
