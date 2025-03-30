<script>
  import { onMount } from 'svelte';
  import { WebR } from 'webr';
  import Papa from 'papaparse';

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
  let advancedOptions = false;
  let showPreview = true;
  
  // Type definitions for widerOptions
  /** @type {{namesPrefix: string, namesSep: string, namesRepair: string, valuesFrom: string[], valuesPrefix: string, valuesFill: any, valuesPartial: any}} */
  let widerOptions = {
    namesPrefix: '',
    namesSep: '_',
    namesRepair: 'check_unique',
    valuesFrom: [],
    valuesPrefix: '',
    valuesFill: null,
    valuesPartial: null
  };
  
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
  
  // Advanced options for pivot_longer
  let longerOptions = {
    namesTo: 'name',
    valuesTo: 'value',
    namesPrefix: null,
    namesSep: null,
    namesPattern: null,
    namesRepair: 'check_unique',
    valuesTransform: null,
    namesTransform: null
  };

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

      // Parse CSV file using PapaParse with proper file handling
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: function(results) {
          if (results.errors.length > 0) {
            errorMessage = `Error parsing CSV: ${results.errors[0].message}`;
            isLoading = false;
            return;
          }

          data = results.data;
          columns = Object.keys(results.data[0] || {});
          isLoading = false;
        },
        error: function(error) {
          errorMessage = `Error reading file: ${error.message}`;
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
  
  /**
   * @param {string} column
   */
  function toggleValueFromColumn(column) {
    if (widerOptions.valuesFrom.includes(column)) {
      widerOptions.valuesFrom = widerOptions.valuesFrom.filter(col => col !== column);
    } else {
      widerOptions.valuesFrom = [...widerOptions.valuesFrom, column];
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
</script>

<div class="flex h-screen bg-gray-100">
  <!-- Sidebar -->
  <div class="w-96 bg-white border-r border-gray-200 overflow-y-auto">
    <div class="p-4 border-b border-gray-200">
      <h2 class="text-xl font-semibold text-gray-800">Pivotteer</h2>
      <p class="text-sm text-gray-600">Transform your data between wide and long formats</p>
    </div>

    {#if isLoading}
      <div class="flex justify-center items-center p-8 bg-blue-50 text-blue-600">
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Processing...</span>
      </div>
    {:else if errorMessage}
      <div class="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm">{errorMessage}</p>
            <button class="mt-2 text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none" on:click={() => errorMessage = ''}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    {/if}

    {#if !data || columns.length === 0}
      <div 
        class="p-4 {dragActive ? 'bg-blue-50' : 'bg-gray-50'} transition-colors duration-200 cursor-pointer"
        on:dragenter={handleDragEnter}
        on:dragleave={handleDragLeave}
        on:dragover={handleDragOver}
        on:drop={handleDrop}
        on:click={() => document.getElementById('fileInput')?.click()}
      >
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <p class="mt-1 text-sm text-gray-600">
            Drag and drop a data file here, or click to select
          </p>
          <p class="mt-1 text-xs text-gray-500">
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
    {:else}
      <div class="p-4">
       

        <div class="space-y-4">
          <button 
            class="w-full p-4 border-2 rounded-lg transition-all duration-200 {pivotType === 'wider' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}"
            on:click={() => pivotType = 'wider'}
          >
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-lg font-medium text-gray-900">Wide Format</h4>
              <svg class="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </div>
            <p class="text-sm text-gray-600 mb-2">Convert long data into a wide table with columns for each value</p>
            <div class="text-xs bg-white p-2 rounded border">
              <table class="w-full">
                <thead>
                  <tr>
                    <th class="border p-1">id</th>
                    <th class="border p-1">name</th>
                    <th class="border p-1">age</th>
                    <th class="border p-1">city</th>
                  </tr>
                </thead>
                <tbody>
                  {#each wideExample as row}
                    <tr>
                      <td class="border p-1">{row.id}</td>
                      <td class="border p-1">{row.name}</td>
                      <td class="border p-1">{row.age}</td>
                      <td class="border p-1">{row.city}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </button>

          <button 
            class="w-full p-4 border-2 rounded-lg transition-all duration-200 {pivotType === 'longer' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}"
            on:click={() => pivotType = 'longer'}
          >
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-lg font-medium text-gray-900">Long Format</h4>
              <svg class="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </div>
            <p class="text-sm text-gray-600 mb-2">Convert wide data into a long table with rows for each value</p>
            <div class="text-xs bg-white p-2 rounded border">
              <table class="w-full">
                <thead>
                  <tr>
                    <th class="border p-1">id</th>
                    <th class="border p-1">variable</th>
                    <th class="border p-1">value</th>
                  </tr>
                </thead>
                <tbody>
                  {#each longExample as row}
                    <tr>
                      <td class="border p-1">{row.id}</td>
                      <td class="border p-1">{row.variable}</td>
                      <td class="border p-1">{row.value}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </button>
        </div>

        <div class="mt-6">
          {#if pivotType === 'wider'}
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Name Column
                  <span class="text-xs text-gray-500 block">Values from this column will become new column names</span>
                </label>
                <select 
                  bind:value={nameColumn}
                  class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">Select a column</option>
                  {#each columns as column}
                    <option value={column}>{column}</option>
                  {/each}
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Value Column
                  <span class="text-xs text-gray-500 block">Values from this column will fill the new columns</span>
                </label>
                <select 
                  bind:value={valueColumn}
                  class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">Select a column</option>
                  {#each columns as column}
                    <option value={column}>{column}</option>
                  {/each}
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  ID Columns
                  <span class="text-xs text-gray-500 block">Select columns that identify unique rows</span>
                </label>
                <div class="grid grid-cols-2 gap-2">
                  {#each columns as column}
                    {#if column !== nameColumn && column !== valueColumn}
                      <div class="flex items-center">
                        <input 
                          type="checkbox" 
                          id={`id-${column}`}
                          checked={idColumns.includes(column)} 
                          on:change={() => toggleIdColumn(column)}
                          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        >
                        <label for={`id-${column}`} class="ml-2 text-sm text-gray-700">
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
             
              <div class="grid grid-cols-2 gap-2">
                {#each columns as column}
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      id={`col-${column}`}
                      checked={selectedColumns.includes(column)} 
                      on:change={() => toggleColumnSelection(column)}
                      class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    >
                    <label for={`col-${column}`} class="ml-2 text-sm text-gray-700">
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
            class="mt-6 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Transform Data'}
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Main Content Area -->
  <div class="flex-1 overflow-auto bg-white">
    {#if !data || columns.length === 0}
      <div class="h-full flex items-center justify-center">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No data loaded</h3>
          <p class="mt-1 text-sm text-gray-500">Upload a CSV file to get started</p>
        </div>
      </div>
    {:else if transformedData}
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-800">Transformed Data Preview</h3>
          <button 
            type="button" 
            on:click={downloadTransformedCsv}
            class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg class="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Download CSV
          </button>
        </div>
        
        <div class="bg-gray-50 rounded-md border border-gray-200 overflow-auto">
          {#if transformedData.length > 0}
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-100">
                <tr>
                  {#each Object.keys(transformedData[0] || {}) as header}
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">{header}</th>
                  {/each}
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each transformedData.slice(0, 10) as row}
                  <tr class="hover:bg-gray-50">
                    {#each Object.keys(transformedData[0] || {}) as key}
                      <td class="px-3 py-2 text-sm text-gray-500 max-w-xs truncate">{row[key]}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
            
            {#if transformedData.length > 10}
              <div class="px-3 py-2 text-sm text-gray-600 bg-gray-50 border-t border-gray-200">
                Showing first 10 of {transformedData.length} rows
              </div>
            {/if}
          {:else}
            <div class="p-4 text-sm text-gray-600">
              No data to display
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-800">Data Preview</h3>
        </div>
        
        <div class="bg-gray-50 rounded-md border border-gray-200 overflow-auto">
          {#if data.length > 0}
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-100">
                <tr>
                  {#each columns as header}
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">{header}</th>
                  {/each}
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each data.slice(0, 10) as row}
                  <tr class="hover:bg-gray-50">
                    {#each columns as key}
                      <td class="px-3 py-2 text-sm text-gray-500 max-w-xs truncate">{row[key]}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
            
            {#if data.length > 10}
              <div class="px-3 py-2 text-sm text-gray-600 bg-gray-50 border-t border-gray-200">
                Showing first 10 of {data.length} rows
              </div>
            {/if}
          {:else}
            <div class="p-4 text-sm text-gray-600">
              No data to display
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>