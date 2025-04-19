#!/bin/bash -e

# Define input directory and output file
INPUT_DIR="./fgbs"
OUTPUT_FILE="merged.fgb"
OUTPUT_LAYER_NAME="mojxml" # Define a layer name for the output

# Check if input directory exists
if [ ! -d "$INPUT_DIR" ]; then
  echo "Error: Input directory '$INPUT_DIR' not found."
  exit 1
fi

# Remove the output file if it already exists
if [ -f "$OUTPUT_FILE" ]; then
  echo "Removing existing output file: $OUTPUT_FILE"
  rm "$OUTPUT_FILE"
fi

# Find all .fgb files in the input directory
# Use find and sort for consistent processing order (optional but good practice)
FGB_FILES=$(find "$INPUT_DIR" -maxdepth 1 -name '*.fgb' -print0 | sort -z | xargs -0)

# Check if any .fgb files were found
if [ -z "$FGB_FILES" ]; then
  echo "No .fgb files found in $INPUT_DIR"
  exit 0
fi

# Flag to track if it's the first file being processed
FIRST_FILE=true

# Loop through each .fgb file
for fgb_file in $FGB_FILES; do
  echo "Processing $fgb_file..."
  if [ "$FIRST_FILE" = true ]; then
    # Create the output file with the first input file
    # Use -nln to set the layer name in the output FGB
    ogr2ogr -f FlatGeobuf "$OUTPUT_FILE" "$fgb_file" -nln "$OUTPUT_LAYER_NAME"
    FIRST_FILE=false
  else
    # Append subsequent files to the existing output file
    # Use -update and -append flags
    ogr2ogr -f FlatGeobuf -update -append "$OUTPUT_FILE" "$fgb_file" -nln "$OUTPUT_LAYER_NAME"
  fi
done

echo "Merge complete. Output file: $OUTPUT_FILE"

exit 0

