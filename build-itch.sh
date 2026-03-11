#!/bin/bash
# Build emoji98-itch.zip for itch.io upload
set -e
cd "$(dirname "$0")"
rm -f emoji98-itch.zip
zip -r emoji98-itch.zip index.html style.css js/ icons/ tutorial/
echo "Built emoji98-itch.zip ($(du -h emoji98-itch.zip | cut -f1))"
