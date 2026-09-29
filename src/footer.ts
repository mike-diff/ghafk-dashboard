/** The page footer: a link to the ghafk repository and the data source. */
export function footer(): string {
  return (
    '<footer class="footer">' +
    '<p><a href="https://github.com/mike-diff/ghafk">ghafk</a></p>' +
    '<p>Data comes from the GitHub API.</p>' +
    '</footer>'
  )
}
