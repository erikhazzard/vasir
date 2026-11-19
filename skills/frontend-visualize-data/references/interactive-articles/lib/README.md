# Local libraries

Put locally vendored browser libraries here when generated articles are not single-file.

Expected default:

- `d3.v7.min.js`

Generated articles must never load D3, KaTeX, TopoJSON, fonts, data, images, or styles from a CDN or remote URL. Inline dependencies into `index.html` when practical. Otherwise bundle local files and zip the whole project.
