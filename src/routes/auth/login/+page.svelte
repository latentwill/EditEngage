<script lang="ts">
  import { createSupabaseClient } from '$lib/supabase';
  import { goto, invalidateAll } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let errorMessage = $state('');

  const supabase = createSupabaseClient();

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = '';
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      errorMessage = error.message;
    } else {
      await invalidateAll();
      await goto('/dashboard');
    }
  }
</script>

<div data-testid="auth-container" class="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
  <div data-testid="auth-card" class="card bg-base-200 shadow-xl w-full max-w-md">
    <div class="card-body">
      <h1 class="text-2xl font-bold text-base-content text-center mb-2">EditEngage</h1>
      <p class="text-center text-amber-400/80 text-sm mb-6">Under development</p>

      <form onsubmit={handleLogin} class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-base-content/70 mb-1">Email</label>
          <input id="email" type="email" bind:value={email} class="input input-bordered w-full" />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-base-content/70 mb-1">Password</label>
          <input id="password" type="password" bind:value={password} class="input input-bordered w-full" />
        </div>

        {#if errorMessage}
          <p data-testid="error-message" class="text-red-400 text-sm">{errorMessage}</p>
        {/if}

        <button type="submit" class="btn btn-primary w-full">Log In</button>
      </form>

      <!-- Signup link removed — single-user mode -->
    </div>
  </div>
</div>
