<script lang="ts">
  import Dialog from '@/lib/components/Dialog.svelte';
  import { createProject } from '@/lib/db/projects';
  import { appState } from '@/lib/state/app.svelte';
  let { open, close }: { open: boolean; close: () => void } = $props();
  let name = $state('');
  let address = $state('');
  let saving = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    saving = true;
    const project = await createProject(name, address);
    await appState.load(project.id);
    name = '';
    address = '';
    saving = false;
    close();
  }
</script>

<Dialog {open} title="Neues Projekt" {close}>
  <form onsubmit={submit} class="form-stack">
    <label>
      <span>Name</span>
      <input bind:value={name} placeholder="Haus Ploskow" required />
    </label>
    <label>
      <span>
        Adresse <small>optional</small>
      </span>
      <input bind:value={address} placeholder="Straße, Ort" />
    </label>
    <button class="button primary" disabled={saving}>
      {saving ? 'Wird angelegt …' : 'Projekt anlegen'}
    </button>
  </form>
</Dialog>
