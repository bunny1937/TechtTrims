// import { useEffect, useRef } from "react";
// import * as THREE from "three";

// export default function SoftMeshGradient({
//   color1 = "#8B5CF6",
//   color2 = "#3B82F6",
//   color3 = "#EC4899",
//   color4 = "#F59E0B",
//   speed = 0.5,
//   distortion = 2.5,
//   swirl = 3.0,
// }) {
//   const containerRef = useRef(null);

//   useEffect(() => {
//     if (!containerRef.current) return;
//     const container = containerRef.current;

//     const scene = new THREE.Scene();
//     const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

//     const renderer = new THREE.WebGLRenderer({
//       antialias: true,
//       alpha: true,
//     });
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//     container.appendChild(renderer.domElement);

//     const vertexShader = `
//       varying vec2 vUv;
//       void main() {
//         vUv = uv;
//         gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//       }
//     `;

//     const fragmentShader = `
//       uniform float uTime;
//       uniform vec2 uResolution;
//       uniform vec3 uColor1;
//       uniform vec3 uColor2;
//       uniform vec3 uColor3;
//       uniform vec3 uColor4;
//       uniform float uDistortion;
//       uniform float uSwirl;
//       uniform float uSpeed;
//       varying vec2 vUv;

//       vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
//       vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
//       vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
//       vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

//       float snoise(vec3 v) {
//         const vec2 C = vec2(1.0/6.0, 1.0/3.0);
//         const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

//         vec3 i  = floor(v + dot(v, C.yyy));
//         vec3 x0 = v - i + dot(i, C.xxx);

//         vec3 g = step(x0.yzx, x0.xyz);
//         vec3 l = 1.0 - g;
//         vec3 i1 = min(g.xyz, l.zxy);
//         vec3 i2 = max(g.xyz, l.zxy);

//         vec3 x1 = x0 - i1 + C.xxx;
//         vec3 x2 = x0 - i2 + C.yyy;
//         vec3 x3 = x0 - D.yyy;

//         i = mod289(i);
//         vec4 p = permute(permute(permute(
//                   i.z + vec4(0.0, i1.z, i2.z, 1.0))
//                 + i.y + vec4(0.0, i1.y, i2.y, 1.0))
//                 + i.x + vec4(0.0, i1.x, i2.x, 1.0));

//         float n_ = 0.142857142857;
//         vec3 ns = n_ * D.wyz - D.xzx;

//         vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

//         vec4 x_ = floor(j * ns.z);
//         vec4 y_ = floor(j - 7.0 * x_);

//         vec4 x = x_ *ns.x + ns.yyyy;
//         vec4 y = y_ *ns.x + ns.yyyy;
//         vec4 h = 1.0 - abs(x) - abs(y);

//         vec4 b0 = vec4(x.xy, y.xy);
//         vec4 b1 = vec4(x.zw, y.zw);

//         vec4 s0 = floor(b0)*2.0 + 1.0;
//         vec4 s1 = floor(b1)*2.0 + 1.0;
//         vec4 sh = -step(h, vec4(0.0));

//         vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
//         vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

//         vec3 p0 = vec3(a0.xy, h.x);
//         vec3 p1 = vec3(a0.zw, h.y);
//         vec3 p2 = vec3(a1.xy, h.z);
//         vec3 p3 = vec3(a1.zw, h.w);

//         vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
//         p0 *= norm.x;
//         p1 *= norm.y;
//         p2 *= norm.z;
//         p3 *= norm.w;

//         vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
//         m = m * m;
//         return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
//       }

//       void main() {
//         vec2 uv = vUv;
//         float time = uTime * uSpeed * 0.1;

//         vec3 pos1 = vec3(uv * uDistortion, time * 0.3);
//         vec3 pos2 = vec3(uv * uDistortion * 1.5, time * 0.4);

//         float noise1 = snoise(pos1);
//         float noise2 = snoise(pos2);

//         vec2 warpedUv = uv;
//         warpedUv.x += noise1 * 0.15 * uSwirl;
//         warpedUv.y += noise2 * 0.15 * uSwirl;

//         vec3 pos3 = vec3(warpedUv * 2.0, time * 0.2);
//         vec3 pos4 = vec3(warpedUv * 3.0, time * 0.25);

//         float noise3 = snoise(pos3);
//         float noise4 = snoise(pos4);

//         float mixer1 = (noise3 + 1.0) * 0.5;
//         float mixer2 = (noise4 + 1.0) * 0.5;

//         vec3 color = mix(
//           mix(uColor1, uColor2, mixer1),
//           mix(uColor3, uColor4, mixer2),
//           (noise1 + noise2 + 2.0) * 0.25
//         );

//         float brightness = 1.0 + (noise1 * 0.1);
//         color *= brightness;

//         gl_FragColor = vec4(color, 1.0);
//       }
//     `;

//     const hexToRgb = (hex) => {
//       const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
//       return result
//         ? {
//             r: parseInt(result[1], 16) / 255,
//             g: parseInt(result[2], 16) / 255,
//             b: parseInt(result[3], 16) / 255,
//           }
//         : { r: 0.5, g: 0.5, b: 0.5 };
//     };

//     const c1 = hexToRgb(color1);
//     const c2 = hexToRgb(color2);
//     const c3 = hexToRgb(color3);
//     const c4 = hexToRgb(color4);

//     const material = new THREE.ShaderMaterial({
//       vertexShader,
//       fragmentShader,
//       uniforms: {
//         uTime: { value: 0 },
//         uResolution: {
//           value: new THREE.Vector2(window.innerWidth, window.innerHeight),
//         },
//         uColor1: { value: new THREE.Vector3(c1.r, c1.g, c1.b) },
//         uColor2: { value: new THREE.Vector3(c2.r, c2.g, c2.b) },
//         uColor3: { value: new THREE.Vector3(c3.r, c3.g, c3.b) },
//         uColor4: { value: new THREE.Vector3(c4.r, c4.g, c4.b) },
//         uDistortion: { value: distortion },
//         uSwirl: { value: swirl },
//         uSpeed: { value: speed },
//       },
//     });

//     const geometry = new THREE.PlaneGeometry(2, 2);
//     const mesh = new THREE.Mesh(geometry, material);
//     scene.add(mesh);

//     const clock = new THREE.Clock();

//     const animate = () => {
//       material.uniforms.uTime.value = clock.getElapsedTime();
//       renderer.render(scene, camera);
//       requestAnimationFrame(animate);
//     };
//     animate();

//     const handleResize = () => {
//       const width = window.innerWidth;
//       const height = window.innerHeight;
//       renderer.setSize(width, height);
//       material.uniforms.uResolution.value.set(width, height);
//     };

//     window.addEventListener("resize", handleResize);

//     return () => {
//       window.removeEventListener("resize", handleResize);
//       if (container) {
//         container.removeChild(renderer.domElement);
//       }
//       geometry.dispose();
//       material.dispose();
//       renderer.dispose();
//     };
//   }, [color1, color2, color3, color4, speed, distortion, swirl]);

//   return (
//     <div
//       ref={containerRef}
//       style={{
//         position: "fixed",
//         top: 0,
//         left: 0,
//         width: "100%",
//         height: "100%",
//         zIndex: -1,
//       }}
//     />
//   );
// }
