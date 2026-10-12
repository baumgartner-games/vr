import{_ as C,a9 as W,d as G,V as l,i as F,A as K,a5 as V,C as H}from"./three-D35U8f_M.js";import{ak as U}from"./environment-pOwPRJt9.js";const z="bgvrOutline",B="bgvrNoOutline",f="bgvrOutlineNormal",Y=24e3,g=1e4,Z=.12,$=`
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
`,j=`
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
`;function P(e,t){const n=e.geometry;n.boundingSphere||n.computeBoundingSphere();const r=n.boundingSphere?.radius??0;if(!(r>0))return t.maxGrow;e.updateWorldMatrix(!0,!1);const i=e.getWorldScale(X),s=Math.max(Math.abs(i.x),Math.abs(i.y),Math.abs(i.z));return Math.min(t.maxGrow,r*s*Z)}const X=new l;function q(e,t){return new K({uniforms:{thickness:{value:t.width},maxGrow:{value:P(e,t)},diffuse:{value:new H(t.color)}},vertexShader:$,fragmentShader:j,side:V})}function Q(e){if(e.getAttribute(f))return!0;const t=e.getAttribute("position"),n=e.getAttribute("normal");if(!t||!n||n.count!==t.count)return!1;if(t.count>Y)return e.setAttribute(f,n),!0;const r=new Map,i=new Array(t.count);for(let a=0;a<t.count;a++){const o=`${Math.round(t.getX(a)*g)},${Math.round(t.getY(a)*g)},${Math.round(t.getZ(a)*g)}`;i[a]=o;const u=r.get(o);u?(u[0]+=n.getX(a),u[1]+=n.getY(a),u[2]+=n.getZ(a)):r.set(o,[n.getX(a),n.getY(a),n.getZ(a)])}const s=new Float32Array(t.count*3);for(let a=0;a<t.count;a++){const o=r.get(i[a]),u=Math.hypot(o[0],o[1],o[2]);u<1e-6?(s[a*3]=n.getX(a),s[a*3+1]=n.getY(a),s[a*3+2]=n.getZ(a)):(s[a*3]=o[0]/u,s[a*3+1]=o[1]/u,s[a*3+2]=o[2]/u)}return e.setAttribute(f,new F(s,3)),!0}function S(e){return e.userData[z]===!0}function Se(e){return e.userData[B]=!0,e}function J(e){return e.userData[B]===!0}function Me(e){const t=[];e.traverse(n=>{S(n)&&t.push(n)});for(const n of t)n.removeFromParent();return t.length}function I(e){return e.children.find(S)??null}function ee(e,t){const n=I(e);if(n){const o=n.material;return o.uniforms.thickness.value=t.width,o.uniforms.maxGrow.value=P(e,t),o.uniforms.diffuse.value.set(t.color),n}if(!Q(e.geometry))return null;const r=q(e,t),i=e,s=e;let a;if(i.isSkinnedMesh){const o=new C(e.geometry,r);o.bind(i.skeleton,i.bindMatrix),a=o}else if(s.isInstancedMesh){const o=new W(e.geometry,r,s.count);o.instanceMatrix=s.instanceMatrix,a=o}else a=new G(e.geometry,r);return te(e,a)}function te(e,t){return t.name="outline",t.userData[z]=!0,t.castShadow=!1,t.receiveShadow=!1,t.frustumCulled=e.frustumCulled,t.layers.mask=e.layers.mask,t.raycast=()=>{},e.add(t),t}function ne(e){const t=I(e);return t?(e.remove(t),t.material.dispose(),!0):!1}const d="bgvrLook",v="bgvrLookKept",re=`
{
  // Die Beleuchtung ohne die Grundfarbe: Sonst hinge die Stufe daran, wie hell
  // ein Ding gestrichen ist, und eine dunkle Kiste hätte gar keine.
  vec3 bgvrTint = max( diffuseColor.rgb, vec3( 0.03 ) );
  vec3 bgvrLit = ( reflectedLight.directDiffuse + reflectedLight.indirectDiffuse ) / bgvrTint;
  float bgvrLevel = dot( bgvrLit, vec3( 0.3333 ) );
  if ( bgvrLevel > 0.0001 ) {
    // Die unterste Stufe ist die Null, und gerundet fällt alles Schwache
    // hinein: Im Portallabor, wo das Licht von zwei Deckenlampen kommt, war
    // damit die halbe Halle **stockschwarz** — Dominos, Wände, alles ohne
    // Zeichnung. Der Boden darunter lässt eine dunkle Fläche dunkel bleiben,
    // ohne sie auszulöschen; ganz unbeleuchtet bleibt trotzdem unbeleuchtet.
    float bgvrStep = max( floor( bgvrLevel * BANDS + 0.5 ) / BANDS, bgvrLevel * 0.6 );
    float bgvrScale = bgvrStep / bgvrLevel;
    reflectedLight.directDiffuse *= bgvrScale;
    reflectedLight.indirectDiffuse *= bgvrScale;
  }
  // Ein weiches Glanzlicht quer über eine Fläche ist genau das, was ein
  // gezeichnetes Bild nicht hat.
  reflectedLight.directSpecular *= 0.3;
  reflectedLight.indirectSpecular *= 0.3;
}
`,ae=0;function b(e){return`${Math.max(0,Math.round(e))}`}function ie(e,t){if(!(t>0))return;const n=Math.max(1,Math.round(t)).toFixed(1);e.fragmentShader=e.fragmentShader.replace("#include <lights_fragment_end>",`#include <lights_fragment_end>
${re.replace(/BANDS/g,n)}`)}const k=new Map;function se(e){const t=b(e);let n=k.get(t);return n||(n=r=>ie(r,e),k.set(t,n)),n}function R(e){return!e.isMeshStandardMaterial||e.transparent?!1:e.userData.bgvrNoLook!==!0}function oe(e){return e.userData[d]??ae}function ue(e,t){if(!R(e))return!1;const n=b(t);return b(oe(e))===n?!1:t>0?(e.userData[d]===void 0&&Object.prototype.hasOwnProperty.call(e,"onBeforeCompile")&&(e.userData[v]=e.onBeforeCompile.bind(e)),e.userData[d]=t,e.onBeforeCompile=se(t),e.customProgramCacheKey=()=>`bgvr:${n}`,e.needsUpdate=!0,!0):ce(e)}function ce(e){if(e.userData[d]===void 0)return!1;const t=e.userData[v];return t?e.onBeforeCompile=t:delete e.onBeforeCompile,delete e.customProgramCacheKey,delete e.userData[v],delete e.userData[d],e.needsUpdate=!0,!0}const x="bgvrShadowBase",T="bgvrNoShadow",y="bgvrCastBase",L="bgvrAmbientBase",A="bgvrSunDir",_=2;function De(e){e.userData[T]=!0,e.castShadow=!1}function de(e){return e.userData[T]===!0}const m=new l,E=new l,w=new l;function le(e){return Array.isArray(e.material)?e.material:[e.material]}function he(e){return e.isMeshStandardMaterial===!0}function fe(e,t){const n=e;if(!n.isHemisphereLight&&!n.isAmbientLight)return!1;if(n.userData.dynamicIntensity===!0)return!0;const r=n.userData[L]??n.intensity;return n.userData[L]=r,n.intensity=r*t.ambientScale,!0}const O=new WeakMap;function ke(e,t,n=!1){const r=[];return e.traverse(i=>{const s=i;if(s.isDirectionalLight){r.push(s);return}if(fe(i,t))return;const a=i;if(!a.isMesh||S(a))return;const o=O.get(a);if(!n&&o&&o.profile===t&&o.material===a.material)return;O.set(a,{profile:t,material:a.material});const u=le(a).filter(c=>!!c);if(!u.some(he))return;for(const c of u)ue(c,t.toonBands),n&&R(c)&&(c.needsUpdate=!0);const M=a.userData.backdrop===!0,D=u.every(c=>!c.transparent);t.outlines&&!M&&D&&!J(a)?ee(a,{width:t.outlineWidth,maxGrow:t.outlineMaxGrow,color:t.outlineColor}):ne(a);const h=a.userData[x]??{cast:a.castShadow,receive:a.receiveShadow};if(a.userData[x]=h,!t.lightShadows){a.castShadow=h.cast,a.receiveShadow=h.receive;return}a.castShadow=!M&&D&&!de(a),a.receiveShadow=!0}),me(r,t)}function ge(e){let t=null;for(const n of e)(!t||n.intensity>t.intensity)&&(t=n);return t}function me(e,t){const n=t.shadows?ge(e):null;for(const r of e){const i=r.userData[y]??r.castShadow;if(r.userData[y]=i,r!==n){r.castShadow=i;continue}r.castShadow=!0,r.shadow.mapSize.width!==t.shadowMapSize&&(r.shadow.mapSize.set(t.shadowMapSize,t.shadowMapSize),r.shadow.map?.dispose(),r.shadow.map=null,r.shadow.needsUpdate=!0);const s=r.shadow.camera;s.left=-t.shadowRange,s.right=t.shadowRange,s.top=t.shadowRange,s.bottom=-t.shadowRange,s.near=.5,s.far=t.shadowDistance*2+t.shadowRange,s.updateProjectionMatrix(),r.shadow.bias=-4e-4,r.shadow.normalBias=.02,r.shadow.radius=t.shadowRadius}return n}function xe(e,t,n){let r=e.userData[A];r||(e.getWorldPosition(E),e.target.getWorldPosition(w),r=new l().copy(w).sub(E).normalize(),r.lengthSq()<.5&&r.set(-.4,-1,-.3).normalize(),e.userData[A]=r),m.set(p(t.x),p(t.y),p(t.z)),N(e.target,m),N(e,w.copy(m).addScaledVector(r,-n.shadowDistance)),e.target.updateMatrixWorld()}function p(e){return Math.round(e/_)*_}function N(e,t){e.position.copy(t);const n=e.parent;n&&(n.updateWorldMatrix(!0,!1),n.worldToLocal(e.position))}const we=.5,ye=-Math.PI/5,Le=.32,Ae=.68,pe=.4;function _e(e,t){const n=Math.max(e.rect.height,0),r=n*pe,i=Math.max(e.content,n),s=Math.floor(Math.min(i,n+2*r)),a=Math.max(i-s,0),o=Math.floor(Math.min(Math.max(e.scrollTop-r,0),a));return t&&t.height===s&&Math.abs(t.top-o)<=r/2?t:{top:o,height:s}}function Ee(e,t,n){const r=e.rect;return n.width<=0||n.height<=0||r.width<=0||r.height<=0||n.left>=r.left+r.width||n.left+n.width<=r.left||n.top>=r.top+r.height||n.top+n.height<=r.top?null:{x:n.left-r.left+n.width/2,y:n.top-r.top+e.scrollTop-t.top+n.height/2,size:Math.min(n.width,n.height)}}class Oe{page="";asked=new Map;held=new Set;abandoned=new Set;get size(){return this.held.size}turnTo(t){if(t===this.page)return[];this.page=t;const n=[...this.held];this.held.clear();for(const r of this.asked.keys())this.abandoned.add(r);return this.asked.clear(),n}due(t,n){if(this.held.has(t))return!1;const r=this.asked.get(t);return r===void 0||n-r>=we}has(t){return this.held.has(t)}got(t){this.held.add(t),this.asked.delete(t),this.abandoned.delete(t)}missed(t,n){this.asked.set(t,n),this.abandoned.delete(t)}keepOnly(t){const n=new Set(t),r=[];for(const i of this.held)n.has(i)||r.push(i);for(const i of r)this.held.delete(i);for(const i of[...this.asked.keys()])n.has(i)||(this.asked.delete(i),this.abandoned.add(i));return r}dropAbandoned(){const t=[...this.abandoned].filter(n=>!this.held.has(n));return this.abandoned.clear(),t}}const Ne="detailOverlay",ze=`kaykit:${U}`;function Be(e,t){if(!t.length)return[];const n=t.map(a=>e.indexOf(a)).filter(a=>a>=0);if(!n.length)return[...t];const r=t.length,i=Math.max(0,Math.min(...n)-r),s=Math.min(e.length-1,Math.max(...n)+r);return e.slice(i,s+1)}export{ze as D,Le as P,ye as a,we as b,Ne as c,Se as d,Oe as e,Ee as f,Ae as g,Be as h,S as i,De as j,ke as k,xe as l,ee as m,Q as n,_e as p,ne as r,Me as s};
//# sourceMappingURL=previewGrid-BGRaqnta.js.map
