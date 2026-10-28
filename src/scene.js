/* ------------------------------------------------------------------
   Hero WebGL scene (source). Built to js/scene.min.js with `npm run build`.
   Loaded lazily by main.js after the page is idle, so it never blocks
   first paint. Particle sphere + wireframe core + ring + star field.
------------------------------------------------------------------- */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, IcosahedronGeometry, BufferGeometry,
  BufferAttribute, ShaderMaterial, AdditiveBlending, Color, Vector2, Points, Mesh,
  MeshBasicMaterial, TorusGeometry, PointsMaterial, Clock,
} from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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

export function init(canvas) {
  const mobile = window.innerWidth < 760;
  const renderer = new WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 9;
  const group = new Group();
  scene.add(group);

  // Particle sphere — duplicate vertices merged, so each point is drawn once
  let geo = new IcosahedronGeometry(2.4, mobile ? 28 : 40);
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  geo = mergeVertices(geo);
  const sphereMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0.35 },
      uMouse: { value: new Vector2() },
      uPixel: { value: renderer.getPixelRatio() },
      uColorA: { value: new Color("#7c5cff") },
      uColorB: { value: new Color("#4fd1ff") },
    },
    vertexShader: `
      uniform float uTime; uniform float uAmp; uniform vec2 uMouse; uniform float uPixel;
      varying float vN;
      ${noiseGLSL}
      void main(){
        vec3 p = position;
        float n = snoise(p * 0.6 + vec3(uTime * 0.25, uMouse * 0.6));
        vN = n;
        p += normalize(position) * n * uAmp;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (3.0 + n * 1.8) * uPixel * (6.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColorA; uniform vec3 uColorB; varying float vN;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(mix(uColorA, uColorB, vN * 0.5 + 0.5), a);
      }`,
  });
  const sphere = new Points(geo, sphereMat);
  group.add(sphere);

  const core = new Mesh(
    new IcosahedronGeometry(1.15, 1),
    new MeshBasicMaterial({ color: 0x7c5cff, wireframe: true, transparent: true, opacity: 0.35 })
  );
  group.add(core);

  const ring = new Mesh(
    new TorusGeometry(3.4, 0.008, 8, 200),
    new MeshBasicMaterial({ color: 0x4f7cff, transparent: true, opacity: 0.5 })
  );
  ring.rotation.x = Math.PI * 0.42;
  group.add(ring);

  const count = mobile ? 600 : 1400;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 30;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
  }
  const starsGeo = new BufferGeometry();
  starsGeo.setAttribute("position", new BufferAttribute(pos, 3));
  const stars = new Points(starsGeo, new PointsMaterial({ size: 0.03, color: 0xb9a8ff, transparent: true, opacity: 0.6 }));
  scene.add(stars);

  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const m = w < 960;
    group.position.set(m ? 0 : 3.1, m ? -2.4 : 0.2, 0);
    group.scale.setScalar(m ? 0.75 : 1);
  }
  window.addEventListener("resize", layout);
  layout();

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  const clock = new Clock();
  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
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
  });

  return { group, sphereMat, camera };
}
