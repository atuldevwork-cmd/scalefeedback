import imageCompression from 'browser-image-compression';

export async function compressScreenshot(dataUrl: string): Promise<string> {
  try {
    // Convert data URL to File
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'screenshot.png', { type: 'image/png' });

    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.85,
    });

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(compressed);
    });
  } catch {
    // On failure return original
    return dataUrl;
  }
}
