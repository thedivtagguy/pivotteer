<script>
  import { onMount } from 'svelte';
  import * as XLSX from 'xlsx';

  let excelFile = null;
  let sheets = [];
  let selectedSheet = '';
  let errorMessage = '';
  let csvContent = '';
  let downloadUrl = '';
  let isLoading = false;

  onMount(() => {
    // XLSX is loaded via npm and available here
  });

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is Excel
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      '.xls',
      '.xlsx'
    ];
    
    const fileType = file.type;
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(fileType) && !validTypes.includes(extension)) {
      errorMessage = 'Please select an Excel file (.xls or .xlsx)';
      return;
    }

    excelFile = file;
    errorMessage = '';
    readExcelFile();
  }

  async function readExcelFile() {
    isLoading = true;
    
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get sheet names
          sheets = workbook.SheetNames;
          selectedSheet = sheets[0];
          
          isLoading = false;
        } catch (error) {
          errorMessage = `Error reading Excel file: ${error.message}`;
          isLoading = false;
        }
      };
      
      reader.onerror = () => {
        errorMessage = 'Failed to read the file';
        isLoading = false;
      };
      
      reader.readAsArrayBuffer(excelFile);
    } catch (error) {
      errorMessage = `Error handling file: ${error.message}`;
      isLoading = false;
    }
  }

  function convertToCsv() {
    if (!excelFile || !selectedSheet) {
      errorMessage = 'Please select an Excel file and sheet first';
      return;
    }
    
    isLoading = true;
    
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Convert selected sheet to CSV
          const worksheet = workbook.Sheets[selectedSheet];
          csvContent = XLSX.utils.sheet_to_csv(worksheet);
          
          // Create download URL
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          if (downloadUrl) URL.revokeObjectURL(downloadUrl);
          downloadUrl = URL.createObjectURL(blob);
          
          isLoading = false;
        } catch (error) {
          errorMessage = `Error converting to CSV: ${error.message}`;
          isLoading = false;
        }
      };
      
      reader.onerror = () => {
        errorMessage = 'Failed to read the file';
        isLoading = false;
      };
      
      reader.readAsArrayBuffer(excelFile);
    } catch (error) {
      errorMessage = `Error handling file: ${error.message}`;
      isLoading = false;
    }
  }

  function resetForm() {
    excelFile = null;
    sheets = [];
    selectedSheet = '';
    csvContent = '';
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      downloadUrl = '';
    }
  }
</script>

<div class="excel-converter">
  <h3>Convert Excel to CSV</h3>
  
  {#if errorMessage}
    <div class="error-message">
      <p>{errorMessage}</p>
      <button on:click={() => errorMessage = ''}>Dismiss</button>
    </div>
  {/if}
  
  <div class="file-input">
    <label>
      {#if excelFile}
        Selected: {excelFile.name}
        <button on:click={resetForm}>Clear</button>
      {:else}
        Select Excel File
        <input type="file" accept=".xls,.xlsx" on:change={handleFileChange} />
      {/if}
    </label>
  </div>
  
  {#if excelFile && sheets.length > 0}
    <div class="sheet-selector">
      <label>
        Select Sheet:
        <select bind:value={selectedSheet}>
          {#each sheets as sheet}
            <option value={sheet}>{sheet}</option>
          {/each}
        </select>
      </label>
      
      <button on:click={convertToCsv} disabled={isLoading}>
        {isLoading ? 'Converting...' : 'Convert to CSV'}
      </button>
    </div>
  {/if}
  
  {#if csvContent}
    <div class="result">
      <h4>CSV Preview</h4>
      <div class="csv-preview">
        <pre>{csvContent.slice(0, 500)}... {csvContent.length > 500 ? `(${(csvContent.length / 1024).toFixed(1)} KB total)` : ''}</pre>
      </div>
      
      <a href={downloadUrl} download={`${excelFile ? excelFile.name.replace(/\.[^/.]+$/, '') : 'converted'}_${selectedSheet}.csv`} class="download-button">
        Download CSV
      </a>
    </div>
  {/if}
</div>

<style>
  .excel-converter {
    background-color: #f5f5f5;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 30px;
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: 15px;
  }
  
  .error-message {
    background-color: #ffebee;
    color: #d32f2f;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .file-input {
    margin-bottom: 15px;
  }
  
  .file-input label {
    display: block;
    background-color: #e0e0e0;
    padding: 10px;
    border-radius: 4px;
    cursor: pointer;
    text-align: center;
  }
  
  .file-input input {
    display: none;
  }
  
  .sheet-selector {
    margin-bottom: 15px;
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  .sheet-selector label {
    flex-grow: 1;
  }
  
  .sheet-selector select {
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
  }
  
  .csv-preview {
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    max-height: 200px;
    overflow: auto;
    margin-bottom: 15px;
    font-size: 12px;
    white-space: pre-wrap;
  }
  
  button, .download-button {
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s;
    text-decoration: none;
    display: inline-block;
  }
  
  button:hover, .download-button:hover {
    background-color: #0b7dda;
  }
  
  button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  
  .download-button {
    display: block;
    text-align: center;
  }
</style>