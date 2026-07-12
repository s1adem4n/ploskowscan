<script lang="ts">
  import AppSidebar from '@/lib/components/AppSidebar.svelte';
  import Icon from '@/lib/components/Icon.svelte';
  import { deleteProject } from '@/lib/db/projects';
  import { exportProject, importProject } from '@/lib/export/projectBundle';
  import FloorplanView from '@/lib/features/floorplan/FloorplanView.svelte';
  import AreaPhotos from '@/lib/features/photos/AreaPhotos.svelte';
  import CreateItemDialog from '@/lib/features/projects/CreateItemDialog.svelte';
  import CreateProjectDialog from '@/lib/features/projects/CreateProjectDialog.svelte';
  import { appState } from '@/lib/state/app.svelte';

  let createProjectOpen = $state(false);
  let createItemMode = $state<'level' | 'area' | null>(null);
  let sidebarOpen = $state(false);
  let busy = $state(false);
  let error = $state('');
  let importInput = $state<HTMLInputElement>();

  $effect(() => {
    appState.load().catch(showError);
  });

  function showError(reason: unknown) {
    error =
      reason instanceof Error ? reason.message : 'Etwas ist schiefgegangen.';
    busy = false;
  }

  async function handleExport() {
    if (!appState.projectId) return;
    busy = true;
    error = '';
    try {
      await exportProject(appState.projectId);
    } catch (reason) {
      showError(reason);
    } finally {
      busy = false;
    }
  }

  async function handleImport(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    busy = true;
    error = '';
    try {
      const id = await importProject(file);
      await appState.load(id);
    } catch (reason) {
      showError(reason);
    } finally {
      busy = false;
      if (importInput) importInput.value = '';
    }
  }

  async function removeCurrentProject() {
    if (
      !appState.project ||
      !confirm(`Projekt „${appState.project.name}“ vollständig löschen?`)
    )
      return;
    await deleteProject(appState.project.id);
    await appState.load();
  }
</script>

{#if appState.loading}
  <div class="app-loading">PloskowScan</div>
{:else if !appState.project}
  <main class="welcome">
    <div class="brand-mark large">P</div>
    <h1>Hausaufnahme beginnen</h1>
    <p>Fotos aufnehmen, Maße einzeichnen und alles als Projekt weitergeben.</p>
    <div class="welcome-actions">
      <button
        class="button primary large-button"
        onclick={() => (createProjectOpen = true)}
      >
        <Icon name="plus" /> Neues Projekt
      </button>
      <button class="button large-button" onclick={() => importInput?.click()}>
        <Icon name="upload" /> Projekt importieren
      </button>
    </div>
    <input
      bind:this={importInput}
      class="visually-hidden"
      type="file"
      accept=".zip,.ploskowscan.zip,application/zip"
      onchange={handleImport}
    />
  </main>
{:else}
  <div class="app-shell">
    <button
      class:open={sidebarOpen}
      class="mobile-overlay"
      onclick={() => (sidebarOpen = false)}
      aria-label="Navigation schließen"
    ></button>
    <div class:open={sidebarOpen} class="sidebar-wrap">
      <AppSidebar
        addProject={() => (createProjectOpen = true)}
        addLevel={() => (createItemMode = 'level')}
        addArea={() => (createItemMode = 'area')}
        close={() => (sidebarOpen = false)}
      />
    </div>
    <div class="main-column">
      <header class="topbar">
        <button
          class="icon-button menu-button"
          onclick={() => (sidebarOpen = true)}
          aria-label="Navigation öffnen"
        >
          <span class="menu-lines"></span>
        </button>
        <div class="project-tabs">
          {#each appState.projects as project (project.id)}<button
              class:current={project.id === appState.projectId}
              onclick={() => appState.selectProject(project.id)}
            >
              {project.name}
            </button>{/each}
          <button
            class="icon-button"
            onclick={() => (createProjectOpen = true)}
            aria-label="Projekt hinzufügen"
          >
            <Icon name="plus" size={18} />
          </button>
        </div>
        <div class="topbar-actions">
          <button
            class="button compact"
            onclick={() => importInput?.click()}
            disabled={busy}
          >
            <Icon name="upload" size={17} /> Import
          </button>
          <button
            class="button compact primary"
            onclick={handleExport}
            disabled={busy}
          >
            <Icon name="download" size={17} />
            {busy ? 'Bitte warten …' : 'Export'}
          </button>
          <button
            class="icon-button danger"
            onclick={removeCurrentProject}
            aria-label="Projekt löschen"
          >
            <Icon name="trash" size={18} />
          </button>
        </div>
        <input
          bind:this={importInput}
          class="visually-hidden"
          type="file"
          accept=".zip,.ploskowscan.zip,application/zip"
          onchange={handleImport}
        />
      </header>
      {#if error}<div class="error-banner">
          {error}
          <button onclick={() => (error = '')}>
            <Icon name="x" size={18} />
          </button>
        </div>{/if}
      <main class="page-content">
        {#if appState.view === 'area' && appState.areaId}<AreaPhotos
          />{:else}<FloorplanView />{/if}
      </main>
    </div>
  </div>
{/if}

<CreateProjectDialog
  open={createProjectOpen}
  close={() => (createProjectOpen = false)}
/>
<CreateItemDialog
  open={createItemMode !== null}
  mode={createItemMode ?? 'area'}
  close={() => (createItemMode = null)}
/>
