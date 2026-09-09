// Public membership is an explicit release decision. A source selection or a
// successful experiment does not publish a benchmark; unlisted sources stay
// private. Historical projections retain their original edition validators.
export const WRITING_ACTIVE_RELEASE = Object.freeze({
  id: 'writing-storytelling-public-v1',
  lifecycle: 'published',
  benchmarks: Object.freeze([
    Object.freeze({ id: 'storytelling-core-idea', trackId: 'storytelling', lifecycle: 'published' }),
    Object.freeze({ id: 'storytelling-plot-twists', trackId: 'storytelling', lifecycle: 'published' }),
    Object.freeze({ id: 'storytelling-magic-discovery', trackId: 'storytelling', lifecycle: 'published' })
  ])
});
