export interface ImageFrame {
  id: string;
  file: File;
  objectUrl: string;
  bitmap: ImageBitmap | null;
  order: number;
  width: number;
  height: number;
  cropRect?: CropRect;
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
