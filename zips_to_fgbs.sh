#!/bin/bash -e

# Convert each zip file to its own FGB file.
# Requires https://github.com/ciscorn/mojxml-py

mkdir -p ./fgbs

# Find all zip files in the zips directory
find ./zips -name '*.zip' | while read -r zipfile
do
  # Get the base name of the zip file (e.g., 01100_2023)
  BASENAME=$(basename "$zipfile" .zip)
  # Generate the output FGB file path
  OUTPUT_FGB="./fgbs/${BASENAME}.fgb"

  # Check if the output file already exists
  if [ -f "$OUTPUT_FGB" ]; then
    echo "Skipping $zipfile, $OUTPUT_FGB already exists."
    continue
  fi

  echo "Processing $zipfile..."
  # Run the conversion tool
  mojxml-rs "$OUTPUT_FGB" "$zipfile"
done

echo "All zip files processed."

