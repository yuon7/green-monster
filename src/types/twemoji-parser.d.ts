declare module 'twemoji-parser' {
  export interface EmojiEntity {
    text: string;
    url: string;
    indices: [number, number];
  }
  
  export interface ParseOptions {
    assetType?: 'png' | 'svg';
  }

  export function parse(text: string, options?: ParseOptions): EmojiEntity[];
}
