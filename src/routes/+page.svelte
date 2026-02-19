<script lang="ts">
  const features = [
    {
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      title: 'Workflow Builder',
      description: 'Compose AI agent workflows that chain research, writing, and publishing into automated workflows.'
    },
    {
      icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      title: 'SEO Writer',
      description: 'Generate search-optimized articles with AI that understands your brand voice and target keywords.'
    },
    {
      icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      title: 'Variety Engine',
      description: 'Never repeat content. Semantic deduplication ensures every piece is unique and fresh.'
    },
    {
      icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
      title: 'Multi-Channel',
      description: 'Publish to Ghost, social media, email newsletters, and more from a single workflow.'
    },
    {
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      title: 'Content Review',
      description: 'Human-in-the-loop approval workflow lets you review, edit, and approve before publishing.'
    },
    {
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      title: 'Programmatic SEO',
      description: 'Scale landing pages with templated content generation from structured data sources.'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Configure your workflow',
      description: 'Select agents, set your schedule, and define your content strategy.'
    },
    {
      number: '02',
      title: 'Let AI create content',
      description: 'Watch as AI agents research topics, write articles, and prepare for publishing.'
    },
    {
      number: '03',
      title: 'Review and publish',
      description: 'Approve, edit, or auto-publish content across all your channels.'
    }
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: 'Free',
      description: 'For individuals getting started with content automation.',
      features: [
        '1 project',
        '5 workflow runs/month',
        '1 destination',
        'Basic SEO writer',
        'Community support'
      ],
      cta: 'Get Started',
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$29/mo',
      description: 'For creators and small teams scaling content.',
      features: [
        'Unlimited projects',
        'Unlimited workflow runs',
        'All destinations',
        'Research agents',
        'Variety engine',
        'Priority support'
      ],
      cta: 'Start Pro Trial',
      highlighted: true
    },
    {
      name: 'Team',
      price: '$79/mo',
      description: 'For teams that need collaboration and API access.',
      features: [
        'Everything in Pro',
        'Team members',
        'API access',
        'Custom writing styles',
        'Advanced analytics',
        'Dedicated support'
      ],
      cta: 'Contact Sales',
      highlighted: false
    }
  ];
</script>

<!-- Navigation -->
<nav
  data-testid="landing-nav"
  class="navbar bg-base-100/80 backdrop-blur-lg fixed top-0 z-50 border-b border-base-300 px-6 py-4"
>
  <div class="max-w-6xl mx-auto flex items-center justify-between w-full">
    <span class="text-lg font-bold text-base-content">EditEngage</span>
    <div class="flex items-center gap-4">
      <a href="/auth/login" class="btn btn-ghost btn-sm">Sign In</a>
      <a href="/auth/signup" class="btn btn-primary btn-sm">Get Started</a>
    </div>
  </div>
</nav>

<!-- Hero Section -->
<section
  data-testid="hero-section"
  class="min-h-[92vh] flex flex-col items-center justify-center text-center px-6 relative overflow-hidden"
  style="min-height: 92vh;"
>
  <div class="absolute inset-0 bg-gradient-radial from-emerald-900/10 via-transparent to-transparent pointer-events-none"></div>
  <div data-testid="floating-shape" class="absolute top-20 left-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
  <div data-testid="floating-shape" class="absolute bottom-20 right-10 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

  <div class="relative z-10 max-w-4xl mx-auto">
    <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-base-content mb-6">
      Content Operations, Automated
    </h1>

    <p
      data-testid="hero-subheadline"
      class="text-lg md:text-xl text-base-content/60 mb-10 max-w-2xl mx-auto"
    >
      Build AI agent workflows that research, write, and publish content across every channel — on autopilot.
    </p>

    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-16">
      <a
        data-testid="hero-cta"
        href="/auth/signup"
        class="btn btn-primary btn-lg"
      >
        Get Started
      </a>
      <a
        href="#features"
        class="btn btn-ghost"
      >
        Watch Demo
      </a>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
      <div
        data-testid="hero-stat-card"
        class="card bg-base-200 p-4 text-center"
      >
        <div class="text-2xl font-bold text-base-content">10x Faster</div>
        <div class="text-sm text-base-content/40">Content Creation</div>
      </div>
      <div
        data-testid="hero-stat-card"
        class="card bg-base-200 p-4 text-center"
      >
        <div class="text-2xl font-bold text-base-content">4 Channels</div>
        <div class="text-sm text-base-content/40">Ghost, Social, Email, SEO</div>
      </div>
      <div
        data-testid="hero-stat-card"
        class="card bg-base-200 p-4 text-center"
      >
        <div class="text-2xl font-bold text-base-content">0 Manual</div>
        <div class="text-sm text-base-content/40">Fully Automated</div>
      </div>
    </div>
  </div>
