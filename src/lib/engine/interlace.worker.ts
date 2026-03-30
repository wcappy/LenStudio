import type { WorkerRequest, WorkerResponse } from '../types/worker-messages.js';
import { interlaceFrames } from './interlace.js';

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  if (msg.type === 'cancel') {
    return;
  }

  if (msg.type === 'interlace') {
    try {
      const { frames: buffers, config } = msg;

      // Reconstruct ImageData from ArrayBuffers
      const frames = buffers.map(
        (buf) =>
          new ImageData(
            new Uint8ClampedArray(buf),
            config.frameWidth,
            config.frameHeight
          )
      );

      const result = interlaceFrames(frames, config.lpi, config.dpi, (percent) => {
        const response: WorkerResponse = { type: 'progress', percent };
        self.postMessage(response);
      });

      // Transfer result buffer back
      const resultBuffer = result.data.buffer;
      const response: WorkerResponse = {
        type: 'complete',
        result: resultBuffer as ArrayBuffer,
        width: result.width,
        height: result.height,
      };
      self.postMessage(response, { transfer: [resultBuffer] });
    } catch (err) {
      const response: WorkerResponse = {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(response);
    }
  }
};
