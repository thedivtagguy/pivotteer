<script>
  import PivotComponent from '$lib/PivotComponent.svelte';
</script>

<svelte:head>
  <title>Pivotteer</title>
  <meta name="description" content="Transform data between wide and long formats">
  <meta name="author" content="Aman Bhargava">
  <meta name="keywords" content="pivot, data, transform, wide, long, format, data transformation, data transformation tool, data transformation software, data transformation service, data transformation company, data transformation consultant, data transformation expert, data transformation tool, data transformation software, data transformation service, data transformation company, data transformation consultant, data transformation expert">
  <meta name="robots" content="index, follow">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#000000">
  <meta name="msapplication-navbutton-color" content="#000000">
  <meta property="og:title" content="Pivotteer">
  <meta property="og:description" content="Transform data between wide and long formats">
  <meta property="og:image" content="/sharecard.jpg">
  <meta property="og:url" content="https://pivotteer.netlify.app">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Pivotteer">
  <meta name="twitter:description" content="Transform data between wide and long formats">
  <meta name="twitter:image" content="/sharecard.jpg">
</svelte:head>

<div class="max-w-6xl mx-auto px-4 py-8">

  
  <div class="bg-white border border-black overflow-hidden">
    <PivotComponent />
  </div>
  <div class="text-right mt-2">
    <p class="text-xs text-gray-500">
       <!-- <a href="https://aman.bh" class="underline hover:text-gray-700">Aman Bhargava</a>  -->
      This is a static site, no data is sent to any servers. Built with Svelte and webR
      (<a href="https://github.com/thedivtagguy/pivotteer" class="underline hover:text-gray-700">GitHub</a>) · 
      <span class="text-gray-400">CC-BY-SA</span>
    </p>
  </div>
</div>