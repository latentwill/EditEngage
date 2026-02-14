<script lang="ts">
  import { createSupabaseClient } from '$lib/supabase';

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
      window.location.href = '/dashboard';
    }
  }
</script>

<form onsubmit={handleSignup}>
  <label for="email">Email</label>
  <input id="email" type="email" bind:value={email} />

  <label for="password">Password</label>
  <input id="password" type="password" bind:value={password} />

  <label for="full_name">Full Name</label>
  <input id="full_name" type="text" bind:value={fullName} />

  {#if errorMessage}
    <p data-testid="error-message" class="error">{errorMessage}</p>
  {/if}

  <button type="submit">Sign Up</button>
</form>
