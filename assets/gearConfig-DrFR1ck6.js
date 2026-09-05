const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/HubWorld-4m0-e6uw.js","assets/environment-DPgDxv6p.js","assets/PortalWorld-B57r-8cw.js","assets/KeyPanel-BiOE2VVt.js","assets/index-muhxkDoM.js","assets/RangeWorld-DsZOfWlR.js","assets/target-CEki2HFL.js","assets/KartWorld-x3wa6LEw.js","assets/ShopWorld-C0MvpX-s.js","assets/TuneWorld-vJ-MWo5A.js","assets/WristMenu-CPMj-PHg.js","assets/handGrip-un4Pkxuw.js","assets/DustWorld-Cr9ZhGxh.js","assets/MoonWorld-DfYjDrM-.js","assets/AlpsWorld-EJ4JsLCC.js","assets/DarkWorld-8GGL1TE0.js"])))=>i.map(i=>d[i]);
(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function t(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(s){if(s.ep)return;s.ep=!0;const a=t(s);fetch(s.href,a)}})();const Jl="185",lp=0,Jc=1,cp=2,ia=1,hp=2,Hs=3,si=0,zt=1,Ln=2,Fn=0,os=1,Zc=2,Qc=3,jc=4,up=5,mi=100,fp=101,dp=102,pp=103,mp=104,gp=200,_p=201,vp=202,xp=203,Xo=204,qo=205,Mp=206,yp=207,Sp=208,bp=209,Ep=210,Tp=211,Ap=212,wp=213,Rp=214,Yo=0,$o=1,Ko=2,us=3,Jo=4,Zo=5,Qo=6,jo=7,Ju=0,Pp=1,Cp=2,vn=0,Zu=1,Qu=2,ju=3,ef=4,tf=5,nf=6,sf=7,eh="attached",Ip="detached",rf=300,bi=301,fs=302,Ya=303,$a=304,Fa=306,el=1e3,Dn=1001,tl=1002,Ct=1003,Lp=1004,_r=1005,Ut=1006,Ka=1007,vi=1008,Wt=1009,af=1010,of=1011,Qs=1012,Zl=1013,yn=1014,Jt=1015,Bn=1016,Ql=1017,jl=1018,js=1020,lf=35902,cf=35899,hf=1021,uf=1022,Zt=1023,zn=1026,xi=1027,ec=1028,tc=1029,Ei=1030,nc=1031,ic=1033,sa=33776,ra=33777,aa=33778,oa=33779,nl=35840,il=35841,sl=35842,rl=35843,al=36196,ol=37492,ll=37496,cl=37488,hl=37489,pa=37490,ul=37491,fl=37808,dl=37809,pl=37810,ml=37811,gl=37812,_l=37813,vl=37814,xl=37815,Ml=37816,yl=37817,Sl=37818,bl=37819,El=37820,Tl=37821,Al=36492,wl=36494,Rl=36495,Pl=36283,Cl=36284,ma=36285,Il=36286,ga=2300,Ll=2301,Ja=2302,th=2303,nh=2400,ih=2401,sh=2402,Dp=2500,tb=0,nb=1,ib=2,Np=3200,Dl=0,Up=1,ni="",Bt="srgb",_a="srgb-linear",va="linear",it="srgb",Ui=7680,rh=519,Fp=512,Op=513,Bp=514,sc=515,zp=516,kp=517,rc=518,Vp=519,Nl=35044,ah="300 es",_n=2e3,er=2001;function Hp(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function Gp(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}function tr(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function Wp(){const n=tr("canvas");return n.style.display="block",n}const oh={};function xa(...n){const e="THREE."+n.shift();console.log(e,...n)}function ff(n){const e=n[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=n[1];t&&t.isStackTrace?n[0]+=" "+t.getLocation():n[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return n}function Ae(...n){n=ff(n);const e="THREE."+n.shift();{const t=n[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...n)}}function Fe(...n){n=ff(n);const e="THREE."+n.shift();{const t=n[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...n)}}function ls(...n){const e=n.join(" ");e in oh||(oh[e]=!0,Ae(...n))}function Xp(n,e,t){return new Promise(function(i,s){function a(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(a,t);break;default:i()}}setTimeout(a,t)})}const qp={[Yo]:$o,[Ko]:Qo,[Jo]:jo,[us]:Zo,[$o]:Yo,[Qo]:Ko,[jo]:Jo,[Zo]:us};class Pi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const s=i[e];if(s!==void 0){const a=s.indexOf(t);a!==-1&&s.splice(a,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const s=i.slice(0);for(let a=0,r=s.length;a<r;a++)s[a].call(this,e);e.target=null}}}const Dt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let lh=1234567;const cs=Math.PI/180,ds=180/Math.PI;function Qt(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Dt[n&255]+Dt[n>>8&255]+Dt[n>>16&255]+Dt[n>>24&255]+"-"+Dt[e&255]+Dt[e>>8&255]+"-"+Dt[e>>16&15|64]+Dt[e>>24&255]+"-"+Dt[t&63|128]+Dt[t>>8&255]+"-"+Dt[t>>16&255]+Dt[t>>24&255]+Dt[i&255]+Dt[i>>8&255]+Dt[i>>16&255]+Dt[i>>24&255]).toLowerCase()}function Ke(n,e,t){return Math.max(e,Math.min(t,n))}function ac(n,e){return(n%e+e)%e}function Yp(n,e,t,i,s){return i+(n-e)*(s-i)/(t-e)}function $p(n,e,t){return n!==e?(t-n)/(e-n):0}function Ys(n,e,t){return(1-t)*n+t*e}function Kp(n,e,t,i){return Ys(n,e,1-Math.exp(-t*i))}function Jp(n,e=1){return e-Math.abs(ac(n,e*2)-e)}function Zp(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function Qp(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function jp(n,e){return n+Math.floor(Math.random()*(e-n+1))}function em(n,e){return n+Math.random()*(e-n)}function tm(n){return n*(.5-Math.random())}function nm(n){n!==void 0&&(lh=n);let e=lh+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function im(n){return n*cs}function sm(n){return n*ds}function rm(n){return(n&n-1)===0&&n!==0}function am(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function om(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function lm(n,e,t,i,s){const a=Math.cos,r=Math.sin,o=a(t/2),l=r(t/2),c=a((e+i)/2),h=r((e+i)/2),f=a((e-i)/2),u=r((e-i)/2),d=a((i-e)/2),g=r((i-e)/2);switch(s){case"XYX":n.set(o*h,l*f,l*u,o*c);break;case"YZY":n.set(l*u,o*h,l*f,o*c);break;case"ZXZ":n.set(l*f,l*u,o*h,o*c);break;case"XZX":n.set(o*h,l*g,l*d,o*c);break;case"YXY":n.set(l*d,o*h,l*g,o*c);break;case"ZYZ":n.set(l*g,l*d,o*h,o*c);break;default:Ae("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function sn(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function st(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const Ul={DEG2RAD:cs,RAD2DEG:ds,generateUUID:Qt,clamp:Ke,euclideanModulo:ac,mapLinear:Yp,inverseLerp:$p,lerp:Ys,damp:Kp,pingpong:Jp,smoothstep:Zp,smootherstep:Qp,randInt:jp,randFloat:em,randFloatSpread:tm,seededRandom:nm,degToRad:im,radToDeg:sm,isPowerOfTwo:rm,ceilPowerOfTwo:am,floorPowerOfTwo:om,setQuaternionFromProperEuler:lm,normalize:st,denormalize:sn};class ne{static{ne.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6],this.y=s[1]*t+s[4]*i+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Ke(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),s=Math.sin(t),a=this.x-e.x,r=this.y-e.y;return this.x=a*i-r*s+e.x,this.y=a*s+r*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Ci{constructor(e=0,t=0,i=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=s}static slerpFlat(e,t,i,s,a,r,o){let l=i[s+0],c=i[s+1],h=i[s+2],f=i[s+3],u=a[r+0],d=a[r+1],g=a[r+2],M=a[r+3];if(f!==M||l!==u||c!==d||h!==g){let m=l*u+c*d+h*g+f*M;m<0&&(u=-u,d=-d,g=-g,M=-M,m=-m);let p=1-o;if(m<.9995){const y=Math.acos(m),b=Math.sin(y);p=Math.sin(p*y)/b,o=Math.sin(o*y)/b,l=l*p+u*o,c=c*p+d*o,h=h*p+g*o,f=f*p+M*o}else{l=l*p+u*o,c=c*p+d*o,h=h*p+g*o,f=f*p+M*o;const y=1/Math.sqrt(l*l+c*c+h*h+f*f);l*=y,c*=y,h*=y,f*=y}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=f}static multiplyQuaternionsFlat(e,t,i,s,a,r){const o=i[s],l=i[s+1],c=i[s+2],h=i[s+3],f=a[r],u=a[r+1],d=a[r+2],g=a[r+3];return e[t]=o*g+h*f+l*d-c*u,e[t+1]=l*g+h*u+c*f-o*d,e[t+2]=c*g+h*d+o*u-l*f,e[t+3]=h*g-o*f-l*u-c*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,s){return this._x=e,this._y=t,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,s=e._y,a=e._z,r=e._order,o=Math.cos,l=Math.sin,c=o(i/2),h=o(s/2),f=o(a/2),u=l(i/2),d=l(s/2),g=l(a/2);switch(r){case"XYZ":this._x=u*h*f+c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f-u*d*g;break;case"YXZ":this._x=u*h*f+c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f+u*d*g;break;case"ZXY":this._x=u*h*f-c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f-u*d*g;break;case"ZYX":this._x=u*h*f-c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f+u*d*g;break;case"YZX":this._x=u*h*f+c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f-u*d*g;break;case"XZY":this._x=u*h*f-c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f+u*d*g;break;default:Ae("Quaternion: .setFromEuler() encountered an unknown order: "+r)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,s=Math.sin(i);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],s=t[4],a=t[8],r=t[1],o=t[5],l=t[9],c=t[2],h=t[6],f=t[10],u=i+o+f;if(u>0){const d=.5/Math.sqrt(u+1);this._w=.25/d,this._x=(h-l)*d,this._y=(a-c)*d,this._z=(r-s)*d}else if(i>o&&i>f){const d=2*Math.sqrt(1+i-o-f);this._w=(h-l)/d,this._x=.25*d,this._y=(s+r)/d,this._z=(a+c)/d}else if(o>f){const d=2*Math.sqrt(1+o-i-f);this._w=(a-c)/d,this._x=(s+r)/d,this._y=.25*d,this._z=(l+h)/d}else{const d=2*Math.sqrt(1+f-i-o);this._w=(r-s)/d,this._x=(a+c)/d,this._y=(l+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ke(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const s=Math.min(1,t/i);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,s=e._y,a=e._z,r=e._w,o=t._x,l=t._y,c=t._z,h=t._w;return this._x=i*h+r*o+s*c-a*l,this._y=s*h+r*l+a*o-i*c,this._z=a*h+r*c+i*l-s*o,this._w=r*h-i*o-s*l-a*c,this._onChangeCallback(),this}slerp(e,t){let i=e._x,s=e._y,a=e._z,r=e._w,o=this.dot(e);o<0&&(i=-i,s=-s,a=-a,r=-r,o=-o);let l=1-t;if(o<.9995){const c=Math.acos(o),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+i*t,this._y=this._y*l+s*t,this._z=this._z*l+a*t,this._w=this._w*l+r*t,this._onChangeCallback()}else this._x=this._x*l+i*t,this._y=this._y*l+s*t,this._z=this._z*l+a*t,this._w=this._w*l+r*t,this.normalize();return this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),a=Math.sqrt(i);return this.set(s*Math.sin(e),s*Math.cos(e),a*Math.sin(t),a*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class C{static{C.prototype.isVector3=!0}constructor(e=0,t=0,i=0){this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(ch.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(ch.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,s=this.z,a=e.elements;return this.x=a[0]*t+a[3]*i+a[6]*s,this.y=a[1]*t+a[4]*i+a[7]*s,this.z=a[2]*t+a[5]*i+a[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,s=this.z,a=e.elements,r=1/(a[3]*t+a[7]*i+a[11]*s+a[15]);return this.x=(a[0]*t+a[4]*i+a[8]*s+a[12])*r,this.y=(a[1]*t+a[5]*i+a[9]*s+a[13])*r,this.z=(a[2]*t+a[6]*i+a[10]*s+a[14])*r,this}applyQuaternion(e){const t=this.x,i=this.y,s=this.z,a=e.x,r=e.y,o=e.z,l=e.w,c=2*(r*s-o*i),h=2*(o*t-a*s),f=2*(a*i-r*t);return this.x=t+l*c+r*f-o*h,this.y=i+l*h+o*c-a*f,this.z=s+l*f+a*h-r*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,s=this.z,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*s,this.y=a[1]*t+a[5]*i+a[9]*s,this.z=a[2]*t+a[6]*i+a[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this.z=Ke(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this.z=Ke(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,s=e.y,a=e.z,r=t.x,o=t.y,l=t.z;return this.x=s*l-a*o,this.y=a*r-i*l,this.z=i*o-s*r,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return Za.copy(this).projectOnVector(e),this.sub(Za)}reflect(e){return this.sub(Za.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Ke(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,s=this.z-e.z;return t*t+i*i+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const s=Math.sin(t)*e;return this.x=s*Math.sin(i),this.y=Math.cos(t)*e,this.z=s*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Za=new C,ch=new Ci;class We{static{We.prototype.isMatrix3=!0}constructor(e,t,i,s,a,r,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,s,a,r,o,l,c)}set(e,t,i,s,a,r,o,l,c){const h=this.elements;return h[0]=e,h[1]=s,h[2]=o,h[3]=t,h[4]=a,h[5]=l,h[6]=i,h[7]=r,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,s=t.elements,a=this.elements,r=i[0],o=i[3],l=i[6],c=i[1],h=i[4],f=i[7],u=i[2],d=i[5],g=i[8],M=s[0],m=s[3],p=s[6],y=s[1],b=s[4],x=s[7],A=s[2],E=s[5],R=s[8];return a[0]=r*M+o*y+l*A,a[3]=r*m+o*b+l*E,a[6]=r*p+o*x+l*R,a[1]=c*M+h*y+f*A,a[4]=c*m+h*b+f*E,a[7]=c*p+h*x+f*R,a[2]=u*M+d*y+g*A,a[5]=u*m+d*b+g*E,a[8]=u*p+d*x+g*R,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],s=e[2],a=e[3],r=e[4],o=e[5],l=e[6],c=e[7],h=e[8];return t*r*h-t*o*c-i*a*h+i*o*l+s*a*c-s*r*l}invert(){const e=this.elements,t=e[0],i=e[1],s=e[2],a=e[3],r=e[4],o=e[5],l=e[6],c=e[7],h=e[8],f=h*r-o*c,u=o*l-h*a,d=c*a-r*l,g=t*f+i*u+s*d;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const M=1/g;return e[0]=f*M,e[1]=(s*c-h*i)*M,e[2]=(o*i-s*r)*M,e[3]=u*M,e[4]=(h*t-s*l)*M,e[5]=(s*a-o*t)*M,e[6]=d*M,e[7]=(i*l-c*t)*M,e[8]=(r*t-i*a)*M,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,s,a,r,o){const l=Math.cos(a),c=Math.sin(a);return this.set(i*l,i*c,-i*(l*r+c*o)+r+e,-s*c,s*l,-s*(-c*r+l*o)+o+t,0,0,1),this}scale(e,t){return ls("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Qa.makeScale(e,t)),this}rotate(e){return ls("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Qa.makeRotation(-e)),this}translate(e,t){return ls("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Qa.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let s=0;s<9;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Qa=new We,hh=new We().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),uh=new We().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function cm(){const n={enabled:!0,workingColorSpace:_a,spaces:{},convert:function(s,a,r){return this.enabled===!1||a===r||!a||!r||(this.spaces[a].transfer===it&&(s.r=On(s.r),s.g=On(s.g),s.b=On(s.b)),this.spaces[a].primaries!==this.spaces[r].primaries&&(s.applyMatrix3(this.spaces[a].toXYZ),s.applyMatrix3(this.spaces[r].fromXYZ)),this.spaces[r].transfer===it&&(s.r=hs(s.r),s.g=hs(s.g),s.b=hs(s.b))),s},workingToColorSpace:function(s,a){return this.convert(s,this.workingColorSpace,a)},colorSpaceToWorking:function(s,a){return this.convert(s,a,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===ni?va:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,a=this.workingColorSpace){return s.fromArray(this.spaces[a].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,a,r){return s.copy(this.spaces[a].toXYZ).multiply(this.spaces[r].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,a){return ls("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(s,a)},toWorkingColorSpace:function(s,a){return ls("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(s,a)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[_a]:{primaries:e,whitePoint:i,transfer:va,toXYZ:hh,fromXYZ:uh,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Bt},outputColorSpaceConfig:{drawingBufferColorSpace:Bt}},[Bt]:{primaries:e,whitePoint:i,transfer:it,toXYZ:hh,fromXYZ:uh,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Bt}}}),n}const je=cm();function On(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function hs(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Fi;class hm{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{Fi===void 0&&(Fi=tr("canvas")),Fi.width=e.width,Fi.height=e.height;const s=Fi.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),i=Fi}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=tr("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const s=i.getImageData(0,0,e.width,e.height),a=s.data;for(let r=0;r<a.length;r++)a[r]=On(a[r]/255)*255;return i.putImageData(s,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(On(t[i]/255)*255):t[i]=On(t[i]);return{data:t,width:e.width,height:e.height}}else return Ae("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let um=0;class oc{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:um++}),this.uuid=Qt(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let a;if(Array.isArray(s)){a=[];for(let r=0,o=s.length;r<o;r++)s[r].isDataTexture?a.push(ja(s[r].image)):a.push(ja(s[r]))}else a=ja(s);i.url=a}return t||(e.images[this.uuid]=i),i}}function ja(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?hm.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(Ae("Texture: Unable to serialize Texture."),{})}let fm=0;const eo=new C;class It extends Pi{constructor(e=It.DEFAULT_IMAGE,t=It.DEFAULT_MAPPING,i=Dn,s=Dn,a=Ut,r=vi,o=Zt,l=Wt,c=It.DEFAULT_ANISOTROPY,h=ni){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:fm++}),this.uuid=Qt(),this.name="",this.source=new oc(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=a,this.minFilter=r,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new ne(0,0),this.repeat=new ne(1,1),this.center=new ne(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new We,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(eo).x}get height(){return this.source.getSize(eo).y}get depth(){return this.source.getSize(eo).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const i=e[t];if(i===void 0){Ae(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){Ae(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&i&&s.isVector2&&i.isVector2||s&&i&&s.isVector3&&i.isVector3||s&&i&&s.isMatrix3&&i.isMatrix3?s.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==rf)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case el:e.x=e.x-Math.floor(e.x);break;case Dn:e.x=e.x<0?0:1;break;case tl:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case el:e.y=e.y-Math.floor(e.y);break;case Dn:e.y=e.y<0?0:1;break;case tl:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}It.DEFAULT_IMAGE=null;It.DEFAULT_MAPPING=rf;It.DEFAULT_ANISOTROPY=1;class lt{static{lt.prototype.isVector4=!0}constructor(e=0,t=0,i=0,s=1){this.x=e,this.y=t,this.z=i,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,s){return this.x=e,this.y=t,this.z=i,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,s=this.z,a=this.w,r=e.elements;return this.x=r[0]*t+r[4]*i+r[8]*s+r[12]*a,this.y=r[1]*t+r[5]*i+r[9]*s+r[13]*a,this.z=r[2]*t+r[6]*i+r[10]*s+r[14]*a,this.w=r[3]*t+r[7]*i+r[11]*s+r[15]*a,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,s,a;const l=e.elements,c=l[0],h=l[4],f=l[8],u=l[1],d=l[5],g=l[9],M=l[2],m=l[6],p=l[10];if(Math.abs(h-u)<.01&&Math.abs(f-M)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+u)<.1&&Math.abs(f+M)<.1&&Math.abs(g+m)<.1&&Math.abs(c+d+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const b=(c+1)/2,x=(d+1)/2,A=(p+1)/2,E=(h+u)/4,R=(f+M)/4,_=(g+m)/4;return b>x&&b>A?b<.01?(i=0,s=.707106781,a=.707106781):(i=Math.sqrt(b),s=E/i,a=R/i):x>A?x<.01?(i=.707106781,s=0,a=.707106781):(s=Math.sqrt(x),i=E/s,a=_/s):A<.01?(i=.707106781,s=.707106781,a=0):(a=Math.sqrt(A),i=R/a,s=_/a),this.set(i,s,a,t),this}let y=Math.sqrt((m-g)*(m-g)+(f-M)*(f-M)+(u-h)*(u-h));return Math.abs(y)<.001&&(y=1),this.x=(m-g)/y,this.y=(f-M)/y,this.z=(u-h)/y,this.w=Math.acos((c+d+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this.z=Ke(this.z,e.z,t.z),this.w=Ke(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this.z=Ke(this.z,e,t),this.w=Ke(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class dm extends Pi{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ut,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new lt(0,0,e,t),this.scissorTest=!1,this.viewport=new lt(0,0,e,t),this.textures=[];const s={width:e,height:t,depth:i.depth},a=new It(s),r=i.count;for(let o=0;o<r;o++)this.textures[o]=a.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview,this.useArrayDepthTexture=i.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:Ut,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let s=0,a=this.textures.length;s<a;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=i,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const s=Object.assign({},e.textures[t].image);this.textures[t].source=new oc(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class xn extends dm{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class df extends It{constructor(e=null,t=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=Ct,this.minFilter=Ct,this.wrapR=Dn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class pm extends It{constructor(e=null,t=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=Ct,this.minFilter=Ct,this.wrapR=Dn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ye{static{Ye.prototype.isMatrix4=!0}constructor(e,t,i,s,a,r,o,l,c,h,f,u,d,g,M,m){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,s,a,r,o,l,c,h,f,u,d,g,M,m)}set(e,t,i,s,a,r,o,l,c,h,f,u,d,g,M,m){const p=this.elements;return p[0]=e,p[4]=t,p[8]=i,p[12]=s,p[1]=a,p[5]=r,p[9]=o,p[13]=l,p[2]=c,p[6]=h,p[10]=f,p[14]=u,p[3]=d,p[7]=g,p[11]=M,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Ye().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),i.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,i=e.elements,s=1/Oi.setFromMatrixColumn(e,0).length(),a=1/Oi.setFromMatrixColumn(e,1).length(),r=1/Oi.setFromMatrixColumn(e,2).length();return t[0]=i[0]*s,t[1]=i[1]*s,t[2]=i[2]*s,t[3]=0,t[4]=i[4]*a,t[5]=i[5]*a,t[6]=i[6]*a,t[7]=0,t[8]=i[8]*r,t[9]=i[9]*r,t[10]=i[10]*r,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,s=e.y,a=e.z,r=Math.cos(i),o=Math.sin(i),l=Math.cos(s),c=Math.sin(s),h=Math.cos(a),f=Math.sin(a);if(e.order==="XYZ"){const u=r*h,d=r*f,g=o*h,M=o*f;t[0]=l*h,t[4]=-l*f,t[8]=c,t[1]=d+g*c,t[5]=u-M*c,t[9]=-o*l,t[2]=M-u*c,t[6]=g+d*c,t[10]=r*l}else if(e.order==="YXZ"){const u=l*h,d=l*f,g=c*h,M=c*f;t[0]=u+M*o,t[4]=g*o-d,t[8]=r*c,t[1]=r*f,t[5]=r*h,t[9]=-o,t[2]=d*o-g,t[6]=M+u*o,t[10]=r*l}else if(e.order==="ZXY"){const u=l*h,d=l*f,g=c*h,M=c*f;t[0]=u-M*o,t[4]=-r*f,t[8]=g+d*o,t[1]=d+g*o,t[5]=r*h,t[9]=M-u*o,t[2]=-r*c,t[6]=o,t[10]=r*l}else if(e.order==="ZYX"){const u=r*h,d=r*f,g=o*h,M=o*f;t[0]=l*h,t[4]=g*c-d,t[8]=u*c+M,t[1]=l*f,t[5]=M*c+u,t[9]=d*c-g,t[2]=-c,t[6]=o*l,t[10]=r*l}else if(e.order==="YZX"){const u=r*l,d=r*c,g=o*l,M=o*c;t[0]=l*h,t[4]=M-u*f,t[8]=g*f+d,t[1]=f,t[5]=r*h,t[9]=-o*h,t[2]=-c*h,t[6]=d*f+g,t[10]=u-M*f}else if(e.order==="XZY"){const u=r*l,d=r*c,g=o*l,M=o*c;t[0]=l*h,t[4]=-f,t[8]=c*h,t[1]=u*f+M,t[5]=r*h,t[9]=d*f-g,t[2]=g*f-d,t[6]=o*h,t[10]=M*f+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(mm,e,gm)}lookAt(e,t,i){const s=this.elements;return Vt.subVectors(e,t),Vt.lengthSq()===0&&(Vt.z=1),Vt.normalize(),$n.crossVectors(i,Vt),$n.lengthSq()===0&&(Math.abs(i.z)===1?Vt.x+=1e-4:Vt.z+=1e-4,Vt.normalize(),$n.crossVectors(i,Vt)),$n.normalize(),vr.crossVectors(Vt,$n),s[0]=$n.x,s[4]=vr.x,s[8]=Vt.x,s[1]=$n.y,s[5]=vr.y,s[9]=Vt.y,s[2]=$n.z,s[6]=vr.z,s[10]=Vt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,s=t.elements,a=this.elements,r=i[0],o=i[4],l=i[8],c=i[12],h=i[1],f=i[5],u=i[9],d=i[13],g=i[2],M=i[6],m=i[10],p=i[14],y=i[3],b=i[7],x=i[11],A=i[15],E=s[0],R=s[4],_=s[8],T=s[12],P=s[1],I=s[5],N=s[9],B=s[13],X=s[2],F=s[6],W=s[10],H=s[14],Z=s[3],ie=s[7],he=s[11],oe=s[15];return a[0]=r*E+o*P+l*X+c*Z,a[4]=r*R+o*I+l*F+c*ie,a[8]=r*_+o*N+l*W+c*he,a[12]=r*T+o*B+l*H+c*oe,a[1]=h*E+f*P+u*X+d*Z,a[5]=h*R+f*I+u*F+d*ie,a[9]=h*_+f*N+u*W+d*he,a[13]=h*T+f*B+u*H+d*oe,a[2]=g*E+M*P+m*X+p*Z,a[6]=g*R+M*I+m*F+p*ie,a[10]=g*_+M*N+m*W+p*he,a[14]=g*T+M*B+m*H+p*oe,a[3]=y*E+b*P+x*X+A*Z,a[7]=y*R+b*I+x*F+A*ie,a[11]=y*_+b*N+x*W+A*he,a[15]=y*T+b*B+x*H+A*oe,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],s=e[8],a=e[12],r=e[1],o=e[5],l=e[9],c=e[13],h=e[2],f=e[6],u=e[10],d=e[14],g=e[3],M=e[7],m=e[11],p=e[15],y=l*d-c*u,b=o*d-c*f,x=o*u-l*f,A=r*d-c*h,E=r*u-l*h,R=r*f-o*h;return t*(M*y-m*b+p*x)-i*(g*y-m*A+p*E)+s*(g*b-M*A+p*R)-a*(g*x-M*E+m*R)}determinantAffine(){const e=this.elements,t=e[0],i=e[4],s=e[8],a=e[1],r=e[5],o=e[9],l=e[2],c=e[6],h=e[10];return t*(r*h-o*c)-i*(a*h-o*l)+s*(a*c-r*l)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],s=e[2],a=e[3],r=e[4],o=e[5],l=e[6],c=e[7],h=e[8],f=e[9],u=e[10],d=e[11],g=e[12],M=e[13],m=e[14],p=e[15],y=t*o-i*r,b=t*l-s*r,x=t*c-a*r,A=i*l-s*o,E=i*c-a*o,R=s*c-a*l,_=h*M-f*g,T=h*m-u*g,P=h*p-d*g,I=f*m-u*M,N=f*p-d*M,B=u*p-d*m,X=y*B-b*N+x*I+A*P-E*T+R*_;if(X===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const F=1/X;return e[0]=(o*B-l*N+c*I)*F,e[1]=(s*N-i*B-a*I)*F,e[2]=(M*R-m*E+p*A)*F,e[3]=(u*E-f*R-d*A)*F,e[4]=(l*P-r*B-c*T)*F,e[5]=(t*B-s*P+a*T)*F,e[6]=(m*x-g*R-p*b)*F,e[7]=(h*R-u*x+d*b)*F,e[8]=(r*N-o*P+c*_)*F,e[9]=(i*P-t*N-a*_)*F,e[10]=(g*E-M*x+p*y)*F,e[11]=(f*x-h*E-d*y)*F,e[12]=(o*T-r*I-l*_)*F,e[13]=(t*I-i*T+s*_)*F,e[14]=(M*b-g*A-m*y)*F,e[15]=(h*A-f*b+u*y)*F,this}scale(e){const t=this.elements,i=e.x,s=e.y,a=e.z;return t[0]*=i,t[4]*=s,t[8]*=a,t[1]*=i,t[5]*=s,t[9]*=a,t[2]*=i,t[6]*=s,t[10]*=a,t[3]*=i,t[7]*=s,t[11]*=a,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,s))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),s=Math.sin(t),a=1-i,r=e.x,o=e.y,l=e.z,c=a*r,h=a*o;return this.set(c*r+i,c*o-s*l,c*l+s*o,0,c*o+s*l,h*o+i,h*l-s*r,0,c*l-s*o,h*l+s*r,a*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,s,a,r){return this.set(1,i,a,0,e,1,r,0,t,s,1,0,0,0,0,1),this}compose(e,t,i){const s=this.elements,a=t._x,r=t._y,o=t._z,l=t._w,c=a+a,h=r+r,f=o+o,u=a*c,d=a*h,g=a*f,M=r*h,m=r*f,p=o*f,y=l*c,b=l*h,x=l*f,A=i.x,E=i.y,R=i.z;return s[0]=(1-(M+p))*A,s[1]=(d+x)*A,s[2]=(g-b)*A,s[3]=0,s[4]=(d-x)*E,s[5]=(1-(u+p))*E,s[6]=(m+y)*E,s[7]=0,s[8]=(g+b)*R,s[9]=(m-y)*R,s[10]=(1-(u+M))*R,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,i){const s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];const a=this.determinantAffine();if(a===0)return i.set(1,1,1),t.identity(),this;let r=Oi.set(s[0],s[1],s[2]).length();const o=Oi.set(s[4],s[5],s[6]).length(),l=Oi.set(s[8],s[9],s[10]).length();a<0&&(r=-r),en.copy(this);const c=1/r,h=1/o,f=1/l;return en.elements[0]*=c,en.elements[1]*=c,en.elements[2]*=c,en.elements[4]*=h,en.elements[5]*=h,en.elements[6]*=h,en.elements[8]*=f,en.elements[9]*=f,en.elements[10]*=f,t.setFromRotationMatrix(en),i.x=r,i.y=o,i.z=l,this}makePerspective(e,t,i,s,a,r,o=_n,l=!1){const c=this.elements,h=2*a/(t-e),f=2*a/(i-s),u=(t+e)/(t-e),d=(i+s)/(i-s);let g,M;if(l)g=a/(r-a),M=r*a/(r-a);else if(o===_n)g=-(r+a)/(r-a),M=-2*r*a/(r-a);else if(o===er)g=-r/(r-a),M=-r*a/(r-a);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=f,c[9]=d,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=M,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,s,a,r,o=_n,l=!1){const c=this.elements,h=2/(t-e),f=2/(i-s),u=-(t+e)/(t-e),d=-(i+s)/(i-s);let g,M;if(l)g=1/(r-a),M=r/(r-a);else if(o===_n)g=-2/(r-a),M=-(r+a)/(r-a);else if(o===er)g=-1/(r-a),M=-a/(r-a);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=f,c[9]=0,c[13]=d,c[2]=0,c[6]=0,c[10]=g,c[14]=M,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let s=0;s<16;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const Oi=new C,en=new Ye,mm=new C(0,0,0),gm=new C(1,1,1),$n=new C,vr=new C,Vt=new C,fh=new Ye,dh=new Ci;class kn{constructor(e=0,t=0,i=0,s=kn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,s=this._order){return this._x=e,this._y=t,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const s=e.elements,a=s[0],r=s[4],o=s[8],l=s[1],c=s[5],h=s[9],f=s[2],u=s[6],d=s[10];switch(t){case"XYZ":this._y=Math.asin(Ke(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-r,a)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ke(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,a),this._z=0);break;case"ZXY":this._x=Math.asin(Ke(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-f,d),this._z=Math.atan2(-r,c)):(this._y=0,this._z=Math.atan2(l,a));break;case"ZYX":this._y=Math.asin(-Ke(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(u,d),this._z=Math.atan2(l,a)):(this._x=0,this._z=Math.atan2(-r,c));break;case"YZX":this._z=Math.asin(Ke(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-f,a)):(this._x=0,this._y=Math.atan2(o,d));break;case"XZY":this._z=Math.asin(-Ke(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(o,a)):(this._x=Math.atan2(-h,d),this._y=0);break;default:Ae("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return fh.makeRotationFromQuaternion(e),this.setFromRotationMatrix(fh,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return dh.setFromEuler(this),this.setFromQuaternion(dh,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}kn.DEFAULT_ORDER="XYZ";class lc{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let _m=0;const ph=new C,Bi=new Ci,Tn=new Ye,xr=new C,ws=new C,vm=new C,xm=new Ci,mh=new C(1,0,0),gh=new C(0,1,0),_h=new C(0,0,1),vh={type:"added"},Mm={type:"removed"},zi={type:"childadded",child:null},to={type:"childremoved",child:null};class ct extends Pi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:_m++}),this.uuid=Qt(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=ct.DEFAULT_UP.clone();const e=new C,t=new kn,i=new Ci,s=new C(1,1,1);function a(){i.setFromEuler(t,!1)}function r(){t.setFromQuaternion(i,void 0,!1)}t._onChange(a),i._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Ye},normalMatrix:{value:new We}}),this.matrix=new Ye,this.matrixWorld=new Ye,this.matrixAutoUpdate=ct.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=ct.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new lc,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Bi.setFromAxisAngle(e,t),this.quaternion.multiply(Bi),this}rotateOnWorldAxis(e,t){return Bi.setFromAxisAngle(e,t),this.quaternion.premultiply(Bi),this}rotateX(e){return this.rotateOnAxis(mh,e)}rotateY(e){return this.rotateOnAxis(gh,e)}rotateZ(e){return this.rotateOnAxis(_h,e)}translateOnAxis(e,t){return ph.copy(e).applyQuaternion(this.quaternion),this.position.add(ph.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(mh,e)}translateY(e){return this.translateOnAxis(gh,e)}translateZ(e){return this.translateOnAxis(_h,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Tn.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?xr.copy(e):xr.set(e,t,i);const s=this.parent;this.updateWorldMatrix(!0,!1),ws.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Tn.lookAt(ws,xr,this.up):Tn.lookAt(xr,ws,this.up),this.quaternion.setFromRotationMatrix(Tn),s&&(Tn.extractRotation(s.matrixWorld),Bi.setFromRotationMatrix(Tn),this.quaternion.premultiply(Bi.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Fe("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(vh),zi.child=e,this.dispatchEvent(zi),zi.child=null):Fe("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Mm),to.child=e,this.dispatchEvent(to),to.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Tn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Tn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Tn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(vh),zi.child=e,this.dispatchEvent(zi),zi.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,s=this.children.length;i<s;i++){const r=this.children[i].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const s=this.children;for(let a=0,r=s.length;a<r;a++)s[a].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ws,e,vm),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ws,xm,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,i=e.y,s=e.z,a=this.matrix.elements;a[12]+=t-a[0]*t-a[4]*i-a[8]*s,a[13]+=i-a[1]*t-a[5]*i-a[9]*s,a[14]+=s-a[2]*t-a[6]*i-a[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t,i=!1){const s=this.parent;if(e===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||i)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,i=!0),t===!0){const a=this.children;for(let r=0,o=a.length;r<o;r++)a[r].updateWorldMatrix(!1,!0,i)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),this.static!==!1&&(s.static=this.static),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function a(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=a(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const f=l[c];a(e.shapes,f)}else a(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(a(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(a(e.materials,this.material[l]));s.material=o}else s.material=a(e.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];s.animations.push(a(e.animations,l))}}if(t){const o=r(e.geometries),l=r(e.materials),c=r(e.textures),h=r(e.images),f=r(e.shapes),u=r(e.skeletons),d=r(e.animations),g=r(e.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),h.length>0&&(i.images=h),f.length>0&&(i.shapes=f),u.length>0&&(i.skeletons=u),d.length>0&&(i.animations=d),g.length>0&&(i.nodes=g)}return i.object=s,i;function r(o){const l=[];for(const c in o){const h=o[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const s=e.children[i];this.add(s.clone())}return this}}ct.DEFAULT_UP=new C(0,1,0);ct.DEFAULT_MATRIX_AUTO_UPDATE=!0;ct.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Mi extends ct{constructor(){super(),this.isGroup=!0,this.type="Group"}}const ym={type:"move"};class no{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Mi,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Mi,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new C,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new C),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Mi,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new C,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new C,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let s=null,a=null,r=null;const o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){r=!0;for(const M of e.hand.values()){const m=t.getJointPose(M,i),p=this._getHandJoint(c,M);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const h=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],u=h.position.distanceTo(f.position),d=.02,g=.005;c.inputState.pinching&&u>d+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&u<=d-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(a=t.getPose(e.gripSpace,i),a!==null&&(l.matrix.fromArray(a.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,a.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(a.linearVelocity)):l.hasLinearVelocity=!1,a.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(a.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(s=t.getPose(e.targetRaySpace,i),s===null&&a!==null&&(s=a),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(ym)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=a!==null),c!==null&&(c.visible=r!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new Mi;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}const pf={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Kn={h:0,s:0,l:0},Mr={h:0,s:0,l:0};function io(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class He{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Bt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,je.colorSpaceToWorking(this,t),this}setRGB(e,t,i,s=je.workingColorSpace){return this.r=e,this.g=t,this.b=i,je.colorSpaceToWorking(this,s),this}setHSL(e,t,i,s=je.workingColorSpace){if(e=ac(e,1),t=Ke(t,0,1),i=Ke(i,0,1),t===0)this.r=this.g=this.b=i;else{const a=i<=.5?i*(1+t):i+t-i*t,r=2*i-a;this.r=io(r,a,e+1/3),this.g=io(r,a,e),this.b=io(r,a,e-1/3)}return je.colorSpaceToWorking(this,s),this}setStyle(e,t=Bt){function i(a){a!==void 0&&parseFloat(a)<1&&Ae("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let a;const r=s[1],o=s[2];switch(r){case"rgb":case"rgba":if(a=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(a[4]),this.setRGB(Math.min(255,parseInt(a[1],10))/255,Math.min(255,parseInt(a[2],10))/255,Math.min(255,parseInt(a[3],10))/255,t);if(a=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(a[4]),this.setRGB(Math.min(100,parseInt(a[1],10))/100,Math.min(100,parseInt(a[2],10))/100,Math.min(100,parseInt(a[3],10))/100,t);break;case"hsl":case"hsla":if(a=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(a[4]),this.setHSL(parseFloat(a[1])/360,parseFloat(a[2])/100,parseFloat(a[3])/100,t);break;default:Ae("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){const a=s[1],r=a.length;if(r===3)return this.setRGB(parseInt(a.charAt(0),16)/15,parseInt(a.charAt(1),16)/15,parseInt(a.charAt(2),16)/15,t);if(r===6)return this.setHex(parseInt(a,16),t);Ae("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Bt){const i=pf[e.toLowerCase()];return i!==void 0?this.setHex(i,t):Ae("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=On(e.r),this.g=On(e.g),this.b=On(e.b),this}copyLinearToSRGB(e){return this.r=hs(e.r),this.g=hs(e.g),this.b=hs(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Bt){return je.workingToColorSpace(Nt.copy(this),e),Math.round(Ke(Nt.r*255,0,255))*65536+Math.round(Ke(Nt.g*255,0,255))*256+Math.round(Ke(Nt.b*255,0,255))}getHexString(e=Bt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=je.workingColorSpace){je.workingToColorSpace(Nt.copy(this),t);const i=Nt.r,s=Nt.g,a=Nt.b,r=Math.max(i,s,a),o=Math.min(i,s,a);let l,c;const h=(o+r)/2;if(o===r)l=0,c=0;else{const f=r-o;switch(c=h<=.5?f/(r+o):f/(2-r-o),r){case i:l=(s-a)/f+(s<a?6:0);break;case s:l=(a-i)/f+2;break;case a:l=(i-s)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=je.workingColorSpace){return je.workingToColorSpace(Nt.copy(this),t),e.r=Nt.r,e.g=Nt.g,e.b=Nt.b,e}getStyle(e=Bt){je.workingToColorSpace(Nt.copy(this),e);const t=Nt.r,i=Nt.g,s=Nt.b;return e!==Bt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(e,t,i){return this.getHSL(Kn),this.setHSL(Kn.h+e,Kn.s+t,Kn.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(Kn),e.getHSL(Mr);const i=Ys(Kn.h,Mr.h,t),s=Ys(Kn.s,Mr.s,t),a=Ys(Kn.l,Mr.l,t);return this.setHSL(i,s,a),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,s=this.b,a=e.elements;return this.r=a[0]*t+a[3]*i+a[6]*s,this.g=a[1]*t+a[4]*i+a[7]*s,this.b=a[2]*t+a[5]*i+a[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Nt=new He;He.NAMES=pf;class mf{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new He(e),this.density=t}clone(){return new mf(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class gf{constructor(e,t=1,i=1e3){this.isFog=!0,this.name="",this.color=new He(e),this.near=t,this.far=i}clone(){return new gf(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class sb extends ct{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new kn,this.environmentIntensity=1,this.environmentRotation=new kn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const tn=new C,An=new C,so=new C,wn=new C,ki=new C,Vi=new C,xh=new C,ro=new C,ao=new C,oo=new C,lo=new lt,co=new lt,ho=new lt;class Xt{constructor(e=new C,t=new C,i=new C){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,s){s.subVectors(i,t),tn.subVectors(e,t),s.cross(tn);const a=s.lengthSq();return a>0?s.multiplyScalar(1/Math.sqrt(a)):s.set(0,0,0)}static getBarycoord(e,t,i,s,a){tn.subVectors(s,t),An.subVectors(i,t),so.subVectors(e,t);const r=tn.dot(tn),o=tn.dot(An),l=tn.dot(so),c=An.dot(An),h=An.dot(so),f=r*c-o*o;if(f===0)return a.set(0,0,0),null;const u=1/f,d=(c*l-o*h)*u,g=(r*h-o*l)*u;return a.set(1-d-g,g,d)}static containsPoint(e,t,i,s){return this.getBarycoord(e,t,i,s,wn)===null?!1:wn.x>=0&&wn.y>=0&&wn.x+wn.y<=1}static getInterpolation(e,t,i,s,a,r,o,l){return this.getBarycoord(e,t,i,s,wn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(a,wn.x),l.addScaledVector(r,wn.y),l.addScaledVector(o,wn.z),l)}static getInterpolatedAttribute(e,t,i,s,a,r){return lo.setScalar(0),co.setScalar(0),ho.setScalar(0),lo.fromBufferAttribute(e,t),co.fromBufferAttribute(e,i),ho.fromBufferAttribute(e,s),r.setScalar(0),r.addScaledVector(lo,a.x),r.addScaledVector(co,a.y),r.addScaledVector(ho,a.z),r}static isFrontFacing(e,t,i,s){return tn.subVectors(i,t),An.subVectors(e,t),tn.cross(An).dot(s)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,s){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,i,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return tn.subVectors(this.c,this.b),An.subVectors(this.a,this.b),tn.cross(An).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Xt.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Xt.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,s,a){return Xt.getInterpolation(e,this.a,this.b,this.c,t,i,s,a)}containsPoint(e){return Xt.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Xt.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,s=this.b,a=this.c;let r,o;ki.subVectors(s,i),Vi.subVectors(a,i),ro.subVectors(e,i);const l=ki.dot(ro),c=Vi.dot(ro);if(l<=0&&c<=0)return t.copy(i);ao.subVectors(e,s);const h=ki.dot(ao),f=Vi.dot(ao);if(h>=0&&f<=h)return t.copy(s);const u=l*f-h*c;if(u<=0&&l>=0&&h<=0)return r=l/(l-h),t.copy(i).addScaledVector(ki,r);oo.subVectors(e,a);const d=ki.dot(oo),g=Vi.dot(oo);if(g>=0&&d<=g)return t.copy(a);const M=d*c-l*g;if(M<=0&&c>=0&&g<=0)return o=c/(c-g),t.copy(i).addScaledVector(Vi,o);const m=h*g-d*f;if(m<=0&&f-h>=0&&d-g>=0)return xh.subVectors(a,s),o=(f-h)/(f-h+(d-g)),t.copy(s).addScaledVector(xh,o);const p=1/(m+M+u);return r=M*p,o=u*p,t.copy(i).addScaledVector(ki,r).addScaledVector(Vi,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class ai{constructor(e=new C(1/0,1/0,1/0),t=new C(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(nn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(nn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=nn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const a=i.getAttribute("position");if(t===!0&&a!==void 0&&e.isInstancedMesh!==!0)for(let r=0,o=a.count;r<o;r++)e.isMesh===!0?e.getVertexPosition(r,nn):nn.fromBufferAttribute(a,r),nn.applyMatrix4(e.matrixWorld),this.expandByPoint(nn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),yr.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),yr.copy(i.boundingBox)),yr.applyMatrix4(e.matrixWorld),this.union(yr)}const s=e.children;for(let a=0,r=s.length;a<r;a++)this.expandByObject(s[a],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,nn),nn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Rs),Sr.subVectors(this.max,Rs),Hi.subVectors(e.a,Rs),Gi.subVectors(e.b,Rs),Wi.subVectors(e.c,Rs),Jn.subVectors(Gi,Hi),Zn.subVectors(Wi,Gi),ci.subVectors(Hi,Wi);let t=[0,-Jn.z,Jn.y,0,-Zn.z,Zn.y,0,-ci.z,ci.y,Jn.z,0,-Jn.x,Zn.z,0,-Zn.x,ci.z,0,-ci.x,-Jn.y,Jn.x,0,-Zn.y,Zn.x,0,-ci.y,ci.x,0];return!uo(t,Hi,Gi,Wi,Sr)||(t=[1,0,0,0,1,0,0,0,1],!uo(t,Hi,Gi,Wi,Sr))?!1:(br.crossVectors(Jn,Zn),t=[br.x,br.y,br.z],uo(t,Hi,Gi,Wi,Sr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,nn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(nn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Rn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Rn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Rn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Rn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Rn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Rn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Rn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Rn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Rn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Rn=[new C,new C,new C,new C,new C,new C,new C,new C],nn=new C,yr=new ai,Hi=new C,Gi=new C,Wi=new C,Jn=new C,Zn=new C,ci=new C,Rs=new C,Sr=new C,br=new C,hi=new C;function uo(n,e,t,i,s){for(let a=0,r=n.length-3;a<=r;a+=3){hi.fromArray(n,a);const o=s.x*Math.abs(hi.x)+s.y*Math.abs(hi.y)+s.z*Math.abs(hi.z),l=e.dot(hi),c=t.dot(hi),h=i.dot(hi);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}const Et=new C,Er=new ne;let Sm=0;class jt extends Pi{constructor(e,t,i=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Sm++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=Nl,this.updateRanges=[],this.gpuType=Jt,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let s=0,a=this.itemSize;s<a;s++)this.array[e+s]=t.array[i+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)Er.fromBufferAttribute(this,t),Er.applyMatrix3(e),this.setXY(t,Er.x,Er.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)Et.fromBufferAttribute(this,t),Et.applyMatrix3(e),this.setXYZ(t,Et.x,Et.y,Et.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)Et.fromBufferAttribute(this,t),Et.applyMatrix4(e),this.setXYZ(t,Et.x,Et.y,Et.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Et.fromBufferAttribute(this,t),Et.applyNormalMatrix(e),this.setXYZ(t,Et.x,Et.y,Et.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Et.fromBufferAttribute(this,t),Et.transformDirection(e),this.setXYZ(t,Et.x,Et.y,Et.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=sn(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=st(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=sn(t,this.array)),t}setX(e,t){return this.normalized&&(t=st(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=sn(t,this.array)),t}setY(e,t){return this.normalized&&(t=st(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=sn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=st(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=sn(t,this.array)),t}setW(e,t){return this.normalized&&(t=st(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=st(t,this.array),i=st(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,s){return e*=this.itemSize,this.normalized&&(t=st(t,this.array),i=st(i,this.array),s=st(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this}setXYZW(e,t,i,s,a){return e*=this.itemSize,this.normalized&&(t=st(t,this.array),i=st(i,this.array),s=st(s,this.array),a=st(a,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this.array[e+3]=a,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Nl&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class cc extends jt{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class _f extends jt{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class Be extends jt{constructor(e,t,i){super(new Float32Array(e),t,i)}}const bm=new ai,Ps=new C,fo=new C;class Gn{constructor(e=new C,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):bm.setFromPoints(e).getCenter(i);let s=0;for(let a=0,r=e.length;a<r;a++)s=Math.max(s,i.distanceToSquared(e[a]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Ps.subVectors(e,this.center);const t=Ps.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),s=(i-this.radius)*.5;this.center.addScaledVector(Ps,s/i),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(fo.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Ps.copy(e.center).add(fo)),this.expandByPoint(Ps.copy(e.center).sub(fo))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let Em=0;const Yt=new Ye,po=new ct,Xi=new C,Ht=new ai,Cs=new ai,Rt=new C;class gt extends Pi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Em++}),this.uuid=Qt(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Hp(e)?_f:cc)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const a=new We().getNormalMatrix(e);i.applyNormalMatrix(a),i.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Yt.makeRotationFromQuaternion(e),this.applyMatrix4(Yt),this}rotateX(e){return Yt.makeRotationX(e),this.applyMatrix4(Yt),this}rotateY(e){return Yt.makeRotationY(e),this.applyMatrix4(Yt),this}rotateZ(e){return Yt.makeRotationZ(e),this.applyMatrix4(Yt),this}translate(e,t,i){return Yt.makeTranslation(e,t,i),this.applyMatrix4(Yt),this}scale(e,t,i){return Yt.makeScale(e,t,i),this.applyMatrix4(Yt),this}lookAt(e){return po.lookAt(e),po.updateMatrix(),this.applyMatrix4(po.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Xi).negate(),this.translate(Xi.x,Xi.y,Xi.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let s=0,a=e.length;s<a;s++){const r=e[s];i.push(r.x,r.y,r.z||0)}this.setAttribute("position",new Be(i,3))}else{const i=Math.min(e.length,t.count);for(let s=0;s<i;s++){const a=e[s];t.setXYZ(s,a.x,a.y,a.z||0)}e.length>t.count&&Ae("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ai);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Fe("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new C(-1/0,-1/0,-1/0),new C(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,s=t.length;i<s;i++){const a=t[i];Ht.setFromBufferAttribute(a),this.morphTargetsRelative?(Rt.addVectors(this.boundingBox.min,Ht.min),this.boundingBox.expandByPoint(Rt),Rt.addVectors(this.boundingBox.max,Ht.max),this.boundingBox.expandByPoint(Rt)):(this.boundingBox.expandByPoint(Ht.min),this.boundingBox.expandByPoint(Ht.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Fe('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Gn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Fe("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new C,1/0);return}if(e){const i=this.boundingSphere.center;if(Ht.setFromBufferAttribute(e),t)for(let a=0,r=t.length;a<r;a++){const o=t[a];Cs.setFromBufferAttribute(o),this.morphTargetsRelative?(Rt.addVectors(Ht.min,Cs.min),Ht.expandByPoint(Rt),Rt.addVectors(Ht.max,Cs.max),Ht.expandByPoint(Rt)):(Ht.expandByPoint(Cs.min),Ht.expandByPoint(Cs.max))}Ht.getCenter(i);let s=0;for(let a=0,r=e.count;a<r;a++)Rt.fromBufferAttribute(e,a),s=Math.max(s,i.distanceToSquared(Rt));if(t)for(let a=0,r=t.length;a<r;a++){const o=t[a],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Rt.fromBufferAttribute(o,c),l&&(Xi.fromBufferAttribute(e,c),Rt.add(Xi)),s=Math.max(s,i.distanceToSquared(Rt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Fe('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Fe("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,s=t.normal,a=t.uv;let r=this.getAttribute("tangent");(r===void 0||r.count!==i.count)&&(r=new jt(new Float32Array(4*i.count),4),this.setAttribute("tangent",r));const o=[],l=[];for(let _=0;_<i.count;_++)o[_]=new C,l[_]=new C;const c=new C,h=new C,f=new C,u=new ne,d=new ne,g=new ne,M=new C,m=new C;function p(_,T,P){c.fromBufferAttribute(i,_),h.fromBufferAttribute(i,T),f.fromBufferAttribute(i,P),u.fromBufferAttribute(a,_),d.fromBufferAttribute(a,T),g.fromBufferAttribute(a,P),h.sub(c),f.sub(c),d.sub(u),g.sub(u);const I=1/(d.x*g.y-g.x*d.y);isFinite(I)&&(M.copy(h).multiplyScalar(g.y).addScaledVector(f,-d.y).multiplyScalar(I),m.copy(f).multiplyScalar(d.x).addScaledVector(h,-g.x).multiplyScalar(I),o[_].add(M),o[T].add(M),o[P].add(M),l[_].add(m),l[T].add(m),l[P].add(m))}let y=this.groups;y.length===0&&(y=[{start:0,count:e.count}]);for(let _=0,T=y.length;_<T;++_){const P=y[_],I=P.start,N=P.count;for(let B=I,X=I+N;B<X;B+=3)p(e.getX(B+0),e.getX(B+1),e.getX(B+2))}const b=new C,x=new C,A=new C,E=new C;function R(_){A.fromBufferAttribute(s,_),E.copy(A);const T=o[_];b.copy(T),b.sub(A.multiplyScalar(A.dot(T))).normalize(),x.crossVectors(E,T);const I=x.dot(l[_])<0?-1:1;r.setXYZW(_,b.x,b.y,b.z,I)}for(let _=0,T=y.length;_<T;++_){const P=y[_],I=P.start,N=P.count;for(let B=I,X=I+N;B<X;B+=3)R(e.getX(B+0)),R(e.getX(B+1)),R(e.getX(B+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0||i.count!==t.count)i=new jt(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let u=0,d=i.count;u<d;u++)i.setXYZ(u,0,0,0);const s=new C,a=new C,r=new C,o=new C,l=new C,c=new C,h=new C,f=new C;if(e)for(let u=0,d=e.count;u<d;u+=3){const g=e.getX(u+0),M=e.getX(u+1),m=e.getX(u+2);s.fromBufferAttribute(t,g),a.fromBufferAttribute(t,M),r.fromBufferAttribute(t,m),h.subVectors(r,a),f.subVectors(s,a),h.cross(f),o.fromBufferAttribute(i,g),l.fromBufferAttribute(i,M),c.fromBufferAttribute(i,m),o.add(h),l.add(h),c.add(h),i.setXYZ(g,o.x,o.y,o.z),i.setXYZ(M,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let u=0,d=t.count;u<d;u+=3)s.fromBufferAttribute(t,u+0),a.fromBufferAttribute(t,u+1),r.fromBufferAttribute(t,u+2),h.subVectors(r,a),f.subVectors(s,a),h.cross(f),i.setXYZ(u+0,h.x,h.y,h.z),i.setXYZ(u+1,h.x,h.y,h.z),i.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)Rt.fromBufferAttribute(e,t),Rt.normalize(),e.setXYZ(t,Rt.x,Rt.y,Rt.z)}toNonIndexed(){function e(o,l){const c=o.array,h=o.itemSize,f=o.normalized,u=new c.constructor(l.length*h);let d=0,g=0;for(let M=0,m=l.length;M<m;M++){o.isInterleavedBufferAttribute?d=l[M]*o.data.stride+o.offset:d=l[M]*h;for(let p=0;p<h;p++)u[g++]=c[d++]}return new jt(u,h,f)}if(this.index===null)return Ae("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new gt,i=this.index.array,s=this.attributes;for(const o in s){const l=s[o],c=e(l,i);t.setAttribute(o,c)}const a=this.morphAttributes;for(const o in a){const l=[],c=a[o];for(let h=0,f=c.length;h<f;h++){const u=c[h],d=e(u,i);l.push(d)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const r=this.groups;for(let o=0,l=r.length;o<l;o++){const c=r[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const c=i[l];e.data.attributes[l]=c.toJSON(e.data)}const s={};let a=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let f=0,u=c.length;f<u;f++){const d=c[f];h.push(d.toJSON(e.data))}h.length>0&&(s[l]=h,a=!0)}a&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);const r=this.groups;r.length>0&&(e.data.groups=JSON.parse(JSON.stringify(r)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const s=e.attributes;for(const c in s){const h=s[c];this.setAttribute(c,h.clone(t))}const a=e.morphAttributes;for(const c in a){const h=[],f=a[c];for(let u=0,d=f.length;u<d;u++)h.push(f[u].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const r=e.groups;for(let c=0,h=r.length;c<h;c++){const f=r[c];this.addGroup(f.start,f.count,f.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Tm{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Nl,this.updateRanges=[],this.version=0,this.uuid=Qt()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,i){e*=this.stride,i*=t.stride;for(let s=0,a=this.stride;s<a;s++)this.array[e+s]=t.array[i+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Qt()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(t,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Qt()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const Ft=new C;class Ma{constructor(e,t,i,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=i,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,i=this.data.count;t<i;t++)Ft.fromBufferAttribute(this,t),Ft.applyMatrix4(e),this.setXYZ(t,Ft.x,Ft.y,Ft.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Ft.fromBufferAttribute(this,t),Ft.applyNormalMatrix(e),this.setXYZ(t,Ft.x,Ft.y,Ft.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Ft.fromBufferAttribute(this,t),Ft.transformDirection(e),this.setXYZ(t,Ft.x,Ft.y,Ft.z);return this}getComponent(e,t){let i=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(i=sn(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=st(i,this.array)),this.data.array[e*this.data.stride+this.offset+t]=i,this}setX(e,t){return this.normalized&&(t=st(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=st(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=st(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=st(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=sn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=sn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=sn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=sn(t,this.array)),t}setXY(e,t,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=st(t,this.array),i=st(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this}setXYZ(e,t,i,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=st(t,this.array),i=st(i,this.array),s=st(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=s,this}setXYZW(e,t,i,s,a){return e=e*this.data.stride+this.offset,this.normalized&&(t=st(t,this.array),i=st(i,this.array),s=st(s,this.array),a=st(a,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=s,this.data.array[e+3]=a,this}clone(e){if(e===void 0){xa("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const s=i*this.data.stride+this.offset;for(let a=0;a<this.itemSize;a++)t.push(this.data.array[s+a])}return new jt(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new Ma(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){xa("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const s=i*this.data.stride+this.offset;for(let a=0;a<this.itemSize;a++)t.push(this.data.array[s+a])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}let Am=0;class oi extends Pi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Am++}),this.uuid=Qt(),this.name="",this.type="Material",this.blending=os,this.side=si,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Xo,this.blendDst=qo,this.blendEquation=mi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new He(0,0,0),this.blendAlpha=0,this.depthFunc=us,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=rh,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ui,this.stencilZFail=Ui,this.stencilZPass=Ui,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){Ae(`Material: parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){Ae(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector2&&i&&i.isVector2||s&&s.isEuler&&i&&i.isEuler||s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==os&&(i.blending=this.blending),this.side!==si&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Xo&&(i.blendSrc=this.blendSrc),this.blendDst!==qo&&(i.blendDst=this.blendDst),this.blendEquation!==mi&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==us&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==rh&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ui&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Ui&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Ui&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.allowOverride===!1&&(i.allowOverride=!1),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(a){const r=[];for(const o in a){const l=a[o];delete l.metadata,r.push(l)}return r}if(t){const a=s(e.textures),r=s(e.images);a.length>0&&(i.textures=a),r.length>0&&(i.images=r)}return i}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new He().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let i=e.normalScale;Array.isArray(i)===!1&&(i=[i,i]),this.normalScale=new ne().fromArray(i)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ne().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const s=t.length;i=new Array(s);for(let a=0;a!==s;++a)i[a]=t[a].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class wm extends oi{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new He(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let qi;const Is=new C,Yi=new C,$i=new C,Ki=new ne,Ls=new ne,vf=new Ye,Tr=new C,Ds=new C,Ar=new C,Mh=new ne,mo=new ne,yh=new ne;class rb extends ct{constructor(e=new wm){if(super(),this.isSprite=!0,this.type="Sprite",qi===void 0){qi=new gt;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new Tm(t,5);qi.setIndex([0,1,2,0,2,3]),qi.setAttribute("position",new Ma(i,3,0,!1)),qi.setAttribute("uv",new Ma(i,2,3,!1))}this.geometry=qi,this.material=e,this.center=new ne(.5,.5),this.count=1}raycast(e,t){e.camera===null&&Fe('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),Yi.setFromMatrixScale(this.matrixWorld),vf.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),$i.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Yi.multiplyScalar(-$i.z);const i=this.material.rotation;let s,a;i!==0&&(a=Math.cos(i),s=Math.sin(i));const r=this.center;wr(Tr.set(-.5,-.5,0),$i,r,Yi,s,a),wr(Ds.set(.5,-.5,0),$i,r,Yi,s,a),wr(Ar.set(.5,.5,0),$i,r,Yi,s,a),Mh.set(0,0),mo.set(1,0),yh.set(1,1);let o=e.ray.intersectTriangle(Tr,Ds,Ar,!1,Is);if(o===null&&(wr(Ds.set(-.5,.5,0),$i,r,Yi,s,a),mo.set(0,1),o=e.ray.intersectTriangle(Tr,Ar,Ds,!1,Is),o===null))return;const l=e.ray.origin.distanceTo(Is);l<e.near||l>e.far||t.push({distance:l,point:Is.clone(),uv:Xt.getInterpolation(Is,Tr,Ds,Ar,Mh,mo,yh,new ne),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function wr(n,e,t,i,s,a){Ki.subVectors(n,t).addScalar(.5).multiply(i),s!==void 0?(Ls.x=a*Ki.x-s*Ki.y,Ls.y=s*Ki.x+a*Ki.y):Ls.copy(Ki),n.copy(e),n.x+=Ls.x,n.y+=Ls.y,n.applyMatrix4(vf)}const Pn=new C,go=new C,Rr=new C,Qn=new C,_o=new C,Pr=new C,vo=new C;class lr{constructor(e=new C,t=new C(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Pn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Pn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Pn.copy(this.origin).addScaledVector(this.direction,t),Pn.distanceToSquared(e))}distanceSqToSegment(e,t,i,s){go.copy(e).add(t).multiplyScalar(.5),Rr.copy(t).sub(e).normalize(),Qn.copy(this.origin).sub(go);const a=e.distanceTo(t)*.5,r=-this.direction.dot(Rr),o=Qn.dot(this.direction),l=-Qn.dot(Rr),c=Qn.lengthSq(),h=Math.abs(1-r*r);let f,u,d,g;if(h>0)if(f=r*l-o,u=r*o-l,g=a*h,f>=0)if(u>=-g)if(u<=g){const M=1/h;f*=M,u*=M,d=f*(f+r*u+2*o)+u*(r*f+u+2*l)+c}else u=a,f=Math.max(0,-(r*u+o)),d=-f*f+u*(u+2*l)+c;else u=-a,f=Math.max(0,-(r*u+o)),d=-f*f+u*(u+2*l)+c;else u<=-g?(f=Math.max(0,-(-r*a+o)),u=f>0?-a:Math.min(Math.max(-a,-l),a),d=-f*f+u*(u+2*l)+c):u<=g?(f=0,u=Math.min(Math.max(-a,-l),a),d=u*(u+2*l)+c):(f=Math.max(0,-(r*a+o)),u=f>0?a:Math.min(Math.max(-a,-l),a),d=-f*f+u*(u+2*l)+c);else u=r>0?-a:a,f=Math.max(0,-(r*u+o)),d=-f*f+u*(u+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,f),s&&s.copy(go).addScaledVector(Rr,u),d}intersectSphere(e,t){Pn.subVectors(e.center,this.origin);const i=Pn.dot(this.direction),s=Pn.dot(Pn)-i*i,a=e.radius*e.radius;if(s>a)return null;const r=Math.sqrt(a-s),o=i-r,l=i+r;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,s,a,r,o,l;const c=1/this.direction.x,h=1/this.direction.y,f=1/this.direction.z,u=this.origin;return c>=0?(i=(e.min.x-u.x)*c,s=(e.max.x-u.x)*c):(i=(e.max.x-u.x)*c,s=(e.min.x-u.x)*c),h>=0?(a=(e.min.y-u.y)*h,r=(e.max.y-u.y)*h):(a=(e.max.y-u.y)*h,r=(e.min.y-u.y)*h),i>r||a>s||((a>i||isNaN(i))&&(i=a),(r<s||isNaN(s))&&(s=r),f>=0?(o=(e.min.z-u.z)*f,l=(e.max.z-u.z)*f):(o=(e.max.z-u.z)*f,l=(e.min.z-u.z)*f),i>l||o>s)||((o>i||i!==i)&&(i=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(i>=0?i:s,t)}intersectsBox(e){return this.intersectBox(e,Pn)!==null}intersectTriangle(e,t,i,s,a){_o.subVectors(t,e),Pr.subVectors(i,e),vo.crossVectors(_o,Pr);let r=this.direction.dot(vo),o;if(r>0){if(s)return null;o=1}else if(r<0)o=-1,r=-r;else return null;Qn.subVectors(this.origin,e);const l=o*this.direction.dot(Pr.crossVectors(Qn,Pr));if(l<0)return null;const c=o*this.direction.dot(_o.cross(Qn));if(c<0||l+c>r)return null;const h=-o*Qn.dot(vo);return h<0?null:this.at(h/r,a)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Oa extends oi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new He(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new kn,this.combine=Ju,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Sh=new Ye,ui=new lr,Cr=new Gn,bh=new C,Ir=new C,Lr=new C,Dr=new C,xo=new C,Nr=new C,Eh=new C,Ur=new C;class yt extends ct{constructor(e=new gt,t=new Oa){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=s.length;a<r;a++){const o=s[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}getVertexPosition(e,t){const i=this.geometry,s=i.attributes.position,a=i.morphAttributes.position,r=i.morphTargetsRelative;t.fromBufferAttribute(s,e);const o=this.morphTargetInfluences;if(a&&o){Nr.set(0,0,0);for(let l=0,c=a.length;l<c;l++){const h=o[l],f=a[l];h!==0&&(xo.fromBufferAttribute(f,e),r?Nr.addScaledVector(xo,h):Nr.addScaledVector(xo.sub(t),h))}t.add(Nr)}return t}raycast(e,t){const i=this.geometry,s=this.material,a=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Cr.copy(i.boundingSphere),Cr.applyMatrix4(a),ui.copy(e.ray).recast(e.near),!(Cr.containsPoint(ui.origin)===!1&&(ui.intersectSphere(Cr,bh)===null||ui.origin.distanceToSquared(bh)>(e.far-e.near)**2))&&(Sh.copy(a).invert(),ui.copy(e.ray).applyMatrix4(Sh),!(i.boundingBox!==null&&ui.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,ui)))}_computeIntersections(e,t,i){let s;const a=this.geometry,r=this.material,o=a.index,l=a.attributes.position,c=a.attributes.uv,h=a.attributes.uv1,f=a.attributes.normal,u=a.groups,d=a.drawRange;if(o!==null)if(Array.isArray(r))for(let g=0,M=u.length;g<M;g++){const m=u[g],p=r[m.materialIndex],y=Math.max(m.start,d.start),b=Math.min(o.count,Math.min(m.start+m.count,d.start+d.count));for(let x=y,A=b;x<A;x+=3){const E=o.getX(x),R=o.getX(x+1),_=o.getX(x+2);s=Fr(this,p,e,i,c,h,f,E,R,_),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{const g=Math.max(0,d.start),M=Math.min(o.count,d.start+d.count);for(let m=g,p=M;m<p;m+=3){const y=o.getX(m),b=o.getX(m+1),x=o.getX(m+2);s=Fr(this,r,e,i,c,h,f,y,b,x),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(r))for(let g=0,M=u.length;g<M;g++){const m=u[g],p=r[m.materialIndex],y=Math.max(m.start,d.start),b=Math.min(l.count,Math.min(m.start+m.count,d.start+d.count));for(let x=y,A=b;x<A;x+=3){const E=x,R=x+1,_=x+2;s=Fr(this,p,e,i,c,h,f,E,R,_),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{const g=Math.max(0,d.start),M=Math.min(l.count,d.start+d.count);for(let m=g,p=M;m<p;m+=3){const y=m,b=m+1,x=m+2;s=Fr(this,r,e,i,c,h,f,y,b,x),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}}function Rm(n,e,t,i,s,a,r,o){let l;if(e.side===zt?l=i.intersectTriangle(r,a,s,!0,o):l=i.intersectTriangle(s,a,r,e.side===si,o),l===null)return null;Ur.copy(o),Ur.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(Ur);return c<t.near||c>t.far?null:{distance:c,point:Ur.clone(),object:n}}function Fr(n,e,t,i,s,a,r,o,l,c){n.getVertexPosition(o,Ir),n.getVertexPosition(l,Lr),n.getVertexPosition(c,Dr);const h=Rm(n,e,t,i,Ir,Lr,Dr,Eh);if(h){const f=new C;Xt.getBarycoord(Eh,Ir,Lr,Dr,f),s&&(h.uv=Xt.getInterpolatedAttribute(s,o,l,c,f,new ne)),a&&(h.uv1=Xt.getInterpolatedAttribute(a,o,l,c,f,new ne)),r&&(h.normal=Xt.getInterpolatedAttribute(r,o,l,c,f,new C),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));const u={a:o,b:l,c,normal:new C,materialIndex:0};Xt.getNormal(Ir,Lr,Dr,u.normal),h.face=u,h.barycoord=f}return h}const Ns=new lt,Th=new lt,Ah=new lt,Pm=new lt,wh=new Ye,Or=new C,Mo=new Gn,Rh=new Ye,yo=new lr;class Cm extends yt{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=eh,this.bindMatrix=new Ye,this.bindMatrixInverse=new Ye,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new ai),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let i=0;i<t.count;i++)this.getVertexPosition(i,Or),this.boundingBox.expandByPoint(Or)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Gn),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let i=0;i<t.count;i++)this.getVertexPosition(i,Or),this.boundingSphere.expandByPoint(Or)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){const i=this.material,s=this.matrixWorld;i!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Mo.copy(this.boundingSphere),Mo.applyMatrix4(s),e.ray.intersectsSphere(Mo)!==!1&&(Rh.copy(s).invert(),yo.copy(e.ray).applyMatrix4(Rh),!(this.boundingBox!==null&&yo.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,yo)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new lt,t=this.geometry.attributes.skinWeight;for(let i=0,s=t.count;i<s;i++){e.fromBufferAttribute(t,i);const a=1/e.manhattanLength();a!==1/0?e.multiplyScalar(a):e.set(1,0,0,0),t.setXYZW(i,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===eh?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===Ip?this.bindMatrixInverse.copy(this.bindMatrix).invert():Ae("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const i=this.skeleton,s=this.geometry;Th.fromBufferAttribute(s.attributes.skinIndex,e),Ah.fromBufferAttribute(s.attributes.skinWeight,e),t.isVector4?(Ns.copy(t),t.set(0,0,0,0)):(Ns.set(...t,1),t.set(0,0,0)),Ns.applyMatrix4(this.bindMatrix);for(let a=0;a<4;a++){const r=Ah.getComponent(a);if(r!==0){const o=Th.getComponent(a);wh.multiplyMatrices(i.bones[o].matrixWorld,i.boneInverses[o]),t.addScaledVector(Pm.copy(Ns).applyMatrix4(wh),r)}}return t.isVector4&&(t.w=Ns.w),t.applyMatrix4(this.bindMatrixInverse)}}class hc extends ct{constructor(){super(),this.isBone=!0,this.type="Bone"}}class uc extends It{constructor(e=null,t=1,i=1,s,a,r,o,l,c=Ct,h=Ct,f,u){super(null,r,o,l,c,h,s,a,f,u),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Ph=new Ye,Im=new Ye;class fc{constructor(e=[],t=[]){this.uuid=Qt(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){Ae("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let i=0,s=this.bones.length;i<s;i++)this.boneInverses.push(new Ye)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const i=new Ye;this.bones[e]&&i.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(i)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const i=this.bones[e];i&&i.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const i=this.bones[e];i&&(i.parent&&i.parent.isBone?(i.matrix.copy(i.parent.matrixWorld).invert(),i.matrix.multiply(i.matrixWorld)):i.matrix.copy(i.matrixWorld),i.matrix.decompose(i.position,i.quaternion,i.scale))}}update(){const e=this.bones,t=this.boneInverses,i=this.boneMatrices,s=this.boneTexture;for(let a=0,r=e.length;a<r;a++){const o=e[a]?e[a].matrixWorld:Im;Ph.multiplyMatrices(o,t[a]),Ph.toArray(i,a*16)}s!==null&&(s.needsUpdate=!0)}clone(){return new fc(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const i=new uc(t,e,e,Zt,Jt);return i.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=i,this}getBoneByName(e){for(let t=0,i=this.bones.length;t<i;t++){const s=this.bones[t];if(s.name===e)return s}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let i=0,s=e.bones.length;i<s;i++){const a=e.bones[i];let r=t[a];r===void 0&&(Ae("Skeleton: No bone found with UUID:",a),r=new hc),this.bones.push(r),this.boneInverses.push(new Ye().fromArray(e.boneInverses[i]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,i=this.boneInverses;for(let s=0,a=t.length;s<a;s++){const r=t[s];e.bones.push(r.uuid);const o=i[s];e.boneInverses.push(o.toArray())}return e}}class Ch extends jt{constructor(e,t,i,s=1){super(e,t,i),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const Ji=new Ye,Ih=new Ye,Br=[],Lh=new ai,Lm=new Ye,Us=new yt,Fs=new Gn;class ab extends yt{constructor(e,t,i){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Ch(new Float32Array(i*16),16),this.instanceColor=null,this.morphTexture=null,this.count=i,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<i;s++)this.setMatrixAt(s,Lm)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new ai),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let i=0;i<t;i++)this.getMatrixAt(i,Ji),Lh.copy(e.boundingBox).applyMatrix4(Ji),this.boundingBox.union(Lh)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Gn),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let i=0;i<t;i++)this.getMatrixAt(i,Ji),Fs.copy(e.boundingSphere).applyMatrix4(Ji),this.boundingSphere.union(Fs)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const i=t.morphTargetInfluences,s=this.morphTexture.source.data.data,a=i.length+1,r=e*a+1;for(let o=0;o<i.length;o++)i[o]=s[r+o]}raycast(e,t){const i=this.matrixWorld,s=this.count;if(Us.geometry=this.geometry,Us.material=this.material,Us.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Fs.copy(this.boundingSphere),Fs.applyMatrix4(i),e.ray.intersectsSphere(Fs)!==!1))for(let a=0;a<s;a++){this.getMatrixAt(a,Ji),Ih.multiplyMatrices(i,Ji),Us.matrixWorld=Ih,Us.raycast(e,Br);for(let r=0,o=Br.length;r<o;r++){const l=Br[r];l.instanceId=a,l.object=this,t.push(l)}Br.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new Ch(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){const i=t.morphTargetInfluences,s=i.length+1;this.morphTexture===null&&(this.morphTexture=new uc(new Float32Array(s*this.count),s,this.count,ec,Jt));const a=this.morphTexture.source.data.data;let r=0;for(let c=0;c<i.length;c++)r+=i[c];const o=this.geometry.morphTargetsRelative?1:1-r,l=s*e;return a[l]=o,a.set(i,l+1),this}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const So=new C,Dm=new C,Nm=new We;class pi{constructor(e=new C(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,s){return this.normal.set(e,t,i),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const s=So.subVectors(i,t).cross(Dm.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,i=!0){const s=e.delta(So),a=this.normal.dot(s);if(a===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/a;return i===!0&&(r<0||r>1)?null:t.copy(e.start).addScaledVector(s,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||Nm.getNormalMatrix(e),s=this.coplanarPoint(So).applyMatrix4(e),a=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(a),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const fi=new Gn,Um=new ne(.5,.5),zr=new C;class dc{constructor(e=new pi,t=new pi,i=new pi,s=new pi,a=new pi,r=new pi){this.planes=[e,t,i,s,a,r]}set(e,t,i,s,a,r){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(i),o[3].copy(s),o[4].copy(a),o[5].copy(r),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=_n,i=!1){const s=this.planes,a=e.elements,r=a[0],o=a[1],l=a[2],c=a[3],h=a[4],f=a[5],u=a[6],d=a[7],g=a[8],M=a[9],m=a[10],p=a[11],y=a[12],b=a[13],x=a[14],A=a[15];if(s[0].setComponents(c-r,d-h,p-g,A-y).normalize(),s[1].setComponents(c+r,d+h,p+g,A+y).normalize(),s[2].setComponents(c+o,d+f,p+M,A+b).normalize(),s[3].setComponents(c-o,d-f,p-M,A-b).normalize(),i)s[4].setComponents(l,u,m,x).normalize(),s[5].setComponents(c-l,d-u,p-m,A-x).normalize();else if(s[4].setComponents(c-l,d-u,p-m,A-x).normalize(),t===_n)s[5].setComponents(c+l,d+u,p+m,A+x).normalize();else if(t===er)s[5].setComponents(l,u,m,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),fi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),fi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(fi)}intersectsSprite(e){fi.center.set(0,0,0);const t=Um.distanceTo(e.center);return fi.radius=.7071067811865476+t,fi.applyMatrix4(e.matrixWorld),this.intersectsSphere(fi)}intersectsSphere(e){const t=this.planes,i=e.center,s=-e.radius;for(let a=0;a<6;a++)if(t[a].distanceToPoint(i)<s)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const s=t[i];if(zr.x=s.normal.x>0?e.max.x:e.min.x,zr.y=s.normal.y>0?e.max.y:e.min.y,zr.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(zr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class xf extends oi{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new He(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ya=new C,Sa=new C,Dh=new Ye,Os=new lr,kr=new Gn,bo=new C,Nh=new C;class Mf extends ct{constructor(e=new gt,t=new xf){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[0];for(let s=1,a=t.count;s<a;s++)ya.fromBufferAttribute(t,s-1),Sa.fromBufferAttribute(t,s),i[s]=i[s-1],i[s]+=ya.distanceTo(Sa);e.setAttribute("lineDistance",new Be(i,1))}else Ae("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const i=this.geometry,s=this.matrixWorld,a=e.params.Line.threshold,r=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),kr.copy(i.boundingSphere),kr.applyMatrix4(s),kr.radius+=a,e.ray.intersectsSphere(kr)===!1)return;Dh.copy(s).invert(),Os.copy(e.ray).applyMatrix4(Dh);const o=a/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,h=i.index,u=i.attributes.position;if(h!==null){const d=Math.max(0,r.start),g=Math.min(h.count,r.start+r.count);for(let M=d,m=g-1;M<m;M+=c){const p=h.getX(M),y=h.getX(M+1),b=Vr(this,e,Os,l,p,y,M);b&&t.push(b)}if(this.isLineLoop){const M=h.getX(g-1),m=h.getX(d),p=Vr(this,e,Os,l,M,m,g-1);p&&t.push(p)}}else{const d=Math.max(0,r.start),g=Math.min(u.count,r.start+r.count);for(let M=d,m=g-1;M<m;M+=c){const p=Vr(this,e,Os,l,M,M+1,M);p&&t.push(p)}if(this.isLineLoop){const M=Vr(this,e,Os,l,g-1,d,g-1);M&&t.push(M)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=s.length;a<r;a++){const o=s[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}}function Vr(n,e,t,i,s,a,r){const o=n.geometry.attributes.position;if(ya.fromBufferAttribute(o,s),Sa.fromBufferAttribute(o,a),t.distanceSqToSegment(ya,Sa,bo,Nh)>i)return;bo.applyMatrix4(n.matrixWorld);const c=e.ray.origin.distanceTo(bo);if(!(c<e.near||c>e.far))return{distance:c,point:Nh.clone().applyMatrix4(n.matrixWorld),index:r,face:null,faceIndex:null,barycoord:null,object:n}}const Uh=new C,Fh=new C;class Fm extends Mf{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[];for(let s=0,a=t.count;s<a;s+=2)Uh.fromBufferAttribute(t,s),Fh.fromBufferAttribute(t,s+1),i[s]=s===0?0:i[s-1],i[s+1]=i[s]+Uh.distanceTo(Fh);e.setAttribute("lineDistance",new Be(i,1))}else Ae("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class ob extends Mf{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}}class Om extends oi{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new He(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Oh=new Ye,Fl=new lr,Hr=new Gn,Gr=new C;class lb extends ct{constructor(e=new gt,t=new Om){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const i=this.geometry,s=this.matrixWorld,a=e.params.Points.threshold,r=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Hr.copy(i.boundingSphere),Hr.applyMatrix4(s),Hr.radius+=a,e.ray.intersectsSphere(Hr)===!1)return;Oh.copy(s).invert(),Fl.copy(e.ray).applyMatrix4(Oh);const o=a/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=i.index,f=i.attributes.position;if(c!==null){const u=Math.max(0,r.start),d=Math.min(c.count,r.start+r.count);for(let g=u,M=d;g<M;g++){const m=c.getX(g);Gr.fromBufferAttribute(f,m),Bh(Gr,m,l,s,e,t,this)}}else{const u=Math.max(0,r.start),d=Math.min(f.count,r.start+r.count);for(let g=u,M=d;g<M;g++)Gr.fromBufferAttribute(f,g),Bh(Gr,g,l,s,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=s.length;a<r;a++){const o=s[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}}function Bh(n,e,t,i,s,a,r){const o=Fl.distanceSqToPoint(n);if(o<t){const l=new C;Fl.closestPointToPoint(n,l),l.applyMatrix4(i);const c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;a.push({distance:c,distanceToRay:Math.sqrt(o),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:r})}}class yf extends It{constructor(e=[],t=bi,i,s,a,r,o,l,c,h){super(e,t,i,s,a,r,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Sf extends It{constructor(e,t,i,s,a,r,o,l,c){super(e,t,i,s,a,r,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class ps extends It{constructor(e,t,i=yn,s,a,r,o=Ct,l=Ct,c,h=zn,f=1){if(h!==zn&&h!==xi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const u={width:e,height:t,depth:f};super(u,s,a,r,o,l,h,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new oc(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Bm extends ps{constructor(e,t=yn,i=bi,s,a,r=Ct,o=Ct,l,c=zn){const h={width:e,height:e,depth:1},f=[h,h,h,h,h,h];super(e,e,t,i,s,a,r,o,l,c),this.image=f,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class bf extends It{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ys extends gt{constructor(e=1,t=1,i=1,s=1,a=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:s,heightSegments:a,depthSegments:r};const o=this;s=Math.floor(s),a=Math.floor(a),r=Math.floor(r);const l=[],c=[],h=[],f=[];let u=0,d=0;g("z","y","x",-1,-1,i,t,e,r,a,0),g("z","y","x",1,-1,i,t,-e,r,a,1),g("x","z","y",1,1,e,i,t,s,r,2),g("x","z","y",1,-1,e,i,-t,s,r,3),g("x","y","z",1,-1,e,t,i,s,a,4),g("x","y","z",-1,-1,e,t,-i,s,a,5),this.setIndex(l),this.setAttribute("position",new Be(c,3)),this.setAttribute("normal",new Be(h,3)),this.setAttribute("uv",new Be(f,2));function g(M,m,p,y,b,x,A,E,R,_,T){const P=x/R,I=A/_,N=x/2,B=A/2,X=E/2,F=R+1,W=_+1;let H=0,Z=0;const ie=new C;for(let he=0;he<W;he++){const oe=he*I-B;for(let ye=0;ye<F;ye++){const Je=ye*P-N;ie[M]=Je*y,ie[m]=oe*b,ie[p]=X,c.push(ie.x,ie.y,ie.z),ie[M]=0,ie[m]=0,ie[p]=E>0?1:-1,h.push(ie.x,ie.y,ie.z),f.push(ye/R),f.push(1-he/_),H+=1}}for(let he=0;he<_;he++)for(let oe=0;oe<R;oe++){const ye=u+oe+F*he,Je=u+oe+F*(he+1),ht=u+(oe+1)+F*(he+1),et=u+(oe+1)+F*he;l.push(ye,Je,et),l.push(Je,ht,et),Z+=6}o.addGroup(d,Z,T),d+=Z,u+=H}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ys(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class pc extends gt{constructor(e=1,t=1,i=4,s=8,a=1){super(),this.type="CapsuleGeometry",this.parameters={radius:e,height:t,capSegments:i,radialSegments:s,heightSegments:a},t=Math.max(0,t),i=Math.max(1,Math.floor(i)),s=Math.max(3,Math.floor(s)),a=Math.max(1,Math.floor(a));const r=[],o=[],l=[],c=[],h=t/2,f=Math.PI/2*e,u=t,d=2*f+u,g=i*2+a,M=s+1,m=new C,p=new C;for(let y=0;y<=g;y++){let b=0,x=0,A=0,E=0;if(y<=i){const T=y/i,P=T*Math.PI/2;x=-h-e*Math.cos(P),A=e*Math.sin(P),E=-e*Math.cos(P),b=T*f}else if(y<=i+a){const T=(y-i)/a;x=-h+T*t,A=e,E=0,b=f+T*u}else{const T=(y-i-a)/i,P=T*Math.PI/2;x=h+e*Math.sin(P),A=e*Math.cos(P),E=e*Math.sin(P),b=f+u+T*f}const R=Math.max(0,Math.min(1,b/d));let _=0;y===0?_=.5/s:y===g&&(_=-.5/s);for(let T=0;T<=s;T++){const P=T/s,I=P*Math.PI*2,N=Math.sin(I),B=Math.cos(I);p.x=-A*B,p.y=x,p.z=A*N,o.push(p.x,p.y,p.z),m.set(-A*B,E,A*N),m.normalize(),l.push(m.x,m.y,m.z),c.push(P+_,R)}if(y>0){const T=(y-1)*M;for(let P=0;P<s;P++){const I=T+P,N=T+P+1,B=y*M+P,X=y*M+P+1;r.push(I,N,B),r.push(N,X,B)}}}this.setIndex(r),this.setAttribute("position",new Be(o,3)),this.setAttribute("normal",new Be(l,3)),this.setAttribute("uv",new Be(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new pc(e.radius,e.height,e.capSegments,e.radialSegments,e.heightSegments)}}class Ef extends gt{constructor(e=1,t=32,i=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:i,thetaLength:s},t=Math.max(3,t);const a=[],r=[],o=[],l=[],c=new C,h=new ne;r.push(0,0,0),o.push(0,0,1),l.push(.5,.5);for(let f=0,u=3;f<=t;f++,u+=3){const d=i+f/t*s;c.x=e*Math.cos(d),c.y=e*Math.sin(d),r.push(c.x,c.y,c.z),o.push(0,0,1),h.x=(r[u]/e+1)/2,h.y=(r[u+1]/e+1)/2,l.push(h.x,h.y)}for(let f=1;f<=t;f++)a.push(f,f+1,0);this.setIndex(a),this.setAttribute("position",new Be(r,3)),this.setAttribute("normal",new Be(o,3)),this.setAttribute("uv",new Be(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ef(e.radius,e.segments,e.thetaStart,e.thetaLength)}}class mc extends gt{constructor(e=1,t=1,i=1,s=32,a=1,r=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:s,heightSegments:a,openEnded:r,thetaStart:o,thetaLength:l};const c=this;s=Math.floor(s),a=Math.floor(a);const h=[],f=[],u=[],d=[];let g=0;const M=[],m=i/2;let p=0;y(),r===!1&&(e>0&&b(!0),t>0&&b(!1)),this.setIndex(h),this.setAttribute("position",new Be(f,3)),this.setAttribute("normal",new Be(u,3)),this.setAttribute("uv",new Be(d,2));function y(){const x=new C,A=new C;let E=0;const R=(t-e)/i;for(let _=0;_<=a;_++){const T=[],P=_/a,I=P*(t-e)+e;for(let N=0;N<=s;N++){const B=N/s,X=B*l+o,F=Math.sin(X),W=Math.cos(X);A.x=I*F,A.y=-P*i+m,A.z=I*W,f.push(A.x,A.y,A.z),x.set(F,R,W).normalize(),u.push(x.x,x.y,x.z),d.push(B,1-P),T.push(g++)}M.push(T)}for(let _=0;_<s;_++)for(let T=0;T<a;T++){const P=M[T][_],I=M[T+1][_],N=M[T+1][_+1],B=M[T][_+1];(e>0||T!==0)&&(h.push(P,I,B),E+=3),(t>0||T!==a-1)&&(h.push(I,N,B),E+=3)}c.addGroup(p,E,0),p+=E}function b(x){const A=g,E=new ne,R=new C;let _=0;const T=x===!0?e:t,P=x===!0?1:-1;for(let N=1;N<=s;N++)f.push(0,m*P,0),u.push(0,P,0),d.push(.5,.5),g++;const I=g;for(let N=0;N<=s;N++){const X=N/s*l+o,F=Math.cos(X),W=Math.sin(X);R.x=T*W,R.y=m*P,R.z=T*F,f.push(R.x,R.y,R.z),u.push(0,P,0),E.x=F*.5+.5,E.y=W*.5*P+.5,d.push(E.x,E.y),g++}for(let N=0;N<s;N++){const B=A+N,X=I+N;x===!0?h.push(X,X+1,B):h.push(X+1,X,B),_+=3}c.addGroup(p,_,x===!0?1:2),p+=_}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new mc(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Tf extends mc{constructor(e=1,t=1,i=32,s=1,a=!1,r=0,o=Math.PI*2){super(0,e,t,i,s,a,r,o),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:i,heightSegments:s,openEnded:a,thetaStart:r,thetaLength:o}}static fromJSON(e){return new Tf(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Ss extends gt{constructor(e=[],t=[],i=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:i,detail:s};const a=[],r=[];o(s),c(i),h(),this.setAttribute("position",new Be(a,3)),this.setAttribute("normal",new Be(a.slice(),3)),this.setAttribute("uv",new Be(r,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function o(y){const b=new C,x=new C,A=new C;for(let E=0;E<t.length;E+=3)d(t[E+0],b),d(t[E+1],x),d(t[E+2],A),l(b,x,A,y)}function l(y,b,x,A){const E=A+1,R=[];for(let _=0;_<=E;_++){R[_]=[];const T=y.clone().lerp(x,_/E),P=b.clone().lerp(x,_/E),I=E-_;for(let N=0;N<=I;N++)N===0&&_===E?R[_][N]=T:R[_][N]=T.clone().lerp(P,N/I)}for(let _=0;_<E;_++)for(let T=0;T<2*(E-_)-1;T++){const P=Math.floor(T/2);T%2===0?(u(R[_][P+1]),u(R[_+1][P]),u(R[_][P])):(u(R[_][P+1]),u(R[_+1][P+1]),u(R[_+1][P]))}}function c(y){const b=new C;for(let x=0;x<a.length;x+=3)b.x=a[x+0],b.y=a[x+1],b.z=a[x+2],b.normalize().multiplyScalar(y),a[x+0]=b.x,a[x+1]=b.y,a[x+2]=b.z}function h(){const y=new C;for(let b=0;b<a.length;b+=3){y.x=a[b+0],y.y=a[b+1],y.z=a[b+2];const x=m(y)/2/Math.PI+.5,A=p(y)/Math.PI+.5;r.push(x,1-A)}g(),f()}function f(){for(let y=0;y<r.length;y+=6){const b=r[y+0],x=r[y+2],A=r[y+4],E=Math.max(b,x,A),R=Math.min(b,x,A);E>.9&&R<.1&&(b<.2&&(r[y+0]+=1),x<.2&&(r[y+2]+=1),A<.2&&(r[y+4]+=1))}}function u(y){a.push(y.x,y.y,y.z)}function d(y,b){const x=y*3;b.x=e[x+0],b.y=e[x+1],b.z=e[x+2]}function g(){const y=new C,b=new C,x=new C,A=new C,E=new ne,R=new ne,_=new ne;for(let T=0,P=0;T<a.length;T+=9,P+=6){y.set(a[T+0],a[T+1],a[T+2]),b.set(a[T+3],a[T+4],a[T+5]),x.set(a[T+6],a[T+7],a[T+8]),E.set(r[P+0],r[P+1]),R.set(r[P+2],r[P+3]),_.set(r[P+4],r[P+5]),A.copy(y).add(b).add(x).divideScalar(3);const I=m(A);M(E,P+0,y,I),M(R,P+2,b,I),M(_,P+4,x,I)}}function M(y,b,x,A){A<0&&y.x===1&&(r[b]=y.x-1),x.x===0&&x.z===0&&(r[b]=A/2/Math.PI+.5)}function m(y){return Math.atan2(y.z,-y.x)}function p(y){return Math.atan2(-y.y,Math.sqrt(y.x*y.x+y.z*y.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ss(e.vertices,e.indices,e.radius,e.detail)}}class Af extends Ss{constructor(e=1,t=0){const i=(1+Math.sqrt(5))/2,s=1/i,a=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-s,-i,0,-s,i,0,s,-i,0,s,i,-s,-i,0,-s,i,0,s,-i,0,s,i,0,-i,0,-s,i,0,-s,-i,0,s,i,0,s],r=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(a,r,e,t),this.type="DodecahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Af(e.radius,e.detail)}}const Wr=new C,Xr=new C,Eo=new C,qr=new Xt;class cb extends gt{constructor(e=null,t=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:e,thresholdAngle:t},e!==null){const s=Math.pow(10,4),a=Math.cos(cs*t),r=e.getIndex(),o=e.getAttribute("position"),l=r?r.count:o.count,c=[0,0,0],h=["a","b","c"],f=new Array(3),u={},d=[];for(let g=0;g<l;g+=3){r?(c[0]=r.getX(g),c[1]=r.getX(g+1),c[2]=r.getX(g+2)):(c[0]=g,c[1]=g+1,c[2]=g+2);const{a:M,b:m,c:p}=qr;if(M.fromBufferAttribute(o,c[0]),m.fromBufferAttribute(o,c[1]),p.fromBufferAttribute(o,c[2]),qr.getNormal(Eo),f[0]=`${Math.round(M.x*s)},${Math.round(M.y*s)},${Math.round(M.z*s)}`,f[1]=`${Math.round(m.x*s)},${Math.round(m.y*s)},${Math.round(m.z*s)}`,f[2]=`${Math.round(p.x*s)},${Math.round(p.y*s)},${Math.round(p.z*s)}`,!(f[0]===f[1]||f[1]===f[2]||f[2]===f[0]))for(let y=0;y<3;y++){const b=(y+1)%3,x=f[y],A=f[b],E=qr[h[y]],R=qr[h[b]],_=`${x}_${A}`,T=`${A}_${x}`;T in u&&u[T]?(Eo.dot(u[T].normal)<=a&&(d.push(E.x,E.y,E.z),d.push(R.x,R.y,R.z)),u[T]=null):_ in u||(u[_]={index0:c[y],index1:c[b],normal:Eo.clone()})}}for(const g in u)if(u[g]){const{index0:M,index1:m}=u[g];Wr.fromBufferAttribute(o,M),Xr.fromBufferAttribute(o,m),d.push(Wr.x,Wr.y,Wr.z),d.push(Xr.x,Xr.y,Xr.z)}this.setAttribute("position",new Be(d,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}}class bn{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Ae("Curve: .getPoint() not implemented.")}getPointAt(e,t){const i=this.getUtoTmapping(e);return this.getPoint(i,t)}getPoints(e=5){const t=[];for(let i=0;i<=e;i++)t.push(this.getPoint(i/e));return t}getSpacedPoints(e=5){const t=[];for(let i=0;i<=e;i++)t.push(this.getPointAt(i/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let i,s=this.getPoint(0),a=0;t.push(0);for(let r=1;r<=e;r++)i=this.getPoint(r/e),a+=i.distanceTo(s),t.push(a),s=i;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){const i=this.getLengths();let s=0;const a=i.length;let r;t?r=t:r=e*i[a-1];let o=0,l=a-1,c;for(;o<=l;)if(s=Math.floor(o+(l-o)/2),c=i[s]-r,c<0)o=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,i[s]===r)return s/(a-1);const h=i[s],u=i[s+1]-h,d=(r-h)/u;return(s+d)/(a-1)}getTangent(e,t){let s=e-1e-4,a=e+1e-4;s<0&&(s=0),a>1&&(a=1);const r=this.getPoint(s),o=this.getPoint(a),l=t||(r.isVector2?new ne:new C);return l.copy(o).sub(r).normalize(),l}getTangentAt(e,t){const i=this.getUtoTmapping(e);return this.getTangent(i,t)}computeFrenetFrames(e,t=!1){const i=new C,s=[],a=[],r=[],o=new C,l=new Ye;for(let d=0;d<=e;d++){const g=d/e;s[d]=this.getTangentAt(g,new C)}a[0]=new C,r[0]=new C;let c=Number.MAX_VALUE;const h=Math.abs(s[0].x),f=Math.abs(s[0].y),u=Math.abs(s[0].z);h<=c&&(c=h,i.set(1,0,0)),f<=c&&(c=f,i.set(0,1,0)),u<=c&&i.set(0,0,1),o.crossVectors(s[0],i).normalize(),a[0].crossVectors(s[0],o),r[0].crossVectors(s[0],a[0]);for(let d=1;d<=e;d++){if(a[d]=a[d-1].clone(),r[d]=r[d-1].clone(),o.crossVectors(s[d-1],s[d]),o.length()>Number.EPSILON){o.normalize();const g=Math.acos(Ke(s[d-1].dot(s[d]),-1,1));a[d].applyMatrix4(l.makeRotationAxis(o,g))}r[d].crossVectors(s[d],a[d])}if(t===!0){let d=Math.acos(Ke(a[0].dot(a[e]),-1,1));d/=e,s[0].dot(o.crossVectors(a[0],a[e]))>0&&(d=-d);for(let g=1;g<=e;g++)a[g].applyMatrix4(l.makeRotationAxis(s[g],d*g)),r[g].crossVectors(s[g],a[g])}return{tangents:s,normals:a,binormals:r}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}class gc extends bn{constructor(e=0,t=0,i=1,s=1,a=0,r=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=i,this.yRadius=s,this.aStartAngle=a,this.aEndAngle=r,this.aClockwise=o,this.aRotation=l}getPoint(e,t=new ne){const i=t,s=Math.PI*2;let a=this.aEndAngle-this.aStartAngle;const r=Math.abs(a)<Number.EPSILON;for(;a<0;)a+=s;for(;a>s;)a-=s;a<Number.EPSILON&&(r?a=0:a=s),this.aClockwise===!0&&!r&&(a===s?a=-s:a=a-s);const o=this.aStartAngle+e*a;let l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){const h=Math.cos(this.aRotation),f=Math.sin(this.aRotation),u=l-this.aX,d=c-this.aY;l=u*h-d*f+this.aX,c=u*f+d*h+this.aY}return i.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){const e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}}class zm extends gc{constructor(e,t,i,s,a,r){super(e,t,i,i,s,a,r),this.isArcCurve=!0,this.type="ArcCurve"}}function _c(){let n=0,e=0,t=0,i=0;function s(a,r,o,l){n=a,e=o,t=-3*a+3*r-2*o-l,i=2*a-2*r+o+l}return{initCatmullRom:function(a,r,o,l,c){s(r,o,c*(o-a),c*(l-r))},initNonuniformCatmullRom:function(a,r,o,l,c,h,f){let u=(r-a)/c-(o-a)/(c+h)+(o-r)/h,d=(o-r)/h-(l-r)/(h+f)+(l-o)/f;u*=h,d*=h,s(r,o,u,d)},calc:function(a){const r=a*a,o=r*a;return n+e*a+t*r+i*o}}}const zh=new C,kh=new C,To=new _c,Ao=new _c,wo=new _c;class wf extends bn{constructor(e=[],t=!1,i="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=i,this.tension=s}getPoint(e,t=new C){const i=t,s=this.points,a=s.length,r=(a-(this.closed?0:1))*e;let o=Math.floor(r),l=r-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/a)+1)*a:l===0&&o===a-1&&(o=a-2,l=1);let c,h;this.closed||o>0?c=s[(o-1)%a]:(kh.subVectors(s[0],s[1]).add(s[0]),c=kh);const f=s[o%a],u=s[(o+1)%a];if(this.closed||o+2<a?h=s[(o+2)%a]:(zh.subVectors(s[a-1],s[a-2]).add(s[a-1]),h=zh),this.curveType==="centripetal"||this.curveType==="chordal"){const d=this.curveType==="chordal"?.5:.25;let g=Math.pow(c.distanceToSquared(f),d),M=Math.pow(f.distanceToSquared(u),d),m=Math.pow(u.distanceToSquared(h),d);M<1e-4&&(M=1),g<1e-4&&(g=M),m<1e-4&&(m=M),To.initNonuniformCatmullRom(c.x,f.x,u.x,h.x,g,M,m),Ao.initNonuniformCatmullRom(c.y,f.y,u.y,h.y,g,M,m),wo.initNonuniformCatmullRom(c.z,f.z,u.z,h.z,g,M,m)}else this.curveType==="catmullrom"&&(To.initCatmullRom(c.x,f.x,u.x,h.x,this.tension),Ao.initCatmullRom(c.y,f.y,u.y,h.y,this.tension),wo.initCatmullRom(c.z,f.z,u.z,h.z,this.tension));return i.set(To.calc(l),Ao.calc(l),wo.calc(l)),i}copy(e){super.copy(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){const s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,i=this.points.length;t<i;t++){const s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){const s=e.points[t];this.points.push(new C().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function Vh(n,e,t,i,s){const a=(i-e)*.5,r=(s-t)*.5,o=n*n,l=n*o;return(2*t-2*i+a+r)*l+(-3*t+3*i-2*a-r)*o+a*n+t}function km(n,e){const t=1-n;return t*t*e}function Vm(n,e){return 2*(1-n)*n*e}function Hm(n,e){return n*n*e}function $s(n,e,t,i){return km(n,e)+Vm(n,t)+Hm(n,i)}function Gm(n,e){const t=1-n;return t*t*t*e}function Wm(n,e){const t=1-n;return 3*t*t*n*e}function Xm(n,e){return 3*(1-n)*n*n*e}function qm(n,e){return n*n*n*e}function Ks(n,e,t,i,s){return Gm(n,e)+Wm(n,t)+Xm(n,i)+qm(n,s)}class Rf extends bn{constructor(e=new ne,t=new ne,i=new ne,s=new ne){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=i,this.v3=s}getPoint(e,t=new ne){const i=t,s=this.v0,a=this.v1,r=this.v2,o=this.v3;return i.set(Ks(e,s.x,a.x,r.x,o.x),Ks(e,s.y,a.y,r.y,o.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Ym extends bn{constructor(e=new C,t=new C,i=new C,s=new C){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=i,this.v3=s}getPoint(e,t=new C){const i=t,s=this.v0,a=this.v1,r=this.v2,o=this.v3;return i.set(Ks(e,s.x,a.x,r.x,o.x),Ks(e,s.y,a.y,r.y,o.y),Ks(e,s.z,a.z,r.z,o.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Pf extends bn{constructor(e=new ne,t=new ne){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new ne){const i=t;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new ne){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class $m extends bn{constructor(e=new C,t=new C){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new C){const i=t;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new C){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Cf extends bn{constructor(e=new ne,t=new ne,i=new ne){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=i}getPoint(e,t=new ne){const i=t,s=this.v0,a=this.v1,r=this.v2;return i.set($s(e,s.x,a.x,r.x),$s(e,s.y,a.y,r.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class If extends bn{constructor(e=new C,t=new C,i=new C){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=i}getPoint(e,t=new C){const i=t,s=this.v0,a=this.v1,r=this.v2;return i.set($s(e,s.x,a.x,r.x),$s(e,s.y,a.y,r.y),$s(e,s.z,a.z,r.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Lf extends bn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new ne){const i=t,s=this.points,a=(s.length-1)*e,r=Math.floor(a),o=a-r,l=s[r===0?r:r-1],c=s[r],h=s[r>s.length-2?s.length-1:r+1],f=s[r>s.length-3?s.length-1:r+2];return i.set(Vh(o,l.x,c.x,h.x,f.x),Vh(o,l.y,c.y,h.y,f.y)),i}copy(e){super.copy(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){const s=e.points[t];this.points.push(s.clone())}return this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,i=this.points.length;t<i;t++){const s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){const s=e.points[t];this.points.push(new ne().fromArray(s))}return this}}var ba=Object.freeze({__proto__:null,ArcCurve:zm,CatmullRomCurve3:wf,CubicBezierCurve:Rf,CubicBezierCurve3:Ym,EllipseCurve:gc,LineCurve:Pf,LineCurve3:$m,QuadraticBezierCurve:Cf,QuadraticBezierCurve3:If,SplineCurve:Lf});class Km extends bn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){const e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){const i=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new ba[i](t,e))}return this}getPoint(e,t){const i=e*this.getLength(),s=this.getCurveLengths();let a=0;for(;a<s.length;){if(s[a]>=i){const r=s[a]-i,o=this.curves[a],l=o.getLength(),c=l===0?0:1-r/l;return o.getPointAt(c,t)}a++}return null}getLength(){const e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const e=[];let t=0;for(let i=0,s=this.curves.length;i<s;i++)t+=this.curves[i].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){const t=[];for(let i=0;i<=e;i++)t.push(this.getPoint(i/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){const t=[];let i;for(let s=0,a=this.curves;s<a.length;s++){const r=a[s],o=r.isEllipseCurve?e*2:r.isLineCurve||r.isLineCurve3?1:r.isSplineCurve?e*r.points.length:e,l=r.getPoints(o);for(let c=0;c<l.length;c++){const h=l[c];i&&i.equals(h)||(t.push(h),i=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,i=e.curves.length;t<i;t++){const s=e.curves[t];this.curves.push(s.clone())}return this.autoClose=e.autoClose,this}toJSON(){const e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,i=this.curves.length;t<i;t++){const s=this.curves[t];e.curves.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,i=e.curves.length;t<i;t++){const s=e.curves[t];this.curves.push(new ba[s.type]().fromJSON(s))}return this}}class Hh extends Km{constructor(e){super(),this.type="Path",this.currentPoint=new ne,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,i=e.length;t<i;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){const i=new Pf(this.currentPoint.clone(),new ne(e,t));return this.curves.push(i),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,i,s){const a=new Cf(this.currentPoint.clone(),new ne(e,t),new ne(i,s));return this.curves.push(a),this.currentPoint.set(i,s),this}bezierCurveTo(e,t,i,s,a,r){const o=new Rf(this.currentPoint.clone(),new ne(e,t),new ne(i,s),new ne(a,r));return this.curves.push(o),this.currentPoint.set(a,r),this}splineThru(e){const t=[this.currentPoint.clone()].concat(e),i=new Lf(t);return this.curves.push(i),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,i,s,a,r){const o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(e+o,t+l,i,s,a,r),this}absarc(e,t,i,s,a,r){return this.absellipse(e,t,i,i,s,a,r),this}ellipse(e,t,i,s,a,r,o,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+c,t+h,i,s,a,r,o,l),this}absellipse(e,t,i,s,a,r,o,l){const c=new gc(e,t,i,s,a,r,o,l);if(this.curves.length>0){const f=c.getPoint(0);f.equals(this.currentPoint)||this.lineTo(f.x,f.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){const e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}}class Df extends Hh{constructor(e){super(e),this.uuid=Qt(),this.type="Shape",this.holes=[]}getPointsHoles(e){const t=[];for(let i=0,s=this.holes.length;i<s;i++)t[i]=this.holes[i].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,i=e.holes.length;t<i;t++){const s=e.holes[t];this.holes.push(s.clone())}return this}toJSON(){const e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,i=this.holes.length;t<i;t++){const s=this.holes[t];e.holes.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,i=e.holes.length;t<i;t++){const s=e.holes[t];this.holes.push(new Hh().fromJSON(s))}return this}}function Jm(n,e,t=2){const i=e&&e.length,s=i?e[0]*t:n.length;let a=Nf(n,0,s,t,!0);const r=[];if(!a||a.next===a.prev)return r;let o,l,c;if(i&&(a=t0(n,e,a,t)),n.length>80*t){o=n[0],l=n[1];let h=o,f=l;for(let u=t;u<s;u+=t){const d=n[u],g=n[u+1];d<o&&(o=d),g<l&&(l=g),d>h&&(h=d),g>f&&(f=g)}c=Math.max(h-o,f-l),c=c!==0?32767/c:0}return nr(a,r,t,o,l,c,0),r}function Nf(n,e,t,i,s){let a;if(s===f0(n,e,t,i)>0)for(let r=e;r<t;r+=i)a=Gh(r/i|0,n[r],n[r+1],a);else for(let r=t-i;r>=e;r-=i)a=Gh(r/i|0,n[r],n[r+1],a);return a&&ms(a,a.next)&&(sr(a),a=a.next),a}function Ti(n,e){if(!n)return n;e||(e=n);let t=n,i;do if(i=!1,!t.steiner&&(ms(t,t.next)||vt(t.prev,t,t.next)===0)){if(sr(t),t=e=t.prev,t===t.next)break;i=!0}else t=t.next;while(i||t!==e);return e}function nr(n,e,t,i,s,a,r){if(!n)return;!r&&a&&a0(n,i,s,a);let o=n;for(;n.prev!==n.next;){const l=n.prev,c=n.next;if(a?Qm(n,i,s,a):Zm(n)){e.push(l.i,n.i,c.i),sr(n),n=c.next,o=c.next;continue}if(n=c,n===o){r?r===1?(n=jm(Ti(n),e),nr(n,e,t,i,s,a,2)):r===2&&e0(n,e,t,i,s,a):nr(Ti(n),e,t,i,s,a,1);break}}}function Zm(n){const e=n.prev,t=n,i=n.next;if(vt(e,t,i)>=0)return!1;const s=e.x,a=t.x,r=i.x,o=e.y,l=t.y,c=i.y,h=Math.min(s,a,r),f=Math.min(o,l,c),u=Math.max(s,a,r),d=Math.max(o,l,c);let g=i.next;for(;g!==e;){if(g.x>=h&&g.x<=u&&g.y>=f&&g.y<=d&&Gs(s,o,a,l,r,c,g.x,g.y)&&vt(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function Qm(n,e,t,i){const s=n.prev,a=n,r=n.next;if(vt(s,a,r)>=0)return!1;const o=s.x,l=a.x,c=r.x,h=s.y,f=a.y,u=r.y,d=Math.min(o,l,c),g=Math.min(h,f,u),M=Math.max(o,l,c),m=Math.max(h,f,u),p=Ol(d,g,e,t,i),y=Ol(M,m,e,t,i);let b=n.prevZ,x=n.nextZ;for(;b&&b.z>=p&&x&&x.z<=y;){if(b.x>=d&&b.x<=M&&b.y>=g&&b.y<=m&&b!==s&&b!==r&&Gs(o,h,l,f,c,u,b.x,b.y)&&vt(b.prev,b,b.next)>=0||(b=b.prevZ,x.x>=d&&x.x<=M&&x.y>=g&&x.y<=m&&x!==s&&x!==r&&Gs(o,h,l,f,c,u,x.x,x.y)&&vt(x.prev,x,x.next)>=0))return!1;x=x.nextZ}for(;b&&b.z>=p;){if(b.x>=d&&b.x<=M&&b.y>=g&&b.y<=m&&b!==s&&b!==r&&Gs(o,h,l,f,c,u,b.x,b.y)&&vt(b.prev,b,b.next)>=0)return!1;b=b.prevZ}for(;x&&x.z<=y;){if(x.x>=d&&x.x<=M&&x.y>=g&&x.y<=m&&x!==s&&x!==r&&Gs(o,h,l,f,c,u,x.x,x.y)&&vt(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function jm(n,e){let t=n;do{const i=t.prev,s=t.next.next;!ms(i,s)&&Ff(i,t,t.next,s)&&ir(i,s)&&ir(s,i)&&(e.push(i.i,t.i,s.i),sr(t),sr(t.next),t=n=s),t=t.next}while(t!==n);return Ti(t)}function e0(n,e,t,i,s,a){let r=n;do{let o=r.next.next;for(;o!==r.prev;){if(r.i!==o.i&&c0(r,o)){let l=Of(r,o);r=Ti(r,r.next),l=Ti(l,l.next),nr(r,e,t,i,s,a,0),nr(l,e,t,i,s,a,0);return}o=o.next}r=r.next}while(r!==n)}function t0(n,e,t,i){const s=[];for(let a=0,r=e.length;a<r;a++){const o=e[a]*i,l=a<r-1?e[a+1]*i:n.length,c=Nf(n,o,l,i,!1);c===c.next&&(c.steiner=!0),s.push(l0(c))}s.sort(n0);for(let a=0;a<s.length;a++)t=i0(s[a],t);return t}function n0(n,e){let t=n.x-e.x;if(t===0&&(t=n.y-e.y,t===0)){const i=(n.next.y-n.y)/(n.next.x-n.x),s=(e.next.y-e.y)/(e.next.x-e.x);t=i-s}return t}function i0(n,e){const t=s0(n,e);if(!t)return e;const i=Of(t,n);return Ti(i,i.next),Ti(t,t.next)}function s0(n,e){let t=e;const i=n.x,s=n.y;let a=-1/0,r;if(ms(n,t))return t;do{if(ms(n,t.next))return t.next;if(s<=t.y&&s>=t.next.y&&t.next.y!==t.y){const f=t.x+(s-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(f<=i&&f>a&&(a=f,r=t.x<t.next.x?t:t.next,f===i))return r}t=t.next}while(t!==e);if(!r)return null;const o=r,l=r.x,c=r.y;let h=1/0;t=r;do{if(i>=t.x&&t.x>=l&&i!==t.x&&Uf(s<c?i:a,s,l,c,s<c?a:i,s,t.x,t.y)){const f=Math.abs(s-t.y)/(i-t.x);ir(t,n)&&(f<h||f===h&&(t.x>r.x||t.x===r.x&&r0(r,t)))&&(r=t,h=f)}t=t.next}while(t!==o);return r}function r0(n,e){return vt(n.prev,n,e.prev)<0&&vt(e.next,n,n.next)<0}function a0(n,e,t,i){let s=n;do s.z===0&&(s.z=Ol(s.x,s.y,e,t,i)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==n);s.prevZ.nextZ=null,s.prevZ=null,o0(s)}function o0(n){let e,t=1;do{let i=n,s;n=null;let a=null;for(e=0;i;){e++;let r=i,o=0;for(let c=0;c<t&&(o++,r=r.nextZ,!!r);c++);let l=t;for(;o>0||l>0&&r;)o!==0&&(l===0||!r||i.z<=r.z)?(s=i,i=i.nextZ,o--):(s=r,r=r.nextZ,l--),a?a.nextZ=s:n=s,s.prevZ=a,a=s;i=r}a.nextZ=null,t*=2}while(e>1);return n}function Ol(n,e,t,i,s){return n=(n-t)*s|0,e=(e-i)*s|0,n=(n|n<<8)&16711935,n=(n|n<<4)&252645135,n=(n|n<<2)&858993459,n=(n|n<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,n|e<<1}function l0(n){let e=n,t=n;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==n);return t}function Uf(n,e,t,i,s,a,r,o){return(s-r)*(e-o)>=(n-r)*(a-o)&&(n-r)*(i-o)>=(t-r)*(e-o)&&(t-r)*(a-o)>=(s-r)*(i-o)}function Gs(n,e,t,i,s,a,r,o){return!(n===r&&e===o)&&Uf(n,e,t,i,s,a,r,o)}function c0(n,e){return n.next.i!==e.i&&n.prev.i!==e.i&&!h0(n,e)&&(ir(n,e)&&ir(e,n)&&u0(n,e)&&(vt(n.prev,n,e.prev)||vt(n,e.prev,e))||ms(n,e)&&vt(n.prev,n,n.next)>0&&vt(e.prev,e,e.next)>0)}function vt(n,e,t){return(e.y-n.y)*(t.x-e.x)-(e.x-n.x)*(t.y-e.y)}function ms(n,e){return n.x===e.x&&n.y===e.y}function Ff(n,e,t,i){const s=$r(vt(n,e,t)),a=$r(vt(n,e,i)),r=$r(vt(t,i,n)),o=$r(vt(t,i,e));return!!(s!==a&&r!==o||s===0&&Yr(n,t,e)||a===0&&Yr(n,i,e)||r===0&&Yr(t,n,i)||o===0&&Yr(t,e,i))}function Yr(n,e,t){return e.x<=Math.max(n.x,t.x)&&e.x>=Math.min(n.x,t.x)&&e.y<=Math.max(n.y,t.y)&&e.y>=Math.min(n.y,t.y)}function $r(n){return n>0?1:n<0?-1:0}function h0(n,e){let t=n;do{if(t.i!==n.i&&t.next.i!==n.i&&t.i!==e.i&&t.next.i!==e.i&&Ff(t,t.next,n,e))return!0;t=t.next}while(t!==n);return!1}function ir(n,e){return vt(n.prev,n,n.next)<0?vt(n,e,n.next)>=0&&vt(n,n.prev,e)>=0:vt(n,e,n.prev)<0||vt(n,n.next,e)<0}function u0(n,e){let t=n,i=!1;const s=(n.x+e.x)/2,a=(n.y+e.y)/2;do t.y>a!=t.next.y>a&&t.next.y!==t.y&&s<(t.next.x-t.x)*(a-t.y)/(t.next.y-t.y)+t.x&&(i=!i),t=t.next;while(t!==n);return i}function Of(n,e){const t=Bl(n.i,n.x,n.y),i=Bl(e.i,e.x,e.y),s=n.next,a=e.prev;return n.next=e,e.prev=n,t.next=s,s.prev=t,i.next=t,t.prev=i,a.next=i,i.prev=a,i}function Gh(n,e,t,i){const s=Bl(n,e,t);return i?(s.next=i.next,s.prev=i,i.next.prev=s,i.next=s):(s.prev=s,s.next=s),s}function sr(n){n.next.prev=n.prev,n.prev.next=n.next,n.prevZ&&(n.prevZ.nextZ=n.nextZ),n.nextZ&&(n.nextZ.prevZ=n.prevZ)}function Bl(n,e,t){return{i:n,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function f0(n,e,t,i){let s=0;for(let a=e,r=t-i;a<t;a+=i)s+=(n[r]-n[a])*(n[a+1]+n[r+1]),r=a;return s}class d0{static triangulate(e,t,i=2){return Jm(e,t,i)}}class Nn{static area(e){const t=e.length;let i=0;for(let s=t-1,a=0;a<t;s=a++)i+=e[s].x*e[a].y-e[a].x*e[s].y;return i*.5}static isClockWise(e){return Nn.area(e)<0}static triangulateShape(e,t){const i=[],s=[],a=[];Wh(e),Xh(i,e);let r=e.length;t.forEach(Wh);for(let l=0;l<t.length;l++)s.push(r),r+=t[l].length,Xh(i,t[l]);const o=d0.triangulate(i,s);for(let l=0;l<o.length;l+=3)a.push(o.slice(l,l+3));return a}}function Wh(n){const e=n.length;e>2&&n[e-1].equals(n[0])&&n.pop()}function Xh(n,e){for(let t=0;t<e.length;t++)n.push(e[t].x),n.push(e[t].y)}class Bf extends gt{constructor(e=new Df([new ne(.5,.5),new ne(-.5,.5),new ne(-.5,-.5),new ne(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];const i=this,s=[],a=[];for(let o=0,l=e.length;o<l;o++){const c=e[o];r(c)}this.setAttribute("position",new Be(s,3)),this.setAttribute("uv",new Be(a,2)),this.computeVertexNormals();function r(o){const l=[],c=t.curveSegments!==void 0?t.curveSegments:12,h=t.steps!==void 0?t.steps:1,f=t.depth!==void 0?t.depth:1;let u=t.bevelEnabled!==void 0?t.bevelEnabled:!0,d=t.bevelThickness!==void 0?t.bevelThickness:.2,g=t.bevelSize!==void 0?t.bevelSize:d-.1,M=t.bevelOffset!==void 0?t.bevelOffset:0,m=t.bevelSegments!==void 0?t.bevelSegments:3;const p=t.extrudePath,y=t.UVGenerator!==void 0?t.UVGenerator:p0;let b,x=!1,A,E,R,_;if(p){b=p.getSpacedPoints(h),x=!0,u=!1;const Q=p.isCatmullRomCurve3?p.closed:!1;A=p.computeFrenetFrames(h,Q),E=new C,R=new C,_=new C}u||(m=0,d=0,g=0,M=0);const T=o.extractPoints(c);let P=T.shape;const I=T.holes;if(!Nn.isClockWise(P)){P=P.reverse();for(let Q=0,te=I.length;Q<te;Q++){const ee=I[Q];Nn.isClockWise(ee)&&(I[Q]=ee.reverse())}}function B(Q){const ee=10000000000000001e-36;let _e=Q[0];for(let pe=1;pe<=Q.length;pe++){const Ue=pe%Q.length,Re=Q[Ue],ke=Re.x-_e.x,Ge=Re.y-_e.y,L=ke*ke+Ge*Ge,rt=Math.max(Math.abs(Re.x),Math.abs(Re.y),Math.abs(_e.x),Math.abs(_e.y)),Qe=ee*rt*rt;if(L<=Qe){Q.splice(Ue,1),pe--;continue}_e=Re}}B(P),I.forEach(B);const X=I.length,F=P;for(let Q=0;Q<X;Q++){const te=I[Q];P=P.concat(te)}function W(Q,te,ee){return te||Fe("ExtrudeGeometry: vec does not exist"),Q.clone().addScaledVector(te,ee)}const H=P.length;function Z(Q,te,ee){let _e,pe,Ue;const Re=Q.x-te.x,ke=Q.y-te.y,Ge=ee.x-Q.x,L=ee.y-Q.y,rt=Re*Re+ke*ke,Qe=Re*L-ke*Ge;if(Math.abs(Qe)>Number.EPSILON){const w=Math.sqrt(rt),v=Math.sqrt(Ge*Ge+L*L),O=te.x-ke/w,V=te.y+Re/w,q=ee.x-L/v,re=ee.y+Ge/v,ae=((q-O)*L-(re-V)*Ge)/(Re*L-ke*Ge);_e=O+Re*ae-Q.x,pe=V+ke*ae-Q.y;const Y=_e*_e+pe*pe;if(Y<=2)return new ne(_e,pe);Ue=Math.sqrt(Y/2)}else{let w=!1;Re>Number.EPSILON?Ge>Number.EPSILON&&(w=!0):Re<-Number.EPSILON?Ge<-Number.EPSILON&&(w=!0):Math.sign(ke)===Math.sign(L)&&(w=!0),w?(_e=-ke,pe=Re,Ue=Math.sqrt(rt)):(_e=Re,pe=ke,Ue=Math.sqrt(rt/2))}return new ne(_e/Ue,pe/Ue)}const ie=[];for(let Q=0,te=F.length,ee=te-1,_e=Q+1;Q<te;Q++,ee++,_e++)ee===te&&(ee=0),_e===te&&(_e=0),ie[Q]=Z(F[Q],F[ee],F[_e]);const he=[];let oe,ye=ie.concat();for(let Q=0,te=X;Q<te;Q++){const ee=I[Q];oe=[];for(let _e=0,pe=ee.length,Ue=pe-1,Re=_e+1;_e<pe;_e++,Ue++,Re++)Ue===pe&&(Ue=0),Re===pe&&(Re=0),oe[_e]=Z(ee[_e],ee[Ue],ee[Re]);he.push(oe),ye=ye.concat(oe)}let Je;if(m===0)Je=Nn.triangulateShape(F,I);else{const Q=[],te=[];for(let ee=0;ee<m;ee++){const _e=ee/m,pe=d*Math.cos(_e*Math.PI/2),Ue=g*Math.sin(_e*Math.PI/2)+M;for(let Re=0,ke=F.length;Re<ke;Re++){const Ge=W(F[Re],ie[Re],Ue);Ie(Ge.x,Ge.y,-pe),_e===0&&Q.push(Ge)}for(let Re=0,ke=X;Re<ke;Re++){const Ge=I[Re];oe=he[Re];const L=[];for(let rt=0,Qe=Ge.length;rt<Qe;rt++){const w=W(Ge[rt],oe[rt],Ue);Ie(w.x,w.y,-pe),_e===0&&L.push(w)}_e===0&&te.push(L)}}Je=Nn.triangulateShape(Q,te)}const ht=Je.length,et=g+M;for(let Q=0;Q<H;Q++){const te=u?W(P[Q],ye[Q],et):P[Q];x?(R.copy(A.normals[0]).multiplyScalar(te.x),E.copy(A.binormals[0]).multiplyScalar(te.y),_.copy(b[0]).add(R).add(E),Ie(_.x,_.y,_.z)):Ie(te.x,te.y,0)}for(let Q=1;Q<=h;Q++)for(let te=0;te<H;te++){const ee=u?W(P[te],ye[te],et):P[te];x?(R.copy(A.normals[Q]).multiplyScalar(ee.x),E.copy(A.binormals[Q]).multiplyScalar(ee.y),_.copy(b[Q]).add(R).add(E),Ie(_.x,_.y,_.z)):Ie(ee.x,ee.y,f/h*Q)}for(let Q=m-1;Q>=0;Q--){const te=Q/m,ee=d*Math.cos(te*Math.PI/2),_e=g*Math.sin(te*Math.PI/2)+M;for(let pe=0,Ue=F.length;pe<Ue;pe++){const Re=W(F[pe],ie[pe],_e);Ie(Re.x,Re.y,f+ee)}for(let pe=0,Ue=I.length;pe<Ue;pe++){const Re=I[pe];oe=he[pe];for(let ke=0,Ge=Re.length;ke<Ge;ke++){const L=W(Re[ke],oe[ke],_e);x?Ie(L.x,L.y+b[h-1].y,b[h-1].x+ee):Ie(L.x,L.y,f+ee)}}}K(),le();function K(){const Q=s.length/3;if(u){let te=0,ee=H*te;for(let _e=0;_e<ht;_e++){const pe=Je[_e];ze(pe[2]+ee,pe[1]+ee,pe[0]+ee)}te=h+m*2,ee=H*te;for(let _e=0;_e<ht;_e++){const pe=Je[_e];ze(pe[0]+ee,pe[1]+ee,pe[2]+ee)}}else{for(let te=0;te<ht;te++){const ee=Je[te];ze(ee[2],ee[1],ee[0])}for(let te=0;te<ht;te++){const ee=Je[te];ze(ee[0]+H*h,ee[1]+H*h,ee[2]+H*h)}}i.addGroup(Q,s.length/3-Q,0)}function le(){const Q=s.length/3;let te=0;se(F,te),te+=F.length;for(let ee=0,_e=I.length;ee<_e;ee++){const pe=I[ee];se(pe,te),te+=pe.length}i.addGroup(Q,s.length/3-Q,1)}function se(Q,te){let ee=Q.length;for(;--ee>=0;){const _e=ee;let pe=ee-1;pe<0&&(pe=Q.length-1);for(let Ue=0,Re=h+m*2;Ue<Re;Ue++){const ke=H*Ue,Ge=H*(Ue+1),L=te+_e+ke,rt=te+pe+ke,Qe=te+pe+Ge,w=te+_e+Ge;Ne(L,rt,Qe,w)}}}function Ie(Q,te,ee){l.push(Q),l.push(te),l.push(ee)}function ze(Q,te,ee){nt(Q),nt(te),nt(ee);const _e=s.length/3,pe=y.generateTopUV(i,s,_e-3,_e-2,_e-1);Ve(pe[0]),Ve(pe[1]),Ve(pe[2])}function Ne(Q,te,ee,_e){nt(Q),nt(te),nt(_e),nt(te),nt(ee),nt(_e);const pe=s.length/3,Ue=y.generateSideWallUV(i,s,pe-6,pe-3,pe-2,pe-1);Ve(Ue[0]),Ve(Ue[1]),Ve(Ue[3]),Ve(Ue[1]),Ve(Ue[2]),Ve(Ue[3])}function nt(Q){s.push(l[Q*3+0]),s.push(l[Q*3+1]),s.push(l[Q*3+2])}function Ve(Q){a.push(Q.x),a.push(Q.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON(),t=this.parameters.shapes,i=this.parameters.options;return m0(t,i,e)}static fromJSON(e,t){const i=[];for(let a=0,r=e.shapes.length;a<r;a++){const o=t[e.shapes[a]];i.push(o)}const s=e.options.extrudePath;return s!==void 0&&(e.options.extrudePath=new ba[s.type]().fromJSON(s)),new Bf(i,e.options)}}const p0={generateTopUV:function(n,e,t,i,s){const a=e[t*3],r=e[t*3+1],o=e[i*3],l=e[i*3+1],c=e[s*3],h=e[s*3+1];return[new ne(a,r),new ne(o,l),new ne(c,h)]},generateSideWallUV:function(n,e,t,i,s,a){const r=e[t*3],o=e[t*3+1],l=e[t*3+2],c=e[i*3],h=e[i*3+1],f=e[i*3+2],u=e[s*3],d=e[s*3+1],g=e[s*3+2],M=e[a*3],m=e[a*3+1],p=e[a*3+2];return Math.abs(o-h)<Math.abs(r-c)?[new ne(r,1-l),new ne(c,1-f),new ne(u,1-g),new ne(M,1-p)]:[new ne(o,1-l),new ne(h,1-f),new ne(d,1-g),new ne(m,1-p)]}};function m0(n,e,t){if(t.shapes=[],Array.isArray(n))for(let i=0,s=n.length;i<s;i++){const a=n[i];t.shapes.push(a.uuid)}else t.shapes.push(n.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}class zf extends Ss{constructor(e=1,t=0){const i=(1+Math.sqrt(5))/2,s=[-1,i,0,1,i,0,-1,-i,0,1,-i,0,0,-1,i,0,1,i,0,-1,-i,0,1,-i,i,0,-1,i,0,1,-i,0,-1,-i,0,1],a=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(s,a,e,t),this.type="IcosahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new zf(e.radius,e.detail)}}class kf extends gt{constructor(e=[new ne(0,-.5),new ne(.5,0),new ne(0,.5)],t=12,i=0,s=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:i,phiLength:s},t=Math.floor(t),s=Ke(s,0,Math.PI*2);const a=[],r=[],o=[],l=[],c=[],h=1/t,f=new C,u=new ne,d=new C,g=new C,M=new C;let m=0,p=0;for(let y=0;y<=e.length-1;y++)switch(y){case 0:m=e[y+1].x-e[y].x,p=e[y+1].y-e[y].y,d.x=p*1,d.y=-m,d.z=p*0,M.copy(d),d.normalize(),l.push(d.x,d.y,d.z);break;case e.length-1:l.push(M.x,M.y,M.z);break;default:m=e[y+1].x-e[y].x,p=e[y+1].y-e[y].y,d.x=p*1,d.y=-m,d.z=p*0,g.copy(d),d.x+=M.x,d.y+=M.y,d.z+=M.z,d.normalize(),l.push(d.x,d.y,d.z),M.copy(g)}for(let y=0;y<=t;y++){const b=i+y*h*s,x=Math.sin(b),A=Math.cos(b);for(let E=0;E<=e.length-1;E++){f.x=e[E].x*x,f.y=e[E].y,f.z=e[E].x*A,r.push(f.x,f.y,f.z),u.x=y/t,u.y=E/(e.length-1),o.push(u.x,u.y);const R=l[3*E+0]*x,_=l[3*E+1],T=l[3*E+0]*A;c.push(R,_,T)}}for(let y=0;y<t;y++)for(let b=0;b<e.length-1;b++){const x=b+y*e.length,A=x,E=x+e.length,R=x+e.length+1,_=x+1;a.push(A,E,_),a.push(R,_,E)}this.setIndex(a),this.setAttribute("position",new Be(r,3)),this.setAttribute("uv",new Be(o,2)),this.setAttribute("normal",new Be(c,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new kf(e.points,e.segments,e.phiStart,e.phiLength)}}class Vf extends Ss{constructor(e=1,t=0){const i=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],s=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(i,s,e,t),this.type="OctahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Vf(e.radius,e.detail)}}class bs extends gt{constructor(e=1,t=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:s};const a=e/2,r=t/2,o=Math.floor(i),l=Math.floor(s),c=o+1,h=l+1,f=e/o,u=t/l,d=[],g=[],M=[],m=[];for(let p=0;p<h;p++){const y=p*u-r;for(let b=0;b<c;b++){const x=b*f-a;g.push(x,-y,0),M.push(0,0,1),m.push(b/o),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let y=0;y<o;y++){const b=y+c*p,x=y+c*(p+1),A=y+1+c*(p+1),E=y+1+c*p;d.push(b,x,E),d.push(x,A,E)}this.setIndex(d),this.setAttribute("position",new Be(g,3)),this.setAttribute("normal",new Be(M,3)),this.setAttribute("uv",new Be(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new bs(e.width,e.height,e.widthSegments,e.heightSegments)}}class Hf extends gt{constructor(e=.5,t=1,i=32,s=1,a=0,r=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:i,phiSegments:s,thetaStart:a,thetaLength:r},i=Math.max(3,i),s=Math.max(1,s);const o=[],l=[],c=[],h=[];let f=e;const u=(t-e)/s,d=new C,g=new ne;for(let M=0;M<=s;M++){for(let m=0;m<=i;m++){const p=a+m/i*r;d.x=f*Math.cos(p),d.y=f*Math.sin(p),l.push(d.x,d.y,d.z),c.push(0,0,1),g.x=(d.x/t+1)/2,g.y=(d.y/t+1)/2,h.push(g.x,g.y)}f+=u}for(let M=0;M<s;M++){const m=M*(i+1);for(let p=0;p<i;p++){const y=p+m,b=y,x=y+i+1,A=y+i+2,E=y+1;o.push(b,x,E),o.push(x,A,E)}}this.setIndex(o),this.setAttribute("position",new Be(l,3)),this.setAttribute("normal",new Be(c,3)),this.setAttribute("uv",new Be(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Hf(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}}class Gf extends gt{constructor(e=new Df([new ne(0,.5),new ne(-.5,-.5),new ne(.5,-.5)]),t=12){super(),this.type="ShapeGeometry",this.parameters={shapes:e,curveSegments:t};const i=[],s=[],a=[],r=[];let o=0,l=0;if(Array.isArray(e)===!1)c(e);else for(let h=0;h<e.length;h++)c(e[h]),this.addGroup(o,l,h),o+=l,l=0;this.setIndex(i),this.setAttribute("position",new Be(s,3)),this.setAttribute("normal",new Be(a,3)),this.setAttribute("uv",new Be(r,2));function c(h){const f=s.length/3,u=h.extractPoints(t);let d=u.shape;const g=u.holes;Nn.isClockWise(d)===!1&&(d=d.reverse());for(let m=0,p=g.length;m<p;m++){const y=g[m];Nn.isClockWise(y)===!0&&(g[m]=y.reverse())}const M=Nn.triangulateShape(d,g);for(let m=0,p=g.length;m<p;m++){const y=g[m];d=d.concat(y)}for(let m=0,p=d.length;m<p;m++){const y=d[m];s.push(y.x,y.y,0),a.push(0,0,1),r.push(y.x,y.y)}for(let m=0,p=M.length;m<p;m++){const y=M[m],b=y[0]+f,x=y[1]+f,A=y[2]+f;i.push(b,x,A),l+=3}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON(),t=this.parameters.shapes;return g0(t,e)}static fromJSON(e,t){const i=[];for(let s=0,a=e.shapes.length;s<a;s++){const r=t[e.shapes[s]];i.push(r)}return new Gf(i,e.curveSegments)}}function g0(n,e){if(e.shapes=[],Array.isArray(n))for(let t=0,i=n.length;t<i;t++){const s=n[t];e.shapes.push(s.uuid)}else e.shapes.push(n.uuid);return e}class Ai extends gt{constructor(e=1,t=32,i=16,s=0,a=Math.PI*2,r=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:i,phiStart:s,phiLength:a,thetaStart:r,thetaLength:o},t=Math.max(3,Math.floor(t)),i=Math.max(2,Math.floor(i));const l=Math.min(r+o,Math.PI);let c=0;const h=[],f=new C,u=new C,d=[],g=[],M=[],m=[];for(let p=0;p<=i;p++){const y=[],b=p/i,x=r+b*o,A=e*Math.cos(x),E=Math.sqrt(e*e-A*A);let R=0;p===0&&r===0?R=.5/t:p===i&&l===Math.PI&&(R=-.5/t);for(let _=0;_<=t;_++){const T=_/t,P=s+T*a;f.x=-E*Math.cos(P),f.y=A,f.z=E*Math.sin(P),g.push(f.x,f.y,f.z),u.copy(f).normalize(),M.push(u.x,u.y,u.z),m.push(T+R,1-b),y.push(c++)}h.push(y)}for(let p=0;p<i;p++)for(let y=0;y<t;y++){const b=h[p][y+1],x=h[p][y],A=h[p+1][y],E=h[p+1][y+1];(p!==0||r>0)&&d.push(b,x,E),(p!==i-1||l<Math.PI)&&d.push(x,A,E)}this.setIndex(d),this.setAttribute("position",new Be(g,3)),this.setAttribute("normal",new Be(M,3)),this.setAttribute("uv",new Be(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ai(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Wf extends Ss{constructor(e=1,t=0){const i=[1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],s=[2,1,0,0,3,2,1,3,0,2,3,1];super(i,s,e,t),this.type="TetrahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Wf(e.radius,e.detail)}}class Xf extends gt{constructor(e=1,t=.4,i=12,s=48,a=Math.PI*2,r=0,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:i,tubularSegments:s,arc:a,thetaStart:r,thetaLength:o},i=Math.floor(i),s=Math.floor(s);const l=[],c=[],h=[],f=[],u=new C,d=new C,g=new C;for(let M=0;M<=i;M++){const m=r+M/i*o;for(let p=0;p<=s;p++){const y=p/s*a;d.x=(e+t*Math.cos(m))*Math.cos(y),d.y=(e+t*Math.cos(m))*Math.sin(y),d.z=t*Math.sin(m),c.push(d.x,d.y,d.z),u.x=e*Math.cos(y),u.y=e*Math.sin(y),g.subVectors(d,u).normalize(),h.push(g.x,g.y,g.z),f.push(p/s),f.push(M/i)}}for(let M=1;M<=i;M++)for(let m=1;m<=s;m++){const p=(s+1)*M+m-1,y=(s+1)*(M-1)+m-1,b=(s+1)*(M-1)+m,x=(s+1)*M+m;l.push(p,y,x),l.push(y,b,x)}this.setIndex(l),this.setAttribute("position",new Be(c,3)),this.setAttribute("normal",new Be(h,3)),this.setAttribute("uv",new Be(f,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Xf(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class vc extends gt{constructor(e=new If(new C(-1,-1,0),new C(-1,1,0),new C(1,1,0)),t=64,i=1,s=8,a=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:t,radius:i,radialSegments:s,closed:a};const r=e.computeFrenetFrames(t,a);this.tangents=r.tangents,this.normals=r.normals,this.binormals=r.binormals;const o=new C,l=new C,c=new ne;let h=new C;const f=[],u=[],d=[],g=[];M(),this.setIndex(g),this.setAttribute("position",new Be(f,3)),this.setAttribute("normal",new Be(u,3)),this.setAttribute("uv",new Be(d,2));function M(){for(let b=0;b<t;b++)m(b);m(a===!1?t:0),y(),p()}function m(b){h=e.getPointAt(b/t,h);const x=r.normals[b],A=r.binormals[b];for(let E=0;E<=s;E++){const R=E/s*Math.PI*2,_=Math.sin(R),T=-Math.cos(R);l.x=T*x.x+_*A.x,l.y=T*x.y+_*A.y,l.z=T*x.z+_*A.z,l.normalize(),u.push(l.x,l.y,l.z),o.x=h.x+i*l.x,o.y=h.y+i*l.y,o.z=h.z+i*l.z,f.push(o.x,o.y,o.z)}}function p(){for(let b=1;b<=t;b++)for(let x=1;x<=s;x++){const A=(s+1)*(b-1)+(x-1),E=(s+1)*b+(x-1),R=(s+1)*b+x,_=(s+1)*(b-1)+x;g.push(A,E,_),g.push(E,R,_)}}function y(){for(let b=0;b<=t;b++)for(let x=0;x<=s;x++)c.x=b/t,c.y=x/s,d.push(c.x,c.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new vc(new ba[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}}function gs(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const s=n[t][i];if(qh(s))s.isRenderTargetTexture?(Ae("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=s.clone();else if(Array.isArray(s))if(qh(s[0])){const a=[];for(let r=0,o=s.length;r<o;r++)a[r]=s[r].clone();e[t][i]=a}else e[t][i]=s.slice();else e[t][i]=s}}return e}function Ot(n){const e={};for(let t=0;t<n.length;t++){const i=gs(n[t]);for(const s in i)e[s]=i[s]}return e}function qh(n){return n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)}function _0(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function qf(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:je.workingColorSpace}const v0={clone:gs,merge:Ot};var x0=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,M0=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Sn extends oi{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=x0,this.fragmentShader=M0,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=gs(e.uniforms),this.uniformsGroups=_0(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const s in this.uniforms){const r=this.uniforms[s].value;r&&r.isTexture?t.uniforms[s]={type:"t",value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[s]={type:"c",value:r.getHex()}:r&&r.isVector2?t.uniforms[s]={type:"v2",value:r.toArray()}:r&&r.isVector3?t.uniforms[s]={type:"v3",value:r.toArray()}:r&&r.isVector4?t.uniforms[s]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?t.uniforms[s]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?t.uniforms[s]={type:"m4",value:r.toArray()}:t.uniforms[s]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const i in e.uniforms){const s=e.uniforms[i];switch(this.uniforms[i]={},s.type){case"t":this.uniforms[i].value=t[s.value]||null;break;case"c":this.uniforms[i].value=new He().setHex(s.value);break;case"v2":this.uniforms[i].value=new ne().fromArray(s.value);break;case"v3":this.uniforms[i].value=new C().fromArray(s.value);break;case"v4":this.uniforms[i].value=new lt().fromArray(s.value);break;case"m3":this.uniforms[i].value=new We().fromArray(s.value);break;case"m4":this.uniforms[i].value=new Ye().fromArray(s.value);break;default:this.uniforms[i].value=s.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const i in e.extensions)this.extensions[i]=e.extensions[i];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class y0 extends Sn{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Ba extends oi{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new He(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new He(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Dl,this.normalScale=new ne(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new kn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class hb extends Ba{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new ne(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Ke(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new He(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new He(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new He(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class S0 extends oi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Np,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class b0 extends oi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}function Kr(n,e){return!n||n.constructor===e?n:typeof e.BYTES_PER_ELEMENT=="number"?new e(n):Array.prototype.slice.call(n)}function E0(n){function e(s,a){return n[s]-n[a]}const t=n.length,i=new Array(t);for(let s=0;s!==t;++s)i[s]=s;return i.sort(e),i}function Yh(n,e,t){const i=n.length,s=new n.constructor(i);for(let a=0,r=0;r!==i;++a){const o=t[a]*e;for(let l=0;l!==e;++l)s[r++]=n[o+l]}return s}function T0(n,e,t,i){let s=1,a=n[0];for(;a!==void 0&&a[i]===void 0;)a=n[s++];if(a===void 0)return;let r=a[i];if(r!==void 0)if(Array.isArray(r))do r=a[i],r!==void 0&&(e.push(a.time),t.push(...r)),a=n[s++];while(a!==void 0);else if(r.toArray!==void 0)do r=a[i],r!==void 0&&(e.push(a.time),r.toArray(t,t.length)),a=n[s++];while(a!==void 0);else do r=a[i],r!==void 0&&(e.push(a.time),t.push(r)),a=n[s++];while(a!==void 0)}class cr{constructor(e,t,i,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(i),this.sampleValues=t,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let i=this._cachedIndex,s=t[i],a=t[i-1];n:{e:{let r;t:{i:if(!(e<s)){for(let o=i+2;;){if(s===void 0){if(e<a)break i;return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===o)break;if(a=s,s=t[++i],e<s)break e}r=t.length;break t}if(!(e>=a)){const o=t[1];e<o&&(i=2,a=o);for(let l=i-2;;){if(a===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===l)break;if(s=a,a=t[--i-1],e>=a)break e}r=i,i=0;break t}break n}for(;i<r;){const o=i+r>>>1;e<t[o]?r=o:i=o+1}if(s=t[i],a=t[i-1],a===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,a,s)}return this.interpolate_(i,a,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,i=this.sampleValues,s=this.valueSize,a=e*s;for(let r=0;r!==s;++r)t[r]=i[a+r];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}}class A0 extends cr{constructor(e,t,i,s){super(e,t,i,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:nh,endingEnd:nh}}intervalChanged_(e,t,i){const s=this.parameterPositions;let a=e-2,r=e+1,o=s[a],l=s[r];if(o===void 0)switch(this.getSettings_().endingStart){case ih:a=e,o=2*t-i;break;case sh:a=s.length-2,o=t+s[a]-s[a+1];break;default:a=e,o=i}if(l===void 0)switch(this.getSettings_().endingEnd){case ih:r=e,l=2*i-t;break;case sh:r=1,l=i+s[1]-s[0];break;default:r=e-1,l=t}const c=(i-t)*.5,h=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-i),this._offsetPrev=a*h,this._offsetNext=r*h}interpolate_(e,t,i,s){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=this._offsetPrev,f=this._offsetNext,u=this._weightPrev,d=this._weightNext,g=(i-t)/(s-t),M=g*g,m=M*g,p=-u*m+2*u*M-u*g,y=(1+u)*m+(-1.5-2*u)*M+(-.5+u)*g+1,b=(-1-d)*m+(1.5+d)*M+.5*g,x=d*m-d*M;for(let A=0;A!==o;++A)a[A]=p*r[h+A]+y*r[c+A]+b*r[l+A]+x*r[f+A];return a}}class w0 extends cr{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e,t,i,s){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=(i-t)/(s-t),f=1-h;for(let u=0;u!==o;++u)a[u]=r[c+u]*f+r[l+u]*h;return a}}class R0 extends cr{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e){return this.copySampleValue_(e-1)}}class P0 extends cr{interpolate_(e,t,i,s){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=this.inTangents,f=this.outTangents;if(!h||!f){const g=(i-t)/(s-t),M=1-g;for(let m=0;m!==o;++m)a[m]=r[c+m]*M+r[l+m]*g;return a}const u=o*2,d=e-1;for(let g=0;g!==o;++g){const M=r[c+g],m=r[l+g],p=d*u+g*2,y=f[p],b=f[p+1],x=e*u+g*2,A=h[x],E=h[x+1];let R=(i-t)/(s-t),_,T,P,I,N;for(let B=0;B<8;B++){_=R*R,T=_*R,P=1-R,I=P*P,N=I*P;const F=N*t+3*I*R*y+3*P*_*A+T*s-i;if(Math.abs(F)<1e-10)break;const W=3*I*(y-t)+6*P*R*(A-y)+3*_*(s-A);if(Math.abs(W)<1e-10)break;R=R-F/W,R=Math.max(0,Math.min(1,R))}a[g]=N*M+3*I*R*b+3*P*_*E+T*m}return a}}class an{constructor(e,t,i,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Kr(t,this.TimeBufferType),this.values=Kr(i,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let i;if(t.toJSON!==this.toJSON)i=t.toJSON(e);else{i={name:e.name,times:Kr(e.times,Array),values:Kr(e.values,Array)};const s=e.getInterpolation();s!==e.DefaultInterpolation&&(i.interpolation=s)}return i.type=e.ValueTypeName,i}InterpolantFactoryMethodDiscrete(e){return new R0(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new w0(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new A0(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){const t=new P0(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case ga:t=this.InterpolantFactoryMethodDiscrete;break;case Ll:t=this.InterpolantFactoryMethodLinear;break;case Ja:t=this.InterpolantFactoryMethodSmooth;break;case th:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){const i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return Ae("KeyframeTrack:",i),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return ga;case this.InterpolantFactoryMethodLinear:return Ll;case this.InterpolantFactoryMethodSmooth:return Ja;case this.InterpolantFactoryMethodBezier:return th}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let i=0,s=t.length;i!==s;++i)t[i]+=e}return this}scale(e){if(e!==1){const t=this.times;for(let i=0,s=t.length;i!==s;++i)t[i]*=e}return this}trim(e,t){const i=this.times,s=i.length;let a=0,r=s-1;for(;a!==s&&i[a]<e;)++a;for(;r!==-1&&i[r]>t;)--r;if(++r,a!==0||r!==s){a>=r&&(r=Math.max(r,1),a=r-1);const o=this.getValueSize();this.times=i.slice(a,r),this.values=this.values.slice(a*o,r*o)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(Fe("KeyframeTrack: Invalid value size in track.",this),e=!1);const i=this.times,s=this.values,a=i.length;a===0&&(Fe("KeyframeTrack: Track is empty.",this),e=!1);let r=null;for(let o=0;o!==a;o++){const l=i[o];if(typeof l=="number"&&isNaN(l)){Fe("KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(r!==null&&r>l){Fe("KeyframeTrack: Out of order keys.",this,o,l,r),e=!1;break}r=l}if(s!==void 0&&Gp(s))for(let o=0,l=s.length;o!==l;++o){const c=s[o];if(isNaN(c)){Fe("KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),i=this.getValueSize(),s=this.getInterpolation()===Ja,a=e.length-1;let r=1;for(let o=1;o<a;++o){let l=!1;const c=e[o],h=e[o+1];if(c!==h&&(o!==1||c!==e[0]))if(s)l=!0;else{const f=o*i,u=f-i,d=f+i;for(let g=0;g!==i;++g){const M=t[f+g];if(M!==t[u+g]||M!==t[d+g]){l=!0;break}}}if(l){if(o!==r){e[r]=e[o];const f=o*i,u=r*i;for(let d=0;d!==i;++d)t[u+d]=t[f+d]}++r}}if(a>0){e[r]=e[a];for(let o=a*i,l=r*i,c=0;c!==i;++c)t[l+c]=t[o+c];++r}return r!==e.length?(this.times=e.slice(0,r),this.values=t.slice(0,r*i)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),i=this.constructor,s=new i(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}}an.prototype.ValueTypeName="";an.prototype.TimeBufferType=Float32Array;an.prototype.ValueBufferType=Float32Array;an.prototype.DefaultInterpolation=Ll;class Es extends an{constructor(e,t,i){super(e,t,i)}}Es.prototype.ValueTypeName="bool";Es.prototype.ValueBufferType=Array;Es.prototype.DefaultInterpolation=ga;Es.prototype.InterpolantFactoryMethodLinear=void 0;Es.prototype.InterpolantFactoryMethodSmooth=void 0;class Yf extends an{constructor(e,t,i,s){super(e,t,i,s)}}Yf.prototype.ValueTypeName="color";class xc extends an{constructor(e,t,i,s){super(e,t,i,s)}}xc.prototype.ValueTypeName="number";class C0 extends cr{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e,t,i,s){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=(i-t)/(s-t);let c=e*o;for(let h=c+o;c!==h;c+=4)Ci.slerpFlat(a,0,r,c-o,r,c,l);return a}}class Mc extends an{constructor(e,t,i,s){super(e,t,i,s)}InterpolantFactoryMethodLinear(e){return new C0(this.times,this.values,this.getValueSize(),e)}}Mc.prototype.ValueTypeName="quaternion";Mc.prototype.InterpolantFactoryMethodSmooth=void 0;class Ts extends an{constructor(e,t,i){super(e,t,i)}}Ts.prototype.ValueTypeName="string";Ts.prototype.ValueBufferType=Array;Ts.prototype.DefaultInterpolation=ga;Ts.prototype.InterpolantFactoryMethodLinear=void 0;Ts.prototype.InterpolantFactoryMethodSmooth=void 0;class $f extends an{constructor(e,t,i,s){super(e,t,i,s)}}$f.prototype.ValueTypeName="vector";class ub{constructor(e="",t=-1,i=[],s=Dp){this.name=e,this.tracks=i,this.duration=t,this.blendMode=s,this.uuid=Qt(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){const t=[],i=e.tracks,s=1/(e.fps||1);for(let r=0,o=i.length;r!==o;++r)t.push(L0(i[r]).scale(s));const a=new this(e.name,e.duration,t,e.blendMode);return a.uuid=e.uuid,a.userData=JSON.parse(e.userData||"{}"),a}static toJSON(e){const t=[],i=e.tracks,s={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let a=0,r=i.length;a!==r;++a)t.push(an.toJSON(i[a]));return s}static CreateFromMorphTargetSequence(e,t,i,s){const a=t.length,r=[];for(let o=0;o<a;o++){let l=[],c=[];l.push((o+a-1)%a,o,(o+1)%a),c.push(0,1,0);const h=E0(l);l=Yh(l,1,h),c=Yh(c,1,h),!s&&l[0]===0&&(l.push(a),c.push(c[0])),r.push(new xc(".morphTargetInfluences["+t[o].name+"]",l,c).scale(1/i))}return new this(e,-1,r)}static findByName(e,t){let i=e;if(!Array.isArray(e)){const s=e;i=s.geometry&&s.geometry.animations||s.animations}for(let s=0;s<i.length;s++)if(i[s].name===t)return i[s];return null}static CreateClipsFromMorphTargetSequences(e,t,i){const s={},a=/^([\w-]*?)([\d]+)$/;for(let o=0,l=e.length;o<l;o++){const c=e[o],h=c.name.match(a);if(h&&h.length>1){const f=h[1];let u=s[f];u||(s[f]=u=[]),u.push(c)}}const r=[];for(const o in s)r.push(this.CreateFromMorphTargetSequence(o,s[o],t,i));return r}resetDuration(){const e=this.tracks;let t=0;for(let i=0,s=e.length;i!==s;++i){const a=this.tracks[i];t=Math.max(t,a.times[a.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let i=0;i<this.tracks.length;i++)e.push(this.tracks[i].clone());const t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}}function I0(n){switch(n.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return xc;case"vector":case"vector2":case"vector3":case"vector4":return $f;case"color":return Yf;case"quaternion":return Mc;case"bool":case"boolean":return Es;case"string":return Ts}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+n)}function L0(n){if(n.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=I0(n.type);if(n.times===void 0){const t=[],i=[];T0(n.keys,t,i,"value"),n.times=t,n.values=i}return e.parse!==void 0?e.parse(n):new e(n.name,n.times,n.values,n.interpolation)}const Un={enabled:!1,files:{},add:function(n,e){this.enabled!==!1&&($h(n)||(this.files[n]=e))},get:function(n){if(this.enabled!==!1&&!$h(n))return this.files[n]},remove:function(n){delete this.files[n]},clear:function(){this.files={}}};function $h(n){try{const e=n.slice(n.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class D0{constructor(e,t,i){const s=this;let a=!1,r=0,o=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=i,this._abortController=null,this.itemStart=function(h){o++,a===!1&&s.onStart!==void 0&&s.onStart(h,r,o),a=!0},this.itemEnd=function(h){r++,s.onProgress!==void 0&&s.onProgress(h,r,o),r===o&&(a=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,f){return c.push(h,f),this},this.removeHandler=function(h){const f=c.indexOf(h);return f!==-1&&c.splice(f,2),this},this.getHandler=function(h){for(let f=0,u=c.length;f<u;f+=2){const d=c[f],g=c[f+1];if(d.global&&(d.lastIndex=0),d.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const N0=new D0;class hr{constructor(e){this.manager=e!==void 0?e:N0,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const i=this;return new Promise(function(s,a){i.load(e,s,t,a)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}hr.DEFAULT_MATERIAL_NAME="__DEFAULT";const Cn={};class U0 extends Error{constructor(e,t){super(e),this.response=t}}class fb extends hr{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,i,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=Un.get(`file:${e}`);if(a!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(a),this.manager.itemEnd(e)},0);return}if(Cn[e]!==void 0){Cn[e].push({onLoad:t,onProgress:i,onError:s});return}Cn[e]=[],Cn[e].push({onLoad:t,onProgress:i,onError:s});const r=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),o=this.mimeType,l=this.responseType;fetch(r).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&Ae("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;const h=Cn[e],f=c.body.getReader(),u=c.headers.get("X-File-Size")||c.headers.get("Content-Length"),d=u?parseInt(u):0,g=d!==0;let M=0;const m=new ReadableStream({start(p){y();function y(){f.read().then(({done:b,value:x})=>{if(b)p.close();else{M+=x.byteLength;const A=new ProgressEvent("progress",{lengthComputable:g,loaded:M,total:d});for(let E=0,R=h.length;E<R;E++){const _=h[E];_.onProgress&&_.onProgress(A)}p.enqueue(x),y()}},b=>{p.error(b)})}}});return new Response(m)}else throw new U0(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(h=>new DOMParser().parseFromString(h,o));case"json":return c.json();default:if(o==="")return c.text();{const f=/charset="?([^;"\s]*)"?/i.exec(o),u=f&&f[1]?f[1].toLowerCase():void 0,d=new TextDecoder(u);return c.arrayBuffer().then(g=>d.decode(g))}}}).then(c=>{Un.add(`file:${e}`,c);const h=Cn[e];delete Cn[e];for(let f=0,u=h.length;f<u;f++){const d=h[f];d.onLoad&&d.onLoad(c)}}).catch(c=>{const h=Cn[e];if(h===void 0)throw this.manager.itemError(e),c;delete Cn[e];for(let f=0,u=h.length;f<u;f++){const d=h[f];d.onError&&d.onError(c)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const Zi=new WeakMap;class F0 extends hr{constructor(e){super(e)}load(e,t,i,s){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=this,r=Un.get(`image:${e}`);if(r!==void 0){if(r.complete===!0)a.manager.itemStart(e),setTimeout(function(){t&&t(r),a.manager.itemEnd(e)},0);else{let f=Zi.get(r);f===void 0&&(f=[],Zi.set(r,f)),f.push({onLoad:t,onError:s})}return r}const o=tr("img");function l(){h(),t&&t(this);const f=Zi.get(this)||[];for(let u=0;u<f.length;u++){const d=f[u];d.onLoad&&d.onLoad(this)}Zi.delete(this),a.manager.itemEnd(e)}function c(f){h(),s&&s(f),Un.remove(`image:${e}`);const u=Zi.get(this)||[];for(let d=0;d<u.length;d++){const g=u[d];g.onError&&g.onError(f)}Zi.delete(this),a.manager.itemError(e),a.manager.itemEnd(e)}function h(){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1)}return o.addEventListener("load",l,!1),o.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),Un.add(`image:${e}`,o),a.manager.itemStart(e),o.src=e,o}}class db extends hr{constructor(e){super(e)}load(e,t,i,s){const a=new It,r=new F0(this.manager);return r.setCrossOrigin(this.crossOrigin),r.setPath(this.path),r.load(e,function(o){a.image=o,a.needsUpdate=!0,t!==void 0&&t(a)},i,s),a}}class ur extends ct{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new He(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class pb extends ur{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(ct.DEFAULT_UP),this.updateMatrix(),this.groundColor=new He(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Ro=new Ye,Kh=new C,Jh=new C;class yc{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ne(512,512),this.mapType=Wt,this.map=null,this.mapPass=null,this.matrix=new Ye,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new dc,this._frameExtents=new ne(1,1),this._viewportCount=1,this._viewports=[new lt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;Kh.setFromMatrixPosition(e.matrixWorld),t.position.copy(Kh),Jh.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Jh),t.updateMatrixWorld(),Ro.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ro,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===er||t.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Ro)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Jr=new C,Zr=new Ci,hn=new C;class Kf extends ct{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Ye,this.projectionMatrix=new Ye,this.projectionMatrixInverse=new Ye,this.coordinateSystem=_n,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Jr,Zr,hn),hn.x===1&&hn.y===1&&hn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Jr,Zr,hn.set(1,1,1)).invert()}updateWorldMatrix(e,t,i=!1){super.updateWorldMatrix(e,t,i),this.matrixWorld.decompose(Jr,Zr,hn),hn.x===1&&hn.y===1&&hn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Jr,Zr,hn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const jn=new C,Zh=new ne,Qh=new ne;class Gt extends Kf{constructor(e=50,t=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=ds*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(cs*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return ds*2*Math.atan(Math.tan(cs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){jn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(jn.x,jn.y).multiplyScalar(-e/jn.z),jn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(jn.x,jn.y).multiplyScalar(-e/jn.z)}getViewSize(e,t){return this.getViewBounds(e,Zh,Qh),t.subVectors(Qh,Zh)}setViewOffset(e,t,i,s,a,r){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=a,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(cs*.5*this.fov)/this.zoom,i=2*t,s=this.aspect*i,a=-.5*s;const r=this.view;if(this.view!==null&&this.view.enabled){const l=r.fullWidth,c=r.fullHeight;a+=r.offsetX*s/l,t-=r.offsetY*i/c,s*=r.width/l,i*=r.height/c}const o=this.filmOffset;o!==0&&(a+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(a,a+s,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class O0 extends yc{constructor(){super(new Gt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,i=ds*2*e.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,a=e.distance||t.far;(i!==t.fov||s!==t.aspect||a!==t.far)&&(t.fov=i,t.aspect=s,t.far=a,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}class mb extends ur{constructor(e,t,i=0,s=Math.PI/3,a=0,r=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(ct.DEFAULT_UP),this.updateMatrix(),this.target=new ct,this.distance=i,this.angle=s,this.penumbra=a,this.decay=r,this.map=null,this.shadow=new O0}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}}class B0 extends yc{constructor(){super(new Gt(90,1,.5,500)),this.isPointLightShadow=!0}}class gb extends ur{constructor(e,t,i=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=s,this.shadow=new B0}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}}class Sc extends Kf{constructor(e=-1,t=1,i=1,s=-1,a=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=s,this.near=a,this.far=r,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,s,a,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=a,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let a=i-e,r=i+e,o=s+t,l=s-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;a+=c*this.view.offsetX,r=a+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(a,r,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class z0 extends yc{constructor(){super(new Sc(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class _b extends ur{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(ct.DEFAULT_UP),this.updateMatrix(),this.target=new ct,this.shadow=new z0}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class vb extends ur{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class xb{static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}}const Po=new WeakMap;class Mb extends hr{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&Ae("ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&Ae("ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,i,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=this,r=Un.get(`image-bitmap:${e}`);if(r!==void 0){if(a.manager.itemStart(e),r.then){r.then(c=>{Po.has(r)===!0?(s&&s(Po.get(r)),a.manager.itemError(e),a.manager.itemEnd(e)):(t&&t(c),a.manager.itemEnd(e))});return}setTimeout(function(){t&&t(r),a.manager.itemEnd(e)},0);return}const o={};o.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",o.headers=this.requestHeader,o.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;const l=fetch(e,o).then(function(c){return c.blob()}).then(function(c){return createImageBitmap(c,Object.assign(a.options,{colorSpaceConversion:"none"}))}).then(function(c){Un.add(`image-bitmap:${e}`,c),t&&t(c),a.manager.itemEnd(e)}).catch(function(c){s&&s(c),Po.set(l,c),Un.remove(`image-bitmap:${e}`),a.manager.itemError(e),a.manager.itemEnd(e)});Un.add(`image-bitmap:${e}`,l),a.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const Qi=-90,ji=1;class k0 extends ct{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new Gt(Qi,ji,e,t);s.layers=this.layers,this.add(s);const a=new Gt(Qi,ji,e,t);a.layers=this.layers,this.add(a);const r=new Gt(Qi,ji,e,t);r.layers=this.layers,this.add(r);const o=new Gt(Qi,ji,e,t);o.layers=this.layers,this.add(o);const l=new Gt(Qi,ji,e,t);l.layers=this.layers,this.add(l);const c=new Gt(Qi,ji,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,s,a,r,o,l]=t;for(const c of t)this.remove(c);if(e===_n)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),a.up.set(0,0,-1),a.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===er)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),a.up.set(0,0,1),a.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[a,r,o,l,c,h]=this.children,f=e.getRenderTarget(),u=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const M=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let m=!1;e.isWebGLRenderer===!0?m=e.state.buffers.depth.getReversed():m=e.reversedDepthBuffer,e.setRenderTarget(i,0,s),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(i,1,s),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(i,2,s),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(i,3,s),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(i,4,s),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),i.texture.generateMipmaps=M,e.setRenderTarget(i,5,s),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(f,u,d),e.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class V0 extends Gt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}const bc="\\[\\]\\.:\\/",H0=new RegExp("["+bc+"]","g"),Ec="[^"+bc+"]",G0="[^"+bc.replace("\\.","")+"]",W0=/((?:WC+[\/:])*)/.source.replace("WC",Ec),X0=/(WCOD+)?/.source.replace("WCOD",G0),q0=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Ec),Y0=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Ec),$0=new RegExp("^"+W0+X0+q0+Y0+"$"),K0=["material","materials","bones","map"];class J0{constructor(e,t,i){const s=i||ot.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();const i=this._targetGroup.nCachedObjects_,s=this._bindings[i];s!==void 0&&s.getValue(e,t)}setValue(e,t){const i=this._bindings;for(let s=this._targetGroup.nCachedObjects_,a=i.length;s!==a;++s)i[s].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].unbind()}}class ot{constructor(e,t,i){this.path=t,this.parsedPath=i||ot.parseTrackName(t),this.node=ot.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,i){return e&&e.isAnimationObjectGroup?new ot.Composite(e,t,i):new ot(e,t,i)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(H0,"")}static parseTrackName(e){const t=$0.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);const i={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=i.nodeName&&i.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){const a=i.nodeName.substring(s+1);K0.indexOf(a)!==-1&&(i.nodeName=i.nodeName.substring(0,s),i.objectName=a)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return i}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const i=e.skeleton.getBoneByName(t);if(i!==void 0)return i}if(e.children){const i=function(a){for(let r=0;r<a.length;r++){const o=a[r];if(o.name===t||o.uuid===t)return o;const l=i(o.children);if(l)return l}return null},s=i(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const i=this.resolvedProperty;for(let s=0,a=i.length;s!==a;++s)e[t++]=i[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const i=this.resolvedProperty;for(let s=0,a=i.length;s!==a;++s)i[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const i=this.resolvedProperty;for(let s=0,a=i.length;s!==a;++s)i[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const i=this.resolvedProperty;for(let s=0,a=i.length;s!==a;++s)i[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,i=t.objectName,s=t.propertyName;let a=t.propertyIndex;if(e||(e=ot.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Ae("PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=t.objectIndex;switch(i){case"materials":if(!e.material){Fe("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Fe("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Fe("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Fe("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Fe("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[i]===void 0){Fe("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[i]}if(c!==void 0){if(e[c]===void 0){Fe("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}const r=e[s];if(r===void 0){const c=t.nodeName;Fe("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(a!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){Fe("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Fe("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[a]!==void 0&&(a=e.morphTargetDictionary[a])}l=this.BindingType.ArrayElement,this.resolvedProperty=r,this.propertyIndex=a}else r.fromArray!==void 0&&r.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=r):Array.isArray(r)?(l=this.BindingType.EntireArray,this.resolvedProperty=r):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}ot.Composite=J0;ot.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};ot.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};ot.prototype.GetterByBindingType=[ot.prototype._getValue_direct,ot.prototype._getValue_array,ot.prototype._getValue_arrayElement,ot.prototype._getValue_toArray];ot.prototype.SetterByBindingTypeAndVersioning=[[ot.prototype._setValue_direct,ot.prototype._setValue_direct_setNeedsUpdate,ot.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ot.prototype._setValue_array,ot.prototype._setValue_array_setNeedsUpdate,ot.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ot.prototype._setValue_arrayElement,ot.prototype._setValue_arrayElement_setNeedsUpdate,ot.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ot.prototype._setValue_fromArray,ot.prototype._setValue_fromArray_setNeedsUpdate,ot.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];const jh=new Ye;class yb{constructor(e,t,i=0,s=1/0){this.ray=new lr(e,t),this.near=i,this.far=s,this.camera=null,this.layers=new lc,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):Fe("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return jh.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(jh),this}intersectObject(e,t=!0,i=[]){return zl(e,this,i,t),i.sort(eu),i}intersectObjects(e,t=!0,i=[]){for(let s=0,a=e.length;s<a;s++)zl(e[s],this,i,t);return i.sort(eu),i}}function eu(n,e){return n.distance-e.distance}function zl(n,e,t,i){let s=!0;if(n.layers.test(e.layers)&&n.raycast(e,t)===!1&&(s=!1),s===!0&&i===!0){const a=n.children;for(let r=0,o=a.length;r<o;r++)zl(a[r],e,t,!0)}}class Sb{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,Ae("Clock: This module has been deprecated. Please use THREE.Timer instead.")}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}class Jf{static{Jf.prototype.isMatrix2=!0}constructor(e,t,i,s){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,i,s)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let i=0;i<4;i++)this.elements[i]=e[i+t];return this}set(e,t,i,s){const a=this.elements;return a[0]=e,a[2]=t,a[1]=i,a[3]=s,this}}class bb extends Fm{constructor(e=10,t=10,i=4473924,s=8947848){i=new He(i),s=new He(s);const a=t/2,r=e/t,o=e/2,l=[],c=[];for(let u=0,d=0,g=-o;u<=t;u++,g+=r){l.push(-o,0,g,o,0,g),l.push(g,0,-o,g,0,o);const M=u===a?i:s;M.toArray(c,d),d+=3,M.toArray(c,d),d+=3,M.toArray(c,d),d+=3,M.toArray(c,d),d+=3}const h=new gt;h.setAttribute("position",new Be(l,3)),h.setAttribute("color",new Be(c,3));const f=new xf({vertexColors:!0,toneMapped:!1});super(h,f),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}function tu(n,e,t,i){const s=Z0(i);switch(t){case hf:return n*e;case ec:return n*e/s.components*s.byteLength;case tc:return n*e/s.components*s.byteLength;case Ei:return n*e*2/s.components*s.byteLength;case nc:return n*e*2/s.components*s.byteLength;case uf:return n*e*3/s.components*s.byteLength;case Zt:return n*e*4/s.components*s.byteLength;case ic:return n*e*4/s.components*s.byteLength;case sa:case ra:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case aa:case oa:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case il:case rl:return Math.max(n,16)*Math.max(e,8)/4;case nl:case sl:return Math.max(n,8)*Math.max(e,8)/2;case al:case ol:case cl:case hl:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case ll:case pa:case ul:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case fl:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case dl:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case pl:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case ml:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case gl:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case _l:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case vl:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case xl:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case Ml:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case yl:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case Sl:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case bl:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case El:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case Tl:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case Al:case wl:case Rl:return Math.ceil(n/4)*Math.ceil(e/4)*16;case Pl:case Cl:return Math.ceil(n/4)*Math.ceil(e/4)*8;case ma:case Il:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Z0(n){switch(n){case Wt:case af:return{byteLength:1,components:1};case Qs:case of:case Bn:return{byteLength:2,components:1};case Ql:case jl:return{byteLength:2,components:4};case yn:case Zl:case Jt:return{byteLength:4,components:1};case lf:case cf:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Jl}}));typeof window<"u"&&(window.__THREE__?Ae("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Jl);function Zf(){let n=null,e=!1,t=null,i=null;function s(a,r){t(a,r),i=n.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&n!==null&&(i=n.requestAnimationFrame(s),e=!0)},stop:function(){n!==null&&n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(a){t=a},setContext:function(a){n=a}}}function Q0(n){const e=new WeakMap;function t(o,l){const c=o.array,h=o.usage,f=c.byteLength,u=n.createBuffer();n.bindBuffer(l,u),n.bufferData(l,c,h),o.onUploadCallback();let d;if(c instanceof Float32Array)d=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)d=n.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?d=n.HALF_FLOAT:d=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)d=n.SHORT;else if(c instanceof Uint32Array)d=n.UNSIGNED_INT;else if(c instanceof Int32Array)d=n.INT;else if(c instanceof Int8Array)d=n.BYTE;else if(c instanceof Uint8Array)d=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)d=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:d,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:f}}function i(o,l,c){const h=l.array,f=l.updateRanges;if(n.bindBuffer(c,o),f.length===0)n.bufferSubData(c,0,h);else{f.sort((d,g)=>d.start-g.start);let u=0;for(let d=1;d<f.length;d++){const g=f[u],M=f[d];M.start<=g.start+g.count+1?g.count=Math.max(g.count,M.start+M.count-g.start):(++u,f[u]=M)}f.length=u+1;for(let d=0,g=f.length;d<g;d++){const M=f[d];n.bufferSubData(c,M.start*h.BYTES_PER_ELEMENT,h,M.start,M.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function a(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=e.get(o);l&&(n.deleteBuffer(l.buffer),e.delete(o))}function r(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,o,l),c.version=o.version}}return{get:s,remove:a,update:r}}var j0=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,eg=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,tg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,ng=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,ig=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,sg=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,rg=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,ag=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,og=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,lg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,cg=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,hg=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,ug=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,fg=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,dg=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,pg=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,mg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,gg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,_g=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,vg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,xg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Mg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,yg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Sg=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,bg=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Eg=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,Tg=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ag=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,wg=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Rg=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Pg="gl_FragColor = linearToOutputTexel( gl_FragColor );",Cg=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Ig=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,Lg=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Dg=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Ng=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Ug=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Fg=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Og=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Bg=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,zg=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,kg=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Vg=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Hg=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Gg=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Wg=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,Xg=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,qg=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Yg=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,$g=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Kg=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Jg=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Zg=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Qg=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,jg=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,e_=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,t_=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,n_=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,i_=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,s_=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,r_=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,a_=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,o_=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,l_=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,c_=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,h_=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,u_=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,f_=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,d_=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,p_=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,m_=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,g_=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,__=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,v_=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,x_=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,M_=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,y_=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,S_=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,b_=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,E_=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,T_=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,A_=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,w_=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,R_=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,P_=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,C_=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,I_=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,L_=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,D_=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,N_=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,U_=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,F_=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,O_=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,B_=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,z_=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,k_=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,V_=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,H_=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,G_=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,W_=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,X_=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,q_=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Y_=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,$_=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,K_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,J_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Z_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Q_=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const j_=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,ev=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,tv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,nv=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,iv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,sv=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,rv=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,av=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,ov=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,lv=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,cv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,hv=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,uv=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,fv=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,dv=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,pv=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,mv=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,gv=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,_v=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,vv=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,xv=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Mv=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,yv=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Sv=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bv=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Ev=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Tv=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Av=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,wv=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Rv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Pv=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Cv=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Iv=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Lv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,$e={alphahash_fragment:j0,alphahash_pars_fragment:eg,alphamap_fragment:tg,alphamap_pars_fragment:ng,alphatest_fragment:ig,alphatest_pars_fragment:sg,aomap_fragment:rg,aomap_pars_fragment:ag,batching_pars_vertex:og,batching_vertex:lg,begin_vertex:cg,beginnormal_vertex:hg,bsdfs:ug,iridescence_fragment:fg,bumpmap_pars_fragment:dg,clipping_planes_fragment:pg,clipping_planes_pars_fragment:mg,clipping_planes_pars_vertex:gg,clipping_planes_vertex:_g,color_fragment:vg,color_pars_fragment:xg,color_pars_vertex:Mg,color_vertex:yg,common:Sg,cube_uv_reflection_fragment:bg,defaultnormal_vertex:Eg,displacementmap_pars_vertex:Tg,displacementmap_vertex:Ag,emissivemap_fragment:wg,emissivemap_pars_fragment:Rg,colorspace_fragment:Pg,colorspace_pars_fragment:Cg,envmap_fragment:Ig,envmap_common_pars_fragment:Lg,envmap_pars_fragment:Dg,envmap_pars_vertex:Ng,envmap_physical_pars_fragment:Xg,envmap_vertex:Ug,fog_vertex:Fg,fog_pars_vertex:Og,fog_fragment:Bg,fog_pars_fragment:zg,gradientmap_pars_fragment:kg,lightmap_pars_fragment:Vg,lights_lambert_fragment:Hg,lights_lambert_pars_fragment:Gg,lights_pars_begin:Wg,lights_toon_fragment:qg,lights_toon_pars_fragment:Yg,lights_phong_fragment:$g,lights_phong_pars_fragment:Kg,lights_physical_fragment:Jg,lights_physical_pars_fragment:Zg,lights_fragment_begin:Qg,lights_fragment_maps:jg,lights_fragment_end:e_,lightprobes_pars_fragment:t_,logdepthbuf_fragment:n_,logdepthbuf_pars_fragment:i_,logdepthbuf_pars_vertex:s_,logdepthbuf_vertex:r_,map_fragment:a_,map_pars_fragment:o_,map_particle_fragment:l_,map_particle_pars_fragment:c_,metalnessmap_fragment:h_,metalnessmap_pars_fragment:u_,morphinstance_vertex:f_,morphcolor_vertex:d_,morphnormal_vertex:p_,morphtarget_pars_vertex:m_,morphtarget_vertex:g_,normal_fragment_begin:__,normal_fragment_maps:v_,normal_pars_fragment:x_,normal_pars_vertex:M_,normal_vertex:y_,normalmap_pars_fragment:S_,clearcoat_normal_fragment_begin:b_,clearcoat_normal_fragment_maps:E_,clearcoat_pars_fragment:T_,iridescence_pars_fragment:A_,opaque_fragment:w_,packing:R_,premultiplied_alpha_fragment:P_,project_vertex:C_,dithering_fragment:I_,dithering_pars_fragment:L_,roughnessmap_fragment:D_,roughnessmap_pars_fragment:N_,shadowmap_pars_fragment:U_,shadowmap_pars_vertex:F_,shadowmap_vertex:O_,shadowmask_pars_fragment:B_,skinbase_vertex:z_,skinning_pars_vertex:k_,skinning_vertex:V_,skinnormal_vertex:H_,specularmap_fragment:G_,specularmap_pars_fragment:W_,tonemapping_fragment:X_,tonemapping_pars_fragment:q_,transmission_fragment:Y_,transmission_pars_fragment:$_,uv_pars_fragment:K_,uv_pars_vertex:J_,uv_vertex:Z_,worldpos_vertex:Q_,background_vert:j_,background_frag:ev,backgroundCube_vert:tv,backgroundCube_frag:nv,cube_vert:iv,cube_frag:sv,depth_vert:rv,depth_frag:av,distance_vert:ov,distance_frag:lv,equirect_vert:cv,equirect_frag:hv,linedashed_vert:uv,linedashed_frag:fv,meshbasic_vert:dv,meshbasic_frag:pv,meshlambert_vert:mv,meshlambert_frag:gv,meshmatcap_vert:_v,meshmatcap_frag:vv,meshnormal_vert:xv,meshnormal_frag:Mv,meshphong_vert:yv,meshphong_frag:Sv,meshphysical_vert:bv,meshphysical_frag:Ev,meshtoon_vert:Tv,meshtoon_frag:Av,points_vert:wv,points_frag:Rv,shadow_vert:Pv,shadow_frag:Cv,sprite_vert:Iv,sprite_frag:Lv},ge={common:{diffuse:{value:new He(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new We},alphaMap:{value:null},alphaMapTransform:{value:new We},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new We}},envmap:{envMap:{value:null},envMapRotation:{value:new We},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new We}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new We}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new We},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new We},normalScale:{value:new ne(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new We},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new We}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new We}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new We}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new He(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new C},probesMax:{value:new C},probesResolution:{value:new C}},points:{diffuse:{value:new He(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new We},alphaTest:{value:0},uvTransform:{value:new We}},sprite:{diffuse:{value:new He(16777215)},opacity:{value:1},center:{value:new ne(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new We},alphaMap:{value:null},alphaMapTransform:{value:new We},alphaTest:{value:0}}},pn={basic:{uniforms:Ot([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.fog]),vertexShader:$e.meshbasic_vert,fragmentShader:$e.meshbasic_frag},lambert:{uniforms:Ot([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,ge.lights,{emissive:{value:new He(0)},envMapIntensity:{value:1}}]),vertexShader:$e.meshlambert_vert,fragmentShader:$e.meshlambert_frag},phong:{uniforms:Ot([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,ge.lights,{emissive:{value:new He(0)},specular:{value:new He(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:$e.meshphong_vert,fragmentShader:$e.meshphong_frag},standard:{uniforms:Ot([ge.common,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.roughnessmap,ge.metalnessmap,ge.fog,ge.lights,{emissive:{value:new He(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:$e.meshphysical_vert,fragmentShader:$e.meshphysical_frag},toon:{uniforms:Ot([ge.common,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.gradientmap,ge.fog,ge.lights,{emissive:{value:new He(0)}}]),vertexShader:$e.meshtoon_vert,fragmentShader:$e.meshtoon_frag},matcap:{uniforms:Ot([ge.common,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,{matcap:{value:null}}]),vertexShader:$e.meshmatcap_vert,fragmentShader:$e.meshmatcap_frag},points:{uniforms:Ot([ge.points,ge.fog]),vertexShader:$e.points_vert,fragmentShader:$e.points_frag},dashed:{uniforms:Ot([ge.common,ge.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:$e.linedashed_vert,fragmentShader:$e.linedashed_frag},depth:{uniforms:Ot([ge.common,ge.displacementmap]),vertexShader:$e.depth_vert,fragmentShader:$e.depth_frag},normal:{uniforms:Ot([ge.common,ge.bumpmap,ge.normalmap,ge.displacementmap,{opacity:{value:1}}]),vertexShader:$e.meshnormal_vert,fragmentShader:$e.meshnormal_frag},sprite:{uniforms:Ot([ge.sprite,ge.fog]),vertexShader:$e.sprite_vert,fragmentShader:$e.sprite_frag},background:{uniforms:{uvTransform:{value:new We},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:$e.background_vert,fragmentShader:$e.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new We}},vertexShader:$e.backgroundCube_vert,fragmentShader:$e.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:$e.cube_vert,fragmentShader:$e.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:$e.equirect_vert,fragmentShader:$e.equirect_frag},distance:{uniforms:Ot([ge.common,ge.displacementmap,{referencePosition:{value:new C},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:$e.distance_vert,fragmentShader:$e.distance_frag},shadow:{uniforms:Ot([ge.lights,ge.fog,{color:{value:new He(0)},opacity:{value:1}}]),vertexShader:$e.shadow_vert,fragmentShader:$e.shadow_frag}};pn.physical={uniforms:Ot([pn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new We},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new We},clearcoatNormalScale:{value:new ne(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new We},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new We},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new We},sheen:{value:0},sheenColor:{value:new He(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new We},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new We},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new We},transmissionSamplerSize:{value:new ne},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new We},attenuationDistance:{value:0},attenuationColor:{value:new He(0)},specularColor:{value:new He(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new We},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new We},anisotropyVector:{value:new ne},anisotropyMap:{value:null},anisotropyMapTransform:{value:new We}}]),vertexShader:$e.meshphysical_vert,fragmentShader:$e.meshphysical_frag};const Qr={r:0,b:0,g:0},Dv=new Ye,Qf=new We;Qf.set(-1,0,0,0,1,0,0,0,1);function Nv(n,e,t,i,s,a){const r=new He(0);let o=s===!0?0:1,l,c,h=null,f=0,u=null;function d(y){let b=y.isScene===!0?y.background:null;if(b&&b.isTexture){const x=y.backgroundBlurriness>0;b=e.get(b,x)}return b}function g(y){let b=!1;const x=d(y);x===null?m(r,o):x&&x.isColor&&(m(x,1),b=!0);const A=n.xr.getEnvironmentBlendMode();A==="additive"?t.buffers.color.setClear(0,0,0,1,a):A==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,a),(n.autoClear||b)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function M(y,b){const x=d(b);x&&(x.isCubeTexture||x.mapping===Fa)?(c===void 0&&(c=new yt(new ys(1,1,1),new Sn({name:"BackgroundCubeMaterial",uniforms:gs(pn.backgroundCube.uniforms),vertexShader:pn.backgroundCube.vertexShader,fragmentShader:pn.backgroundCube.fragmentShader,side:zt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(A,E,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(c)),c.material.uniforms.envMap.value=x,c.material.uniforms.backgroundBlurriness.value=b.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Dv.makeRotationFromEuler(b.backgroundRotation)).transpose(),x.isCubeTexture&&x.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(Qf),c.material.toneMapped=je.getTransfer(x.colorSpace)!==it,(h!==x||f!==x.version||u!==n.toneMapping)&&(c.material.needsUpdate=!0,h=x,f=x.version,u=n.toneMapping),c.layers.enableAll(),y.unshift(c,c.geometry,c.material,0,0,null)):x&&x.isTexture&&(l===void 0&&(l=new yt(new bs(2,2),new Sn({name:"BackgroundMaterial",uniforms:gs(pn.background.uniforms),vertexShader:pn.background.vertexShader,fragmentShader:pn.background.fragmentShader,side:si,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=x,l.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,l.material.toneMapped=je.getTransfer(x.colorSpace)!==it,x.matrixAutoUpdate===!0&&x.updateMatrix(),l.material.uniforms.uvTransform.value.copy(x.matrix),(h!==x||f!==x.version||u!==n.toneMapping)&&(l.material.needsUpdate=!0,h=x,f=x.version,u=n.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function m(y,b){y.getRGB(Qr,qf(n)),t.buffers.color.setClear(Qr.r,Qr.g,Qr.b,b,a)}function p(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return r},setClearColor:function(y,b=1){r.set(y),o=b,m(r,o)},getClearAlpha:function(){return o},setClearAlpha:function(y){o=y,m(r,o)},render:g,addToRenderList:M,dispose:p}}function Uv(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=u(null);let a=s,r=!1;function o(I,N,B,X,F){let W=!1;const H=f(I,X,B,N);a!==H&&(a=H,c(a.object)),W=d(I,X,B,F),W&&g(I,X,B,F),F!==null&&e.update(F,n.ELEMENT_ARRAY_BUFFER),(W||r)&&(r=!1,x(I,N,B,X),F!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(F).buffer))}function l(){return n.createVertexArray()}function c(I){return n.bindVertexArray(I)}function h(I){return n.deleteVertexArray(I)}function f(I,N,B,X){const F=X.wireframe===!0;let W=i[N.id];W===void 0&&(W={},i[N.id]=W);const H=I.isInstancedMesh===!0?I.id:0;let Z=W[H];Z===void 0&&(Z={},W[H]=Z);let ie=Z[B.id];ie===void 0&&(ie={},Z[B.id]=ie);let he=ie[F];return he===void 0&&(he=u(l()),ie[F]=he),he}function u(I){const N=[],B=[],X=[];for(let F=0;F<t;F++)N[F]=0,B[F]=0,X[F]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:N,enabledAttributes:B,attributeDivisors:X,object:I,attributes:{},index:null}}function d(I,N,B,X){const F=a.attributes,W=N.attributes;let H=0;const Z=B.getAttributes();for(const ie in Z)if(Z[ie].location>=0){const oe=F[ie];let ye=W[ie];if(ye===void 0&&(ie==="instanceMatrix"&&I.instanceMatrix&&(ye=I.instanceMatrix),ie==="instanceColor"&&I.instanceColor&&(ye=I.instanceColor)),oe===void 0||oe.attribute!==ye||ye&&oe.data!==ye.data)return!0;H++}return a.attributesNum!==H||a.index!==X}function g(I,N,B,X){const F={},W=N.attributes;let H=0;const Z=B.getAttributes();for(const ie in Z)if(Z[ie].location>=0){let oe=W[ie];oe===void 0&&(ie==="instanceMatrix"&&I.instanceMatrix&&(oe=I.instanceMatrix),ie==="instanceColor"&&I.instanceColor&&(oe=I.instanceColor));const ye={};ye.attribute=oe,oe&&oe.data&&(ye.data=oe.data),F[ie]=ye,H++}a.attributes=F,a.attributesNum=H,a.index=X}function M(){const I=a.newAttributes;for(let N=0,B=I.length;N<B;N++)I[N]=0}function m(I){p(I,0)}function p(I,N){const B=a.newAttributes,X=a.enabledAttributes,F=a.attributeDivisors;B[I]=1,X[I]===0&&(n.enableVertexAttribArray(I),X[I]=1),F[I]!==N&&(n.vertexAttribDivisor(I,N),F[I]=N)}function y(){const I=a.newAttributes,N=a.enabledAttributes;for(let B=0,X=N.length;B<X;B++)N[B]!==I[B]&&(n.disableVertexAttribArray(B),N[B]=0)}function b(I,N,B,X,F,W,H){H===!0?n.vertexAttribIPointer(I,N,B,F,W):n.vertexAttribPointer(I,N,B,X,F,W)}function x(I,N,B,X){M();const F=X.attributes,W=B.getAttributes(),H=N.defaultAttributeValues;for(const Z in W){const ie=W[Z];if(ie.location>=0){let he=F[Z];if(he===void 0&&(Z==="instanceMatrix"&&I.instanceMatrix&&(he=I.instanceMatrix),Z==="instanceColor"&&I.instanceColor&&(he=I.instanceColor)),he!==void 0){const oe=he.normalized,ye=he.itemSize,Je=e.get(he);if(Je===void 0)continue;const ht=Je.buffer,et=Je.type,K=Je.bytesPerElement,le=et===n.INT||et===n.UNSIGNED_INT||he.gpuType===Zl;if(he.isInterleavedBufferAttribute){const se=he.data,Ie=se.stride,ze=he.offset;if(se.isInstancedInterleavedBuffer){for(let Ne=0;Ne<ie.locationSize;Ne++)p(ie.location+Ne,se.meshPerAttribute);I.isInstancedMesh!==!0&&X._maxInstanceCount===void 0&&(X._maxInstanceCount=se.meshPerAttribute*se.count)}else for(let Ne=0;Ne<ie.locationSize;Ne++)m(ie.location+Ne);n.bindBuffer(n.ARRAY_BUFFER,ht);for(let Ne=0;Ne<ie.locationSize;Ne++)b(ie.location+Ne,ye/ie.locationSize,et,oe,Ie*K,(ze+ye/ie.locationSize*Ne)*K,le)}else{if(he.isInstancedBufferAttribute){for(let se=0;se<ie.locationSize;se++)p(ie.location+se,he.meshPerAttribute);I.isInstancedMesh!==!0&&X._maxInstanceCount===void 0&&(X._maxInstanceCount=he.meshPerAttribute*he.count)}else for(let se=0;se<ie.locationSize;se++)m(ie.location+se);n.bindBuffer(n.ARRAY_BUFFER,ht);for(let se=0;se<ie.locationSize;se++)b(ie.location+se,ye/ie.locationSize,et,oe,ye*K,ye/ie.locationSize*se*K,le)}}else if(H!==void 0){const oe=H[Z];if(oe!==void 0)switch(oe.length){case 2:n.vertexAttrib2fv(ie.location,oe);break;case 3:n.vertexAttrib3fv(ie.location,oe);break;case 4:n.vertexAttrib4fv(ie.location,oe);break;default:n.vertexAttrib1fv(ie.location,oe)}}}}y()}function A(){T();for(const I in i){const N=i[I];for(const B in N){const X=N[B];for(const F in X){const W=X[F];for(const H in W)h(W[H].object),delete W[H];delete X[F]}}delete i[I]}}function E(I){if(i[I.id]===void 0)return;const N=i[I.id];for(const B in N){const X=N[B];for(const F in X){const W=X[F];for(const H in W)h(W[H].object),delete W[H];delete X[F]}}delete i[I.id]}function R(I){for(const N in i){const B=i[N];for(const X in B){const F=B[X];if(F[I.id]===void 0)continue;const W=F[I.id];for(const H in W)h(W[H].object),delete W[H];delete F[I.id]}}}function _(I){for(const N in i){const B=i[N],X=I.isInstancedMesh===!0?I.id:0,F=B[X];if(F!==void 0){for(const W in F){const H=F[W];for(const Z in H)h(H[Z].object),delete H[Z];delete F[W]}delete B[X],Object.keys(B).length===0&&delete i[N]}}}function T(){P(),r=!0,a!==s&&(a=s,c(a.object))}function P(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:T,resetDefaultState:P,dispose:A,releaseStatesOfGeometry:E,releaseStatesOfObject:_,releaseStatesOfProgram:R,initAttributes:M,enableAttribute:m,disableUnusedAttributes:y}}function Fv(n,e,t){let i;function s(l){i=l}function a(l,c){n.drawArrays(i,l,c),t.update(c,i,1)}function r(l,c,h){h!==0&&(n.drawArraysInstanced(i,l,c,h),t.update(c,i,h))}function o(l,c,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,c,0,h);let u=0;for(let d=0;d<h;d++)u+=c[d];t.update(u,i,1)}this.setMode=s,this.render=a,this.renderInstances=r,this.renderMultiDraw=o}function Ov(n,e,t,i){let s;function a(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){const R=e.get("EXT_texture_filter_anisotropic");s=n.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function r(R){return!(R!==Zt&&i.convert(R)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(R){const _=R===Bn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(R!==Wt&&i.convert(R)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&R!==Jt&&!_)}function l(R){if(R==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const h=l(c);h!==c&&(Ae("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const f=t.logarithmicDepthBuffer===!0,u=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&u===!1&&Ae("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const d=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),M=n.getParameter(n.MAX_TEXTURE_SIZE),m=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),p=n.getParameter(n.MAX_VERTEX_ATTRIBS),y=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),b=n.getParameter(n.MAX_VARYING_VECTORS),x=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),A=n.getParameter(n.MAX_SAMPLES),E=n.getParameter(n.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:l,textureFormatReadable:r,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:f,reversedDepthBuffer:u,maxTextures:d,maxVertexTextures:g,maxTextureSize:M,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:y,maxVaryings:b,maxFragmentUniforms:x,maxSamples:A,samples:E}}function Bv(n){const e=this;let t=null,i=0,s=!1,a=!1;const r=new pi,o=new We,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,u){const d=f.length!==0||u||i!==0||s;return s=u,i=f.length,d},this.beginShadows=function(){a=!0,h(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(f,u){t=h(f,u,0)},this.setState=function(f,u,d){const g=f.clippingPlanes,M=f.clipIntersection,m=f.clipShadows,p=n.get(f);if(!s||g===null||g.length===0||a&&!m)a?h(null):c();else{const y=a?0:i,b=y*4;let x=p.clippingState||null;l.value=x,x=h(g,u,b,d);for(let A=0;A!==b;++A)x[A]=t[A];p.clippingState=x,this.numIntersection=M?this.numPlanes:0,this.numPlanes+=y}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function h(f,u,d,g){const M=f!==null?f.length:0;let m=null;if(M!==0){if(m=l.value,g!==!0||m===null){const p=d+M*4,y=u.matrixWorldInverse;o.getNormalMatrix(y),(m===null||m.length<p)&&(m=new Float32Array(p));for(let b=0,x=d;b!==M;++b,x+=4)r.copy(f[b]).applyMatrix4(y,o),r.normal.toArray(m,x),m[x+3]=r.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=M,e.numIntersection=0,m}}const ii=4,nu=[.125,.215,.35,.446,.526,.582],gi=20,zv=256,Bs=new Sc,iu=new He;let Co=null,Io=0,Lo=0,Do=!1;const kv=new C;class su{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,i=.1,s=100,a={}){const{size:r=256,position:o=kv}=a;Co=this._renderer.getRenderTarget(),Io=this._renderer.getActiveCubeFace(),Lo=this._renderer.getActiveMipmapLevel(),Do=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(r);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,i,s,l,o),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ou(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=au(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Co,Io,Lo),this._renderer.xr.enabled=Do,e.scissorTest=!1,es(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===bi||e.mapping===fs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Co=this._renderer.getRenderTarget(),Io=this._renderer.getActiveCubeFace(),Lo=this._renderer.getActiveMipmapLevel(),Do=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Ut,minFilter:Ut,generateMipmaps:!1,type:Bn,format:Zt,colorSpace:_a,depthBuffer:!1},s=ru(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ru(e,t,i);const{_lodMax:a}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Vv(a)),this._blurMaterial=Gv(a,e,t),this._ggxMaterial=Hv(a,e,t)}return s}_compileMaterial(e){const t=new yt(new gt,e);this._renderer.compile(t,Bs)}_sceneToCubeUV(e,t,i,s,a){const l=new Gt(90,1,t,i),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],f=this._renderer,u=f.autoClear,d=f.toneMapping;f.getClearColor(iu),f.toneMapping=vn,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(s),f.clearDepth(),f.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new yt(new ys,new Oa({name:"PMREM.Background",side:zt,depthWrite:!1,depthTest:!1})));const M=this._backgroundBox,m=M.material;let p=!1;const y=e.background;y?y.isColor&&(m.color.copy(y),e.background=null,p=!0):(m.color.copy(iu),p=!0);for(let b=0;b<6;b++){const x=b%3;x===0?(l.up.set(0,c[b],0),l.position.set(a.x,a.y,a.z),l.lookAt(a.x+h[b],a.y,a.z)):x===1?(l.up.set(0,0,c[b]),l.position.set(a.x,a.y,a.z),l.lookAt(a.x,a.y+h[b],a.z)):(l.up.set(0,c[b],0),l.position.set(a.x,a.y,a.z),l.lookAt(a.x,a.y,a.z+h[b]));const A=this._cubeSize;es(s,x*A,b>2?A:0,A,A),f.setRenderTarget(s),p&&f.render(M,l),f.render(e,l)}f.toneMapping=d,f.autoClear=u,e.background=y}_textureToCubeUV(e,t){const i=this._renderer,s=e.mapping===bi||e.mapping===fs;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=ou()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=au());const a=s?this._cubemapMaterial:this._equirectMaterial,r=this._lodMeshes[0];r.material=a;const o=a.uniforms;o.envMap.value=e;const l=this._cubeSize;es(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(r,Bs)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const s=this._lodMeshes.length;for(let a=1;a<s;a++)this._applyGGXFilter(e,a-1,a);t.autoClear=i}_applyGGXFilter(e,t,i){const s=this._renderer,a=this._pingPongRenderTarget,r=this._ggxMaterial,o=this._lodMeshes[i];o.material=r;const l=r.uniforms,c=i/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),f=Math.sqrt(c*c-h*h),u=0+c*1.25,d=f*u,{_lodMax:g}=this,M=this._sizeLods[i],m=3*M*(i>g-ii?i-g+ii:0),p=4*(this._cubeSize-M);l.envMap.value=e.texture,l.roughness.value=d,l.mipInt.value=g-t,es(a,m,p,3*M,2*M),s.setRenderTarget(a),s.render(o,Bs),l.envMap.value=a.texture,l.roughness.value=0,l.mipInt.value=g-i,es(e,m,p,3*M,2*M),s.setRenderTarget(e),s.render(o,Bs)}_blur(e,t,i,s,a){const r=this._pingPongRenderTarget;this._halfBlur(e,r,t,i,s,"latitudinal",a),this._halfBlur(r,e,i,i,s,"longitudinal",a)}_halfBlur(e,t,i,s,a,r,o){const l=this._renderer,c=this._blurMaterial;r!=="latitudinal"&&r!=="longitudinal"&&Fe("blur direction must be either latitudinal or longitudinal!");const h=3,f=this._lodMeshes[s];f.material=c;const u=c.uniforms,d=this._sizeLods[i]-1,g=isFinite(a)?Math.PI/(2*d):2*Math.PI/(2*gi-1),M=a/g,m=isFinite(a)?1+Math.floor(h*M):gi;m>gi&&Ae(`sigmaRadians, ${a}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${gi}`);const p=[];let y=0;for(let R=0;R<gi;++R){const _=R/M,T=Math.exp(-_*_/2);p.push(T),R===0?y+=T:R<m&&(y+=2*T)}for(let R=0;R<p.length;R++)p[R]=p[R]/y;u.envMap.value=e.texture,u.samples.value=m,u.weights.value=p,u.latitudinal.value=r==="latitudinal",o&&(u.poleAxis.value=o);const{_lodMax:b}=this;u.dTheta.value=g,u.mipInt.value=b-i;const x=this._sizeLods[s],A=3*x*(s>b-ii?s-b+ii:0),E=4*(this._cubeSize-x);es(t,A,E,3*x,2*x),l.setRenderTarget(t),l.render(f,Bs)}}function Vv(n){const e=[],t=[],i=[];let s=n;const a=n-ii+1+nu.length;for(let r=0;r<a;r++){const o=Math.pow(2,s);e.push(o);let l=1/o;r>n-ii?l=nu[r-n+ii-1]:r===0&&(l=0),t.push(l);const c=1/(o-2),h=-c,f=1+c,u=[h,h,f,h,f,f,h,h,f,f,h,f],d=6,g=6,M=3,m=2,p=1,y=new Float32Array(M*g*d),b=new Float32Array(m*g*d),x=new Float32Array(p*g*d);for(let E=0;E<d;E++){const R=E%3*2/3-1,_=E>2?0:-1,T=[R,_,0,R+2/3,_,0,R+2/3,_+1,0,R,_,0,R+2/3,_+1,0,R,_+1,0];y.set(T,M*g*E),b.set(u,m*g*E);const P=[E,E,E,E,E,E];x.set(P,p*g*E)}const A=new gt;A.setAttribute("position",new jt(y,M)),A.setAttribute("uv",new jt(b,m)),A.setAttribute("faceIndex",new jt(x,p)),i.push(new yt(A,null)),s>ii&&s--}return{lodMeshes:i,sizeLods:e,sigmas:t}}function ru(n,e,t){const i=new xn(n,e,t);return i.texture.mapping=Fa,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function es(n,e,t,i,s){n.viewport.set(e,t,i,s),n.scissor.set(e,t,i,s)}function Hv(n,e,t){return new Sn({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:zv,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:za(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Fn,depthTest:!1,depthWrite:!1})}function Gv(n,e,t){const i=new Float32Array(gi),s=new C(0,1,0);return new Sn({name:"SphericalGaussianBlur",defines:{n:gi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:za(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Fn,depthTest:!1,depthWrite:!1})}function au(){return new Sn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:za(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Fn,depthTest:!1,depthWrite:!1})}function ou(){return new Sn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:za(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Fn,depthTest:!1,depthWrite:!1})}function za(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class jf extends xn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},s=[i,i,i,i,i,i];this.texture=new yf(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new ys(5,5,5),a=new Sn({name:"CubemapFromEquirect",uniforms:gs(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:zt,blending:Fn});a.uniforms.tEquirect.value=t;const r=new yt(s,a),o=t.minFilter;return t.minFilter===vi&&(t.minFilter=Ut),new k0(1,10,this).update(e,r),t.minFilter=o,r.geometry.dispose(),r.material.dispose(),this}clear(e,t=!0,i=!0,s=!0){const a=e.getRenderTarget();for(let r=0;r<6;r++)e.setRenderTarget(this,r),e.clear(t,i,s);e.setRenderTarget(a)}}function Wv(n){let e=new WeakMap,t=new WeakMap,i=null;function s(u,d=!1){return u==null?null:d?r(u):a(u)}function a(u){if(u&&u.isTexture){const d=u.mapping;if(d===Ya||d===$a)if(e.has(u)){const g=e.get(u).texture;return o(g,u.mapping)}else{const g=u.image;if(g&&g.height>0){const M=new jf(g.height);return M.fromEquirectangularTexture(n,u),e.set(u,M),u.addEventListener("dispose",c),o(M.texture,u.mapping)}else return null}}return u}function r(u){if(u&&u.isTexture){const d=u.mapping,g=d===Ya||d===$a,M=d===bi||d===fs;if(g||M){let m=t.get(u);const p=m!==void 0?m.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==p)return i===null&&(i=new su(n)),m=g?i.fromEquirectangular(u,m):i.fromCubemap(u,m),m.texture.pmremVersion=u.pmremVersion,t.set(u,m),m.texture;if(m!==void 0)return m.texture;{const y=u.image;return g&&y&&y.height>0||M&&y&&l(y)?(i===null&&(i=new su(n)),m=g?i.fromEquirectangular(u):i.fromCubemap(u),m.texture.pmremVersion=u.pmremVersion,t.set(u,m),u.addEventListener("dispose",h),m.texture):null}}}return u}function o(u,d){return d===Ya?u.mapping=bi:d===$a&&(u.mapping=fs),u}function l(u){let d=0;const g=6;for(let M=0;M<g;M++)u[M]!==void 0&&d++;return d===g}function c(u){const d=u.target;d.removeEventListener("dispose",c);const g=e.get(d);g!==void 0&&(e.delete(d),g.dispose())}function h(u){const d=u.target;d.removeEventListener("dispose",h);const g=t.get(d);g!==void 0&&(t.delete(d),g.dispose())}function f(){e=new WeakMap,t=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:s,dispose:f}}function Xv(n){const e={};function t(i){if(e[i]!==void 0)return e[i];const s=n.getExtension(i);return e[i]=s,s}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const s=t(i);return s===null&&ls("WebGLRenderer: "+i+" extension not supported."),s}}}function qv(n,e,t,i){const s={},a=new WeakMap;function r(f){const u=f.target;u.index!==null&&e.remove(u.index);for(const g in u.attributes)e.remove(u.attributes[g]);u.removeEventListener("dispose",r),delete s[u.id];const d=a.get(u);d&&(e.remove(d),a.delete(u)),i.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,t.memory.geometries--}function o(f,u){return s[u.id]===!0||(u.addEventListener("dispose",r),s[u.id]=!0,t.memory.geometries++),u}function l(f){const u=f.attributes;for(const d in u)e.update(u[d],n.ARRAY_BUFFER)}function c(f){const u=[],d=f.index,g=f.attributes.position;let M=0;if(g===void 0)return;if(d!==null){const y=d.array;M=d.version;for(let b=0,x=y.length;b<x;b+=3){const A=y[b+0],E=y[b+1],R=y[b+2];u.push(A,E,E,R,R,A)}}else{const y=g.array;M=g.version;for(let b=0,x=y.length/3-1;b<x;b+=3){const A=b+0,E=b+1,R=b+2;u.push(A,E,E,R,R,A)}}const m=new(g.count>=65535?_f:cc)(u,1);m.version=M;const p=a.get(f);p&&e.remove(p),a.set(f,m)}function h(f){const u=a.get(f);if(u){const d=f.index;d!==null&&u.version<d.version&&c(f)}else c(f);return a.get(f)}return{get:o,update:l,getWireframeAttribute:h}}function Yv(n,e,t){let i;function s(f){i=f}let a,r;function o(f){a=f.type,r=f.bytesPerElement}function l(f,u){n.drawElements(i,u,a,f*r),t.update(u,i,1)}function c(f,u,d){d!==0&&(n.drawElementsInstanced(i,u,a,f*r,d),t.update(u,i,d))}function h(f,u,d){if(d===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,u,0,a,f,0,d);let M=0;for(let m=0;m<d;m++)M+=u[m];t.update(M,i,1)}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function $v(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(a,r,o){switch(t.calls++,r){case n.TRIANGLES:t.triangles+=o*(a/3);break;case n.LINES:t.lines+=o*(a/2);break;case n.LINE_STRIP:t.lines+=o*(a-1);break;case n.LINE_LOOP:t.lines+=o*a;break;case n.POINTS:t.points+=o*a;break;default:Fe("WebGLInfo: Unknown draw mode:",r);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:i}}function Kv(n,e,t){const i=new WeakMap,s=new lt;function a(r,o,l){const c=r.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,f=h!==void 0?h.length:0;let u=i.get(o);if(u===void 0||u.count!==f){let T=function(){R.dispose(),i.delete(o),o.removeEventListener("dispose",T)};u!==void 0&&u.texture.dispose();const d=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,M=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],y=o.morphAttributes.color||[];let b=0;d===!0&&(b=1),g===!0&&(b=2),M===!0&&(b=3);let x=o.attributes.position.count*b,A=1;x>e.maxTextureSize&&(A=Math.ceil(x/e.maxTextureSize),x=e.maxTextureSize);const E=new Float32Array(x*A*4*f),R=new df(E,x,A,f);R.type=Jt,R.needsUpdate=!0;const _=b*4;for(let P=0;P<f;P++){const I=m[P],N=p[P],B=y[P],X=x*A*4*P;for(let F=0;F<I.count;F++){const W=F*_;d===!0&&(s.fromBufferAttribute(I,F),E[X+W+0]=s.x,E[X+W+1]=s.y,E[X+W+2]=s.z,E[X+W+3]=0),g===!0&&(s.fromBufferAttribute(N,F),E[X+W+4]=s.x,E[X+W+5]=s.y,E[X+W+6]=s.z,E[X+W+7]=0),M===!0&&(s.fromBufferAttribute(B,F),E[X+W+8]=s.x,E[X+W+9]=s.y,E[X+W+10]=s.z,E[X+W+11]=B.itemSize===4?s.w:1)}}u={count:f,texture:R,size:new ne(x,A)},i.set(o,u),o.addEventListener("dispose",T)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",r.morphTexture,t);else{let d=0;for(let M=0;M<c.length;M++)d+=c[M];const g=o.morphTargetsRelative?1:1-d;l.getUniforms().setValue(n,"morphTargetBaseInfluence",g),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",u.texture,t),l.getUniforms().setValue(n,"morphTargetsTextureSize",u.size)}return{update:a}}function Jv(n,e,t,i,s){let a=new WeakMap;function r(c){const h=s.render.frame,f=c.geometry,u=e.get(c,f);if(a.get(u)!==h&&(e.update(u),a.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),a.get(c)!==h&&(t.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,n.ARRAY_BUFFER),a.set(c,h))),c.isSkinnedMesh){const d=c.skeleton;a.get(d)!==h&&(d.update(),a.set(d,h))}return u}function o(){a=new WeakMap}function l(c){const h=c.target;h.removeEventListener("dispose",l),i.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:r,dispose:o}}const Zv={[Zu]:"LINEAR_TONE_MAPPING",[Qu]:"REINHARD_TONE_MAPPING",[ju]:"CINEON_TONE_MAPPING",[ef]:"ACES_FILMIC_TONE_MAPPING",[nf]:"AGX_TONE_MAPPING",[sf]:"NEUTRAL_TONE_MAPPING",[tf]:"CUSTOM_TONE_MAPPING"};function Qv(n,e,t,i,s,a){const r=new xn(e,t,{type:n,depthBuffer:s,stencilBuffer:a,samples:i?4:0,depthTexture:s?new ps(e,t):void 0}),o=new xn(e,t,{type:Bn,depthBuffer:!1,stencilBuffer:!1}),l=new gt;l.setAttribute("position",new Be([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new Be([0,2,0,0,2,0],2));const c=new y0({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),h=new yt(l,c),f=new Sc(-1,1,1,-1,0,1);let u=null,d=null,g=!1,M,m=null,p=[],y=!1;this.setSize=function(b,x){r.setSize(b,x),o.setSize(b,x);for(let A=0;A<p.length;A++){const E=p[A];E.setSize&&E.setSize(b,x)}},this.setEffects=function(b){p=b,y=p.length>0&&p[0].isRenderPass===!0;const x=r.width,A=r.height;for(let E=0;E<p.length;E++){const R=p[E];R.setSize&&R.setSize(x,A)}},this.begin=function(b,x){if(g||b.toneMapping===vn&&p.length===0)return!1;if(m=x,x!==null){const A=x.width,E=x.height;(r.width!==A||r.height!==E)&&this.setSize(A,E)}return y===!1&&b.setRenderTarget(r),M=b.toneMapping,b.toneMapping=vn,!0},this.hasRenderPass=function(){return y},this.end=function(b,x){b.toneMapping=M,g=!0;let A=r,E=o;for(let R=0;R<p.length;R++){const _=p[R];if(_.enabled!==!1&&(_.render(b,E,A,x),_.needsSwap!==!1)){const T=A;A=E,E=T}}if(u!==b.outputColorSpace||d!==b.toneMapping){u=b.outputColorSpace,d=b.toneMapping,c.defines={},je.getTransfer(u)===it&&(c.defines.SRGB_TRANSFER="");const R=Zv[d];R&&(c.defines[R]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=A.texture,b.setRenderTarget(m),b.render(h,f),m=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){r.depthTexture&&r.depthTexture.dispose(),r.dispose(),o.dispose(),l.dispose(),c.dispose()}}const ed=new It,kl=new ps(1,1),td=new df,nd=new pm,id=new yf,lu=[],cu=[],hu=new Float32Array(16),uu=new Float32Array(9),fu=new Float32Array(4);function As(n,e,t){const i=n[0];if(i<=0||i>0)return n;const s=e*t;let a=lu[s];if(a===void 0&&(a=new Float32Array(s),lu[s]=a),e!==0){i.toArray(a,0);for(let r=1,o=0;r!==e;++r)o+=t,n[r].toArray(a,o)}return a}function At(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function wt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function ka(n,e){let t=cu[e];t===void 0&&(t=new Int32Array(e),cu[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function jv(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function ex(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(At(t,e))return;n.uniform2fv(this.addr,e),wt(t,e)}}function tx(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(At(t,e))return;n.uniform3fv(this.addr,e),wt(t,e)}}function nx(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(At(t,e))return;n.uniform4fv(this.addr,e),wt(t,e)}}function ix(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(At(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),wt(t,e)}else{if(At(t,i))return;fu.set(i),n.uniformMatrix2fv(this.addr,!1,fu),wt(t,i)}}function sx(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(At(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),wt(t,e)}else{if(At(t,i))return;uu.set(i),n.uniformMatrix3fv(this.addr,!1,uu),wt(t,i)}}function rx(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(At(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),wt(t,e)}else{if(At(t,i))return;hu.set(i),n.uniformMatrix4fv(this.addr,!1,hu),wt(t,i)}}function ax(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function ox(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(At(t,e))return;n.uniform2iv(this.addr,e),wt(t,e)}}function lx(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(At(t,e))return;n.uniform3iv(this.addr,e),wt(t,e)}}function cx(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(At(t,e))return;n.uniform4iv(this.addr,e),wt(t,e)}}function hx(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function ux(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(At(t,e))return;n.uniform2uiv(this.addr,e),wt(t,e)}}function fx(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(At(t,e))return;n.uniform3uiv(this.addr,e),wt(t,e)}}function dx(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(At(t,e))return;n.uniform4uiv(this.addr,e),wt(t,e)}}function px(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let a;this.type===n.SAMPLER_2D_SHADOW?(kl.compareFunction=t.isReversedDepthBuffer()?rc:sc,a=kl):a=ed,t.setTexture2D(e||a,s)}function mx(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture3D(e||nd,s)}function gx(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTextureCube(e||id,s)}function _x(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture2DArray(e||td,s)}function vx(n){switch(n){case 5126:return jv;case 35664:return ex;case 35665:return tx;case 35666:return nx;case 35674:return ix;case 35675:return sx;case 35676:return rx;case 5124:case 35670:return ax;case 35667:case 35671:return ox;case 35668:case 35672:return lx;case 35669:case 35673:return cx;case 5125:return hx;case 36294:return ux;case 36295:return fx;case 36296:return dx;case 35678:case 36198:case 36298:case 36306:case 35682:return px;case 35679:case 36299:case 36307:return mx;case 35680:case 36300:case 36308:case 36293:return gx;case 36289:case 36303:case 36311:case 36292:return _x}}function xx(n,e){n.uniform1fv(this.addr,e)}function Mx(n,e){const t=As(e,this.size,2);n.uniform2fv(this.addr,t)}function yx(n,e){const t=As(e,this.size,3);n.uniform3fv(this.addr,t)}function Sx(n,e){const t=As(e,this.size,4);n.uniform4fv(this.addr,t)}function bx(n,e){const t=As(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function Ex(n,e){const t=As(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function Tx(n,e){const t=As(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function Ax(n,e){n.uniform1iv(this.addr,e)}function wx(n,e){n.uniform2iv(this.addr,e)}function Rx(n,e){n.uniform3iv(this.addr,e)}function Px(n,e){n.uniform4iv(this.addr,e)}function Cx(n,e){n.uniform1uiv(this.addr,e)}function Ix(n,e){n.uniform2uiv(this.addr,e)}function Lx(n,e){n.uniform3uiv(this.addr,e)}function Dx(n,e){n.uniform4uiv(this.addr,e)}function Nx(n,e,t){const i=this.cache,s=e.length,a=ka(t,s);At(i,a)||(n.uniform1iv(this.addr,a),wt(i,a));let r;this.type===n.SAMPLER_2D_SHADOW?r=kl:r=ed;for(let o=0;o!==s;++o)t.setTexture2D(e[o]||r,a[o])}function Ux(n,e,t){const i=this.cache,s=e.length,a=ka(t,s);At(i,a)||(n.uniform1iv(this.addr,a),wt(i,a));for(let r=0;r!==s;++r)t.setTexture3D(e[r]||nd,a[r])}function Fx(n,e,t){const i=this.cache,s=e.length,a=ka(t,s);At(i,a)||(n.uniform1iv(this.addr,a),wt(i,a));for(let r=0;r!==s;++r)t.setTextureCube(e[r]||id,a[r])}function Ox(n,e,t){const i=this.cache,s=e.length,a=ka(t,s);At(i,a)||(n.uniform1iv(this.addr,a),wt(i,a));for(let r=0;r!==s;++r)t.setTexture2DArray(e[r]||td,a[r])}function Bx(n){switch(n){case 5126:return xx;case 35664:return Mx;case 35665:return yx;case 35666:return Sx;case 35674:return bx;case 35675:return Ex;case 35676:return Tx;case 5124:case 35670:return Ax;case 35667:case 35671:return wx;case 35668:case 35672:return Rx;case 35669:case 35673:return Px;case 5125:return Cx;case 36294:return Ix;case 36295:return Lx;case 36296:return Dx;case 35678:case 36198:case 36298:case 36306:case 35682:return Nx;case 35679:case 36299:case 36307:return Ux;case 35680:case 36300:case 36308:case 36293:return Fx;case 36289:case 36303:case 36311:case 36292:return Ox}}class zx{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=vx(t.type)}}class kx{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Bx(t.type)}}class Vx{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const s=this.seq;for(let a=0,r=s.length;a!==r;++a){const o=s[a];o.setValue(e,t[o.id],i)}}}const No=/(\w+)(\])?(\[|\.)?/g;function du(n,e){n.seq.push(e),n.map[e.id]=e}function Hx(n,e,t){const i=n.name,s=i.length;for(No.lastIndex=0;;){const a=No.exec(i),r=No.lastIndex;let o=a[1];const l=a[2]==="]",c=a[3];if(l&&(o=o|0),c===void 0||c==="["&&r+2===s){du(t,c===void 0?new zx(o,n,e):new kx(o,n,e));break}else{let f=t.map[o];f===void 0&&(f=new Vx(o),du(t,f)),t=f}}}class la{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const o=e.getActiveUniform(t,r),l=e.getUniformLocation(t,o.name);Hx(o,l,this)}const s=[],a=[];for(const r of this.seq)r.type===e.SAMPLER_2D_SHADOW||r.type===e.SAMPLER_CUBE_SHADOW||r.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(r):a.push(r);s.length>0&&(this.seq=s.concat(a))}setValue(e,t,i,s){const a=this.map[t];a!==void 0&&a.setValue(e,i,s)}setOptional(e,t,i){const s=t[i];s!==void 0&&this.setValue(e,i,s)}static upload(e,t,i,s){for(let a=0,r=t.length;a!==r;++a){const o=t[a],l=i[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,s)}}static seqWithValue(e,t){const i=[];for(let s=0,a=e.length;s!==a;++s){const r=e[s];r.id in t&&i.push(r)}return i}}function pu(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const Gx=37297;let Wx=0;function Xx(n,e){const t=n.split(`
`),i=[],s=Math.max(e-6,0),a=Math.min(e+6,t.length);for(let r=s;r<a;r++){const o=r+1;i.push(`${o===e?">":" "} ${o}: ${t[r]}`)}return i.join(`
`)}const mu=new We;function qx(n){je._getMatrix(mu,je.workingColorSpace,n);const e=`mat3( ${mu.elements.map(t=>t.toFixed(4))} )`;switch(je.getTransfer(n)){case va:return[e,"LinearTransferOETF"];case it:return[e,"sRGBTransferOETF"];default:return Ae("WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function gu(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),a=(n.getShaderInfoLog(e)||"").trim();if(i&&a==="")return"";const r=/ERROR: 0:(\d+)/.exec(a);if(r){const o=parseInt(r[1]);return t.toUpperCase()+`

`+a+`

`+Xx(n.getShaderSource(e),o)}else return a}function Yx(n,e){const t=qx(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const $x={[Zu]:"Linear",[Qu]:"Reinhard",[ju]:"Cineon",[ef]:"ACESFilmic",[nf]:"AgX",[sf]:"Neutral",[tf]:"Custom"};function Kx(n,e){const t=$x[e];return t===void 0?(Ae("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+n+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const jr=new C;function Jx(){je.getLuminanceCoefficients(jr);const n=jr.x.toFixed(4),e=jr.y.toFixed(4),t=jr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Zx(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ws).join(`
`)}function Qx(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function jx(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){const a=n.getActiveAttrib(e,s),r=a.name;let o=1;a.type===n.FLOAT_MAT2&&(o=2),a.type===n.FLOAT_MAT3&&(o=3),a.type===n.FLOAT_MAT4&&(o=4),t[r]={type:a.type,location:n.getAttribLocation(e,r),locationSize:o}}return t}function Ws(n){return n!==""}function _u(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function vu(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const eM=/^[ \t]*#include +<([\w\d./]+)>/gm;function Vl(n){return n.replace(eM,nM)}const tM=new Map;function nM(n,e){let t=$e[e];if(t===void 0){const i=tM.get(e);if(i!==void 0)t=$e[i],Ae('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return Vl(t)}const iM=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function xu(n){return n.replace(iM,sM)}function sM(n,e,t,i){let s="";for(let a=parseInt(e);a<parseInt(t);a++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+a+" ]").replace(/UNROLLED_LOOP_INDEX/g,a);return s}function Mu(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const rM={[ia]:"SHADOWMAP_TYPE_PCF",[Hs]:"SHADOWMAP_TYPE_VSM"};function aM(n){return rM[n.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const oM={[bi]:"ENVMAP_TYPE_CUBE",[fs]:"ENVMAP_TYPE_CUBE",[Fa]:"ENVMAP_TYPE_CUBE_UV"};function lM(n){return n.envMap===!1?"ENVMAP_TYPE_CUBE":oM[n.envMapMode]||"ENVMAP_TYPE_CUBE"}const cM={[fs]:"ENVMAP_MODE_REFRACTION"};function hM(n){return n.envMap===!1?"ENVMAP_MODE_REFLECTION":cM[n.envMapMode]||"ENVMAP_MODE_REFLECTION"}const uM={[Ju]:"ENVMAP_BLENDING_MULTIPLY",[Pp]:"ENVMAP_BLENDING_MIX",[Cp]:"ENVMAP_BLENDING_ADD"};function fM(n){return n.envMap===!1?"ENVMAP_BLENDING_NONE":uM[n.combine]||"ENVMAP_BLENDING_NONE"}function dM(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function pM(n,e,t,i){const s=n.getContext(),a=t.defines;let r=t.vertexShader,o=t.fragmentShader;const l=aM(t),c=lM(t),h=hM(t),f=fM(t),u=dM(t),d=Zx(t),g=Qx(a),M=s.createProgram();let m,p,y=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Ws).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Ws).join(`
`),p.length>0&&(p+=`
`)):(m=[Mu(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ws).join(`
`),p=[Mu(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+f:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==vn?"#define TONE_MAPPING":"",t.toneMapping!==vn?$e.tonemapping_pars_fragment:"",t.toneMapping!==vn?Kx("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",$e.colorspace_pars_fragment,Yx("linearToOutputTexel",t.outputColorSpace),Jx(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ws).join(`
`)),r=Vl(r),r=_u(r,t),r=vu(r,t),o=Vl(o),o=_u(o,t),o=vu(o,t),r=xu(r),o=xu(o),t.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,m=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===ah?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===ah?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const b=y+m+r,x=y+p+o,A=pu(s,s.VERTEX_SHADER,b),E=pu(s,s.FRAGMENT_SHADER,x);s.attachShader(M,A),s.attachShader(M,E),t.index0AttributeName!==void 0?s.bindAttribLocation(M,0,t.index0AttributeName):t.hasPositionAttribute===!0&&s.bindAttribLocation(M,0,"position"),s.linkProgram(M);function R(I){if(n.debug.checkShaderErrors){const N=s.getProgramInfoLog(M)||"",B=s.getShaderInfoLog(A)||"",X=s.getShaderInfoLog(E)||"",F=N.trim(),W=B.trim(),H=X.trim();let Z=!0,ie=!0;if(s.getProgramParameter(M,s.LINK_STATUS)===!1)if(Z=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,M,A,E);else{const he=gu(s,A,"vertex"),oe=gu(s,E,"fragment");Fe("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(M,s.VALIDATE_STATUS)+`

Material Name: `+I.name+`
Material Type: `+I.type+`

Program Info Log: `+F+`
`+he+`
`+oe)}else F!==""?Ae("WebGLProgram: Program Info Log:",F):(W===""||H==="")&&(ie=!1);ie&&(I.diagnostics={runnable:Z,programLog:F,vertexShader:{log:W,prefix:m},fragmentShader:{log:H,prefix:p}})}s.deleteShader(A),s.deleteShader(E),_=new la(s,M),T=jx(s,M)}let _;this.getUniforms=function(){return _===void 0&&R(this),_};let T;this.getAttributes=function(){return T===void 0&&R(this),T};let P=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return P===!1&&(P=s.getProgramParameter(M,Gx)),P},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(M),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Wx++,this.cacheKey=e,this.usedTimes=1,this.program=M,this.vertexShader=A,this.fragmentShader=E,this}let mM=0;class gM{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,i){const s=this._getShaderCacheForMaterial(e);return s.has(t)===!1&&(s.add(t),t.usedTimes++),s.has(i)===!1&&(s.add(i),i.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new _M(e),t.set(e,i)),i}}class _M{constructor(e){this.id=mM++,this.code=e,this.usedTimes=0}}function vM(n){return n===Ei||n===pa||n===ma}function xM(n,e,t,i,s,a){const r=new lc,o=new gM,l=new Set,c=[],h=new Map,f=i.logarithmicDepthBuffer;let u=i.precision;const d={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(_){return l.add(_),_===0?"uv":`uv${_}`}function M(_,T,P,I,N,B){const X=I.fog,F=N.geometry,W=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?I.environment:null,H=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap,Z=e.get(_.envMap||W,H),ie=Z&&Z.mapping===Fa?Z.image.height:null,he=d[_.type];_.precision!==null&&(u=i.getMaxPrecision(_.precision),u!==_.precision&&Ae("WebGLProgram.getParameters:",_.precision,"not supported, using",u,"instead."));const oe=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,ye=oe!==void 0?oe.length:0;let Je=0;F.morphAttributes.position!==void 0&&(Je=1),F.morphAttributes.normal!==void 0&&(Je=2),F.morphAttributes.color!==void 0&&(Je=3);let ht,et,K,le;if(he){const Ee=pn[he];ht=Ee.vertexShader,et=Ee.fragmentShader}else{ht=_.vertexShader,et=_.fragmentShader;const Ee=o.getVertexShaderStage(_),xt=o.getFragmentShaderStage(_);o.update(_,Ee,xt),K=Ee.id,le=xt.id}const se=n.getRenderTarget(),Ie=n.state.buffers.depth.getReversed(),ze=N.isInstancedMesh===!0,Ne=N.isBatchedMesh===!0,nt=!!_.map,Ve=!!_.matcap,Q=!!Z,te=!!_.aoMap,ee=!!_.lightMap,_e=!!_.bumpMap&&_.wireframe===!1,pe=!!_.normalMap,Ue=!!_.displacementMap,Re=!!_.emissiveMap,ke=!!_.metalnessMap,Ge=!!_.roughnessMap,L=_.anisotropy>0,rt=_.clearcoat>0,Qe=_.dispersion>0,w=_.iridescence>0,v=_.sheen>0,O=_.transmission>0,V=L&&!!_.anisotropyMap,q=rt&&!!_.clearcoatMap,re=rt&&!!_.clearcoatNormalMap,ae=rt&&!!_.clearcoatRoughnessMap,Y=w&&!!_.iridescenceMap,J=w&&!!_.iridescenceThicknessMap,ue=v&&!!_.sheenColorMap,Pe=v&&!!_.sheenRoughnessMap,me=!!_.specularMap,fe=!!_.specularColorMap,De=!!_.specularIntensityMap,Oe=O&&!!_.transmissionMap,Xe=O&&!!_.thicknessMap,D=!!_.gradientMap,ce=!!_.alphaMap,$=_.alphaTest>0,de=!!_.alphaHash,Me=!!_.extensions;let j=vn;_.toneMapped&&(se===null||se.isXRRenderTarget===!0)&&(j=n.toneMapping);const we={shaderID:he,shaderType:_.type,shaderName:_.name,vertexShader:ht,fragmentShader:et,defines:_.defines,customVertexShaderID:K,customFragmentShaderID:le,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:u,batching:Ne,batchingColor:Ne&&N._colorsTexture!==null,instancing:ze,instancingColor:ze&&N.instanceColor!==null,instancingMorph:ze&&N.morphTexture!==null,outputColorSpace:se===null?n.outputColorSpace:se.isXRRenderTarget===!0?se.texture.colorSpace:je.workingColorSpace,alphaToCoverage:!!_.alphaToCoverage,map:nt,matcap:Ve,envMap:Q,envMapMode:Q&&Z.mapping,envMapCubeUVHeight:ie,aoMap:te,lightMap:ee,bumpMap:_e,normalMap:pe,displacementMap:Ue,emissiveMap:Re,normalMapObjectSpace:pe&&_.normalMapType===Up,normalMapTangentSpace:pe&&_.normalMapType===Dl,packedNormalMap:pe&&_.normalMapType===Dl&&vM(_.normalMap.format),metalnessMap:ke,roughnessMap:Ge,anisotropy:L,anisotropyMap:V,clearcoat:rt,clearcoatMap:q,clearcoatNormalMap:re,clearcoatRoughnessMap:ae,dispersion:Qe,iridescence:w,iridescenceMap:Y,iridescenceThicknessMap:J,sheen:v,sheenColorMap:ue,sheenRoughnessMap:Pe,specularMap:me,specularColorMap:fe,specularIntensityMap:De,transmission:O,transmissionMap:Oe,thicknessMap:Xe,gradientMap:D,opaque:_.transparent===!1&&_.blending===os&&_.alphaToCoverage===!1,alphaMap:ce,alphaTest:$,alphaHash:de,combine:_.combine,mapUv:nt&&g(_.map.channel),aoMapUv:te&&g(_.aoMap.channel),lightMapUv:ee&&g(_.lightMap.channel),bumpMapUv:_e&&g(_.bumpMap.channel),normalMapUv:pe&&g(_.normalMap.channel),displacementMapUv:Ue&&g(_.displacementMap.channel),emissiveMapUv:Re&&g(_.emissiveMap.channel),metalnessMapUv:ke&&g(_.metalnessMap.channel),roughnessMapUv:Ge&&g(_.roughnessMap.channel),anisotropyMapUv:V&&g(_.anisotropyMap.channel),clearcoatMapUv:q&&g(_.clearcoatMap.channel),clearcoatNormalMapUv:re&&g(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ae&&g(_.clearcoatRoughnessMap.channel),iridescenceMapUv:Y&&g(_.iridescenceMap.channel),iridescenceThicknessMapUv:J&&g(_.iridescenceThicknessMap.channel),sheenColorMapUv:ue&&g(_.sheenColorMap.channel),sheenRoughnessMapUv:Pe&&g(_.sheenRoughnessMap.channel),specularMapUv:me&&g(_.specularMap.channel),specularColorMapUv:fe&&g(_.specularColorMap.channel),specularIntensityMapUv:De&&g(_.specularIntensityMap.channel),transmissionMapUv:Oe&&g(_.transmissionMap.channel),thicknessMapUv:Xe&&g(_.thicknessMap.channel),alphaMapUv:ce&&g(_.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(pe||L),vertexNormals:!!F.attributes.normal,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,pointsUvs:N.isPoints===!0&&!!F.attributes.uv&&(nt||ce),fog:!!X,useFog:_.fog===!0,fogExp2:!!X&&X.isFogExp2,flatShading:_.wireframe===!1&&(_.flatShading===!0||F.attributes.normal===void 0&&pe===!1&&(_.isMeshLambertMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isMeshPhysicalMaterial)),sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:Ie,skinning:N.isSkinnedMesh===!0,hasPositionAttribute:F.attributes.position!==void 0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:ye,morphTextureStride:Je,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numSpotLightMaps:T.spotLightMap.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numSpotLightShadowsWithMaps:T.numSpotLightShadowsWithMaps,numLightProbes:T.numLightProbes,numLightProbeGrids:B.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:_.dithering,shadowMapEnabled:n.shadowMap.enabled&&P.length>0,shadowMapType:n.shadowMap.type,toneMapping:j,decodeVideoTexture:nt&&_.map.isVideoTexture===!0&&je.getTransfer(_.map.colorSpace)===it,decodeVideoTextureEmissive:Re&&_.emissiveMap.isVideoTexture===!0&&je.getTransfer(_.emissiveMap.colorSpace)===it,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===Ln,flipSided:_.side===zt,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:Me&&_.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Me&&_.extensions.multiDraw===!0||Ne)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return we.vertexUv1s=l.has(1),we.vertexUv2s=l.has(2),we.vertexUv3s=l.has(3),l.clear(),we}function m(_){const T=[];if(_.shaderID?T.push(_.shaderID):(T.push(_.customVertexShaderID),T.push(_.customFragmentShaderID)),_.defines!==void 0)for(const P in _.defines)T.push(P),T.push(_.defines[P]);return _.isRawShaderMaterial===!1&&(p(T,_),y(T,_),T.push(n.outputColorSpace)),T.push(_.customProgramCacheKey),T.join()}function p(_,T){_.push(T.precision),_.push(T.outputColorSpace),_.push(T.envMapMode),_.push(T.envMapCubeUVHeight),_.push(T.mapUv),_.push(T.alphaMapUv),_.push(T.lightMapUv),_.push(T.aoMapUv),_.push(T.bumpMapUv),_.push(T.normalMapUv),_.push(T.displacementMapUv),_.push(T.emissiveMapUv),_.push(T.metalnessMapUv),_.push(T.roughnessMapUv),_.push(T.anisotropyMapUv),_.push(T.clearcoatMapUv),_.push(T.clearcoatNormalMapUv),_.push(T.clearcoatRoughnessMapUv),_.push(T.iridescenceMapUv),_.push(T.iridescenceThicknessMapUv),_.push(T.sheenColorMapUv),_.push(T.sheenRoughnessMapUv),_.push(T.specularMapUv),_.push(T.specularColorMapUv),_.push(T.specularIntensityMapUv),_.push(T.transmissionMapUv),_.push(T.thicknessMapUv),_.push(T.combine),_.push(T.fogExp2),_.push(T.sizeAttenuation),_.push(T.morphTargetsCount),_.push(T.morphAttributeCount),_.push(T.numDirLights),_.push(T.numPointLights),_.push(T.numSpotLights),_.push(T.numSpotLightMaps),_.push(T.numHemiLights),_.push(T.numRectAreaLights),_.push(T.numDirLightShadows),_.push(T.numPointLightShadows),_.push(T.numSpotLightShadows),_.push(T.numSpotLightShadowsWithMaps),_.push(T.numLightProbes),_.push(T.shadowMapType),_.push(T.toneMapping),_.push(T.numClippingPlanes),_.push(T.numClipIntersection),_.push(T.depthPacking)}function y(_,T){r.disableAll(),T.instancing&&r.enable(0),T.instancingColor&&r.enable(1),T.instancingMorph&&r.enable(2),T.matcap&&r.enable(3),T.envMap&&r.enable(4),T.normalMapObjectSpace&&r.enable(5),T.normalMapTangentSpace&&r.enable(6),T.clearcoat&&r.enable(7),T.iridescence&&r.enable(8),T.alphaTest&&r.enable(9),T.vertexColors&&r.enable(10),T.vertexAlphas&&r.enable(11),T.vertexUv1s&&r.enable(12),T.vertexUv2s&&r.enable(13),T.vertexUv3s&&r.enable(14),T.vertexTangents&&r.enable(15),T.anisotropy&&r.enable(16),T.alphaHash&&r.enable(17),T.batching&&r.enable(18),T.dispersion&&r.enable(19),T.batchingColor&&r.enable(20),T.gradientMap&&r.enable(21),T.packedNormalMap&&r.enable(22),T.vertexNormals&&r.enable(23),_.push(r.mask),r.disableAll(),T.fog&&r.enable(0),T.useFog&&r.enable(1),T.flatShading&&r.enable(2),T.logarithmicDepthBuffer&&r.enable(3),T.reversedDepthBuffer&&r.enable(4),T.skinning&&r.enable(5),T.morphTargets&&r.enable(6),T.morphNormals&&r.enable(7),T.morphColors&&r.enable(8),T.premultipliedAlpha&&r.enable(9),T.shadowMapEnabled&&r.enable(10),T.doubleSided&&r.enable(11),T.flipSided&&r.enable(12),T.useDepthPacking&&r.enable(13),T.dithering&&r.enable(14),T.transmission&&r.enable(15),T.sheen&&r.enable(16),T.opaque&&r.enable(17),T.pointsUvs&&r.enable(18),T.decodeVideoTexture&&r.enable(19),T.decodeVideoTextureEmissive&&r.enable(20),T.alphaToCoverage&&r.enable(21),T.numLightProbeGrids>0&&r.enable(22),T.hasPositionAttribute&&r.enable(23),_.push(r.mask)}function b(_){const T=d[_.type];let P;if(T){const I=pn[T];P=v0.clone(I.uniforms)}else P=_.uniforms;return P}function x(_,T){let P=h.get(T);return P!==void 0?++P.usedTimes:(P=new pM(n,T,_,s),c.push(P),h.set(T,P)),P}function A(_){if(--_.usedTimes===0){const T=c.indexOf(_);c[T]=c[c.length-1],c.pop(),h.delete(_.cacheKey),_.destroy()}}function E(_){o.remove(_)}function R(){o.dispose()}return{getParameters:M,getProgramCacheKey:m,getUniforms:b,acquireProgram:x,releaseProgram:A,releaseShaderCache:E,programs:c,dispose:R}}function MM(){let n=new WeakMap;function e(r){return n.has(r)}function t(r){let o=n.get(r);return o===void 0&&(o={},n.set(r,o)),o}function i(r){n.delete(r)}function s(r,o,l){n.get(r)[o]=l}function a(){n=new WeakMap}return{has:e,get:t,remove:i,update:s,dispose:a}}function yM(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.materialVariant!==e.materialVariant?n.materialVariant-e.materialVariant:n.z!==e.z?n.z-e.z:n.id-e.id}function yu(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function Su(){const n=[];let e=0;const t=[],i=[],s=[];function a(){e=0,t.length=0,i.length=0,s.length=0}function r(u){let d=0;return u.isInstancedMesh&&(d+=2),u.isSkinnedMesh&&(d+=1),d}function o(u,d,g,M,m,p){let y=n[e];return y===void 0?(y={id:u.id,object:u,geometry:d,material:g,materialVariant:r(u),groupOrder:M,renderOrder:u.renderOrder,z:m,group:p},n[e]=y):(y.id=u.id,y.object=u,y.geometry=d,y.material=g,y.materialVariant=r(u),y.groupOrder=M,y.renderOrder=u.renderOrder,y.z=m,y.group=p),e++,y}function l(u,d,g,M,m,p){const y=o(u,d,g,M,m,p);g.transmission>0?i.push(y):g.transparent===!0?s.push(y):t.push(y)}function c(u,d,g,M,m,p){const y=o(u,d,g,M,m,p);g.transmission>0?i.unshift(y):g.transparent===!0?s.unshift(y):t.unshift(y)}function h(u,d,g){t.length>1&&t.sort(u||yM),i.length>1&&i.sort(d||yu),s.length>1&&s.sort(d||yu),g&&(t.reverse(),i.reverse(),s.reverse())}function f(){for(let u=e,d=n.length;u<d;u++){const g=n[u];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:t,transmissive:i,transparent:s,init:a,push:l,unshift:c,finish:f,sort:h}}function SM(){let n=new WeakMap;function e(i,s){const a=n.get(i);let r;return a===void 0?(r=new Su,n.set(i,[r])):s>=a.length?(r=new Su,a.push(r)):r=a[s],r}function t(){n=new WeakMap}return{get:e,dispose:t}}function bM(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new C,color:new He};break;case"SpotLight":t={position:new C,direction:new C,color:new He,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new C,color:new He,distance:0,decay:0};break;case"HemisphereLight":t={direction:new C,skyColor:new He,groundColor:new He};break;case"RectAreaLight":t={color:new He,position:new C,halfWidth:new C,halfHeight:new C};break}return n[e.id]=t,t}}}function EM(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ne};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ne};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ne,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let TM=0;function AM(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function wM(n){const e=new bM,t=EM(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new C);const s=new C,a=new Ye,r=new Ye;function o(c){let h=0,f=0,u=0;for(let T=0;T<9;T++)i.probe[T].set(0,0,0);let d=0,g=0,M=0,m=0,p=0,y=0,b=0,x=0,A=0,E=0,R=0;c.sort(AM);for(let T=0,P=c.length;T<P;T++){const I=c[T],N=I.color,B=I.intensity,X=I.distance;let F=null;if(I.shadow&&I.shadow.map&&(I.shadow.map.texture.format===Ei?F=I.shadow.map.texture:F=I.shadow.map.depthTexture||I.shadow.map.texture),I.isAmbientLight)h+=N.r*B,f+=N.g*B,u+=N.b*B;else if(I.isLightProbe){for(let W=0;W<9;W++)i.probe[W].addScaledVector(I.sh.coefficients[W],B);R++}else if(I.isDirectionalLight){const W=e.get(I);if(W.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){const H=I.shadow,Z=t.get(I);Z.shadowIntensity=H.intensity,Z.shadowBias=H.bias,Z.shadowNormalBias=H.normalBias,Z.shadowRadius=H.radius,Z.shadowMapSize=H.mapSize,i.directionalShadow[d]=Z,i.directionalShadowMap[d]=F,i.directionalShadowMatrix[d]=I.shadow.matrix,y++}i.directional[d]=W,d++}else if(I.isSpotLight){const W=e.get(I);W.position.setFromMatrixPosition(I.matrixWorld),W.color.copy(N).multiplyScalar(B),W.distance=X,W.coneCos=Math.cos(I.angle),W.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),W.decay=I.decay,i.spot[M]=W;const H=I.shadow;if(I.map&&(i.spotLightMap[A]=I.map,A++,H.updateMatrices(I),I.castShadow&&E++),i.spotLightMatrix[M]=H.matrix,I.castShadow){const Z=t.get(I);Z.shadowIntensity=H.intensity,Z.shadowBias=H.bias,Z.shadowNormalBias=H.normalBias,Z.shadowRadius=H.radius,Z.shadowMapSize=H.mapSize,i.spotShadow[M]=Z,i.spotShadowMap[M]=F,x++}M++}else if(I.isRectAreaLight){const W=e.get(I);W.color.copy(N).multiplyScalar(B),W.halfWidth.set(I.width*.5,0,0),W.halfHeight.set(0,I.height*.5,0),i.rectArea[m]=W,m++}else if(I.isPointLight){const W=e.get(I);if(W.color.copy(I.color).multiplyScalar(I.intensity),W.distance=I.distance,W.decay=I.decay,I.castShadow){const H=I.shadow,Z=t.get(I);Z.shadowIntensity=H.intensity,Z.shadowBias=H.bias,Z.shadowNormalBias=H.normalBias,Z.shadowRadius=H.radius,Z.shadowMapSize=H.mapSize,Z.shadowCameraNear=H.camera.near,Z.shadowCameraFar=H.camera.far,i.pointShadow[g]=Z,i.pointShadowMap[g]=F,i.pointShadowMatrix[g]=I.shadow.matrix,b++}i.point[g]=W,g++}else if(I.isHemisphereLight){const W=e.get(I);W.skyColor.copy(I.color).multiplyScalar(B),W.groundColor.copy(I.groundColor).multiplyScalar(B),i.hemi[p]=W,p++}}m>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ge.LTC_FLOAT_1,i.rectAreaLTC2=ge.LTC_FLOAT_2):(i.rectAreaLTC1=ge.LTC_HALF_1,i.rectAreaLTC2=ge.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=f,i.ambient[2]=u;const _=i.hash;(_.directionalLength!==d||_.pointLength!==g||_.spotLength!==M||_.rectAreaLength!==m||_.hemiLength!==p||_.numDirectionalShadows!==y||_.numPointShadows!==b||_.numSpotShadows!==x||_.numSpotMaps!==A||_.numLightProbes!==R)&&(i.directional.length=d,i.spot.length=M,i.rectArea.length=m,i.point.length=g,i.hemi.length=p,i.directionalShadow.length=y,i.directionalShadowMap.length=y,i.pointShadow.length=b,i.pointShadowMap.length=b,i.spotShadow.length=x,i.spotShadowMap.length=x,i.directionalShadowMatrix.length=y,i.pointShadowMatrix.length=b,i.spotLightMatrix.length=x+A-E,i.spotLightMap.length=A,i.numSpotLightShadowsWithMaps=E,i.numLightProbes=R,_.directionalLength=d,_.pointLength=g,_.spotLength=M,_.rectAreaLength=m,_.hemiLength=p,_.numDirectionalShadows=y,_.numPointShadows=b,_.numSpotShadows=x,_.numSpotMaps=A,_.numLightProbes=R,i.version=TM++)}function l(c,h){let f=0,u=0,d=0,g=0,M=0;const m=h.matrixWorldInverse;for(let p=0,y=c.length;p<y;p++){const b=c[p];if(b.isDirectionalLight){const x=i.directional[f];x.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(m),f++}else if(b.isSpotLight){const x=i.spot[d];x.position.setFromMatrixPosition(b.matrixWorld),x.position.applyMatrix4(m),x.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(m),d++}else if(b.isRectAreaLight){const x=i.rectArea[g];x.position.setFromMatrixPosition(b.matrixWorld),x.position.applyMatrix4(m),r.identity(),a.copy(b.matrixWorld),a.premultiply(m),r.extractRotation(a),x.halfWidth.set(b.width*.5,0,0),x.halfHeight.set(0,b.height*.5,0),x.halfWidth.applyMatrix4(r),x.halfHeight.applyMatrix4(r),g++}else if(b.isPointLight){const x=i.point[u];x.position.setFromMatrixPosition(b.matrixWorld),x.position.applyMatrix4(m),u++}else if(b.isHemisphereLight){const x=i.hemi[M];x.direction.setFromMatrixPosition(b.matrixWorld),x.direction.transformDirection(m),M++}}}return{setup:o,setupView:l,state:i}}function bu(n){const e=new wM(n),t=[],i=[],s=[];function a(u){f.camera=u,t.length=0,i.length=0,s.length=0}function r(u){t.push(u)}function o(u){i.push(u)}function l(u){s.push(u)}function c(){e.setup(t)}function h(u){e.setupView(t,u)}const f={lightsArray:t,shadowsArray:i,lightProbeGridArray:s,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:f,setupLights:c,setupLightsView:h,pushLight:r,pushShadow:o,pushLightProbeGrid:l}}function RM(n){let e=new WeakMap;function t(s,a=0){const r=e.get(s);let o;return r===void 0?(o=new bu(n),e.set(s,[o])):a>=r.length?(o=new bu(n),r.push(o)):o=r[a],o}function i(){e=new WeakMap}return{get:t,dispose:i}}const PM=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,CM=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,IM=[new C(1,0,0),new C(-1,0,0),new C(0,1,0),new C(0,-1,0),new C(0,0,1),new C(0,0,-1)],LM=[new C(0,-1,0),new C(0,-1,0),new C(0,0,1),new C(0,0,-1),new C(0,-1,0),new C(0,-1,0)],Eu=new Ye,zs=new C,Uo=new C;function DM(n,e,t){let i=new dc;const s=new ne,a=new ne,r=new lt,o=new S0,l=new b0,c={},h=t.maxTextureSize,f={[si]:zt,[zt]:si,[Ln]:Ln},u=new Sn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ne},radius:{value:4}},vertexShader:PM,fragmentShader:CM}),d=u.clone();d.defines.HORIZONTAL_PASS=1;const g=new gt;g.setAttribute("position",new jt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const M=new yt(g,u),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=ia;let p=this.type;this.render=function(E,R,_){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||E.length===0)return;this.type===hp&&(Ae("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=ia);const T=n.getRenderTarget(),P=n.getActiveCubeFace(),I=n.getActiveMipmapLevel(),N=n.state;N.setBlending(Fn),N.buffers.depth.getReversed()===!0?N.buffers.color.setClear(0,0,0,0):N.buffers.color.setClear(1,1,1,1),N.buffers.depth.setTest(!0),N.setScissorTest(!1);const B=p!==this.type;B&&R.traverse(function(X){X.material&&(Array.isArray(X.material)?X.material.forEach(F=>F.needsUpdate=!0):X.material.needsUpdate=!0)});for(let X=0,F=E.length;X<F;X++){const W=E[X],H=W.shadow;if(H===void 0){Ae("WebGLShadowMap:",W,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;s.copy(H.mapSize);const Z=H.getFrameExtents();s.multiply(Z),a.copy(H.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(a.x=Math.floor(h/Z.x),s.x=a.x*Z.x,H.mapSize.x=a.x),s.y>h&&(a.y=Math.floor(h/Z.y),s.y=a.y*Z.y,H.mapSize.y=a.y));const ie=n.state.buffers.depth.getReversed();if(H.camera._reversedDepth=ie,H.map===null||B===!0){if(H.map!==null&&(H.map.depthTexture!==null&&(H.map.depthTexture.dispose(),H.map.depthTexture=null),H.map.dispose()),this.type===Hs){if(W.isPointLight){Ae("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}H.map=new xn(s.x,s.y,{format:Ei,type:Bn,minFilter:Ut,magFilter:Ut,generateMipmaps:!1}),H.map.texture.name=W.name+".shadowMap",H.map.depthTexture=new ps(s.x,s.y,Jt),H.map.depthTexture.name=W.name+".shadowMapDepth",H.map.depthTexture.format=zn,H.map.depthTexture.compareFunction=null,H.map.depthTexture.minFilter=Ct,H.map.depthTexture.magFilter=Ct}else W.isPointLight?(H.map=new jf(s.x),H.map.depthTexture=new Bm(s.x,yn)):(H.map=new xn(s.x,s.y),H.map.depthTexture=new ps(s.x,s.y,yn)),H.map.depthTexture.name=W.name+".shadowMap",H.map.depthTexture.format=zn,this.type===ia?(H.map.depthTexture.compareFunction=ie?rc:sc,H.map.depthTexture.minFilter=Ut,H.map.depthTexture.magFilter=Ut):(H.map.depthTexture.compareFunction=null,H.map.depthTexture.minFilter=Ct,H.map.depthTexture.magFilter=Ct);H.camera.updateProjectionMatrix()}const he=H.map.isWebGLCubeRenderTarget?6:1;for(let oe=0;oe<he;oe++){if(H.map.isWebGLCubeRenderTarget)n.setRenderTarget(H.map,oe),n.clear();else{oe===0&&(n.setRenderTarget(H.map),n.clear());const ye=H.getViewport(oe);r.set(a.x*ye.x,a.y*ye.y,a.x*ye.z,a.y*ye.w),N.viewport(r)}if(W.isPointLight){const ye=H.camera,Je=H.matrix,ht=W.distance||ye.far;ht!==ye.far&&(ye.far=ht,ye.updateProjectionMatrix()),zs.setFromMatrixPosition(W.matrixWorld),ye.position.copy(zs),Uo.copy(ye.position),Uo.add(IM[oe]),ye.up.copy(LM[oe]),ye.lookAt(Uo),ye.updateMatrixWorld(),Je.makeTranslation(-zs.x,-zs.y,-zs.z),Eu.multiplyMatrices(ye.projectionMatrix,ye.matrixWorldInverse),H._frustum.setFromProjectionMatrix(Eu,ye.coordinateSystem,ye.reversedDepth)}else H.updateMatrices(W);i=H.getFrustum(),x(R,_,H.camera,W,this.type)}H.isPointLightShadow!==!0&&this.type===Hs&&y(H,_),H.needsUpdate=!1}p=this.type,m.needsUpdate=!1,n.setRenderTarget(T,P,I)};function y(E,R){const _=e.update(M);u.defines.VSM_SAMPLES!==E.blurSamples&&(u.defines.VSM_SAMPLES=E.blurSamples,d.defines.VSM_SAMPLES=E.blurSamples,u.needsUpdate=!0,d.needsUpdate=!0),E.mapPass===null&&(E.mapPass=new xn(s.x,s.y,{format:Ei,type:Bn})),u.uniforms.shadow_pass.value=E.map.depthTexture,u.uniforms.resolution.value=E.mapSize,u.uniforms.radius.value=E.radius,n.setRenderTarget(E.mapPass),n.clear(),n.renderBufferDirect(R,null,_,u,M,null),d.uniforms.shadow_pass.value=E.mapPass.texture,d.uniforms.resolution.value=E.mapSize,d.uniforms.radius.value=E.radius,n.setRenderTarget(E.map),n.clear(),n.renderBufferDirect(R,null,_,d,M,null)}function b(E,R,_,T){let P=null;const I=_.isPointLight===!0?E.customDistanceMaterial:E.customDepthMaterial;if(I!==void 0)P=I;else if(P=_.isPointLight===!0?l:o,n.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0||R.alphaToCoverage===!0){const N=P.uuid,B=R.uuid;let X=c[N];X===void 0&&(X={},c[N]=X);let F=X[B];F===void 0&&(F=P.clone(),X[B]=F,R.addEventListener("dispose",A)),P=F}if(P.visible=R.visible,P.wireframe=R.wireframe,T===Hs?P.side=R.shadowSide!==null?R.shadowSide:R.side:P.side=R.shadowSide!==null?R.shadowSide:f[R.side],P.alphaMap=R.alphaMap,P.alphaTest=R.alphaToCoverage===!0?.5:R.alphaTest,P.map=R.map,P.clipShadows=R.clipShadows,P.clippingPlanes=R.clippingPlanes,P.clipIntersection=R.clipIntersection,P.displacementMap=R.displacementMap,P.displacementScale=R.displacementScale,P.displacementBias=R.displacementBias,P.wireframeLinewidth=R.wireframeLinewidth,P.linewidth=R.linewidth,_.isPointLight===!0&&P.isMeshDistanceMaterial===!0){const N=n.properties.get(P);N.light=_}return P}function x(E,R,_,T,P){if(E.visible===!1)return;if(E.layers.test(R.layers)&&(E.isMesh||E.isLine||E.isPoints)&&(E.castShadow||E.receiveShadow&&P===Hs)&&(!E.frustumCulled||i.intersectsObject(E))){E.modelViewMatrix.multiplyMatrices(_.matrixWorldInverse,E.matrixWorld);const B=e.update(E),X=E.material;if(Array.isArray(X)){const F=B.groups;for(let W=0,H=F.length;W<H;W++){const Z=F[W],ie=X[Z.materialIndex];if(ie&&ie.visible){const he=b(E,ie,T,P);E.onBeforeShadow(n,E,R,_,B,he,Z),n.renderBufferDirect(_,null,B,he,E,Z),E.onAfterShadow(n,E,R,_,B,he,Z)}}}else if(X.visible){const F=b(E,X,T,P);E.onBeforeShadow(n,E,R,_,B,F,null),n.renderBufferDirect(_,null,B,F,E,null),E.onAfterShadow(n,E,R,_,B,F,null)}}const N=E.children;for(let B=0,X=N.length;B<X;B++)x(N[B],R,_,T,P)}function A(E){E.target.removeEventListener("dispose",A);for(const _ in c){const T=c[_],P=E.target.uuid;P in T&&(T[P].dispose(),delete T[P])}}}function NM(n,e){function t(){let D=!1;const ce=new lt;let $=null;const de=new lt(0,0,0,0);return{setMask:function(Me){$!==Me&&!D&&(n.colorMask(Me,Me,Me,Me),$=Me)},setLocked:function(Me){D=Me},setClear:function(Me,j,we,Ee,xt){xt===!0&&(Me*=Ee,j*=Ee,we*=Ee),ce.set(Me,j,we,Ee),de.equals(ce)===!1&&(n.clearColor(Me,j,we,Ee),de.copy(ce))},reset:function(){D=!1,$=null,de.set(-1,0,0,0)}}}function i(){let D=!1,ce=!1,$=null,de=null,Me=null;return{setReversed:function(j){if(ce!==j){const we=e.get("EXT_clip_control");j?we.clipControlEXT(we.LOWER_LEFT_EXT,we.ZERO_TO_ONE_EXT):we.clipControlEXT(we.LOWER_LEFT_EXT,we.NEGATIVE_ONE_TO_ONE_EXT),ce=j;const Ee=Me;Me=null,this.setClear(Ee)}},getReversed:function(){return ce},setTest:function(j){j?se(n.DEPTH_TEST):Ie(n.DEPTH_TEST)},setMask:function(j){$!==j&&!D&&(n.depthMask(j),$=j)},setFunc:function(j){if(ce&&(j=qp[j]),de!==j){switch(j){case Yo:n.depthFunc(n.NEVER);break;case $o:n.depthFunc(n.ALWAYS);break;case Ko:n.depthFunc(n.LESS);break;case us:n.depthFunc(n.LEQUAL);break;case Jo:n.depthFunc(n.EQUAL);break;case Zo:n.depthFunc(n.GEQUAL);break;case Qo:n.depthFunc(n.GREATER);break;case jo:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}de=j}},setLocked:function(j){D=j},setClear:function(j){Me!==j&&(Me=j,ce&&(j=1-j),n.clearDepth(j))},reset:function(){D=!1,$=null,de=null,Me=null,ce=!1}}}function s(){let D=!1,ce=null,$=null,de=null,Me=null,j=null,we=null,Ee=null,xt=null;return{setTest:function(pt){D||(pt?se(n.STENCIL_TEST):Ie(n.STENCIL_TEST))},setMask:function(pt){ce!==pt&&!D&&(n.stencilMask(pt),ce=pt)},setFunc:function(pt,on,ln){($!==pt||de!==on||Me!==ln)&&(n.stencilFunc(pt,on,ln),$=pt,de=on,Me=ln)},setOp:function(pt,on,ln){(j!==pt||we!==on||Ee!==ln)&&(n.stencilOp(pt,on,ln),j=pt,we=on,Ee=ln)},setLocked:function(pt){D=pt},setClear:function(pt){xt!==pt&&(n.clearStencil(pt),xt=pt)},reset:function(){D=!1,ce=null,$=null,de=null,Me=null,j=null,we=null,Ee=null,xt=null}}}const a=new t,r=new i,o=new s,l=new WeakMap,c=new WeakMap;let h={},f={},u={},d=new WeakMap,g=[],M=null,m=!1,p=null,y=null,b=null,x=null,A=null,E=null,R=null,_=new He(0,0,0),T=0,P=!1,I=null,N=null,B=null,X=null,F=null;const W=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let H=!1,Z=0;const ie=n.getParameter(n.VERSION);ie.indexOf("WebGL")!==-1?(Z=parseFloat(/^WebGL (\d)/.exec(ie)[1]),H=Z>=1):ie.indexOf("OpenGL ES")!==-1&&(Z=parseFloat(/^OpenGL ES (\d)/.exec(ie)[1]),H=Z>=2);let he=null,oe={};const ye=n.getParameter(n.SCISSOR_BOX),Je=n.getParameter(n.VIEWPORT),ht=new lt().fromArray(ye),et=new lt().fromArray(Je);function K(D,ce,$,de){const Me=new Uint8Array(4),j=n.createTexture();n.bindTexture(D,j),n.texParameteri(D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(D,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let we=0;we<$;we++)D===n.TEXTURE_3D||D===n.TEXTURE_2D_ARRAY?n.texImage3D(ce,0,n.RGBA,1,1,de,0,n.RGBA,n.UNSIGNED_BYTE,Me):n.texImage2D(ce+we,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,Me);return j}const le={};le[n.TEXTURE_2D]=K(n.TEXTURE_2D,n.TEXTURE_2D,1),le[n.TEXTURE_CUBE_MAP]=K(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),le[n.TEXTURE_2D_ARRAY]=K(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),le[n.TEXTURE_3D]=K(n.TEXTURE_3D,n.TEXTURE_3D,1,1),a.setClear(0,0,0,1),r.setClear(1),o.setClear(0),se(n.DEPTH_TEST),r.setFunc(us),_e(!1),pe(Jc),se(n.CULL_FACE),te(Fn);function se(D){h[D]!==!0&&(n.enable(D),h[D]=!0)}function Ie(D){h[D]!==!1&&(n.disable(D),h[D]=!1)}function ze(D,ce){return u[D]!==ce?(n.bindFramebuffer(D,ce),u[D]=ce,D===n.DRAW_FRAMEBUFFER&&(u[n.FRAMEBUFFER]=ce),D===n.FRAMEBUFFER&&(u[n.DRAW_FRAMEBUFFER]=ce),!0):!1}function Ne(D,ce){let $=g,de=!1;if(D){$=d.get(ce),$===void 0&&($=[],d.set(ce,$));const Me=D.textures;if($.length!==Me.length||$[0]!==n.COLOR_ATTACHMENT0){for(let j=0,we=Me.length;j<we;j++)$[j]=n.COLOR_ATTACHMENT0+j;$.length=Me.length,de=!0}}else $[0]!==n.BACK&&($[0]=n.BACK,de=!0);de&&n.drawBuffers($)}function nt(D){return M!==D?(n.useProgram(D),M=D,!0):!1}const Ve={[mi]:n.FUNC_ADD,[fp]:n.FUNC_SUBTRACT,[dp]:n.FUNC_REVERSE_SUBTRACT};Ve[pp]=n.MIN,Ve[mp]=n.MAX;const Q={[gp]:n.ZERO,[_p]:n.ONE,[vp]:n.SRC_COLOR,[Xo]:n.SRC_ALPHA,[Ep]:n.SRC_ALPHA_SATURATE,[Sp]:n.DST_COLOR,[Mp]:n.DST_ALPHA,[xp]:n.ONE_MINUS_SRC_COLOR,[qo]:n.ONE_MINUS_SRC_ALPHA,[bp]:n.ONE_MINUS_DST_COLOR,[yp]:n.ONE_MINUS_DST_ALPHA,[Tp]:n.CONSTANT_COLOR,[Ap]:n.ONE_MINUS_CONSTANT_COLOR,[wp]:n.CONSTANT_ALPHA,[Rp]:n.ONE_MINUS_CONSTANT_ALPHA};function te(D,ce,$,de,Me,j,we,Ee,xt,pt){if(D===Fn){m===!0&&(Ie(n.BLEND),m=!1);return}if(m===!1&&(se(n.BLEND),m=!0),D!==up){if(D!==p||pt!==P){if((y!==mi||A!==mi)&&(n.blendEquation(n.FUNC_ADD),y=mi,A=mi),pt)switch(D){case os:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Zc:n.blendFunc(n.ONE,n.ONE);break;case Qc:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case jc:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:Fe("WebGLState: Invalid blending: ",D);break}else switch(D){case os:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Zc:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case Qc:Fe("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case jc:Fe("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Fe("WebGLState: Invalid blending: ",D);break}b=null,x=null,E=null,R=null,_.set(0,0,0),T=0,p=D,P=pt}return}Me=Me||ce,j=j||$,we=we||de,(ce!==y||Me!==A)&&(n.blendEquationSeparate(Ve[ce],Ve[Me]),y=ce,A=Me),($!==b||de!==x||j!==E||we!==R)&&(n.blendFuncSeparate(Q[$],Q[de],Q[j],Q[we]),b=$,x=de,E=j,R=we),(Ee.equals(_)===!1||xt!==T)&&(n.blendColor(Ee.r,Ee.g,Ee.b,xt),_.copy(Ee),T=xt),p=D,P=!1}function ee(D,ce){D.side===Ln?Ie(n.CULL_FACE):se(n.CULL_FACE);let $=D.side===zt;ce&&($=!$),_e($),D.blending===os&&D.transparent===!1?te(Fn):te(D.blending,D.blendEquation,D.blendSrc,D.blendDst,D.blendEquationAlpha,D.blendSrcAlpha,D.blendDstAlpha,D.blendColor,D.blendAlpha,D.premultipliedAlpha),r.setFunc(D.depthFunc),r.setTest(D.depthTest),r.setMask(D.depthWrite),a.setMask(D.colorWrite);const de=D.stencilWrite;o.setTest(de),de&&(o.setMask(D.stencilWriteMask),o.setFunc(D.stencilFunc,D.stencilRef,D.stencilFuncMask),o.setOp(D.stencilFail,D.stencilZFail,D.stencilZPass)),Re(D.polygonOffset,D.polygonOffsetFactor,D.polygonOffsetUnits),D.alphaToCoverage===!0?se(n.SAMPLE_ALPHA_TO_COVERAGE):Ie(n.SAMPLE_ALPHA_TO_COVERAGE)}function _e(D){I!==D&&(D?n.frontFace(n.CW):n.frontFace(n.CCW),I=D)}function pe(D){D!==lp?(se(n.CULL_FACE),D!==N&&(D===Jc?n.cullFace(n.BACK):D===cp?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):Ie(n.CULL_FACE),N=D}function Ue(D){D!==B&&(H&&n.lineWidth(D),B=D)}function Re(D,ce,$){D?(se(n.POLYGON_OFFSET_FILL),(X!==ce||F!==$)&&(X=ce,F=$,r.getReversed()&&(ce=-ce),n.polygonOffset(ce,$))):Ie(n.POLYGON_OFFSET_FILL)}function ke(D){D?se(n.SCISSOR_TEST):Ie(n.SCISSOR_TEST)}function Ge(D){D===void 0&&(D=n.TEXTURE0+W-1),he!==D&&(n.activeTexture(D),he=D)}function L(D,ce,$){$===void 0&&(he===null?$=n.TEXTURE0+W-1:$=he);let de=oe[$];de===void 0&&(de={type:void 0,texture:void 0},oe[$]=de),(de.type!==D||de.texture!==ce)&&(he!==$&&(n.activeTexture($),he=$),n.bindTexture(D,ce||le[D]),de.type=D,de.texture=ce)}function rt(){const D=oe[he];D!==void 0&&D.type!==void 0&&(n.bindTexture(D.type,null),D.type=void 0,D.texture=void 0)}function Qe(){try{n.compressedTexImage2D(...arguments)}catch(D){Fe("WebGLState:",D)}}function w(){try{n.compressedTexImage3D(...arguments)}catch(D){Fe("WebGLState:",D)}}function v(){try{n.texSubImage2D(...arguments)}catch(D){Fe("WebGLState:",D)}}function O(){try{n.texSubImage3D(...arguments)}catch(D){Fe("WebGLState:",D)}}function V(){try{n.compressedTexSubImage2D(...arguments)}catch(D){Fe("WebGLState:",D)}}function q(){try{n.compressedTexSubImage3D(...arguments)}catch(D){Fe("WebGLState:",D)}}function re(){try{n.texStorage2D(...arguments)}catch(D){Fe("WebGLState:",D)}}function ae(){try{n.texStorage3D(...arguments)}catch(D){Fe("WebGLState:",D)}}function Y(){try{n.texImage2D(...arguments)}catch(D){Fe("WebGLState:",D)}}function J(){try{n.texImage3D(...arguments)}catch(D){Fe("WebGLState:",D)}}function ue(D){return f[D]!==void 0?f[D]:n.getParameter(D)}function Pe(D,ce){f[D]!==ce&&(n.pixelStorei(D,ce),f[D]=ce)}function me(D){ht.equals(D)===!1&&(n.scissor(D.x,D.y,D.z,D.w),ht.copy(D))}function fe(D){et.equals(D)===!1&&(n.viewport(D.x,D.y,D.z,D.w),et.copy(D))}function De(D,ce){let $=c.get(ce);$===void 0&&($=new WeakMap,c.set(ce,$));let de=$.get(D);de===void 0&&(de=n.getUniformBlockIndex(ce,D.name),$.set(D,de))}function Oe(D,ce){const de=c.get(ce).get(D);l.get(ce)!==de&&(n.uniformBlockBinding(ce,de,D.__bindingPointIndex),l.set(ce,de))}function Xe(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),r.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),n.pixelStorei(n.PACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,n.BROWSER_DEFAULT_WEBGL),n.pixelStorei(n.PACK_ROW_LENGTH,0),n.pixelStorei(n.PACK_SKIP_PIXELS,0),n.pixelStorei(n.PACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_ROW_LENGTH,0),n.pixelStorei(n.UNPACK_IMAGE_HEIGHT,0),n.pixelStorei(n.UNPACK_SKIP_PIXELS,0),n.pixelStorei(n.UNPACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_SKIP_IMAGES,0),h={},f={},he=null,oe={},u={},d=new WeakMap,g=[],M=null,m=!1,p=null,y=null,b=null,x=null,A=null,E=null,R=null,_=new He(0,0,0),T=0,P=!1,I=null,N=null,B=null,X=null,F=null,ht.set(0,0,n.canvas.width,n.canvas.height),et.set(0,0,n.canvas.width,n.canvas.height),a.reset(),r.reset(),o.reset()}return{buffers:{color:a,depth:r,stencil:o},enable:se,disable:Ie,bindFramebuffer:ze,drawBuffers:Ne,useProgram:nt,setBlending:te,setMaterial:ee,setFlipSided:_e,setCullFace:pe,setLineWidth:Ue,setPolygonOffset:Re,setScissorTest:ke,activeTexture:Ge,bindTexture:L,unbindTexture:rt,compressedTexImage2D:Qe,compressedTexImage3D:w,texImage2D:Y,texImage3D:J,pixelStorei:Pe,getParameter:ue,updateUBOMapping:De,uniformBlockBinding:Oe,texStorage2D:re,texStorage3D:ae,texSubImage2D:v,texSubImage3D:O,compressedTexSubImage2D:V,compressedTexSubImage3D:q,scissor:me,viewport:fe,reset:Xe}}function UM(n,e,t,i,s,a,r){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ne,h=new WeakMap,f=new Set;let u;const d=new WeakMap;let g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function M(w,v){return g?new OffscreenCanvas(w,v):tr("canvas")}function m(w,v,O){let V=1;const q=Qe(w);if((q.width>O||q.height>O)&&(V=O/Math.max(q.width,q.height)),V<1)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap||typeof VideoFrame<"u"&&w instanceof VideoFrame){const re=Math.floor(V*q.width),ae=Math.floor(V*q.height);u===void 0&&(u=M(re,ae));const Y=v?M(re,ae):u;return Y.width=re,Y.height=ae,Y.getContext("2d").drawImage(w,0,0,re,ae),Ae("WebGLRenderer: Texture has been resized from ("+q.width+"x"+q.height+") to ("+re+"x"+ae+")."),Y}else return"data"in w&&Ae("WebGLRenderer: Image in DataTexture is too big ("+q.width+"x"+q.height+")."),w;return w}function p(w){return w.generateMipmaps}function y(w){n.generateMipmap(w)}function b(w){return w.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:w.isWebGL3DRenderTarget?n.TEXTURE_3D:w.isWebGLArrayRenderTarget||w.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function x(w,v,O,V,q,re=!1){if(w!==null){if(n[w]!==void 0)return n[w];Ae("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let ae;V&&(ae=e.get("EXT_texture_norm16"),ae||Ae("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Y=v;if(v===n.RED&&(O===n.FLOAT&&(Y=n.R32F),O===n.HALF_FLOAT&&(Y=n.R16F),O===n.UNSIGNED_BYTE&&(Y=n.R8),O===n.UNSIGNED_SHORT&&ae&&(Y=ae.R16_EXT),O===n.SHORT&&ae&&(Y=ae.R16_SNORM_EXT)),v===n.RED_INTEGER&&(O===n.UNSIGNED_BYTE&&(Y=n.R8UI),O===n.UNSIGNED_SHORT&&(Y=n.R16UI),O===n.UNSIGNED_INT&&(Y=n.R32UI),O===n.BYTE&&(Y=n.R8I),O===n.SHORT&&(Y=n.R16I),O===n.INT&&(Y=n.R32I)),v===n.RG&&(O===n.FLOAT&&(Y=n.RG32F),O===n.HALF_FLOAT&&(Y=n.RG16F),O===n.UNSIGNED_BYTE&&(Y=n.RG8),O===n.UNSIGNED_SHORT&&ae&&(Y=ae.RG16_EXT),O===n.SHORT&&ae&&(Y=ae.RG16_SNORM_EXT)),v===n.RG_INTEGER&&(O===n.UNSIGNED_BYTE&&(Y=n.RG8UI),O===n.UNSIGNED_SHORT&&(Y=n.RG16UI),O===n.UNSIGNED_INT&&(Y=n.RG32UI),O===n.BYTE&&(Y=n.RG8I),O===n.SHORT&&(Y=n.RG16I),O===n.INT&&(Y=n.RG32I)),v===n.RGB_INTEGER&&(O===n.UNSIGNED_BYTE&&(Y=n.RGB8UI),O===n.UNSIGNED_SHORT&&(Y=n.RGB16UI),O===n.UNSIGNED_INT&&(Y=n.RGB32UI),O===n.BYTE&&(Y=n.RGB8I),O===n.SHORT&&(Y=n.RGB16I),O===n.INT&&(Y=n.RGB32I)),v===n.RGBA_INTEGER&&(O===n.UNSIGNED_BYTE&&(Y=n.RGBA8UI),O===n.UNSIGNED_SHORT&&(Y=n.RGBA16UI),O===n.UNSIGNED_INT&&(Y=n.RGBA32UI),O===n.BYTE&&(Y=n.RGBA8I),O===n.SHORT&&(Y=n.RGBA16I),O===n.INT&&(Y=n.RGBA32I)),v===n.RGB&&(O===n.UNSIGNED_SHORT&&ae&&(Y=ae.RGB16_EXT),O===n.SHORT&&ae&&(Y=ae.RGB16_SNORM_EXT),O===n.UNSIGNED_INT_5_9_9_9_REV&&(Y=n.RGB9_E5),O===n.UNSIGNED_INT_10F_11F_11F_REV&&(Y=n.R11F_G11F_B10F)),v===n.RGBA){const J=re?va:je.getTransfer(q);O===n.FLOAT&&(Y=n.RGBA32F),O===n.HALF_FLOAT&&(Y=n.RGBA16F),O===n.UNSIGNED_BYTE&&(Y=J===it?n.SRGB8_ALPHA8:n.RGBA8),O===n.UNSIGNED_SHORT&&ae&&(Y=ae.RGBA16_EXT),O===n.SHORT&&ae&&(Y=ae.RGBA16_SNORM_EXT),O===n.UNSIGNED_SHORT_4_4_4_4&&(Y=n.RGBA4),O===n.UNSIGNED_SHORT_5_5_5_1&&(Y=n.RGB5_A1)}return(Y===n.R16F||Y===n.R32F||Y===n.RG16F||Y===n.RG32F||Y===n.RGBA16F||Y===n.RGBA32F)&&e.get("EXT_color_buffer_float"),Y}function A(w,v){let O;return w?v===null||v===yn||v===js?O=n.DEPTH24_STENCIL8:v===Jt?O=n.DEPTH32F_STENCIL8:v===Qs&&(O=n.DEPTH24_STENCIL8,Ae("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===yn||v===js?O=n.DEPTH_COMPONENT24:v===Jt?O=n.DEPTH_COMPONENT32F:v===Qs&&(O=n.DEPTH_COMPONENT16),O}function E(w,v){return p(w)===!0||w.isFramebufferTexture&&w.minFilter!==Ct&&w.minFilter!==Ut?Math.log2(Math.max(v.width,v.height))+1:w.mipmaps!==void 0&&w.mipmaps.length>0?w.mipmaps.length:w.isCompressedTexture&&Array.isArray(w.image)?v.mipmaps.length:1}function R(w){const v=w.target;v.removeEventListener("dispose",R),T(v),v.isVideoTexture&&h.delete(v),v.isHTMLTexture&&f.delete(v)}function _(w){const v=w.target;v.removeEventListener("dispose",_),I(v)}function T(w){const v=i.get(w);if(v.__webglInit===void 0)return;const O=w.source,V=d.get(O);if(V){const q=V[v.__cacheKey];q.usedTimes--,q.usedTimes===0&&P(w),Object.keys(V).length===0&&d.delete(O)}i.remove(w)}function P(w){const v=i.get(w);n.deleteTexture(v.__webglTexture);const O=w.source,V=d.get(O);delete V[v.__cacheKey],r.memory.textures--}function I(w){const v=i.get(w);if(w.depthTexture&&(w.depthTexture.dispose(),i.remove(w.depthTexture)),w.isWebGLCubeRenderTarget)for(let V=0;V<6;V++){if(Array.isArray(v.__webglFramebuffer[V]))for(let q=0;q<v.__webglFramebuffer[V].length;q++)n.deleteFramebuffer(v.__webglFramebuffer[V][q]);else n.deleteFramebuffer(v.__webglFramebuffer[V]);v.__webglDepthbuffer&&n.deleteRenderbuffer(v.__webglDepthbuffer[V])}else{if(Array.isArray(v.__webglFramebuffer))for(let V=0;V<v.__webglFramebuffer.length;V++)n.deleteFramebuffer(v.__webglFramebuffer[V]);else n.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&n.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&n.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let V=0;V<v.__webglColorRenderbuffer.length;V++)v.__webglColorRenderbuffer[V]&&n.deleteRenderbuffer(v.__webglColorRenderbuffer[V]);v.__webglDepthRenderbuffer&&n.deleteRenderbuffer(v.__webglDepthRenderbuffer)}const O=w.textures;for(let V=0,q=O.length;V<q;V++){const re=i.get(O[V]);re.__webglTexture&&(n.deleteTexture(re.__webglTexture),r.memory.textures--),i.remove(O[V])}i.remove(w)}let N=0;function B(){N=0}function X(){return N}function F(w){N=w}function W(){const w=N;return w>=s.maxTextures&&Ae("WebGLTextures: Trying to use "+w+" texture units while this GPU supports only "+s.maxTextures),N+=1,w}function H(w){const v=[];return v.push(w.wrapS),v.push(w.wrapT),v.push(w.wrapR||0),v.push(w.magFilter),v.push(w.minFilter),v.push(w.anisotropy),v.push(w.internalFormat),v.push(w.format),v.push(w.type),v.push(w.generateMipmaps),v.push(w.premultiplyAlpha),v.push(w.flipY),v.push(w.unpackAlignment),v.push(w.colorSpace),v.join()}function Z(w,v){const O=i.get(w);if(w.isVideoTexture&&L(w),w.isRenderTargetTexture===!1&&w.isExternalTexture!==!0&&w.version>0&&O.__version!==w.version){const V=w.image;if(V===null)Ae("WebGLRenderer: Texture marked for update but no image data found.");else if(V.complete===!1)Ae("WebGLRenderer: Texture marked for update but image is incomplete");else{Ie(O,w,v);return}}else w.isExternalTexture&&(O.__webglTexture=w.sourceTexture?w.sourceTexture:null);t.bindTexture(n.TEXTURE_2D,O.__webglTexture,n.TEXTURE0+v)}function ie(w,v){const O=i.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&O.__version!==w.version){Ie(O,w,v);return}else w.isExternalTexture&&(O.__webglTexture=w.sourceTexture?w.sourceTexture:null);t.bindTexture(n.TEXTURE_2D_ARRAY,O.__webglTexture,n.TEXTURE0+v)}function he(w,v){const O=i.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&O.__version!==w.version){Ie(O,w,v);return}t.bindTexture(n.TEXTURE_3D,O.__webglTexture,n.TEXTURE0+v)}function oe(w,v){const O=i.get(w);if(w.isCubeDepthTexture!==!0&&w.version>0&&O.__version!==w.version){ze(O,w,v);return}t.bindTexture(n.TEXTURE_CUBE_MAP,O.__webglTexture,n.TEXTURE0+v)}const ye={[el]:n.REPEAT,[Dn]:n.CLAMP_TO_EDGE,[tl]:n.MIRRORED_REPEAT},Je={[Ct]:n.NEAREST,[Lp]:n.NEAREST_MIPMAP_NEAREST,[_r]:n.NEAREST_MIPMAP_LINEAR,[Ut]:n.LINEAR,[Ka]:n.LINEAR_MIPMAP_NEAREST,[vi]:n.LINEAR_MIPMAP_LINEAR},ht={[Fp]:n.NEVER,[Vp]:n.ALWAYS,[Op]:n.LESS,[sc]:n.LEQUAL,[Bp]:n.EQUAL,[rc]:n.GEQUAL,[zp]:n.GREATER,[kp]:n.NOTEQUAL};function et(w,v){if(v.type===Jt&&e.has("OES_texture_float_linear")===!1&&(v.magFilter===Ut||v.magFilter===Ka||v.magFilter===_r||v.magFilter===vi||v.minFilter===Ut||v.minFilter===Ka||v.minFilter===_r||v.minFilter===vi)&&Ae("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(w,n.TEXTURE_WRAP_S,ye[v.wrapS]),n.texParameteri(w,n.TEXTURE_WRAP_T,ye[v.wrapT]),(w===n.TEXTURE_3D||w===n.TEXTURE_2D_ARRAY)&&n.texParameteri(w,n.TEXTURE_WRAP_R,ye[v.wrapR]),n.texParameteri(w,n.TEXTURE_MAG_FILTER,Je[v.magFilter]),n.texParameteri(w,n.TEXTURE_MIN_FILTER,Je[v.minFilter]),v.compareFunction&&(n.texParameteri(w,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(w,n.TEXTURE_COMPARE_FUNC,ht[v.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===Ct||v.minFilter!==_r&&v.minFilter!==vi||v.type===Jt&&e.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||i.get(v).__currentAnisotropy){const O=e.get("EXT_texture_filter_anisotropic");n.texParameterf(w,O.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,s.getMaxAnisotropy())),i.get(v).__currentAnisotropy=v.anisotropy}}}function K(w,v){let O=!1;w.__webglInit===void 0&&(w.__webglInit=!0,v.addEventListener("dispose",R));const V=v.source;let q=d.get(V);q===void 0&&(q={},d.set(V,q));const re=H(v);if(re!==w.__cacheKey){q[re]===void 0&&(q[re]={texture:n.createTexture(),usedTimes:0},r.memory.textures++,O=!0),q[re].usedTimes++;const ae=q[w.__cacheKey];ae!==void 0&&(q[w.__cacheKey].usedTimes--,ae.usedTimes===0&&P(v)),w.__cacheKey=re,w.__webglTexture=q[re].texture}return O}function le(w,v,O){return Math.floor(Math.floor(w/O)/v)}function se(w,v,O,V){const re=w.updateRanges;if(re.length===0)t.texSubImage2D(n.TEXTURE_2D,0,0,0,v.width,v.height,O,V,v.data);else{re.sort((Pe,me)=>Pe.start-me.start);let ae=0;for(let Pe=1;Pe<re.length;Pe++){const me=re[ae],fe=re[Pe],De=me.start+me.count,Oe=le(fe.start,v.width,4),Xe=le(me.start,v.width,4);fe.start<=De+1&&Oe===Xe&&le(fe.start+fe.count-1,v.width,4)===Oe?me.count=Math.max(me.count,fe.start+fe.count-me.start):(++ae,re[ae]=fe)}re.length=ae+1;const Y=t.getParameter(n.UNPACK_ROW_LENGTH),J=t.getParameter(n.UNPACK_SKIP_PIXELS),ue=t.getParameter(n.UNPACK_SKIP_ROWS);t.pixelStorei(n.UNPACK_ROW_LENGTH,v.width);for(let Pe=0,me=re.length;Pe<me;Pe++){const fe=re[Pe],De=Math.floor(fe.start/4),Oe=Math.ceil(fe.count/4),Xe=De%v.width,D=Math.floor(De/v.width),ce=Oe,$=1;t.pixelStorei(n.UNPACK_SKIP_PIXELS,Xe),t.pixelStorei(n.UNPACK_SKIP_ROWS,D),t.texSubImage2D(n.TEXTURE_2D,0,Xe,D,ce,$,O,V,v.data)}w.clearUpdateRanges(),t.pixelStorei(n.UNPACK_ROW_LENGTH,Y),t.pixelStorei(n.UNPACK_SKIP_PIXELS,J),t.pixelStorei(n.UNPACK_SKIP_ROWS,ue)}}function Ie(w,v,O){let V=n.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(V=n.TEXTURE_2D_ARRAY),v.isData3DTexture&&(V=n.TEXTURE_3D);const q=K(w,v),re=v.source;t.bindTexture(V,w.__webglTexture,n.TEXTURE0+O);const ae=i.get(re);if(re.version!==ae.__version||q===!0){if(t.activeTexture(n.TEXTURE0+O),(typeof ImageBitmap<"u"&&v.image instanceof ImageBitmap)===!1){const $=je.getPrimaries(je.workingColorSpace),de=v.colorSpace===ni?null:je.getPrimaries(v.colorSpace),Me=v.colorSpace===ni||$===de?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Me)}t.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment);let J=m(v.image,!1,s.maxTextureSize);J=rt(v,J);const ue=a.convert(v.format,v.colorSpace),Pe=a.convert(v.type);let me=x(v.internalFormat,ue,Pe,v.normalized,v.colorSpace,v.isVideoTexture);et(V,v);let fe;const De=v.mipmaps,Oe=v.isVideoTexture!==!0,Xe=ae.__version===void 0||q===!0,D=re.dataReady,ce=E(v,J);if(v.isDepthTexture)me=A(v.format===xi,v.type),Xe&&(Oe?t.texStorage2D(n.TEXTURE_2D,1,me,J.width,J.height):t.texImage2D(n.TEXTURE_2D,0,me,J.width,J.height,0,ue,Pe,null));else if(v.isDataTexture)if(De.length>0){Oe&&Xe&&t.texStorage2D(n.TEXTURE_2D,ce,me,De[0].width,De[0].height);for(let $=0,de=De.length;$<de;$++)fe=De[$],Oe?D&&t.texSubImage2D(n.TEXTURE_2D,$,0,0,fe.width,fe.height,ue,Pe,fe.data):t.texImage2D(n.TEXTURE_2D,$,me,fe.width,fe.height,0,ue,Pe,fe.data);v.generateMipmaps=!1}else Oe?(Xe&&t.texStorage2D(n.TEXTURE_2D,ce,me,J.width,J.height),D&&se(v,J,ue,Pe)):t.texImage2D(n.TEXTURE_2D,0,me,J.width,J.height,0,ue,Pe,J.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){Oe&&Xe&&t.texStorage3D(n.TEXTURE_2D_ARRAY,ce,me,De[0].width,De[0].height,J.depth);for(let $=0,de=De.length;$<de;$++)if(fe=De[$],v.format!==Zt)if(ue!==null)if(Oe){if(D)if(v.layerUpdates.size>0){const Me=tu(fe.width,fe.height,v.format,v.type);for(const j of v.layerUpdates){const we=fe.data.subarray(j*Me/fe.data.BYTES_PER_ELEMENT,(j+1)*Me/fe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,$,0,0,j,fe.width,fe.height,1,ue,we)}v.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,$,0,0,0,fe.width,fe.height,J.depth,ue,fe.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,$,me,fe.width,fe.height,J.depth,0,fe.data,0,0);else Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Oe?D&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,$,0,0,0,fe.width,fe.height,J.depth,ue,Pe,fe.data):t.texImage3D(n.TEXTURE_2D_ARRAY,$,me,fe.width,fe.height,J.depth,0,ue,Pe,fe.data)}else{Oe&&Xe&&t.texStorage2D(n.TEXTURE_2D,ce,me,De[0].width,De[0].height);for(let $=0,de=De.length;$<de;$++)fe=De[$],v.format!==Zt?ue!==null?Oe?D&&t.compressedTexSubImage2D(n.TEXTURE_2D,$,0,0,fe.width,fe.height,ue,fe.data):t.compressedTexImage2D(n.TEXTURE_2D,$,me,fe.width,fe.height,0,fe.data):Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Oe?D&&t.texSubImage2D(n.TEXTURE_2D,$,0,0,fe.width,fe.height,ue,Pe,fe.data):t.texImage2D(n.TEXTURE_2D,$,me,fe.width,fe.height,0,ue,Pe,fe.data)}else if(v.isDataArrayTexture)if(Oe){if(Xe&&t.texStorage3D(n.TEXTURE_2D_ARRAY,ce,me,J.width,J.height,J.depth),D)if(v.layerUpdates.size>0){const $=tu(J.width,J.height,v.format,v.type);for(const de of v.layerUpdates){const Me=J.data.subarray(de*$/J.data.BYTES_PER_ELEMENT,(de+1)*$/J.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,de,J.width,J.height,1,ue,Pe,Me)}v.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,J.width,J.height,J.depth,ue,Pe,J.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,me,J.width,J.height,J.depth,0,ue,Pe,J.data);else if(v.isData3DTexture)Oe?(Xe&&t.texStorage3D(n.TEXTURE_3D,ce,me,J.width,J.height,J.depth),D&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,J.width,J.height,J.depth,ue,Pe,J.data)):t.texImage3D(n.TEXTURE_3D,0,me,J.width,J.height,J.depth,0,ue,Pe,J.data);else if(v.isFramebufferTexture){if(Xe)if(Oe)t.texStorage2D(n.TEXTURE_2D,ce,me,J.width,J.height);else{let $=J.width,de=J.height;for(let Me=0;Me<ce;Me++)t.texImage2D(n.TEXTURE_2D,Me,me,$,de,0,ue,Pe,null),$>>=1,de>>=1}}else if(v.isHTMLTexture){if("texElementImage2D"in n){const $=n.canvas;if($.hasAttribute("layoutsubtree")||$.setAttribute("layoutsubtree","true"),J.parentNode!==$){$.appendChild(J),f.add(v),$.onpaint=de=>{const Me=de.changedElements;for(const j of f)Me.includes(j.image)&&(j.needsUpdate=!0)},$.requestPaint();return}if(n.texElementImage2D.length===3)n.texElementImage2D(n.TEXTURE_2D,n.RGBA8,J);else{const Me=n.RGBA,j=n.RGBA,we=n.UNSIGNED_BYTE;n.texElementImage2D(n.TEXTURE_2D,0,Me,j,we,J)}n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)}}else if(De.length>0){if(Oe&&Xe){const $=Qe(De[0]);t.texStorage2D(n.TEXTURE_2D,ce,me,$.width,$.height)}for(let $=0,de=De.length;$<de;$++)fe=De[$],Oe?D&&t.texSubImage2D(n.TEXTURE_2D,$,0,0,ue,Pe,fe):t.texImage2D(n.TEXTURE_2D,$,me,ue,Pe,fe);v.generateMipmaps=!1}else if(Oe){if(Xe){const $=Qe(J);t.texStorage2D(n.TEXTURE_2D,ce,me,$.width,$.height)}D&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,ue,Pe,J)}else t.texImage2D(n.TEXTURE_2D,0,me,ue,Pe,J);p(v)&&y(V),ae.__version=re.version,v.onUpdate&&v.onUpdate(v)}w.__version=v.version}function ze(w,v,O){if(v.image.length!==6)return;const V=K(w,v),q=v.source;t.bindTexture(n.TEXTURE_CUBE_MAP,w.__webglTexture,n.TEXTURE0+O);const re=i.get(q);if(q.version!==re.__version||V===!0){t.activeTexture(n.TEXTURE0+O);const ae=je.getPrimaries(je.workingColorSpace),Y=v.colorSpace===ni?null:je.getPrimaries(v.colorSpace),J=v.colorSpace===ni||ae===Y?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),t.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,J);const ue=v.isCompressedTexture||v.image[0].isCompressedTexture,Pe=v.image[0]&&v.image[0].isDataTexture,me=[];for(let j=0;j<6;j++)!ue&&!Pe?me[j]=m(v.image[j],!0,s.maxCubemapSize):me[j]=Pe?v.image[j].image:v.image[j],me[j]=rt(v,me[j]);const fe=me[0],De=a.convert(v.format,v.colorSpace),Oe=a.convert(v.type),Xe=x(v.internalFormat,De,Oe,v.normalized,v.colorSpace),D=v.isVideoTexture!==!0,ce=re.__version===void 0||V===!0,$=q.dataReady;let de=E(v,fe);et(n.TEXTURE_CUBE_MAP,v);let Me;if(ue){D&&ce&&t.texStorage2D(n.TEXTURE_CUBE_MAP,de,Xe,fe.width,fe.height);for(let j=0;j<6;j++){Me=me[j].mipmaps;for(let we=0;we<Me.length;we++){const Ee=Me[we];v.format!==Zt?De!==null?D?$&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+j,we,0,0,Ee.width,Ee.height,De,Ee.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+j,we,Xe,Ee.width,Ee.height,0,Ee.data):Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):D?$&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+j,we,0,0,Ee.width,Ee.height,De,Oe,Ee.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+j,we,Xe,Ee.width,Ee.height,0,De,Oe,Ee.data)}}}else{if(Me=v.mipmaps,D&&ce){Me.length>0&&de++;const j=Qe(me[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,de,Xe,j.width,j.height)}for(let j=0;j<6;j++)if(Pe){D?$&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+j,0,0,0,me[j].width,me[j].height,De,Oe,me[j].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+j,0,Xe,me[j].width,me[j].height,0,De,Oe,me[j].data);for(let we=0;we<Me.length;we++){const xt=Me[we].image[j].image;D?$&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+j,we+1,0,0,xt.width,xt.height,De,Oe,xt.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+j,we+1,Xe,xt.width,xt.height,0,De,Oe,xt.data)}}else{D?$&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+j,0,0,0,De,Oe,me[j]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+j,0,Xe,De,Oe,me[j]);for(let we=0;we<Me.length;we++){const Ee=Me[we];D?$&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+j,we+1,0,0,De,Oe,Ee.image[j]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+j,we+1,Xe,De,Oe,Ee.image[j])}}}p(v)&&y(n.TEXTURE_CUBE_MAP),re.__version=q.version,v.onUpdate&&v.onUpdate(v)}w.__version=v.version}function Ne(w,v,O,V,q,re){const ae=a.convert(O.format,O.colorSpace),Y=a.convert(O.type),J=x(O.internalFormat,ae,Y,O.normalized,O.colorSpace),ue=i.get(v),Pe=i.get(O);if(Pe.__renderTarget=v,!ue.__hasExternalTextures){const me=Math.max(1,v.width>>re),fe=Math.max(1,v.height>>re);q===n.TEXTURE_3D||q===n.TEXTURE_2D_ARRAY?t.texImage3D(q,re,J,me,fe,v.depth,0,ae,Y,null):t.texImage2D(q,re,J,me,fe,0,ae,Y,null)}t.bindFramebuffer(n.FRAMEBUFFER,w),Ge(v)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,V,q,Pe.__webglTexture,0,ke(v)):(q===n.TEXTURE_2D||q>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&q<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,V,q,Pe.__webglTexture,re),t.bindFramebuffer(n.FRAMEBUFFER,null)}function nt(w,v,O){if(n.bindRenderbuffer(n.RENDERBUFFER,w),v.depthBuffer){const V=v.depthTexture,q=V&&V.isDepthTexture?V.type:null,re=A(v.stencilBuffer,q),ae=v.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;Ge(v)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ke(v),re,v.width,v.height):O?n.renderbufferStorageMultisample(n.RENDERBUFFER,ke(v),re,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,re,v.width,v.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,ae,n.RENDERBUFFER,w)}else{const V=v.textures;for(let q=0;q<V.length;q++){const re=V[q],ae=a.convert(re.format,re.colorSpace),Y=a.convert(re.type),J=x(re.internalFormat,ae,Y,re.normalized,re.colorSpace);Ge(v)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ke(v),J,v.width,v.height):O?n.renderbufferStorageMultisample(n.RENDERBUFFER,ke(v),J,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,J,v.width,v.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Ve(w,v,O){const V=v.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(n.FRAMEBUFFER,w),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const q=i.get(v.depthTexture);if(q.__renderTarget=v,(!q.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),V){if(q.__webglInit===void 0&&(q.__webglInit=!0,v.depthTexture.addEventListener("dispose",R)),q.__webglTexture===void 0){q.__webglTexture=n.createTexture(),t.bindTexture(n.TEXTURE_CUBE_MAP,q.__webglTexture),et(n.TEXTURE_CUBE_MAP,v.depthTexture);const ue=a.convert(v.depthTexture.format),Pe=a.convert(v.depthTexture.type);let me;v.depthTexture.format===zn?me=n.DEPTH_COMPONENT24:v.depthTexture.format===xi&&(me=n.DEPTH24_STENCIL8);for(let fe=0;fe<6;fe++)n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,me,v.width,v.height,0,ue,Pe,null)}}else Z(v.depthTexture,0);const re=q.__webglTexture,ae=ke(v),Y=V?n.TEXTURE_CUBE_MAP_POSITIVE_X+O:n.TEXTURE_2D,J=v.depthTexture.format===xi?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(v.depthTexture.format===zn)Ge(v)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,J,Y,re,0,ae):n.framebufferTexture2D(n.FRAMEBUFFER,J,Y,re,0);else if(v.depthTexture.format===xi)Ge(v)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,J,Y,re,0,ae):n.framebufferTexture2D(n.FRAMEBUFFER,J,Y,re,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Q(w){const v=i.get(w),O=w.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==w.depthTexture){const V=w.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),V){const q=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,V.removeEventListener("dispose",q)};V.addEventListener("dispose",q),v.__depthDisposeCallback=q}v.__boundDepthTexture=V}if(w.depthTexture&&!v.__autoAllocateDepthBuffer)if(O)for(let V=0;V<6;V++)Ve(v.__webglFramebuffer[V],w,V);else{const V=w.texture.mipmaps;V&&V.length>0?Ve(v.__webglFramebuffer[0],w,0):Ve(v.__webglFramebuffer,w,0)}else if(O){v.__webglDepthbuffer=[];for(let V=0;V<6;V++)if(t.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer[V]),v.__webglDepthbuffer[V]===void 0)v.__webglDepthbuffer[V]=n.createRenderbuffer(),nt(v.__webglDepthbuffer[V],w,!1);else{const q=w.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,re=v.__webglDepthbuffer[V];n.bindRenderbuffer(n.RENDERBUFFER,re),n.framebufferRenderbuffer(n.FRAMEBUFFER,q,n.RENDERBUFFER,re)}}else{const V=w.texture.mipmaps;if(V&&V.length>0?t.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer[0]):t.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=n.createRenderbuffer(),nt(v.__webglDepthbuffer,w,!1);else{const q=w.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,re=v.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,re),n.framebufferRenderbuffer(n.FRAMEBUFFER,q,n.RENDERBUFFER,re)}}t.bindFramebuffer(n.FRAMEBUFFER,null)}function te(w,v,O){const V=i.get(w);v!==void 0&&Ne(V.__webglFramebuffer,w,w.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),O!==void 0&&Q(w)}function ee(w){const v=w.texture,O=i.get(w),V=i.get(v);w.addEventListener("dispose",_);const q=w.textures,re=w.isWebGLCubeRenderTarget===!0,ae=q.length>1;if(ae||(V.__webglTexture===void 0&&(V.__webglTexture=n.createTexture()),V.__version=v.version,r.memory.textures++),re){O.__webglFramebuffer=[];for(let Y=0;Y<6;Y++)if(v.mipmaps&&v.mipmaps.length>0){O.__webglFramebuffer[Y]=[];for(let J=0;J<v.mipmaps.length;J++)O.__webglFramebuffer[Y][J]=n.createFramebuffer()}else O.__webglFramebuffer[Y]=n.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){O.__webglFramebuffer=[];for(let Y=0;Y<v.mipmaps.length;Y++)O.__webglFramebuffer[Y]=n.createFramebuffer()}else O.__webglFramebuffer=n.createFramebuffer();if(ae)for(let Y=0,J=q.length;Y<J;Y++){const ue=i.get(q[Y]);ue.__webglTexture===void 0&&(ue.__webglTexture=n.createTexture(),r.memory.textures++)}if(w.samples>0&&Ge(w)===!1){O.__webglMultisampledFramebuffer=n.createFramebuffer(),O.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,O.__webglMultisampledFramebuffer);for(let Y=0;Y<q.length;Y++){const J=q[Y];O.__webglColorRenderbuffer[Y]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,O.__webglColorRenderbuffer[Y]);const ue=a.convert(J.format,J.colorSpace),Pe=a.convert(J.type),me=x(J.internalFormat,ue,Pe,J.normalized,J.colorSpace,w.isXRRenderTarget===!0),fe=ke(w);n.renderbufferStorageMultisample(n.RENDERBUFFER,fe,me,w.width,w.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Y,n.RENDERBUFFER,O.__webglColorRenderbuffer[Y])}n.bindRenderbuffer(n.RENDERBUFFER,null),w.depthBuffer&&(O.__webglDepthRenderbuffer=n.createRenderbuffer(),nt(O.__webglDepthRenderbuffer,w,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(re){t.bindTexture(n.TEXTURE_CUBE_MAP,V.__webglTexture),et(n.TEXTURE_CUBE_MAP,v);for(let Y=0;Y<6;Y++)if(v.mipmaps&&v.mipmaps.length>0)for(let J=0;J<v.mipmaps.length;J++)Ne(O.__webglFramebuffer[Y][J],w,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,J);else Ne(O.__webglFramebuffer[Y],w,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0);p(v)&&y(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ae){for(let Y=0,J=q.length;Y<J;Y++){const ue=q[Y],Pe=i.get(ue);let me=n.TEXTURE_2D;(w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(me=w.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(me,Pe.__webglTexture),et(me,ue),Ne(O.__webglFramebuffer,w,ue,n.COLOR_ATTACHMENT0+Y,me,0),p(ue)&&y(me)}t.unbindTexture()}else{let Y=n.TEXTURE_2D;if((w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(Y=w.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(Y,V.__webglTexture),et(Y,v),v.mipmaps&&v.mipmaps.length>0)for(let J=0;J<v.mipmaps.length;J++)Ne(O.__webglFramebuffer[J],w,v,n.COLOR_ATTACHMENT0,Y,J);else Ne(O.__webglFramebuffer,w,v,n.COLOR_ATTACHMENT0,Y,0);p(v)&&y(Y),t.unbindTexture()}w.depthBuffer&&Q(w)}function _e(w){const v=w.textures;for(let O=0,V=v.length;O<V;O++){const q=v[O];if(p(q)){const re=b(w),ae=i.get(q).__webglTexture;t.bindTexture(re,ae),y(re),t.unbindTexture()}}}const pe=[],Ue=[];function Re(w){if(w.samples>0){if(Ge(w)===!1){const v=w.textures,O=w.width,V=w.height;let q=n.COLOR_BUFFER_BIT;const re=w.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ae=i.get(w),Y=v.length>1;if(Y)for(let ue=0;ue<v.length;ue++)t.bindFramebuffer(n.FRAMEBUFFER,ae.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ue,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,ae.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ue,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,ae.__webglMultisampledFramebuffer);const J=w.texture.mipmaps;J&&J.length>0?t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ae.__webglFramebuffer[0]):t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ae.__webglFramebuffer);for(let ue=0;ue<v.length;ue++){if(w.resolveDepthBuffer&&(w.depthBuffer&&(q|=n.DEPTH_BUFFER_BIT),w.stencilBuffer&&w.resolveStencilBuffer&&(q|=n.STENCIL_BUFFER_BIT)),Y){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,ae.__webglColorRenderbuffer[ue]);const Pe=i.get(v[ue]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Pe,0)}n.blitFramebuffer(0,0,O,V,0,0,O,V,q,n.NEAREST),l===!0&&(pe.length=0,Ue.length=0,pe.push(n.COLOR_ATTACHMENT0+ue),w.depthBuffer&&w.resolveDepthBuffer===!1&&(pe.push(re),Ue.push(re),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,Ue)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,pe))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),Y)for(let ue=0;ue<v.length;ue++){t.bindFramebuffer(n.FRAMEBUFFER,ae.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ue,n.RENDERBUFFER,ae.__webglColorRenderbuffer[ue]);const Pe=i.get(v[ue]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,ae.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ue,n.TEXTURE_2D,Pe,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ae.__webglMultisampledFramebuffer)}else if(w.depthBuffer&&w.resolveDepthBuffer===!1&&l){const v=w.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[v])}}}function ke(w){return Math.min(s.maxSamples,w.samples)}function Ge(w){const v=i.get(w);return w.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function L(w){const v=r.render.frame;h.get(w)!==v&&(h.set(w,v),w.update())}function rt(w,v){const O=w.colorSpace,V=w.format,q=w.type;return w.isCompressedTexture===!0||w.isVideoTexture===!0||O!==_a&&O!==ni&&(je.getTransfer(O)===it?(V!==Zt||q!==Wt)&&Ae("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Fe("WebGLTextures: Unsupported texture color space:",O)),v}function Qe(w){return typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement?(c.width=w.naturalWidth||w.width,c.height=w.naturalHeight||w.height):typeof VideoFrame<"u"&&w instanceof VideoFrame?(c.width=w.displayWidth,c.height=w.displayHeight):(c.width=w.width,c.height=w.height),c}this.allocateTextureUnit=W,this.resetTextureUnits=B,this.getTextureUnits=X,this.setTextureUnits=F,this.setTexture2D=Z,this.setTexture2DArray=ie,this.setTexture3D=he,this.setTextureCube=oe,this.rebindTextures=te,this.setupRenderTarget=ee,this.updateRenderTargetMipmap=_e,this.updateMultisampleRenderTarget=Re,this.setupDepthRenderbuffer=Q,this.setupFrameBufferTexture=Ne,this.useMultisampledRTT=Ge,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function FM(n,e){function t(i,s=ni){let a;const r=je.getTransfer(s);if(i===Wt)return n.UNSIGNED_BYTE;if(i===Ql)return n.UNSIGNED_SHORT_4_4_4_4;if(i===jl)return n.UNSIGNED_SHORT_5_5_5_1;if(i===lf)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===cf)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===af)return n.BYTE;if(i===of)return n.SHORT;if(i===Qs)return n.UNSIGNED_SHORT;if(i===Zl)return n.INT;if(i===yn)return n.UNSIGNED_INT;if(i===Jt)return n.FLOAT;if(i===Bn)return n.HALF_FLOAT;if(i===hf)return n.ALPHA;if(i===uf)return n.RGB;if(i===Zt)return n.RGBA;if(i===zn)return n.DEPTH_COMPONENT;if(i===xi)return n.DEPTH_STENCIL;if(i===ec)return n.RED;if(i===tc)return n.RED_INTEGER;if(i===Ei)return n.RG;if(i===nc)return n.RG_INTEGER;if(i===ic)return n.RGBA_INTEGER;if(i===sa||i===ra||i===aa||i===oa)if(r===it)if(a=e.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(i===sa)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===ra)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===aa)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===oa)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=e.get("WEBGL_compressed_texture_s3tc"),a!==null){if(i===sa)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===ra)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===aa)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===oa)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===nl||i===il||i===sl||i===rl)if(a=e.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(i===nl)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===il)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===sl)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===rl)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===al||i===ol||i===ll||i===cl||i===hl||i===pa||i===ul)if(a=e.get("WEBGL_compressed_texture_etc"),a!==null){if(i===al||i===ol)return r===it?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(i===ll)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC;if(i===cl)return a.COMPRESSED_R11_EAC;if(i===hl)return a.COMPRESSED_SIGNED_R11_EAC;if(i===pa)return a.COMPRESSED_RG11_EAC;if(i===ul)return a.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===fl||i===dl||i===pl||i===ml||i===gl||i===_l||i===vl||i===xl||i===Ml||i===yl||i===Sl||i===bl||i===El||i===Tl)if(a=e.get("WEBGL_compressed_texture_astc"),a!==null){if(i===fl)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===dl)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===pl)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===ml)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===gl)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===_l)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===vl)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===xl)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Ml)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===yl)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Sl)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===bl)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===El)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Tl)return r===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Al||i===wl||i===Rl)if(a=e.get("EXT_texture_compression_bptc"),a!==null){if(i===Al)return r===it?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===wl)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Rl)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Pl||i===Cl||i===ma||i===Il)if(a=e.get("EXT_texture_compression_rgtc"),a!==null){if(i===Pl)return a.COMPRESSED_RED_RGTC1_EXT;if(i===Cl)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===ma)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Il)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===js?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}const OM=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,BM=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class zM{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const i=new bf(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new Sn({vertexShader:OM,fragmentShader:BM,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new yt(new bs(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class kM extends Pi{constructor(e,t){super();const i=this;let s=null,a=1,r=null,o="local-floor",l=1,c=null,h=null,f=null,u=null,d=null,g=null;const M=typeof XRWebGLBinding<"u",m=new zM,p={},y=t.getContextAttributes();let b=null,x=null;const A=[],E=[],R=new ne;let _=null;const T=new Gt;T.viewport=new lt;const P=new Gt;P.viewport=new lt;const I=[T,P],N=new V0;let B=null,X=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let le=A[K];return le===void 0&&(le=new no,A[K]=le),le.getTargetRaySpace()},this.getControllerGrip=function(K){let le=A[K];return le===void 0&&(le=new no,A[K]=le),le.getGripSpace()},this.getHand=function(K){let le=A[K];return le===void 0&&(le=new no,A[K]=le),le.getHandSpace()};function F(K){const le=E.indexOf(K.inputSource);if(le===-1)return;const se=A[le];se!==void 0&&(se.update(K.inputSource,K.frame,c||r),se.dispatchEvent({type:K.type,data:K.inputSource}))}function W(){s.removeEventListener("select",F),s.removeEventListener("selectstart",F),s.removeEventListener("selectend",F),s.removeEventListener("squeeze",F),s.removeEventListener("squeezestart",F),s.removeEventListener("squeezeend",F),s.removeEventListener("end",W),s.removeEventListener("inputsourceschange",H);for(let K=0;K<A.length;K++){const le=E[K];le!==null&&(E[K]=null,A[K].disconnect(le))}B=null,X=null,m.reset();for(const K in p)delete p[K];e.setRenderTarget(b),d=null,u=null,f=null,s=null,x=null,et.stop(),i.isPresenting=!1,e.setPixelRatio(_),e.setSize(R.width,R.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){a=K,i.isPresenting===!0&&Ae("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){o=K,i.isPresenting===!0&&Ae("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||r},this.setReferenceSpace=function(K){c=K},this.getBaseLayer=function(){return u!==null?u:d},this.getBinding=function(){return f===null&&M&&(f=new XRWebGLBinding(s,t)),f},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(K){if(s=K,s!==null){if(b=e.getRenderTarget(),s.addEventListener("select",F),s.addEventListener("selectstart",F),s.addEventListener("selectend",F),s.addEventListener("squeeze",F),s.addEventListener("squeezestart",F),s.addEventListener("squeezeend",F),s.addEventListener("end",W),s.addEventListener("inputsourceschange",H),y.xrCompatible!==!0&&await t.makeXRCompatible(),_=e.getPixelRatio(),e.getSize(R),M&&"createProjectionLayer"in XRWebGLBinding.prototype){let se=null,Ie=null,ze=null;y.depth&&(ze=y.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,se=y.stencil?xi:zn,Ie=y.stencil?js:yn);const Ne={colorFormat:t.RGBA8,depthFormat:ze,scaleFactor:a};f=this.getBinding(),u=f.createProjectionLayer(Ne),s.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),x=new xn(u.textureWidth,u.textureHeight,{format:Zt,type:Wt,depthTexture:new ps(u.textureWidth,u.textureHeight,Ie,void 0,void 0,void 0,void 0,void 0,void 0,se),stencilBuffer:y.stencil,colorSpace:e.outputColorSpace,samples:y.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}else{const se={antialias:y.antialias,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:a};d=new XRWebGLLayer(s,t,se),s.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),x=new xn(d.framebufferWidth,d.framebufferHeight,{format:Zt,type:Wt,colorSpace:e.outputColorSpace,stencilBuffer:y.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(l),c=null,r=await s.requestReferenceSpace(o),et.setContext(s),et.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function H(K){for(let le=0;le<K.removed.length;le++){const se=K.removed[le],Ie=E.indexOf(se);Ie>=0&&(E[Ie]=null,A[Ie].disconnect(se))}for(let le=0;le<K.added.length;le++){const se=K.added[le];let Ie=E.indexOf(se);if(Ie===-1){for(let Ne=0;Ne<A.length;Ne++)if(Ne>=E.length){E.push(se),Ie=Ne;break}else if(E[Ne]===null){E[Ne]=se,Ie=Ne;break}if(Ie===-1)break}const ze=A[Ie];ze&&ze.connect(se)}}const Z=new C,ie=new C;function he(K,le,se){Z.setFromMatrixPosition(le.matrixWorld),ie.setFromMatrixPosition(se.matrixWorld);const Ie=Z.distanceTo(ie),ze=le.projectionMatrix.elements,Ne=se.projectionMatrix.elements,nt=ze[14]/(ze[10]-1),Ve=ze[14]/(ze[10]+1),Q=(ze[9]+1)/ze[5],te=(ze[9]-1)/ze[5],ee=(ze[8]-1)/ze[0],_e=(Ne[8]+1)/Ne[0],pe=nt*ee,Ue=nt*_e,Re=Ie/(-ee+_e),ke=Re*-ee;if(le.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(ke),K.translateZ(Re),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert(),ze[10]===-1)K.projectionMatrix.copy(le.projectionMatrix),K.projectionMatrixInverse.copy(le.projectionMatrixInverse);else{const Ge=nt+Re,L=Ve+Re,rt=pe-ke,Qe=Ue+(Ie-ke),w=Q*Ve/L*Ge,v=te*Ve/L*Ge;K.projectionMatrix.makePerspective(rt,Qe,w,v,Ge,L),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}}function oe(K,le){le===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(le.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(s===null)return;let le=K.near,se=K.far;m.texture!==null&&(m.depthNear>0&&(le=m.depthNear),m.depthFar>0&&(se=m.depthFar)),N.near=P.near=T.near=le,N.far=P.far=T.far=se,(B!==N.near||X!==N.far)&&(s.updateRenderState({depthNear:N.near,depthFar:N.far}),B=N.near,X=N.far),N.layers.mask=K.layers.mask|6,T.layers.mask=N.layers.mask&-5,P.layers.mask=N.layers.mask&-3;const Ie=K.parent,ze=N.cameras;oe(N,Ie);for(let Ne=0;Ne<ze.length;Ne++)oe(ze[Ne],Ie);ze.length===2?he(N,T,P):N.projectionMatrix.copy(T.projectionMatrix),ye(K,N,Ie)};function ye(K,le,se){se===null?K.matrix.copy(le.matrixWorld):(K.matrix.copy(se.matrixWorld),K.matrix.invert(),K.matrix.multiply(le.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(le.projectionMatrix),K.projectionMatrixInverse.copy(le.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=ds*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return N},this.getFoveation=function(){if(!(u===null&&d===null))return l},this.setFoveation=function(K){l=K,u!==null&&(u.fixedFoveation=K),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=K)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(N)},this.getCameraTexture=function(K){return p[K]};let Je=null;function ht(K,le){if(h=le.getViewerPose(c||r),g=le,h!==null){const se=h.views;d!==null&&(e.setRenderTargetFramebuffer(x,d.framebuffer),e.setRenderTarget(x));let Ie=!1;se.length!==N.cameras.length&&(N.cameras.length=0,Ie=!0);for(let Ve=0;Ve<se.length;Ve++){const Q=se[Ve];let te=null;if(d!==null)te=d.getViewport(Q);else{const _e=f.getViewSubImage(u,Q);te=_e.viewport,Ve===0&&(e.setRenderTargetTextures(x,_e.colorTexture,_e.depthStencilTexture),e.setRenderTarget(x))}let ee=I[Ve];ee===void 0&&(ee=new Gt,ee.layers.enable(Ve),ee.viewport=new lt,I[Ve]=ee),ee.matrix.fromArray(Q.transform.matrix),ee.matrix.decompose(ee.position,ee.quaternion,ee.scale),ee.projectionMatrix.fromArray(Q.projectionMatrix),ee.projectionMatrixInverse.copy(ee.projectionMatrix).invert(),ee.viewport.set(te.x,te.y,te.width,te.height),Ve===0&&(N.matrix.copy(ee.matrix),N.matrix.decompose(N.position,N.quaternion,N.scale)),Ie===!0&&N.cameras.push(ee)}const ze=s.enabledFeatures;if(ze&&ze.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&M){f=i.getBinding();const Ve=f.getDepthInformation(se[0]);Ve&&Ve.isValid&&Ve.texture&&m.init(Ve,s.renderState)}if(ze&&ze.includes("camera-access")&&M){e.state.unbindTexture(),f=i.getBinding();for(let Ve=0;Ve<se.length;Ve++){const Q=se[Ve].camera;if(Q){let te=p[Q];te||(te=new bf,p[Q]=te);const ee=f.getCameraImage(Q);te.sourceTexture=ee}}}}for(let se=0;se<A.length;se++){const Ie=E[se],ze=A[se];Ie!==null&&ze!==void 0&&ze.update(Ie,le,c||r)}Je&&Je(K,le),le.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:le}),g=null}const et=new Zf;et.setAnimationLoop(ht),this.setAnimationLoop=function(K){Je=K},this.dispose=function(){}}}const VM=new Ye,sd=new We;sd.set(-1,0,0,0,1,0,0,0,1);function HM(n,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function i(m,p){p.color.getRGB(m.fogColor.value,qf(n)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,y,b,x){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?a(m,p):p.isMeshLambertMaterial?(a(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(a(m,p),f(m,p)):p.isMeshPhongMaterial?(a(m,p),h(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(a(m,p),u(m,p),p.isMeshPhysicalMaterial&&d(m,p,x)):p.isMeshMatcapMaterial?(a(m,p),g(m,p)):p.isMeshDepthMaterial?a(m,p):p.isMeshDistanceMaterial?(a(m,p),M(m,p)):p.isMeshNormalMaterial?a(m,p):p.isLineBasicMaterial?(r(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?l(m,p,y,b):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function a(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===zt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===zt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const y=e.get(p),b=y.envMap,x=y.envMapRotation;b&&(m.envMap.value=b,m.envMapRotation.value.setFromMatrix4(VM.makeRotationFromEuler(x)).transpose(),b.isCubeTexture&&b.isRenderTargetTexture===!1&&m.envMapRotation.value.premultiply(sd),m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function r(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,y,b){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*y,m.scale.value=b*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function f(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function u(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function d(m,p,y){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===zt&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=y.texture,m.transmissionSamplerSize.value.set(y.width,y.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function M(m,p){const y=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(y.matrixWorld),m.nearDistance.value=y.shadow.camera.near,m.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function GM(n,e,t,i){let s={},a={},r=[];const o=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(x,A){const E=A.program;i.uniformBlockBinding(x,E)}function c(x,A){let E=s[x.id];E===void 0&&(m(x),E=h(x),s[x.id]=E,x.addEventListener("dispose",y));const R=A.program;i.updateUBOMapping(x,R);const _=e.render.frame;a[x.id]!==_&&(u(x),a[x.id]=_)}function h(x){const A=f();x.__bindingPointIndex=A;const E=n.createBuffer(),R=x.__size,_=x.usage;return n.bindBuffer(n.UNIFORM_BUFFER,E),n.bufferData(n.UNIFORM_BUFFER,R,_),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,A,E),E}function f(){for(let x=0;x<o;x++)if(r.indexOf(x)===-1)return r.push(x),x;return Fe("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(x){const A=s[x.id],E=x.uniforms,R=x.__cache;n.bindBuffer(n.UNIFORM_BUFFER,A);for(let _=0,T=E.length;_<T;_++){const P=E[_];if(Array.isArray(P))for(let I=0,N=P.length;I<N;I++)d(P[I],_,I,R);else d(P,_,0,R)}n.bindBuffer(n.UNIFORM_BUFFER,null)}function d(x,A,E,R){if(M(x,A,E,R)===!0){const _=x.__offset,T=x.value;if(Array.isArray(T)){let P=0;for(let I=0;I<T.length;I++){const N=T[I],B=p(N);g(N,x.__data,P),typeof N!="number"&&typeof N!="boolean"&&!N.isMatrix3&&!ArrayBuffer.isView(N)&&(P+=B.storage/Float32Array.BYTES_PER_ELEMENT)}}else g(T,x.__data,0);n.bufferSubData(n.UNIFORM_BUFFER,_,x.__data)}}function g(x,A,E){typeof x=="number"||typeof x=="boolean"?A[0]=x:x.isMatrix3?(A[0]=x.elements[0],A[1]=x.elements[1],A[2]=x.elements[2],A[3]=0,A[4]=x.elements[3],A[5]=x.elements[4],A[6]=x.elements[5],A[7]=0,A[8]=x.elements[6],A[9]=x.elements[7],A[10]=x.elements[8],A[11]=0):ArrayBuffer.isView(x)?A.set(new x.constructor(x.buffer,x.byteOffset,A.length)):x.toArray(A,E)}function M(x,A,E,R){const _=x.value,T=A+"_"+E;if(R[T]===void 0)return typeof _=="number"||typeof _=="boolean"?R[T]=_:ArrayBuffer.isView(_)?R[T]=_.slice():R[T]=_.clone(),!0;{const P=R[T];if(typeof _=="number"||typeof _=="boolean"){if(P!==_)return R[T]=_,!0}else{if(ArrayBuffer.isView(_))return!0;if(P.equals(_)===!1)return P.copy(_),!0}}return!1}function m(x){const A=x.uniforms;let E=0;const R=16;for(let T=0,P=A.length;T<P;T++){const I=Array.isArray(A[T])?A[T]:[A[T]];for(let N=0,B=I.length;N<B;N++){const X=I[N],F=Array.isArray(X.value)?X.value:[X.value];for(let W=0,H=F.length;W<H;W++){const Z=F[W],ie=p(Z),he=E%R,oe=he%ie.boundary,ye=he+oe;E+=oe,ye!==0&&R-ye<ie.storage&&(E+=R-ye),X.__data=new Float32Array(ie.storage/Float32Array.BYTES_PER_ELEMENT),X.__offset=E,E+=ie.storage}}}const _=E%R;return _>0&&(E+=R-_),x.__size=E,x.__cache={},this}function p(x){const A={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(A.boundary=4,A.storage=4):x.isVector2?(A.boundary=8,A.storage=8):x.isVector3||x.isColor?(A.boundary=16,A.storage=12):x.isVector4?(A.boundary=16,A.storage=16):x.isMatrix3?(A.boundary=48,A.storage=48):x.isMatrix4?(A.boundary=64,A.storage=64):x.isTexture?Ae("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(x)?(A.boundary=16,A.storage=x.byteLength):Ae("WebGLRenderer: Unsupported uniform value type.",x),A}function y(x){const A=x.target;A.removeEventListener("dispose",y);const E=r.indexOf(A.__bindingPointIndex);r.splice(E,1),n.deleteBuffer(s[A.id]),delete s[A.id],delete a[A.id]}function b(){for(const x in s)n.deleteBuffer(s[x]);r=[],s={},a={}}return{bind:l,update:c,dispose:b}}const WM=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let un=null;function XM(){return un===null&&(un=new uc(WM,16,16,Ei,Bn),un.name="DFG_LUT",un.minFilter=Ut,un.magFilter=Ut,un.wrapS=Dn,un.wrapT=Dn,un.generateMipmaps=!1,un.needsUpdate=!0),un}class Eb{constructor(e={}){const{canvas:t=Wp(),context:i=null,depth:s=!0,stencil:a=!1,alpha:r=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:u=!1,outputBufferType:d=Wt}=e;this.isWebGLRenderer=!0;let g;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=i.getContextAttributes().alpha}else g=r;const M=d,m=new Set([ic,nc,tc]),p=new Set([Wt,yn,Qs,js,Ql,jl]),y=new Uint32Array(4),b=new Int32Array(4),x=new C;let A=null,E=null;const R=[],_=[];let T=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=vn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const P=this;let I=!1,N=null,B=null,X=null,F=null;this._outputColorSpace=Bt;let W=0,H=0,Z=null,ie=-1,he=null;const oe=new lt,ye=new lt;let Je=null;const ht=new He(0);let et=0,K=t.width,le=t.height,se=1,Ie=null,ze=null;const Ne=new lt(0,0,K,le),nt=new lt(0,0,K,le);let Ve=!1;const Q=new dc;let te=!1,ee=!1;const _e=new Ye,pe=new C,Ue=new lt,Re={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ke=!1;function Ge(){return Z===null?se:1}let L=i;function rt(S,U){return t.getContext(S,U)}try{const S={alpha:!0,depth:s,stencil:a,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Jl}`),t.addEventListener("webglcontextlost",xt,!1),t.addEventListener("webglcontextrestored",pt,!1),t.addEventListener("webglcontextcreationerror",on,!1),L===null){const U="webgl2";if(L=rt(U,S),L===null)throw rt(U)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(S){throw Fe("WebGLRenderer: "+S.message),S}let Qe,w,v,O,V,q,re,ae,Y,J,ue,Pe,me,fe,De,Oe,Xe,D,ce,$,de,Me,j;function we(){Qe=new Xv(L),Qe.init(),de=new FM(L,Qe),w=new Ov(L,Qe,e,de),v=new NM(L,Qe),w.reversedDepthBuffer&&u&&v.buffers.depth.setReversed(!0),B=L.createFramebuffer(),X=L.createFramebuffer(),F=L.createFramebuffer(),O=new $v(L),V=new MM,q=new UM(L,Qe,v,V,w,de,O),re=new Wv(P),ae=new Q0(L),Me=new Uv(L,ae),Y=new qv(L,ae,O,Me),J=new Jv(L,Y,ae,Me,O),D=new Kv(L,w,q),De=new Bv(V),ue=new xM(P,re,Qe,w,Me,De),Pe=new HM(P,V),me=new SM,fe=new RM(Qe),Xe=new Nv(P,re,v,J,g,l),Oe=new DM(P,J,w),j=new GM(L,O,w,v),ce=new Fv(L,Qe,O),$=new Yv(L,Qe,O),O.programs=ue.programs,P.capabilities=w,P.extensions=Qe,P.properties=V,P.renderLists=me,P.shadowMap=Oe,P.state=v,P.info=O}we(),M!==Wt&&(T=new Qv(M,t.width,t.height,o,s,a));const Ee=new kM(P,L);this.xr=Ee,this.getContext=function(){return L},this.getContextAttributes=function(){return L.getContextAttributes()},this.forceContextLoss=function(){const S=Qe.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){const S=Qe.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return se},this.setPixelRatio=function(S){S!==void 0&&(se=S,this.setSize(K,le,!1))},this.getSize=function(S){return S.set(K,le)},this.setSize=function(S,U,G=!0){if(Ee.isPresenting){Ae("WebGLRenderer: Can't change size while VR device is presenting.");return}K=S,le=U,t.width=Math.floor(S*se),t.height=Math.floor(U*se),G===!0&&(t.style.width=S+"px",t.style.height=U+"px"),T!==null&&T.setSize(t.width,t.height),this.setViewport(0,0,S,U)},this.getDrawingBufferSize=function(S){return S.set(K*se,le*se).floor()},this.setDrawingBufferSize=function(S,U,G){K=S,le=U,se=G,t.width=Math.floor(S*G),t.height=Math.floor(U*G),this.setViewport(0,0,S,U)},this.setEffects=function(S){if(M===Wt){Fe("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(S){for(let U=0;U<S.length;U++)if(S[U].isOutputPass===!0){Ae("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}T.setEffects(S||[])},this.getCurrentViewport=function(S){return S.copy(oe)},this.getViewport=function(S){return S.copy(Ne)},this.setViewport=function(S,U,G,z){S.isVector4?Ne.set(S.x,S.y,S.z,S.w):Ne.set(S,U,G,z),v.viewport(oe.copy(Ne).multiplyScalar(se).round())},this.getScissor=function(S){return S.copy(nt)},this.setScissor=function(S,U,G,z){S.isVector4?nt.set(S.x,S.y,S.z,S.w):nt.set(S,U,G,z),v.scissor(ye.copy(nt).multiplyScalar(se).round())},this.getScissorTest=function(){return Ve},this.setScissorTest=function(S){v.setScissorTest(Ve=S)},this.setOpaqueSort=function(S){Ie=S},this.setTransparentSort=function(S){ze=S},this.getClearColor=function(S){return S.copy(Xe.getClearColor())},this.setClearColor=function(){Xe.setClearColor(...arguments)},this.getClearAlpha=function(){return Xe.getClearAlpha()},this.setClearAlpha=function(){Xe.setClearAlpha(...arguments)},this.clear=function(S=!0,U=!0,G=!0){let z=0;if(S){let k=!1;if(Z!==null){const xe=Z.texture.format;k=m.has(xe)}if(k){const xe=Z.texture.type,be=p.has(xe),ve=Xe.getClearColor(),Te=Xe.getClearAlpha(),Ce=ve.r,qe=ve.g,Ze=ve.b;be?(y[0]=Ce,y[1]=qe,y[2]=Ze,y[3]=Te,L.clearBufferuiv(L.COLOR,0,y)):(b[0]=Ce,b[1]=qe,b[2]=Ze,b[3]=Te,L.clearBufferiv(L.COLOR,0,b))}else z|=L.COLOR_BUFFER_BIT}U&&(z|=L.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),G&&(z|=L.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),z!==0&&L.clear(z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(S){S.setRenderer(this),N=S},this.dispose=function(){t.removeEventListener("webglcontextlost",xt,!1),t.removeEventListener("webglcontextrestored",pt,!1),t.removeEventListener("webglcontextcreationerror",on,!1),Xe.dispose(),me.dispose(),fe.dispose(),V.dispose(),re.dispose(),J.dispose(),Me.dispose(),j.dispose(),ue.dispose(),Ee.dispose(),Ee.removeEventListener("sessionstart",Hc),Ee.removeEventListener("sessionend",Gc),li.stop()};function xt(S){S.preventDefault(),xa("WebGLRenderer: Context Lost."),I=!0}function pt(){xa("WebGLRenderer: Context Restored."),I=!1;const S=O.autoReset,U=Oe.enabled,G=Oe.autoUpdate,z=Oe.needsUpdate,k=Oe.type;we(),O.autoReset=S,Oe.enabled=U,Oe.autoUpdate=G,Oe.needsUpdate=z,Oe.type=k}function on(S){Fe("WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function ln(S){const U=S.target;U.removeEventListener("dispose",ln),tp(U)}function tp(S){np(S),V.remove(S)}function np(S){const U=V.get(S).programs;U!==void 0&&(U.forEach(function(G){ue.releaseProgram(G)}),S.isShaderMaterial&&ue.releaseShaderCache(S))}this.renderBufferDirect=function(S,U,G,z,k,xe){U===null&&(U=Re);const be=k.isMesh&&k.matrixWorld.determinantAffine()<0,ve=rp(S,U,G,z,k);v.setMaterial(z,be);let Te=G.index,Ce=1;if(z.wireframe===!0){if(Te=Y.getWireframeAttribute(G),Te===void 0)return;Ce=2}const qe=G.drawRange,Ze=G.attributes.position;let Le=qe.start*Ce,at=(qe.start+qe.count)*Ce;xe!==null&&(Le=Math.max(Le,xe.start*Ce),at=Math.min(at,(xe.start+xe.count)*Ce)),Te!==null?(Le=Math.max(Le,0),at=Math.min(at,Te.count)):Ze!=null&&(Le=Math.max(Le,0),at=Math.min(at,Ze.count));const St=at-Le;if(St<0||St===1/0)return;Me.setup(k,z,ve,G,Te);let Mt,ut=ce;if(Te!==null&&(Mt=ae.get(Te),ut=$,ut.setIndex(Mt)),k.isMesh)z.wireframe===!0?(v.setLineWidth(z.wireframeLinewidth*Ge()),ut.setMode(L.LINES)):ut.setMode(L.TRIANGLES);else if(k.isLine){let Lt=z.linewidth;Lt===void 0&&(Lt=1),v.setLineWidth(Lt*Ge()),k.isLineSegments?ut.setMode(L.LINES):k.isLineLoop?ut.setMode(L.LINE_LOOP):ut.setMode(L.LINE_STRIP)}else k.isPoints?ut.setMode(L.POINTS):k.isSprite&&ut.setMode(L.TRIANGLES);if(k.isBatchedMesh)if(Qe.get("WEBGL_multi_draw"))ut.renderMultiDraw(k._multiDrawStarts,k._multiDrawCounts,k._multiDrawCount);else{const Lt=k._multiDrawStarts,Se=k._multiDrawCounts,kt=k._multiDrawCount,tt=Te?ae.get(Te).bytesPerElement:1,qt=V.get(z).currentProgram.getUniforms();for(let cn=0;cn<kt;cn++)qt.setValue(L,"_gl_DrawID",cn),ut.render(Lt[cn]/tt,Se[cn])}else if(k.isInstancedMesh)ut.renderInstances(Le,St,k.count);else if(G.isInstancedBufferGeometry){const Lt=G._maxInstanceCount!==void 0?G._maxInstanceCount:1/0,Se=Math.min(G.instanceCount,Lt);ut.renderInstances(Le,St,Se)}else ut.render(Le,St)};function Vc(S,U,G){S.transparent===!0&&S.side===Ln&&S.forceSinglePass===!1?(S.side=zt,S.needsUpdate=!0,gr(S,U,G),S.side=si,S.needsUpdate=!0,gr(S,U,G),S.side=Ln):gr(S,U,G)}this.compile=function(S,U,G=null){G===null&&(G=S),E=fe.get(G),E.init(U),_.push(E),G.traverseVisible(function(k){k.isLight&&k.layers.test(U.layers)&&(E.pushLight(k),k.castShadow&&E.pushShadow(k))}),S!==G&&S.traverseVisible(function(k){k.isLight&&k.layers.test(U.layers)&&(E.pushLight(k),k.castShadow&&E.pushShadow(k))}),E.setupLights();const z=new Set;return S.traverse(function(k){if(!(k.isMesh||k.isPoints||k.isLine||k.isSprite))return;const xe=k.material;if(xe)if(Array.isArray(xe))for(let be=0;be<xe.length;be++){const ve=xe[be];Vc(ve,G,k),z.add(ve)}else Vc(xe,G,k),z.add(xe)}),E=_.pop(),z},this.compileAsync=function(S,U,G=null){const z=this.compile(S,U,G);return new Promise(k=>{function xe(){if(z.forEach(function(be){V.get(be).currentProgram.isReady()&&z.delete(be)}),z.size===0){k(S);return}setTimeout(xe,10)}Qe.get("KHR_parallel_shader_compile")!==null?xe():setTimeout(xe,10)})};let Xa=null;function ip(S){Xa&&Xa(S)}function Hc(){li.stop()}function Gc(){li.start()}const li=new Zf;li.setAnimationLoop(ip),typeof self<"u"&&li.setContext(self),this.setAnimationLoop=function(S){Xa=S,Ee.setAnimationLoop(S),S===null?li.stop():li.start()},Ee.addEventListener("sessionstart",Hc),Ee.addEventListener("sessionend",Gc),this.render=function(S,U){if(U!==void 0&&U.isCamera!==!0){Fe("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(I===!0)return;N!==null&&N.renderStart(S,U);const G=Ee.enabled===!0&&Ee.isPresenting===!0,z=T!==null&&(Z===null||G)&&T.begin(P,Z);if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),U.parent===null&&U.matrixWorldAutoUpdate===!0&&U.updateMatrixWorld(),Ee.enabled===!0&&Ee.isPresenting===!0&&(T===null||T.isCompositing()===!1)&&(Ee.cameraAutoUpdate===!0&&Ee.updateCamera(U),U=Ee.getCamera()),S.isScene===!0&&S.onBeforeRender(P,S,U,Z),E=fe.get(S,_.length),E.init(U),E.state.textureUnits=q.getTextureUnits(),_.push(E),_e.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),Q.setFromProjectionMatrix(_e,_n,U.reversedDepth),ee=this.localClippingEnabled,te=De.init(this.clippingPlanes,ee),A=me.get(S,R.length),A.init(),R.push(A),Ee.enabled===!0&&Ee.isPresenting===!0){const be=P.xr.getDepthSensingMesh();be!==null&&qa(be,U,-1/0,P.sortObjects)}qa(S,U,0,P.sortObjects),A.finish(),P.sortObjects===!0&&A.sort(Ie,ze,U.reversedDepth),ke=Ee.enabled===!1||Ee.isPresenting===!1||Ee.hasDepthSensing()===!1,ke&&Xe.addToRenderList(A,S),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),te===!0&&De.beginShadows();const k=E.state.shadowsArray;if(Oe.render(k,S,U),te===!0&&De.endShadows(),(z&&T.hasRenderPass())===!1){const be=A.opaque,ve=A.transmissive;if(E.setupLights(),U.isArrayCamera){const Te=U.cameras;if(ve.length>0)for(let Ce=0,qe=Te.length;Ce<qe;Ce++){const Ze=Te[Ce];Xc(be,ve,S,Ze)}ke&&Xe.render(S);for(let Ce=0,qe=Te.length;Ce<qe;Ce++){const Ze=Te[Ce];Wc(A,S,Ze,Ze.viewport)}}else ve.length>0&&Xc(be,ve,S,U),ke&&Xe.render(S),Wc(A,S,U)}Z!==null&&H===0&&(q.updateMultisampleRenderTarget(Z),q.updateRenderTargetMipmap(Z)),z&&T.end(P),S.isScene===!0&&S.onAfterRender(P,S,U),Me.resetDefaultState(),ie=-1,he=null,_.pop(),_.length>0?(E=_[_.length-1],q.setTextureUnits(E.state.textureUnits),te===!0&&De.setGlobalState(P.clippingPlanes,E.state.camera)):E=null,R.pop(),R.length>0?A=R[R.length-1]:A=null,N!==null&&N.renderEnd()};function qa(S,U,G,z){if(S.visible===!1)return;if(S.layers.test(U.layers)){if(S.isGroup)G=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(U);else if(S.isLightProbeGrid)E.pushLightProbeGrid(S);else if(S.isLight)E.pushLight(S),S.castShadow&&E.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||Q.intersectsSprite(S)){z&&Ue.setFromMatrixPosition(S.matrixWorld).applyMatrix4(_e);const be=J.update(S),ve=S.material;ve.visible&&A.push(S,be,ve,G,Ue.z,null)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||Q.intersectsObject(S))){const be=J.update(S),ve=S.material;if(z&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),Ue.copy(S.boundingSphere.center)):(be.boundingSphere===null&&be.computeBoundingSphere(),Ue.copy(be.boundingSphere.center)),Ue.applyMatrix4(S.matrixWorld).applyMatrix4(_e)),Array.isArray(ve)){const Te=be.groups;for(let Ce=0,qe=Te.length;Ce<qe;Ce++){const Ze=Te[Ce],Le=ve[Ze.materialIndex];Le&&Le.visible&&A.push(S,be,Le,G,Ue.z,Ze)}}else ve.visible&&A.push(S,be,ve,G,Ue.z,null)}}const xe=S.children;for(let be=0,ve=xe.length;be<ve;be++)qa(xe[be],U,G,z)}function Wc(S,U,G,z){const{opaque:k,transmissive:xe,transparent:be}=S;E.setupLightsView(G),te===!0&&De.setGlobalState(P.clippingPlanes,G),z&&v.viewport(oe.copy(z)),k.length>0&&mr(k,U,G),xe.length>0&&mr(xe,U,G),be.length>0&&mr(be,U,G),v.buffers.depth.setTest(!0),v.buffers.depth.setMask(!0),v.buffers.color.setMask(!0),v.setPolygonOffset(!1)}function Xc(S,U,G,z){if((G.isScene===!0?G.overrideMaterial:null)!==null)return;if(E.state.transmissionRenderTarget[z.id]===void 0){const Le=Qe.has("EXT_color_buffer_half_float")||Qe.has("EXT_color_buffer_float");E.state.transmissionRenderTarget[z.id]=new xn(1,1,{generateMipmaps:!0,type:Le?Bn:Wt,minFilter:vi,samples:Math.max(4,w.samples),stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:je.workingColorSpace})}const xe=E.state.transmissionRenderTarget[z.id],be=z.viewport||oe;xe.setSize(be.z*P.transmissionResolutionScale,be.w*P.transmissionResolutionScale);const ve=P.getRenderTarget(),Te=P.getActiveCubeFace(),Ce=P.getActiveMipmapLevel();P.setRenderTarget(xe),P.getClearColor(ht),et=P.getClearAlpha(),et<1&&P.setClearColor(16777215,.5),P.clear(),ke&&Xe.render(G);const qe=P.toneMapping;P.toneMapping=vn;const Ze=z.viewport;if(z.viewport!==void 0&&(z.viewport=void 0),E.setupLightsView(z),te===!0&&De.setGlobalState(P.clippingPlanes,z),mr(S,G,z),q.updateMultisampleRenderTarget(xe),q.updateRenderTargetMipmap(xe),Qe.has("WEBGL_multisampled_render_to_texture")===!1){let Le=!1;for(let at=0,St=U.length;at<St;at++){const Mt=U[at],{object:ut,geometry:Lt,material:Se,group:kt}=Mt;if(Se.side===Ln&&ut.layers.test(z.layers)){const tt=Se.side;Se.side=zt,Se.needsUpdate=!0,qc(ut,G,z,Lt,Se,kt),Se.side=tt,Se.needsUpdate=!0,Le=!0}}Le===!0&&(q.updateMultisampleRenderTarget(xe),q.updateRenderTargetMipmap(xe))}P.setRenderTarget(ve,Te,Ce),P.setClearColor(ht,et),Ze!==void 0&&(z.viewport=Ze),P.toneMapping=qe}function mr(S,U,G){const z=U.isScene===!0?U.overrideMaterial:null;for(let k=0,xe=S.length;k<xe;k++){const be=S[k],{object:ve,geometry:Te,group:Ce}=be;let qe=be.material;qe.allowOverride===!0&&z!==null&&(qe=z),ve.layers.test(G.layers)&&qc(ve,U,G,Te,qe,Ce)}}function qc(S,U,G,z,k,xe){S.onBeforeRender(P,U,G,z,k,xe),S.modelViewMatrix.multiplyMatrices(G.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),k.onBeforeRender(P,U,G,z,S,xe),k.transparent===!0&&k.side===Ln&&k.forceSinglePass===!1?(k.side=zt,k.needsUpdate=!0,P.renderBufferDirect(G,U,z,k,S,xe),k.side=si,k.needsUpdate=!0,P.renderBufferDirect(G,U,z,k,S,xe),k.side=Ln):P.renderBufferDirect(G,U,z,k,S,xe),S.onAfterRender(P,U,G,z,k,xe)}function gr(S,U,G){U.isScene!==!0&&(U=Re);const z=V.get(S),k=E.state.lights,xe=E.state.shadowsArray,be=k.state.version,ve=ue.getParameters(S,k.state,xe,U,G,E.state.lightProbeGridArray),Te=ue.getProgramCacheKey(ve);let Ce=z.programs;z.environment=S.isMeshStandardMaterial||S.isMeshLambertMaterial||S.isMeshPhongMaterial?U.environment:null,z.fog=U.fog;const qe=S.isMeshStandardMaterial||S.isMeshLambertMaterial&&!S.envMap||S.isMeshPhongMaterial&&!S.envMap;z.envMap=re.get(S.envMap||z.environment,qe),z.envMapRotation=z.environment!==null&&S.envMap===null?U.environmentRotation:S.envMapRotation,Ce===void 0&&(S.addEventListener("dispose",ln),Ce=new Map,z.programs=Ce);let Ze=Ce.get(Te);if(Ze!==void 0){if(z.currentProgram===Ze&&z.lightsStateVersion===be)return $c(S,ve),Ze}else ve.uniforms=ue.getUniforms(S),N!==null&&S.isNodeMaterial&&N.build(S,G,ve),S.onBeforeCompile(ve,P),Ze=ue.acquireProgram(ve,Te),Ce.set(Te,Ze),z.uniforms=ve.uniforms;const Le=z.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Le.clippingPlanes=De.uniform),$c(S,ve),z.needsLights=op(S),z.lightsStateVersion=be,z.needsLights&&(Le.ambientLightColor.value=k.state.ambient,Le.lightProbe.value=k.state.probe,Le.directionalLights.value=k.state.directional,Le.directionalLightShadows.value=k.state.directionalShadow,Le.spotLights.value=k.state.spot,Le.spotLightShadows.value=k.state.spotShadow,Le.rectAreaLights.value=k.state.rectArea,Le.ltc_1.value=k.state.rectAreaLTC1,Le.ltc_2.value=k.state.rectAreaLTC2,Le.pointLights.value=k.state.point,Le.pointLightShadows.value=k.state.pointShadow,Le.hemisphereLights.value=k.state.hemi,Le.directionalShadowMatrix.value=k.state.directionalShadowMatrix,Le.spotLightMatrix.value=k.state.spotLightMatrix,Le.spotLightMap.value=k.state.spotLightMap,Le.pointShadowMatrix.value=k.state.pointShadowMatrix),z.lightProbeGrid=E.state.lightProbeGridArray.length>0,z.currentProgram=Ze,z.uniformsList=null,Ze}function Yc(S){if(S.uniformsList===null){const U=S.currentProgram.getUniforms();S.uniformsList=la.seqWithValue(U.seq,S.uniforms)}return S.uniformsList}function $c(S,U){const G=V.get(S);G.outputColorSpace=U.outputColorSpace,G.batching=U.batching,G.batchingColor=U.batchingColor,G.instancing=U.instancing,G.instancingColor=U.instancingColor,G.instancingMorph=U.instancingMorph,G.skinning=U.skinning,G.morphTargets=U.morphTargets,G.morphNormals=U.morphNormals,G.morphColors=U.morphColors,G.morphTargetsCount=U.morphTargetsCount,G.numClippingPlanes=U.numClippingPlanes,G.numIntersection=U.numClipIntersection,G.vertexAlphas=U.vertexAlphas,G.vertexTangents=U.vertexTangents,G.toneMapping=U.toneMapping}function sp(S,U){if(S.length===0)return null;if(S.length===1)return S[0].texture!==null?S[0]:null;x.setFromMatrixPosition(U.matrixWorld);for(let G=0,z=S.length;G<z;G++){const k=S[G];if(k.texture!==null&&k.boundingBox.containsPoint(x))return k}return null}function rp(S,U,G,z,k){U.isScene!==!0&&(U=Re),q.resetTextureUnits();const xe=U.fog,be=z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial?U.environment:null,ve=Z===null?P.outputColorSpace:Z.isXRRenderTarget===!0?Z.texture.colorSpace:je.workingColorSpace,Te=z.isMeshStandardMaterial||z.isMeshLambertMaterial&&!z.envMap||z.isMeshPhongMaterial&&!z.envMap,Ce=re.get(z.envMap||be,Te),qe=z.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,Ze=!!G.attributes.tangent&&(!!z.normalMap||z.anisotropy>0),Le=!!G.morphAttributes.position,at=!!G.morphAttributes.normal,St=!!G.morphAttributes.color;let Mt=vn;z.toneMapped&&(Z===null||Z.isXRRenderTarget===!0)&&(Mt=P.toneMapping);const ut=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,Lt=ut!==void 0?ut.length:0,Se=V.get(z),kt=E.state.lights;if(te===!0&&(ee===!0||S!==he)){const mt=S===he&&z.id===ie;De.setState(z,S,mt)}let tt=!1;z.version===Se.__version?(Se.needsLights&&Se.lightsStateVersion!==kt.state.version||Se.outputColorSpace!==ve||k.isBatchedMesh&&Se.batching===!1||!k.isBatchedMesh&&Se.batching===!0||k.isBatchedMesh&&Se.batchingColor===!0&&k.colorTexture===null||k.isBatchedMesh&&Se.batchingColor===!1&&k.colorTexture!==null||k.isInstancedMesh&&Se.instancing===!1||!k.isInstancedMesh&&Se.instancing===!0||k.isSkinnedMesh&&Se.skinning===!1||!k.isSkinnedMesh&&Se.skinning===!0||k.isInstancedMesh&&Se.instancingColor===!0&&k.instanceColor===null||k.isInstancedMesh&&Se.instancingColor===!1&&k.instanceColor!==null||k.isInstancedMesh&&Se.instancingMorph===!0&&k.morphTexture===null||k.isInstancedMesh&&Se.instancingMorph===!1&&k.morphTexture!==null||Se.envMap!==Ce||z.fog===!0&&Se.fog!==xe||Se.numClippingPlanes!==void 0&&(Se.numClippingPlanes!==De.numPlanes||Se.numIntersection!==De.numIntersection)||Se.vertexAlphas!==qe||Se.vertexTangents!==Ze||Se.morphTargets!==Le||Se.morphNormals!==at||Se.morphColors!==St||Se.toneMapping!==Mt||Se.morphTargetsCount!==Lt||!!Se.lightProbeGrid!=E.state.lightProbeGridArray.length>0)&&(tt=!0):(tt=!0,Se.__version=z.version);let qt=Se.currentProgram;tt===!0&&(qt=gr(z,U,k),N&&z.isNodeMaterial&&N.onUpdateProgram(z,qt,Se));let cn=!1,Xn=!1,Di=!1;const ft=qt.getUniforms(),bt=Se.uniforms;if(v.useProgram(qt.program)&&(cn=!0,Xn=!0,Di=!0),z.id!==ie&&(ie=z.id,Xn=!0),Se.needsLights){const mt=sp(E.state.lightProbeGridArray,k);Se.lightProbeGrid!==mt&&(Se.lightProbeGrid=mt,Xn=!0)}if(cn||he!==S){v.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),ft.setValue(L,"projectionMatrix",S.projectionMatrix),ft.setValue(L,"viewMatrix",S.matrixWorldInverse);const Yn=ft.map.cameraPosition;Yn!==void 0&&Yn.setValue(L,pe.setFromMatrixPosition(S.matrixWorld)),w.logarithmicDepthBuffer&&ft.setValue(L,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(z.isMeshPhongMaterial||z.isMeshToonMaterial||z.isMeshLambertMaterial||z.isMeshBasicMaterial||z.isMeshStandardMaterial||z.isShaderMaterial)&&ft.setValue(L,"isOrthographic",S.isOrthographicCamera===!0),he!==S&&(he=S,Xn=!0,Di=!0)}if(Se.needsLights&&(kt.state.directionalShadowMap.length>0&&ft.setValue(L,"directionalShadowMap",kt.state.directionalShadowMap,q),kt.state.spotShadowMap.length>0&&ft.setValue(L,"spotShadowMap",kt.state.spotShadowMap,q),kt.state.pointShadowMap.length>0&&ft.setValue(L,"pointShadowMap",kt.state.pointShadowMap,q)),k.isSkinnedMesh){ft.setOptional(L,k,"bindMatrix"),ft.setOptional(L,k,"bindMatrixInverse");const mt=k.skeleton;mt&&(mt.boneTexture===null&&mt.computeBoneTexture(),ft.setValue(L,"boneTexture",mt.boneTexture,q))}k.isBatchedMesh&&(ft.setOptional(L,k,"batchingTexture"),ft.setValue(L,"batchingTexture",k._matricesTexture,q),ft.setOptional(L,k,"batchingIdTexture"),ft.setValue(L,"batchingIdTexture",k._indirectTexture,q),ft.setOptional(L,k,"batchingColorTexture"),k._colorsTexture!==null&&ft.setValue(L,"batchingColorTexture",k._colorsTexture,q));const qn=G.morphAttributes;if((qn.position!==void 0||qn.normal!==void 0||qn.color!==void 0)&&D.update(k,G,qt),(Xn||Se.receiveShadow!==k.receiveShadow)&&(Se.receiveShadow=k.receiveShadow,ft.setValue(L,"receiveShadow",k.receiveShadow)),(z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial)&&z.envMap===null&&U.environment!==null&&(bt.envMapIntensity.value=U.environmentIntensity),bt.dfgLUT!==void 0&&(bt.dfgLUT.value=XM()),Xn){if(ft.setValue(L,"toneMappingExposure",P.toneMappingExposure),Se.needsLights&&ap(bt,Di),xe&&z.fog===!0&&Pe.refreshFogUniforms(bt,xe),Pe.refreshMaterialUniforms(bt,z,se,le,E.state.transmissionRenderTarget[S.id]),Se.needsLights&&Se.lightProbeGrid){const mt=Se.lightProbeGrid;bt.probesSH.value=mt.texture,bt.probesMin.value.copy(mt.boundingBox.min),bt.probesMax.value.copy(mt.boundingBox.max),bt.probesResolution.value.copy(mt.resolution)}la.upload(L,Yc(Se),bt,q)}if(z.isShaderMaterial&&z.uniformsNeedUpdate===!0&&(la.upload(L,Yc(Se),bt,q),z.uniformsNeedUpdate=!1),z.isSpriteMaterial&&ft.setValue(L,"center",k.center),ft.setValue(L,"modelViewMatrix",k.modelViewMatrix),ft.setValue(L,"normalMatrix",k.normalMatrix),ft.setValue(L,"modelMatrix",k.matrixWorld),z.uniformsGroups!==void 0){const mt=z.uniformsGroups;for(let Yn=0,Ni=mt.length;Yn<Ni;Yn++){const Kc=mt[Yn];j.update(Kc,qt),j.bind(Kc,qt)}}return qt}function ap(S,U){S.ambientLightColor.needsUpdate=U,S.lightProbe.needsUpdate=U,S.directionalLights.needsUpdate=U,S.directionalLightShadows.needsUpdate=U,S.pointLights.needsUpdate=U,S.pointLightShadows.needsUpdate=U,S.spotLights.needsUpdate=U,S.spotLightShadows.needsUpdate=U,S.rectAreaLights.needsUpdate=U,S.hemisphereLights.needsUpdate=U}function op(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return W},this.getActiveMipmapLevel=function(){return H},this.getRenderTarget=function(){return Z},this.setRenderTargetTextures=function(S,U,G){const z=V.get(S);z.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,z.__autoAllocateDepthBuffer===!1&&(z.__useRenderToTexture=!1),V.get(S.texture).__webglTexture=U,V.get(S.depthTexture).__webglTexture=z.__autoAllocateDepthBuffer?void 0:G,z.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,U){const G=V.get(S);G.__webglFramebuffer=U,G.__useDefaultFramebuffer=U===void 0},this.setRenderTarget=function(S,U=0,G=0){Z=S,W=U,H=G;let z=null,k=!1,xe=!1;if(S){const ve=V.get(S);if(ve.__useDefaultFramebuffer!==void 0){v.bindFramebuffer(L.FRAMEBUFFER,ve.__webglFramebuffer),oe.copy(S.viewport),ye.copy(S.scissor),Je=S.scissorTest,v.viewport(oe),v.scissor(ye),v.setScissorTest(Je),ie=-1;return}else if(ve.__webglFramebuffer===void 0)q.setupRenderTarget(S);else if(ve.__hasExternalTextures)q.rebindTextures(S,V.get(S.texture).__webglTexture,V.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){const qe=S.depthTexture;if(ve.__boundDepthTexture!==qe){if(qe!==null&&V.has(qe)&&(S.width!==qe.image.width||S.height!==qe.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");q.setupDepthRenderbuffer(S)}}const Te=S.texture;(Te.isData3DTexture||Te.isDataArrayTexture||Te.isCompressedArrayTexture)&&(xe=!0);const Ce=V.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Ce[U])?z=Ce[U][G]:z=Ce[U],k=!0):S.samples>0&&q.useMultisampledRTT(S)===!1?z=V.get(S).__webglMultisampledFramebuffer:Array.isArray(Ce)?z=Ce[G]:z=Ce,oe.copy(S.viewport),ye.copy(S.scissor),Je=S.scissorTest}else oe.copy(Ne).multiplyScalar(se).floor(),ye.copy(nt).multiplyScalar(se).floor(),Je=Ve;if(G!==0&&(z=B),v.bindFramebuffer(L.FRAMEBUFFER,z)&&v.drawBuffers(S,z),v.viewport(oe),v.scissor(ye),v.setScissorTest(Je),k){const ve=V.get(S.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_CUBE_MAP_POSITIVE_X+U,ve.__webglTexture,G)}else if(xe){const ve=U;for(let Te=0;Te<S.textures.length;Te++){const Ce=V.get(S.textures[Te]);L.framebufferTextureLayer(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0+Te,Ce.__webglTexture,G,ve)}}else if(S!==null&&G!==0){const ve=V.get(S.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,ve.__webglTexture,G)}ie=-1},this.readRenderTargetPixels=function(S,U,G,z,k,xe,be,ve=0){if(!(S&&S.isWebGLRenderTarget)){Fe("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Te=V.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&be!==void 0&&(Te=Te[be]),Te){v.bindFramebuffer(L.FRAMEBUFFER,Te);try{const Ce=S.textures[ve],qe=Ce.format,Ze=Ce.type;if(S.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+ve),!w.textureFormatReadable(qe)){Fe("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!w.textureTypeReadable(Ze)){Fe("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}U>=0&&U<=S.width-z&&G>=0&&G<=S.height-k&&L.readPixels(U,G,z,k,de.convert(qe),de.convert(Ze),xe)}finally{const Ce=Z!==null?V.get(Z).__webglFramebuffer:null;v.bindFramebuffer(L.FRAMEBUFFER,Ce)}}},this.readRenderTargetPixelsAsync=async function(S,U,G,z,k,xe,be,ve=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Te=V.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&be!==void 0&&(Te=Te[be]),Te)if(U>=0&&U<=S.width-z&&G>=0&&G<=S.height-k){v.bindFramebuffer(L.FRAMEBUFFER,Te);const Ce=S.textures[ve],qe=Ce.format,Ze=Ce.type;if(S.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+ve),!w.textureFormatReadable(qe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!w.textureTypeReadable(Ze))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Le=L.createBuffer();L.bindBuffer(L.PIXEL_PACK_BUFFER,Le),L.bufferData(L.PIXEL_PACK_BUFFER,xe.byteLength,L.STREAM_READ),L.readPixels(U,G,z,k,de.convert(qe),de.convert(Ze),0);const at=Z!==null?V.get(Z).__webglFramebuffer:null;v.bindFramebuffer(L.FRAMEBUFFER,at);const St=L.fenceSync(L.SYNC_GPU_COMMANDS_COMPLETE,0);return L.flush(),await Xp(L,St,4),L.bindBuffer(L.PIXEL_PACK_BUFFER,Le),L.getBufferSubData(L.PIXEL_PACK_BUFFER,0,xe),L.deleteBuffer(Le),L.deleteSync(St),xe}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,U=null,G=0){const z=Math.pow(2,-G),k=Math.floor(S.image.width*z),xe=Math.floor(S.image.height*z),be=U!==null?U.x:0,ve=U!==null?U.y:0;q.setTexture2D(S,0),L.copyTexSubImage2D(L.TEXTURE_2D,G,0,0,be,ve,k,xe),v.unbindTexture()},this.copyTextureToTexture=function(S,U,G=null,z=null,k=0,xe=0){let be,ve,Te,Ce,qe,Ze,Le,at,St;const Mt=S.isCompressedTexture?S.mipmaps[xe]:S.image;if(G!==null)be=G.max.x-G.min.x,ve=G.max.y-G.min.y,Te=G.isBox3?G.max.z-G.min.z:1,Ce=G.min.x,qe=G.min.y,Ze=G.isBox3?G.min.z:0;else{const bt=Math.pow(2,-k);be=Math.floor(Mt.width*bt),ve=Math.floor(Mt.height*bt),S.isDataArrayTexture?Te=Mt.depth:S.isData3DTexture?Te=Math.floor(Mt.depth*bt):Te=1,Ce=0,qe=0,Ze=0}z!==null?(Le=z.x,at=z.y,St=z.z):(Le=0,at=0,St=0);const ut=de.convert(U.format),Lt=de.convert(U.type);let Se;U.isData3DTexture?(q.setTexture3D(U,0),Se=L.TEXTURE_3D):U.isDataArrayTexture||U.isCompressedArrayTexture?(q.setTexture2DArray(U,0),Se=L.TEXTURE_2D_ARRAY):(q.setTexture2D(U,0),Se=L.TEXTURE_2D),v.activeTexture(L.TEXTURE0),v.pixelStorei(L.UNPACK_FLIP_Y_WEBGL,U.flipY),v.pixelStorei(L.UNPACK_PREMULTIPLY_ALPHA_WEBGL,U.premultiplyAlpha),v.pixelStorei(L.UNPACK_ALIGNMENT,U.unpackAlignment);const kt=v.getParameter(L.UNPACK_ROW_LENGTH),tt=v.getParameter(L.UNPACK_IMAGE_HEIGHT),qt=v.getParameter(L.UNPACK_SKIP_PIXELS),cn=v.getParameter(L.UNPACK_SKIP_ROWS),Xn=v.getParameter(L.UNPACK_SKIP_IMAGES);v.pixelStorei(L.UNPACK_ROW_LENGTH,Mt.width),v.pixelStorei(L.UNPACK_IMAGE_HEIGHT,Mt.height),v.pixelStorei(L.UNPACK_SKIP_PIXELS,Ce),v.pixelStorei(L.UNPACK_SKIP_ROWS,qe),v.pixelStorei(L.UNPACK_SKIP_IMAGES,Ze);const Di=S.isDataArrayTexture||S.isData3DTexture,ft=U.isDataArrayTexture||U.isData3DTexture;if(S.isDepthTexture){const bt=V.get(S),qn=V.get(U),mt=V.get(bt.__renderTarget),Yn=V.get(qn.__renderTarget);v.bindFramebuffer(L.READ_FRAMEBUFFER,mt.__webglFramebuffer),v.bindFramebuffer(L.DRAW_FRAMEBUFFER,Yn.__webglFramebuffer);for(let Ni=0;Ni<Te;Ni++)Di&&(L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,V.get(S).__webglTexture,k,Ze+Ni),L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,V.get(U).__webglTexture,xe,St+Ni)),L.blitFramebuffer(Ce,qe,be,ve,Le,at,be,ve,L.DEPTH_BUFFER_BIT,L.NEAREST);v.bindFramebuffer(L.READ_FRAMEBUFFER,null),v.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else if(k!==0||S.isRenderTargetTexture||V.has(S)){const bt=V.get(S),qn=V.get(U);v.bindFramebuffer(L.READ_FRAMEBUFFER,X),v.bindFramebuffer(L.DRAW_FRAMEBUFFER,F);for(let mt=0;mt<Te;mt++)Di?L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,bt.__webglTexture,k,Ze+mt):L.framebufferTexture2D(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,bt.__webglTexture,k),ft?L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,qn.__webglTexture,xe,St+mt):L.framebufferTexture2D(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,qn.__webglTexture,xe),k!==0?L.blitFramebuffer(Ce,qe,be,ve,Le,at,be,ve,L.COLOR_BUFFER_BIT,L.NEAREST):ft?L.copyTexSubImage3D(Se,xe,Le,at,St+mt,Ce,qe,be,ve):L.copyTexSubImage2D(Se,xe,Le,at,Ce,qe,be,ve);v.bindFramebuffer(L.READ_FRAMEBUFFER,null),v.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else ft?S.isDataTexture||S.isData3DTexture?L.texSubImage3D(Se,xe,Le,at,St,be,ve,Te,ut,Lt,Mt.data):U.isCompressedArrayTexture?L.compressedTexSubImage3D(Se,xe,Le,at,St,be,ve,Te,ut,Mt.data):L.texSubImage3D(Se,xe,Le,at,St,be,ve,Te,ut,Lt,Mt):S.isDataTexture?L.texSubImage2D(L.TEXTURE_2D,xe,Le,at,be,ve,ut,Lt,Mt.data):S.isCompressedTexture?L.compressedTexSubImage2D(L.TEXTURE_2D,xe,Le,at,Mt.width,Mt.height,ut,Mt.data):L.texSubImage2D(L.TEXTURE_2D,xe,Le,at,be,ve,ut,Lt,Mt);v.pixelStorei(L.UNPACK_ROW_LENGTH,kt),v.pixelStorei(L.UNPACK_IMAGE_HEIGHT,tt),v.pixelStorei(L.UNPACK_SKIP_PIXELS,qt),v.pixelStorei(L.UNPACK_SKIP_ROWS,cn),v.pixelStorei(L.UNPACK_SKIP_IMAGES,Xn),xe===0&&U.generateMipmaps&&L.generateMipmap(Se),v.unbindTexture()},this.initRenderTarget=function(S){V.get(S).__webglFramebuffer===void 0&&q.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?q.setTextureCube(S,0):S.isData3DTexture?q.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?q.setTexture2DArray(S,0):q.setTexture2D(S,0),v.unbindTexture()},this.resetState=function(){W=0,H=0,Z=null,v.reset(),Me.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return _n}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=je._getDrawingBufferColorSpace(e),t.unpackColorSpace=je._getUnpackColorSpace()}}const Fo=new C,ts=new C,qM=new C;class Tb{constructor(e=null){this.bounds=e}bounds;apply(e,t,i,s){t.lengthSq()!==0&&(e.getHeadPosition(Fo),ts.copy(Fo).addScaledVector(t,s),this.bounds&&(ts.x=Ul.clamp(ts.x,this.bounds.min.x,this.bounds.max.x),ts.z=Ul.clamp(ts.z,this.bounds.min.z,this.bounds.max.z)),e.position.add(qM.copy(ts).sub(Fo)),e.updateMatrixWorld(!0))}}const Ab=2005636,wb=.22,YM=6217888,Rb=16757596,Pb=10320895,Cb=7306649,rd={x:0,y:0,z:0,pitch:0,yaw:0,roll:0,curls:[.1,.08,.08,.1,.12],spread:0},ad={...rd,x:-.3,y:2.7,z:3.8,pitch:75,yaw:-45,roll:5},od=hd(ad);function Tc(n){return Ri(n==="left"?ad:od)}const Ib="grab",En={x:0,y:0,z:0,pitch:0,yaw:0,roll:0,curls:[.55,.35,.85,.9,.9],spread:0},Ac={...En,x:1.7,y:2.4,z:2.7,pitch:-43,yaw:-17,roll:-90,curls:[.55,.1,.85,.9,.9]},Tu={...En,x:2.6,y:1.4,z:.5,pitch:-120,yaw:0,roll:-90,curls:[.55,.85,.85,.9,.9]},$M={...En,x:-3,y:1.1,z:.7,pitch:-30,yaw:-90,roll:0,curls:[.55,.6,.85,.9,.9]},KM={...En,x:2.4,y:-4,z:.6,pitch:60,yaw:55,roll:-180,curls:[.25,.85,.85,.9,.9]},JM={...En,x:0,y:-2.8,z:5.9,pitch:-30,yaw:0,roll:-180,curls:[.55,.85,.85,.9,.9]},ZM={...En,x:0,y:3.8,z:1.2,pitch:-30,yaw:0,roll:0,curls:[.55,.85,.85,.9,.9]},Oo={...od},Au={...En,x:2.7,y:3.7,z:1.5,pitch:-90,yaw:-17,roll:-90,curls:[...Ac.curls]},QM="hand-box",jM={...En,x:2.6,y:.8,z:4.3,pitch:-62,yaw:0,roll:-97,curls:[.55,.85,.85,.9,.9]},ey={hammer:Tu,flashlight:Tu,brush:$M,drone:jM,stopwatch:KM,bag:JM,"hang-glider":ZM,"gravity-glove":Oo,"translate-glove":Oo,"superman-glove":Oo,"controller-left":Au,"controller-right":Au,champagne:Ac},ld=new Set(["grip","pistol","duplicator","inspect","teleport","gizmo","holster","grapple","gun-blue","gun-red","gun-dual","tape","eraser","xray","welder","knife"]),ty="grip";function cd(n,e){const t=ld.has(e)?Ac:ey[e];return t?n==="right"?Ri(t):hd(t):Ri(En)}const Lb={grab:!0,trigger:!1},wi=[null,null,null,null,null],Va=[.35,.4,.45,.5,.55],ny={grab:wi,release:Va,trigger:[null,.6,null,null,null]},wu={grab:wi,release:Va,trigger:[null,1,null,null,null]},iy={grab:wi,release:Va,trigger:[null,.9,null,null,null]},sy={grab:wi,release:Va,trigger:[.45,null,null,null,null]},Bo={grab:[.55,.85,.85,.9,.9],release:wi,trigger:[null,.6,null,null,null]},zo={grab:wi,release:wi,trigger:[null,.6,null,null,null]},ry={hammer:wu,flashlight:wu,brush:iy,stopwatch:sy,"gravity-glove":Bo,"translate-glove":Bo,"superman-glove":Bo,"hang-glider":zo,wings:zo,"hand-box":zo};function ay(n){return n&&ry[n]||ny}function oy(n,e,t){const i=Ri(n).curls,s=[t.grab?e.grab:e.release];t.trigger&&s.push(e.trigger);for(const a of s)a.forEach((r,o)=>{r!==null&&(i[o]=r)});return i}const Db=[{key:"x",label:"X (rechts)",unit:"cm",min:-30,max:30},{key:"y",label:"Y (hoch)",unit:"cm",min:-30,max:30},{key:"z",label:"Z (vor)",unit:"cm",min:-30,max:30},{key:"pitch",label:"Pitch",unit:"°",min:-180,max:180},{key:"yaw",label:"Yaw",unit:"°",min:-180,max:180},{key:"roll",label:"Roll",unit:"°",min:-180,max:180},{key:"curl0",label:"Daumen",unit:"",min:0,max:1},{key:"curl1",label:"Zeigefinger",unit:"",min:0,max:1},{key:"curl2",label:"Mittelfinger",unit:"",min:0,max:1},{key:"curl3",label:"Ringfinger",unit:"",min:0,max:1},{key:"curl4",label:"Kleiner Finger",unit:"",min:0,max:1},{key:"spread",label:"Spreizung",unit:"°",min:-30,max:30}];function Nb(n,e){const t=ud(e);return t!==null?n.curls[t]??0:n[e]??0}function Ub(n,e,t){const i=Ri(n),s=ud(e);return s!==null?i.curls[s]=t:e in i&&(i[e]=t),i}function hd(n){const e=Ri(n);return e.x=-n.x+0,e.yaw=-n.yaw+0,e.roll=-n.roll+0,e}function fr(n){return[n.x,n.y,n.z,n.pitch,n.yaw,n.roll,...Ha(n.curls),n.spread]}function Ea(n,e=rd){const t=(i,s)=>Number.isFinite(n[i])?n[i]:s;return{x:t(0,e.x),y:t(1,e.y),z:t(2,e.z),pitch:t(3,e.pitch),yaw:t(4,e.yaw),roll:t(5,e.roll),curls:Ha(e.curls).map((i,s)=>t(6+s,i)),spread:t(11,e.spread)}}function Ri(n){return{...n,curls:Ha(n.curls)}}function Fb(n){const e=Ha(n.curls).map(t=>t.toFixed(2)).join("/");return`x ${n.x} y ${n.y} z ${n.z} cm · ${n.pitch}/${n.yaw}/${n.roll}° · ${e}`}function Ha(n){return[0,1,2,3,4].map(e=>Number.isFinite(n[e])?n[e]:0)}function ud(n){const e=/^curl([0-4])$/.exec(n);return e?Number(e[1]):null}const wc="bgvr.handPoses",Ta=new Set;let _i=null;function Vn(){if(_i)return _i;try{const n=globalThis.localStorage?.getItem(wc);_i=n?JSON.parse(n):{}}catch{_i={}}return _i}function dr(n){_i=n;try{globalThis.localStorage?.setItem(wc,JSON.stringify(n))}catch{}for(const e of Ta)e()}function ly(n){return Ta.add(n),()=>Ta.delete(n)}function Hl(n){const e=Tc(n),t=Vn().idle?.[n];return t?Ea(t,e):e}function Ru(n,e){if(e===QM)return Hl(n);const t=cd(n,e),i=Vn().hold?.[n]?.[e];if(i)return Ea(i,t);const s=ld.has(e)?Vn().hold?.[n]?.[ty]:void 0;return s?Ea(s,t):t}function Ob(n,e){const t=Vn();dr({...t,idle:{...t.idle,[n]:fr(e)}})}function Bb(n,e,t){const i=Vn();dr({...i,hold:{...i.hold,[n]:{...i.hold?.[n],[e]:fr(t)}}})}function zb(n){const e=Vn();if(!e.idle?.[n])return!1;const t={...e.idle};return delete t[n],dr({...e,idle:t}),!0}function kb(n,e){const t=Vn();if(!t.hold?.[n]?.[e])return!1;const i={...t.hold[n]};return delete i[e],dr({...t,hold:{...t.hold,[n]:i}}),!0}function cy(n){dr(n)}function fd(){const n=Vn();return JSON.parse(JSON.stringify(n))}function hy(){_i={};try{globalThis.localStorage?.removeItem(wc)}catch{}for(const n of Ta)n()}function Vb(){const n=Vn();let e=Object.keys(n.idle??{}).length;for(const t of Object.values(n.hold??{}))e+=Object.keys(t??{}).length;return e}const uy=["box","glove"],dd="glove";function Hb(n){return n==="glove"?"Weißer Handschuh":"Boxhand"}function Gb(n){return n==="glove"?"box":"glove"}function pd(n){return uy.includes(n)?n:dd}const md="bgvr.handLook",Gl=new Set;function Wb(n){return Gl.add(n),()=>Gl.delete(n)}function gd(){try{return pd(globalThis.localStorage?.getItem(md))}catch{return dd}}function Xb(n){const e=pd(n);try{globalThis.localStorage?.setItem(md,e)}catch{}for(const t of Gl)t();return e}const mn=[{z:.066,w:.043,h:.0235},{z:.052,w:.044,h:.024},{z:.047,w:.034,h:.0175},{z:.036,w:.0315,h:.0155},{z:.02,w:.0335,h:.0155},{z:0,w:.037,h:.016},{z:-.02,w:.0395,h:.0158},{z:-.036,w:.041,h:.0148},{z:-.047,w:.0415,h:.0125},{z:-.054,w:.038,h:.0085},{z:-.0585,w:.03,h:.004}],fy=1777968,Pu=.0018,dy=.017,py=.45,Cu=-.048,my=.026,ko=8,Iu=new Map;function gy(n){const e=n.transparent?n.opacity:1;let t=Iu.get(e);return t||(t=new Ba({color:fy,roughness:.85,transparent:e<1,opacity:e,depthWrite:e>=1}),Iu.set(e,t)),t}const ks=28,ns=14,Lu=.004;class _y{positions=[];skinIndices=[];skinWeights=[];indices=[];vertex(e,t,i,s=0,a=0){return this.positions.push(e.x,e.y,e.z),this.skinIndices.push(t,s,0,0),this.skinWeights.push(i,a,0,0),this.positions.length/3-1}band(e,t,i){for(let s=0;s<i;s++){const a=(s+1)%i;this.indices.push(e+s,t+s,e+a,e+a,t+s,t+a)}}fan(e,t,i,s){for(let a=0;a<i;a++){const r=(a+1)%i;s?this.indices.push(e+a,t,e+r):this.indices.push(e+a,e+r,t)}}geometry(){const e=new gt;return e.setAttribute("position",new Be(this.positions,3)),e.setAttribute("skinIndex",new cc(this.skinIndices,4)),e.setAttribute("skinWeight",new Be(this.skinWeights,4)),e.setIndex(this.indices),e.computeVertexNormals(),e}}const di=new C;function vy(n,e,t){const i=[n];for(const f of e)i.push(f.bones[0],f.bones[1]);const s=new _y,a=mn[0],r=s.vertex(di.set(0,a.y??0,a.z),0,1);let o=-1;for(const f of mn){const u=s.positions.length/3;for(let d=0;d<ks;d++){const g=d/ks*Math.PI*2;s.vertex(di.set(Math.cos(g)*f.w,(f.y??0)+Math.sin(g)*f.h,f.z),0,1)}o<0?s.fan(u,r,ks,!1):s.band(o,u,ks),o=u}const l=mn[mn.length-1],c=s.vertex(di.set(0,l.y??0,l.z-.002),0,1);s.fan(o,c,ks,!0);for(const f of e){const[u,d]=f.bones,[g,M]=f.lengths,m=i.indexOf(u),p=i.indexOf(d),y=f.radius,b=g+M,x=u.matrixWorld,A=B=>{const X=(B-(g-y))/(2*y),F=Math.min(1,Math.max(0,X));return F*F*(3-2*F)},E=(B,X)=>{const F=s.positions.length/3,W=A(B);for(let H=0;H<ns;H++){const Z=H/ns*Math.PI*2;di.set(Math.cos(Z)*X,Math.sin(Z)*X,-B).applyMatrix4(x),s.vertex(di,m,1-W,p,W)}return F},R=-y*.9,_=s.vertex(di.set(0,0,-R).applyMatrix4(x),m,1);let T=E(R,y*.92);s.fan(T,_,ns,!1);for(let B=R+Lu;B<b-y*.4;B+=Lu){const X=1-.18*Math.max(0,B/b),F=1+.07*Math.exp(-((B-g)*(B-g))/(2*y*y)),W=E(B,y*X*F);s.band(T,W,ns),T=W}const P=y*.82,I=b-y*.4;for(let B=1;B<=4;B++){const X=B/5*(Math.PI/2),F=E(I+Math.sin(X)*P,P*Math.cos(X));s.band(T,F,ns),T=F}const N=s.vertex(di.set(0,0,-(I+P)).applyMatrix4(x),m,1-A(b),p,A(b));s.fan(T,N,ns,!0)}const h=new Cm(s.geometry(),t);h.name="glove";for(const f of My(t))h.add(f);return h.bind(new fc(i),new Ye),h}function xy(n){const e=mn[0];if(n>=e.z)return e;for(let t=1;t<mn.length;t++){const i=mn[t];if(n<i.z)continue;const s=mn[t-1],a=(s.z-n)/(s.z-i.z);return{z:n,w:s.w+(i.w-s.w)*a,h:s.h+(i.h-s.h)*a,y:(s.y??0)+((i.y??0)-(s.y??0))*a}}return mn[mn.length-1]}function My(n){const e=[];for(const t of[-1,0,1]){const i=[];for(let r=0;r<=ko;r++){const o=r/ko,l=Cu+(my-Cu)*o,c=t*dy*(1-py*o),h=xy(l),f=Math.min(1,Math.abs(c)/h.w),u=(h.y??0)+h.h*Math.sqrt(Math.max(0,1-f*f));i.push(new C(c,u+Pu*.6,l))}const s=new wf(i),a=new yt(new vc(s,ko*3,Pu,6,!1),gy(n));a.name="glove-seam",e.push(a)}return e}const yy={open:[.1,.08,.08,.1,.12],ready:[.35,.4,.45,.5,.55],point:[.15,0,1,1,1],thumbsUp:[0,1,1,1,1],grip:[.55,.35,.85,.9,.9]},Du=[{name:"index",x:-.028,lengths:[.036,.03],z:-.046},{name:"middle",x:-.009,lengths:[.04,.032],z:-.048},{name:"ring",x:.01,lengths:[.036,.029],z:-.046},{name:"pinky",x:.028,lengths:[.03,.024],z:-.042}],Sy=new kn,ea=Math.PI/180;function ca(){return gd()==="glove"?"glove":"bones"}const _d=16054010,by=10478591;function qb(){return gd()==="glove"?_d:by}class vd extends Mi{constructor(e,t,i="bones"){super(),this.side=e,this.look=i,this.name=`hand-${e}`;const s=e==="left"?-1:1;if(this.look!=="glove"){const l=this.look==="limbs"?new yt(new Ai(.026,12,10),t):new yt(new ys(.075,.028,.09),t);l.position.set(0,0,-.01),this.add(l)}if(this.look==="limbs")for(const l of Du){const c=new yt(new Ai(.011,10,8),t);c.position.set(s*l.x,0,l.z),this.add(c)}const a=new ct;a.position.set(s*-.034,-.006,.014),a.rotation.set(-.22,s*.75,s*.6),this.add(a);const r=[.034,.028];this.chains.push(Uu(a,r,.017,t,this.look));const o=[{bones:Nu(this.chains[0]),lengths:r,radius:.0175}];for(const l of Du){const c=new ct;c.position.set(s*l.x,0,l.z),this.add(c),this.fingerRoots.push(c),this.fans.push(s*l.x/.028);const h=Uu(c,l.lengths,.013,t,this.look);this.chains.push(h),o.push({bones:Nu(h),lengths:[l.lengths[0],l.lengths[1]],radius:.0135}),l.name==="index"&&(this.indexTip.position.set(0,0,-l.lengths[1]),h[1].add(this.indexTip))}if(this.look==="glove"){const l=new hc;l.name="hand-root",this.add(l),this.updateMatrixWorld(!0),this.add(vy(l,o,t))}}side;look;indexTip=new ct;chains=[];curls=[0,0,0,0,0];targets=[0,0,0,0,0];fingerRoots=[];fans=[];spread=0;setGesture(e){const t=yy[e];for(let i=0;i<this.targets.length;i++)this.targets[i]=t[i]}setPose(e){if(this.position.set(e.x/100,e.y/100,e.z/100),this.quaternion.setFromEuler(Sy.set(e.pitch*ea,e.yaw*ea,e.roll*ea,"XYZ")),this.setCurls(e.curls),this.spread!==e.spread){this.spread=e.spread;for(let t=0;t<this.fingerRoots.length;t++)this.fingerRoots[t].rotation.y=-this.fans[t]*e.spread*ea}}setCurls(e){for(let t=0;t<this.targets.length;t++)this.targets[t]=e[t]??0}update(e){const t=Math.min(1,e*14);for(let i=0;i<this.chains.length;i++){this.curls[i]+=(this.targets[i]-this.curls[i])*t;const s=this.curls[i],a=this.chains[i],r=i===0?1.1:1.5,o=i===0?.9:1.4;a[0].rotation.x=-s*r,a[1].rotation.x=-s*o}}}function Nu(n){return[n[0],n[1]]}function Uu(n,e,t,i,s="bones"){const a=[];let r=n;for(const o of e){const l=s==="glove"?new hc:new ct;if(r.add(l),s!=="glove")if(s==="limbs"){const h=new yt(new Ai(t*.85,10,8),i);l.add(h);const f=new yt(new Ai(t*.7,10,8),i);f.position.set(0,0,-o),l.add(f)}else{const h=new yt(new pc(t,Math.max(o-t*2,.005),3,8),i);h.rotation.x=Math.PI/2,h.position.set(0,0,-o/2),l.add(h)}a.push(l);const c=new ct;c.position.set(0,0,-o),l.add(c),r=c}return a}class Yb extends Mi{constructor(e,t,i={}){super(),this.side=e;const{color:s=6217888,look:a=ca(),opacity:r=.32}=i;this.look=a,this.name=`ghost-hand-${e}`,this.material=new Ba({color:s,transparent:r<1,opacity:r,depthWrite:r>=1,roughness:.5,emissive:new He(s).multiplyScalar(.35)}),this.hand=new vd(e,this.material,a),this.setPose(t),this.hand.update(1),this.add(this.hand)}side;material;hand;look;get indexTip(){return this.hand.indexTip}setPose(e){this.hand.setPose(e),this.hand.position.set(0,0,0),this.hand.quaternion.identity()}setGesture(e){this.hand.setGesture(e)}setCurls(e){this.hand.setCurls(e),this.hand.update(1)}update(e){this.hand.update(e)}dispose(){this.traverse(e=>{const t=e;t.isMesh&&t.geometry.dispose()}),this.material.dispose(),this.removeFromParent()}}class $b extends Mi{constructor(e,t=14082807){super(),this.input=e,this.name="hand-visuals",this.baseColor=t,this.material=new Ba({color:t,roughness:.4,metalness:.05,emissive:new He(t).multiplyScalar(.06)}),this.unsubscribe=ly(()=>this.poses.clear())}input;jointMeshes=new Map;hands=new Map;overrides=new Map;fists=new Set;holding=new Map;poses=new Map;unsubscribe;jointGeometry=new Ai(1,10,8);material;handMaterials=new Map;glowing=new Set;baseColor;hidden=!1;setGestureOverride(e,t){this.overrides.set(e,t)}setFist(e,t){t?this.fists.add(e):this.fists.delete(e)}setGlow(e,t){if(t===this.glowing.has(e))return;t?this.glowing.add(e):this.glowing.delete(e);const i=this.handMaterial(e);i.emissive.setHex(t?YM:i.color.getHex()),i.emissive.multiplyScalar(t?.42:.06)}handMaterial(e){let t=this.handMaterials.get(e);return t||(t=this.material.clone(),this.handMaterials.set(e,t)),t}lookOf(e){for(const t of this.input.controllers)if(t.handedness===e)return t.isHand?"limbs":ca();return ca()}setHeldTool(e,t){this.holding.get(e)!==t&&this.holding.set(e,t)}heldToolOf(e){return this.holding.get(e)??null}poseOf(e){const t=this.holding.get(e)??null,i=`${e}:${t??""}`;let s=this.poses.get(i);return s||(s=t?Ru(e,t):Hl(e),this.poses.set(i,s)),s}refreshPoses(){this.poses.clear()}editablePose(e,t){return Ri(t?Ru(e,t):Hl(e))}handObject(e){if(e.isHand)return e.hand.visible?e.hand:null;const t=this.hands.get(e);return t?.visible?t:null}gestureOf(e){if(e.isHand||!e.handedness)return null;const t=this.overrides.get(e.handedness);return t||(e.squeeze.pressed&&e.trigger.pressed?"thumbsUp":e.squeeze.pressed?"point":"open")}update(e){for(const t of this.input.controllers){if(t.isHand){this.updateTrackedHand(t),this.hands.get(t)?.removeFromParent();continue}this.updateControllerHand(e,t)}}dispose(){this.unsubscribe();for(const[e,t]of this.jointMeshes)e.remove(t);this.jointMeshes.clear();for(const e of this.hands.values())this.disposeHand(e);this.hands.clear(),this.jointGeometry.dispose();for(const e of this.handMaterials.values())e.dispose();this.handMaterials.clear(),this.material.dispose(),this.removeFromParent()}disposeHand(e){e.traverse(t=>{const i=t;i.isMesh&&i.geometry.dispose()}),e.removeFromParent()}updateTrackedHand(e){for(const i of Object.values(e.hand.joints)){if(!i)continue;let s=this.jointMeshes.get(i);if(!s){const a=e.handedness?this.handMaterial(e.handedness):this.material;s=new yt(this.jointGeometry,a),i.add(s),this.jointMeshes.set(i,s)}s.scale.setScalar(Math.max(i.jointRadius??.008,.004)),s.visible=!this.hidden}const t=e.hand.joints["index-finger-tip"];e.fingertip=t&&t.visible?t:null}updateControllerHand(e,t){if(!t.handedness)return;let i=this.hands.get(t);const s=ca();if(i&&(i.side!==t.handedness||i.look!==s)&&(this.disposeHand(i),this.hands.delete(t),i=void 0),!i){const f=this.handMaterial(t.handedness);f.color.setHex(s==="glove"?_d:this.baseColor),this.glowing.has(t.handedness)||f.emissive.setHex(f.color.getHex()).multiplyScalar(.06),i=new vd(t.handedness,f,s),this.hands.set(t,i)}const a=t.grip.visible?t.grip:t.targetRay;i.parent!==a&&a.add(i),i.visible=t.tracked&&!this.hidden,t.fingertip=i.visible?i.indexTip:null;const r=this.poseOf(t.handedness);i.setPose(r);const o=this.holding.get(t.handedness)??null;o&&i.setCurls(oy(r,ay(o),{grab:t.squeeze.pressed,trigger:t.trigger.pressed}));const l=this.overrides.get(t.handedness)??null,c=this.gestureOf(t),h=c==="open"&&!l||c==="grip"&&!!this.holding.get(t.handedness);c&&!h&&i.setGesture(c),this.fists.has(t.handedness)&&i.setGesture("grip"),i.update(e)}}function Fu(n,e,t,i,s,a){const r=s/2;switch(n.save(),n.translate(t,i),n.strokeStyle=a,n.fillStyle=a,n.lineWidth=Math.max(2,s*.075),n.lineJoin="round",n.lineCap="round",e){case"worlds":{n.beginPath(),n.arc(0,0,r*.72,0,Math.PI*2),n.stroke(),n.beginPath(),n.ellipse(0,0,r*.72,r*.28,0,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(0,-r*.72),n.lineTo(0,r*.72),n.stroke();break}case"tools":{n.beginPath(),n.moveTo(-r*.6,r*.6),n.lineTo(r*.2,-r*.2),n.stroke(),n.beginPath(),n.arc(r*.42,-r*.42,r*.32,Math.PI*.15,Math.PI*1.5),n.stroke();break}case"bag":{n.beginPath(),n.moveTo(-r*.62,-r*.1),n.quadraticCurveTo(-r*.75,r*.75,0,r*.75),n.quadraticCurveTo(r*.75,r*.75,r*.62,-r*.1),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(-r*.32,-r*.1),n.quadraticCurveTo(0,-r*.85,r*.32,-r*.1),n.stroke();break}case"reset":{n.beginPath(),n.arc(0,0,r*.62,Math.PI*.35,Math.PI*1.85),n.stroke(),n.beginPath(),n.moveTo(r*.2,-r*.72),n.lineTo(r*.56,-r*.44),n.lineTo(r*.16,-r*.24),n.closePath(),n.fill();break}case"back":{n.beginPath(),n.moveTo(r*.5,-r*.55),n.lineTo(-r*.3,0),n.lineTo(r*.5,r*.55),n.stroke();break}case"close":{n.beginPath(),n.moveTo(-r*.5,-r*.5),n.lineTo(r*.5,r*.5),n.moveTo(r*.5,-r*.5),n.lineTo(-r*.5,r*.5),n.stroke();break}case"gun":{n.beginPath(),n.roundRect(-r*.75,-r*.25,r*1.3,r*.42,r*.12),n.stroke(),n.beginPath(),n.roundRect(-r*.5,r*.17,r*.34,r*.6,r*.1),n.stroke(),n.beginPath(),n.arc(r*.62,-r*.04,r*.2,0,Math.PI*2),n.fill();break}case"cube":{n.beginPath(),n.moveTo(0,-r*.8),n.lineTo(r*.75,-r*.38),n.lineTo(r*.75,r*.4),n.lineTo(0,r*.82),n.lineTo(-r*.75,r*.4),n.lineTo(-r*.75,-r*.38),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(-r*.75,-r*.38),n.lineTo(0,0),n.lineTo(r*.75,-r*.38),n.moveTo(0,0),n.lineTo(0,r*.82),n.stroke();break}case"domino":{n.beginPath(),n.roundRect(-r*.42,-r*.8,r*.84,r*1.6,r*.12),n.stroke(),n.beginPath(),n.moveTo(-r*.42,0),n.lineTo(r*.42,0),n.stroke(),n.beginPath(),n.arc(0,-r*.4,r*.12,0,Math.PI*2),n.arc(0,r*.4,r*.12,0,Math.PI*2),n.fill();break}case"settings":{for(const[o,l]of[[-r*.45,-r*.2],[0,r*.25],[r*.45,-r*.1]])n.beginPath(),n.moveTo(-r*.7,o),n.lineTo(r*.7,o),n.stroke(),n.beginPath(),n.arc(l,o,r*.16,0,Math.PI*2),n.fillStyle=a,n.fill();break}case"portal":{n.beginPath(),n.ellipse(0,0,r*.5,r*.78,0,0,Math.PI*2),n.stroke();break}case"sphere":{n.beginPath(),n.arc(0,0,r*.74,0,Math.PI*2),n.stroke(),n.beginPath(),n.ellipse(0,0,r*.74,r*.3,0,0,Math.PI*2),n.stroke(),n.beginPath(),n.arc(-r*.24,-r*.28,r*.16,0,Math.PI*2),n.fill();break}case"pyramid":{n.beginPath(),n.moveTo(0,-r*.8),n.lineTo(r*.8,r*.6),n.lineTo(-r*.8,r*.6),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(0,-r*.8),n.lineTo(r*.16,r*.24),n.lineTo(-r*.8,r*.6),n.moveTo(r*.16,r*.24),n.lineTo(r*.8,r*.6),n.stroke();break}case"plank":{n.beginPath(),n.roundRect(-r*.85,-r*.3,r*1.7,r*.42,r*.08),n.stroke(),n.beginPath(),n.moveTo(-r*.85,r*.12),n.lineTo(-r*.6,r*.42),n.lineTo(r*1.1,r*.42),n.lineTo(r*.85,r*.12),n.stroke();break}case"cylinder":{n.beginPath(),n.ellipse(0,-r*.5,r*.55,r*.22,0,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(-r*.55,-r*.5),n.lineTo(-r*.55,r*.5),n.moveTo(r*.55,-r*.5),n.lineTo(r*.55,r*.5),n.stroke(),n.beginPath(),n.ellipse(0,r*.5,r*.55,r*.22,0,0,Math.PI),n.stroke();break}case"gizmo":{const o=(l,c)=>{n.beginPath(),n.moveTo(0,0),n.lineTo(l,c),n.stroke(),n.beginPath(),n.arc(l,c,r*.15,0,Math.PI*2),n.fill()};o(r*.72,0),o(0,-r*.72),o(-r*.6,r*.5);break}case"brush":{n.beginPath(),n.moveTo(-r*.6,r*.7),n.lineTo(r*.35,-r*.25),n.stroke(),n.beginPath(),n.moveTo(r*.2,-r*.4),n.lineTo(r*.72,-r*.72),n.lineTo(r*.5,-r*.1),n.closePath(),n.fill();break}case"pistol":{n.beginPath(),n.moveTo(-r*.75,-r*.42),n.lineTo(r*.75,-r*.42),n.lineTo(r*.75,-r*.05),n.lineTo(-r*.1,-r*.05),n.lineTo(-r*.42,r*.75),n.lineTo(-r*.75,r*.75),n.closePath(),n.stroke();break}case"stopwatch":{n.beginPath(),n.arc(0,r*.1,r*.66,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(-r*.2,-r*.72),n.lineTo(r*.2,-r*.72),n.stroke(),n.beginPath(),n.moveTo(0,r*.1),n.lineTo(0,-r*.32),n.stroke();break}case"grapple":{n.beginPath(),n.moveTo(-r*.7,-r*.75),n.lineTo(0,r*.1),n.stroke(),n.beginPath(),n.arc(0,r*.34,r*.32,Math.PI*1.15,Math.PI*2.35),n.stroke(),n.beginPath(),n.moveTo(r*.3,r*.2),n.lineTo(r*.42,r*.52),n.stroke();break}case"magnet":{n.beginPath(),n.arc(0,r*.12,r*.55,Math.PI,0),n.stroke(),n.beginPath(),n.moveTo(-r*.55,r*.12),n.lineTo(-r*.55,r*.62),n.moveTo(r*.55,r*.12),n.lineTo(r*.55,r*.62),n.stroke(),n.lineWidth=Math.max(3,s*.14),n.beginPath(),n.moveTo(-r*.55,r*.62),n.lineTo(-r*.55,r*.78),n.moveTo(r*.55,r*.62),n.lineTo(r*.55,r*.78),n.stroke();break}case"glove":{n.beginPath(),n.moveTo(-r*.42,r*.75),n.lineTo(-r*.42,-r*.25),n.quadraticCurveTo(-r*.42,-r*.8,-r*.1,-r*.8),n.quadraticCurveTo(r*.2,-r*.8,r*.2,-r*.25),n.lineTo(r*.2,r*.05),n.quadraticCurveTo(r*.5,r*.1,r*.42,r*.75),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(-r*.85,-r*.5),n.lineTo(-r*.55,-r*.5),n.stroke(),n.beginPath(),n.moveTo(-r*.5,-r*.5),n.lineTo(-r*.72,-r*.66),n.lineTo(-r*.72,-r*.34),n.closePath(),n.fill();break}case"controller":{n.beginPath(),n.arc(0,-r*.34,r*.46,Math.PI*.1,Math.PI*.9,!0),n.stroke(),n.beginPath(),n.moveTo(-r*.3,-r*.14),n.quadraticCurveTo(-r*.24,r*.62,r*.06,r*.8),n.quadraticCurveTo(r*.34,r*.5,r*.3,-r*.14),n.closePath(),n.stroke(),n.beginPath(),n.arc(0,r*.16,r*.13,0,Math.PI*2),n.fill();break}case"teleport":{n.beginPath(),n.ellipse(0,r*.5,r*.68,r*.26,0,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(0,-r*.86),n.lineTo(0,r*.06),n.stroke(),n.beginPath(),n.moveTo(-r*.3,-r*.2),n.lineTo(0,r*.24),n.lineTo(r*.3,-r*.2),n.closePath(),n.fill();break}case"superman":{n.beginPath(),n.moveTo(0,-r*.8),n.lineTo(r*.68,-r*.5),n.quadraticCurveTo(r*.6,r*.5,0,r*.82),n.quadraticCurveTo(-r*.6,r*.5,-r*.68,-r*.5),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(r*.18,-r*.46),n.lineTo(-r*.22,r*.06),n.lineTo(r*.1,r*.06),n.lineTo(-r*.18,r*.52),n.stroke();break}case"wrench":{n.beginPath(),n.moveTo(-r*.62,r*.72),n.lineTo(r*.24,-r*.14),n.stroke(),n.beginPath(),n.arc(r*.46,-r*.4,r*.34,Math.PI*.62,Math.PI*.12,!0),n.stroke(),n.beginPath(),n.arc(-r*.7,r*.72,r*.14,0,Math.PI*2),n.fill();break}case"weld":{n.beginPath(),n.moveTo(-r*.72,r*.6),n.lineTo(r*.1,-r*.2),n.stroke(),n.beginPath(),n.moveTo(r*.1,-r*.2),n.lineTo(r*.42,-r*.5),n.stroke();for(const o of[0,Math.PI/2,Math.PI/4,-Math.PI/4])n.beginPath(),n.moveTo(r*.52+Math.cos(o)*r*.1,-r*.6+Math.sin(o)*r*.1),n.lineTo(r*.52+Math.cos(o)*r*.28,-r*.6+Math.sin(o)*r*.28),n.stroke();break}case"hammer":{n.beginPath(),n.moveTo(-r*.62,r*.78),n.lineTo(r*.34,-r*.42),n.stroke(),n.beginPath(),n.roundRect(r*.06,-r*.86,r*.82,r*.42,r*.08),n.stroke(),n.save(),n.translate(r*.47,-r*.65),n.rotate(Math.PI/4),n.beginPath(),n.roundRect(-r*.41,-r*.21,r*.82,r*.42,r*.08),n.stroke(),n.restore();break}case"xray":{n.beginPath(),n.roundRect(-r*.78,-r*.6,r*1.56,r*1.2,r*.14),n.stroke(),n.beginPath(),n.moveTo(-r*.3,r*.3),n.lineTo(-r*.3,-r*.2),n.lineTo(r*.1,-r*.2),n.stroke(),n.beginPath(),n.arc(r*.32,r*.06,r*.2,0,Math.PI*2),n.stroke();break}case"drone":{n.beginPath(),n.roundRect(-r*.24,-r*.16,r*.48,r*.32,r*.08),n.stroke();for(const[o,l]of[[-r*.6,-r*.5],[r*.6,-r*.5],[-r*.6,r*.5],[r*.6,r*.5]])n.beginPath(),n.moveTo(o*.35,l*.35),n.lineTo(o,l),n.stroke(),n.beginPath(),n.ellipse(o,l,r*.26,r*.09,0,0,Math.PI*2),n.stroke();break}case"tape":{n.beginPath(),n.roundRect(-r*.78,-r*.1,r*.86,r*.82,r*.14),n.stroke(),n.beginPath(),n.arc(-r*.35,r*.3,r*.18,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(r*.08,r*.16),n.lineTo(r*.78,-r*.5),n.stroke(),n.beginPath(),n.moveTo(r*.5,-r*.62),n.lineTo(r*.8,-r*.34),n.stroke();break}case"eraser":{n.save(),n.rotate(-Math.PI/6),n.beginPath(),n.roundRect(-r*.7,-r*.3,r*1.4,r*.6,r*.12),n.stroke(),n.beginPath(),n.moveTo(r*.1,-r*.3),n.lineTo(r*.1,r*.3),n.stroke(),n.restore();break}case"flashlight":{n.beginPath(),n.roundRect(-r*.85,-r*.16,r*.95,r*.32,r*.07),n.stroke(),n.beginPath(),n.moveTo(r*.1,-r*.34),n.lineTo(r*.4,-r*.34),n.lineTo(r*.4,r*.34),n.lineTo(r*.1,r*.34),n.closePath(),n.stroke();for(const o of[-r*.5,0,r*.5])n.beginPath(),n.moveTo(r*.52,o*.55),n.lineTo(r*.86,o),n.stroke();break}case"lamp":{n.beginPath(),n.arc(0,-r*.18,r*.44,Math.PI*.85,Math.PI*.15),n.stroke(),n.beginPath(),n.moveTo(-r*.22,r*.16),n.lineTo(-r*.22,r*.42),n.lineTo(r*.22,r*.42),n.lineTo(r*.22,r*.16),n.stroke();for(const[o,l]of[[0,-r*.86],[-r*.62,-r*.56],[r*.62,-r*.56]])n.beginPath(),n.moveTo(o*.62,l*.62),n.lineTo(o,l),n.stroke();break}case"reddot":{n.beginPath(),n.arc(0,0,r*.7,0,Math.PI*2),n.stroke(),n.beginPath(),n.arc(0,0,r*.17,0,Math.PI*2),n.fill();break}case"irons":{n.beginPath(),n.moveTo(-r*.8,r*.5),n.lineTo(-r*.8,-r*.1),n.lineTo(-r*.5,-r*.1),n.lineTo(-r*.5,r*.15),n.lineTo(-r*.2,r*.15),n.lineTo(-r*.2,-r*.1),n.lineTo(r*.1,-r*.1),n.lineTo(r*.1,r*.5),n.stroke(),n.beginPath(),n.moveTo(r*.6,r*.5),n.lineTo(r*.6,-r*.55),n.stroke(),n.beginPath(),n.arc(r*.6,-r*.66,r*.13,0,Math.PI*2),n.fill();break}case"trace":{n.beginPath(),n.moveTo(-r*.8,r*.6),n.quadraticCurveTo(0,-r*1.1,r*.8,r*.5),n.stroke(),n.beginPath(),n.arc(-r*.8,r*.6,r*.14,0,Math.PI*2),n.fill(),n.beginPath(),n.arc(r*.8,r*.5,r*.2,0,Math.PI*2),n.stroke();break}case"scope":{n.beginPath(),n.moveTo(-r*.62,-r*.26),n.lineTo(r*.42,-r*.26),n.lineTo(r*.42,r*.26),n.lineTo(-r*.62,r*.26),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(r*.42,-r*.42),n.lineTo(r*.78,-r*.42),n.lineTo(r*.78,r*.42),n.lineTo(r*.42,r*.42),n.closePath(),n.stroke();for(const o of[-r*.34,r*.06])n.beginPath(),n.moveTo(o,r*.26),n.lineTo(o,r*.58),n.stroke();break}case"chat":{n.beginPath(),n.roundRect(-r*.8,-r*.68,r*1.6,r*1.12,r*.26),n.stroke(),n.beginPath(),n.moveTo(-r*.34,r*.42),n.lineTo(-r*.5,r*.86),n.lineTo(-r*.02,r*.44),n.stroke();for(const o of[-r*.42,0,r*.42])n.beginPath(),n.arc(o,-r*.12,r*.1,0,Math.PI*2),n.fill();break}case"glider":{n.beginPath(),n.moveTo(-r*.9,-r*.15),n.lineTo(0,-r*.6),n.lineTo(r*.9,-r*.15),n.stroke(),n.beginPath(),n.moveTo(0,-r*.6),n.lineTo(0,-r*.1),n.stroke(),n.beginPath(),n.moveTo(-r*.4,r*.6),n.lineTo(0,-r*.1),n.lineTo(r*.4,r*.6),n.closePath(),n.stroke();break}case"wings":{for(const o of[-1,1]){n.beginPath(),n.moveTo(0,r*.2),n.quadraticCurveTo(o*r*.45,-r*.7,o*r*.9,-r*.35),n.stroke();for(const[l,c]of[[.9,.25],[.72,.42],[.52,.55]])n.beginPath(),n.moveTo(o*r*l,-r*.35+(.9-l)*r*.8),n.lineTo(o*r*(l-.08),-r*.35+c*r),n.stroke()}break}case"palette":{n.beginPath(),n.arc(0,0,r*.76,0,Math.PI*2),n.stroke();for(const[o,l]of[[-r*.34,-r*.3],[r*.3,-r*.34],[r*.36,r*.26],[-r*.3,r*.34]])n.beginPath(),n.arc(o,l,r*.16,0,Math.PI*2),n.fill();break}case"cone":{n.beginPath(),n.moveTo(0,-r*.8),n.lineTo(r*.62,r*.5),n.lineTo(-r*.62,r*.5),n.closePath(),n.stroke(),n.beginPath(),n.ellipse(0,r*.5,r*.62,r*.22,0,0,Math.PI*2),n.stroke();break}case"ramp":{n.beginPath(),n.moveTo(-r*.82,r*.5),n.lineTo(r*.82,r*.5),n.lineTo(r*.82,-r*.12),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(r*.82,-r*.12),n.lineTo(r*.5,-r*.4),n.lineTo(-r*.5,r*.22),n.lineTo(-r*.82,r*.5),n.stroke();break}case"rod":{n.beginPath(),n.roundRect(-r*.86,-r*.16,r*1.72,r*.32,r*.16),n.stroke(),n.beginPath(),n.moveTo(-r*.4,-r*.16),n.lineTo(-r*.4,r*.16),n.moveTo(r*.4,-r*.16),n.lineTo(r*.4,r*.16),n.stroke();break}case"marble":{n.beginPath(),n.arc(0,r*.1,r*.5,0,Math.PI*2),n.stroke(),n.beginPath(),n.arc(-r*.16,-r*.06,r*.14,0,Math.PI*2),n.fill();break}case"bottle":{n.beginPath(),n.moveTo(-r*.32,r*.8),n.lineTo(r*.32,r*.8),n.lineTo(r*.32,r*.05),n.quadraticCurveTo(r*.32,-r*.2,r*.12,-r*.3),n.lineTo(r*.12,-r*.72),n.lineTo(-r*.12,-r*.72),n.lineTo(-r*.12,-r*.3),n.quadraticCurveTo(-r*.32,-r*.2,-r*.32,r*.05),n.closePath(),n.stroke(),n.beginPath(),n.roundRect(-r*.16,-r*.9,r*.32,r*.2,r*.06),n.fill();break}case"d4":case"d6":case"d8":case"d12":case"d20":{Ey(n,e,r);break}}n.restore()}function Ey(n,e,t){const i=e==="d4"?3:e==="d6"||e==="d8"?4:e==="d12"?5:6,s=t*.78,a=i===4?Math.PI/4:-Math.PI/2,r=l=>[Math.cos(a+l/i*Math.PI*2)*s,Math.sin(a+l/i*Math.PI*2)*s];n.beginPath();for(let l=0;l<i;l++){const[c,h]=r(l);l===0?n.moveTo(c,h):n.lineTo(c,h)}if(n.closePath(),n.stroke(),e==="d4")return;if(e==="d6"){for(const[l,c]of[[-t*.28,-t*.28],[0,0],[t*.28,t*.28]])n.beginPath(),n.arc(l,c,t*.1,0,Math.PI*2),n.fill();return}const o=e==="d20"?1:2;for(let l=0;l<i;l+=o){const[c,h]=r(l);n.beginPath(),n.moveTo(c,h),n.lineTo(0,0),n.stroke()}}function Ty(n){const t=n.key===n.previousKey?n.current:n.remembered??0,i=Math.max(0,n.entries-n.pageSize);return!Number.isFinite(t)||t<0?0:Math.min(Math.floor(t),i)}const Tt=768,ei=1280,dt=34,ta=150,Vo=76,_t=122,$t=14,dn=3,In=16,Kt=Math.floor((Tt-dt*2-In*(dn-1))/dn),ti=Kt+44;class Kb extends yt{ctx;texture;entries=[];grid=!1;pinned=0;hover=-1;title;footer;hint="";status="";scroll=0;pageKey="";flash=0;onSelect;constructor(e={}){const t=e.width??.3,i=t*ei/Tt,s=document.createElement("canvas");s.width=Tt,s.height=ei;const a=new Sf(s);a.colorSpace=Bt,a.anisotropy=8,super(new bs(t,i),new Oa({map:a,transparent:!0,toneMapped:!1})),this.texture=a,this.ctx=s.getContext("2d"),this.title=e.title??"",this.footer=e.footer??"",this.onSelect=e.onSelect,this.name="ui-panel",this.renderOrder=10,this.geometry.computeBoundingBox(),this.draw()}setPage(e,t,i={}){const s=i.key??e;this.title=e,this.entries=t,this.grid=i.grid??!1,this.pinned=Math.min(Math.max(0,Math.floor(i.pinned??0)),t.length),this.hint=i.hint??"",this.scroll=Ty({previousKey:this.pageKey,key:s,current:this.scroll,...i.scroll===void 0?{}:{remembered:i.scroll},entries:t.length-this.pinned,pageSize:this.pageSize}),s!==this.pageKey&&(this.hover=-1,this.hovered.index=-1),this.pageKey=s,this.draw()}get scrollable(){return this.entries.length-this.pinned>this.pageSize}get scrollOffset(){return this.scroll}get rowsPerPage(){return this.pageSize}rowAnchor(e){let t;if(e<this.pinned)t=ta+e*(_t+$t);else{if(this.grid)return null;const a=e-this.pinned-this.scroll;if(a<0||a>=this.visibleCount)return null;t=this.bodyTop+a*(_t+$t)}const i=this.geometry.parameters.width,s=this.geometry.parameters.height;return{x:((dt+58)/Tt-.5)*i,y:(.5-(t+_t/2)/ei)*s,size:_t*.6/ei*s}}scrollTo(e){const t=Ul.clamp(Math.round(e),0,this.maxScroll);return t===this.scroll?!1:(this.scroll=t,this.hover=-1,this.hovered.index=-1,this.draw(),!0)}scrollBy(e){return this.scrollable?this.scrollTo(this.scroll+e*(this.grid?dn:1)):!1}setStatus(e){this.status!==e&&(this.status=e,this.draw())}hovered={index:-1,hand:null,v:0};asPointerTarget(){return{object:this,onHover:e=>{this.hovered.hand=e.hand,e.uv&&(this.hovered.v=e.uv.y),this.setHover(e.uv?this.indexAt(e.uv):-1)},onBlur:()=>{this.hovered.hand=null,this.setHover(-1)},onSelect:e=>this.handleSelect(e)}}refresh(){this.draw()}update(e){this.flash>0&&(this.flash=Math.max(0,this.flash-e),this.draw())}dispose(){this.geometry.dispose(),this.material.dispose(),this.texture.dispose()}handleSelect(e){const t=e.uv?this.indexAt(e.uv):-1;t<0||(this.flash=.18,this.setHover(t),this.onSelect?.(t,e.hand))}setHover(e){this.hovered.index=e,this.hover!==e&&(this.hover=e,this.draw())}get bodyTop(){return ta+this.pinned*(_t+$t)}get pageSize(){const e=ei-this.bodyTop-Vo;return this.grid?Math.max(dn,Math.floor(e/(ti+In))*dn):Math.max(1,Math.floor(e/(_t+$t)))}get maxScroll(){return Math.max(0,this.entries.length-this.pinned-this.pageSize)}get visibleCount(){return Math.min(this.entries.length-this.pinned-this.scroll,this.pageSize)}indexAt(e){const t=e.x*Tt;let i=(1-e.y)*ei-ta;if(i<0||t<dt||t>Tt-dt)return-1;if(this.pinned>0){const a=Math.floor(i/(_t+$t));if(a<this.pinned)return i%(_t+$t)>_t?-1:a;i-=this.pinned*(_t+$t)}if(this.grid){const a=Math.floor((t-dt)/(Kt+In)),r=Math.floor(i/(ti+In));if(a<0||a>=dn||r<0||(t-dt)%(Kt+In)>Kt||i%(ti+In)>ti)return-1;const o=r*dn+a;return o<this.visibleCount?this.pinned+this.scroll+o:-1}const s=Math.floor(i/(_t+$t));return s<0||s>=this.visibleCount||i%(_t+$t)>_t?-1:this.pinned+this.scroll+s}cardHeight(){const e=this.visibleCount,t=this.grid?Math.ceil(e/dn)*(ti+In):e*(_t+$t);return Math.min(ei,this.bodyTop+t+Vo)}draw(){const e=this.ctx,t=this.cardHeight();e.clearRect(0,0,Tt,ei),e.beginPath(),e.roundRect(0,0,Tt,t,40),e.fillStyle="rgba(9, 14, 26, 0.93)",e.fill(),e.lineWidth=3,e.strokeStyle="rgba(140, 180, 255, 0.35)",e.stroke(),e.textAlign="left",e.textBaseline="alphabetic",e.fillStyle="#8ea0c4",e.font="600 26px system-ui, sans-serif",e.fillText("BAUMGARTNER VR",dt,62),e.fillStyle="#ffffff",e.font="700 46px system-ui, sans-serif",e.fillText(this.title,dt,118);for(let s=0;s<this.pinned;s++)this.drawRow(this.entries[s],ta+s*(_t+$t),s===this.hover);for(let s=0;s<this.visibleCount;s++){const a=this.pinned+this.scroll+s,r=this.entries[a];if(this.grid){const o=s%dn,l=Math.floor(s/dn);this.drawCell(r,dt+o*(Kt+In),this.bodyTop+l*(ti+In),a===this.hover)}else this.drawRow(r,this.bodyTop+s*(_t+$t),a===this.hover)}this.drawScrollbar(t);const i=this.status||(this.scrollable?"Stick oder Trigger halten und wischen blättert":"")||this.hint||this.footer;i&&(e.fillStyle=this.status?"#9fd0ff":"#71809e",e.font="400 24px system-ui, sans-serif",e.fillText(na(e,i,Tt-dt*2),dt,t-34)),this.texture.needsUpdate=!0}drawScrollbar(e){if(!this.scrollable)return;const t=this.ctx,i=this.bodyTop-6,s=e-Vo-i,a=Tt-24,r=this.entries.length-this.pinned,o=this.pageSize/r,l=Math.max(40,s*o),c=(s-l)*(this.scroll/Math.max(1,r-this.pageSize));t.beginPath(),t.roundRect(a,i,9,s,5),t.fillStyle="rgba(255,255,255,0.1)",t.fill(),t.beginPath(),t.roundRect(a,i+c,9,l,5),t.fillStyle="rgba(174, 208, 255, 0.9)",t.fill()}drawRow(e,t,i){const s=this.ctx,a=Ou(e.accent??4892927),r=i&&this.flash>0;s.beginPath(),s.roundRect(dt,t,Tt-dt*2-(this.scrollable?18:0),_t,24),s.fillStyle=r?Vs(a,.45):i?Vs(a,.22):"rgba(255, 255, 255, 0.06)",s.fill(),s.lineWidth=i?3:2,s.strokeStyle=i?a:"rgba(255,255,255,0.12)",s.stroke();let o=dt+30;e.preview?o=dt+100:e.icon?(Fu(s,e.icon,dt+58,t+_t/2,52,a),o=dt+100):(s.beginPath(),s.roundRect(dt+18,t+22,8,_t-44,4),s.fillStyle=a,s.fill(),o=dt+46);const l=Tt-dt-(e.children?60:e.checked!==void 0?110:30);if(s.fillStyle="#ffffff",s.font="600 36px system-ui, sans-serif",s.fillText(na(s,e.label,l-o),o,t+(e.sub?52:74)),e.sub&&(s.fillStyle="#93a3c4",s.font="400 25px system-ui, sans-serif",s.fillText(na(s,e.sub,l-o),o,t+90)),e.checked!==void 0){const f=Tt-dt-24-74,u=t+_t/2-38/2;s.beginPath(),s.roundRect(f,u,74,38,38/2),s.fillStyle=e.checked?a:"rgba(255,255,255,0.14)",s.fill(),s.beginPath(),s.arc(f+(e.checked?74-38/2:38/2),u+38/2,38/2-5,0,Math.PI*2),s.fillStyle="#ffffff",s.fill()}else e.children?(s.strokeStyle=a,s.lineWidth=5,s.lineCap="round",s.beginPath(),s.moveTo(Tt-dt-46,t+_t/2-14),s.lineTo(Tt-dt-32,t+_t/2),s.lineTo(Tt-dt-46,t+_t/2+14),s.stroke()):e.selected&&(s.beginPath(),s.arc(Tt-dt-34,t+_t/2,9,0,Math.PI*2),s.fillStyle=a,s.fill());if(e.badge){s.font="600 20px system-ui, sans-serif";const c=s.measureText(e.badge).width+26;s.beginPath(),s.roundRect(Tt-dt-70-c,t+18,c,34,17),s.fillStyle=Vs(a,.25),s.fill(),s.fillStyle=a,s.fillText(e.badge,Tt-dt-70-c+13,t+42)}}drawCell(e,t,i,s){const a=this.ctx,r=Ou(e.accent??4892927),o=s&&this.flash>0;a.beginPath(),a.roundRect(t,i,Kt,ti,22),a.fillStyle=o?Vs(r,.45):s?Vs(r,.22):"rgba(255, 255, 255, 0.06)",a.fill(),a.lineWidth=s?3:2,a.strokeStyle=s?r:"rgba(255,255,255,0.12)",a.stroke(),e.icon&&Fu(a,e.icon,t+Kt/2,i+Kt/2,Kt*.52,r),e.selected&&(a.beginPath(),a.arc(t+Kt-18,i+18,7,0,Math.PI*2),a.fillStyle=r,a.fill()),a.textAlign="center",a.fillStyle="#ffffff",a.font="600 24px system-ui, sans-serif",a.fillText(na(a,e.label,Kt-20),t+Kt/2,i+ti-16),a.textAlign="left"}}function Ou(n){return`#${n.toString(16).padStart(6,"0")}`}function Vs(n,e){const t=parseInt(n.slice(1),16);return`rgba(${t>>16&255}, ${t>>8&255}, ${t&255}, ${e})`}function na(n,e,t){if(n.measureText(e).width<=t)return e;let i=e;for(;i.length>1&&n.measureText(`${i}…`).width>t;)i=i.slice(0,-1);return`${i}…`}const Bu=512;class Jb extends yt{canvas;texture;options;constructor(e){const t=e.height??e.width*.42,i=document.createElement("canvas");i.width=Bu,i.height=Math.round(Bu*t/e.width);const s=new Sf(i);s.colorSpace=Bt,s.anisotropy=8,super(new bs(e.width,t),new Oa({map:s,transparent:!0,toneMapped:!1})),this.canvas=i,this.texture=s,this.options=e,this.name=`text-plane:${e.title}`,this.geometry.computeBoundingBox(),this.draw()}setText(e,t,i){this.options={...this.options,title:e,body:t,accent:i??this.options.accent},this.draw()}setHighlight(e){this.material.opacity=e?1:.9,this.scale.setScalar(e?1.04:1)}dispose(){this.geometry.dispose(),this.material.dispose(),this.texture.dispose()}draw(){const{title:e,body:t,accent:i=4892927,background:s,align:a="left"}=this.options,r=this.canvas.getContext("2d"),o=this.canvas.width,l=this.canvas.height,c=`#${i.toString(16).padStart(6,"0")}`;r.clearRect(0,0,o,l),r.beginPath(),r.roundRect(4,4,o-8,l-8,26),r.fillStyle=s??"rgba(9, 14, 26, 0.86)",r.fill(),r.lineWidth=3,r.strokeStyle=c,r.stroke();const h=a==="center";r.textAlign=h?"center":"left";const f=h?o/2:40;if(r.fillStyle="#ffffff",r.font=`700 ${Math.round(l*.24)}px system-ui, sans-serif`,r.fillText(e,f,l*(t?.36:.58),o-80),t){const u=l*.5,d=l*.92-u,g=Math.round(l*.13),M=Math.max(11,Math.round(l*.055));r.fillStyle="#9fb0d0";let m=g,p=[];for(;r.font=`400 ${m}px system-ui, sans-serif`,p=Ay(r,t,o-80),!(p.length*m*1.3<=d||m<=M);)m-=1;const y=m*1.3,b=Math.max(1,Math.floor(d/y));p.slice(0,b).forEach((x,A)=>{const E=A===b-1&&p.length>b;r.fillText(E?`${x} …`:x,f,u+m+A*y,o-80)})}this.texture.needsUpdate=!0}}function Ay(n,e,t){const i=[];for(const s of e.split(`
`)){let a="";for(const r of s.split(" ")){const o=a?`${a} ${r}`:r;n.measureText(o).width>t&&a?(i.push(a),a=r):a=o}i.push(a)}return i}let is=null;function xd(){if(is)return is.state==="suspended"&&is.resume(),is;const n=window.AudioContext??window.webkitAudioContext;if(!n)return null;try{is=new n}catch{return null}return is}function Zb(){return xd()}function rn(n){const e=xd();if(!e)return;const t=e.currentTime+(n.delay??0),i=t+n.duration,s=e.createOscillator(),a=e.createGain();s.type=n.type??"square",s.frequency.setValueAtTime(n.from,t),n.to!==void 0&&n.to!==n.from&&s.frequency.exponentialRampToValueAtTime(Math.max(n.to,1),i);const r=n.gain??.12;a.gain.setValueAtTime(1e-4,t),a.gain.exponentialRampToValueAtTime(r,t+Math.min(.012,n.duration/3)),a.gain.exponentialRampToValueAtTime(1e-4,i),s.connect(a).connect(e.destination),s.start(t),s.stop(i+.02)}function Qb(){rn({type:"square",from:780,to:90,duration:.09,gain:.09}),rn({type:"sawtooth",from:180,to:50,duration:.14,gain:.06})}function jb(){rn({type:"square",from:240,to:160,duration:.06,gain:.05}),rn({type:"square",from:320,to:420,duration:.07,gain:.05,delay:.22})}function eE(){rn({type:"square",from:120,to:90,duration:.05,gain:.05})}function tE(n){for(let t=0;t<7;t++){const i=t/6,s=n?i:1-i;rn({type:"triangle",from:1200-s*780,duration:.05,gain:.07,delay:n?i*i*.55:i*.3})}}function nE(n){rn({type:"triangle",from:n?520:420,to:n?760:300,duration:.07,gain:.05})}function iE(){rn({type:"square",from:1500,to:320,duration:.05,gain:.09}),rn({type:"sine",from:200,to:60,duration:.14,gain:.08}),rn({type:"sawtooth",from:2800,to:1600,duration:.55,gain:.012,delay:.04})}function sE(n){rn({type:"square",from:n?900:700,to:n?1500:420,duration:.035,gain:.05})}const wy="modulepreload",Ry=function(n){return"/vr/"+n},zu={},fn=function(e,t,i){let s=Promise.resolve();if(t&&t.length>0){let l=function(c){return Promise.all(c.map(h=>Promise.resolve(h).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};document.getElementsByTagName("link");const r=document.querySelector("meta[property=csp-nonce]"),o=r?.nonce||r?.getAttribute("nonce");s=l(t.map(c=>{if(c=Ry(c),c in zu)return;zu[c]=!0;const h=c.endsWith(".css"),f=h?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${f}`))return;const u=document.createElement("link");if(u.rel=h?"stylesheet":wy,h||(u.as="script"),u.crossOrigin="",u.href=c,o&&u.setAttribute("nonce",o),document.head.appendChild(u),h)return new Promise((d,g)=>{u.addEventListener("load",d),u.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${c}`)))})}))}function a(r){const o=new Event("vite:preloadError",{cancelable:!0});if(o.payload=r,window.dispatchEvent(o),!o.defaultPrevented)throw r}return s.then(r=>{for(const o of r||[])o.status==="rejected"&&a(o.reason);return e().catch(a)})},Py=[{id:"hub",title:"Hub",tagline:"Startpunkt",description:"Ruhige Halle mit Händen, Handgelenk-Menü und Übersicht.",accent:4892927,roles:["vr","desktop","handheld"],load:async()=>new(await fn(async()=>{const{HubWorld:n}=await import("./HubWorld-4m0-e6uw.js");return{HubWorld:n}},__vite__mapDeps([0,1]))).HubWorld},{id:"portal",title:"Portal Labor",tagline:"Portale, Physik, Companion Cube",description:"Waffen am Gürtel greifen: links schießt blau, rechts rot. Springen, fallen, werfen.",accent:16726831,roles:["vr","desktop"],experimental:!0,load:async()=>new(await fn(async()=>{const{PortalWorld:n}=await import("./PortalWorld-B57r-8cw.js");return{PortalWorld:n}},__vite__mapDeps([2,3,4,1]))).PortalWorld},{id:"range",title:"Schießstand",tagline:"Ziele auf 10 bis 100 Meter",description:"Überdachte Schießlinie, Scheiben in der Ferne und Stahlplatten. Pistole im Menü einstellen.",accent:16762967,roles:["vr","desktop"],experimental:!0,load:async()=>new(await fn(async()=>{const{RangeWorld:n}=await import("./RangeWorld-DsZOfWlR.js");return{RangeWorld:n}},__vite__mapDeps([5,2,3,4,1,6]))).RangeWorld},{id:"kart",title:"Gokart",tagline:"Kleine Strecke, vier Karts",description:"Lenkrad greifen und einsteigen. Rechter Trigger Gas, linker bremst, Klemmbrett stellt alles ein.",accent:6217888,roles:["vr","desktop"],experimental:!0,load:async()=>new(await fn(async()=>{const{KartWorld:n}=await import("./KartWorld-x3wa6LEw.js");return{KartWorld:n}},__vite__mapDeps([7,2,3,4,1]))).KartWorld},{id:"shop",title:"Pizzeria",tagline:"Kneten, belegen, backen",description:"Küche, Thresen und Gastraum. Teig mit der Faust flach kneten, Soße, Käse, Ofen — Mülleimer löscht.",accent:16747055,roles:["vr","desktop"],experimental:!0,load:async()=>new(await fn(async()=>{const{ShopWorld:n}=await import("./ShopWorld-C0MvpX-s.js");return{ShopWorld:n}},__vite__mapDeps([8,2,3,4,1]))).ShopWorld},{id:"tune",title:"Eingaberaum",tagline:"Was drückst du gerade?",description:"Zwei Controller in der Luft, jede Taste leuchtet. Mit bloßen Händen: fünf Finger-Balken und die Gesten. Hier wird nicht gelaufen.",accent:10478591,roles:["vr"],experimental:!0,load:async()=>new(await fn(async()=>{const{TuneWorld:n}=await import("./TuneWorld-vJ-MWo5A.js");return{TuneWorld:n}},__vite__mapDeps([9,2,3,4,1,10,6,11]))).TuneWorld},{id:"dust",title:"Dust",tagline:"Große Karte, vier Stockwerke",description:"Zwei Plätze, ein Tunnel und begehbare Häuser. Alle Werkzeuge, Portale haften an den hellen Tafeln.",accent:16762967,roles:["vr","desktop"],experimental:!0,load:async()=>new(await fn(async()=>{const{DustWorld:n}=await import("./DustWorld-Cr9ZhGxh.js");return{DustWorld:n}},__vite__mapDeps([12,2,3,4,1]))).DustWorld},{id:"moon",title:"Mond",tagline:"Ein Sechstel Schwerkraft",description:"Graue Ebene bis zum Horizont, Krater, Felsen und ein Lander. Springen dauert dreimal so lange.",accent:14146792,roles:["vr","desktop"],experimental:!0,load:async()=>new(await fn(async()=>{const{MoonWorld:n}=await import("./MoonWorld-DfYjDrM-.js");return{MoonWorld:n}},__vite__mapDeps([13,2,3,4,1]))).MoonWorld},{id:"alps",title:"Alpen",tagline:"Ein Gipfel, ein Hängegleiter",description:"Großer Berg mit Startrampe, Tal mit Landewiese. Hängegleiter links, Flügel rechts — Trigger ist der Anlauf.",accent:10475775,roles:["vr","desktop"],experimental:!0,load:async()=>new(await fn(async()=>{const{AlpsWorld:n}=await import("./AlpsWorld-EJ4JsLCC.js");return{AlpsWorld:n}},__vite__mapDeps([14,2,3,4,1]))).AlpsWorld},{id:"dark",title:"Dunkelhaus",tagline:"Licht aus, Taschenlampe an",description:"Kleines Haus ohne Fenster: Lichtschalter im Startraum, schwebende Taschenlampe, Leuchtkugel, Laterne und Knicklichter.",accent:16767114,roles:["vr","desktop"],experimental:!0,load:async()=>new(await fn(async()=>{const{DarkWorld:n}=await import("./DarkWorld-8GGL1TE0.js");return{DarkWorld:n}},__vite__mapDeps([15,2,3,4,1]))).DarkWorld}],rE="hub";function aE(n){return Py.find(e=>e.id===n)}const Xs="BG",Cy=3,Iy="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",qs=Iy;function Md(n,e=Cy){const t=Uy(n),i=t.length<n.length,s=i?t:n,a=new Uint8Array(s.length+3);a[0]=i?1:0,a.set(s,1);const r=yd(a.subarray(0,s.length+1));return a[s.length+1]=r>>8&255,a[s.length+2]=r&255,Xs+e+zy(a)}function Ly(n){const e=n.replace(/\s+/g,"");if(!e.startsWith(Xs))return null;const t=Number(e.slice(Xs.length,Xs.length+1));if(!Number.isInteger(t)||t<1||t>9)return null;const i=ky(e.slice(Xs.length+1));if(!i||i.length<3)return null;const s=i.length-2,a=yd(i.subarray(0,s));if(i[s]!==(a>>8&255)||i[s+1]!==(a&255))return null;const r=i.subarray(1,s);return{version:t,payload:i[0]===1?Fy(r):r}}const Dy=4096,Aa=3,Ny=Aa+15;function Uy(n){const e=[];let t=0,i=0;for(let s=0;s<n.length;){i===0&&(t=e.length,e.push(0),i=1);let a=-1,r=0;for(let o=Math.max(0,s-Dy);o<s;o++){let l=0;for(;l<Ny&&s+l<n.length&&n[o+l]===n[s+l];)l++;l>r&&(r=l,a=o)}if(r>=Aa){const o=s-a-1;e.push(o>>4&255,(o&15)<<4|r-Aa),s+=r}else e[t]|=i,e.push(n[s]),s++;i=i<<1&255}return Uint8Array.from(e)}function Fy(n){const e=[];let t=0,i=0,s=0;for(;t<n.length;){if(s===0&&(i=n[t++],s=1),i&s)t<n.length&&e.push(n[t++]);else{if(t+1>=n.length)break;const a=n[t++],r=n[t++],o=(a<<4|r>>4)+1,l=(r&15)+Aa,c=e.length-o;if(c<0)break;for(let h=0;h<l;h++)e.push(e[c+h])}s=s<<1&255}return Uint8Array.from(e)}class Oy{out=[];byte(e){return this.out.push(e&255),this}uint(e){let t=Math.max(0,Math.round(e))>>>0;for(;t>=128;)this.out.push(t&127|128),t>>>=7;return this.out.push(t),this}int(e){const t=Math.round(e)|0;return this.uint(t<<1^t>>31)}fixed(e,t){return this.int(Number.isFinite(e)?e*t:0)}text(e){const t=new TextEncoder().encode(e);this.uint(t.length);for(const i of t)this.out.push(i);return this}bytes(){return Uint8Array.from(this.out)}}class By{constructor(e){this.source=e}source;at=0;get done(){return this.at>=this.source.length}byte(){return this.at<this.source.length?this.source[this.at++]:0}uint(){let e=0,t=0;for(;this.at<this.source.length;){const i=this.source[this.at++];if(e+=(i&127)*2**t,(i&128)===0||(t+=7,t>42))break}return e}int(){const e=this.uint();return(e%2===0?e/2:-(e+1)/2)|0}fixed(e){return Math.round(this.int()/e*1e6)/1e6}text(){const e=this.uint(),t=Math.min(this.at+e,this.source.length),i=this.source.subarray(this.at,t);return this.at=t,new TextDecoder().decode(i)}}function yd(n){let e=2166136261;for(const t of n)e^=t,e=Math.imul(e,16777619)>>>0;return(e>>>16^e&65535)&65535}function zy(n){let e="";for(let t=0;t<n.length;t+=3){const i=n[t],s=n[t+1],a=n[t+2],r=i<<16|(s??0)<<8|(a??0);if(e+=qs[r>>18&63]+qs[r>>12&63],s===void 0||(e+=qs[r>>6&63],a===void 0))break;e+=qs[r&63]}return e}function ky(n){const e=[];let t=0,i=0;for(const s of n){const a=qs.indexOf(s);if(a<0)return null;i=i<<6|a,t+=6,t>=8&&(t-=8,e.push(i>>t&255))}return Uint8Array.from(e)}const oE={x:0,y:0,z:0,w:1};function rr(n,e,t){const i=n.w*e.x+n.x*e.w+n.y*e.z-n.z*e.y,s=n.w*e.y-n.x*e.z+n.y*e.w+n.z*e.x,a=n.w*e.z+n.x*e.y-n.y*e.x+n.z*e.w,r=n.w*e.w-n.x*e.x-n.y*e.y-n.z*e.z;return t.x=i,t.y=s,t.z=a,t.w=r,t}function wa(n,e){return e.x=-n.x,e.y=-n.y,e.z=-n.z,e.w=n.w,e}function Sd(n,e,t){const{x:i,y:s,z:a}=n,{x:r,y:o,z:l,w:c}=e,h=c*i+o*a-l*s,f=c*s+l*i-r*a,u=c*a+r*s-o*i,d=-r*i-o*s-l*a;return t.x=h*c-d*r-f*l+u*o,t.y=f*c-d*o-u*r+h*l,t.z=u*c-d*l-h*o+f*r,t}function lE(n,e,t){return wa(n,t),rr(t,e,t)}function cE(n,e,t){const i=wa(n.rotation,{x:0,y:0,z:0,w:1}),s={x:t.position.x-n.position.x,y:t.position.y-n.position.y,z:t.position.z-n.position.z},a=Sd(s,i,{x:0,y:0,z:0}),r=rr(i,t.rotation,{x:0,y:0,z:0,w:1}),o=rr(wa(e,{x:0,y:0,z:0,w:1}),r,{x:0,y:0,z:0,w:1});return{position:a,rotation:wd(o)}}function hE(n,e,t){const i=rr(e,t.rotation,{x:0,y:0,z:0,w:1}),s=wd(rr(n.rotation,wa(i,{x:0,y:0,z:0,w:1}),{x:0,y:0,z:0,w:1})),a=Sd(t.position,s,{x:0,y:0,z:0});return{position:{x:n.position.x-a.x,y:n.position.y-a.y,z:n.position.z-a.z},rotation:s}}function Vy(n){const{x:e,y:t,z:i}=Ad(n.rotation);return{x:ss(n.position.x*100,1),y:ss(n.position.y*100,1),z:ss(n.position.z*100,1),pitch:ss(e*180/Math.PI,0),yaw:ss(t*180/Math.PI,0),roll:ss(i*180/Math.PI,0)}}function uE(n){return`x ${n.x} y ${n.y} z ${n.z} cm · roll ${n.roll}° pitch ${n.pitch}° yaw ${n.yaw}°`}function Hy(n){return{position:{x:n.x/100,y:n.y/100,z:n.z/100},rotation:Td({x:n.pitch*Math.PI/180,y:n.yaw*Math.PI/180,z:n.roll*Math.PI/180})}}function bd(n){return[n.x,n.y,n.z,n.pitch,n.yaw,n.roll]}function Ed(n){const e=t=>Number.isFinite(n[t])?n[t]:0;return{x:e(0),y:e(1),z:e(2),pitch:e(3),yaw:e(4),roll:e(5)}}function Td(n){const e=Math.cos(n.x/2),t=Math.cos(n.y/2),i=Math.cos(n.z/2),s=Math.sin(n.x/2),a=Math.sin(n.y/2),r=Math.sin(n.z/2);return{x:s*t*i+e*a*r,y:e*a*i-s*t*r,z:e*t*r+s*a*i,w:e*t*i-s*a*r}}function Ad(n){const{x:e,y:t,z:i,w:s}=n,a=e+e,r=t+t,o=i+i,l=e*a,c=e*r,h=e*o,f=t*r,u=t*o,d=i*o,g=s*a,M=s*r,m=s*o,p=1-(f+d),y=c-m,b=h+M,x=1-(l+d),A=u-g,E=u+g,R=1-(l+f),_=Math.asin(Math.max(-1,Math.min(1,b)));return Math.abs(b)<.9999999?{x:Math.atan2(-A,R),y:_,z:Math.atan2(-y,p)}:{x:Math.atan2(E,x),y:_,z:0}}function wd(n){const e=Math.hypot(n.x,n.y,n.z,n.w)||1;return{x:n.x/e,y:n.y/e,z:n.z/e,w:n.w/e}}function ss(n,e){const t=10**e;return(Math.round(n*t)+0)/t}const Wl="BP",Hn="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_",yi=30,Js=.1,Ho=Math.round(yi*2/Js)+1,ku=360,Rd=181,rs=101,Rc=30,Pd=Rc*2+1,ar=[Ho,Ho,Ho,ku,Rd,ku],Pc=[rs,rs,rs,rs,rs,Pd];Ga(ar);Ga(Pc);const Xl=["","grab","gun-blue","gun-red","gun-dual","gizmo","brush","duplicator","inspect","pistol","knife","stopwatch","flashlight","grapple","gravity-glove","translate-glove","superman-glove","welder","xray","drone","tape","teleport","eraser","hand-box","controller-left","controller-right","hammer","holster","hang-glider","wings","grip","grip-rod","bag"],ql=1,Yl=2,Cd=4,$l=8;function Gy(n){const e=Math.max(0,Xl.indexOf(n.toolId));let t=n.hand==="left"?Cd:0;const i=[],s=[];n.pose&&(t|=ql,i.push(...Vu(n.pose)),s.push(...ar)),n.grip&&(t|=Yl,i.push(...Vu(n.grip)),s.push(...ar)),n.fingers&&(t|=$l,i.push(...Xy(n.fingers.curls,n.fingers.spread)),s.push(...Pc));const a=as(e)+as(t)+$y(i,s),r=Id(a);return Wl+a+as(Math.floor(r/59))+as(r%59)}function Wy(n){const e=n.replace(/\s+/g,"");if(!e.startsWith(Wl))return null;const t=e.slice(Wl.length);if(t.length<4)return null;const i=t.slice(0,t.length-2),s=Id(i);if(as(Math.floor(s/59))!==t[t.length-2]||as(s%59)!==t[t.length-1])return null;const a=Ra(i[0]),r=Ra(i[1]);if(a<0||r<0||a>=Xl.length)return null;const o=[];r&ql&&o.push(...ar),r&Yl&&o.push(...ar),r&$l&&o.push(...Pc);const l=i.slice(2);if(l.length!==Ga(o))return null;const c=o.length>0?Ky(l,o):[];if(!c)return null;const h={toolId:Xl[a],hand:r&Cd?"left":"right"};let f=0;return r&ql&&(h.pose=Hu(c.slice(f,f+=6))),r&Yl&&(h.grip=Hu(c.slice(f,f+=6))),r&$l&&(h.fingers=qy(c.slice(f,f+=6))),h}function Vu(n){const[e,t,i]=Yy(n[3]??0,n[4]??0,n[5]??0);return[Go(n[0]??0),Go(n[1]??0),Go(n[2]??0),Gu(e),Math.min(Rd-1,Math.max(0,Math.round(t)+90)),Gu(i)]}function Hu(n){return[Wo(n[0]*Js-yi),Wo(n[1]*Js-yi),Wo(n[2]*Js-yi),Wu(n[3]),n[4]-90,Wu(n[5])]}function Xy(n,e){const t=[0,1,2,3,4].map(i=>Pa(Math.round((n[i]??0)*100),rs));return t.push(Pa(Math.round(e)+Rc,Pd)),t}function qy(n){return{curls:n.slice(0,5).map(e=>Math.round(e)/100),spread:n[5]-Rc}}function Yy(n,e,t){const i=Ad(Td({x:Zs(n)*Math.PI/180,y:Zs(e)*Math.PI/180,z:Zs(t)*Math.PI/180}));return[i.x*180/Math.PI,i.y*180/Math.PI,i.z*180/Math.PI]}function Ga(n){let e=1n;for(const a of n)e*=BigInt(a);let t=0,i=1n;const s=BigInt(Hn.length);for(;i<e;)i*=s,t++;return t}function $y(n,e){const t=BigInt(Hn.length);let i=0n;for(let a=0;a<e.length;a++)i=i*BigInt(e[a])+BigInt(Pa(n[a]??0,e[a]));let s="";for(let a=Ga(e);a>0;a--)s=Hn[Number(i%t)]+s,i/=t;return s}function Ky(n,e){const t=BigInt(Hn.length);let i=0n;for(const a of n){const r=Ra(a);if(r<0)return null;i=i*t+BigInt(r)}const s=[];for(let a=e.length-1;a>=0;a--){const r=BigInt(e[a]);s[a]=Number(i%r),i/=r}return i===0n?s:null}function as(n){return Hn[Pa(n,Hn.length)]}function Ra(n){return Hn.indexOf(n)}function Id(n){const e=Hn.length*Hn.length;let t=1234;for(let i=0;i<n.length;i++)t=(t*31+(i+1)*(Ra(n[i])+1))%e;return t}function Go(n){const e=Zs(n);return Math.round((Math.min(yi,Math.max(-yi,e))+yi)/Js)}function Gu(n){return(Math.round(Zs(n))%360+360)%360}function Wu(n){return n>=180?n-360:n}function Zs(n){return Number.isFinite(n)?n:0}function Pa(n,e){return Number.isFinite(n)?Math.min(e-1,Math.max(0,Math.round(n))):0}function Wo(n){return Math.round(n*10)/10}const Ld=5.5,Dd=70,Jy=Math.PI/180,Zy=.58,Qy=1.25,jy=2,eS=.3;function tS(n,e){const t=e*Jy;return{speed:n,climb:n*Zy,yawRate:t,pitchRate:t*Qy,rollRate:t*jy,lean:eS}}const Nd=tS(Ld,Dd);function nS(){return{x:0,y:0,z:0,w:1}}function Xu(n,e){const t=e/2,i=Math.sin(t);return{x:n.x*i,y:n.y*i,z:n.z*i,w:Math.cos(t)}}function iS(n){return{x:0,y:Math.sin(n/2),z:0,w:Math.cos(n/2)}}function qu(n,e){return{x:n.w*e.x+n.x*e.w+n.y*e.z-n.z*e.y,y:n.w*e.y-n.x*e.z+n.y*e.w+n.z*e.x,z:n.w*e.z+n.x*e.y-n.y*e.x+n.z*e.w,w:n.w*e.w-n.x*e.x-n.y*e.y-n.z*e.z}}function sS(n){const e=Math.hypot(n.x,n.y,n.z,n.w);return e<1e-9?nS():{x:n.x/e,y:n.y/e,z:n.z/e,w:n.w/e}}function Cc(n,e){const t=2*(n.y*e.z-n.z*e.y),i=2*(n.z*e.x-n.x*e.z),s=2*(n.x*e.y-n.y*e.x);return{x:e.x+n.w*t+(n.y*s-n.z*i),y:e.y+n.w*i+(n.z*t-n.x*s),z:e.z+n.w*s+(n.x*i-n.y*t)}}function Ud(n){return Cc(n,{x:0,y:0,z:-1})}function rS(n){return Cc(n,{x:1,y:0,z:0})}function aS(n){const e=Ud(n);if(e.x*e.x+e.z*e.z<1e-6){const t=Cc(n,{x:0,y:1,z:0});return Math.atan2(-t.x,-t.z)}return Math.atan2(-e.x,-e.z)}function fE(n){return iS(aS(n))}function dE(n,e,t,i,s,a=Nd){const r=oS(i),o={x:-r.z,z:r.x};let l={x:r.x*-e.y+o.x*e.x,y:0,z:r.z*-e.y+o.z*e.x};return l=Od(Fd(l),a.speed),l.y=-t.y*a.climb,{heading:n-t.x*a.yawRate*s,wish:l,bank:-e.x*a.lean,nose:e.y*a.lean}}function pE(n,e,t,i,s=Nd){const a=Xu({x:1,y:0,z:0},t.y*s.pitchRate*i),r=Xu({x:0,y:0,z:1},-t.x*s.rollRate*i),o=sS(qu(qu(n,a),r)),l=Ud(o),c=rS(o),h=Od(Fd({x:l.x*-e.y+c.x*e.x,y:l.y*-e.y+c.y*e.x,z:l.z*-e.y+c.z*e.x}),s.speed);return{orientation:o,wish:h}}function oS(n){const e=Math.hypot(n.x,n.z);return e<1e-6?{x:0,y:0,z:-1}:{x:n.x/e,y:0,z:n.z/e}}function Fd(n){const e=Math.hypot(n.x,n.y,n.z);return e<=1?n:{x:n.x/e,y:n.y/e,z:n.z/e}}function Od(n,e){return{x:n.x*e,y:n.y*e,z:n.z*e}}const Ca={profile:"kopter",replace:!1,speed:Ld,turn:Dd},lS=[{id:"kopter",label:"Kopter",left:"schieben",right:"drehen, auf/ab"},{id:"racing",label:"Jet",left:"vor/zurück, quer",right:"rollen, nicken"}],cS=["kopter","racing"];function mE(n){return lS.find(e=>e.id===n)?.label??n}const hS=[{key:"speed",label:"Tempo",unit:"m/s",min:.5,max:60,decimals:1,sub:"Wie schnell sie fliegt — Steigen zieht mit",steps:[2,3.5,5.5,9,14,22]},{key:"turn",label:"Drehrate",unit:"°/s",min:10,max:400,decimals:0,sub:"Wie schnell sie dreht — Jet: Rollen und Nicken",steps:[30,45,70,110,160,240]}];function uS(n,e){if(!Number.isFinite(e)||e<=0)return Ca[n.key];const t=10**n.decimals;return Math.round(Math.min(n.max,Math.max(n.min,e))*t)/t}function gE(n,e){return n.steps.find(t=>t>e+1e-9)??n.steps[0]}function _E(n,e){return`${e.toFixed(n.decimals)} ${n.unit}`}function Wa(n){const e={...Ca,...n};cS.includes(e.profile)||(e.profile=Ca.profile),e.replace=e.replace===!0;for(const t of hS)e[t.key]=uS(t,e[t.key]);return e}const Mn=["hand","kopf","beide","aus"],vE={hand:"Hand",kopf:"Kopf",beide:"Hand + Kopf",aus:"Aus"},Ia={forward:9,back:5,up:6,down:6,side:5,turn:70,deadzone:6,drive:"hand",lift:"hand",yaw:"beide",strafe:!1},fS=[{key:"forward",label:"Vorwärts",unit:"m/s",min:.5,max:60,decimals:1,sub:"Volle Lehne nach vorn",steps:[4,6,9,14,22,34]},{key:"back",label:"Rückwärts",unit:"m/s",min:.5,max:60,decimals:1,sub:"Volle Lehne nach hinten",steps:[2,3.5,5,8,12,18]},{key:"up",label:"Hoch",unit:"m/s",min:.5,max:60,decimals:1,sub:"Steigen bei voller Lehne",steps:[3,4.5,6,9,14,20]},{key:"down",label:"Runter",unit:"m/s",min:.5,max:60,decimals:1,sub:"Sinken bei voller Lehne",steps:[3,4.5,6,9,14,20]},{key:"side",label:"Seitwärts",unit:"m/s",min:.5,max:60,decimals:1,sub:"Nur wenn die Hand quer schiebt statt zu drehen",steps:[2,3.5,5,8,12,18]},{key:"turn",label:"Drehrate",unit:"°/s",min:5,max:360,decimals:0,sub:"Wie schnell die Kurve herumkommt",steps:[40,55,70,100,140,200]},{key:"deadzone",label:"Totzone",unit:"cm",min:.5,max:25,decimals:1,sub:"So weit darf die Hand wandern, ohne dass etwas passiert",steps:[3,4.5,6,9,13]}],dS=[{key:"drive",label:"Vor/Zurück",sub:"Hand lehnt · Kopf: Blick nach unten schiebt"},{key:"lift",label:"Hoch/Runter",sub:"Hand hebt · Kopf: Blick nach oben steigt"},{key:"yaw",label:"Links/Rechts",sub:"Hand legt an · Kopf zieht die Kurve mit"}];function pS(n,e){if(!Number.isFinite(e)||e<=0)return Ia[n.key];const t=10**n.decimals;return Math.round(Math.min(n.max,Math.max(n.min,e))*t)/t}function xE(n,e){return n.steps.find(t=>t>e+1e-9)??n.steps[0]}function ME(n){const e=Mn.indexOf(n);return Mn[(e+1)%Mn.length]}function yE(n,e){return`${e.toFixed(n.decimals)} ${n.unit}`}function Ic(n){const e={...Ia,...n};for(const t of fS)e[t.key]=pS(t,e[t.key]);for(const t of dS)Mn.includes(e[t.key])||(e[t.key]=Ia[t.key]);return e.strafe=e.strafe===!0,e}const La=["reddot","irons","trace","xray","scope"],ha={mass:.06,speed:26,rate:5,magazine:12,reload:1.15,burst:3,mode:"single",ammo:"normal",zoom:16,sights:[]},Bd=[{label:"leicht",mass:.03},{label:"normal",mass:.06},{label:"stark",mass:.14},{label:"brutal",mass:.3}],SE=[14,26,45,70,120],bE=[2,5,9,14,20],EE=[6,12,17,30,60,100],TE=[.4,.8,1.15,2],AE=[2,3,5],wE=[16,20,24,28,32,36],Lc=["single","burst","auto"],RE={single:"Einzelfeuer",burst:"Dreifachschuss",auto:"Automatik"},PE={normal:"Normal",tracer:"Leuchtspur"},Dc=["normal","tracer"],mS=[{id:"none",label:"Alles ab",caption:"Nimmt jede Zielhilfe von der Waffe"},{id:"reddot",label:"Rotpunkt",caption:"Roter Punkt, schwebt über der Waffe"},{id:"irons",label:"Kimme & Korn",caption:"Kimme hinten, Korn vorn — klassisch"},{id:"trace",label:"Flugbahn",caption:"Zeigt die Bahn der Kugel voraus"},{id:"xray",label:"Röntgen",caption:"Röntgengerät auf der Waffe: sieht durch Wände"},{id:"scope",label:"Fernrohr",caption:"Zielfernrohr mit echtem Zoom — Stufe unter „Zoom“"}],gS=[{key:"mass",label:"Stärke",unit:"kg",min:.001,max:5,decimals:3,sub:"Masse der Kugel — wie hart sie zuschlägt"},{key:"speed",label:"Tempo",unit:"m/s",min:1,max:400,decimals:1,sub:"Mündungsgeschwindigkeit"},{key:"rate",label:"Feuerrate",unit:"/s",min:.2,max:40,decimals:1,sub:"Schuss pro Sekunde"},{key:"magazine",label:"Magazin",unit:"Schuss",min:1,max:300,decimals:0,sub:"Rundenanzahl bis zum Nachladen"},{key:"reload",label:"Nachladezeit",unit:"s",min:.05,max:10,decimals:2,sub:"Wie lange das Magazin braucht"},{key:"burst",label:"Salve",unit:"Schuss",min:1,max:20,decimals:0,sub:"Wie viele der Dreifachschuss abgibt"},{key:"zoom",label:"Zoom",unit:"×",min:1,max:60,decimals:1,sub:"Vergrößerung des Fernrohrs"}];function pr(n){const e={...ha,...n};for(const t of gS)e[t.key]=_S(t,e[t.key]);return Lc.includes(e.mode)||(e.mode=ha.mode),Dc.includes(e.ammo)||(e.ammo=ha.ammo),e.sights=zd(n.sights??(n.sight?[n.sight]:e.sights)),e}function zd(n){return Array.isArray(n)?La.filter(e=>n.includes(e)):[]}function CE(n,e){return e==="none"?[]:zd(n.includes(e)?n.filter(t=>t!==e):[...n,e])}function IE(n){return n.length===0?"keine":n.map(e=>mS.find(t=>t.id===e)?.label??e).join(" + ")}function _S(n,e){if(!Number.isFinite(e))return ha[n.key];const t=10**n.decimals;return Math.round(Math.min(n.max,Math.max(n.min,e))*t)/t}function vS(n,e){return n.find(t=>t>e+1e-9)??n[0]}function LE(n){return`${Number.isInteger(n)?n:n.toFixed(1)}×`}function DE(n){const e=Bd.find(t=>Math.abs(t.mass-n)<1e-9);return e?e.label:`${n} kg`}function NE(n){return vS(Bd.map(e=>e.mass),n)}function UE(n,e){const t=n.indexOf(e);return n[(t+1)%n.length]}const or=3,ua=1,Yu=2,Pt={tools:1,hands:2,attachments:4,weapon:8,drone:16,superman:32},ri=["gun-blue","gun-red","gun-dual","gizmo","brush","pistol","stopwatch","grapple","gravity-glove","translate-glove","welder","xray","drone","tape","adjust","eraser","superman-glove","flashlight","hand-box","controller-left","controller-right","teleport","hammer"],Nc=["reddot","irons","trace","xray","scope"],Uc=["kopter","racing"],_s=[10,10,10,1,1,1],vs=[0,0,0,0,0,0],Da=[100,100,100,100,100,100,100,100,100,100,100,100],kd=fr(En),gn=["left","right"],Vd=gn.map(n=>fr(Tc(n)));function xS(n){let e=0;return n.tools&&(e|=Pt.tools),n.hands&&(e|=Pt.hands),n.attachments&&(e|=Pt.attachments),n.weapon&&(e|=Pt.weapon),n.drone&&(e|=Pt.drone),n.superman&&(e|=Pt.superman),e}function Hd(n){const e=new Oy,t=xS(n);if(e.uint(t),t&Pt.tools){const i=Object.entries(n.tools);e.uint(i.length);for(const[s,a]of i)fa(e,ri,s),Na(e,a,_s,vs)}if(t&Pt.hands&&SS(e,n.hands),t&Pt.attachments){const i=Object.entries(n.attachments);e.uint(i.length);for(const[s,a]of i){const r=s.indexOf(":");fa(e,ri,r<0?s:s.slice(0,r)),fa(e,Nc,r<0?"":s.slice(r+1)),Na(e,a,_s,vs)}}return t&Pt.weapon&&bS(e,n.weapon),t&Pt.drone&&TS(e,n.drone),t&Pt.superman&&wS(e,n.superman),e.bytes()}function MS(n,e=or){const t=new By(n);if(e===Yu){const a=t.byte();if(a===ua)return yS(t);if(a!==Yu)return null}else if(e!==or)return null;const i=t.uint(),s={};if(i&Pt.tools){const a={};for(let r=t.uint();r>0;r--)a[Si(t,ri)]=xs(t,_s,vs,e);s.tools=a}if(i&Pt.hands&&(s.hands=Gd(t,e)),i&Pt.attachments){const a={};for(let r=t.uint();r>0;r--){const o=Si(t,ri),l=Si(t,Nc);a[`${o}:${l}`]=xs(t,_s,vs,e)}s.attachments=a}return i&Pt.weapon&&(s.weapon=ES(t)),i&Pt.drone&&(s.drone=AS(t)),i&Pt.superman&&(s.superman=RS(t)),s}function yS(n){const e={};for(let l=n.uint();l>0;l--)e[Si(n,ri)]=xs(n,_s,vs,ua);const t=Gd(n,ua),i={};for(let l=n.uint();l>0;l--){const c=Si(n,ri),h=Si(n,Nc);i[`${c}:${h}`]=xs(n,_s,vs,ua)}const s=Wd(n),a=n.byte(),r=n.fixed(10);r>0&&(s.zoom=pr({...s,zoom:r}).zoom);const o=Wa({profile:Uc[a&3],replace:(a&4)!==0,speed:n.fixed(10),turn:n.fixed(1)});return{tools:e,hands:t,attachments:i,weapon:s,drone:o}}function SS(n,e){let t=0;for(let s=0;s<gn.length;s++)e.idle?.[gn[s]]&&(t|=1<<s);n.byte(t);for(let s=0;s<gn.length;s++)t&1<<s&&Na(n,e.idle[gn[s]],Da,Vd[s]);const i=[];for(let s=0;s<gn.length;s++)for(const[a,r]of Object.entries(e.hold?.[gn[s]]??{}))i.push([s,a,r]);n.uint(i.length);for(const[s,a,r]of i)n.byte(s),fa(n,ri,a),Na(n,r,Da,kd)}function Gd(n,e){const t={},i=n.byte();for(let a=0;a<gn.length;a++)i&1<<a&&(t[gn[a]]=xs(n,Da,Vd[a],e));const s={};for(let a=n.uint();a>0;a--){const r=gn[n.byte()]??"left",o=Si(n,ri);(s[r]??={})[o]=xs(n,Da,kd,e)}return{idle:t,hold:s}}function bS(n,e){n.fixed(e.mass,1e3),n.fixed(e.speed,10),n.fixed(e.rate,10),n.uint(e.magazine),n.fixed(e.reload,100),n.uint(e.burst),n.byte(Math.max(0,Lc.indexOf(e.mode))|Dc.indexOf(e.ammo)<<2);let t=0;for(let i=0;i<La.length;i++)e.sights.includes(La[i])&&(t|=1<<i);n.uint(t),n.fixed(e.zoom,10)}function Wd(n){const e=n.fixed(1e3),t=n.fixed(10),i=n.fixed(10),s=n.uint(),a=n.fixed(100),r=n.uint(),o=n.byte(),l=n.uint();return pr({mass:e,speed:t,rate:i,magazine:s,reload:a,burst:r,mode:Lc[o&3],ammo:Dc[o>>2&1],sights:La.filter((c,h)=>l&1<<h)})}function ES(n){const e=Wd(n),t=n.fixed(10);return t>0?pr({...e,zoom:t}):e}function TS(n,e){n.byte(Math.max(0,Uc.indexOf(e.profile))|(e.replace?4:0)),n.fixed(e.speed,10),n.fixed(e.turn,1)}function AS(n){const e=n.byte();return Wa({profile:Uc[e&3],replace:(e&4)!==0,speed:n.fixed(10),turn:n.fixed(1)})}function wS(n,e){n.fixed(e.forward,10),n.fixed(e.back,10),n.fixed(e.up,10),n.fixed(e.down,10),n.fixed(e.side,10),n.fixed(e.turn,1),n.fixed(e.deadzone,10),n.byte(Math.max(0,Mn.indexOf(e.drive))|Math.max(0,Mn.indexOf(e.lift))<<2|Math.max(0,Mn.indexOf(e.yaw))<<4|(e.strafe?64:0))}function RS(n){const e=n.fixed(10),t=n.fixed(10),i=n.fixed(10),s=n.fixed(10),a=n.fixed(10),r=n.fixed(1),o=n.fixed(10),l=n.byte();return Ic({forward:e,back:t,up:i,down:s,side:a,turn:r,deadzone:o,drive:Mn[l&3],lift:Mn[l>>2&3],yaw:Mn[l>>4&3],strafe:(l&64)!==0})}function fa(n,e,t){const i=e.indexOf(t);i<0?n.uint(0).text(t):n.uint(i+1)}function Si(n,e){const t=n.uint();return t===0?n.text():e[t-1]??`unbekannt-${t}`}function Na(n,e,t,i){let s=0;for(let a=0;a<t.length;a++){const r=e[a]??i[a]??0;PS(r,i[a]??0,t[a])||(s|=1<<a)}n.uint(s);for(let a=0;a<t.length;a++)s&1<<a&&n.fixed(e[a]??0,t[a])}function xs(n,e,t,i){if(i<or)return e.map(a=>n.fixed(a));const s=n.uint();return e.map((a,r)=>s&1<<r?n.fixed(a):t[r]??0)}function PS(n,e,t){const i=Number.isFinite(n)?Math.round(n*t):0,s=Number.isFinite(e)?Math.round(e*t):0;return i===s}const da=["time","step","load"],FE={time:"Zeit",step:"Einzelbild",load:"Schnellladen"},OE={time:"Trigger schaltet den Zeitfaktor an und aus",step:"Zeit steht · Trigger rechnet Bilder weiter",load:"Trigger holt die gespeicherte Aufstellung zurück"},Ua={action:"time",factor:.22,frames:1},$u=[0,.05,.22,.5,2,4],Ku=[1,2,5,10,30,60],CS=0,IS=4,LS=1,DS=240;function NS(n){const e=typeof n=="number"?n:Number(n);return Number.isFinite(e)?Math.round(Math.min(IS,Math.max(CS,e))*100)/100:Ua.factor}function US(n){const e=typeof n=="number"?n:Number(n);return Number.isFinite(e)?Math.round(Math.min(DS,Math.max(LS,e))):Ua.frames}function Xd(n){const e={...Ua,...n};return{action:da.includes(e.action)?e.action:Ua.action,factor:NS(e.factor),frames:US(e.frames)}}function BE(n){const e=da.indexOf(n);return da[(e+1)%da.length]}function zE(n){return $u.find(e=>e>n+1e-9)??$u[0]}function kE(n){return Ku.find(e=>e>n+1e-9)??Ku[0]}function VE(n){if(n<=0)return"angehalten";if(Math.abs(n-1)<1e-9)return"normal";const e=`${n}×`;return n<1?`${e} Zeitlupe`:`${e} Zeitraffer`}function HE(n){return n===1?"1 Bild":`${n} Bilder`}const Ms="bgvr.attachPoses",qd="bgvr.weapon",Fc="bgvr.drone",Oc="bgvr.superman",Yd="bgvr.stopwatch",FS=new Set;function Ii(n,e){try{const t=globalThis.localStorage?.getItem(n);return t?JSON.parse(t):e}catch{return e}}function Wn(n,e){try{globalThis.localStorage?.setItem(n,JSON.stringify(e))}catch{}for(const t of FS)t()}function $d(n,e){return`${n}:${e}`}function GE(n,e){const t=Ii(Ms,{})[$d(n,e)];return t?Ed(t):null}function WE(n,e,t){const i=Ii(Ms,{});i[$d(n,e)]=bd(t),Wn(Ms,i)}function Kd(){return{...Ii(Ms,{})}}function OS(n){Wn(Ms,n)}function BS(){Wn(Ms,{})}function zS(){return pr(Ii(qd,{}))}function kS(n){Wn(qd,pr(n))}function Jd(){return Wa(Ii(Fc,{}))}function VS(n){const e=Wa({...Jd(),...n});return Wn(Fc,e),e}function HS(){Wn(Fc,{...Ca})}function Zd(){return Ic(Ii(Oc,{}))}function GS(n){const e=Ic({...Zd(),...n});return Wn(Oc,e),e}function WS(){Wn(Oc,{...Ia})}function XS(){return Xd(Ii(Yd,{}))}function XE(n){const e=Xd({...XS(),...n});return Wn(Yd,e),e}const Bc="bgvr.holdPoses";function Li(){try{const n=globalThis.localStorage?.getItem(Bc);return n?JSON.parse(n):{}}catch{return{}}}function zc(n){try{globalThis.localStorage?.setItem(Bc,JSON.stringify(n))}catch{}}function qE(n,e,t){const i=Li();i[n]={...e,hand:t??i[n]?.hand},zc(i)}function YE(n){return Li()[n]?.hand??null}function $E(n){const e=Li()[n.toolId];qS(e)&&(n.holdPosition.set(e.position.x,e.position.y,e.position.z),n.holdRotation.set(e.rotation.x,e.rotation.y,e.rotation.z,e.rotation.w))}function qS(n){const e=s=>Number.isFinite(s),t=n?.position,i=n?.rotation;return!!t&&!!i&&e(t.x)&&e(t.y)&&e(t.z)&&e(i.x)&&e(i.y)&&e(i.z)&&e(i.w)}function KE(n){const e=Li();return n in e?(delete e[n],zc(e),!0):!1}function YS(){try{globalThis.localStorage?.removeItem(Bc)}catch{}}function JE(){return Object.keys(Li()).length}function Qd(){const n={};for(const[e,t]of Object.entries(Li()))n[e]=bd(Vy(t));return n}function $S(n,e={}){const t={};for(const[i,s]of Object.entries(n))t[i]={...Hy(Ed(s)),hand:e[i]};zc(t)}function jd(){const n={};for(const[e,t]of Object.entries(Li()))t.hand&&(n[e]=t.hand);return n}const KS={pistol:"weapon",drone:"drone","superman-glove":"superman"};function kc(){return{tools:Qd(),toolHands:jd(),hands:fd(),attachments:Kd(),weapon:zS(),drone:Jd(),superman:Zd()}}function JS(n,e=null){const t=kc(),i={},s=e?[e]:["left","right"];if(!n){const c={};for(const h of s){const f=t.hands?.idle?.[h];f&&(c[h]=f)}return i.hands={idle:c,hold:{}},i}const a=t.tools?.[n];if(a){i.tools={[n]:a};const c=t.toolHands?.[n];c&&(i.toolHands={[n]:c})}const r={};for(const c of s){const h=t.hands?.hold?.[c]?.[n];h&&(r[c]={[n]:h})}Object.keys(r).length>0&&(i.hands={idle:{},hold:r});const o={};for(const[c,h]of Object.entries(t.attachments??{}))c.startsWith(`${n}:`)&&(o[c]=h);Object.keys(o).length>0&&(i.attachments=o);const l=KS[n];return l==="weapon"&&(i.weapon=t.weapon),l==="drone"&&(i.drone=t.drone),l==="superman"&&(i.superman=t.superman),i}function ZE(){return Md(Hd(kc()),or)}function QE(n,e=null){if(!e)return Md(Hd(JS(n,null)),or);const t=kc(),i=n??"",s=i?t.hands?.hold?.[e]?.[i]:t.hands?.idle?.[e],a=s?Ea(s,Kl(e,i)):null,r=Kl(e,i);return Gy({toolId:i,hand:e,pose:i&&i!==ep?t.tools?.[i]??null:null,grip:a?[a.x,a.y,a.z,a.pitch,a.yaw,a.roll]:null,fingers:a&&!ZS(a,r)?{curls:a.curls,spread:a.spread}:null})}const ep="grab";function Kl(n,e){return e?cd(n,e):Tc(n)}function ZS(n,e){return Math.round(n.spread)!==Math.round(e.spread)?!1:[0,1,2,3,4].every(t=>Math.round((n.curls[t]??0)*100)===Math.round((e.curls[t]??0)*100))}function QS(n){const e={},t=n.toolId;if(n.pose&&t&&t!==ep&&(e.tools={[t]:[...n.pose]},e.toolHands={[t]:n.hand}),n.grip){const s={...Kl(n.hand,t),x:n.grip[0]??0,y:n.grip[1]??0,z:n.grip[2]??0,pitch:n.grip[3]??0,yaw:n.grip[4]??0,roll:n.grip[5]??0};n.fingers&&(s.curls=[...n.fingers.curls],s.spread=n.fingers.spread);const a=fr(s);e.hands=t?{idle:{},hold:{[n.hand]:{[t]:a}}}:{idle:{[n.hand]:a},hold:{}}}return e}function jE(n){const e=Wy(n);if(e)return QS(e);const t=Ly(n);return t?MS(t.payload,t.version):null}function eT(n){const e=[];return n.tools&&($S({...Qd(),...n.tools},{...jd(),...n.toolHands}),e.push(`${Object.keys(n.tools).length} Werkzeug-Posen`)),n.hands&&(cy(eb(fd(),n.hands)),e.push(`${jS(n.hands)} Hand-Posen`)),n.attachments&&(OS({...Kd(),...n.attachments}),e.push(`${Object.keys(n.attachments).length} Anbauteile`)),n.weapon&&(kS(n.weapon),e.push("Pistole")),n.drone&&(VS(n.drone),e.push("Drohne")),n.superman&&(GS(n.superman),e.push("Supermanhandschuh")),e.length>0?e.join(" · "):"nichts"}function jS(n){return Object.keys(n.idle??{}).length+Object.values(n.hold??{}).reduce((e,t)=>e+Object.keys(t??{}).length,0)}function eb(n,e){const t={idle:{...n.idle,...e.idle},hold:{...n.hold}};for(const i of["left","right"]){const s=e.hold?.[i];s&&(t.hold[i]={...n.hold?.[i],...s})}return t}function tT(){YS(),hy(),BS(),HS(),WS()}export{He as $,ef as A,gt as B,Sf as C,rE as D,kn as E,Tb as F,Mi as G,$b as H,ay as I,oE as J,Vy as K,Mf as L,Ul as M,Yb as N,qb as O,Gt as P,Ci as Q,yb as R,Ai as S,Ef as T,Hf as U,C as V,Eb as W,Ln as X,mc as Y,Ba as Z,fn as _,Ye as a,PE as a$,Fu as a0,kb as a1,zb as a2,KE as a3,Vb as a4,JE as a5,hy as a6,YS as a7,Xb as a8,Gb as a9,YM as aA,Ri as aB,En as aC,cd as aD,Ib as aE,Fb as aF,cE as aG,uE as aH,hE as aI,Td as aJ,vb as aK,Af as aL,lb as aM,Om as aN,ab as aO,mf as aP,pc as aQ,sE as aR,V0 as aS,xn as aT,Bn as aU,Ut as aV,lt as aW,Cb as aX,gS as aY,mS as aZ,Dc as a_,gd as aa,Hb as ab,QE as ac,ZE as ad,Hy as ae,Hl as af,Bb as ag,Ob as ah,qE as ai,ld as aj,gf as ak,Jb as al,bb as am,Xf as an,bs as ao,ys as ap,gb as aq,Sn as ar,rn as as,vS as at,Kb as au,ct as av,Tf as aw,nE as ax,jt as ay,Ab as az,ne as b,si as b$,fS as b0,dS as b1,WS as b2,Db as b3,Nb as b4,hd as b5,Tc as b6,fd as b7,Ea as b8,tT as b9,db as bA,Mb as bB,Tm as bC,vi as bD,_r as bE,Ka as bF,Lp as bG,Ct as bH,el as bI,tl as bJ,Dn as bK,oi as bL,ot as bM,Cm as bN,ob as bO,Sc as bP,fc as bQ,ub as bR,hc as bS,ga as bT,Ll as bU,Ma as bV,It as bW,$f as bX,xc as bY,Mc as bZ,je as b_,$E as ba,YE as bb,iE as bc,We as bd,Zd as be,GS as bf,yE as bg,Ub as bh,xE as bi,vE as bj,ME as bk,Pb as bl,Rb as bm,Fm as bn,lE as bo,wb as bp,tb as bq,ib as br,nb as bs,hr as bt,xb as bu,fb as bv,hb as bw,_a as bx,mb as by,Ch as bz,lr as c,cr as c0,Gn as c1,Zc as c2,nS as c3,Jd as c4,lS as c5,mE as c6,hS as c7,_E as c8,VS as c9,SE as cA,bE as cB,EE as cC,TE as cD,AE as cE,UE as cF,Lc as cG,wE as cH,CE as cI,IE as cJ,eE as cK,Qb as cL,jb as cM,HE as cN,XS as cO,OE as cP,FE as cQ,VE as cR,XE as cS,kE as cT,zE as cU,BE as cV,tE as cW,Gf as cX,zt as cY,fE as ca,gE as cb,iS as cc,tS as cd,pE as ce,dE as cf,aS as cg,cb as ch,Be as ci,ly as cj,Wb as ck,zf as cl,Vf as cm,Wf as cn,kf as co,Df as cp,Bf as cq,GE as cr,WE as cs,zS as ct,RE as cu,LE as cv,DE as cw,pr as cx,kS as cy,NE as cz,xf as d,yt as e,Oa as f,ai as g,rb as h,Bt as i,wm as j,sb as k,aE as l,eT as m,Py as n,rr as o,jE as p,wa as q,Sd as r,Zb as s,pb as t,_b as u,Lb as v,pi as w,Sb as x,Ru as y,oy as z};
//# sourceMappingURL=gearConfig-DrFR1ck6.js.map
