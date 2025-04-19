#!/bin/bash -e

# Define input directory
INPUT_DIR="./fgbs"
# Define the target table name
PG_TABLE="mojxml"
# Define the maximum number of parallel processes for appending
MAX_PROCESSES=20

# Check for connection string argument
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <PostgreSQL Connection String>"
    echo "Example: $0 \"PG:dbname=your_db host=localhost user=your_user\""
    exit 1
fi

# Assign argument to variable
PG_CONN_STRING="$1"

# Check if input directory exists
if [ ! -d "$INPUT_DIR" ]; then
  echo "Error: Input directory '$INPUT_DIR' not found."
  exit 1
fi

# Find all .fgb files in the input directory
# Use find and sort for consistent processing order (optional but good practice)
FGB_FILES=$(find "$INPUT_DIR" -maxdepth 1 -name '*.fgb' -print0 | sort -z | tr '\0' '\n')

# Check if any .fgb files were found
if [ -z "$FGB_FILES" ]; then
  echo "No .fgb files found in $INPUT_DIR"
  exit 0
fi

# Drop the table if it exists before starting the import
echo "Dropping table '$PG_TABLE' if it exists..."
ogrinfo "$PG_CONN_STRING" -sql "DROP TABLE IF EXISTS \"$PG_TABLE\";"

# Process the first file to create the table
FIRST_FGB_FILE=$(echo "$FGB_FILES" | head -n 1)
echo "Processing first file to create table: $FIRST_FGB_FILE..."
ogr2ogr -f PostgreSQL "$PG_CONN_STRING" "$FIRST_FGB_FILE" -nln "$PG_TABLE" --config PG_USE_COPY=YES

# Get the list of remaining files (skip the first one)
# Use tail +2 with process substitution for null-separated input
REMAINING_FGB_FILES=$(echo "$FGB_FILES" | tail -n +2)

# Check if there are remaining files to process
if [ -n "$REMAINING_FGB_FILES" ]; then
    echo "Appending remaining files in parallel (max $MAX_PROCESSES processes)..."
    # Use printf and xargs for parallel processing
    # The -I {} replaces {} with each input file path
    # The sh -c '...' executes the ogr2ogr command for each file
    printf '%s' "$REMAINING_FGB_FILES" | xargs -d '\n' -I {} -P "$MAX_PROCESSES" sh -c \
        'echo "Appending {}..." && ogr2ogr -f PostgreSQL -update -append "$1" "{}" -nln "$2" --config PG_USE_COPY=YES' \
        sh "$PG_CONN_STRING" "$PG_TABLE"
else
    echo "Only one file found, no parallel appending needed."
fi

echo "Append complete. Data added to table '$PG_TABLE' using connection: $PG_CONN_STRING"

exit 0

