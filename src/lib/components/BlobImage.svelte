<script lang="ts">
  let {
    blob,
    alt = '',
    class: className = '',
    mediaId,
    onload,
  }: {
    blob: Blob;
    alt?: string;
    class?: string;
    mediaId?: string;
    onload?: (event: Event) => void;
  } = $props();
  let url = $derived(URL.createObjectURL(blob));

  $effect(() => {
    // Capture the URL that belongs to this particular effect run. If `blob`
    // changes, Svelte has already evaluated the new derived URL by the time the
    // previous cleanup runs. Referring to the reactive `url` from the cleanup
    // would therefore revoke the new URL and leave the image blank (notably in
    // Safari after reloading a photo from IndexedDB).
    const objectUrl = url;
    return () => URL.revokeObjectURL(objectUrl);
  });
</script>

<img src={url} {alt} class={className} data-media-id={mediaId} {onload} />
