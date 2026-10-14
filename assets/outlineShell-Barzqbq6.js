import{_ as v,a9 as w,d as M,V as x,i as b,A as p,a5 as S,C as N}from"./three-BUGY4Ll_.js";const d="bgvrOutline",m="bgvrNoOutline",c="bgvrOutlineNormal",O=24e3,l=1e4,k=.12,_=`
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
`,y=`
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
`;function f(e,t){const r=e.geometry;r.boundingSphere||r.computeBoundingSphere();const o=r.boundingSphere?.radius??0;if(!(o>0))return t.maxGrow;e.updateWorldMatrix(!0,!1);const s=e.getWorldScale(A),a=Math.max(Math.abs(s.x),Math.abs(s.y),Math.abs(s.z));return Math.min(t.maxGrow,o*a*k)}const A=new x;function z(e,t){return new p({uniforms:{thickness:{value:t.width},maxGrow:{value:f(e,t)},diffuse:{value:new N(t.color)}},vertexShader:_,fragmentShader:y,side:S})}function D(e){if(e.getAttribute(c))return!0;const t=e.getAttribute("position"),r=e.getAttribute("normal");if(!t||!r||r.count!==t.count)return!1;if(t.count>O)return e.setAttribute(c,r),!0;const o=new Map,s=new Array(t.count);for(let n=0;n<t.count;n++){const i=`${Math.round(t.getX(n)*l)},${Math.round(t.getY(n)*l)},${Math.round(t.getZ(n)*l)}`;s[n]=i;const u=o.get(i);u?(u[0]+=r.getX(n),u[1]+=r.getY(n),u[2]+=r.getZ(n)):o.set(i,[r.getX(n),r.getY(n),r.getZ(n)])}const a=new Float32Array(t.count*3);for(let n=0;n<t.count;n++){const i=o.get(s[n]),u=Math.hypot(i[0],i[1],i[2]);u<1e-6?(a[n*3]=r.getX(n),a[n*3+1]=r.getY(n),a[n*3+2]=r.getZ(n)):(a[n*3]=i[0]/u,a[n*3+1]=i[1]/u,a[n*3+2]=i[2]/u)}return e.setAttribute(c,new b(a,3)),!0}function g(e){return e.userData[d]===!0}function B(e){return e.userData[m]=!0,e}function E(e){return e.userData[m]===!0}function I(e){const t=[];e.traverse(r=>{g(r)&&t.push(r)});for(const r of t)r.removeFromParent();return t.length}function h(e){return e.children.find(g)??null}function F(e,t){const r=h(e);if(r){const i=r.material;return i.uniforms.thickness.value=t.width,i.uniforms.maxGrow.value=f(e,t),i.uniforms.diffuse.value.set(t.color),r}if(!D(e.geometry))return null;const o=z(e,t),s=e,a=e;let n;if(s.isSkinnedMesh){const i=new v(e.geometry,o);i.bind(s.skeleton,s.bindMatrix),n=i}else if(a.isInstancedMesh){const i=new w(e.geometry,o,a.count);i.instanceMatrix=a.instanceMatrix,n=i}else n=new M(e.geometry,o);return G(e,n)}function G(e,t){return t.name="outline",t.userData[d]=!0,t.castShadow=!1,t.receiveShadow=!1,t.frustumCulled=e.frustumCulled,t.layers.mask=e.layers.mask,t.raycast=()=>{},e.add(t),t}function Z(e){const t=h(e);return t?(e.remove(t),t.material.dispose(),!0):!1}export{F as a,E as b,B as d,D as e,g as i,Z as r,I as s};
//# sourceMappingURL=outlineShell-Barzqbq6.js.map
