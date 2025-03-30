# Pivotteer

A Svelte web application that allows users to transform CSV data between wide and long formats using R's pivot functions from dplyr, powered by webR.

## Features

- Drag and drop or upload CSV files
- Convert data from wide to long format (pivot_longer)
- Convert data from long to wide format (pivot_wider)
- Preview transformed data
- Download results as CSV

## Development

This project uses SvelteKit and webR (R in WebAssembly).

### Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Build for production:
   ```bash
   pnpm build
   ```
