export interface ImageTransform {
  scale: number;  // 1 = cover-fit (default), >1 = zoom in
  panX: number;   // -1 to 1, horizontal offset (0 = centered)
  panY: number;   // -1 to 1, vertical offset (0 = centered)
}

export interface ImageFrame {
  id: string;
  file: File;
  objectUrl: string;
  bitmap: ImageBitmap | null;
  order: number;
  width: number;
  height: number;
  cropRect?: CropRect;
  transform?: ImageTransform;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalizedFrame {
  imageData: ImageData;
  order: number;
}