</section>

<!-- Feature Grid Section -->
<section id="features" data-testid="feature-grid" class="py-24 px-6">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold text-base-content text-center mb-4">
      Everything you need to automate content
    </h2>
    <p class="text-lg text-base-content/40 text-center mb-16 max-w-2xl mx-auto">
      A complete toolkit for building, managing, and scaling AI-powered content operations.
    </p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {#each features as feature}
        <div
          data-testid="feature-item"
          class="card bg-base-200 hover:bg-base-300 transition-all p-6"
        >
          <div class="flex items-start gap-4">
            <div
              data-testid="feature-icon"
              class="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d={feature.icon} />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-base-content mb-1">{feature.title}</h3>
              <p data-testid="feature-description" class="text-sm text-base-content/40">{feature.description}</p>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- Productivity Block -->
<section
  data-testid="productivity-block"
  class="py-24 px-6 bg-[#12121a]"
>
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold text-base-content text-center mb-4">
      From zero to published in minutes
    </h2>
    <p class="text-lg text-base-content/40 text-center mb-16 max-w-2xl mx-auto">
      Three simple steps to automate your entire content workflow.
    </p>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      {#each steps as step}
        <div data-testid="productivity-step" class="text-center md:text-left">
          <div class="text-5xl font-bold text-emerald-500/30 mb-4">{step.number}</div>
          <h3 class="text-xl font-semibold text-base-content mb-2">{step.title}</h3>
          <p class="text-sm text-base-content/40">{step.description}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- Pricing Grid -->
<section data-testid="pricing-grid" class="py-24 px-6">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold text-base-content text-center mb-4">
      Simple, transparent pricing
    </h2>
    <p class="text-lg text-base-content/40 text-center mb-16 max-w-2xl mx-auto">
      Start free and scale as you grow. No hidden fees.
    </p>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      {#each pricingPlans as plan}
        <div
          data-testid="pricing-card"
          class="card bg-base-200 border rounded-xl p-6 flex flex-col {plan.highlighted ? 'border-primary relative' : 'border-base-300'}"
        >
          {#if plan.highlighted}
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
              Most Popular
            </div>
          {/if}

          <h3 class="text-xl font-bold text-base-content mb-1">{plan.name}</h3>
          <div class="text-3xl font-bold text-base-content mb-2">{plan.price}</div>
          <p class="text-sm text-base-content/40 mb-6">{plan.description}</p>

          <ul data-testid="pricing-features" class="flex-1 space-y-3 mb-8">
            {#each plan.features as feature}
              <li class="flex items-center gap-2 text-sm text-base-content/60">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            {/each}
          </ul>

          <a
            data-testid="pricing-cta"
            href="/auth/signup"
            class="inline-flex items-center justify-center w-full px-6 py-3 rounded-lg font-medium transition-all duration-300 {plan.highlighted ? 'btn btn-primary w-full' : 'btn btn-ghost w-full'}"
          >
            {plan.cta}
          </a>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- Footer -->
<footer
  data-testid="landing-footer"
  class="border-t border-base-300 px-6 py-12"
>
  <div class="max-w-6xl mx-auto text-center">
    <span class="text-lg font-bold text-base-content">EditEngage</span>
    <p class="text-sm text-base-content/40 mt-2">Built with AI, for content creators.</p>
  </div>
</footer>
