import {
  IMAGE_MODEL,
  createOpenRouterClient,
  normalizeOpenRouterError,
  type ImageGenerationOptions,
} from './shared';

export async function generateImageFromPrompt(
  prompt: string,
  options: ImageGenerationOptions = {},
) {
  try {
    const client = createOpenRouterClient(options);
    const imageConfig: Record<string, string | number> = {};

    if (options.aspectRatio) {
      imageConfig.aspect_ratio = options.aspectRatio;
    }

    if (options.background) {
      imageConfig.background = options.background;
    }

    if (options.moderation) {
      imageConfig.moderation = options.moderation;
    }

    if (options.outputCompression !== undefined) {
      imageConfig.output_compression = options.outputCompression;
    }

    if (options.outputFormat) {
      imageConfig.output_format = options.outputFormat;
    }

    if (options.partialImages !== undefined) {
      imageConfig.partial_images = options.partialImages;
    }

    if (options.quality) {
      imageConfig.quality = options.quality;
    }

    if (options.size) {
      imageConfig.size = options.size;
    }

    const response = await client.chat.send({
      httpReferer: options.httpReferer,
      appTitle: options.appTitle,
      appCategories: options.appCategories,
      chatRequest: {
        model: options.imageModel ?? options.model ?? IMAGE_MODEL,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image'],
        stream: false,
        ...(Object.keys(imageConfig).length > 0 ? { imageConfig } : {}),
      },
    });

    const imageUrl = response.choices?.[0]?.message.images?.[0]?.imageUrl.url;

    if (imageUrl) {
      return imageUrl;
    }

    const content = response.choices?.[0]?.message.content;

    if (
      typeof content === 'string' &&
      (content.startsWith('data:image/') || content.startsWith('http'))
    ) {
      return content;
    }

    const imageItem = Array.isArray(content)
      ? (
          content as Array<{
            type?: string;
            imageUrl?: { url?: string };
            image_url?: { url?: string };
            url?: string;
          }>
        ).find((item) => item.type === 'image_url' || item.imageUrl || item.image_url || item.url)
      : null;
    const contentImageUrl = imageItem?.imageUrl?.url ?? imageItem?.image_url?.url ?? imageItem?.url;

    if (contentImageUrl) {
      return contentImageUrl;
    }
  } catch (error) {
    throw normalizeOpenRouterError(error);
  }

  throw new Error('No image data received from OpenRouter');
}
