import{ab as z,a6 as I}from"./environment-xt27swOd.js";import{fp as P,eq as G,d as A,V as E,i as N,C as y,fi as F,a6 as C,M as $,B as D}from"./three-Dj-PijxP.js";const O="bgvrOutline",m="bgvrOutlineNormal",W=24e3,f=1e4,j=.12,T=`
uniform float thickness;
uniform float maxGrow;

attribute vec3 bgvrOutlineNormal;

#include <common>
#include <skinning_pars_vertex>

void main() {
  vec3 objectNormal = bgvrOutlineNormal;
  vec3 transformed = vec3( position );

  // Gehäutete Netze (die Handschuhe) hängen an ihrem Skelett: Ohne diese drei
  // Bausteine stünde ihr Saum in der Grundhaltung im Raum herum.
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>

  vec4 mvPosition = vec4( transformed, 1.0 );
  vec3 growNormal = objectNormal;

  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
    growNormal = mat3( instanceMatrix ) * growNormal;
  #endif

  mvPosition = modelViewMatrix * mvPosition;
  growNormal = normalize( normalMatrix * growNormal );

  // Der Betrag, der auf dem Bildschirm eine gleich breite Kante ergibt: Er
  // wächst mit der Entfernung, weil alles andere mit ihr schrumpft. Der Deckel
  // darüber ist die einzige Zutat, ohne die eine ferne Kiste zum Klecks wird.
  float distance = max( - mvPosition.z, 0.02 );
  float grow = min( thickness * distance / max( projectionMatrix[1][1], 0.0001 ), maxGrow );
  mvPosition.xyz += growNormal * grow;

  gl_Position = projectionMatrix * mvPosition;
}
`,K=`
uniform vec3 diffuse;

#include <common>

void main() {
  gl_FragColor = vec4( diffuse, 1.0 );
  // Dieselben zwei Zeilen wie in jedem Material von three.js: Ohne sie wäre
  // dieselbe Kante im Bild schwarz und im Spiegel grau. Die Funktionen
  // dahinter legt three.js jedem Fragment-Shader ohnehin vorweg — sie hier
  // noch einmal einzubinden war ein „redefinition"-Fehler und ein schwarzes
  // Bild.
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;function h(e,t){const r=e.geometry;r.boundingSphere||r.computeBoundingSphere();const s=r.boundingSphere?.radius??0;if(!(s>0))return t.maxGrow;e.updateWorldMatrix(!0,!1);const o=e.getWorldScale(_),a=Math.max(Math.abs(o.x),Math.abs(o.y),Math.abs(o.z));return Math.min(t.maxGrow,s*a*j)}const _=new E;function R(e,t){const r=z(t.width,h(e,t),new y(t.color),e.getWorldScale(_).x);return r||new F({uniforms:{thickness:{value:t.width},maxGrow:{value:h(e,t)},diffuse:{value:new y(t.color)}},vertexShader:T,fragmentShader:K,side:C})}function Z(e){if(e.getAttribute(m))return!0;const t=e.getAttribute("position"),r=e.getAttribute("normal");if(!t||!r||r.count!==t.count)return!1;if(t.count>W)return e.setAttribute(m,r),!0;const s=new Map,o=new Array(t.count);for(let n=0;n<t.count;n++){const i=`${Math.round(t.getX(n)*f)},${Math.round(t.getY(n)*f)},${Math.round(t.getZ(n)*f)}`;o[n]=i;const c=s.get(i);c?(c[0]+=r.getX(n),c[1]+=r.getY(n),c[2]+=r.getZ(n)):s.set(i,[r.getX(n),r.getY(n),r.getZ(n)])}const a=new Float32Array(t.count*3);for(let n=0;n<t.count;n++){const i=s.get(o[n]),c=Math.hypot(i[0],i[1],i[2]);c<1e-6?(a[n*3]=r.getX(n),a[n*3+1]=r.getY(n),a[n*3+2]=r.getZ(n)):(a[n*3]=i[0]/c,a[n*3+1]=i[1]/c,a[n*3+2]=i[2]/c)}return e.setAttribute(m,new N(a,3)),!0}function w(e){return e.userData[O]===!0}function q(e){const t=[];e.traverse(r=>{w(r)&&t.push(r)});for(const r of t)r.removeFromParent();return t.length}function B(e){return e.children.find(w)??null}function J(e,t){const r=B(e);if(r){const i=r.material;return i.uniforms.thickness.value=t.width,i.uniforms.maxGrow.value=h(e,t),i.uniforms.diffuse.value.set(t.color),r}if(!Z(e.geometry))return null;const s=R(e,t),o=e,a=e;let n;if(o.isSkinnedMesh){const i=new P(e.geometry,s);i.bind(o.skeleton,o.bindMatrix),n=i}else if(a.isInstancedMesh){const i=new G(e.geometry,s,a.count);i.instanceMatrix=a.instanceMatrix,n=i}else n=new A(e.geometry,s);return H(e,n)}function H(e,t){return t.name="outline",t.userData[O]=!0,t.castShadow=!1,t.receiveShadow=!1,t.frustumCulled=e.frustumCulled,t.layers.mask=e.layers.mask,t.raycast=()=>{},e.add(t),t}function Q(e){const t=B(e);return t?(e.remove(t),t.material.dispose(),!0):!1}const b=new $,x=new $,S=["position","normal","uv"];function ee(e,t){e.updateMatrixWorld(!0),x.copy(e.matrixWorld).invert();const r=new Map;for(const o of t)o.traverse(a=>{const n=a;if(!n.isMesh||!Y(n,e)||n.isSkinnedMesh||n.isInstancedMesh||Array.isArray(n.material)||!n.material||w(n)||n.matrixWorld.determinant()<=0||!S.every(u=>n.geometry.getAttribute(u)))return;const i=`${L(n.material)}|${n.castShadow?1:0}|${n.receiveShadow?1:0}`,c=r.get(i)??{material:n.material,meshes:[]};c.meshes.push(n),r.set(i,c)});let s=0;for(const{material:o,meshes:a}of r.values()){if(a.length<2)continue;const n=a.map(u=>{const v=u.geometry.index?u.geometry.toNonIndexed():u.geometry.clone(),p=new D;for(const M of S)p.setAttribute(M,X(v.getAttribute(M)));return v.dispose(),b.multiplyMatrices(x,u.matrixWorld),p.applyMatrix4(b)}),i=I(n,!1);for(const u of n)u.dispose();if(!i)continue;i.computeBoundingSphere();const c=new A(i,o);c.name="merged-by-look",c.castShadow=a[0].castShadow,c.receiveShadow=a[0].receiveShadow,e.add(c);for(const u of a)u.removeFromParent();s+=a.length-1}return s}function Y(e,t){for(let r=e;r&&r!==t;r=r.parent)if(!r.visible)return!1;return!0}function L(e){const t=e;return[e.type,t.color?.getHex()??"",t.emissive?.getHex()??"",t.emissiveIntensity??"",t.roughness??"",t.metalness??"",e.transparent?1:0,e.opacity,e.side,e.vertexColors?1:0,g(t.map),g(t.emissiveMap),g(t.normalMap)].join("|")}const k=new WeakMap;let d=null;const l=24;function g(e){if(!e)return"";const t=k.get(e);if(t)return t;let r=e.uuid;const s=e.image;try{if(s&&s.width&&s.height){if(!d){const o=document.createElement("canvas");o.width=o.height=l,d=o.getContext("2d",{willReadFrequently:!0})}if(d){d.clearRect(0,0,l,l),d.drawImage(s,0,0,l,l);const o=d.getImageData(0,0,l,l).data;let a=2166136261;for(let n=0;n<o.length;n++)a=Math.imul(a^o[n],16777619);r=`${s.width}x${s.height}:${(a>>>0).toString(36)}|${e.flipY?1:0}|${e.wrapS}|${e.wrapT}|${e.offset.x},${e.offset.y},${e.repeat.x},${e.repeat.y},${e.rotation}`}}}catch{r=e.uuid}return k.set(e,r),r}function X(e){const t=e.itemSize,r=new Float32Array(e.count*t);for(let s=0;s<e.count;s++)for(let o=0;o<t;o++)r[s*t+o]=e.getComponent(s,o);return new N(r,t)}export{J as a,L as b,X as c,Z as e,w as i,ee as m,Q as r,q as s};
//# sourceMappingURL=mergeByLook-8Q7u-4Hs.js.map
