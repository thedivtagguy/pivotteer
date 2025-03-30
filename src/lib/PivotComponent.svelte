<script>
  import { onMount } from 'svelte';
  import { WebR } from 'webr';
  import Papa from 'papaparse';

  import Logo from '$lib/assets/logo.webp'
  // Add type definitions for variables
  /** @type {WebR | null} */
  let webR = null;
  let isLoading = true;
  let dragActive = false;
  /** @type {File | null} */
  let file = null;
  /** @type {Array<Record<string, any>> | null} */
  let data = null;
  /** @type {string[]} */
  let columns = [];
  /** @type {string[]} */
  let selectedColumns = [];
  let pivotType = 'wider'; // or 'longer'
  let nameColumn = '';
  let valueColumn = '';
  /** @type {string[]} */
  let idColumns = [];
  let errorMessage = '';
  /** @type {Array<Record<string, any>> | null} */
  let transformedData = null;
  let transformedCsv = '';
  let showPreview = true;
  
  // Example data for visual previews
  const wideExample = [
    { id: 1, name: 'John', age: 30, city: 'NY' },
    { id: 2, name: 'Jane', age: 25, city: 'LA' }
  ];
  
  const longExample = [
    { id: 1, variable: 'name', value: 'John' },
    { id: 1, variable: 'age', value: '30' },
    { id: 1, variable: 'city', value: 'NY' },
    { id: 2, variable: 'name', value: 'Jane' },
    { id: 2, variable: 'age', value: '25' },
    { id: 2, variable: 'city', value: 'LA' }
  ];

  onMount(async () => {
    try {
      webR = new WebR();
      await webR.init();
      
      // Load required R packages
      await webR.evalR(`
        webr::shim_install()
        install.packages(c("tidyr", "dplyr", "readr"))
        library(tidyr)
        library(dplyr)
        library(readr)
      `);
      
      isLoading = false;
    } catch (error) {
      errorMessage = `Error initializing webR: ${error instanceof Error ? error.message : String(error)}`;
      isLoading = false;
    }
  });

  /**
   * Handle file upload event
   * @param {Event} event - The file upload event
   */
  async function handleFileUpload(event) {
    try {
      const inputElement = /** @type {HTMLInputElement} */ (event.target);
      if (inputElement.files && inputElement.files.length > 0) {
        file = inputElement.files[0];
      }
      
      if (!file) return;

      errorMessage = '';
      isLoading = true;

      // Read the file content first to detect the delimiter
      const fileContent = await file.text();
      
      // Try to detect the delimiter by looking at the first line
      const firstLine = fileContent.split('\n')[0];
      let delimiter = ',';
      if (firstLine.includes('\t')) {
        delimiter = '\t';
      } else if (firstLine.includes(';')) {
        delimiter = ';';
      }

      // Parse CSV file using PapaParse with more flexible options
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        delimiter: delimiter,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value ? value.toString().trim() : '',
        complete: function(results) {
          if (results.errors.length > 0) {
            // Provide more helpful error messages
            const error = results.errors[0];
            let errorMsg = 'Error parsing CSV: ';
            
            if (error.code === 'TooFewFields') {
              errorMsg += `Row ${(error.row ?? 0) + 1} has fewer columns than expected. `;
              errorMsg += `This might be due to missing delimiters or incorrect line endings. `;
              errorMsg += `Please check if your CSV file is properly formatted.`;
            } else if (error.code === 'TooManyFields') {
              errorMsg += `Row ${(error.row ?? 0) + 1} has more columns than expected. `;
              errorMsg += `This might be due to unescaped delimiters in your data. `;
              errorMsg += `Please check if your CSV file is properly formatted.`;
            } else {
              errorMsg += error.message;
            }
            
            errorMessage = errorMsg;
            isLoading = false;
            return;
          }

          if (!results.data || results.data.length === 0) {
            errorMessage = 'The CSV file appears to be empty or contains no valid data.';
            isLoading = false;
            return;
          }

          // Validate that all rows have the same number of columns
          const firstRowCols = Object.keys(results.data[0] || {}).length;
          const inconsistentRows = results.data.filter(row => 
            Object.keys(row).length !== firstRowCols
          );

          if (inconsistentRows.length > 0) {
            errorMessage = `Found ${inconsistentRows.length} rows with inconsistent number of columns. `;
            errorMessage += `Please check if your CSV file is properly formatted.`;
            isLoading = false;
            return;
          }

          data = results.data;
          columns = Object.keys(results.data[0] || {});
          isLoading = false;
        },
        error: function(error) {
          errorMessage = `Error reading file: ${error.message}. Please check if the file is not corrupted.`;
          isLoading = false;
        }
      });
    } catch (error) {
      errorMessage = `Error handling file: ${error instanceof Error ? error.message : String(error)}`;
      isLoading = false;
    }
  }

  /**
   * @param {DragEvent} e
   */
  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dragActive = true;
  }

  /**
   * @param {DragEvent} e
   */
  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragActive = false;
  }

  /**
   * @param {DragEvent} e
   */
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * @param {DragEvent} e
   */
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dragActive = false;
    
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      file = e.dataTransfer.files[0];
      // Create a mock event that works with our handleFileUpload function
      const mockEvent = new Event('change');
      const mockTarget = { files: e.dataTransfer.files };
      Object.defineProperty(mockEvent, 'target', { value: mockTarget });
      handleFileUpload(mockEvent);
    }
  }

  /**
   * @param {string} column
   */
  function toggleColumnSelection(column) {
    if (selectedColumns.includes(column)) {
      selectedColumns = selectedColumns.filter(col => col !== column);
    } else {
      selectedColumns = [...selectedColumns, column];
    }
  }

  /**
   * @param {string} column
   */
  function toggleIdColumn(column) {
    if (idColumns.includes(column)) {
      idColumns = idColumns.filter(col => col !== column);
    } else {
      idColumns = [...idColumns, column];
    }
  }

  function togglePreview() {
    showPreview = !showPreview;
  }

  async function transformData() {
    try {
      if (!data || columns.length === 0) {
        errorMessage = 'Please upload a CSV file first';
        return;
      }

      if (pivotType === 'wider' && (!nameColumn || !valueColumn)) {
        errorMessage = 'Please select name and value columns for pivot_wider';
        return;
      }

      if (pivotType === 'longer' && selectedColumns.length === 0) {
        errorMessage = 'Please select columns to pivot';
        return;
      }

      isLoading = true;
      errorMessage = '';

      // Clean the data to ensure it only contains simple values
      const cleanData = data.map(row => {
        /** @type {Record<string, string>} */
        const cleanRow = {};
        for (const key of Object.keys(row)) {
          // Convert any complex values to strings, handle null/undefined
          const value = row[key];
          cleanRow[key] = value === null || value === undefined ? '' : String(value);
        }
        return cleanRow;
      });

      // Convert the cleaned data to CSV string
      const csvString = Papa.unparse(cleanData, {
        header: true,
        quotes: true // Force quotes around all fields
      });

      // FIX: Instead of trying to use a file object directly, we'll create a temporary file in WebR's filesystem
      if (!webR) {
        throw new Error('WebR is not initialized');
      }

      // Write the CSV string to a file in WebR's virtual filesystem
      // Make sure to escape both quotes and newlines for R
      const escapedCsvString = csvString.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      await webR.evalR(`
        input_data <- "${escapedCsvString}"
        write(input_data, file = "input.csv")
      `);
      
      let rCode = '';
      
      if (pivotType === 'wider') {
        const escapedNameCol = nameColumn.replace(/"/g, '\\"');
        const escapedValueCol = valueColumn.replace(/"/g, '\\"');
        const idColsString = idColumns.length > 0 
          ? `c(${idColumns.map(col => `"${col.replace(/"/g, '\\"')}"`).join(', ')})` 
          : 'NULL';
        
        rCode = `
          transform_result <- tryCatch({
            df <- read.csv("input.csv", stringsAsFactors = FALSE, check.names = FALSE)
            result <- df %>%
              pivot_wider(
                id_cols = ${idColsString},
                names_from = "${escapedNameCol}",
                values_from = "${escapedValueCol}",
                names_sep = "_",
                names_repair = "check_unique"
              )
            write.csv(result, "result.csv", row.names = FALSE, quote = TRUE)
            result
          }, error = function(e) {
            stop(paste("Error in pivot_wider:", e$message))
          })
        `;
      } else {
        const colsToUnpivot = selectedColumns.map(col => `"${col.replace(/"/g, '\\"')}"`).join(', ');
        
        rCode = `
          transform_result <- tryCatch({
            df <- read.csv("input.csv", stringsAsFactors = FALSE, check.names = FALSE)
            result <- df %>%
              pivot_longer(
                cols = c(${colsToUnpivot}),
                names_to = "variable",
                values_to = "value",
                names_repair = "check_unique"
              )
            write.csv(result, "result.csv", row.names = FALSE, quote = TRUE)
            result
          }, error = function(e) {
            stop(paste("Error in pivot_longer:", e$message))
          })
        `;
      }

      try {
        // Execute the R code
        await webR.evalR(rCode);
        
        // Read the result as a string with proper encoding
        const resultCsvBuffer = await webR.FS.readFile('result.csv');
        const textDecoder = new TextDecoder('utf-8');
        transformedCsv = textDecoder.decode(resultCsvBuffer);
        
        // Parse the CSV content using PapaParse
        const parsedResult = Papa.parse(transformedCsv, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });

        if (parsedResult.errors && parsedResult.errors.length > 0) {
          throw new Error(`Error parsing transformed data: ${parsedResult.errors[0].message}`);
        }

        transformedData = parsedResult.data;
        isLoading = false;
      } catch (error) {
        console.error('R Error:', error);
        throw new Error(`Error transforming data: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      errorMessage = `Error transforming data: ${error instanceof Error ? error.message : String(error)}`;
      isLoading = false;
    }
  }

  function downloadTransformedCsv() {
    if (!transformedCsv) return;
    
    const blob = new Blob([transformedCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transformed_${file ? file.name : 'data.csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function resetApp() {
    file = null;
    data = null;
    columns = [];
    selectedColumns = [];
    nameColumn = '';
    valueColumn = '';
    idColumns = [];
    transformedData = null;
    transformedCsv = '';
    errorMessage = '';
  }
</script>

<div class="flex h-[calc(90vh)] bg-white">
  <!-- Sidebar -->
  <div class="w-64 bg-white border-r border-black overflow-y-auto">
    <div class="p-3 border-b border-black">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold tracking-tight">PIVOTTEER</h2>
        <img src={Logo} alt="Pivotteer Logo" width="120" />
      </div>
      <p class="text-xs text-gray-600 mt-1">Transform data between wide and long formats</p>
    </div>

    {#if isLoading}
      <div class="flex justify-center items-center p-3 bg-gray-50 text-black">
        <svg class="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-xs">Processing...</span>
      </div>
    {:else if errorMessage}
      <div class="p-3 bg-red-50 border-l-2 border-red-500 text-red-700">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-3 w-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div class="ml-2">
            <p class="text-[10px]">{errorMessage}</p>
            <button class="mt-1 text-[10px] font-medium text-red-600 hover:text-red-500 focus:outline-none" on:click={() => errorMessage = ''}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    {/if}

    <div class="p-3 space-y-3">
      <div class="grid grid-cols-1 gap-2">
        <button 
          class="w-full border border-black transition-all duration-200 {pivotType === 'wider' ? 'bg-black text-white' : 'bg-white text-black'} {!data ? 'opacity-50 cursor-not-allowed' : ''}"
          on:click={() => pivotType = 'wider'}
          disabled={!data}
        >
          <div class="p-2 border-b border-{pivotType === 'wider' ? 'white' : 'black'} flex items-center justify-between">
            <h4 class="text-xs font-medium">Wide Format</h4>
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </div>
          <div class="p-2">
            <table class="w-full border-collapse border border-{pivotType === 'wider' ? 'white' : 'black'}">
              <thead>
                <tr>
                  <th class="border border-{pivotType === 'wider' ? 'white' : 'black'} p-1 text-left text-[10px] font-medium">id</th>
                  <th class="border border-{pivotType === 'wider' ? 'white' : 'black'} p-1 text-left text-[10px] font-medium">name</th>
                  <th class="border border-{pivotType === 'wider' ? 'white' : 'black'} p-1 text-left text-[10px] font-medium">age</th>
                  <th class="border border-{pivotType === 'wider' ? 'white' : 'black'} p-1 text-left text-[10px] font-medium">city</th>
                </tr>
              </thead>
              <tbody>
                {#each wideExample as row}
                  <tr>
                    <td class="border border-{pivotType === 'wider' ? 'white' : 'black'} p-1 text-[10px]">{row.id}</td>
                    <td class="border border-{pivotType === 'wider' ? 'white' : 'black'} p-1 text-[10px]">{row.name}</td>
                    <td class="border border-{pivotType === 'wider' ? 'white' : 'black'} p-1 text-[10px]">{row.age}</td>
                    <td class="border border-{pivotType === 'wider' ? 'white' : 'black'} p-1 text-[10px]">{row.city}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </button>

        <button 
          class="w-full border border-black transition-all duration-200 {pivotType === 'longer' ? 'bg-black text-white' : 'bg-white text-black'} {!data ? 'opacity-50 cursor-not-allowed' : ''}"
          on:click={() => pivotType = 'longer'}
          disabled={!data}
        >
          <div class="p-2 border-b border-{pivotType === 'longer' ? 'white' : 'black'} flex items-center justify-between">
            <h4 class="text-xs font-medium">Long Format</h4>
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </div>
          <div class="p-2">
            <table class="w-full border-collapse border border-{pivotType === 'longer' ? 'white' : 'black'}">
              <thead>
                <tr>
                  <th class="border border-{pivotType === 'longer' ? 'white' : 'black'} p-1 text-left text-[10px] font-medium">id</th>
                  <th class="border border-{pivotType === 'longer' ? 'white' : 'black'} p-1 text-left text-[10px] font-medium">variable</th>
                  <th class="border border-{pivotType === 'longer' ? 'white' : 'black'} p-1 text-left text-[10px] font-medium">value</th>
                </tr>
              </thead>
              <tbody>
                {#each longExample as row}
                  <tr>
                    <td class="border border-{pivotType === 'longer' ? 'white' : 'black'} p-1 text-[10px]">{row.id}</td>
                    <td class="border border-{pivotType === 'longer' ? 'white' : 'black'} p-1 text-[10px]">{row.variable}</td>
                    <td class="border border-{pivotType === 'longer' ? 'white' : 'black'} p-1 text-[10px]">{row.value}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </button>
      </div>

      {#if data && columns.length > 0}
        <div class="space-y-3">
          {#if pivotType === 'wider'}
            <div class="space-y-3">
              <div>
                <label class="block text-[10px] font-medium text-gray-700 mb-1">
                  Name Column
                </label>
                <select 
                  bind:value={nameColumn}
                  class="block w-full px-2 py-1 text-[10px] border border-gray-200 focus:outline-none focus:border-black"
                >
                  <option value="">Select a column</option>
                  {#each columns as column}
                    <option value={column}>{column}</option>
                  {/each}
                </select>
              </div>
              
              <div>
                <label class="block text-[10px] font-medium text-gray-700 mb-1">
                  Value Column
                </label>
                <select 
                  bind:value={valueColumn}
                  class="block w-full px-2 py-1 text-[10px] border border-gray-200 focus:outline-none focus:border-black"
                >
                  <option value="">Select a column</option>
                  {#each columns as column}
                    <option value={column}>{column}</option>
                  {/each}
                </select>
              </div>
              
              <div>
                <label class="block text-[10px] font-medium text-gray-700 mb-1">
                  ID Columns
                </label>
                <div class="grid grid-cols-2 gap-1">
                  {#each columns as column}
                    {#if column !== nameColumn && column !== valueColumn}
                      <div class="flex items-center">
                        <input 
                          type="checkbox" 
                          id={`id-${column}`}
                          checked={idColumns.includes(column)} 
                          on:change={() => toggleIdColumn(column)}
                          class="h-2.5 w-2.5 text-black focus:ring-black border-gray-300 rounded"
                        >
                        <label for={`id-${column}`} class="ml-1 text-[10px] text-gray-700">
                          {column}
                        </label>
                      </div>
                    {/if}
                  {/each}
                </div>
              </div>
            </div>
          {:else}
            <div>
              <label class="block text-[10px] font-medium text-gray-700 mb-1">
                Select Columns
              </label>
              <div class="grid grid-cols-2 gap-1">
                {#each columns as column}
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      id={`col-${column}`}
                      checked={selectedColumns.includes(column)} 
                      on:change={() => toggleColumnSelection(column)}
                      class="h-2.5 w-2.5 text-black focus:ring-black border-gray-300 rounded"
                    >
                    <label for={`col-${column}`} class="ml-1 text-[10px] text-gray-700">
                      {column}
                    </label>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <button 
            type="button" 
            on:click={transformData} 
            disabled={isLoading}
            class="w-full inline-flex justify-center items-center px-3 py-2 text-[10px] font-medium border border-black text-black hover:bg-black hover:text-white focus:outline-none focus:ring-1 focus:ring-black disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? 'Processing...' : 'Transform Data'}
          </button>
        </div>
      {/if}

      {#if data}
        <button 
          type="button" 
          on:click={resetApp}
          class="w-full inline-flex justify-center items-center px-3 py-2 text-[10px] font-medium border border-gray-300 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors duration-200"
        >
          <svg class="-ml-1 mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
      {/if}
    </div>
  </div>

  <!-- Main Content Area -->
  <div class="flex-1 overflow-auto bg-white">
    {#if !data || columns.length === 0}
      <div class="h-full flex items-center justify-center">
        <div 
          class="text-center p-4 border border-dashed cursor-pointer hover:border-gray-400 transition-colors duration-200"
          on:dragenter={handleDragEnter}
          on:dragleave={handleDragLeave}
          on:dragover={handleDragOver}
          on:drop={handleDrop}
          on:click={() => document.getElementById('fileInput')?.click()}
        >
          <svg class="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Upload your data</h3>
          <p class="mt-1 text-xs text-gray-500">Drag and drop a CSV file here, or click to select</p>
          <p class="mt-1 text-[10px] text-gray-400">
            CSV, TSV, TXT supported
          </p>
        </div>
        <input
          type="file"
          id="fileInput"
          accept=".csv,.tsv,.txt,.json"
          on:change={handleFileUpload}
          class="hidden"
        />
      </div>
    {:else if transformedData}
      <div class="p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-xs font-medium text-gray-800">Transformed Data Preview</h3>
          <button 
            type="button" 
            on:click={downloadTransformedCsv}
            class="inline-flex items-center px-3 py-1.5 border border-black text-xs font-medium text-black hover:bg-black hover:text-white focus:outline-none focus:ring-1 focus:ring-black transition-colors duration-200"
          >
            <svg class="-ml-1 mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Download CSV
          </button>
        </div>
        
        <div class="border border-gray-200 overflow-auto">
          {#if transformedData.length > 0}
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  {#each Object.keys(transformedData[0] || {}) as header}
                    <th class="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider">{header}</th>
                  {/each}
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each transformedData.slice(0, 10) as row}
                  <tr class="hover:bg-gray-50">
                    {#each Object.keys(transformedData[0] || {}) as key}
                      <td class="px-3 py-2 text-[10px] text-gray-500 max-w-xs truncate">{row[key]}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
            
            {#if transformedData.length > 10}
              <div class="px-3 py-2 text-[10px] text-gray-600 bg-gray-50 border-t border-gray-200">
                Showing first 10 of {transformedData.length} rows
              </div>
            {/if}
          {:else}
            <div class="p-3 text-[10px] text-gray-600">
              No data to display
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-xs font-medium text-gray-800">Data Preview</h3>
        </div>
        
        <div class="border border-gray-200 overflow-auto">
          {#if data.length > 0}
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  {#each columns as header}
                    <th class="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase tracking-wider">{header}</th>
                  {/each}
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each data.slice(0, 10) as row}
                  <tr class="hover:bg-gray-50">
                    {#each columns as key}
                      <td class="px-3 py-2 text-[10px] text-gray-500 max-w-xs truncate">{row[key]}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
            
            {#if data.length > 10}
              <div class="px-3 py-2 text-[10px] text-gray-600 bg-gray-50 border-t border-gray-200">
                Showing first 10 of {data.length} rows
              </div>
            {/if}
          {:else}
            <div class="p-3 text-[10px] text-gray-600">
              No data to display
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>