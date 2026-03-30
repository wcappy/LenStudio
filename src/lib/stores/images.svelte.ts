import type { ImageFrame } from '../types/index.js';

const MAX_IMAGES = 12;
const MIN_IMAGES = 2;

class ImageStore {
  frames = $state<ImageFrame[]>([]);

  count = $derived(this.frames.length);
  isReady = $derived(this.frames.length >= MIN_IMAGES);
  canAdd = $derived(this.frames.length < MAX_IMAGES);
  remainingSlots = $derived(MAX_IMAGES - this.frames.length);

  async addFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(f =>
      f.type.startsWith('image/') &&
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );

    const slotsAvailable = MAX_IMAGES - this.frames.length;
    const toAdd = imageFiles.slice(0, slotsAvailable);

    const newFrames: ImageFrame[] = [];

    for (const file of toAdd) {
      const objectUrl = URL.createObjectURL(file);
      const bitmap = await createImageBitmap(file);
      newFrames.push({
        id: crypto.randomUUID(),
        file,
        objectUrl,
        bitmap,
        order: this.frames.length + newFrames.length,
        width: bitmap.width,
        height: bitmap.height,
      });
    }

    this.frames = [...this.frames, ...newFrames];
  }

  removeFrame(id: string) {
    const frame = this.frames.find(f => f.id === id);
    if (frame) {
      URL.revokeObjectURL(frame.objectUrl);
      frame.bitmap?.close();
    }
    this.frames = this.frames
      .filter(f => f.id !== id)
      .map((f, i) => ({ ...f, order: i }));
  }

  reorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const updated = [...this.frames];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    this.frames = updated.map((f, i) => ({ ...f, order: i }));
  }

  clear() {
    for (const frame of this.frames) {
      URL.revokeObjectURL(frame.objectUrl);
      frame.bitmap?.close();
    }
    this.frames = [];
  }
}

export const imageStore = new ImageStore();
