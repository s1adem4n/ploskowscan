<script lang="ts">
  let {
    blob,
    alt = '',
    class: className = '',
    onload,
  }: {
    blob: Blob;
    alt?: string;
    class?: string;
    onload?: (event: Event) => void;
  } = $props();
  let url = $derived(URL.createObjectURL(blob));
  $effect(() => () => URL.revokeObjectURL(url));
</script>

<img src={url} {alt} class={className} {onload} />
