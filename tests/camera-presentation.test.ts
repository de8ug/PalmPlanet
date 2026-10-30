import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CameraPresentation, coverPoint } from '../src/camera-presentation.ts';
test('layout reuses a single stream, only shows a live background and detaches it on close', () => {
  const classes = new Set<string>();
  const root = { classList: { toggle(name: string, on: boolean) { if (on) classes.add(name); else classes.delete(name); }, remove(name: string) { classes.delete(name); } } } as unknown as HTMLElement;
  const track = { readyState: 'live' };
  const stream = { getVideoTracks: () => [track] };
  const source = { srcObject: null } as unknown as HTMLVideoElement;
  const background = { srcObject: null, play: async () => {}, pause: () => {} } as unknown as HTMLVideoElement;
  const backdrop = { hidden: true } as HTMLElement;
  const presentation = new CameraPresentation(root, source, background, backdrop);
  presentation.setLayout('background'); assert.equal(backdrop.hidden, true);
  source.srcObject = stream as unknown as MediaStream; presentation.sync();
  assert.equal(background.srcObject, stream); assert.equal(classes.has('camera-background'), true);
  presentation.setLayout('window'); assert.equal(background.srcObject, null); assert.equal(backdrop.hidden, true);
  presentation.setLayout('background'); assert.equal(background.srcObject, stream);
  track.readyState = 'ended'; presentation.sync(); assert.equal(backdrop.hidden, true);
  presentation.clear(); assert.equal(background.srcObject, null); assert.equal(classes.size, 0);
});

test('background pointer accounts for video cover cropping instead of stretching coordinates', () => {
  assert.deepEqual(coverPoint(.5, .5, 640, 480, 1280, 720), { x: 640, y: 360 });
  assert.deepEqual(coverPoint(0, 0, 640, 480, 1280, 720), { x: 0, y: -120 });
  assert.deepEqual(coverPoint(.5, .5, 640, 480, 360, 780), { x: 180, y: 390 });
});
