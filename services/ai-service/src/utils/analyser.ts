import path from "path";
import axios from "axios";
import fs from "fs";

export interface AnalysisResult {
  caption: string;
  tags: string[];
}

// ─── Mock ────────────────────────────────────────────────────────────────────
// Derives plausible-looking results from the filename so the frontend
// actually shows something meaningful during the demo.
// Replace the body of `analyse` with the Azure CV call when going live.

const TAG_POOL = [
  "outdoor",
  "indoor",
  "people",
  "food",
  "nature",
  "urban",
  "animal",
  "travel",
  "architecture",
  "night",
  "day",
  "portrait",
  "landscape",
  "water",
  "sky",
  "street",
  "event",
  "sport",
  "art",
  "technology",
];

function pickTags(filename: string): string[] {
  // Use the filename as a seed so the same file always returns the same tags
  const seed = filename.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const count = 3 + (seed % 4); // 3–6 tags
  const shuffled = [...TAG_POOL].sort(() => Math.sin(seed) - 0.5);
  return shuffled.slice(0, count);
}

function buildCaption(tags: string[]): string {
  const templates = [
    `A photo featuring ${tags[0]} and ${tags[1]}`,
    `An image of ${tags[0]} with elements of ${tags[1]}`,
    `A scene showing ${tags[0]} in an ${tags[1]} setting`,
  ];
  return templates[tags.length % templates.length];
}

export async function analyse(
  filePath: string,
  _mimetype: string,
): Promise<AnalysisResult> {
  if (process.env.USE_MOCK_AI !== "false") {
    const filename = path.basename(filePath);
    const tags = pickTags(filename);
    return { caption: buildCaption(tags), tags };
  }

  // ─── Azure Computer Vision (uncomment when switching) ──────────────────
  const imageData = fs.readFileSync(filePath);
  const endpoint = process.env.AZURE_CV_ENDPOINT!;
  const key = process.env.AZURE_CV_KEY!;

  const url = `${endpoint.replace(/\/$/, "")}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=caption,tags`;

  console.log("CV URL:", url);
  console.log("CV Key (first 8):", key?.slice(0, 8));
  console.log("Content-Type:", _mimetype);
  console.log("Image size:", imageData.length);

  const response = await axios.post(url, imageData, {
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/octet-stream",
    },
  });

  const { captionResult, tagsResult } = response.data;
  return {
    caption: captionResult?.text ?? "",
    tags: tagsResult?.values?.map((t: { name: string }) => t.name) ?? [],
  };
}
