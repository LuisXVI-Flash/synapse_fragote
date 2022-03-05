import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import {OrbitControls} from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls";
import { ImprovedNoise } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/math/ImprovedNoise';

import { Line2 } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/lines/Line2";
import { LineMaterial } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/lines/LineGeometry";

import { EffectComposer } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/postprocessing/UnrealBloomPass.js';

const perlin = new ImprovedNoise();
let v3 = new THREE.Vector3();

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 5000);
camera.position.set(5, 2, 5).setLength(12);
let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild(renderer.domElement);
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  m.resolution.set(innerWidth, innerHeight);
  bloomPass.resolution.set(innerWidth, innerHeight);
})

let controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.minDistance = 1;
controls.maxDistance = 15;

// <CURVE>

let curvePts = new Array(200).fill().map(p => {
  return new THREE.Vector3().randomDirection();
})
let curve = new THREE.CatmullRomCurve3(curvePts, true);

let pts = curve.getSpacedPoints(200);
pts.shift();
curve = new THREE.CatmullRomCurve3(pts, true);
pts = curve.getSpacedPoints(10000);
pts.forEach(p => {p.setLength(4)});

let n = new THREE.Vector3();
let s = new THREE.Vector3(0.5, 0.5, 1.);
pts.forEach(p => {
  deform(p);
})

let fPts = [];
pts.forEach(p => {fPts.push(p.x, p.y, p.z)});

let g = new LineGeometry();
g.setPositions(fPts);
let globalUniforms = {
  time: {value: 0},
  bloom: {value: 0}
}
let m = new LineMaterial({ 
  color: "magenta", 
  worldUnits: true, 
  linewidth: 0.0375, 
  alphaToCoverage: true,
  onBeforeCompile: shader => {
    shader.uniforms.time = globalUniforms.time;
    shader.uniforms.bloom = globalUniforms.bloom;
    shader.vertexShader = flVert;
    shader.fragmentShader = flFrag;
  }            
});
m.resolution.set(innerWidth, innerHeight);
let l = new Line2(g, m);
l.computeLineDistances();
scene.add(l);
// </CURVE>

// <BLOOM>
const params = {
  exposure: 1,
  bloomStrength: 7,
  bloomThreshold: 0,
  bloomRadius: 0
};
const renderScene = new RenderPass( scene, camera );

const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
bloomPass.threshold = params.bloomThreshold;
bloomPass.strength = params.bloomStrength;
bloomPass.radius = params.bloomRadius;

const bloomComposer = new EffectComposer( renderer );
bloomComposer.renderToScreen = false;
bloomComposer.addPass( renderScene );
bloomComposer.addPass( bloomPass );

const finalPass = new ShaderPass(
  new THREE.ShaderMaterial( {
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture }
    },
    vertexShader: document.getElementById( 'vertexshader' ).textContent,
    fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
    defines: {}
  } ), 'baseTexture'
);
finalPass.needsSwap = true;

const finalComposer = new EffectComposer( renderer );
finalComposer.addPass( renderScene );
finalComposer.addPass( finalPass );
// </BLOOM>

let clock = new THREE.Clock();

info.style.visibility = "hidden";
writing.style.visibility = "visible";

renderer.setAnimationLoop(() => {
  let t = clock.getElapsedTime();
  
  controls.update();
  
  globalUniforms.time.value = t;
  globalUniforms.bloom.value = 1;
  //renderer.setClearColor(0x000000);
  bloomComposer.render();
  globalUniforms.bloom.value = 0;
  //renderer.setClearColor(0x080032);
  finalComposer.render();
  //renderer.render(scene, camera);
})

function deform(p, useLength){
	let mainR = 5;

	v3.copy(p).normalize();
  let len = p.length();
  
  let ns = perlin.noise(v3.x * 3, v3.y * 3, v3.z * 3);
  ns = Math.pow(Math.abs(ns), 0.5) * 0.25;
  
  let r = smoothstep(0.375, 0,Math.abs(v3.x)) - ns;
  p.setLength(mainR - r*1);
  p.y *= 1 - 0.5 * smoothstep(0, -mainR, p.y);
  p.y *= 0.75;
  p.x *= 0.75;
  p.y *= 1 - 0.125 * smoothstep(mainR * 0.25, -mainR, p.z);
  p.x *= 1 - 0.125 * smoothstep(mainR * 0.25, -mainR, p.z);
  if(useLength) {
    p.multiplyScalar(len)
  };
  //p.y += 0.5;
}

//https://github.com/gre/smoothstep/blob/master/index.js
function smoothstep (min, max, value) {
  var x = Math.max(0, Math.min(1, (value-min)/(max-min)));
  return x*x*(3 - 2*x);
};
