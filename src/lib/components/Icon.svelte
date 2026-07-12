<script lang="ts">
  type Name =
    | 'add'
    | 'arrow-left'
    | 'camera'
    | 'chevron'
    | 'download'
    | 'floorplan'
    | 'image'
    | 'more'
    | 'plus'
    | 'trash'
    | 'upload'
    | 'x';
  let { name, size = 20 }: { name: Name; size?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'add' || name === 'plus'}<path d="M12 5v14M5 12h14" />
  {:else if name === 'arrow-left'}<path d="m15 18-6-6 6-6" />
  {:else if name === 'camera'}<path
      d="M14.5 5 13 3h-2L9.5 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"
    />
    <circle cx="12" cy="12" r="4" />
  {:else if name === 'chevron'}<path d="m9 18 6-6-6-6" />
  {:else if name === 'download'}<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
  {:else if name === 'floorplan'}<path
      d="M4 3h16v18H4zM4 10h7V3m0 7v5h9m-5 0v6"
    />
  {:else if name === 'image'}<rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="m3 17 5-5 4 4 3-3 6 6" />
  {:else if name === 'more'}<circle
      cx="5"
      cy="12"
      r="1"
      fill="currentColor"
      stroke="none"
    />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
  {:else if name === 'trash'}<path
      d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"
    />
  {:else if name === 'upload'}<path d="M12 16V4m0 0L8 8m4-4 4 4M4 14v6h16v-6" />
  {:else if name === 'x'}<path d="m6 6 12 12M18 6 6 18" />{/if}
</svg>
