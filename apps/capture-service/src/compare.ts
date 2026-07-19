import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

export async function compareImages(source: Buffer, candidatePath: string, outputDirectory: string) {
  const sourceImage = sharp(source).removeAlpha().toColourspace("srgb");
  const sourceMetadata = await sourceImage.metadata();
  const width = sourceMetadata.width;
  const height = sourceMetadata.height;
  if (!width || !height) throw new Error("Source screenshot has no readable dimensions");

  const sourcePixels = await sourceImage.raw().toBuffer();
  const candidatePixels = await sharp(candidatePath)
    .removeAlpha()
    .toColourspace("srgb")
    .resize(width, height, { fit: "fill" })
    .raw()
    .toBuffer();

  const diffPixels = Buffer.alloc(width * height * 3);
  let mismatchedPixels = 0;
  let totalError = 0;
  const pixelCount = width * height;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 3;
    const redError = Math.abs((sourcePixels[offset] ?? 0) - (candidatePixels[offset] ?? 0));
    const greenError = Math.abs((sourcePixels[offset + 1] ?? 0) - (candidatePixels[offset + 1] ?? 0));
    const blueError = Math.abs((sourcePixels[offset + 2] ?? 0) - (candidatePixels[offset + 2] ?? 0));
    const error = (redError + greenError + blueError) / 3;
    totalError += error;
    if (error > 16) mismatchedPixels += 1;
    diffPixels[offset] = Math.min(255, error * 3);
    diffPixels[offset + 1] = error < 16 ? Math.round((sourcePixels[offset + 1] ?? 0) * 0.18) : 0;
    diffPixels[offset + 2] = error < 16 ? Math.round((sourcePixels[offset + 2] ?? 0) * 0.18) : 0;
  }

  await mkdir(outputDirectory, { recursive: true });
  const diffPath = join(outputDirectory, "difference.png");
  await sharp(diffPixels, { raw: { width, height, channels: 3 } }).png().toFile(diffPath);
  return {
    source: { width, height },
    mismatchedPixels,
    mismatchPercentage: Number(((mismatchedPixels / pixelCount) * 100).toFixed(4)),
    meanChannelError: Number((totalError / pixelCount).toFixed(4)),
    diffPath,
    note: "The candidate is resized to the source dimensions for comparison. Inspect the heatmap; one aggregate score cannot prove fidelity.",
  };
}
