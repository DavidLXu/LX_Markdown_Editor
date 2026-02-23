# LX Markdown Editor

An elegant, lightweight markdown editor with real-time preview.

## Features

- Live markdown rendering while typing
- Split-pane editor and preview layout
- Syntax highlighting for fenced code blocks
- LaTeX math support (inline and block) via KaTeX
- Toolbar shortcuts for common formatting
- Copy markdown to clipboard
- Download notes as `.md`
- Local autosave with `localStorage`
- Responsive layout for desktop and mobile

## Demo Usage

Open `index.html` in a browser and start writing.

## GitHub Pages Deployment

This project is ready to deploy on GitHub Pages.

### Option 1 (Recommended): GitHub Actions Pages Deploy

This repo includes a workflow at `.github/workflows/pages.yml` that deploys automatically when you push to `main`.

1. Go to your GitHub repository settings.
2. Open `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` (or re-run the workflow from the `Actions` tab).

Your site URL will usually be:

- `https://davidlxu.github.io/LX_Markdown_Editor/`

### Option 2: Branch Deploy (No Actions)

You can also publish directly from the `main` branch root because the app is a static site with `index.html`.

### Code highlighting

Use fenced code blocks with an optional language:


```js
const message = "Hello";
console.log(message);
```

### Math (LaTeX)

Inline math:  $e^{i\pi} + 1 = 0$

Block math:

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$


## Project Files

- `index.html` - App structure and external CDN assets
- `styles.css` - UI styling and responsive layout
- `app.js` - Markdown parsing, rendering, toolbar behavior, persistence

## Notes

- Syntax highlighting and math rendering use CDN-hosted assets (`highlight.js` and `KaTeX`), so internet access is required for those features.
- Raw HTML is escaped in preview for safety.
- `.nojekyll` is included so GitHub Pages serves the site as plain static files without Jekyll processing.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
