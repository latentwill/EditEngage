<script lang="ts">
  import { createSupabaseClient } from '$lib/supabase';

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
      window.location.href = '/dashboard';
    }
  }
</script>

<form onsubmit={handleLogin}>
  <label for="email">Email</label>
  <input id="email" type="email" bind:value={email} />

  <label for="password">Password</label>
  <input id="password" type="password" bind:value={password} />

  {#if errorMessage}
    <p data-testid="error-message" class="error">{errorMessage}</p>
  {/if}

  <button type="submit">Log In</button>
</form>
