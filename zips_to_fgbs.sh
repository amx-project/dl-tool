#!/bin/bash -e

# Convert each zip file to its own FGB file.
# Requires https://github.com/ciscorn/mojxml-py

mkdir -p ./fgbs

# Find all zip files in the zips directory
find ./zips -name '*.zip' | while read -r zipfile
do
  # Get the base name of the zip file (e.g., 01100_2023)
  BASENAME=$(basename "$zipfile" .zip)
  echo "Processing $zipfile..."
  # Generate the output FGB file path
  OUTPUT_FGB="./fgbs/${BASENAME}.fgb"
  # Run the conversion tool
  mojxml2ogr "$OUTPUT_FGB" "$zipfile"
done

echo "All zip files processed."

