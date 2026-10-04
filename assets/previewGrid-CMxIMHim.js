import{_ as R,a9 as T,d as C,V as h,i as G,A as W,a5 as F,C as K}from"./three-BDv6_4cC.js";import{ai as V}from"./environment-Ij5Mn1RR.js";const O="bgvrOutline",N="bgvrNoOutline",f="bgvrOutlineNormal",H=24e3,g=1e4,U=.12,Y=`
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
`,Z=`
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
`;function z(e,t){const n=e.geometry;n.boundingSphere||n.computeBoundingSphere();const r=n.boundingSphere?.radius??0;if(!(r>0))return t.maxGrow;e.updateWorldMatrix(!0,!1);const i=e.getWorldScale($),s=Math.max(Math.abs(i.x),Math.abs(i.y),Math.abs(i.z));return Math.min(t.maxGrow,r*s*U)}const $=new h;function j(e,t){return new W({uniforms:{thickness:{value:t.width},maxGrow:{value:z(e,t)},diffuse:{value:new K(t.color)}},vertexShader:Y,fragmentShader:Z,side:F})}function X(e){if(e.getAttribute(f))return!0;const t=e.getAttribute("position"),n=e.getAttribute("normal");if(!t||!n||n.count!==t.count)return!1;if(t.count>H)return e.setAttribute(f,n),!0;const r=new Map,i=new Array(t.count);for(let a=0;a<t.count;a++){const o=`${Math.round(t.getX(a)*g)},${Math.round(t.getY(a)*g)},${Math.round(t.getZ(a)*g)}`;i[a]=o;const u=r.get(o);u?(u[0]+=n.getX(a),u[1]+=n.getY(a),u[2]+=n.getZ(a)):r.set(o,[n.getX(a),n.getY(a),n.getZ(a)])}const s=new Float32Array(t.count*3);for(let a=0;a<t.count;a++){const o=r.get(i[a]),u=Math.hypot(o[0],o[1],o[2]);u<1e-6?(s[a*3]=n.getX(a),s[a*3+1]=n.getY(a),s[a*3+2]=n.getZ(a)):(s[a*3]=o[0]/u,s[a*3+1]=o[1]/u,s[a*3+2]=o[2]/u)}return e.setAttribute(f,new G(s,3)),!0}function S(e){return e.userData[O]===!0}function ve(e){return e.userData[N]=!0,e}function q(e){return e.userData[N]===!0}function be(e){const t=[];e.traverse(n=>{S(n)&&t.push(n)});for(const n of t)n.removeFromParent();return t.length}function B(e){return e.children.find(S)??null}function Q(e,t){const n=B(e);if(n){const o=n.material;return o.uniforms.thickness.value=t.width,o.uniforms.maxGrow.value=z(e,t),o.uniforms.diffuse.value.set(t.color),n}if(!X(e.geometry))return null;const r=j(e,t),i=e,s=e;let a;if(i.isSkinnedMesh){const o=new R(e.geometry,r);o.bind(i.skeleton,i.bindMatrix),a=o}else if(s.isInstancedMesh){const o=new T(e.geometry,r,s.count);o.instanceMatrix=s.instanceMatrix,a=o}else a=new C(e.geometry,r);return J(e,a)}function J(e,t){return t.name="outline",t.userData[O]=!0,t.castShadow=!1,t.receiveShadow=!1,t.frustumCulled=e.frustumCulled,t.layers.mask=e.layers.mask,t.raycast=()=>{},e.add(t),t}function ee(e){const t=B(e);return t?(e.remove(t),t.material.dispose(),!0):!1}const d="bgvrLook",v="bgvrLookKept",te=`
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
`,ne=0;function b(e){return`${Math.max(0,Math.round(e))}`}function re(e,t){if(!(t>0))return;const n=Math.max(1,Math.round(t)).toFixed(1);e.fragmentShader=e.fragmentShader.replace("#include <lights_fragment_end>",`#include <lights_fragment_end>
${te.replace(/BANDS/g,n)}`)}const D=new Map;function ae(e){const t=b(e);let n=D.get(t);return n||(n=r=>re(r,e),D.set(t,n)),n}function P(e){return!e.isMeshStandardMaterial||e.transparent?!1:e.userData.bgvrNoLook!==!0}function ie(e){return e.userData[d]??ne}function se(e,t){if(!P(e))return!1;const n=b(t);return b(ie(e))===n?!1:t>0?(e.userData[d]===void 0&&Object.prototype.hasOwnProperty.call(e,"onBeforeCompile")&&(e.userData[v]=e.onBeforeCompile.bind(e)),e.userData[d]=t,e.onBeforeCompile=ae(t),e.customProgramCacheKey=()=>`bgvr:${n}`,e.needsUpdate=!0,!0):oe(e)}function oe(e){if(e.userData[d]===void 0)return!1;const t=e.userData[v];return t?e.onBeforeCompile=t:delete e.onBeforeCompile,delete e.customProgramCacheKey,delete e.userData[v],delete e.userData[d],e.needsUpdate=!0,!0}const x="bgvrShadowBase",I="bgvrNoShadow",k="bgvrCastBase",y="bgvrAmbientBase",L="bgvrSunDir",A=2;function Se(e){e.userData[I]=!0,e.castShadow=!1}function ue(e){return e.userData[I]===!0}const m=new h,_=new h,w=new h;function ce(e){return Array.isArray(e.material)?e.material:[e.material]}function de(e){return e.isMeshStandardMaterial===!0}function he(e,t){const n=e;if(!n.isHemisphereLight&&!n.isAmbientLight)return!1;if(n.userData.dynamicIntensity===!0)return!0;const r=n.userData[y]??n.intensity;return n.userData[y]=r,n.intensity=r*t.ambientScale,!0}function Me(e,t,n=!1){const r=[];return e.traverse(i=>{const s=i;if(s.isDirectionalLight){r.push(s);return}if(he(i,t))return;const a=i;if(!a.isMesh||S(a))return;const o=ce(a).filter(c=>!!c);if(!o.some(de))return;for(const c of o)se(c,t.toonBands),n&&P(c)&&(c.needsUpdate=!0);const u=a.userData.backdrop===!0,M=o.every(c=>!c.transparent);t.outlines&&!u&&M&&!q(a)?Q(a,{width:t.outlineWidth,maxGrow:t.outlineMaxGrow,color:t.outlineColor}):ee(a);const l=a.userData[x]??{cast:a.castShadow,receive:a.receiveShadow};if(a.userData[x]=l,!t.lightShadows){a.castShadow=l.cast,a.receiveShadow=l.receive;return}a.castShadow=!u&&M&&!ue(a),a.receiveShadow=!0}),fe(r,t)}function le(e){let t=null;for(const n of e)(!t||n.intensity>t.intensity)&&(t=n);return t}function fe(e,t){const n=t.shadows?le(e):null;for(const r of e){const i=r.userData[k]??r.castShadow;if(r.userData[k]=i,r!==n){r.castShadow=i;continue}r.castShadow=!0,r.shadow.mapSize.width!==t.shadowMapSize&&(r.shadow.mapSize.set(t.shadowMapSize,t.shadowMapSize),r.shadow.map?.dispose(),r.shadow.map=null,r.shadow.needsUpdate=!0);const s=r.shadow.camera;s.left=-t.shadowRange,s.right=t.shadowRange,s.top=t.shadowRange,s.bottom=-t.shadowRange,s.near=.5,s.far=t.shadowDistance*2+t.shadowRange,s.updateProjectionMatrix(),r.shadow.bias=-4e-4,r.shadow.normalBias=.02,r.shadow.radius=t.shadowRadius}return n}function De(e,t,n){let r=e.userData[L];r||(e.getWorldPosition(_),e.target.getWorldPosition(w),r=new h().copy(w).sub(_).normalize(),r.lengthSq()<.5&&r.set(-.4,-1,-.3).normalize(),e.userData[L]=r),m.set(p(t.x),p(t.y),p(t.z)),E(e.target,m),E(e,w.copy(m).addScaledVector(r,-n.shadowDistance)),e.target.updateMatrixWorld()}function p(e){return Math.round(e/A)*A}function E(e,t){e.position.copy(t);const n=e.parent;n&&(n.updateWorldMatrix(!0,!1),n.worldToLocal(e.position))}const ge=.5,xe=-Math.PI/5,ke=.32,ye=.68,me=.4;function Le(e,t){const n=Math.max(e.rect.height,0),r=n*me,i=Math.max(e.content,n),s=Math.floor(Math.min(i,n+2*r)),a=Math.max(i-s,0),o=Math.floor(Math.min(Math.max(e.scrollTop-r,0),a));return t&&t.height===s&&Math.abs(t.top-o)<=r/2?t:{top:o,height:s}}function Ae(e,t,n){const r=e.rect;return n.width<=0||n.height<=0||r.width<=0||r.height<=0||n.left>=r.left+r.width||n.left+n.width<=r.left||n.top>=r.top+r.height||n.top+n.height<=r.top?null:{x:n.left-r.left+n.width/2,y:n.top-r.top+e.scrollTop-t.top+n.height/2,size:Math.min(n.width,n.height)}}class _e{page="";asked=new Map;held=new Set;abandoned=new Set;get size(){return this.held.size}turnTo(t){if(t===this.page)return[];this.page=t;const n=[...this.held];this.held.clear();for(const r of this.asked.keys())this.abandoned.add(r);return this.asked.clear(),n}due(t,n){if(this.held.has(t))return!1;const r=this.asked.get(t);return r===void 0||n-r>=ge}has(t){return this.held.has(t)}got(t){this.held.add(t),this.asked.delete(t),this.abandoned.delete(t)}missed(t,n){this.asked.set(t,n),this.abandoned.delete(t)}keepOnly(t){const n=new Set(t),r=[];for(const i of this.held)n.has(i)||r.push(i);for(const i of r)this.held.delete(i);for(const i of[...this.asked.keys()])n.has(i)||(this.asked.delete(i),this.abandoned.add(i));return r}dropAbandoned(){const t=[...this.abandoned].filter(n=>!this.held.has(n));return this.abandoned.clear(),t}}const Ee="detailOverlay",Oe=`kaykit:${V}`;function Ne(e,t){if(!t.length)return[];const n=t.map(a=>e.indexOf(a)).filter(a=>a>=0);if(!n.length)return[...t];const r=t.length,i=Math.max(0,Math.min(...n)-r),s=Math.min(e.length-1,Math.max(...n)+r);return e.slice(i,s+1)}export{Oe as D,ke as P,xe as a,ge as b,Ee as c,ve as d,_e as e,Ae as f,ye as g,Ne as h,S as i,Se as j,Me as k,De as l,Q as m,X as n,Le as p,ee as r,be as s};
//# sourceMappingURL=previewGrid-CMxIMHim.js.map
