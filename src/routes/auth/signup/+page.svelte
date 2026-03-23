<!-- Signup disabled — single-user mode -->
<script lang="ts">
  import { goto } from '$app/navigation';
  // Redirect to login if someone navigates here directly
  $effect(() => {
    goto('/auth/login');
  });
</script>

<div data-testid="auth-container" class="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
  <div data-testid="auth-card" class="card bg-base-200 shadow-xl max-w-md w-full">
    <div class="card-body text-center">
      <h1 class="text-2xl font-bold text-base-content mb-4">EditEngage</h1>
      <p class="text-base-content/70">Sign up is currently disabled. Redirecting to login...</p>
    </div>
  </div>
</div>
