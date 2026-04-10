#!/bin/bash
# This script fixes all react-router imports to react-router-dom

find . -name "*.tsx" -not -path "./node_modules/*" -exec sed -i "s/from 'react-router'/from 'react-router-dom'/g" {} +
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i "s/from 'react-router'/from 'react-router-dom'/g" {} +
find . -name "*.tsx" -not -path "./node_modules/*" -exec sed -i 's/from "react-router"/from "react-router-dom"/g' {} +
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i 's/from "react-router"/from "react-router-dom"/g' {} +

echo "All imports fixed!"
