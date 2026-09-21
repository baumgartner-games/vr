const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/chefModel-vnLSN61l.js","assets/GLTFLoader-Brzcyifv.js","assets/assetVersion-4uQ4_Pqs.js","assets/Audio-Bi3ydDWK.js"])))=>i.map(i=>d[i]);
import{P as Cu,g as $s,Q as Iu,R as Lu,T as Nu,o as U0,_ as F0}from"./Audio-Bi3ydDWK.js";const yh="185",O0=0,hc=1,op=2,eo=1,B0=2,xr=3,yi=0,Xt=1,Pn=2,$n=0,ws=1,Du=2,Uu=3,Fu=4,k0=5,Ni=100,z0=101,H0=102,V0=103,G0=104,W0=200,X0=201,q0=202,Y0=203,uc=204,dc=205,$0=206,K0=207,J0=208,Z0=209,Q0=210,j0=211,eg=212,tg=213,ng=214,fc=0,pc=1,mc=2,Ns=3,gc=4,_c=5,vc=6,xc=7,lp=0,ig=1,sg=2,In=0,cp=1,hp=2,up=3,dp=4,fp=5,pp=6,mp=7,Ou="attached",rg="detached",gp=300,zi=301,Ds=302,el=303,tl=304,Ho=306,Hi=1e3,Xn=1001,Mc=1002,Ft=1003,ag=1004,la=1005,Ct=1006,nl=1007,xi=1008,jt=1009,_p=1010,vp=1011,Dr=1012,Sh=1013,Dn=1014,an=1015,Un=1016,bh=1017,Th=1018,Ur=1020,xp=35902,Mp=35899,yp=1021,Sp=1022,on=1023,Jn=1026,Fi=1027,Eh=1028,wh=1029,Vi=1030,Ah=1031,Rh=1033,to=33776,no=33777,io=33778,so=33779,yc=35840,Sc=35841,bc=35842,Tc=35843,Ec=36196,wc=37492,Ac=37496,Rc=37488,Pc=37489,vo=37490,Cc=37491,Ic=37808,Lc=37809,Nc=37810,Dc=37811,Uc=37812,Fc=37813,Oc=37814,Bc=37815,kc=37816,zc=37817,Hc=37818,Vc=37819,Gc=37820,Wc=37821,Xc=36492,qc=36494,Yc=36495,$c=36283,Kc=36284,xo=36285,Jc=36286,Mo=2300,Zc=2301,il=2302,Bu=2303,ku=2400,zu=2401,Hu=2402,og=2500,$w=0,Kw=1,Jw=2,lg=3200,Qc=0,cg=1,vi="",zt="srgb",yo="srgb-linear",So="linear",ct="srgb",Ji=7680,Vu=519,hg=512,ug=513,dg=514,Ph=515,fg=516,pg=517,Ch=518,mg=519,jc=35044,Zw=35048,Gu="300 es",Cn=2e3,Fr=2001;function gg(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function _g(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}function Or(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function vg(){const n=Or("canvas");return n.style.display="block",n}const Wu={};function bo(...n){const e="THREE."+n.shift();console.log(e,...n)}function bp(n){const e=n[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=n[1];t&&t.isStackTrace?n[0]+=" "+t.getLocation():n[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return n}function Ae(...n){n=bp(n);const e="THREE."+n.shift();{const t=n[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...n)}}function ke(...n){n=bp(n);const e="THREE."+n.shift();{const t=n[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...n)}}function As(...n){const e=n.join(" ");e in Wu||(Wu[e]=!0,Ae(...n))}function xg(n,e,t){return new Promise(function(i,s){function a(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(a,t);break;default:i()}}setTimeout(a,t)})}const Mg={[fc]:pc,[mc]:vc,[gc]:xc,[Ns]:_c,[pc]:fc,[vc]:mc,[xc]:gc,[_c]:Ns};class Xi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const s=i[e];if(s!==void 0){const a=s.indexOf(t);a!==-1&&s.splice(a,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const s=i.slice(0);for(let a=0,r=s.length;a<r;a++)s[a].call(this,e);e.target=null}}}const Bt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Xu=1234567;const Rs=Math.PI/180,Us=180/Math.PI;function ln(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Bt[n&255]+Bt[n>>8&255]+Bt[n>>16&255]+Bt[n>>24&255]+"-"+Bt[e&255]+Bt[e>>8&255]+"-"+Bt[e>>16&15|64]+Bt[e>>24&255]+"-"+Bt[t&63|128]+Bt[t>>8&255]+"-"+Bt[t>>16&255]+Bt[t>>24&255]+Bt[i&255]+Bt[i>>8&255]+Bt[i>>16&255]+Bt[i>>24&255]).toLowerCase()}function Qe(n,e,t){return Math.max(e,Math.min(t,n))}function Ih(n,e){return(n%e+e)%e}function yg(n,e,t,i,s){return i+(n-e)*(s-i)/(t-e)}function Sg(n,e,t){return n!==e?(t-n)/(e-n):0}function Ar(n,e,t){return(1-t)*n+t*e}function bg(n,e,t,i){return Ar(n,e,1-Math.exp(-t*i))}function Tg(n,e=1){return e-Math.abs(Ih(n,e*2)-e)}function Eg(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function wg(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function Ag(n,e){return n+Math.floor(Math.random()*(e-n+1))}function Rg(n,e){return n+Math.random()*(e-n)}function Pg(n){return n*(.5-Math.random())}function Cg(n){n!==void 0&&(Xu=n);let e=Xu+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Ig(n){return n*Rs}function Lg(n){return n*Us}function Ng(n){return(n&n-1)===0&&n!==0}function Dg(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function Ug(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function Fg(n,e,t,i,s){const a=Math.cos,r=Math.sin,o=a(t/2),l=r(t/2),c=a((e+i)/2),h=r((e+i)/2),d=a((e-i)/2),u=r((e-i)/2),f=a((i-e)/2),m=r((i-e)/2);switch(s){case"XYX":n.set(o*h,l*d,l*u,o*c);break;case"YZY":n.set(l*u,o*h,l*d,o*c);break;case"ZXZ":n.set(l*d,l*u,o*h,o*c);break;case"XZX":n.set(o*h,l*m,l*f,o*c);break;case"YXY":n.set(l*f,o*h,l*m,o*c);break;case"ZYZ":n.set(l*m,l*f,o*h,o*c);break;default:Ae("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function gn(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function ht(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const Tp={DEG2RAD:Rs,RAD2DEG:Us,generateUUID:ln,clamp:Qe,euclideanModulo:Ih,mapLinear:yg,inverseLerp:Sg,lerp:Ar,damp:bg,pingpong:Tg,smoothstep:Eg,smootherstep:wg,randInt:Ag,randFloat:Rg,randFloatSpread:Pg,seededRandom:Cg,degToRad:Ig,radToDeg:Lg,isPowerOfTwo:Ng,ceilPowerOfTwo:Dg,floorPowerOfTwo:Ug,setQuaternionFromProperEuler:Fg,normalize:ht,denormalize:gn};class te{static{te.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6],this.y=s[1]*t+s[4]*i+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Qe(this.x,e.x,t.x),this.y=Qe(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Qe(this.x,e,t),this.y=Qe(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Qe(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Qe(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),s=Math.sin(t),a=this.x-e.x,r=this.y-e.y;return this.x=a*i-r*s+e.x,this.y=a*s+r*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class $t{constructor(e=0,t=0,i=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=s}static slerpFlat(e,t,i,s,a,r,o){let l=i[s+0],c=i[s+1],h=i[s+2],d=i[s+3],u=a[r+0],f=a[r+1],m=a[r+2],M=a[r+3];if(d!==M||l!==u||c!==f||h!==m){let p=l*u+c*f+h*m+d*M;p<0&&(u=-u,f=-f,m=-m,M=-M,p=-p);let g=1-o;if(p<.9995){const y=Math.acos(p),S=Math.sin(y);g=Math.sin(g*y)/S,o=Math.sin(o*y)/S,l=l*g+u*o,c=c*g+f*o,h=h*g+m*o,d=d*g+M*o}else{l=l*g+u*o,c=c*g+f*o,h=h*g+m*o,d=d*g+M*o;const y=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=y,c*=y,h*=y,d*=y}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=d}static multiplyQuaternionsFlat(e,t,i,s,a,r){const o=i[s],l=i[s+1],c=i[s+2],h=i[s+3],d=a[r],u=a[r+1],f=a[r+2],m=a[r+3];return e[t]=o*m+h*d+l*f-c*u,e[t+1]=l*m+h*u+c*d-o*f,e[t+2]=c*m+h*f+o*u-l*d,e[t+3]=h*m-o*d-l*u-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,s){return this._x=e,this._y=t,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,s=e._y,a=e._z,r=e._order,o=Math.cos,l=Math.sin,c=o(i/2),h=o(s/2),d=o(a/2),u=l(i/2),f=l(s/2),m=l(a/2);switch(r){case"XYZ":this._x=u*h*d+c*f*m,this._y=c*f*d-u*h*m,this._z=c*h*m+u*f*d,this._w=c*h*d-u*f*m;break;case"YXZ":this._x=u*h*d+c*f*m,this._y=c*f*d-u*h*m,this._z=c*h*m-u*f*d,this._w=c*h*d+u*f*m;break;case"ZXY":this._x=u*h*d-c*f*m,this._y=c*f*d+u*h*m,this._z=c*h*m+u*f*d,this._w=c*h*d-u*f*m;break;case"ZYX":this._x=u*h*d-c*f*m,this._y=c*f*d+u*h*m,this._z=c*h*m-u*f*d,this._w=c*h*d+u*f*m;break;case"YZX":this._x=u*h*d+c*f*m,this._y=c*f*d+u*h*m,this._z=c*h*m-u*f*d,this._w=c*h*d-u*f*m;break;case"XZY":this._x=u*h*d-c*f*m,this._y=c*f*d-u*h*m,this._z=c*h*m+u*f*d,this._w=c*h*d+u*f*m;break;default:Ae("Quaternion: .setFromEuler() encountered an unknown order: "+r)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,s=Math.sin(i);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],s=t[4],a=t[8],r=t[1],o=t[5],l=t[9],c=t[2],h=t[6],d=t[10],u=i+o+d;if(u>0){const f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(a-c)*f,this._z=(r-s)*f}else if(i>o&&i>d){const f=2*Math.sqrt(1+i-o-d);this._w=(h-l)/f,this._x=.25*f,this._y=(s+r)/f,this._z=(a+c)/f}else if(o>d){const f=2*Math.sqrt(1+o-i-d);this._w=(a-c)/f,this._x=(s+r)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+d-i-o);this._w=(r-s)/f,this._x=(a+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Qe(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const s=Math.min(1,t/i);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,s=e._y,a=e._z,r=e._w,o=t._x,l=t._y,c=t._z,h=t._w;return this._x=i*h+r*o+s*c-a*l,this._y=s*h+r*l+a*o-i*c,this._z=a*h+r*c+i*l-s*o,this._w=r*h-i*o-s*l-a*c,this._onChangeCallback(),this}slerp(e,t){let i=e._x,s=e._y,a=e._z,r=e._w,o=this.dot(e);o<0&&(i=-i,s=-s,a=-a,r=-r,o=-o);let l=1-t;if(o<.9995){const c=Math.acos(o),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+i*t,this._y=this._y*l+s*t,this._z=this._z*l+a*t,this._w=this._w*l+r*t,this._onChangeCallback()}else this._x=this._x*l+i*t,this._y=this._y*l+s*t,this._z=this._z*l+a*t,this._w=this._w*l+r*t,this.normalize();return this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),a=Math.sqrt(i);return this.set(s*Math.sin(e),s*Math.cos(e),a*Math.sin(t),a*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class C{static{C.prototype.isVector3=!0}constructor(e=0,t=0,i=0){this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(qu.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(qu.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,s=this.z,a=e.elements;return this.x=a[0]*t+a[3]*i+a[6]*s,this.y=a[1]*t+a[4]*i+a[7]*s,this.z=a[2]*t+a[5]*i+a[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,s=this.z,a=e.elements,r=1/(a[3]*t+a[7]*i+a[11]*s+a[15]);return this.x=(a[0]*t+a[4]*i+a[8]*s+a[12])*r,this.y=(a[1]*t+a[5]*i+a[9]*s+a[13])*r,this.z=(a[2]*t+a[6]*i+a[10]*s+a[14])*r,this}applyQuaternion(e){const t=this.x,i=this.y,s=this.z,a=e.x,r=e.y,o=e.z,l=e.w,c=2*(r*s-o*i),h=2*(o*t-a*s),d=2*(a*i-r*t);return this.x=t+l*c+r*d-o*h,this.y=i+l*h+o*c-a*d,this.z=s+l*d+a*h-r*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,s=this.z,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*s,this.y=a[1]*t+a[5]*i+a[9]*s,this.z=a[2]*t+a[6]*i+a[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Qe(this.x,e.x,t.x),this.y=Qe(this.y,e.y,t.y),this.z=Qe(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Qe(this.x,e,t),this.y=Qe(this.y,e,t),this.z=Qe(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Qe(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,s=e.y,a=e.z,r=t.x,o=t.y,l=t.z;return this.x=s*l-a*o,this.y=a*r-i*l,this.z=i*o-s*r,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return sl.copy(this).projectOnVector(e),this.sub(sl)}reflect(e){return this.sub(sl.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Qe(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,s=this.z-e.z;return t*t+i*i+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const s=Math.sin(t)*e;return this.x=s*Math.sin(i),this.y=Math.cos(t)*e,this.z=s*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const sl=new C,qu=new $t;class $e{static{$e.prototype.isMatrix3=!0}constructor(e,t,i,s,a,r,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,s,a,r,o,l,c)}set(e,t,i,s,a,r,o,l,c){const h=this.elements;return h[0]=e,h[1]=s,h[2]=o,h[3]=t,h[4]=a,h[5]=l,h[6]=i,h[7]=r,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,s=t.elements,a=this.elements,r=i[0],o=i[3],l=i[6],c=i[1],h=i[4],d=i[7],u=i[2],f=i[5],m=i[8],M=s[0],p=s[3],g=s[6],y=s[1],S=s[4],x=s[7],w=s[2],T=s[5],A=s[8];return a[0]=r*M+o*y+l*w,a[3]=r*p+o*S+l*T,a[6]=r*g+o*x+l*A,a[1]=c*M+h*y+d*w,a[4]=c*p+h*S+d*T,a[7]=c*g+h*x+d*A,a[2]=u*M+f*y+m*w,a[5]=u*p+f*S+m*T,a[8]=u*g+f*x+m*A,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],s=e[2],a=e[3],r=e[4],o=e[5],l=e[6],c=e[7],h=e[8];return t*r*h-t*o*c-i*a*h+i*o*l+s*a*c-s*r*l}invert(){const e=this.elements,t=e[0],i=e[1],s=e[2],a=e[3],r=e[4],o=e[5],l=e[6],c=e[7],h=e[8],d=h*r-o*c,u=o*l-h*a,f=c*a-r*l,m=t*d+i*u+s*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);const M=1/m;return e[0]=d*M,e[1]=(s*c-h*i)*M,e[2]=(o*i-s*r)*M,e[3]=u*M,e[4]=(h*t-s*l)*M,e[5]=(s*a-o*t)*M,e[6]=f*M,e[7]=(i*l-c*t)*M,e[8]=(r*t-i*a)*M,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,s,a,r,o){const l=Math.cos(a),c=Math.sin(a);return this.set(i*l,i*c,-i*(l*r+c*o)+r+e,-s*c,s*l,-s*(-c*r+l*o)+o+t,0,0,1),this}scale(e,t){return As("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(rl.makeScale(e,t)),this}rotate(e){return As("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(rl.makeRotation(-e)),this}translate(e,t){return As("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(rl.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let s=0;s<9;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const rl=new $e,Yu=new $e().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),$u=new $e().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Og(){const n={enabled:!0,workingColorSpace:yo,spaces:{},convert:function(s,a,r){return this.enabled===!1||a===r||!a||!r||(this.spaces[a].transfer===ct&&(s.r=Kn(s.r),s.g=Kn(s.g),s.b=Kn(s.b)),this.spaces[a].primaries!==this.spaces[r].primaries&&(s.applyMatrix3(this.spaces[a].toXYZ),s.applyMatrix3(this.spaces[r].fromXYZ)),this.spaces[r].transfer===ct&&(s.r=Ps(s.r),s.g=Ps(s.g),s.b=Ps(s.b))),s},workingToColorSpace:function(s,a){return this.convert(s,this.workingColorSpace,a)},colorSpaceToWorking:function(s,a){return this.convert(s,a,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===vi?So:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,a=this.workingColorSpace){return s.fromArray(this.spaces[a].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,a,r){return s.copy(this.spaces[a].toXYZ).multiply(this.spaces[r].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,a){return As("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(s,a)},toWorkingColorSpace:function(s,a){return As("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(s,a)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[yo]:{primaries:e,whitePoint:i,transfer:So,toXYZ:Yu,fromXYZ:$u,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:zt},outputColorSpaceConfig:{drawingBufferColorSpace:zt}},[zt]:{primaries:e,whitePoint:i,transfer:ct,toXYZ:Yu,fromXYZ:$u,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:zt}}}),n}const it=Og();function Kn(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Ps(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Zi;class Bg{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{Zi===void 0&&(Zi=Or("canvas")),Zi.width=e.width,Zi.height=e.height;const s=Zi.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),i=Zi}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Or("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const s=i.getImageData(0,0,e.width,e.height),a=s.data;for(let r=0;r<a.length;r++)a[r]=Kn(a[r]/255)*255;return i.putImageData(s,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(Kn(t[i]/255)*255):t[i]=Kn(t[i]);return{data:t,width:e.width,height:e.height}}else return Ae("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let kg=0;class Lh{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:kg++}),this.uuid=ln(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let a;if(Array.isArray(s)){a=[];for(let r=0,o=s.length;r<o;r++)s[r].isDataTexture?a.push(al(s[r].image)):a.push(al(s[r]))}else a=al(s);i.url=a}return t||(e.images[this.uuid]=i),i}}function al(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Bg.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(Ae("Texture: Unable to serialize Texture."),{})}let zg=0;const ol=new C;class Ut extends Xi{constructor(e=Ut.DEFAULT_IMAGE,t=Ut.DEFAULT_MAPPING,i=Xn,s=Xn,a=Ct,r=xi,o=on,l=jt,c=Ut.DEFAULT_ANISOTROPY,h=vi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:zg++}),this.uuid=ln(),this.name="",this.source=new Lh(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=a,this.minFilter=r,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new te(0,0),this.repeat=new te(1,1),this.center=new te(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new $e,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(ol).x}get height(){return this.source.getSize(ol).y}get depth(){return this.source.getSize(ol).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const i=e[t];if(i===void 0){Ae(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){Ae(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&i&&s.isVector2&&i.isVector2||s&&i&&s.isVector3&&i.isVector3||s&&i&&s.isMatrix3&&i.isMatrix3?s.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==gp)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Hi:e.x=e.x-Math.floor(e.x);break;case Xn:e.x=e.x<0?0:1;break;case Mc:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Hi:e.y=e.y-Math.floor(e.y);break;case Xn:e.y=e.y<0?0:1;break;case Mc:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Ut.DEFAULT_IMAGE=null;Ut.DEFAULT_MAPPING=gp;Ut.DEFAULT_ANISOTROPY=1;class at{static{at.prototype.isVector4=!0}constructor(e=0,t=0,i=0,s=1){this.x=e,this.y=t,this.z=i,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,s){return this.x=e,this.y=t,this.z=i,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,s=this.z,a=this.w,r=e.elements;return this.x=r[0]*t+r[4]*i+r[8]*s+r[12]*a,this.y=r[1]*t+r[5]*i+r[9]*s+r[13]*a,this.z=r[2]*t+r[6]*i+r[10]*s+r[14]*a,this.w=r[3]*t+r[7]*i+r[11]*s+r[15]*a,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,s,a;const l=e.elements,c=l[0],h=l[4],d=l[8],u=l[1],f=l[5],m=l[9],M=l[2],p=l[6],g=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-M)<.01&&Math.abs(m-p)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+M)<.1&&Math.abs(m+p)<.1&&Math.abs(c+f+g-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const S=(c+1)/2,x=(f+1)/2,w=(g+1)/2,T=(h+u)/4,A=(d+M)/4,_=(m+p)/4;return S>x&&S>w?S<.01?(i=0,s=.707106781,a=.707106781):(i=Math.sqrt(S),s=T/i,a=A/i):x>w?x<.01?(i=.707106781,s=0,a=.707106781):(s=Math.sqrt(x),i=T/s,a=_/s):w<.01?(i=.707106781,s=.707106781,a=0):(a=Math.sqrt(w),i=A/a,s=_/a),this.set(i,s,a,t),this}let y=Math.sqrt((p-m)*(p-m)+(d-M)*(d-M)+(u-h)*(u-h));return Math.abs(y)<.001&&(y=1),this.x=(p-m)/y,this.y=(d-M)/y,this.z=(u-h)/y,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Qe(this.x,e.x,t.x),this.y=Qe(this.y,e.y,t.y),this.z=Qe(this.z,e.z,t.z),this.w=Qe(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Qe(this.x,e,t),this.y=Qe(this.y,e,t),this.z=Qe(this.z,e,t),this.w=Qe(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Qe(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Hg extends Xi{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ct,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new at(0,0,e,t),this.scissorTest=!1,this.viewport=new at(0,0,e,t),this.textures=[];const s={width:e,height:t,depth:i.depth},a=new Ut(s),r=i.count;for(let o=0;o<r;o++)this.textures[o]=a.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview,this.useArrayDepthTexture=i.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:Ct,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let s=0,a=this.textures.length;s<a;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=i,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const s=Object.assign({},e.textures[t].image);this.textures[t].source=new Lh(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class _n extends Hg{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class Ep extends Ut{constructor(e=null,t=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=Ft,this.minFilter=Ft,this.wrapR=Xn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Vg extends Ut{constructor(e=null,t=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=Ft,this.minFilter=Ft,this.wrapR=Xn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class qe{static{qe.prototype.isMatrix4=!0}constructor(e,t,i,s,a,r,o,l,c,h,d,u,f,m,M,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,s,a,r,o,l,c,h,d,u,f,m,M,p)}set(e,t,i,s,a,r,o,l,c,h,d,u,f,m,M,p){const g=this.elements;return g[0]=e,g[4]=t,g[8]=i,g[12]=s,g[1]=a,g[5]=r,g[9]=o,g[13]=l,g[2]=c,g[6]=h,g[10]=d,g[14]=u,g[3]=f,g[7]=m,g[11]=M,g[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new qe().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),i.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,i=e.elements,s=1/Qi.setFromMatrixColumn(e,0).length(),a=1/Qi.setFromMatrixColumn(e,1).length(),r=1/Qi.setFromMatrixColumn(e,2).length();return t[0]=i[0]*s,t[1]=i[1]*s,t[2]=i[2]*s,t[3]=0,t[4]=i[4]*a,t[5]=i[5]*a,t[6]=i[6]*a,t[7]=0,t[8]=i[8]*r,t[9]=i[9]*r,t[10]=i[10]*r,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,s=e.y,a=e.z,r=Math.cos(i),o=Math.sin(i),l=Math.cos(s),c=Math.sin(s),h=Math.cos(a),d=Math.sin(a);if(e.order==="XYZ"){const u=r*h,f=r*d,m=o*h,M=o*d;t[0]=l*h,t[4]=-l*d,t[8]=c,t[1]=f+m*c,t[5]=u-M*c,t[9]=-o*l,t[2]=M-u*c,t[6]=m+f*c,t[10]=r*l}else if(e.order==="YXZ"){const u=l*h,f=l*d,m=c*h,M=c*d;t[0]=u+M*o,t[4]=m*o-f,t[8]=r*c,t[1]=r*d,t[5]=r*h,t[9]=-o,t[2]=f*o-m,t[6]=M+u*o,t[10]=r*l}else if(e.order==="ZXY"){const u=l*h,f=l*d,m=c*h,M=c*d;t[0]=u-M*o,t[4]=-r*d,t[8]=m+f*o,t[1]=f+m*o,t[5]=r*h,t[9]=M-u*o,t[2]=-r*c,t[6]=o,t[10]=r*l}else if(e.order==="ZYX"){const u=r*h,f=r*d,m=o*h,M=o*d;t[0]=l*h,t[4]=m*c-f,t[8]=u*c+M,t[1]=l*d,t[5]=M*c+u,t[9]=f*c-m,t[2]=-c,t[6]=o*l,t[10]=r*l}else if(e.order==="YZX"){const u=r*l,f=r*c,m=o*l,M=o*c;t[0]=l*h,t[4]=M-u*d,t[8]=m*d+f,t[1]=d,t[5]=r*h,t[9]=-o*h,t[2]=-c*h,t[6]=f*d+m,t[10]=u-M*d}else if(e.order==="XZY"){const u=r*l,f=r*c,m=o*l,M=o*c;t[0]=l*h,t[4]=-d,t[8]=c*h,t[1]=u*d+M,t[5]=r*h,t[9]=f*d-m,t[2]=m*d-f,t[6]=o*h,t[10]=M*d+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Gg,e,Wg)}lookAt(e,t,i){const s=this.elements;return Jt.subVectors(e,t),Jt.lengthSq()===0&&(Jt.z=1),Jt.normalize(),oi.crossVectors(i,Jt),oi.lengthSq()===0&&(Math.abs(i.z)===1?Jt.x+=1e-4:Jt.z+=1e-4,Jt.normalize(),oi.crossVectors(i,Jt)),oi.normalize(),ca.crossVectors(Jt,oi),s[0]=oi.x,s[4]=ca.x,s[8]=Jt.x,s[1]=oi.y,s[5]=ca.y,s[9]=Jt.y,s[2]=oi.z,s[6]=ca.z,s[10]=Jt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,s=t.elements,a=this.elements,r=i[0],o=i[4],l=i[8],c=i[12],h=i[1],d=i[5],u=i[9],f=i[13],m=i[2],M=i[6],p=i[10],g=i[14],y=i[3],S=i[7],x=i[11],w=i[15],T=s[0],A=s[4],_=s[8],E=s[12],P=s[1],I=s[5],N=s[9],G=s[13],X=s[2],O=s[6],W=s[10],H=s[14],Q=s[3],$=s[7],se=s[11],re=s[15];return a[0]=r*T+o*P+l*X+c*Q,a[4]=r*A+o*I+l*O+c*$,a[8]=r*_+o*N+l*W+c*se,a[12]=r*E+o*G+l*H+c*re,a[1]=h*T+d*P+u*X+f*Q,a[5]=h*A+d*I+u*O+f*$,a[9]=h*_+d*N+u*W+f*se,a[13]=h*E+d*G+u*H+f*re,a[2]=m*T+M*P+p*X+g*Q,a[6]=m*A+M*I+p*O+g*$,a[10]=m*_+M*N+p*W+g*se,a[14]=m*E+M*G+p*H+g*re,a[3]=y*T+S*P+x*X+w*Q,a[7]=y*A+S*I+x*O+w*$,a[11]=y*_+S*N+x*W+w*se,a[15]=y*E+S*G+x*H+w*re,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],s=e[8],a=e[12],r=e[1],o=e[5],l=e[9],c=e[13],h=e[2],d=e[6],u=e[10],f=e[14],m=e[3],M=e[7],p=e[11],g=e[15],y=l*f-c*u,S=o*f-c*d,x=o*u-l*d,w=r*f-c*h,T=r*u-l*h,A=r*d-o*h;return t*(M*y-p*S+g*x)-i*(m*y-p*w+g*T)+s*(m*S-M*w+g*A)-a*(m*x-M*T+p*A)}determinantAffine(){const e=this.elements,t=e[0],i=e[4],s=e[8],a=e[1],r=e[5],o=e[9],l=e[2],c=e[6],h=e[10];return t*(r*h-o*c)-i*(a*h-o*l)+s*(a*c-r*l)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],s=e[2],a=e[3],r=e[4],o=e[5],l=e[6],c=e[7],h=e[8],d=e[9],u=e[10],f=e[11],m=e[12],M=e[13],p=e[14],g=e[15],y=t*o-i*r,S=t*l-s*r,x=t*c-a*r,w=i*l-s*o,T=i*c-a*o,A=s*c-a*l,_=h*M-d*m,E=h*p-u*m,P=h*g-f*m,I=d*p-u*M,N=d*g-f*M,G=u*g-f*p,X=y*G-S*N+x*I+w*P-T*E+A*_;if(X===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const O=1/X;return e[0]=(o*G-l*N+c*I)*O,e[1]=(s*N-i*G-a*I)*O,e[2]=(M*A-p*T+g*w)*O,e[3]=(u*T-d*A-f*w)*O,e[4]=(l*P-r*G-c*E)*O,e[5]=(t*G-s*P+a*E)*O,e[6]=(p*x-m*A-g*S)*O,e[7]=(h*A-u*x+f*S)*O,e[8]=(r*N-o*P+c*_)*O,e[9]=(i*P-t*N-a*_)*O,e[10]=(m*T-M*x+g*y)*O,e[11]=(d*x-h*T-f*y)*O,e[12]=(o*E-r*I-l*_)*O,e[13]=(t*I-i*E+s*_)*O,e[14]=(M*S-m*w-p*y)*O,e[15]=(h*w-d*S+u*y)*O,this}scale(e){const t=this.elements,i=e.x,s=e.y,a=e.z;return t[0]*=i,t[4]*=s,t[8]*=a,t[1]*=i,t[5]*=s,t[9]*=a,t[2]*=i,t[6]*=s,t[10]*=a,t[3]*=i,t[7]*=s,t[11]*=a,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,s))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),s=Math.sin(t),a=1-i,r=e.x,o=e.y,l=e.z,c=a*r,h=a*o;return this.set(c*r+i,c*o-s*l,c*l+s*o,0,c*o+s*l,h*o+i,h*l-s*r,0,c*l-s*o,h*l+s*r,a*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,s,a,r){return this.set(1,i,a,0,e,1,r,0,t,s,1,0,0,0,0,1),this}compose(e,t,i){const s=this.elements,a=t._x,r=t._y,o=t._z,l=t._w,c=a+a,h=r+r,d=o+o,u=a*c,f=a*h,m=a*d,M=r*h,p=r*d,g=o*d,y=l*c,S=l*h,x=l*d,w=i.x,T=i.y,A=i.z;return s[0]=(1-(M+g))*w,s[1]=(f+x)*w,s[2]=(m-S)*w,s[3]=0,s[4]=(f-x)*T,s[5]=(1-(u+g))*T,s[6]=(p+y)*T,s[7]=0,s[8]=(m+S)*A,s[9]=(p-y)*A,s[10]=(1-(u+M))*A,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,i){const s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];const a=this.determinantAffine();if(a===0)return i.set(1,1,1),t.identity(),this;let r=Qi.set(s[0],s[1],s[2]).length();const o=Qi.set(s[4],s[5],s[6]).length(),l=Qi.set(s[8],s[9],s[10]).length();a<0&&(r=-r),un.copy(this);const c=1/r,h=1/o,d=1/l;return un.elements[0]*=c,un.elements[1]*=c,un.elements[2]*=c,un.elements[4]*=h,un.elements[5]*=h,un.elements[6]*=h,un.elements[8]*=d,un.elements[9]*=d,un.elements[10]*=d,t.setFromRotationMatrix(un),i.x=r,i.y=o,i.z=l,this}makePerspective(e,t,i,s,a,r,o=Cn,l=!1){const c=this.elements,h=2*a/(t-e),d=2*a/(i-s),u=(t+e)/(t-e),f=(i+s)/(i-s);let m,M;if(l)m=a/(r-a),M=r*a/(r-a);else if(o===Cn)m=-(r+a)/(r-a),M=-2*r*a/(r-a);else if(o===Fr)m=-r/(r-a),M=-r*a/(r-a);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=d,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=M,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,s,a,r,o=Cn,l=!1){const c=this.elements,h=2/(t-e),d=2/(i-s),u=-(t+e)/(t-e),f=-(i+s)/(i-s);let m,M;if(l)m=1/(r-a),M=r/(r-a);else if(o===Cn)m=-2/(r-a),M=-(r+a)/(r-a);else if(o===Fr)m=-1/(r-a),M=-a/(r-a);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=d,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=m,c[14]=M,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let s=0;s<16;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const Qi=new C,un=new qe,Gg=new C(0,0,0),Wg=new C(1,1,1),oi=new C,ca=new C,Jt=new C,Ku=new qe,Ju=new $t;class vn{constructor(e=0,t=0,i=0,s=vn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,s=this._order){return this._x=e,this._y=t,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const s=e.elements,a=s[0],r=s[4],o=s[8],l=s[1],c=s[5],h=s[9],d=s[2],u=s[6],f=s[10];switch(t){case"XYZ":this._y=Math.asin(Qe(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-r,a)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Qe(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,a),this._z=0);break;case"ZXY":this._x=Math.asin(Qe(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-r,c)):(this._y=0,this._z=Math.atan2(l,a));break;case"ZYX":this._y=Math.asin(-Qe(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,a)):(this._x=0,this._z=Math.atan2(-r,c));break;case"YZX":this._z=Math.asin(Qe(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,a)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Qe(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(o,a)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Ae("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return Ku.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Ku,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Ju.setFromEuler(this),this.setFromQuaternion(Ju,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}vn.DEFAULT_ORDER="XYZ";class Nh{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Xg=0;const Zu=new C,ji=new $t,On=new qe,ha=new C,Ks=new C,qg=new C,Yg=new $t,Qu=new C(1,0,0),ju=new C(0,1,0),ed=new C(0,0,1),td={type:"added"},$g={type:"removed"},es={type:"childadded",child:null},ll={type:"childremoved",child:null};class pt extends Xi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Xg++}),this.uuid=ln(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=pt.DEFAULT_UP.clone();const e=new C,t=new vn,i=new $t,s=new C(1,1,1);function a(){i.setFromEuler(t,!1)}function r(){t.setFromQuaternion(i,void 0,!1)}t._onChange(a),i._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new qe},normalMatrix:{value:new $e}}),this.matrix=new qe,this.matrixWorld=new qe,this.matrixAutoUpdate=pt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=pt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Nh,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ji.setFromAxisAngle(e,t),this.quaternion.multiply(ji),this}rotateOnWorldAxis(e,t){return ji.setFromAxisAngle(e,t),this.quaternion.premultiply(ji),this}rotateX(e){return this.rotateOnAxis(Qu,e)}rotateY(e){return this.rotateOnAxis(ju,e)}rotateZ(e){return this.rotateOnAxis(ed,e)}translateOnAxis(e,t){return Zu.copy(e).applyQuaternion(this.quaternion),this.position.add(Zu.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Qu,e)}translateY(e){return this.translateOnAxis(ju,e)}translateZ(e){return this.translateOnAxis(ed,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(On.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?ha.copy(e):ha.set(e,t,i);const s=this.parent;this.updateWorldMatrix(!0,!1),Ks.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?On.lookAt(Ks,ha,this.up):On.lookAt(ha,Ks,this.up),this.quaternion.setFromRotationMatrix(On),s&&(On.extractRotation(s.matrixWorld),ji.setFromRotationMatrix(On),this.quaternion.premultiply(ji.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(ke("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(td),es.child=e,this.dispatchEvent(es),es.child=null):ke("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent($g),ll.child=e,this.dispatchEvent(ll),ll.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),On.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),On.multiply(e.parent.matrixWorld)),e.applyMatrix4(On),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(td),es.child=e,this.dispatchEvent(es),es.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,s=this.children.length;i<s;i++){const r=this.children[i].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const s=this.children;for(let a=0,r=s.length;a<r;a++)s[a].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ks,e,qg),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ks,Yg,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,i=e.y,s=e.z,a=this.matrix.elements;a[12]+=t-a[0]*t-a[4]*i-a[8]*s,a[13]+=i-a[1]*t-a[5]*i-a[9]*s,a[14]+=s-a[2]*t-a[6]*i-a[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t,i=!1){const s=this.parent;if(e===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||i)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,i=!0),t===!0){const a=this.children;for(let r=0,o=a.length;r<o;r++)a[r].updateWorldMatrix(!1,!0,i)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),this.static!==!1&&(s.static=this.static),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function a(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=a(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const d=l[c];a(e.shapes,d)}else a(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(a(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(a(e.materials,this.material[l]));s.material=o}else s.material=a(e.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];s.animations.push(a(e.animations,l))}}if(t){const o=r(e.geometries),l=r(e.materials),c=r(e.textures),h=r(e.images),d=r(e.shapes),u=r(e.skeletons),f=r(e.animations),m=r(e.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),h.length>0&&(i.images=h),d.length>0&&(i.shapes=d),u.length>0&&(i.skeletons=u),f.length>0&&(i.animations=f),m.length>0&&(i.nodes=m)}return i.object=s,i;function r(o){const l=[];for(const c in o){const h=o[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const s=e.children[i];this.add(s.clone())}return this}}pt.DEFAULT_UP=new C(0,1,0);pt.DEFAULT_MATRIX_AUTO_UPDATE=!0;pt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class At extends pt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Kg={type:"move"};class cl{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new At,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new At,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new C,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new C),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new At,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new C,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new C,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let s=null,a=null,r=null;const o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){r=!0;for(const M of e.hand.values()){const p=t.getJointPose(M,i),g=this._getHandJoint(c,M);p!==null&&(g.matrix.fromArray(p.transform.matrix),g.matrix.decompose(g.position,g.rotation,g.scale),g.matrixWorldNeedsUpdate=!0,g.jointRadius=p.radius),g.visible=p!==null}const h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,m=.005;c.inputState.pinching&&u>f+m?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&u<=f-m&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(a=t.getPose(e.gripSpace,i),a!==null&&(l.matrix.fromArray(a.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,a.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(a.linearVelocity)):l.hasLinearVelocity=!1,a.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(a.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(s=t.getPose(e.targetRaySpace,i),s===null&&a!==null&&(s=a),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Kg)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=a!==null),c!==null&&(c.visible=r!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new At;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}const wp={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},li={h:0,s:0,l:0},ua={h:0,s:0,l:0};function hl(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class ze{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=zt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,it.colorSpaceToWorking(this,t),this}setRGB(e,t,i,s=it.workingColorSpace){return this.r=e,this.g=t,this.b=i,it.colorSpaceToWorking(this,s),this}setHSL(e,t,i,s=it.workingColorSpace){if(e=Ih(e,1),t=Qe(t,0,1),i=Qe(i,0,1),t===0)this.r=this.g=this.b=i;else{const a=i<=.5?i*(1+t):i+t-i*t,r=2*i-a;this.r=hl(r,a,e+1/3),this.g=hl(r,a,e),this.b=hl(r,a,e-1/3)}return it.colorSpaceToWorking(this,s),this}setStyle(e,t=zt){function i(a){a!==void 0&&parseFloat(a)<1&&Ae("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let a;const r=s[1],o=s[2];switch(r){case"rgb":case"rgba":if(a=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(a[4]),this.setRGB(Math.min(255,parseInt(a[1],10))/255,Math.min(255,parseInt(a[2],10))/255,Math.min(255,parseInt(a[3],10))/255,t);if(a=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(a[4]),this.setRGB(Math.min(100,parseInt(a[1],10))/100,Math.min(100,parseInt(a[2],10))/100,Math.min(100,parseInt(a[3],10))/100,t);break;case"hsl":case"hsla":if(a=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(a[4]),this.setHSL(parseFloat(a[1])/360,parseFloat(a[2])/100,parseFloat(a[3])/100,t);break;default:Ae("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){const a=s[1],r=a.length;if(r===3)return this.setRGB(parseInt(a.charAt(0),16)/15,parseInt(a.charAt(1),16)/15,parseInt(a.charAt(2),16)/15,t);if(r===6)return this.setHex(parseInt(a,16),t);Ae("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=zt){const i=wp[e.toLowerCase()];return i!==void 0?this.setHex(i,t):Ae("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Kn(e.r),this.g=Kn(e.g),this.b=Kn(e.b),this}copyLinearToSRGB(e){return this.r=Ps(e.r),this.g=Ps(e.g),this.b=Ps(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=zt){return it.workingToColorSpace(kt.copy(this),e),Math.round(Qe(kt.r*255,0,255))*65536+Math.round(Qe(kt.g*255,0,255))*256+Math.round(Qe(kt.b*255,0,255))}getHexString(e=zt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=it.workingColorSpace){it.workingToColorSpace(kt.copy(this),t);const i=kt.r,s=kt.g,a=kt.b,r=Math.max(i,s,a),o=Math.min(i,s,a);let l,c;const h=(o+r)/2;if(o===r)l=0,c=0;else{const d=r-o;switch(c=h<=.5?d/(r+o):d/(2-r-o),r){case i:l=(s-a)/d+(s<a?6:0);break;case s:l=(a-i)/d+2;break;case a:l=(i-s)/d+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=it.workingColorSpace){return it.workingToColorSpace(kt.copy(this),t),e.r=kt.r,e.g=kt.g,e.b=kt.b,e}getStyle(e=zt){it.workingToColorSpace(kt.copy(this),e);const t=kt.r,i=kt.g,s=kt.b;return e!==zt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(e,t,i){return this.getHSL(li),this.setHSL(li.h+e,li.s+t,li.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(li),e.getHSL(ua);const i=Ar(li.h,ua.h,t),s=Ar(li.s,ua.s,t),a=Ar(li.l,ua.l,t);return this.setHSL(i,s,a),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,s=this.b,a=e.elements;return this.r=a[0]*t+a[3]*i+a[6]*s,this.g=a[1]*t+a[4]*i+a[7]*s,this.b=a[2]*t+a[5]*i+a[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const kt=new ze;ze.NAMES=wp;class Ap{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new ze(e),this.density=t}clone(){return new Ap(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class Rp{constructor(e,t=1,i=1e3){this.isFog=!0,this.name="",this.color=new ze(e),this.near=t,this.far=i}clone(){return new Rp(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class Qw extends pt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new vn,this.environmentIntensity=1,this.environmentRotation=new vn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const dn=new C,Bn=new C,ul=new C,kn=new C,ts=new C,ns=new C,nd=new C,dl=new C,fl=new C,pl=new C,ml=new at,gl=new at,_l=new at;class en{constructor(e=new C,t=new C,i=new C){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,s){s.subVectors(i,t),dn.subVectors(e,t),s.cross(dn);const a=s.lengthSq();return a>0?s.multiplyScalar(1/Math.sqrt(a)):s.set(0,0,0)}static getBarycoord(e,t,i,s,a){dn.subVectors(s,t),Bn.subVectors(i,t),ul.subVectors(e,t);const r=dn.dot(dn),o=dn.dot(Bn),l=dn.dot(ul),c=Bn.dot(Bn),h=Bn.dot(ul),d=r*c-o*o;if(d===0)return a.set(0,0,0),null;const u=1/d,f=(c*l-o*h)*u,m=(r*h-o*l)*u;return a.set(1-f-m,m,f)}static containsPoint(e,t,i,s){return this.getBarycoord(e,t,i,s,kn)===null?!1:kn.x>=0&&kn.y>=0&&kn.x+kn.y<=1}static getInterpolation(e,t,i,s,a,r,o,l){return this.getBarycoord(e,t,i,s,kn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(a,kn.x),l.addScaledVector(r,kn.y),l.addScaledVector(o,kn.z),l)}static getInterpolatedAttribute(e,t,i,s,a,r){return ml.setScalar(0),gl.setScalar(0),_l.setScalar(0),ml.fromBufferAttribute(e,t),gl.fromBufferAttribute(e,i),_l.fromBufferAttribute(e,s),r.setScalar(0),r.addScaledVector(ml,a.x),r.addScaledVector(gl,a.y),r.addScaledVector(_l,a.z),r}static isFrontFacing(e,t,i,s){return dn.subVectors(i,t),Bn.subVectors(e,t),dn.cross(Bn).dot(s)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,s){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,i,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return dn.subVectors(this.c,this.b),Bn.subVectors(this.a,this.b),dn.cross(Bn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return en.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return en.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,s,a){return en.getInterpolation(e,this.a,this.b,this.c,t,i,s,a)}containsPoint(e){return en.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return en.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,s=this.b,a=this.c;let r,o;ts.subVectors(s,i),ns.subVectors(a,i),dl.subVectors(e,i);const l=ts.dot(dl),c=ns.dot(dl);if(l<=0&&c<=0)return t.copy(i);fl.subVectors(e,s);const h=ts.dot(fl),d=ns.dot(fl);if(h>=0&&d<=h)return t.copy(s);const u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return r=l/(l-h),t.copy(i).addScaledVector(ts,r);pl.subVectors(e,a);const f=ts.dot(pl),m=ns.dot(pl);if(m>=0&&f<=m)return t.copy(a);const M=f*c-l*m;if(M<=0&&c>=0&&m<=0)return o=c/(c-m),t.copy(i).addScaledVector(ns,o);const p=h*m-f*d;if(p<=0&&d-h>=0&&f-m>=0)return nd.subVectors(a,s),o=(d-h)/(d-h+(f-m)),t.copy(s).addScaledVector(nd,o);const g=1/(p+M+u);return r=M*g,o=u*g,t.copy(i).addScaledVector(ts,r).addScaledVector(ns,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class ti{constructor(e=new C(1/0,1/0,1/0),t=new C(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(fn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(fn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=fn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const a=i.getAttribute("position");if(t===!0&&a!==void 0&&e.isInstancedMesh!==!0)for(let r=0,o=a.count;r<o;r++)e.isMesh===!0?e.getVertexPosition(r,fn):fn.fromBufferAttribute(a,r),fn.applyMatrix4(e.matrixWorld),this.expandByPoint(fn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),da.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),da.copy(i.boundingBox)),da.applyMatrix4(e.matrixWorld),this.union(da)}const s=e.children;for(let a=0,r=s.length;a<r;a++)this.expandByObject(s[a],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,fn),fn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Js),fa.subVectors(this.max,Js),is.subVectors(e.a,Js),ss.subVectors(e.b,Js),rs.subVectors(e.c,Js),ci.subVectors(ss,is),hi.subVectors(rs,ss),wi.subVectors(is,rs);let t=[0,-ci.z,ci.y,0,-hi.z,hi.y,0,-wi.z,wi.y,ci.z,0,-ci.x,hi.z,0,-hi.x,wi.z,0,-wi.x,-ci.y,ci.x,0,-hi.y,hi.x,0,-wi.y,wi.x,0];return!vl(t,is,ss,rs,fa)||(t=[1,0,0,0,1,0,0,0,1],!vl(t,is,ss,rs,fa))?!1:(pa.crossVectors(ci,hi),t=[pa.x,pa.y,pa.z],vl(t,is,ss,rs,fa))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,fn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(fn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(zn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),zn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),zn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),zn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),zn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),zn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),zn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),zn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(zn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const zn=[new C,new C,new C,new C,new C,new C,new C,new C],fn=new C,da=new ti,is=new C,ss=new C,rs=new C,ci=new C,hi=new C,wi=new C,Js=new C,fa=new C,pa=new C,Ai=new C;function vl(n,e,t,i,s){for(let a=0,r=n.length-3;a<=r;a+=3){Ai.fromArray(n,a);const o=s.x*Math.abs(Ai.x)+s.y*Math.abs(Ai.y)+s.z*Math.abs(Ai.z),l=e.dot(Ai),c=t.dot(Ai),h=i.dot(Ai);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}const wt=new C,ma=new te;let Jg=0;class cn extends Xi{constructor(e,t,i=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Jg++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=jc,this.updateRanges=[],this.gpuType=an,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let s=0,a=this.itemSize;s<a;s++)this.array[e+s]=t.array[i+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)ma.fromBufferAttribute(this,t),ma.applyMatrix3(e),this.setXY(t,ma.x,ma.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)wt.fromBufferAttribute(this,t),wt.applyMatrix3(e),this.setXYZ(t,wt.x,wt.y,wt.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)wt.fromBufferAttribute(this,t),wt.applyMatrix4(e),this.setXYZ(t,wt.x,wt.y,wt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)wt.fromBufferAttribute(this,t),wt.applyNormalMatrix(e),this.setXYZ(t,wt.x,wt.y,wt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)wt.fromBufferAttribute(this,t),wt.transformDirection(e),this.setXYZ(t,wt.x,wt.y,wt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=gn(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=ht(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=gn(t,this.array)),t}setX(e,t){return this.normalized&&(t=ht(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=gn(t,this.array)),t}setY(e,t){return this.normalized&&(t=ht(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=gn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=ht(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=gn(t,this.array)),t}setW(e,t){return this.normalized&&(t=ht(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=ht(t,this.array),i=ht(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,s){return e*=this.itemSize,this.normalized&&(t=ht(t,this.array),i=ht(i,this.array),s=ht(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this}setXYZW(e,t,i,s,a){return e*=this.itemSize,this.normalized&&(t=ht(t,this.array),i=ht(i,this.array),s=ht(s,this.array),a=ht(a,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this.array[e+3]=a,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==jc&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class Dh extends cn{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class Pp extends cn{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class Oe extends cn{constructor(e,t,i){super(new Float32Array(e),t,i)}}const Zg=new ti,Zs=new C,xl=new C;class ni{constructor(e=new C,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):Zg.setFromPoints(e).getCenter(i);let s=0;for(let a=0,r=e.length;a<r;a++)s=Math.max(s,i.distanceToSquared(e[a]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Zs.subVectors(e,this.center);const t=Zs.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),s=(i-this.radius)*.5;this.center.addScaledVector(Zs,s/i),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(xl.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Zs.copy(e.center).add(xl)),this.expandByPoint(Zs.copy(e.center).sub(xl))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let Qg=0;const nn=new qe,Ml=new pt,as=new C,Zt=new ti,Qs=new ti,Nt=new C;class mt extends Xi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Qg++}),this.uuid=ln(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(gg(e)?Pp:Dh)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const a=new $e().getNormalMatrix(e);i.applyNormalMatrix(a),i.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return nn.makeRotationFromQuaternion(e),this.applyMatrix4(nn),this}rotateX(e){return nn.makeRotationX(e),this.applyMatrix4(nn),this}rotateY(e){return nn.makeRotationY(e),this.applyMatrix4(nn),this}rotateZ(e){return nn.makeRotationZ(e),this.applyMatrix4(nn),this}translate(e,t,i){return nn.makeTranslation(e,t,i),this.applyMatrix4(nn),this}scale(e,t,i){return nn.makeScale(e,t,i),this.applyMatrix4(nn),this}lookAt(e){return Ml.lookAt(e),Ml.updateMatrix(),this.applyMatrix4(Ml.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(as).negate(),this.translate(as.x,as.y,as.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let s=0,a=e.length;s<a;s++){const r=e[s];i.push(r.x,r.y,r.z||0)}this.setAttribute("position",new Oe(i,3))}else{const i=Math.min(e.length,t.count);for(let s=0;s<i;s++){const a=e[s];t.setXYZ(s,a.x,a.y,a.z||0)}e.length>t.count&&Ae("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ti);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){ke("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new C(-1/0,-1/0,-1/0),new C(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,s=t.length;i<s;i++){const a=t[i];Zt.setFromBufferAttribute(a),this.morphTargetsRelative?(Nt.addVectors(this.boundingBox.min,Zt.min),this.boundingBox.expandByPoint(Nt),Nt.addVectors(this.boundingBox.max,Zt.max),this.boundingBox.expandByPoint(Nt)):(this.boundingBox.expandByPoint(Zt.min),this.boundingBox.expandByPoint(Zt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&ke('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ni);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){ke("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new C,1/0);return}if(e){const i=this.boundingSphere.center;if(Zt.setFromBufferAttribute(e),t)for(let a=0,r=t.length;a<r;a++){const o=t[a];Qs.setFromBufferAttribute(o),this.morphTargetsRelative?(Nt.addVectors(Zt.min,Qs.min),Zt.expandByPoint(Nt),Nt.addVectors(Zt.max,Qs.max),Zt.expandByPoint(Nt)):(Zt.expandByPoint(Qs.min),Zt.expandByPoint(Qs.max))}Zt.getCenter(i);let s=0;for(let a=0,r=e.count;a<r;a++)Nt.fromBufferAttribute(e,a),s=Math.max(s,i.distanceToSquared(Nt));if(t)for(let a=0,r=t.length;a<r;a++){const o=t[a],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Nt.fromBufferAttribute(o,c),l&&(as.fromBufferAttribute(e,c),Nt.add(as)),s=Math.max(s,i.distanceToSquared(Nt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&ke('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){ke("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,s=t.normal,a=t.uv;let r=this.getAttribute("tangent");(r===void 0||r.count!==i.count)&&(r=new cn(new Float32Array(4*i.count),4),this.setAttribute("tangent",r));const o=[],l=[];for(let _=0;_<i.count;_++)o[_]=new C,l[_]=new C;const c=new C,h=new C,d=new C,u=new te,f=new te,m=new te,M=new C,p=new C;function g(_,E,P){c.fromBufferAttribute(i,_),h.fromBufferAttribute(i,E),d.fromBufferAttribute(i,P),u.fromBufferAttribute(a,_),f.fromBufferAttribute(a,E),m.fromBufferAttribute(a,P),h.sub(c),d.sub(c),f.sub(u),m.sub(u);const I=1/(f.x*m.y-m.x*f.y);isFinite(I)&&(M.copy(h).multiplyScalar(m.y).addScaledVector(d,-f.y).multiplyScalar(I),p.copy(d).multiplyScalar(f.x).addScaledVector(h,-m.x).multiplyScalar(I),o[_].add(M),o[E].add(M),o[P].add(M),l[_].add(p),l[E].add(p),l[P].add(p))}let y=this.groups;y.length===0&&(y=[{start:0,count:e.count}]);for(let _=0,E=y.length;_<E;++_){const P=y[_],I=P.start,N=P.count;for(let G=I,X=I+N;G<X;G+=3)g(e.getX(G+0),e.getX(G+1),e.getX(G+2))}const S=new C,x=new C,w=new C,T=new C;function A(_){w.fromBufferAttribute(s,_),T.copy(w);const E=o[_];S.copy(E),S.sub(w.multiplyScalar(w.dot(E))).normalize(),x.crossVectors(T,E);const I=x.dot(l[_])<0?-1:1;r.setXYZW(_,S.x,S.y,S.z,I)}for(let _=0,E=y.length;_<E;++_){const P=y[_],I=P.start,N=P.count;for(let G=I,X=I+N;G<X;G+=3)A(e.getX(G+0)),A(e.getX(G+1)),A(e.getX(G+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0||i.count!==t.count)i=new cn(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let u=0,f=i.count;u<f;u++)i.setXYZ(u,0,0,0);const s=new C,a=new C,r=new C,o=new C,l=new C,c=new C,h=new C,d=new C;if(e)for(let u=0,f=e.count;u<f;u+=3){const m=e.getX(u+0),M=e.getX(u+1),p=e.getX(u+2);s.fromBufferAttribute(t,m),a.fromBufferAttribute(t,M),r.fromBufferAttribute(t,p),h.subVectors(r,a),d.subVectors(s,a),h.cross(d),o.fromBufferAttribute(i,m),l.fromBufferAttribute(i,M),c.fromBufferAttribute(i,p),o.add(h),l.add(h),c.add(h),i.setXYZ(m,o.x,o.y,o.z),i.setXYZ(M,l.x,l.y,l.z),i.setXYZ(p,c.x,c.y,c.z)}else for(let u=0,f=t.count;u<f;u+=3)s.fromBufferAttribute(t,u+0),a.fromBufferAttribute(t,u+1),r.fromBufferAttribute(t,u+2),h.subVectors(r,a),d.subVectors(s,a),h.cross(d),i.setXYZ(u+0,h.x,h.y,h.z),i.setXYZ(u+1,h.x,h.y,h.z),i.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)Nt.fromBufferAttribute(e,t),Nt.normalize(),e.setXYZ(t,Nt.x,Nt.y,Nt.z)}toNonIndexed(){function e(o,l){const c=o.array,h=o.itemSize,d=o.normalized,u=new c.constructor(l.length*h);let f=0,m=0;for(let M=0,p=l.length;M<p;M++){o.isInterleavedBufferAttribute?f=l[M]*o.data.stride+o.offset:f=l[M]*h;for(let g=0;g<h;g++)u[m++]=c[f++]}return new cn(u,h,d)}if(this.index===null)return Ae("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new mt,i=this.index.array,s=this.attributes;for(const o in s){const l=s[o],c=e(l,i);t.setAttribute(o,c)}const a=this.morphAttributes;for(const o in a){const l=[],c=a[o];for(let h=0,d=c.length;h<d;h++){const u=c[h],f=e(u,i);l.push(f)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const r=this.groups;for(let o=0,l=r.length;o<l;o++){const c=r[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const c=i[l];e.data.attributes[l]=c.toJSON(e.data)}const s={};let a=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){const f=c[d];h.push(f.toJSON(e.data))}h.length>0&&(s[l]=h,a=!0)}a&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);const r=this.groups;r.length>0&&(e.data.groups=JSON.parse(JSON.stringify(r)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const s=e.attributes;for(const c in s){const h=s[c];this.setAttribute(c,h.clone(t))}const a=e.morphAttributes;for(const c in a){const h=[],d=a[c];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const r=e.groups;for(let c=0,h=r.length;c<h;c++){const d=r[c];this.addGroup(d.start,d.count,d.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class jg{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=jc,this.updateRanges=[],this.version=0,this.uuid=ln()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,i){e*=this.stride,i*=t.stride;for(let s=0,a=this.stride;s<a;s++)this.array[e+s]=t.array[i+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=ln()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(t,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=ln()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const Ht=new C;class To{constructor(e,t,i,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=i,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,i=this.data.count;t<i;t++)Ht.fromBufferAttribute(this,t),Ht.applyMatrix4(e),this.setXYZ(t,Ht.x,Ht.y,Ht.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Ht.fromBufferAttribute(this,t),Ht.applyNormalMatrix(e),this.setXYZ(t,Ht.x,Ht.y,Ht.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Ht.fromBufferAttribute(this,t),Ht.transformDirection(e),this.setXYZ(t,Ht.x,Ht.y,Ht.z);return this}getComponent(e,t){let i=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(i=gn(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=ht(i,this.array)),this.data.array[e*this.data.stride+this.offset+t]=i,this}setX(e,t){return this.normalized&&(t=ht(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=ht(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=ht(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=ht(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=gn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=gn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=gn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=gn(t,this.array)),t}setXY(e,t,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=ht(t,this.array),i=ht(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this}setXYZ(e,t,i,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=ht(t,this.array),i=ht(i,this.array),s=ht(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=s,this}setXYZW(e,t,i,s,a){return e=e*this.data.stride+this.offset,this.normalized&&(t=ht(t,this.array),i=ht(i,this.array),s=ht(s,this.array),a=ht(a,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=s,this.data.array[e+3]=a,this}clone(e){if(e===void 0){bo("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const s=i*this.data.stride+this.offset;for(let a=0;a<this.itemSize;a++)t.push(this.data.array[s+a])}return new cn(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new To(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){bo("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const s=i*this.data.stride+this.offset;for(let a=0;a<this.itemSize;a++)t.push(this.data.array[s+a])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}let e_=0;class bi extends Xi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:e_++}),this.uuid=ln(),this.name="",this.type="Material",this.blending=ws,this.side=yi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=uc,this.blendDst=dc,this.blendEquation=Ni,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new ze(0,0,0),this.blendAlpha=0,this.depthFunc=Ns,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Vu,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ji,this.stencilZFail=Ji,this.stencilZPass=Ji,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){Ae(`Material: parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){Ae(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector2&&i&&i.isVector2||s&&s.isEuler&&i&&i.isEuler||s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==ws&&(i.blending=this.blending),this.side!==yi&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==uc&&(i.blendSrc=this.blendSrc),this.blendDst!==dc&&(i.blendDst=this.blendDst),this.blendEquation!==Ni&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Ns&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Vu&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ji&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Ji&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Ji&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.allowOverride===!1&&(i.allowOverride=!1),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(a){const r=[];for(const o in a){const l=a[o];delete l.metadata,r.push(l)}return r}if(t){const a=s(e.textures),r=s(e.images);a.length>0&&(i.textures=a),r.length>0&&(i.images=r)}return i}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new ze().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let i=e.normalScale;Array.isArray(i)===!1&&(i=[i,i]),this.normalScale=new te().fromArray(i)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new te().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const s=t.length;i=new Array(s);for(let a=0;a!==s;++a)i[a]=t[a].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class t_ extends bi{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new ze(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let os;const js=new C,ls=new C,cs=new C,hs=new te,er=new te,Cp=new qe,ga=new C,tr=new C,_a=new C,id=new te,yl=new te,sd=new te;class jw extends pt{constructor(e=new t_){if(super(),this.isSprite=!0,this.type="Sprite",os===void 0){os=new mt;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new jg(t,5);os.setIndex([0,1,2,0,2,3]),os.setAttribute("position",new To(i,3,0,!1)),os.setAttribute("uv",new To(i,2,3,!1))}this.geometry=os,this.material=e,this.center=new te(.5,.5),this.count=1}raycast(e,t){e.camera===null&&ke('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),ls.setFromMatrixScale(this.matrixWorld),Cp.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),cs.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&ls.multiplyScalar(-cs.z);const i=this.material.rotation;let s,a;i!==0&&(a=Math.cos(i),s=Math.sin(i));const r=this.center;va(ga.set(-.5,-.5,0),cs,r,ls,s,a),va(tr.set(.5,-.5,0),cs,r,ls,s,a),va(_a.set(.5,.5,0),cs,r,ls,s,a),id.set(0,0),yl.set(1,0),sd.set(1,1);let o=e.ray.intersectTriangle(ga,tr,_a,!1,js);if(o===null&&(va(tr.set(-.5,.5,0),cs,r,ls,s,a),yl.set(0,1),o=e.ray.intersectTriangle(ga,_a,tr,!1,js),o===null))return;const l=e.ray.origin.distanceTo(js);l<e.near||l>e.far||t.push({distance:l,point:js.clone(),uv:en.getInterpolation(js,ga,tr,_a,id,yl,sd,new te),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function va(n,e,t,i,s,a){hs.subVectors(n,t).addScalar(.5).multiply(i),s!==void 0?(er.x=a*hs.x-s*hs.y,er.y=s*hs.x+a*hs.y):er.copy(hs),n.copy(e),n.x+=er.x,n.y+=er.y,n.applyMatrix4(Cp)}const Hn=new C,Sl=new C,xa=new C,ui=new C,bl=new C,Ma=new C,Tl=new C;class $r{constructor(e=new C,t=new C(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Hn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Hn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Hn.copy(this.origin).addScaledVector(this.direction,t),Hn.distanceToSquared(e))}distanceSqToSegment(e,t,i,s){Sl.copy(e).add(t).multiplyScalar(.5),xa.copy(t).sub(e).normalize(),ui.copy(this.origin).sub(Sl);const a=e.distanceTo(t)*.5,r=-this.direction.dot(xa),o=ui.dot(this.direction),l=-ui.dot(xa),c=ui.lengthSq(),h=Math.abs(1-r*r);let d,u,f,m;if(h>0)if(d=r*l-o,u=r*o-l,m=a*h,d>=0)if(u>=-m)if(u<=m){const M=1/h;d*=M,u*=M,f=d*(d+r*u+2*o)+u*(r*d+u+2*l)+c}else u=a,d=Math.max(0,-(r*u+o)),f=-d*d+u*(u+2*l)+c;else u=-a,d=Math.max(0,-(r*u+o)),f=-d*d+u*(u+2*l)+c;else u<=-m?(d=Math.max(0,-(-r*a+o)),u=d>0?-a:Math.min(Math.max(-a,-l),a),f=-d*d+u*(u+2*l)+c):u<=m?(d=0,u=Math.min(Math.max(-a,-l),a),f=u*(u+2*l)+c):(d=Math.max(0,-(r*a+o)),u=d>0?a:Math.min(Math.max(-a,-l),a),f=-d*d+u*(u+2*l)+c);else u=r>0?-a:a,d=Math.max(0,-(r*u+o)),f=-d*d+u*(u+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(Sl).addScaledVector(xa,u),f}intersectSphere(e,t){Hn.subVectors(e.center,this.origin);const i=Hn.dot(this.direction),s=Hn.dot(Hn)-i*i,a=e.radius*e.radius;if(s>a)return null;const r=Math.sqrt(a-s),o=i-r,l=i+r;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,s,a,r,o,l;const c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(i=(e.min.x-u.x)*c,s=(e.max.x-u.x)*c):(i=(e.max.x-u.x)*c,s=(e.min.x-u.x)*c),h>=0?(a=(e.min.y-u.y)*h,r=(e.max.y-u.y)*h):(a=(e.max.y-u.y)*h,r=(e.min.y-u.y)*h),i>r||a>s||((a>i||isNaN(i))&&(i=a),(r<s||isNaN(s))&&(s=r),d>=0?(o=(e.min.z-u.z)*d,l=(e.max.z-u.z)*d):(o=(e.max.z-u.z)*d,l=(e.min.z-u.z)*d),i>l||o>s)||((o>i||i!==i)&&(i=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(i>=0?i:s,t)}intersectsBox(e){return this.intersectBox(e,Hn)!==null}intersectTriangle(e,t,i,s,a){bl.subVectors(t,e),Ma.subVectors(i,e),Tl.crossVectors(bl,Ma);let r=this.direction.dot(Tl),o;if(r>0){if(s)return null;o=1}else if(r<0)o=-1,r=-r;else return null;ui.subVectors(this.origin,e);const l=o*this.direction.dot(Ma.crossVectors(ui,Ma));if(l<0)return null;const c=o*this.direction.dot(bl.cross(ui));if(c<0||l+c>r)return null;const h=-o*ui.dot(Tl);return h<0?null:this.at(h/r,a)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Kr extends bi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new ze(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new vn,this.combine=lp,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const rd=new qe,Ri=new $r,ya=new ni,ad=new C,Sa=new C,ba=new C,Ta=new C,El=new C,Ea=new C,od=new C,wa=new C;class he extends pt{constructor(e=new mt,t=new Kr){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=s.length;a<r;a++){const o=s[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}getVertexPosition(e,t){const i=this.geometry,s=i.attributes.position,a=i.morphAttributes.position,r=i.morphTargetsRelative;t.fromBufferAttribute(s,e);const o=this.morphTargetInfluences;if(a&&o){Ea.set(0,0,0);for(let l=0,c=a.length;l<c;l++){const h=o[l],d=a[l];h!==0&&(El.fromBufferAttribute(d,e),r?Ea.addScaledVector(El,h):Ea.addScaledVector(El.sub(t),h))}t.add(Ea)}return t}raycast(e,t){const i=this.geometry,s=this.material,a=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),ya.copy(i.boundingSphere),ya.applyMatrix4(a),Ri.copy(e.ray).recast(e.near),!(ya.containsPoint(Ri.origin)===!1&&(Ri.intersectSphere(ya,ad)===null||Ri.origin.distanceToSquared(ad)>(e.far-e.near)**2))&&(rd.copy(a).invert(),Ri.copy(e.ray).applyMatrix4(rd),!(i.boundingBox!==null&&Ri.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Ri)))}_computeIntersections(e,t,i){let s;const a=this.geometry,r=this.material,o=a.index,l=a.attributes.position,c=a.attributes.uv,h=a.attributes.uv1,d=a.attributes.normal,u=a.groups,f=a.drawRange;if(o!==null)if(Array.isArray(r))for(let m=0,M=u.length;m<M;m++){const p=u[m],g=r[p.materialIndex],y=Math.max(p.start,f.start),S=Math.min(o.count,Math.min(p.start+p.count,f.start+f.count));for(let x=y,w=S;x<w;x+=3){const T=o.getX(x),A=o.getX(x+1),_=o.getX(x+2);s=Aa(this,g,e,i,c,h,d,T,A,_),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=p.materialIndex,t.push(s))}}else{const m=Math.max(0,f.start),M=Math.min(o.count,f.start+f.count);for(let p=m,g=M;p<g;p+=3){const y=o.getX(p),S=o.getX(p+1),x=o.getX(p+2);s=Aa(this,r,e,i,c,h,d,y,S,x),s&&(s.faceIndex=Math.floor(p/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(r))for(let m=0,M=u.length;m<M;m++){const p=u[m],g=r[p.materialIndex],y=Math.max(p.start,f.start),S=Math.min(l.count,Math.min(p.start+p.count,f.start+f.count));for(let x=y,w=S;x<w;x+=3){const T=x,A=x+1,_=x+2;s=Aa(this,g,e,i,c,h,d,T,A,_),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=p.materialIndex,t.push(s))}}else{const m=Math.max(0,f.start),M=Math.min(l.count,f.start+f.count);for(let p=m,g=M;p<g;p+=3){const y=p,S=p+1,x=p+2;s=Aa(this,r,e,i,c,h,d,y,S,x),s&&(s.faceIndex=Math.floor(p/3),t.push(s))}}}}function n_(n,e,t,i,s,a,r,o){let l;if(e.side===Xt?l=i.intersectTriangle(r,a,s,!0,o):l=i.intersectTriangle(s,a,r,e.side===yi,o),l===null)return null;wa.copy(o),wa.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(wa);return c<t.near||c>t.far?null:{distance:c,point:wa.clone(),object:n}}function Aa(n,e,t,i,s,a,r,o,l,c){n.getVertexPosition(o,Sa),n.getVertexPosition(l,ba),n.getVertexPosition(c,Ta);const h=n_(n,e,t,i,Sa,ba,Ta,od);if(h){const d=new C;en.getBarycoord(od,Sa,ba,Ta,d),s&&(h.uv=en.getInterpolatedAttribute(s,o,l,c,d,new te)),a&&(h.uv1=en.getInterpolatedAttribute(a,o,l,c,d,new te)),r&&(h.normal=en.getInterpolatedAttribute(r,o,l,c,d,new C),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));const u={a:o,b:l,c,normal:new C,materialIndex:0};en.getNormal(Sa,ba,Ta,u.normal),h.face=u,h.barycoord=d}return h}const nr=new at,ld=new at,cd=new at,i_=new at,hd=new qe,Ra=new C,wl=new ni,ud=new qe,Al=new $r;class s_ extends he{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=Ou,this.bindMatrix=new qe,this.bindMatrixInverse=new qe,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new ti),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let i=0;i<t.count;i++)this.getVertexPosition(i,Ra),this.boundingBox.expandByPoint(Ra)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new ni),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let i=0;i<t.count;i++)this.getVertexPosition(i,Ra),this.boundingSphere.expandByPoint(Ra)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){const i=this.material,s=this.matrixWorld;i!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),wl.copy(this.boundingSphere),wl.applyMatrix4(s),e.ray.intersectsSphere(wl)!==!1&&(ud.copy(s).invert(),Al.copy(e.ray).applyMatrix4(ud),!(this.boundingBox!==null&&Al.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,Al)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new at,t=this.geometry.attributes.skinWeight;for(let i=0,s=t.count;i<s;i++){e.fromBufferAttribute(t,i);const a=1/e.manhattanLength();a!==1/0?e.multiplyScalar(a):e.set(1,0,0,0),t.setXYZW(i,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===Ou?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===rg?this.bindMatrixInverse.copy(this.bindMatrix).invert():Ae("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const i=this.skeleton,s=this.geometry;ld.fromBufferAttribute(s.attributes.skinIndex,e),cd.fromBufferAttribute(s.attributes.skinWeight,e),t.isVector4?(nr.copy(t),t.set(0,0,0,0)):(nr.set(...t,1),t.set(0,0,0)),nr.applyMatrix4(this.bindMatrix);for(let a=0;a<4;a++){const r=cd.getComponent(a);if(r!==0){const o=ld.getComponent(a);hd.multiplyMatrices(i.bones[o].matrixWorld,i.boneInverses[o]),t.addScaledVector(i_.copy(nr).applyMatrix4(hd),r)}}return t.isVector4&&(t.w=nr.w),t.applyMatrix4(this.bindMatrixInverse)}}class Uh extends pt{constructor(){super(),this.isBone=!0,this.type="Bone"}}class Fh extends Ut{constructor(e=null,t=1,i=1,s,a,r,o,l,c=Ft,h=Ft,d,u){super(null,r,o,l,c,h,s,a,d,u),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const dd=new qe,r_=new qe;class Oh{constructor(e=[],t=[]){this.uuid=ln(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){Ae("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let i=0,s=this.bones.length;i<s;i++)this.boneInverses.push(new qe)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const i=new qe;this.bones[e]&&i.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(i)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const i=this.bones[e];i&&i.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const i=this.bones[e];i&&(i.parent&&i.parent.isBone?(i.matrix.copy(i.parent.matrixWorld).invert(),i.matrix.multiply(i.matrixWorld)):i.matrix.copy(i.matrixWorld),i.matrix.decompose(i.position,i.quaternion,i.scale))}}update(){const e=this.bones,t=this.boneInverses,i=this.boneMatrices,s=this.boneTexture;for(let a=0,r=e.length;a<r;a++){const o=e[a]?e[a].matrixWorld:r_;dd.multiplyMatrices(o,t[a]),dd.toArray(i,a*16)}s!==null&&(s.needsUpdate=!0)}clone(){return new Oh(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const i=new Fh(t,e,e,on,an);return i.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=i,this}getBoneByName(e){for(let t=0,i=this.bones.length;t<i;t++){const s=this.bones[t];if(s.name===e)return s}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let i=0,s=e.bones.length;i<s;i++){const a=e.bones[i];let r=t[a];r===void 0&&(Ae("Skeleton: No bone found with UUID:",a),r=new Uh),this.bones.push(r),this.boneInverses.push(new qe().fromArray(e.boneInverses[i]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,i=this.boneInverses;for(let s=0,a=t.length;s<a;s++){const r=t[s];e.bones.push(r.uuid);const o=i[s];e.boneInverses.push(o.toArray())}return e}}class fd extends cn{constructor(e,t,i,s=1){super(e,t,i),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const us=new qe,pd=new qe,Pa=[],md=new ti,a_=new qe,ir=new he,sr=new ni;class eA extends he{constructor(e,t,i){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new fd(new Float32Array(i*16),16),this.instanceColor=null,this.morphTexture=null,this.count=i,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<i;s++)this.setMatrixAt(s,a_)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new ti),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let i=0;i<t;i++)this.getMatrixAt(i,us),md.copy(e.boundingBox).applyMatrix4(us),this.boundingBox.union(md)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new ni),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let i=0;i<t;i++)this.getMatrixAt(i,us),sr.copy(e.boundingSphere).applyMatrix4(us),this.boundingSphere.union(sr)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const i=t.morphTargetInfluences,s=this.morphTexture.source.data.data,a=i.length+1,r=e*a+1;for(let o=0;o<i.length;o++)i[o]=s[r+o]}raycast(e,t){const i=this.matrixWorld,s=this.count;if(ir.geometry=this.geometry,ir.material=this.material,ir.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),sr.copy(this.boundingSphere),sr.applyMatrix4(i),e.ray.intersectsSphere(sr)!==!1))for(let a=0;a<s;a++){this.getMatrixAt(a,us),pd.multiplyMatrices(i,us),ir.matrixWorld=pd,ir.raycast(e,Pa);for(let r=0,o=Pa.length;r<o;r++){const l=Pa[r];l.instanceId=a,l.object=this,t.push(l)}Pa.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new fd(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){const i=t.morphTargetInfluences,s=i.length+1;this.morphTexture===null&&(this.morphTexture=new Fh(new Float32Array(s*this.count),s,this.count,Eh,an));const a=this.morphTexture.source.data.data;let r=0;for(let c=0;c<i.length;c++)r+=i[c];const o=this.geometry.morphTargetsRelative?1:1-r,l=s*e;return a[l]=o,a.set(i,l+1),this}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const Rl=new C,o_=new C,l_=new $e;class gi{constructor(e=new C(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,s){return this.normal.set(e,t,i),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const s=Rl.subVectors(i,t).cross(o_.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,i=!0){const s=e.delta(Rl),a=this.normal.dot(s);if(a===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/a;return i===!0&&(r<0||r>1)?null:t.copy(e.start).addScaledVector(s,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||l_.getNormalMatrix(e),s=this.coplanarPoint(Rl).applyMatrix4(e),a=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(a),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Pi=new ni,c_=new te(.5,.5),Ca=new C;class Vo{constructor(e=new gi,t=new gi,i=new gi,s=new gi,a=new gi,r=new gi){this.planes=[e,t,i,s,a,r]}set(e,t,i,s,a,r){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(i),o[3].copy(s),o[4].copy(a),o[5].copy(r),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=Cn,i=!1){const s=this.planes,a=e.elements,r=a[0],o=a[1],l=a[2],c=a[3],h=a[4],d=a[5],u=a[6],f=a[7],m=a[8],M=a[9],p=a[10],g=a[11],y=a[12],S=a[13],x=a[14],w=a[15];if(s[0].setComponents(c-r,f-h,g-m,w-y).normalize(),s[1].setComponents(c+r,f+h,g+m,w+y).normalize(),s[2].setComponents(c+o,f+d,g+M,w+S).normalize(),s[3].setComponents(c-o,f-d,g-M,w-S).normalize(),i)s[4].setComponents(l,u,p,x).normalize(),s[5].setComponents(c-l,f-u,g-p,w-x).normalize();else if(s[4].setComponents(c-l,f-u,g-p,w-x).normalize(),t===Cn)s[5].setComponents(c+l,f+u,g+p,w+x).normalize();else if(t===Fr)s[5].setComponents(l,u,p,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Pi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Pi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Pi)}intersectsSprite(e){Pi.center.set(0,0,0);const t=c_.distanceTo(e.center);return Pi.radius=.7071067811865476+t,Pi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Pi)}intersectsSphere(e){const t=this.planes,i=e.center,s=-e.radius;for(let a=0;a<6;a++)if(t[a].distanceToPoint(i)<s)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const s=t[i];if(Ca.x=s.normal.x>0?e.max.x:e.min.x,Ca.y=s.normal.y>0?e.max.y:e.min.y,Ca.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(Ca)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Bh extends bi{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new ze(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const Eo=new C,wo=new C,gd=new qe,rr=new $r,Ia=new ni,Pl=new C,_d=new C;class Ip extends pt{constructor(e=new mt,t=new Bh){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[0];for(let s=1,a=t.count;s<a;s++)Eo.fromBufferAttribute(t,s-1),wo.fromBufferAttribute(t,s),i[s]=i[s-1],i[s]+=Eo.distanceTo(wo);e.setAttribute("lineDistance",new Oe(i,1))}else Ae("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const i=this.geometry,s=this.matrixWorld,a=e.params.Line.threshold,r=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Ia.copy(i.boundingSphere),Ia.applyMatrix4(s),Ia.radius+=a,e.ray.intersectsSphere(Ia)===!1)return;gd.copy(s).invert(),rr.copy(e.ray).applyMatrix4(gd);const o=a/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,h=i.index,u=i.attributes.position;if(h!==null){const f=Math.max(0,r.start),m=Math.min(h.count,r.start+r.count);for(let M=f,p=m-1;M<p;M+=c){const g=h.getX(M),y=h.getX(M+1),S=La(this,e,rr,l,g,y,M);S&&t.push(S)}if(this.isLineLoop){const M=h.getX(m-1),p=h.getX(f),g=La(this,e,rr,l,M,p,m-1);g&&t.push(g)}}else{const f=Math.max(0,r.start),m=Math.min(u.count,r.start+r.count);for(let M=f,p=m-1;M<p;M+=c){const g=La(this,e,rr,l,M,M+1,M);g&&t.push(g)}if(this.isLineLoop){const M=La(this,e,rr,l,m-1,f,m-1);M&&t.push(M)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=s.length;a<r;a++){const o=s[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}}function La(n,e,t,i,s,a,r){const o=n.geometry.attributes.position;if(Eo.fromBufferAttribute(o,s),wo.fromBufferAttribute(o,a),t.distanceSqToSegment(Eo,wo,Pl,_d)>i)return;Pl.applyMatrix4(n.matrixWorld);const c=e.ray.origin.distanceTo(Pl);if(!(c<e.near||c>e.far))return{distance:c,point:_d.clone().applyMatrix4(n.matrixWorld),index:r,face:null,faceIndex:null,barycoord:null,object:n}}const vd=new C,xd=new C;class h_ extends Ip{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[];for(let s=0,a=t.count;s<a;s+=2)vd.fromBufferAttribute(t,s),xd.fromBufferAttribute(t,s+1),i[s]=s===0?0:i[s-1],i[s+1]=i[s]+vd.distanceTo(xd);e.setAttribute("lineDistance",new Oe(i,1))}else Ae("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class tA extends Ip{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}}class u_ extends bi{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new ze(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Md=new qe,eh=new $r,Na=new ni,Da=new C;class nA extends pt{constructor(e=new mt,t=new u_){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const i=this.geometry,s=this.matrixWorld,a=e.params.Points.threshold,r=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Na.copy(i.boundingSphere),Na.applyMatrix4(s),Na.radius+=a,e.ray.intersectsSphere(Na)===!1)return;Md.copy(s).invert(),eh.copy(e.ray).applyMatrix4(Md);const o=a/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=i.index,d=i.attributes.position;if(c!==null){const u=Math.max(0,r.start),f=Math.min(c.count,r.start+r.count);for(let m=u,M=f;m<M;m++){const p=c.getX(m);Da.fromBufferAttribute(d,p),yd(Da,p,l,s,e,t,this)}}else{const u=Math.max(0,r.start),f=Math.min(d.count,r.start+r.count);for(let m=u,M=f;m<M;m++)Da.fromBufferAttribute(d,m),yd(Da,m,l,s,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=s.length;a<r;a++){const o=s[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}}function yd(n,e,t,i,s,a,r){const o=eh.distanceSqToPoint(n);if(o<t){const l=new C;eh.closestPointToPoint(n,l),l.applyMatrix4(i);const c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;a.push({distance:c,distanceToRay:Math.sqrt(o),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:r})}}class Lp extends Ut{constructor(e=[],t=zi,i,s,a,r,o,l,c,h){super(e,t,i,s,a,r,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Go extends Ut{constructor(e,t,i,s,a,r,o,l,c){super(e,t,i,s,a,r,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Fs extends Ut{constructor(e,t,i=Dn,s,a,r,o=Ft,l=Ft,c,h=Jn,d=1){if(h!==Jn&&h!==Fi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const u={width:e,height:t,depth:d};super(u,s,a,r,o,l,h,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Lh(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class d_ extends Fs{constructor(e,t=Dn,i=zi,s,a,r=Ft,o=Ft,l,c=Jn){const h={width:e,height:e,depth:1},d=[h,h,h,h,h,h];super(e,e,t,i,s,a,r,o,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class Np extends Ut{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Ln extends mt{constructor(e=1,t=1,i=1,s=1,a=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:s,heightSegments:a,depthSegments:r};const o=this;s=Math.floor(s),a=Math.floor(a),r=Math.floor(r);const l=[],c=[],h=[],d=[];let u=0,f=0;m("z","y","x",-1,-1,i,t,e,r,a,0),m("z","y","x",1,-1,i,t,-e,r,a,1),m("x","z","y",1,1,e,i,t,s,r,2),m("x","z","y",1,-1,e,i,-t,s,r,3),m("x","y","z",1,-1,e,t,i,s,a,4),m("x","y","z",-1,-1,e,t,-i,s,a,5),this.setIndex(l),this.setAttribute("position",new Oe(c,3)),this.setAttribute("normal",new Oe(h,3)),this.setAttribute("uv",new Oe(d,2));function m(M,p,g,y,S,x,w,T,A,_,E){const P=x/A,I=w/_,N=x/2,G=w/2,X=T/2,O=A+1,W=_+1;let H=0,Q=0;const $=new C;for(let se=0;se<W;se++){const re=se*I-G;for(let ue=0;ue<O;ue++){const Ve=ue*P-N;$[M]=Ve*y,$[p]=re*S,$[g]=X,c.push($.x,$.y,$.z),$[M]=0,$[p]=0,$[g]=T>0?1:-1,h.push($.x,$.y,$.z),d.push(ue/A),d.push(1-se/_),H+=1}}for(let se=0;se<_;se++)for(let re=0;re<A;re++){const ue=u+re+O*se,Ve=u+re+O*(se+1),ot=u+(re+1)+O*(se+1),nt=u+(re+1)+O*se;l.push(ue,Ve,nt),l.push(Ve,ot,nt),Q+=6}o.addGroup(f,Q,E),f+=Q,u+=H}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ln(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class Jr extends mt{constructor(e=1,t=1,i=4,s=8,a=1){super(),this.type="CapsuleGeometry",this.parameters={radius:e,height:t,capSegments:i,radialSegments:s,heightSegments:a},t=Math.max(0,t),i=Math.max(1,Math.floor(i)),s=Math.max(3,Math.floor(s)),a=Math.max(1,Math.floor(a));const r=[],o=[],l=[],c=[],h=t/2,d=Math.PI/2*e,u=t,f=2*d+u,m=i*2+a,M=s+1,p=new C,g=new C;for(let y=0;y<=m;y++){let S=0,x=0,w=0,T=0;if(y<=i){const E=y/i,P=E*Math.PI/2;x=-h-e*Math.cos(P),w=e*Math.sin(P),T=-e*Math.cos(P),S=E*d}else if(y<=i+a){const E=(y-i)/a;x=-h+E*t,w=e,T=0,S=d+E*u}else{const E=(y-i-a)/i,P=E*Math.PI/2;x=h+e*Math.sin(P),w=e*Math.cos(P),T=e*Math.sin(P),S=d+u+E*d}const A=Math.max(0,Math.min(1,S/f));let _=0;y===0?_=.5/s:y===m&&(_=-.5/s);for(let E=0;E<=s;E++){const P=E/s,I=P*Math.PI*2,N=Math.sin(I),G=Math.cos(I);g.x=-w*G,g.y=x,g.z=w*N,o.push(g.x,g.y,g.z),p.set(-w*G,T,w*N),p.normalize(),l.push(p.x,p.y,p.z),c.push(P+_,A)}if(y>0){const E=(y-1)*M;for(let P=0;P<s;P++){const I=E+P,N=E+P+1,G=y*M+P,X=y*M+P+1;r.push(I,N,G),r.push(N,X,G)}}}this.setIndex(r),this.setAttribute("position",new Oe(o,3)),this.setAttribute("normal",new Oe(l,3)),this.setAttribute("uv",new Oe(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Jr(e.radius,e.height,e.capSegments,e.radialSegments,e.heightSegments)}}class Dp extends mt{constructor(e=1,t=32,i=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:i,thetaLength:s},t=Math.max(3,t);const a=[],r=[],o=[],l=[],c=new C,h=new te;r.push(0,0,0),o.push(0,0,1),l.push(.5,.5);for(let d=0,u=3;d<=t;d++,u+=3){const f=i+d/t*s;c.x=e*Math.cos(f),c.y=e*Math.sin(f),r.push(c.x,c.y,c.z),o.push(0,0,1),h.x=(r[u]/e+1)/2,h.y=(r[u+1]/e+1)/2,l.push(h.x,h.y)}for(let d=1;d<=t;d++)a.push(d,d+1,0);this.setIndex(a),this.setAttribute("position",new Oe(r,3)),this.setAttribute("normal",new Oe(o,3)),this.setAttribute("uv",new Oe(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Dp(e.radius,e.segments,e.thetaStart,e.thetaLength)}}class mn extends mt{constructor(e=1,t=1,i=1,s=32,a=1,r=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:s,heightSegments:a,openEnded:r,thetaStart:o,thetaLength:l};const c=this;s=Math.floor(s),a=Math.floor(a);const h=[],d=[],u=[],f=[];let m=0;const M=[],p=i/2;let g=0;y(),r===!1&&(e>0&&S(!0),t>0&&S(!1)),this.setIndex(h),this.setAttribute("position",new Oe(d,3)),this.setAttribute("normal",new Oe(u,3)),this.setAttribute("uv",new Oe(f,2));function y(){const x=new C,w=new C;let T=0;const A=(t-e)/i;for(let _=0;_<=a;_++){const E=[],P=_/a,I=P*(t-e)+e;for(let N=0;N<=s;N++){const G=N/s,X=G*l+o,O=Math.sin(X),W=Math.cos(X);w.x=I*O,w.y=-P*i+p,w.z=I*W,d.push(w.x,w.y,w.z),x.set(O,A,W).normalize(),u.push(x.x,x.y,x.z),f.push(G,1-P),E.push(m++)}M.push(E)}for(let _=0;_<s;_++)for(let E=0;E<a;E++){const P=M[E][_],I=M[E+1][_],N=M[E+1][_+1],G=M[E][_+1];(e>0||E!==0)&&(h.push(P,I,G),T+=3),(t>0||E!==a-1)&&(h.push(I,N,G),T+=3)}c.addGroup(g,T,0),g+=T}function S(x){const w=m,T=new te,A=new C;let _=0;const E=x===!0?e:t,P=x===!0?1:-1;for(let N=1;N<=s;N++)d.push(0,p*P,0),u.push(0,P,0),f.push(.5,.5),m++;const I=m;for(let N=0;N<=s;N++){const X=N/s*l+o,O=Math.cos(X),W=Math.sin(X);A.x=E*W,A.y=p*P,A.z=E*O,d.push(A.x,A.y,A.z),u.push(0,P,0),T.x=O*.5+.5,T.y=W*.5*P+.5,f.push(T.x,T.y),m++}for(let N=0;N<s;N++){const G=w+N,X=I+N;x===!0?h.push(X,X+1,G):h.push(X+1,X,G),_+=3}c.addGroup(g,_,x===!0?1:2),g+=_}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new mn(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Zr extends mn{constructor(e=1,t=1,i=32,s=1,a=!1,r=0,o=Math.PI*2){super(0,e,t,i,s,a,r,o),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:i,heightSegments:s,openEnded:a,thetaStart:r,thetaLength:o}}static fromJSON(e){return new Zr(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Ws extends mt{constructor(e=[],t=[],i=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:i,detail:s};const a=[],r=[];o(s),c(i),h(),this.setAttribute("position",new Oe(a,3)),this.setAttribute("normal",new Oe(a.slice(),3)),this.setAttribute("uv",new Oe(r,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function o(y){const S=new C,x=new C,w=new C;for(let T=0;T<t.length;T+=3)f(t[T+0],S),f(t[T+1],x),f(t[T+2],w),l(S,x,w,y)}function l(y,S,x,w){const T=w+1,A=[];for(let _=0;_<=T;_++){A[_]=[];const E=y.clone().lerp(x,_/T),P=S.clone().lerp(x,_/T),I=T-_;for(let N=0;N<=I;N++)N===0&&_===T?A[_][N]=E:A[_][N]=E.clone().lerp(P,N/I)}for(let _=0;_<T;_++)for(let E=0;E<2*(T-_)-1;E++){const P=Math.floor(E/2);E%2===0?(u(A[_][P+1]),u(A[_+1][P]),u(A[_][P])):(u(A[_][P+1]),u(A[_+1][P+1]),u(A[_+1][P]))}}function c(y){const S=new C;for(let x=0;x<a.length;x+=3)S.x=a[x+0],S.y=a[x+1],S.z=a[x+2],S.normalize().multiplyScalar(y),a[x+0]=S.x,a[x+1]=S.y,a[x+2]=S.z}function h(){const y=new C;for(let S=0;S<a.length;S+=3){y.x=a[S+0],y.y=a[S+1],y.z=a[S+2];const x=p(y)/2/Math.PI+.5,w=g(y)/Math.PI+.5;r.push(x,1-w)}m(),d()}function d(){for(let y=0;y<r.length;y+=6){const S=r[y+0],x=r[y+2],w=r[y+4],T=Math.max(S,x,w),A=Math.min(S,x,w);T>.9&&A<.1&&(S<.2&&(r[y+0]+=1),x<.2&&(r[y+2]+=1),w<.2&&(r[y+4]+=1))}}function u(y){a.push(y.x,y.y,y.z)}function f(y,S){const x=y*3;S.x=e[x+0],S.y=e[x+1],S.z=e[x+2]}function m(){const y=new C,S=new C,x=new C,w=new C,T=new te,A=new te,_=new te;for(let E=0,P=0;E<a.length;E+=9,P+=6){y.set(a[E+0],a[E+1],a[E+2]),S.set(a[E+3],a[E+4],a[E+5]),x.set(a[E+6],a[E+7],a[E+8]),T.set(r[P+0],r[P+1]),A.set(r[P+2],r[P+3]),_.set(r[P+4],r[P+5]),w.copy(y).add(S).add(x).divideScalar(3);const I=p(w);M(T,P+0,y,I),M(A,P+2,S,I),M(_,P+4,x,I)}}function M(y,S,x,w){w<0&&y.x===1&&(r[S]=y.x-1),x.x===0&&x.z===0&&(r[S]=w/2/Math.PI+.5)}function p(y){return Math.atan2(y.z,-y.x)}function g(y){return Math.atan2(-y.y,Math.sqrt(y.x*y.x+y.z*y.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ws(e.vertices,e.indices,e.radius,e.detail)}}class Up extends Ws{constructor(e=1,t=0){const i=(1+Math.sqrt(5))/2,s=1/i,a=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-s,-i,0,-s,i,0,s,-i,0,s,i,-s,-i,0,-s,i,0,s,-i,0,s,i,0,-i,0,-s,i,0,-s,-i,0,s,i,0,s],r=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(a,r,e,t),this.type="DodecahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Up(e.radius,e.detail)}}const Ua=new C,Fa=new C,Cl=new C,Oa=new en;class iA extends mt{constructor(e=null,t=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:e,thresholdAngle:t},e!==null){const s=Math.pow(10,4),a=Math.cos(Rs*t),r=e.getIndex(),o=e.getAttribute("position"),l=r?r.count:o.count,c=[0,0,0],h=["a","b","c"],d=new Array(3),u={},f=[];for(let m=0;m<l;m+=3){r?(c[0]=r.getX(m),c[1]=r.getX(m+1),c[2]=r.getX(m+2)):(c[0]=m,c[1]=m+1,c[2]=m+2);const{a:M,b:p,c:g}=Oa;if(M.fromBufferAttribute(o,c[0]),p.fromBufferAttribute(o,c[1]),g.fromBufferAttribute(o,c[2]),Oa.getNormal(Cl),d[0]=`${Math.round(M.x*s)},${Math.round(M.y*s)},${Math.round(M.z*s)}`,d[1]=`${Math.round(p.x*s)},${Math.round(p.y*s)},${Math.round(p.z*s)}`,d[2]=`${Math.round(g.x*s)},${Math.round(g.y*s)},${Math.round(g.z*s)}`,!(d[0]===d[1]||d[1]===d[2]||d[2]===d[0]))for(let y=0;y<3;y++){const S=(y+1)%3,x=d[y],w=d[S],T=Oa[h[y]],A=Oa[h[S]],_=`${x}_${w}`,E=`${w}_${x}`;E in u&&u[E]?(Cl.dot(u[E].normal)<=a&&(f.push(T.x,T.y,T.z),f.push(A.x,A.y,A.z)),u[E]=null):_ in u||(u[_]={index0:c[y],index1:c[S],normal:Cl.clone()})}}for(const m in u)if(u[m]){const{index0:M,index1:p}=u[m];Ua.fromBufferAttribute(o,M),Fa.fromBufferAttribute(o,p),f.push(Ua.x,Ua.y,Ua.z),f.push(Fa.x,Fa.y,Fa.z)}this.setAttribute("position",new Oe(f,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}}class Fn{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Ae("Curve: .getPoint() not implemented.")}getPointAt(e,t){const i=this.getUtoTmapping(e);return this.getPoint(i,t)}getPoints(e=5){const t=[];for(let i=0;i<=e;i++)t.push(this.getPoint(i/e));return t}getSpacedPoints(e=5){const t=[];for(let i=0;i<=e;i++)t.push(this.getPointAt(i/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let i,s=this.getPoint(0),a=0;t.push(0);for(let r=1;r<=e;r++)i=this.getPoint(r/e),a+=i.distanceTo(s),t.push(a),s=i;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){const i=this.getLengths();let s=0;const a=i.length;let r;t?r=t:r=e*i[a-1];let o=0,l=a-1,c;for(;o<=l;)if(s=Math.floor(o+(l-o)/2),c=i[s]-r,c<0)o=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,i[s]===r)return s/(a-1);const h=i[s],u=i[s+1]-h,f=(r-h)/u;return(s+f)/(a-1)}getTangent(e,t){let s=e-1e-4,a=e+1e-4;s<0&&(s=0),a>1&&(a=1);const r=this.getPoint(s),o=this.getPoint(a),l=t||(r.isVector2?new te:new C);return l.copy(o).sub(r).normalize(),l}getTangentAt(e,t){const i=this.getUtoTmapping(e);return this.getTangent(i,t)}computeFrenetFrames(e,t=!1){const i=new C,s=[],a=[],r=[],o=new C,l=new qe;for(let f=0;f<=e;f++){const m=f/e;s[f]=this.getTangentAt(m,new C)}a[0]=new C,r[0]=new C;let c=Number.MAX_VALUE;const h=Math.abs(s[0].x),d=Math.abs(s[0].y),u=Math.abs(s[0].z);h<=c&&(c=h,i.set(1,0,0)),d<=c&&(c=d,i.set(0,1,0)),u<=c&&i.set(0,0,1),o.crossVectors(s[0],i).normalize(),a[0].crossVectors(s[0],o),r[0].crossVectors(s[0],a[0]);for(let f=1;f<=e;f++){if(a[f]=a[f-1].clone(),r[f]=r[f-1].clone(),o.crossVectors(s[f-1],s[f]),o.length()>Number.EPSILON){o.normalize();const m=Math.acos(Qe(s[f-1].dot(s[f]),-1,1));a[f].applyMatrix4(l.makeRotationAxis(o,m))}r[f].crossVectors(s[f],a[f])}if(t===!0){let f=Math.acos(Qe(a[0].dot(a[e]),-1,1));f/=e,s[0].dot(o.crossVectors(a[0],a[e]))>0&&(f=-f);for(let m=1;m<=e;m++)a[m].applyMatrix4(l.makeRotationAxis(s[m],f*m)),r[m].crossVectors(s[m],a[m])}return{tangents:s,normals:a,binormals:r}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}class kh extends Fn{constructor(e=0,t=0,i=1,s=1,a=0,r=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=i,this.yRadius=s,this.aStartAngle=a,this.aEndAngle=r,this.aClockwise=o,this.aRotation=l}getPoint(e,t=new te){const i=t,s=Math.PI*2;let a=this.aEndAngle-this.aStartAngle;const r=Math.abs(a)<Number.EPSILON;for(;a<0;)a+=s;for(;a>s;)a-=s;a<Number.EPSILON&&(r?a=0:a=s),this.aClockwise===!0&&!r&&(a===s?a=-s:a=a-s);const o=this.aStartAngle+e*a;let l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){const h=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=l-this.aX,f=c-this.aY;l=u*h-f*d+this.aX,c=u*d+f*h+this.aY}return i.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){const e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}}class f_ extends kh{constructor(e,t,i,s,a,r){super(e,t,i,i,s,a,r),this.isArcCurve=!0,this.type="ArcCurve"}}function zh(){let n=0,e=0,t=0,i=0;function s(a,r,o,l){n=a,e=o,t=-3*a+3*r-2*o-l,i=2*a-2*r+o+l}return{initCatmullRom:function(a,r,o,l,c){s(r,o,c*(o-a),c*(l-r))},initNonuniformCatmullRom:function(a,r,o,l,c,h,d){let u=(r-a)/c-(o-a)/(c+h)+(o-r)/h,f=(o-r)/h-(l-r)/(h+d)+(l-o)/d;u*=h,f*=h,s(r,o,u,f)},calc:function(a){const r=a*a,o=r*a;return n+e*a+t*r+i*o}}}const Sd=new C,bd=new C,Il=new zh,Ll=new zh,Nl=new zh;class Hh extends Fn{constructor(e=[],t=!1,i="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=i,this.tension=s}getPoint(e,t=new C){const i=t,s=this.points,a=s.length,r=(a-(this.closed?0:1))*e;let o=Math.floor(r),l=r-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/a)+1)*a:l===0&&o===a-1&&(o=a-2,l=1);let c,h;this.closed||o>0?c=s[(o-1)%a]:(bd.subVectors(s[0],s[1]).add(s[0]),c=bd);const d=s[o%a],u=s[(o+1)%a];if(this.closed||o+2<a?h=s[(o+2)%a]:(Sd.subVectors(s[a-1],s[a-2]).add(s[a-1]),h=Sd),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let m=Math.pow(c.distanceToSquared(d),f),M=Math.pow(d.distanceToSquared(u),f),p=Math.pow(u.distanceToSquared(h),f);M<1e-4&&(M=1),m<1e-4&&(m=M),p<1e-4&&(p=M),Il.initNonuniformCatmullRom(c.x,d.x,u.x,h.x,m,M,p),Ll.initNonuniformCatmullRom(c.y,d.y,u.y,h.y,m,M,p),Nl.initNonuniformCatmullRom(c.z,d.z,u.z,h.z,m,M,p)}else this.curveType==="catmullrom"&&(Il.initCatmullRom(c.x,d.x,u.x,h.x,this.tension),Ll.initCatmullRom(c.y,d.y,u.y,h.y,this.tension),Nl.initCatmullRom(c.z,d.z,u.z,h.z,this.tension));return i.set(Il.calc(l),Ll.calc(l),Nl.calc(l)),i}copy(e){super.copy(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){const s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,i=this.points.length;t<i;t++){const s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){const s=e.points[t];this.points.push(new C().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function Td(n,e,t,i,s){const a=(i-e)*.5,r=(s-t)*.5,o=n*n,l=n*o;return(2*t-2*i+a+r)*l+(-3*t+3*i-2*a-r)*o+a*n+t}function p_(n,e){const t=1-n;return t*t*e}function m_(n,e){return 2*(1-n)*n*e}function g_(n,e){return n*n*e}function Rr(n,e,t,i){return p_(n,e)+m_(n,t)+g_(n,i)}function __(n,e){const t=1-n;return t*t*t*e}function v_(n,e){const t=1-n;return 3*t*t*n*e}function x_(n,e){return 3*(1-n)*n*n*e}function M_(n,e){return n*n*n*e}function Pr(n,e,t,i,s){return __(n,e)+v_(n,t)+x_(n,i)+M_(n,s)}class Fp extends Fn{constructor(e=new te,t=new te,i=new te,s=new te){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=i,this.v3=s}getPoint(e,t=new te){const i=t,s=this.v0,a=this.v1,r=this.v2,o=this.v3;return i.set(Pr(e,s.x,a.x,r.x,o.x),Pr(e,s.y,a.y,r.y,o.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class y_ extends Fn{constructor(e=new C,t=new C,i=new C,s=new C){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=i,this.v3=s}getPoint(e,t=new C){const i=t,s=this.v0,a=this.v1,r=this.v2,o=this.v3;return i.set(Pr(e,s.x,a.x,r.x,o.x),Pr(e,s.y,a.y,r.y,o.y),Pr(e,s.z,a.z,r.z,o.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Op extends Fn{constructor(e=new te,t=new te){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new te){const i=t;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new te){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class S_ extends Fn{constructor(e=new C,t=new C){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new C){const i=t;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new C){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Bp extends Fn{constructor(e=new te,t=new te,i=new te){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=i}getPoint(e,t=new te){const i=t,s=this.v0,a=this.v1,r=this.v2;return i.set(Rr(e,s.x,a.x,r.x),Rr(e,s.y,a.y,r.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class kp extends Fn{constructor(e=new C,t=new C,i=new C){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=i}getPoint(e,t=new C){const i=t,s=this.v0,a=this.v1,r=this.v2;return i.set(Rr(e,s.x,a.x,r.x),Rr(e,s.y,a.y,r.y),Rr(e,s.z,a.z,r.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class zp extends Fn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new te){const i=t,s=this.points,a=(s.length-1)*e,r=Math.floor(a),o=a-r,l=s[r===0?r:r-1],c=s[r],h=s[r>s.length-2?s.length-1:r+1],d=s[r>s.length-3?s.length-1:r+2];return i.set(Td(o,l.x,c.x,h.x,d.x),Td(o,l.y,c.y,h.y,d.y)),i}copy(e){super.copy(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){const s=e.points[t];this.points.push(s.clone())}return this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,i=this.points.length;t<i;t++){const s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){const s=e.points[t];this.points.push(new te().fromArray(s))}return this}}var Ao=Object.freeze({__proto__:null,ArcCurve:f_,CatmullRomCurve3:Hh,CubicBezierCurve:Fp,CubicBezierCurve3:y_,EllipseCurve:kh,LineCurve:Op,LineCurve3:S_,QuadraticBezierCurve:Bp,QuadraticBezierCurve3:kp,SplineCurve:zp});class b_ extends Fn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){const e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){const i=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Ao[i](t,e))}return this}getPoint(e,t){const i=e*this.getLength(),s=this.getCurveLengths();let a=0;for(;a<s.length;){if(s[a]>=i){const r=s[a]-i,o=this.curves[a],l=o.getLength(),c=l===0?0:1-r/l;return o.getPointAt(c,t)}a++}return null}getLength(){const e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const e=[];let t=0;for(let i=0,s=this.curves.length;i<s;i++)t+=this.curves[i].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){const t=[];for(let i=0;i<=e;i++)t.push(this.getPoint(i/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){const t=[];let i;for(let s=0,a=this.curves;s<a.length;s++){const r=a[s],o=r.isEllipseCurve?e*2:r.isLineCurve||r.isLineCurve3?1:r.isSplineCurve?e*r.points.length:e,l=r.getPoints(o);for(let c=0;c<l.length;c++){const h=l[c];i&&i.equals(h)||(t.push(h),i=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,i=e.curves.length;t<i;t++){const s=e.curves[t];this.curves.push(s.clone())}return this.autoClose=e.autoClose,this}toJSON(){const e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,i=this.curves.length;t<i;t++){const s=this.curves[t];e.curves.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,i=e.curves.length;t<i;t++){const s=e.curves[t];this.curves.push(new Ao[s.type]().fromJSON(s))}return this}}class Ed extends b_{constructor(e){super(),this.type="Path",this.currentPoint=new te,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,i=e.length;t<i;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){const i=new Op(this.currentPoint.clone(),new te(e,t));return this.curves.push(i),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,i,s){const a=new Bp(this.currentPoint.clone(),new te(e,t),new te(i,s));return this.curves.push(a),this.currentPoint.set(i,s),this}bezierCurveTo(e,t,i,s,a,r){const o=new Fp(this.currentPoint.clone(),new te(e,t),new te(i,s),new te(a,r));return this.curves.push(o),this.currentPoint.set(a,r),this}splineThru(e){const t=[this.currentPoint.clone()].concat(e),i=new zp(t);return this.curves.push(i),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,i,s,a,r){const o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(e+o,t+l,i,s,a,r),this}absarc(e,t,i,s,a,r){return this.absellipse(e,t,i,i,s,a,r),this}ellipse(e,t,i,s,a,r,o,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+c,t+h,i,s,a,r,o,l),this}absellipse(e,t,i,s,a,r,o,l){const c=new kh(e,t,i,s,a,r,o,l);if(this.curves.length>0){const d=c.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){const e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}}class Hp extends Ed{constructor(e){super(e),this.uuid=ln(),this.type="Shape",this.holes=[]}getPointsHoles(e){const t=[];for(let i=0,s=this.holes.length;i<s;i++)t[i]=this.holes[i].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,i=e.holes.length;t<i;t++){const s=e.holes[t];this.holes.push(s.clone())}return this}toJSON(){const e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,i=this.holes.length;t<i;t++){const s=this.holes[t];e.holes.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,i=e.holes.length;t<i;t++){const s=e.holes[t];this.holes.push(new Ed().fromJSON(s))}return this}}function T_(n,e,t=2){const i=e&&e.length,s=i?e[0]*t:n.length;let a=Vp(n,0,s,t,!0);const r=[];if(!a||a.next===a.prev)return r;let o,l,c;if(i&&(a=P_(n,e,a,t)),n.length>80*t){o=n[0],l=n[1];let h=o,d=l;for(let u=t;u<s;u+=t){const f=n[u],m=n[u+1];f<o&&(o=f),m<l&&(l=m),f>h&&(h=f),m>d&&(d=m)}c=Math.max(h-o,d-l),c=c!==0?32767/c:0}return Br(a,r,t,o,l,c,0),r}function Vp(n,e,t,i,s){let a;if(s===z_(n,e,t,i)>0)for(let r=e;r<t;r+=i)a=wd(r/i|0,n[r],n[r+1],a);else for(let r=t-i;r>=e;r-=i)a=wd(r/i|0,n[r],n[r+1],a);return a&&Os(a,a.next)&&(zr(a),a=a.next),a}function Gi(n,e){if(!n)return n;e||(e=n);let t=n,i;do if(i=!1,!t.steiner&&(Os(t,t.next)||yt(t.prev,t,t.next)===0)){if(zr(t),t=e=t.prev,t===t.next)break;i=!0}else t=t.next;while(i||t!==e);return e}function Br(n,e,t,i,s,a,r){if(!n)return;!r&&a&&D_(n,i,s,a);let o=n;for(;n.prev!==n.next;){const l=n.prev,c=n.next;if(a?w_(n,i,s,a):E_(n)){e.push(l.i,n.i,c.i),zr(n),n=c.next,o=c.next;continue}if(n=c,n===o){r?r===1?(n=A_(Gi(n),e),Br(n,e,t,i,s,a,2)):r===2&&R_(n,e,t,i,s,a):Br(Gi(n),e,t,i,s,a,1);break}}}function E_(n){const e=n.prev,t=n,i=n.next;if(yt(e,t,i)>=0)return!1;const s=e.x,a=t.x,r=i.x,o=e.y,l=t.y,c=i.y,h=Math.min(s,a,r),d=Math.min(o,l,c),u=Math.max(s,a,r),f=Math.max(o,l,c);let m=i.next;for(;m!==e;){if(m.x>=h&&m.x<=u&&m.y>=d&&m.y<=f&&Mr(s,o,a,l,r,c,m.x,m.y)&&yt(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function w_(n,e,t,i){const s=n.prev,a=n,r=n.next;if(yt(s,a,r)>=0)return!1;const o=s.x,l=a.x,c=r.x,h=s.y,d=a.y,u=r.y,f=Math.min(o,l,c),m=Math.min(h,d,u),M=Math.max(o,l,c),p=Math.max(h,d,u),g=th(f,m,e,t,i),y=th(M,p,e,t,i);let S=n.prevZ,x=n.nextZ;for(;S&&S.z>=g&&x&&x.z<=y;){if(S.x>=f&&S.x<=M&&S.y>=m&&S.y<=p&&S!==s&&S!==r&&Mr(o,h,l,d,c,u,S.x,S.y)&&yt(S.prev,S,S.next)>=0||(S=S.prevZ,x.x>=f&&x.x<=M&&x.y>=m&&x.y<=p&&x!==s&&x!==r&&Mr(o,h,l,d,c,u,x.x,x.y)&&yt(x.prev,x,x.next)>=0))return!1;x=x.nextZ}for(;S&&S.z>=g;){if(S.x>=f&&S.x<=M&&S.y>=m&&S.y<=p&&S!==s&&S!==r&&Mr(o,h,l,d,c,u,S.x,S.y)&&yt(S.prev,S,S.next)>=0)return!1;S=S.prevZ}for(;x&&x.z<=y;){if(x.x>=f&&x.x<=M&&x.y>=m&&x.y<=p&&x!==s&&x!==r&&Mr(o,h,l,d,c,u,x.x,x.y)&&yt(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function A_(n,e){let t=n;do{const i=t.prev,s=t.next.next;!Os(i,s)&&Wp(i,t,t.next,s)&&kr(i,s)&&kr(s,i)&&(e.push(i.i,t.i,s.i),zr(t),zr(t.next),t=n=s),t=t.next}while(t!==n);return Gi(t)}function R_(n,e,t,i,s,a){let r=n;do{let o=r.next.next;for(;o!==r.prev;){if(r.i!==o.i&&O_(r,o)){let l=Xp(r,o);r=Gi(r,r.next),l=Gi(l,l.next),Br(r,e,t,i,s,a,0),Br(l,e,t,i,s,a,0);return}o=o.next}r=r.next}while(r!==n)}function P_(n,e,t,i){const s=[];for(let a=0,r=e.length;a<r;a++){const o=e[a]*i,l=a<r-1?e[a+1]*i:n.length,c=Vp(n,o,l,i,!1);c===c.next&&(c.steiner=!0),s.push(F_(c))}s.sort(C_);for(let a=0;a<s.length;a++)t=I_(s[a],t);return t}function C_(n,e){let t=n.x-e.x;if(t===0&&(t=n.y-e.y,t===0)){const i=(n.next.y-n.y)/(n.next.x-n.x),s=(e.next.y-e.y)/(e.next.x-e.x);t=i-s}return t}function I_(n,e){const t=L_(n,e);if(!t)return e;const i=Xp(t,n);return Gi(i,i.next),Gi(t,t.next)}function L_(n,e){let t=e;const i=n.x,s=n.y;let a=-1/0,r;if(Os(n,t))return t;do{if(Os(n,t.next))return t.next;if(s<=t.y&&s>=t.next.y&&t.next.y!==t.y){const d=t.x+(s-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=i&&d>a&&(a=d,r=t.x<t.next.x?t:t.next,d===i))return r}t=t.next}while(t!==e);if(!r)return null;const o=r,l=r.x,c=r.y;let h=1/0;t=r;do{if(i>=t.x&&t.x>=l&&i!==t.x&&Gp(s<c?i:a,s,l,c,s<c?a:i,s,t.x,t.y)){const d=Math.abs(s-t.y)/(i-t.x);kr(t,n)&&(d<h||d===h&&(t.x>r.x||t.x===r.x&&N_(r,t)))&&(r=t,h=d)}t=t.next}while(t!==o);return r}function N_(n,e){return yt(n.prev,n,e.prev)<0&&yt(e.next,n,n.next)<0}function D_(n,e,t,i){let s=n;do s.z===0&&(s.z=th(s.x,s.y,e,t,i)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==n);s.prevZ.nextZ=null,s.prevZ=null,U_(s)}function U_(n){let e,t=1;do{let i=n,s;n=null;let a=null;for(e=0;i;){e++;let r=i,o=0;for(let c=0;c<t&&(o++,r=r.nextZ,!!r);c++);let l=t;for(;o>0||l>0&&r;)o!==0&&(l===0||!r||i.z<=r.z)?(s=i,i=i.nextZ,o--):(s=r,r=r.nextZ,l--),a?a.nextZ=s:n=s,s.prevZ=a,a=s;i=r}a.nextZ=null,t*=2}while(e>1);return n}function th(n,e,t,i,s){return n=(n-t)*s|0,e=(e-i)*s|0,n=(n|n<<8)&16711935,n=(n|n<<4)&252645135,n=(n|n<<2)&858993459,n=(n|n<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,n|e<<1}function F_(n){let e=n,t=n;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==n);return t}function Gp(n,e,t,i,s,a,r,o){return(s-r)*(e-o)>=(n-r)*(a-o)&&(n-r)*(i-o)>=(t-r)*(e-o)&&(t-r)*(a-o)>=(s-r)*(i-o)}function Mr(n,e,t,i,s,a,r,o){return!(n===r&&e===o)&&Gp(n,e,t,i,s,a,r,o)}function O_(n,e){return n.next.i!==e.i&&n.prev.i!==e.i&&!B_(n,e)&&(kr(n,e)&&kr(e,n)&&k_(n,e)&&(yt(n.prev,n,e.prev)||yt(n,e.prev,e))||Os(n,e)&&yt(n.prev,n,n.next)>0&&yt(e.prev,e,e.next)>0)}function yt(n,e,t){return(e.y-n.y)*(t.x-e.x)-(e.x-n.x)*(t.y-e.y)}function Os(n,e){return n.x===e.x&&n.y===e.y}function Wp(n,e,t,i){const s=ka(yt(n,e,t)),a=ka(yt(n,e,i)),r=ka(yt(t,i,n)),o=ka(yt(t,i,e));return!!(s!==a&&r!==o||s===0&&Ba(n,t,e)||a===0&&Ba(n,i,e)||r===0&&Ba(t,n,i)||o===0&&Ba(t,e,i))}function Ba(n,e,t){return e.x<=Math.max(n.x,t.x)&&e.x>=Math.min(n.x,t.x)&&e.y<=Math.max(n.y,t.y)&&e.y>=Math.min(n.y,t.y)}function ka(n){return n>0?1:n<0?-1:0}function B_(n,e){let t=n;do{if(t.i!==n.i&&t.next.i!==n.i&&t.i!==e.i&&t.next.i!==e.i&&Wp(t,t.next,n,e))return!0;t=t.next}while(t!==n);return!1}function kr(n,e){return yt(n.prev,n,n.next)<0?yt(n,e,n.next)>=0&&yt(n,n.prev,e)>=0:yt(n,e,n.prev)<0||yt(n,n.next,e)<0}function k_(n,e){let t=n,i=!1;const s=(n.x+e.x)/2,a=(n.y+e.y)/2;do t.y>a!=t.next.y>a&&t.next.y!==t.y&&s<(t.next.x-t.x)*(a-t.y)/(t.next.y-t.y)+t.x&&(i=!i),t=t.next;while(t!==n);return i}function Xp(n,e){const t=nh(n.i,n.x,n.y),i=nh(e.i,e.x,e.y),s=n.next,a=e.prev;return n.next=e,e.prev=n,t.next=s,s.prev=t,i.next=t,t.prev=i,a.next=i,i.prev=a,i}function wd(n,e,t,i){const s=nh(n,e,t);return i?(s.next=i.next,s.prev=i,i.next.prev=s,i.next=s):(s.prev=s,s.next=s),s}function zr(n){n.next.prev=n.prev,n.prev.next=n.next,n.prevZ&&(n.prevZ.nextZ=n.nextZ),n.nextZ&&(n.nextZ.prevZ=n.prevZ)}function nh(n,e,t){return{i:n,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function z_(n,e,t,i){let s=0;for(let a=e,r=t-i;a<t;a+=i)s+=(n[r]-n[a])*(n[a+1]+n[r+1]),r=a;return s}class H_{static triangulate(e,t,i=2){return T_(e,t,i)}}class qn{static area(e){const t=e.length;let i=0;for(let s=t-1,a=0;a<t;s=a++)i+=e[s].x*e[a].y-e[a].x*e[s].y;return i*.5}static isClockWise(e){return qn.area(e)<0}static triangulateShape(e,t){const i=[],s=[],a=[];Ad(e),Rd(i,e);let r=e.length;t.forEach(Ad);for(let l=0;l<t.length;l++)s.push(r),r+=t[l].length,Rd(i,t[l]);const o=H_.triangulate(i,s);for(let l=0;l<o.length;l+=3)a.push(o.slice(l,l+3));return a}}function Ad(n){const e=n.length;e>2&&n[e-1].equals(n[0])&&n.pop()}function Rd(n,e){for(let t=0;t<e.length;t++)n.push(e[t].x),n.push(e[t].y)}class qp extends mt{constructor(e=new Hp([new te(.5,.5),new te(-.5,.5),new te(-.5,-.5),new te(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];const i=this,s=[],a=[];for(let o=0,l=e.length;o<l;o++){const c=e[o];r(c)}this.setAttribute("position",new Oe(s,3)),this.setAttribute("uv",new Oe(a,2)),this.computeVertexNormals();function r(o){const l=[],c=t.curveSegments!==void 0?t.curveSegments:12,h=t.steps!==void 0?t.steps:1,d=t.depth!==void 0?t.depth:1;let u=t.bevelEnabled!==void 0?t.bevelEnabled:!0,f=t.bevelThickness!==void 0?t.bevelThickness:.2,m=t.bevelSize!==void 0?t.bevelSize:f-.1,M=t.bevelOffset!==void 0?t.bevelOffset:0,p=t.bevelSegments!==void 0?t.bevelSegments:3;const g=t.extrudePath,y=t.UVGenerator!==void 0?t.UVGenerator:V_;let S,x=!1,w,T,A,_;if(g){S=g.getSpacedPoints(h),x=!0,u=!1;const j=g.isCatmullRomCurve3?g.closed:!1;w=g.computeFrenetFrames(h,j),T=new C,A=new C,_=new C}u||(p=0,f=0,m=0,M=0);const E=o.extractPoints(c);let P=E.shape;const I=E.holes;if(!qn.isClockWise(P)){P=P.reverse();for(let j=0,ie=I.length;j<ie;j++){const ne=I[j];qn.isClockWise(ne)&&(I[j]=ne.reverse())}}function G(j){const ne=10000000000000001e-36;let xe=j[0];for(let ge=1;ge<=j.length;ge++){const Be=ge%j.length,Pe=j[Be],We=Pe.x-xe.x,Ye=Pe.y-xe.y,L=We*We+Ye*Ye,ut=Math.max(Math.abs(Pe.x),Math.abs(Pe.y),Math.abs(xe.x),Math.abs(xe.y)),tt=ne*ut*ut;if(L<=tt){j.splice(Be,1),ge--;continue}xe=Pe}}G(P),I.forEach(G);const X=I.length,O=P;for(let j=0;j<X;j++){const ie=I[j];P=P.concat(ie)}function W(j,ie,ne){return ie||ke("ExtrudeGeometry: vec does not exist"),j.clone().addScaledVector(ie,ne)}const H=P.length;function Q(j,ie,ne){let xe,ge,Be;const Pe=j.x-ie.x,We=j.y-ie.y,Ye=ne.x-j.x,L=ne.y-j.y,ut=Pe*Pe+We*We,tt=Pe*L-We*Ye;if(Math.abs(tt)>Number.EPSILON){const R=Math.sqrt(ut),v=Math.sqrt(Ye*Ye+L*L),F=ie.x-We/R,z=ie.y+Pe/R,q=ne.x-L/v,oe=ne.y+Ye/v,ce=((q-F)*L-(oe-z)*Ye)/(Pe*L-We*Ye);xe=F+Pe*ce-j.x,ge=z+We*ce-j.y;const Y=xe*xe+ge*ge;if(Y<=2)return new te(xe,ge);Be=Math.sqrt(Y/2)}else{let R=!1;Pe>Number.EPSILON?Ye>Number.EPSILON&&(R=!0):Pe<-Number.EPSILON?Ye<-Number.EPSILON&&(R=!0):Math.sign(We)===Math.sign(L)&&(R=!0),R?(xe=-We,ge=Pe,Be=Math.sqrt(ut)):(xe=Pe,ge=We,Be=Math.sqrt(ut/2))}return new te(xe/Be,ge/Be)}const $=[];for(let j=0,ie=O.length,ne=ie-1,xe=j+1;j<ie;j++,ne++,xe++)ne===ie&&(ne=0),xe===ie&&(xe=0),$[j]=Q(O[j],O[ne],O[xe]);const se=[];let re,ue=$.concat();for(let j=0,ie=X;j<ie;j++){const ne=I[j];re=[];for(let xe=0,ge=ne.length,Be=ge-1,Pe=xe+1;xe<ge;xe++,Be++,Pe++)Be===ge&&(Be=0),Pe===ge&&(Pe=0),re[xe]=Q(ne[xe],ne[Be],ne[Pe]);se.push(re),ue=ue.concat(re)}let Ve;if(p===0)Ve=qn.triangulateShape(O,I);else{const j=[],ie=[];for(let ne=0;ne<p;ne++){const xe=ne/p,ge=f*Math.cos(xe*Math.PI/2),Be=m*Math.sin(xe*Math.PI/2)+M;for(let Pe=0,We=O.length;Pe<We;Pe++){const Ye=W(O[Pe],$[Pe],Be);Le(Ye.x,Ye.y,-ge),xe===0&&j.push(Ye)}for(let Pe=0,We=X;Pe<We;Pe++){const Ye=I[Pe];re=se[Pe];const L=[];for(let ut=0,tt=Ye.length;ut<tt;ut++){const R=W(Ye[ut],re[ut],Be);Le(R.x,R.y,-ge),xe===0&&L.push(R)}xe===0&&ie.push(L)}}Ve=qn.triangulateShape(j,ie)}const ot=Ve.length,nt=m+M;for(let j=0;j<H;j++){const ie=u?W(P[j],ue[j],nt):P[j];x?(A.copy(w.normals[0]).multiplyScalar(ie.x),T.copy(w.binormals[0]).multiplyScalar(ie.y),_.copy(S[0]).add(A).add(T),Le(_.x,_.y,_.z)):Le(ie.x,ie.y,0)}for(let j=1;j<=h;j++)for(let ie=0;ie<H;ie++){const ne=u?W(P[ie],ue[ie],nt):P[ie];x?(A.copy(w.normals[j]).multiplyScalar(ne.x),T.copy(w.binormals[j]).multiplyScalar(ne.y),_.copy(S[j]).add(A).add(T),Le(_.x,_.y,_.z)):Le(ne.x,ne.y,d/h*j)}for(let j=p-1;j>=0;j--){const ie=j/p,ne=f*Math.cos(ie*Math.PI/2),xe=m*Math.sin(ie*Math.PI/2)+M;for(let ge=0,Be=O.length;ge<Be;ge++){const Pe=W(O[ge],$[ge],xe);Le(Pe.x,Pe.y,d+ne)}for(let ge=0,Be=I.length;ge<Be;ge++){const Pe=I[ge];re=se[ge];for(let We=0,Ye=Pe.length;We<Ye;We++){const L=W(Pe[We],re[We],xe);x?Le(L.x,L.y+S[h-1].y,S[h-1].x+ne):Le(L.x,L.y,d+ne)}}}K(),le();function K(){const j=s.length/3;if(u){let ie=0,ne=H*ie;for(let xe=0;xe<ot;xe++){const ge=Ve[xe];Ge(ge[2]+ne,ge[1]+ne,ge[0]+ne)}ie=h+p*2,ne=H*ie;for(let xe=0;xe<ot;xe++){const ge=Ve[xe];Ge(ge[0]+ne,ge[1]+ne,ge[2]+ne)}}else{for(let ie=0;ie<ot;ie++){const ne=Ve[ie];Ge(ne[2],ne[1],ne[0])}for(let ie=0;ie<ot;ie++){const ne=Ve[ie];Ge(ne[0]+H*h,ne[1]+H*h,ne[2]+H*h)}}i.addGroup(j,s.length/3-j,0)}function le(){const j=s.length/3;let ie=0;ae(O,ie),ie+=O.length;for(let ne=0,xe=I.length;ne<xe;ne++){const ge=I[ne];ae(ge,ie),ie+=ge.length}i.addGroup(j,s.length/3-j,1)}function ae(j,ie){let ne=j.length;for(;--ne>=0;){const xe=ne;let ge=ne-1;ge<0&&(ge=j.length-1);for(let Be=0,Pe=h+p*2;Be<Pe;Be++){const We=H*Be,Ye=H*(Be+1),L=ie+xe+We,ut=ie+ge+We,tt=ie+ge+Ye,R=ie+xe+Ye;Fe(L,ut,tt,R)}}}function Le(j,ie,ne){l.push(j),l.push(ie),l.push(ne)}function Ge(j,ie,ne){rt(j),rt(ie),rt(ne);const xe=s.length/3,ge=y.generateTopUV(i,s,xe-3,xe-2,xe-1);Xe(ge[0]),Xe(ge[1]),Xe(ge[2])}function Fe(j,ie,ne,xe){rt(j),rt(ie),rt(xe),rt(ie),rt(ne),rt(xe);const ge=s.length/3,Be=y.generateSideWallUV(i,s,ge-6,ge-3,ge-2,ge-1);Xe(Be[0]),Xe(Be[1]),Xe(Be[3]),Xe(Be[1]),Xe(Be[2]),Xe(Be[3])}function rt(j){s.push(l[j*3+0]),s.push(l[j*3+1]),s.push(l[j*3+2])}function Xe(j){a.push(j.x),a.push(j.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON(),t=this.parameters.shapes,i=this.parameters.options;return G_(t,i,e)}static fromJSON(e,t){const i=[];for(let a=0,r=e.shapes.length;a<r;a++){const o=t[e.shapes[a]];i.push(o)}const s=e.options.extrudePath;return s!==void 0&&(e.options.extrudePath=new Ao[s.type]().fromJSON(s)),new qp(i,e.options)}}const V_={generateTopUV:function(n,e,t,i,s){const a=e[t*3],r=e[t*3+1],o=e[i*3],l=e[i*3+1],c=e[s*3],h=e[s*3+1];return[new te(a,r),new te(o,l),new te(c,h)]},generateSideWallUV:function(n,e,t,i,s,a){const r=e[t*3],o=e[t*3+1],l=e[t*3+2],c=e[i*3],h=e[i*3+1],d=e[i*3+2],u=e[s*3],f=e[s*3+1],m=e[s*3+2],M=e[a*3],p=e[a*3+1],g=e[a*3+2];return Math.abs(o-h)<Math.abs(r-c)?[new te(r,1-l),new te(c,1-d),new te(u,1-m),new te(M,1-g)]:[new te(o,1-l),new te(h,1-d),new te(f,1-m),new te(p,1-g)]}};function G_(n,e,t){if(t.shapes=[],Array.isArray(n))for(let i=0,s=n.length;i<s;i++){const a=n[i];t.shapes.push(a.uuid)}else t.shapes.push(n.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}class Yp extends Ws{constructor(e=1,t=0){const i=(1+Math.sqrt(5))/2,s=[-1,i,0,1,i,0,-1,-i,0,1,-i,0,0,-1,i,0,1,i,0,-1,-i,0,1,-i,i,0,-1,i,0,1,-i,0,-1,-i,0,1],a=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(s,a,e,t),this.type="IcosahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Yp(e.radius,e.detail)}}class Cr extends mt{constructor(e=[new te(0,-.5),new te(.5,0),new te(0,.5)],t=12,i=0,s=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:i,phiLength:s},t=Math.floor(t),s=Qe(s,0,Math.PI*2);const a=[],r=[],o=[],l=[],c=[],h=1/t,d=new C,u=new te,f=new C,m=new C,M=new C;let p=0,g=0;for(let y=0;y<=e.length-1;y++)switch(y){case 0:p=e[y+1].x-e[y].x,g=e[y+1].y-e[y].y,f.x=g*1,f.y=-p,f.z=g*0,M.copy(f),f.normalize(),l.push(f.x,f.y,f.z);break;case e.length-1:l.push(M.x,M.y,M.z);break;default:p=e[y+1].x-e[y].x,g=e[y+1].y-e[y].y,f.x=g*1,f.y=-p,f.z=g*0,m.copy(f),f.x+=M.x,f.y+=M.y,f.z+=M.z,f.normalize(),l.push(f.x,f.y,f.z),M.copy(m)}for(let y=0;y<=t;y++){const S=i+y*h*s,x=Math.sin(S),w=Math.cos(S);for(let T=0;T<=e.length-1;T++){d.x=e[T].x*x,d.y=e[T].y,d.z=e[T].x*w,r.push(d.x,d.y,d.z),u.x=y/t,u.y=T/(e.length-1),o.push(u.x,u.y);const A=l[3*T+0]*x,_=l[3*T+1],E=l[3*T+0]*w;c.push(A,_,E)}}for(let y=0;y<t;y++)for(let S=0;S<e.length-1;S++){const x=S+y*e.length,w=x,T=x+e.length,A=x+e.length+1,_=x+1;a.push(w,T,_),a.push(A,_,T)}this.setIndex(a),this.setAttribute("position",new Oe(r,3)),this.setAttribute("uv",new Oe(o,2)),this.setAttribute("normal",new Oe(c,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Cr(e.points,e.segments,e.phiStart,e.phiLength)}}class $p extends Ws{constructor(e=1,t=0){const i=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],s=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(i,s,e,t),this.type="OctahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new $p(e.radius,e.detail)}}class qi extends mt{constructor(e=1,t=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:s};const a=e/2,r=t/2,o=Math.floor(i),l=Math.floor(s),c=o+1,h=l+1,d=e/o,u=t/l,f=[],m=[],M=[],p=[];for(let g=0;g<h;g++){const y=g*u-r;for(let S=0;S<c;S++){const x=S*d-a;m.push(x,-y,0),M.push(0,0,1),p.push(S/o),p.push(1-g/l)}}for(let g=0;g<l;g++)for(let y=0;y<o;y++){const S=y+c*g,x=y+c*(g+1),w=y+1+c*(g+1),T=y+1+c*g;f.push(S,x,T),f.push(x,w,T)}this.setIndex(f),this.setAttribute("position",new Oe(m,3)),this.setAttribute("normal",new Oe(M,3)),this.setAttribute("uv",new Oe(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new qi(e.width,e.height,e.widthSegments,e.heightSegments)}}class Vh extends mt{constructor(e=.5,t=1,i=32,s=1,a=0,r=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:i,phiSegments:s,thetaStart:a,thetaLength:r},i=Math.max(3,i),s=Math.max(1,s);const o=[],l=[],c=[],h=[];let d=e;const u=(t-e)/s,f=new C,m=new te;for(let M=0;M<=s;M++){for(let p=0;p<=i;p++){const g=a+p/i*r;f.x=d*Math.cos(g),f.y=d*Math.sin(g),l.push(f.x,f.y,f.z),c.push(0,0,1),m.x=(f.x/t+1)/2,m.y=(f.y/t+1)/2,h.push(m.x,m.y)}d+=u}for(let M=0;M<s;M++){const p=M*(i+1);for(let g=0;g<i;g++){const y=g+p,S=y,x=y+i+1,w=y+i+2,T=y+1;o.push(S,x,T),o.push(x,w,T)}}this.setIndex(o),this.setAttribute("position",new Oe(l,3)),this.setAttribute("normal",new Oe(c,3)),this.setAttribute("uv",new Oe(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Vh(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}}class Kp extends mt{constructor(e=new Hp([new te(0,.5),new te(-.5,-.5),new te(.5,-.5)]),t=12){super(),this.type="ShapeGeometry",this.parameters={shapes:e,curveSegments:t};const i=[],s=[],a=[],r=[];let o=0,l=0;if(Array.isArray(e)===!1)c(e);else for(let h=0;h<e.length;h++)c(e[h]),this.addGroup(o,l,h),o+=l,l=0;this.setIndex(i),this.setAttribute("position",new Oe(s,3)),this.setAttribute("normal",new Oe(a,3)),this.setAttribute("uv",new Oe(r,2));function c(h){const d=s.length/3,u=h.extractPoints(t);let f=u.shape;const m=u.holes;qn.isClockWise(f)===!1&&(f=f.reverse());for(let p=0,g=m.length;p<g;p++){const y=m[p];qn.isClockWise(y)===!0&&(m[p]=y.reverse())}const M=qn.triangulateShape(f,m);for(let p=0,g=m.length;p<g;p++){const y=m[p];f=f.concat(y)}for(let p=0,g=f.length;p<g;p++){const y=f[p];s.push(y.x,y.y,0),a.push(0,0,1),r.push(y.x,y.y)}for(let p=0,g=M.length;p<g;p++){const y=M[p],S=y[0]+d,x=y[1]+d,w=y[2]+d;i.push(S,x,w),l+=3}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON(),t=this.parameters.shapes;return W_(t,e)}static fromJSON(e,t){const i=[];for(let s=0,a=e.shapes.length;s<a;s++){const r=t[e.shapes[s]];i.push(r)}return new Kp(i,e.curveSegments)}}function W_(n,e){if(e.shapes=[],Array.isArray(n))for(let t=0,i=n.length;t<i;t++){const s=n[t];e.shapes.push(s.uuid)}else e.shapes.push(n.uuid);return e}class et extends mt{constructor(e=1,t=32,i=16,s=0,a=Math.PI*2,r=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:i,phiStart:s,phiLength:a,thetaStart:r,thetaLength:o},t=Math.max(3,Math.floor(t)),i=Math.max(2,Math.floor(i));const l=Math.min(r+o,Math.PI);let c=0;const h=[],d=new C,u=new C,f=[],m=[],M=[],p=[];for(let g=0;g<=i;g++){const y=[],S=g/i,x=r+S*o,w=e*Math.cos(x),T=Math.sqrt(e*e-w*w);let A=0;g===0&&r===0?A=.5/t:g===i&&l===Math.PI&&(A=-.5/t);for(let _=0;_<=t;_++){const E=_/t,P=s+E*a;d.x=-T*Math.cos(P),d.y=w,d.z=T*Math.sin(P),m.push(d.x,d.y,d.z),u.copy(d).normalize(),M.push(u.x,u.y,u.z),p.push(E+A,1-S),y.push(c++)}h.push(y)}for(let g=0;g<i;g++)for(let y=0;y<t;y++){const S=h[g][y+1],x=h[g][y],w=h[g+1][y],T=h[g+1][y+1];(g!==0||r>0)&&f.push(S,x,T),(g!==i-1||l<Math.PI)&&f.push(x,w,T)}this.setIndex(f),this.setAttribute("position",new Oe(m,3)),this.setAttribute("normal",new Oe(M,3)),this.setAttribute("uv",new Oe(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new et(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Jp extends Ws{constructor(e=1,t=0){const i=[1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],s=[2,1,0,0,3,2,1,3,0,2,3,1];super(i,s,e,t),this.type="TetrahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Jp(e.radius,e.detail)}}class Ro extends mt{constructor(e=1,t=.4,i=12,s=48,a=Math.PI*2,r=0,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:i,tubularSegments:s,arc:a,thetaStart:r,thetaLength:o},i=Math.floor(i),s=Math.floor(s);const l=[],c=[],h=[],d=[],u=new C,f=new C,m=new C;for(let M=0;M<=i;M++){const p=r+M/i*o;for(let g=0;g<=s;g++){const y=g/s*a;f.x=(e+t*Math.cos(p))*Math.cos(y),f.y=(e+t*Math.cos(p))*Math.sin(y),f.z=t*Math.sin(p),c.push(f.x,f.y,f.z),u.x=e*Math.cos(y),u.y=e*Math.sin(y),m.subVectors(f,u).normalize(),h.push(m.x,m.y,m.z),d.push(g/s),d.push(M/i)}}for(let M=1;M<=i;M++)for(let p=1;p<=s;p++){const g=(s+1)*M+p-1,y=(s+1)*(M-1)+p-1,S=(s+1)*(M-1)+p,x=(s+1)*M+p;l.push(g,y,x),l.push(y,S,x)}this.setIndex(l),this.setAttribute("position",new Oe(c,3)),this.setAttribute("normal",new Oe(h,3)),this.setAttribute("uv",new Oe(d,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ro(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class Wo extends mt{constructor(e=new kp(new C(-1,-1,0),new C(-1,1,0),new C(1,1,0)),t=64,i=1,s=8,a=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:t,radius:i,radialSegments:s,closed:a};const r=e.computeFrenetFrames(t,a);this.tangents=r.tangents,this.normals=r.normals,this.binormals=r.binormals;const o=new C,l=new C,c=new te;let h=new C;const d=[],u=[],f=[],m=[];M(),this.setIndex(m),this.setAttribute("position",new Oe(d,3)),this.setAttribute("normal",new Oe(u,3)),this.setAttribute("uv",new Oe(f,2));function M(){for(let S=0;S<t;S++)p(S);p(a===!1?t:0),y(),g()}function p(S){h=e.getPointAt(S/t,h);const x=r.normals[S],w=r.binormals[S];for(let T=0;T<=s;T++){const A=T/s*Math.PI*2,_=Math.sin(A),E=-Math.cos(A);l.x=E*x.x+_*w.x,l.y=E*x.y+_*w.y,l.z=E*x.z+_*w.z,l.normalize(),u.push(l.x,l.y,l.z),o.x=h.x+i*l.x,o.y=h.y+i*l.y,o.z=h.z+i*l.z,d.push(o.x,o.y,o.z)}}function g(){for(let S=1;S<=t;S++)for(let x=1;x<=s;x++){const w=(s+1)*(S-1)+(x-1),T=(s+1)*S+(x-1),A=(s+1)*S+x,_=(s+1)*(S-1)+x;m.push(w,T,_),m.push(T,A,_)}}function y(){for(let S=0;S<=t;S++)for(let x=0;x<=s;x++)c.x=S/t,c.y=x/s,f.push(c.x,c.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new Wo(new Ao[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}}class sA extends mt{constructor(e=null){if(super(),this.type="WireframeGeometry",this.parameters={geometry:e},e!==null){const t=[],i=new Set,s=new C,a=new C;if(e.index!==null){const r=e.attributes.position,o=e.index;let l=e.groups;l.length===0&&(l=[{start:0,count:o.count,materialIndex:0}]);for(let c=0,h=l.length;c<h;++c){const d=l[c],u=d.start,f=d.count;for(let m=u,M=u+f;m<M;m+=3)for(let p=0;p<3;p++){const g=o.getX(m+p),y=o.getX(m+(p+1)%3);s.fromBufferAttribute(r,g),a.fromBufferAttribute(r,y),Pd(s,a,i)===!0&&(t.push(s.x,s.y,s.z),t.push(a.x,a.y,a.z))}}}else{const r=e.attributes.position;for(let o=0,l=r.count/3;o<l;o++)for(let c=0;c<3;c++){const h=3*o+c,d=3*o+(c+1)%3;s.fromBufferAttribute(r,h),a.fromBufferAttribute(r,d),Pd(s,a,i)===!0&&(t.push(s.x,s.y,s.z),t.push(a.x,a.y,a.z))}}this.setAttribute("position",new Oe(t,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}}function Pd(n,e,t){const i=`${n.x},${n.y},${n.z}-${e.x},${e.y},${e.z}`,s=`${e.x},${e.y},${e.z}-${n.x},${n.y},${n.z}`;return t.has(i)===!0||t.has(s)===!0?!1:(t.add(i),t.add(s),!0)}function Bs(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const s=n[t][i];if(Cd(s))s.isRenderTargetTexture?(Ae("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=s.clone();else if(Array.isArray(s))if(Cd(s[0])){const a=[];for(let r=0,o=s.length;r<o;r++)a[r]=s[r].clone();e[t][i]=a}else e[t][i]=s.slice();else e[t][i]=s}}return e}function Vt(n){const e={};for(let t=0;t<n.length;t++){const i=Bs(n[t]);for(const s in i)e[s]=i[s]}return e}function Cd(n){return n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)}function X_(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function Zp(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:it.workingColorSpace}const q_={clone:Bs,merge:Vt};var Y_=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,$_=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class hn extends bi{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Y_,this.fragmentShader=$_,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Bs(e.uniforms),this.uniformsGroups=X_(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const s in this.uniforms){const r=this.uniforms[s].value;r&&r.isTexture?t.uniforms[s]={type:"t",value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[s]={type:"c",value:r.getHex()}:r&&r.isVector2?t.uniforms[s]={type:"v2",value:r.toArray()}:r&&r.isVector3?t.uniforms[s]={type:"v3",value:r.toArray()}:r&&r.isVector4?t.uniforms[s]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?t.uniforms[s]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?t.uniforms[s]={type:"m4",value:r.toArray()}:t.uniforms[s]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const i in e.uniforms){const s=e.uniforms[i];switch(this.uniforms[i]={},s.type){case"t":this.uniforms[i].value=t[s.value]||null;break;case"c":this.uniforms[i].value=new ze().setHex(s.value);break;case"v2":this.uniforms[i].value=new te().fromArray(s.value);break;case"v3":this.uniforms[i].value=new C().fromArray(s.value);break;case"v4":this.uniforms[i].value=new at().fromArray(s.value);break;case"m3":this.uniforms[i].value=new $e().fromArray(s.value);break;case"m4":this.uniforms[i].value=new qe().fromArray(s.value);break;default:this.uniforms[i].value=s.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const i in e.extensions)this.extensions[i]=e.extensions[i];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class K_ extends hn{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class qt extends bi{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new ze(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new ze(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Qc,this.normalScale=new te(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new vn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class rA extends qt{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new te(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Qe(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new ze(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new ze(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new ze(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class J_ extends bi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=lg,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Z_ extends bi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class aA extends Bh{constructor(e){super(),this.isLineDashedMaterial=!0,this.type="LineDashedMaterial",this.scale=1,this.dashSize=3,this.gapSize=1,this.setValues(e)}copy(e){return super.copy(e),this.scale=e.scale,this.dashSize=e.dashSize,this.gapSize=e.gapSize,this}}function za(n,e){return!n||n.constructor===e?n:typeof e.BYTES_PER_ELEMENT=="number"?new e(n):Array.prototype.slice.call(n)}function Q_(n){function e(s,a){return n[s]-n[a]}const t=n.length,i=new Array(t);for(let s=0;s!==t;++s)i[s]=s;return i.sort(e),i}function Id(n,e,t){const i=n.length,s=new n.constructor(i);for(let a=0,r=0;r!==i;++a){const o=t[a]*e;for(let l=0;l!==e;++l)s[r++]=n[o+l]}return s}function j_(n,e,t,i){let s=1,a=n[0];for(;a!==void 0&&a[i]===void 0;)a=n[s++];if(a===void 0)return;let r=a[i];if(r!==void 0)if(Array.isArray(r))do r=a[i],r!==void 0&&(e.push(a.time),t.push(...r)),a=n[s++];while(a!==void 0);else if(r.toArray!==void 0)do r=a[i],r!==void 0&&(e.push(a.time),r.toArray(t,t.length)),a=n[s++];while(a!==void 0);else do r=a[i],r!==void 0&&(e.push(a.time),t.push(r)),a=n[s++];while(a!==void 0)}class Qr{constructor(e,t,i,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(i),this.sampleValues=t,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let i=this._cachedIndex,s=t[i],a=t[i-1];n:{e:{let r;t:{i:if(!(e<s)){for(let o=i+2;;){if(s===void 0){if(e<a)break i;return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===o)break;if(a=s,s=t[++i],e<s)break e}r=t.length;break t}if(!(e>=a)){const o=t[1];e<o&&(i=2,a=o);for(let l=i-2;;){if(a===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===l)break;if(s=a,a=t[--i-1],e>=a)break e}r=i,i=0;break t}break n}for(;i<r;){const o=i+r>>>1;e<t[o]?r=o:i=o+1}if(s=t[i],a=t[i-1],a===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,a,s)}return this.interpolate_(i,a,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,i=this.sampleValues,s=this.valueSize,a=e*s;for(let r=0;r!==s;++r)t[r]=i[a+r];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}}class ev extends Qr{constructor(e,t,i,s){super(e,t,i,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:ku,endingEnd:ku}}intervalChanged_(e,t,i){const s=this.parameterPositions;let a=e-2,r=e+1,o=s[a],l=s[r];if(o===void 0)switch(this.getSettings_().endingStart){case zu:a=e,o=2*t-i;break;case Hu:a=s.length-2,o=t+s[a]-s[a+1];break;default:a=e,o=i}if(l===void 0)switch(this.getSettings_().endingEnd){case zu:r=e,l=2*i-t;break;case Hu:r=1,l=i+s[1]-s[0];break;default:r=e-1,l=t}const c=(i-t)*.5,h=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-i),this._offsetPrev=a*h,this._offsetNext=r*h}interpolate_(e,t,i,s){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,f=this._weightNext,m=(i-t)/(s-t),M=m*m,p=M*m,g=-u*p+2*u*M-u*m,y=(1+u)*p+(-1.5-2*u)*M+(-.5+u)*m+1,S=(-1-f)*p+(1.5+f)*M+.5*m,x=f*p-f*M;for(let w=0;w!==o;++w)a[w]=g*r[h+w]+y*r[c+w]+S*r[l+w]+x*r[d+w];return a}}class tv extends Qr{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e,t,i,s){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=(i-t)/(s-t),d=1-h;for(let u=0;u!==o;++u)a[u]=r[c+u]*d+r[l+u]*h;return a}}class nv extends Qr{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e){return this.copySampleValue_(e-1)}}class iv extends Qr{interpolate_(e,t,i,s){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=this.inTangents,d=this.outTangents;if(!h||!d){const m=(i-t)/(s-t),M=1-m;for(let p=0;p!==o;++p)a[p]=r[c+p]*M+r[l+p]*m;return a}const u=o*2,f=e-1;for(let m=0;m!==o;++m){const M=r[c+m],p=r[l+m],g=f*u+m*2,y=d[g],S=d[g+1],x=e*u+m*2,w=h[x],T=h[x+1];let A=(i-t)/(s-t),_,E,P,I,N;for(let G=0;G<8;G++){_=A*A,E=_*A,P=1-A,I=P*P,N=I*P;const O=N*t+3*I*A*y+3*P*_*w+E*s-i;if(Math.abs(O)<1e-10)break;const W=3*I*(y-t)+6*P*A*(w-y)+3*_*(s-w);if(Math.abs(W)<1e-10)break;A=A-O/W,A=Math.max(0,Math.min(1,A))}a[m]=N*M+3*I*A*S+3*P*_*T+E*p}return a}}class xn{constructor(e,t,i,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=za(t,this.TimeBufferType),this.values=za(i,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let i;if(t.toJSON!==this.toJSON)i=t.toJSON(e);else{i={name:e.name,times:za(e.times,Array),values:za(e.values,Array)};const s=e.getInterpolation();s!==e.DefaultInterpolation&&(i.interpolation=s)}return i.type=e.ValueTypeName,i}InterpolantFactoryMethodDiscrete(e){return new nv(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new tv(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new ev(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){const t=new iv(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case Mo:t=this.InterpolantFactoryMethodDiscrete;break;case Zc:t=this.InterpolantFactoryMethodLinear;break;case il:t=this.InterpolantFactoryMethodSmooth;break;case Bu:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){const i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return Ae("KeyframeTrack:",i),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Mo;case this.InterpolantFactoryMethodLinear:return Zc;case this.InterpolantFactoryMethodSmooth:return il;case this.InterpolantFactoryMethodBezier:return Bu}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let i=0,s=t.length;i!==s;++i)t[i]+=e}return this}scale(e){if(e!==1){const t=this.times;for(let i=0,s=t.length;i!==s;++i)t[i]*=e}return this}trim(e,t){const i=this.times,s=i.length;let a=0,r=s-1;for(;a!==s&&i[a]<e;)++a;for(;r!==-1&&i[r]>t;)--r;if(++r,a!==0||r!==s){a>=r&&(r=Math.max(r,1),a=r-1);const o=this.getValueSize();this.times=i.slice(a,r),this.values=this.values.slice(a*o,r*o)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(ke("KeyframeTrack: Invalid value size in track.",this),e=!1);const i=this.times,s=this.values,a=i.length;a===0&&(ke("KeyframeTrack: Track is empty.",this),e=!1);let r=null;for(let o=0;o!==a;o++){const l=i[o];if(typeof l=="number"&&isNaN(l)){ke("KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(r!==null&&r>l){ke("KeyframeTrack: Out of order keys.",this,o,l,r),e=!1;break}r=l}if(s!==void 0&&_g(s))for(let o=0,l=s.length;o!==l;++o){const c=s[o];if(isNaN(c)){ke("KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),i=this.getValueSize(),s=this.getInterpolation()===il,a=e.length-1;let r=1;for(let o=1;o<a;++o){let l=!1;const c=e[o],h=e[o+1];if(c!==h&&(o!==1||c!==e[0]))if(s)l=!0;else{const d=o*i,u=d-i,f=d+i;for(let m=0;m!==i;++m){const M=t[d+m];if(M!==t[u+m]||M!==t[f+m]){l=!0;break}}}if(l){if(o!==r){e[r]=e[o];const d=o*i,u=r*i;for(let f=0;f!==i;++f)t[u+f]=t[d+f]}++r}}if(a>0){e[r]=e[a];for(let o=a*i,l=r*i,c=0;c!==i;++c)t[l+c]=t[o+c];++r}return r!==e.length?(this.times=e.slice(0,r),this.values=t.slice(0,r*i)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),i=this.constructor,s=new i(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}}xn.prototype.ValueTypeName="";xn.prototype.TimeBufferType=Float32Array;xn.prototype.ValueBufferType=Float32Array;xn.prototype.DefaultInterpolation=Zc;class Xs extends xn{constructor(e,t,i){super(e,t,i)}}Xs.prototype.ValueTypeName="bool";Xs.prototype.ValueBufferType=Array;Xs.prototype.DefaultInterpolation=Mo;Xs.prototype.InterpolantFactoryMethodLinear=void 0;Xs.prototype.InterpolantFactoryMethodSmooth=void 0;class Qp extends xn{constructor(e,t,i,s){super(e,t,i,s)}}Qp.prototype.ValueTypeName="color";class Gh extends xn{constructor(e,t,i,s){super(e,t,i,s)}}Gh.prototype.ValueTypeName="number";class sv extends Qr{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e,t,i,s){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=(i-t)/(s-t);let c=e*o;for(let h=c+o;c!==h;c+=4)$t.slerpFlat(a,0,r,c-o,r,c,l);return a}}class Wh extends xn{constructor(e,t,i,s){super(e,t,i,s)}InterpolantFactoryMethodLinear(e){return new sv(this.times,this.values,this.getValueSize(),e)}}Wh.prototype.ValueTypeName="quaternion";Wh.prototype.InterpolantFactoryMethodSmooth=void 0;class qs extends xn{constructor(e,t,i){super(e,t,i)}}qs.prototype.ValueTypeName="string";qs.prototype.ValueBufferType=Array;qs.prototype.DefaultInterpolation=Mo;qs.prototype.InterpolantFactoryMethodLinear=void 0;qs.prototype.InterpolantFactoryMethodSmooth=void 0;class jp extends xn{constructor(e,t,i,s){super(e,t,i,s)}}jp.prototype.ValueTypeName="vector";class oA{constructor(e="",t=-1,i=[],s=og){this.name=e,this.tracks=i,this.duration=t,this.blendMode=s,this.uuid=ln(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){const t=[],i=e.tracks,s=1/(e.fps||1);for(let r=0,o=i.length;r!==o;++r)t.push(av(i[r]).scale(s));const a=new this(e.name,e.duration,t,e.blendMode);return a.uuid=e.uuid,a.userData=JSON.parse(e.userData||"{}"),a}static toJSON(e){const t=[],i=e.tracks,s={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let a=0,r=i.length;a!==r;++a)t.push(xn.toJSON(i[a]));return s}static CreateFromMorphTargetSequence(e,t,i,s){const a=t.length,r=[];for(let o=0;o<a;o++){let l=[],c=[];l.push((o+a-1)%a,o,(o+1)%a),c.push(0,1,0);const h=Q_(l);l=Id(l,1,h),c=Id(c,1,h),!s&&l[0]===0&&(l.push(a),c.push(c[0])),r.push(new Gh(".morphTargetInfluences["+t[o].name+"]",l,c).scale(1/i))}return new this(e,-1,r)}static findByName(e,t){let i=e;if(!Array.isArray(e)){const s=e;i=s.geometry&&s.geometry.animations||s.animations}for(let s=0;s<i.length;s++)if(i[s].name===t)return i[s];return null}static CreateClipsFromMorphTargetSequences(e,t,i){const s={},a=/^([\w-]*?)([\d]+)$/;for(let o=0,l=e.length;o<l;o++){const c=e[o],h=c.name.match(a);if(h&&h.length>1){const d=h[1];let u=s[d];u||(s[d]=u=[]),u.push(c)}}const r=[];for(const o in s)r.push(this.CreateFromMorphTargetSequence(o,s[o],t,i));return r}resetDuration(){const e=this.tracks;let t=0;for(let i=0,s=e.length;i!==s;++i){const a=this.tracks[i];t=Math.max(t,a.times[a.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let i=0;i<this.tracks.length;i++)e.push(this.tracks[i].clone());const t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}}function rv(n){switch(n.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return Gh;case"vector":case"vector2":case"vector3":case"vector4":return jp;case"color":return Qp;case"quaternion":return Wh;case"bool":case"boolean":return Xs;case"string":return qs}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+n)}function av(n){if(n.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=rv(n.type);if(n.times===void 0){const t=[],i=[];j_(n.keys,t,i,"value"),n.times=t,n.values=i}return e.parse!==void 0?e.parse(n):new e(n.name,n.times,n.values,n.interpolation)}const Yn={enabled:!1,files:{},add:function(n,e){this.enabled!==!1&&(Ld(n)||(this.files[n]=e))},get:function(n){if(this.enabled!==!1&&!Ld(n))return this.files[n]},remove:function(n){delete this.files[n]},clear:function(){this.files={}}};function Ld(n){try{const e=n.slice(n.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class ov{constructor(e,t,i){const s=this;let a=!1,r=0,o=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=i,this._abortController=null,this.itemStart=function(h){o++,a===!1&&s.onStart!==void 0&&s.onStart(h,r,o),a=!0},this.itemEnd=function(h){r++,s.onProgress!==void 0&&s.onProgress(h,r,o),r===o&&(a=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,d){return c.push(h,d),this},this.removeHandler=function(h){const d=c.indexOf(h);return d!==-1&&c.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=c.length;d<u;d+=2){const f=c[d],m=c[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const lv=new ov;class jr{constructor(e){this.manager=e!==void 0?e:lv,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const i=this;return new Promise(function(s,a){i.load(e,s,t,a)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}jr.DEFAULT_MATERIAL_NAME="__DEFAULT";const Vn={};class cv extends Error{constructor(e,t){super(e),this.response=t}}class lA extends jr{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,i,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=Yn.get(`file:${e}`);if(a!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(a),this.manager.itemEnd(e)},0);return}if(Vn[e]!==void 0){Vn[e].push({onLoad:t,onProgress:i,onError:s});return}Vn[e]=[],Vn[e].push({onLoad:t,onProgress:i,onError:s});const r=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),o=this.mimeType,l=this.responseType;fetch(r).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&Ae("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;const h=Vn[e],d=c.body.getReader(),u=c.headers.get("X-File-Size")||c.headers.get("Content-Length"),f=u?parseInt(u):0,m=f!==0;let M=0;const p=new ReadableStream({start(g){y();function y(){d.read().then(({done:S,value:x})=>{if(S)g.close();else{M+=x.byteLength;const w=new ProgressEvent("progress",{lengthComputable:m,loaded:M,total:f});for(let T=0,A=h.length;T<A;T++){const _=h[T];_.onProgress&&_.onProgress(w)}g.enqueue(x),y()}},S=>{g.error(S)})}}});return new Response(p)}else throw new cv(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(h=>new DOMParser().parseFromString(h,o));case"json":return c.json();default:if(o==="")return c.text();{const d=/charset="?([^;"\s]*)"?/i.exec(o),u=d&&d[1]?d[1].toLowerCase():void 0,f=new TextDecoder(u);return c.arrayBuffer().then(m=>f.decode(m))}}}).then(c=>{Yn.add(`file:${e}`,c);const h=Vn[e];delete Vn[e];for(let d=0,u=h.length;d<u;d++){const f=h[d];f.onLoad&&f.onLoad(c)}}).catch(c=>{const h=Vn[e];if(h===void 0)throw this.manager.itemError(e),c;delete Vn[e];for(let d=0,u=h.length;d<u;d++){const f=h[d];f.onError&&f.onError(c)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const ds=new WeakMap;class hv extends jr{constructor(e){super(e)}load(e,t,i,s){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=this,r=Yn.get(`image:${e}`);if(r!==void 0){if(r.complete===!0)a.manager.itemStart(e),setTimeout(function(){t&&t(r),a.manager.itemEnd(e)},0);else{let d=ds.get(r);d===void 0&&(d=[],ds.set(r,d)),d.push({onLoad:t,onError:s})}return r}const o=Or("img");function l(){h(),t&&t(this);const d=ds.get(this)||[];for(let u=0;u<d.length;u++){const f=d[u];f.onLoad&&f.onLoad(this)}ds.delete(this),a.manager.itemEnd(e)}function c(d){h(),s&&s(d),Yn.remove(`image:${e}`);const u=ds.get(this)||[];for(let f=0;f<u.length;f++){const m=u[f];m.onError&&m.onError(d)}ds.delete(this),a.manager.itemError(e),a.manager.itemEnd(e)}function h(){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1)}return o.addEventListener("load",l,!1),o.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),Yn.add(`image:${e}`,o),a.manager.itemStart(e),o.src=e,o}}class cA extends jr{constructor(e){super(e)}load(e,t,i,s){const a=new Ut,r=new hv(this.manager);return r.setCrossOrigin(this.crossOrigin),r.setPath(this.path),r.load(e,function(o){a.image=o,a.needsUpdate=!0,t!==void 0&&t(a)},i,s),a}}class ea extends pt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new ze(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class uv extends ea{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(pt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new ze(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Dl=new qe,Nd=new C,Dd=new C;class Xh{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new te(512,512),this.mapType=jt,this.map=null,this.mapPass=null,this.matrix=new qe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Vo,this._frameExtents=new te(1,1),this._viewportCount=1,this._viewports=[new at(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;Nd.setFromMatrixPosition(e.matrixWorld),t.position.copy(Nd),Dd.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Dd),t.updateMatrixWorld(),Dl.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Dl,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===Fr||t.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Dl)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Ha=new C,Va=new $t,Tn=new C;class em extends pt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new qe,this.projectionMatrix=new qe,this.projectionMatrixInverse=new qe,this.coordinateSystem=Cn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Ha,Va,Tn),Tn.x===1&&Tn.y===1&&Tn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ha,Va,Tn.set(1,1,1)).invert()}updateWorldMatrix(e,t,i=!1){super.updateWorldMatrix(e,t,i),this.matrixWorld.decompose(Ha,Va,Tn),Tn.x===1&&Tn.y===1&&Tn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ha,Va,Tn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const di=new C,Ud=new te,Fd=new te;class Wt extends em{constructor(e=50,t=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Us*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Rs*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Us*2*Math.atan(Math.tan(Rs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){di.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(di.x,di.y).multiplyScalar(-e/di.z),di.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(di.x,di.y).multiplyScalar(-e/di.z)}getViewSize(e,t){return this.getViewBounds(e,Ud,Fd),t.subVectors(Fd,Ud)}setViewOffset(e,t,i,s,a,r){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=a,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Rs*.5*this.fov)/this.zoom,i=2*t,s=this.aspect*i,a=-.5*s;const r=this.view;if(this.view!==null&&this.view.enabled){const l=r.fullWidth,c=r.fullHeight;a+=r.offsetX*s/l,t-=r.offsetY*i/c,s*=r.width/l,i*=r.height/c}const o=this.filmOffset;o!==0&&(a+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(a,a+s,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class dv extends Xh{constructor(){super(new Wt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,i=Us*2*e.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,a=e.distance||t.far;(i!==t.fov||s!==t.aspect||a!==t.far)&&(t.fov=i,t.aspect=s,t.far=a,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}class hA extends ea{constructor(e,t,i=0,s=Math.PI/3,a=0,r=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(pt.DEFAULT_UP),this.updateMatrix(),this.target=new pt,this.distance=i,this.angle=s,this.penumbra=a,this.decay=r,this.map=null,this.shadow=new dv}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}}class fv extends Xh{constructor(){super(new Wt(90,1,.5,500)),this.isPointLightShadow=!0}}class uA extends ea{constructor(e,t,i=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=s,this.shadow=new fv}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}}class qh extends em{constructor(e=-1,t=1,i=1,s=-1,a=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=s,this.near=a,this.far=r,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,s,a,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=a,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let a=i-e,r=i+e,o=s+t,l=s-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;a+=c*this.view.offsetX,r=a+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(a,r,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class pv extends Xh{constructor(){super(new qh(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Od extends ea{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(pt.DEFAULT_UP),this.updateMatrix(),this.target=new pt,this.shadow=new pv}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class dA extends ea{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class fA{static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}}const Ul=new WeakMap;class pA extends jr{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&Ae("ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&Ae("ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,i,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=this,r=Yn.get(`image-bitmap:${e}`);if(r!==void 0){if(a.manager.itemStart(e),r.then){r.then(c=>{Ul.has(r)===!0?(s&&s(Ul.get(r)),a.manager.itemError(e),a.manager.itemEnd(e)):(t&&t(c),a.manager.itemEnd(e))});return}setTimeout(function(){t&&t(r),a.manager.itemEnd(e)},0);return}const o={};o.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",o.headers=this.requestHeader,o.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;const l=fetch(e,o).then(function(c){return c.blob()}).then(function(c){return createImageBitmap(c,Object.assign(a.options,{colorSpaceConversion:"none"}))}).then(function(c){Yn.add(`image-bitmap:${e}`,c),t&&t(c),a.manager.itemEnd(e)}).catch(function(c){s&&s(c),Ul.set(l,c),Yn.remove(`image-bitmap:${e}`),a.manager.itemError(e),a.manager.itemEnd(e)});Yn.add(`image-bitmap:${e}`,l),a.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const fs=-90,ps=1;class mv extends pt{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new Wt(fs,ps,e,t);s.layers=this.layers,this.add(s);const a=new Wt(fs,ps,e,t);a.layers=this.layers,this.add(a);const r=new Wt(fs,ps,e,t);r.layers=this.layers,this.add(r);const o=new Wt(fs,ps,e,t);o.layers=this.layers,this.add(o);const l=new Wt(fs,ps,e,t);l.layers=this.layers,this.add(l);const c=new Wt(fs,ps,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,s,a,r,o,l]=t;for(const c of t)this.remove(c);if(e===Cn)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),a.up.set(0,0,-1),a.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Fr)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),a.up.set(0,0,1),a.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[a,r,o,l,c,h]=this.children,d=e.getRenderTarget(),u=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;const M=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(i,0,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(i,1,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(i,2,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(i,3,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(i,4,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),i.texture.generateMipmaps=M,e.setRenderTarget(i,5,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(d,u,f),e.xr.enabled=m,i.texture.needsPMREMUpdate=!0}}class tm extends Wt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}const Yh="\\[\\]\\.:\\/",gv=new RegExp("["+Yh+"]","g"),$h="[^"+Yh+"]",_v="[^"+Yh.replace("\\.","")+"]",vv=/((?:WC+[\/:])*)/.source.replace("WC",$h),xv=/(WCOD+)?/.source.replace("WCOD",_v),Mv=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",$h),yv=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",$h),Sv=new RegExp("^"+vv+xv+Mv+yv+"$"),bv=["material","materials","bones","map"];class Tv{constructor(e,t,i){const s=i||ft.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();const i=this._targetGroup.nCachedObjects_,s=this._bindings[i];s!==void 0&&s.getValue(e,t)}setValue(e,t){const i=this._bindings;for(let s=this._targetGroup.nCachedObjects_,a=i.length;s!==a;++s)i[s].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].unbind()}}class ft{constructor(e,t,i){this.path=t,this.parsedPath=i||ft.parseTrackName(t),this.node=ft.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,i){return e&&e.isAnimationObjectGroup?new ft.Composite(e,t,i):new ft(e,t,i)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(gv,"")}static parseTrackName(e){const t=Sv.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);const i={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=i.nodeName&&i.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){const a=i.nodeName.substring(s+1);bv.indexOf(a)!==-1&&(i.nodeName=i.nodeName.substring(0,s),i.objectName=a)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return i}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const i=e.skeleton.getBoneByName(t);if(i!==void 0)return i}if(e.children){const i=function(a){for(let r=0;r<a.length;r++){const o=a[r];if(o.name===t||o.uuid===t)return o;const l=i(o.children);if(l)return l}return null},s=i(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const i=this.resolvedProperty;for(let s=0,a=i.length;s!==a;++s)e[t++]=i[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const i=this.resolvedProperty;for(let s=0,a=i.length;s!==a;++s)i[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const i=this.resolvedProperty;for(let s=0,a=i.length;s!==a;++s)i[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const i=this.resolvedProperty;for(let s=0,a=i.length;s!==a;++s)i[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,i=t.objectName,s=t.propertyName;let a=t.propertyIndex;if(e||(e=ft.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Ae("PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=t.objectIndex;switch(i){case"materials":if(!e.material){ke("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){ke("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){ke("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){ke("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){ke("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[i]===void 0){ke("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[i]}if(c!==void 0){if(e[c]===void 0){ke("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}const r=e[s];if(r===void 0){const c=t.nodeName;ke("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(a!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){ke("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){ke("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[a]!==void 0&&(a=e.morphTargetDictionary[a])}l=this.BindingType.ArrayElement,this.resolvedProperty=r,this.propertyIndex=a}else r.fromArray!==void 0&&r.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=r):Array.isArray(r)?(l=this.BindingType.EntireArray,this.resolvedProperty=r):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}ft.Composite=Tv;ft.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};ft.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};ft.prototype.GetterByBindingType=[ft.prototype._getValue_direct,ft.prototype._getValue_array,ft.prototype._getValue_arrayElement,ft.prototype._getValue_toArray];ft.prototype.SetterByBindingTypeAndVersioning=[[ft.prototype._setValue_direct,ft.prototype._setValue_direct_setNeedsUpdate,ft.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ft.prototype._setValue_array,ft.prototype._setValue_array_setNeedsUpdate,ft.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ft.prototype._setValue_arrayElement,ft.prototype._setValue_arrayElement_setNeedsUpdate,ft.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ft.prototype._setValue_fromArray,ft.prototype._setValue_fromArray_setNeedsUpdate,ft.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];const Bd=new qe;class mA{constructor(e,t,i=0,s=1/0){this.ray=new $r(e,t),this.near=i,this.far=s,this.camera=null,this.layers=new Nh,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):ke("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Bd.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Bd),this}intersectObject(e,t=!0,i=[]){return ih(e,this,i,t),i.sort(kd),i}intersectObjects(e,t=!0,i=[]){for(let s=0,a=e.length;s<a;s++)ih(e[s],this,i,t);return i.sort(kd),i}}function kd(n,e){return n.distance-e.distance}function ih(n,e,t,i){let s=!0;if(n.layers.test(e.layers)&&n.raycast(e,t)===!1&&(s=!1),s===!0&&i===!0){const a=n.children;for(let r=0,o=a.length;r<o;r++)ih(a[r],e,t,!0)}}class gA{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,Ae("Clock: This module has been deprecated. Please use THREE.Timer instead.")}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}class nm{static{nm.prototype.isMatrix2=!0}constructor(e,t,i,s){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,i,s)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let i=0;i<4;i++)this.elements[i]=e[i+t];return this}set(e,t,i,s){const a=this.elements;return a[0]=e,a[2]=t,a[1]=i,a[3]=s,this}}class _A extends h_{constructor(e=10,t=10,i=4473924,s=8947848){i=new ze(i),s=new ze(s);const a=t/2,r=e/t,o=e/2,l=[],c=[];for(let u=0,f=0,m=-o;u<=t;u++,m+=r){l.push(-o,0,m,o,0,m),l.push(m,0,-o,m,0,o);const M=u===a?i:s;M.toArray(c,f),f+=3,M.toArray(c,f),f+=3,M.toArray(c,f),f+=3,M.toArray(c,f),f+=3}const h=new mt;h.setAttribute("position",new Oe(l,3)),h.setAttribute("color",new Oe(c,3));const d=new Bh({vertexColors:!0,toneMapped:!1});super(h,d),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}function zd(n,e,t,i){const s=Ev(i);switch(t){case yp:return n*e;case Eh:return n*e/s.components*s.byteLength;case wh:return n*e/s.components*s.byteLength;case Vi:return n*e*2/s.components*s.byteLength;case Ah:return n*e*2/s.components*s.byteLength;case Sp:return n*e*3/s.components*s.byteLength;case on:return n*e*4/s.components*s.byteLength;case Rh:return n*e*4/s.components*s.byteLength;case to:case no:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case io:case so:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Sc:case Tc:return Math.max(n,16)*Math.max(e,8)/4;case yc:case bc:return Math.max(n,8)*Math.max(e,8)/2;case Ec:case wc:case Rc:case Pc:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case Ac:case vo:case Cc:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Ic:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Lc:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case Nc:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case Dc:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case Uc:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case Fc:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case Oc:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case Bc:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case kc:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case zc:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case Hc:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case Vc:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case Gc:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case Wc:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case Xc:case qc:case Yc:return Math.ceil(n/4)*Math.ceil(e/4)*16;case $c:case Kc:return Math.ceil(n/4)*Math.ceil(e/4)*8;case xo:case Jc:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Ev(n){switch(n){case jt:case _p:return{byteLength:1,components:1};case Dr:case vp:case Un:return{byteLength:2,components:1};case bh:case Th:return{byteLength:2,components:4};case Dn:case Sh:case an:return{byteLength:4,components:1};case xp:case Mp:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:yh}}));typeof window<"u"&&(window.__THREE__?Ae("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=yh);function im(){let n=null,e=!1,t=null,i=null;function s(a,r){t(a,r),i=n.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&n!==null&&(i=n.requestAnimationFrame(s),e=!0)},stop:function(){n!==null&&n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(a){t=a},setContext:function(a){n=a}}}function wv(n){const e=new WeakMap;function t(o,l){const c=o.array,h=o.usage,d=c.byteLength,u=n.createBuffer();n.bindBuffer(l,u),n.bufferData(l,c,h),o.onUploadCallback();let f;if(c instanceof Float32Array)f=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=n.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?f=n.HALF_FLOAT:f=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=n.SHORT;else if(c instanceof Uint32Array)f=n.UNSIGNED_INT;else if(c instanceof Int32Array)f=n.INT;else if(c instanceof Int8Array)f=n.BYTE;else if(c instanceof Uint8Array)f=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:d}}function i(o,l,c){const h=l.array,d=l.updateRanges;if(n.bindBuffer(c,o),d.length===0)n.bufferSubData(c,0,h);else{d.sort((f,m)=>f.start-m.start);let u=0;for(let f=1;f<d.length;f++){const m=d[u],M=d[f];M.start<=m.start+m.count+1?m.count=Math.max(m.count,M.start+M.count-m.start):(++u,d[u]=M)}d.length=u+1;for(let f=0,m=d.length;f<m;f++){const M=d[f];n.bufferSubData(c,M.start*h.BYTES_PER_ELEMENT,h,M.start,M.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function a(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=e.get(o);l&&(n.deleteBuffer(l.buffer),e.delete(o))}function r(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,o,l),c.version=o.version}}return{get:s,remove:a,update:r}}var Av=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Rv=`#ifdef USE_ALPHAHASH
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
#endif`,Pv=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Cv=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Iv=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Lv=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Nv=`#ifdef USE_AOMAP
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
#endif`,Dv=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Uv=`#ifdef USE_BATCHING
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
#endif`,Fv=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Ov=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Bv=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,kv=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,zv=`#ifdef USE_IRIDESCENCE
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
#endif`,Hv=`#ifdef USE_BUMPMAP
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
#endif`,Vv=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Gv=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Wv=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Xv=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,qv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Yv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,$v=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Kv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,Jv=`#define PI 3.141592653589793
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
} // validated`,Zv=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Qv=`vec3 transformedNormal = objectNormal;
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
#endif`,jv=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,ex=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,tx=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,nx=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,ix="gl_FragColor = linearToOutputTexel( gl_FragColor );",sx=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,rx=`#ifdef USE_ENVMAP
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
#endif`,ax=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,ox=`#ifdef USE_ENVMAP
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
#endif`,lx=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,cx=`#ifdef USE_ENVMAP
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
#endif`,hx=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,ux=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,dx=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fx=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,px=`#ifdef USE_GRADIENTMAP
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
}`,mx=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,gx=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,_x=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,vx=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,xx=`#ifdef USE_ENVMAP
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
#endif`,Mx=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,yx=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Sx=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,bx=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Tx=`PhysicalMaterial material;
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
#endif`,Ex=`uniform sampler2D dfgLUT;
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
}`,wx=`
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
#endif`,Ax=`#if defined( RE_IndirectDiffuse )
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
#endif`,Rx=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Px=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,Cx=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Ix=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Lx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Nx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Dx=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Ux=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Fx=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Ox=`#if defined( USE_POINTS_UV )
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
#endif`,Bx=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,kx=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,zx=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Hx=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Vx=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Gx=`#ifdef USE_MORPHTARGETS
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
#endif`,Wx=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Xx=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,qx=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Yx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,$x=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Kx=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Jx=`#ifdef USE_NORMALMAP
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
#endif`,Zx=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Qx=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,jx=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,eM=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,tM=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,nM=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,iM=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,sM=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,rM=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,aM=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,oM=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,lM=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,cM=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,hM=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,uM=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,dM=`float getShadowMask() {
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
}`,fM=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,pM=`#ifdef USE_SKINNING
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
#endif`,mM=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,gM=`#ifdef USE_SKINNING
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
#endif`,_M=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,vM=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,xM=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,MM=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,yM=`#ifdef USE_TRANSMISSION
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
#endif`,SM=`#ifdef USE_TRANSMISSION
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
#endif`,bM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,TM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,EM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,wM=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const AM=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,RM=`uniform sampler2D t2D;
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
}`,PM=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,CM=`#ifdef ENVMAP_TYPE_CUBE
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
}`,IM=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,LM=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,NM=`#include <common>
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
}`,DM=`#if DEPTH_PACKING == 3200
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
}`,UM=`#define DISTANCE
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
}`,FM=`#define DISTANCE
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
}`,OM=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,BM=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,kM=`uniform float scale;
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
}`,zM=`uniform vec3 diffuse;
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
}`,HM=`#include <common>
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
}`,VM=`uniform vec3 diffuse;
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
}`,GM=`#define LAMBERT
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
}`,WM=`#define LAMBERT
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
}`,XM=`#define MATCAP
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
}`,qM=`#define MATCAP
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
}`,YM=`#define NORMAL
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
}`,$M=`#define NORMAL
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
}`,KM=`#define PHONG
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
}`,JM=`#define PHONG
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
}`,ZM=`#define STANDARD
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
}`,QM=`#define STANDARD
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
}`,jM=`#define TOON
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
}`,ey=`#define TOON
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
}`,ty=`uniform float size;
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
}`,ny=`uniform vec3 diffuse;
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
}`,iy=`#include <common>
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
}`,sy=`uniform vec3 color;
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
}`,ry=`uniform float rotation;
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
}`,ay=`uniform vec3 diffuse;
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
}`,Ze={alphahash_fragment:Av,alphahash_pars_fragment:Rv,alphamap_fragment:Pv,alphamap_pars_fragment:Cv,alphatest_fragment:Iv,alphatest_pars_fragment:Lv,aomap_fragment:Nv,aomap_pars_fragment:Dv,batching_pars_vertex:Uv,batching_vertex:Fv,begin_vertex:Ov,beginnormal_vertex:Bv,bsdfs:kv,iridescence_fragment:zv,bumpmap_pars_fragment:Hv,clipping_planes_fragment:Vv,clipping_planes_pars_fragment:Gv,clipping_planes_pars_vertex:Wv,clipping_planes_vertex:Xv,color_fragment:qv,color_pars_fragment:Yv,color_pars_vertex:$v,color_vertex:Kv,common:Jv,cube_uv_reflection_fragment:Zv,defaultnormal_vertex:Qv,displacementmap_pars_vertex:jv,displacementmap_vertex:ex,emissivemap_fragment:tx,emissivemap_pars_fragment:nx,colorspace_fragment:ix,colorspace_pars_fragment:sx,envmap_fragment:rx,envmap_common_pars_fragment:ax,envmap_pars_fragment:ox,envmap_pars_vertex:lx,envmap_physical_pars_fragment:xx,envmap_vertex:cx,fog_vertex:hx,fog_pars_vertex:ux,fog_fragment:dx,fog_pars_fragment:fx,gradientmap_pars_fragment:px,lightmap_pars_fragment:mx,lights_lambert_fragment:gx,lights_lambert_pars_fragment:_x,lights_pars_begin:vx,lights_toon_fragment:Mx,lights_toon_pars_fragment:yx,lights_phong_fragment:Sx,lights_phong_pars_fragment:bx,lights_physical_fragment:Tx,lights_physical_pars_fragment:Ex,lights_fragment_begin:wx,lights_fragment_maps:Ax,lights_fragment_end:Rx,lightprobes_pars_fragment:Px,logdepthbuf_fragment:Cx,logdepthbuf_pars_fragment:Ix,logdepthbuf_pars_vertex:Lx,logdepthbuf_vertex:Nx,map_fragment:Dx,map_pars_fragment:Ux,map_particle_fragment:Fx,map_particle_pars_fragment:Ox,metalnessmap_fragment:Bx,metalnessmap_pars_fragment:kx,morphinstance_vertex:zx,morphcolor_vertex:Hx,morphnormal_vertex:Vx,morphtarget_pars_vertex:Gx,morphtarget_vertex:Wx,normal_fragment_begin:Xx,normal_fragment_maps:qx,normal_pars_fragment:Yx,normal_pars_vertex:$x,normal_vertex:Kx,normalmap_pars_fragment:Jx,clearcoat_normal_fragment_begin:Zx,clearcoat_normal_fragment_maps:Qx,clearcoat_pars_fragment:jx,iridescence_pars_fragment:eM,opaque_fragment:tM,packing:nM,premultiplied_alpha_fragment:iM,project_vertex:sM,dithering_fragment:rM,dithering_pars_fragment:aM,roughnessmap_fragment:oM,roughnessmap_pars_fragment:lM,shadowmap_pars_fragment:cM,shadowmap_pars_vertex:hM,shadowmap_vertex:uM,shadowmask_pars_fragment:dM,skinbase_vertex:fM,skinning_pars_vertex:pM,skinning_vertex:mM,skinnormal_vertex:gM,specularmap_fragment:_M,specularmap_pars_fragment:vM,tonemapping_fragment:xM,tonemapping_pars_fragment:MM,transmission_fragment:yM,transmission_pars_fragment:SM,uv_pars_fragment:bM,uv_pars_vertex:TM,uv_vertex:EM,worldpos_vertex:wM,background_vert:AM,background_frag:RM,backgroundCube_vert:PM,backgroundCube_frag:CM,cube_vert:IM,cube_frag:LM,depth_vert:NM,depth_frag:DM,distance_vert:UM,distance_frag:FM,equirect_vert:OM,equirect_frag:BM,linedashed_vert:kM,linedashed_frag:zM,meshbasic_vert:HM,meshbasic_frag:VM,meshlambert_vert:GM,meshlambert_frag:WM,meshmatcap_vert:XM,meshmatcap_frag:qM,meshnormal_vert:YM,meshnormal_frag:$M,meshphong_vert:KM,meshphong_frag:JM,meshphysical_vert:ZM,meshphysical_frag:QM,meshtoon_vert:jM,meshtoon_frag:ey,points_vert:ty,points_frag:ny,shadow_vert:iy,shadow_frag:sy,sprite_vert:ry,sprite_frag:ay},ve={common:{diffuse:{value:new ze(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new $e},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new $e}},envmap:{envMap:{value:null},envMapRotation:{value:new $e},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new $e}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new $e}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new $e},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new $e},normalScale:{value:new te(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new $e},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new $e}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new $e}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new $e}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new ze(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new C},probesMax:{value:new C},probesResolution:{value:new C}},points:{diffuse:{value:new ze(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0},uvTransform:{value:new $e}},sprite:{diffuse:{value:new ze(16777215)},opacity:{value:1},center:{value:new te(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new $e},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0}}},wn={basic:{uniforms:Vt([ve.common,ve.specularmap,ve.envmap,ve.aomap,ve.lightmap,ve.fog]),vertexShader:Ze.meshbasic_vert,fragmentShader:Ze.meshbasic_frag},lambert:{uniforms:Vt([ve.common,ve.specularmap,ve.envmap,ve.aomap,ve.lightmap,ve.emissivemap,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.fog,ve.lights,{emissive:{value:new ze(0)},envMapIntensity:{value:1}}]),vertexShader:Ze.meshlambert_vert,fragmentShader:Ze.meshlambert_frag},phong:{uniforms:Vt([ve.common,ve.specularmap,ve.envmap,ve.aomap,ve.lightmap,ve.emissivemap,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.fog,ve.lights,{emissive:{value:new ze(0)},specular:{value:new ze(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Ze.meshphong_vert,fragmentShader:Ze.meshphong_frag},standard:{uniforms:Vt([ve.common,ve.envmap,ve.aomap,ve.lightmap,ve.emissivemap,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.roughnessmap,ve.metalnessmap,ve.fog,ve.lights,{emissive:{value:new ze(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ze.meshphysical_vert,fragmentShader:Ze.meshphysical_frag},toon:{uniforms:Vt([ve.common,ve.aomap,ve.lightmap,ve.emissivemap,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.gradientmap,ve.fog,ve.lights,{emissive:{value:new ze(0)}}]),vertexShader:Ze.meshtoon_vert,fragmentShader:Ze.meshtoon_frag},matcap:{uniforms:Vt([ve.common,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.fog,{matcap:{value:null}}]),vertexShader:Ze.meshmatcap_vert,fragmentShader:Ze.meshmatcap_frag},points:{uniforms:Vt([ve.points,ve.fog]),vertexShader:Ze.points_vert,fragmentShader:Ze.points_frag},dashed:{uniforms:Vt([ve.common,ve.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ze.linedashed_vert,fragmentShader:Ze.linedashed_frag},depth:{uniforms:Vt([ve.common,ve.displacementmap]),vertexShader:Ze.depth_vert,fragmentShader:Ze.depth_frag},normal:{uniforms:Vt([ve.common,ve.bumpmap,ve.normalmap,ve.displacementmap,{opacity:{value:1}}]),vertexShader:Ze.meshnormal_vert,fragmentShader:Ze.meshnormal_frag},sprite:{uniforms:Vt([ve.sprite,ve.fog]),vertexShader:Ze.sprite_vert,fragmentShader:Ze.sprite_frag},background:{uniforms:{uvTransform:{value:new $e},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ze.background_vert,fragmentShader:Ze.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new $e}},vertexShader:Ze.backgroundCube_vert,fragmentShader:Ze.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ze.cube_vert,fragmentShader:Ze.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ze.equirect_vert,fragmentShader:Ze.equirect_frag},distance:{uniforms:Vt([ve.common,ve.displacementmap,{referencePosition:{value:new C},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ze.distance_vert,fragmentShader:Ze.distance_frag},shadow:{uniforms:Vt([ve.lights,ve.fog,{color:{value:new ze(0)},opacity:{value:1}}]),vertexShader:Ze.shadow_vert,fragmentShader:Ze.shadow_frag}};wn.physical={uniforms:Vt([wn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new $e},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new $e},clearcoatNormalScale:{value:new te(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new $e},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new $e},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new $e},sheen:{value:0},sheenColor:{value:new ze(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new $e},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new $e},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new $e},transmissionSamplerSize:{value:new te},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new $e},attenuationDistance:{value:0},attenuationColor:{value:new ze(0)},specularColor:{value:new ze(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new $e},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new $e},anisotropyVector:{value:new te},anisotropyMap:{value:null},anisotropyMapTransform:{value:new $e}}]),vertexShader:Ze.meshphysical_vert,fragmentShader:Ze.meshphysical_frag};const Ga={r:0,b:0,g:0},oy=new qe,sm=new $e;sm.set(-1,0,0,0,1,0,0,0,1);function ly(n,e,t,i,s,a){const r=new ze(0);let o=s===!0?0:1,l,c,h=null,d=0,u=null;function f(y){let S=y.isScene===!0?y.background:null;if(S&&S.isTexture){const x=y.backgroundBlurriness>0;S=e.get(S,x)}return S}function m(y){let S=!1;const x=f(y);x===null?p(r,o):x&&x.isColor&&(p(x,1),S=!0);const w=n.xr.getEnvironmentBlendMode();w==="additive"?t.buffers.color.setClear(0,0,0,1,a):w==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,a),(n.autoClear||S)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function M(y,S){const x=f(S);x&&(x.isCubeTexture||x.mapping===Ho)?(c===void 0&&(c=new he(new Ln(1,1,1),new hn({name:"BackgroundCubeMaterial",uniforms:Bs(wn.backgroundCube.uniforms),vertexShader:wn.backgroundCube.vertexShader,fragmentShader:wn.backgroundCube.fragmentShader,side:Xt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(w,T,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(c)),c.material.uniforms.envMap.value=x,c.material.uniforms.backgroundBlurriness.value=S.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(oy.makeRotationFromEuler(S.backgroundRotation)).transpose(),x.isCubeTexture&&x.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(sm),c.material.toneMapped=it.getTransfer(x.colorSpace)!==ct,(h!==x||d!==x.version||u!==n.toneMapping)&&(c.material.needsUpdate=!0,h=x,d=x.version,u=n.toneMapping),c.layers.enableAll(),y.unshift(c,c.geometry,c.material,0,0,null)):x&&x.isTexture&&(l===void 0&&(l=new he(new qi(2,2),new hn({name:"BackgroundMaterial",uniforms:Bs(wn.background.uniforms),vertexShader:wn.background.vertexShader,fragmentShader:wn.background.fragmentShader,side:yi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=x,l.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,l.material.toneMapped=it.getTransfer(x.colorSpace)!==ct,x.matrixAutoUpdate===!0&&x.updateMatrix(),l.material.uniforms.uvTransform.value.copy(x.matrix),(h!==x||d!==x.version||u!==n.toneMapping)&&(l.material.needsUpdate=!0,h=x,d=x.version,u=n.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function p(y,S){y.getRGB(Ga,Zp(n)),t.buffers.color.setClear(Ga.r,Ga.g,Ga.b,S,a)}function g(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return r},setClearColor:function(y,S=1){r.set(y),o=S,p(r,o)},getClearAlpha:function(){return o},setClearAlpha:function(y){o=y,p(r,o)},render:m,addToRenderList:M,dispose:g}}function cy(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=u(null);let a=s,r=!1;function o(I,N,G,X,O){let W=!1;const H=d(I,X,G,N);a!==H&&(a=H,c(a.object)),W=f(I,X,G,O),W&&m(I,X,G,O),O!==null&&e.update(O,n.ELEMENT_ARRAY_BUFFER),(W||r)&&(r=!1,x(I,N,G,X),O!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(O).buffer))}function l(){return n.createVertexArray()}function c(I){return n.bindVertexArray(I)}function h(I){return n.deleteVertexArray(I)}function d(I,N,G,X){const O=X.wireframe===!0;let W=i[N.id];W===void 0&&(W={},i[N.id]=W);const H=I.isInstancedMesh===!0?I.id:0;let Q=W[H];Q===void 0&&(Q={},W[H]=Q);let $=Q[G.id];$===void 0&&($={},Q[G.id]=$);let se=$[O];return se===void 0&&(se=u(l()),$[O]=se),se}function u(I){const N=[],G=[],X=[];for(let O=0;O<t;O++)N[O]=0,G[O]=0,X[O]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:N,enabledAttributes:G,attributeDivisors:X,object:I,attributes:{},index:null}}function f(I,N,G,X){const O=a.attributes,W=N.attributes;let H=0;const Q=G.getAttributes();for(const $ in Q)if(Q[$].location>=0){const re=O[$];let ue=W[$];if(ue===void 0&&($==="instanceMatrix"&&I.instanceMatrix&&(ue=I.instanceMatrix),$==="instanceColor"&&I.instanceColor&&(ue=I.instanceColor)),re===void 0||re.attribute!==ue||ue&&re.data!==ue.data)return!0;H++}return a.attributesNum!==H||a.index!==X}function m(I,N,G,X){const O={},W=N.attributes;let H=0;const Q=G.getAttributes();for(const $ in Q)if(Q[$].location>=0){let re=W[$];re===void 0&&($==="instanceMatrix"&&I.instanceMatrix&&(re=I.instanceMatrix),$==="instanceColor"&&I.instanceColor&&(re=I.instanceColor));const ue={};ue.attribute=re,re&&re.data&&(ue.data=re.data),O[$]=ue,H++}a.attributes=O,a.attributesNum=H,a.index=X}function M(){const I=a.newAttributes;for(let N=0,G=I.length;N<G;N++)I[N]=0}function p(I){g(I,0)}function g(I,N){const G=a.newAttributes,X=a.enabledAttributes,O=a.attributeDivisors;G[I]=1,X[I]===0&&(n.enableVertexAttribArray(I),X[I]=1),O[I]!==N&&(n.vertexAttribDivisor(I,N),O[I]=N)}function y(){const I=a.newAttributes,N=a.enabledAttributes;for(let G=0,X=N.length;G<X;G++)N[G]!==I[G]&&(n.disableVertexAttribArray(G),N[G]=0)}function S(I,N,G,X,O,W,H){H===!0?n.vertexAttribIPointer(I,N,G,O,W):n.vertexAttribPointer(I,N,G,X,O,W)}function x(I,N,G,X){M();const O=X.attributes,W=G.getAttributes(),H=N.defaultAttributeValues;for(const Q in W){const $=W[Q];if($.location>=0){let se=O[Q];if(se===void 0&&(Q==="instanceMatrix"&&I.instanceMatrix&&(se=I.instanceMatrix),Q==="instanceColor"&&I.instanceColor&&(se=I.instanceColor)),se!==void 0){const re=se.normalized,ue=se.itemSize,Ve=e.get(se);if(Ve===void 0)continue;const ot=Ve.buffer,nt=Ve.type,K=Ve.bytesPerElement,le=nt===n.INT||nt===n.UNSIGNED_INT||se.gpuType===Sh;if(se.isInterleavedBufferAttribute){const ae=se.data,Le=ae.stride,Ge=se.offset;if(ae.isInstancedInterleavedBuffer){for(let Fe=0;Fe<$.locationSize;Fe++)g($.location+Fe,ae.meshPerAttribute);I.isInstancedMesh!==!0&&X._maxInstanceCount===void 0&&(X._maxInstanceCount=ae.meshPerAttribute*ae.count)}else for(let Fe=0;Fe<$.locationSize;Fe++)p($.location+Fe);n.bindBuffer(n.ARRAY_BUFFER,ot);for(let Fe=0;Fe<$.locationSize;Fe++)S($.location+Fe,ue/$.locationSize,nt,re,Le*K,(Ge+ue/$.locationSize*Fe)*K,le)}else{if(se.isInstancedBufferAttribute){for(let ae=0;ae<$.locationSize;ae++)g($.location+ae,se.meshPerAttribute);I.isInstancedMesh!==!0&&X._maxInstanceCount===void 0&&(X._maxInstanceCount=se.meshPerAttribute*se.count)}else for(let ae=0;ae<$.locationSize;ae++)p($.location+ae);n.bindBuffer(n.ARRAY_BUFFER,ot);for(let ae=0;ae<$.locationSize;ae++)S($.location+ae,ue/$.locationSize,nt,re,ue*K,ue/$.locationSize*ae*K,le)}}else if(H!==void 0){const re=H[Q];if(re!==void 0)switch(re.length){case 2:n.vertexAttrib2fv($.location,re);break;case 3:n.vertexAttrib3fv($.location,re);break;case 4:n.vertexAttrib4fv($.location,re);break;default:n.vertexAttrib1fv($.location,re)}}}}y()}function w(){E();for(const I in i){const N=i[I];for(const G in N){const X=N[G];for(const O in X){const W=X[O];for(const H in W)h(W[H].object),delete W[H];delete X[O]}}delete i[I]}}function T(I){if(i[I.id]===void 0)return;const N=i[I.id];for(const G in N){const X=N[G];for(const O in X){const W=X[O];for(const H in W)h(W[H].object),delete W[H];delete X[O]}}delete i[I.id]}function A(I){for(const N in i){const G=i[N];for(const X in G){const O=G[X];if(O[I.id]===void 0)continue;const W=O[I.id];for(const H in W)h(W[H].object),delete W[H];delete O[I.id]}}}function _(I){for(const N in i){const G=i[N],X=I.isInstancedMesh===!0?I.id:0,O=G[X];if(O!==void 0){for(const W in O){const H=O[W];for(const Q in H)h(H[Q].object),delete H[Q];delete O[W]}delete G[X],Object.keys(G).length===0&&delete i[N]}}}function E(){P(),r=!0,a!==s&&(a=s,c(a.object))}function P(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:E,resetDefaultState:P,dispose:w,releaseStatesOfGeometry:T,releaseStatesOfObject:_,releaseStatesOfProgram:A,initAttributes:M,enableAttribute:p,disableUnusedAttributes:y}}function hy(n,e,t){let i;function s(l){i=l}function a(l,c){n.drawArrays(i,l,c),t.update(c,i,1)}function r(l,c,h){h!==0&&(n.drawArraysInstanced(i,l,c,h),t.update(c,i,h))}function o(l,c,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,c,0,h);let u=0;for(let f=0;f<h;f++)u+=c[f];t.update(u,i,1)}this.setMode=s,this.render=a,this.renderInstances=r,this.renderMultiDraw=o}function uy(n,e,t,i){let s;function a(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){const A=e.get("EXT_texture_filter_anisotropic");s=n.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function r(A){return!(A!==on&&i.convert(A)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(A){const _=A===Un&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(A!==jt&&i.convert(A)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==an&&!_)}function l(A){if(A==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const h=l(c);h!==c&&(Ae("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const d=t.logarithmicDepthBuffer===!0,u=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&u===!1&&Ae("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const f=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),m=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),M=n.getParameter(n.MAX_TEXTURE_SIZE),p=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),g=n.getParameter(n.MAX_VERTEX_ATTRIBS),y=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),S=n.getParameter(n.MAX_VARYING_VECTORS),x=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),w=n.getParameter(n.MAX_SAMPLES),T=n.getParameter(n.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:l,textureFormatReadable:r,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:m,maxTextureSize:M,maxCubemapSize:p,maxAttributes:g,maxVertexUniforms:y,maxVaryings:S,maxFragmentUniforms:x,maxSamples:w,samples:T}}function dy(n){const e=this;let t=null,i=0,s=!1,a=!1;const r=new gi,o=new $e,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const f=d.length!==0||u||i!==0||s;return s=u,i=d.length,f},this.beginShadows=function(){a=!0,h(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(d,u){t=h(d,u,0)},this.setState=function(d,u,f){const m=d.clippingPlanes,M=d.clipIntersection,p=d.clipShadows,g=n.get(d);if(!s||m===null||m.length===0||a&&!p)a?h(null):c();else{const y=a?0:i,S=y*4;let x=g.clippingState||null;l.value=x,x=h(m,u,S,f);for(let w=0;w!==S;++w)x[w]=t[w];g.clippingState=x,this.numIntersection=M?this.numPlanes:0,this.numPlanes+=y}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function h(d,u,f,m){const M=d!==null?d.length:0;let p=null;if(M!==0){if(p=l.value,m!==!0||p===null){const g=f+M*4,y=u.matrixWorldInverse;o.getNormalMatrix(y),(p===null||p.length<g)&&(p=new Float32Array(g));for(let S=0,x=f;S!==M;++S,x+=4)r.copy(d[S]).applyMatrix4(y,o),r.normal.toArray(p,x),p[x+3]=r.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=M,e.numIntersection=0,p}}const Mi=4,Hd=[.125,.215,.35,.446,.526,.582],Di=20,fy=256,ar=new qh,Vd=new ze;let Fl=null,Ol=0,Bl=0,kl=!1;const py=new C;class Gd{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,i=.1,s=100,a={}){const{size:r=256,position:o=py}=a;Fl=this._renderer.getRenderTarget(),Ol=this._renderer.getActiveCubeFace(),Bl=this._renderer.getActiveMipmapLevel(),kl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(r);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,i,s,l,o),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=qd(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Xd(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Fl,Ol,Bl),this._renderer.xr.enabled=kl,e.scissorTest=!1,ms(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===zi||e.mapping===Ds?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Fl=this._renderer.getRenderTarget(),Ol=this._renderer.getActiveCubeFace(),Bl=this._renderer.getActiveMipmapLevel(),kl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Ct,minFilter:Ct,generateMipmaps:!1,type:Un,format:on,colorSpace:yo,depthBuffer:!1},s=Wd(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Wd(e,t,i);const{_lodMax:a}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=my(a)),this._blurMaterial=_y(a,e,t),this._ggxMaterial=gy(a,e,t)}return s}_compileMaterial(e){const t=new he(new mt,e);this._renderer.compile(t,ar)}_sceneToCubeUV(e,t,i,s,a){const l=new Wt(90,1,t,i),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,f=d.toneMapping;d.getClearColor(Vd),d.toneMapping=In,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(s),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new he(new Ln,new Kr({name:"PMREM.Background",side:Xt,depthWrite:!1,depthTest:!1})));const M=this._backgroundBox,p=M.material;let g=!1;const y=e.background;y?y.isColor&&(p.color.copy(y),e.background=null,g=!0):(p.color.copy(Vd),g=!0);for(let S=0;S<6;S++){const x=S%3;x===0?(l.up.set(0,c[S],0),l.position.set(a.x,a.y,a.z),l.lookAt(a.x+h[S],a.y,a.z)):x===1?(l.up.set(0,0,c[S]),l.position.set(a.x,a.y,a.z),l.lookAt(a.x,a.y+h[S],a.z)):(l.up.set(0,c[S],0),l.position.set(a.x,a.y,a.z),l.lookAt(a.x,a.y,a.z+h[S]));const w=this._cubeSize;ms(s,x*w,S>2?w:0,w,w),d.setRenderTarget(s),g&&d.render(M,l),d.render(e,l)}d.toneMapping=f,d.autoClear=u,e.background=y}_textureToCubeUV(e,t){const i=this._renderer,s=e.mapping===zi||e.mapping===Ds;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=qd()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Xd());const a=s?this._cubemapMaterial:this._equirectMaterial,r=this._lodMeshes[0];r.material=a;const o=a.uniforms;o.envMap.value=e;const l=this._cubeSize;ms(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(r,ar)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const s=this._lodMeshes.length;for(let a=1;a<s;a++)this._applyGGXFilter(e,a-1,a);t.autoClear=i}_applyGGXFilter(e,t,i){const s=this._renderer,a=this._pingPongRenderTarget,r=this._ggxMaterial,o=this._lodMeshes[i];o.material=r;const l=r.uniforms,c=i/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),d=Math.sqrt(c*c-h*h),u=0+c*1.25,f=d*u,{_lodMax:m}=this,M=this._sizeLods[i],p=3*M*(i>m-Mi?i-m+Mi:0),g=4*(this._cubeSize-M);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=m-t,ms(a,p,g,3*M,2*M),s.setRenderTarget(a),s.render(o,ar),l.envMap.value=a.texture,l.roughness.value=0,l.mipInt.value=m-i,ms(e,p,g,3*M,2*M),s.setRenderTarget(e),s.render(o,ar)}_blur(e,t,i,s,a){const r=this._pingPongRenderTarget;this._halfBlur(e,r,t,i,s,"latitudinal",a),this._halfBlur(r,e,i,i,s,"longitudinal",a)}_halfBlur(e,t,i,s,a,r,o){const l=this._renderer,c=this._blurMaterial;r!=="latitudinal"&&r!=="longitudinal"&&ke("blur direction must be either latitudinal or longitudinal!");const h=3,d=this._lodMeshes[s];d.material=c;const u=c.uniforms,f=this._sizeLods[i]-1,m=isFinite(a)?Math.PI/(2*f):2*Math.PI/(2*Di-1),M=a/m,p=isFinite(a)?1+Math.floor(h*M):Di;p>Di&&Ae(`sigmaRadians, ${a}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${Di}`);const g=[];let y=0;for(let A=0;A<Di;++A){const _=A/M,E=Math.exp(-_*_/2);g.push(E),A===0?y+=E:A<p&&(y+=2*E)}for(let A=0;A<g.length;A++)g[A]=g[A]/y;u.envMap.value=e.texture,u.samples.value=p,u.weights.value=g,u.latitudinal.value=r==="latitudinal",o&&(u.poleAxis.value=o);const{_lodMax:S}=this;u.dTheta.value=m,u.mipInt.value=S-i;const x=this._sizeLods[s],w=3*x*(s>S-Mi?s-S+Mi:0),T=4*(this._cubeSize-x);ms(t,w,T,3*x,2*x),l.setRenderTarget(t),l.render(d,ar)}}function my(n){const e=[],t=[],i=[];let s=n;const a=n-Mi+1+Hd.length;for(let r=0;r<a;r++){const o=Math.pow(2,s);e.push(o);let l=1/o;r>n-Mi?l=Hd[r-n+Mi-1]:r===0&&(l=0),t.push(l);const c=1/(o-2),h=-c,d=1+c,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,m=6,M=3,p=2,g=1,y=new Float32Array(M*m*f),S=new Float32Array(p*m*f),x=new Float32Array(g*m*f);for(let T=0;T<f;T++){const A=T%3*2/3-1,_=T>2?0:-1,E=[A,_,0,A+2/3,_,0,A+2/3,_+1,0,A,_,0,A+2/3,_+1,0,A,_+1,0];y.set(E,M*m*T),S.set(u,p*m*T);const P=[T,T,T,T,T,T];x.set(P,g*m*T)}const w=new mt;w.setAttribute("position",new cn(y,M)),w.setAttribute("uv",new cn(S,p)),w.setAttribute("faceIndex",new cn(x,g)),i.push(new he(w,null)),s>Mi&&s--}return{lodMeshes:i,sizeLods:e,sigmas:t}}function Wd(n,e,t){const i=new _n(n,e,t);return i.texture.mapping=Ho,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function ms(n,e,t,i,s){n.viewport.set(e,t,i,s),n.scissor.set(e,t,i,s)}function gy(n,e,t){return new hn({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:fy,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Xo(),fragmentShader:`

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
		`,blending:$n,depthTest:!1,depthWrite:!1})}function _y(n,e,t){const i=new Float32Array(Di),s=new C(0,1,0);return new hn({name:"SphericalGaussianBlur",defines:{n:Di,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Xo(),fragmentShader:`

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
		`,blending:$n,depthTest:!1,depthWrite:!1})}function Xd(){return new hn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Xo(),fragmentShader:`

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
		`,blending:$n,depthTest:!1,depthWrite:!1})}function qd(){return new hn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Xo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:$n,depthTest:!1,depthWrite:!1})}function Xo(){return`

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
	`}class rm extends _n{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},s=[i,i,i,i,i,i];this.texture=new Lp(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new Ln(5,5,5),a=new hn({name:"CubemapFromEquirect",uniforms:Bs(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Xt,blending:$n});a.uniforms.tEquirect.value=t;const r=new he(s,a),o=t.minFilter;return t.minFilter===xi&&(t.minFilter=Ct),new mv(1,10,this).update(e,r),t.minFilter=o,r.geometry.dispose(),r.material.dispose(),this}clear(e,t=!0,i=!0,s=!0){const a=e.getRenderTarget();for(let r=0;r<6;r++)e.setRenderTarget(this,r),e.clear(t,i,s);e.setRenderTarget(a)}}function vy(n){let e=new WeakMap,t=new WeakMap,i=null;function s(u,f=!1){return u==null?null:f?r(u):a(u)}function a(u){if(u&&u.isTexture){const f=u.mapping;if(f===el||f===tl)if(e.has(u)){const m=e.get(u).texture;return o(m,u.mapping)}else{const m=u.image;if(m&&m.height>0){const M=new rm(m.height);return M.fromEquirectangularTexture(n,u),e.set(u,M),u.addEventListener("dispose",c),o(M.texture,u.mapping)}else return null}}return u}function r(u){if(u&&u.isTexture){const f=u.mapping,m=f===el||f===tl,M=f===zi||f===Ds;if(m||M){let p=t.get(u);const g=p!==void 0?p.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==g)return i===null&&(i=new Gd(n)),p=m?i.fromEquirectangular(u,p):i.fromCubemap(u,p),p.texture.pmremVersion=u.pmremVersion,t.set(u,p),p.texture;if(p!==void 0)return p.texture;{const y=u.image;return m&&y&&y.height>0||M&&y&&l(y)?(i===null&&(i=new Gd(n)),p=m?i.fromEquirectangular(u):i.fromCubemap(u),p.texture.pmremVersion=u.pmremVersion,t.set(u,p),u.addEventListener("dispose",h),p.texture):null}}}return u}function o(u,f){return f===el?u.mapping=zi:f===tl&&(u.mapping=Ds),u}function l(u){let f=0;const m=6;for(let M=0;M<m;M++)u[M]!==void 0&&f++;return f===m}function c(u){const f=u.target;f.removeEventListener("dispose",c);const m=e.get(f);m!==void 0&&(e.delete(f),m.dispose())}function h(u){const f=u.target;f.removeEventListener("dispose",h);const m=t.get(f);m!==void 0&&(t.delete(f),m.dispose())}function d(){e=new WeakMap,t=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:s,dispose:d}}function xy(n){const e={};function t(i){if(e[i]!==void 0)return e[i];const s=n.getExtension(i);return e[i]=s,s}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const s=t(i);return s===null&&As("WebGLRenderer: "+i+" extension not supported."),s}}}function My(n,e,t,i){const s={},a=new WeakMap;function r(d){const u=d.target;u.index!==null&&e.remove(u.index);for(const m in u.attributes)e.remove(u.attributes[m]);u.removeEventListener("dispose",r),delete s[u.id];const f=a.get(u);f&&(e.remove(f),a.delete(u)),i.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,t.memory.geometries--}function o(d,u){return s[u.id]===!0||(u.addEventListener("dispose",r),s[u.id]=!0,t.memory.geometries++),u}function l(d){const u=d.attributes;for(const f in u)e.update(u[f],n.ARRAY_BUFFER)}function c(d){const u=[],f=d.index,m=d.attributes.position;let M=0;if(m===void 0)return;if(f!==null){const y=f.array;M=f.version;for(let S=0,x=y.length;S<x;S+=3){const w=y[S+0],T=y[S+1],A=y[S+2];u.push(w,T,T,A,A,w)}}else{const y=m.array;M=m.version;for(let S=0,x=y.length/3-1;S<x;S+=3){const w=S+0,T=S+1,A=S+2;u.push(w,T,T,A,A,w)}}const p=new(m.count>=65535?Pp:Dh)(u,1);p.version=M;const g=a.get(d);g&&e.remove(g),a.set(d,p)}function h(d){const u=a.get(d);if(u){const f=d.index;f!==null&&u.version<f.version&&c(d)}else c(d);return a.get(d)}return{get:o,update:l,getWireframeAttribute:h}}function yy(n,e,t){let i;function s(d){i=d}let a,r;function o(d){a=d.type,r=d.bytesPerElement}function l(d,u){n.drawElements(i,u,a,d*r),t.update(u,i,1)}function c(d,u,f){f!==0&&(n.drawElementsInstanced(i,u,a,d*r,f),t.update(u,i,f))}function h(d,u,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,u,0,a,d,0,f);let M=0;for(let p=0;p<f;p++)M+=u[p];t.update(M,i,1)}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function Sy(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(a,r,o){switch(t.calls++,r){case n.TRIANGLES:t.triangles+=o*(a/3);break;case n.LINES:t.lines+=o*(a/2);break;case n.LINE_STRIP:t.lines+=o*(a-1);break;case n.LINE_LOOP:t.lines+=o*a;break;case n.POINTS:t.points+=o*a;break;default:ke("WebGLInfo: Unknown draw mode:",r);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:i}}function by(n,e,t){const i=new WeakMap,s=new at;function a(r,o,l){const c=r.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=h!==void 0?h.length:0;let u=i.get(o);if(u===void 0||u.count!==d){let E=function(){A.dispose(),i.delete(o),o.removeEventListener("dispose",E)};u!==void 0&&u.texture.dispose();const f=o.morphAttributes.position!==void 0,m=o.morphAttributes.normal!==void 0,M=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],g=o.morphAttributes.normal||[],y=o.morphAttributes.color||[];let S=0;f===!0&&(S=1),m===!0&&(S=2),M===!0&&(S=3);let x=o.attributes.position.count*S,w=1;x>e.maxTextureSize&&(w=Math.ceil(x/e.maxTextureSize),x=e.maxTextureSize);const T=new Float32Array(x*w*4*d),A=new Ep(T,x,w,d);A.type=an,A.needsUpdate=!0;const _=S*4;for(let P=0;P<d;P++){const I=p[P],N=g[P],G=y[P],X=x*w*4*P;for(let O=0;O<I.count;O++){const W=O*_;f===!0&&(s.fromBufferAttribute(I,O),T[X+W+0]=s.x,T[X+W+1]=s.y,T[X+W+2]=s.z,T[X+W+3]=0),m===!0&&(s.fromBufferAttribute(N,O),T[X+W+4]=s.x,T[X+W+5]=s.y,T[X+W+6]=s.z,T[X+W+7]=0),M===!0&&(s.fromBufferAttribute(G,O),T[X+W+8]=s.x,T[X+W+9]=s.y,T[X+W+10]=s.z,T[X+W+11]=G.itemSize===4?s.w:1)}}u={count:d,texture:A,size:new te(x,w)},i.set(o,u),o.addEventListener("dispose",E)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",r.morphTexture,t);else{let f=0;for(let M=0;M<c.length;M++)f+=c[M];const m=o.morphTargetsRelative?1:1-f;l.getUniforms().setValue(n,"morphTargetBaseInfluence",m),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",u.texture,t),l.getUniforms().setValue(n,"morphTargetsTextureSize",u.size)}return{update:a}}function Ty(n,e,t,i,s){let a=new WeakMap;function r(c){const h=s.render.frame,d=c.geometry,u=e.get(c,d);if(a.get(u)!==h&&(e.update(u),a.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),a.get(c)!==h&&(t.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,n.ARRAY_BUFFER),a.set(c,h))),c.isSkinnedMesh){const f=c.skeleton;a.get(f)!==h&&(f.update(),a.set(f,h))}return u}function o(){a=new WeakMap}function l(c){const h=c.target;h.removeEventListener("dispose",l),i.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:r,dispose:o}}const Ey={[cp]:"LINEAR_TONE_MAPPING",[hp]:"REINHARD_TONE_MAPPING",[up]:"CINEON_TONE_MAPPING",[dp]:"ACES_FILMIC_TONE_MAPPING",[pp]:"AGX_TONE_MAPPING",[mp]:"NEUTRAL_TONE_MAPPING",[fp]:"CUSTOM_TONE_MAPPING"};function wy(n,e,t,i,s,a){const r=new _n(e,t,{type:n,depthBuffer:s,stencilBuffer:a,samples:i?4:0,depthTexture:s?new Fs(e,t):void 0}),o=new _n(e,t,{type:Un,depthBuffer:!1,stencilBuffer:!1}),l=new mt;l.setAttribute("position",new Oe([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new Oe([0,2,0,0,2,0],2));const c=new K_({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),h=new he(l,c),d=new qh(-1,1,1,-1,0,1);let u=null,f=null,m=!1,M,p=null,g=[],y=!1;this.setSize=function(S,x){r.setSize(S,x),o.setSize(S,x);for(let w=0;w<g.length;w++){const T=g[w];T.setSize&&T.setSize(S,x)}},this.setEffects=function(S){g=S,y=g.length>0&&g[0].isRenderPass===!0;const x=r.width,w=r.height;for(let T=0;T<g.length;T++){const A=g[T];A.setSize&&A.setSize(x,w)}},this.begin=function(S,x){if(m||S.toneMapping===In&&g.length===0)return!1;if(p=x,x!==null){const w=x.width,T=x.height;(r.width!==w||r.height!==T)&&this.setSize(w,T)}return y===!1&&S.setRenderTarget(r),M=S.toneMapping,S.toneMapping=In,!0},this.hasRenderPass=function(){return y},this.end=function(S,x){S.toneMapping=M,m=!0;let w=r,T=o;for(let A=0;A<g.length;A++){const _=g[A];if(_.enabled!==!1&&(_.render(S,T,w,x),_.needsSwap!==!1)){const E=w;w=T,T=E}}if(u!==S.outputColorSpace||f!==S.toneMapping){u=S.outputColorSpace,f=S.toneMapping,c.defines={},it.getTransfer(u)===ct&&(c.defines.SRGB_TRANSFER="");const A=Ey[f];A&&(c.defines[A]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=w.texture,S.setRenderTarget(p),S.render(h,d),p=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){r.depthTexture&&r.depthTexture.dispose(),r.dispose(),o.dispose(),l.dispose(),c.dispose()}}const am=new Ut,sh=new Fs(1,1),om=new Ep,lm=new Vg,cm=new Lp,Yd=[],$d=[],Kd=new Float32Array(16),Jd=new Float32Array(9),Zd=new Float32Array(4);function Ys(n,e,t){const i=n[0];if(i<=0||i>0)return n;const s=e*t;let a=Yd[s];if(a===void 0&&(a=new Float32Array(s),Yd[s]=a),e!==0){i.toArray(a,0);for(let r=1,o=0;r!==e;++r)o+=t,n[r].toArray(a,o)}return a}function It(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Lt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function qo(n,e){let t=$d[e];t===void 0&&(t=new Int32Array(e),$d[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function Ay(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function Ry(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(It(t,e))return;n.uniform2fv(this.addr,e),Lt(t,e)}}function Py(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(It(t,e))return;n.uniform3fv(this.addr,e),Lt(t,e)}}function Cy(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(It(t,e))return;n.uniform4fv(this.addr,e),Lt(t,e)}}function Iy(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(It(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Lt(t,e)}else{if(It(t,i))return;Zd.set(i),n.uniformMatrix2fv(this.addr,!1,Zd),Lt(t,i)}}function Ly(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(It(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Lt(t,e)}else{if(It(t,i))return;Jd.set(i),n.uniformMatrix3fv(this.addr,!1,Jd),Lt(t,i)}}function Ny(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(It(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Lt(t,e)}else{if(It(t,i))return;Kd.set(i),n.uniformMatrix4fv(this.addr,!1,Kd),Lt(t,i)}}function Dy(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function Uy(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(It(t,e))return;n.uniform2iv(this.addr,e),Lt(t,e)}}function Fy(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(It(t,e))return;n.uniform3iv(this.addr,e),Lt(t,e)}}function Oy(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(It(t,e))return;n.uniform4iv(this.addr,e),Lt(t,e)}}function By(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function ky(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(It(t,e))return;n.uniform2uiv(this.addr,e),Lt(t,e)}}function zy(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(It(t,e))return;n.uniform3uiv(this.addr,e),Lt(t,e)}}function Hy(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(It(t,e))return;n.uniform4uiv(this.addr,e),Lt(t,e)}}function Vy(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let a;this.type===n.SAMPLER_2D_SHADOW?(sh.compareFunction=t.isReversedDepthBuffer()?Ch:Ph,a=sh):a=am,t.setTexture2D(e||a,s)}function Gy(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture3D(e||lm,s)}function Wy(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTextureCube(e||cm,s)}function Xy(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture2DArray(e||om,s)}function qy(n){switch(n){case 5126:return Ay;case 35664:return Ry;case 35665:return Py;case 35666:return Cy;case 35674:return Iy;case 35675:return Ly;case 35676:return Ny;case 5124:case 35670:return Dy;case 35667:case 35671:return Uy;case 35668:case 35672:return Fy;case 35669:case 35673:return Oy;case 5125:return By;case 36294:return ky;case 36295:return zy;case 36296:return Hy;case 35678:case 36198:case 36298:case 36306:case 35682:return Vy;case 35679:case 36299:case 36307:return Gy;case 35680:case 36300:case 36308:case 36293:return Wy;case 36289:case 36303:case 36311:case 36292:return Xy}}function Yy(n,e){n.uniform1fv(this.addr,e)}function $y(n,e){const t=Ys(e,this.size,2);n.uniform2fv(this.addr,t)}function Ky(n,e){const t=Ys(e,this.size,3);n.uniform3fv(this.addr,t)}function Jy(n,e){const t=Ys(e,this.size,4);n.uniform4fv(this.addr,t)}function Zy(n,e){const t=Ys(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function Qy(n,e){const t=Ys(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function jy(n,e){const t=Ys(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function eS(n,e){n.uniform1iv(this.addr,e)}function tS(n,e){n.uniform2iv(this.addr,e)}function nS(n,e){n.uniform3iv(this.addr,e)}function iS(n,e){n.uniform4iv(this.addr,e)}function sS(n,e){n.uniform1uiv(this.addr,e)}function rS(n,e){n.uniform2uiv(this.addr,e)}function aS(n,e){n.uniform3uiv(this.addr,e)}function oS(n,e){n.uniform4uiv(this.addr,e)}function lS(n,e,t){const i=this.cache,s=e.length,a=qo(t,s);It(i,a)||(n.uniform1iv(this.addr,a),Lt(i,a));let r;this.type===n.SAMPLER_2D_SHADOW?r=sh:r=am;for(let o=0;o!==s;++o)t.setTexture2D(e[o]||r,a[o])}function cS(n,e,t){const i=this.cache,s=e.length,a=qo(t,s);It(i,a)||(n.uniform1iv(this.addr,a),Lt(i,a));for(let r=0;r!==s;++r)t.setTexture3D(e[r]||lm,a[r])}function hS(n,e,t){const i=this.cache,s=e.length,a=qo(t,s);It(i,a)||(n.uniform1iv(this.addr,a),Lt(i,a));for(let r=0;r!==s;++r)t.setTextureCube(e[r]||cm,a[r])}function uS(n,e,t){const i=this.cache,s=e.length,a=qo(t,s);It(i,a)||(n.uniform1iv(this.addr,a),Lt(i,a));for(let r=0;r!==s;++r)t.setTexture2DArray(e[r]||om,a[r])}function dS(n){switch(n){case 5126:return Yy;case 35664:return $y;case 35665:return Ky;case 35666:return Jy;case 35674:return Zy;case 35675:return Qy;case 35676:return jy;case 5124:case 35670:return eS;case 35667:case 35671:return tS;case 35668:case 35672:return nS;case 35669:case 35673:return iS;case 5125:return sS;case 36294:return rS;case 36295:return aS;case 36296:return oS;case 35678:case 36198:case 36298:case 36306:case 35682:return lS;case 35679:case 36299:case 36307:return cS;case 35680:case 36300:case 36308:case 36293:return hS;case 36289:case 36303:case 36311:case 36292:return uS}}class fS{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=qy(t.type)}}class pS{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=dS(t.type)}}class mS{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const s=this.seq;for(let a=0,r=s.length;a!==r;++a){const o=s[a];o.setValue(e,t[o.id],i)}}}const zl=/(\w+)(\])?(\[|\.)?/g;function Qd(n,e){n.seq.push(e),n.map[e.id]=e}function gS(n,e,t){const i=n.name,s=i.length;for(zl.lastIndex=0;;){const a=zl.exec(i),r=zl.lastIndex;let o=a[1];const l=a[2]==="]",c=a[3];if(l&&(o=o|0),c===void 0||c==="["&&r+2===s){Qd(t,c===void 0?new fS(o,n,e):new pS(o,n,e));break}else{let d=t.map[o];d===void 0&&(d=new mS(o),Qd(t,d)),t=d}}}class ro{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const o=e.getActiveUniform(t,r),l=e.getUniformLocation(t,o.name);gS(o,l,this)}const s=[],a=[];for(const r of this.seq)r.type===e.SAMPLER_2D_SHADOW||r.type===e.SAMPLER_CUBE_SHADOW||r.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(r):a.push(r);s.length>0&&(this.seq=s.concat(a))}setValue(e,t,i,s){const a=this.map[t];a!==void 0&&a.setValue(e,i,s)}setOptional(e,t,i){const s=t[i];s!==void 0&&this.setValue(e,i,s)}static upload(e,t,i,s){for(let a=0,r=t.length;a!==r;++a){const o=t[a],l=i[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,s)}}static seqWithValue(e,t){const i=[];for(let s=0,a=e.length;s!==a;++s){const r=e[s];r.id in t&&i.push(r)}return i}}function jd(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const _S=37297;let vS=0;function xS(n,e){const t=n.split(`
`),i=[],s=Math.max(e-6,0),a=Math.min(e+6,t.length);for(let r=s;r<a;r++){const o=r+1;i.push(`${o===e?">":" "} ${o}: ${t[r]}`)}return i.join(`
`)}const ef=new $e;function MS(n){it._getMatrix(ef,it.workingColorSpace,n);const e=`mat3( ${ef.elements.map(t=>t.toFixed(4))} )`;switch(it.getTransfer(n)){case So:return[e,"LinearTransferOETF"];case ct:return[e,"sRGBTransferOETF"];default:return Ae("WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function tf(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),a=(n.getShaderInfoLog(e)||"").trim();if(i&&a==="")return"";const r=/ERROR: 0:(\d+)/.exec(a);if(r){const o=parseInt(r[1]);return t.toUpperCase()+`

`+a+`

`+xS(n.getShaderSource(e),o)}else return a}function yS(n,e){const t=MS(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const SS={[cp]:"Linear",[hp]:"Reinhard",[up]:"Cineon",[dp]:"ACESFilmic",[pp]:"AgX",[mp]:"Neutral",[fp]:"Custom"};function bS(n,e){const t=SS[e];return t===void 0?(Ae("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+n+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Wa=new C;function TS(){it.getLuminanceCoefficients(Wa);const n=Wa.x.toFixed(4),e=Wa.y.toFixed(4),t=Wa.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function ES(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(yr).join(`
`)}function wS(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function AS(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){const a=n.getActiveAttrib(e,s),r=a.name;let o=1;a.type===n.FLOAT_MAT2&&(o=2),a.type===n.FLOAT_MAT3&&(o=3),a.type===n.FLOAT_MAT4&&(o=4),t[r]={type:a.type,location:n.getAttribLocation(e,r),locationSize:o}}return t}function yr(n){return n!==""}function nf(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function sf(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const RS=/^[ \t]*#include +<([\w\d./]+)>/gm;function rh(n){return n.replace(RS,CS)}const PS=new Map;function CS(n,e){let t=Ze[e];if(t===void 0){const i=PS.get(e);if(i!==void 0)t=Ze[i],Ae('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return rh(t)}const IS=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function rf(n){return n.replace(IS,LS)}function LS(n,e,t,i){let s="";for(let a=parseInt(e);a<parseInt(t);a++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+a+" ]").replace(/UNROLLED_LOOP_INDEX/g,a);return s}function af(n){let e=`precision ${n.precision} float;
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
#define LOW_PRECISION`),e}const NS={[eo]:"SHADOWMAP_TYPE_PCF",[xr]:"SHADOWMAP_TYPE_VSM"};function DS(n){return NS[n.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const US={[zi]:"ENVMAP_TYPE_CUBE",[Ds]:"ENVMAP_TYPE_CUBE",[Ho]:"ENVMAP_TYPE_CUBE_UV"};function FS(n){return n.envMap===!1?"ENVMAP_TYPE_CUBE":US[n.envMapMode]||"ENVMAP_TYPE_CUBE"}const OS={[Ds]:"ENVMAP_MODE_REFRACTION"};function BS(n){return n.envMap===!1?"ENVMAP_MODE_REFLECTION":OS[n.envMapMode]||"ENVMAP_MODE_REFLECTION"}const kS={[lp]:"ENVMAP_BLENDING_MULTIPLY",[ig]:"ENVMAP_BLENDING_MIX",[sg]:"ENVMAP_BLENDING_ADD"};function zS(n){return n.envMap===!1?"ENVMAP_BLENDING_NONE":kS[n.combine]||"ENVMAP_BLENDING_NONE"}function HS(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function VS(n,e,t,i){const s=n.getContext(),a=t.defines;let r=t.vertexShader,o=t.fragmentShader;const l=DS(t),c=FS(t),h=BS(t),d=zS(t),u=HS(t),f=ES(t),m=wS(a),M=s.createProgram();let p,g,y=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(yr).join(`
`),p.length>0&&(p+=`
`),g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(yr).join(`
`),g.length>0&&(g+=`
`)):(p=[af(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(yr).join(`
`),g=[af(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==In?"#define TONE_MAPPING":"",t.toneMapping!==In?Ze.tonemapping_pars_fragment:"",t.toneMapping!==In?bS("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ze.colorspace_pars_fragment,yS("linearToOutputTexel",t.outputColorSpace),TS(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(yr).join(`
`)),r=rh(r),r=nf(r,t),r=sf(r,t),o=rh(o),o=nf(o,t),o=sf(o,t),r=rf(r),o=rf(o),t.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,p=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,g=["#define varying in",t.glslVersion===Gu?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Gu?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+g);const S=y+p+r,x=y+g+o,w=jd(s,s.VERTEX_SHADER,S),T=jd(s,s.FRAGMENT_SHADER,x);s.attachShader(M,w),s.attachShader(M,T),t.index0AttributeName!==void 0?s.bindAttribLocation(M,0,t.index0AttributeName):t.hasPositionAttribute===!0&&s.bindAttribLocation(M,0,"position"),s.linkProgram(M);function A(I){if(n.debug.checkShaderErrors){const N=s.getProgramInfoLog(M)||"",G=s.getShaderInfoLog(w)||"",X=s.getShaderInfoLog(T)||"",O=N.trim(),W=G.trim(),H=X.trim();let Q=!0,$=!0;if(s.getProgramParameter(M,s.LINK_STATUS)===!1)if(Q=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,M,w,T);else{const se=tf(s,w,"vertex"),re=tf(s,T,"fragment");ke("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(M,s.VALIDATE_STATUS)+`

Material Name: `+I.name+`
Material Type: `+I.type+`

Program Info Log: `+O+`
`+se+`
`+re)}else O!==""?Ae("WebGLProgram: Program Info Log:",O):(W===""||H==="")&&($=!1);$&&(I.diagnostics={runnable:Q,programLog:O,vertexShader:{log:W,prefix:p},fragmentShader:{log:H,prefix:g}})}s.deleteShader(w),s.deleteShader(T),_=new ro(s,M),E=AS(s,M)}let _;this.getUniforms=function(){return _===void 0&&A(this),_};let E;this.getAttributes=function(){return E===void 0&&A(this),E};let P=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return P===!1&&(P=s.getProgramParameter(M,_S)),P},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(M),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=vS++,this.cacheKey=e,this.usedTimes=1,this.program=M,this.vertexShader=w,this.fragmentShader=T,this}let GS=0;class WS{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,i){const s=this._getShaderCacheForMaterial(e);return s.has(t)===!1&&(s.add(t),t.usedTimes++),s.has(i)===!1&&(s.add(i),i.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new XS(e),t.set(e,i)),i}}class XS{constructor(e){this.id=GS++,this.code=e,this.usedTimes=0}}function qS(n){return n===Vi||n===vo||n===xo}function YS(n,e,t,i,s,a){const r=new Nh,o=new WS,l=new Set,c=[],h=new Map,d=i.logarithmicDepthBuffer;let u=i.precision;const f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(_){return l.add(_),_===0?"uv":`uv${_}`}function M(_,E,P,I,N,G){const X=I.fog,O=N.geometry,W=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?I.environment:null,H=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap,Q=e.get(_.envMap||W,H),$=Q&&Q.mapping===Ho?Q.image.height:null,se=f[_.type];_.precision!==null&&(u=i.getMaxPrecision(_.precision),u!==_.precision&&Ae("WebGLProgram.getParameters:",_.precision,"not supported, using",u,"instead."));const re=O.morphAttributes.position||O.morphAttributes.normal||O.morphAttributes.color,ue=re!==void 0?re.length:0;let Ve=0;O.morphAttributes.position!==void 0&&(Ve=1),O.morphAttributes.normal!==void 0&&(Ve=2),O.morphAttributes.color!==void 0&&(Ve=3);let ot,nt,K,le;if(se){const Ee=wn[se];ot=Ee.vertexShader,nt=Ee.fragmentShader}else{ot=_.vertexShader,nt=_.fragmentShader;const Ee=o.getVertexShaderStage(_),St=o.getFragmentShaderStage(_);o.update(_,Ee,St),K=Ee.id,le=St.id}const ae=n.getRenderTarget(),Le=n.state.buffers.depth.getReversed(),Ge=N.isInstancedMesh===!0,Fe=N.isBatchedMesh===!0,rt=!!_.map,Xe=!!_.matcap,j=!!Q,ie=!!_.aoMap,ne=!!_.lightMap,xe=!!_.bumpMap&&_.wireframe===!1,ge=!!_.normalMap,Be=!!_.displacementMap,Pe=!!_.emissiveMap,We=!!_.metalnessMap,Ye=!!_.roughnessMap,L=_.anisotropy>0,ut=_.clearcoat>0,tt=_.dispersion>0,R=_.iridescence>0,v=_.sheen>0,F=_.transmission>0,z=L&&!!_.anisotropyMap,q=ut&&!!_.clearcoatMap,oe=ut&&!!_.clearcoatNormalMap,ce=ut&&!!_.clearcoatRoughnessMap,Y=R&&!!_.iridescenceMap,Z=R&&!!_.iridescenceThicknessMap,fe=v&&!!_.sheenColorMap,Ce=v&&!!_.sheenRoughnessMap,_e=!!_.specularMap,pe=!!_.specularColorMap,Ue=!!_.specularIntensityMap,He=F&&!!_.transmissionMap,Ke=F&&!!_.thicknessMap,D=!!_.gradientMap,de=!!_.alphaMap,J=_.alphaTest>0,me=!!_.alphaHash,Se=!!_.extensions;let ee=In;_.toneMapped&&(ae===null||ae.isXRRenderTarget===!0)&&(ee=n.toneMapping);const Re={shaderID:se,shaderType:_.type,shaderName:_.name,vertexShader:ot,fragmentShader:nt,defines:_.defines,customVertexShaderID:K,customFragmentShaderID:le,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:u,batching:Fe,batchingColor:Fe&&N._colorsTexture!==null,instancing:Ge,instancingColor:Ge&&N.instanceColor!==null,instancingMorph:Ge&&N.morphTexture!==null,outputColorSpace:ae===null?n.outputColorSpace:ae.isXRRenderTarget===!0?ae.texture.colorSpace:it.workingColorSpace,alphaToCoverage:!!_.alphaToCoverage,map:rt,matcap:Xe,envMap:j,envMapMode:j&&Q.mapping,envMapCubeUVHeight:$,aoMap:ie,lightMap:ne,bumpMap:xe,normalMap:ge,displacementMap:Be,emissiveMap:Pe,normalMapObjectSpace:ge&&_.normalMapType===cg,normalMapTangentSpace:ge&&_.normalMapType===Qc,packedNormalMap:ge&&_.normalMapType===Qc&&qS(_.normalMap.format),metalnessMap:We,roughnessMap:Ye,anisotropy:L,anisotropyMap:z,clearcoat:ut,clearcoatMap:q,clearcoatNormalMap:oe,clearcoatRoughnessMap:ce,dispersion:tt,iridescence:R,iridescenceMap:Y,iridescenceThicknessMap:Z,sheen:v,sheenColorMap:fe,sheenRoughnessMap:Ce,specularMap:_e,specularColorMap:pe,specularIntensityMap:Ue,transmission:F,transmissionMap:He,thicknessMap:Ke,gradientMap:D,opaque:_.transparent===!1&&_.blending===ws&&_.alphaToCoverage===!1,alphaMap:de,alphaTest:J,alphaHash:me,combine:_.combine,mapUv:rt&&m(_.map.channel),aoMapUv:ie&&m(_.aoMap.channel),lightMapUv:ne&&m(_.lightMap.channel),bumpMapUv:xe&&m(_.bumpMap.channel),normalMapUv:ge&&m(_.normalMap.channel),displacementMapUv:Be&&m(_.displacementMap.channel),emissiveMapUv:Pe&&m(_.emissiveMap.channel),metalnessMapUv:We&&m(_.metalnessMap.channel),roughnessMapUv:Ye&&m(_.roughnessMap.channel),anisotropyMapUv:z&&m(_.anisotropyMap.channel),clearcoatMapUv:q&&m(_.clearcoatMap.channel),clearcoatNormalMapUv:oe&&m(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ce&&m(_.clearcoatRoughnessMap.channel),iridescenceMapUv:Y&&m(_.iridescenceMap.channel),iridescenceThicknessMapUv:Z&&m(_.iridescenceThicknessMap.channel),sheenColorMapUv:fe&&m(_.sheenColorMap.channel),sheenRoughnessMapUv:Ce&&m(_.sheenRoughnessMap.channel),specularMapUv:_e&&m(_.specularMap.channel),specularColorMapUv:pe&&m(_.specularColorMap.channel),specularIntensityMapUv:Ue&&m(_.specularIntensityMap.channel),transmissionMapUv:He&&m(_.transmissionMap.channel),thicknessMapUv:Ke&&m(_.thicknessMap.channel),alphaMapUv:de&&m(_.alphaMap.channel),vertexTangents:!!O.attributes.tangent&&(ge||L),vertexNormals:!!O.attributes.normal,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!O.attributes.color&&O.attributes.color.itemSize===4,pointsUvs:N.isPoints===!0&&!!O.attributes.uv&&(rt||de),fog:!!X,useFog:_.fog===!0,fogExp2:!!X&&X.isFogExp2,flatShading:_.wireframe===!1&&(_.flatShading===!0||O.attributes.normal===void 0&&ge===!1&&(_.isMeshLambertMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isMeshPhysicalMaterial)),sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:Le,skinning:N.isSkinnedMesh===!0,hasPositionAttribute:O.attributes.position!==void 0,morphTargets:O.morphAttributes.position!==void 0,morphNormals:O.morphAttributes.normal!==void 0,morphColors:O.morphAttributes.color!==void 0,morphTargetsCount:ue,morphTextureStride:Ve,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numLightProbeGrids:G.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:_.dithering,shadowMapEnabled:n.shadowMap.enabled&&P.length>0,shadowMapType:n.shadowMap.type,toneMapping:ee,decodeVideoTexture:rt&&_.map.isVideoTexture===!0&&it.getTransfer(_.map.colorSpace)===ct,decodeVideoTextureEmissive:Pe&&_.emissiveMap.isVideoTexture===!0&&it.getTransfer(_.emissiveMap.colorSpace)===ct,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===Pn,flipSided:_.side===Xt,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:Se&&_.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Se&&_.extensions.multiDraw===!0||Fe)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return Re.vertexUv1s=l.has(1),Re.vertexUv2s=l.has(2),Re.vertexUv3s=l.has(3),l.clear(),Re}function p(_){const E=[];if(_.shaderID?E.push(_.shaderID):(E.push(_.customVertexShaderID),E.push(_.customFragmentShaderID)),_.defines!==void 0)for(const P in _.defines)E.push(P),E.push(_.defines[P]);return _.isRawShaderMaterial===!1&&(g(E,_),y(E,_),E.push(n.outputColorSpace)),E.push(_.customProgramCacheKey),E.join()}function g(_,E){_.push(E.precision),_.push(E.outputColorSpace),_.push(E.envMapMode),_.push(E.envMapCubeUVHeight),_.push(E.mapUv),_.push(E.alphaMapUv),_.push(E.lightMapUv),_.push(E.aoMapUv),_.push(E.bumpMapUv),_.push(E.normalMapUv),_.push(E.displacementMapUv),_.push(E.emissiveMapUv),_.push(E.metalnessMapUv),_.push(E.roughnessMapUv),_.push(E.anisotropyMapUv),_.push(E.clearcoatMapUv),_.push(E.clearcoatNormalMapUv),_.push(E.clearcoatRoughnessMapUv),_.push(E.iridescenceMapUv),_.push(E.iridescenceThicknessMapUv),_.push(E.sheenColorMapUv),_.push(E.sheenRoughnessMapUv),_.push(E.specularMapUv),_.push(E.specularColorMapUv),_.push(E.specularIntensityMapUv),_.push(E.transmissionMapUv),_.push(E.thicknessMapUv),_.push(E.combine),_.push(E.fogExp2),_.push(E.sizeAttenuation),_.push(E.morphTargetsCount),_.push(E.morphAttributeCount),_.push(E.numDirLights),_.push(E.numPointLights),_.push(E.numSpotLights),_.push(E.numSpotLightMaps),_.push(E.numHemiLights),_.push(E.numRectAreaLights),_.push(E.numDirLightShadows),_.push(E.numPointLightShadows),_.push(E.numSpotLightShadows),_.push(E.numSpotLightShadowsWithMaps),_.push(E.numLightProbes),_.push(E.shadowMapType),_.push(E.toneMapping),_.push(E.numClippingPlanes),_.push(E.numClipIntersection),_.push(E.depthPacking)}function y(_,E){r.disableAll(),E.instancing&&r.enable(0),E.instancingColor&&r.enable(1),E.instancingMorph&&r.enable(2),E.matcap&&r.enable(3),E.envMap&&r.enable(4),E.normalMapObjectSpace&&r.enable(5),E.normalMapTangentSpace&&r.enable(6),E.clearcoat&&r.enable(7),E.iridescence&&r.enable(8),E.alphaTest&&r.enable(9),E.vertexColors&&r.enable(10),E.vertexAlphas&&r.enable(11),E.vertexUv1s&&r.enable(12),E.vertexUv2s&&r.enable(13),E.vertexUv3s&&r.enable(14),E.vertexTangents&&r.enable(15),E.anisotropy&&r.enable(16),E.alphaHash&&r.enable(17),E.batching&&r.enable(18),E.dispersion&&r.enable(19),E.batchingColor&&r.enable(20),E.gradientMap&&r.enable(21),E.packedNormalMap&&r.enable(22),E.vertexNormals&&r.enable(23),_.push(r.mask),r.disableAll(),E.fog&&r.enable(0),E.useFog&&r.enable(1),E.flatShading&&r.enable(2),E.logarithmicDepthBuffer&&r.enable(3),E.reversedDepthBuffer&&r.enable(4),E.skinning&&r.enable(5),E.morphTargets&&r.enable(6),E.morphNormals&&r.enable(7),E.morphColors&&r.enable(8),E.premultipliedAlpha&&r.enable(9),E.shadowMapEnabled&&r.enable(10),E.doubleSided&&r.enable(11),E.flipSided&&r.enable(12),E.useDepthPacking&&r.enable(13),E.dithering&&r.enable(14),E.transmission&&r.enable(15),E.sheen&&r.enable(16),E.opaque&&r.enable(17),E.pointsUvs&&r.enable(18),E.decodeVideoTexture&&r.enable(19),E.decodeVideoTextureEmissive&&r.enable(20),E.alphaToCoverage&&r.enable(21),E.numLightProbeGrids>0&&r.enable(22),E.hasPositionAttribute&&r.enable(23),_.push(r.mask)}function S(_){const E=f[_.type];let P;if(E){const I=wn[E];P=q_.clone(I.uniforms)}else P=_.uniforms;return P}function x(_,E){let P=h.get(E);return P!==void 0?++P.usedTimes:(P=new VS(n,E,_,s),c.push(P),h.set(E,P)),P}function w(_){if(--_.usedTimes===0){const E=c.indexOf(_);c[E]=c[c.length-1],c.pop(),h.delete(_.cacheKey),_.destroy()}}function T(_){o.remove(_)}function A(){o.dispose()}return{getParameters:M,getProgramCacheKey:p,getUniforms:S,acquireProgram:x,releaseProgram:w,releaseShaderCache:T,programs:c,dispose:A}}function $S(){let n=new WeakMap;function e(r){return n.has(r)}function t(r){let o=n.get(r);return o===void 0&&(o={},n.set(r,o)),o}function i(r){n.delete(r)}function s(r,o,l){n.get(r)[o]=l}function a(){n=new WeakMap}return{has:e,get:t,remove:i,update:s,dispose:a}}function KS(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.materialVariant!==e.materialVariant?n.materialVariant-e.materialVariant:n.z!==e.z?n.z-e.z:n.id-e.id}function of(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function lf(){const n=[];let e=0;const t=[],i=[],s=[];function a(){e=0,t.length=0,i.length=0,s.length=0}function r(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function o(u,f,m,M,p,g){let y=n[e];return y===void 0?(y={id:u.id,object:u,geometry:f,material:m,materialVariant:r(u),groupOrder:M,renderOrder:u.renderOrder,z:p,group:g},n[e]=y):(y.id=u.id,y.object=u,y.geometry=f,y.material=m,y.materialVariant=r(u),y.groupOrder=M,y.renderOrder=u.renderOrder,y.z=p,y.group=g),e++,y}function l(u,f,m,M,p,g){const y=o(u,f,m,M,p,g);m.transmission>0?i.push(y):m.transparent===!0?s.push(y):t.push(y)}function c(u,f,m,M,p,g){const y=o(u,f,m,M,p,g);m.transmission>0?i.unshift(y):m.transparent===!0?s.unshift(y):t.unshift(y)}function h(u,f,m){t.length>1&&t.sort(u||KS),i.length>1&&i.sort(f||of),s.length>1&&s.sort(f||of),m&&(t.reverse(),i.reverse(),s.reverse())}function d(){for(let u=e,f=n.length;u<f;u++){const m=n[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:i,transparent:s,init:a,push:l,unshift:c,finish:d,sort:h}}function JS(){let n=new WeakMap;function e(i,s){const a=n.get(i);let r;return a===void 0?(r=new lf,n.set(i,[r])):s>=a.length?(r=new lf,a.push(r)):r=a[s],r}function t(){n=new WeakMap}return{get:e,dispose:t}}function ZS(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new C,color:new ze};break;case"SpotLight":t={position:new C,direction:new C,color:new ze,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new C,color:new ze,distance:0,decay:0};break;case"HemisphereLight":t={direction:new C,skyColor:new ze,groundColor:new ze};break;case"RectAreaLight":t={color:new ze,position:new C,halfWidth:new C,halfHeight:new C};break}return n[e.id]=t,t}}}function QS(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new te};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new te};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new te,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let jS=0;function eb(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function tb(n){const e=new ZS,t=QS(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new C);const s=new C,a=new qe,r=new qe;function o(c){let h=0,d=0,u=0;for(let E=0;E<9;E++)i.probe[E].set(0,0,0);let f=0,m=0,M=0,p=0,g=0,y=0,S=0,x=0,w=0,T=0,A=0;c.sort(eb);for(let E=0,P=c.length;E<P;E++){const I=c[E],N=I.color,G=I.intensity,X=I.distance;let O=null;if(I.shadow&&I.shadow.map&&(I.shadow.map.texture.format===Vi?O=I.shadow.map.texture:O=I.shadow.map.depthTexture||I.shadow.map.texture),I.isAmbientLight)h+=N.r*G,d+=N.g*G,u+=N.b*G;else if(I.isLightProbe){for(let W=0;W<9;W++)i.probe[W].addScaledVector(I.sh.coefficients[W],G);A++}else if(I.isDirectionalLight){const W=e.get(I);if(W.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){const H=I.shadow,Q=t.get(I);Q.shadowIntensity=H.intensity,Q.shadowBias=H.bias,Q.shadowNormalBias=H.normalBias,Q.shadowRadius=H.radius,Q.shadowMapSize=H.mapSize,i.directionalShadow[f]=Q,i.directionalShadowMap[f]=O,i.directionalShadowMatrix[f]=I.shadow.matrix,y++}i.directional[f]=W,f++}else if(I.isSpotLight){const W=e.get(I);W.position.setFromMatrixPosition(I.matrixWorld),W.color.copy(N).multiplyScalar(G),W.distance=X,W.coneCos=Math.cos(I.angle),W.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),W.decay=I.decay,i.spot[M]=W;const H=I.shadow;if(I.map&&(i.spotLightMap[w]=I.map,w++,H.updateMatrices(I),I.castShadow&&T++),i.spotLightMatrix[M]=H.matrix,I.castShadow){const Q=t.get(I);Q.shadowIntensity=H.intensity,Q.shadowBias=H.bias,Q.shadowNormalBias=H.normalBias,Q.shadowRadius=H.radius,Q.shadowMapSize=H.mapSize,i.spotShadow[M]=Q,i.spotShadowMap[M]=O,x++}M++}else if(I.isRectAreaLight){const W=e.get(I);W.color.copy(N).multiplyScalar(G),W.halfWidth.set(I.width*.5,0,0),W.halfHeight.set(0,I.height*.5,0),i.rectArea[p]=W,p++}else if(I.isPointLight){const W=e.get(I);if(W.color.copy(I.color).multiplyScalar(I.intensity),W.distance=I.distance,W.decay=I.decay,I.castShadow){const H=I.shadow,Q=t.get(I);Q.shadowIntensity=H.intensity,Q.shadowBias=H.bias,Q.shadowNormalBias=H.normalBias,Q.shadowRadius=H.radius,Q.shadowMapSize=H.mapSize,Q.shadowCameraNear=H.camera.near,Q.shadowCameraFar=H.camera.far,i.pointShadow[m]=Q,i.pointShadowMap[m]=O,i.pointShadowMatrix[m]=I.shadow.matrix,S++}i.point[m]=W,m++}else if(I.isHemisphereLight){const W=e.get(I);W.skyColor.copy(I.color).multiplyScalar(G),W.groundColor.copy(I.groundColor).multiplyScalar(G),i.hemi[g]=W,g++}}p>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ve.LTC_FLOAT_1,i.rectAreaLTC2=ve.LTC_FLOAT_2):(i.rectAreaLTC1=ve.LTC_HALF_1,i.rectAreaLTC2=ve.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=d,i.ambient[2]=u;const _=i.hash;(_.directionalLength!==f||_.pointLength!==m||_.spotLength!==M||_.rectAreaLength!==p||_.hemiLength!==g||_.numDirectionalShadows!==y||_.numPointShadows!==S||_.numSpotShadows!==x||_.numSpotMaps!==w||_.numLightProbes!==A)&&(i.directional.length=f,i.spot.length=M,i.rectArea.length=p,i.point.length=m,i.hemi.length=g,i.directionalShadow.length=y,i.directionalShadowMap.length=y,i.pointShadow.length=S,i.pointShadowMap.length=S,i.spotShadow.length=x,i.spotShadowMap.length=x,i.directionalShadowMatrix.length=y,i.pointShadowMatrix.length=S,i.spotLightMatrix.length=x+w-T,i.spotLightMap.length=w,i.numSpotLightShadowsWithMaps=T,i.numLightProbes=A,_.directionalLength=f,_.pointLength=m,_.spotLength=M,_.rectAreaLength=p,_.hemiLength=g,_.numDirectionalShadows=y,_.numPointShadows=S,_.numSpotShadows=x,_.numSpotMaps=w,_.numLightProbes=A,i.version=jS++)}function l(c,h){let d=0,u=0,f=0,m=0,M=0;const p=h.matrixWorldInverse;for(let g=0,y=c.length;g<y;g++){const S=c[g];if(S.isDirectionalLight){const x=i.directional[d];x.direction.setFromMatrixPosition(S.matrixWorld),s.setFromMatrixPosition(S.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(p),d++}else if(S.isSpotLight){const x=i.spot[f];x.position.setFromMatrixPosition(S.matrixWorld),x.position.applyMatrix4(p),x.direction.setFromMatrixPosition(S.matrixWorld),s.setFromMatrixPosition(S.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(p),f++}else if(S.isRectAreaLight){const x=i.rectArea[m];x.position.setFromMatrixPosition(S.matrixWorld),x.position.applyMatrix4(p),r.identity(),a.copy(S.matrixWorld),a.premultiply(p),r.extractRotation(a),x.halfWidth.set(S.width*.5,0,0),x.halfHeight.set(0,S.height*.5,0),x.halfWidth.applyMatrix4(r),x.halfHeight.applyMatrix4(r),m++}else if(S.isPointLight){const x=i.point[u];x.position.setFromMatrixPosition(S.matrixWorld),x.position.applyMatrix4(p),u++}else if(S.isHemisphereLight){const x=i.hemi[M];x.direction.setFromMatrixPosition(S.matrixWorld),x.direction.transformDirection(p),M++}}}return{setup:o,setupView:l,state:i}}function cf(n){const e=new tb(n),t=[],i=[],s=[];function a(u){d.camera=u,t.length=0,i.length=0,s.length=0}function r(u){t.push(u)}function o(u){i.push(u)}function l(u){s.push(u)}function c(){e.setup(t)}function h(u){e.setupView(t,u)}const d={lightsArray:t,shadowsArray:i,lightProbeGridArray:s,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:c,setupLightsView:h,pushLight:r,pushShadow:o,pushLightProbeGrid:l}}function nb(n){let e=new WeakMap;function t(s,a=0){const r=e.get(s);let o;return r===void 0?(o=new cf(n),e.set(s,[o])):a>=r.length?(o=new cf(n),r.push(o)):o=r[a],o}function i(){e=new WeakMap}return{get:t,dispose:i}}const ib=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,sb=`uniform sampler2D shadow_pass;
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
}`,rb=[new C(1,0,0),new C(-1,0,0),new C(0,1,0),new C(0,-1,0),new C(0,0,1),new C(0,0,-1)],ab=[new C(0,-1,0),new C(0,-1,0),new C(0,0,1),new C(0,0,-1),new C(0,-1,0),new C(0,-1,0)],hf=new qe,or=new C,Hl=new C;function ob(n,e,t){let i=new Vo;const s=new te,a=new te,r=new at,o=new J_,l=new Z_,c={},h=t.maxTextureSize,d={[yi]:Xt,[Xt]:yi,[Pn]:Pn},u=new hn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new te},radius:{value:4}},vertexShader:ib,fragmentShader:sb}),f=u.clone();f.defines.HORIZONTAL_PASS=1;const m=new mt;m.setAttribute("position",new cn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const M=new he(m,u),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=eo;let g=this.type;this.render=function(T,A,_){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||T.length===0)return;this.type===B0&&(Ae("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=eo);const E=n.getRenderTarget(),P=n.getActiveCubeFace(),I=n.getActiveMipmapLevel(),N=n.state;N.setBlending($n),N.buffers.depth.getReversed()===!0?N.buffers.color.setClear(0,0,0,0):N.buffers.color.setClear(1,1,1,1),N.buffers.depth.setTest(!0),N.setScissorTest(!1);const G=g!==this.type;G&&A.traverse(function(X){X.material&&(Array.isArray(X.material)?X.material.forEach(O=>O.needsUpdate=!0):X.material.needsUpdate=!0)});for(let X=0,O=T.length;X<O;X++){const W=T[X],H=W.shadow;if(H===void 0){Ae("WebGLShadowMap:",W,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;s.copy(H.mapSize);const Q=H.getFrameExtents();s.multiply(Q),a.copy(H.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(a.x=Math.floor(h/Q.x),s.x=a.x*Q.x,H.mapSize.x=a.x),s.y>h&&(a.y=Math.floor(h/Q.y),s.y=a.y*Q.y,H.mapSize.y=a.y));const $=n.state.buffers.depth.getReversed();if(H.camera._reversedDepth=$,H.map===null||G===!0){if(H.map!==null&&(H.map.depthTexture!==null&&(H.map.depthTexture.dispose(),H.map.depthTexture=null),H.map.dispose()),this.type===xr){if(W.isPointLight){Ae("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}H.map=new _n(s.x,s.y,{format:Vi,type:Un,minFilter:Ct,magFilter:Ct,generateMipmaps:!1}),H.map.texture.name=W.name+".shadowMap",H.map.depthTexture=new Fs(s.x,s.y,an),H.map.depthTexture.name=W.name+".shadowMapDepth",H.map.depthTexture.format=Jn,H.map.depthTexture.compareFunction=null,H.map.depthTexture.minFilter=Ft,H.map.depthTexture.magFilter=Ft}else W.isPointLight?(H.map=new rm(s.x),H.map.depthTexture=new d_(s.x,Dn)):(H.map=new _n(s.x,s.y),H.map.depthTexture=new Fs(s.x,s.y,Dn)),H.map.depthTexture.name=W.name+".shadowMap",H.map.depthTexture.format=Jn,this.type===eo?(H.map.depthTexture.compareFunction=$?Ch:Ph,H.map.depthTexture.minFilter=Ct,H.map.depthTexture.magFilter=Ct):(H.map.depthTexture.compareFunction=null,H.map.depthTexture.minFilter=Ft,H.map.depthTexture.magFilter=Ft);H.camera.updateProjectionMatrix()}const se=H.map.isWebGLCubeRenderTarget?6:1;for(let re=0;re<se;re++){if(H.map.isWebGLCubeRenderTarget)n.setRenderTarget(H.map,re),n.clear();else{re===0&&(n.setRenderTarget(H.map),n.clear());const ue=H.getViewport(re);r.set(a.x*ue.x,a.y*ue.y,a.x*ue.z,a.y*ue.w),N.viewport(r)}if(W.isPointLight){const ue=H.camera,Ve=H.matrix,ot=W.distance||ue.far;ot!==ue.far&&(ue.far=ot,ue.updateProjectionMatrix()),or.setFromMatrixPosition(W.matrixWorld),ue.position.copy(or),Hl.copy(ue.position),Hl.add(rb[re]),ue.up.copy(ab[re]),ue.lookAt(Hl),ue.updateMatrixWorld(),Ve.makeTranslation(-or.x,-or.y,-or.z),hf.multiplyMatrices(ue.projectionMatrix,ue.matrixWorldInverse),H._frustum.setFromProjectionMatrix(hf,ue.coordinateSystem,ue.reversedDepth)}else H.updateMatrices(W);i=H.getFrustum(),x(A,_,H.camera,W,this.type)}H.isPointLightShadow!==!0&&this.type===xr&&y(H,_),H.needsUpdate=!1}g=this.type,p.needsUpdate=!1,n.setRenderTarget(E,P,I)};function y(T,A){const _=e.update(M);u.defines.VSM_SAMPLES!==T.blurSamples&&(u.defines.VSM_SAMPLES=T.blurSamples,f.defines.VSM_SAMPLES=T.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new _n(s.x,s.y,{format:Vi,type:Un})),u.uniforms.shadow_pass.value=T.map.depthTexture,u.uniforms.resolution.value=T.mapSize,u.uniforms.radius.value=T.radius,n.setRenderTarget(T.mapPass),n.clear(),n.renderBufferDirect(A,null,_,u,M,null),f.uniforms.shadow_pass.value=T.mapPass.texture,f.uniforms.resolution.value=T.mapSize,f.uniforms.radius.value=T.radius,n.setRenderTarget(T.map),n.clear(),n.renderBufferDirect(A,null,_,f,M,null)}function S(T,A,_,E){let P=null;const I=_.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(I!==void 0)P=I;else if(P=_.isPointLight===!0?l:o,n.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0||A.alphaToCoverage===!0){const N=P.uuid,G=A.uuid;let X=c[N];X===void 0&&(X={},c[N]=X);let O=X[G];O===void 0&&(O=P.clone(),X[G]=O,A.addEventListener("dispose",w)),P=O}if(P.visible=A.visible,P.wireframe=A.wireframe,E===xr?P.side=A.shadowSide!==null?A.shadowSide:A.side:P.side=A.shadowSide!==null?A.shadowSide:d[A.side],P.alphaMap=A.alphaMap,P.alphaTest=A.alphaToCoverage===!0?.5:A.alphaTest,P.map=A.map,P.clipShadows=A.clipShadows,P.clippingPlanes=A.clippingPlanes,P.clipIntersection=A.clipIntersection,P.displacementMap=A.displacementMap,P.displacementScale=A.displacementScale,P.displacementBias=A.displacementBias,P.wireframeLinewidth=A.wireframeLinewidth,P.linewidth=A.linewidth,_.isPointLight===!0&&P.isMeshDistanceMaterial===!0){const N=n.properties.get(P);N.light=_}return P}function x(T,A,_,E,P){if(T.visible===!1)return;if(T.layers.test(A.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&P===xr)&&(!T.frustumCulled||i.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(_.matrixWorldInverse,T.matrixWorld);const G=e.update(T),X=T.material;if(Array.isArray(X)){const O=G.groups;for(let W=0,H=O.length;W<H;W++){const Q=O[W],$=X[Q.materialIndex];if($&&$.visible){const se=S(T,$,E,P);T.onBeforeShadow(n,T,A,_,G,se,Q),n.renderBufferDirect(_,null,G,se,T,Q),T.onAfterShadow(n,T,A,_,G,se,Q)}}}else if(X.visible){const O=S(T,X,E,P);T.onBeforeShadow(n,T,A,_,G,O,null),n.renderBufferDirect(_,null,G,O,T,null),T.onAfterShadow(n,T,A,_,G,O,null)}}const N=T.children;for(let G=0,X=N.length;G<X;G++)x(N[G],A,_,E,P)}function w(T){T.target.removeEventListener("dispose",w);for(const _ in c){const E=c[_],P=T.target.uuid;P in E&&(E[P].dispose(),delete E[P])}}}function lb(n,e){function t(){let D=!1;const de=new at;let J=null;const me=new at(0,0,0,0);return{setMask:function(Se){J!==Se&&!D&&(n.colorMask(Se,Se,Se,Se),J=Se)},setLocked:function(Se){D=Se},setClear:function(Se,ee,Re,Ee,St){St===!0&&(Se*=Ee,ee*=Ee,Re*=Ee),de.set(Se,ee,Re,Ee),me.equals(de)===!1&&(n.clearColor(Se,ee,Re,Ee),me.copy(de))},reset:function(){D=!1,J=null,me.set(-1,0,0,0)}}}function i(){let D=!1,de=!1,J=null,me=null,Se=null;return{setReversed:function(ee){if(de!==ee){const Re=e.get("EXT_clip_control");ee?Re.clipControlEXT(Re.LOWER_LEFT_EXT,Re.ZERO_TO_ONE_EXT):Re.clipControlEXT(Re.LOWER_LEFT_EXT,Re.NEGATIVE_ONE_TO_ONE_EXT),de=ee;const Ee=Se;Se=null,this.setClear(Ee)}},getReversed:function(){return de},setTest:function(ee){ee?ae(n.DEPTH_TEST):Le(n.DEPTH_TEST)},setMask:function(ee){J!==ee&&!D&&(n.depthMask(ee),J=ee)},setFunc:function(ee){if(de&&(ee=Mg[ee]),me!==ee){switch(ee){case fc:n.depthFunc(n.NEVER);break;case pc:n.depthFunc(n.ALWAYS);break;case mc:n.depthFunc(n.LESS);break;case Ns:n.depthFunc(n.LEQUAL);break;case gc:n.depthFunc(n.EQUAL);break;case _c:n.depthFunc(n.GEQUAL);break;case vc:n.depthFunc(n.GREATER);break;case xc:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}me=ee}},setLocked:function(ee){D=ee},setClear:function(ee){Se!==ee&&(Se=ee,de&&(ee=1-ee),n.clearDepth(ee))},reset:function(){D=!1,J=null,me=null,Se=null,de=!1}}}function s(){let D=!1,de=null,J=null,me=null,Se=null,ee=null,Re=null,Ee=null,St=null;return{setTest:function(vt){D||(vt?ae(n.STENCIL_TEST):Le(n.STENCIL_TEST))},setMask:function(vt){de!==vt&&!D&&(n.stencilMask(vt),de=vt)},setFunc:function(vt,yn,Sn){(J!==vt||me!==yn||Se!==Sn)&&(n.stencilFunc(vt,yn,Sn),J=vt,me=yn,Se=Sn)},setOp:function(vt,yn,Sn){(ee!==vt||Re!==yn||Ee!==Sn)&&(n.stencilOp(vt,yn,Sn),ee=vt,Re=yn,Ee=Sn)},setLocked:function(vt){D=vt},setClear:function(vt){St!==vt&&(n.clearStencil(vt),St=vt)},reset:function(){D=!1,de=null,J=null,me=null,Se=null,ee=null,Re=null,Ee=null,St=null}}}const a=new t,r=new i,o=new s,l=new WeakMap,c=new WeakMap;let h={},d={},u={},f=new WeakMap,m=[],M=null,p=!1,g=null,y=null,S=null,x=null,w=null,T=null,A=null,_=new ze(0,0,0),E=0,P=!1,I=null,N=null,G=null,X=null,O=null;const W=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let H=!1,Q=0;const $=n.getParameter(n.VERSION);$.indexOf("WebGL")!==-1?(Q=parseFloat(/^WebGL (\d)/.exec($)[1]),H=Q>=1):$.indexOf("OpenGL ES")!==-1&&(Q=parseFloat(/^OpenGL ES (\d)/.exec($)[1]),H=Q>=2);let se=null,re={};const ue=n.getParameter(n.SCISSOR_BOX),Ve=n.getParameter(n.VIEWPORT),ot=new at().fromArray(ue),nt=new at().fromArray(Ve);function K(D,de,J,me){const Se=new Uint8Array(4),ee=n.createTexture();n.bindTexture(D,ee),n.texParameteri(D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(D,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let Re=0;Re<J;Re++)D===n.TEXTURE_3D||D===n.TEXTURE_2D_ARRAY?n.texImage3D(de,0,n.RGBA,1,1,me,0,n.RGBA,n.UNSIGNED_BYTE,Se):n.texImage2D(de+Re,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,Se);return ee}const le={};le[n.TEXTURE_2D]=K(n.TEXTURE_2D,n.TEXTURE_2D,1),le[n.TEXTURE_CUBE_MAP]=K(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),le[n.TEXTURE_2D_ARRAY]=K(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),le[n.TEXTURE_3D]=K(n.TEXTURE_3D,n.TEXTURE_3D,1,1),a.setClear(0,0,0,1),r.setClear(1),o.setClear(0),ae(n.DEPTH_TEST),r.setFunc(Ns),xe(!1),ge(hc),ae(n.CULL_FACE),ie($n);function ae(D){h[D]!==!0&&(n.enable(D),h[D]=!0)}function Le(D){h[D]!==!1&&(n.disable(D),h[D]=!1)}function Ge(D,de){return u[D]!==de?(n.bindFramebuffer(D,de),u[D]=de,D===n.DRAW_FRAMEBUFFER&&(u[n.FRAMEBUFFER]=de),D===n.FRAMEBUFFER&&(u[n.DRAW_FRAMEBUFFER]=de),!0):!1}function Fe(D,de){let J=m,me=!1;if(D){J=f.get(de),J===void 0&&(J=[],f.set(de,J));const Se=D.textures;if(J.length!==Se.length||J[0]!==n.COLOR_ATTACHMENT0){for(let ee=0,Re=Se.length;ee<Re;ee++)J[ee]=n.COLOR_ATTACHMENT0+ee;J.length=Se.length,me=!0}}else J[0]!==n.BACK&&(J[0]=n.BACK,me=!0);me&&n.drawBuffers(J)}function rt(D){return M!==D?(n.useProgram(D),M=D,!0):!1}const Xe={[Ni]:n.FUNC_ADD,[z0]:n.FUNC_SUBTRACT,[H0]:n.FUNC_REVERSE_SUBTRACT};Xe[V0]=n.MIN,Xe[G0]=n.MAX;const j={[W0]:n.ZERO,[X0]:n.ONE,[q0]:n.SRC_COLOR,[uc]:n.SRC_ALPHA,[Q0]:n.SRC_ALPHA_SATURATE,[J0]:n.DST_COLOR,[$0]:n.DST_ALPHA,[Y0]:n.ONE_MINUS_SRC_COLOR,[dc]:n.ONE_MINUS_SRC_ALPHA,[Z0]:n.ONE_MINUS_DST_COLOR,[K0]:n.ONE_MINUS_DST_ALPHA,[j0]:n.CONSTANT_COLOR,[eg]:n.ONE_MINUS_CONSTANT_COLOR,[tg]:n.CONSTANT_ALPHA,[ng]:n.ONE_MINUS_CONSTANT_ALPHA};function ie(D,de,J,me,Se,ee,Re,Ee,St,vt){if(D===$n){p===!0&&(Le(n.BLEND),p=!1);return}if(p===!1&&(ae(n.BLEND),p=!0),D!==k0){if(D!==g||vt!==P){if((y!==Ni||w!==Ni)&&(n.blendEquation(n.FUNC_ADD),y=Ni,w=Ni),vt)switch(D){case ws:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Du:n.blendFunc(n.ONE,n.ONE);break;case Uu:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Fu:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:ke("WebGLState: Invalid blending: ",D);break}else switch(D){case ws:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Du:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case Uu:ke("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Fu:ke("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:ke("WebGLState: Invalid blending: ",D);break}S=null,x=null,T=null,A=null,_.set(0,0,0),E=0,g=D,P=vt}return}Se=Se||de,ee=ee||J,Re=Re||me,(de!==y||Se!==w)&&(n.blendEquationSeparate(Xe[de],Xe[Se]),y=de,w=Se),(J!==S||me!==x||ee!==T||Re!==A)&&(n.blendFuncSeparate(j[J],j[me],j[ee],j[Re]),S=J,x=me,T=ee,A=Re),(Ee.equals(_)===!1||St!==E)&&(n.blendColor(Ee.r,Ee.g,Ee.b,St),_.copy(Ee),E=St),g=D,P=!1}function ne(D,de){D.side===Pn?Le(n.CULL_FACE):ae(n.CULL_FACE);let J=D.side===Xt;de&&(J=!J),xe(J),D.blending===ws&&D.transparent===!1?ie($n):ie(D.blending,D.blendEquation,D.blendSrc,D.blendDst,D.blendEquationAlpha,D.blendSrcAlpha,D.blendDstAlpha,D.blendColor,D.blendAlpha,D.premultipliedAlpha),r.setFunc(D.depthFunc),r.setTest(D.depthTest),r.setMask(D.depthWrite),a.setMask(D.colorWrite);const me=D.stencilWrite;o.setTest(me),me&&(o.setMask(D.stencilWriteMask),o.setFunc(D.stencilFunc,D.stencilRef,D.stencilFuncMask),o.setOp(D.stencilFail,D.stencilZFail,D.stencilZPass)),Pe(D.polygonOffset,D.polygonOffsetFactor,D.polygonOffsetUnits),D.alphaToCoverage===!0?ae(n.SAMPLE_ALPHA_TO_COVERAGE):Le(n.SAMPLE_ALPHA_TO_COVERAGE)}function xe(D){I!==D&&(D?n.frontFace(n.CW):n.frontFace(n.CCW),I=D)}function ge(D){D!==O0?(ae(n.CULL_FACE),D!==N&&(D===hc?n.cullFace(n.BACK):D===op?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):Le(n.CULL_FACE),N=D}function Be(D){D!==G&&(H&&n.lineWidth(D),G=D)}function Pe(D,de,J){D?(ae(n.POLYGON_OFFSET_FILL),(X!==de||O!==J)&&(X=de,O=J,r.getReversed()&&(de=-de),n.polygonOffset(de,J))):Le(n.POLYGON_OFFSET_FILL)}function We(D){D?ae(n.SCISSOR_TEST):Le(n.SCISSOR_TEST)}function Ye(D){D===void 0&&(D=n.TEXTURE0+W-1),se!==D&&(n.activeTexture(D),se=D)}function L(D,de,J){J===void 0&&(se===null?J=n.TEXTURE0+W-1:J=se);let me=re[J];me===void 0&&(me={type:void 0,texture:void 0},re[J]=me),(me.type!==D||me.texture!==de)&&(se!==J&&(n.activeTexture(J),se=J),n.bindTexture(D,de||le[D]),me.type=D,me.texture=de)}function ut(){const D=re[se];D!==void 0&&D.type!==void 0&&(n.bindTexture(D.type,null),D.type=void 0,D.texture=void 0)}function tt(){try{n.compressedTexImage2D(...arguments)}catch(D){ke("WebGLState:",D)}}function R(){try{n.compressedTexImage3D(...arguments)}catch(D){ke("WebGLState:",D)}}function v(){try{n.texSubImage2D(...arguments)}catch(D){ke("WebGLState:",D)}}function F(){try{n.texSubImage3D(...arguments)}catch(D){ke("WebGLState:",D)}}function z(){try{n.compressedTexSubImage2D(...arguments)}catch(D){ke("WebGLState:",D)}}function q(){try{n.compressedTexSubImage3D(...arguments)}catch(D){ke("WebGLState:",D)}}function oe(){try{n.texStorage2D(...arguments)}catch(D){ke("WebGLState:",D)}}function ce(){try{n.texStorage3D(...arguments)}catch(D){ke("WebGLState:",D)}}function Y(){try{n.texImage2D(...arguments)}catch(D){ke("WebGLState:",D)}}function Z(){try{n.texImage3D(...arguments)}catch(D){ke("WebGLState:",D)}}function fe(D){return d[D]!==void 0?d[D]:n.getParameter(D)}function Ce(D,de){d[D]!==de&&(n.pixelStorei(D,de),d[D]=de)}function _e(D){ot.equals(D)===!1&&(n.scissor(D.x,D.y,D.z,D.w),ot.copy(D))}function pe(D){nt.equals(D)===!1&&(n.viewport(D.x,D.y,D.z,D.w),nt.copy(D))}function Ue(D,de){let J=c.get(de);J===void 0&&(J=new WeakMap,c.set(de,J));let me=J.get(D);me===void 0&&(me=n.getUniformBlockIndex(de,D.name),J.set(D,me))}function He(D,de){const me=c.get(de).get(D);l.get(de)!==me&&(n.uniformBlockBinding(de,me,D.__bindingPointIndex),l.set(de,me))}function Ke(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),r.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),n.pixelStorei(n.PACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,n.BROWSER_DEFAULT_WEBGL),n.pixelStorei(n.PACK_ROW_LENGTH,0),n.pixelStorei(n.PACK_SKIP_PIXELS,0),n.pixelStorei(n.PACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_ROW_LENGTH,0),n.pixelStorei(n.UNPACK_IMAGE_HEIGHT,0),n.pixelStorei(n.UNPACK_SKIP_PIXELS,0),n.pixelStorei(n.UNPACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_SKIP_IMAGES,0),h={},d={},se=null,re={},u={},f=new WeakMap,m=[],M=null,p=!1,g=null,y=null,S=null,x=null,w=null,T=null,A=null,_=new ze(0,0,0),E=0,P=!1,I=null,N=null,G=null,X=null,O=null,ot.set(0,0,n.canvas.width,n.canvas.height),nt.set(0,0,n.canvas.width,n.canvas.height),a.reset(),r.reset(),o.reset()}return{buffers:{color:a,depth:r,stencil:o},enable:ae,disable:Le,bindFramebuffer:Ge,drawBuffers:Fe,useProgram:rt,setBlending:ie,setMaterial:ne,setFlipSided:xe,setCullFace:ge,setLineWidth:Be,setPolygonOffset:Pe,setScissorTest:We,activeTexture:Ye,bindTexture:L,unbindTexture:ut,compressedTexImage2D:tt,compressedTexImage3D:R,texImage2D:Y,texImage3D:Z,pixelStorei:Ce,getParameter:fe,updateUBOMapping:Ue,uniformBlockBinding:He,texStorage2D:oe,texStorage3D:ce,texSubImage2D:v,texSubImage3D:F,compressedTexSubImage2D:z,compressedTexSubImage3D:q,scissor:_e,viewport:pe,reset:Ke}}function cb(n,e,t,i,s,a,r){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new te,h=new WeakMap,d=new Set;let u;const f=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function M(R,v){return m?new OffscreenCanvas(R,v):Or("canvas")}function p(R,v,F){let z=1;const q=tt(R);if((q.width>F||q.height>F)&&(z=F/Math.max(q.width,q.height)),z<1)if(typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&R instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&R instanceof ImageBitmap||typeof VideoFrame<"u"&&R instanceof VideoFrame){const oe=Math.floor(z*q.width),ce=Math.floor(z*q.height);u===void 0&&(u=M(oe,ce));const Y=v?M(oe,ce):u;return Y.width=oe,Y.height=ce,Y.getContext("2d").drawImage(R,0,0,oe,ce),Ae("WebGLRenderer: Texture has been resized from ("+q.width+"x"+q.height+") to ("+oe+"x"+ce+")."),Y}else return"data"in R&&Ae("WebGLRenderer: Image in DataTexture is too big ("+q.width+"x"+q.height+")."),R;return R}function g(R){return R.generateMipmaps}function y(R){n.generateMipmap(R)}function S(R){return R.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:R.isWebGL3DRenderTarget?n.TEXTURE_3D:R.isWebGLArrayRenderTarget||R.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function x(R,v,F,z,q,oe=!1){if(R!==null){if(n[R]!==void 0)return n[R];Ae("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+R+"'")}let ce;z&&(ce=e.get("EXT_texture_norm16"),ce||Ae("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Y=v;if(v===n.RED&&(F===n.FLOAT&&(Y=n.R32F),F===n.HALF_FLOAT&&(Y=n.R16F),F===n.UNSIGNED_BYTE&&(Y=n.R8),F===n.UNSIGNED_SHORT&&ce&&(Y=ce.R16_EXT),F===n.SHORT&&ce&&(Y=ce.R16_SNORM_EXT)),v===n.RED_INTEGER&&(F===n.UNSIGNED_BYTE&&(Y=n.R8UI),F===n.UNSIGNED_SHORT&&(Y=n.R16UI),F===n.UNSIGNED_INT&&(Y=n.R32UI),F===n.BYTE&&(Y=n.R8I),F===n.SHORT&&(Y=n.R16I),F===n.INT&&(Y=n.R32I)),v===n.RG&&(F===n.FLOAT&&(Y=n.RG32F),F===n.HALF_FLOAT&&(Y=n.RG16F),F===n.UNSIGNED_BYTE&&(Y=n.RG8),F===n.UNSIGNED_SHORT&&ce&&(Y=ce.RG16_EXT),F===n.SHORT&&ce&&(Y=ce.RG16_SNORM_EXT)),v===n.RG_INTEGER&&(F===n.UNSIGNED_BYTE&&(Y=n.RG8UI),F===n.UNSIGNED_SHORT&&(Y=n.RG16UI),F===n.UNSIGNED_INT&&(Y=n.RG32UI),F===n.BYTE&&(Y=n.RG8I),F===n.SHORT&&(Y=n.RG16I),F===n.INT&&(Y=n.RG32I)),v===n.RGB_INTEGER&&(F===n.UNSIGNED_BYTE&&(Y=n.RGB8UI),F===n.UNSIGNED_SHORT&&(Y=n.RGB16UI),F===n.UNSIGNED_INT&&(Y=n.RGB32UI),F===n.BYTE&&(Y=n.RGB8I),F===n.SHORT&&(Y=n.RGB16I),F===n.INT&&(Y=n.RGB32I)),v===n.RGBA_INTEGER&&(F===n.UNSIGNED_BYTE&&(Y=n.RGBA8UI),F===n.UNSIGNED_SHORT&&(Y=n.RGBA16UI),F===n.UNSIGNED_INT&&(Y=n.RGBA32UI),F===n.BYTE&&(Y=n.RGBA8I),F===n.SHORT&&(Y=n.RGBA16I),F===n.INT&&(Y=n.RGBA32I)),v===n.RGB&&(F===n.UNSIGNED_SHORT&&ce&&(Y=ce.RGB16_EXT),F===n.SHORT&&ce&&(Y=ce.RGB16_SNORM_EXT),F===n.UNSIGNED_INT_5_9_9_9_REV&&(Y=n.RGB9_E5),F===n.UNSIGNED_INT_10F_11F_11F_REV&&(Y=n.R11F_G11F_B10F)),v===n.RGBA){const Z=oe?So:it.getTransfer(q);F===n.FLOAT&&(Y=n.RGBA32F),F===n.HALF_FLOAT&&(Y=n.RGBA16F),F===n.UNSIGNED_BYTE&&(Y=Z===ct?n.SRGB8_ALPHA8:n.RGBA8),F===n.UNSIGNED_SHORT&&ce&&(Y=ce.RGBA16_EXT),F===n.SHORT&&ce&&(Y=ce.RGBA16_SNORM_EXT),F===n.UNSIGNED_SHORT_4_4_4_4&&(Y=n.RGBA4),F===n.UNSIGNED_SHORT_5_5_5_1&&(Y=n.RGB5_A1)}return(Y===n.R16F||Y===n.R32F||Y===n.RG16F||Y===n.RG32F||Y===n.RGBA16F||Y===n.RGBA32F)&&e.get("EXT_color_buffer_float"),Y}function w(R,v){let F;return R?v===null||v===Dn||v===Ur?F=n.DEPTH24_STENCIL8:v===an?F=n.DEPTH32F_STENCIL8:v===Dr&&(F=n.DEPTH24_STENCIL8,Ae("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===Dn||v===Ur?F=n.DEPTH_COMPONENT24:v===an?F=n.DEPTH_COMPONENT32F:v===Dr&&(F=n.DEPTH_COMPONENT16),F}function T(R,v){return g(R)===!0||R.isFramebufferTexture&&R.minFilter!==Ft&&R.minFilter!==Ct?Math.log2(Math.max(v.width,v.height))+1:R.mipmaps!==void 0&&R.mipmaps.length>0?R.mipmaps.length:R.isCompressedTexture&&Array.isArray(R.image)?v.mipmaps.length:1}function A(R){const v=R.target;v.removeEventListener("dispose",A),E(v),v.isVideoTexture&&h.delete(v),v.isHTMLTexture&&d.delete(v)}function _(R){const v=R.target;v.removeEventListener("dispose",_),I(v)}function E(R){const v=i.get(R);if(v.__webglInit===void 0)return;const F=R.source,z=f.get(F);if(z){const q=z[v.__cacheKey];q.usedTimes--,q.usedTimes===0&&P(R),Object.keys(z).length===0&&f.delete(F)}i.remove(R)}function P(R){const v=i.get(R);n.deleteTexture(v.__webglTexture);const F=R.source,z=f.get(F);delete z[v.__cacheKey],r.memory.textures--}function I(R){const v=i.get(R);if(R.depthTexture&&(R.depthTexture.dispose(),i.remove(R.depthTexture)),R.isWebGLCubeRenderTarget)for(let z=0;z<6;z++){if(Array.isArray(v.__webglFramebuffer[z]))for(let q=0;q<v.__webglFramebuffer[z].length;q++)n.deleteFramebuffer(v.__webglFramebuffer[z][q]);else n.deleteFramebuffer(v.__webglFramebuffer[z]);v.__webglDepthbuffer&&n.deleteRenderbuffer(v.__webglDepthbuffer[z])}else{if(Array.isArray(v.__webglFramebuffer))for(let z=0;z<v.__webglFramebuffer.length;z++)n.deleteFramebuffer(v.__webglFramebuffer[z]);else n.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&n.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&n.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let z=0;z<v.__webglColorRenderbuffer.length;z++)v.__webglColorRenderbuffer[z]&&n.deleteRenderbuffer(v.__webglColorRenderbuffer[z]);v.__webglDepthRenderbuffer&&n.deleteRenderbuffer(v.__webglDepthRenderbuffer)}const F=R.textures;for(let z=0,q=F.length;z<q;z++){const oe=i.get(F[z]);oe.__webglTexture&&(n.deleteTexture(oe.__webglTexture),r.memory.textures--),i.remove(F[z])}i.remove(R)}let N=0;function G(){N=0}function X(){return N}function O(R){N=R}function W(){const R=N;return R>=s.maxTextures&&Ae("WebGLTextures: Trying to use "+R+" texture units while this GPU supports only "+s.maxTextures),N+=1,R}function H(R){const v=[];return v.push(R.wrapS),v.push(R.wrapT),v.push(R.wrapR||0),v.push(R.magFilter),v.push(R.minFilter),v.push(R.anisotropy),v.push(R.internalFormat),v.push(R.format),v.push(R.type),v.push(R.generateMipmaps),v.push(R.premultiplyAlpha),v.push(R.flipY),v.push(R.unpackAlignment),v.push(R.colorSpace),v.join()}function Q(R,v){const F=i.get(R);if(R.isVideoTexture&&L(R),R.isRenderTargetTexture===!1&&R.isExternalTexture!==!0&&R.version>0&&F.__version!==R.version){const z=R.image;if(z===null)Ae("WebGLRenderer: Texture marked for update but no image data found.");else if(z.complete===!1)Ae("WebGLRenderer: Texture marked for update but image is incomplete");else{Le(F,R,v);return}}else R.isExternalTexture&&(F.__webglTexture=R.sourceTexture?R.sourceTexture:null);t.bindTexture(n.TEXTURE_2D,F.__webglTexture,n.TEXTURE0+v)}function $(R,v){const F=i.get(R);if(R.isRenderTargetTexture===!1&&R.version>0&&F.__version!==R.version){Le(F,R,v);return}else R.isExternalTexture&&(F.__webglTexture=R.sourceTexture?R.sourceTexture:null);t.bindTexture(n.TEXTURE_2D_ARRAY,F.__webglTexture,n.TEXTURE0+v)}function se(R,v){const F=i.get(R);if(R.isRenderTargetTexture===!1&&R.version>0&&F.__version!==R.version){Le(F,R,v);return}t.bindTexture(n.TEXTURE_3D,F.__webglTexture,n.TEXTURE0+v)}function re(R,v){const F=i.get(R);if(R.isCubeDepthTexture!==!0&&R.version>0&&F.__version!==R.version){Ge(F,R,v);return}t.bindTexture(n.TEXTURE_CUBE_MAP,F.__webglTexture,n.TEXTURE0+v)}const ue={[Hi]:n.REPEAT,[Xn]:n.CLAMP_TO_EDGE,[Mc]:n.MIRRORED_REPEAT},Ve={[Ft]:n.NEAREST,[ag]:n.NEAREST_MIPMAP_NEAREST,[la]:n.NEAREST_MIPMAP_LINEAR,[Ct]:n.LINEAR,[nl]:n.LINEAR_MIPMAP_NEAREST,[xi]:n.LINEAR_MIPMAP_LINEAR},ot={[hg]:n.NEVER,[mg]:n.ALWAYS,[ug]:n.LESS,[Ph]:n.LEQUAL,[dg]:n.EQUAL,[Ch]:n.GEQUAL,[fg]:n.GREATER,[pg]:n.NOTEQUAL};function nt(R,v){if(v.type===an&&e.has("OES_texture_float_linear")===!1&&(v.magFilter===Ct||v.magFilter===nl||v.magFilter===la||v.magFilter===xi||v.minFilter===Ct||v.minFilter===nl||v.minFilter===la||v.minFilter===xi)&&Ae("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(R,n.TEXTURE_WRAP_S,ue[v.wrapS]),n.texParameteri(R,n.TEXTURE_WRAP_T,ue[v.wrapT]),(R===n.TEXTURE_3D||R===n.TEXTURE_2D_ARRAY)&&n.texParameteri(R,n.TEXTURE_WRAP_R,ue[v.wrapR]),n.texParameteri(R,n.TEXTURE_MAG_FILTER,Ve[v.magFilter]),n.texParameteri(R,n.TEXTURE_MIN_FILTER,Ve[v.minFilter]),v.compareFunction&&(n.texParameteri(R,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(R,n.TEXTURE_COMPARE_FUNC,ot[v.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===Ft||v.minFilter!==la&&v.minFilter!==xi||v.type===an&&e.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||i.get(v).__currentAnisotropy){const F=e.get("EXT_texture_filter_anisotropic");n.texParameterf(R,F.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,s.getMaxAnisotropy())),i.get(v).__currentAnisotropy=v.anisotropy}}}function K(R,v){let F=!1;R.__webglInit===void 0&&(R.__webglInit=!0,v.addEventListener("dispose",A));const z=v.source;let q=f.get(z);q===void 0&&(q={},f.set(z,q));const oe=H(v);if(oe!==R.__cacheKey){q[oe]===void 0&&(q[oe]={texture:n.createTexture(),usedTimes:0},r.memory.textures++,F=!0),q[oe].usedTimes++;const ce=q[R.__cacheKey];ce!==void 0&&(q[R.__cacheKey].usedTimes--,ce.usedTimes===0&&P(v)),R.__cacheKey=oe,R.__webglTexture=q[oe].texture}return F}function le(R,v,F){return Math.floor(Math.floor(R/F)/v)}function ae(R,v,F,z){const oe=R.updateRanges;if(oe.length===0)t.texSubImage2D(n.TEXTURE_2D,0,0,0,v.width,v.height,F,z,v.data);else{oe.sort((Ce,_e)=>Ce.start-_e.start);let ce=0;for(let Ce=1;Ce<oe.length;Ce++){const _e=oe[ce],pe=oe[Ce],Ue=_e.start+_e.count,He=le(pe.start,v.width,4),Ke=le(_e.start,v.width,4);pe.start<=Ue+1&&He===Ke&&le(pe.start+pe.count-1,v.width,4)===He?_e.count=Math.max(_e.count,pe.start+pe.count-_e.start):(++ce,oe[ce]=pe)}oe.length=ce+1;const Y=t.getParameter(n.UNPACK_ROW_LENGTH),Z=t.getParameter(n.UNPACK_SKIP_PIXELS),fe=t.getParameter(n.UNPACK_SKIP_ROWS);t.pixelStorei(n.UNPACK_ROW_LENGTH,v.width);for(let Ce=0,_e=oe.length;Ce<_e;Ce++){const pe=oe[Ce],Ue=Math.floor(pe.start/4),He=Math.ceil(pe.count/4),Ke=Ue%v.width,D=Math.floor(Ue/v.width),de=He,J=1;t.pixelStorei(n.UNPACK_SKIP_PIXELS,Ke),t.pixelStorei(n.UNPACK_SKIP_ROWS,D),t.texSubImage2D(n.TEXTURE_2D,0,Ke,D,de,J,F,z,v.data)}R.clearUpdateRanges(),t.pixelStorei(n.UNPACK_ROW_LENGTH,Y),t.pixelStorei(n.UNPACK_SKIP_PIXELS,Z),t.pixelStorei(n.UNPACK_SKIP_ROWS,fe)}}function Le(R,v,F){let z=n.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(z=n.TEXTURE_2D_ARRAY),v.isData3DTexture&&(z=n.TEXTURE_3D);const q=K(R,v),oe=v.source;t.bindTexture(z,R.__webglTexture,n.TEXTURE0+F);const ce=i.get(oe);if(oe.version!==ce.__version||q===!0){if(t.activeTexture(n.TEXTURE0+F),(typeof ImageBitmap<"u"&&v.image instanceof ImageBitmap)===!1){const J=it.getPrimaries(it.workingColorSpace),me=v.colorSpace===vi?null:it.getPrimaries(v.colorSpace),Se=v.colorSpace===vi||J===me?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Se)}t.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment);let Z=p(v.image,!1,s.maxTextureSize);Z=ut(v,Z);const fe=a.convert(v.format,v.colorSpace),Ce=a.convert(v.type);let _e=x(v.internalFormat,fe,Ce,v.normalized,v.colorSpace,v.isVideoTexture);nt(z,v);let pe;const Ue=v.mipmaps,He=v.isVideoTexture!==!0,Ke=ce.__version===void 0||q===!0,D=oe.dataReady,de=T(v,Z);if(v.isDepthTexture)_e=w(v.format===Fi,v.type),Ke&&(He?t.texStorage2D(n.TEXTURE_2D,1,_e,Z.width,Z.height):t.texImage2D(n.TEXTURE_2D,0,_e,Z.width,Z.height,0,fe,Ce,null));else if(v.isDataTexture)if(Ue.length>0){He&&Ke&&t.texStorage2D(n.TEXTURE_2D,de,_e,Ue[0].width,Ue[0].height);for(let J=0,me=Ue.length;J<me;J++)pe=Ue[J],He?D&&t.texSubImage2D(n.TEXTURE_2D,J,0,0,pe.width,pe.height,fe,Ce,pe.data):t.texImage2D(n.TEXTURE_2D,J,_e,pe.width,pe.height,0,fe,Ce,pe.data);v.generateMipmaps=!1}else He?(Ke&&t.texStorage2D(n.TEXTURE_2D,de,_e,Z.width,Z.height),D&&ae(v,Z,fe,Ce)):t.texImage2D(n.TEXTURE_2D,0,_e,Z.width,Z.height,0,fe,Ce,Z.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){He&&Ke&&t.texStorage3D(n.TEXTURE_2D_ARRAY,de,_e,Ue[0].width,Ue[0].height,Z.depth);for(let J=0,me=Ue.length;J<me;J++)if(pe=Ue[J],v.format!==on)if(fe!==null)if(He){if(D)if(v.layerUpdates.size>0){const Se=zd(pe.width,pe.height,v.format,v.type);for(const ee of v.layerUpdates){const Re=pe.data.subarray(ee*Se/pe.data.BYTES_PER_ELEMENT,(ee+1)*Se/pe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,J,0,0,ee,pe.width,pe.height,1,fe,Re)}v.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,J,0,0,0,pe.width,pe.height,Z.depth,fe,pe.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,J,_e,pe.width,pe.height,Z.depth,0,pe.data,0,0);else Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else He?D&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,J,0,0,0,pe.width,pe.height,Z.depth,fe,Ce,pe.data):t.texImage3D(n.TEXTURE_2D_ARRAY,J,_e,pe.width,pe.height,Z.depth,0,fe,Ce,pe.data)}else{He&&Ke&&t.texStorage2D(n.TEXTURE_2D,de,_e,Ue[0].width,Ue[0].height);for(let J=0,me=Ue.length;J<me;J++)pe=Ue[J],v.format!==on?fe!==null?He?D&&t.compressedTexSubImage2D(n.TEXTURE_2D,J,0,0,pe.width,pe.height,fe,pe.data):t.compressedTexImage2D(n.TEXTURE_2D,J,_e,pe.width,pe.height,0,pe.data):Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):He?D&&t.texSubImage2D(n.TEXTURE_2D,J,0,0,pe.width,pe.height,fe,Ce,pe.data):t.texImage2D(n.TEXTURE_2D,J,_e,pe.width,pe.height,0,fe,Ce,pe.data)}else if(v.isDataArrayTexture)if(He){if(Ke&&t.texStorage3D(n.TEXTURE_2D_ARRAY,de,_e,Z.width,Z.height,Z.depth),D)if(v.layerUpdates.size>0){const J=zd(Z.width,Z.height,v.format,v.type);for(const me of v.layerUpdates){const Se=Z.data.subarray(me*J/Z.data.BYTES_PER_ELEMENT,(me+1)*J/Z.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,me,Z.width,Z.height,1,fe,Ce,Se)}v.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,Z.width,Z.height,Z.depth,fe,Ce,Z.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,_e,Z.width,Z.height,Z.depth,0,fe,Ce,Z.data);else if(v.isData3DTexture)He?(Ke&&t.texStorage3D(n.TEXTURE_3D,de,_e,Z.width,Z.height,Z.depth),D&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,Z.width,Z.height,Z.depth,fe,Ce,Z.data)):t.texImage3D(n.TEXTURE_3D,0,_e,Z.width,Z.height,Z.depth,0,fe,Ce,Z.data);else if(v.isFramebufferTexture){if(Ke)if(He)t.texStorage2D(n.TEXTURE_2D,de,_e,Z.width,Z.height);else{let J=Z.width,me=Z.height;for(let Se=0;Se<de;Se++)t.texImage2D(n.TEXTURE_2D,Se,_e,J,me,0,fe,Ce,null),J>>=1,me>>=1}}else if(v.isHTMLTexture){if("texElementImage2D"in n){const J=n.canvas;if(J.hasAttribute("layoutsubtree")||J.setAttribute("layoutsubtree","true"),Z.parentNode!==J){J.appendChild(Z),d.add(v),J.onpaint=me=>{const Se=me.changedElements;for(const ee of d)Se.includes(ee.image)&&(ee.needsUpdate=!0)},J.requestPaint();return}if(n.texElementImage2D.length===3)n.texElementImage2D(n.TEXTURE_2D,n.RGBA8,Z);else{const Se=n.RGBA,ee=n.RGBA,Re=n.UNSIGNED_BYTE;n.texElementImage2D(n.TEXTURE_2D,0,Se,ee,Re,Z)}n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)}}else if(Ue.length>0){if(He&&Ke){const J=tt(Ue[0]);t.texStorage2D(n.TEXTURE_2D,de,_e,J.width,J.height)}for(let J=0,me=Ue.length;J<me;J++)pe=Ue[J],He?D&&t.texSubImage2D(n.TEXTURE_2D,J,0,0,fe,Ce,pe):t.texImage2D(n.TEXTURE_2D,J,_e,fe,Ce,pe);v.generateMipmaps=!1}else if(He){if(Ke){const J=tt(Z);t.texStorage2D(n.TEXTURE_2D,de,_e,J.width,J.height)}D&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,fe,Ce,Z)}else t.texImage2D(n.TEXTURE_2D,0,_e,fe,Ce,Z);g(v)&&y(z),ce.__version=oe.version,v.onUpdate&&v.onUpdate(v)}R.__version=v.version}function Ge(R,v,F){if(v.image.length!==6)return;const z=K(R,v),q=v.source;t.bindTexture(n.TEXTURE_CUBE_MAP,R.__webglTexture,n.TEXTURE0+F);const oe=i.get(q);if(q.version!==oe.__version||z===!0){t.activeTexture(n.TEXTURE0+F);const ce=it.getPrimaries(it.workingColorSpace),Y=v.colorSpace===vi?null:it.getPrimaries(v.colorSpace),Z=v.colorSpace===vi||ce===Y?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),t.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Z);const fe=v.isCompressedTexture||v.image[0].isCompressedTexture,Ce=v.image[0]&&v.image[0].isDataTexture,_e=[];for(let ee=0;ee<6;ee++)!fe&&!Ce?_e[ee]=p(v.image[ee],!0,s.maxCubemapSize):_e[ee]=Ce?v.image[ee].image:v.image[ee],_e[ee]=ut(v,_e[ee]);const pe=_e[0],Ue=a.convert(v.format,v.colorSpace),He=a.convert(v.type),Ke=x(v.internalFormat,Ue,He,v.normalized,v.colorSpace),D=v.isVideoTexture!==!0,de=oe.__version===void 0||z===!0,J=q.dataReady;let me=T(v,pe);nt(n.TEXTURE_CUBE_MAP,v);let Se;if(fe){D&&de&&t.texStorage2D(n.TEXTURE_CUBE_MAP,me,Ke,pe.width,pe.height);for(let ee=0;ee<6;ee++){Se=_e[ee].mipmaps;for(let Re=0;Re<Se.length;Re++){const Ee=Se[Re];v.format!==on?Ue!==null?D?J&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Re,0,0,Ee.width,Ee.height,Ue,Ee.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Re,Ke,Ee.width,Ee.height,0,Ee.data):Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):D?J&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Re,0,0,Ee.width,Ee.height,Ue,He,Ee.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Re,Ke,Ee.width,Ee.height,0,Ue,He,Ee.data)}}}else{if(Se=v.mipmaps,D&&de){Se.length>0&&me++;const ee=tt(_e[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,me,Ke,ee.width,ee.height)}for(let ee=0;ee<6;ee++)if(Ce){D?J&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,_e[ee].width,_e[ee].height,Ue,He,_e[ee].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,Ke,_e[ee].width,_e[ee].height,0,Ue,He,_e[ee].data);for(let Re=0;Re<Se.length;Re++){const St=Se[Re].image[ee].image;D?J&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Re+1,0,0,St.width,St.height,Ue,He,St.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Re+1,Ke,St.width,St.height,0,Ue,He,St.data)}}else{D?J&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,Ue,He,_e[ee]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,Ke,Ue,He,_e[ee]);for(let Re=0;Re<Se.length;Re++){const Ee=Se[Re];D?J&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Re+1,0,0,Ue,He,Ee.image[ee]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Re+1,Ke,Ue,He,Ee.image[ee])}}}g(v)&&y(n.TEXTURE_CUBE_MAP),oe.__version=q.version,v.onUpdate&&v.onUpdate(v)}R.__version=v.version}function Fe(R,v,F,z,q,oe){const ce=a.convert(F.format,F.colorSpace),Y=a.convert(F.type),Z=x(F.internalFormat,ce,Y,F.normalized,F.colorSpace),fe=i.get(v),Ce=i.get(F);if(Ce.__renderTarget=v,!fe.__hasExternalTextures){const _e=Math.max(1,v.width>>oe),pe=Math.max(1,v.height>>oe);q===n.TEXTURE_3D||q===n.TEXTURE_2D_ARRAY?t.texImage3D(q,oe,Z,_e,pe,v.depth,0,ce,Y,null):t.texImage2D(q,oe,Z,_e,pe,0,ce,Y,null)}t.bindFramebuffer(n.FRAMEBUFFER,R),Ye(v)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,z,q,Ce.__webglTexture,0,We(v)):(q===n.TEXTURE_2D||q>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&q<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,z,q,Ce.__webglTexture,oe),t.bindFramebuffer(n.FRAMEBUFFER,null)}function rt(R,v,F){if(n.bindRenderbuffer(n.RENDERBUFFER,R),v.depthBuffer){const z=v.depthTexture,q=z&&z.isDepthTexture?z.type:null,oe=w(v.stencilBuffer,q),ce=v.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;Ye(v)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,We(v),oe,v.width,v.height):F?n.renderbufferStorageMultisample(n.RENDERBUFFER,We(v),oe,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,oe,v.width,v.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,ce,n.RENDERBUFFER,R)}else{const z=v.textures;for(let q=0;q<z.length;q++){const oe=z[q],ce=a.convert(oe.format,oe.colorSpace),Y=a.convert(oe.type),Z=x(oe.internalFormat,ce,Y,oe.normalized,oe.colorSpace);Ye(v)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,We(v),Z,v.width,v.height):F?n.renderbufferStorageMultisample(n.RENDERBUFFER,We(v),Z,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,Z,v.width,v.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Xe(R,v,F){const z=v.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(n.FRAMEBUFFER,R),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const q=i.get(v.depthTexture);if(q.__renderTarget=v,(!q.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),z){if(q.__webglInit===void 0&&(q.__webglInit=!0,v.depthTexture.addEventListener("dispose",A)),q.__webglTexture===void 0){q.__webglTexture=n.createTexture(),t.bindTexture(n.TEXTURE_CUBE_MAP,q.__webglTexture),nt(n.TEXTURE_CUBE_MAP,v.depthTexture);const fe=a.convert(v.depthTexture.format),Ce=a.convert(v.depthTexture.type);let _e;v.depthTexture.format===Jn?_e=n.DEPTH_COMPONENT24:v.depthTexture.format===Fi&&(_e=n.DEPTH24_STENCIL8);for(let pe=0;pe<6;pe++)n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,0,_e,v.width,v.height,0,fe,Ce,null)}}else Q(v.depthTexture,0);const oe=q.__webglTexture,ce=We(v),Y=z?n.TEXTURE_CUBE_MAP_POSITIVE_X+F:n.TEXTURE_2D,Z=v.depthTexture.format===Fi?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(v.depthTexture.format===Jn)Ye(v)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,Z,Y,oe,0,ce):n.framebufferTexture2D(n.FRAMEBUFFER,Z,Y,oe,0);else if(v.depthTexture.format===Fi)Ye(v)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,Z,Y,oe,0,ce):n.framebufferTexture2D(n.FRAMEBUFFER,Z,Y,oe,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function j(R){const v=i.get(R),F=R.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==R.depthTexture){const z=R.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),z){const q=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,z.removeEventListener("dispose",q)};z.addEventListener("dispose",q),v.__depthDisposeCallback=q}v.__boundDepthTexture=z}if(R.depthTexture&&!v.__autoAllocateDepthBuffer)if(F)for(let z=0;z<6;z++)Xe(v.__webglFramebuffer[z],R,z);else{const z=R.texture.mipmaps;z&&z.length>0?Xe(v.__webglFramebuffer[0],R,0):Xe(v.__webglFramebuffer,R,0)}else if(F){v.__webglDepthbuffer=[];for(let z=0;z<6;z++)if(t.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer[z]),v.__webglDepthbuffer[z]===void 0)v.__webglDepthbuffer[z]=n.createRenderbuffer(),rt(v.__webglDepthbuffer[z],R,!1);else{const q=R.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,oe=v.__webglDepthbuffer[z];n.bindRenderbuffer(n.RENDERBUFFER,oe),n.framebufferRenderbuffer(n.FRAMEBUFFER,q,n.RENDERBUFFER,oe)}}else{const z=R.texture.mipmaps;if(z&&z.length>0?t.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer[0]):t.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=n.createRenderbuffer(),rt(v.__webglDepthbuffer,R,!1);else{const q=R.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,oe=v.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,oe),n.framebufferRenderbuffer(n.FRAMEBUFFER,q,n.RENDERBUFFER,oe)}}t.bindFramebuffer(n.FRAMEBUFFER,null)}function ie(R,v,F){const z=i.get(R);v!==void 0&&Fe(z.__webglFramebuffer,R,R.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),F!==void 0&&j(R)}function ne(R){const v=R.texture,F=i.get(R),z=i.get(v);R.addEventListener("dispose",_);const q=R.textures,oe=R.isWebGLCubeRenderTarget===!0,ce=q.length>1;if(ce||(z.__webglTexture===void 0&&(z.__webglTexture=n.createTexture()),z.__version=v.version,r.memory.textures++),oe){F.__webglFramebuffer=[];for(let Y=0;Y<6;Y++)if(v.mipmaps&&v.mipmaps.length>0){F.__webglFramebuffer[Y]=[];for(let Z=0;Z<v.mipmaps.length;Z++)F.__webglFramebuffer[Y][Z]=n.createFramebuffer()}else F.__webglFramebuffer[Y]=n.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){F.__webglFramebuffer=[];for(let Y=0;Y<v.mipmaps.length;Y++)F.__webglFramebuffer[Y]=n.createFramebuffer()}else F.__webglFramebuffer=n.createFramebuffer();if(ce)for(let Y=0,Z=q.length;Y<Z;Y++){const fe=i.get(q[Y]);fe.__webglTexture===void 0&&(fe.__webglTexture=n.createTexture(),r.memory.textures++)}if(R.samples>0&&Ye(R)===!1){F.__webglMultisampledFramebuffer=n.createFramebuffer(),F.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,F.__webglMultisampledFramebuffer);for(let Y=0;Y<q.length;Y++){const Z=q[Y];F.__webglColorRenderbuffer[Y]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,F.__webglColorRenderbuffer[Y]);const fe=a.convert(Z.format,Z.colorSpace),Ce=a.convert(Z.type),_e=x(Z.internalFormat,fe,Ce,Z.normalized,Z.colorSpace,R.isXRRenderTarget===!0),pe=We(R);n.renderbufferStorageMultisample(n.RENDERBUFFER,pe,_e,R.width,R.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Y,n.RENDERBUFFER,F.__webglColorRenderbuffer[Y])}n.bindRenderbuffer(n.RENDERBUFFER,null),R.depthBuffer&&(F.__webglDepthRenderbuffer=n.createRenderbuffer(),rt(F.__webglDepthRenderbuffer,R,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(oe){t.bindTexture(n.TEXTURE_CUBE_MAP,z.__webglTexture),nt(n.TEXTURE_CUBE_MAP,v);for(let Y=0;Y<6;Y++)if(v.mipmaps&&v.mipmaps.length>0)for(let Z=0;Z<v.mipmaps.length;Z++)Fe(F.__webglFramebuffer[Y][Z],R,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Z);else Fe(F.__webglFramebuffer[Y],R,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0);g(v)&&y(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ce){for(let Y=0,Z=q.length;Y<Z;Y++){const fe=q[Y],Ce=i.get(fe);let _e=n.TEXTURE_2D;(R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(_e=R.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(_e,Ce.__webglTexture),nt(_e,fe),Fe(F.__webglFramebuffer,R,fe,n.COLOR_ATTACHMENT0+Y,_e,0),g(fe)&&y(_e)}t.unbindTexture()}else{let Y=n.TEXTURE_2D;if((R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(Y=R.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(Y,z.__webglTexture),nt(Y,v),v.mipmaps&&v.mipmaps.length>0)for(let Z=0;Z<v.mipmaps.length;Z++)Fe(F.__webglFramebuffer[Z],R,v,n.COLOR_ATTACHMENT0,Y,Z);else Fe(F.__webglFramebuffer,R,v,n.COLOR_ATTACHMENT0,Y,0);g(v)&&y(Y),t.unbindTexture()}R.depthBuffer&&j(R)}function xe(R){const v=R.textures;for(let F=0,z=v.length;F<z;F++){const q=v[F];if(g(q)){const oe=S(R),ce=i.get(q).__webglTexture;t.bindTexture(oe,ce),y(oe),t.unbindTexture()}}}const ge=[],Be=[];function Pe(R){if(R.samples>0){if(Ye(R)===!1){const v=R.textures,F=R.width,z=R.height;let q=n.COLOR_BUFFER_BIT;const oe=R.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ce=i.get(R),Y=v.length>1;if(Y)for(let fe=0;fe<v.length;fe++)t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+fe,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+fe,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,ce.__webglMultisampledFramebuffer);const Z=R.texture.mipmaps;Z&&Z.length>0?t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ce.__webglFramebuffer[0]):t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ce.__webglFramebuffer);for(let fe=0;fe<v.length;fe++){if(R.resolveDepthBuffer&&(R.depthBuffer&&(q|=n.DEPTH_BUFFER_BIT),R.stencilBuffer&&R.resolveStencilBuffer&&(q|=n.STENCIL_BUFFER_BIT)),Y){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,ce.__webglColorRenderbuffer[fe]);const Ce=i.get(v[fe]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Ce,0)}n.blitFramebuffer(0,0,F,z,0,0,F,z,q,n.NEAREST),l===!0&&(ge.length=0,Be.length=0,ge.push(n.COLOR_ATTACHMENT0+fe),R.depthBuffer&&R.resolveDepthBuffer===!1&&(ge.push(oe),Be.push(oe),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,Be)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,ge))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),Y)for(let fe=0;fe<v.length;fe++){t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+fe,n.RENDERBUFFER,ce.__webglColorRenderbuffer[fe]);const Ce=i.get(v[fe]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+fe,n.TEXTURE_2D,Ce,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ce.__webglMultisampledFramebuffer)}else if(R.depthBuffer&&R.resolveDepthBuffer===!1&&l){const v=R.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[v])}}}function We(R){return Math.min(s.maxSamples,R.samples)}function Ye(R){const v=i.get(R);return R.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function L(R){const v=r.render.frame;h.get(R)!==v&&(h.set(R,v),R.update())}function ut(R,v){const F=R.colorSpace,z=R.format,q=R.type;return R.isCompressedTexture===!0||R.isVideoTexture===!0||F!==yo&&F!==vi&&(it.getTransfer(F)===ct?(z!==on||q!==jt)&&Ae("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):ke("WebGLTextures: Unsupported texture color space:",F)),v}function tt(R){return typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement?(c.width=R.naturalWidth||R.width,c.height=R.naturalHeight||R.height):typeof VideoFrame<"u"&&R instanceof VideoFrame?(c.width=R.displayWidth,c.height=R.displayHeight):(c.width=R.width,c.height=R.height),c}this.allocateTextureUnit=W,this.resetTextureUnits=G,this.getTextureUnits=X,this.setTextureUnits=O,this.setTexture2D=Q,this.setTexture2DArray=$,this.setTexture3D=se,this.setTextureCube=re,this.rebindTextures=ie,this.setupRenderTarget=ne,this.updateRenderTargetMipmap=xe,this.updateMultisampleRenderTarget=Pe,this.setupDepthRenderbuffer=j,this.setupFrameBufferTexture=Fe,this.useMultisampledRTT=Ye,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function hb(n,e){function t(i,s=vi){let a;const r=it.getTransfer(s);if(i===jt)return n.UNSIGNED_BYTE;if(i===bh)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Th)return n.UNSIGNED_SHORT_5_5_5_1;if(i===xp)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Mp)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===_p)return n.BYTE;if(i===vp)return n.SHORT;if(i===Dr)return n.UNSIGNED_SHORT;if(i===Sh)return n.INT;if(i===Dn)return n.UNSIGNED_INT;if(i===an)return n.FLOAT;if(i===Un)return n.HALF_FLOAT;if(i===yp)return n.ALPHA;if(i===Sp)return n.RGB;if(i===on)return n.RGBA;if(i===Jn)return n.DEPTH_COMPONENT;if(i===Fi)return n.DEPTH_STENCIL;if(i===Eh)return n.RED;if(i===wh)return n.RED_INTEGER;if(i===Vi)return n.RG;if(i===Ah)return n.RG_INTEGER;if(i===Rh)return n.RGBA_INTEGER;if(i===to||i===no||i===io||i===so)if(r===ct)if(a=e.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(i===to)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===no)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===io)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===so)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=e.get("WEBGL_compressed_texture_s3tc"),a!==null){if(i===to)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===no)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===io)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===so)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===yc||i===Sc||i===bc||i===Tc)if(a=e.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(i===yc)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Sc)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===bc)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Tc)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Ec||i===wc||i===Ac||i===Rc||i===Pc||i===vo||i===Cc)if(a=e.get("WEBGL_compressed_texture_etc"),a!==null){if(i===Ec||i===wc)return r===ct?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(i===Ac)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC;if(i===Rc)return a.COMPRESSED_R11_EAC;if(i===Pc)return a.COMPRESSED_SIGNED_R11_EAC;if(i===vo)return a.COMPRESSED_RG11_EAC;if(i===Cc)return a.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===Ic||i===Lc||i===Nc||i===Dc||i===Uc||i===Fc||i===Oc||i===Bc||i===kc||i===zc||i===Hc||i===Vc||i===Gc||i===Wc)if(a=e.get("WEBGL_compressed_texture_astc"),a!==null){if(i===Ic)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Lc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Nc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Dc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Uc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Fc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Oc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Bc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===kc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===zc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Hc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Vc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Gc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Wc)return r===ct?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Xc||i===qc||i===Yc)if(a=e.get("EXT_texture_compression_bptc"),a!==null){if(i===Xc)return r===ct?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===qc)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Yc)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===$c||i===Kc||i===xo||i===Jc)if(a=e.get("EXT_texture_compression_rgtc"),a!==null){if(i===$c)return a.COMPRESSED_RED_RGTC1_EXT;if(i===Kc)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===xo)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Jc)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Ur?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}const ub=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,db=`
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

}`;class fb{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const i=new Np(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new hn({vertexShader:ub,fragmentShader:db,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new he(new qi(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class pb extends Xi{constructor(e,t){super();const i=this;let s=null,a=1,r=null,o="local-floor",l=1,c=null,h=null,d=null,u=null,f=null,m=null;const M=typeof XRWebGLBinding<"u",p=new fb,g={},y=t.getContextAttributes();let S=null,x=null;const w=[],T=[],A=new te;let _=null;const E=new Wt;E.viewport=new at;const P=new Wt;P.viewport=new at;const I=[E,P],N=new tm;let G=null,X=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let le=w[K];return le===void 0&&(le=new cl,w[K]=le),le.getTargetRaySpace()},this.getControllerGrip=function(K){let le=w[K];return le===void 0&&(le=new cl,w[K]=le),le.getGripSpace()},this.getHand=function(K){let le=w[K];return le===void 0&&(le=new cl,w[K]=le),le.getHandSpace()};function O(K){const le=T.indexOf(K.inputSource);if(le===-1)return;const ae=w[le];ae!==void 0&&(ae.update(K.inputSource,K.frame,c||r),ae.dispatchEvent({type:K.type,data:K.inputSource}))}function W(){s.removeEventListener("select",O),s.removeEventListener("selectstart",O),s.removeEventListener("selectend",O),s.removeEventListener("squeeze",O),s.removeEventListener("squeezestart",O),s.removeEventListener("squeezeend",O),s.removeEventListener("end",W),s.removeEventListener("inputsourceschange",H);for(let K=0;K<w.length;K++){const le=T[K];le!==null&&(T[K]=null,w[K].disconnect(le))}G=null,X=null,p.reset();for(const K in g)delete g[K];e.setRenderTarget(S),f=null,u=null,d=null,s=null,x=null,nt.stop(),i.isPresenting=!1,e.setPixelRatio(_),e.setSize(A.width,A.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){a=K,i.isPresenting===!0&&Ae("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){o=K,i.isPresenting===!0&&Ae("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||r},this.setReferenceSpace=function(K){c=K},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&M&&(d=new XRWebGLBinding(s,t)),d},this.getFrame=function(){return m},this.getSession=function(){return s},this.setSession=async function(K){if(s=K,s!==null){if(S=e.getRenderTarget(),s.addEventListener("select",O),s.addEventListener("selectstart",O),s.addEventListener("selectend",O),s.addEventListener("squeeze",O),s.addEventListener("squeezestart",O),s.addEventListener("squeezeend",O),s.addEventListener("end",W),s.addEventListener("inputsourceschange",H),y.xrCompatible!==!0&&await t.makeXRCompatible(),_=e.getPixelRatio(),e.getSize(A),M&&"createProjectionLayer"in XRWebGLBinding.prototype){let ae=null,Le=null,Ge=null;y.depth&&(Ge=y.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ae=y.stencil?Fi:Jn,Le=y.stencil?Ur:Dn);const Fe={colorFormat:t.RGBA8,depthFormat:Ge,scaleFactor:a};d=this.getBinding(),u=d.createProjectionLayer(Fe),s.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),x=new _n(u.textureWidth,u.textureHeight,{format:on,type:jt,depthTexture:new Fs(u.textureWidth,u.textureHeight,Le,void 0,void 0,void 0,void 0,void 0,void 0,ae),stencilBuffer:y.stencil,colorSpace:e.outputColorSpace,samples:y.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}else{const ae={antialias:y.antialias,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:a};f=new XRWebGLLayer(s,t,ae),s.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),x=new _n(f.framebufferWidth,f.framebufferHeight,{format:on,type:jt,colorSpace:e.outputColorSpace,stencilBuffer:y.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(l),c=null,r=await s.requestReferenceSpace(o),nt.setContext(s),nt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function H(K){for(let le=0;le<K.removed.length;le++){const ae=K.removed[le],Le=T.indexOf(ae);Le>=0&&(T[Le]=null,w[Le].disconnect(ae))}for(let le=0;le<K.added.length;le++){const ae=K.added[le];let Le=T.indexOf(ae);if(Le===-1){for(let Fe=0;Fe<w.length;Fe++)if(Fe>=T.length){T.push(ae),Le=Fe;break}else if(T[Fe]===null){T[Fe]=ae,Le=Fe;break}if(Le===-1)break}const Ge=w[Le];Ge&&Ge.connect(ae)}}const Q=new C,$=new C;function se(K,le,ae){Q.setFromMatrixPosition(le.matrixWorld),$.setFromMatrixPosition(ae.matrixWorld);const Le=Q.distanceTo($),Ge=le.projectionMatrix.elements,Fe=ae.projectionMatrix.elements,rt=Ge[14]/(Ge[10]-1),Xe=Ge[14]/(Ge[10]+1),j=(Ge[9]+1)/Ge[5],ie=(Ge[9]-1)/Ge[5],ne=(Ge[8]-1)/Ge[0],xe=(Fe[8]+1)/Fe[0],ge=rt*ne,Be=rt*xe,Pe=Le/(-ne+xe),We=Pe*-ne;if(le.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(We),K.translateZ(Pe),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert(),Ge[10]===-1)K.projectionMatrix.copy(le.projectionMatrix),K.projectionMatrixInverse.copy(le.projectionMatrixInverse);else{const Ye=rt+Pe,L=Xe+Pe,ut=ge-We,tt=Be+(Le-We),R=j*Xe/L*Ye,v=ie*Xe/L*Ye;K.projectionMatrix.makePerspective(ut,tt,R,v,Ye,L),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}}function re(K,le){le===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(le.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(s===null)return;let le=K.near,ae=K.far;p.texture!==null&&(p.depthNear>0&&(le=p.depthNear),p.depthFar>0&&(ae=p.depthFar)),N.near=P.near=E.near=le,N.far=P.far=E.far=ae,(G!==N.near||X!==N.far)&&(s.updateRenderState({depthNear:N.near,depthFar:N.far}),G=N.near,X=N.far),N.layers.mask=K.layers.mask|6,E.layers.mask=N.layers.mask&-5,P.layers.mask=N.layers.mask&-3;const Le=K.parent,Ge=N.cameras;re(N,Le);for(let Fe=0;Fe<Ge.length;Fe++)re(Ge[Fe],Le);Ge.length===2?se(N,E,P):N.projectionMatrix.copy(E.projectionMatrix),ue(K,N,Le)};function ue(K,le,ae){ae===null?K.matrix.copy(le.matrixWorld):(K.matrix.copy(ae.matrixWorld),K.matrix.invert(),K.matrix.multiply(le.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(le.projectionMatrix),K.projectionMatrixInverse.copy(le.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=Us*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return N},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function(K){l=K,u!==null&&(u.fixedFoveation=K),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=K)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(N)},this.getCameraTexture=function(K){return g[K]};let Ve=null;function ot(K,le){if(h=le.getViewerPose(c||r),m=le,h!==null){const ae=h.views;f!==null&&(e.setRenderTargetFramebuffer(x,f.framebuffer),e.setRenderTarget(x));let Le=!1;ae.length!==N.cameras.length&&(N.cameras.length=0,Le=!0);for(let Xe=0;Xe<ae.length;Xe++){const j=ae[Xe];let ie=null;if(f!==null)ie=f.getViewport(j);else{const xe=d.getViewSubImage(u,j);ie=xe.viewport,Xe===0&&(e.setRenderTargetTextures(x,xe.colorTexture,xe.depthStencilTexture),e.setRenderTarget(x))}let ne=I[Xe];ne===void 0&&(ne=new Wt,ne.layers.enable(Xe),ne.viewport=new at,I[Xe]=ne),ne.matrix.fromArray(j.transform.matrix),ne.matrix.decompose(ne.position,ne.quaternion,ne.scale),ne.projectionMatrix.fromArray(j.projectionMatrix),ne.projectionMatrixInverse.copy(ne.projectionMatrix).invert(),ne.viewport.set(ie.x,ie.y,ie.width,ie.height),Xe===0&&(N.matrix.copy(ne.matrix),N.matrix.decompose(N.position,N.quaternion,N.scale)),Le===!0&&N.cameras.push(ne)}const Ge=s.enabledFeatures;if(Ge&&Ge.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&M){d=i.getBinding();const Xe=d.getDepthInformation(ae[0]);Xe&&Xe.isValid&&Xe.texture&&p.init(Xe,s.renderState)}if(Ge&&Ge.includes("camera-access")&&M){e.state.unbindTexture(),d=i.getBinding();for(let Xe=0;Xe<ae.length;Xe++){const j=ae[Xe].camera;if(j){let ie=g[j];ie||(ie=new Np,g[j]=ie);const ne=d.getCameraImage(j);ie.sourceTexture=ne}}}}for(let ae=0;ae<w.length;ae++){const Le=T[ae],Ge=w[ae];Le!==null&&Ge!==void 0&&Ge.update(Le,le,c||r)}Ve&&Ve(K,le),le.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:le}),m=null}const nt=new im;nt.setAnimationLoop(ot),this.setAnimationLoop=function(K){Ve=K},this.dispose=function(){}}}const mb=new qe,hm=new $e;hm.set(-1,0,0,0,1,0,0,0,1);function gb(n,e){function t(p,g){p.matrixAutoUpdate===!0&&p.updateMatrix(),g.value.copy(p.matrix)}function i(p,g){g.color.getRGB(p.fogColor.value,Zp(n)),g.isFog?(p.fogNear.value=g.near,p.fogFar.value=g.far):g.isFogExp2&&(p.fogDensity.value=g.density)}function s(p,g,y,S,x){g.isNodeMaterial?g.uniformsNeedUpdate=!1:g.isMeshBasicMaterial?a(p,g):g.isMeshLambertMaterial?(a(p,g),g.envMap&&(p.envMapIntensity.value=g.envMapIntensity)):g.isMeshToonMaterial?(a(p,g),d(p,g)):g.isMeshPhongMaterial?(a(p,g),h(p,g),g.envMap&&(p.envMapIntensity.value=g.envMapIntensity)):g.isMeshStandardMaterial?(a(p,g),u(p,g),g.isMeshPhysicalMaterial&&f(p,g,x)):g.isMeshMatcapMaterial?(a(p,g),m(p,g)):g.isMeshDepthMaterial?a(p,g):g.isMeshDistanceMaterial?(a(p,g),M(p,g)):g.isMeshNormalMaterial?a(p,g):g.isLineBasicMaterial?(r(p,g),g.isLineDashedMaterial&&o(p,g)):g.isPointsMaterial?l(p,g,y,S):g.isSpriteMaterial?c(p,g):g.isShadowMaterial?(p.color.value.copy(g.color),p.opacity.value=g.opacity):g.isShaderMaterial&&(g.uniformsNeedUpdate=!1)}function a(p,g){p.opacity.value=g.opacity,g.color&&p.diffuse.value.copy(g.color),g.emissive&&p.emissive.value.copy(g.emissive).multiplyScalar(g.emissiveIntensity),g.map&&(p.map.value=g.map,t(g.map,p.mapTransform)),g.alphaMap&&(p.alphaMap.value=g.alphaMap,t(g.alphaMap,p.alphaMapTransform)),g.bumpMap&&(p.bumpMap.value=g.bumpMap,t(g.bumpMap,p.bumpMapTransform),p.bumpScale.value=g.bumpScale,g.side===Xt&&(p.bumpScale.value*=-1)),g.normalMap&&(p.normalMap.value=g.normalMap,t(g.normalMap,p.normalMapTransform),p.normalScale.value.copy(g.normalScale),g.side===Xt&&p.normalScale.value.negate()),g.displacementMap&&(p.displacementMap.value=g.displacementMap,t(g.displacementMap,p.displacementMapTransform),p.displacementScale.value=g.displacementScale,p.displacementBias.value=g.displacementBias),g.emissiveMap&&(p.emissiveMap.value=g.emissiveMap,t(g.emissiveMap,p.emissiveMapTransform)),g.specularMap&&(p.specularMap.value=g.specularMap,t(g.specularMap,p.specularMapTransform)),g.alphaTest>0&&(p.alphaTest.value=g.alphaTest);const y=e.get(g),S=y.envMap,x=y.envMapRotation;S&&(p.envMap.value=S,p.envMapRotation.value.setFromMatrix4(mb.makeRotationFromEuler(x)).transpose(),S.isCubeTexture&&S.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(hm),p.reflectivity.value=g.reflectivity,p.ior.value=g.ior,p.refractionRatio.value=g.refractionRatio),g.lightMap&&(p.lightMap.value=g.lightMap,p.lightMapIntensity.value=g.lightMapIntensity,t(g.lightMap,p.lightMapTransform)),g.aoMap&&(p.aoMap.value=g.aoMap,p.aoMapIntensity.value=g.aoMapIntensity,t(g.aoMap,p.aoMapTransform))}function r(p,g){p.diffuse.value.copy(g.color),p.opacity.value=g.opacity,g.map&&(p.map.value=g.map,t(g.map,p.mapTransform))}function o(p,g){p.dashSize.value=g.dashSize,p.totalSize.value=g.dashSize+g.gapSize,p.scale.value=g.scale}function l(p,g,y,S){p.diffuse.value.copy(g.color),p.opacity.value=g.opacity,p.size.value=g.size*y,p.scale.value=S*.5,g.map&&(p.map.value=g.map,t(g.map,p.uvTransform)),g.alphaMap&&(p.alphaMap.value=g.alphaMap,t(g.alphaMap,p.alphaMapTransform)),g.alphaTest>0&&(p.alphaTest.value=g.alphaTest)}function c(p,g){p.diffuse.value.copy(g.color),p.opacity.value=g.opacity,p.rotation.value=g.rotation,g.map&&(p.map.value=g.map,t(g.map,p.mapTransform)),g.alphaMap&&(p.alphaMap.value=g.alphaMap,t(g.alphaMap,p.alphaMapTransform)),g.alphaTest>0&&(p.alphaTest.value=g.alphaTest)}function h(p,g){p.specular.value.copy(g.specular),p.shininess.value=Math.max(g.shininess,1e-4)}function d(p,g){g.gradientMap&&(p.gradientMap.value=g.gradientMap)}function u(p,g){p.metalness.value=g.metalness,g.metalnessMap&&(p.metalnessMap.value=g.metalnessMap,t(g.metalnessMap,p.metalnessMapTransform)),p.roughness.value=g.roughness,g.roughnessMap&&(p.roughnessMap.value=g.roughnessMap,t(g.roughnessMap,p.roughnessMapTransform)),g.envMap&&(p.envMapIntensity.value=g.envMapIntensity)}function f(p,g,y){p.ior.value=g.ior,g.sheen>0&&(p.sheenColor.value.copy(g.sheenColor).multiplyScalar(g.sheen),p.sheenRoughness.value=g.sheenRoughness,g.sheenColorMap&&(p.sheenColorMap.value=g.sheenColorMap,t(g.sheenColorMap,p.sheenColorMapTransform)),g.sheenRoughnessMap&&(p.sheenRoughnessMap.value=g.sheenRoughnessMap,t(g.sheenRoughnessMap,p.sheenRoughnessMapTransform))),g.clearcoat>0&&(p.clearcoat.value=g.clearcoat,p.clearcoatRoughness.value=g.clearcoatRoughness,g.clearcoatMap&&(p.clearcoatMap.value=g.clearcoatMap,t(g.clearcoatMap,p.clearcoatMapTransform)),g.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=g.clearcoatRoughnessMap,t(g.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),g.clearcoatNormalMap&&(p.clearcoatNormalMap.value=g.clearcoatNormalMap,t(g.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(g.clearcoatNormalScale),g.side===Xt&&p.clearcoatNormalScale.value.negate())),g.dispersion>0&&(p.dispersion.value=g.dispersion),g.iridescence>0&&(p.iridescence.value=g.iridescence,p.iridescenceIOR.value=g.iridescenceIOR,p.iridescenceThicknessMinimum.value=g.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=g.iridescenceThicknessRange[1],g.iridescenceMap&&(p.iridescenceMap.value=g.iridescenceMap,t(g.iridescenceMap,p.iridescenceMapTransform)),g.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=g.iridescenceThicknessMap,t(g.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),g.transmission>0&&(p.transmission.value=g.transmission,p.transmissionSamplerMap.value=y.texture,p.transmissionSamplerSize.value.set(y.width,y.height),g.transmissionMap&&(p.transmissionMap.value=g.transmissionMap,t(g.transmissionMap,p.transmissionMapTransform)),p.thickness.value=g.thickness,g.thicknessMap&&(p.thicknessMap.value=g.thicknessMap,t(g.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=g.attenuationDistance,p.attenuationColor.value.copy(g.attenuationColor)),g.anisotropy>0&&(p.anisotropyVector.value.set(g.anisotropy*Math.cos(g.anisotropyRotation),g.anisotropy*Math.sin(g.anisotropyRotation)),g.anisotropyMap&&(p.anisotropyMap.value=g.anisotropyMap,t(g.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=g.specularIntensity,p.specularColor.value.copy(g.specularColor),g.specularColorMap&&(p.specularColorMap.value=g.specularColorMap,t(g.specularColorMap,p.specularColorMapTransform)),g.specularIntensityMap&&(p.specularIntensityMap.value=g.specularIntensityMap,t(g.specularIntensityMap,p.specularIntensityMapTransform))}function m(p,g){g.matcap&&(p.matcap.value=g.matcap)}function M(p,g){const y=e.get(g).light;p.referencePosition.value.setFromMatrixPosition(y.matrixWorld),p.nearDistance.value=y.shadow.camera.near,p.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function _b(n,e,t,i){let s={},a={},r=[];const o=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(x,w){const T=w.program;i.uniformBlockBinding(x,T)}function c(x,w){let T=s[x.id];T===void 0&&(p(x),T=h(x),s[x.id]=T,x.addEventListener("dispose",y));const A=w.program;i.updateUBOMapping(x,A);const _=e.render.frame;a[x.id]!==_&&(u(x),a[x.id]=_)}function h(x){const w=d();x.__bindingPointIndex=w;const T=n.createBuffer(),A=x.__size,_=x.usage;return n.bindBuffer(n.UNIFORM_BUFFER,T),n.bufferData(n.UNIFORM_BUFFER,A,_),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,w,T),T}function d(){for(let x=0;x<o;x++)if(r.indexOf(x)===-1)return r.push(x),x;return ke("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(x){const w=s[x.id],T=x.uniforms,A=x.__cache;n.bindBuffer(n.UNIFORM_BUFFER,w);for(let _=0,E=T.length;_<E;_++){const P=T[_];if(Array.isArray(P))for(let I=0,N=P.length;I<N;I++)f(P[I],_,I,A);else f(P,_,0,A)}n.bindBuffer(n.UNIFORM_BUFFER,null)}function f(x,w,T,A){if(M(x,w,T,A)===!0){const _=x.__offset,E=x.value;if(Array.isArray(E)){let P=0;for(let I=0;I<E.length;I++){const N=E[I],G=g(N);m(N,x.__data,P),typeof N!="number"&&typeof N!="boolean"&&!N.isMatrix3&&!ArrayBuffer.isView(N)&&(P+=G.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(E,x.__data,0);n.bufferSubData(n.UNIFORM_BUFFER,_,x.__data)}}function m(x,w,T){typeof x=="number"||typeof x=="boolean"?w[0]=x:x.isMatrix3?(w[0]=x.elements[0],w[1]=x.elements[1],w[2]=x.elements[2],w[3]=0,w[4]=x.elements[3],w[5]=x.elements[4],w[6]=x.elements[5],w[7]=0,w[8]=x.elements[6],w[9]=x.elements[7],w[10]=x.elements[8],w[11]=0):ArrayBuffer.isView(x)?w.set(new x.constructor(x.buffer,x.byteOffset,w.length)):x.toArray(w,T)}function M(x,w,T,A){const _=x.value,E=w+"_"+T;if(A[E]===void 0)return typeof _=="number"||typeof _=="boolean"?A[E]=_:ArrayBuffer.isView(_)?A[E]=_.slice():A[E]=_.clone(),!0;{const P=A[E];if(typeof _=="number"||typeof _=="boolean"){if(P!==_)return A[E]=_,!0}else{if(ArrayBuffer.isView(_))return!0;if(P.equals(_)===!1)return P.copy(_),!0}}return!1}function p(x){const w=x.uniforms;let T=0;const A=16;for(let E=0,P=w.length;E<P;E++){const I=Array.isArray(w[E])?w[E]:[w[E]];for(let N=0,G=I.length;N<G;N++){const X=I[N],O=Array.isArray(X.value)?X.value:[X.value];for(let W=0,H=O.length;W<H;W++){const Q=O[W],$=g(Q),se=T%A,re=se%$.boundary,ue=se+re;T+=re,ue!==0&&A-ue<$.storage&&(T+=A-ue),X.__data=new Float32Array($.storage/Float32Array.BYTES_PER_ELEMENT),X.__offset=T,T+=$.storage}}}const _=T%A;return _>0&&(T+=A-_),x.__size=T,x.__cache={},this}function g(x){const w={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(w.boundary=4,w.storage=4):x.isVector2?(w.boundary=8,w.storage=8):x.isVector3||x.isColor?(w.boundary=16,w.storage=12):x.isVector4?(w.boundary=16,w.storage=16):x.isMatrix3?(w.boundary=48,w.storage=48):x.isMatrix4?(w.boundary=64,w.storage=64):x.isTexture?Ae("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(x)?(w.boundary=16,w.storage=x.byteLength):Ae("WebGLRenderer: Unsupported uniform value type.",x),w}function y(x){const w=x.target;w.removeEventListener("dispose",y);const T=r.indexOf(w.__bindingPointIndex);r.splice(T,1),n.deleteBuffer(s[w.id]),delete s[w.id],delete a[w.id]}function S(){for(const x in s)n.deleteBuffer(s[x]);r=[],s={},a={}}return{bind:l,update:c,dispose:S}}const vb=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let En=null;function xb(){return En===null&&(En=new Fh(vb,16,16,Vi,Un),En.name="DFG_LUT",En.minFilter=Ct,En.magFilter=Ct,En.wrapS=Xn,En.wrapT=Xn,En.generateMipmaps=!1,En.needsUpdate=!0),En}class vA{constructor(e={}){const{canvas:t=vg(),context:i=null,depth:s=!0,stencil:a=!1,alpha:r=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:f=jt}=e;this.isWebGLRenderer=!0;let m;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=i.getContextAttributes().alpha}else m=r;const M=f,p=new Set([Rh,Ah,wh]),g=new Set([jt,Dn,Dr,Ur,bh,Th]),y=new Uint32Array(4),S=new Int32Array(4),x=new C;let w=null,T=null;const A=[],_=[];let E=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=In,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const P=this;let I=!1,N=null,G=null,X=null,O=null;this._outputColorSpace=zt;let W=0,H=0,Q=null,$=-1,se=null;const re=new at,ue=new at;let Ve=null;const ot=new ze(0);let nt=0,K=t.width,le=t.height,ae=1,Le=null,Ge=null;const Fe=new at(0,0,K,le),rt=new at(0,0,K,le);let Xe=!1;const j=new Vo;let ie=!1,ne=!1;const xe=new qe,ge=new C,Be=new at,Pe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let We=!1;function Ye(){return Q===null?ae:1}let L=i;function ut(b,U){return t.getContext(b,U)}try{const b={alpha:!0,depth:s,stencil:a,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${yh}`),t.addEventListener("webglcontextlost",St,!1),t.addEventListener("webglcontextrestored",vt,!1),t.addEventListener("webglcontextcreationerror",yn,!1),L===null){const U="webgl2";if(L=ut(U,b),L===null)throw ut(U)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(b){throw ke("WebGLRenderer: "+b.message),b}let tt,R,v,F,z,q,oe,ce,Y,Z,fe,Ce,_e,pe,Ue,He,Ke,D,de,J,me,Se,ee;function Re(){tt=new xy(L),tt.init(),me=new hb(L,tt),R=new uy(L,tt,e,me),v=new lb(L,tt),R.reversedDepthBuffer&&u&&v.buffers.depth.setReversed(!0),G=L.createFramebuffer(),X=L.createFramebuffer(),O=L.createFramebuffer(),F=new Sy(L),z=new $S,q=new cb(L,tt,v,z,R,me,F),oe=new vy(P),ce=new wv(L),Se=new cy(L,ce),Y=new My(L,ce,F,Se),Z=new Ty(L,Y,ce,Se,F),D=new by(L,R,q),Ue=new dy(z),fe=new YS(P,oe,tt,R,Se,Ue),Ce=new gb(P,z),_e=new JS,pe=new nb(tt),Ke=new ly(P,oe,v,Z,m,l),He=new ob(P,Z,R),ee=new _b(L,F,R,v),de=new hy(L,tt,F),J=new yy(L,tt,F),F.programs=fe.programs,P.capabilities=R,P.extensions=tt,P.properties=z,P.renderLists=_e,P.shadowMap=He,P.state=v,P.info=F}Re(),M!==jt&&(E=new wy(M,t.width,t.height,o,s,a));const Ee=new pb(P,L);this.xr=Ee,this.getContext=function(){return L},this.getContextAttributes=function(){return L.getContextAttributes()},this.forceContextLoss=function(){const b=tt.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){const b=tt.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return ae},this.setPixelRatio=function(b){b!==void 0&&(ae=b,this.setSize(K,le,!1))},this.getSize=function(b){return b.set(K,le)},this.setSize=function(b,U,V=!0){if(Ee.isPresenting){Ae("WebGLRenderer: Can't change size while VR device is presenting.");return}K=b,le=U,t.width=Math.floor(b*ae),t.height=Math.floor(U*ae),V===!0&&(t.style.width=b+"px",t.style.height=U+"px"),E!==null&&E.setSize(t.width,t.height),this.setViewport(0,0,b,U)},this.getDrawingBufferSize=function(b){return b.set(K*ae,le*ae).floor()},this.setDrawingBufferSize=function(b,U,V){K=b,le=U,ae=V,t.width=Math.floor(b*V),t.height=Math.floor(U*V),this.setViewport(0,0,b,U)},this.setEffects=function(b){if(M===jt){ke("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(b){for(let U=0;U<b.length;U++)if(b[U].isOutputPass===!0){Ae("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}E.setEffects(b||[])},this.getCurrentViewport=function(b){return b.copy(re)},this.getViewport=function(b){return b.copy(Fe)},this.setViewport=function(b,U,V,B){b.isVector4?Fe.set(b.x,b.y,b.z,b.w):Fe.set(b,U,V,B),v.viewport(re.copy(Fe).multiplyScalar(ae).round())},this.getScissor=function(b){return b.copy(rt)},this.setScissor=function(b,U,V,B){b.isVector4?rt.set(b.x,b.y,b.z,b.w):rt.set(b,U,V,B),v.scissor(ue.copy(rt).multiplyScalar(ae).round())},this.getScissorTest=function(){return Xe},this.setScissorTest=function(b){v.setScissorTest(Xe=b)},this.setOpaqueSort=function(b){Le=b},this.setTransparentSort=function(b){Ge=b},this.getClearColor=function(b){return b.copy(Ke.getClearColor())},this.setClearColor=function(){Ke.setClearColor(...arguments)},this.getClearAlpha=function(){return Ke.getClearAlpha()},this.setClearAlpha=function(){Ke.setClearAlpha(...arguments)},this.clear=function(b=!0,U=!0,V=!0){let B=0;if(b){let k=!1;if(Q!==null){const ye=Q.texture.format;k=p.has(ye)}if(k){const ye=Q.texture.type,Te=g.has(ye),Me=Ke.getClearColor(),we=Ke.getClearAlpha(),Ie=Me.r,Je=Me.g,je=Me.b;Te?(y[0]=Ie,y[1]=Je,y[2]=je,y[3]=we,L.clearBufferuiv(L.COLOR,0,y)):(S[0]=Ie,S[1]=Je,S[2]=je,S[3]=we,L.clearBufferiv(L.COLOR,0,S))}else B|=L.COLOR_BUFFER_BIT}U&&(B|=L.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),V&&(B|=L.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),B!==0&&L.clear(B)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(b){b.setRenderer(this),N=b},this.dispose=function(){t.removeEventListener("webglcontextlost",St,!1),t.removeEventListener("webglcontextrestored",vt,!1),t.removeEventListener("webglcontextcreationerror",yn,!1),Ke.dispose(),_e.dispose(),pe.dispose(),z.dispose(),oe.dispose(),Z.dispose(),Se.dispose(),ee.dispose(),fe.dispose(),Ee.dispose(),Ee.removeEventListener("sessionstart",Su),Ee.removeEventListener("sessionend",bu),Ei.stop()};function St(b){b.preventDefault(),bo("WebGLRenderer: Context Lost."),I=!0}function vt(){bo("WebGLRenderer: Context Restored."),I=!1;const b=F.autoReset,U=He.enabled,V=He.autoUpdate,B=He.needsUpdate,k=He.type;Re(),F.autoReset=b,He.enabled=U,He.autoUpdate=V,He.needsUpdate=B,He.type=k}function yn(b){ke("WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function Sn(b){const U=b.target;U.removeEventListener("dispose",Sn),R0(U)}function R0(b){P0(b),z.remove(b)}function P0(b){const U=z.get(b).programs;U!==void 0&&(U.forEach(function(V){fe.releaseProgram(V)}),b.isShaderMaterial&&fe.releaseShaderCache(b))}this.renderBufferDirect=function(b,U,V,B,k,ye){U===null&&(U=Pe);const Te=k.isMesh&&k.matrixWorld.determinantAffine()<0,Me=L0(b,U,V,B,k);v.setMaterial(B,Te);let we=V.index,Ie=1;if(B.wireframe===!0){if(we=Y.getWireframeAttribute(V),we===void 0)return;Ie=2}const Je=V.drawRange,je=V.attributes.position;let Ne=Je.start*Ie,dt=(Je.start+Je.count)*Ie;ye!==null&&(Ne=Math.max(Ne,ye.start*Ie),dt=Math.min(dt,(ye.start+ye.count)*Ie)),we!==null?(Ne=Math.max(Ne,0),dt=Math.min(dt,we.count)):je!=null&&(Ne=Math.max(Ne,0),dt=Math.min(dt,je.count));const Tt=dt-Ne;if(Tt<0||Tt===1/0)return;Se.setup(k,B,Me,V,we);let bt,gt=de;if(we!==null&&(bt=ce.get(we),gt=J,gt.setIndex(bt)),k.isMesh)B.wireframe===!0?(v.setLineWidth(B.wireframeLinewidth*Ye()),gt.setMode(L.LINES)):gt.setMode(L.TRIANGLES);else if(k.isLine){let Ot=B.linewidth;Ot===void 0&&(Ot=1),v.setLineWidth(Ot*Ye()),k.isLineSegments?gt.setMode(L.LINES):k.isLineLoop?gt.setMode(L.LINE_LOOP):gt.setMode(L.LINE_STRIP)}else k.isPoints?gt.setMode(L.POINTS):k.isSprite&&gt.setMode(L.TRIANGLES);if(k.isBatchedMesh)if(tt.get("WEBGL_multi_draw"))gt.renderMultiDraw(k._multiDrawStarts,k._multiDrawCounts,k._multiDrawCount);else{const Ot=k._multiDrawStarts,be=k._multiDrawCounts,Kt=k._multiDrawCount,st=we?ce.get(we).bytesPerElement:1,tn=z.get(B).currentProgram.getUniforms();for(let bn=0;bn<Kt;bn++)tn.setValue(L,"_gl_DrawID",bn),gt.render(Ot[bn]/st,be[bn])}else if(k.isInstancedMesh)gt.renderInstances(Ne,Tt,k.count);else if(V.isInstancedBufferGeometry){const Ot=V._maxInstanceCount!==void 0?V._maxInstanceCount:1/0,be=Math.min(V.instanceCount,Ot);gt.renderInstances(Ne,Tt,be)}else gt.render(Ne,Tt)};function yu(b,U,V){b.transparent===!0&&b.side===Pn&&b.forceSinglePass===!1?(b.side=Xt,b.needsUpdate=!0,oa(b,U,V),b.side=yi,b.needsUpdate=!0,oa(b,U,V),b.side=Pn):oa(b,U,V)}this.compile=function(b,U,V=null){V===null&&(V=b),T=pe.get(V),T.init(U),_.push(T),V.traverseVisible(function(k){k.isLight&&k.layers.test(U.layers)&&(T.pushLight(k),k.castShadow&&T.pushShadow(k))}),b!==V&&b.traverseVisible(function(k){k.isLight&&k.layers.test(U.layers)&&(T.pushLight(k),k.castShadow&&T.pushShadow(k))}),T.setupLights();const B=new Set;return b.traverse(function(k){if(!(k.isMesh||k.isPoints||k.isLine||k.isSprite))return;const ye=k.material;if(ye)if(Array.isArray(ye))for(let Te=0;Te<ye.length;Te++){const Me=ye[Te];yu(Me,V,k),B.add(Me)}else yu(ye,V,k),B.add(ye)}),T=_.pop(),B},this.compileAsync=function(b,U,V=null){const B=this.compile(b,U,V);return new Promise(k=>{function ye(){if(B.forEach(function(Te){z.get(Te).currentProgram.isReady()&&B.delete(Te)}),B.size===0){k(b);return}setTimeout(ye,10)}tt.get("KHR_parallel_shader_compile")!==null?ye():setTimeout(ye,10)})};let Qo=null;function C0(b){Qo&&Qo(b)}function Su(){Ei.stop()}function bu(){Ei.start()}const Ei=new im;Ei.setAnimationLoop(C0),typeof self<"u"&&Ei.setContext(self),this.setAnimationLoop=function(b){Qo=b,Ee.setAnimationLoop(b),b===null?Ei.stop():Ei.start()},Ee.addEventListener("sessionstart",Su),Ee.addEventListener("sessionend",bu),this.render=function(b,U){if(U!==void 0&&U.isCamera!==!0){ke("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(I===!0)return;N!==null&&N.renderStart(b,U);const V=Ee.enabled===!0&&Ee.isPresenting===!0,B=E!==null&&(Q===null||V)&&E.begin(P,Q);if(b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),U.parent===null&&U.matrixWorldAutoUpdate===!0&&U.updateMatrixWorld(),Ee.enabled===!0&&Ee.isPresenting===!0&&(E===null||E.isCompositing()===!1)&&(Ee.cameraAutoUpdate===!0&&Ee.updateCamera(U),U=Ee.getCamera()),b.isScene===!0&&b.onBeforeRender(P,b,U,Q),T=pe.get(b,_.length),T.init(U),T.state.textureUnits=q.getTextureUnits(),_.push(T),xe.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),j.setFromProjectionMatrix(xe,Cn,U.reversedDepth),ne=this.localClippingEnabled,ie=Ue.init(this.clippingPlanes,ne),w=_e.get(b,A.length),w.init(),A.push(w),Ee.enabled===!0&&Ee.isPresenting===!0){const Te=P.xr.getDepthSensingMesh();Te!==null&&jo(Te,U,-1/0,P.sortObjects)}jo(b,U,0,P.sortObjects),w.finish(),P.sortObjects===!0&&w.sort(Le,Ge,U.reversedDepth),We=Ee.enabled===!1||Ee.isPresenting===!1||Ee.hasDepthSensing()===!1,We&&Ke.addToRenderList(w,b),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),ie===!0&&Ue.beginShadows();const k=T.state.shadowsArray;if(He.render(k,b,U),ie===!0&&Ue.endShadows(),(B&&E.hasRenderPass())===!1){const Te=w.opaque,Me=w.transmissive;if(T.setupLights(),U.isArrayCamera){const we=U.cameras;if(Me.length>0)for(let Ie=0,Je=we.length;Ie<Je;Ie++){const je=we[Ie];Eu(Te,Me,b,je)}We&&Ke.render(b);for(let Ie=0,Je=we.length;Ie<Je;Ie++){const je=we[Ie];Tu(w,b,je,je.viewport)}}else Me.length>0&&Eu(Te,Me,b,U),We&&Ke.render(b),Tu(w,b,U)}Q!==null&&H===0&&(q.updateMultisampleRenderTarget(Q),q.updateRenderTargetMipmap(Q)),B&&E.end(P),b.isScene===!0&&b.onAfterRender(P,b,U),Se.resetDefaultState(),$=-1,se=null,_.pop(),_.length>0?(T=_[_.length-1],q.setTextureUnits(T.state.textureUnits),ie===!0&&Ue.setGlobalState(P.clippingPlanes,T.state.camera)):T=null,A.pop(),A.length>0?w=A[A.length-1]:w=null,N!==null&&N.renderEnd()};function jo(b,U,V,B){if(b.visible===!1)return;if(b.layers.test(U.layers)){if(b.isGroup)V=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(U);else if(b.isLightProbeGrid)T.pushLightProbeGrid(b);else if(b.isLight)T.pushLight(b),b.castShadow&&T.pushShadow(b);else if(b.isSprite){if(!b.frustumCulled||j.intersectsSprite(b)){B&&Be.setFromMatrixPosition(b.matrixWorld).applyMatrix4(xe);const Te=Z.update(b),Me=b.material;Me.visible&&w.push(b,Te,Me,V,Be.z,null)}}else if((b.isMesh||b.isLine||b.isPoints)&&(!b.frustumCulled||j.intersectsObject(b))){const Te=Z.update(b),Me=b.material;if(B&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),Be.copy(b.boundingSphere.center)):(Te.boundingSphere===null&&Te.computeBoundingSphere(),Be.copy(Te.boundingSphere.center)),Be.applyMatrix4(b.matrixWorld).applyMatrix4(xe)),Array.isArray(Me)){const we=Te.groups;for(let Ie=0,Je=we.length;Ie<Je;Ie++){const je=we[Ie],Ne=Me[je.materialIndex];Ne&&Ne.visible&&w.push(b,Te,Ne,V,Be.z,je)}}else Me.visible&&w.push(b,Te,Me,V,Be.z,null)}}const ye=b.children;for(let Te=0,Me=ye.length;Te<Me;Te++)jo(ye[Te],U,V,B)}function Tu(b,U,V,B){const{opaque:k,transmissive:ye,transparent:Te}=b;T.setupLightsView(V),ie===!0&&Ue.setGlobalState(P.clippingPlanes,V),B&&v.viewport(re.copy(B)),k.length>0&&aa(k,U,V),ye.length>0&&aa(ye,U,V),Te.length>0&&aa(Te,U,V),v.buffers.depth.setTest(!0),v.buffers.depth.setMask(!0),v.buffers.color.setMask(!0),v.setPolygonOffset(!1)}function Eu(b,U,V,B){if((V.isScene===!0?V.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[B.id]===void 0){const Ne=tt.has("EXT_color_buffer_half_float")||tt.has("EXT_color_buffer_float");T.state.transmissionRenderTarget[B.id]=new _n(1,1,{generateMipmaps:!0,type:Ne?Un:jt,minFilter:xi,samples:Math.max(4,R.samples),stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:it.workingColorSpace})}const ye=T.state.transmissionRenderTarget[B.id],Te=B.viewport||re;ye.setSize(Te.z*P.transmissionResolutionScale,Te.w*P.transmissionResolutionScale);const Me=P.getRenderTarget(),we=P.getActiveCubeFace(),Ie=P.getActiveMipmapLevel();P.setRenderTarget(ye),P.getClearColor(ot),nt=P.getClearAlpha(),nt<1&&P.setClearColor(16777215,.5),P.clear(),We&&Ke.render(V);const Je=P.toneMapping;P.toneMapping=In;const je=B.viewport;if(B.viewport!==void 0&&(B.viewport=void 0),T.setupLightsView(B),ie===!0&&Ue.setGlobalState(P.clippingPlanes,B),aa(b,V,B),q.updateMultisampleRenderTarget(ye),q.updateRenderTargetMipmap(ye),tt.has("WEBGL_multisampled_render_to_texture")===!1){let Ne=!1;for(let dt=0,Tt=U.length;dt<Tt;dt++){const bt=U[dt],{object:gt,geometry:Ot,material:be,group:Kt}=bt;if(be.side===Pn&&gt.layers.test(B.layers)){const st=be.side;be.side=Xt,be.needsUpdate=!0,wu(gt,V,B,Ot,be,Kt),be.side=st,be.needsUpdate=!0,Ne=!0}}Ne===!0&&(q.updateMultisampleRenderTarget(ye),q.updateRenderTargetMipmap(ye))}P.setRenderTarget(Me,we,Ie),P.setClearColor(ot,nt),je!==void 0&&(B.viewport=je),P.toneMapping=Je}function aa(b,U,V){const B=U.isScene===!0?U.overrideMaterial:null;for(let k=0,ye=b.length;k<ye;k++){const Te=b[k],{object:Me,geometry:we,group:Ie}=Te;let Je=Te.material;Je.allowOverride===!0&&B!==null&&(Je=B),Me.layers.test(V.layers)&&wu(Me,U,V,we,Je,Ie)}}function wu(b,U,V,B,k,ye){b.onBeforeRender(P,U,V,B,k,ye),b.modelViewMatrix.multiplyMatrices(V.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),k.onBeforeRender(P,U,V,B,b,ye),k.transparent===!0&&k.side===Pn&&k.forceSinglePass===!1?(k.side=Xt,k.needsUpdate=!0,P.renderBufferDirect(V,U,B,k,b,ye),k.side=yi,k.needsUpdate=!0,P.renderBufferDirect(V,U,B,k,b,ye),k.side=Pn):P.renderBufferDirect(V,U,B,k,b,ye),b.onAfterRender(P,U,V,B,k,ye)}function oa(b,U,V){U.isScene!==!0&&(U=Pe);const B=z.get(b),k=T.state.lights,ye=T.state.shadowsArray,Te=k.state.version,Me=fe.getParameters(b,k.state,ye,U,V,T.state.lightProbeGridArray),we=fe.getProgramCacheKey(Me);let Ie=B.programs;B.environment=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?U.environment:null,B.fog=U.fog;const Je=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap;B.envMap=oe.get(b.envMap||B.environment,Je),B.envMapRotation=B.environment!==null&&b.envMap===null?U.environmentRotation:b.envMapRotation,Ie===void 0&&(b.addEventListener("dispose",Sn),Ie=new Map,B.programs=Ie);let je=Ie.get(we);if(je!==void 0){if(B.currentProgram===je&&B.lightsStateVersion===Te)return Ru(b,Me),je}else Me.uniforms=fe.getUniforms(b),N!==null&&b.isNodeMaterial&&N.build(b,V,Me),b.onBeforeCompile(Me,P),je=fe.acquireProgram(Me,we),Ie.set(we,je),B.uniforms=Me.uniforms;const Ne=B.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(Ne.clippingPlanes=Ue.uniform),Ru(b,Me),B.needsLights=D0(b),B.lightsStateVersion=Te,B.needsLights&&(Ne.ambientLightColor.value=k.state.ambient,Ne.lightProbe.value=k.state.probe,Ne.directionalLights.value=k.state.directional,Ne.directionalLightShadows.value=k.state.directionalShadow,Ne.spotLights.value=k.state.spot,Ne.spotLightShadows.value=k.state.spotShadow,Ne.rectAreaLights.value=k.state.rectArea,Ne.ltc_1.value=k.state.rectAreaLTC1,Ne.ltc_2.value=k.state.rectAreaLTC2,Ne.pointLights.value=k.state.point,Ne.pointLightShadows.value=k.state.pointShadow,Ne.hemisphereLights.value=k.state.hemi,Ne.directionalShadowMatrix.value=k.state.directionalShadowMatrix,Ne.spotLightMatrix.value=k.state.spotLightMatrix,Ne.spotLightMap.value=k.state.spotLightMap,Ne.pointShadowMatrix.value=k.state.pointShadowMatrix),B.lightProbeGrid=T.state.lightProbeGridArray.length>0,B.currentProgram=je,B.uniformsList=null,je}function Au(b){if(b.uniformsList===null){const U=b.currentProgram.getUniforms();b.uniformsList=ro.seqWithValue(U.seq,b.uniforms)}return b.uniformsList}function Ru(b,U){const V=z.get(b);V.outputColorSpace=U.outputColorSpace,V.batching=U.batching,V.batchingColor=U.batchingColor,V.instancing=U.instancing,V.instancingColor=U.instancingColor,V.instancingMorph=U.instancingMorph,V.skinning=U.skinning,V.morphTargets=U.morphTargets,V.morphNormals=U.morphNormals,V.morphColors=U.morphColors,V.morphTargetsCount=U.morphTargetsCount,V.numClippingPlanes=U.numClippingPlanes,V.numIntersection=U.numClipIntersection,V.vertexAlphas=U.vertexAlphas,V.vertexTangents=U.vertexTangents,V.toneMapping=U.toneMapping}function I0(b,U){if(b.length===0)return null;if(b.length===1)return b[0].texture!==null?b[0]:null;x.setFromMatrixPosition(U.matrixWorld);for(let V=0,B=b.length;V<B;V++){const k=b[V];if(k.texture!==null&&k.boundingBox.containsPoint(x))return k}return null}function L0(b,U,V,B,k){U.isScene!==!0&&(U=Pe),q.resetTextureUnits();const ye=U.fog,Te=B.isMeshStandardMaterial||B.isMeshLambertMaterial||B.isMeshPhongMaterial?U.environment:null,Me=Q===null?P.outputColorSpace:Q.isXRRenderTarget===!0?Q.texture.colorSpace:it.workingColorSpace,we=B.isMeshStandardMaterial||B.isMeshLambertMaterial&&!B.envMap||B.isMeshPhongMaterial&&!B.envMap,Ie=oe.get(B.envMap||Te,we),Je=B.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,je=!!V.attributes.tangent&&(!!B.normalMap||B.anisotropy>0),Ne=!!V.morphAttributes.position,dt=!!V.morphAttributes.normal,Tt=!!V.morphAttributes.color;let bt=In;B.toneMapped&&(Q===null||Q.isXRRenderTarget===!0)&&(bt=P.toneMapping);const gt=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,Ot=gt!==void 0?gt.length:0,be=z.get(B),Kt=T.state.lights;if(ie===!0&&(ne===!0||b!==se)){const xt=b===se&&B.id===$;Ue.setState(B,b,xt)}let st=!1;B.version===be.__version?(be.needsLights&&be.lightsStateVersion!==Kt.state.version||be.outputColorSpace!==Me||k.isBatchedMesh&&be.batching===!1||!k.isBatchedMesh&&be.batching===!0||k.isBatchedMesh&&be.batchingColor===!0&&k.colorTexture===null||k.isBatchedMesh&&be.batchingColor===!1&&k.colorTexture!==null||k.isInstancedMesh&&be.instancing===!1||!k.isInstancedMesh&&be.instancing===!0||k.isSkinnedMesh&&be.skinning===!1||!k.isSkinnedMesh&&be.skinning===!0||k.isInstancedMesh&&be.instancingColor===!0&&k.instanceColor===null||k.isInstancedMesh&&be.instancingColor===!1&&k.instanceColor!==null||k.isInstancedMesh&&be.instancingMorph===!0&&k.morphTexture===null||k.isInstancedMesh&&be.instancingMorph===!1&&k.morphTexture!==null||be.envMap!==Ie||B.fog===!0&&be.fog!==ye||be.numClippingPlanes!==void 0&&(be.numClippingPlanes!==Ue.numPlanes||be.numIntersection!==Ue.numIntersection)||be.vertexAlphas!==Je||be.vertexTangents!==je||be.morphTargets!==Ne||be.morphNormals!==dt||be.morphColors!==Tt||be.toneMapping!==bt||be.morphTargetsCount!==Ot||!!be.lightProbeGrid!=T.state.lightProbeGridArray.length>0)&&(st=!0):(st=!0,be.__version=B.version);let tn=be.currentProgram;st===!0&&(tn=oa(B,U,k),N&&B.isNodeMaterial&&N.onUpdateProgram(B,tn,be));let bn=!1,si=!1,$i=!1;const _t=tn.getUniforms(),Et=be.uniforms;if(v.useProgram(tn.program)&&(bn=!0,si=!0,$i=!0),B.id!==$&&($=B.id,si=!0),be.needsLights){const xt=I0(T.state.lightProbeGridArray,k);be.lightProbeGrid!==xt&&(be.lightProbeGrid=xt,si=!0)}if(bn||se!==b){v.buffers.depth.getReversed()&&b.reversedDepth!==!0&&(b._reversedDepth=!0,b.updateProjectionMatrix()),_t.setValue(L,"projectionMatrix",b.projectionMatrix),_t.setValue(L,"viewMatrix",b.matrixWorldInverse);const ai=_t.map.cameraPosition;ai!==void 0&&ai.setValue(L,ge.setFromMatrixPosition(b.matrixWorld)),R.logarithmicDepthBuffer&&_t.setValue(L,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(B.isMeshPhongMaterial||B.isMeshToonMaterial||B.isMeshLambertMaterial||B.isMeshBasicMaterial||B.isMeshStandardMaterial||B.isShaderMaterial)&&_t.setValue(L,"isOrthographic",b.isOrthographicCamera===!0),se!==b&&(se=b,si=!0,$i=!0)}if(be.needsLights&&(Kt.state.directionalShadowMap.length>0&&_t.setValue(L,"directionalShadowMap",Kt.state.directionalShadowMap,q),Kt.state.spotShadowMap.length>0&&_t.setValue(L,"spotShadowMap",Kt.state.spotShadowMap,q),Kt.state.pointShadowMap.length>0&&_t.setValue(L,"pointShadowMap",Kt.state.pointShadowMap,q)),k.isSkinnedMesh){_t.setOptional(L,k,"bindMatrix"),_t.setOptional(L,k,"bindMatrixInverse");const xt=k.skeleton;xt&&(xt.boneTexture===null&&xt.computeBoneTexture(),_t.setValue(L,"boneTexture",xt.boneTexture,q))}k.isBatchedMesh&&(_t.setOptional(L,k,"batchingTexture"),_t.setValue(L,"batchingTexture",k._matricesTexture,q),_t.setOptional(L,k,"batchingIdTexture"),_t.setValue(L,"batchingIdTexture",k._indirectTexture,q),_t.setOptional(L,k,"batchingColorTexture"),k._colorsTexture!==null&&_t.setValue(L,"batchingColorTexture",k._colorsTexture,q));const ri=V.morphAttributes;if((ri.position!==void 0||ri.normal!==void 0||ri.color!==void 0)&&D.update(k,V,tn),(si||be.receiveShadow!==k.receiveShadow)&&(be.receiveShadow=k.receiveShadow,_t.setValue(L,"receiveShadow",k.receiveShadow)),(B.isMeshStandardMaterial||B.isMeshLambertMaterial||B.isMeshPhongMaterial)&&B.envMap===null&&U.environment!==null&&(Et.envMapIntensity.value=U.environmentIntensity),Et.dfgLUT!==void 0&&(Et.dfgLUT.value=xb()),si){if(_t.setValue(L,"toneMappingExposure",P.toneMappingExposure),be.needsLights&&N0(Et,$i),ye&&B.fog===!0&&Ce.refreshFogUniforms(Et,ye),Ce.refreshMaterialUniforms(Et,B,ae,le,T.state.transmissionRenderTarget[b.id]),be.needsLights&&be.lightProbeGrid){const xt=be.lightProbeGrid;Et.probesSH.value=xt.texture,Et.probesMin.value.copy(xt.boundingBox.min),Et.probesMax.value.copy(xt.boundingBox.max),Et.probesResolution.value.copy(xt.resolution)}ro.upload(L,Au(be),Et,q)}if(B.isShaderMaterial&&B.uniformsNeedUpdate===!0&&(ro.upload(L,Au(be),Et,q),B.uniformsNeedUpdate=!1),B.isSpriteMaterial&&_t.setValue(L,"center",k.center),_t.setValue(L,"modelViewMatrix",k.modelViewMatrix),_t.setValue(L,"normalMatrix",k.normalMatrix),_t.setValue(L,"modelMatrix",k.matrixWorld),B.uniformsGroups!==void 0){const xt=B.uniformsGroups;for(let ai=0,Ki=xt.length;ai<Ki;ai++){const Pu=xt[ai];ee.update(Pu,tn),ee.bind(Pu,tn)}}return tn}function N0(b,U){b.ambientLightColor.needsUpdate=U,b.lightProbe.needsUpdate=U,b.directionalLights.needsUpdate=U,b.directionalLightShadows.needsUpdate=U,b.pointLights.needsUpdate=U,b.pointLightShadows.needsUpdate=U,b.spotLights.needsUpdate=U,b.spotLightShadows.needsUpdate=U,b.rectAreaLights.needsUpdate=U,b.hemisphereLights.needsUpdate=U}function D0(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return W},this.getActiveMipmapLevel=function(){return H},this.getRenderTarget=function(){return Q},this.setRenderTargetTextures=function(b,U,V){const B=z.get(b);B.__autoAllocateDepthBuffer=b.resolveDepthBuffer===!1,B.__autoAllocateDepthBuffer===!1&&(B.__useRenderToTexture=!1),z.get(b.texture).__webglTexture=U,z.get(b.depthTexture).__webglTexture=B.__autoAllocateDepthBuffer?void 0:V,B.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(b,U){const V=z.get(b);V.__webglFramebuffer=U,V.__useDefaultFramebuffer=U===void 0},this.setRenderTarget=function(b,U=0,V=0){Q=b,W=U,H=V;let B=null,k=!1,ye=!1;if(b){const Me=z.get(b);if(Me.__useDefaultFramebuffer!==void 0){v.bindFramebuffer(L.FRAMEBUFFER,Me.__webglFramebuffer),re.copy(b.viewport),ue.copy(b.scissor),Ve=b.scissorTest,v.viewport(re),v.scissor(ue),v.setScissorTest(Ve),$=-1;return}else if(Me.__webglFramebuffer===void 0)q.setupRenderTarget(b);else if(Me.__hasExternalTextures)q.rebindTextures(b,z.get(b.texture).__webglTexture,z.get(b.depthTexture).__webglTexture);else if(b.depthBuffer){const Je=b.depthTexture;if(Me.__boundDepthTexture!==Je){if(Je!==null&&z.has(Je)&&(b.width!==Je.image.width||b.height!==Je.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");q.setupDepthRenderbuffer(b)}}const we=b.texture;(we.isData3DTexture||we.isDataArrayTexture||we.isCompressedArrayTexture)&&(ye=!0);const Ie=z.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(Ie[U])?B=Ie[U][V]:B=Ie[U],k=!0):b.samples>0&&q.useMultisampledRTT(b)===!1?B=z.get(b).__webglMultisampledFramebuffer:Array.isArray(Ie)?B=Ie[V]:B=Ie,re.copy(b.viewport),ue.copy(b.scissor),Ve=b.scissorTest}else re.copy(Fe).multiplyScalar(ae).floor(),ue.copy(rt).multiplyScalar(ae).floor(),Ve=Xe;if(V!==0&&(B=G),v.bindFramebuffer(L.FRAMEBUFFER,B)&&v.drawBuffers(b,B),v.viewport(re),v.scissor(ue),v.setScissorTest(Ve),k){const Me=z.get(b.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_CUBE_MAP_POSITIVE_X+U,Me.__webglTexture,V)}else if(ye){const Me=U;for(let we=0;we<b.textures.length;we++){const Ie=z.get(b.textures[we]);L.framebufferTextureLayer(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0+we,Ie.__webglTexture,V,Me)}}else if(b!==null&&V!==0){const Me=z.get(b.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,Me.__webglTexture,V)}$=-1},this.readRenderTargetPixels=function(b,U,V,B,k,ye,Te,Me=0){if(!(b&&b.isWebGLRenderTarget)){ke("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let we=z.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Te!==void 0&&(we=we[Te]),we){v.bindFramebuffer(L.FRAMEBUFFER,we);try{const Ie=b.textures[Me],Je=Ie.format,je=Ie.type;if(b.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+Me),!R.textureFormatReadable(Je)){ke("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!R.textureTypeReadable(je)){ke("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}U>=0&&U<=b.width-B&&V>=0&&V<=b.height-k&&L.readPixels(U,V,B,k,me.convert(Je),me.convert(je),ye)}finally{const Ie=Q!==null?z.get(Q).__webglFramebuffer:null;v.bindFramebuffer(L.FRAMEBUFFER,Ie)}}},this.readRenderTargetPixelsAsync=async function(b,U,V,B,k,ye,Te,Me=0){if(!(b&&b.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let we=z.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Te!==void 0&&(we=we[Te]),we)if(U>=0&&U<=b.width-B&&V>=0&&V<=b.height-k){v.bindFramebuffer(L.FRAMEBUFFER,we);const Ie=b.textures[Me],Je=Ie.format,je=Ie.type;if(b.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+Me),!R.textureFormatReadable(Je))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!R.textureTypeReadable(je))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Ne=L.createBuffer();L.bindBuffer(L.PIXEL_PACK_BUFFER,Ne),L.bufferData(L.PIXEL_PACK_BUFFER,ye.byteLength,L.STREAM_READ),L.readPixels(U,V,B,k,me.convert(Je),me.convert(je),0);const dt=Q!==null?z.get(Q).__webglFramebuffer:null;v.bindFramebuffer(L.FRAMEBUFFER,dt);const Tt=L.fenceSync(L.SYNC_GPU_COMMANDS_COMPLETE,0);return L.flush(),await xg(L,Tt,4),L.bindBuffer(L.PIXEL_PACK_BUFFER,Ne),L.getBufferSubData(L.PIXEL_PACK_BUFFER,0,ye),L.deleteBuffer(Ne),L.deleteSync(Tt),ye}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(b,U=null,V=0){const B=Math.pow(2,-V),k=Math.floor(b.image.width*B),ye=Math.floor(b.image.height*B),Te=U!==null?U.x:0,Me=U!==null?U.y:0;q.setTexture2D(b,0),L.copyTexSubImage2D(L.TEXTURE_2D,V,0,0,Te,Me,k,ye),v.unbindTexture()},this.copyTextureToTexture=function(b,U,V=null,B=null,k=0,ye=0){let Te,Me,we,Ie,Je,je,Ne,dt,Tt;const bt=b.isCompressedTexture?b.mipmaps[ye]:b.image;if(V!==null)Te=V.max.x-V.min.x,Me=V.max.y-V.min.y,we=V.isBox3?V.max.z-V.min.z:1,Ie=V.min.x,Je=V.min.y,je=V.isBox3?V.min.z:0;else{const Et=Math.pow(2,-k);Te=Math.floor(bt.width*Et),Me=Math.floor(bt.height*Et),b.isDataArrayTexture?we=bt.depth:b.isData3DTexture?we=Math.floor(bt.depth*Et):we=1,Ie=0,Je=0,je=0}B!==null?(Ne=B.x,dt=B.y,Tt=B.z):(Ne=0,dt=0,Tt=0);const gt=me.convert(U.format),Ot=me.convert(U.type);let be;U.isData3DTexture?(q.setTexture3D(U,0),be=L.TEXTURE_3D):U.isDataArrayTexture||U.isCompressedArrayTexture?(q.setTexture2DArray(U,0),be=L.TEXTURE_2D_ARRAY):(q.setTexture2D(U,0),be=L.TEXTURE_2D),v.activeTexture(L.TEXTURE0),v.pixelStorei(L.UNPACK_FLIP_Y_WEBGL,U.flipY),v.pixelStorei(L.UNPACK_PREMULTIPLY_ALPHA_WEBGL,U.premultiplyAlpha),v.pixelStorei(L.UNPACK_ALIGNMENT,U.unpackAlignment);const Kt=v.getParameter(L.UNPACK_ROW_LENGTH),st=v.getParameter(L.UNPACK_IMAGE_HEIGHT),tn=v.getParameter(L.UNPACK_SKIP_PIXELS),bn=v.getParameter(L.UNPACK_SKIP_ROWS),si=v.getParameter(L.UNPACK_SKIP_IMAGES);v.pixelStorei(L.UNPACK_ROW_LENGTH,bt.width),v.pixelStorei(L.UNPACK_IMAGE_HEIGHT,bt.height),v.pixelStorei(L.UNPACK_SKIP_PIXELS,Ie),v.pixelStorei(L.UNPACK_SKIP_ROWS,Je),v.pixelStorei(L.UNPACK_SKIP_IMAGES,je);const $i=b.isDataArrayTexture||b.isData3DTexture,_t=U.isDataArrayTexture||U.isData3DTexture;if(b.isDepthTexture){const Et=z.get(b),ri=z.get(U),xt=z.get(Et.__renderTarget),ai=z.get(ri.__renderTarget);v.bindFramebuffer(L.READ_FRAMEBUFFER,xt.__webglFramebuffer),v.bindFramebuffer(L.DRAW_FRAMEBUFFER,ai.__webglFramebuffer);for(let Ki=0;Ki<we;Ki++)$i&&(L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,z.get(b).__webglTexture,k,je+Ki),L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,z.get(U).__webglTexture,ye,Tt+Ki)),L.blitFramebuffer(Ie,Je,Te,Me,Ne,dt,Te,Me,L.DEPTH_BUFFER_BIT,L.NEAREST);v.bindFramebuffer(L.READ_FRAMEBUFFER,null),v.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else if(k!==0||b.isRenderTargetTexture||z.has(b)){const Et=z.get(b),ri=z.get(U);v.bindFramebuffer(L.READ_FRAMEBUFFER,X),v.bindFramebuffer(L.DRAW_FRAMEBUFFER,O);for(let xt=0;xt<we;xt++)$i?L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,Et.__webglTexture,k,je+xt):L.framebufferTexture2D(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,Et.__webglTexture,k),_t?L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,ri.__webglTexture,ye,Tt+xt):L.framebufferTexture2D(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,ri.__webglTexture,ye),k!==0?L.blitFramebuffer(Ie,Je,Te,Me,Ne,dt,Te,Me,L.COLOR_BUFFER_BIT,L.NEAREST):_t?L.copyTexSubImage3D(be,ye,Ne,dt,Tt+xt,Ie,Je,Te,Me):L.copyTexSubImage2D(be,ye,Ne,dt,Ie,Je,Te,Me);v.bindFramebuffer(L.READ_FRAMEBUFFER,null),v.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else _t?b.isDataTexture||b.isData3DTexture?L.texSubImage3D(be,ye,Ne,dt,Tt,Te,Me,we,gt,Ot,bt.data):U.isCompressedArrayTexture?L.compressedTexSubImage3D(be,ye,Ne,dt,Tt,Te,Me,we,gt,bt.data):L.texSubImage3D(be,ye,Ne,dt,Tt,Te,Me,we,gt,Ot,bt):b.isDataTexture?L.texSubImage2D(L.TEXTURE_2D,ye,Ne,dt,Te,Me,gt,Ot,bt.data):b.isCompressedTexture?L.compressedTexSubImage2D(L.TEXTURE_2D,ye,Ne,dt,bt.width,bt.height,gt,bt.data):L.texSubImage2D(L.TEXTURE_2D,ye,Ne,dt,Te,Me,gt,Ot,bt);v.pixelStorei(L.UNPACK_ROW_LENGTH,Kt),v.pixelStorei(L.UNPACK_IMAGE_HEIGHT,st),v.pixelStorei(L.UNPACK_SKIP_PIXELS,tn),v.pixelStorei(L.UNPACK_SKIP_ROWS,bn),v.pixelStorei(L.UNPACK_SKIP_IMAGES,si),ye===0&&U.generateMipmaps&&L.generateMipmap(be),v.unbindTexture()},this.initRenderTarget=function(b){z.get(b).__webglFramebuffer===void 0&&q.setupRenderTarget(b)},this.initTexture=function(b){b.isCubeTexture?q.setTextureCube(b,0):b.isData3DTexture?q.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?q.setTexture2DArray(b,0):q.setTexture2D(b,0),v.unbindTexture()},this.resetState=function(){W=0,H=0,Q=null,v.reset(),Se.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Cn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=it._getDrawingBufferColorSpace(e),t.unpackColorSpace=it._getUnpackColorSpace()}}function Mb(n){const{x:e,y:t,z:i}=pm(n.rotation);return{x:gs(n.position.x*100,1),y:gs(n.position.y*100,1),z:gs(n.position.z*100,1),pitch:gs(e*180/Math.PI,0),yaw:gs(t*180/Math.PI,0),roll:gs(i*180/Math.PI,0)}}function yb(n){return{position:{x:n.x/100,y:n.y/100,z:n.z/100},rotation:fm({x:n.pitch*Math.PI/180,y:n.yaw*Math.PI/180,z:n.roll*Math.PI/180})}}function xA(n){const e={x:-n.position.x,y:n.position.y,z:n.position.z},{x:t,y:i,z:s,w:a}=n.rotation;return{position:e,rotation:{x:t,y:-i,z:-s,w:a}}}function um(n){return[n.x,n.y,n.z,n.pitch,n.yaw,n.roll]}function dm(n){const e=t=>Number.isFinite(n[t])?n[t]:0;return{x:e(0),y:e(1),z:e(2),pitch:e(3),yaw:e(4),roll:e(5)}}function fm(n){const e=Math.cos(n.x/2),t=Math.cos(n.y/2),i=Math.cos(n.z/2),s=Math.sin(n.x/2),a=Math.sin(n.y/2),r=Math.sin(n.z/2);return{x:s*t*i+e*a*r,y:e*a*i-s*t*r,z:e*t*r+s*a*i,w:e*t*i-s*a*r}}function pm(n){const{x:e,y:t,z:i,w:s}=n,a=e+e,r=t+t,o=i+i,l=e*a,c=e*r,h=e*o,d=t*r,u=t*o,f=i*o,m=s*a,M=s*r,p=s*o,g=1-(d+f),y=c-p,S=h+M,x=1-(l+f),w=u-m,T=u+m,A=1-(l+d),_=Math.asin(Math.max(-1,Math.min(1,S)));return Math.abs(S)<.9999999?{x:Math.atan2(-w,A),y:_,z:Math.atan2(-y,g)}:{x:Math.atan2(T,x),y:_,z:0}}function gs(n,e){const t=10**e;return(Math.round(n*t)+0)/t}const MA=2005636,yA=1073231,SA=.22,Sb=6217888,bA=16757596,TA=10320895,EA=7306649,Kh=["Daumen","Zeige","Mittel","Ring","Kleiner"],Cs=3,Jh=Cs+1,Hr=Kh.length*Jh;function uf(n){const e=[];for(let t=0;t<Kh.length;t++){const i=n[t];for(let s=0;s<Cs;s++)e.push(df(i?.bends[s]??0));e.push(df(i?.fan??0))}return e}function df(n){return Number.isFinite(n)?Math.round(n*10)/10:0}const Vr={x:0,y:0,z:0,pitch:0,yaw:0,roll:0,curls:[.1,.08,.08,.1,.12],spread:0},mm={...Vr,x:-.3,y:2.7,z:3.8,pitch:75,yaw:-45,roll:5},gm=Mm(mm);function Zh(n){return Wi(n==="left"?mm:gm)}const wA="grab",Ti={x:0,y:0,z:0,pitch:0,yaw:0,roll:0,curls:[.55,.35,.85,.9,.9],spread:0},Zn={...Ti,x:1.7,y:2.4,z:2.7,pitch:-43,yaw:-17,roll:-90,curls:[.55,.1,.85,.9,.9]},bb={...Ti,x:2.6,y:1.4,z:.5,pitch:-120,yaw:0,roll:-90,curls:[.55,.85,.85,.9,.9]},Tb={...bb,x:2.6,y:2.9,z:.8,pitch:-75},Eb={...Ti,x:.7,y:3.2,z:4.5,pitch:31,yaw:-35,roll:-6,curls:[.35,.45,.55,.9,1]},wb={...Zn,curls:[...Zn.curls]},Ab={...Zn,curls:[...Zn.curls]},Rb={...Ti,x:0,y:-4.6,z:5,pitch:0,yaw:0,roll:-180,curls:[.55,.85,.85,.9,.9]},Pb={...Ti,x:0,y:3.8,z:1.2,pitch:-30,yaw:0,roll:0,curls:[.55,.85,.85,.9,.9]},Vl={...gm},ff={...Ti,x:2.7,y:3.7,z:1.5,pitch:-90,yaw:-17,roll:-90,curls:[...Zn.curls]},Cb="hand-box",Ib={...Zn,x:4.2,y:2.4,z:2.7,pitch:-43,yaw:3,roll:-90,curls:[...Zn.curls]},Lb={hammer:Ab,flashlight:Tb,brush:Eb,drone:Ib,stopwatch:wb,bag:Rb,"hang-glider":Pb,"gravity-glove":Vl,"translate-glove":Vl,"superman-glove":Vl,"controller-left":ff,"controller-right":ff,champagne:Zn},_m=new Set(["grip","pistol","easel","duplicator","inspect","teleport","gizmo","holster","grapple","gun-blue","gun-red","gun-dual","tape","eraser","xray","radar","mirror","welder","knife","brain"]),Nb="grip";function vm(n,e){const t=_m.has(e)?Zn:Lb[e];return t?n==="right"?Wi(t):Mm(t):Wi(Ti)}const AA={grab:!0,trigger:!1},ks=[null,null,null,null,null],Qh=[.35,.4,.45,.5,.55],Db={grab:ks,release:Qh,trigger:[null,.6,null,null,null]},pf={grab:ks,release:Qh,trigger:[null,1,null,null,null]},Ub={grab:ks,release:Qh,trigger:[null,.65,null,null,null]},Gl={grab:[.55,.85,.85,.9,.9],release:ks,trigger:[null,.6,null,null,null]},Wl={grab:ks,release:ks,trigger:[null,.6,null,null,null]},Fb={hammer:pf,flashlight:pf,brush:Ub,"gravity-glove":Gl,"translate-glove":Gl,"superman-glove":Gl,"hang-glider":Wl,wings:Wl,"hand-box":Wl};function Ob(n){return n&&Fb[n]||Db}function RA(n,e,t){const i=Wi(n).curls;return xm(e,t).forEach((s,a)=>{s!==null&&(i[a]=s)}),i}function xm(n,e){const t=[null,null,null,null,null],i=[e.grab?n.grab:n.release];e.trigger&&i.push(n.trigger);for(const s of i)s.forEach((a,r)=>{a!==null&&r<t.length&&(t[r]=a)});return t}const PA=[{key:"x",label:"X (rechts)",unit:"cm",min:-30,max:30},{key:"y",label:"Y (hoch)",unit:"cm",min:-30,max:30},{key:"z",label:"Z (vor)",unit:"cm",min:-30,max:30},{key:"pitch",label:"Pitch",unit:"°",min:-180,max:180},{key:"yaw",label:"Yaw",unit:"°",min:-180,max:180},{key:"roll",label:"Roll",unit:"°",min:-180,max:180},{key:"curl0",label:"Daumen",unit:"",min:0,max:1},{key:"curl1",label:"Zeigefinger",unit:"",min:0,max:1},{key:"curl2",label:"Mittelfinger",unit:"",min:0,max:1},{key:"curl3",label:"Ringfinger",unit:"",min:0,max:1},{key:"curl4",label:"Kleiner Finger",unit:"",min:0,max:1},{key:"spread",label:"Spreizung",unit:"°",min:-30,max:30}];function CA(n,e){const t=ym(e);return t!==null?n.curls[t]??0:n[e]??0}function IA(n,e,t){const i=Wi(n),s=ym(e);return s!==null?i.curls[s]=t:e in i&&(i[e]=t),(s!==null||e==="spread")&&delete i.joints,i}function Mm(n){const e=Wi(n);if(e.x=-n.x+0,e.yaw=-n.yaw+0,e.roll=-n.roll+0,e.joints)for(let t=0;t<Kh.length;t++){const i=t*Jh+Cs;e.joints[i]=-(e.joints[i]??0)+0}return e}function ta(n){const e=[n.x,n.y,n.z,n.pitch,n.yaw,n.roll,...Yo(n.curls),n.spread];return n.joints?.length===Hr&&e.push(...n.joints),e}const mf=12;function Po(n,e=Vr){const t=(a,r)=>Number.isFinite(n[a])?n[a]:r,i={x:t(0,e.x),y:t(1,e.y),z:t(2,e.z),pitch:t(3,e.pitch),yaw:t(4,e.yaw),roll:t(5,e.roll),curls:Yo(e.curls).map((a,r)=>t(6+r,a)),spread:t(11,e.spread)},s=n.slice(mf,mf+Hr);return s.length===Hr&&s.every(a=>Number.isFinite(a))&&(i.joints=s),i}function Wi(n){const e={...n,curls:Yo(n.curls)};return n.joints&&(e.joints=[...n.joints]),e}function LA(n){const e=Yo(n.curls).map(i=>i.toFixed(2)).join("/"),t=n.joints?.length===Hr?" · Gelenke":"";return`x ${n.x} y ${n.y} z ${n.z} cm · ${n.pitch}/${n.yaw}/${n.roll}° · ${e}${t}`}function Yo(n){return[0,1,2,3,4].map(e=>Number.isFinite(n[e])?n[e]:0)}function ym(n){const e=/^curl([0-4])$/.exec(n);return e?Number(e[1]):null}const jh="bgvr.handPoses",Co=new Set;let Ui=null;function Qn(){if(Ui)return Ui;try{const n=globalThis.localStorage?.getItem(jh);Ui=n?JSON.parse(n):{}}catch{Ui={}}return Ui}function na(n){Ui=n;try{globalThis.localStorage?.setItem(jh,JSON.stringify(n))}catch{}for(const e of Co)e()}function Bb(n){return Co.add(n),()=>Co.delete(n)}function ah(n){const e=Zh(n),t=Qn().idle?.[n];return t?Po(t,e):e}function gf(n,e){if(e===Cb)return ah(n);const t=vm(n,e),i=Qn().hold?.[n]?.[e];if(i)return Po(i,t);const s=_m.has(e)?Qn().hold?.[n]?.[Nb]:void 0;return s?Po(s,t):t}function NA(n,e){const t=Qn();na({...t,idle:{...t.idle,[n]:ta(e)}})}function DA(n,e,t){const i=Qn();na({...i,hold:{...i.hold,[n]:{...i.hold?.[n],[e]:ta(t)}}})}function UA(n){const e=Qn();if(!e.idle?.[n])return!1;const t={...e.idle};return delete t[n],na({...e,idle:t}),!0}function FA(n,e){const t=Qn();if(!t.hold?.[n]?.[e])return!1;const i={...t.hold[n]};return delete i[e],na({...t,hold:{...t.hold,[n]:i}}),!0}function kb(n){na(n)}function Sm(){const n=Qn();return JSON.parse(JSON.stringify(n))}function zb(){Ui={};try{globalThis.localStorage?.removeItem(jh)}catch{}for(const n of Co)n()}function OA(){const n=Qn();let e=Object.keys(n.idle??{}).length;for(const t of Object.values(n.hold??{}))e+=Object.keys(t??{}).length;return e}function _f(n,e,t,i,s,a){const r=s/2;switch(n.save(),n.translate(t,i),n.strokeStyle=a,n.fillStyle=a,n.lineWidth=Math.max(2,s*.075),n.lineJoin="round",n.lineCap="round",e){case"worlds":{n.beginPath(),n.arc(0,0,r*.72,0,Math.PI*2),n.stroke(),n.beginPath(),n.ellipse(0,0,r*.72,r*.28,0,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(0,-r*.72),n.lineTo(0,r*.72),n.stroke();break}case"tools":{n.beginPath(),n.moveTo(-r*.6,r*.6),n.lineTo(r*.2,-r*.2),n.stroke(),n.beginPath(),n.arc(r*.42,-r*.42,r*.32,Math.PI*.15,Math.PI*1.5),n.stroke();break}case"bag":{n.beginPath(),n.moveTo(-r*.62,-r*.1),n.quadraticCurveTo(-r*.75,r*.75,0,r*.75),n.quadraticCurveTo(r*.75,r*.75,r*.62,-r*.1),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(-r*.32,-r*.1),n.quadraticCurveTo(0,-r*.85,r*.32,-r*.1),n.stroke();break}case"reset":{n.beginPath(),n.arc(0,0,r*.62,Math.PI*.35,Math.PI*1.85),n.stroke(),n.beginPath(),n.moveTo(r*.2,-r*.72),n.lineTo(r*.56,-r*.44),n.lineTo(r*.16,-r*.24),n.closePath(),n.fill();break}case"back":{n.beginPath(),n.moveTo(r*.5,-r*.55),n.lineTo(-r*.3,0),n.lineTo(r*.5,r*.55),n.stroke();break}case"close":{n.beginPath(),n.moveTo(-r*.5,-r*.5),n.lineTo(r*.5,r*.5),n.moveTo(r*.5,-r*.5),n.lineTo(-r*.5,r*.5),n.stroke();break}case"gun":{n.beginPath(),n.roundRect(-r*.75,-r*.25,r*1.3,r*.42,r*.12),n.stroke(),n.beginPath(),n.roundRect(-r*.5,r*.17,r*.34,r*.6,r*.1),n.stroke(),n.beginPath(),n.arc(r*.62,-r*.04,r*.2,0,Math.PI*2),n.fill();break}case"cube":{n.beginPath(),n.moveTo(0,-r*.8),n.lineTo(r*.75,-r*.38),n.lineTo(r*.75,r*.4),n.lineTo(0,r*.82),n.lineTo(-r*.75,r*.4),n.lineTo(-r*.75,-r*.38),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(-r*.75,-r*.38),n.lineTo(0,0),n.lineTo(r*.75,-r*.38),n.moveTo(0,0),n.lineTo(0,r*.82),n.stroke();break}case"domino":{n.beginPath(),n.roundRect(-r*.42,-r*.8,r*.84,r*1.6,r*.12),n.stroke(),n.beginPath(),n.moveTo(-r*.42,0),n.lineTo(r*.42,0),n.stroke(),n.beginPath(),n.arc(0,-r*.4,r*.12,0,Math.PI*2),n.arc(0,r*.4,r*.12,0,Math.PI*2),n.fill();break}case"settings":{for(const[o,l]of[[-r*.45,-r*.2],[0,r*.25],[r*.45,-r*.1]])n.beginPath(),n.moveTo(-r*.7,o),n.lineTo(r*.7,o),n.stroke(),n.beginPath(),n.arc(l,o,r*.16,0,Math.PI*2),n.fillStyle=a,n.fill();break}case"portal":{n.beginPath(),n.ellipse(0,0,r*.5,r*.78,0,0,Math.PI*2),n.stroke();break}case"folder":{n.beginPath(),n.moveTo(-r*.78,-r*.34),n.lineTo(-r*.78,-r*.6),n.lineTo(-r*.18,-r*.6),n.lineTo(-r*.02,-r*.34),n.stroke(),n.beginPath(),n.roundRect(-r*.78,-r*.34,r*1.56,r*.94,r*.14),n.stroke();break}case"sphere":{n.beginPath(),n.arc(0,0,r*.74,0,Math.PI*2),n.stroke(),n.beginPath(),n.ellipse(0,0,r*.74,r*.3,0,0,Math.PI*2),n.stroke(),n.beginPath(),n.arc(-r*.24,-r*.28,r*.16,0,Math.PI*2),n.fill();break}case"pyramid":{n.beginPath(),n.moveTo(0,-r*.8),n.lineTo(r*.8,r*.6),n.lineTo(-r*.8,r*.6),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(0,-r*.8),n.lineTo(r*.16,r*.24),n.lineTo(-r*.8,r*.6),n.moveTo(r*.16,r*.24),n.lineTo(r*.8,r*.6),n.stroke();break}case"plank":{n.beginPath(),n.roundRect(-r*.85,-r*.3,r*1.7,r*.42,r*.08),n.stroke(),n.beginPath(),n.moveTo(-r*.85,r*.12),n.lineTo(-r*.6,r*.42),n.lineTo(r*1.1,r*.42),n.lineTo(r*.85,r*.12),n.stroke();break}case"cylinder":{n.beginPath(),n.ellipse(0,-r*.5,r*.55,r*.22,0,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(-r*.55,-r*.5),n.lineTo(-r*.55,r*.5),n.moveTo(r*.55,-r*.5),n.lineTo(r*.55,r*.5),n.stroke(),n.beginPath(),n.ellipse(0,r*.5,r*.55,r*.22,0,0,Math.PI),n.stroke();break}case"gizmo":{const o=(l,c)=>{n.beginPath(),n.moveTo(0,0),n.lineTo(l,c),n.stroke(),n.beginPath(),n.arc(l,c,r*.15,0,Math.PI*2),n.fill()};o(r*.72,0),o(0,-r*.72),o(-r*.6,r*.5);break}case"brush":{n.beginPath(),n.moveTo(-r*.6,r*.7),n.lineTo(r*.35,-r*.25),n.stroke(),n.beginPath(),n.moveTo(r*.2,-r*.4),n.lineTo(r*.72,-r*.72),n.lineTo(r*.5,-r*.1),n.closePath(),n.fill();break}case"pistol":{n.beginPath(),n.moveTo(-r*.75,-r*.42),n.lineTo(r*.75,-r*.42),n.lineTo(r*.75,-r*.05),n.lineTo(-r*.1,-r*.05),n.lineTo(-r*.42,r*.75),n.lineTo(-r*.75,r*.75),n.closePath(),n.stroke();break}case"stopwatch":{n.beginPath(),n.arc(0,r*.1,r*.66,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(-r*.2,-r*.72),n.lineTo(r*.2,-r*.72),n.stroke(),n.beginPath(),n.moveTo(0,r*.1),n.lineTo(0,-r*.32),n.stroke();break}case"grapple":{n.beginPath(),n.moveTo(-r*.7,-r*.75),n.lineTo(0,r*.1),n.stroke(),n.beginPath(),n.arc(0,r*.34,r*.32,Math.PI*1.15,Math.PI*2.35),n.stroke(),n.beginPath(),n.moveTo(r*.3,r*.2),n.lineTo(r*.42,r*.52),n.stroke();break}case"magnet":{n.beginPath(),n.arc(0,r*.12,r*.55,Math.PI,0),n.stroke(),n.beginPath(),n.moveTo(-r*.55,r*.12),n.lineTo(-r*.55,r*.62),n.moveTo(r*.55,r*.12),n.lineTo(r*.55,r*.62),n.stroke(),n.lineWidth=Math.max(3,s*.14),n.beginPath(),n.moveTo(-r*.55,r*.62),n.lineTo(-r*.55,r*.78),n.moveTo(r*.55,r*.62),n.lineTo(r*.55,r*.78),n.stroke();break}case"hand":{n.beginPath(),n.moveTo(-r*.38,r*.1),n.quadraticCurveTo(-r*.42,r*.78,r*.06,r*.78),n.quadraticCurveTo(r*.5,r*.78,r*.46,r*.1),n.stroke();for(const[o,l]of[[-r*.38,-r*.34],[-r*.12,-r*.62],[r*.14,-r*.66],[r*.4,-r*.36]])n.beginPath(),n.moveTo(o,r*.2),n.lineTo(o,l),n.stroke();n.beginPath(),n.moveTo(-r*.38,r*.28),n.lineTo(-r*.82,-r*.06),n.stroke();break}case"glove":{n.beginPath(),n.moveTo(-r*.42,r*.75),n.lineTo(-r*.42,-r*.25),n.quadraticCurveTo(-r*.42,-r*.8,-r*.1,-r*.8),n.quadraticCurveTo(r*.2,-r*.8,r*.2,-r*.25),n.lineTo(r*.2,r*.05),n.quadraticCurveTo(r*.5,r*.1,r*.42,r*.75),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(-r*.85,-r*.5),n.lineTo(-r*.55,-r*.5),n.stroke(),n.beginPath(),n.moveTo(-r*.5,-r*.5),n.lineTo(-r*.72,-r*.66),n.lineTo(-r*.72,-r*.34),n.closePath(),n.fill();break}case"controller":{n.beginPath(),n.arc(0,-r*.34,r*.46,Math.PI*.1,Math.PI*.9,!0),n.stroke(),n.beginPath(),n.moveTo(-r*.3,-r*.14),n.quadraticCurveTo(-r*.24,r*.62,r*.06,r*.8),n.quadraticCurveTo(r*.34,r*.5,r*.3,-r*.14),n.closePath(),n.stroke(),n.beginPath(),n.arc(0,r*.16,r*.13,0,Math.PI*2),n.fill();break}case"teleport":{n.beginPath(),n.ellipse(0,r*.5,r*.68,r*.26,0,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(0,-r*.86),n.lineTo(0,r*.06),n.stroke(),n.beginPath(),n.moveTo(-r*.3,-r*.2),n.lineTo(0,r*.24),n.lineTo(r*.3,-r*.2),n.closePath(),n.fill();break}case"superman":{n.beginPath(),n.moveTo(0,-r*.8),n.lineTo(r*.68,-r*.5),n.quadraticCurveTo(r*.6,r*.5,0,r*.82),n.quadraticCurveTo(-r*.6,r*.5,-r*.68,-r*.5),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(r*.18,-r*.46),n.lineTo(-r*.22,r*.06),n.lineTo(r*.1,r*.06),n.lineTo(-r*.18,r*.52),n.stroke();break}case"wrench":{n.beginPath(),n.moveTo(-r*.62,r*.72),n.lineTo(r*.24,-r*.14),n.stroke(),n.beginPath(),n.arc(r*.46,-r*.4,r*.34,Math.PI*.62,Math.PI*.12,!0),n.stroke(),n.beginPath(),n.arc(-r*.7,r*.72,r*.14,0,Math.PI*2),n.fill();break}case"weld":{n.beginPath(),n.moveTo(-r*.72,r*.6),n.lineTo(r*.1,-r*.2),n.stroke(),n.beginPath(),n.moveTo(r*.1,-r*.2),n.lineTo(r*.42,-r*.5),n.stroke();for(const o of[0,Math.PI/2,Math.PI/4,-Math.PI/4])n.beginPath(),n.moveTo(r*.52+Math.cos(o)*r*.1,-r*.6+Math.sin(o)*r*.1),n.lineTo(r*.52+Math.cos(o)*r*.28,-r*.6+Math.sin(o)*r*.28),n.stroke();break}case"hammer":{n.beginPath(),n.moveTo(-r*.62,r*.78),n.lineTo(r*.34,-r*.42),n.stroke(),n.beginPath(),n.roundRect(r*.06,-r*.86,r*.82,r*.42,r*.08),n.stroke(),n.save(),n.translate(r*.47,-r*.65),n.rotate(Math.PI/4),n.beginPath(),n.roundRect(-r*.41,-r*.21,r*.82,r*.42,r*.08),n.stroke(),n.restore();break}case"xray":{n.beginPath(),n.roundRect(-r*.78,-r*.6,r*1.56,r*1.2,r*.14),n.stroke(),n.beginPath(),n.moveTo(-r*.3,r*.3),n.lineTo(-r*.3,-r*.2),n.lineTo(r*.1,-r*.2),n.stroke(),n.beginPath(),n.arc(r*.32,r*.06,r*.2,0,Math.PI*2),n.stroke();break}case"drone":{n.beginPath(),n.roundRect(-r*.24,-r*.16,r*.48,r*.32,r*.08),n.stroke();for(const[o,l]of[[-r*.6,-r*.5],[r*.6,-r*.5],[-r*.6,r*.5],[r*.6,r*.5]])n.beginPath(),n.moveTo(o*.35,l*.35),n.lineTo(o,l),n.stroke(),n.beginPath(),n.ellipse(o,l,r*.26,r*.09,0,0,Math.PI*2),n.stroke();break}case"tape":{n.beginPath(),n.roundRect(-r*.78,-r*.1,r*.86,r*.82,r*.14),n.stroke(),n.beginPath(),n.arc(-r*.35,r*.3,r*.18,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(r*.08,r*.16),n.lineTo(r*.78,-r*.5),n.stroke(),n.beginPath(),n.moveTo(r*.5,-r*.62),n.lineTo(r*.8,-r*.34),n.stroke();break}case"eraser":{n.save(),n.rotate(-Math.PI/6),n.beginPath(),n.roundRect(-r*.7,-r*.3,r*1.4,r*.6,r*.12),n.stroke(),n.beginPath(),n.moveTo(r*.1,-r*.3),n.lineTo(r*.1,r*.3),n.stroke(),n.restore();break}case"flashlight":{n.beginPath(),n.roundRect(-r*.85,-r*.16,r*.95,r*.32,r*.07),n.stroke(),n.beginPath(),n.moveTo(r*.1,-r*.34),n.lineTo(r*.4,-r*.34),n.lineTo(r*.4,r*.34),n.lineTo(r*.1,r*.34),n.closePath(),n.stroke();for(const o of[-r*.5,0,r*.5])n.beginPath(),n.moveTo(r*.52,o*.55),n.lineTo(r*.86,o),n.stroke();break}case"lamp":{n.beginPath(),n.arc(0,-r*.18,r*.44,Math.PI*.85,Math.PI*.15),n.stroke(),n.beginPath(),n.moveTo(-r*.22,r*.16),n.lineTo(-r*.22,r*.42),n.lineTo(r*.22,r*.42),n.lineTo(r*.22,r*.16),n.stroke();for(const[o,l]of[[0,-r*.86],[-r*.62,-r*.56],[r*.62,-r*.56]])n.beginPath(),n.moveTo(o*.62,l*.62),n.lineTo(o,l),n.stroke();break}case"reddot":{n.beginPath(),n.arc(0,0,r*.7,0,Math.PI*2),n.stroke(),n.beginPath(),n.arc(0,0,r*.17,0,Math.PI*2),n.fill();break}case"irons":{n.beginPath(),n.moveTo(-r*.8,r*.5),n.lineTo(-r*.8,-r*.1),n.lineTo(-r*.5,-r*.1),n.lineTo(-r*.5,r*.15),n.lineTo(-r*.2,r*.15),n.lineTo(-r*.2,-r*.1),n.lineTo(r*.1,-r*.1),n.lineTo(r*.1,r*.5),n.stroke(),n.beginPath(),n.moveTo(r*.6,r*.5),n.lineTo(r*.6,-r*.55),n.stroke(),n.beginPath(),n.arc(r*.6,-r*.66,r*.13,0,Math.PI*2),n.fill();break}case"trace":{n.beginPath(),n.moveTo(-r*.8,r*.6),n.quadraticCurveTo(0,-r*1.1,r*.8,r*.5),n.stroke(),n.beginPath(),n.arc(-r*.8,r*.6,r*.14,0,Math.PI*2),n.fill(),n.beginPath(),n.arc(r*.8,r*.5,r*.2,0,Math.PI*2),n.stroke();break}case"scope":{n.beginPath(),n.moveTo(-r*.62,-r*.26),n.lineTo(r*.42,-r*.26),n.lineTo(r*.42,r*.26),n.lineTo(-r*.62,r*.26),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(r*.42,-r*.42),n.lineTo(r*.78,-r*.42),n.lineTo(r*.78,r*.42),n.lineTo(r*.42,r*.42),n.closePath(),n.stroke();for(const o of[-r*.34,r*.06])n.beginPath(),n.moveTo(o,r*.26),n.lineTo(o,r*.58),n.stroke();break}case"chat":{n.beginPath(),n.roundRect(-r*.8,-r*.68,r*1.6,r*1.12,r*.26),n.stroke(),n.beginPath(),n.moveTo(-r*.34,r*.42),n.lineTo(-r*.5,r*.86),n.lineTo(-r*.02,r*.44),n.stroke();for(const o of[-r*.42,0,r*.42])n.beginPath(),n.arc(o,-r*.12,r*.1,0,Math.PI*2),n.fill();break}case"sign":{n.beginPath(),n.roundRect(-r*.85,-r*.85,r*1.7,r*1.15,r*.16),n.stroke(),n.beginPath(),n.moveTo(0,r*.3),n.lineTo(0,r*.9),n.stroke();for(const[o,l]of[[-.5,.62],[-.18,.5],[.06,.34]])n.beginPath(),n.moveTo(-r*.62,r*o),n.lineTo(-r*.62+r*1.24*l,r*o),n.stroke();break}case"glider":{n.beginPath(),n.moveTo(-r*.9,-r*.15),n.lineTo(0,-r*.6),n.lineTo(r*.9,-r*.15),n.stroke(),n.beginPath(),n.moveTo(0,-r*.6),n.lineTo(0,-r*.1),n.stroke(),n.beginPath(),n.moveTo(-r*.4,r*.6),n.lineTo(0,-r*.1),n.lineTo(r*.4,r*.6),n.closePath(),n.stroke();break}case"wings":{for(const o of[-1,1]){n.beginPath(),n.moveTo(0,r*.2),n.quadraticCurveTo(o*r*.45,-r*.7,o*r*.9,-r*.35),n.stroke();for(const[l,c]of[[.9,.25],[.72,.42],[.52,.55]])n.beginPath(),n.moveTo(o*r*l,-r*.35+(.9-l)*r*.8),n.lineTo(o*r*(l-.08),-r*.35+c*r),n.stroke()}break}case"palette":{n.beginPath(),n.arc(0,0,r*.76,0,Math.PI*2),n.stroke();for(const[o,l]of[[-r*.34,-r*.3],[r*.3,-r*.34],[r*.36,r*.26],[-r*.3,r*.34]])n.beginPath(),n.arc(o,l,r*.16,0,Math.PI*2),n.fill();break}case"cone":{n.beginPath(),n.moveTo(0,-r*.8),n.lineTo(r*.62,r*.5),n.lineTo(-r*.62,r*.5),n.closePath(),n.stroke(),n.beginPath(),n.ellipse(0,r*.5,r*.62,r*.22,0,0,Math.PI*2),n.stroke();break}case"ramp":{n.beginPath(),n.moveTo(-r*.82,r*.5),n.lineTo(r*.82,r*.5),n.lineTo(r*.82,-r*.12),n.closePath(),n.stroke(),n.beginPath(),n.moveTo(r*.82,-r*.12),n.lineTo(r*.5,-r*.4),n.lineTo(-r*.5,r*.22),n.lineTo(-r*.82,r*.5),n.stroke();break}case"rod":{n.beginPath(),n.roundRect(-r*.86,-r*.16,r*1.72,r*.32,r*.16),n.stroke(),n.beginPath(),n.moveTo(-r*.4,-r*.16),n.lineTo(-r*.4,r*.16),n.moveTo(r*.4,-r*.16),n.lineTo(r*.4,r*.16),n.stroke();break}case"marble":{n.beginPath(),n.arc(0,r*.1,r*.5,0,Math.PI*2),n.stroke(),n.beginPath(),n.arc(-r*.16,-r*.06,r*.14,0,Math.PI*2),n.fill();break}case"bottle":{n.beginPath(),n.moveTo(-r*.32,r*.8),n.lineTo(r*.32,r*.8),n.lineTo(r*.32,r*.05),n.quadraticCurveTo(r*.32,-r*.2,r*.12,-r*.3),n.lineTo(r*.12,-r*.72),n.lineTo(-r*.12,-r*.72),n.lineTo(-r*.12,-r*.3),n.quadraticCurveTo(-r*.32,-r*.2,-r*.32,r*.05),n.closePath(),n.stroke(),n.beginPath(),n.roundRect(-r*.16,-r*.9,r*.32,r*.2,r*.06),n.fill();break}case"npc":{n.beginPath(),n.arc(0,-r*.56,r*.24,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(0,-r*.32),n.lineTo(0,r*.14),n.stroke(),n.beginPath(),n.moveTo(-r*.42,-r*.06),n.lineTo(r*.42,-r*.06),n.stroke(),n.beginPath(),n.moveTo(0,r*.14),n.lineTo(-r*.34,r*.8),n.moveTo(0,r*.14),n.lineTo(r*.34,r*.8),n.stroke();break}case"brain":{n.beginPath(),n.arc(-r*.34,-r*.24,r*.42,0,Math.PI*2),n.stroke(),n.beginPath(),n.arc(r*.34,-r*.24,r*.42,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(0,-r*.66),n.lineTo(0,r*.18),n.stroke(),n.beginPath(),n.moveTo(-r*.12,r*.18),n.lineTo(-r*.12,r*.7),n.lineTo(r*.12,r*.7),n.lineTo(r*.12,r*.18),n.stroke();break}case"zombie":{n.beginPath(),n.arc(0,-r*.56,r*.24,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(0,-r*.32),n.lineTo(0,r*.14),n.stroke(),n.beginPath(),n.moveTo(-r*.06,-r*.16),n.lineTo(-r*.72,-r*.36),n.moveTo(r*.06,-r*.16),n.lineTo(r*.72,-r*.36),n.stroke(),n.beginPath(),n.moveTo(0,r*.14),n.lineTo(-r*.3,r*.8),n.moveTo(0,r*.14),n.lineTo(r*.3,r*.8),n.stroke();break}case"spawn":{n.beginPath(),n.rect(-r*.76,-r*.68,r*1.52,r*1.36),n.stroke();for(const o of[-r*.25,r*.25])n.beginPath(),n.moveTo(o,-r*.68),n.lineTo(o,r*.68),n.stroke();n.beginPath(),n.arc(0,0,r*.2,0,Math.PI*2),n.fill();break}case"mirror":{n.beginPath(),n.ellipse(0,-r*.28,r*.5,r*.58,0,0,Math.PI*2),n.stroke(),n.beginPath(),n.moveTo(0,r*.3),n.lineTo(0,r*.88),n.stroke(),vf(n,-r*.28,r*.26,r*.3);break}case"mirror-stand":{n.beginPath(),n.roundRect(-r*.38,-r*.88,r*.76,r*1.42,r*.1),n.stroke(),n.beginPath(),n.moveTo(-r*.62,-r*.82),n.lineTo(-r*.62,r*.7),n.moveTo(r*.62,-r*.82),n.lineTo(r*.62,r*.7),n.moveTo(-r*.78,r*.82),n.lineTo(r*.78,r*.82),n.stroke(),vf(n,-r*.18,r*.2,r*.42);break}case"d4":case"d6":case"d8":case"d12":case"d20":{Hb(n,e,r);break}}n.restore()}function vf(n,e,t,i){n.beginPath();for(const s of[-t,t])n.moveTo(s-i*.5,e+i),n.lineTo(s+i*.5,e-i);n.stroke()}function Hb(n,e,t){const i=e==="d4"?3:e==="d6"||e==="d8"?4:e==="d12"?5:6,s=t*.78,a=i===4?Math.PI/4:-Math.PI/2,r=l=>[Math.cos(a+l/i*Math.PI*2)*s,Math.sin(a+l/i*Math.PI*2)*s];n.beginPath();for(let l=0;l<i;l++){const[c,h]=r(l);l===0?n.moveTo(c,h):n.lineTo(c,h)}if(n.closePath(),n.stroke(),e==="d4")return;if(e==="d6"){for(const[l,c]of[[-t*.28,-t*.28],[0,0],[t*.28,t*.28]])n.beginPath(),n.arc(l,c,t*.1,0,Math.PI*2),n.fill();return}const o=e==="d20"?1:2;for(let l=0;l<i;l+=o){const[c,h]=r(l);n.beginPath(),n.moveTo(c,h),n.lineTo(0,0),n.stroke()}}function Vb(n){const t=n.key===n.previousKey?n.current:n.remembered??0,i=Math.max(0,n.entries-n.pageSize);return!Number.isFinite(t)||t<0?0:Math.min(Math.floor(t),i)}const Rt=768,fi=1280,lt=34,Xa=150,Xl=76,Mt=122,sn=14,xf=3,pn=16,Gb=44;function Wb(n){return Math.floor((Rt-lt*2-pn*(n-1))/n)}class BA extends he{ctx;texture;entries=[];grid=!1;cols=xf;pinned=0;hover=-1;title;footer;hint="";status="";scroll=0;pageKey="";flash=0;onSelect;constructor(e={}){const t=e.width??.3,i=t*fi/Rt,s=document.createElement("canvas");s.width=Rt,s.height=fi;const a=new Go(s);a.colorSpace=zt,a.anisotropy=8,super(new qi(t,i),new Kr({map:a,transparent:!0,toneMapped:!1})),this.texture=a,this.ctx=s.getContext("2d"),this.title=e.title??"",this.footer=e.footer??"",this.onSelect=e.onSelect,this.name="ui-panel",this.renderOrder=10,this.geometry.computeBoundingBox(),this.draw()}setPage(e,t,i={}){const s=i.key??e;this.title=e,this.entries=t,this.grid=i.grid??!1,this.cols=Math.max(1,Math.floor(i.cols??xf)),this.pinned=Math.min(Math.max(0,Math.floor(i.pinned??0)),t.length),this.hint=i.hint??"",this.scroll=Vb({previousKey:this.pageKey,key:s,current:this.scroll,...i.scroll===void 0?{}:{remembered:i.scroll},entries:t.length-this.pinned,pageSize:this.pageSize}),s!==this.pageKey&&(this.hover=-1,this.hovered.index=-1),this.pageKey=s,this.draw()}get scrollable(){return this.entries.length-this.pinned>this.pageSize}get scrollOffset(){return this.scroll}get rowsPerPage(){return this.pageSize}rowAnchor(e){if(e<this.pinned)return this.anchorOf(lt+58,Xa+e*(Mt+sn)+Mt/2,Mt*.6);const t=e-this.pinned-this.scroll;if(t<0||t>=this.visibleCount)return null;if(!this.grid)return this.anchorOf(lt+58,this.bodyTop+t*(Mt+sn)+Mt/2,Mt*.6);const i=this.cellW,s=t%this.cols,a=Math.floor(t/this.cols);return this.anchorOf(lt+s*(i+pn)+i/2,this.bodyTop+a*(this.cellH+pn)+i/2,i*.62)}anchorOf(e,t,i){const s=this.geometry.parameters.width,a=this.geometry.parameters.height;return{x:(e/Rt-.5)*s,y:(.5-t/fi)*a,size:i/fi*a}}scrollTo(e){const t=Tp.clamp(Math.round(e),0,this.maxScroll);return t===this.scroll?!1:(this.scroll=t,this.hover=-1,this.hovered.index=-1,this.draw(),!0)}scrollBy(e){return this.scrollable?this.scrollTo(this.scroll+e*(this.grid?this.cols:1)):!1}setStatus(e){this.status!==e&&(this.status=e,this.draw())}hovered={index:-1,hand:null,v:0};asPointerTarget(){return{object:this,onHover:e=>{this.hovered.hand=e.hand,e.uv&&(this.hovered.v=e.uv.y),this.setHover(e.uv?this.indexAt(e.uv):-1)},onBlur:()=>{this.hovered.hand=null,this.setHover(-1)},onSelect:e=>this.handleSelect(e)}}refresh(){this.draw()}update(e){this.flash>0&&(this.flash=Math.max(0,this.flash-e),this.draw())}dispose(){this.geometry.dispose(),this.material.dispose(),this.texture.dispose()}handleSelect(e){const t=e.uv?this.indexAt(e.uv):-1;t<0||(this.flash=.18,this.setHover(t),this.onSelect?.(t,e.hand))}setHover(e){this.hovered.index=e,this.hover!==e&&(this.hover=e,this.draw())}get cellW(){return Wb(this.cols)}get cellH(){return this.cellW+Gb}get bodyTop(){return Xa+this.pinned*(Mt+sn)}get pageSize(){const e=fi-this.bodyTop-Xl;return this.grid?Math.max(this.cols,Math.floor(e/(this.cellH+pn))*this.cols):Math.max(1,Math.floor(e/(Mt+sn)))}get maxScroll(){return Math.max(0,this.entries.length-this.pinned-this.pageSize)}get visibleCount(){return Math.min(this.entries.length-this.pinned-this.scroll,this.pageSize)}indexAt(e){const t=e.x*Rt;let i=(1-e.y)*fi-Xa;if(i<0||t<lt||t>Rt-lt)return-1;if(this.pinned>0){const a=Math.floor(i/(Mt+sn));if(a<this.pinned)return i%(Mt+sn)>Mt?-1:a;i-=this.pinned*(Mt+sn)}if(this.grid){const a=this.cellW,r=this.cellH,o=Math.floor((t-lt)/(a+pn)),l=Math.floor(i/(r+pn));if(o<0||o>=this.cols||l<0||(t-lt)%(a+pn)>a||i%(r+pn)>r)return-1;const c=l*this.cols+o;return c<this.visibleCount?this.pinned+this.scroll+c:-1}const s=Math.floor(i/(Mt+sn));return s<0||s>=this.visibleCount||i%(Mt+sn)>Mt?-1:this.pinned+this.scroll+s}cardHeight(){const e=this.visibleCount,t=this.grid?Math.ceil(e/this.cols)*(this.cellH+pn):e*(Mt+sn);return Math.min(fi,this.bodyTop+t+Xl)}draw(){const e=this.ctx,t=this.cardHeight();e.clearRect(0,0,Rt,fi),e.beginPath(),e.roundRect(0,0,Rt,t,40),e.fillStyle="rgba(9, 14, 26, 0.93)",e.fill(),e.lineWidth=3,e.strokeStyle="rgba(140, 180, 255, 0.35)",e.stroke(),e.textAlign="left",e.textBaseline="alphabetic",e.fillStyle="#8ea0c4",e.font="600 26px system-ui, sans-serif",e.fillText("BAUMGARTNER VR",lt,62),e.fillStyle="#ffffff",e.font="700 46px system-ui, sans-serif",e.fillText(this.title,lt,118);for(let s=0;s<this.pinned;s++)this.drawRow(this.entries[s],Xa+s*(Mt+sn),s===this.hover);for(let s=0;s<this.visibleCount;s++){const a=this.pinned+this.scroll+s,r=this.entries[a];if(this.grid){const o=s%this.cols,l=Math.floor(s/this.cols);this.drawCell(r,lt+o*(this.cellW+pn),this.bodyTop+l*(this.cellH+pn),a===this.hover)}else this.drawRow(r,this.bodyTop+s*(Mt+sn),a===this.hover)}this.drawScrollbar(t);const i=this.status||(this.scrollable?"Stick oder Trigger halten und wischen blättert":"")||this.hint||this.footer;i&&(e.fillStyle=this.status?"#9fd0ff":"#71809e",e.font="400 24px system-ui, sans-serif",e.fillText(qa(e,i,Rt-lt*2),lt,t-34)),this.texture.needsUpdate=!0}drawScrollbar(e){if(!this.scrollable)return;const t=this.ctx,i=this.bodyTop-6,s=e-Xl-i,a=Rt-24,r=this.entries.length-this.pinned,o=this.pageSize/r,l=Math.max(40,s*o),c=(s-l)*(this.scroll/Math.max(1,r-this.pageSize));t.beginPath(),t.roundRect(a,i,9,s,5),t.fillStyle="rgba(255,255,255,0.1)",t.fill(),t.beginPath(),t.roundRect(a,i+c,9,l,5),t.fillStyle="rgba(174, 208, 255, 0.9)",t.fill()}drawRow(e,t,i){const s=this.ctx,a=Mf(e.accent??4892927),r=i&&this.flash>0;s.beginPath(),s.roundRect(lt,t,Rt-lt*2-(this.scrollable?18:0),Mt,24),s.fillStyle=r?lr(a,.45):i?lr(a,.22):"rgba(255, 255, 255, 0.06)",s.fill(),s.lineWidth=i?3:2,s.strokeStyle=i?a:"rgba(255,255,255,0.12)",s.stroke();let o=lt+30;e.preview?o=lt+100:e.icon?(_f(s,e.icon,lt+58,t+Mt/2,52,a),o=lt+100):(s.beginPath(),s.roundRect(lt+18,t+22,8,Mt-44,4),s.fillStyle=a,s.fill(),o=lt+46);const l=Rt-lt-(e.children?60:e.checked!==void 0?110:30);if(s.fillStyle="#ffffff",s.font="600 36px system-ui, sans-serif",s.fillText(qa(s,e.label,l-o),o,t+(e.sub?52:74)),e.sub&&(s.fillStyle="#93a3c4",s.font="400 25px system-ui, sans-serif",s.fillText(qa(s,e.sub,l-o),o,t+90)),e.checked!==void 0){const d=Rt-lt-24-74,u=t+Mt/2-38/2;s.beginPath(),s.roundRect(d,u,74,38,38/2),s.fillStyle=e.checked?a:"rgba(255,255,255,0.14)",s.fill(),s.beginPath(),s.arc(d+(e.checked?74-38/2:38/2),u+38/2,38/2-5,0,Math.PI*2),s.fillStyle="#ffffff",s.fill()}else e.children?(s.strokeStyle=a,s.lineWidth=5,s.lineCap="round",s.beginPath(),s.moveTo(Rt-lt-46,t+Mt/2-14),s.lineTo(Rt-lt-32,t+Mt/2),s.lineTo(Rt-lt-46,t+Mt/2+14),s.stroke()):e.selected&&(s.beginPath(),s.arc(Rt-lt-34,t+Mt/2,9,0,Math.PI*2),s.fillStyle=a,s.fill());if(e.badge){s.font="600 20px system-ui, sans-serif";const c=s.measureText(e.badge).width+26;s.beginPath(),s.roundRect(Rt-lt-70-c,t+18,c,34,17),s.fillStyle=lr(a,.25),s.fill(),s.fillStyle=a,s.fillText(e.badge,Rt-lt-70-c+13,t+42)}}drawCell(e,t,i,s){const a=this.ctx,r=this.cellW,o=this.cellH,l=Mf(e.accent??4892927),c=s&&this.flash>0;a.beginPath(),a.roundRect(t,i,r,o,22),a.fillStyle=c?lr(l,.45):s?lr(l,.22):"rgba(255, 255, 255, 0.06)",a.fill(),a.lineWidth=s?3:2,a.strokeStyle=s?l:"rgba(255,255,255,0.12)",a.stroke(),e.icon&&!e.preview&&_f(a,e.icon,t+r/2,i+r/2,r*.52,l),e.selected&&(a.beginPath(),a.arc(t+r-18,i+18,7,0,Math.PI*2),a.fillStyle=l,a.fill()),a.textAlign="center",a.fillStyle="#ffffff",a.font="600 24px system-ui, sans-serif",a.fillText(qa(a,e.label,r-20),t+r/2,i+o-16),a.textAlign="left"}}function Mf(n){return`#${n.toString(16).padStart(6,"0")}`}function lr(n,e){const t=parseInt(n.slice(1),16);return`rgba(${t>>16&255}, ${t>>8&255}, ${t&255}, ${e})`}function qa(n,e,t){if(n.measureText(e).width<=t)return e;let i=e;for(;i.length>1&&n.measureText(`${i}…`).width>t;)i=i.slice(0,-1);return`${i}…`}const Xb=["round","flat","marker","spray"],kA={round:"Rund",flat:"Flach",marker:"Filzstift",spray:"Sprühdose"},zA={round:"Weiche Spitze, voller Ton",flat:"Breit quer, schmal längs",marker:"Harte Kante, deckt sofort",spray:"Streut, wird beim Bleiben dichter"},Io={kind:"round",width:20,color:3117055,swatches:[]},Gr=1,eu=80,bm=6;function ia(n){const e=typeof n=="number"?n:Number(n);return Number.isFinite(e)?Math.round(Math.min(eu,Math.max(Gr,e))):Io.width}function sa(n){const e=typeof n=="number"?n:Number(n);return Number.isFinite(e)?Math.round(Math.min(16777215,Math.max(0,e))):Io.color}function qb(n){if(!Array.isArray(n))return[];const e=[];for(const t of n){if(typeof t!="number"||!Number.isFinite(t))continue;const i=sa(t);if(e.includes(i)||e.push(i),e.length>=bm)break}return e}function Tm(n){const e={...Io,...n};return{kind:Xb.includes(e.kind)?e.kind:Io.kind,width:ia(e.width),color:sa(e.color),swatches:qb(e.swatches)}}function HA(n){return(ia(n)-Gr)/(eu-Gr)}function VA(n){const e=Math.min(1,Math.max(0,Number.isFinite(n)?n:0));return ia(Gr+e*(eu-Gr))}function GA(n){return`${ia(n)} mm`}function WA(n){switch(n){case"flat":return"chisel";case"spray":return"spray";default:return"round"}}function XA(n){return n==="spray"?.16:1}function qA(n){return Math.max(4,Math.round(ia(n)*.9))}const YA=1/3;function $A(n,e){const t=Math.max(1e-6,e/3);return Math.max(1,Math.ceil(n/t))}const KA=["r","g","b"],JA={r:"Rot",g:"Grün",b:"Blau"};function Yb(n){const e=sa(n);return{r:e>>16&255,g:e>>8&255,b:e&255}}function $b(n){const e=t=>Math.round(Math.min(255,Math.max(0,Number.isFinite(t)?t:0)));return e(n.r)<<16|e(n.g)<<8|e(n.b)}function ZA(n,e,t){const i=Math.min(1,Math.max(0,Number.isFinite(t)?t:0));return $b({...Yb(n),[e]:Math.round(i*255)})}function QA(n,e){const t=sa(e);return[t,...n.filter(i=>i!==t)].slice(0,bm)}function jA(n,e){const t=sa(e);return n.filter(i=>i!==t)}const oh=[{id:"idle",label:"Stehen",icon:"npc",accent:10148351,sub:"Bleibt stehen und schaut dir nach",tuning:{speed:0,turn:90,sense:8,reach:0,cooldown:0,punch:0}},{id:"wander",label:"Schlendern",icon:"teleport",accent:16762967,sub:"Läuft einen Kurs, bis ihm ein anderer einfällt",tuning:{speed:.7,turn:100,sense:0,reach:0,cooldown:0,punch:0}},{id:"chase",label:"Verfolgen",icon:"zombie",accent:16739179,sub:"Kommt auf dich zu und schlägt in Reichweite zu",tuning:{speed:1.5,turn:130,sense:22,reach:1.15,cooldown:1.1,punch:3.4}},{id:"errand",label:"Zum Ziel",icon:"teleport",accent:9363562,sub:"Geht zu seinem Ziel und beachtet dich nicht — ohne Ziel bleibt er stehen",tuning:{speed:1.2,turn:120,sense:0,reach:0,cooldown:0,punch:0}}],Kb=oh.map(n=>n.id);function tu(n){return oh.find(e=>e.id===n)??oh[0]}function e2(n){return tu(n).label}const lh=[{id:"zombie",label:"Zombie",icon:"zombie",accent:8372058,sub:"Läuft auf dich zu und schlägt zu",height:1.78,radius:.29,mass:70,health:100,speed:1.5,brain:"chase",profile:"zombie",palette:{skin:8364130,cloth:4016698,eye:16769902},arms:"out"},{id:"dummy",label:"Übungspuppe",icon:"npc",accent:14266993,sub:"Sackleinen und Holz — steht, bis ein Hirn sie schickt",height:1.7,radius:.28,mass:45,health:160,speed:1.1,brain:"idle",profile:"human",palette:{skin:14266993,cloth:9071423,eye:2763306},arms:"down"},{id:"hamster",label:"Hamster",icon:"marble",accent:14721610,sub:"Klein und leicht — eine Dachkante überlebt er nicht",height:.6,radius:.22,mass:4,health:20,speed:1.8,brain:"chase",profile:"critter",palette:{skin:13208383,cloth:8015650,eye:1710618},arms:"down"}],Jb=lh.map(n=>n.id);function Em(n){return lh.find(e=>e.id===n)??lh[0]}const yf={interval:6,max:3,range:24,radius:1.6};function t2(n,e,t,i,s){return i>e.range||s>=e.max||(n.timer-=t,n.timer>0)?!1:(n.timer=e.interval,!0)}function n2(){return{timer:0}}function i2(n,e,t){const i=t*Math.PI*2;return{x:n.x+Math.cos(i)*e,z:n.z+Math.sin(i)*e}}function s2(n,e,t,i){if(n.length===0)return-1;if(!e)return Math.min(n.length-1,Math.floor(i*n.length));const s=[];let a=0,r=-1;for(let o=0;o<n.length;o++){const l=n[o],c=Math.hypot(l.x-e.x,l.z-e.z);c>=t&&s.push(o),c>r&&(r=c,a=o)}return s.length===0?a:s[Math.min(s.length-1,Math.floor(i*s.length))]}function $o(n,e){return n.find(t=>t>e+1e-9)??n[0]}const Sr={kind:"zombie",brain:"chase",mode:"npc",speed:tu("chase").tuning.speed,health:Em("zombie").health,interval:yf.interval,max:yf.max},wm=[{id:"npc",label:"NPC",sub:"Trigger setzt einen dorthin, wo du hinzeigst"},{id:"point",label:"Spawnpunkt",sub:"Eine Stelle, an der später welche auftauchen"},{id:"cage",label:"Brutkäfig",sub:"Legt von selbst nach — auf den Spawnpunkten, solange du in der Nähe bist"},{id:"clear",label:"Entfernen",sub:"Trigger nimmt weg, worauf du zeigst"}],Zb=wm.map(n=>n.id);function r2(n){return wm.find(e=>e.id===n)?.label??n}const Qb=[{key:"speed",label:"Tempo",unit:"m/s",min:0,max:8,decimals:1,sub:"Wie schnell er läuft — 0 heißt: gar nicht",steps:[0,.7,1.1,1.5,2.2,3.2,4.5]},{key:"health",label:"Leben",unit:"",min:1,max:2e3,decimals:0,sub:"Was er einsteckt, bevor er umfällt",steps:[40,100,160,260,500]},{key:"interval",label:"Käfig-Takt",unit:"s",min:.5,max:120,decimals:1,sub:"Sekunden zwischen zwei Kindern eines Käfigs",steps:[2,4,6,10,20]},{key:"max",label:"Käfig-Grenze",unit:"",min:1,max:20,decimals:0,sub:"Wie viele Kinder ein Käfig gleichzeitig hält",steps:[1,2,3,5,8]}];function jb(n,e){if(!Number.isFinite(e))return Sr[n.key];const t=10**n.decimals;return Math.round(Math.min(n.max,Math.max(n.min,e))*t)/t}function a2(n,e){return $o(n.steps,e)}function o2(n,e){const t=e.toFixed(n.decimals);return n.unit?`${t} ${n.unit}`:t}function Ko(n){const e={...Sr,...n};Jb.includes(e.kind)||(e.kind=Sr.kind),Kb.includes(e.brain)||(e.brain=Sr.brain),Zb.includes(e.mode)||(e.mode=Sr.mode);for(const t of Qb)e[t.key]=jb(t,e[t.key]);return e}function l2(n,e){return Ko({...n,kind:e,health:Em(e).health})}function c2(n,e){return Ko({...n,brain:e,speed:tu(e).tuning.speed})}function h2(n,e){const t=n.indexOf(e);return n[(t+1)%n.length]}const Am=5.5,Rm=70,e1=Math.PI/180,t1=.58,n1=1.25,i1=2,s1=.3;function r1(n,e){const t=e*e1;return{speed:n,climb:n*t1,yawRate:t,pitchRate:t*n1,rollRate:t*i1,lean:s1}}const Pm=r1(Am,Rm);function a1(){return{x:0,y:0,z:0,w:1}}function Sf(n,e){const t=e/2,i=Math.sin(t);return{x:n.x*i,y:n.y*i,z:n.z*i,w:Math.cos(t)}}function o1(n){return{x:0,y:Math.sin(n/2),z:0,w:Math.cos(n/2)}}function bf(n,e){return{x:n.w*e.x+n.x*e.w+n.y*e.z-n.z*e.y,y:n.w*e.y-n.x*e.z+n.y*e.w+n.z*e.x,z:n.w*e.z+n.x*e.y-n.y*e.x+n.z*e.w,w:n.w*e.w-n.x*e.x-n.y*e.y-n.z*e.z}}function l1(n){const e=Math.hypot(n.x,n.y,n.z,n.w);return e<1e-9?a1():{x:n.x/e,y:n.y/e,z:n.z/e,w:n.w/e}}function nu(n,e){const t=2*(n.y*e.z-n.z*e.y),i=2*(n.z*e.x-n.x*e.z),s=2*(n.x*e.y-n.y*e.x);return{x:e.x+n.w*t+(n.y*s-n.z*i),y:e.y+n.w*i+(n.z*t-n.x*s),z:e.z+n.w*s+(n.x*i-n.y*t)}}function Cm(n){return nu(n,{x:0,y:0,z:-1})}function c1(n){return nu(n,{x:1,y:0,z:0})}function h1(n){const e=Cm(n);if(e.x*e.x+e.z*e.z<1e-6){const t=nu(n,{x:0,y:1,z:0});return Math.atan2(-t.x,-t.z)}return Math.atan2(-e.x,-e.z)}function u2(n){return o1(h1(n))}function d2(n,e,t,i,s,a=Pm){const r=u1(i),o={x:-r.z,z:r.x};let l={x:r.x*-e.y+o.x*e.x,y:0,z:r.z*-e.y+o.z*e.x};return l=Lm(Im(l),a.speed),l.y=-t.y*a.climb,{heading:n-t.x*a.yawRate*s,wish:l,bank:-e.x*a.lean,nose:e.y*a.lean}}function f2(n,e,t,i,s=Pm){const a=Sf({x:1,y:0,z:0},t.y*s.pitchRate*i),r=Sf({x:0,y:0,z:1},-t.x*s.rollRate*i),o=l1(bf(bf(n,a),r)),l=Cm(o),c=c1(o),h=Lm(Im({x:l.x*-e.y+c.x*e.x,y:l.y*-e.y+c.y*e.x,z:l.z*-e.y+c.z*e.x}),s.speed);return{orientation:o,wish:h}}function u1(n){const e=Math.hypot(n.x,n.z);return e<1e-6?{x:0,y:0,z:-1}:{x:n.x/e,y:0,z:n.z/e}}function Im(n){const e=Math.hypot(n.x,n.y,n.z);return e<=1?n:{x:n.x/e,y:n.y/e,z:n.z/e}}function Lm(n,e){return{x:n.x*e,y:n.y*e,z:n.z*e}}const Lo={profile:"kopter",replace:!1,speed:Am,turn:Rm},d1=[{id:"kopter",label:"Kopter",left:"schieben",right:"drehen, auf/ab"},{id:"racing",label:"Jet",left:"vor/zurück, quer",right:"rollen, nicken"}],f1=["kopter","racing"];function p2(n){return d1.find(e=>e.id===n)?.label??n}const p1=[{key:"speed",label:"Tempo",unit:"m/s",min:.5,max:60,decimals:1,sub:"Wie schnell sie fliegt — Steigen zieht mit",steps:[2,3.5,5.5,9,14,22]},{key:"turn",label:"Drehrate",unit:"°/s",min:10,max:400,decimals:0,sub:"Wie schnell sie dreht — Jet: Rollen und Nicken",steps:[30,45,70,110,160,240]}];function m1(n,e){if(!Number.isFinite(e)||e<=0)return Lo[n.key];const t=10**n.decimals;return Math.round(Math.min(n.max,Math.max(n.min,e))*t)/t}function m2(n,e){return $o(n.steps,e)}function g2(n,e){return`${e.toFixed(n.decimals)} ${n.unit}`}function Jo(n){const e={...Lo,...n};f1.includes(e.profile)||(e.profile=Lo.profile),e.replace=e.replace===!0;for(const t of p1)e[t.key]=m1(t,e[t.key]);return e}const Nn=["hand","kopf","beide","aus"],_2={hand:"Hand",kopf:"Kopf",beide:"Hand + Kopf",aus:"Aus"},No={forward:9,back:5,up:6,down:6,side:5,turn:70,deadzone:6,drive:"hand",lift:"hand",yaw:"beide",strafe:!1},g1=[{key:"forward",label:"Vorwärts",unit:"m/s",min:.5,max:60,decimals:1,sub:"Volle Lehne nach vorn",steps:[4,6,9,14,22,34]},{key:"back",label:"Rückwärts",unit:"m/s",min:.5,max:60,decimals:1,sub:"Volle Lehne nach hinten",steps:[2,3.5,5,8,12,18]},{key:"up",label:"Hoch",unit:"m/s",min:.5,max:60,decimals:1,sub:"Steigen bei voller Lehne",steps:[3,4.5,6,9,14,20]},{key:"down",label:"Runter",unit:"m/s",min:.5,max:60,decimals:1,sub:"Sinken bei voller Lehne",steps:[3,4.5,6,9,14,20]},{key:"side",label:"Seitwärts",unit:"m/s",min:.5,max:60,decimals:1,sub:"Nur wenn die Hand quer schiebt statt zu drehen",steps:[2,3.5,5,8,12,18]},{key:"turn",label:"Drehrate",unit:"°/s",min:5,max:360,decimals:0,sub:"Wie schnell die Kurve herumkommt",steps:[40,55,70,100,140,200]},{key:"deadzone",label:"Totzone",unit:"cm",min:.5,max:25,decimals:1,sub:"So weit darf die Hand wandern, ohne dass etwas passiert",steps:[3,4.5,6,9,13]}],_1=[{key:"drive",label:"Vor/Zurück",sub:"Hand lehnt · Kopf: Blick nach unten schiebt"},{key:"lift",label:"Hoch/Runter",sub:"Hand hebt · Kopf: Blick nach oben steigt"},{key:"yaw",label:"Links/Rechts",sub:"Hand legt an · Kopf zieht die Kurve mit"}];function v1(n,e){if(!Number.isFinite(e)||e<=0)return No[n.key];const t=10**n.decimals;return Math.round(Math.min(n.max,Math.max(n.min,e))*t)/t}function v2(n,e){return $o(n.steps,e)}function x2(n){const e=Nn.indexOf(n);return Nn[(e+1)%Nn.length]}function M2(n,e){return`${e.toFixed(n.decimals)} ${n.unit}`}function iu(n){const e={...No,...n};for(const t of g1)e[t.key]=v1(t,e[t.key]);for(const t of _1)Nn.includes(e[t.key])||(e[t.key]=No[t.key]);return e.strafe=e.strafe===!0,e}const ao=["time","step","load"],y2={time:"Zeit",step:"Einzelbild",load:"Schnellladen"},S2={time:"Trigger schaltet den Zeitfaktor an und aus",step:"Zeit steht · Trigger rechnet Bilder weiter",load:"Trigger holt die gespeicherte Aufstellung zurück"},Do={action:"time",factor:.22,frames:1},Tf=[0,.05,.22,.5,2,4],Ef=[1,2,5,10,30,60],x1=0,M1=4,y1=1,S1=240;function b1(n){const e=typeof n=="number"?n:Number(n);return Number.isFinite(e)?Math.round(Math.min(M1,Math.max(x1,e))*100)/100:Do.factor}function T1(n){const e=typeof n=="number"?n:Number(n);return Number.isFinite(e)?Math.round(Math.min(S1,Math.max(y1,e))):Do.frames}function Nm(n){const e={...Do,...n};return{action:ao.includes(e.action)?e.action:Do.action,factor:b1(e.factor),frames:T1(e.frames)}}function b2(n){const e=ao.indexOf(n);return ao[(e+1)%ao.length]}function T2(n){return Tf.find(e=>e>n+1e-9)??Tf[0]}function E2(n){return Ef.find(e=>e>n+1e-9)??Ef[0]}function w2(n){if(n<=0)return"angehalten";if(Math.abs(n-1)<1e-9)return"normal";const e=`${n}×`;return n<1?`${e} Zeitlupe`:`${e} Zeitraffer`}function A2(n){return n===1?"1 Bild":`${n} Bilder`}const Uo=["reddot","irons","trace","xray","scope"],oo={mass:.06,damage:25,speed:26,rate:5,magazine:12,reload:1.15,burst:3,mode:"single",ammo:"normal",zoom:16,sights:[]},Dm=[{label:"leicht",mass:.03},{label:"normal",mass:.06},{label:"stark",mass:.14},{label:"brutal",mass:.3}],R2=[10,25,50,100,200],P2=[14,26,45,70,120],C2=[2,5,9,14,20],I2=[6,12,17,30,60,100],L2=[.4,.8,1.15,2],N2=[2,3,5],D2=[16,20,24,28,32,36],su=["single","burst","auto"],U2={single:"Einzelfeuer",burst:"Dreifachschuss",auto:"Automatik"},F2={normal:"Normal",tracer:"Leuchtspur"},ru=["normal","tracer"],E1=[{id:"none",label:"Alles ab",caption:"Nimmt jede Zielhilfe von der Waffe"},{id:"reddot",label:"Rotpunkt",caption:"Roter Punkt, schwebt über der Waffe"},{id:"irons",label:"Kimme & Korn",caption:"Kimme hinten, Korn vorn — klassisch"},{id:"trace",label:"Flugbahn",caption:"Zeigt die Bahn der Kugel voraus"},{id:"xray",label:"Röntgen",caption:"Röntgengerät auf der Waffe: sieht durch Wände"},{id:"scope",label:"Fernrohr",caption:"Zielfernrohr mit echtem Zoom — Stufe unter „Zoom“"}],w1=[{key:"mass",label:"Stärke",unit:"kg",min:.001,max:5,decimals:3,sub:"Masse der Kugel — wie hart sie zuschlägt"},{key:"damage",label:"Schaden",unit:"",min:1,max:1e3,decimals:0,sub:"Was ein Rumpftreffer abzieht — der Kopf das Vierfache"},{key:"speed",label:"Tempo",unit:"m/s",min:1,max:400,decimals:1,sub:"Mündungsgeschwindigkeit"},{key:"rate",label:"Feuerrate",unit:"/s",min:.2,max:40,decimals:1,sub:"Schuss pro Sekunde"},{key:"magazine",label:"Magazin",unit:"Schuss",min:1,max:300,decimals:0,sub:"Rundenanzahl bis zum Nachladen"},{key:"reload",label:"Nachladezeit",unit:"s",min:.05,max:10,decimals:2,sub:"Wie lange das Magazin braucht"},{key:"burst",label:"Salve",unit:"Schuss",min:1,max:20,decimals:0,sub:"Wie viele der Dreifachschuss abgibt"},{key:"zoom",label:"Zoom",unit:"×",min:1,max:60,decimals:1,sub:"Vergrößerung des Fernrohrs"}];function ra(n){const e={...oo,...n};for(const t of w1)e[t.key]=A1(t,e[t.key]);return su.includes(e.mode)||(e.mode=oo.mode),ru.includes(e.ammo)||(e.ammo=oo.ammo),e.sights=Um(n.sights??(n.sight?[n.sight]:e.sights)),e}function Um(n){return Array.isArray(n)?Uo.filter(e=>n.includes(e)):[]}function O2(n,e){return e==="none"?[]:Um(n.includes(e)?n.filter(t=>t!==e):[...n,e])}function B2(n){return n.length===0?"keine":n.map(e=>E1.find(t=>t.id===e)?.label??e).join(" + ")}function A1(n,e){if(!Number.isFinite(e))return oo[n.key];const t=10**n.decimals;return Math.round(Math.min(n.max,Math.max(n.min,e))*t)/t}function R1(n,e){return $o(n,e)}function k2(n){return`${Number.isInteger(n)?n:n.toFixed(1)}×`}function z2(n){const e=Dm.find(t=>Math.abs(t.mass-n)<1e-9);return e?e.label:`${n} kg`}function H2(n){return R1(Dm.map(e=>e.mass),n)}function V2(n,e){const t=n.indexOf(e);return n[(t+1)%n.length]}const zs="bgvr.attachPoses",Fm="bgvr.weapon",au="bgvr.drone",ou="bgvr.superman",Om="bgvr.stopwatch",Bm="bgvr.brush",km="bgvr.npc",P1=new Set;function ii(n,e){try{const t=globalThis.localStorage?.getItem(n);return t?JSON.parse(t):e}catch{return e}}function Mn(n,e){try{globalThis.localStorage?.setItem(n,JSON.stringify(e))}catch{}for(const t of P1)t()}function zm(n,e){return`${n}:${e}`}function G2(n,e){const t=ii(zs,{})[zm(n,e)];return t?dm(t):null}function W2(n,e,t){const i=ii(zs,{});i[zm(n,e)]=um(t),Mn(zs,i)}function Hm(){return{...ii(zs,{})}}function C1(n){Mn(zs,n)}function I1(){Mn(zs,{})}function L1(){return ra(ii(Fm,{}))}function N1(n){Mn(Fm,ra(n))}function Vm(){return Jo(ii(au,{}))}function D1(n){const e=Jo({...Vm(),...n});return Mn(au,e),e}function U1(){Mn(au,{...Lo})}function Gm(){return iu(ii(ou,{}))}function F1(n){const e=iu({...Gm(),...n});return Mn(ou,e),e}function O1(){Mn(ou,{...No})}function B1(){return Nm(ii(Om,{}))}function X2(n){const e=Nm({...B1(),...n});return Mn(Om,e),e}function k1(){return Tm(ii(Bm,{}))}function q2(n){const e=Tm({...k1(),...n});return Mn(Bm,e),e}function z1(){return Ko(ii(km,{}))}function Y2(n){const e=Ko({...z1(),...n});return Mn(km,e),e}const H1=.78,V1=1,Wr={grab:!1,trigger:!1};function G1(n){const{wrist:e,palmBase:t,palmKnuckle:i}=n;if(!e||!t||!i)return null;const s={x:(t.x+i.x)/2,y:(t.y+i.y)/2,z:(t.z+i.z)/2},a=Rf(e,i);if(!(a>1e-4))return null;const r=o=>o?Rf(o,s)/a:Number.POSITIVE_INFINITY;return{thumb:r(n.thumbTip),index:r(n.indexTip),middle:r(n.middleTip),ring:r(n.ringTip),pinky:r(n.pinkyTip)}}function W1(n,e=Wr){if(!n)return{...Wr};const t=(s,a)=>a?s<V1:s<H1;return{grab:t(n.middle,e.grab)&&t(n.ring,e.grab)&&t(n.pinky,e.grab),trigger:t(n.index,e.trigger)}}const wf=1.32,X1=.52;function q1(n){if(!Number.isFinite(n))return 0;const e=wf-X1;return Math.min(1,Math.max(0,(wf-n)/e))}function Af(n){return n?[n.thumb,n.index,n.middle,n.ring,n.pinky].map(e=>Math.round(q1(e)*100)/100):null}function Rf(n,e){return Math.hypot(n.x-e.x,n.y-e.y,n.z-e.z)}const Wm={pitch:0,yaw:-35,roll:90},Y1=K1(Wm);function $1(n){return n==="left"?Y1:Wm}function K1(n){return{pitch:n.pitch,yaw:35,roll:-90}}class _s{pressed=!1;value=0;justPressed=!1;justReleased=!1;downs=0;ups=0;press(){this.pressed=!0,this.downs++}release(){this.pressed=!1,this.ups++}beginFrame(){this.justPressed=this.downs>0,this.justReleased=this.ups>0,this.downs=0,this.ups=0}reset(){this.pressed=!1,this.value=0,this.justPressed=!1,this.justReleased=!1,this.downs=0,this.ups=0}}function J1(n){return n.grip.visible?n.grip:n.targetRay}function $2(n){if(n.isHand){const e=n.hand.joints.wrist;return e&&e.visible?e:null}return J1(n)}class Z1{constructor(e,t,i,s){this.index=e,this.targetRay=t,this.grip=i,this.hand=s}index;targetRay;grip;hand;handedness=null;connected=!1;isHand=!1;inputSource=null;trigger=new _s;squeeze=new _s;select=new _s;primary=new _s;secondary=new _s;stick=new _s;thumbstick=new te;hold=new At;fingertip=null;fold=null;gesture={...Wr};get tracked(){return this.connected&&(this.isHand?this.hand.visible:this.targetRay.visible)}getRay(e){return this.targetRay.getWorldPosition(e.origin),e.direction.set(0,0,-1).applyQuaternion(this.targetRay.getWorldQuaternion(Pf)).normalize(),e}getFingertip(e){return this.fingertip?this.fingertip.getWorldPosition(e):this.targetRay.visible?(this.targetRay.getWorldPosition(e),e.add(Q1.set(0,0,-.06).applyQuaternion(this.targetRay.getWorldQuaternion(Pf)))):null}pulse(e=.4,t=30){this.inputSource?.gamepad?.hapticActuators?.[0]?.pulse?.(e,t)}reset(){this.connected=!1,this.isHand=!1,this.inputSource=null,this.trigger.reset(),this.squeeze.reset(),this.select.reset(),this.primary.reset(),this.secondary.reset(),this.stick.reset(),this.thumbstick.set(0,0),this.fingertip=null,this.fold=null,this.gesture={...Wr}}}const Pf=new $t,Q1=new C,j1=new vn,ql=Math.PI/180;class K2{controllers=[];constructor(e,t){for(let i=0;i<2;i++){const s=e.xr.getController(i),a=e.xr.getControllerGrip(i),r=e.xr.getHand(i);t.add(s,a,r);const o=new Z1(i,s,a,r);o.hold.name=`hold-${i}`,Cf(o),this.controllers.push(o),s.addEventListener("connected",l=>{const c=l.data;o.inputSource=c,o.connected=!0,o.isHand=!!c.hand,o.handedness=c.handedness==="left"?"left":"right"}),s.addEventListener("disconnected",()=>o.reset()),s.addEventListener("selectstart",()=>{o.select.press(),o.isHand||o.trigger.press()}),s.addEventListener("selectend",()=>{o.select.release(),o.isHand||o.trigger.release()}),s.addEventListener("squeezestart",()=>o.squeeze.press()),s.addEventListener("squeezeend",()=>o.squeeze.release())}}get(e){return this.controllers.find(t=>t.connected&&t.handedness===e)??null}update(){for(const e of this.controllers){e.isHand&&eT(e),Cf(e),e.trigger.beginFrame(),e.squeeze.beginFrame(),e.select.beginFrame(),e.primary.beginFrame(),e.secondary.beginFrame(),e.stick.beginFrame();const t=e.inputSource?.gamepad;if(!t){e.thumbstick.set(0,0);continue}e.trigger.value=t.buttons[0]?.value??0,e.squeeze.value=t.buttons[1]?.value??0,Yl(e.primary,t.buttons[4]),Yl(e.secondary,t.buttons[5]),Yl(e.stick,t.buttons[3]);const i=t.axes,s=i.length>=4?i[2]:i[0]??0,a=i.length>=4?i[3]:i[1]??0;e.thumbstick.set(If(s??0),If(a??0))}}}function Cf(n){const e=!n.isHand&&n.grip.visible?n.grip:n.targetRay;if(n.hold.parent!==e&&e.add(n.hold),!n.isHand||!n.handedness){n.hold.quaternion.identity();return}const t=$1(n.handedness);n.hold.quaternion.setFromEuler(j1.set(t.pitch*ql,t.yaw*ql,t.roll*ql,"XYZ"))}function eT(n){if(!n.hand.visible){n.fold=null,n.gesture.grab&&n.squeeze.release(),n.gesture.trigger&&n.trigger.release(),n.gesture={...Wr};return}n.fold=G1(tT(n.hand));const e=W1(n.fold,n.gesture);e.grab!==n.gesture.grab&&(e.grab?n.squeeze.press():n.squeeze.release()),e.trigger!==n.gesture.trigger&&(e.trigger?n.trigger.press():n.trigger.release()),n.gesture=e}function tT(n){const e=n.joints,t=i=>{const s=e[i];return s&&s.visible?s.position:null};return{wrist:t("wrist"),palmBase:t("middle-finger-metacarpal"),palmKnuckle:t("middle-finger-phalanx-proximal"),thumbTip:t("thumb-tip"),indexTip:t("index-finger-tip"),middleTip:t("middle-finger-tip"),ringTip:t("ring-finger-tip"),pinkyTip:t("pinky-finger-tip")}}function Yl(n,e){const t=e?.pressed??!1;n.justPressed=t&&!n.pressed,n.justReleased=!t&&n.pressed,n.pressed=t,n.value=e?.value??(t?1:0)}function If(n,e=.15){return Math.abs(n)<e?0:(n-Math.sign(n)*e)/(1-e)}const nT=["box","glove"],Xm="glove";function J2(n){return n==="glove"?"Weißer Handschuh":"Boxhand"}function Z2(n){return n==="glove"?"box":"glove"}function qm(n){return nT.includes(n)?n:Xm}const Ym="bgvr.handLook",Xr=new Set;function iT(n){return Xr.add(n),()=>Xr.delete(n)}function $m(){try{return qm(globalThis.localStorage?.getItem(Ym))}catch{return Xm}}function Q2(n){const e=qm(n);try{globalThis.localStorage?.setItem(Ym,e)}catch{}for(const t of Xr)t();return e}const Km="bgvr.trackedGlove";function Lf(){try{return globalThis.localStorage?.getItem(Km)==="on"}catch{return!1}}function j2(n){try{globalThis.localStorage?.setItem(Km,n?"on":"off")}catch{}for(const e of Xr)e();return n}const Jm="bgvr.boneColors";function lo(){try{return globalThis.localStorage?.getItem(Jm)==="on"}catch{return!1}}function eR(n){try{globalThis.localStorage?.setItem(Jm,n?"on":"off")}catch{}for(const e of Xr)e();return n}const Ya=[0,38,140,205,285],Oi=9081766,sT=.72,Nf=.42,rT=.72;function Ir(n,e,t){const i=Ya[(n%Ya.length+Ya.length)%Ya.length],s=Math.max(1,t-1),a=t<=1?.5:Math.min(1,Math.max(0,e/s));return oT(i,sT,Nf+(rT-Nf)*a)}function aT(n){const e=Df.findIndex(i=>n.startsWith(i));if(e<0)return Oi;const t=Uf.indexOf(n.slice(Df[e].length));return t<0?Oi:Ir(e,t,Uf.length)}const Df=["thumb-","index-finger-","middle-finger-","ring-finger-","pinky-finger-"],Uf=["metacarpal","phalanx-proximal","phalanx-intermediate","phalanx-distal","tip"];function oT(n,e,t){const i=(n%360+360)%360/360,s=Math.min(1,Math.max(0,e)),a=Math.min(1,Math.max(0,t));if(s===0){const u=Math.round(a*255);return u<<16|u<<8|u}const r=a<.5?a*(1+s):a+s-a*s,o=2*a-r,l=u=>{let f=u;return f<0&&(f+=1),f>1&&(f-=1),f<1/6?o+(r-o)*6*f:f<1/2?r:f<2/3?o+(r-o)*(2/3-f)*6:o},c=Math.round(l(i+1/3)*255),h=Math.round(l(i)*255),d=Math.round(l(i-1/3)*255);return c<<16|h<<8|d}const An=[{z:.066,w:.043,h:.0235},{z:.052,w:.044,h:.024},{z:.047,w:.034,h:.0175},{z:.036,w:.0315,h:.0155},{z:.02,w:.0335,h:.0155},{z:0,w:.037,h:.016},{z:-.02,w:.0395,h:.0158},{z:-.036,w:.041,h:.0148},{z:-.047,w:.0415,h:.0125},{z:-.054,w:.038,h:.0085},{z:-.0585,w:.03,h:.004}],lT=1777968,cT=.0018,hT=.017,uT=.45,Ff=-.048,dT=.026,$l=8,Of=new Map;function fT(n){const e=n.transparent?n.opacity:1;let t=Of.get(e);return t||(t=new qt({color:lT,roughness:.85,transparent:e<1,opacity:e,depthWrite:e>=1}),Of.set(e,t)),t}const cr=28,vs=14,Bf=.004;class pT{constructor(e){this.colored=e}colored;positions=[];skinIndices=[];skinWeights=[];indices=[];colors=[];tint=new ze(Oi);setColor(e){this.colored&&this.tint.setHex(e)}vertex(e,t,i,s=0,a=0){return this.positions.push(e.x,e.y,e.z),this.skinIndices.push(t,s,0,0),this.skinWeights.push(i,a,0,0),this.colored&&this.colors.push(this.tint.r,this.tint.g,this.tint.b),this.positions.length/3-1}band(e,t,i){for(let s=0;s<i;s++){const a=(s+1)%i;this.indices.push(e+s,t+s,e+a,e+a,t+s,t+a)}}fan(e,t,i,s){for(let a=0;a<i;a++){const r=(a+1)%i;s?this.indices.push(e+a,t,e+r):this.indices.push(e+a,e+r,t)}}geometry(){const e=new mt;return e.setAttribute("position",new Oe(this.positions,3)),e.setAttribute("skinIndex",new Dh(this.skinIndices,4)),e.setAttribute("skinWeight",new Oe(this.skinWeights,4)),this.colored&&e.setAttribute("color",new Oe(this.colors,3)),e.setIndex(this.indices),e.computeVertexNormals(),e}}const Ci=new C;function mT(n,e,t,i={}){const{palmScale:s=1,colors:a=!1}=i,r=[n];for(const m of e)r.push(...m.bones);const o=new pT(a);o.setColor(Oi);const l=Is(An[0],s),c=o.vertex(Ci.set(0,l.y??0,l.z),0,1);let h=-1;for(const m of An){const M=Is(m,s),p=o.positions.length/3;for(let g=0;g<cr;g++){const y=g/cr*Math.PI*2;o.vertex(Ci.set(Math.cos(y)*M.w,(M.y??0)+Math.sin(y)*M.h,M.z),0,1)}h<0?o.fan(p,c,cr,!1):o.band(h,p,cr),h=p}const d=Is(An[An.length-1],s),u=o.vertex(Ci.set(0,d.y??0,d.z-.002*s),0,1);o.fan(h,u,cr,!0);for(let m=0;m<e.length;m++){const M=e[m],p=Math.min(M.bones.length,M.lengths.length);if(p===0)continue;const g=r.indexOf(M.bones[0]),y=M.radius,S=[];let x=0;for(let $=0;$<p;$++)x+=M.lengths[$],$<p-1&&S.push(x);const w=M.bones[0].matrixWorld,T=$=>{for(let se=0;se<S.length;se++){const re=S[se];if($>=re+y)continue;const ue=Math.min(1,Math.max(0,($-(re-y))/(2*y))),Ve=ue*ue*(3-2*ue);return[g+se,1-Ve,g+se+1,Ve]}return[g+p-1,1,0,0]},A=$=>{const[se,re,ue]=T($);return(re>=.5?se:ue)-g},_=($,se)=>{const re=o.positions.length/3,[ue,Ve,ot,nt]=T($);o.setColor(Ir(m,A($),p));for(let K=0;K<vs;K++){const le=K/vs*Math.PI*2;Ci.set(Math.cos(le)*se,Math.sin(le)*se,-$).applyMatrix4(w),o.vertex(Ci,ue,Ve,ot,nt)}return re},E=-y*.9;o.setColor(Ir(m,0,p));const P=o.vertex(Ci.set(0,0,-E).applyMatrix4(w),g,1);let I=_(E,y*.92);o.fan(I,P,vs,!1);for(let $=E+Bf;$<x-y*.4;$+=Bf){const se=1-.18*Math.max(0,$/x);let re=1;for(const Ve of S)re+=.07*Math.exp(-(($-Ve)*($-Ve))/(2*y*y));const ue=_($,y*se*re);o.band(I,ue,vs),I=ue}const N=y*.82,G=x-y*.4;for(let $=1;$<=4;$++){const se=$/5*(Math.PI/2),re=_(G+Math.sin(se)*N,N*Math.cos(se));o.band(I,re,vs),I=re}const[X,O,W,H]=T(x);o.setColor(Ir(m,A(x),p));const Q=o.vertex(Ci.set(0,0,-(G+N)).applyMatrix4(w),X,O,W,H);o.fan(I,Q,vs,!0)}const f=new s_(o.geometry(),t);f.name="glove";for(const m of _T(t,s))f.add(m);return f.bind(new Oh(r),new qe),f}function Is(n,e){return e===1?n:{z:n.z*e,w:n.w*e,h:n.h*e,y:(n.y??0)*e}}function gT(n,e=1){const t=n/e,i=An[0];if(t>=i.z)return Is(i,e);for(let s=1;s<An.length;s++){const a=An[s];if(t<a.z)continue;const r=An[s-1],o=(r.z-t)/(r.z-a.z);return Is({z:t,w:r.w+(a.w-r.w)*o,h:r.h+(a.h-r.h)*o,y:(r.y??0)+((a.y??0)-(r.y??0))*o},e)}return Is(An[An.length-1],e)}function _T(n,e=1){const t=[],i=cT*e;for(const s of[-1,0,1]){const a=[];for(let l=0;l<=$l;l++){const c=l/$l,h=(Ff+(dT-Ff)*c)*e,d=s*hT*e*(1-uT*c),u=gT(h,e),f=Math.min(1,Math.abs(d)/u.w),m=(u.y??0)+u.h*Math.sqrt(Math.max(0,1-f*f));a.push(new C(d,m+i*.6,h))}const r=new Hh(a),o=new he(new Wo(r,$l*3,i,6,!1),fT(n));o.name="glove-seam",t.push(o)}return t}const co=.035,vT=-.048,xT=co-vT,MT=.6,yT=1.7;function ST(n,e){const{wrist:t,middleKnuckle:i,indexKnuckle:s,pinkyKnuckle:a}=e;if(!t||!i||!s||!a)return null;const r=Kl(i,t),o=Jl(r);if(!(o>1e-4))return null;const l=hr(r,1/o),c=Kl(s,a);if(!(Jl(c)>1e-4))return null;const h=n==="right"?hr(c,-1):c,d=hr(l,-1),u=Kl(h,hr(d,TT(h,d))),f=Jl(u);if(!(f>1e-4))return null;const m=hr(u,1/f),M=ET(d,m),p=wT(o/xT,MT,yT);return{position:{x:t.x+l.x*co*p,y:t.y+l.y*co*p,z:t.z+l.z*co*p},rotation:bT(m,M,d),scale:p}}function bT(n,e,t){const i=n.x+e.y+t.z;if(i>0){const a=Math.sqrt(i+1)*2;return{x:(e.z-t.y)/a,y:(t.x-n.z)/a,z:(n.y-e.x)/a,w:a/4}}if(n.x>e.y&&n.x>t.z){const a=Math.sqrt(1+n.x-e.y-t.z)*2;return{x:a/4,y:(e.x+n.y)/a,z:(t.x+n.z)/a,w:(e.z-t.y)/a}}if(e.y>t.z){const a=Math.sqrt(1+e.y-n.x-t.z)*2;return{x:(e.x+n.y)/a,y:a/4,z:(t.y+e.z)/a,w:(t.x-n.z)/a}}const s=Math.sqrt(1+t.z-n.x-e.y)*2;return{x:(t.x+n.z)/s,y:(t.y+e.z)/s,z:s/4,w:(n.y-e.x)/s}}function Kl(n,e){return{x:n.x-e.x,y:n.y-e.y,z:n.z-e.z}}function hr(n,e){return{x:n.x*e,y:n.y*e,z:n.z*e}}function TT(n,e){return n.x*e.x+n.y*e.y+n.z*e.z}function ET(n,e){return{x:n.y*e.z-n.z*e.y,y:n.z*e.x-n.x*e.z,z:n.x*e.y-n.y*e.x}}function Jl(n){return Math.hypot(n.x,n.y,n.z)}function wT(n,e,t){return Number.isFinite(n)?Math.min(t,Math.max(e,n)):1}const $a=Math.PI/180,AT=3;function RT(n,e,t){if(e.length===0)return null;const i=[];for(let s=0;s<e.length;s++){const a=CT(n,e[s],t[s]??PT);if(!a)return null;i.push(a)}return{fingers:i,palmScale:n.scale}}const PT={x:0,y:0,z:0,w:1};function CT(n,e,t){const{root:i,mid:s,far:a,tip:r}=e;if(!i||!s||!a||!r)return null;const o=f=>IT(n,f.position),l=[o(i),o(s),o(a),o(r)],c=[],h=[];let d=0;for(let f=0;f<AT;f++){const m=Qm(l[f+1],l[f]),M=FT(m);if(!(M>1e-5))return null;c.push(M);let p=Zm(t,UT(m,1/M));f===0&&(d=Math.atan2(-p.x,-p.z)/$a),p=DT(p,-d*$a);for(let g=0;g<f;g++)p=NT(p,h[g]*$a);h.push(-Math.atan2(p.y,Math.hypot(p.x,p.z))/$a)}const u=Math.max(i.radius,s.radius,a.radius,r.radius);return{root:l[0],lengths:c,radius:Number.isFinite(u)&&u>0?u:.008,bends:h,fan:d}}function IT(n,e){return Zm(n.rotation,Qm(e,n.position))}function Zm(n,e){return LT({x:-n.x,y:-n.y,z:-n.z,w:n.w},e)}function LT(n,e){const t=2*(n.y*e.z-n.z*e.y),i=2*(n.z*e.x-n.x*e.z),s=2*(n.x*e.y-n.y*e.x);return{x:e.x+n.w*t+(n.y*s-n.z*i),y:e.y+n.w*i+(n.z*t-n.x*s),z:e.z+n.w*s+(n.x*i-n.y*t)}}function NT(n,e){const t=Math.cos(e),i=Math.sin(e);return{x:n.x,y:n.y*t-n.z*i,z:n.y*i+n.z*t}}function DT(n,e){const t=Math.cos(e),i=Math.sin(e);return{x:n.x*t+n.z*i,y:n.y,z:-n.x*i+n.z*t}}function Qm(n,e){return{x:n.x-e.x,y:n.y-e.y,z:n.z-e.z}}function UT(n,e){return{x:n.x*e,y:n.y*e,z:n.z*e}}function FT(n){return Math.hypot(n.x,n.y,n.z)}const OT={open:[.1,.08,.08,.1,.12],ready:[.35,.4,.45,.5,.55],point:[.15,0,1,1,1],thumbsUp:[0,1,1,1,1],grip:[.55,.35,.85,.9,.9]},ho=[{name:"index",x:-.028,lengths:[.036,.03],z:-.046},{name:"middle",x:-.009,lengths:[.04,.032],z:-.048},{name:"ring",x:.01,lengths:[.036,.029],z:-.046},{name:"pinky",x:.028,lengths:[.03,.024],z:-.042}],BT=new vn,xs=Math.PI/180;function br(){return $m()==="glove"?"glove":"bones"}const Tr=16054010,kT=10478591;function tR(){return $m()==="glove"?Tr:kT}const Zl=[-.22,.75,.6];function jm(n){const e=n==="left"?-1:1,t=new $t().setFromEuler(new vn(Zl[0],e*Zl[1],e*Zl[2],"XYZ")),i=[{x:t.x,y:t.y,z:t.z,w:t.w}];for(let s=0;s<ho.length;s++)i.push({x:0,y:0,z:0,w:1});return i}class ch extends At{constructor(e,t,i="bones"){super(),this.side=e;const s=typeof i=="string"?{look:i}:i,{look:a="bones",measure:r=null,colors:o=!1}=s;this.look=a,this.colored=o,this.name=`hand-${e}`;const l=e==="left"?-1:1,c=r?.palmScale??1;if(o&&a==="glove"){const m=t.clone();m.vertexColors=!0,m.color.setHex(16777215),m.emissive&&m.emissive.setHex(1118481),this.ownMaterial=m,t=m}const h=m=>o?lu(m,t):t;if(a!=="glove"){const m=a==="limbs"?new he(new et(.026*c,12,10),h(Oi)):new he(new Ln(.075*c,.028*c,.09*c),h(Oi));m.position.set(0,0,-.01*c),this.add(m)}if(a==="limbs")for(let m=0;m<ho.length;m++){const M=ho[m],p=r?.fingers[m+1]?.root,g=new he(new et(.011,10,8),h(Oi));p?g.position.set(p.x,p.y,p.z):g.position.set(l*M.x,0,M.z),this.add(g)}const d=jm(e),u=[],f=[{position:new C(l*-.034,-.006,.014),lengths:[.034,.028],radius:.017,cloth:.0175,fan:0},...ho.map(m=>({position:new C(l*m.x,0,m.z),lengths:m.lengths,radius:.013,cloth:.0135,fan:l*m.x/.028}))];for(let m=0;m<f.length;m++){const M=f[m],p=r?.fingers[m],g=new pt;p?g.position.set(p.root.x,p.root.y,p.root.z):g.position.copy(M.position);const y=new $t(d[m].x,d[m].y,d[m].z,d[m].w);g.quaternion.copy(y),this.add(g),this.fingerRoots.push(g),this.rests.push(y),this.fans.push(M.fan);const S=p?.lengths??M.lengths,x=p?.radius??M.radius,w=WT(g,S,x,t,a,o?m:null);this.chains.push(w),u.push({bones:w,lengths:S,radius:p?.radius??M.cloth}),m===1&&(this.indexTip.position.set(0,0,-(S[S.length-1]??0)),w[w.length-1].add(this.indexTip))}if(a==="glove"){const m=new Uh;m.name="hand-root",this.add(m);for(const M of this.fingerRoots)M.quaternion.identity();this.updateMatrixWorld(!0),this.add(mT(m,u,t,{palmScale:c,colors:o}));for(let M=0;M<this.fingerRoots.length;M++)this.fingerRoots[M].quaternion.copy(this.rests[M])}}side;indexTip=new pt;chains=[];curls=[0,0,0,0,0];targets=[0,0,0,0,0];bends=[null,null,null,null,null];bendBuffers=[0,1,2,3,4].map(()=>new Array(Cs).fill(0));fingerRoots=[];rests=[];fans=[];ownMaterial=null;look;colored;setGesture(e){this.setCurls(OT[e])}setPose(e){this.position.set(e.x/100,e.y/100,e.z/100),this.quaternion.setFromEuler(BT.set(e.pitch*xs,e.yaw*xs,e.roll*xs,"XYZ")),this.setFingers(e)}setFingers(e){const t=e.joints?.length===Hr?e.joints:null;for(let i=0;i<this.chains.length;i++){if(!t){this.bends[i]=null,this.setFan(i,-this.fans[i]*e.spread*xs);continue}const s=i*Jh,a=this.bendBuffers[i];for(let r=0;r<Cs;r++)a[r]=t[s+r]??0;this.bends[i]=a,this.setFan(i,(t[s+Cs]??0)*xs)}for(let i=0;i<this.targets.length;i++)this.targets[i]=e.curls[i]??0}setCurls(e){for(let t=0;t<this.targets.length;t++)this.targets[t]=e[t]??0,this.bends[t]=null}setCurlOverrides(e){for(let t=0;t<this.targets.length;t++){const i=e[t];i!=null&&(this.targets[t]=i,this.bends[t]=null)}}setFan(e,t){const i=this.fingerRoots[e],s=this.rests[e];!i||!s||i.quaternion.copy(s).multiply(VT.setFromAxisAngle(GT,t))}update(e){const t=Math.min(1,e*14);for(let i=0;i<this.chains.length;i++){this.curls[i]+=(this.targets[i]-this.curls[i])*t;const s=this.chains[i],a=this.bends[i];if(a){for(let l=0;l<s.length;l++){let c=a[l]??0;if(l===s.length-1)for(let h=l+1;h<a.length;h++)c+=a[h];s[l].rotation.x=-c*xs}continue}const r=this.curls[i],o=i===0?HT:zT;for(let l=0;l<s.length;l++)s[l].rotation.x=-r*(o[Math.min(l,o.length-1)]??1)}}disposeMaterial(){this.ownMaterial?.dispose(),this.ownMaterial=null}}const zT=[1.5,1.4],HT=[1.1,.9],VT=new $t,GT=new C(0,1,0),kf=new Map;function lu(n,e){const t=e.transparent?e.opacity:1,i=`${n}:${t}`;let s=kf.get(i);return s||(s=new qt({color:n,roughness:.45,metalness:.05,emissive:new ze(n).multiplyScalar(.18),transparent:t<1,opacity:t,depthWrite:t>=1}),kf.set(i,s)),s}function WT(n,e,t,i,s="bones",a=null){const r=[];let o=n;for(let l=0;l<e.length;l++){const c=e[l],h=a===null?i:lu(Ir(a,l,e.length),i),d=s==="glove"?new Uh:new pt;if(o.add(d),s!=="glove")if(s==="limbs"){const f=new he(new et(t*.85,10,8),h);d.add(f);const m=new he(new et(t*.7,10,8),h);m.position.set(0,0,-c),d.add(m)}else{const f=new he(new Jr(t,Math.max(c-t*2,.005),3,8),h);f.rotation.x=Math.PI/2,f.position.set(0,0,-c/2),d.add(f)}r.push(d);const u=new pt;u.position.set(0,0,-c),d.add(u),o=u}return r}class nR extends At{constructor(e,t,i={}){super(),this.side=e;const{color:s=6217888,look:a=br(),opacity:r=.32}=i;this.look=a,this.name=`ghost-hand-${e}`,this.material=new qt({color:s,transparent:r<1,opacity:r,depthWrite:r>=1,roughness:.5,emissive:new ze(s).multiplyScalar(.35)}),this.hand=new ch(e,this.material,{look:a,colors:lo()}),this.setPose(t),this.hand.update(1),this.add(this.hand)}side;material;hand;look;get indexTip(){return this.hand.indexTip}setPose(e){this.hand.setPose(e),this.hand.position.set(0,0,0),this.hand.quaternion.identity()}setGesture(e){this.hand.setGesture(e)}setCurls(e){this.hand.setCurls(e),this.hand.update(1)}setFingers(e,t,i){this.hand.setFingers({...Vr,curls:[...e],spread:t,...i?{joints:[...i]}:{}}),this.hand.update(1)}update(e){this.hand.update(e)}dispose(){this.traverse(e=>{const t=e;t.isMesh&&t.geometry.dispose()}),this.hand.disposeMaterial(),this.material.dispose(),this.removeFromParent()}}class iR extends At{constructor(e,t=14082807){super(),this.input=e,this.name="hand-visuals",this.baseColor=t,this.material=new qt({color:t,roughness:.4,metalness:.05,emissive:new ze(t).multiplyScalar(.06)});const i=Bb(()=>this.poses.clear()),s=iT(()=>this.rebuild());this.unsubscribe=()=>{i(),s()}}input;jointMeshes=new Map;hands=new Map;gloves=new Map;fitted=new Map;measured=new Map;overrides=new Map;fists=new Set;holding=new Map;poses=new Map;unsubscribe;jointGeometry=new et(1,10,8);material;handMaterials=new Map;glowing=new Set;baseColor;rebuild(){for(const[e,t]of this.hands)this.disposeHand(t),this.hands.delete(e);for(const e of[...this.gloves.keys()])this.dropGlove(e);for(const[e,t]of this.jointMeshes)e.remove(t);this.jointMeshes.clear()}hidden=!1;setGestureOverride(e,t){this.overrides.set(e,t)}setFist(e,t){t?this.fists.add(e):this.fists.delete(e)}setGlow(e,t){if(t===this.glowing.has(e))return;t?this.glowing.add(e):this.glowing.delete(e);const i=this.handMaterial(e);i.emissive.setHex(t?Sb:i.color.getHex()),i.emissive.multiplyScalar(t?.42:.06)}handMaterial(e){let t=this.handMaterials.get(e);return t||(t=this.material.clone(),this.handMaterials.set(e,t)),t}lookOf(e){for(const t of this.input.controllers)if(t.handedness===e)return t.isHand?Lf()?"glove":"limbs":br();return br()}setHeldTool(e,t){this.holding.get(e)!==t&&this.holding.set(e,t)}heldToolOf(e){return this.holding.get(e)??null}poseOf(e){const t=this.holding.get(e)??null,i=`${e}:${t??""}`;let s=this.poses.get(i);return s||(s=t?gf(e,t):ah(e),this.poses.set(i,s)),s}refreshPoses(){this.poses.clear()}editablePose(e,t){return Wi(t?gf(e,t):ah(e))}handObject(e){if(e.isHand)return e.hand.visible?e.hand:null;const t=this.hands.get(e);return t?.visible?t:null}gestureOf(e){if(e.isHand||!e.handedness)return null;const t=this.overrides.get(e.handedness);return t||(e.squeeze.pressed&&e.trigger.pressed?"thumbsUp":e.squeeze.pressed?"point":"open")}update(e){for(const t of this.input.controllers){if(t.isHand){this.updateTrackedHand(e,t),this.hands.get(t)?.removeFromParent();continue}this.dropGlove(t),this.updateControllerHand(e,t)}}trackedGloveOf(e){for(const[t,i]of this.gloves)if(t.handedness===e&&i.visible)return i;return null}drawnHandOf(e){const t=this.trackedGloveOf(e);if(t)return t;for(const[i,s]of this.hands)if(i.handedness===e&&s.visible&&s.parent)return s;return null}trackedCurlsOf(e){for(const t of this.input.controllers)if(t.isHand&&t.handedness===e)return Af(t.fold);return null}trackedBonesOf(e){const t=this.measured.get(e);return t?uf(t.fingers):null}dispose(){this.unsubscribe();for(const[e,t]of this.jointMeshes)e.remove(t);this.jointMeshes.clear();for(const e of this.hands.values())this.disposeHand(e);this.hands.clear();for(const e of this.gloves.values())this.disposeHand(e);this.gloves.clear(),this.fitted.clear(),this.measured.clear(),this.jointGeometry.dispose();for(const e of this.handMaterials.values())e.dispose();this.handMaterials.clear(),this.material.dispose(),this.removeFromParent()}disposeHand(e){e.traverse(t=>{const i=t;i.isMesh&&i.geometry.dispose()}),e.disposeMaterial(),e.removeFromParent()}updateTrackedHand(e,t){const i=this.updateTrackedGlove(e,t),s=lo();for(const[r,o]of Object.entries(t.hand.joints)){if(!o)continue;let l=this.jointMeshes.get(o);if(!l){const c=s?lu(aT(r),this.material):t.handedness?this.handMaterial(t.handedness):this.material;l=new he(this.jointGeometry,c),o.add(l),this.jointMeshes.set(o,l)}l.scale.setScalar(Math.max(o.jointRadius??.008,.004)),l.visible=!this.hidden&&!i}const a=t.hand.joints["index-finger-tip"];t.fingertip=a&&a.visible?a:null}updateTrackedGlove(e,t){const i=t.handedness,s=i&&t.hand.visible?ST(i,XT(t.hand)):null,a=i&&s?RT(s,YT(t.hand),jm(i)):null;if(i&&(a?this.measured.set(i,a):this.measured.delete(i)),!i||!s||!Lf())return this.dropGlove(t),null;let r=this.gloves.get(t);const o=lo();if(r&&a&&(r.side!==i||r.colored!==o||!$T(this.fitted.get(t),a))&&(this.dropGlove(t),r=void 0),!r){if(!a)return null;const l=this.handMaterial(i);l.color.setHex(Tr),this.glowing.has(i)||l.emissive.setHex(Tr).multiplyScalar(.06),r=new ch(i,l,{look:"glove",measure:a,colors:o}),t.hand.add(r),this.gloves.set(t,r),this.fitted.set(t,a)}return r.position.set(s.position.x,s.position.y,s.position.z),r.quaternion.set(s.rotation.x,s.rotation.y,s.rotation.z,s.rotation.w),r.scale.setScalar(1),a&&r.setFingers({...Vr,curls:Af(t.fold)??Vr.curls,joints:uf(a.fingers)}),r.update(e),r.visible=!this.hidden,r.visible?r:null}dropGlove(e){const t=this.gloves.get(e);if(!t)return;this.gloves.delete(e),this.fitted.delete(e),this.disposeHand(t);const i=e.handedness;if(!i)return;const s=this.handMaterial(i);s.color.setHex(br()==="glove"?Tr:this.baseColor),this.glowing.has(i)||s.emissive.setHex(s.color.getHex()).multiplyScalar(.06)}updateControllerHand(e,t){if(!t.handedness)return;let i=this.hands.get(t);const s=br(),a=lo();if(i&&(i.side!==t.handedness||i.look!==s||i.colored!==a)&&(this.disposeHand(i),this.hands.delete(t),i=void 0),!i){const u=this.handMaterial(t.handedness);u.color.setHex(s==="glove"?Tr:this.baseColor),this.glowing.has(t.handedness)||u.emissive.setHex(u.color.getHex()).multiplyScalar(.06),i=new ch(t.handedness,u,{look:s,colors:a}),this.hands.set(t,i)}const r=t.grip.visible?t.grip:t.targetRay;i.parent!==r&&r.add(i),i.visible=t.tracked&&!this.hidden,t.fingertip=i.visible?i.indexTip:null;const o=this.poseOf(t.handedness);i.setPose(o);const l=this.holding.get(t.handedness)??null;l&&i.setCurlOverrides(xm(Ob(l),{grab:t.squeeze.pressed,trigger:t.trigger.pressed}));const c=this.overrides.get(t.handedness)??null,h=this.gestureOf(t),d=h==="open"&&!c||h==="grip"&&!!this.holding.get(t.handedness);h&&!d&&i.setGesture(h),this.fists.has(t.handedness)&&i.setGesture("grip"),i.update(e)}}function XT(n){const e=n.joints,t=i=>{const s=e[i];return s&&s.visible?s.position:null};return{wrist:t("wrist"),middleKnuckle:t("middle-finger-phalanx-proximal"),indexKnuckle:t("index-finger-phalanx-proximal"),pinkyKnuckle:t("pinky-finger-phalanx-proximal")}}const qT=[["thumb-metacarpal","thumb-phalanx-proximal","thumb-phalanx-distal","thumb-tip"],["index-finger-phalanx-proximal","index-finger-phalanx-intermediate","index-finger-phalanx-distal","index-finger-tip"],["middle-finger-phalanx-proximal","middle-finger-phalanx-intermediate","middle-finger-phalanx-distal","middle-finger-tip"],["ring-finger-phalanx-proximal","ring-finger-phalanx-intermediate","ring-finger-phalanx-distal","ring-finger-tip"],["pinky-finger-phalanx-proximal","pinky-finger-phalanx-intermediate","pinky-finger-phalanx-distal","pinky-finger-tip"]];function YT(n){const e=n.joints,t=i=>{const s=e[i];return!s||!s.visible?null:{position:s.position,radius:s.jointRadius??.008}};return qT.map(([i,s,a,r])=>({root:t(i),mid:t(s),far:t(a),tip:t(r)}))}const ur=.0015;function $T(n,e){if(!n||n.fingers.length!==e.fingers.length||Math.abs(n.palmScale-e.palmScale)>.05)return!1;for(let t=0;t<n.fingers.length;t++){const i=n.fingers[t],s=e.fingers[t];if(Math.abs(i.radius-s.radius)>ur||i.lengths.length!==s.lengths.length)return!1;for(let a=0;a<i.lengths.length;a++)if(Math.abs(i.lengths[a]-s.lengths[a])>ur)return!1;if(Math.abs(i.root.x-s.root.x)>ur||Math.abs(i.root.y-s.root.y)>ur||Math.abs(i.root.z-s.root.z)>ur)return!1}return!0}const KT=30*Math.PI/180;function JT(n,e,t,i,s={}){const a=Math.hypot(n,t),r=a<=1e-4,o=r?i:Math.atan2(n,t);if(s.upright)return{yaw:o,pitch:0};const l=s.leanMin??KT,c=r?Math.PI/2:Math.atan2(e,a);return{yaw:o,pitch:-Math.max(c,l)}}function ZT(n,e){QT(n),n.rotation.order="YXZ";const t=a=>{Ms.setFromMatrixColumn(a.matrixWorld,2);const r=n.parent;r?Ms.transformDirection(tE.copy(r.matrixWorld).invert()):Ms.normalize();const{yaw:o,pitch:l}=JT(Ms.x,Ms.y,Ms.z,n.rotation.y,e);n.rotation.set(l,o,0),n.updateMatrixWorld(!0)},i=(a,r,o)=>{t(o)},s=[];n.traverse(a=>{a!==n&&!jT(a)||(a.onBeforeRender=i,s.push(a))}),n.userData[hh]={nodes:s}}function QT(n){const e=n.userData[hh];if(e){for(const t of e.nodes)t.onBeforeRender=eE;delete n.userData[hh]}}function jT(n){const e=n;return e.isMesh===!0||e.isLine===!0||e.isPoints===!0||e.isSprite===!0}const hh="billboard",eE=function(){},Ms=new C,tE=new qe,zf=512,nE=7;class sR extends he{canvas;texture;options;constructor(e){const t=e.height??e.width*.42,i=document.createElement("canvas");i.width=zf,i.height=Math.round(zf*t/e.width);const s=new Go(i);s.colorSpace=zt,s.anisotropy=8,super(new qi(e.width,t),new Kr({map:s,transparent:!0,toneMapped:!1,...e.front?{depthTest:!1,depthWrite:!1}:{}})),e.front&&(this.renderOrder=nE),this.canvas=i,this.texture=s,this.options=e,this.name=`text-plane:${e.title}`,this.geometry.computeBoundingBox(),this.draw(),e.face&&ZT(this,e.face===!0?void 0:e.face)}setText(e,t,i){const s=i??this.options.accent;e===this.options.title&&t===this.options.body&&s===this.options.accent||(this.options={...this.options,title:e,body:t,accent:s},this.draw())}setHighlight(e){this.material.opacity=e?1:.9,this.scale.setScalar(e?1.04:1)}dispose(){this.geometry.dispose(),this.material.dispose(),this.texture.dispose()}draw(){const{title:e,body:t,accent:i=4892927,background:s,align:a="left"}=this.options,r=this.canvas.getContext("2d"),o=this.canvas.width,l=this.canvas.height,c=`#${i.toString(16).padStart(6,"0")}`;r.clearRect(0,0,o,l),r.beginPath(),r.roundRect(4,4,o-8,l-8,26),r.fillStyle=s??"rgba(9, 14, 26, 0.86)",r.fill(),r.lineWidth=3,r.strokeStyle=c,r.stroke();const h=a==="center";r.textAlign=h?"center":"left";const d=h?o/2:40;if(r.fillStyle="#ffffff",r.font=`700 ${Math.round(l*.24)}px system-ui, sans-serif`,r.fillText(e,d,l*(t?.36:.58),o-80),t){const u=l*.5,f=l*.92-u,m=Math.round(l*.13),M=Math.max(11,Math.round(l*.055));r.fillStyle="#9fb0d0";let p=m,g=[];for(;r.font=`400 ${p}px system-ui, sans-serif`,g=iE(r,t,o-80),!(g.length*p*1.3<=f||p<=M);)p-=1;const y=p*1.3,S=Math.max(1,Math.floor(f/y));g.slice(0,S).forEach((x,w)=>{const T=w===S-1&&g.length>S;r.fillText(T?`${x} …`:x,d,u+p+w*y,o-80)})}this.texture.needsUpdate=!0}}function iE(n,e,t){const i=[];for(const s of e.split(`
`)){let a="";for(const r of s.split(" ")){const o=a?`${a} ${r}`:r;n.measureText(o).width>t&&a?(i.push(a),a=r):a=o}i.push(a)}return i}const e0=new C;function sE(n,e,t){const i=e0.copy(e).normalize(),s=i.dot(t),{x:a,y:r,z:o}=i;return n.set(1-2*a*a,-2*a*r,-2*a*o,2*s*a,-2*r*a,1-2*r*r,-2*r*o,2*s*r,-2*o*a,-2*o*r,1-2*o*o,2*s*o,0,0,0,1)}function rE(n,e,t){const i=e0.copy(n).normalize();return i.dot(t)-i.dot(e)}function aE(n){return n?.isScreenSurface===!0}const qr={apron:16513523,button:2369068,trouserLight:15262938,trouserDark:3355964,mouth:8141620};function uo(n,e=.88){return new qt({color:n,roughness:e,metalness:0})}function Ls(n){return new qt({color:n,roughness:.62,metalness:0})}function cu(n){return new qt({color:n,roughness:.8,metalness:0})}function oE(n,e=.5){return new qt({color:n,roughness:e,metalness:.05})}let dr=null;function lE(){if(dr)return dr;const n=64,e=typeof document>"u"?null:document.createElement("canvas");e&&(e.width=n,e.height=n);const t=e?.getContext("2d")??null;if(!e||!t)return dr=new Ut,dr;const i=`#${qr.trouserLight.toString(16).padStart(6,"0")}`,s=`#${qr.trouserDark.toString(16).padStart(6,"0")}`;t.fillStyle=i,t.fillRect(0,0,n,n),t.fillStyle=s;const a=n/2;t.fillRect(0,0,a,a),t.fillRect(a,a,a,a);const r=new Go(e);return r.wrapS=Hi,r.wrapT=Hi,r.magFilter=Ct,r.minFilter=xi,r.colorSpace=zt,dr=r,r}let Ka=null;function cE(){if(Ka)return Ka;const n=lE();return n.repeat.set(9,4),Ka=new qt({color:16777215,map:n,roughness:.9,metalness:0}),Ka}function t0(n,e,t=26){const i=new et(1,t,Math.round(t*.75)),s=i.attributes.position,a=new C;for(let r=0;r<s.count;r++){a.fromBufferAttribute(s,r).normalize();const o=Math.max(Math.abs(a.x),Math.abs(a.y),Math.abs(a.z)),l=(1-e+e/o)*n;s.setXYZ(r,a.x*l,a.y*l,a.z*l)}return i.computeVertexNormals(),i}function n0(n,e){const t=Math.max(Math.abs(n.x),Math.abs(n.y),Math.abs(n.z));return t>0?1-e+e/t:1}const jn=.32,hu=.58,i0=n0(new C(1,0,1).normalize(),hu),hE=.37,uE=.115,Wn=.28,fo=["round","freckles","beard","moustache"],dE={round:"Rund",freckles:"Sommersprossen",beard:"Vollbart",moustache:"Schnauzer"},rR={round:"Schopf über der Stirn, runde Backen — die Auslieferung",freckles:"Helle Haut, Punkte über der Nase",beard:"Dunkler Bart bis unter die Ohren",moustache:"Nur der Balken unter der Nase"},s0={round:15778970,freckles:16243131,beard:11763543,moustache:14461823};function Ql(n){return s0[n]}function fE(n){return fo.includes(n)?n:"round"}function aR(n){const e=fo.indexOf(n);return fo[(e+1)%fo.length]}const po=["white","red","blue","green","striped"],pE={white:"Kochjacke weiß",red:"Kochjacke rot",blue:"Kochjacke blau",green:"Kochjacke grün",striped:"Gestreift"},oR={white:"Wie es sich gehört — die Auslieferung",red:"Rot, mit heller Knopfleiste",blue:"Blau, mit heller Knopfleiste",green:"Grün, mit heller Knopfleiste",striped:"Weiß mit drei blauen Ringen"},uu={white:{jacket:15130575,trim:13486008,stripes:!1},red:{jacket:13190460,trim:16050141,stripes:!1},blue:{jacket:4157365,trim:15199992,stripes:!1},green:{jacket:4169066,trim:15332846,stripes:!1},striped:{jacket:15328214,trim:3103400,stripes:!0}};function mE(n){return uu[n].jacket}function lR(n){return uu[n].trim}function gE(n){return po.includes(n)?n:"white"}function cR(n){const e=po.indexOf(n);return po[(e+1)%po.length]}function Gt(n,e,t,i){const s=new C(n,e,t).normalize();return s.multiplyScalar(i*jn*n0(s,hu))}function Pt(n){return jn*n}const _E={round:7031599,freckles:12870442,beard:3811870,moustache:3024416};function vE(n){const e=new At;e.name=`avatar-head-${n}`;const t=Ls(s0[n]),i=cu(_E[n]),s=new he(t0(jn,hu),t);s.scale.set(1,.97,.93),s.frustumCulled=!1,e.add(s);for(const l of[-1,1]){const c=new he(new et(Pt(.2),12,10),t);c.position.copy(Gt(l,-.1,.14,.94)),c.scale.set(.42,1,.82),e.add(c)}const a=new qt({color:2759186,roughness:.3,metalness:0}),r=new qt({color:16645368,roughness:.2,metalness:0});for(const l of[-1,1]){const c=new he(new et(Pt(.145),14,12),a);c.position.copy(Gt(l*.34,-.12,-.92,.96)),c.scale.set(.88,1.15,.5);const h=new he(new et(Pt(.042),8,6),r);h.position.copy(Gt(l*.3,-.05,-.92,1)),h.scale.set(1,1,.5);const d=new he(new et(Pt(.13),10,8),i);d.position.copy(Gt(l*.36,.14,-.9,.99)),d.scale.set(1.55,.32,.45),d.rotation.z=-l*.2,e.add(c,h,d)}const o=new he(new et(Pt(.27),16,12),t);switch(o.position.copy(Gt(0,-.16,-1,1)),o.scale.set(.95,1,1.35),e.add(o),n){case"round":{const l=Ls(14715514);for(const h of[-1,1]){const d=new he(new et(Pt(.24),12,8),l);d.position.copy(Gt(h*.84,-.38,-.5,.93)),d.scale.set(1,.8,.42),e.add(d)}e.add(jl(Pt(.16)));const c=new he(new et(Pt(.42),14,10),i);c.position.copy(Gt(0,.85,-.5,.86)),c.scale.set(1.15,.6,.9),e.add(c);break}case"freckles":{const l=Ls(11104587),c=[[-.62,-.06],[-.46,-.24],[-.3,.02],[.3,.02],[.46,-.24],[.62,-.06]];for(const[d,u]of c){const f=new he(new et(Pt(.06),8,6),l);f.position.copy(Gt(d,u,-.95,.99)),e.add(f)}e.add(jl(Pt(.18)));for(const d of[-1,1]){const u=new he(new Jr(Pt(.14),Pt(.36),4,10),i);u.position.copy(Gt(d*.95,-.02,.1,.96)),u.position.y-=Pt(.34),e.add(u)}const h=new he(new et(Pt(.55),16,12),i);h.position.copy(Gt(0,.7,-.42,.82)),h.scale.set(1.2,.7,1.05),e.add(h);break}case"beard":{const l=new he(new et(Pt(.82),18,14),i);l.position.copy(Gt(0,-.62,-.42,.62)),l.scale.set(1,.92,.88),e.add(l,...Hf(i));for(const c of[-1,1]){const h=new he(new et(Pt(.28),10,8),i);h.position.copy(Gt(c*.92,.12,-.2,.95)),h.scale.set(.6,1.5,.9),e.add(h)}break}case"moustache":{e.add(jl(Pt(.15)),...Hf(i));const l=new he(new et(Pt(.46),14,10),i);l.position.copy(Gt(0,.82,-.36,.84)),l.scale.set(1.18,.62,1),e.add(l);break}}return e}function jl(n){const e=new Hh([-1,-.5,0,.5,1].map(i=>Gt(i*n*2.6,-.58+i*i*.07,-.86,1)));return new he(new Wo(e,14,n*.16,6,!1),cu(qr.mouth))}function Hf(n){return[-1,1].map(e=>{const t=new he(new et(Pt(.24),12,10),n);return t.position.copy(Gt(e*.3,-.42,-.88,.97)),t.scale.set(1.35,.5,.62),t.rotation.z=e*.26,t})}const _i=[[0,0],[.36,.01],[.6,.026],[.73,.05],[.79,.082],[.8,.13],[.795,.2],[.785,.25],[.775,Wn-.005],[.95,Wn],[.99,Wn+.04],[1,.5],[.99,.64],[.96,.72],[.915,.79],[.85,.855],[.76,.905],[.64,.95],[.53,.978],[.38,.995],[0,1]].map(([n,e])=>[n*hE,e]),Vf=Wn+.08,xE=.9,fr=2,ME=1.25,Ja=.955,Gf=.56;function Ts(n){const e=_i[0];if(n<=e[1])return e[0];for(let t=1;t<_i.length;t++){const[i,s]=_i[t];if(n>s)continue;const[a,r]=_i[t-1],o=s-r,l=o>0?(n-r)/o:0;return a+(i-a)*l}return _i[_i.length-1][0]}function Wf(n,e,t,i,s){const o=[],l=[],c=[];for(let d=0;d<=14;d++){const u=d/14,f=n+(e-n)*u,m=(t+(i-t)*u*u)/2,M=Ts(f)*s;for(let p=0;p<=18;p++){const g=Math.PI-m+m*2*p/18;o.push(Math.sin(g)*M,f,Math.cos(g)*M),l.push(p/18,u)}}for(let d=0;d<14;d++)for(let u=0;u<18;u++){const f=d*19+u,m=f+18+1;c.push(f,f+1,m,f+1,m+1,m)}const h=new mt;return h.setAttribute("position",new Oe(o,3)),h.setAttribute("uv",new Oe(l,2)),h.setIndex(c),h.computeVertexNormals(),h}function yE(n,e){const t=uu[n],i=new At;i.name=`avatar-torso-${n}`;const s=uo(t.jacket),a=uo(t.trim,.82),r=uo(qr.apron),o=_i.filter(([,A])=>A<=Wn-.004).map(([A,_])=>new te(A,_)),l=new he(new Cr(o,32),cE());l.name="avatar-trousers",l.frustumCulled=!1,i.add(l);const c=_i.filter(([,A])=>A>=Wn-.005).map(([A,_])=>new te(A,_)),h=new he(new Cr(c,32),s);h.name="avatar-coat",h.frustumCulled=!1,i.add(h);const d=Ts(Wn+.02),u=new he(new Ro(d*.99,.026,8,30),s);u.rotation.x=Math.PI/2,i.add(u);const f=new he(Wf(Wn+.055,.93,fr,ME,1.014),r);f.name="avatar-placket",f.frustumCulled=!1,i.add(f);const m=oE(qr.button,.45),M=[];for(const A of[-1,1])for(let _=0;_<2;_++){const E=Vf+(xE-Vf)*(_===0?.34:.72)+(A<0?.012:0),P=new he(new et(.03,14,10),m);P.scale.set(1,1,.45);const I=Ts(E)*1.012,N=Math.PI+A*.28;P.position.set(Math.sin(N)*I,0,Math.cos(N)*I),M.push({button:P,fraction:E}),i.add(P)}const p=new he(Wf(Gf-.028,Gf+.028,fr*.92,fr*.92,1.024),e);p.frustumCulled=!1,i.add(p);const g=Ts(Ja)+.01,y=new he(new Ro(g,.032,10,28),e);y.rotation.x=Math.PI/2;const S=new he(new et(.05,14,10),e);S.scale.set(1.15,1,.9),S.position.z=-(g+.02);const x=[-1,1].map(A=>{const _=new he(new Zr(.038,.14,10),e);return _.position.set(A*.042,-.07,-(g+.008)),_.rotation.set(-.35,0,A*.3),_});i.add(y,S,...x);const w=t.stripes?[.58,.74,.88].map(A=>{const _=[A-.028,A,A+.028].map(P=>new te(Ts(P)*1.012,P)),E=new he(new Cr(_,22,Math.PI+fr/2,Math.PI*2-fr),a);return E.frustumCulled=!1,{ring:E}}):[];for(const{ring:A}of w)i.add(A);let T=1;return{group:i,setHeight(A){T=A;for(const _ of[l,h,f,p])_.scale.set(1,A,1);for(const{ring:_}of w)_.scale.set(1,A,1);for(const{button:_,fraction:E}of M)_.position.y=A*E;u.position.y=A*Wn,y.position.y=A*Ja,S.position.y=A*Ja;for(const _ of x)_.position.y=A*Ja-.07},setStride(A,_){const E=Math.abs(Math.sin(A))*.055*_,P=1-E*.5;i.position.y=E*T*.28,i.scale.set(1+(1-P)*.6,P,1+(1-P)*.6),i.rotation.z=Math.sin(A)*.07*_,i.rotation.x=-.1*_}}}function SE(n,e){const t=new At;t.name=n<0?"avatar-hand-left":"avatar-hand-right";const i=uE,s=new he(t0(i,.16,18),e);s.scale.set(.9,.84,1.55),s.position.z=-i*.3,s.frustumCulled=!1,t.add(s);const a=new he(new et(i*.66,12,10),e);a.position.z=i*.72,a.frustumCulled=!1,t.add(a);const r=new he(new et(i*.44,12,10),e);return r.position.set(-n*i*.6,-i*.06,-i*.4),r.scale.set(.6,.6,1.2),r.rotation.y=-n*.45,r.frustumCulled=!1,t.add(r),t}const mo=["none","chef","cap","helmet","hardhat","beanie","tophat","crown"],bE={none:"Ohne",chef:"Kochmütze",cap:"Basecap",helmet:"Helm",hardhat:"Bauhelm",beanie:"Mütze",tophat:"Zylinder",crown:"Krone"},hR={none:"Barhäuptig — so war es immer",chef:"Hoch, weiß, mit Wulst — das Vorbild",cap:"Schirm nach vorn",helmet:"Integralhelm mit Visier — im Gokart auch von innen zu sehen",hardhat:"Gelb, mit Krempe ringsum",beanie:"Strickmütze mit Bommel",tophat:"Hoch, schwarz, mit Band",crown:"Für den, der die Bestzeit hat"};function uR(n){const e=mo.indexOf(n);return mo[(e+1)%mo.length]}function TE(n){return mo.includes(n)?n:"none"}function rn(n,e=.7,t=.05){return new qt({color:n,roughness:e,metalness:t})}function De(n){return jn*n}function Yt(n){return jn*n*i0}function EE(n,e){return{radius:Math.sqrt(Math.max(jn*jn-n*n,1e-4))*i0+e,y:n}}function ec(n,e,t,i=Math.PI/2){const{radius:s,y:a}=EE(n,e),r=new he(new et(s,18,12,0,Math.PI*2,0,i),t);return r.position.y=a,r}function wE(n,e=4157365){if(n==="none")return null;const t=new At;switch(t.name=`headgear-${n}`,n){case"chef":{const i=rn(16184298,.92),s=rn(2369068,.85),a=new At;a.rotation.x=-.2,a.position.z=De(.1),t.add(a);const r=new he(new mn(Yt(.9),Yt(.94),De(.32),26),s);r.position.y=De(.66),a.add(r);const o=new he(new mn(Yt(.95),Yt(.92),De(.42),28),i);o.position.y=De(1.03),a.add(o);const l=5;for(let h=0;h<l;h++){const d=h/l*Math.PI*2+Math.PI/l,u=new he(new et(De(.6),16,12),i);u.position.set(Math.sin(d)*Yt(.62),De(1.68),Math.cos(d)*Yt(.62)),u.scale.set(1.02,1.2,1.02),a.add(u)}const c=new he(new et(De(.76),20,14),i);c.scale.set(1,.9,1),c.position.y=De(1.86),a.add(c);break}case"cap":{const i=rn(e,.8),s=ec(De(.53),De(.08),i);s.scale.set(1,1,1.06);const a=new he(new Ln(De(1.34),De(.085),De(.86)),i);a.position.set(0,De(.58),-De(1.4)),a.rotation.x=.14,t.add(s,a);break}case"helmet":{const i=rn(e,.35,.3),s=new he(new et(De(1.3),22,16),i);s.scale.set(1,1.03,1.04),s.position.y=-De(.075);const a=new he(new et(De(1.32),22,12,-.9,1.8,1.05,.62),new qt({color:1185570,roughness:.12,metalness:.6}));a.scale.copy(s.scale),a.position.y=s.position.y,a.rotation.y=Math.PI;const r=new he(new Ln(De(1.26),De(.34),De(.34)),i);r.position.set(0,-De(.92),-De(1.12)),t.add(s,a,r);break}case"hardhat":{const i=rn(16762967,.55),s=ec(De(.47),De(.16),i),a=new he(new mn(De(1.42),De(1.42),De(.09),26),i);a.position.y=De(.5);const r=new he(new Ln(De(.19),De(.23),De(1.64)),rn(15247663,.55));r.position.y=De(1.34),t.add(s,a,r);break}case"beanie":{const i=rn(12735551,.95),s=ec(De(.47),De(.09),i),a=new he(new mn(Yt(.92),Yt(.92),De(.27),22),rn(11026991,.95));a.position.y=De(.54);const r=new he(new et(De(.22),12,8),rn(15787730,.95));r.position.y=De(1.58),t.add(s,a,r);break}case"tophat":{const i=rn(1316381,.85),s=new he(new mn(De(1.36),De(1.36),De(.1),26),i);s.position.y=De(.62);const a=new he(new mn(Yt(.86),Yt(.89),De(1.32),26),i);a.position.y=De(1.36);const r=new he(new mn(Yt(.9),Yt(.91),De(.23),26),rn(9187132,.8));r.position.y=De(.79),t.add(s,a,r);break}case"crown":{const i=rn(15253834,.3,.75),s=new he(new mn(Yt(.92),Yt(.92),De(.36),22),i);s.position.y=De(.74),t.add(s);for(let a=0;a<6;a++){const r=a/6*Math.PI*2,o=new he(new Zr(De(.17),De(.45),8),i);o.position.set(Math.sin(r)*De(.85),De(1.14),Math.cos(r)*De(.85)),t.add(o)}break}}return t}function dR(){const n=new he(new Vh(.5,2.4,48,1),new Kr({color:724500,side:Pn,depthTest:!1}));return n.name="visor-frame",n.position.z=-.5,n.renderOrder=900,n.scale.setScalar(1),n}const r0="bgvr.look",uh={hat:"none",head:"round",body:"white"};function a0(n){return{hat:TE(n?.hat),head:fE(n?.head),body:gE(n?.body)}}function fR(n){const e=n.hat==="none"?"ohne Hut":bE[n.hat];return`${dE[n.head]} · ${e} · ${pE[n.body]}`}const dh=new Set;function pR(n){return dh.add(n),()=>dh.delete(n)}function AE(){try{const n=globalThis.localStorage?.getItem(r0);return a0(n?JSON.parse(n):{})}catch{return{...uh}}}function mR(n){const e=a0({...AE(),...n});try{globalThis.localStorage?.setItem(r0,JSON.stringify(e))}catch{}for(const t of dh)t();return e}function RE(n){return{half:n.max.x,crown:n.max.y,chin:n.min.y,face:n.min.z,back:n.max.z}}const PE={round:7031599,freckles:12870442,beard:3811870,moustache:3024416},o0=.006;function l0(n,e,t,i){const s=(n.crown+n.chin)/2,a=(n.face+n.back)/2,r=(n.crown-n.chin)/2,o=(n.back-n.face)/2,l=1-(t/e)**2-((i-s)/r)**2;return a-o*Math.sqrt(Math.max(0,l))}function CE(n,e){const t=new At;t.name=`chef-marks-${n}`;const i=new At;i.name="chef-crown",t.add(i);const s=cu(PE[n]),a=e.half*.82;switch(n){case"round":{t.add(...qf(e,a)),i.add(tc(s,0,e.crown*.62,e.face*.42,a*.86,.34,.8)),i.add(IE(s,e,a));break}case"freckles":{const r=Ls(11104587),o=[[-.52,.06],[-.34,-.1],[-.16,.02],[.16,.02],[.34,-.1],[.52,.06]];for(const[l,c]of o){const h=new he(new et(a*.055,8,6),r);h.position.set(a*l,a*c,l0(e,a,a*l,a*c)+o0),h.scale.set(1,1,.45),t.add(h)}t.add(...qf(e,a));for(const l of[-1,1]){const c=new he(new Jr(a*.15,Math.abs(e.chin)*.85,4,10),s);c.position.set(l*a*.78,e.chin*.5,e.back*.4),t.add(c)}i.add(tc(s,0,e.crown*.66,e.face*.3,a*.95,.4,.92));break}case"beard":{const r=new he(new et(1,20,16),s);r.scale.set(a*.98,Math.abs(e.chin)*.62,(e.back-e.face)*.42),r.position.set(0,e.chin*.72,(e.face+e.back)*.3),t.add(r),t.add(...Xf(e,a,s));for(const o of[-1,1]){const l=new he(new et(1,12,10),s);l.scale.set(a*.16,Math.abs(e.chin)*.5,a*.3),l.position.set(o*a*.9,e.chin*.22,e.back*.1),t.add(l)}break}case"moustache":{t.add(...Xf(e,a,s)),i.add(tc(s,0,e.crown*.7,e.face*.36,a*.9,.36,.86));break}}return{group:t,crown:i}}function Xf(n,e,t){return[-1,1].map(i=>{const s=new he(new et(1,12,10),t);return s.scale.set(e*.3,e*.11,e*.14),s.position.set(i*e*.26,n.chin*.46,n.face*.92),s.rotation.z=i*.3,s})}function IE(n,e,t){const i=new he(new Zr(t*.24,t*.62,12),n);return i.position.set(0,e.crown*.92,e.face*.36),i.rotation.x=-.85,i.scale.set(1,1,.72),i}function qf(n,e){const t=Ls(14511970),i=e*.56,s=n.chin*.42;return[-1,1].map(a=>{const r=new he(new et(e*.26,12,8),t);return r.scale.set(1,.78,.3),r.position.set(a*i,s,l0(n,e,i,s)+o0),r})}function tc(n,e,t,i,s,a,r){const o=new he(new et(s,16,12),n);return o.scale.set(1,a,r),o.position.set(e,t,i),o}const gR=1.6,du=.914,LE=1.62,Qt=du/LE,_R={x:.3,y:.46,z:-.45},vR={x:0,y:.62,z:-.72},Yf=.24,xR=["hat","head","body","handLeft","handRight"];function NE(){return typeof document<"u"&&typeof WebGLRenderingContext<"u"}const DE=.09,pr=[{at:0,value:-1,slope:0},{at:.28,value:.9,slope:0},{at:.62,value:.1,slope:-1.6},{at:1,value:-1,slope:0}];function UE(n,e,t){const i=t.at-e.at,s=n*n,a=s*n;return(2*a-3*s+1)*e.value+(a-2*s+n)*i*e.slope+(-2*a+3*s)*t.value+(a-s)*i*t.slope}function FE(n){const e=n-Math.floor(n);for(let t=1;t<pr.length;t++){const i=pr[t];if(e>i.at)continue;const s=pr[t-1],a=i.at-s.at;return UE(a>0?(e-s.at)/a:0,s,i)}return pr[pr.length-1].value}const OE=.03,BE=3;function kE(n){return Math.sin(2*Math.PI*n)}function zE(n,e={height:1,width:1}){const t=Math.min(Math.max(n.stride,0),1),i=n.amount??0,s=n.tempo??1,a=n.idleAmount??0,r=n.idleTempo??1;let o=0;return i>0&&s>0&&t>0&&(o+=DE*i*t*FE(n.phase*s/Math.PI)),a>0&&r>0&&t<1&&(o+=OE*a*(1-t)*kE((n.clock??0)*r/BE)),e.height=Math.max(1+o,.2),e.width=1/Math.sqrt(e.height),e}function mr(n,e){n.traverse(t=>{const i=t;if(i.isMesh){i.geometry.dispose();for(const s of Array.isArray(i.material)?i.material:[i.material])s&&!e?.has(s)&&s.dispose()}})}function nc(n){const e=new ti;return n.traverse(t=>{const i=t;i.isMesh&&(i.geometry.computeBoundingBox(),i.geometry.boundingBox&&e.union(i.geometry.boundingBox))}),e}function HE(n,e,t){let i=0;return n.traverse(s=>{const a=s;if(!a.isMesh)return;const r=a.geometry.getAttribute("position");if(r)for(let o=0;o<r.count;o++)Math.abs(r.getY(o)-e)>t||(i=Math.max(i,Math.abs(r.getX(o))))}),i}const Za=new C,gr=new C,Ii=new C,VE={height:1,width:1},pi={phase:0,stride:0,clock:0,amount:0,tempo:1,idleAmount:0,idleTempo:1},GE=jn*.34,$f=.062,WE=.12,ic=.6;class XE extends At{bodyYaw=0;head;handAnchors;handMeshes=[];modelHands=[];modelFace=null;modelMarks=null;modelCrown=null;marksKind=null;modelHat=null;handsOn=!0;sway=null;idleSide=0;idleLift=0;neckBack=GE;torso;shape=null;face=null;headgear=null;suit;skin;kept;look={...uh};previous=new C;hasPrevious=!1;walkPhase=0;speed=0;headBob=0;bobNow=0;squish=Cu($s());squishSpeed=Iu($s());idleSquish=Lu($s());idleSquishSpeed=Nu($s());idleClock=0;stretchNow=1;stopGraphics;get bob(){return this.bobNow}get stretch(){return this.stretchNow}eyeY=du;model=null;gone=!1;constructor(e={}){super(),this.name="avatar-body",this.suit=uo(e.color??4157365),this.skin=Ls(Ql(uh.head)),this.kept=new Set([this.suit,this.skin]),this.torso=new At,this.torso.name="avatar-torso",this.add(this.torso),this.head=new At,this.head.name="avatar-head",this.add(this.head);const t=[];for(let i=0;i<2;i++){const s=new pt;if(s.name=i===0?"hand-left":"hand-right",s.scale.setScalar(Qt),this.add(s),t.push(s),!e.hands)continue;const a=SE(i===0?-1:1,this.skin);this.add(a),this.handMeshes.push(a)}this.handAnchors=[t[0],t[1]],this.buildFace(this.look.head),this.buildTorso(this.look.body),this.stopGraphics=U0(()=>{const i=$s();this.squish=Cu(i),this.squishSpeed=Iu(i),this.idleSquish=Lu(i),this.idleSquishSpeed=Nu(i)}),NE()&&F0(()=>import("./chefModel-vnLSN61l.js"),__vite__mapDeps([0,1,2,3])).then(async i=>i.chefParts()).then(i=>{!i||this.gone||this.wearModel(i)})}wearModel(e){this.model=e,this.head.add(e.parts.head),this.modelFace=e.parts.head,this.modelHat=e.parts.hat,this.head.add(this.modelHat),this.sway=new At,this.sway.name="avatar-sway",this.sway.add(e.parts.body),this.torso.add(this.sway);for(let s=0;s<2;s++){const a=s===0?e.parts.handLeft:e.parts.handRight;this.add(a),this.modelHands.push(a);const r=this.handMeshes[s];r&&(r.visible=!1),a.visible=r?r.visible||this.handsOn:this.handsOn}this.shape&&(this.shape.group.visible=!1),this.face&&(this.face.visible=!1);const t=nc(e.parts.body),i=nc(e.parts.handLeft);this.idleLift=t.max.y*ic,this.idleSide=HE(e.parts.body,this.idleLift,t.max.y*.06)+(i.max.x-i.min.x)/2+$f*Qt,this.neckBack=0,this.applyModelLook(),this.setHeadgear(this.look.hat,!0),this.head.traverse(s=>s.layers.mask=this.head.layers.mask),this.torso.traverse(s=>s.layers.mask=this.torso.layers.mask);for(const s of this.modelHands)s.traverse(a=>a.layers.mask=this.layers.mask)}applyModelLook(){this.model&&(this.model.jacket.color.setHex(mE(this.look.body)),this.model.skin.color.setHex(Ql(this.look.head)),this.applyModelMarks())}applyModelMarks(){const e=this.modelFace;if(!e||this.marksKind===this.look.head)return;this.marksKind=this.look.head,this.modelMarks&&(this.modelMarks.removeFromParent(),mr(this.modelMarks,this.kept),this.modelMarks=null);const t=CE(this.look.head,RE(nc(e)));e.add(t.group),t.group.traverse(i=>i.layers.mask=this.head.layers.mask),this.modelMarks=t.group,this.modelCrown=t.crown,t.crown.visible=this.look.hat==="none"}setLook(e){e.head!==this.look.head&&this.buildFace(e.head),e.body!==this.look.body&&this.buildTorso(e.body),this.look={...this.look,head:e.head,body:e.body},this.applyModelLook(),this.setHeadgear(e.hat)}setColor(e){this.suit.color.setHex(e),this.suit.emissive.setHex(e).multiplyScalar(.12),this.look.hat!=="none"&&this.setHeadgear(this.look.hat,!0)}setHandsVisible(e){this.handsOn=e;for(const t of this.handMeshes)t.visible=e&&!this.model;for(const t of this.modelHands)t.visible=e}setHeadgear(e,t=!1){if(e===this.look.hat&&!t||(this.look={...this.look,hat:e},this.headgear&&(this.headgear.removeFromParent(),mr(this.headgear,this.kept),this.headgear=null),this.modelHat&&(this.modelHat.visible=e==="chef"),this.modelCrown&&(this.modelCrown.visible=e==="none"),this.model&&e==="chef"))return;const i=wE(e,this.suit.color.getHex());i&&(this.headgear=i,this.head.add(i),i.traverse(s=>s.layers.mask=this.head.layers.mask))}setSelfView(e){const t=!e;this.head.visible=t,this.torso.visible=t}update(e,t,i,s){const a=t.position;t.quaternion?Za.set(0,0,-1).applyQuaternion(t.quaternion):Za.set(0,0,-1);const r=Math.atan2(-Za.x,-Za.z),o=qE(r-this.bodyYaw),l=Tp.degToRad(38);Math.abs(o)>l?this.bodyYaw+=o-Math.sign(o)*l:this.speed>.4&&(this.bodyYaw+=o*Math.min(1,e*4));const c=Math.sin(r),h=Math.cos(r);this.head.position.set(a.x+c*this.neckBack,this.eyeY,a.z+h*this.neckBack),t.quaternion&&this.head.quaternion.copy(t.quaternion);const d=Math.sin(this.bodyYaw),u=Math.cos(this.bodyYaw),f=a.x+d*this.neckBack,m=a.z+u*this.neckBack,M=Math.max(this.eyeY-jn*.86,.3);this.torso.position.set(f,0,m),this.torso.rotation.set(0,this.bodyYaw,0),this.shape?.setHeight(M),this.speed+=(this.travelSpeed(a,e)-this.speed)*Math.min(1,e*8),this.walkPhase+=e*Math.min(this.speed,3)*4.4;const p=Math.min(this.speed/1.6,1),g=p*.075;this.bobNow=-Math.abs(Math.cos(this.walkPhase))*p*this.headBob,this.shape?.setStride(this.walkPhase,p),this.idleClock+=e,pi.phase=this.walkPhase,pi.stride=p,pi.clock=this.idleClock,pi.amount=this.squish,pi.tempo=this.squishSpeed,pi.idleAmount=this.idleSquish,pi.idleTempo=this.idleSquishSpeed;const y=zE(pi,VE);this.stretchNow=y.height,this.torso.scale.set(y.width,y.height,y.width),this.head.scale.set(y.width,y.height,y.width),this.head.position.y=this.eyeY*y.height+this.bobNow,this.sway&&this.shape&&(this.sway.position.copy(this.shape.group.position),this.sway.rotation.copy(this.shape.group.rotation),this.sway.scale.copy(this.shape.group.scale));for(let S=0;S<2;S++){const x=S===0?-1:1,w=S===0?i:s,T=this.handAnchors[S];if(w)gr.set(f+(w.position.x-a.x)*Qt,this.eyeY+(w.position.y-a.y)*Qt,m+(w.position.z-a.z)*Qt);else{const E=this.walkPhase+(S===0?0:Math.PI),P=x*(this.idleSide||Ts(ic)+$f)*y.width,I=(this.idleLift||M*ic)*y.height,N=WE*Qt+Math.sin(E)*g*Qt;gr.set(f+u*P-d*N,I-Math.abs(Math.cos(E))*g*.4*Qt,m-d*P-u*N)}T.visible=w!==null,T.position.copy(gr),w?.quaternion&&T.quaternion.copy(w.quaternion);const A=this.handMeshes[S];A&&(A.position.copy(gr),w?.quaternion?A.quaternion.copy(w.quaternion):A.rotation.set(.72,this.bodyYaw,x*.2));const _=this.modelHands[S];_&&(_.position.copy(gr),w?.quaternion?_.quaternion.copy(w.quaternion):_.rotation.set(0,this.bodyYaw,0))}}dispose(){this.gone=!0,this.stopGraphics(),mr(this);for(const e of this.kept)e.dispose();this.removeFromParent()}buildFace(e){this.face&&(this.face.removeFromParent(),mr(this.face,this.kept)),this.face=vE(e),this.head.add(this.face),this.skin.color.setHex(Ql(e)),this.face.traverse(t=>t.layers.mask=this.head.layers.mask)}buildTorso(e){this.shape&&(this.shape.group.removeFromParent(),mr(this.shape.group,this.kept)),this.shape=yE(e,this.suit),this.torso.add(this.shape.group),this.shape.group.traverse(t=>t.layers.mask=this.torso.layers.mask)}travelSpeed(e,t){if(this.updateMatrixWorld(),Ii.copy(e).applyMatrix4(this.matrixWorld),!this.hasPrevious)return this.previous.set(Ii.x,0,Ii.z),this.hasPrevious=!0,0;const i=Math.hypot(Ii.x-this.previous.x,Ii.z-this.previous.z);return this.previous.set(Ii.x,0,Ii.z),t>0?Math.min(i/t,8):0}}function qE(n){return Math.atan2(Math.sin(n),Math.cos(n))}const fh=3,Qa={position:new C,quaternion:new $t},sc={position:new C},_r={position:new C},ys=new qe,YE=new C;class c0 extends XE{anchor=new qe;frozenHead={position:new C,quaternion:new $t};detached=!1;headFollowsRig=!1;screenHand=null;carry=null;static CARRY_BOB=.018;constructor(e=4157365){super({color:e,hands:!0}),this.name="player-avatar",this.setHandsVisible(!1),this.setLayer(fh)}set showHands(e){this.setHandsVisible(e)}leaveBehind(e){if(this.detached)return;this.detached=!0;const t=this.parent;t?.updateWorldMatrix(!0,!1),this.anchor.copy(t?t.matrixWorld:ys.identity()),ys.copy(this.anchor).invert().multiply(e),this.frozenHead.position.setFromMatrixPosition(ys),this.frozenHead.quaternion.setFromRotationMatrix(ys),this.setLayer(0)}comeBack(){this.detached&&(this.detached=!1,this.position.set(0,0,0),this.quaternion.identity(),this.setLayer(fh))}updateFromRig(e,t,i,s){if(this.detached){t.updateMatrixWorld(!0),ys.copy(t.matrixWorld).invert().multiply(this.anchor),ys.decompose(this.position,this.quaternion,YE),this.updateMatrixWorld(!0),this.update(e,this.frozenHead,null,null);return}Qa.position.setFromMatrixPosition(s),this.headFollowsRig?Qa.quaternion.identity():Qa.quaternion.setFromRotationMatrix(s);let a=Kf(i,"left",sc),r=Kf(i,"right",_r);!r&&this.screenHand&&(_r.position.copy(this.screenHand),r=_r);const o=this.carry;if(this.headBob=o?c0.CARRY_BOB:0,o){const l=t.camera.position.y+(o.y-du)/Qt;a||(sc.position.set((o.x-Yf)/Qt,l,o.z/Qt),a=sc),r||(_r.position.set((o.x+Yf)/Qt,l,o.z/Qt),r=_r)}this.update(e,Qa,a,r)}setLayer(e){this.traverse(t=>t.layers.set(e))}}function Kf(n,e,t){const i=n.controllers.find(a=>a.handedness===e);if(!i?.tracked)return null;const s=i.grip.visible?i.grip:i.targetRay;return t.position.copy(s.position),t}function rc(n){return(n|1<<fh)&-17}const Li=new gi,Ss=new C,mi=new C,Jf=new C,ac=new C,Gn=new at,Zf=new at,ja=new qe,$E=new $t,KE=new te,vr=new te;let ph=0;const Qf=.1,JE=14,ZE=.02,QE=.02,jE=2,ew=768;class MR extends he{constructor(e,t,i=14673906){super(new qi(e,t),new hn({uniforms:{uTexture:{value:null},uResolution:{value:new te(1,1)},uTint:{value:new ze(i)},uActive:{value:0}},vertexShader:`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,fragmentShader:`
          uniform sampler2D uTexture;
          uniform vec2 uResolution;
          uniform vec3 uTint;
          uniform float uActive;
          varying vec2 vUv;

          void main() {
            vec3 color;
            if (uActive > 0.5) {
              // Ein Spiegel schluckt etwas Licht — ein Bild, das genauso hell
              // ist wie der Raum daneben, sieht aus wie ein Loch in der Wand.
              color = texture2D(uTexture, gl_FragCoord.xy / uResolution).rgb * uTint * 0.92;
            } else {
              // Blindes Glas: ein flacher Schein von unten links nach oben
              // rechts, damit die Fläche überhaupt als Fläche zu sehen ist.
              float sheen = clamp(vUv.x * 0.45 + vUv.y * 0.55, 0.0, 1.0);
              color = uTint * (0.035 + sheen * 0.075);
            }
            gl_FragColor = vec4(color, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `})),this.width=e,this.height=t,this.name="mirror-surface",ph+=1,this.material.addEventListener("dispose",this.retire)}width;height;isMirrorSurface=!0;isScreenSurface=!0;reflecting=!0;setView(e){this.material.uniforms.uTexture.value=e,this.material.uniforms.uActive.value=e?1:0}setResolution(e){this.material.uniforms.uResolution.value.copy(e)}getWorldNormal(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}worldSize(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(mi,$E,ac),e.set(this.width*Math.abs(ac.x),this.height*Math.abs(ac.y))}retire=()=>{this.retired||(this.retired=!0,ph-=1)};retired=!1}function tw(n,e,t=[]){return e.length=0,t.length=0,ph<=0||n.traverseVisible(i=>{i.isMirrorSurface&&e.push(i),aE(i)&&t.push(i)}),e}class yR{constructor(e){this.renderer=e;for(const t of[this.mono,this.array])t.matrixAutoUpdate=!1,t.matrixWorldAutoUpdate=!1}renderer;vrResolutionScale=.4;budget=jE;targets=new Map;found=[];screens=[];live=[];mono=new Wt;array=new tm;size=new te;frustum=new Vo;projectionScreen=new qe;render(e,t){const i=tw(e,this.found,this.screens);if(i.length===0){this.trim(i);return}const s=this.renderer,a=s.xr.isPresenting,r=a?s.xr.getCamera():null;this.frameSize(r),(r??t).getWorldPosition(Jf),a||(t.updateWorldMatrix(!0,!1),this.frustum.setFromProjectionMatrix(this.projectionScreen.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse))),this.pick(i,Jf,a?null:this.frustum),a&&this.live.length>0&&e.updateMatrixWorld(!0);for(const h of i)h.setView(null);const o=a?this.vrResolutionScale:Math.min(1,ew/Math.max(1,this.size.x,this.size.y));this.sizeAt(o,vr);for(const h of this.screens)h.setResolution(vr);const l=s.getRenderTarget(),c=s.xr.enabled;s.xr.enabled=!1,s.state.setCullFace(op);for(const h of this.live){const d=this.target(h,o);s.setRenderTarget(d),s.render(e,this.prepareCamera(h,t,r,o))}s.state.setCullFace(hc),s.setRenderTarget(l),s.xr.enabled=c;for(const h of this.live){const d=this.targets.get(h);d&&h.setView(d.texture)}for(const h of this.screens)h.setResolution(this.size);this.trim(i)}dispose(){for(const e of this.targets.values())e.dispose();this.targets.clear(),this.found.length=0,this.screens.length=0,this.live.length=0}frameSize(e){if(e&&e.cameras.length>0){let t=0,i=0;for(const s of e.cameras){const a=s.viewport;a&&(t=Math.max(t,a.x+a.z),i=Math.max(i,a.y+a.w))}this.size.set(t,i);return}this.renderer.getDrawingBufferSize(this.size)}sizeAt(e,t){return t.set(Math.max(2,Math.floor(this.size.x*e)),Math.max(2,Math.floor(this.size.y*e)))}pick(e,t,i){if(this.live.length=0,this.budget<=0)return;const s=new Map;for(const a of e){if(!a.reflecting||(a.updateWorldMatrix(!0,!1),i&&!i.intersectsObject(a)))continue;const r=a.worldSize(KE);if(r.x<Qf||r.y<Qf||(a.getWorldNormal(Ss),a.getWorldPosition(mi),rE(Ss,mi,t)<QE))continue;const l=mi.distanceTo(t);if(l>JE)continue;const c=r.x*r.y/Math.max(.04,l*l);c<ZE||(s.set(a,c),this.live.push(a))}this.live.sort((a,r)=>s.get(r)-s.get(a)),this.live.length=Math.min(this.live.length,this.budget)}trim(e){for(const[t,i]of[...this.targets])e.includes(t)||(i.dispose(),this.targets.delete(t))}target(e,t){this.sizeAt(t,vr);const i=vr.x,s=vr.y,a=0,r=this.targets.get(e);if(r&&r.width===i&&r.height===s&&r.samples===a)return r;r?.dispose();const o=new _n(i,s,{type:Un,depthBuffer:!0,stencilBuffer:!1,samples:a});return o.texture.minFilter=Ct,o.texture.magFilter=Ct,o.texture.generateMipmaps=!1,this.targets.set(e,o),o}prepareCamera(e,t,i,s){if(e.getWorldNormal(Ss),e.getWorldPosition(mi),sE(ja,Ss,mi),!i)return t.updateWorldMatrix(!0,!1),this.mono.matrixWorld.multiplyMatrices(ja,t.matrixWorld),this.mono.matrixWorldInverse.copy(this.mono.matrixWorld).invert(),this.mono.projectionMatrix.copy(t.projectionMatrix),this.mono.layers.mask=rc(t.layers.mask),jf(this.mono,Ss,mi),this.mono.projectionMatrixInverse.copy(this.mono.projectionMatrix).invert(),this.mono;this.syncEyes(i),this.array.matrixWorld.multiplyMatrices(ja,i.matrixWorld),this.array.matrixWorldInverse.copy(this.array.matrixWorld).invert(),this.array.projectionMatrix.copy(i.projectionMatrix),this.array.projectionMatrixInverse.copy(i.projectionMatrixInverse);for(let a=0;a<i.cameras.length;a++){const r=i.cameras[a],o=this.array.cameras[a];o.matrixWorld.multiplyMatrices(ja,r.matrixWorld),o.matrixWorldInverse.copy(o.matrixWorld).invert(),o.projectionMatrix.copy(r.projectionMatrix),jf(o,Ss,mi),o.projectionMatrixInverse.copy(o.projectionMatrix).invert();const l=r.viewport;l&&o.viewport.set(Math.floor(l.x*s),Math.floor(l.y*s),Math.floor(l.z*s),Math.floor(l.w*s)),o.layers.mask=rc(r.layers.mask)}return this.array}syncEyes(e){for(;this.array.cameras.length>e.cameras.length;)this.array.cameras.pop();for(;this.array.cameras.length<e.cameras.length;){const t=new Wt;t.matrixAutoUpdate=!1,t.matrixWorldAutoUpdate=!1,t.viewport=new at,this.array.cameras.push(t)}this.array.layers.mask=rc(e.layers.mask)}}function jf(n,e,t){if(Li.setFromNormalAndCoplanarPoint(e,t),Li.applyMatrix4(n.matrixWorldInverse),Math.abs(Li.constant)<.02)return;Gn.set(Li.normal.x,Li.normal.y,Li.normal.z,Li.constant);const i=n.projectionMatrix.elements;Zf.set((Math.sign(Gn.x)+i[8])/i[0],(Math.sign(Gn.y)+i[9])/i[5],-1,(1+i[10])/i[14]);const s=Gn.dot(Zf);Math.abs(s)<1e-6||(Gn.multiplyScalar(2/s),i[2]=Gn.x,i[6]=Gn.y,i[10]=Gn.z+1,i[14]=Gn.w)}const fu="bgvr.holdPoses";function Yi(){try{const n=globalThis.localStorage?.getItem(fu);return n?JSON.parse(n):{}}catch{return{}}}function pu(n){try{globalThis.localStorage?.setItem(fu,JSON.stringify(n))}catch{}}function SR(n,e,t){const i=Yi();i[n]={...e,hand:t??i[n]?.hand},pu(i)}function bR(n){return Yi()[n]?.hand??null}function TR(n){const e=Yi()[n.toolId];nw(e)&&(n.holdPosition.set(e.position.x,e.position.y,e.position.z),n.holdRotation.set(e.rotation.x,e.rotation.y,e.rotation.z,e.rotation.w),e.hand&&(n.holdHand=e.hand))}function nw(n){const e=s=>Number.isFinite(s),t=n?.position,i=n?.rotation;return!!t&&!!i&&e(t.x)&&e(t.y)&&e(t.z)&&e(i.x)&&e(i.y)&&e(i.z)&&e(i.w)}function ER(n){const e=Yi();return n in e?(delete e[n],pu(e),!0):!1}function iw(){try{globalThis.localStorage?.removeItem(fu)}catch{}}function wR(){return Object.keys(Yi()).length}function h0(){const n={};for(const[e,t]of Object.entries(Yi()))n[e]=um(Mb(t));return n}function sw(n,e={}){const t={};for(const[i,s]of Object.entries(n))t[i]={...yb(dm(s)),hand:e[i]};pu(t)}function u0(){const n={};for(const[e,t]of Object.entries(Yi()))t.hand&&(n[e]=t.hand);return n}const Er="BG",rw=4,aw="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",wr=aw;function d0(n,e=rw){const t=hw(n),i=t.length<n.length,s=i?t:n,a=new Uint8Array(s.length+3);a[0]=i?1:0,a.set(s,1);const r=f0(a.subarray(0,s.length+1));return a[s.length+1]=r>>8&255,a[s.length+2]=r&255,Er+e+pw(a)}function ow(n){const e=n.replace(/\s+/g,"");if(!e.startsWith(Er))return null;const t=Number(e.slice(Er.length,Er.length+1));if(!Number.isInteger(t)||t<1||t>9)return null;const i=mw(e.slice(Er.length+1));if(!i||i.length<3)return null;const s=i.length-2,a=f0(i.subarray(0,s));if(i[s]!==(a>>8&255)||i[s+1]!==(a&255))return null;const r=i.subarray(1,s);return{version:t,payload:i[0]===1?uw(r):r}}const lw=4096,Fo=3,cw=Fo+15;function hw(n){const e=[];let t=0,i=0;for(let s=0;s<n.length;){i===0&&(t=e.length,e.push(0),i=1);let a=-1,r=0;for(let o=Math.max(0,s-lw);o<s;o++){let l=0;for(;l<cw&&s+l<n.length&&n[o+l]===n[s+l];)l++;l>r&&(r=l,a=o)}if(r>=Fo){const o=s-a-1;e.push(o>>4&255,(o&15)<<4|r-Fo),s+=r}else e[t]|=i,e.push(n[s]),s++;i=i<<1&255}return Uint8Array.from(e)}function uw(n){const e=[];let t=0,i=0,s=0;for(;t<n.length;){if(s===0&&(i=n[t++],s=1),i&s)t<n.length&&e.push(n[t++]);else{if(t+1>=n.length)break;const a=n[t++],r=n[t++],o=(a<<4|r>>4)+1,l=(r&15)+Fo,c=e.length-o;if(c<0)break;for(let h=0;h<l;h++)e.push(e[c+h])}s=s<<1&255}return Uint8Array.from(e)}class dw{out=[];byte(e){return this.out.push(e&255),this}uint(e){let t=Math.max(0,Math.round(e))>>>0;for(;t>=128;)this.out.push(t&127|128),t>>>=7;return this.out.push(t),this}int(e){const t=Math.round(e)|0;return this.uint(t<<1^t>>31)}fixed(e,t){return this.int(Number.isFinite(e)?e*t:0)}text(e){const t=new TextEncoder().encode(e);this.uint(t.length);for(const i of t)this.out.push(i);return this}bytes(){return Uint8Array.from(this.out)}}class fw{constructor(e){this.source=e}source;at=0;get done(){return this.at>=this.source.length}byte(){return this.at<this.source.length?this.source[this.at++]:0}uint(){let e=0,t=0;for(;this.at<this.source.length;){const i=this.source[this.at++];if(e+=(i&127)*2**t,(i&128)===0||(t+=7,t>42))break}return e}int(){const e=this.uint();return(e%2===0?e/2:-(e+1)/2)|0}fixed(e){return Math.round(this.int()/e*1e6)/1e6}text(){const e=this.uint(),t=Math.min(this.at+e,this.source.length),i=this.source.subarray(this.at,t);return this.at=t,new TextDecoder().decode(i)}}function f0(n){let e=2166136261;for(const t of n)e^=t,e=Math.imul(e,16777619)>>>0;return(e>>>16^e&65535)&65535}function pw(n){let e="";for(let t=0;t<n.length;t+=3){const i=n[t],s=n[t+1],a=n[t+2],r=i<<16|(s??0)<<8|(a??0);if(e+=wr[r>>18&63]+wr[r>>12&63],s===void 0||(e+=wr[r>>6&63],a===void 0))break;e+=wr[r&63]}return e}function mw(n){const e=[];let t=0,i=0;for(const s of n){const a=wr.indexOf(s);if(a<0)return null;i=i<<6|a,t+=6,t>=8&&(t-=8,e.push(i>>t&255))}return Uint8Array.from(e)}const mu=4,go=1,ep=2,p0=3,m0=4,Dt={tools:1,hands:2,attachments:4,weapon:8,drone:16,superman:32},Si=["gun-blue","gun-red","gun-dual","gizmo","brush","pistol","stopwatch","grapple","gravity-glove","translate-glove","welder","xray","drone","tape","adjust","eraser","superman-glove","flashlight","hand-box","controller-left","controller-right","teleport","hammer"],gu=["reddot","irons","trace","xray","scope"],_u=["kopter","racing"],Hs=[10,10,10,1,1,1],Vs=[0,0,0,0,0,0],Oo=[100,100,100,100,100,100,100,100,100,100,100,100],g0=ta(Ti),Rn=["left","right"],_0=Rn.map(n=>ta(Zh(n)));function gw(n){let e=0;return n.tools&&(e|=Dt.tools),n.hands&&(e|=Dt.hands),n.attachments&&(e|=Dt.attachments),n.weapon&&(e|=Dt.weapon),n.drone&&(e|=Dt.drone),n.superman&&(e|=Dt.superman),e}function v0(n){const e=new dw,t=gw(n);if(e.uint(t),t&Dt.tools){const i=Object.entries(n.tools);e.uint(i.length);for(const[s,a]of i)_o(e,Si,s),Bo(e,a,Hs,Vs)}if(t&Dt.hands&&xw(e,n.hands),t&Dt.attachments){const i=Object.entries(n.attachments);e.uint(i.length);for(const[s,a]of i){const r=s.indexOf(":");_o(e,Si,r<0?s:s.slice(0,r)),_o(e,gu,r<0?"":s.slice(r+1)),Bo(e,a,Hs,Vs)}}return t&Dt.weapon&&Mw(e,n.weapon),t&Dt.drone&&Sw(e,n.drone),t&Dt.superman&&Tw(e,n.superman),e.bytes()}function _w(n,e=mu){const t=new fw(n);if(e===ep){const a=t.byte();if(a===go)return vw(t);if(a!==ep)return null}else if(e!==p0&&e!==m0)return null;const i=t.uint(),s={};if(i&Dt.tools){const a={};for(let r=t.uint();r>0;r--)a[Bi(t,Si)]=Gs(t,Hs,Vs,e);s.tools=a}if(i&Dt.hands&&(s.hands=x0(t,e)),i&Dt.attachments){const a={};for(let r=t.uint();r>0;r--){const o=Bi(t,Si),l=Bi(t,gu);a[`${o}:${l}`]=Gs(t,Hs,Vs,e)}s.attachments=a}return i&Dt.weapon&&(s.weapon=yw(t,e)),i&Dt.drone&&(s.drone=bw(t)),i&Dt.superman&&(s.superman=Ew(t)),s}function vw(n){const e={};for(let l=n.uint();l>0;l--)e[Bi(n,Si)]=Gs(n,Hs,Vs,go);const t=x0(n,go),i={};for(let l=n.uint();l>0;l--){const c=Bi(n,Si),h=Bi(n,gu);i[`${c}:${h}`]=Gs(n,Hs,Vs,go)}const s=M0(n),a=n.byte(),r=n.fixed(10);r>0&&(s.zoom=ra({...s,zoom:r}).zoom);const o=Jo({profile:_u[a&3],replace:(a&4)!==0,speed:n.fixed(10),turn:n.fixed(1)});return{tools:e,hands:t,attachments:i,weapon:s,drone:o}}function xw(n,e){let t=0;for(let s=0;s<Rn.length;s++)e.idle?.[Rn[s]]&&(t|=1<<s);n.byte(t);for(let s=0;s<Rn.length;s++)t&1<<s&&Bo(n,e.idle[Rn[s]],Oo,_0[s]);const i=[];for(let s=0;s<Rn.length;s++)for(const[a,r]of Object.entries(e.hold?.[Rn[s]]??{}))i.push([s,a,r]);n.uint(i.length);for(const[s,a,r]of i)n.byte(s),_o(n,Si,a),Bo(n,r,Oo,g0)}function x0(n,e){const t={},i=n.byte();for(let a=0;a<Rn.length;a++)i&1<<a&&(t[Rn[a]]=Gs(n,Oo,_0[a],e));const s={};for(let a=n.uint();a>0;a--){const r=Rn[n.byte()]??"left",o=Bi(n,Si);(s[r]??={})[o]=Gs(n,Oo,g0,e)}return{idle:t,hold:s}}function Mw(n,e){n.fixed(e.mass,1e3),n.fixed(e.speed,10),n.fixed(e.rate,10),n.uint(e.magazine),n.fixed(e.reload,100),n.uint(e.burst),n.byte(Math.max(0,su.indexOf(e.mode))|ru.indexOf(e.ammo)<<2);let t=0;for(let i=0;i<Uo.length;i++)e.sights.includes(Uo[i])&&(t|=1<<i);n.uint(t),n.fixed(e.zoom,10),n.fixed(e.damage,1)}function M0(n){const e=n.fixed(1e3),t=n.fixed(10),i=n.fixed(10),s=n.uint(),a=n.fixed(100),r=n.uint(),o=n.byte(),l=n.uint();return ra({mass:e,speed:t,rate:i,magazine:s,reload:a,burst:r,mode:su[o&3],ammo:ru[o>>2&1],sights:Uo.filter((c,h)=>l&1<<h)})}function yw(n,e){const t=M0(n),i=n.fixed(10),s=e>=m0?n.fixed(1):0;return ra({...t,...i>0?{zoom:i}:{},...s>0?{damage:s}:{}})}function Sw(n,e){n.byte(Math.max(0,_u.indexOf(e.profile))|(e.replace?4:0)),n.fixed(e.speed,10),n.fixed(e.turn,1)}function bw(n){const e=n.byte();return Jo({profile:_u[e&3],replace:(e&4)!==0,speed:n.fixed(10),turn:n.fixed(1)})}function Tw(n,e){n.fixed(e.forward,10),n.fixed(e.back,10),n.fixed(e.up,10),n.fixed(e.down,10),n.fixed(e.side,10),n.fixed(e.turn,1),n.fixed(e.deadzone,10),n.byte(Math.max(0,Nn.indexOf(e.drive))|Math.max(0,Nn.indexOf(e.lift))<<2|Math.max(0,Nn.indexOf(e.yaw))<<4|(e.strafe?64:0))}function Ew(n){const e=n.fixed(10),t=n.fixed(10),i=n.fixed(10),s=n.fixed(10),a=n.fixed(10),r=n.fixed(1),o=n.fixed(10),l=n.byte();return iu({forward:e,back:t,up:i,down:s,side:a,turn:r,deadzone:o,drive:Nn[l&3],lift:Nn[l>>2&3],yaw:Nn[l>>4&3],strafe:(l&64)!==0})}function _o(n,e,t){const i=e.indexOf(t);i<0?n.uint(0).text(t):n.uint(i+1)}function Bi(n,e){const t=n.uint();return t===0?n.text():e[t-1]??`unbekannt-${t}`}function Bo(n,e,t,i){let s=0;for(let a=0;a<t.length;a++){const r=e[a]??i[a]??0;ww(r,i[a]??0,t[a])||(s|=1<<a)}n.uint(s);for(let a=0;a<t.length;a++)s&1<<a&&n.fixed(e[a]??0,t[a])}function Gs(n,e,t,i){if(i<p0)return e.map(a=>n.fixed(a));const s=n.uint();return e.map((a,r)=>s&1<<r?n.fixed(a):t[r]??0)}function ww(n,e,t){const i=Number.isFinite(n)?Math.round(n*t):0,s=Number.isFinite(e)?Math.round(e*t):0;return i===s}const mh="BP",ei="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_",ki=30,Lr=.1,oc=Math.round(ki*2/Lr)+1,tp=360,y0=181,bs=101,vu=30,S0=vu*2+1,Yr=[oc,oc,oc,tp,y0,tp],xu=[bs,bs,bs,bs,bs,S0];Zo(Yr);Zo(xu);const gh=["","grab","gun-blue","gun-red","gun-dual","gizmo","brush","duplicator","inspect","pistol","knife","stopwatch","flashlight","grapple","gravity-glove","translate-glove","superman-glove","welder","xray","drone","tape","teleport","eraser","hand-box","controller-left","controller-right","hammer","holster","hang-glider","wings","grip","grip-rod","bag","easel"],_h=1,vh=2,b0=4,xh=8;function Aw(n){const e=Math.max(0,gh.indexOf(n.toolId));let t=n.hand==="left"?b0:0;const i=[],s=[];n.pose&&(t|=_h,i.push(...np(n.pose)),s.push(...Yr)),n.grip&&(t|=vh,i.push(...np(n.grip)),s.push(...Yr)),n.fingers&&(t|=xh,i.push(...Pw(n.fingers.curls,n.fingers.spread)),s.push(...xu));const a=Es(e)+Es(t)+Lw(i,s),r=T0(a);return mh+a+Es(Math.floor(r/59))+Es(r%59)}function Rw(n){const e=n.replace(/\s+/g,"");if(!e.startsWith(mh))return null;const t=e.slice(mh.length);if(t.length<4)return null;const i=t.slice(0,t.length-2),s=T0(i);if(Es(Math.floor(s/59))!==t[t.length-2]||Es(s%59)!==t[t.length-1])return null;const a=ko(i[0]),r=ko(i[1]);if(a<0||r<0||a>=gh.length)return null;const o=[];r&_h&&o.push(...Yr),r&vh&&o.push(...Yr),r&xh&&o.push(...xu);const l=i.slice(2);if(l.length!==Zo(o))return null;const c=o.length>0?Nw(l,o):[];if(!c)return null;const h={toolId:gh[a],hand:r&b0?"left":"right"};let d=0;return r&_h&&(h.pose=ip(c.slice(d,d+=6))),r&vh&&(h.grip=ip(c.slice(d,d+=6))),r&xh&&(h.fingers=Cw(c.slice(d,d+=6))),h}function np(n){const[e,t,i]=Iw(n[3]??0,n[4]??0,n[5]??0);return[lc(n[0]??0),lc(n[1]??0),lc(n[2]??0),sp(e),Math.min(y0-1,Math.max(0,Math.round(t)+90)),sp(i)]}function ip(n){return[cc(n[0]*Lr-ki),cc(n[1]*Lr-ki),cc(n[2]*Lr-ki),rp(n[3]),n[4]-90,rp(n[5])]}function Pw(n,e){const t=[0,1,2,3,4].map(i=>zo(Math.round((n[i]??0)*100),bs));return t.push(zo(Math.round(e)+vu,S0)),t}function Cw(n){return{curls:n.slice(0,5).map(e=>Math.round(e)/100),spread:n[5]-vu}}function Iw(n,e,t){const i=pm(fm({x:Nr(n)*Math.PI/180,y:Nr(e)*Math.PI/180,z:Nr(t)*Math.PI/180}));return[i.x*180/Math.PI,i.y*180/Math.PI,i.z*180/Math.PI]}function Zo(n){let e=1n;for(const a of n)e*=BigInt(a);let t=0,i=1n;const s=BigInt(ei.length);for(;i<e;)i*=s,t++;return t}function Lw(n,e){const t=BigInt(ei.length);let i=0n;for(let a=0;a<e.length;a++)i=i*BigInt(e[a])+BigInt(zo(n[a]??0,e[a]));let s="";for(let a=Zo(e);a>0;a--)s=ei[Number(i%t)]+s,i/=t;return s}function Nw(n,e){const t=BigInt(ei.length);let i=0n;for(const a of n){const r=ko(a);if(r<0)return null;i=i*t+BigInt(r)}const s=[];for(let a=e.length-1;a>=0;a--){const r=BigInt(e[a]);s[a]=Number(i%r),i/=r}return i===0n?s:null}function Es(n){return ei[zo(n,ei.length)]}function ko(n){return ei.indexOf(n)}function T0(n){const e=ei.length*ei.length;let t=1234;for(let i=0;i<n.length;i++)t=(t*31+(i+1)*(ko(n[i])+1))%e;return t}function lc(n){const e=Nr(n);return Math.round((Math.min(ki,Math.max(-ki,e))+ki)/Lr)}function sp(n){return(Math.round(Nr(n))%360+360)%360}function rp(n){return n>=180?n-360:n}function Nr(n){return Number.isFinite(n)?n:0}function zo(n,e){return Number.isFinite(n)?Math.min(e-1,Math.max(0,Math.round(n))):0}function cc(n){return Math.round(n*10)/10}const Dw={pistol:"weapon",drone:"drone","superman-glove":"superman"};function Mu(){return{tools:h0(),toolHands:u0(),hands:Sm(),attachments:Hm(),weapon:L1(),drone:Vm(),superman:Gm()}}function Uw(n,e=null){const t=Mu(),i={},s=e?[e]:["left","right"];if(!n){const c={};for(const h of s){const d=t.hands?.idle?.[h];d&&(c[h]=d)}return i.hands={idle:c,hold:{}},i}const a=t.tools?.[n];if(a){i.tools={[n]:a};const c=t.toolHands?.[n];c&&(i.toolHands={[n]:c})}const r={};for(const c of s){const h=t.hands?.hold?.[c]?.[n];h&&(r[c]={[n]:h})}Object.keys(r).length>0&&(i.hands={idle:{},hold:r});const o={};for(const[c,h]of Object.entries(t.attachments??{}))c.startsWith(`${n}:`)&&(o[c]=h);Object.keys(o).length>0&&(i.attachments=o);const l=Dw[n];return l==="weapon"&&(i.weapon=t.weapon),l==="drone"&&(i.drone=t.drone),l==="superman"&&(i.superman=t.superman),i}function AR(){return d0(v0(Mu()),mu)}function RR(n,e=null){if(!e)return d0(v0(Uw(n,null)),mu);const t=Mu(),i=n??"",s=i?t.hands?.hold?.[e]?.[i]:t.hands?.idle?.[e],a=s?Po(s,Mh(e,i)):null,r=Mh(e,i);return Aw({toolId:i,hand:e,pose:i&&i!==E0?t.tools?.[i]??null:null,grip:a?[a.x,a.y,a.z,a.pitch,a.yaw,a.roll]:null,fingers:a&&!Fw(a,r)?{curls:a.curls,spread:a.spread}:null})}const E0="grab";function Mh(n,e){return e?vm(n,e):Zh(n)}function Fw(n,e){return Math.round(n.spread)!==Math.round(e.spread)?!1:[0,1,2,3,4].every(t=>Math.round((n.curls[t]??0)*100)===Math.round((e.curls[t]??0)*100))}function Ow(n){const e={},t=n.toolId;if(n.pose&&t&&t!==E0&&(e.tools={[t]:[...n.pose]},e.toolHands={[t]:n.hand}),n.grip){const s={...Mh(n.hand,t),x:n.grip[0]??0,y:n.grip[1]??0,z:n.grip[2]??0,pitch:n.grip[3]??0,yaw:n.grip[4]??0,roll:n.grip[5]??0};n.fingers&&(s.curls=[...n.fingers.curls],s.spread=n.fingers.spread);const a=ta(s);e.hands=t?{idle:{},hold:{[n.hand]:{[t]:a}}}:{idle:{[n.hand]:a},hold:{}}}return e}function PR(n){const e=Rw(n);if(e)return Ow(e);const t=ow(n);return t?_w(t.payload,t.version):null}function CR(n){const e=[];return n.tools&&(sw({...h0(),...n.tools},{...u0(),...n.toolHands}),e.push(`${Object.keys(n.tools).length} Werkzeug-Posen`)),n.hands&&(kb(kw(Sm(),n.hands)),e.push(`${Bw(n.hands)} Hand-Posen`)),n.attachments&&(C1({...Hm(),...n.attachments}),e.push(`${Object.keys(n.attachments).length} Anbauteile`)),n.weapon&&(N1(n.weapon),e.push("Pistole")),n.drone&&(D1(n.drone),e.push("Drohne")),n.superman&&(F1(n.superman),e.push("Supermanhandschuh")),e.length>0?e.join(" · "):"nichts"}function Bw(n){return Object.keys(n.idle??{}).length+Object.values(n.hold??{}).reduce((e,t)=>e+Object.keys(t??{}).length,0)}function kw(n,e){const t={idle:{...n.idle,...e.idle},hold:{...n.hold}};for(const i of["left","right"]){const s=e.hold?.[i];s&&(t.hold[i]={...n.hold?.[i],...s})}return t}function IR(){iw(),zb(),I1(),U1(),O1()}const zw=500,Hw=560,Vw=-.05,ap=.6;function w0(n){return n.userData.backdrop=!0,n}function LR(n,e,t=Hw){const i=new hn({side:Xt,depthWrite:!1,uniforms:{topColor:{value:new ze(n)},bottomColor:{value:new ze(e)}},vertexShader:`
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
    `}),s=new he(new et(t,24,16),i);return s.name="sky",s.frustumCulled=!1,w0(s)}function NR(n=1){const e=new At;e.name="lighting";const t=new uv(12441599,2765122,1.5*n);e.add(t);const i=new Od(16777215,1.6*n);i.position.set(4,8,3),e.add(i);const s=new Od(6986751,.5*n);return s.position.set(-5,3,-4),e.add(s),e}function DR(n){n.traverse(e=>{e.geometry?.dispose()}),n.removeFromParent()}function UR(n){A0(n),n.removeFromParent()}function A0(n){if(n.userData.sharedAssets)return;const e=n;e.geometry?.dispose();const t=e.material;Array.isArray(t)?t.forEach(i=>i.dispose()):t?.dispose();for(const i of n.children)A0(i)}function FR(n,e={}){const t=e.radius??zw,i=e.tile??Gw*2,s=Xw(n,e.line??0,e.checker??Ww(n));s.repeat.set(t*2/i,t*2/i);const a=new he(new Ln(t*2,ap,t*2),new qt({map:s,roughness:.95,metalness:.02}));return a.name="ground",a.position.y=Vw-ap/2,a.receiveShadow=!0,w0(a)}const Gw=1;function Ww(n){const e=t=>{const i=n>>t&255;return Math.min(255,Math.round(i+(255-i)*.18))<<t};return e(16)|e(8)|e(0)}function Xw(n,e,t){const i=new Go(qw(n,e,t));return i.colorSpace=zt,i.wrapS=Hi,i.wrapT=Hi,i.anisotropy=8,i}function qw(n,e,t){const s=document.createElement("canvas");s.width=256,s.height=256;const a=s.getContext("2d"),r=o=>`#${o.toString(16).padStart(6,"0")}`;a.fillStyle=r(n),a.fillRect(0,0,256,256),a.fillStyle=r(t),a.fillRect(128,0,128,128),a.fillRect(0,128,128,128),a.strokeStyle=r(e),a.globalAlpha=.22,a.lineWidth=2;for(let o=0;o<2;o++)for(let l=0;l<2;l++)a.strokeRect(o*128+1,l*128+1,126,126);return s}export{DA as $,OA as A,ti as B,gA as C,Od as D,vn as E,wR as F,At as G,uv as H,zb as I,iw as J,Q2 as K,Ip as L,qe as M,Z2 as N,$m as O,Wt as P,$t as Q,mA as R,Qw as S,J2 as T,RR as U,C as V,vA as W,AR as X,ah as Y,NA as Z,SR as _,AA as a,cn as a$,Wi as a0,lh as a1,oh as a2,_m as a3,Tp as a4,$r as a5,et as a6,_s as a7,Go as a8,zt as a9,iR as aA,c0 as aB,PR as aC,CR as aD,aR as aE,uR as aF,cR as aG,uh as aH,a0 as aI,LR as aJ,Rp as aK,Ro as aL,Ln as aM,uA as aN,FR as aO,UR as aP,ze as aQ,qi as aR,Sb as aS,MA as aT,yA as aU,qt as aV,J1 as aW,mn as aX,R1 as aY,pt as aZ,dR as a_,BA as aa,sR as ab,qh as ac,NR as ad,fo as ae,rR as af,dE as ag,mo as ah,hR as ai,bE as aj,po as ak,oR as al,pE as am,mR as an,pR as ao,AE as ap,fR as aq,XE as ar,gR as as,rc as at,jw as au,t_ as av,eo as aw,dp as ax,yR as ay,K2 as az,gi as b,Lf as b$,eA as b0,NE as b1,ZT as b2,Zr as b3,Du as b4,Oe as b5,_n as b6,Ct as b7,xi as b8,Un as b9,Kp as bA,$o as bB,tu as bC,s2 as bD,Yp as bE,yf as bF,n2 as bG,t2 as bH,i2 as bI,e2 as bJ,h_ as bK,Z1 as bL,_R as bM,Qt as bN,du as bO,s_ as bP,Y2 as bQ,c2 as bR,z1 as bS,l2 as bT,w1 as bU,E1 as bV,ru as bW,F2 as bX,g1 as bY,_1 as bZ,O1 as b_,$e as ba,Xw as bb,Hi as bc,vR as bd,Em as be,Hp as bf,qp as bg,Jr as bh,Xt as bi,nA as bj,u_ as bk,aA as bl,ws as bm,Zw as bn,ni as bo,hn as bp,MR as bq,fh as br,Vo as bs,Ap as bt,dA as bu,hA as bv,tm as bw,at as bx,EA as by,Ed as bz,RA as c,WA as c$,lo as c0,wA as c1,PA as c2,CA as c3,Mm as c4,Zh as c5,Sm as c6,Po as c7,IR as c8,TR as c9,wm as cA,r2 as cB,Qb as cC,o2 as cD,h2 as cE,Jb as cF,Kb as cG,Zb as cH,a2 as cI,k1 as cJ,$2 as cK,Xb as cL,KA as cM,bm as cN,ZA as cO,jA as cP,QA as cQ,q2 as cR,Yb as cS,JA as cT,kA as cU,zA as cV,GA as cW,HA as cX,XA as cY,YA as cZ,VA as c_,bR as ca,_A as cb,DR as cc,Vw as cd,Gm as ce,F1 as cf,M2 as cg,j2 as ch,eR as ci,IA as cj,LA as ck,Ti as cl,v2 as cm,_2 as cn,x2 as co,TA as cp,bA as cq,vE as cr,wE as cs,mE as ct,yE as cu,uo as cv,lR as cw,oE as cx,jn as cy,SA as cz,Nb as d,yo as d$,a1 as d0,Vm as d1,d1 as d2,p2 as d3,p1 as d4,g2 as d5,D1 as d6,u2 as d7,m2 as d8,o1 as d9,I2 as dA,L2 as dB,N2 as dC,V2 as dD,su as dE,D2 as dF,O2 as dG,B2 as dH,A2 as dI,B1 as dJ,S2 as dK,y2 as dL,w2 as dM,X2 as dN,E2 as dO,T2 as dP,b2 as dQ,tA as dR,sA as dS,xR as dT,$w as dU,Jw as dV,Kw as dW,jr as dX,fA as dY,lA as dZ,rA as d_,r1 as da,f2 as db,d2 as dc,h1 as dd,iA as de,$A as df,qA as dg,Bb as dh,iT as di,Up as dj,$p as dk,Jp as dl,Cr as dm,G2 as dn,W2 as dp,L1 as dq,U2 as dr,k2 as ds,z2 as dt,ra as du,N1 as dv,H2 as dw,P2 as dx,R2 as dy,C2 as dz,xA as e,fd as e0,cA as e1,pA as e2,jg as e3,la as e4,nl as e5,ag as e6,Ft as e7,Mc as e8,Xn as e9,bi as ea,ft as eb,Oh as ec,oA as ed,Uh as ee,Mo as ef,Zc as eg,To as eh,Ut as ei,jp as ej,Gh as ek,Wh as el,it as em,yi as en,Qr as eo,Ob as f,nR as g,gf as h,tR as i,Db as j,mt as k,Bh as l,te as m,Dp as n,Vh as o,he as p,fm as q,Mb as r,Kr as s,Pn as t,Hr as u,yb as v,_f as w,FA as x,UA as y,ER as z};
//# sourceMappingURL=environment-Ret9-qsO.js.map
