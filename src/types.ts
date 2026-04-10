export type PhotoStyle = 'rustic' | 'modern' | 'social';
export type ImageSize = '1K' | '2K' | '4K';

export interface Dish {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  isGenerating?: boolean;
  error?: string;
}

export interface GenerationSettings {
  style: PhotoStyle;
  size: ImageSize;
}
