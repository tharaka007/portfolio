/* ------------------------------------------------------------------
   Hero WebGL scene — noise-displaced particle sphere + wireframe core
   + floating particle field. Reacts to mouse and scroll.
------------------------------------------------------------------- */
(function () {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas || typeof THREE === "undefined") return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 9;

  const group = new THREE.Group();
  scene.add(group);

  // Simplex-style noise shared by shaders
  const noiseGLSL = `
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;
      vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }`;

  // ---- Particle sphere ----
  const sphereGeo = new THREE.IcosahedronGeometry(2.4, 40);
  const sphereMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0.35 },
      uMouse: { value: new THREE.Vector2() },
      uPixel: { value: renderer.getPixelRatio() },
      uColorA: { value: new THREE.Color("#7c5cff") },
      uColorB: { value: new THREE.Color("#4fd1ff") },
    },
    vertexShader: `
      uniform float uTime; uniform float uAmp; uniform vec2 uMouse; uniform float uPixel;
      varying float vN;
      ${noiseGLSL}
      void main(){
        vec3 p = position;
        float n = snoise(p * 0.6 + vec3(uTime * 0.25, uMouse * 0.6));
        vN = n;
        p += normal * n * uAmp;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.2 + n * 1.6) * uPixel * (6.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColorA; uniform vec3 uColorB; varying float vN;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uColorA, uColorB, vN * 0.5 + 0.5);
        gl_FragColor = vec4(col, a * 0.9);
      }`,
  });
  const sphere = new THREE.Points(sphereGeo, sphereMat);
  group.add(sphere);

  // ---- Wireframe core ----
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.15, 1),
    new THREE.MeshBasicMaterial({ color: 0x7c5cff, wireframe: true, transparent: true, opacity: 0.35 })
  );
  group.add(core);

  // ---- Orbit ring ----
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.4, 0.008, 8, 200),
    new THREE.MeshBasicMaterial({ color: 0x4f7cff, transparent: true, opacity: 0.5 })
  );
  ring.rotation.x = Math.PI * 0.42;
  group.add(ring);

  // ---- Background star field ----
  const count = 1400;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 30;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
  }
  const starsGeo = new THREE.BufferGeometry();
  starsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(
    starsGeo,
    new THREE.PointsMaterial({ size: 0.03, color: 0xb9a8ff, transparent: true, opacity: 0.6 })
  );
  scene.add(stars);

  // ---- Layout: place sphere right on desktop, centre-top on mobile ----
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const mobile = w < 960;
    group.position.set(mobile ? 0 : 3.1, mobile ? -2.4 : 0.2, 0);
    group.scale.setScalar(mobile ? 0.75 : 1);
  }
  window.addEventListener("resize", layout);
  layout();

  // ---- Interaction ----
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // Expose for GSAP (intro + scroll)
  window.heroScene = { group, sphereMat, core, ring, camera };

  // Pause rendering when hero is off-screen
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  const clock = new THREE.Clock();
  (function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    sphereMat.uniforms.uTime.value = t;
    sphereMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
    sphere.rotation.y = t * 0.08;
    core.rotation.x = t * 0.3;
    core.rotation.y = t * 0.2;
    ring.rotation.z = t * 0.15;

    group.rotation.y += (mouse.x * 0.4 - group.rotation.y) * 0.04;
    group.rotation.x += (-mouse.y * 0.3 - group.rotation.x) * 0.04;
    stars.rotation.y = t * 0.01 + mouse.x * 0.05;
    stars.rotation.x = mouse.y * 0.03;

    renderer.render(scene, camera);
  })();
})();
