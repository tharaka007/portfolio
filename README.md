# Tharaka — Portfolio

Single-page portfolio built with plain HTML, CSS and JavaScript, with Three.js (WebGL hero) and GSAP (ScrollTrigger) animations.

Lighthouse (mobile & desktop): 100 Performance · 100 Accessibility · 100 Best Practices · 100 SEO.

## Structure
```
index.html
css/style.css          # all styles, incl. CSS-only hero intro + scroll-reveal transitions
js/main.js             # IntersectionObserver reveals, GSAP scroll effects, counters, gauges, cursor
js/vendor/             # self-hosted GSAP + ScrollTrigger
js/scene.min.js        # built Three.js hero (loaded on first interaction)
src/scene.js           # source for the 3D scene
fonts/                 # self-hosted Space Grotesk + JetBrains Mono (woff2)
```

## Performance notes
- No preloader; hero paints immediately with CSS animations.
- Fonts self-hosted, preloaded, with a metric-matched fallback (no layout shift).
- Scroll reveals use one IntersectionObserver + CSS transitions (no long tasks).
- Three.js is tree-shaken into `js/scene.min.js` and only loads on first interaction.

## Rebuild the 3D scene
Only needed after editing `src/scene.js`:
```
npm install
npm run build
```

## Run locally
Open `index.html` in a browser, or serve the folder:
```
npx serve .
```

## Deploy
Works as-is on GitHub Pages, Netlify or Vercel (no build step).

## To edit
- Contact email/phone, social links and CV link: `index.html` (contact section)
- Projects, testimonial and stats: `index.html`
- Colors: CSS variables at the top of `css/style.css`
