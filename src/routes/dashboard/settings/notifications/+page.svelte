<script lang="ts">
  type Subscription = {
    id: string;
    user_id: string;
    project_id: string;
    subscribed_modules: string[];
    subscribed_event_types: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };

  const ALL_MODULES = ['research', 'writing', 'publish', 'system'] as const;

  let {
    data
  }: {
    data: { projectId: string; subscription: Subscription | null };
  } = $props();

  let modules = $state<Record<string, boolean>>(
    Object.fromEntries(
      ALL_MODULES.map((m) => [
        m,
        data.subscription ? data.subscription.subscribed_modules.includes(m) : true
      ])
    )
  );

  let saving = $state(false);
  let saveError = $state('');
  let saveSuccess = $state(false);

  async function save() {
    saving = true;
    saveError = '';
    saveSuccess = false;

    const subscribed_modules = ALL_MODULES.filter((m) => modules[m]);

    try {
      if (data.subscription) {
        const res = await fetch('/api/v1/notifications/subscriptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.subscription.id,
            subscribed_modules
          })
        });
        if (!res.ok) {
          const body = await res.json();
          saveError = body.error || 'Failed to save';
        } else {
          saveSuccess = true;
          setTimeout(() => {
            saveSuccess = false;
          }, 2000);
        }
      } else {
        const res = await fetch('/api/v1/notifications/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: data.projectId,
            subscribed_modules
          })
        });
        if (!res.ok) {
          const body = await res.json();
          saveError = body.error || 'Failed to save';
        } else {
          const body = await res.json();
          data.subscription = body.subscription;
          saveSuccess = true;
          setTimeout(() => {
            saveSuccess = false;
          }, 2000);
        }
      }
    } catch {
      saveError = 'Network error';
    }
    saving = false;
  }
</script>

<div data-testid="notifications-settings-page" class="space-y-8 py-6">
  <h1 class="text-2xl font-bold text-base-content">Notification Preferences</h1>

  {#if !data.projectId}
    <p class="text-base-content/60">No project found. Create a project first.</p>
  {:else}
    <section data-testid="module-subscriptions-section">
      <h2 class="text-lg font-semibold text-base-content/80 mb-4">
        Module Subscriptions
      </h2>
      <p class="text-sm text-base-content/60 mb-4">
        Choose which modules send you notifications for this project.
      </p>

      <div class="space-y-3">
        {#each ALL_MODULES as mod}
          <label
            data-testid="module-toggle-{mod}"
            class="flex items-center gap-3 card bg-base-200 shadow-xl p-4 cursor-pointer"
          >
            <input
              type="checkbox"
              class="checkbox checkbox-primary"
              checked={modules[mod]}
              onchange={() => {
                modules[mod] = !modules[mod];
              }}
            />
            <span class="text-base-content font-medium capitalize">{mod}</span>
          </label>
        {/each}
      </div>

      <div class="mt-6 flex items-center gap-4">
        <button
          data-testid="save-subscriptions"
          class="btn btn-primary"
          disabled={saving}
          onclick={save}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        {#if saveSuccess}
          <span data-testid="save-success" class="text-success text-sm">Saved!</span>
        {/if}
        {#if saveError}
          <span data-testid="save-error" class="text-error text-sm">{saveError}</span>
        {/if}
      </div>
    </section>
  {/if}
</div>
