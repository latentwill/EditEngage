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
  <div data-testid="auth-card" class="w-full max-w-md backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-xl p-8">
    <h1 class="text-2xl font-bold text-white text-center mb-8">EditEngage</h1>

    <form onsubmit={handleLogin} class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-white/70 mb-1">Email</label>
        <input id="email" type="email" bind:value={email} class="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-white/70 mb-1">Password</label>
        <input id="password" type="password" bind:value={password} class="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
      </div>

      {#if errorMessage}
        <p data-testid="error-message" class="text-red-400 text-sm">{errorMessage}</p>
      {/if}

      <button type="submit" class="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg px-4 py-2 transition-colors hover:shadow-lg hover:shadow-emerald-500/25">Log In</button>
    </form>

    <p class="text-center text-white/50 text-sm mt-6">
      Don't have an account? <a href="/auth/signup" class="text-emerald-400 hover:text-emerald-300">Sign Up</a>
    </p>
  </div>
</div>
