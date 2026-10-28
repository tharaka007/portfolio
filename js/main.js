/* ------------------------------------------------------------------
   Main interactions — tuned for speed:
   • Hero intro is pure CSS (paints with the page).
   • Scroll reveals use one IntersectionObserver + CSS transitions
     (no layout thrashing, no long tasks).
   • GSAP drives scrubbed/scroll-linked effects, set up when idle.
   • The Three.js scene loads on the visitor's first interaction.
------------------------------------------------------------------- */
document.getElementById("year").textContent = new Date().getFullYear();

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover)").matches;
const isDesktop = () => innerWidth > 760;
const idle = (fn) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));

/* ---------- Typing word loop ---------- */
(function typing() {
  if (reduced) return;
  const el = document.getElementById("typed");
  const words = ["web.", "users.", "speed.", "scale."];
  let i = 0;
  const type = (word, n, done) => {
    el.textContent = word.slice(0, n);
    if (n < word.length) setTimeout(() => type(word, n + 1, done), 70);
    else done();
  };
  const erase = (done) => {
    const t = el.textContent;
    if (t.length) { el.textContent = t.slice(0, -1); setTimeout(() => erase(done), 40); }
    else done();
  };
  const loop = () => erase(() => { i = (i + 1) % words.length; type(words[i], 0, () => setTimeout(loop, 2200)); });
  setTimeout(loop, 3000);
})();

/* ---------- Mobile menu ---------- */
const toggle = document.getElementById("navToggle");
const links = document.getElementById("navLinks");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", open);
});
links.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => { links.classList.remove("open"); toggle.classList.remove("open"); })
);

/* ---------- Nav background on scroll ---------- */
const nav = document.getElementById("nav");
let navTick = false;
addEventListener("scroll", () => {
  if (navTick) return;
  navTick = true;
  requestAnimationFrame(() => { nav.classList.toggle("scrolled", scrollY > 60); navTick = false; });
}, { passive: true });

/* ---------- Reveal-on-scroll (IntersectionObserver + CSS) ---------- */
// Stagger index for groups of siblings
document.querySelectorAll("[data-stagger]").forEach((el) => {
  const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute("data-stagger"));
  el.style.setProperty("--i", sibs.indexOf(el));
});
document.querySelectorAll(".tags").forEach((ul) =>
  [...ul.children].forEach((li, i) => li.style.setProperty("--i", i))
);

const onReveal = new Map(); // element -> callback when it first appears
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("is-in");
    const cb = onReveal.get(e.target);
    if (cb) cb(e.target);
    revealIO.unobserve(e.target);
  });
}, { rootMargin: "0px 0px -10% 0px" });
document.querySelectorAll("[data-reveal], [data-stagger], [data-tl], [data-count], .gauge").forEach((el) => revealIO.observe(el));

/* ---------- Active nav link ---------- */
const navIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    document.querySelectorAll(".nav__links a").forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id)
    );
  });
}, { rootMargin: "-50% 0px -50% 0px" });
document.querySelectorAll("main section[id]").forEach((s) => navIO.observe(s));

/* ---------- GSAP: counters, gauges, scrubbed effects (set up when idle) ---------- */
function countUp(el, to, onUpdate, duration = 2) {
  if (reduced || !window.gsap) return onUpdate(to);
  const o = { v: 0 };
  gsap.to(o, { v: to, duration, ease: "power2.out", onUpdate: () => onUpdate(o.v) });
}
document.querySelectorAll("[data-count]").forEach((el) =>
  onReveal.set(el, () => countUp(el, +el.dataset.count, (v) => (el.textContent = Math.round(v))))
);
document.querySelectorAll(".gauge").forEach((g) => {
  const arc = g.querySelector(".gauge__arc");
  const num = g.querySelector(".gauge__num");
  onReveal.set(g, () => countUp(g, +g.dataset.score, (v) => {
    arc.style.strokeDashoffset = 100 - v;
    num.textContent = Math.round(v);
  }, 1.8));
});

addEventListener("load", () => idle(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  if (!reduced) {
    // Hero text drifts away as you scroll
    gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } })
      .to(".hero__text", { y: -120, opacity: 0, ease: "none" }, 0)
      .to(".hero__visual", { yPercent: -30, opacity: 0, ease: "none" }, 0);

    gsap.to("#codeCard", { y: -14, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });

    // Timeline progress line fills as you scroll
    gsap.to("#timelineProgress", {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: "#timeline", start: "top 70%", end: "bottom 70%", scrub: 0.6 },
    });

    // Marquee speeds up / reverses with scroll velocity
    const marquee = gsap.to(".marquee__track", { xPercent: -50, duration: 22, ease: "none", repeat: -1 });
    ScrollTrigger.create({
      onUpdate(self) {
        const v = Math.min(Math.abs(self.getVelocity()) / 400, 4);
        const dir = self.direction === -1 ? -1 : 1;
        gsap.to(marquee, { timeScale: dir * (1 + v), duration: 0.3, overwrite: true });
        gsap.to(marquee, { timeScale: dir, duration: 1.2, delay: 0.3 });
      },
    });
  } else {
    gsap.set("#timelineProgress", { scaleY: 1 });
  }
}));

/* ---------- 3D hero: load on first interaction ---------- */
(function lazyScene() {
  const canvas = document.getElementById("heroCanvas");
  const conn = navigator.connection || {};
  if (!canvas || reduced || conn.saveData) return;

  const start = () =>
    import("./scene.min.js").then(({ init }) => {
      const s = init(canvas);
      canvas.classList.add("is-ready");
      if (!window.gsap) return;
      gsap.from(s.group.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 2, ease: "expo.out" });
      gsap.from(s.sphereMat.uniforms.uAmp, { value: 2.5, duration: 2.5, ease: "expo.out" });
      if (window.ScrollTrigger) {
        gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } })
          .to(s.camera.position, { z: 5.5, ease: "none" }, 0)
          .to(s.group.rotation, { z: 0.8, ease: "none" }, 0)
          .to(s.sphereMat.uniforms.uAmp, { value: 1.2, ease: "none" }, 0);
      }
    }).catch(() => {});

  // Starting on interaction keeps the first load featherweight;
  // the GPU work never competes with first paint.
  const events = ["pointermove", "pointerdown", "touchstart", "wheel", "scroll", "keydown"];
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    events.forEach((e) => removeEventListener(e, go));
    start();
  };
  events.forEach((e) => addEventListener(e, go, { passive: true }));
})();

/* ---------- Pointer-only effects ---------- */
if (finePointer && !reduced) {
  const cursor = document.getElementById("cursor");
  const dot = document.getElementById("cursorDot");
  let cx = 0, cy = 0, tx = 0, ty = 0, running = false;
  const follow = () => {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
    if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) requestAnimationFrame(follow);
    else running = false;
  };
  addEventListener("pointermove", (e) => {
    tx = e.clientX; ty = e.clientY;
    dot.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
    cursor.style.opacity = dot.style.opacity = 1;
    if (!running) { running = true; requestAnimationFrame(follow); }
  }, { passive: true });
  document.querySelectorAll("a, button, .card").forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
  });

  // Magnetic buttons + 3D tilt cards need GSAP's springy easing
  addEventListener("load", () => idle(() => {
    if (!window.gsap) return;
    document.querySelectorAll(".magnetic").forEach((el) => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
    document.querySelectorAll(".tilt").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, { rotateY: px * 12, rotateX: -py * 12, duration: 0.5, ease: "power2.out" });
      });
      card.addEventListener("mouseleave", () =>
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" })
      );
    });
  }));
}
