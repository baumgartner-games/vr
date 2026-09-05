import{ar as p,$ as s,cY as u,e as d,S as v,G as g,t as h,u as i,C as S,i as w,bI as l,ap as f,Z as y}from"./gearConfig-DrFR1ck6.js";const C=500,x=560,k=-.05,c=.6;function m(t){return t.userData.backdrop=!0,t}function W(t,r,o=x){const e=new p({side:u,depthWrite:!1,uniforms:{topColor:{value:new s(t)},bottomColor:{value:new s(r)}},vertexShader:`
      varying vec3 vWorldPosition;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,fragmentShader:`
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = clamp(normalize(vWorldPosition).y * 0.5 + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, 0.8)), 1.0);
      }
    `}),a=new d(new v(o,24,16),e);return a.name="sky",a.frustumCulled=!1,m(a)}function D(t=1){const r=new g;r.name="lighting";const o=new h(12441599,2765122,1.5*t);r.add(o);const e=new i(16777215,1.6*t);e.position.set(4,8,3),r.add(e);const a=new i(6986751,.5*t);return a.position.set(-5,3,-4),r.add(a),r}function M(t){t.traverse(r=>{const o=r;o.geometry?.dispose();const e=o.material;Array.isArray(e)?e.forEach(a=>a.dispose()):e?.dispose()}),t.removeFromParent()}function P(t,r={}){const o=r.radius??C,e=r.tile??4,a=new S(G(t,r.line??0));a.colorSpace=w,a.wrapS=l,a.wrapT=l,a.repeat.set(o*2/e,o*2/e),a.anisotropy=8;const n=new d(new f(o*2,c,o*2),new y({map:a,roughness:.95,metalness:.02}));return n.name="ground",n.position.y=k-c/2,n.receiveShadow=!0,m(n)}function G(t,r){const o=document.createElement("canvas");o.width=128,o.height=128;const e=o.getContext("2d");return e.fillStyle=`#${t.toString(16).padStart(6,"0")}`,e.fillRect(0,0,128,128),e.strokeStyle=`#${r.toString(16).padStart(6,"0")}`,e.globalAlpha=.22,e.lineWidth=2,e.strokeRect(1,1,126,126),o}export{c as G,D as a,P as b,W as c,M as d,k as e,m};
//# sourceMappingURL=environment-DPgDxv6p.js.map
