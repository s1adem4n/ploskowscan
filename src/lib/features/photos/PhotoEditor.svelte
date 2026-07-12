<script lang="ts">
  import BlobImage from '@/lib/components/BlobImage.svelte';
  import Icon from '@/lib/components/Icon.svelte';
  import { db } from '@/lib/db/database';
  import { appState } from '@/lib/state/app.svelte';
  import type { Measurement, Photo, Point } from '@/lib/types/project';
  import { createId, now } from '@/lib/utils/id';

  let { photo, close }: { photo: Photo; close: () => void } = $props();
  let firstPoint = $state<Point | null>(null);
  let secondPoint = $state<Point | null>(null);
  let value = $state('');
  let note = $state('');
  let saving = $state(false);
  let error = $state('');
  let editor: HTMLElement;
  let measurements = $derived(
    appState.measurements.filter((item) => item.photoId === photo.id),
  );

  function setPoint(event: PointerEvent) {
    if ((event.target as Element).closest('[data-measurement]')) return;
    const rect = editor.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
    if (!firstPoint || secondPoint) {
      firstPoint = point;
      secondPoint = null;
      value = '';
      note = '';
    } else secondPoint = point;
  }

  async function save() {
    if (!firstPoint || !secondPoint || !value.trim() || saving) return;
    saving = true;
    error = '';
    const measurement: Measurement = {
      id: createId(),
      projectId: photo.projectId,
      photoId: photo.id,
      start: { x: firstPoint.x, y: firstPoint.y },
      end: { x: secondPoint.x, y: secondPoint.y },
      value: value.trim(),
      note: note.trim(),
      createdAt: now(),
    };
    try {
      await db.measurements.add(measurement);
      await db.projects.update(photo.projectId, { updatedAt: now() });
      await appState.load();
      firstPoint = null;
      secondPoint = null;
      value = '';
      note = '';
    } catch (reason) {
      error =
        reason instanceof Error
          ? reason.message
          : 'Das Maß konnte nicht gespeichert werden.';
    } finally {
      saving = false;
    }
  }

  async function remove(id: string) {
    await db.measurements.delete(id);
    await appState.load();
  }

  function labelPosition(item: Pick<Measurement, 'start' | 'end'>): Point {
    return {
      x: (item.start.x + item.end.x) / 2,
      y: (item.start.y + item.end.y) / 2,
    };
  }
</script>

<div class="editor-screen">
  <header class="editor-toolbar">
    <button class="button quiet" onclick={close}>
      <Icon name="arrow-left" /> Zurück
    </button>
    <div class="editor-title">
      <strong>{photo.title}</strong>
      <span>
        {measurements.length}
        {measurements.length === 1 ? 'Maß' : 'Maße'}
      </span>
    </div>
    <span class="editor-hint">Zwei Punkte antippen</span>
  </header>

  <main class="editor-workspace">
    <div class="photo-stage">
      <div
        class="photo-editor"
        bind:this={editor}
        onpointerup={setPoint}
        role="application"
        aria-label="Maße auf Foto einzeichnen"
      >
        <BlobImage blob={photo.blob} alt={photo.title} />
        <svg
          class="annotation-layer"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {#each measurements as item (item.id)}
            <line
              x1={item.start.x * 100}
              y1={item.start.y * 100}
              x2={item.end.x * 100}
              y2={item.end.y * 100}
              class="measure-line"
            />
          {/each}
          {#if firstPoint && secondPoint}
            <line
              x1={firstPoint.x * 100}
              y1={firstPoint.y * 100}
              x2={secondPoint.x * 100}
              y2={secondPoint.y * 100}
              class="draft-line"
            />
          {/if}
        </svg>
        {#each measurements as item (item.id)}
          {const position = $derived(labelPosition(item))}
          <span
            class="measure-dot"
            style={`left:${item.start.x * 100}%;top:${item.start.y * 100}%`}
          ></span>
          <span
            class="measure-dot"
            style={`left:${item.end.x * 100}%;top:${item.end.y * 100}%`}
          ></span>
          <div
            data-measurement
            class="measure-label"
            style={`left:${position.x * 100}%;top:${position.y * 100}%`}
          >
            {item.value}{#if item.note}<small>{item.note}</small>{/if}
          </div>
        {/each}
        {#if firstPoint}<span
            class="measure-dot draft"
            style={`left:${firstPoint.x * 100}%;top:${firstPoint.y * 100}%`}
          ></span>{/if}
        {#if secondPoint}<span
            class="measure-dot draft"
            style={`left:${secondPoint.x * 100}%;top:${secondPoint.y * 100}%`}
          ></span>{/if}
      </div>
    </div>

    <aside class="measure-panel">
      {#if firstPoint && secondPoint}
        <h2>Maß eintragen</h2>
        <label>
          <span>Wert</span>
          <input
            bind:value
            placeholder="z. B. 2,46 m"
            onkeydown={(event) => event.key === 'Enter' && save()}
          />
        </label>
        <label>
          <span>
            Notiz <small>optional</small>
          </span>
          <input bind:value={note} placeholder="Fensterbreite" />
        </label>
        {#if error}<p class="editor-error">{error}</p>{/if}
        <div class="button-row">
          <button
            class="button"
            onclick={() => {
              firstPoint = null;
              secondPoint = null;
            }}
          >
            Abbrechen
          </button>
          <button
            class="button primary"
            onclick={save}
            disabled={!value.trim() || saving}
          >
            Speichern
          </button>
        </div>
      {:else if firstPoint}
        <div class="instruction">
          <span class="step-number">2</span>
          <p>Zweiten Endpunkt des Maßes antippen.</p>
        </div>
      {:else}
        <div class="instruction">
          <span class="step-number">1</span>
          <p>Ersten Endpunkt des Maßes antippen.</p>
        </div>
      {/if}
      {#if measurements.length}
        <div class="measure-list">
          <h3>Maße</h3>
          {#each measurements as item (item.id)}
            <div>
              <span>
                <strong>{item.value}</strong>
                {#if item.note}<small>{item.note}</small>{/if}
              </span>
              <button
                class="icon-button danger"
                onclick={() => remove(item.id)}
                aria-label="Maß löschen"
              >
                <Icon name="trash" size={17} />
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </aside>
  </main>
</div>
