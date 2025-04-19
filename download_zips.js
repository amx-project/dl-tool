import { readFile, mkdir, rm, stat } from "fs/promises";
import { createWriteStream, existsSync } from "fs";
import { pipeline } from "stream/promises";
import { join } from "path";
import { queue, retry } from "async";
import cliProgress from "cli-progress";

const CONCURRENCY = 10;
const MAX_TRIES = 3;
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
    let localFileSize = -1;

    if (existsSync(outputPath)) {
      progressBar.increment();
      return;
    }

    const controller = new AbortController(); // Create an AbortController
    const signal = controller.signal;

    try {
      // Start the download request, passing the signal
      const response = await fetch(zip_url, {
        redirect: "follow",
        signal, // Pass the signal here
      });

      if (!response.ok) {
        // Throw error immediately if the request itself failed (e.g., 404)
        throw new Error(`Request failed for ${zip_url}: ${response.statusText}`);
      }

      // Assume Content-Length is always present
      const remoteFileSize = parseInt(response.headers.get('content-length'), 10);

      // Check local file size
      try {
        const stats = await stat(outputPath);
        localFileSize = stats.size;
      } catch (err) {
        if (err.code !== 'ENOENT') {
          // Log other stat errors but proceed (will likely overwrite)
          console.error(`\nError checking local file ${zip_name}: ${err.message}. Proceeding with download.`);
        }
        // If ENOENT, localFileSize remains -1, indicating download is needed
      }

      // Skip if local file exists and size matches remote size
      if (localFileSize === remoteFileSize) {
        controller.abort(); // Abort the fetch request
        progressBar.increment();
        // No need to manually handle response.body anymore
        return;
      }

      // Proceed with download (pipe the body)
      // Ensure the response body is readable before piping
      if (!response.body) {
          throw new Error(`Response body is null for ${zip_url}`);
      }
      await pipeline(response.body, createWriteStream(outputPath));
      progressBar.increment();
    } catch (e) {
      // Check if the error is due to the abort signal
      if (e.name === 'AbortError') {
        // This is expected when we skip, log silently or ignore
        // console.log(`\nSkipped ${zip_name} (already exists and size matches)`);
        // Progress bar is already incremented in the skip logic
        return;
      }

      const tries = task.tries || 0;
      if (tries < MAX_TRIES) {
        q.push({...task, tries: tries + 1});
        return; // Return here so progress isn't incremented on retry push
      }
      console.error(`\nError downloading/processing ${e.message} after ${MAX_TRIES} attempts`);
      // Increment progress even on final failure to avoid stalling bar
      progressBar.increment();
    }
  }, CONCURRENCY);

  q.error((err, task) => {
    console.error(`\nFatal error processing task ${task?.zip_name}: ${err.message}`);
  });

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
