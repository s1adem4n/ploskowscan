<script lang="ts">
  import Dialog from '@/lib/components/Dialog.svelte';
  import { createArea, createLevel } from '@/lib/db/projects';
  import { appState } from '@/lib/state/app.svelte';
  import type { AreaKind } from '@/lib/types/project';
  let {
    open,
    mode,
    close,
  }: { open: boolean; mode: 'level' | 'area'; close: () => void } = $props();
  let name = $state('');
  let kind = $state<AreaKind>('room');

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!name.trim() || !appState.projectId) return;
    if (mode === 'level') {
      const item = await createLevel(appState.projectId, name);
      await appState.load();
      appState.selectLevel(item.id);
    } else if (appState.levelId) {
      const item = await createArea(
        appState.projectId,
        appState.levelId,
        name,
        kind,
      );
      await appState.load();
      appState.selectArea(item.id);
    }
    name = '';
    kind = 'room';
    close();
  }
</script>

<Dialog
  {open}
  title={mode === 'level' ? 'Geschoss hinzufügen' : 'Bereich hinzufügen'}
  {close}
>
  <form onsubmit={submit} class="form-stack">
    <label>
      <span>Name</span>
      <input
        bind:value={name}
        placeholder={mode === 'level' ? 'Obergeschoss' : 'Küche'}
        required
      />
    </label>
    {#if mode === 'area'}
      <label>
        <span>Art</span>
        <select bind:value={kind}>
          <option value="room">Raum</option>
          <option value="outside">Außenbereich</option>
          <option value="other">Sonstiges</option>
        </select>
      </label>
    {/if}
    <button class="button primary">Hinzufügen</button>
  </form>
</Dialog>
