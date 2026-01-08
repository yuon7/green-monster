import { CanvasRenderingContext2D, loadImage, Image } from '@napi-rs/canvas';
// @ts-ignore
import { parse } from 'twemoji-parser';

// Cache for loaded emoji images to avoid re-fetching
const emojiCache: Map<string, Image> = new Map();

/**
 * Loads an image from a URL with caching.
 */
async function loadEmojiImage(url: string): Promise<Image | null> {
  if (emojiCache.has(url)) {
    return emojiCache.get(url)!;
  }

  try {
    const image = await loadImage(url);
    emojiCache.set(url, image);
    return image;
  } catch (error) {
    console.error(`Failed to load emoji image from ${url}:`, error);
    return null;
  }
}

/**
 * Draws text with Twemoji images on a canvas context.
 * Replaces standard emoji characters with Twemoji images.
 */
export async function drawTextWithTwemoji(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number = 1000,
  fontSize: number = 20,
  fontFamily: string = 'sans-serif'
): Promise<void> {
  if (!text) return;

  // Basic font setup (used for text width measurement and drawing)
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'middle'; // Adjust as needed, usually 'middle' for vertically centered text

  // Parse text to find emojis
  const entities = parse(text);

  // If no emojis, draw plain text (with width fitting if needed)
  if (entities.length === 0) {
      drawFitText(ctx, text, x, y, maxWidth, fontSize, fontFamily);
      return;
  }

  // Calculate total width of the content (text segments + emoji images)
  // We need to split the original string based on entity indices
  let segments: { type: 'text' | 'emoji'; content: string; url?: string; width: number }[] = [];
  let lastIndex = 0;

  for (const entity of entities) {
    // Text before the emoji
    if (entity.indices[0] > lastIndex) {
      const textPart = text.substring(lastIndex, entity.indices[0]);
      segments.push({
        type: 'text',
        content: textPart,
        width: ctx.measureText(textPart).width
      });
    }

    // The emoji itself
    segments.push({
      type: 'emoji',
      content: entity.text,
      url: entity.url,
      width: fontSize * 1.25 // Standard emoji size relative to font (slightly larger)
    });

    lastIndex = entity.indices[1];
  }

  // Text after the last emoji
  if (lastIndex < text.length) {
    const textPart = text.substring(lastIndex);
    segments.push({
      type: 'text',
      content: textPart,
      width: ctx.measureText(textPart).width
    });
  }

  // 1. Check if total width fits maxWidth
  let totalWidth = segments.reduce((sum, seg) => sum + seg.width, 0);

  // 2. Reduce font size if too wide (Recursively or iteratively)
  // Since scaling images and text together is complex, we will simply scale down EVERYTHING if it overflows
  let scale = 1.0;
  if (totalWidth > maxWidth) {
    scale = maxWidth / totalWidth;
    // Don't scale down too much, maybe limit to 50%?
    if (scale < 0.5) scale = 0.5;
  }

  // Calculate starting X to center the text (if we assume x is the center point)
  // NOTE: The caller usually passes 'x' as the center point (ctx.textAlign = 'center').
  // If textAlign is 'left', x is the start. We need to handle this.
  // This function assumes 'center' alignment behavior logic for positioning,
  // effectively manually calculating "left" based on total width.
  
  // However, standard fillText with textAlign center draws from the center.
  // To mimic this:
  let currentX = x - (totalWidth * scale) / 2;

  // Draw loop
  for (const segment of segments) {
    if (segment.type === 'text') {
      ctx.font = `${fontSize * scale}px ${fontFamily}`;
      ctx.fillStyle = '#000000'; // Ensure text color is set (or inherit?)
      // We assume context color is already correct, but let's be safe or rely on caller?
      // Relying on caller for fillStyle is better.
      
      // ctx.fillText draws at the baseline. 'middle' baseline is assumed set by caller or above.
      ctx.fillText(segment.content, currentX, y);
      currentX += segment.width * scale;
    } else if (segment.type === 'emoji' && segment.url) {
      const img = await loadEmojiImage(segment.url);
      const emojiSize = fontSize * 1.25 * scale;
      const emojiOffset = (emojiSize - (fontSize * scale)) / 2; 
      
      // Image drawing coordinates are top-left usually.
      // If baseline is middle, y is the middle.
      // Top would be y - emojiSize / 2
      const drawY = y - emojiSize / 2; // + some offset if needed for baseline alignment

      if (img) {
        // @ts-ignore: Type definition mismatch for drawImage
        ctx.drawImage(img, currentX, drawY, emojiSize, emojiSize);
      } else {
        // Fallback if image fails: draw text emoji
        ctx.font = `${fontSize * scale}px ${fontFamily}`;
        ctx.fillText(segment.content, currentX, y);
      }
      currentX += segment.width * scale;
    }
  }
}

/**
 * Fallback mostly-pure text drawing with width fitting, compatible with the new signature
 */
function drawFitText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number, // Center X
    y: number, // Center Y (baseline middle)
    maxWidth: number,
    fontSize: number,
    fontFamily: string
  ) {
    let currentFontSize = fontSize;
    ctx.font = `${currentFontSize}px ${fontFamily}`;
  
    while (ctx.measureText(text).width > maxWidth && currentFontSize > 8) {
      currentFontSize -= 1;
      ctx.font = `${currentFontSize}px ${fontFamily}`;
    }
  
    ctx.fillText(text, x, y);
  }
