<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{
    fileDrop: { file: File };
    fileSelect: { file: File };
  }>();

  export let dragActive = false;

  const dragHandlers = {
    enter: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragActive = true;
    },
    leave: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragActive = false;
    },
    over: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    drop: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragActive = false;
      
      if (e.dataTransfer?.files?.length > 0) {
        dispatch('fileDrop', { file: e.dataTransfer.files[0] });
      }
    }
  };

  function handleFileInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      dispatch('fileSelect', { file: inputElement.files[0] });
    }
  }
</script>

<div 
  class="text-center p-4 border border-dashed cursor-pointer hover:border-gray-400 transition-colors duration-200 w-full max-w-md"
  on:dragenter={dragHandlers.enter}
  on:dragleave={dragHandlers.leave}
  on:dragover={dragHandlers.over}
  on:drop={dragHandlers.drop}
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
  on:change={handleFileInput}
  class="hidden"
/> 