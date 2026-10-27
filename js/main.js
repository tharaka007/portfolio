/* ------------------------------------------------------------------
   GSAP animations: preloader, hero intro, scroll reveals, counters,
   skill bars, marquee, magnetic buttons, card tilt, custom cursor.
------------------------------------------------------------------- */
gsap.registerPlugin(ScrollTrigger);
document.body.classList.add("loading");
document.getElementById("year").textContent = new Date().getFullYear();

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Preloader ---------- */
const loader = { v: 0 };
gsap.to(loader, {
  v: 100,
  duration: reduced ? 0.2 : 1.6,
  ease: "power2.inOut",
  onUpdate() {
    const v = Math.round(loader.v);
    document.getElementById("preloaderCount").textContent = v + "%";
    document.getElementById("preloaderBar").style.width = v + "%";
  },
  onComplete() {
    gsap.to("#preloader", {
      yPercent: -100,
      duration: 0.9,
      ease: "power4.inOut",
      onComplete() {
        document.getElementById("preloader").remove();
        document.body.classList.remove("loading");
      },
    });
    heroIntro();
  },
});

/* ---------- Hero intro ---------- */
function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: "power4.out" }, delay: 0.35 });
  tl.from(".nav", { y: -40, opacity: 0, duration: 1 })
    .from(".hero__title .split", { yPercent: 110, duration: 1.2, stagger: 0.12 }, "-=0.7")
    .from(".hero .reveal-up", { y: 30, opacity: 0, duration: 1, stagger: 0.1 }, "-=0.9")
    .from(".chips li", { y: 20, opacity: 0, duration: 0.6, stagger: 0.05 }, "-=0.6")
    .from("#codeCard", { x: 60, opacity: 0, rotateY: -20, duration: 1.2 }, "-=1.2");

  const s = window.heroScene;
  if (s) {
    tl.from(s.group.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 2, ease: "expo.out" }, 0)
      .from(s.sphereMat.uniforms.uAmp, { value: 2.5, duration: 2.5, ease: "expo.out" }, 0);
  }
  startTyping();
  floatCodeCard();
}

/* ---------- Typing word loop ---------- */
function startTyping() {
  const el = document.getElementById("typed");
  const words = ["web.", "users.", "speed.", "scale."];
  let i = 0;
  const loop = () => {
    i = (i + 1) % words.length;
    const tl = gsap.timeline({ onComplete: () => gsap.delayedCall(2, loop) });
    const txt = { n: el.textContent.length };
    tl.to(txt, { n: 0, duration: 0.4, ease: "none", onUpdate: () => (el.textContent = el.textContent.slice(0, Math.round(txt.n))) });
    const next = words[i];
    const t2 = { n: 0 };
    tl.to(t2, { n: next.length, duration: 0.5, ease: "none", onUpdate: () => (el.textContent = next.slice(0, Math.round(t2.n))) });
  };
  gsap.delayedCall(2.5, loop);
}

