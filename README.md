# Pivotteer

A Svelte web application that allows users to transform CSV data between wide and long formats using R's pivot functions from dplyr, powered by webR.

## Features

- Drag and drop or upload CSV files
- Convert data from wide to long format (pivot_longer)
- Convert data from long to wide format (pivot_wider)
- Intuitive UI for column selection
- Preview transformed data
- Download results as CSV
- No coding required

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

## How It Works

Pivotteer uses webR to run R code in the browser, specifically utilizing dplyr and tidyr packages for data transformation. The interface provides an intuitive way to select columns and transformation options without writing any code.

### Pivot Wider (Long to Wide)

This transforms data from a long format to a wide format, similar to pivot tables. You select:
- Name column: Contains values that will become new column names
- Value column: Contains the values that will fill the new columns
- ID columns: (Optional) Identifies unique rows

### Pivot Longer (Wide to Long)

This transforms data from a wide format to a long format. You select:
- Columns to unpivot: These columns will be transformed into name-value pairs

## Technologies

- SvelteKit
- webR (R in WebAssembly)
- R packages: dplyr, tidyr, readr