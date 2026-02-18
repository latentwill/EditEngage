<script lang="ts">
  import { createSupabaseClient } from '$lib/supabase';
  import { goto, invalidateAll } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let fullName = $state('');
  let errorMessage = $state('');

  const supabase = createSupabaseClient();

  async function handleSignup(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = '';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
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
  <div data-testid="auth-card" class="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl max-w-md w-full p-8">
    <h1 class="text-2xl font-bold text-white text-center mb-6">EditEngage</h1>

    <form onsubmit={handleSignup} class="space-y-4">
      <div>
        <label for="full_name" class="block text-sm text-gray-300 mb-1">Full Name</label>
        <input
          id="full_name"
          type="text"
          bind:value={fullName}
          class="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label for="email" class="block text-sm text-gray-300 mb-1">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          class="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label for="password" class="block text-sm text-gray-300 mb-1">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          class="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {#if errorMessage}
        <p data-testid="error-message" class="text-red-400 text-sm">{errorMessage}</p>
      {/if}

      <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg py-2 transition-colors">
        Sign Up
      </button>
    </form>

    <p class="text-center text-gray-400 text-sm mt-6">
      Already have an account? <a href="/auth/login" class="text-emerald-400 hover:underline">Sign In</a>
    </p>
  </div>
</div>
