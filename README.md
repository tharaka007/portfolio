# Tharaka — Portfolio

Single-page portfolio built with plain HTML, CSS and JavaScript, with Three.js (WebGL hero) and GSAP (ScrollTrigger) animations.

## Structure
```
index.html
css/style.css
js/scene.js   # Three.js hero: noise-displaced particle sphere, wireframe core, star field
js/main.js    # GSAP: preloader, hero intro, scroll reveals, counters, skill bars, marquee, cursor, magnetic buttons, card tilt
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
