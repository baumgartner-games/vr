import{a as O,j as _,h as N,r as x}from"./cutaway-Dbt8nWdQ.js";import{V as c}from"./three-BoIipe_Z.js";const u="bgvrLook",w="bgvrLookKept",C=`
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
`,R=0;function S(e){return`${Math.max(0,Math.round(e))}`}function P(e,t){if(!(t>0))return;const n=Math.max(1,Math.round(t)).toFixed(1);e.fragmentShader=e.fragmentShader.replace("#include <lights_fragment_end>",`#include <lights_fragment_end>
${C.replace(/BANDS/g,n)}`)}const v=new Map;function I(e){const t=S(e);let n=v.get(t);return n||(n=a=>P(a,e),v.set(t,n)),n}function k(e){return!e.isMeshStandardMaterial||e.transparent?!1:e.userData.bgvrNoLook!==!0}function K(e){return e.userData[u]??R}function E(e,t){if(!k(e))return!1;const n=S(t);return S(K(e))===n?!1:t>0?(e.userData[u]===void 0&&Object.prototype.hasOwnProperty.call(e,"onBeforeCompile")&&(e.userData[w]=e.onBeforeCompile.bind(e)),e.userData[u]=t,e.onBeforeCompile=I(t),e.customProgramCacheKey=()=>`bgvr:${n}`,e.needsUpdate=!0,!0):T(e)}function T(e){if(e.userData[u]===void 0)return!1;const t=e.userData[w];return t?e.onBeforeCompile=t:delete e.onBeforeCompile,delete e.customProgramCacheKey,delete e.userData[w],delete e.userData[u],e.needsUpdate=!0,!0}const D="bgvrShadowBase",z="bgvrNoShadow",m="bgvrCastBase",L="bgvrAmbientBase",y="bgvrSunDir",M=2;function Q(e){e.userData[z]=!0,e.castShadow=!1}function W(e){return e.userData[z]===!0}const h=new c,B=new c,f=new c;function G(e){return Array.isArray(e.material)?e.material:[e.material]}function H(e){return e.isMeshStandardMaterial===!0}function U(e,t){const n=e;if(!n.isHemisphereLight&&!n.isAmbientLight)return!1;if(n.userData.dynamicIntensity===!0)return!0;const a=n.userData[L]??n.intensity;return n.userData[L]=a,n.intensity=a*t.ambientScale,!0}function Z(e,t,n=!1){const a=[];return e.traverse(i=>{const s=i;if(s.isDirectionalLight){a.push(s);return}if(U(i,t))return;const r=i;if(!r.isMesh||O(r))return;const d=G(r).filter(o=>!!o);if(!d.some(H))return;for(const o of d)E(o,t.toonBands),n&&k(o)&&(o.needsUpdate=!0);const b=r.userData.backdrop===!0,p=d.every(o=>!o.transparent);t.outlines&&!b&&p&&!_(r)?N(r,{width:t.outlineWidth,maxGrow:t.outlineMaxGrow,color:t.outlineColor}):x(r);const l=r.userData[D]??{cast:r.castShadow,receive:r.receiveShadow};if(r.userData[D]=l,!t.lightShadows){r.castShadow=l.cast,r.receiveShadow=l.receive;return}r.castShadow=!b&&p&&!W(r),r.receiveShadow=!0}),V(a,t)}function F(e){let t=null;for(const n of e)(!t||n.intensity>t.intensity)&&(t=n);return t}function V(e,t){const n=t.shadows?F(e):null;for(const a of e){const i=a.userData[m]??a.castShadow;if(a.userData[m]=i,a!==n){a.castShadow=i;continue}a.castShadow=!0,a.shadow.mapSize.width!==t.shadowMapSize&&(a.shadow.mapSize.set(t.shadowMapSize,t.shadowMapSize),a.shadow.map?.dispose(),a.shadow.map=null,a.shadow.needsUpdate=!0);const s=a.shadow.camera;s.left=-t.shadowRange,s.right=t.shadowRange,s.top=t.shadowRange,s.bottom=-t.shadowRange,s.near=.5,s.far=t.shadowDistance*2+t.shadowRange,s.updateProjectionMatrix(),a.shadow.bias=-4e-4,a.shadow.normalBias=.02,a.shadow.radius=t.shadowRadius}return n}function J(e,t,n){let a=e.userData[y];a||(e.getWorldPosition(B),e.target.getWorldPosition(f),a=new c().copy(f).sub(B).normalize(),a.lengthSq()<.5&&a.set(-.4,-1,-.3).normalize(),e.userData[y]=a),h.set(g(t.x),g(t.y),g(t.z)),A(e.target,h),A(e,f.copy(h).addScaledVector(a,-n.shadowDistance)),e.target.updateMatrixWorld()}function g(e){return Math.round(e/M)*M}function A(e,t){e.position.copy(t);const n=e.parent;n&&(n.updateWorldMatrix(!0,!1),n.worldToLocal(e.position))}export{Z as a,J as b,W as c,Q as d};
//# sourceMappingURL=graphicsScene-BKrtIPva.js.map
