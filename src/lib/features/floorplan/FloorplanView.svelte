<script lang="ts">
  import BlobImage from '@/lib/components/BlobImage.svelte';
  import Icon from '@/lib/components/Icon.svelte';
  import { db } from '@/lib/db/database';
  import { appState } from '@/lib/state/app.svelte';
  import type { Floorplan, FloorplanHotspot } from '@/lib/types/project';
  import { createId, now } from '@/lib/utils/id';

  let input = $state<HTMLInputElement>();
  let planElement = $state<HTMLElement>();
  let selectedAreaId = $state('');
  let placing = $state(false);
  let editing = $state(false);
  let plan = $derived(appState.levelFloorplan);
  let hotspots = $derived(
    plan
      ? appState.hotspots.filter((item) => item.floorplanId === plan!.id)
      : [],
  );

  async function setFloorplan(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file || !appState.projectId || !appState.levelId) return;
    const existing = appState.levelFloorplan;
    const floorplan: Floorplan = {
      id: existing?.id ?? createId(),
      projectId: appState.projectId,
      levelId: appState.levelId,
      blob: file,
      updatedAt: now(),
    };
    await db.floorplans.put(floorplan);
    await db.projects.update(appState.projectId, { updatedAt: now() });
    await appState.load();
    editing = true;
    if (input) input.value = '';
  }

  async function place(event: PointerEvent) {
    if (
      !placing ||
      !selectedAreaId ||
      !plan ||
      (event.target as Element).closest('.room-hotspot')
    )
      return;
    if (!planElement) return;
    const rect = planElement.getBoundingClientRect();
    const hotspot: FloorplanHotspot = {
      id: createId(),
      projectId: plan.projectId,
      floorplanId: plan.id,
      areaId: selectedAreaId,
      position: {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      },
    };
    await db.hotspots.where('areaId').equals(selectedAreaId).delete();
    await db.hotspots.add(hotspot);
    await appState.load();
    selectedAreaId = '';
    placing = false;
  }

  async function removePlan() {
    if (!plan || !confirm('Grundriss und Raummarkierungen entfernen?')) return;
    await db.transaction('rw', db.floorplans, db.hotspots, async () => {
      await db.hotspots.where('floorplanId').equals(plan!.id).delete();
      await db.floorplans.delete(plan!.id);
    });
    await appState.load();
    editing = false;
  }

  function finishEditing() {
    selectedAreaId = '';
    placing = false;
    editing = false;
  }
</script>

<section class="content-section">
  <div class="page-heading">
    <div>
      <span class="eyebrow">{appState.level?.name}</span>
      <h1>Grundriss</h1>
    </div>
    {#if plan && !editing}
      <button class="button" onclick={() => (editing = true)}>
        Bearbeiten
      </button>
    {:else if plan}
      <button class="button primary" onclick={finishEditing}>Fertig</button>
    {/if}
    <input
      bind:this={input}
      class="visually-hidden"
      type="file"
      accept="image/*"
      onchange={setFloorplan}
    />
  </div>

  {#if plan}
    {#if editing}
      <div class="floorplan-tools">
        <select bind:value={selectedAreaId} aria-label="Raum auswählen">
          <option value="">Raum auswählen …</option>
          {#each appState.levelAreas as area}<option value={area.id}>
              {area.name}
            </option>{/each}
        </select>
        <button
          class:active={placing}
          class="button"
          disabled={!selectedAreaId}
          onclick={() => (placing = !placing)}
        >
          {placing ? 'Jetzt Position antippen' : 'Auf Grundriss platzieren'}
        </button>
        <button class="button" onclick={() => input?.click()}>
          <Icon name="image" size={18} /> Ersetzen
        </button>
        <button class="button danger-text push-right" onclick={removePlan}>
          <Icon name="trash" size={18} /> Entfernen
        </button>
      </div>
      <p class="floorplan-note">
        Raum auswählen und anschließend seine Position im Grundriss antippen.
      </p>
    {:else}
      <p class="floorplan-note">
        Raum antippen, um die zugehörigen Fotos zu öffnen.
      </p>
    {/if}
    <div
      class:placing
      class="floorplan-stage"
      bind:this={planElement}
      onpointerup={place}
      role="application"
      aria-label="Grundriss mit Raumnavigation"
    >
      <BlobImage blob={plan.blob} alt={`Grundriss ${appState.level?.name}`} />
      {#each hotspots as hotspot (hotspot.id)}
        {const area = $derived(
          appState.areas.find((item) => item.id === hotspot.areaId),
        )}
        {#if area}<button
            class:editing
            class="room-hotspot"
            style={`left:${hotspot.position.x * 100}%;top:${hotspot.position.y * 100}%`}
            onclick={(event) => {
              event.stopPropagation();
              if (!editing) appState.selectArea(area.id);
            }}
          >
            {area.name}
          </button>{/if}
      {/each}
    </div>
  {:else}
    <button class="empty-upload floorplan-empty" onclick={() => input?.click()}>
      <span class="empty-icon"><Icon name="floorplan" size={26} /></span>
      <strong>Grundriss hinzufügen</strong>
      <small>Foto einer Skizze oder vorhandenen Grundriss auswählen</small>
    </button>
  {/if}
</section>
