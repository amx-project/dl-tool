import { readFile, mkdir, rm } from "fs/promises";
import { createWriteStream, existsSync } from "fs";
import { pipeline } from "stream/promises";
import { join } from "path";
import { queue } from "async";
import cliProgress from "cli-progress";

const CONCURRENCY = 5;
const ZIPS_DIR = "zips";

(async () => {
  const year = process.argv[2];
  if (!year) {
    console.error("Usage: node download_zips.js <year>");
    process.exit(1);
  }
  const list = JSON.parse(await readFile("out_list.json", "utf-8"));
  const out = list.filter(x => x.year === year);
  if (out.length === 0) {
    console.error(`No datasets found for year ${year}`);
    process.exit(1);
  }
  console.log(`Downloading ${out.length} datasets for year ${year}`);

  // Ensure the output directory exists
  await mkdir(ZIPS_DIR, { recursive: true });

  // Initialize progress bar
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(out.length, 0);

  // Create download queue
  const q = queue(async (task) => {
    const { zip_url, zip_name } = task;
    const outputPath = join(ZIPS_DIR, zip_name);
    if (await existsSync(outputPath)) {
      progressBar.increment();
      return;
    }

    try {
      const response = await fetch(zip_url, {
        redirect: "follow",
      });
      if (!response.ok) {
        throw new Error(`Failed to download ${zip_url}: ${response.statusText}`);
      }
      // Use streams for potentially large files
      await pipeline(response.body, createWriteStream(outputPath));
      progressBar.increment();
    } catch (e) {
      await rm(outputPath);
      throw e;
    }
  }, CONCURRENCY);

  q.error();

  // Add tasks to the queue
  for (const item of out) {
    q.push(item);
  }
  
  // Assign drain handler (called when queue is empty)
  await q.drain();
  progressBar.stop();
  console.log("\nAll downloads finished.");

  // Handle case where queue might start empty (though filtered list check prevents this)
  if (out.length === 0) {
    progressBar.stop();
    console.log("No files to download.");
  }

})().catch(e => {
  console.error(e);
  process.exit(1);
});
