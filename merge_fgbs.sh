#!/bin/bash -e

# Define default values
DEFAULT_INPUT_DIR="./fgbs"
DEFAULT_PG_TABLE="mojxml"

# Parse command line arguments
if [ "$#" -lt 1 ] || [ "$#" -gt 3 ]; then
    echo "Usage: $0 <PostgreSQL Connection String> [Input Directory] [Table Name]"
    echo "Example: $0 \"PG:dbname=your_db host=localhost user=your_user\" \"./my_fgbs\" \"my_table\""
    exit 1
fi

# Assign arguments to variables
PG_CONN_STRING="$1"
INPUT_DIR="${2:-$DEFAULT_INPUT_DIR}"  # Use default if not provided
PG_TABLE="${3:-$DEFAULT_PG_TABLE}"    # Use default if not provided

# Check if input directory exists
if [ ! -d "$INPUT_DIR" ]; then
  echo "Error: Input directory '$INPUT_DIR' not found."
  exit 1
fi

# Find all .fgb files in the input directory
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
REMAINING_FGB_FILES=$(echo "$FGB_FILES" | tail -n +2)

# Check if there are remaining files to process
if [ -n "$REMAINING_FGB_FILES" ]; then
    echo "Appending remaining files in parallel (max $MAX_PROCESSES processes)..."
    # Use GNU parallel with progress bar
    echo "$REMAINING_FGB_FILES" | parallel --bar \
        "ogr2ogr -f PostgreSQL -update -append '$PG_CONN_STRING' {} -nln '$PG_TABLE' --config PG_USE_COPY=YES"
else
    echo "Only one file found, no parallel appending needed."
fi

echo "Append complete. Data added to table '$PG_TABLE' using connection: $PG_CONN_STRING"

exit 0

