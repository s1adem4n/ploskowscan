<script lang="ts">
  import BlobImage from '@/lib/components/BlobImage.svelte';
  import Icon from '@/lib/components/Icon.svelte';
  import { db } from '@/lib/db/database';
  import { appState } from '@/lib/state/app.svelte';
  import type { Photo } from '@/lib/types/project';
  import { createId, now } from '@/lib/utils/id';

  import PhotoEditor from './PhotoEditor.svelte';

  let input = $state<HTMLInputElement>();
  let editing = $state<Photo | null>(null);
  let importing = $state(false);

  async function addPhotos(event: Event) {
    const files = [...((event.currentTarget as HTMLInputElement).files ?? [])];
    if (!files.length || !appState.area || !appState.projectId) return;
    importing = true;
    const start = appState.areaPhotos.length;
    const timestamp = now();
    const photos: Photo[] = files.map((file, index) => ({
      id: createId(),
      projectId: appState.projectId!,
      areaId: appState.area!.id,
      title: file.name.replace(/\.[^.]+$/, '') || `Foto ${start + index + 1}`,
      blob: file,
      createdAt: timestamp,
      sortOrder: start + index,
    }));
    await db.photos.bulkAdd(photos);
    await db.projects.update(appState.projectId, { updatedAt: timestamp });
    await appState.load();
    importing = false;
    if (input) input.value = '';
    if (photos.length === 1) editing = photos[0];
  }

  async function removePhoto(photo: Photo) {
    if (!confirm(`„${photo.title}“ und alle Maße löschen?`)) return;
    await db.transaction('rw', db.photos, db.measurements, async () => {
      await db.measurements.where('photoId').equals(photo.id).delete();
      await db.photos.delete(photo.id);
    });
    await appState.load();
  }

  async function renamePhoto(photo: Photo) {
    const title = prompt('Titel des Fotos', photo.title)?.trim();
    if (!title || title === photo.title) return;
    await db.photos.update(photo.id, { title });
    await appState.load();
  }
</script>

{#if editing}
  <PhotoEditor photo={editing} close={() => (editing = null)} />
{:else if appState.area}
  <section class="content-section">
    <div class="page-heading">
      <div>
        <span class="eyebrow">
          {appState.area.kind === 'room'
            ? 'Raum'
            : appState.area.kind === 'outside'
              ? 'Außenbereich'
              : 'Bereich'}
        </span>
        <h1>{appState.area.name}</h1>
      </div>
      <button
        class="button primary"
        onclick={() => input?.click()}
        disabled={importing}
      >
        <Icon name="camera" />{importing
          ? 'Wird geladen …'
          : 'Fotos hinzufügen'}
      </button>
      <input
        bind:this={input}
        class="visually-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onchange={addPhotos}
      />
    </div>

    {#if appState.areaPhotos.length}
      <div class="photo-grid">
        {#each appState.areaPhotos as photo (photo.id)}
          {const count = $derived(
            appState.measurements.filter((item) => item.photoId === photo.id)
              .length,
          )}
          <article class="photo-card">
            <button class="photo-open" onclick={() => (editing = photo)}>
              <BlobImage blob={photo.blob} alt={photo.title} />
              {#if count}<span class="count-badge">
                  {count}
                  {count === 1 ? 'Maß' : 'Maße'}
                </span>{/if}
            </button>
            <div class="photo-meta">
              <button
                class="photo-title"
                onclick={() => renamePhoto(photo)}
                title="Titel ändern"
              >
                {photo.title}
              </button>
              <button
                class="icon-button danger"
                onclick={() => removePhoto(photo)}
                aria-label="Foto löschen"
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <button class="empty-upload" onclick={() => input?.click()}>
        <span class="empty-icon"><Icon name="camera" size={26} /></span>
        <strong>Erstes Foto aufnehmen</strong>
        <small>Kamera verwenden oder ein Bild auswählen</small>
      </button>
    {/if}
  </section>
{/if}
