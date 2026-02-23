<script lang="ts">
  interface FeedFilters {
    status?: string;
    pipeline_id?: string;
    content_type?: string;
  }

  let {
    pipelines,
    onFilterChange,
    initialFilters = {} as FeedFilters
  }: {
    pipelines: Array<{ id: string; name: string }>;
    onFilterChange: (filters: FeedFilters) => void;
    initialFilters?: FeedFilters;
  } = $props();

  let status = $state(initialFilters.status ?? '');
  let pipelineId = $state(initialFilters.pipeline_id ?? '');
  let contentType = $state(initialFilters.content_type ?? '');

  function emitFilters() {
    const filters: FeedFilters = {};
    if (status) filters.status = status;
    if (pipelineId) filters.pipeline_id = pipelineId;
    if (contentType) filters.content_type = contentType;
    onFilterChange(filters);
  }

  function handleStatusChange(e: Event) {
    status = (e.target as HTMLSelectElement).value;
    emitFilters();
  }

  function handlePipelineChange(e: Event) {
    pipelineId = (e.target as HTMLSelectElement).value;
    emitFilters();
  }

  function handleContentTypeChange(e: Event) {
    contentType = (e.target as HTMLSelectElement).value;
    emitFilters();
  }
</script>

<div data-testid="feed-filter-bar" class="sticky top-0 z-10 bg-base-100/80 backdrop-blur-md p-3 flex flex-wrap gap-3 items-center">
  <select
    data-testid="filter-status"
    class="select select-sm select-bordered"
    value={status}
    onchange={handleStatusChange}
  >
    <option value="">All</option>
    <option value="pending">Pending</option>
    <option value="in_review">In Review</option>
    <option value="approved">Approved</option>
    <option value="published">Published</option>
    <option value="rejected">Rejected</option>
  </select>

  <select
    data-testid="filter-pipeline"
    class="select select-sm select-bordered"
    value={pipelineId}
    onchange={handlePipelineChange}
  >
    <option value="">All</option>
    {#each pipelines as pipeline}
      <option value={pipeline.id}>{pipeline.name}</option>
    {/each}
  </select>

  <select
    data-testid="filter-content-type"
    class="select select-sm select-bordered"
    value={contentType}
    onchange={handleContentTypeChange}
  >
    <option value="">All</option>
    <option value="article">Article</option>
    <option value="social_post">Social Post</option>
    <option value="landing_page">Landing Page</option>
    <option value="email">Email</option>
  </select>
</div>