function floatCodeCard() {
  gsap.to("#codeCard", { y: -14, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
}

/* ---------- Hero scroll-out (3D scene reacts to scroll) ---------- */
if (window.heroScene) {
  const s = window.heroScene;
  gsap.timeline({
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
  })
    .to(s.camera.position, { z: 5.5, ease: "none" }, 0)
    .to(s.group.rotation, { z: 0.8, ease: "none" }, 0)
    .to(s.sphereMat.uniforms.uAmp, { value: 1.2, ease: "none" }, 0)
    .to(".hero__text", { y: -120, opacity: 0, ease: "none" }, 0)
    .to(".hero__visual", { yPercent: -30, opacity: 0, ease: "none" }, 0);
}

/* ---------- Generic reveals ---------- */
gsap.utils.toArray("[data-reveal]").forEach((el) => {
  gsap.from(el, {
    y: 50, opacity: 0, duration: 1, ease: "power3.out",
    scrollTrigger: { trigger: el, start: "top 88%" },
  });
});

ScrollTrigger.batch("[data-stagger]", {
  start: "top 90%",
  onEnter: (batch) =>
    gsap.from(batch, { y: 60, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out", overwrite: true }),
});

/* ---------- Counters ---------- */
gsap.utils.toArray("[data-count]").forEach((el) => {
  const end = +el.dataset.count;
  const o = { v: 0 };
  gsap.to(o, {
    v: end, duration: 2, ease: "power2.out",
    scrollTrigger: { trigger: el, start: "top 90%" },
    onUpdate: () => (el.textContent = Math.round(o.v)),
  });
});

/* ---------- Skill bars ---------- */
gsap.utils.toArray(".bar span").forEach((bar) => {
  gsap.to(bar, {
    width: bar.dataset.w + "%", duration: 1.6, ease: "power3.out",
    scrollTrigger: { trigger: bar, start: "top 92%" },
  });
});

/* ---------- Marquee (speeds up with scroll velocity) ---------- */
const marquee = gsap.to(".marquee__track", { xPercent: -50, duration: 22, ease: "none", repeat: -1 });
ScrollTrigger.create({
  onUpdate(self) {
    const v = Math.min(Math.abs(self.getVelocity()) / 400, 4);
    gsap.to(marquee, { timeScale: (self.direction === -1 ? -1 : 1) * (1 + v), duration: 0.3, overwrite: true });
    gsap.to(marquee, { timeScale: self.direction === -1 ? -1 : 1, duration: 1.2, delay: 0.3 });
  },
});

/* ---------- Nav state + active link ---------- */
ScrollTrigger.create({
  start: 60,
  onToggle: (self) => document.getElementById("nav").classList.toggle("scrolled", self.isActive),
});
document.querySelectorAll("main section[id]").forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec, start: "top center", end: "bottom center",
    onToggle: (self) => {
      if (!self.isActive) return;
      document.querySelectorAll(".nav__links a").forEach((a) =>
        a.classList.toggle("active", a.getAttribute("href") === "#" + sec.id)
      );
    },
  });
});

/* ---------- Mobile menu ---------- */
const toggle = document.getElementById("navToggle");
const links = document.getElementById("navLinks");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.classList.toggle("open", open);
  if (open) gsap.from(".nav__links a", { y: 30, opacity: 0, stagger: 0.06, duration: 0.5, ease: "power3.out" });
});
links.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => { links.classList.remove("open"); toggle.classList.remove("open"); })
);

/* ---------- Pointer-only effects ---------- */
if (window.matchMedia("(hover: hover)").matches && !reduced) {
  // Custom cursor
  const cursor = document.getElementById("cursor");
  const dot = document.getElementById("cursorDot");
  const cx = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3" });
  const cy = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3" });
  window.addEventListener("pointermove", (e) => {
    cx(e.clientX); cy(e.clientY);
    cursor.style.opacity = dot.style.opacity = 1;
    gsap.set(dot, { x: e.clientX, y: e.clientY });
  });
  document.querySelectorAll("a, button, .card").forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
  });

  // Magnetic buttons
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

  // 3D tilt cards
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
}

/* ---------- Experience timeline ---------- */
gsap.to("#timelineProgress", {
  scaleY: 1, ease: "none",
  scrollTrigger: { trigger: "#timeline", start: "top 70%", end: "bottom 70%", scrub: 0.6 },
});
gsap.utils.toArray("[data-tl]").forEach((item, i) => {
  const fromLeft = window.innerWidth > 760 && i % 2 === 0;
  gsap.from(item.querySelector(".tl__card"), {
    x: window.innerWidth > 760 ? (fromLeft ? -60 : 60) : 40, opacity: 0, duration: 1, ease: "power3.out",
    scrollTrigger: { trigger: item, start: "top 85%" },
  });
  gsap.from(item.querySelector(".tl__dot"), {
    scale: 0, duration: 0.6, ease: "back.out(3)",
    scrollTrigger: { trigger: item, start: "top 80%" },
  });
});
