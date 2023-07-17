#!/bin/bash
set -e
npm install && npx stylelint "*.css"
