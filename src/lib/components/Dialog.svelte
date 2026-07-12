<script lang="ts">
  import Icon from '@/lib/components/Icon.svelte';
  let {
    open,
    title,
    close,
    children,
  }: {
    open: boolean;
    title: string;
    close: () => void;
    children: import('svelte').Snippet;
  } = $props();
</script>

{#if open}
  <div
    class="dialog-backdrop"
    role="presentation"
    onclick={(event) => event.target === event.currentTarget && close()}
  >
    <div class="dialog" role="dialog" aria-modal="true" aria-label={title}>
      <header class="dialog-header">
        <h2>{title}</h2>
        <button class="icon-button" onclick={close} aria-label="Schließen">
          <Icon name="x" />
        </button>
      </header>
      <div class="dialog-body">{@render children()}</div>
    </div>
  </div>
{/if}
