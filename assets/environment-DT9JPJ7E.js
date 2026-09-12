import{aO as p,aN as s,bD as u,e as d,S as v,G as g,$ as h,a0 as i,C as S,i as f,dy as l,aL as w,aG as y}from"./navTile-vrMtUsDb.js";const C=500,x=560,k=-.05,c=.6;function m(e){return e.userData.backdrop=!0,e}function D(e,t,a=x){const o=new p({side:u,depthWrite:!1,uniforms:{topColor:{value:new s(e)},bottomColor:{value:new s(t)}},vertexShader:`
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
    `}),r=new d(new v(a,24,16),o);return r.name="sky",r.frustumCulled=!1,m(r)}function P(e=1){const t=new g;t.name="lighting";const a=new h(12441599,2765122,1.5*e);t.add(a);const o=new i(16777215,1.6*e);o.position.set(4,8,3),t.add(o);const r=new i(6986751,.5*e);return r.position.set(-5,3,-4),t.add(r),t}function W(e){e.traverse(t=>{t.geometry?.dispose()}),e.removeFromParent()}function M(e){e.traverse(t=>{const a=t;a.geometry?.dispose();const o=a.material;Array.isArray(o)?o.forEach(r=>r.dispose()):o?.dispose()}),e.removeFromParent()}function b(e,t={}){const a=t.radius??C,o=t.tile??4,r=new S(G(e,t.line??0));r.colorSpace=f,r.wrapS=l,r.wrapT=l,r.repeat.set(a*2/o,a*2/o),r.anisotropy=8;const n=new d(new w(a*2,c,a*2),new y({map:r,roughness:.95,metalness:.02}));return n.name="ground",n.position.y=k-c/2,n.receiveShadow=!0,m(n)}function G(e,t){const a=document.createElement("canvas");a.width=128,a.height=128;const o=a.getContext("2d");return o.fillStyle=`#${e.toString(16).padStart(6,"0")}`,o.fillRect(0,0,128,128),o.strokeStyle=`#${t.toString(16).padStart(6,"0")}`,o.globalAlpha=.22,o.lineWidth=2,o.strokeRect(1,1,126,126),a}export{c as G,P as a,b,D as c,M as d,k as e,W as f,m};
//# sourceMappingURL=environment-DT9JPJ7E.js.map
