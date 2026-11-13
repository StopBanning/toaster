// Spotify's Basic Pitch 1.0.1 (its note-making, toMidi.js) and TensorFlow.js 3.21.0
// (core, WebGL and CPU backends, converter), bundled by tools/vendor-basic-pitch.mjs. Apache License 2.0: licenses/Apache-2.0.txt.
// Copyright 2022 Spotify AB; Copyright Google LLC. See THIRD-PARTY-NOTICES.txt.
var t$=Object.create;var $f=Object.defineProperty;var e$=Object.getOwnPropertyDescriptor;var r$=Object.getOwnPropertyNames;var o$=Object.getPrototypeOf,n$=Object.prototype.hasOwnProperty;var Rf=(r=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(r,{get:(t,e)=>(typeof require<"u"?require:t)[e]}):r)(function(r){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+r+'" is not supported')});var eo=(r,t)=>()=>(t||r((t={exports:{}}).exports,t),t.exports),It=(r,t)=>{for(var e in t)$f(r,e,{get:t[e],enumerable:!0})},s$=(r,t,e,o)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of r$(t))!n$.call(r,n)&&n!==e&&$f(r,n,{get:()=>t[n],enumerable:!(o=e$(t,n))||o.enumerable});return r};var Af=(r,t,e)=>(e=r!=null?t$(o$(r)):{},s$(t||!r||!r.__esModule?$f(e,"default",{value:r,enumerable:!0}):e,r));var qy=eo((X4,Ky)=>{Ky.exports=Ut;var tr=null;try{tr=new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0,1,13,2,96,0,1,127,96,4,127,127,127,127,1,127,3,7,6,0,1,1,1,1,1,6,6,1,127,1,65,0,11,7,50,6,3,109,117,108,0,1,5,100,105,118,95,115,0,2,5,100,105,118,95,117,0,3,5,114,101,109,95,115,0,4,5,114,101,109,95,117,0,5,8,103,101,116,95,104,105,103,104,0,0,10,191,1,6,4,0,35,0,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,126,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,127,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,128,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,129,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,130,34,4,66,32,135,167,36,0,32,4,167,11])),{}).exports}catch{}function Ut(r,t,e){this.low=r|0,this.high=t|0,this.unsigned=!!e}Ut.prototype.__isLong__;Object.defineProperty(Ut.prototype,"__isLong__",{value:!0});function Le(r){return(r&&r.__isLong__)===!0}Ut.isLong=Le;var Ly={},My={};function Ka(r,t){var e,o,n;return t?(r>>>=0,(n=0<=r&&r<256)&&(o=My[r],o)?o:(e=Ht(r,(r|0)<0?-1:0,!0),n&&(My[r]=e),e)):(r|=0,(n=-128<=r&&r<128)&&(o=Ly[r],o)?o:(e=Ht(r,r<0?-1:0,!1),n&&(Ly[r]=e),e))}Ut.fromInt=Ka;function er(r,t){if(isNaN(r))return t?Ha:rr;if(t){if(r<0)return Ha;if(r>=Wy)return Hy}else{if(r<=-Vy)return Pe;if(r+1>=Vy)return Uy}return r<0?er(-r,t).neg():Ht(r%Li|0,r/Li|0,t)}Ut.fromNumber=er;function Ht(r,t,e){return new Ut(r,t,e)}Ut.fromBits=Ht;var up=Math.pow;function Wf(r,t,e){if(r.length===0)throw Error("empty string");if(r==="NaN"||r==="Infinity"||r==="+Infinity"||r==="-Infinity")return rr;if(typeof t=="number"?(e=t,t=!1):t=!!t,e=e||10,e<2||36<e)throw RangeError("radix");var o;if((o=r.indexOf("-"))>0)throw Error("interior hyphen");if(o===0)return Wf(r.substring(1),t,e).neg();for(var n=er(up(e,8)),s=rr,a=0;a<r.length;a+=8){var i=Math.min(8,r.length-a),c=parseInt(r.substring(a,a+i),e);if(i<8){var l=er(up(e,i));s=s.mul(l).add(er(c))}else s=s.mul(n),s=s.add(er(c))}return s.unsigned=t,s}Ut.fromString=Wf;function xr(r,t){return typeof r=="number"?er(r,t):typeof r=="string"?Wf(r,t):Ht(r.low,r.high,typeof t=="boolean"?t:r.unsigned)}Ut.fromValue=xr;var By=65536,L$=1<<24,Li=By*By,Wy=Li*Li,Vy=Wy/2,zy=Ka(L$),rr=Ka(0);Ut.ZERO=rr;var Ha=Ka(0,!0);Ut.UZERO=Ha;var Pi=Ka(1);Ut.ONE=Pi;var Gy=Ka(1,!0);Ut.UONE=Gy;var zf=Ka(-1);Ut.NEG_ONE=zf;var Uy=Ht(-1,2147483647,!1);Ut.MAX_VALUE=Uy;var Hy=Ht(-1,-1,!0);Ut.MAX_UNSIGNED_VALUE=Hy;var Pe=Ht(0,-2147483648,!1);Ut.MIN_VALUE=Pe;var J=Ut.prototype;J.toInt=function(){return this.unsigned?this.low>>>0:this.low};J.toNumber=function(){return this.unsigned?(this.high>>>0)*Li+(this.low>>>0):this.high*Li+(this.low>>>0)};J.toString=function(t){if(t=t||10,t<2||36<t)throw RangeError("radix");if(this.isZero())return"0";if(this.isNegative())if(this.eq(Pe)){var e=er(t),o=this.div(e),n=o.mul(e).sub(this);return o.toString(t)+n.toInt().toString(t)}else return"-"+this.neg().toString(t);for(var s=er(up(t,6),this.unsigned),a=this,i="";;){var c=a.div(s),l=a.sub(c.mul(s)).toInt()>>>0,p=l.toString(t);if(a=c,a.isZero())return p+i;for(;p.length<6;)p="0"+p;i=""+p+i}};J.getHighBits=function(){return this.high};J.getHighBitsUnsigned=function(){return this.high>>>0};J.getLowBits=function(){return this.low};J.getLowBitsUnsigned=function(){return this.low>>>0};J.getNumBitsAbs=function(){if(this.isNegative())return this.eq(Pe)?64:this.neg().getNumBitsAbs();for(var t=this.high!=0?this.high:this.low,e=31;e>0&&!(t&1<<e);e--);return this.high!=0?e+33:e+1};J.isZero=function(){return this.high===0&&this.low===0};J.eqz=J.isZero;J.isNegative=function(){return!this.unsigned&&this.high<0};J.isPositive=function(){return this.unsigned||this.high>=0};J.isOdd=function(){return(this.low&1)===1};J.isEven=function(){return(this.low&1)===0};J.equals=function(t){return Le(t)||(t=xr(t)),this.unsigned!==t.unsigned&&this.high>>>31===1&&t.high>>>31===1?!1:this.high===t.high&&this.low===t.low};J.eq=J.equals;J.notEquals=function(t){return!this.eq(t)};J.neq=J.notEquals;J.ne=J.notEquals;J.lessThan=function(t){return this.comp(t)<0};J.lt=J.lessThan;J.lessThanOrEqual=function(t){return this.comp(t)<=0};J.lte=J.lessThanOrEqual;J.le=J.lessThanOrEqual;J.greaterThan=function(t){return this.comp(t)>0};J.gt=J.greaterThan;J.greaterThanOrEqual=function(t){return this.comp(t)>=0};J.gte=J.greaterThanOrEqual;J.ge=J.greaterThanOrEqual;J.compare=function(t){if(Le(t)||(t=xr(t)),this.eq(t))return 0;var e=this.isNegative(),o=t.isNegative();return e&&!o?-1:!e&&o?1:this.unsigned?t.high>>>0>this.high>>>0||t.high===this.high&&t.low>>>0>this.low>>>0?-1:1:this.sub(t).isNegative()?-1:1};J.comp=J.compare;J.negate=function(){return!this.unsigned&&this.eq(Pe)?Pe:this.not().add(Pi)};J.neg=J.negate;J.add=function(t){Le(t)||(t=xr(t));var e=this.high>>>16,o=this.high&65535,n=this.low>>>16,s=this.low&65535,a=t.high>>>16,i=t.high&65535,c=t.low>>>16,l=t.low&65535,p=0,u=0,m=0,f=0;return f+=s+l,m+=f>>>16,f&=65535,m+=n+c,u+=m>>>16,m&=65535,u+=o+i,p+=u>>>16,u&=65535,p+=e+a,p&=65535,Ht(m<<16|f,p<<16|u,this.unsigned)};J.subtract=function(t){return Le(t)||(t=xr(t)),this.add(t.neg())};J.sub=J.subtract;J.multiply=function(t){if(this.isZero())return rr;if(Le(t)||(t=xr(t)),tr){var e=tr.mul(this.low,this.high,t.low,t.high);return Ht(e,tr.get_high(),this.unsigned)}if(t.isZero())return rr;if(this.eq(Pe))return t.isOdd()?Pe:rr;if(t.eq(Pe))return this.isOdd()?Pe:rr;if(this.isNegative())return t.isNegative()?this.neg().mul(t.neg()):this.neg().mul(t).neg();if(t.isNegative())return this.mul(t.neg()).neg();if(this.lt(zy)&&t.lt(zy))return er(this.toNumber()*t.toNumber(),this.unsigned);var o=this.high>>>16,n=this.high&65535,s=this.low>>>16,a=this.low&65535,i=t.high>>>16,c=t.high&65535,l=t.low>>>16,p=t.low&65535,u=0,m=0,f=0,d=0;return d+=a*p,f+=d>>>16,d&=65535,f+=s*p,m+=f>>>16,f&=65535,f+=a*l,m+=f>>>16,f&=65535,m+=n*p,u+=m>>>16,m&=65535,m+=s*l,u+=m>>>16,m&=65535,m+=a*c,u+=m>>>16,m&=65535,u+=o*p+n*l+s*c+a*i,u&=65535,Ht(f<<16|d,u<<16|m,this.unsigned)};J.mul=J.multiply;J.divide=function(t){if(Le(t)||(t=xr(t)),t.isZero())throw Error("division by zero");if(tr){if(!this.unsigned&&this.high===-2147483648&&t.low===-1&&t.high===-1)return this;var e=(this.unsigned?tr.div_u:tr.div_s)(this.low,this.high,t.low,t.high);return Ht(e,tr.get_high(),this.unsigned)}if(this.isZero())return this.unsigned?Ha:rr;var o,n,s;if(this.unsigned){if(t.unsigned||(t=t.toUnsigned()),t.gt(this))return Ha;if(t.gt(this.shru(1)))return Gy;s=Ha}else{if(this.eq(Pe)){if(t.eq(Pi)||t.eq(zf))return Pe;if(t.eq(Pe))return Pi;var a=this.shr(1);return o=a.div(t).shl(1),o.eq(rr)?t.isNegative()?Pi:zf:(n=this.sub(t.mul(o)),s=o.add(n.div(t)),s)}else if(t.eq(Pe))return this.unsigned?Ha:rr;if(this.isNegative())return t.isNegative()?this.neg().div(t.neg()):this.neg().div(t).neg();if(t.isNegative())return this.div(t.neg()).neg();s=rr}for(n=this;n.gte(t);){o=Math.max(1,Math.floor(n.toNumber()/t.toNumber()));for(var i=Math.ceil(Math.log(o)/Math.LN2),c=i<=48?1:up(2,i-48),l=er(o),p=l.mul(t);p.isNegative()||p.gt(n);)o-=c,l=er(o,this.unsigned),p=l.mul(t);l.isZero()&&(l=Pi),s=s.add(l),n=n.sub(p)}return s};J.div=J.divide;J.modulo=function(t){if(Le(t)||(t=xr(t)),tr){var e=(this.unsigned?tr.rem_u:tr.rem_s)(this.low,this.high,t.low,t.high);return Ht(e,tr.get_high(),this.unsigned)}return this.sub(this.div(t).mul(t))};J.mod=J.modulo;J.rem=J.modulo;J.not=function(){return Ht(~this.low,~this.high,this.unsigned)};J.and=function(t){return Le(t)||(t=xr(t)),Ht(this.low&t.low,this.high&t.high,this.unsigned)};J.or=function(t){return Le(t)||(t=xr(t)),Ht(this.low|t.low,this.high|t.high,this.unsigned)};J.xor=function(t){return Le(t)||(t=xr(t)),Ht(this.low^t.low,this.high^t.high,this.unsigned)};J.shiftLeft=function(t){return Le(t)&&(t=t.toInt()),(t&=63)===0?this:t<32?Ht(this.low<<t,this.high<<t|this.low>>>32-t,this.unsigned):Ht(0,this.low<<t-32,this.unsigned)};J.shl=J.shiftLeft;J.shiftRight=function(t){return Le(t)&&(t=t.toInt()),(t&=63)===0?this:t<32?Ht(this.low>>>t|this.high<<32-t,this.high>>t,this.unsigned):Ht(this.high>>t-32,this.high>=0?0:-1,this.unsigned)};J.shr=J.shiftRight;J.shiftRightUnsigned=function(t){if(Le(t)&&(t=t.toInt()),t&=63,t===0)return this;var e=this.high;if(t<32){var o=this.low;return Ht(o>>>t|e<<32-t,e>>>t,this.unsigned)}else return t===32?Ht(e,0,this.unsigned):Ht(e>>>t-32,0,this.unsigned)};J.shru=J.shiftRightUnsigned;J.shr_u=J.shiftRightUnsigned;J.toSigned=function(){return this.unsigned?Ht(this.low,this.high,!1):this};J.toUnsigned=function(){return this.unsigned?this:Ht(this.low,this.high,!0)};J.toBytes=function(t){return t?this.toBytesLE():this.toBytesBE()};J.toBytesLE=function(){var t=this.high,e=this.low;return[e&255,e>>>8&255,e>>>16&255,e>>>24,t&255,t>>>8&255,t>>>16&255,t>>>24]};J.toBytesBE=function(){var t=this.high,e=this.low;return[t>>>24,t>>>16&255,t>>>8&255,t&255,e>>>24,e>>>16&255,e>>>8&255,e&255]};Ut.fromBytes=function(t,e,o){return o?Ut.fromBytesLE(t,e):Ut.fromBytesBE(t,e)};Ut.fromBytesLE=function(t,e){return new Ut(t[0]|t[1]<<8|t[2]<<16|t[3]<<24,t[4]|t[5]<<8|t[6]<<16|t[7]<<24,e)};Ut.fromBytesBE=function(t,e){return new Ut(t[4]<<24|t[5]<<16|t[6]<<8|t[7],t[0]<<24|t[1]<<16|t[2]<<8|t[3],e)}});var p0=eo((l0,jh)=>{(function(r,t,e){function o(i){var c=this,l=a();c.next=function(){var p=2091639*c.s0+c.c*23283064365386963e-26;return c.s0=c.s1,c.s1=c.s2,c.s2=p-(c.c=p|0)},c.c=1,c.s0=l(" "),c.s1=l(" "),c.s2=l(" "),c.s0-=l(i),c.s0<0&&(c.s0+=1),c.s1-=l(i),c.s1<0&&(c.s1+=1),c.s2-=l(i),c.s2<0&&(c.s2+=1),l=null}function n(i,c){return c.c=i.c,c.s0=i.s0,c.s1=i.s1,c.s2=i.s2,c}function s(i,c){var l=new o(i),p=c&&c.state,u=l.next;return u.int32=function(){return l.next()*4294967296|0},u.double=function(){return u()+(u()*2097152|0)*11102230246251565e-32},u.quick=u,p&&(typeof p=="object"&&n(p,l),u.state=function(){return n(l,{})}),u}function a(){var i=4022871197,c=function(l){l=String(l);for(var p=0;p<l.length;p++){i+=l.charCodeAt(p);var u=.02519603282416938*i;i=u>>>0,u-=i,u*=i,i=u>>>0,u-=i,i+=u*4294967296}return(i>>>0)*23283064365386963e-26};return c}t&&t.exports?t.exports=s:e&&e.amd?e(function(){return s}):this.alea=s})(l0,typeof jh=="object"&&jh,typeof define=="function"&&define)});var m0=eo((u0,Yh)=>{(function(r,t,e){function o(a){var i=this,c="";i.x=0,i.y=0,i.z=0,i.w=0,i.next=function(){var p=i.x^i.x<<11;return i.x=i.y,i.y=i.z,i.z=i.w,i.w^=i.w>>>19^p^p>>>8},a===(a|0)?i.x=a:c+=a;for(var l=0;l<c.length+64;l++)i.x^=c.charCodeAt(l)|0,i.next()}function n(a,i){return i.x=a.x,i.y=a.y,i.z=a.z,i.w=a.w,i}function s(a,i){var c=new o(a),l=i&&i.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var u=c.next()>>>11,m=(c.next()>>>0)/4294967296,f=(u+m)/(1<<21);while(f===0);return f},p.int32=c.next,p.quick=p,l&&(typeof l=="object"&&n(l,c),p.state=function(){return n(c,{})}),p}t&&t.exports?t.exports=s:e&&e.amd?e(function(){return s}):this.xor128=s})(u0,typeof Yh=="object"&&Yh,typeof define=="function"&&define)});var d0=eo((f0,Zh)=>{(function(r,t,e){function o(a){var i=this,c="";i.next=function(){var p=i.x^i.x>>>2;return i.x=i.y,i.y=i.z,i.z=i.w,i.w=i.v,(i.d=i.d+362437|0)+(i.v=i.v^i.v<<4^(p^p<<1))|0},i.x=0,i.y=0,i.z=0,i.w=0,i.v=0,a===(a|0)?i.x=a:c+=a;for(var l=0;l<c.length+64;l++)i.x^=c.charCodeAt(l)|0,l==c.length&&(i.d=i.x<<10^i.x>>>4),i.next()}function n(a,i){return i.x=a.x,i.y=a.y,i.z=a.z,i.w=a.w,i.v=a.v,i.d=a.d,i}function s(a,i){var c=new o(a),l=i&&i.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var u=c.next()>>>11,m=(c.next()>>>0)/4294967296,f=(u+m)/(1<<21);while(f===0);return f},p.int32=c.next,p.quick=p,l&&(typeof l=="object"&&n(l,c),p.state=function(){return n(c,{})}),p}t&&t.exports?t.exports=s:e&&e.amd?e(function(){return s}):this.xorwow=s})(f0,typeof Zh=="object"&&Zh,typeof define=="function"&&define)});var g0=eo((h0,Qh)=>{(function(r,t,e){function o(a){var i=this;i.next=function(){var l=i.x,p=i.i,u,m,f;return u=l[p],u^=u>>>7,m=u^u<<24,u=l[p+1&7],m^=u^u>>>10,u=l[p+3&7],m^=u^u>>>3,u=l[p+4&7],m^=u^u<<7,u=l[p+7&7],u=u^u<<13,m^=u^u<<9,l[p]=m,i.i=p+1&7,m};function c(l,p){var u,m,f=[];if(p===(p|0))m=f[0]=p;else for(p=""+p,u=0;u<p.length;++u)f[u&7]=f[u&7]<<15^p.charCodeAt(u)+f[u+1&7]<<13;for(;f.length<8;)f.push(0);for(u=0;u<8&&f[u]===0;++u);for(u==8?m=f[7]=-1:m=f[u],l.x=f,l.i=0,u=256;u>0;--u)l.next()}c(i,a)}function n(a,i){return i.x=a.x.slice(),i.i=a.i,i}function s(a,i){a==null&&(a=+new Date);var c=new o(a),l=i&&i.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var u=c.next()>>>11,m=(c.next()>>>0)/4294967296,f=(u+m)/(1<<21);while(f===0);return f},p.int32=c.next,p.quick=p,l&&(l.x&&n(l,c),p.state=function(){return n(c,{})}),p}t&&t.exports?t.exports=s:e&&e.amd?e(function(){return s}):this.xorshift7=s})(h0,typeof Qh=="object"&&Qh,typeof define=="function"&&define)});var y0=eo((x0,Jh)=>{(function(r,t,e){function o(a){var i=this;i.next=function(){var l=i.w,p=i.X,u=i.i,m,f;return i.w=l=l+1640531527|0,f=p[u+34&127],m=p[u=u+1&127],f^=f<<13,m^=m<<17,f^=f>>>15,m^=m>>>12,f=p[u]=f^m,i.i=u,f+(l^l>>>16)|0};function c(l,p){var u,m,f,d,g,h=[],x=128;for(p===(p|0)?(m=p,p=null):(p=p+"\0",m=0,x=Math.max(x,p.length)),f=0,d=-32;d<x;++d)p&&(m^=p.charCodeAt((d+32)%p.length)),d===0&&(g=m),m^=m<<10,m^=m>>>15,m^=m<<4,m^=m>>>13,d>=0&&(g=g+1640531527|0,u=h[d&127]^=m+g,f=u==0?f+1:0);for(f>=128&&(h[(p&&p.length||0)&127]=-1),f=127,d=4*128;d>0;--d)m=h[f+34&127],u=h[f=f+1&127],m^=m<<13,u^=u<<17,m^=m>>>15,u^=u>>>12,h[f]=m^u;l.w=g,l.X=h,l.i=f}c(i,a)}function n(a,i){return i.i=a.i,i.w=a.w,i.X=a.X.slice(),i}function s(a,i){a==null&&(a=+new Date);var c=new o(a),l=i&&i.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var u=c.next()>>>11,m=(c.next()>>>0)/4294967296,f=(u+m)/(1<<21);while(f===0);return f},p.int32=c.next,p.quick=p,l&&(l.X&&n(l,c),p.state=function(){return n(c,{})}),p}t&&t.exports?t.exports=s:e&&e.amd?e(function(){return s}):this.xor4096=s})(x0,typeof Jh=="object"&&Jh,typeof define=="function"&&define)});var C0=eo((b0,tg)=>{(function(r,t,e){function o(a){var i=this,c="";i.next=function(){var p=i.b,u=i.c,m=i.d,f=i.a;return p=p<<25^p>>>7^u,u=u-m|0,m=m<<24^m>>>8^f,f=f-p|0,i.b=p=p<<20^p>>>12^u,i.c=u=u-m|0,i.d=m<<16^u>>>16^f,i.a=f-p|0},i.a=0,i.b=0,i.c=-1640531527,i.d=1367130551,a===Math.floor(a)?(i.a=a/4294967296|0,i.b=a|0):c+=a;for(var l=0;l<c.length+20;l++)i.b^=c.charCodeAt(l)|0,i.next()}function n(a,i){return i.a=a.a,i.b=a.b,i.c=a.c,i.d=a.d,i}function s(a,i){var c=new o(a),l=i&&i.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var u=c.next()>>>11,m=(c.next()>>>0)/4294967296,f=(u+m)/(1<<21);while(f===0);return f},p.int32=c.next,p.quick=p,l&&(typeof l=="object"&&n(l,c),p.state=function(){return n(c,{})}),p}t&&t.exports?t.exports=s:e&&e.amd?e(function(){return s}):this.tychei=s})(b0,typeof tg=="object"&&tg,typeof define=="function"&&define)});var S0=eo((T0,Lp)=>{(function(r,t,e){var o=256,n=6,s=52,a="random",i=e.pow(o,n),c=e.pow(2,s),l=c*2,p=o-1,u;function m(S,w,k){var $=[];w=w==!0?{entropy:!0}:w||{};var R=h(g(w.entropy?[S,b(t)]:S??x(),3),$),A=new f($),D=function(){for(var _=A.g(n),O=i,L=0;_<c;)_=(_+L)*o,O*=o,L=A.g(1);for(;_>=l;)_/=2,O/=2,L>>>=1;return(_+L)/O};return D.int32=function(){return A.g(4)|0},D.quick=function(){return A.g(4)/4294967296},D.double=D,h(b(A.S),t),(w.pass||k||function(_,O,L,M){return M&&(M.S&&d(M,A),_.state=function(){return d(A,{})}),L?(e[a]=_,O):_})(D,R,"global"in w?w.global:this==e,w.state)}function f(S){var w,k=S.length,$=this,R=0,A=$.i=$.j=0,D=$.S=[];for(k||(S=[k++]);R<o;)D[R]=R++;for(R=0;R<o;R++)D[R]=D[A=p&A+S[R%k]+(w=D[R])],D[A]=w;($.g=function(_){for(var O,L=0,M=$.i,V=$.j,B=$.S;_--;)O=B[M=p&M+1],L=L*o+B[p&(B[M]=B[V=p&V+O])+(B[V]=O)];return $.i=M,$.j=V,L})(o)}function d(S,w){return w.i=S.i,w.j=S.j,w.S=S.S.slice(),w}function g(S,w){var k=[],$=typeof S,R;if(w&&$=="object")for(R in S)try{k.push(g(S[R],w-1))}catch{}return k.length?k:$=="string"?S:S+"\0"}function h(S,w){for(var k=S+"",$,R=0;R<k.length;)w[p&R]=p&($^=w[p&R]*19)+k.charCodeAt(R++);return b(w)}function x(){try{var S;return u&&(S=u.randomBytes)?S=S(o):(S=new Uint8Array(o),(r.crypto||r.msCrypto).getRandomValues(S)),b(S)}catch{var w=r.navigator,k=w&&w.plugins;return[+new Date,r,k,r.screen,b(t)]}}function b(S){return String.fromCharCode.apply(0,S)}if(h(e.random(),t),typeof Lp=="object"&&Lp.exports){Lp.exports=m;try{u=Rf("crypto")}catch{}}else typeof define=="function"&&define.amd?define(function(){return m}):e["seed"+a]=m})(typeof self<"u"?self:T0,[],Math)});var eg=eo((mrt,w0)=>{var rD=p0(),oD=m0(),nD=d0(),sD=g0(),aD=y0(),iD=C0(),ni=S0();ni.alea=rD;ni.xor128=oD;ni.xorwow=nD;ni.xorshift7=sD;ni.xor4096=aD;ni.tychei=iD;w0.exports=ni});var Zp={};It(Zp,{Abs:()=>as,Acos:()=>Fo,Acosh:()=>Do,AdadeltaOptimizer:()=>Hn,AdagradOptimizer:()=>Kn,AdamOptimizer:()=>qn,AdamaxOptimizer:()=>Xn,Add:()=>_r,AddN:()=>is,All:()=>cs,Any:()=>ls,ArgMax:()=>ps,ArgMin:()=>us,Asin:()=>_o,Asinh:()=>Oo,Atan:()=>Po,Atan2:()=>Mo,Atanh:()=>Lo,AvgPool:()=>ms,AvgPool3D:()=>fs,AvgPool3DGrad:()=>Fc,AvgPoolGrad:()=>Ac,BatchMatMul:()=>ds,BatchToSpaceND:()=>hs,Bincount:()=>gs,BroadcastArgs:()=>xs,BroadcastTo:()=>v$,Cast:()=>oo,Ceil:()=>Bo,ClipByValue:()=>Vo,Complex:()=>ys,ComplexAbs:()=>bs,Concat:()=>Cs,Conv2D:()=>Ts,Conv2DBackpropFilter:()=>Ss,Conv2DBackpropInput:()=>ws,Conv3D:()=>Ns,Conv3DBackpropFilterV2:()=>Dc,Conv3DBackpropInputV2:()=>Is,Cos:()=>zo,Cosh:()=>Wo,CropAndResize:()=>Es,Cumprod:()=>vs,Cumsum:()=>ks,DataStorage:()=>Ro,DenseBincount:()=>$s,DepthToSpace:()=>Rs,DepthwiseConv2dNative:()=>As,DepthwiseConv2dNativeBackpropFilter:()=>Fs,DepthwiseConv2dNativeBackpropInput:()=>Ds,Diag:()=>_s,Dilation2D:()=>Os,Dilation2DBackpropFilter:()=>lp,Dilation2DBackpropInput:()=>cp,ENV:()=>ip,Einsum:()=>Ps,Elu:()=>Uo,EluGrad:()=>_c,Environment:()=>Ai,Equal:()=>Ko,Erf:()=>Ho,Exp:()=>qo,ExpandDims:()=>Ls,Expm1:()=>Xo,FFT:()=>Ms,Fill:()=>Bs,FlipLeftRight:()=>Vs,Floor:()=>jo,FloorDiv:()=>Yo,FromPixels:()=>Fi,FusedBatchNorm:()=>zs,FusedConv2D:()=>_n,FusedDepthwiseConv2D:()=>On,GatherNd:()=>Gs,GatherV2:()=>Ws,Greater:()=>Zo,GreaterEqual:()=>Qo,IFFT:()=>Us,Identity:()=>no,Imag:()=>Hs,IsFinite:()=>Jo,IsInf:()=>tn,IsNan:()=>en,KernelBackend:()=>Ar,LRN:()=>Xs,LRNGrad:()=>Oc,LeakyRelu:()=>Ks,Less:()=>rn,LessEqual:()=>on,LinSpace:()=>qs,Log:()=>nn,Log1p:()=>sn,LogSoftmax:()=>E$,LogicalAnd:()=>an,LogicalNot:()=>cn,LogicalOr:()=>ln,LogicalXor:()=>k$,LowerBound:()=>$$,Max:()=>js,MaxPool:()=>Ys,MaxPool3D:()=>Zs,MaxPool3DGrad:()=>Lc,MaxPoolGrad:()=>Pc,MaxPoolWithArgmax:()=>Qs,Maximum:()=>pn,Mean:()=>Js,Min:()=>ta,Minimum:()=>un,MirrorPad:()=>ea,Mod:()=>mn,MomentumOptimizer:()=>jn,Multinomial:()=>ra,Multiply:()=>fn,Neg:()=>oa,NonMaxSuppressionV3:()=>na,NonMaxSuppressionV4:()=>sa,NonMaxSuppressionV5:()=>aa,NotEqual:()=>dn,OP_SCOPE_SUFFIX:()=>xp,OneHot:()=>ca,OnesLike:()=>ia,Optimizer:()=>Ne,OptimizerConstructors:()=>sr,Pack:()=>la,PadV2:()=>pa,Pool:()=>R$,Pow:()=>hn,Prelu:()=>ua,Prod:()=>ma,RMSPropOptimizer:()=>Yn,RaggedGather:()=>fa,RaggedTensorToTensor:()=>da,Range:()=>ha,Rank:()=>hp,Real:()=>ga,RealDiv:()=>Go,Reciprocal:()=>gn,Reduction:()=>Kt,Relu:()=>xn,Relu6:()=>yn,Reshape:()=>xa,ResizeBilinear:()=>ba,ResizeBilinearGrad:()=>Bc,ResizeNearestNeighbor:()=>ya,ResizeNearestNeighborGrad:()=>Mc,Reverse:()=>Ca,RotateWithOffset:()=>Ua,Round:()=>bn,Rsqrt:()=>Cn,SGDOptimizer:()=>Kr,ScatterNd:()=>Ta,SearchSorted:()=>Sa,Select:()=>wa,Selu:()=>Tn,Sigmoid:()=>In,Sign:()=>Nn,Sin:()=>Sn,Sinh:()=>wn,Slice:()=>Na,Softmax:()=>Ea,Softplus:()=>vn,SpaceToBatchND:()=>va,SparseFillEmptyRows:()=>$a,SparseReshape:()=>Ra,SparseSegmentMean:()=>Aa,SparseSegmentSum:()=>Fa,SparseToDense:()=>Da,SplitV:()=>ka,Sqrt:()=>kn,Square:()=>Vc,SquaredDifference:()=>En,Step:()=>Fn,StridedSlice:()=>_a,StringNGrams:()=>Oa,StringSplit:()=>Pa,StringToHashBucketFast:()=>La,Sub:()=>$n,Sum:()=>Ia,Tan:()=>Rn,Tanh:()=>An,Tensor:()=>Ft,TensorBuffer:()=>$t,Tile:()=>so,TopK:()=>Ma,Transform:()=>Ba,Transpose:()=>ao,Unique:()=>Va,Unpack:()=>za,UnsortedSegmentSum:()=>Wa,UpperBound:()=>A$,Variable:()=>Pr,ZerosLike:()=>Ga,_FusedMatMul:()=>Dn,abs:()=>ce,acos:()=>Ed,acosh:()=>$d,add:()=>nt,addN:()=>Rd,all:()=>Ad,any:()=>Fd,argMax:()=>Dd,argMin:()=>_d,asin:()=>Od,asinh:()=>Pd,atan:()=>Ld,atan2:()=>Md,atanh:()=>Bd,avgPool:()=>ol,avgPool3d:()=>Gd,backend:()=>K2,backend_util:()=>I,basicLSTMCell:()=>Ud,batchNorm:()=>uo,batchNorm2d:()=>Hd,batchNorm3d:()=>Kd,batchNorm4d:()=>qd,batchToSpaceND:()=>nl,bincount:()=>sl,booleanMaskAsync:()=>N0,broadcastArgs:()=>Xd,broadcastTo:()=>mo,broadcast_util:()=>Tr,browser:()=>bd,buffer:()=>et,cast:()=>St,ceil:()=>jd,clipByValue:()=>Yd,clone:()=>Fe,complex:()=>ke,concat:()=>Pt,concat1d:()=>Zd,concat2d:()=>Qd,concat3d:()=>Jd,concat4d:()=>th,conv1d:()=>eh,conv2d:()=>fo,conv2dTranspose:()=>rh,conv3d:()=>oh,conv3dTranspose:()=>nh,copyRegisteredKernels:()=>P$,cos:()=>sh,cosh:()=>ah,cosineWindow:()=>Qi,cumprod:()=>ih,cumsum:()=>ch,customGrad:()=>Se,denseBincount:()=>lh,deprecationWarn:()=>Ob,depthToSpace:()=>ph,depthwiseConv2d:()=>ri,device_util:()=>io,diag:()=>uh,dilation2d:()=>mh,disableDeprecationWarnings:()=>O2,dispose:()=>Qt,disposeVariables:()=>P2,div:()=>Ct,divNoNan:()=>fh,dot:()=>dh,dropout:()=>A0,einsum:()=>hh,elu:()=>il,enableDebugMode:()=>_2,enableProdMode:()=>D2,enclosingPowerOfTwo:()=>Wp,engine:()=>Cr,env:()=>F,equal:()=>al,erf:()=>gh,euclideanNorm:()=>yh,exp:()=>Xe,expandDims:()=>Gr,expm1:()=>bh,eye:()=>cl,fft:()=>ai,fill:()=>wr,findBackend:()=>U2,findBackendFactory:()=>H2,floor:()=>ll,floorDiv:()=>rl,fused:()=>Gp,gather:()=>pl,gatherND:()=>$0,gather_util:()=>Cd,getBackend:()=>W2,getGradient:()=>pp,getKernel:()=>_i,getKernelsForBackend:()=>Wc,grad:()=>s0,grads:()=>a0,greater:()=>zn,greaterEqual:()=>ul,ifft:()=>Un,imag:()=>po,image:()=>NC,inTopKAsync:()=>F0,io:()=>Ki,irfft:()=>El,isFinite:()=>Ch,isInf:()=>Th,isNaN:()=>Sh,keep:()=>Be,kernel_impls:()=>ue,leakyRelu:()=>ml,less:()=>wh,lessEqual:()=>oi,linalg:()=>IC,linspace:()=>Nh,localResponseNormalization:()=>Ih,log:()=>Ur,log1p:()=>fl,logSigmoid:()=>vh,logSoftmax:()=>kh,logSumExp:()=>hl,logicalAnd:()=>Wn,logicalNot:()=>gl,logicalOr:()=>xl,logicalXor:()=>Eh,losses:()=>vC,lowerBound:()=>$h,matMul:()=>wt,math:()=>yd,max:()=>Nr,maxPool:()=>yl,maxPool3d:()=>Rh,maxPoolWithArgmax:()=>Ah,maximum:()=>bl,mean:()=>Gn,memory:()=>L2,meshgrid:()=>Fh,min:()=>Yi,minimum:()=>Cl,mirrorPad:()=>Dh,mod:()=>_h,moments:()=>Oh,movingAverage:()=>I0,mul:()=>q,multiRNNCell:()=>Ph,multinomial:()=>Lh,neg:()=>Ce,nextFrame:()=>jp,norm:()=>Vn,notEqual:()=>Tl,oneHot:()=>qi,ones:()=>Ir,onesLike:()=>Mh,op:()=>N,outerProduct:()=>Bh,pad:()=>vr,pad1d:()=>Vh,pad2d:()=>zh,pad3d:()=>Wh,pad4d:()=>Gh,pool:()=>Uh,pow:()=>Wr,prelu:()=>wl,print:()=>Yc,prod:()=>Hh,profile:()=>M2,raggedGather:()=>Kh,raggedTensorToTensor:()=>qh,rand:()=>Xh,randomGamma:()=>rg,randomNormal:()=>Nl,randomStandardNormal:()=>og,randomUniform:()=>Il,range:()=>xo,ready:()=>z2,real:()=>Vr,reciprocal:()=>ng,registerBackend:()=>Jc,registerGradient:()=>D$,registerKernel:()=>Oi,relu:()=>yo,relu6:()=>vl,removeBackend:()=>G2,reshape:()=>P,reverse:()=>Ve,reverse1d:()=>sg,reverse2d:()=>ag,reverse3d:()=>ig,reverse4d:()=>cg,rfft:()=>ii,round:()=>kl,rsqrt:()=>lg,scalar:()=>at,scatterND:()=>v0,scatter_util:()=>Rp,searchSorted:()=>Zi,selu:()=>pg,separableConv2d:()=>ug,serialization:()=>wd,setBackend:()=>V2,setPlatform:()=>q2,setdiff1dAsync:()=>mg,sigmoid:()=>Sr,sign:()=>fg,signal:()=>wC,sin:()=>dg,sinh:()=>hg,slice:()=>Tt,slice1d:()=>gg,slice2d:()=>xg,slice3d:()=>yg,slice4d:()=>bg,slice_util:()=>ne,softmax:()=>Cg,softplus:()=>dl,spaceToBatchND:()=>Sl,sparse:()=>kC,sparseToDense:()=>E0,spectral:()=>SC,split:()=>Hr,sqrt:()=>$e,square:()=>le,squaredDifference:()=>$l,squeeze:()=>ci,stack:()=>we,step:()=>Rl,stridedSlice:()=>Tg,string:()=>EC,sub:()=>pt,sum:()=>Et,sumOutType:()=>Mn,tan:()=>Sg,tanh:()=>ji,tensor:()=>be,tensor1d:()=>he,tensor2d:()=>bo,tensor3d:()=>tl,tensor4d:()=>wg,tensor5d:()=>Ng,tensor6d:()=>Ig,tensor_util:()=>Qf,test_util:()=>kd,tidy:()=>ft,tile:()=>go,time:()=>B2,topk:()=>vg,train:()=>eO,transpose:()=>Za,truncatedNormal:()=>kg,unique:()=>Eg,unregisterGradient:()=>O$,unregisterKernel:()=>_$,unsortedSegmentSum:()=>$g,unstack:()=>ze,upcastType:()=>Yt,upperBound:()=>Rg,util:()=>y,valueAndGrad:()=>i0,valueAndGrads:()=>c0,variable:()=>Ag,variableGrads:()=>_p,version_core:()=>Qb,where:()=>or,whereAsync:()=>Al,zeros:()=>je,zerosLike:()=>ee});var Ro=class{constructor(t,e){this.backend=t,this.dataMover=e,this.data=new WeakMap,this.dataIdsCount=0}get(t){return this.data.has(t)||this.dataMover.moveData(this.backend,t),this.data.get(t)}set(t,e){this.dataIdsCount++,this.data.set(t,e)}has(t){return this.data.has(t)}delete(t){return this.dataIdsCount--,this.data.delete(t)}numDataIds(){return this.dataIdsCount}},Ar=class{refCount(t){return Ke("refCount")}incRef(t){return Ke("incRef")}timerAvailable(){return!0}time(t){return Ke("time")}read(t){return Ke("read")}readSync(t){return Ke("readSync")}readToGPU(t,e){return Ke("readToGPU")}numDataIds(){return Ke("numDataIds")}disposeData(t,e){return Ke("disposeData")}write(t,e,o){return Ke("write")}move(t,e,o,n,s){return Ke("move")}memory(){return Ke("memory")}floatPrecision(){return Ke("floatPrecision")}epsilon(){return this.floatPrecision()===32?1e-7:1e-4}dispose(){return Ke("dispose")}};function Ke(r){throw new Error(`'${r}' not yet implemented or not found in the registry. This kernel may not be supported by the tfjs backend you have chosen`)}function Ry(r){let t=r.length,e=0;for(;t>0;)e=Math.random()*t|0,t--,sp(r,t,e)}function a$(r,t){if(r.length!==t.length)throw new Error(`Array sizes must match to be shuffled together First array length was ${r.length}Second array length was ${t.length}`);let e=r.length,o=0;for(;e>0;)o=Math.random()*e|0,e--,sp(r,e,o),sp(t,e,o)}function ki(r,t,e){return Math.max(r,Math.min(t,e))}function i$(r){return r%2===0?r:r+1}function sp(r,t,e){let o=r[t];r[t]=r[e],r[e]=o}function c$(r){let t=0;for(let e=0;e<r.length;e++)t+=r[e];return t}function l$(r,t){let e=Math.random();return t*e+(1-e)*r}function p$(r,t){let e=0;for(let o=0;o<r.length;o++){let n=Number(r[o])-Number(t[o]);e+=n*n}return e}function E(r,t){if(!r)throw new Error(typeof t=="string"?t:t())}function Lt(r,t,e=""){E(Oe(r,t),()=>e+` Shapes ${r} and ${t} must match`)}function qe(r){E(r!=null,()=>"The input to the tensor constructor must be a non-null value.")}function hr(r,t=[],e=!1){if(t==null&&(t=[]),Array.isArray(r)||oe(r)&&!e)for(let o=0;o<r.length;++o)hr(r[o],t,e);else t.push(r);return t}function bt(r){if(r.length===0)return 1;let t=r[0];for(let e=1;e<r.length;e++)t*=r[e];return t}function u$(r){return r.length===0}function Oe(r,t){if(r===t)return!0;if(r==null||t==null||r.length!==t.length)return!1;for(let e=0;e<r.length;e++)if(r[e]!==t[e])return!1;return!0}function ro(r){return r%1===0}function m$(r){if(Math.tanh!=null)return Math.tanh(r);if(r===1/0)return 1;if(r===-1/0)return-1;{let t=Math.exp(2*r);return(t-1)/(t+1)}}function f$(r){let t=Math.ceil(Math.sqrt(r));return[t,Math.ceil(r/t)]}function d$(r){let t=new Uint32Array(r);for(let e=0;e<r;++e)t[e]=e;return Ry(t),t}function ss(r,t){return t<=r.length?r:r+" ".repeat(t-r.length)}function h$(r,t=n=>0,e,o=setTimeout){return new Promise((n,s)=>{let a=0,i=()=>{if(r()){n();return}a++;let c=t(a);if(e!=null&&a>=e){s();return}o(i,c)};i()})}function g$(r,t){let e=1,o=-1;for(let s=0;s<r.length;++s)if(r[s]>=0)e*=r[s];else if(r[s]===-1){if(o!==-1)throw Error(`Shapes can only have 1 implicit size. Found -1 at dim ${o} and dim ${s}`);o=s}else if(r[s]<0)throw Error(`Shapes can not be < 0. Found ${r[s]} at dim ${s}`);if(o===-1){if(t>0&&t!==e)throw Error(`Size(${t}) must match the product of shape ${r}`);return r}if(e===0)throw Error(`Cannot infer the missing size in [${r}] when there are 0 elements`);if(t%e!==0)throw Error(`The implicit shape can't be a fractional number. Got ${t} / ${e}`);let n=r.slice();return n[o]=t/e,n}function Ao(r,t){let e=t.length;return r=r==null?t.map((o,n)=>n):[].concat(r),E(r.every(o=>o>=-e&&o<e),()=>`All values in axis param must be in range [-${e}, ${e}) but got axis ${r}`),E(r.every(o=>ro(o)),()=>`All values in axis param must be integers but got axis ${r}`),r.map(o=>o<0?e+o:o)}function Ff(r,t){let e=[],o=[],n=t!=null&&Array.isArray(t)&&t.length===0,s=t==null||n?null:Ao(t,r).sort(),a=0;for(let i=0;i<r.length;++i){if(s!=null){if(s[a]===i&&r[i]!==1)throw new Error(`Can't squeeze axis ${i} since its dim '${r[i]}' is not 1`);(s[a]==null||s[a]>i)&&r[i]===1&&(e.push(r[i]),o.push(i)),s[a]<=i&&a++}r[i]!==1&&(e.push(r[i]),o.push(i))}return{newShape:e,keptDims:o}}function Df(r,t){let e=null;if(r==null||r==="float32")e=new Float32Array(t);else if(r==="int32")e=new Int32Array(t);else if(r==="bool")e=new Uint8Array(t);else throw new Error(`Unknown data type ${r}`);return e}function _f(r,t){let e=null;if(r==null||r==="float32")e=new Float32Array(t);else if(r==="int32")e=new Int32Array(t);else if(r==="bool")e=new Uint8Array(t);else if(r==="string")e=new Array(t);else throw new Error(`Unknown data type ${r}`);return e}function Of(r,t){for(let e=0;e<r.length;e++){let o=r[e];if(isNaN(o)||!isFinite(o))throw Error(`A tensor of type ${t} being uploaded contains ${o}.`)}}function Pf(r){return r==="bool"||r==="complex64"||r==="float32"||r==="int32"||r==="string"}function x$(r,t){return!(t==="complex64"||t==="float32"&&r!=="complex64"||t==="int32"&&r!=="float32"&&r!=="complex64"||t==="bool"&&r==="bool")}function oe(r){return r instanceof Float32Array||r instanceof Int32Array||r instanceof Uint8Array||r instanceof Uint8ClampedArray}function ap(r){if(r==="float32"||r==="int32")return 4;if(r==="complex64")return 8;if(r==="bool")return 1;throw new Error(`Unknown dtype ${r}`)}function Lf(r){if(r==null)return 0;let t=0;return r.forEach(e=>t+=e.length),t}function gr(r){return typeof r=="string"||r instanceof String}function Ay(r){return typeof r=="boolean"}function Fy(r){return typeof r=="number"}function Ei(r){return Array.isArray(r)?Ei(r[0]):r instanceof Float32Array?"float32":r instanceof Int32Array||r instanceof Uint8Array||r instanceof Uint8ClampedArray?"int32":Fy(r)?"float32":gr(r)?"string":Ay(r)?"bool":"float32"}function Fr(r){return!!(r&&r.constructor&&r.call&&r.apply)}function $i(r,t){for(let e=t;e<r;++e)if(r%e===0)return e;return r}function Dr(r){let t=r.length;if(t<2)return[];let e=new Array(t-1);e[t-2]=r[t-1];for(let o=t-3;o>=0;--o)e[o]=e[o+1]*r[o+1];return e}function Dy(r,t,e,o=!1){let n=new Array;if(t.length===1){let s=t[0]*(o?2:1);for(let a=0;a<s;a++)n[a]=e[r+a]}else{let s=t[0],a=t.slice(1),i=a.reduce((c,l)=>c*l)*(o?2:1);for(let c=0;c<s;c++)n[c]=Dy(r+c*i,a,e,o)}return n}function ns(r,t,e=!1){if(r.length===0)return t[0];let o=r.reduce((n,s)=>n*s)*(e?2:1);if(o===0)return[];if(o!==t.length)throw new Error(`[${r}] does not match the input size ${t.length}${e?" for a complex tensor":""}.`);return Dy(0,r,t,e)}function kc(r,t){let e=Ri(r,t);for(let o=0;o<e.length;o++)e[o]=1;return e}function Ri(r,t){if(t==null||t==="float32"||t==="complex64")return new Float32Array(r);if(t==="int32")return new Int32Array(r);if(t==="bool")return new Uint8Array(r);throw new Error(`Unknown data type ${t}`)}function y$(r,t){let e=r.reduce((o,n)=>o*n,1);if(t==null||t==="float32")return ns(r,new Float32Array(e));if(t==="int32")return ns(r,new Int32Array(e));if(t==="bool")return ns(r,new Uint8Array(e));throw new Error(`Unknown data type ${t}`)}function Ec(r){r.forEach(t=>{E(Number.isInteger(t)&&t>=0,()=>`Tensor must have a shape comprised of positive integers but got shape [${r}].`)})}function b$(r,t,e){if(t===0)return 0;if(t===1)return r[0];let o=r[r.length-1];for(let n=0;n<r.length-1;++n)o+=e[n]*r[n];return o}function C$(r,t,e){if(t===0)return[];if(t===1)return[r];let o=new Array(t);for(let n=0;n<o.length-1;++n)o[n]=Math.floor(r/e[n]),r-=o[n]*e[n];return o[o.length-1]=r,o}function $c(r){return r&&r.then&&typeof r.then=="function"}var _y="tfjsflags",Ai=class{constructor(t){this.global=t,this.flags={},this.flagRegistry={},this.urlFlags={},this.getQueryParams=S$,this.populateURLFlags()}setPlatform(t,e){this.platform!=null&&(F().getBool("IS_TEST")||F().getBool("PROD")||console.warn(`Platform ${this.platformName} has already been set. Overwriting the platform with ${t}.`)),this.platformName=t,this.platform=e}registerFlag(t,e,o){if(this.flagRegistry[t]={evaluationFn:e,setHook:o},this.urlFlags[t]!=null){let n=this.urlFlags[t];F().getBool("IS_TEST")||F().getBool("PROD")||console.warn(`Setting feature override from URL ${t}: ${n}.`),this.set(t,n)}}async getAsync(t){return t in this.flags?this.flags[t]:(this.flags[t]=await this.evaluateFlag(t),this.flags[t])}get(t){if(t in this.flags)return this.flags[t];let e=this.evaluateFlag(t);if($c(e))throw new Error(`Flag ${t} cannot be synchronously evaluated. Please use getAsync() instead.`);return this.flags[t]=e,this.flags[t]}getNumber(t){return this.get(t)}getBool(t){return this.get(t)}getFlags(){return this.flags}get features(){return this.flags}set(t,e){if(this.flagRegistry[t]==null)throw new Error(`Cannot set flag ${t} as it has not been registered.`);this.flags[t]=e,this.flagRegistry[t].setHook!=null&&this.flagRegistry[t].setHook(e)}evaluateFlag(t){if(this.flagRegistry[t]==null)throw new Error(`Cannot evaluate flag '${t}': no evaluation function found.`);return this.flagRegistry[t].evaluationFn()}setFlags(t){this.flags=Object.assign({},t)}reset(){this.flags={},this.urlFlags={},this.populateURLFlags()}populateURLFlags(){if(typeof this.global>"u"||typeof this.global.location>"u"||typeof this.global.location.search>"u")return;let t=this.getQueryParams(this.global.location.search);_y in t&&t[_y].split(",").forEach(o=>{let[n,s]=o.split(":");this.urlFlags[n]=N$(n,s)})}};function S$(r){let t={};return r.replace(/[?&]([^=?&]+)(?:=([^&]*))?/g,(e,...o)=>(w$(t,o[0],o[1]),o.join("="))),t}function w$(r,t,e){r[decodeURIComponent(t)]=decodeURIComponent(e||"")}function N$(r,t){if(t=t.toLowerCase(),t==="true"||t==="false")return t==="true";if(`${+t}`===t)return+t;throw new Error(`Could not parse value flag value ${t} for flag ${r}.`)}function F(){return ip}var ip=null;function Oy(r){ip=r}var Mf;function Bf(){if(Mf==null){let r;if(typeof window<"u")r=window;else if(typeof global<"u")r=global;else if(typeof process<"u")r=process;else if(typeof self<"u")r=self;else throw new Error("Could not find a global object");Mf=r}return Mf}function I$(){let r=Bf();return r._tfGlobals==null&&(r._tfGlobals=new Map),r._tfGlobals}function Rc(r,t){let e=I$();if(e.has(r))return e.get(r);{let o=t();return e.set(r,o),e.get(r)}}var as="Abs",Fo="Acos",Do="Acosh",_r="Add",is="AddN",cs="All",ls="Any",ps="ArgMax",us="ArgMin",_o="Asin",Oo="Asinh",Po="Atan",Lo="Atanh",Mo="Atan2",ms="AvgPool",Ac="AvgPoolGrad",fs="AvgPool3D",Fc="AvgPool3DGrad",ds="BatchMatMul",hs="BatchToSpaceND",gs="Bincount",v$="BroadcastTo",xs="BroadcastArgs",oo="Cast",Bo="Ceil",Vo="ClipByValue",ys="Complex",bs="ComplexAbs",Cs="Concat",Ts="Conv2D",Ss="Conv2DBackpropFilter",ws="Conv2DBackpropInput",Ns="Conv3D",Dc="Conv3DBackpropFilterV2",Is="Conv3DBackpropInputV2",zo="Cos",Wo="Cosh",vs="Cumprod",ks="Cumsum",Es="CropAndResize",$s="DenseBincount",Rs="DepthToSpace",As="DepthwiseConv2dNative",Fs="DepthwiseConv2dNativeBackpropFilter",Ds="DepthwiseConv2dNativeBackpropInput",_s="Diag",Os="Dilation2D",cp="Dilation2DBackpropInput",lp="Dilation2DBackpropFilter",Go="RealDiv",Ps="Einsum",Uo="Elu",_c="EluGrad",Ho="Erf",Ko="Equal",qo="Exp",Ls="ExpandDims",Xo="Expm1",Ms="FFT",Bs="Fill",Vs="FlipLeftRight",jo="Floor",Yo="FloorDiv",zs="FusedBatchNorm",Ws="GatherV2",Gs="GatherNd",Zo="Greater",Qo="GreaterEqual",no="Identity",Us="IFFT",Hs="Imag",Jo="IsFinite",tn="IsInf",en="IsNan",Ks="LeakyRelu",rn="Less",on="LessEqual",qs="LinSpace",nn="Log",sn="Log1p",an="LogicalAnd",cn="LogicalNot",ln="LogicalOr",k$="LogicalXor",E$="LogSoftmax",$$="LowerBound",Xs="LRN",Oc="LRNGrad",js="Max",pn="Maximum",Ys="MaxPool",Pc="MaxPoolGrad",Zs="MaxPool3D",Lc="MaxPool3DGrad",Qs="MaxPoolWithArgmax",Js="Mean",ta="Min",un="Minimum",ea="MirrorPad",mn="Mod",ra="Multinomial",fn="Multiply",oa="Neg",dn="NotEqual",na="NonMaxSuppressionV3",sa="NonMaxSuppressionV4",aa="NonMaxSuppressionV5",ia="OnesLike",ca="OneHot",la="Pack",pa="PadV2",R$="Pool",hn="Pow",ua="Prelu",ma="Prod",fa="RaggedGather",da="RaggedTensorToTensor",ha="Range",ga="Real",gn="Reciprocal",xn="Relu",xa="Reshape",ya="ResizeNearestNeighbor",Mc="ResizeNearestNeighborGrad",ba="ResizeBilinear",Bc="ResizeBilinearGrad",yn="Relu6",Ca="Reverse",bn="Round",Cn="Rsqrt",Ta="ScatterNd",Sa="SearchSorted",wa="Select",Tn="Selu",Na="Slice",Sn="Sin",wn="Sinh",Nn="Sign",In="Sigmoid",vn="Softplus",kn="Sqrt",Ia="Sum",va="SpaceToBatchND",ka="SplitV",Ea="Softmax",$a="SparseFillEmptyRows",Ra="SparseReshape",Aa="SparseSegmentMean",Fa="SparseSegmentSum",Da="SparseToDense",En="SquaredDifference",Vc="Square",_a="StridedSlice",Oa="StringNGrams",Pa="StringSplit",La="StringToHashBucketFast",$n="Sub",Rn="Tan",An="Tanh",so="Tile",Ma="TopK",Ba="Transform",ao="Transpose",Va="Unique",za="Unpack",Wa="UnsortedSegmentSum",A$="UpperBound",Ga="ZerosLike",Fn="Step",Fi="FromPixels",Ua="RotateWithOffset",Dn="_FusedMatMul",_n="FusedConv2D",On="FusedDepthwiseConv2D";function Or(...r){F().getBool("IS_TEST")||F().getBool("PROD")||console.warn(...r)}function F$(...r){F().getBool("IS_TEST")||F().getBool("PROD")||console.log(...r)}var Di=Rc("kernelRegistry",()=>new Map),zc=Rc("gradRegistry",()=>new Map);function _i(r,t){let e=Vf(r,t);return Di.get(e)}function pp(r){return zc.get(r)}function Wc(r){let t=Di.entries(),e=[];for(;;){let{done:o,value:n}=t.next();if(o)break;let[s,a]=n,[i]=s.split("_");i===r&&e.push(a)}return e}function Oi(r){let{kernelName:t,backendName:e}=r,o=Vf(t,e);Di.has(o)&&Or(`The kernel '${t}' for backend '${e}' is already registered`),Di.set(o,r)}function D$(r){let{kernelName:t}=r;zc.has(t)&&F().getBool("DEBUG")&&Or(`Overriding the gradient for '${t}'`),zc.set(t,r)}function _$(r,t){let e=Vf(r,t);if(!Di.has(e))throw new Error(`The kernel '${r}' for backend '${t}' is not registered`);Di.delete(e)}function O$(r){if(!zc.has(r))throw new Error(`The gradient '${r}' for backend is not registered`);zc.delete(r)}function P$(r,t){Wc(r).forEach(o=>{let n=Object.assign({},o,{backendName:t});Oi(n)})}function Vf(r,t){return`${t}_${r}`}var y={};It(y,{arraysEqual:()=>Oe,assert:()=>E,assertNonNegativeIntegerDimensions:()=>Ec,assertNonNull:()=>qe,assertShapesMatch:()=>Lt,bytesFromStringArray:()=>Lf,bytesPerElement:()=>ap,checkConversionForErrors:()=>Of,clamp:()=>ki,computeStrides:()=>Dr,createScalarValue:()=>G$,createShuffledIndices:()=>d$,decodeString:()=>Bi,distSquared:()=>p$,encodeString:()=>Ln,fetch:()=>H$,fingerPrint64:()=>W$,flatten:()=>hr,getArrayFromDType:()=>_f,getTypedArrayFromDType:()=>Df,hasEncodingLoss:()=>x$,hexToLong:()=>Gc,indexToLoc:()=>C$,inferDtype:()=>Ei,inferFromImplicitShape:()=>g$,isBoolean:()=>Ay,isFunction:()=>Fr,isInt:()=>ro,isNumber:()=>Fy,isPromise:()=>$c,isScalarShape:()=>u$,isString:()=>gr,isTypedArray:()=>oe,isValidDtype:()=>Pf,locToIndex:()=>b$,makeOnesTypedArray:()=>kc,makeZerosNestedTypedArray:()=>y$,makeZerosTypedArray:()=>Ri,nearestDivisor:()=>$i,nearestLargerEven:()=>i$,now:()=>ja,parseAxisParam:()=>Ao,randUniform:()=>l$,repeatedTry:()=>h$,rightPad:()=>ss,shuffle:()=>Ry,shuffleCombo:()=>a$,sizeFromShape:()=>bt,sizeToSquarishShape:()=>f$,squeezeShape:()=>Ff,sum:()=>c$,swap:()=>sp,tanh:()=>m$,toNestedArray:()=>ns,toTypedArray:()=>Mi});var Uf=Af(qy());var Xa=Uf.default||Uf;function Gc(r){return Xa.fromString(r,!0,16)}var jy=Gc("c3a5c85c97cb3127"),qa=Gc("b492b66fbe98f273"),ve=Gc("9ae16a3b2f90404f");function Gf(r){return r.xor(r.shru(47))}function Yy(r,t,e){let o=r.slice(t,t+e);return Xa.fromBytes(Array.from(o),!0,!0)}function Vt(r,t){return Yy(r,t,8)}function Xy(r,t){return Yy(r,t,4)}function pe(r,t){return t===0?r:r.shru(t).or(r.shl(64-t))}function Pn(r,t,e=Gc("9ddfea08eb382d69")){let o=r.xor(t).mul(e);o=o.xor(o.shru(47));let n=t.xor(o).mul(e);return n=n.xor(n.shru(47)),n=n.mul(e),n}function M$(r,t,e,o,n,s){n=n.add(r),s=pe(s.add(n).add(o),21);let a=n;return n=n.add(t),n=n.add(e),s=s.add(pe(n,44)),[n.add(o),s.add(a)]}function mp(r,t,e,o){return M$(Vt(r,t),Vt(r,t+8),Vt(r,t+16),Vt(r,t+24),e,o)}function B$(r,t=r.length){if(t>=8){let e=ve.add(t*2),o=Vt(r,0).add(ve),n=Vt(r,t-8),s=pe(n,37).mul(e).add(o),a=pe(o,25).add(n).mul(e);return Pn(s,a,e)}if(t>=4){let e=ve.add(t*2),o=Xy(r,0);return Pn(o.shl(3).add(t),Xy(r,t-4),e)}if(t>0){let e=r[0],o=r[t>>1],n=r[t-1],s=e+(o<<8),a=t+(n<<2);return Gf(ve.mul(s).xor(jy.mul(a))).mul(ve)}return ve}function V$(r,t=r.length){let e=ve.add(t*2),o=Vt(r,0).mul(qa),n=Vt(r,8),s=Vt(r,t-8).mul(e),a=Vt(r,t-16).mul(ve);return Pn(pe(o.add(n),43).add(pe(s,30)).add(a),o.add(pe(n.add(ve),18)).add(s),e)}function z$(r,t=r.length){let e=ve.add(t*2),o=Vt(r,0).mul(ve),n=Vt(r,8),s=Vt(r,t-8).mul(e),a=Vt(r,t-16).mul(ve),i=pe(o.add(n),43).add(pe(s,30)).add(a),c=Pn(i,o.add(pe(n.add(ve),18)).add(s),e),l=Vt(r,16).mul(e),p=Vt(r,24),u=i.add(Vt(r,t-32)).mul(e),m=c.add(Vt(r,t-24)).mul(e);return Pn(pe(l.add(p),43).add(pe(u,30)).add(m),l.add(pe(p.add(o),18)).add(u),e)}function W$(r,t=r.length){let e=Xa.fromNumber(81,!0);if(t<=32)return t<=16?B$(r,t):V$(r,t);if(t<=64)return z$(r,t);let o=e,n=e.mul(qa).add(113),s=Gf(n.mul(ve).add(113)).mul(ve),a=[Xa.UZERO,Xa.UZERO],i=[Xa.UZERO,Xa.UZERO];o=o.mul(ve).add(Vt(r,0));let c=0,l=(t-1>>6)*64,p=l+(t-1&63)-63;do o=pe(o.add(n).add(a[0]).add(Vt(r,c+8)),37).mul(qa),n=pe(n.add(a[1]).add(Vt(r,c+48)),42).mul(qa),o=o.xor(i[1]),n=n.add(a[0]).add(Vt(r,c+40)),s=pe(s.add(i[0]),33).mul(qa),a=mp(r,c,a[1].mul(qa),o.add(i[0])),i=mp(r,c+32,s.add(i[1]),n.add(Vt(r,c+16))),[s,o]=[o,s],c+=64;while(c!==l);let u=qa.add(s.and(255).shl(1));return c=p,i[0]=i[0].add(t-1&63),a[0]=a[0].add(i[0]),i[0]=i[0].add(a[0]),o=pe(o.add(n).add(a[0]).add(Vt(r,c+8)),37).mul(u),n=pe(n.add(a[1]).add(Vt(r,c+48)),42).mul(u),o=o.xor(i[1].mul(9)),n=n.add(a[0].mul(9).add(Vt(r,c+40))),s=pe(s.add(i[0]),33).mul(u),a=mp(r,c,a[1].mul(u),o.add(i[0])),i=mp(r,c+32,s.add(i[1]),n.add(Vt(r,c+16))),[s,o]=[o,s],Pn(Pn(a[0],i[0],u).add(Gf(n).mul(jy)).add(s),Pn(a[1],i[1],u).add(o),u)}function G$(r,t){return t==="string"?Ln(r):Mi([r],t)}function U$(r,t){return r instanceof Float32Array&&t==="float32"||r instanceof Int32Array&&t==="int32"||r instanceof Uint8Array&&t==="bool"}function Mi(r,t){if(t==="string")throw new Error("Cannot convert a string[] to a TypedArray");if(Array.isArray(r)&&(r=hr(r)),F().getBool("DEBUG")&&Of(r,t),U$(r,t))return r;if(t==null||t==="float32"||t==="complex64")return new Float32Array(r);if(t==="int32")return new Int32Array(r);if(t==="bool"){let e=new Uint8Array(r.length);for(let o=0;o<e.length;++o)Math.round(r[o])!==0&&(e[o]=1);return e}else throw new Error(`Unknown data type ${t}`)}function ja(){return F().platform.now()}function H$(r,t){return F().platform.fetch(r,t)}function Ln(r,t="utf-8"){return t=t||"utf-8",F().platform.encode(r,t)}function Bi(r,t="utf-8"){return t=t||"utf-8",F().platform.decode(r,t)}var fp=class{constructor(t,e){this.backendTimer=t,this.logger=e,e==null&&(this.logger=new Hf)}profileKernel(t,e,o){let n,s=()=>{n=o()},a,i=ja();if(this.backendTimer.timerAvailable())a=this.backendTimer.time(s);else{s();for(let l of n)l.dataSync();a=Promise.resolve({kernelMs:ja()-i})}if(F().getBool("CHECK_COMPUTATION_FOR_ERRORS"))for(let l=0;l<n.length;l++){let p=n[l];p.data().then(u=>{K$(u,p.dtype,t)})}return{kernelName:t,outputs:n,inputs:e,timeMs:a.then(l=>l.kernelMs),extraInfo:a.then(l=>l.getExtraProfileInfo!=null?l.getExtraProfileInfo():"")}}logKernelProfile(t){let{kernelName:e,outputs:o,timeMs:n,inputs:s,extraInfo:a}=t;o.forEach(i=>{Promise.all([i.data(),n,a]).then(c=>{this.logger.logKernelProfile(e,i,c[0],c[1],s,c[2])})})}};function K$(r,t,e){if(t!=="float32")return!1;for(let o=0;o<r.length;o++){let n=r[o];if(isNaN(n)||!isFinite(n))return console.warn(`Found ${n} in the result of '${e}'`),!0}return!1}var Hf=class{logKernelProfile(t,e,o,n,s,a){let i=typeof n=="number"?ss(`${n}ms`,9):n.error,c=ss(t,25),l=e.rank,p=e.size,u=ss(e.shape.toString(),14),m="";for(let f in s){let d=s[f];if(d!=null){let g=d.shape||e.shape,h=g.length;m+=`${f}: ${h}D ${h>0?g:""} `}}console.log(`%c${c}	%c${i}	%c${l}D ${u}	%c${p}	%c${m}	%c${a}`,"font-weight:bold","color:red","color:blue","color: orange","color: green","color: steelblue")}};function Zy(r,t,e){let o={},n={};for(let c=0;c<t.length;c++)o[t[c].id]=!0;for(let c=0;c<r.length;c++){let l=r[c],p=l.inputs;for(let u in p){let m=p[u],f=!1;for(let d=0;d<t.length;d++)if(o[m.id]){l.outputs.forEach(g=>o[g.id]=!0),f=!0,n[l.id]=!0;break}if(f)break}}let s={};s[e.id]=!0;let a={};for(let c=r.length-1;c>=0;c--){let l=r[c],p=l.inputs;for(let u=0;u<l.outputs.length;u++)if(s[l.outputs[u].id]){for(let m in p)s[p[m].id]=!0,a[l.id]=!0;break}}let i=[];for(let c=0;c<r.length;c++){let l=r[c];if(n[l.id]&&a[l.id]){let p={};for(let m in l.inputs){let f=l.inputs[m];o[f.id]&&(p[m]=f)}let u=Object.assign({},l);u.inputs=p,u.outputs=l.outputs,i.push(u)}}return i}function Qy(r,t,e,o){for(let n=t.length-1;n>=0;n--){let s=t[n],a=[];if(s.outputs.forEach(c=>{let l=r[c.id];l!=null?a.push(l):a.push(null)}),s.gradient==null)throw new Error(`Cannot compute gradient: gradient function not found for ${s.kernelName}.`);let i=s.gradient(a);for(let c in s.inputs){if(!(c in i))throw new Error(`Cannot backprop through input ${c}. Available gradients found: ${Object.keys(i)}.`);let l=e(()=>i[c]());if(l.dtype!=="float32")throw new Error(`Error in gradient for op ${s.kernelName}. The gradient of input ${c} must have 'float32' dtype, but has '${l.dtype}'`);let p=s.inputs[c];if(!Oe(l.shape,p.shape))throw new Error(`Error in gradient for op ${s.kernelName}. The gradient of input '${c}' has shape '${l.shape}', which does not match the shape of the input '${p.shape}'`);if(r[p.id]==null)r[p.id]=l;else{let u=r[p.id];r[p.id]=o(u,l),u.dispose()}}}}var Jy=20,Uc=3,Kf=7;function tb(r,t,e,o){let n=Dr(t),s=q$(r,t,e,n),a=t.length,i=dp(r,t,e,n,s),c=["Tensor"];return o&&(c.push(`  dtype: ${e}`),c.push(`  rank: ${a}`),c.push(`  shape: [${t}]`),c.push("  values:")),c.push(i.map(l=>"    "+l).join(`
`)),c.join(`
`)}function q$(r,t,e,o){let n=bt(t),s=o[o.length-1],a=new Array(s).fill(0),i=t.length,c=e==="complex64"?Kc(r):r;if(i>1)for(let l=0;l<n/s;l++){let p=l*s;for(let u=0;u<s;u++)a[u]=Math.max(a[u],Hc(c[p+u],0,e).length)}return a}function Hc(r,t,e){let o;return Array.isArray(r)?o=`${parseFloat(r[0].toFixed(Kf))} + ${parseFloat(r[1].toFixed(Kf))}j`:gr(r)?o=`'${r}'`:e==="bool"?o=eb(r):o=parseFloat(r.toFixed(Kf)).toString(),ss(o,t)}function eb(r){return r===0?"false":"true"}function dp(r,t,e,o,n,s=!0){let a=e==="complex64"?2:1,i=t[0],c=t.length;if(c===0){if(e==="complex64"){let g=Kc(r);return[Hc(g[0],0,e)]}return e==="bool"?[eb(r[0])]:[r[0].toString()]}if(c===1){if(i>Jy){let h=Uc*a,x=Array.from(r.slice(0,h)),b=Array.from(r.slice((i-Uc)*a,i*a));return e==="complex64"&&(x=Kc(x),b=Kc(b)),["["+x.map((S,w)=>Hc(S,n[w],e)).join(", ")+", ..., "+b.map((S,w)=>Hc(S,n[i-Uc+w],e)).join(", ")+"]"]}return["["+(e==="complex64"?Kc(r):Array.from(r)).map((h,x)=>Hc(h,n[x],e)).join(", ")+"]"]}let l=t.slice(1),p=o.slice(1),u=o[0]*a,m=[];if(i>Jy){for(let g=0;g<Uc;g++){let h=g*u,x=h+u;m.push(...dp(r.slice(h,x),l,e,p,n,!1))}m.push("...");for(let g=i-Uc;g<i;g++){let h=g*u,x=h+u;m.push(...dp(r.slice(h,x),l,e,p,n,g===i-1))}}else for(let g=0;g<i;g++){let h=g*u,x=h+u;m.push(...dp(r.slice(h,x),l,e,p,n,g===i-1))}let f=c===2?",":"";m[0]="["+m[0]+f;for(let g=1;g<m.length-1;g++)m[g]=" "+m[g]+f;let d=`,
`;for(let g=2;g<c;g++)d+=`
`;return m[m.length-1]=" "+m[m.length-1]+"]"+(s?"":d),m}function Kc(r){let t=[];for(let e=0;e<r.length;e+=2)t.push([r[e],r[e+1]]);return t}var $t=class{constructor(t,e,o){if(this.dtype=e,this.shape=t.slice(),this.size=bt(t),o!=null){let n=o.length;E(n===this.size,()=>`Length of values '${n}' does not match the size inferred by the shape '${this.size}'.`)}if(e==="complex64")throw new Error("complex64 dtype TensorBuffers are not supported. Please create a TensorBuffer for the real and imaginary parts separately and call tf.complex(real, imag).");this.values=o||_f(e,this.size),this.strides=Dr(t)}set(t,...e){e.length===0&&(e=[0]),E(e.length===this.rank,()=>`The number of provided coordinates (${e.length}) must match the rank (${this.rank})`);let o=this.locToIndex(e);this.values[o]=t}get(...t){t.length===0&&(t=[0]);let e=0;for(let n of t){if(n<0||n>=this.shape[e]){let s=`Requested out of range element at ${t}.   Buffer shape=${this.shape}`;throw new Error(s)}e++}let o=t[t.length-1];for(let n=0;n<t.length-1;++n)o+=this.strides[n]*t[n];return this.values[o]}locToIndex(t){if(this.rank===0)return 0;if(this.rank===1)return t[0];let e=t[t.length-1];for(let o=0;o<t.length-1;++o)e+=this.strides[o]*t[o];return e}indexToLoc(t){if(this.rank===0)return[];if(this.rank===1)return[t];let e=new Array(this.shape.length);for(let o=0;o<e.length-1;++o)e[o]=Math.floor(t/this.strides[o]),t-=e[o]*this.strides[o];return e[e.length-1]=t,e}get rank(){return this.shape.length}toTensor(){return yr().makeTensor(this.values,this.shape,this.dtype)}},yr=null,Vi=null,X$=null;function rb(r){yr=r}function ob(r){Vi=r}function nb(r){X$=r}var Ft=class{constructor(t,e,o,n){this.kept=!1,this.isDisposedInternal=!1,this.shape=t.slice(),this.dtype=e||"float32",this.size=bt(t),this.strides=Dr(t),this.dataId=o,this.id=n,this.rankType=this.rank<5?this.rank.toString():"higher"}get rank(){return this.shape.length}async buffer(){let t=await this.data();return Vi.buffer(this.shape,this.dtype,t)}bufferSync(){return Vi.buffer(this.shape,this.dtype,this.dataSync())}async array(){let t=await this.data();return ns(this.shape,t,this.dtype==="complex64")}arraySync(){return ns(this.shape,this.dataSync(),this.dtype==="complex64")}async data(){this.throwIfDisposed();let t=yr().read(this.dataId);if(this.dtype==="string"){let e=await t;try{return e.map(o=>Bi(o))}catch{throw new Error("Failed to decode the string bytes into utf-8. To get the original bytes, call tensor.bytes().")}}return t}dataToGPU(t){return this.throwIfDisposed(),yr().readToGPU(this.dataId,t)}dataSync(){this.throwIfDisposed();let t=yr().readSync(this.dataId);if(this.dtype==="string")try{return t.map(e=>Bi(e))}catch{throw new Error("Failed to decode the string bytes into utf-8. To get the original bytes, call tensor.bytes().")}return t}async bytes(){this.throwIfDisposed();let t=await yr().read(this.dataId);return this.dtype==="string"?t:new Uint8Array(t.buffer)}dispose(){this.isDisposed||(yr().disposeTensor(this),this.isDisposedInternal=!0)}get isDisposed(){return this.isDisposedInternal}throwIfDisposed(){if(this.isDisposed)throw new Error("Tensor is disposed.")}print(t=!1){return Vi.print(this,t)}clone(){return this.throwIfDisposed(),Vi.clone(this)}toString(t=!1){let e=this.dataSync();return tb(e,this.shape,this.dtype,t)}cast(t){return this.throwIfDisposed(),Vi.cast(this,t)}variable(t=!0,e,o){return this.throwIfDisposed(),yr().makeVariable(this,t,e,o)}};Object.defineProperty(Ft,Symbol.hasInstance,{value:r=>!!r&&r.data!=null&&r.dataSync!=null&&r.throwIfDisposed!=null});function j$(){return Rc("Tensor",()=>Ft)}j$();var Pr=class extends Ft{constructor(t,e,o,n){super(t.shape,t.dtype,t.dataId,n),this.trainable=e,this.name=o}assign(t){if(t.dtype!==this.dtype)throw new Error(`dtype of the new value (${t.dtype}) and previous value (${this.dtype}) must match`);if(!Oe(t.shape,this.shape))throw new Error(`shape of the new value (${t.shape}) and previous value (${this.shape}) must match`);yr().disposeTensor(this),this.dataId=t.dataId,yr().incRef(this,null)}dispose(){yr().disposeVariable(this),this.isDisposedInternal=!0}};Object.defineProperty(Pr,Symbol.hasInstance,{value:r=>r instanceof Ft&&r.assign!=null&&r.assign instanceof Function});var Qf={};It(Qf,{assertTypesMatch:()=>Zf,getTensorsInContainer:()=>qc,isTensorInList:()=>Z$,makeTypesMatch:()=>ht});var hp;(function(r){r.R0="R0",r.R1="R1",r.R2="R2",r.R3="R3",r.R4="R4",r.R5="R5",r.R6="R6"})(hp||(hp={}));var qf;(function(r){r.float32="float32",r.int32="int32",r.bool="int32",r.complex64="complex64"})(qf||(qf={}));var Xf;(function(r){r.float32="float32",r.int32="int32",r.bool="bool",r.complex64="complex64"})(Xf||(Xf={}));var jf;(function(r){r.float32="float32",r.int32="float32",r.bool="float32",r.complex64="complex64"})(jf||(jf={}));var Yf;(function(r){r.float32="complex64",r.int32="complex64",r.bool="complex64",r.complex64="complex64"})(Yf||(Yf={}));var Y$={float32:jf,int32:qf,bool:Xf,complex64:Yf};function Yt(r,t){if(r==="string"||t==="string"){if(r==="string"&&t==="string")return"string";throw new Error(`Can not upcast ${r} with ${t}`)}return Y$[r][t]}function Mn(r){return Yt(r,"int32")}function ht(r,t){if(r.dtype===t.dtype)return[r,t];let e=Yt(r.dtype,t.dtype);return[r.cast(e),t.cast(e)]}function Zf(r,t){E(r.dtype===t.dtype,()=>`The dtypes of the first(${r.dtype}) and second(${t.dtype}) input must match`)}function Z$(r,t){return t.some(e=>e.id===r.id)}function qc(r){let t=[];return sb(r,t,new Set),t}function sb(r,t,e){if(r==null)return;if(r instanceof Ft){t.push(r);return}if(!Q$(r))return;let o=r;for(let n in o){let s=o[n];e.has(s)||(e.add(s),sb(s,t,e))}}function Q$(r){return Array.isArray(r)||typeof r=="object"}function Jf(r){return r.kernelName!=null}var gp=class{constructor(){this.registeredVariables={},this.nextTapeNodeId=0,this.numBytes=0,this.numTensors=0,this.numStringTensors=0,this.numDataBuffers=0,this.gradientDepth=0,this.kernelDepth=0,this.scopeStack=[],this.numDataMovesStack=[],this.nextScopeId=0,this.tensorInfo=new WeakMap,this.profiling=!1,this.activeProfile={newBytes:0,newTensors:0,peakBytes:0,kernels:[],result:null,get kernelNames(){return Array.from(new Set(this.kernels.map(t=>t.name)))}}}dispose(){for(let t in this.registeredVariables)this.registeredVariables[t].dispose()}},Xc=class r{constructor(t){this.ENV=t,this.registry={},this.registryFactory={},this.pendingBackendInitId=0,this.state=new gp}async ready(){if(this.pendingBackendInit!=null)return this.pendingBackendInit.then(()=>{});if(this.backendInstance!=null)return;let t=this.getSortedBackends();for(let e=0;e<t.length;e++){let o=t[e];if(await this.initializeBackend(o).success){await this.setBackend(o);return}}throw new Error("Could not initialize any backends, all backend initializations failed.")}get backend(){if(this.pendingBackendInit!=null)throw new Error(`Backend '${this.backendName}' has not yet been initialized. Make sure to await tf.ready() or await tf.setBackend() before calling other methods`);if(this.backendInstance==null){let{name:t,asyncInit:e}=this.initializeBackendsAndReturnBest();if(e)throw new Error(`The highest priority backend '${t}' has not yet been initialized. Make sure to await tf.ready() or await tf.setBackend() before calling other methods`);this.setBackend(t)}return this.backendInstance}backendNames(){return Object.keys(this.registryFactory)}findBackend(t){if(!(t in this.registry))if(t in this.registryFactory){let{asyncInit:e}=this.initializeBackend(t);if(e)return null}else return null;return this.registry[t]}findBackendFactory(t){return t in this.registryFactory?this.registryFactory[t].factory:null}registerBackend(t,e,o=1){return t in this.registryFactory?(Or(`${t} backend was already registered. Reusing existing backend factory.`),!1):(this.registryFactory[t]={factory:e,priority:o},!0)}async setBackend(t){if(this.registryFactory[t]==null)throw new Error(`Backend name '${t}' not found in registry`);if(this.backendName=t,this.registry[t]==null){this.backendInstance=null;let{success:e,asyncInit:o}=this.initializeBackend(t);if(!(o?await e:e))return!1}return this.backendInstance=this.registry[t],this.setupRegisteredKernels(),this.profiler=new fp(this.backendInstance),!0}setupRegisteredKernels(){Wc(this.backendName).forEach(e=>{e.setupFunc!=null&&e.setupFunc(this.backendInstance)})}disposeRegisteredKernels(t){Wc(t).forEach(o=>{o.disposeFunc!=null&&o.disposeFunc(this.registry[t])})}initializeBackend(t){let e=this.registryFactory[t];if(e==null)throw new Error(`Cannot initialize backend ${t}, no registration found.`);try{let o=e.factory();if(o&&!(o instanceof Ar)&&typeof o.then=="function"){let n=++this.pendingBackendInitId,s=o.then(a=>n<this.pendingBackendInitId?!1:(this.registry[t]=a,this.pendingBackendInit=null,!0)).catch(a=>(n<this.pendingBackendInitId||(this.pendingBackendInit=null,Or(`Initialization of backend ${t} failed`),Or(a.stack||a.message)),!1));return this.pendingBackendInit=s,{success:s,asyncInit:!0}}else return this.registry[t]=o,{success:!0,asyncInit:!1}}catch(o){return Or(`Initialization of backend ${t} failed`),Or(o.stack||o.message),{success:!1,asyncInit:!1}}}removeBackend(t){if(!(t in this.registryFactory))throw new Error(`${t} backend not found in registry`);this.backendName===t&&this.pendingBackendInit!=null&&this.pendingBackendInitId++,t in this.registry&&(this.disposeRegisteredKernels(t),this.registry[t].dispose(),delete this.registry[t]),delete this.registryFactory[t],this.backendName===t&&(this.pendingBackendInit=null,this.backendName=null,this.backendInstance=null)}getSortedBackends(){if(Object.keys(this.registryFactory).length===0)throw new Error("No backend found in registry.");return Object.keys(this.registryFactory).sort((t,e)=>this.registryFactory[e].priority-this.registryFactory[t].priority)}initializeBackendsAndReturnBest(){let t=this.getSortedBackends();for(let e=0;e<t.length;e++){let o=t[e],{success:n,asyncInit:s}=this.initializeBackend(o);if(s||n)return{name:o,asyncInit:s}}throw new Error("Could not initialize any backends, all backend initializations failed.")}moveData(t,e){let o=this.state.tensorInfo.get(e),n=o.backend,s=this.readSync(e),a=n.refCount(e);n.disposeData(e,!0),o.backend=t,t.move(e,s,o.shape,o.dtype,a),this.shouldCheckForMemLeaks()&&this.state.numDataMovesStack[this.state.numDataMovesStack.length-1]++}tidy(t,e){let o=null;if(e==null){if(typeof t!="function")throw new Error("Please provide a function to tidy()");e=t}else{if(typeof t!="string"&&!(t instanceof String))throw new Error("When calling with two arguments, the first argument to tidy() must be a string");if(typeof e!="function")throw new Error("When calling with two arguments, the 2nd argument to tidy() must be a function");o=t}let n;return this.scopedRun(()=>this.startScope(o),()=>this.endScope(n),()=>(n=e(),n instanceof Promise&&console.error("Cannot return a Promise inside of tidy."),n))}scopedRun(t,e,o){t();try{let n=o();return e(),n}catch(n){throw e(),n}}nextTensorId(){return r.nextTensorId++}nextVariableId(){return r.nextVariableId++}clone(t){let e=v.runKernel(no,{x:t}),o={x:t},n=a=>({x:()=>{let i="float32",c={x:a},l={dtype:i};return v.runKernel(oo,c,l)}}),s=[];return this.addTapeNode(this.state.activeScope.name,o,[e],n,s,{}),e}runKernel(t,e,o){if(this.backendName==null&&this.backend,!(_i(t,this.backendName)!=null))throw new Error(`Kernel '${t}' not registered for backend '${this.backendName}'`);return this.runKernelFunc({kernelName:t,inputs:e,attrs:o})}shouldCheckForMemLeaks(){return this.ENV.getBool("IS_TEST")}checkKernelForMemLeak(t,e,o){let n=this.backend.numDataIds(),s=0;o.forEach(c=>{s+=c.dtype==="complex64"?3:1});let a=this.state.numDataMovesStack[this.state.numDataMovesStack.length-1],i=n-e-s-a;if(i>0)throw new Error(`Backend '${this.backendName}' has an internal memory leak (${i} data ids) after running '${t}'`)}runKernelFunc(t){let e,o=[],n=this.isTapeOn(),s=this.state.numBytes,a=this.state.numTensors;this.shouldCheckForMemLeaks()&&this.state.numDataMovesStack.push(0);let i;this.backendName==null&&this.backend;let c,l=Jf(t)?t.kernelName:this.state.activeScope!=null?this.state.activeScope.name:"";if(Jf(t)){let{kernelName:d,inputs:g,attrs:h}=t;this.backendName==null&&this.backend;let x=_i(d,this.backendName);E(x!=null,()=>`Cannot find registered kernel '${d}' for backend '${this.backendName}'`),i=()=>{let b=this.backend.numDataIds();c=x.kernelFunc({inputs:g,attrs:h,backend:this.backend});let S=Array.isArray(c)?c:[c];this.shouldCheckForMemLeaks()&&this.checkKernelForMemLeak(d,b,S);let w=S.map(k=>k.rank!=null?k:this.makeTensorFromTensorInfo(k));if(n){let k=this.getTensorsForGradient(d,g,w);o=this.saveTensorsForBackwardMode(k)}return w}}else{let{forwardFunc:d}=t,g=h=>{n&&(o=h.map(x=>this.keep(this.clone(x))))};i=()=>{let h=this.backend.numDataIds();c=this.tidy(()=>d(this.backend,g));let x=Array.isArray(c)?c:[c];return this.shouldCheckForMemLeaks()&&this.checkKernelForMemLeak(l,h,x),x}}let{inputs:p,attrs:u}=t,m=Jf(t)?null:t.backwardsFunc,f;return this.scopedRun(()=>this.state.kernelDepth++,()=>this.state.kernelDepth--,()=>{!this.ENV.getBool("DEBUG")&&!this.state.profiling?e=i():(f=this.profiler.profileKernel(l,p,()=>i()),this.ENV.getBool("DEBUG")&&this.profiler.logKernelProfile(f),e=f.outputs)}),n&&this.addTapeNode(l,p,e,m,o,u),this.state.profiling&&this.state.activeProfile.kernels.push({name:l,bytesAdded:this.state.numBytes-s,totalBytesSnapshot:this.state.numBytes,tensorsAdded:this.state.numTensors-a,totalTensorsSnapshot:this.state.numTensors,inputShapes:Object.keys(p).map(d=>p[d]!=null?p[d].shape:null),outputShapes:e.map(d=>d.shape),kernelTimeMs:f.timeMs,extraInfo:f.extraInfo}),Array.isArray(c)?e:e[0]}saveTensorsForBackwardMode(t){return t.map(o=>this.keep(this.clone(o)))}getTensorsForGradient(t,e,o){let n=pp(t);if(n!=null){let s=n.inputsToSave||[],a=n.outputsToSave||[],i;n.saveAllInputs?(E(Array.isArray(e),()=>"saveAllInputs is true, expected inputs to be an array."),i=Object.keys(e).map(l=>e[l])):i=s.map(l=>e[l]);let c=o.filter((l,p)=>a[p]);return i.concat(c)}return[]}makeTensor(t,e,o,n){if(t==null)throw new Error("Values passed to engine.makeTensor() are null");o=o||"float32",n=n||this.backend;let s=t;o==="string"&&gr(t[0])&&(s=t.map(c=>Ln(c)));let a=n.write(s,e,o),i=new Ft(e,o,a,this.nextTensorId());if(this.trackTensor(i,n),o==="string"){let c=this.state.tensorInfo.get(a),l=Lf(s);this.state.numBytes+=l-c.bytes,c.bytes=l}return i}makeTensorFromDataId(t,e,o,n){o=o||"float32";let s={dataId:t,shape:e,dtype:o};return this.makeTensorFromTensorInfo(s,n)}makeTensorFromTensorInfo(t,e){let{dataId:o,shape:n,dtype:s}=t,a=new Ft(n,s,o,this.nextTensorId());return this.trackTensor(a,e),a}makeVariable(t,e=!0,o,n){o=o||this.nextVariableId().toString(),n!=null&&n!==t.dtype&&(t=t.cast(n));let s=new Pr(t,e,o,this.nextTensorId());if(this.state.registeredVariables[s.name]!=null)throw new Error(`Variable with name ${s.name} was already registered`);return this.state.registeredVariables[s.name]=s,this.incRef(s,this.backend),s}trackTensor(t,e){this.state.numTensors++,t.dtype==="string"&&this.state.numStringTensors++;let o=0;t.dtype!=="complex64"&&t.dtype!=="string"&&(o=t.size*ap(t.dtype)),this.state.numBytes+=o,this.state.tensorInfo.has(t.dataId)||(this.state.numDataBuffers++,this.state.tensorInfo.set(t.dataId,{backend:e||this.backend,dtype:t.dtype,shape:t.shape,bytes:o})),t instanceof Pr||this.track(t)}incRef(t,e){this.trackTensor(t,e),this.backend.incRef(t.dataId)}removeDataId(t,e){this.state.tensorInfo.has(t)&&this.state.tensorInfo.get(t).backend===e&&(this.state.tensorInfo.delete(t),this.state.numDataBuffers--)}disposeTensor(t){if(!this.state.tensorInfo.has(t.dataId))return;let e=this.state.tensorInfo.get(t.dataId);if(this.state.numTensors--,t.dtype==="string"&&(this.state.numStringTensors--,this.state.numBytes-=e.bytes),t.dtype!=="complex64"&&t.dtype!=="string"){let o=t.size*ap(t.dtype);this.state.numBytes-=o}e.backend.disposeData(t.dataId)&&this.removeDataId(t.dataId,e.backend)}disposeVariables(){for(let t in this.state.registeredVariables){let e=this.state.registeredVariables[t];this.disposeVariable(e)}}disposeVariable(t){this.disposeTensor(t),this.state.registeredVariables[t.name]!=null&&delete this.state.registeredVariables[t.name]}memory(){let t=this.backend.memory();return t.numTensors=this.state.numTensors,t.numDataBuffers=this.state.numDataBuffers,t.numBytes=this.state.numBytes,this.state.numStringTensors>0&&(t.unreliable=!0,t.reasons==null&&(t.reasons=[]),t.reasons.push("Memory usage by string tensors is approximate (2 bytes per character)")),t}async profile(t){this.state.profiling=!0;let e=this.state.numBytes,o=this.state.numTensors;this.state.activeProfile.kernels=[],this.state.activeProfile.result=await t(),this.state.profiling=!1,this.state.activeProfile.peakBytes=Math.max(...this.state.activeProfile.kernels.map(n=>n.totalBytesSnapshot)),this.state.activeProfile.newBytes=this.state.numBytes-e,this.state.activeProfile.newTensors=this.state.numTensors-o;for(let n of this.state.activeProfile.kernels)n.kernelTimeMs=await n.kernelTimeMs,n.extraInfo=await n.extraInfo;return this.state.activeProfile}isTapeOn(){return this.state.gradientDepth>0&&this.state.kernelDepth===0}addTapeNode(t,e,o,n,s,a){let i={id:this.state.nextTapeNodeId++,kernelName:t,inputs:e,outputs:o,saved:s},c=pp(t);c!=null&&(n=c.gradFunc),n!=null&&(i.gradient=l=>(l=l.map((p,u)=>{if(p==null){let m=o[u],f=Ri(m.size,m.dtype);return this.makeTensor(f,m.shape,m.dtype)}return p}),n(l.length>1?l:l[0],s,a))),this.state.activeTape.push(i)}keep(t){return t.kept=!0,t}startTape(){this.state.gradientDepth===0&&(this.state.activeTape=[]),this.state.gradientDepth++}endTape(){this.state.gradientDepth--}startScope(t){let e={track:[],name:"unnamed scope",id:this.state.nextScopeId++};t&&(e.name=t),this.state.scopeStack.push(e),this.state.activeScope=e}endScope(t){let e=qc(t),o=new Set(e.map(s=>s.id));for(let s=0;s<this.state.activeScope.track.length;s++){let a=this.state.activeScope.track[s];!a.kept&&!o.has(a.id)&&a.dispose()}let n=this.state.scopeStack.pop();this.state.activeScope=this.state.scopeStack.length===0?null:this.state.scopeStack[this.state.scopeStack.length-1],e.forEach(s=>{!s.kept&&s.scopeId===n.id&&this.track(s)})}gradients(t,e,o,n=!1){if(E(e.length>0,()=>"gradients() received an empty list of xs."),o!=null&&o.dtype!=="float32")throw new Error(`dy must have 'float32' dtype, but has '${o.dtype}'`);let s=this.scopedRun(()=>this.startTape(),()=>this.endTape(),()=>this.tidy("forward",t));E(s instanceof Ft,()=>"The result y returned by f() must be a tensor.");let a=Zy(this.state.activeTape,e,s);if(!n&&a.length===0&&e.length>0)throw new Error("Cannot compute gradient of y=f(x) with respect to x. Make sure that the f you passed encloses all operations that lead from x to y.");return this.tidy("backward",()=>{let i={};i[s.id]=o??J$(s.shape),Qy(i,a,l=>this.tidy(l),t2);let c=e.map(l=>i[l.id]);return this.state.gradientDepth===0&&(this.state.activeTape.forEach(l=>{for(let p of l.saved)p.dispose()}),this.state.activeTape=null),{value:s,grads:c}})}customGrad(t){return E(Fr(t),()=>"The f passed in customGrad(f) must be a function."),(...e)=>{E(e.every(i=>i instanceof Ft),()=>"The args passed in customGrad(f)(x1, x2,...) must all be tensors");let o,n={};e.forEach((i,c)=>{n[c]=i});let s=(i,c)=>(o=t(...e,c),E(o.value instanceof Ft,()=>"The function f passed in customGrad(f) must return an object where `obj.value` is a tensor"),E(Fr(o.gradFunc),()=>"The function f passed in customGrad(f) must return an object where `obj.gradFunc` is a function."),o.value),a=(i,c)=>{let l=o.gradFunc(i,c),p=Array.isArray(l)?l:[l];E(p.length===e.length,()=>"The function f passed in customGrad(f) must return an object where `obj.gradFunc` is a function that returns the same number of tensors as inputs passed to f(...)."),E(p.every(m=>m instanceof Ft),()=>"The function f passed in customGrad(f) must return an object where `obj.gradFunc` is a function that returns a list of only tensors.");let u={};return p.forEach((m,f)=>{u[f]=()=>m}),u};return this.runKernelFunc({forwardFunc:s,backwardsFunc:a,inputs:n})}}readSync(t){return this.state.tensorInfo.get(t).backend.readSync(t)}read(t){return this.state.tensorInfo.get(t).backend.read(t)}readToGPU(t,e){return this.state.tensorInfo.get(t).backend.readToGPU(t,e)}async time(t){let e=ja(),o=await this.backend.time(t);return o.wallMs=ja()-e,o}track(t){return this.state.activeScope!=null&&(t.scopeId=this.state.activeScope.id,this.state.activeScope.track.push(t)),t}get registeredVariables(){return this.state.registeredVariables}reset(){this.pendingBackendInitId++,this.state.dispose(),this.ENV.reset(),this.state=new gp;for(let t in this.registry)this.disposeRegisteredKernels(t),this.registry[t].dispose(),delete this.registry[t];this.backendName=null,this.backendInstance=null,this.pendingBackendInit=null}};Xc.nextTensorId=0;Xc.nextVariableId=0;function J$(r){let t=kc(bt(r),"float32");return v.makeTensor(t,r,"float32")}function td(){let r=Bf();if(r._tfengine==null){let t=new Ai(r);r._tfengine=new Xc(t)}return Oy(r._tfengine.ENV),rb(()=>r._tfengine),r._tfengine}var v=td();function t2(r,t){let e={a:r,b:t};return v.runKernel(_r,e)}var io={};It(io,{isBrowser:()=>rd,isMobile:()=>o2,mockIsMobile:()=>r2});function e2(){return typeof navigator<"u"&&navigator!=null}var ed;function r2(r){ed=r}function o2(r){if(ed!==void 0)return ed;if(r||e2()){if(r||(r=navigator),r.product==="ReactNative")return!0;let t=r.userAgent||r.vendor||(typeof window<"u"?window.opera:"");if(!t){let e=r;return e.userAgentData&&e.userAgentData.mobile}return/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(t)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(t.substr(0,4))}return!1}function rd(){return typeof window<"u"&&window.document!=null||typeof WorkerGlobalScope<"u"}var Me=F();Me.registerFlag("DEBUG",()=>!1,r=>{r&&console.warn("Debugging mode is ON. The output of every math call will be downloaded to CPU and checked for NaNs. This significantly impacts performance.")});Me.registerFlag("IS_BROWSER",()=>rd());Me.registerFlag("IS_NODE",()=>typeof process<"u"&&typeof process.versions<"u"&&typeof process.versions.node<"u");Me.registerFlag("IS_CHROME",()=>typeof navigator<"u"&&navigator!=null&&navigator.userAgent!=null&&/Chrome/.test(navigator.userAgent)&&/Google Inc/.test(navigator.vendor));Me.registerFlag("PROD",()=>!1);Me.registerFlag("TENSORLIKE_CHECK_SHAPE_CONSISTENCY",()=>Me.getBool("DEBUG"));Me.registerFlag("DEPRECATION_WARNINGS_ENABLED",()=>!0);Me.registerFlag("IS_TEST",()=>!1);Me.registerFlag("CHECK_COMPUTATION_FOR_ERRORS",()=>!0);Me.registerFlag("WRAP_TO_IMAGEBITMAP",()=>!1);Me.registerFlag("ENGINE_COMPILE_ONLY",()=>!1);Me.registerFlag("CANVAS2D_WILL_READ_FREQUENTLY_FOR_GPU",()=>!1);Me.registerFlag("USE_SETTIMEOUTCUSTOM",()=>!1);function de(r,t){let e=r;if(oe(r))return t==="string"?[]:[r.length];if(!Array.isArray(r))return[];let o=[];for(;Array.isArray(e)||oe(e)&&t!=="string";)o.push(e.length),e=e[0];return Array.isArray(r)&&F().getBool("TENSORLIKE_CHECK_SHAPE_CONSISTENCY")&&ib(r,o,[]),o}function ib(r,t,e){if(e=e||[],!Array.isArray(r)&&!oe(r)){E(t.length===0,()=>`Element arr[${e.join("][")}] is a primitive, but should be an array/TypedArray of ${t[0]} elements`);return}E(t.length>0,()=>`Element arr[${e.join("][")}] should be a primitive, but is an array of ${r.length} elements`),E(r.length===t[0],()=>`Element arr[${e.join("][")}] should have ${t[0]} elements, but has ${r.length} elements`);let o=t.slice(1);for(let n=0;n<r.length;++n)ib(r[n],o,e.concat(n))}function ab(r,t,e,o){if(r!=="string_or_numeric"){if(r==null)throw new Error("Expected dtype cannot be null.");if(r!=="numeric"&&r!==t||r==="numeric"&&t==="string")throw new Error(`Argument '${e}' passed to '${o}' must be ${r} tensor, but got ${t} tensor`)}}function T(r,t,e,o="numeric"){if(r instanceof Ft)return ab(o,r.dtype,t,e),r;let n=Ei(r);if(n!=="string"&&["bool","int32","float32"].indexOf(o)>=0&&(n=o),ab(o,n,t,e),r==null||!oe(r)&&!Array.isArray(r)&&typeof r!="number"&&typeof r!="boolean"&&typeof r!="string"){let c=r==null?"null":r.constructor.name;throw new Error(`Argument '${t}' passed to '${e}' must be a Tensor or TensorLike, but got '${c}'`)}let s=de(r,n);!oe(r)&&!Array.isArray(r)&&(r=[r]);let i=n!=="string"?Mi(r,n):hr(r,[],!0);return v.makeTensor(i,s,n)}function co(r,t,e,o="numeric"){if(!Array.isArray(r))throw new Error(`Argument ${t} passed to ${e} must be a \`Tensor[]\` or \`TensorLike[]\``);return r.map((s,a)=>T(s,`${t}[${a}]`,e,o))}var xp="__op";function N(r){let t=Object.keys(r);if(t.length!==1)throw new Error(`Please provide an object with a single key (operation name) mapping to a function. Got an object with ${t.length} keys.`);let e=t[0],o=r[e];e.endsWith("_")&&(e=e.substring(0,e.length-1)),e=e+xp;let n=(...s)=>{v.startScope(e);try{let a=o(...s);return $c(a)&&console.error("Cannot return a Promise inside of tidy."),v.endScope(a),a}catch(a){throw v.endScope(null),a}};return Object.defineProperty(n,"name",{value:e,configurable:!0}),n}function n2(r,t){let e=T(r,"real","complex"),o=T(t,"imag","complex");Lt(e.shape,o.shape,`real and imag shapes, ${e.shape} and ${o.shape}, must match in call to tf.complex().`);let n={real:e,imag:o};return v.runKernel(ys,n)}var ke=N({complex_:n2});function Ee(r,t,e,o){if(o==null&&(o=Ei(r)),o==="complex64")throw new Error("Cannot construct a complex64 tensor directly. Please use tf.complex(real, imag).");if(!oe(r)&&!Array.isArray(r)&&typeof r!="number"&&typeof r!="boolean"&&typeof r!="string")throw new Error("values passed to tensor(values) must be a number/boolean/string or an array of numbers/booleans/strings, or a TypedArray");if(t!=null){Ec(t);let n=bt(t),s=bt(e);E(n===s,()=>`Based on the provided shape, [${t}], the tensor should have ${n} values but has ${s}`);for(let a=0;a<e.length;++a){let i=e[a],c=a===e.length-1?i!==bt(t.slice(a)):!0;E(e[a]===t[a]||!c,()=>`Error creating a new Tensor. Inferred shape (${e}) does not match the provided shape (${t}). `)}}return!oe(r)&&!Array.isArray(r)&&(r=[r]),t=t||e,r=o!=="string"?Mi(r,o):hr(r,[],!0),v.makeTensor(r,t,o)}function be(r,t,e){let o=de(r,e);return Ee(r,t,o,e)}var jc={float32:4,float16:2,int32:4,uint16:2,uint8:1,bool:1,complex64:8};var yp=4;async function lb(r,t){let e=[],o=[],n=Array.isArray(r)?r.map(a=>a.name):Object.keys(r);for(let a=0;a<n.length;++a){let i=n[a],c=Array.isArray(r)?r[a].tensor:r[i];if(c.dtype!=="float32"&&c.dtype!=="int32"&&c.dtype!=="bool"&&c.dtype!=="string"&&c.dtype!=="complex64")throw new Error(`Unsupported dtype in weight '${i}': ${c.dtype}`);let l={name:i,shape:c.shape,dtype:c.dtype};if(c.dtype==="string"){let p=new Promise(async u=>{let m=await c.bytes(),f=m.reduce((h,x)=>h+x.length,0)+yp*m.length,d=new Uint8Array(f),g=0;for(let h=0;h<m.length;h++){let x=m[h],b=new Uint8Array(new Uint32Array([x.length]).buffer);d.set(b,g),g+=yp,d.set(x,g),g+=x.length}u(d)});o.push(p)}else o.push(c.data());t!=null&&(l.group=t),e.push(l)}let s=await Promise.all(o);return{data:s2(s),specs:e}}function bp(r,t){let e={},o,n=0;for(let s of t){let a=s.name,i=s.dtype,c=s.shape,l=bt(c),p;if("quantization"in s){let u=s.quantization;if(u.dtype==="uint8"||u.dtype==="uint16"){if(!("min"in u&&"scale"in u))throw new Error(`Weight ${s.name} with quantization ${u.dtype} doesn't have corresponding metadata min and scale.`)}else if(u.dtype==="float16"){if(i!=="float32")throw new Error(`Weight ${s.name} is quantized with ${u.dtype} which only supports weights of type float32 not ${i}.`)}else throw new Error(`Weight ${s.name} has unknown quantization dtype ${u.dtype}. Supported quantization dtypes are: 'uint8', 'uint16', and 'float16'.`);let m=jc[u.dtype],f=r.slice(n,n+l*m),d=u.dtype==="uint8"?new Uint8Array(f):new Uint16Array(f);if(i==="float32")if(u.dtype==="uint8"||u.dtype==="uint16"){p=new Float32Array(d.length);for(let g=0;g<d.length;g++){let h=d[g];p[g]=h*u.scale+u.min}}else if(u.dtype==="float16")o===void 0&&(o=l2()),p=o(d);else throw new Error(`Unsupported quantization type ${u.dtype} for weight type float32.`);else if(i==="int32"){if(u.dtype!=="uint8"&&u.dtype!=="uint16")throw new Error(`Unsupported quantization type ${u.dtype} for weight type int32.`);p=new Int32Array(d.length);for(let g=0;g<d.length;g++){let h=d[g];p[g]=Math.round(h*u.scale+u.min)}}else throw new Error(`Unsupported dtype in weight '${a}': ${i}`);n+=l*m}else if(i==="string"){let u=bt(s.shape);p=[];for(let m=0;m<u;m++){let f=new Uint32Array(r.slice(n,n+yp))[0];n+=yp;let d=new Uint8Array(r.slice(n,n+f));p.push(d),n+=f}}else{let u=jc[i],m=r.slice(n,n+l*u);if(i==="float32")p=new Float32Array(m);else if(i==="int32")p=new Int32Array(m);else if(i==="bool")p=new Uint8Array(m);else if(i==="complex64"){p=new Float32Array(m);let f=new Float32Array(p.length/2),d=new Float32Array(p.length/2);for(let x=0;x<f.length;x++)f[x]=p[x*2],d[x]=p[x*2+1];let g=be(f,c,"float32"),h=be(d,c,"float32");e[a]=ke(g,h),g.dispose(),h.dispose()}else throw new Error(`Unsupported dtype in weight '${a}': ${i}`);n+=l*u}i!=="complex64"&&(e[a]=be(p,c,i))}return e}function s2(r){if(r===null)throw new Error(`Invalid input value: ${JSON.stringify(r)}`);let t=0,e=[];r.forEach(s=>{if(t+=s.byteLength,e.push(s.byteLength===s.buffer.byteLength?s:new s.constructor(s)),!(s instanceof Float32Array||s instanceof Int32Array||s instanceof Uint8Array))throw new Error(`Unsupported TypedArray subtype: ${s.constructor.name}`)});let o=new Uint8Array(t),n=0;return e.forEach(s=>{o.set(new Uint8Array(s.buffer),n),n+=s.byteLength}),o.buffer}var od=typeof Buffer<"u"&&(typeof Blob>"u"||typeof atob>"u"||typeof btoa>"u");function cb(r){return od?Buffer.byteLength(r):new Blob([r]).size}function pb(r){if(od)return Buffer.from(r).toString("base64");let t=new Uint8Array(r),e="";for(let o=0,n=t.length;o<n;o++)e+=String.fromCharCode(t[o]);return btoa(e)}function ub(r){if(od){let o=Buffer.from(r,"base64");return o.buffer.slice(o.byteOffset,o.byteOffset+o.byteLength)}let t=atob(r),e=new Uint8Array(t.length);for(let o=0;o<t.length;++o)e.set([t.charCodeAt(o)],o);return e.buffer}function zi(r){if(r.length===1)return r[0];let t=0;r.forEach(n=>{t+=n.byteLength});let e=new Uint8Array(t),o=0;return r.forEach(n=>{e.set(new Uint8Array(n),o),o+=n.byteLength}),e.buffer}function nd(r){let t="/";for(r=r.trim();r.endsWith(t);)r=r.slice(0,r.length-1);let e=r.split(t);return e[e.length-1]}function Cp(r,t){let e={modelTopology:r.modelTopology,format:r.format,generatedBy:r.generatedBy,convertedBy:r.convertedBy,weightsManifest:t};return r.signature!=null&&(e.signature=r.signature),r.userDefinedMetadata!=null&&(e.userDefinedMetadata=r.userDefinedMetadata),r.modelInitializer!=null&&(e.modelInitializer=r.modelInitializer),r.trainingConfig!=null&&(e.trainingConfig=r.trainingConfig),e}function sd(r,t,e){let o={modelTopology:r.modelTopology,format:r.format,generatedBy:r.generatedBy,convertedBy:r.convertedBy};if(r.trainingConfig!=null&&(o.trainingConfig=r.trainingConfig),r.weightsManifest!=null){if(!t)throw new Error("modelJSON has weightsManifest but weightSpecs is null");if(!e)throw new Error("modelJSON has weightsManifest but weightData is null");o.weightSpecs=t,o.weightData=e}return r.signature!=null&&(o.signature=r.signature),r.userDefinedMetadata!=null&&(o.userDefinedMetadata=r.userDefinedMetadata),r.modelInitializer!=null&&(o.modelInitializer=r.modelInitializer),o}async function Wi(r,t){let e,o;return r.weightsManifest!=null&&([e,o]=await t(r.weightsManifest)),sd(r,e,o)}function Lr(r){if(r.modelTopology instanceof ArrayBuffer)throw new Error("Expected JSON model topology, received ArrayBuffer.");return{dateSaved:new Date,modelTopologyType:"JSON",modelTopologyBytes:r.modelTopology==null?0:cb(JSON.stringify(r.modelTopology)),weightSpecsBytes:r.weightSpecs==null?0:cb(JSON.stringify(r.weightSpecs)),weightDataBytes:r.weightData==null?0:r.weightData.byteLength}}function Tp(r){let t=[];for(let e of r)t.push(...e.weights);return t}function a2(){let r=e=>{let o=e<<13,n=0;for(;!(o&8388608);)n-=8388608,o<<=1;return o&=-8388609,n+=947912704,o|n},t=new Uint32Array(2048);t[0]=0;for(let e=1;e<1024;e++)t[e]=r(e);for(let e=1024;e<2048;e++)t[e]=939524096+(e-1024<<13);return t}function i2(){let r=new Uint32Array(64);r[0]=0,r[31]=1199570944,r[32]=2147483648,r[63]=3347054592;for(let t=1;t<31;t++)r[t]=t<<23;for(let t=33;t<63;t++)r[t]=2147483648+(t-32<<23);return r}function c2(){let r=new Uint32Array(64);for(let t=0;t<64;t++)r[t]=1024;return r[0]=r[32]=0,r}function l2(){let r=a2(),t=i2(),e=c2();return o=>{let n=new ArrayBuffer(4*o.length),s=new Uint32Array(n);for(let a=0;a<o.length;a++){let i=o[a],c=r[e[i>>10]+(i&1023)]+t[i>>10];s[a]=c}return new Float32Array(n)}}var ie=class r{constructor(){this.saveRouters=[],this.loadRouters=[]}static getInstance(){return r.instance==null&&(r.instance=new r),r.instance}static registerSaveRouter(t){r.getInstance().saveRouters.push(t)}static registerLoadRouter(t){r.getInstance().loadRouters.push(t)}static getSaveHandlers(t){return r.getHandlers(t,"save")}static getLoadHandlers(t,e){return r.getHandlers(t,"load",e)}static getHandlers(t,e,o){let n=[];return(e==="load"?r.getInstance().loadRouters:r.getInstance().saveRouters).forEach(a=>{let i=a(t,o);i!==null&&n.push(i)}),n}},mb=r=>ie.registerSaveRouter(r),fb=r=>ie.registerLoadRouter(r),db=r=>ie.getSaveHandlers(r),hb=(r,t)=>ie.getLoadHandlers(r,t);var ad="tensorflowjs",id=1,Ya="models_store",Bn="model_info_store";function gb(){if(!F().getBool("IS_BROWSER"))throw new Error("Failed to obtain IndexedDB factory because the current environmentis not a web browser.");let r=typeof window>"u"?self:window,t=r.indexedDB||r.mozIndexedDB||r.webkitIndexedDB||r.msIndexedDB||r.shimIndexedDB;if(t==null)throw new Error("The current browser does not appear to support IndexedDB.");return t}function cd(r){let t=r.result;t.createObjectStore(Ya,{keyPath:"modelPath"}),t.createObjectStore(Bn,{keyPath:"modelPath"})}var Mr=class{constructor(t){if(this.indexedDB=gb(),t==null||!t)throw new Error("For IndexedDB, modelPath must not be null, undefined or empty.");this.modelPath=t}async save(t){if(t.modelTopology instanceof ArrayBuffer)throw new Error("BrowserLocalStorage.save() does not support saving model topology in binary formats yet.");return this.databaseAction(this.modelPath,t)}async load(){return this.databaseAction(this.modelPath)}databaseAction(t,e){return new Promise((o,n)=>{let s=this.indexedDB.open(ad,id);s.onupgradeneeded=()=>cd(s),s.onsuccess=()=>{let a=s.result;if(e==null){let i=a.transaction(Ya,"readonly"),l=i.objectStore(Ya).get(this.modelPath);l.onsuccess=()=>{if(l.result==null)return a.close(),n(new Error(`Cannot find model with path '${this.modelPath}' in IndexedDB.`));o(l.result.modelArtifacts)},l.onerror=p=>(a.close(),n(l.error)),i.oncomplete=()=>a.close()}else{let i=Lr(e),c=a.transaction(Bn,"readwrite"),l=c.objectStore(Bn),p=l.put({modelPath:this.modelPath,modelArtifactsInfo:i}),u;p.onsuccess=()=>{u=a.transaction(Ya,"readwrite");let f=u.objectStore(Ya).put({modelPath:this.modelPath,modelArtifacts:e,modelArtifactsInfo:i});f.onsuccess=()=>o({modelArtifactsInfo:i}),f.onerror=d=>{l=c.objectStore(Bn);let g=l.delete(this.modelPath);g.onsuccess=()=>(a.close(),n(f.error)),g.onerror=h=>(a.close(),n(f.error))}},p.onerror=m=>(a.close(),n(p.error)),c.oncomplete=()=>{u==null?a.close():u.oncomplete=()=>a.close()}}},s.onerror=a=>n(s.error)})}};Mr.URL_SCHEME="indexeddb://";var xb=r=>F().getBool("IS_BROWSER")&&!Array.isArray(r)&&r.startsWith(Mr.URL_SCHEME)?p2(r.slice(Mr.URL_SCHEME.length)):null;ie.registerSaveRouter(xb);ie.registerLoadRouter(xb);function p2(r){return new Mr(r)}function u2(r){return r.startsWith(Mr.URL_SCHEME)?r.slice(Mr.URL_SCHEME.length):r}var Sp=class{constructor(){this.indexedDB=gb()}async listModels(){return new Promise((t,e)=>{let o=this.indexedDB.open(ad,id);o.onupgradeneeded=()=>cd(o),o.onsuccess=()=>{let n=o.result,s=n.transaction(Bn,"readonly"),i=s.objectStore(Bn).getAll();i.onsuccess=()=>{let c={};for(let l of i.result)c[l.modelPath]=l.modelArtifactsInfo;t(c)},i.onerror=c=>(n.close(),e(i.error)),s.oncomplete=()=>n.close()},o.onerror=n=>e(o.error)})}async removeModel(t){return t=u2(t),new Promise((e,o)=>{let n=this.indexedDB.open(ad,id);n.onupgradeneeded=()=>cd(n),n.onsuccess=()=>{let s=n.result,a=s.transaction(Bn,"readwrite"),i=a.objectStore(Bn),c=i.get(t),l;c.onsuccess=()=>{if(c.result==null)return s.close(),o(new Error(`Cannot find model with path '${t}' in IndexedDB.`));{let p=i.delete(t),u=()=>{l=s.transaction(Ya,"readwrite");let f=l.objectStore(Ya).delete(t);f.onsuccess=()=>e(c.result.modelArtifactsInfo),f.onerror=d=>o(c.error)};p.onsuccess=u,p.onerror=m=>(u(),s.close(),o(c.error))}},c.onerror=p=>(s.close(),o(c.error)),a.oncomplete=()=>{l==null?s.close():l.oncomplete=()=>s.close()}},n.onerror=s=>o(n.error)})}};var lo="/",Gi="tensorflowjs_models",yb="info",m2="model_topology",f2="weight_specs",d2="weight_data",h2="model_metadata";function bb(r){return{info:[Gi,r,yb].join(lo),topology:[Gi,r,m2].join(lo),weightSpecs:[Gi,r,f2].join(lo),weightData:[Gi,r,d2].join(lo),modelMetadata:[Gi,r,h2].join(lo)}}function Cb(r){for(let t of Object.values(r))window.localStorage.removeItem(t)}function g2(r){let t=r.split(lo);if(t.length<3)throw new Error(`Invalid key format: ${r}`);return t.slice(1,t.length-1).join(lo)}function x2(r){return r.startsWith(Br.URL_SCHEME)?r.slice(Br.URL_SCHEME.length):r}var Br=class{constructor(t){if(!F().getBool("IS_BROWSER")||typeof window>"u"||typeof window.localStorage>"u")throw new Error("The current environment does not support local storage.");if(this.LS=window.localStorage,t==null||!t)throw new Error("For local storage, modelPath must not be null, undefined or empty.");this.modelPath=t,this.keys=bb(this.modelPath)}async save(t){if(t.modelTopology instanceof ArrayBuffer)throw new Error("BrowserLocalStorage.save() does not support saving model topology in binary formats yet.");{let e=JSON.stringify(t.modelTopology),o=JSON.stringify(t.weightSpecs),n=Lr(t);try{this.LS.setItem(this.keys.info,JSON.stringify(n)),this.LS.setItem(this.keys.topology,e),this.LS.setItem(this.keys.weightSpecs,o),this.LS.setItem(this.keys.weightData,pb(t.weightData));let s={format:t.format,generatedBy:t.generatedBy,convertedBy:t.convertedBy,signature:t.signature!=null?t.signature:void 0,userDefinedMetadata:t.userDefinedMetadata!=null?t.userDefinedMetadata:void 0,modelInitializer:t.modelInitializer!=null?t.modelInitializer:void 0,trainingConfig:t.trainingConfig!=null?t.trainingConfig:void 0};return this.LS.setItem(this.keys.modelMetadata,JSON.stringify(s)),{modelArtifactsInfo:n}}catch{throw Cb(this.keys),new Error(`Failed to save model '${this.modelPath}' to local storage: size quota being exceeded is a possible cause of this failure: modelTopologyBytes=${n.modelTopologyBytes}, weightSpecsBytes=${n.weightSpecsBytes}, weightDataBytes=${n.weightDataBytes}.`)}}}async load(){let t=JSON.parse(this.LS.getItem(this.keys.info));if(t==null)throw new Error(`In local storage, there is no model with name '${this.modelPath}'`);if(t.modelTopologyType!=="JSON")throw new Error("BrowserLocalStorage does not support loading non-JSON model topology yet.");let e={},o=JSON.parse(this.LS.getItem(this.keys.topology));if(o==null)throw new Error(`In local storage, the topology of model '${this.modelPath}' is missing.`);e.modelTopology=o;let n=JSON.parse(this.LS.getItem(this.keys.weightSpecs));if(n==null)throw new Error(`In local storage, the weight specs of model '${this.modelPath}' are missing.`);e.weightSpecs=n;let s=this.LS.getItem(this.keys.modelMetadata);if(s!=null){let i=JSON.parse(s);e.format=i.format,e.generatedBy=i.generatedBy,e.convertedBy=i.convertedBy,i.signature!=null&&(e.signature=i.signature),i.userDefinedMetadata!=null&&(e.userDefinedMetadata=i.userDefinedMetadata),i.modelInitializer!=null&&(e.modelInitializer=i.modelInitializer),i.trainingConfig!=null&&(e.trainingConfig=i.trainingConfig)}let a=this.LS.getItem(this.keys.weightData);if(a==null)throw new Error(`In local storage, the binary weight values of model '${this.modelPath}' are missing.`);return e.weightData=ub(a),e}};Br.URL_SCHEME="localstorage://";var Tb=r=>F().getBool("IS_BROWSER")&&!Array.isArray(r)&&r.startsWith(Br.URL_SCHEME)?y2(r.slice(Br.URL_SCHEME.length)):null;ie.registerSaveRouter(Tb);ie.registerLoadRouter(Tb);function y2(r){return new Br(r)}var wp=class{constructor(){E(F().getBool("IS_BROWSER"),()=>"Current environment is not a web browser"),E(typeof window>"u"||typeof window.localStorage<"u",()=>"Current browser does not appear to support localStorage"),this.LS=window.localStorage}async listModels(){let t={},e=Gi+lo,o=lo+yb;for(let n=0;n<this.LS.length;++n){let s=this.LS.key(n);if(s.startsWith(e)&&s.endsWith(o)){let a=g2(s);t[a]=JSON.parse(this.LS.getItem(s))}}return t}async removeModel(t){t=x2(t);let e=bb(t);if(this.LS.getItem(e.info)==null)throw new Error(`Cannot find model at path '${t}'`);let o=JSON.parse(this.LS.getItem(e.info));return Cb(e),o}};var Ui="://",br=class r{constructor(){this.managers={}}static getInstance(){return r.instance==null&&(r.instance=new r),r.instance}static registerManager(t,e){E(t!=null,()=>"scheme must not be undefined or null."),t.endsWith(Ui)&&(t=t.slice(0,t.indexOf(Ui))),E(t.length>0,()=>"scheme must not be an empty string.");let o=r.getInstance();E(o.managers[t]==null,()=>`A model store manager is already registered for scheme '${t}'.`),o.managers[t]=e}static getManager(t){let e=r.getInstance().managers[t];if(e==null)throw new Error(`Cannot find model manager for scheme '${t}'`);return e}static getSchemes(){return Object.keys(r.getInstance().managers)}};function Np(r){if(r.indexOf(Ui)===-1)throw new Error(`The url string provided does not contain a scheme. Supported schemes are: ${br.getSchemes().join(",")}`);return{scheme:r.split(Ui)[0],path:r.split(Ui)[1]}}async function Sb(r,t,e=!1){E(r!==t,()=>`Old path and new path are the same: '${r}'`);let o=ie.getLoadHandlers(r);E(o.length>0,()=>`Copying failed because no load handler is found for source URL ${r}.`),E(o.length<2,()=>`Copying failed because more than one (${o.length}) load handlers for source URL ${r}.`);let n=o[0],s=ie.getSaveHandlers(t);E(s.length>0,()=>`Copying failed because no save handler is found for destination URL ${t}.`),E(s.length<2,()=>`Copying failed because more than one (${o.length}) save handlers for destination URL ${t}.`);let a=s[0],i=Np(r).scheme,c=Np(r).path,l=i===Np(r).scheme,p=await n.load();e&&l&&await br.getManager(i).removeModel(c);let u=await a.save(p);return e&&!l&&await br.getManager(i).removeModel(c),u.modelArtifactsInfo}async function wb(){let r=br.getSchemes(),t={};for(let e of r){let o=await br.getManager(e).listModels();for(let n in o){let s=e+Ui+n;t[s]=o[n]}}return t}async function Nb(r){let t=Np(r);return br.getManager(t.scheme).removeModel(t.path)}async function Ib(r,t){return Sb(r,t,!1)}async function vb(r,t){return Sb(r,t,!0)}var ld=class{constructor(){this.messageName="setTimeoutCustom",this.functionRefs=[],this.handledMessageCount=0,this.hasEventListener=!1}fetch(t,e){return fetch(t,e)}now(){return performance.now()}encode(t,e){if(e!=="utf-8"&&e!=="utf8")throw new Error(`Browser's encoder only supports utf-8, but got ${e}`);return this.textEncoder==null&&(this.textEncoder=new TextEncoder),this.textEncoder.encode(t)}decode(t,e){return new TextDecoder(e).decode(t)}setTimeoutCustom(t,e){if(typeof window>"u"||!F().getBool("USE_SETTIMEOUTCUSTOM")){setTimeout(t,e);return}this.functionRefs.push(t),setTimeout(()=>{window.postMessage({name:this.messageName,index:this.functionRefs.length-1},"*")},e),this.hasEventListener||(this.hasEventListener=!0,window.addEventListener("message",o=>{if(o.source===window&&o.data.name===this.messageName){o.stopPropagation();let n=this.functionRefs[o.data.index];n(),this.handledMessageCount++,this.handledMessageCount===this.functionRefs.length&&(this.functionRefs=[],this.handledMessageCount=0)}},!0))}};if(F().get("IS_BROWSER")){F().setPlatform("browser",new ld);try{br.registerManager(Br.URL_SCHEME,new wp)}catch{}try{br.registerManager(Mr.URL_SCHEME,new Sp)}catch{}}var b2={importFetch:()=>Rf("node-fetch")},pd;var ud=class{constructor(){this.util=Rf("util"),this.textEncoder=new this.util.TextEncoder}fetch(t,e){return F().global.fetch!=null?F().global.fetch(t,e):(pd==null&&(pd=b2.importFetch()),pd(t,e))}now(){let t=process.hrtime();return t[0]*1e3+t[1]/1e6}encode(t,e){if(e!=="utf-8"&&e!=="utf8")throw new Error(`Node built-in encoder only supports utf-8, but got ${e}`);return this.textEncoder.encode(t)}decode(t,e){return t.length===0?"":new this.util.TextDecoder(e).decode(t)}};F().get("IS_NODE")&&!F().get("IS_BROWSER")&&F().setPlatform("node",new ud);function et(r,t="float32",e){return t=t||"float32",Ec(r),new $t(r,t,e)}function C2(r,t){let e=T(r,"x","cast");if(!Pf(t))throw new Error(`Failed to cast to unknown dtype ${t}`);if(t==="string"&&e.dtype!=="string"||t!=="string"&&e.dtype==="string")throw new Error("Only strings can be casted to strings");let o={x:e},n={dtype:t};return v.runKernel(oo,o,n)}var St=N({cast_:C2});function T2(r){let e={x:T(r,"x","clone","string_or_numeric")};return v.runKernel(no,e)}var Fe=N({clone_:T2});function Yc(r,t=!1){console.log(r.toString(t))}td();var S2={buffer:et,cast:St,clone:Fe,print:Yc};ob(S2);var Ki={};It(Ki,{browserFiles:()=>Eb,browserHTTPRequest:()=>Ab,concatenateArrayBuffers:()=>zi,copyModel:()=>Ib,decodeWeights:()=>bp,encodeWeights:()=>lb,fromMemory:()=>Fb,fromMemorySync:()=>xd,getLoadHandlers:()=>hb,getModelArtifactsForJSON:()=>Wi,getModelArtifactsForJSONSync:()=>sd,getModelArtifactsInfoForJSON:()=>Lr,getSaveHandlers:()=>db,getWeightSpecs:()=>Tp,http:()=>vp,isHTTPScheme:()=>Ip,listModels:()=>wb,loadWeights:()=>$b,moveModel:()=>vb,registerLoadRouter:()=>fb,registerSaveRouter:()=>mb,removeModel:()=>Nb,weightsLoaderFactory:()=>hd,withSaveHandler:()=>Db,withSaveHandlerSync:()=>_b});var w2="model",N2=".json",I2=".weights.bin";function kb(r){return new Promise(t=>setTimeout(t)).then(r)}var Hi=class r{constructor(t){if(!F().getBool("IS_BROWSER"))throw new Error("browserDownloads() cannot proceed because the current environment is not a browser.");t.startsWith(r.URL_SCHEME)&&(t=t.slice(r.URL_SCHEME.length)),(t==null||t.length===0)&&(t=w2),this.modelJsonFileName=t+N2,this.weightDataFileName=t+I2}async save(t){if(typeof document>"u")throw new Error("Browser downloads are not supported in this environment since `document` is not present");let e=window.URL.createObjectURL(new Blob([t.weightData],{type:"application/octet-stream"}));if(t.modelTopology instanceof ArrayBuffer)throw new Error("BrowserDownloads.save() does not support saving model topology in binary formats yet.");{let o=[{paths:["./"+this.weightDataFileName],weights:t.weightSpecs}],n=Cp(t,o),s=window.URL.createObjectURL(new Blob([JSON.stringify(n)],{type:"application/json"})),a=this.modelJsonAnchor==null?document.createElement("a"):this.modelJsonAnchor;if(a.download=this.modelJsonFileName,a.href=s,await kb(()=>a.dispatchEvent(new MouseEvent("click"))),t.weightData!=null){let i=this.weightDataAnchor==null?document.createElement("a"):this.weightDataAnchor;i.download=this.weightDataFileName,i.href=e,await kb(()=>i.dispatchEvent(new MouseEvent("click")))}return{modelArtifactsInfo:Lr(t)}}}};Hi.URL_SCHEME="downloads://";var md=class{constructor(t){if(t==null||t.length<1)throw new Error(`When calling browserFiles, at least 1 file is required, but received ${t}`);this.jsonFile=t[0],this.weightsFiles=t.slice(1)}async load(){return new Promise((t,e)=>{let o=new FileReader;o.onload=n=>{let s=JSON.parse(n.target.result),a=s.modelTopology;if(a==null){e(new Error(`modelTopology field is missing from file ${this.jsonFile.name}`));return}if(s.weightsManifest==null){e(new Error(`weightManifest field is missing from file ${this.jsonFile.name}`));return}if(this.weightsFiles.length===0){t({modelTopology:a});return}let c=Wi(s,l=>this.loadWeights(l));t(c)},o.onerror=n=>e(`Failed to read model topology and weights manifest JSON from file '${this.jsonFile.name}'. BrowserFiles supports loading Keras-style tf.Model artifacts only.`),o.readAsText(this.jsonFile)})}loadWeights(t){let e=[],o=[];for(let a of t)e.push(...a.weights),o.push(...a.paths);let n=this.checkManifestAndWeightFiles(t),s=o.map(a=>this.loadWeightsFile(a,n[a]));return Promise.all(s).then(a=>[e,zi(a)])}loadWeightsFile(t,e){return new Promise((o,n)=>{let s=new FileReader;s.onload=a=>{let i=a.target.result;o(i)},s.onerror=a=>n(`Failed to weights data from file of path '${t}'.`),s.readAsArrayBuffer(e)})}checkManifestAndWeightFiles(t){let e=[],o=this.weightsFiles.map(s=>nd(s.name)),n={};for(let s of t)s.paths.forEach(a=>{let i=nd(a);if(e.indexOf(i)!==-1)throw new Error(`Duplicate file basename found in weights manifest: '${i}'`);if(e.push(i),o.indexOf(i)===-1)throw new Error(`Weight file with basename '${i}' is not provided.`);n[a]=this.weightsFiles[o.indexOf(i)]});if(e.length!==this.weightsFiles.length)throw new Error(`Mismatch in the number of files in weights manifest (${e.length}) and the number of weight files provided (${this.weightsFiles.length}).`);return n}},v2=r=>F().getBool("IS_BROWSER")&&!Array.isArray(r)&&r.startsWith(Hi.URL_SCHEME)?k2(r.slice(Hi.URL_SCHEME.length)):null;ie.registerSaveRouter(v2);function k2(r="model"){return new Hi(r)}function Eb(r){return new md(r)}function fd(r,t,e,o){a(r),e=e??0,o=o??1,i(e,o);let n=0,s=c=>(c.then(l=>{let p=e+ ++n/r.length*(o-e);return t(p),l}),c);function a(c){E(c!=null&&Array.isArray(c)&&c.length>0,()=>"promises must be a none empty array")}function i(c,l){E(c>=0&&c<=1,()=>`Progress fraction must be in range [0, 1], but got startFraction ${c}`),E(l>=0&&l<=1,()=>`Progress fraction must be in range [0, 1], but got endFraction ${l}`),E(l>=c,()=>`startFraction must be no more than endFraction, but got startFraction ${c} and endFraction ${l}`)}return Promise.all(r.map(s))}async function dd(r,t){t==null&&(t={});let e=t.fetchFunc==null?F().platform.fetch:t.fetchFunc,o=r.map(u=>e(u,t.requestInit,{isBinary:!0})),i=(t.onProgress==null?await Promise.all(o):await fd(o,t.onProgress,0,.5)).map(u=>u.arrayBuffer());return t.onProgress==null?await Promise.all(i):await fd(i,t.onProgress,.5,1)}async function $b(r,t="",e,o){return hd(a=>dd(a,{requestInit:o}))(r,t,e)}function hd(r){return async(t,e="",o)=>{let n=t.map(()=>!1),s={},a=o!=null?o.map(()=>!1):[],i=[];if(t.forEach((f,d)=>{let g=0;f.weights.forEach(h=>{let x="quantization"in h?h.quantization.dtype:h.dtype,b=jc[x]*bt(h.shape),S=()=>{n[d]=!0,s[d]==null&&(s[d]=[]),s[d].push({manifestEntry:h,groupOffset:g,sizeBytes:b})};o!=null?o.forEach((w,k)=>{w===h.name&&(S(),a[k]=!0)}):S(),i.push(h.name),g+=b})}),!a.every(f=>f)){let f=o.filter((d,g)=>!a[g]);throw new Error(`Could not find weights in manifest with names: ${f.join(", ")}. 
Manifest JSON has weights with names: ${i.join(", ")}.`)}let c=n.reduce((f,d,g)=>(d&&f.push(g),f),[]),l=[];c.forEach(f=>{t[f].paths.forEach(d=>{let g=e+(e.endsWith("/")?"":"/")+d;l.push(g)})});let p=await r(l),u={},m=0;return c.forEach(f=>{let d=t[f].paths.length,g=0;for(let w=0;w<d;w++)g+=p[m+w].byteLength;let h=new ArrayBuffer(g),x=new Uint8Array(h),b=0;for(let w=0;w<d;w++){let k=new Uint8Array(p[m+w]);x.set(k,b),b+=k.byteLength}s[f].forEach(w=>{let k=h.slice(w.groupOffset,w.groupOffset+w.sizeBytes),$=bp(k,[w.manifestEntry]);for(let R in $)u[R]=$[R]}),m+=d}),u}}var E2="application/octet-stream",$2="application/json",Zc=class{constructor(t,e){if(this.DEFAULT_METHOD="POST",e==null&&(e={}),this.weightPathPrefix=e.weightPathPrefix,this.onProgress=e.onProgress,this.weightUrlConverter=e.weightUrlConverter,e.fetchFunc!=null?(E(typeof e.fetchFunc=="function",()=>"Must pass a function that matches the signature of `fetch` (see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)"),this.fetch=e.fetchFunc):this.fetch=F().platform.fetch,E(t!=null&&t.length>0,()=>"URL path for http must not be null, undefined or empty."),Array.isArray(t)&&E(t.length===2,()=>`URL paths for http must have a length of 2, (actual length is ${t.length}).`),this.path=t,e.requestInit!=null&&e.requestInit.body!=null)throw new Error("requestInit is expected to have no pre-existing body, but has one.");this.requestInit=e.requestInit||{}}async save(t){if(t.modelTopology instanceof ArrayBuffer)throw new Error("BrowserHTTPRequest.save() does not support saving model topology in binary formats yet.");let e=Object.assign({method:this.DEFAULT_METHOD},this.requestInit);e.body=new FormData;let o=[{paths:["./model.weights.bin"],weights:t.weightSpecs}],n=Cp(t,o);e.body.append("model.json",new Blob([JSON.stringify(n)],{type:$2}),"model.json"),t.weightData!=null&&e.body.append("model.weights.bin",new Blob([t.weightData],{type:E2}),"model.weights.bin");let s=await this.fetch(this.path,e);if(s.ok)return{modelArtifactsInfo:Lr(t),responses:[s]};throw new Error(`BrowserHTTPRequest.save() failed due to HTTP response status ${s.status}.`)}async load(){let t=await this.fetch(this.path,this.requestInit);if(!t.ok)throw new Error(`Request to ${this.path} failed with status code ${t.status}. Please verify this URL points to the model JSON of the model to load.`);let e;try{e=await t.json()}catch{let a=`Failed to parse model JSON of response from ${this.path}.`;throw this.path.endsWith(".pb")?a+=" Your path contains a .pb file extension. Support for .pb models have been removed in TensorFlow.js 1.0 in favor of .json models. You can re-convert your Python TensorFlow model using the TensorFlow.js 1.0 conversion scripts or you can convert your.pb models with the 'pb2json'NPM script in the tensorflow/tfjs-converter repository.":a+=" Please make sure the server is serving valid JSON for this request.",new Error(a)}let o=e.modelTopology,n=e.weightsManifest;if(o==null&&n==null)throw new Error(`The JSON from HTTP path ${this.path} contains neither model topology or manifest for weights.`);return Wi(e,s=>this.loadWeights(s))}async loadWeights(t){let e=Array.isArray(this.path)?this.path[1]:this.path,[o,n]=R2(e),s=this.weightPathPrefix||o,a=Tp(t),i=[],c=[];for(let p of t)for(let u of p.paths)this.weightUrlConverter!=null?c.push(this.weightUrlConverter(u)):i.push(s+u+n);this.weightUrlConverter&&i.push(...await Promise.all(c));let l=await dd(i,{requestInit:this.requestInit,fetchFunc:this.fetch,onProgress:this.onProgress});return[a,zi(l)]}};Zc.URL_SCHEME_REGEX=/^https?:\/\//;function R2(r){let t=r.lastIndexOf("/"),e=r.lastIndexOf("?"),o=r.substring(0,t),n=e>t?r.substring(e):"";return[o+"/",n]}function Ip(r){return r.match(Zc.URL_SCHEME_REGEX)!=null}var Rb=(r,t)=>{if(typeof fetch>"u"&&(t==null||t.fetchFunc==null))return null;{let e=!0;if(Array.isArray(r)?e=r.every(o=>Ip(o)):e=Ip(r),e)return vp(r,t)}return null};ie.registerSaveRouter(Rb);ie.registerLoadRouter(Rb);function vp(r,t){return new Zc(r,t)}function Ab(r,t){return vp(r,t)}var Qc=class{constructor(t){this.modelArtifacts=t}load(){return this.modelArtifacts}},kp=class{constructor(t){this.saveHandler=t}save(t){return this.saveHandler(t)}},gd=class{constructor(t){t.load&&(this.load=()=>Promise.resolve(t.load())),t.save&&(this.save=e=>Promise.resolve(t.save(e)))}};function Fb(r,t,e,o){let n=arguments;return new gd(xd(...n))}function xd(r,t,e,o){return arguments.length===1?r.modelTopology!=null||r.weightSpecs!=null?new Qc(r):(console.warn("Please call tf.io.fromMemory() with only one argument. The argument should be of type ModelArtifacts. The multi-argument signature of tf.io.fromMemory() has been deprecated and will be removed in a future release."),new Qc({modelTopology:r})):(console.warn("Please call tf.io.fromMemory() with only one argument. The argument should be of type ModelArtifacts. The multi-argument signature of tf.io.fromMemory() has been deprecated and will be removed in a future release."),new Qc({modelTopology:r,weightSpecs:t,weightData:e,trainingConfig:o}))}function Db(r){return new kp(r)}function _b(r){return new kp(r)}var yd={};It(yd,{confusionMatrix:()=>Pb});function A2(r,t,e=!1,o=!1){let n=T(r,"a","matMul"),s=T(t,"b","matMul");[n,s]=ht(n,s);let a={a:n,b:s},i={transposeA:e,transposeB:o};return v.runKernel(ds,a,i)}var wt=N({matMul_:A2});function F2(r,t,e=1,o=0,n="int32"){if(t<2)throw new Error(`Error in oneHot: depth must be >=2, but it is ${t}`);let a={indices:T(r,"indices","oneHot","int32")},i={dtype:n,depth:t,onValue:e,offValue:o};return v.runKernel(ca,a,i)}var qi=N({oneHot_:F2});function D2(){F().set("PROD",!0)}function _2(){F().set("DEBUG",!0)}function O2(){F().set("DEPRECATION_WARNINGS_ENABLED",!1),console.warn("TensorFlow.js deprecation warnings have been disabled.")}function Ob(r){F().getBool("DEPRECATION_WARNINGS_ENABLED")&&console.warn(r+" You can disable deprecation warnings with tf.disableDeprecationWarnings().")}nb(Ob);function P2(){v.disposeVariables()}function Cr(){return v}function L2(){return v.memory()}function M2(r){return v.profile(r)}function ft(r,t){return v.tidy(r,t)}function Qt(r){qc(r).forEach(e=>e.dispose())}function Be(r){return v.keep(r)}function B2(r){return v.time(r)}function V2(r){return v.setBackend(r)}function z2(){return v.ready()}function W2(){return v.backendName}function G2(r){v.removeBackend(r)}function U2(r){return v.findBackend(r)}function H2(r){return v.findBackendFactory(r)}function Jc(r,t,e=1){return v.registerBackend(r,t,e)}function K2(){return v.backend}function q2(r,t){F().setPlatform(r,t)}function X2(r){let e={input:T(r,"input","imag")};return v.runKernel(Hs,e)}var po=N({imag_:X2});function j2(r){let e={x:T(r,"x","neg")};return v.runKernel(oa,e)}var Ce=N({neg_:j2});function Y2(r){let e={input:T(r,"input","real")};return v.runKernel(ga,e)}var Vr=N({real_:Y2});function Z2(r,t,e){let o=T(r,"x","transpose");if(t==null&&(t=o.shape.map((a,i)=>i).reverse()),E(o.rank===t.length,()=>`Error in transpose: rank of input ${o.rank} must match length of perm ${t}.`),t.forEach(a=>{E(a>=0&&a<o.rank,()=>`All entries in 'perm' must be between 0 and ${o.rank-1} but got ${t}`)}),o.rank<=1)return o.clone();let n={x:o},s={perm:t};return o.dtype==="complex64"?ft(()=>{let a=Vr(o),i=po(o);return a=v.runKernel(ao,{x:a},s),i=v.runKernel(ao,{x:i},s),e&&(i=Ce(i)),ke(a,i)}):v.runKernel(ao,n,s)}var Za=N({transpose_:Z2});function Q2(r,t,e){let o=T(r,"labels","confusionMatrix"),n=T(t,"predictions","confusionMatrix");E(e==null||e>0&&Number.isInteger(e),()=>`If provided, numClasses must be a positive integer, but got ${e}`),E(o.rank===1,()=>`Expected the rank of labels to be 1, but got ${o.rank}`),E(n.rank===1,()=>`Expected the rank of predictions to be 1, but got ${n.rank}`),E(o.shape[0]===n.shape[0],()=>`Mismatch in the number of examples: ${o.shape[0]} vs. ${n.shape[0]}. Labels and predictions should have the same number of elements.`),E(e>0&&Number.isInteger(e),()=>`numClasses is required to be a positive integer, but got ${e}`);let s=qi(St(o,"int32"),e),a=qi(St(n,"int32"),e),i=Za(s),c=wt(i,a);return St(c,"int32")}var Pb=N({confusionMatrix_:Q2});var Tr={};It(Tr,{assertAndGetBroadcastShape:()=>kt,getBroadcastDims:()=>Lb,getReductionAxes:()=>Ep});function Lb(r,t){let e=r.length,o=[];for(let n=0;n<e;n++){let s=e-1-n,a=r[s]||1;(t[t.length-1-n]||1)>1&&a===1&&o.unshift(s)}return o}function Ep(r,t){let e=[];for(let o=0;o<t.length;o++){let n=r[r.length-o-1],s=t.length-o-1,a=t[s];(n==null||n===1&&a>1)&&e.unshift(s)}return e}function kt(r,t){let e=[],o=Math.max(r.length,t.length);for(let n=0;n<o;n++){let s=r[r.length-n-1];s==null&&(s=1);let a=t[t.length-n-1];if(a==null&&(a=1),s===1)e.unshift(a);else if(a===1)e.unshift(s);else if(s!==a){let i=`Operands could not be broadcast together with shapes ${r} and ${t}.`;throw Error(i)}else e.unshift(s)}return e}var bd={};It(bd,{fromPixels:()=>sR,fromPixelsAsync:()=>oR,toPixels:()=>nR});function tl(r,t,e){if(qe(r),t!=null&&t.length!==3)throw new Error("tensor3d() requires shape to have three numbers");let o=de(r,e);if(o.length!==3&&o.length!==1)throw new Error("tensor3d() requires values to be number[][][] or flat/TypedArray");if(o.length===1&&t==null)throw new Error("tensor3d() requires shape to be provided when `values` are a flat array");return Ee(r,t,o,e)}var Qa;function Mb(r,t=3){if(t>4)throw new Error("Cannot construct Tensor with more than 4 channels from pixels.");if(r==null)throw new Error("pixels passed to tf.browser.fromPixels() can not be null");let e=!1,o=!1,n=!1,s=!1,a=!1,i=!1;if(r.data instanceof Uint8Array)e=!0;else if(typeof ImageData<"u"&&r instanceof ImageData)o=!0;else if(typeof HTMLVideoElement<"u"&&r instanceof HTMLVideoElement)n=!0;else if(typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement)s=!0;else if(r.getContext!=null)a=!0;else if(typeof ImageBitmap<"u"&&r instanceof ImageBitmap)i=!0;else throw new Error(`pixels passed to tf.browser.fromPixels() must be either an HTMLVideoElement, HTMLImageElement, HTMLCanvasElement, ImageData in browser, or OffscreenCanvas, ImageData in webworker or {data: Uint32Array, width: number, height: number}, but was ${r.constructor.name}`);if(_i(Fi,v.backendName)!=null){let d={pixels:r},g={numChannels:t};return v.runKernel(Fi,d,g)}let[l,p]=n?[r.videoWidth,r.videoHeight]:[r.width,r.height],u;if(a)u=r.getContext("2d").getImageData(0,0,l,p).data;else if(o||e)u=r.data;else if(s||n||i){if(Qa==null)if(typeof document>"u")if(typeof OffscreenCanvas<"u"&&typeof OffscreenCanvasRenderingContext2D<"u")Qa=new OffscreenCanvas(1,1).getContext("2d");else throw new Error("Cannot parse input in current context. Reason: OffscreenCanvas Context2D rendering is not supported.");else Qa=document.createElement("canvas").getContext("2d",{willReadFrequently:!0});Qa.canvas.width=l,Qa.canvas.height=p,Qa.drawImage(r,0,0,l,p),u=Qa.getImageData(0,0,l,p).data}let m;if(t===4)m=new Int32Array(u);else{let d=l*p;m=new Int32Array(d*t);for(let g=0;g<d;g++)for(let h=0;h<t;++h)m[g*t+h]=u[g*4+h]}return tl(m,[p,l,t],"int32")}function J2(r){return r!=null&&r.data instanceof Uint8Array}function tR(){return typeof window<"u"&&typeof ImageBitmap<"u"&&window.hasOwnProperty("createImageBitmap")}function eR(r){return r!=null&&r.width!==0&&r.height!==0}function rR(r){return tR()&&!(r instanceof ImageBitmap)&&eR(r)&&!J2(r)}async function oR(r,t=3){let e=null;if(F().getBool("WRAP_TO_IMAGEBITMAP")&&rR(r)){let o;try{o=await createImageBitmap(r,{premultiplyAlpha:"none"})}catch{o=null}o!=null&&o.width===r.width&&o.height===r.height?e=o:e=r}else e=r;return Mb(e,t)}async function nR(r,t){let e=T(r,"img","toPixels");if(!(r instanceof Ft)){let l=e;e=St(l,"int32"),l.dispose()}if(e.rank!==2&&e.rank!==3)throw new Error(`toPixels only supports rank 2 or 3 tensors, got rank ${e.rank}.`);let[o,n]=e.shape.slice(0,2),s=e.rank===2?1:e.shape[2];if(s>4||s===2)throw new Error(`toPixels only supports depth of size 1, 3 or 4 but got ${s}`);if(e.dtype!=="float32"&&e.dtype!=="int32")throw new Error(`Unsupported type for toPixels: ${e.dtype}. Please use float32 or int32 tensors.`);let a=await e.data(),i=e.dtype==="float32"?255:1,c=new Uint8ClampedArray(n*o*4);for(let l=0;l<o*n;++l){let p=[0,0,0,255];for(let m=0;m<s;m++){let f=a[l*s+m];if(e.dtype==="float32"){if(f<0||f>1)throw new Error(`Tensor values for a float32 Tensor must be in the range [0 - 1] but encountered ${f}.`)}else if(e.dtype==="int32"&&(f<0||f>255))throw new Error(`Tensor values for a int32 Tensor must be in the range [0 - 255] but encountered ${f}.`);s===1?(p[0]=f*i,p[1]=f*i,p[2]=f*i):p[m]=f*i}let u=l*4;c[u+0]=Math.round(p[0]),c[u+1]=Math.round(p[1]),c[u+2]=Math.round(p[2]),c[u+3]=Math.round(p[3])}if(t!=null){t.width=n,t.height=o;let l=t.getContext("2d"),p=new ImageData(c,n,o);l.putImageData(p,0,0)}return e!==r&&e.dispose(),c}var sR=N({fromPixels_:Mb});var Cd={};It(Cd,{prepareAndValidate:()=>Bb});function Bb(r,t){let e=r.shape.length,o=t.shape.length;if(e<1)throw new Error(`tf.gatherND() expects the input to be rank 1 or higher, but the rank was ${e}.`);if(o<1)throw new Error(`tf.gatherND() expects the indices to be rank 1 or higher, but the rank was ${o}.`);if(t.dtype!=="int32")throw new Error(`tf.gatherND() expects the indices to be int32 type, but the dtype was ${t.dtype}.`);if(t.shape[o-1]>e)throw new Error(`index innermost dimension length must be <= tensor rank; saw: ${t.shape[o-1]} vs. ${e}`);if(bt(r.shape)===0)throw new Error(`Requested more than 0 entries, but input is empty. Input shape: ${r.shape}.`);let n=t.shape,s=n[n.length-1],a=1;for(let u=0;u<n.length-1;++u)a*=n[u];let i=r.shape,c=n.slice();c.pop();let l=1;for(let u=s;u<e;++u)l*=i[u],c.push(i[u]);let p=[...Dr(r.shape).map(u=>u/l),1].slice(0,s);return[c,a,l,p]}var Rp={};It(Rp,{calculateShapes:()=>Vb,validateInput:()=>$p,validateUpdateShape:()=>Td});function Td(r,t,e){let o=t.rank>1?t.shape[t.rank-1]:1,n=t.rank>1?t.rank-1:1,s=`Must have updates.shape = indices.shape[:batchDim] + shape[sliceDim:], got updates.shape: ${e.shape}, indices.shape: ${t.shape}, shape: ${r}, sliceDim: ${o}, and batchDim: ${n}.`;if(e.rank<n)throw new Error(s+` update.rank < ${n}. `);if(r.length<o+(e.rank-n))throw new Error(s+` Output shape length < ${o+(e.rank-n)}`);if(e.rank!==n+r.length-o)throw new Error(s+` update.rank != ${n+r.length-o}`);for(let a=0;a<n;++a)if(e.shape[a]!==t.shape[a])throw new Error(s+` updates.shape[${a}] (${e.shape[a]}) != indices.shape[${a}] (${t.shape[a]}).`);for(let a=0;a<e.rank-n;++a)if(e.shape[a+n]!==r[a+o])throw new Error(s+` updates.shape[${a+n}] (${e.shape[a+n]}) != shape[${a+n}] (${r[a+n]})`)}function $p(r,t,e){if(t.rank<1)throw new Error(`tf.scatterND() expects the indices to be rank 1 or higher, but the rank was ${t.rank}.`);if(r.rank<1)throw new Error(`tf.scatterND() expects the updates to be rank 1 or higher, but the rank was ${r.rank}.`);if(t.dtype!=="int32")throw new Error(`The dtype of 'indices' should be int32, but got dtype: ${t.dtype}`);if(e.length<1)throw new Error(`Output rank must be greater or equal to 1, but got shape: ${e}`);if(e.length===0){if(t.size===0)throw new Error(`Indices specified for empty output. indices shape: ${t.shape}`);if(r.size===0)throw new Error(`Updates specified for empty output. updates shape: ${r.shape}`)}Td(e,t,r)}function Vb(r,t,e){let o=t.shape.length,n=o>1?t.shape[o-1]:1,s=e.length,a=1;for(let u=n;u<s;++u)a*=e[u];let i=n<1?1:n,c=bt(t.shape)/i,l=[...Dr(e.slice(0,n)),1],p=bt(e);return{sliceRank:n,numUpdates:c,sliceSize:a,strides:l,outputSize:p}}var ne={};It(ne,{assertParamsValid:()=>iR,computeFlatOffset:()=>mR,computeOutShape:()=>lR,getNormalizedAxes:()=>pR,isSliceContinous:()=>uR,maskToAxes:()=>cR,parseSliceParams:()=>fR,sliceInfo:()=>dR,startForAxis:()=>Xb,startIndicesWithElidedDims:()=>Hb,stopForAxis:()=>jb,stopIndicesWithElidedDims:()=>Kb,stridesForAxis:()=>qb,stridesWithElidedDims:()=>Wb});var Sd=-2,aR=-1;function iR(r,t,e){let o=r.shape.length;E(o===t.length,()=>`Error in slice${o}D: Length of begin ${t} must match the rank of the array (${o}).`),E(o===e.length,()=>`Error in slice${o}D: Length of size ${e} must match the rank of the array (${o}).`);for(let n=0;n<o;++n)E(t[n]+e[n]<=r.shape[n],()=>`Error in slice${o}D: begin[${n}] + size[${n}] (${t[n]+e[n]}) would overflow input.shape[${n}] (${r.shape[n]})`)}function cR(r){let t=[],e=0;for(;r>0;)r&1&&t.push(e),r/=2,e++;return t}function lR(r,t,e){let o=[];for(let n=0;n<r.length;n++)o[n]=Math.ceil((t[n]-r[n])/e[n]);return o}function Wb(r,t,e,o){let n=[...r];for(let s=n.length;s<o.length;s++)n.push(1);for(let s=0;s<e;s++)s===0?n[t]=1:(n.splice(t,0,1),n.pop());return n}function Gb(r,t,e){return e<=r?e:e-(t-1)}function Ub(r,t){let e=[];for(let o=0;o<r;o++)e.push(t+o);return e}function pR(r,t,e,o,n,s,a,i,c){let l=r.length,p=new Array(l),u=new Array(l),m=new Array(l);if(t.length&&e>0){let f=t[0],d=e+1;p=Hb(a,f,d,o,r),u=Kb(i,f,d,n,r),m=Wb(s,f,d,r)}else for(let f=0;f<l;f++)p[f]=Xb(a,o,s,r,f,c),u[f]=jb(i,n,s,r,f,c),m[f]=qb(s,f,c);return{begin:p,end:u,strides:m}}function Hb(r,t,e,o,n){let s=[...n],a=Ub(e,t);for(let i=0;i<s.length;i++)if(a.indexOf(i)>-1)s[i]=0;else{let c=Gb(t,e,i),l=o[c];r&1<<c&&(l=0),s[i]=l}return s}function Kb(r,t,e,o,n){let s=[...n],a=Ub(e,t);for(let i=0;i<s.length;i++)if(a.indexOf(i)>-1)s[i]=Number.MAX_SAFE_INTEGER;else{let c=Gb(t,e,i),l=o[c];r&1<<c&&(l=Number.MAX_SAFE_INTEGER),s[i]=l}for(let i=0;i<s.length;i++){let c=n[i];s[i]<0&&(s[i]+=c),s[i]=ki(0,s[i],n[i])}return s}function qb(r,t,e){let o=r[t];return(e&1<<t||o==null)&&(o=1),o}function Xb(r,t,e,o,n,s){let a=t[n],i=e[n]||1;(r&1<<n||s&1<<n||a==null)&&(i>0?a=Number.MIN_SAFE_INTEGER:a=Number.MAX_SAFE_INTEGER);let c=o[n];return a<0&&(a+=c),a=ki(0,a,c-1),a}function jb(r,t,e,o,n,s){let a=t[n],i=e[n]||1;(r&1<<n||s&1<<n||a==null)&&(i>0?a=Number.MAX_SAFE_INTEGER:a=Number.MIN_SAFE_INTEGER);let c=o[n];return a<0&&(a+=c),i>0?a=ki(0,a,c):a=ki(-1,a,c-1),a}function uR(r,t,e){let o=e.length;for(let n=0;n<e.length;n++)if(e[n]>1){o=n;break}for(let n=o+1;n<e.length;n++)if(t[n]>0||e[n]!==r[n])return!1;return!0}function mR(r,t){let e=r.length>0?r[r.length-1]:1;for(let o=0;o<r.length-1;o++)e+=r[o]*t[o];return e}function fR(r,t,e){let o,n=r.shape.length;typeof t=="number"?o=[t,...new Array(n-1).fill(0)]:t.length<n?o=t.concat(new Array(n-t.length).fill(0)):o=t.slice(),o.forEach(a=>{E(a!==-1,()=>"slice() does not support negative begin indexing.")});let s;return e==null?s=new Array(n).fill(-1):typeof e=="number"?s=[e,...new Array(n-1).fill(-1)]:e.length<n?s=e.concat(new Array(n-e.length).fill(-1)):s=e,s=s.map((a,i)=>a>=0?a:(E(a===-1,()=>`Negative size values should be exactly -1 but got ${a} for the slice() size at index ${i}.`),r.shape[i]-o[i])),[o,s]}function dR(r,t,e,o,n,s,a,i,c){let l;if(o==null?(l=new Array(t.length),l.fill(1)):l=o,a!=null&&a&a-1)throw new Error("Multiple ellipses in slice is not allowed.");let p=!1,u={dims:l.length,numAddAxisAfterEllipsis:0,begin:t.slice(),end:e.slice(),strides:l.slice(),beginMask:n,endMask:s,ellipsisMask:a,newAxisMask:i,shrinkAxisMask:c};for(let S=0;S<u.dims;S++)p&&1<<S&i&&u.numAddAxisAfterEllipsis++,1<<S&a&&(p=!0);p||(u.ellipsisMask|=1<<u.dims,u.dims++);let m={dims:r.length,beginMask:0,endMask:0,beginValid:!1,endValid:!1};hR(u,m);let f=!0,d=!0,g=!0,h=[],x=[];for(let S=0;S<r.length;++S){if(m.strides[S]===0)throw Error(`strides[${S}] must be non-zero`);let w=!!(m.shrinkAxisMask&1<<S),k=r[S];if(k===-1){h.push(w?1:-1);continue}let $=[m.beginMask&1<<S,m.endMask&1<<S],R=[m.strides[S]>0?0:-1,m.strides[S]>0?k:k-1];if(w&&m.strides[S]<=0)throw Error("only stride 1 allowed on non-range indexing.");g=g&&m.strides[S]===1;let A=!!(m.beginMask&1<<S&&m.endMask&1<<S);if(m.beginValid&&m.endValid){if(w){let L=m.begin[S]<0?k+m.begin[S]:m.begin[S];if(m.begin[S]=L,m.end[S]=m.begin[S]+1,L<0||L>=k)throw Error(`slice index ${m.begin[S]} of dimension ${S} out of bounds.`)}else m.begin[S]=zb(m.begin[S],0,m.strides[S],k,$,R),m.end[S]=zb(m.end[S],1,m.strides[S],k,$,R);let O=m.strides[S]===1&&m.begin[S]===0&&m.end[S]===k;f=f&&O,d=d&&(S===0&&m.strides[S]===1||O)}else f=f&&m.strides[S]===1&&A,d=d&&(S===0&&m.strides[S]===1||A);let D,_=!1;if(m.beginValid&&m.endValid?(D=m.end[S]-m.begin[S],_=!0):w?(D=1,_=!0):A&&k>=0&&(m.strides[S]<0?D=-k:D=k,_=!0),_){let O;D===0||D<0!=m.strides[S]<0?O=0:O=Math.trunc(D/m.strides[S])+(D%m.strides[S]!==0?1:0),h.push(O)}else h.push(-1)}for(let S=0;S<m.finalShapeGatherIndices.length;++S){let w=m.finalShapeGatherIndices[S];w>=0?x.push(h[w]):w===Sd&&x.push(1)}return{finalShapeSparse:x.filter((S,w)=>m.finalShapeGatherIndices[w]!==Sd),finalShape:x,isIdentity:f,sliceDim0:d,isSimpleSlice:g,begin:m.begin,end:m.end,strides:m.strides}}function hR(r,t){t.beginMask=0,t.endMask=0,t.shrinkAxisMask=0;let e=0;t.beginValid=r.begin!=null,t.endValid=r.end!=null,t.begin=new Array(t.dims),t.end=new Array(t.dims),t.strides=new Array(t.dims),t.finalShapeGatherIndices=[],t.finalShapeGatherIndicesSparse=[],t.inputShapeGatherIndicesSparse=new Array(t.dims);for(let o=0;o<r.dims;o++)if(1<<o&r.ellipsisMask){let n=Math.min(t.dims-(r.dims-o)+1+r.numAddAxisAfterEllipsis,t.dims);for(;e<n;e++)t.begin[e]=0,t.end[e]=0,t.strides[e]=1,t.beginMask|=1<<e,t.endMask|=1<<e,t.finalShapeGatherIndices.push(e),t.finalShapeGatherIndicesSparse.push(-1),t.inputShapeGatherIndicesSparse[e]=o}else if(1<<o&r.newAxisMask)t.finalShapeGatherIndices.push(Sd),t.finalShapeGatherIndicesSparse.push(-1);else{if(e===t.begin.length)throw Error(`Index out of range using input dim ${e}; input has only ${t.dims} dims, ${t.begin.length}.`);r.begin!=null&&(t.begin[e]=r.begin[o]),r.end!=null&&(t.end[e]=r.end[o]),t.strides[e]=r.strides[o],r.beginMask&1<<o&&(t.beginMask|=1<<e),r.endMask&1<<o&&(t.endMask|=1<<e),r.shrinkAxisMask&1<<o?(t.finalShapeGatherIndices.push(aR),t.finalShapeGatherIndicesSparse.push(-1),t.shrinkAxisMask|=1<<e):(t.finalShapeGatherIndices.push(e),t.finalShapeGatherIndicesSparse.push(o)),t.inputShapeGatherIndicesSparse[e]=o,e++}}function zb(r,t,e,o,n,s){if(n[t])return e>0?s[t]:s[t+1&1];{let a=r<0?o+r:r;return a<s[0]?s[0]:a>s[1]?s[1]:a}}var wd={};It(wd,{Serializable:()=>el,SerializationMap:()=>Ap,registerClass:()=>De});var el=class{getClassName(){return this.constructor.className}static fromConfig(t,e){return new t(e)}},Ap=class r{constructor(){this.classNameMap={}}static getMap(){return r.instance==null&&(r.instance=new r),r.instance}static register(t){r.getMap().classNameMap[t.className]=[t,t.fromConfig]}};function De(r){E(r.className!=null,()=>"Class being registered does not have the static className property defined."),E(typeof r.className=="string",()=>"className is required to be a string, but got type "+typeof r.className),E(r.className.length>0,()=>"Class being registered has an empty-string as its className, which is disallowed."),Ap.register(r)}var kd={};It(kd,{TEST_EPSILON_FLOAT16:()=>Yb,createVideoElement:()=>wR,encodeStrings:()=>Zb,expectArrayBuffersEqual:()=>SR,expectArraysClose:()=>xR,expectArraysEqual:()=>bR,expectNumbersClose:()=>CR,expectPromiseToFail:()=>yR,expectValuesInRange:()=>TR,play:()=>NR,testEpsilon:()=>Id});var gR=.001,Yb=.1;function xR(r,t,e){return e==null&&(e=Id()),Nd(r,t,(o,n)=>vd(o,n,e))}function Id(){return v.backend.floatPrecision()===32?gR:Yb}function Nd(r,t,e){let o=!0;if((oe(r)||oe(t))&&(o=!1),oe(r)&&oe(t)&&(o=!0),o){let a=r.constructor.name,i=t.constructor.name;if(a!==i)throw new Error(`Arrays are of different type. Actual: ${a}. Expected: ${i}`)}if(Array.isArray(r)&&Array.isArray(t)){let a=de(r),i=de(t);if(!Oe(a,i))throw new Error(`Arrays have different shapes. Actual: [${a}]. Expected: [${i}]`)}let n=oe(r)?r:hr(r),s=oe(t)?t:hr(t);if(n.length!==s.length)throw new Error(`Arrays have different lengths actual: ${n.length} vs expected: ${s.length}.
Actual:   ${n}.
Expected: ${s}.`);for(let a=0;a<s.length;++a){let i=n[a],c=s[a];if(!e(i,c))throw new Error(`Arrays differ: actual[${a}] = ${i}, expected[${a}] = ${c}.
Actual:   ${n}.
Expected: ${s}.`)}typeof expect<"u"&&expect().nothing()}function yR(r,t){r().then(()=>t.fail(),()=>t()),typeof expect<"u"&&expect().nothing()}function bR(r,t){let e=typeof t=="string"||typeof t=="number"||typeof t=="boolean"?[t]:t;return gr(r)||gr(r[0])||gr(t)||gr(t[0])?Nd(r,e,(o,n)=>o==n):Nd(r,t,(o,n)=>vd(o,n,0))}function CR(r,t,e){if(e==null&&(e=Id()),!vd(r,t,e))throw new Error(`Numbers differ: actual === ${r}, expected === ${t}`);typeof expect<"u"&&expect().nothing()}function vd(r,t,e){return!isFinite(r)&&!isFinite(t)?!0:!(isNaN(r)||isNaN(t)||Math.abs(r-t)>e)}function TR(r,t,e){for(let o=0;o<r.length;o++)if(r[o]<t||r[o]>e)throw new Error(`Value out of range:${r[o]} low: ${t}, high: ${e}`)}function SR(r,t){let e=new Float32Array(r),o=new Float32Array(t);if(e.length!==o.length)throw new Error(`Expected ArrayBuffer to be of length ${o.length}, but it was ${e.length}`);for(let n=0;n<o.length;n++)if(e[n]!==o[n])throw new Error(`Expected ArrayBuffer value at ${n} to be ${o[n]} but got ${e[n]} instead`)}function Zb(r){for(let t=0;t<r.length;t++){let e=r[t];Array.isArray(e)?Zb(e):r[t]=Ln(e)}return r}function wR(r){let t=document.createElement("video");return"playsInline"in t&&(t.playsInline=!0),t.muted=!0,t.loop=!0,t.style.position="fixed",t.style.left="0px",t.style.top="0px",t.preload="auto",t.appendChild(r),new Promise(e=>{t.addEventListener("loadeddata",o=>e(t)),t.load()})}async function NR(r){await r.play(),"requestVideoFrameCallback"in r&&await new Promise(t=>{r.requestVideoFrameCallback(t)})}var Qb="3.21.0";function IR(r,t){let e=T(r,"a","add"),o=T(t,"b","add");[e,o]=ht(e,o);let n={a:e,b:o};return v.runKernel(_r,n)}var nt=N({add_:IR});function vR(r,t){let e=T(r,"a","floorDiv"),o=T(t,"b","floorDiv");[e,o]=ht(e,o);let n={a:e,b:o};return v.runKernel(Yo,n)}var rl=N({floorDiv_:vR});function kR(r,t){let e=T(r,"a","div"),o=T(t,"b","div");if([e,o]=ht(e,o),e.dtype==="int32"&&o.dtype==="int32")return rl(e,o);let n={a:e,b:o},s={};return v.runKernel(Go,n,s)}var Ct=N({div_:kR});function ER(r,t){let e=T(r,"a","mul"),o=T(t,"b","mul");[e,o]=ht(e,o);let n={a:e,b:o};return v.runKernel(fn,n)}var q=N({mul_:ER});function $R(r){let t=T(r,"x","abs");if(t.dtype==="complex64"){let e={x:t};return v.runKernel(bs,e)}else{let e={x:t};return v.runKernel(as,e)}}var ce=N({abs_:$R});function RR(r){let e={x:T(r,"x","acos")};return v.runKernel(Fo,e)}var Ed=N({acos_:RR});function AR(r){let e={x:T(r,"x","acosh")};return v.runKernel(Do,e)}var $d=N({acosh_:AR});function FR(r){E(Array.isArray(r),()=>"The argument passed to tf.addN() must be a list of tensors"),E(r.length>=1,()=>`Must pass at least one tensor to tf.addN(), but got ${r.length}`);let t=r.map((n,s)=>T(n,`tensors${s}`,"addN")),e=t[0];t.forEach(n=>{if(n.dtype!==e.dtype)throw new Error("All tensors passed to tf.addN() must have the same dtype")}),t.forEach(n=>{if(!Oe(n.shape,e.shape))throw new Error("All tensors passed to tf.addN() must have the same shape")});let o=t;return v.runKernel(is,o)}var Rd=N({addN_:FR});function DR(r,t=null,e=!1){let n={x:T(r,"x","all","bool")},s={axis:t,keepDims:e};return v.runKernel(cs,n,s)}var Ad=N({all_:DR});function _R(r,t=null,e=!1){let n={x:T(r,"x","any","bool")},s={axis:t,keepDims:e};return v.runKernel(ls,n,s)}var Fd=N({any_:_R});function OR(r,t=0){let o={x:T(r,"x","argMax")},n={axis:t};return v.runKernel(ps,o,n)}var Dd=N({argMax_:OR});function PR(r,t=0){let o={x:T(r,"x","argMin")},n={axis:t};return v.runKernel(us,o,n)}var _d=N({argMin_:PR});function LR(r){let e={x:T(r,"x","asin")};return v.runKernel(_o,e)}var Od=N({asin_:LR});function MR(r){let e={x:T(r,"x","asinh")};return v.runKernel(Oo,e)}var Pd=N({asinh_:MR});function BR(r){let e={x:T(r,"x","atan")};return v.runKernel(Po,e)}var Ld=N({atan_:BR});function VR(r,t){let e=T(r,"a","atan2"),o=T(t,"b","atan2");[e,o]=ht(e,o);let n={a:e,b:o};return v.runKernel(Mo,n)}var Md=N({atan2_:VR});function zR(r){let e={x:T(r,"x","atanh")};return v.runKernel(Lo,e)}var Bd=N({atanh_:zR});function WR(r,t,e,o,n="NHWC",s){let a=r[3],i=[...t,a],c=t0(n);return ei(r,i,e,s,o,null,null,c)}function zd(r,t,e,o,n,s,a="channelsLast"){let[i,c]=Fp(t),l;if(a==="channelsLast")l=[i,c,r[3],r[3]];else if(a==="channelsFirst")l=[i,c,r[1],r[1]];else throw new Error(`Unknown dataFormat ${a}`);return ei(r,l,e,o,n,s,!1,a)}function GR(r,t,e,o,n,s,a="NDHWC"){let[i,c,l]=Vd(t),p,u;if(a==="NDHWC")u="channelsLast",p=[i,c,l,r[4],r[4]];else if(a==="NCDHW")u="channelsFirst",p=[i,c,l,r[1],r[1]];else throw new Error(`Unknown dataFormat ${a}`);return Jb(r,p,e,o,n,!1,u,s)}function ei(r,t,e,o,n,s,a=!1,i="channelsLast"){let[c,l,p,u]=[-1,-1,-1,-1];if(i==="channelsLast")[c,l,p,u]=r;else if(i==="channelsFirst")[c,u,l,p]=r;else throw new Error(`Unknown dataFormat ${i}`);let[m,f,,d]=t,[g,h]=Fp(e),[x,b]=Fp(o),S=Xi(m,x),w=Xi(f,b),{padInfo:k,outHeight:$,outWidth:R}=KR(n,l,p,g,h,S,w,s,i),A=a?d*u:d,D;return i==="channelsFirst"?D=[c,A,$,R]:i==="channelsLast"&&(D=[c,$,R,A]),{batchSize:c,dataFormat:i,inHeight:l,inWidth:p,inChannels:u,outHeight:$,outWidth:R,outChannels:A,padInfo:k,strideHeight:g,strideWidth:h,filterHeight:m,filterWidth:f,effectiveFilterHeight:S,effectiveFilterWidth:w,dilationHeight:x,dilationWidth:b,inShape:r,outShape:D,filterShape:t}}function Jb(r,t,e,o,n,s=!1,a="channelsLast",i){let[c,l,p,u,m]=[-1,-1,-1,-1,-1];if(a==="channelsLast")[c,l,p,u,m]=r;else if(a==="channelsFirst")[c,m,l,p,u]=r;else throw new Error(`Unknown dataFormat ${a}`);let[f,d,g,,h]=t,[x,b,S]=Vd(e),[w,k,$]=Vd(o),R=Xi(f,w),A=Xi(d,k),D=Xi(g,$),{padInfo:_,outDepth:O,outHeight:L,outWidth:M}=qR(n,l,p,u,x,b,S,R,A,D,i),V=s?h*m:h,B;return a==="channelsFirst"?B=[c,V,O,L,M]:a==="channelsLast"&&(B=[c,O,L,M,V]),{batchSize:c,dataFormat:a,inDepth:l,inHeight:p,inWidth:u,inChannels:m,outDepth:O,outHeight:L,outWidth:M,outChannels:V,padInfo:_,strideDepth:x,strideHeight:b,strideWidth:S,filterDepth:f,filterHeight:d,filterWidth:g,effectiveFilterDepth:R,effectiveFilterHeight:A,effectiveFilterWidth:D,dilationDepth:w,dilationHeight:k,dilationWidth:$,inShape:r,outShape:B,filterShape:t}}function UR(r,t,e,o,n){o==null&&(o=Wd(r,t,e));let s=r[0],a=r[1],i=Ja((s-t+2*o)/e+1,n),c=Ja((a-t+2*o)/e+1,n);return[i,c]}function HR(r,t,e,o,n,s){n==null&&(n=Wd(r,t,o));let a=r[0],i=r[1],c=r[2],l=Ja((a-t+2*n)/o+1,s),p=Ja((i-t+2*n)/o+1,s),u=Ja((c-t+2*n)/o+1,s);return[l,p,u,e]}function Wd(r,t,e,o=1){let n=Xi(t,o);return Math.floor((r[0]*(e-1)-e+n)/2)}function Fp(r){return typeof r=="number"?[r,r,r]:r.length===2?[r[0],r[1],1]:r}function Vd(r){return typeof r=="number"?[r,r,r]:r}function Xi(r,t){return t<=1?r:r+(r-1)*(t-1)}function KR(r,t,e,o,n,s,a,i,c){let l,p,u;if(typeof r=="number"){l={top:r,bottom:r,left:r,right:r,type:r===0?"VALID":"NUMBER"};let f=UR([t,e],s,o,r,i);p=f[0],u=f[1]}else if(r==="same"){p=Math.ceil(t/o),u=Math.ceil(e/n);let m=Math.max(0,(p-1)*o+s-t),f=Math.max(0,(u-1)*n+a-e),d=Math.floor(m/2),g=m-d,h=Math.floor(f/2),x=f-h;l={top:d,bottom:g,left:h,right:x,type:"SAME"}}else if(r==="valid")l={top:0,bottom:0,left:0,right:0,type:"VALID"},p=Math.ceil((t-s+1)/o),u=Math.ceil((e-a+1)/n);else if(typeof r=="object"){let m=c==="channelsLast"?r[1][0]:r[2][0],f=c==="channelsLast"?r[1][1]:r[2][1],d=c==="channelsLast"?r[2][0]:r[3][0],g=c==="channelsLast"?r[2][1]:r[3][1];l={top:m,bottom:f,left:d,right:g,type:m===0&&f===0&&d===0&&g===0?"VALID":"EXPLICIT"},p=Ja((t-s+m+f)/o+1,i),u=Ja((e-a+d+g)/n+1,i)}else throw Error(`Unknown padding parameter: ${r}`);return{padInfo:l,outHeight:p,outWidth:u}}function qR(r,t,e,o,n,s,a,i,c,l,p){let u,m,f,d;if(typeof r=="number"){u={top:r,bottom:r,left:r,right:r,front:r,back:r,type:r===0?"VALID":"NUMBER"};let h=HR([t,e,o,1],i,1,n,r,p);m=h[0],f=h[1],d=h[2]}else if(r==="same"){m=Math.ceil(t/n),f=Math.ceil(e/s),d=Math.ceil(o/a);let g=(m-1)*n+i-t,h=(f-1)*s+c-e,x=(d-1)*a+l-o,b=Math.floor(g/2),S=g-b,w=Math.floor(h/2),k=h-w,$=Math.floor(x/2),R=x-$;u={top:w,bottom:k,left:$,right:R,front:b,back:S,type:"SAME"}}else if(r==="valid")u={top:0,bottom:0,left:0,right:0,front:0,back:0,type:"VALID"},m=Math.ceil((t-i+1)/n),f=Math.ceil((e-c+1)/s),d=Math.ceil((o-l+1)/a);else throw Error(`Unknown padding parameter: ${r}`);return{padInfo:u,outDepth:m,outHeight:f,outWidth:d}}function Ja(r,t){if(!t)return Math.trunc(r);switch(t){case"round":return Math.round(r);case"ceil":return Math.ceil(r);case"floor":return Math.floor(r);default:throw new Error(`Unknown roundingMode ${t}`)}}function ti(r){let[t,e,o]=Fp(r);return t===1&&e===1&&o===1}function Te(r,t){return ti(r)||ti(t)}function t0(r){if(r==="NHWC")return"channelsLast";if(r==="NCHW")return"channelsFirst";throw new Error(`Unknown dataFormat ${r}`)}function Jt(r,t,e){if(e!=null){if(typeof t=="string")throw Error(`Error in ${r}: pad must be an integer when using dimRoundingMode ${e} but got pad ${t}.`);if(typeof t=="number")E(ro(t),()=>`Error in ${r}: pad must be an integer when using dimRoundingMode ${e} but got pad ${t}.`);else if(typeof t=="object")t.forEach(o=>{o.forEach(n=>{E(ro(n),()=>`Error in ${r}: pad must be an integer when using dimRoundingMode ${e} but got pad ${n}.`)})});else throw Error(`Error in ${r}: Unknown padding parameter: ${t}`)}}function XR(r,t){let o={x:T(r,"x","reshape","string_or_numeric")},n={shape:t};return v.runKernel(xa,o,n)}var P=N({reshape_:XR});function jR(r,t,e,o,n){let s=T(r,"x","avgPool","float32"),a=1;E(Te(e,a),()=>`Error in avgPool: Either strides or dilations must be 1. Got strides ${e} and dilations '${a}'`);let i=s,c=!1;s.rank===3&&(c=!0,i=P(s,[1,s.shape[0],s.shape[1],s.shape[2]])),E(i.rank===4,()=>`Error in avgPool: x must be rank 4 but got rank ${i.rank}.`),Jt("avgPool",o,n);let l={x:i},p={filterSize:t,strides:e,pad:o,dimRoundingMode:n},u=v.runKernel(ms,l,p);return u=St(u,s.dtype),c?P(u,[u.shape[1],u.shape[2],u.shape[3]]):u}var ol=N({avgPool_:jR});function YR(r,t,e,o,n,s="NDHWC"){let a=T(r,"x","avgPool3d","float32"),i=a,c=!1;a.rank===4&&(c=!0,i=P(a,[1,a.shape[0],a.shape[1],a.shape[2],a.shape[3]])),E(i.rank===5,()=>`Error in avgPool3d: x must be rank 5 but got rank ${i.rank}.`),E(s==="NDHWC",()=>`Error in avgPool3d: Only NDHWC is currently supported, but got dataFormat of ${s}`),Jt("avgPool3d",o,n);let l={x:i},p={filterSize:t,strides:e,pad:o,dimRoundingMode:n,dataFormat:s},u=v.runKernel(fs,l,p);return u=St(u,i.dtype),c?P(u,[u.shape[1],u.shape[2],u.shape[3],u.shape[4]]):u}var Gd=N({avgPool3d_:YR});function ZR(r,t=0){E(r.length>=1,()=>"Pass at least one tensor to concat");let e=co(r,"tensors","concat","string_or_numeric");if(e[0].dtype==="complex64"&&e.forEach(s=>{if(s.dtype!=="complex64")throw new Error(`Cannot concatenate complex64 tensors with a tensor
          with dtype ${s.dtype}. `)}),e.length===1)return Fe(e[0]);let o=e,n={axis:t};return v.runKernel(Cs,o,n)}var Pt=N({concat_:ZR});function QR(r){let e={x:T(r,"x","sigmoid","float32")};return v.runKernel(In,e)}var Sr=N({sigmoid_:QR});function JR(r,t,e){let o=T(r,"x","slice","string_or_numeric");if(o.rank===0)throw new Error("Slicing scalar is not possible");let n={x:o},s={begin:t,size:e};return v.runKernel(Na,n,s)}var Tt=N({slice_:JR});function tA(r){let e={x:T(r,"x","tanh","float32")};return v.runKernel(An,e)}var ji=N({tanh_:tA});function eA(r,t,e,o,n,s){let a=T(r,"forgetBias","basicLSTMCell"),i=T(t,"lstmKernel","basicLSTMCell"),c=T(e,"lstmBias","basicLSTMCell"),l=T(o,"data","basicLSTMCell"),p=T(n,"c","basicLSTMCell"),u=T(s,"h","basicLSTMCell"),m=Pt([l,u],1),f=wt(m,i),d=nt(f,c),g=d.shape[0],h=d.shape[1]/4,x=[g,h],b=Tt(d,[0,0],x),S=Tt(d,[0,h],x),w=Tt(d,[0,h*2],x),k=Tt(d,[0,h*3],x),$=nt(q(Sr(b),ji(S)),q(p,Sr(nt(a,w)))),R=q(ji($),Sr(k));return[$,R]}var Ud=N({basicLSTMCell_:eA});function rA(r,t,e){let o=T(r,"x","batchToSpaceND"),n=t.reduce((i,c)=>i*c);E(o.rank>=1+t.length,()=>`input rank is ${o.rank} but should be > than blockShape.length ${t.length}`),E(e.length===t.length,()=>`crops.length is ${e.length} but should be equal to blockShape.length  ${t.length}`),E(o.shape[0]%n===0,()=>`input tensor batch is ${o.shape[0]} but is not divisible by the product of the elements of blockShape ${t.join(" * ")} === ${n}`);let s={x:o},a={blockShape:t,crops:e};return v.runKernel(hs,s,a)}var nl=N({batchToSpaceND_:rA});function e0(r){let t;return r.rank===0||r.rank===1?t=P(r,[1,1,1,r.size]):r.rank===2?t=P(r,[1,1,r.shape[0],r.shape[1]]):r.rank===3?t=P(r,[1,r.shape[0],r.shape[1],r.shape[2]]):t=r,t}function oA(r,t,e,o,n,s){s==null&&(s=.001);let a=T(r,"x","batchNorm"),i=T(t,"mean","batchNorm"),c=T(e,"variance","batchNorm"),l;n!=null&&(l=T(n,"scale","batchNorm"));let p;o!=null&&(p=T(o,"offset","batchNorm")),E(i.rank===c.rank,()=>"Batch normalization gradient requires mean and variance to have equal ranks."),E(p==null||i.rank===p.rank,()=>"Batch normalization gradient requires mean and offset to have equal ranks."),E(l==null||i.rank===l.rank,()=>"Batch normalization gradient requires mean and scale to have equal ranks.");let m={x:e0(a),scale:l,offset:p,mean:i,variance:c},f={varianceEpsilon:s},d=v.runKernel(zs,m,f);return P(d,a.shape)}var uo=N({batchNorm_:oA});function nA(r,t,e,o,n,s){let a=T(r,"x","batchNorm"),i=T(t,"mean","batchNorm"),c=T(e,"variance","batchNorm"),l;n!=null&&(l=T(n,"scale","batchNorm"));let p;return o!=null&&(p=T(o,"offset","batchNorm")),E(a.rank===2,()=>`Error in batchNorm2D: x must be rank 2 but got rank ${a.rank}.`),E(i.rank===2||i.rank===1,()=>`Error in batchNorm2D: mean must be rank 2 or rank 1 but got rank ${i.rank}.`),E(c.rank===2||c.rank===1,()=>`Error in batchNorm2D: variance must be rank 2 or rank 1 but got rank ${c.rank}.`),l!=null&&E(l.rank===2||l.rank===1,()=>`Error in batchNorm2D: scale must be rank 2 or rank 1 but got rank ${l.rank}.`),p!=null&&E(p.rank===2||p.rank===1,()=>`Error in batchNorm2D: offset must be rank 2 or rank 1 but got rank ${p.rank}.`),uo(a,i,c,p,l,s)}var Hd=N({batchNorm2d_:nA});function sA(r,t,e,o,n,s){let a=T(r,"x","batchNorm"),i=T(t,"mean","batchNorm"),c=T(e,"variance","batchNorm"),l;n!=null&&(l=T(n,"scale","batchNorm"));let p;return o!=null&&(p=T(o,"offset","batchNorm")),E(a.rank===3,()=>`Error in batchNorm3D: x must be rank 3 but got rank ${a.rank}.`),E(i.rank===3||i.rank===1,()=>`Error in batchNorm3D: mean must be rank 3 or rank 1 but got rank ${i.rank}.`),E(c.rank===3||c.rank===1,()=>`Error in batchNorm3D: variance must be rank 3 or rank 1 but got rank ${c.rank}.`),l!=null&&E(l.rank===3||l.rank===1,()=>`Error in batchNorm3D: scale must be rank 3 or rank 1 but got rank ${l.rank}.`),p!=null&&E(p.rank===3||p.rank===1,()=>`Error in batchNorm3D: offset must be rank 3 or rank 1 but got rank ${p.rank}.`),uo(a,i,c,p,l,s)}var Kd=N({batchNorm3d_:sA});function aA(r,t,e,o,n,s){let a=T(r,"x","batchNorm"),i=T(t,"mean","batchNorm"),c=T(e,"variance","batchNorm"),l;n!=null&&(l=T(n,"scale","batchNorm"));let p;return o!=null&&(p=T(o,"offset","batchNorm")),E(a.rank===4,()=>`Error in batchNorm4D: x must be rank 4 but got rank ${a.rank}.`),E(i.rank===4||i.rank===1,()=>`Error in batchNorm4D: mean must be rank 4 or rank 1 but got rank ${i.rank}.`),E(c.rank===4||c.rank===1,()=>`Error in batchNorm4D: variance must be rank 4 or rank 1 but got rank ${c.rank}.`),l!=null&&E(l.rank===4||l.rank===1,()=>`Error in batchNorm4D: scale must be rank 4 or rank 1 but got rank ${l.rank}.`),p!=null&&E(p.rank===4||p.rank===1,()=>`Error in batchNorm4D: offset must be rank 4 or rank 1 but got rank ${p.rank}.`),uo(a,i,c,p,l,s)}var qd=N({batchNorm4d_:aA});function iA(r,t,e){let o=T(r,"x","bincount"),n=T(t,"weights","bincount");E(o.dtype==="int32",()=>`Error in bincount: input dtype must be int32, but got ${o.dtype}`),E(e>=0,()=>`size must be non-negative, but got ${e}.`),E(n.size===o.size||n.size===0,()=>`Error in bincount: weights must have the same size as input or0-length, but got input shape: ${o.shape}, weights shape: ${n.shape}.`);let s={x:o,weights:n},a={size:e};return v.runKernel(gs,s,a)}var sl=N({bincount_:iA});function cA(r,t){let e=T(r,"s0","broadcastArgs","int32"),o=T(t,"s1","broadcastArgs","int32");if(e.rank!==1)throw new Error(`broadcastArgs(): first input must be a vector (rank=1). Has rank ${e.rank}`);if(o.rank!==1)throw new Error(`broadcastArgs(): second input must be a vector (rank=1). Has rank ${o.rank}`);let n={s0:e,s1:o};return v.runKernel(xs,n)}var Xd=N({broadcastArgs_:cA});function lA(r,t){let e=T(r,"broadcastTo","x"),o=e.shape;if(t.some(l=>!(l>0)||l%1!==0))throw new Error(`broadcastTo(): Invalid broadcast shape [${t}].`);if(t.length<e.rank)throw new Error(`broadcastTo(): shape.length=${t.length} < input.rank=${e.rank}.`);if(t.length>e.rank){let l=e.shape.slice();for(;l.length<t.length;)l.unshift(1);e=P(e,l)}let n=e.shape,s=Array.from(t);for(let l=t.length-1;l>=0;l--)if(n[l]===t[l])s[l]=1;else if(e.shape[l]!==1)throw new Error(`broadcastTo(): [${o}] cannot be broadcast to [${t}].`);if(s.map((l,p)=>l>1?p:-1).filter(l=>l>=0).length===0)return Fe(e);let i={x:e},c={reps:s};return v.runKernel(so,i,c)}var mo=N({broadcastTo_:lA});function pA(r){let e={x:T(r,"x","ceil","float32")};return v.runKernel(Bo,e)}var jd=N({ceil_:pA});function wr(r,t,e){let o={shape:r,value:t,dtype:e};return v.runKernel(Bs,{},o)}function uA(r,t,e){let o=T(r,"x","clipByValue");if(E(t<=e,()=>`Error in clip: min (${t}) must be less than or equal to max (${e}).`),t===e)return wr(o.shape,t,o.dtype);let n={x:o},s={clipValueMin:t,clipValueMax:e};return v.runKernel(Vo,n,s)}var Yd=N({clipByValue_:uA});function mA(r){return Pt(r,0)}var Zd=N({concat1d_:mA});function fA(r,t){return Pt(r,t)}var Qd=N({concat2d_:fA});function dA(r,t){return Pt(r,t)}var Jd=N({concat3d_:dA});function hA(r,t){return Pt(r,t)}var th=N({concat4d_:hA});function gA(r,t,e,o,n="NHWC",s=[1,1],a){let i=T(r,"x","conv2d","float32"),c=T(t,"filter","conv2d","float32"),l=i,p=!1;i.rank===3&&(p=!0,l=P(i,[1,i.shape[0],i.shape[1],i.shape[2]])),E(l.rank===4,()=>`Error in conv2d: input must be rank 4, but got rank ${l.rank}.`),E(c.rank===4,()=>`Error in conv2d: filter must be rank 4, but got rank ${c.rank}.`),Jt("conv2d",o,a);let u=n==="NHWC"?l.shape[3]:l.shape[1];E(u===c.shape[2],()=>`Error in conv2d: depth of input (${u}) must match input depth for filter ${c.shape[2]}.`),E(Te(e,s),()=>`Error in conv2D: Either strides or dilations must be 1. Got strides ${e} and dilations '${s}'`);let m={x:l,filter:c},f={strides:e,pad:o,dataFormat:n,dilations:s,dimRoundingMode:a},d=v.runKernel(Ts,m,f);return p?P(d,[d.shape[1],d.shape[2],d.shape[3]]):d}var fo=N({conv2d_:gA});function xA(r,t,e,o,n="NWC",s=1,a){let i=T(r,"x","conv1d"),c=T(t,"filter","conv1d"),l=i,p=!1;i.rank===2&&(p=!0,l=P(i,[1,i.shape[0],i.shape[1]])),E(l.rank===3,()=>`Error in conv1d: input must be rank 3, but got rank ${l.rank}.`),E(c.rank===3,()=>`Error in conv1d: filter must be rank 3, but got rank ${c.rank}.`),Jt("conv1d",o,a),E(l.shape[2]===c.shape[1],()=>`Error in conv1d: depth of input (${l.shape[2]}) must match input depth for filter ${c.shape[1]}.`),E(Te(e,s),()=>`Error in conv1D: Either stride or dilation must be 1. Got stride ${e} and dilation '${s}'`),E(n==="NWC",()=>`Error in conv1d: got dataFormat of ${n} but only NWC is currently supported.`);let u=P(c,[1,c.shape[0],c.shape[1],c.shape[2]]),m=P(l,[l.shape[0],1,l.shape[1],l.shape[2]]),h=fo(m,u,[1,e],o,"NHWC",[1,s],a);return p?P(h,[h.shape[2],h.shape[3]]):P(h,[h.shape[0],h.shape[2],h.shape[3]])}var eh=N({conv1d_:xA});function yA(r,t,e,o,n,s="NHWC",a){E(r.length===t.rank,()=>`Length of inShape (${r.length}) and rank of dy (${t.rank}) must match`);let i=r,c=t,l=!1;t.rank===3&&(l=!0,c=P(t,[1,t.shape[0],t.shape[1],t.shape[2]]),i=[1,r[0],r[1],r[2]]),E(i.length===4,()=>`Error in conv2dDerInput: inShape must be length 4, but got length ${i.length}.`),E(c.rank===4,()=>`Error in conv2dDerInput: dy must be rank 4, but got rank ${c.rank}`),E(e.rank===4,()=>`Error in conv2dDerInput: filter must be rank 4, but got rank ${e.rank}`);let p=s==="NHWC"?i[3]:i[1],u=s==="NHWC"?c.shape[3]:c.shape[1];E(p===e.shape[2],()=>`Error in conv2dDerInput: depth of input (${p}) must match input depth for filter ${e.shape[2]}.`),E(u===e.shape[3],()=>`Error in conv2dDerInput: depth of output (${u}) must match output depth for filter ${e.shape[3]}.`),Jt("conv2dDerInput",n,a);let m={dy:c,filter:e},f={strides:o,pad:n,dataFormat:s,dimRoundingMode:a,inputShape:i},d=v.runKernel(ws,m,f);return l?P(d,[d.shape[1],d.shape[2],d.shape[3]]):d}var Dp=N({conv2DBackpropInput_:yA});function bA(r,t,e,o,n,s){let a=T(r,"x","conv2dTranspose"),i=T(t,"filter","conv2dTranspose");return Dp(e,a,i,o,n,"NHWC",s)}var rh=N({conv2dTranspose_:bA});function CA(r,t,e,o,n="NDHWC",s=[1,1,1]){let a=T(r,"x","conv3d"),i=T(t,"filter","conv3d"),c=a,l=!1;a.rank===4&&(l=!0,c=P(a,[1,a.shape[0],a.shape[1],a.shape[2],a.shape[3]])),E(c.rank===5,()=>`Error in conv3d: input must be rank 5, but got rank ${c.rank}.`),E(i.rank===5,()=>`Error in conv3d: filter must be rank 5, but got rank ${i.rank}.`),E(c.shape[4]===i.shape[3],()=>`Error in conv3d: depth of input (${c.shape[4]}) must match input depth for filter ${i.shape[3]}.`),E(Te(e,s),()=>`Error in conv3D: Either strides or dilations must be 1. Got strides ${e} and dilations '${s}'`),E(n==="NDHWC",()=>`Error in conv3d: got dataFormat of ${n} but only NDHWC is currently supported.`);let p={x:c,filter:i},u={strides:e,pad:o,dataFormat:n,dilations:s},m=v.runKernel(Ns,p,u);return l?P(m,[m.shape[1],m.shape[2],m.shape[3],m.shape[4]]):m}var oh=N({conv3d_:CA});function TA(r,t,e,o,n){E(r.length===t.rank,()=>`Length of inShape (${r.length}) and rank of dy (${t.rank}) must match`);let s=r,a=t,i=!1;t.rank===4&&(i=!0,a=P(t,[1,t.shape[0],t.shape[1],t.shape[2],t.shape[3]]),s=[1,r[0],r[1],r[2],r[3]]);let c=s[4],l=a.shape[4];E(s.length===5,()=>`Error in conv3dDerInput: inShape must be length 5, but got length ${s.length}.`),E(a.rank===5,()=>`Error in conv3dDerInput: dy must be rank 5, but got rank ${a.rank}`),E(e.rank===5,()=>`Error in conv3dDerInput: filter must be rank 5, but got rank ${e.rank}`),E(c===e.shape[3],()=>`Error in conv3dDerInput: depth of input (${c}) must match input depth for filter ${e.shape[3]}.`),E(l===e.shape[4],()=>`Error in conv3dDerInput: depth of output (${l}) must match output depth for filter ${e.shape[4]}.`);let p={dy:a,filter:e},u={pad:n,strides:o,inputShape:s},m=v.runKernel(Is,p,u);return i?P(m,[m.shape[1],m.shape[2],m.shape[3],m.shape[4]]):m}var r0=N({conv3DBackpropInput_:TA});function SA(r,t,e,o,n){let s=T(r,"x","conv3dTranspose"),a=T(t,"filter","conv3dTranspose");return r0(e,s,a,o,n)}var nh=N({conv3dTranspose_:SA});function wA(r){let e={x:T(r,"x","cos","float32")};return v.runKernel(zo,e)}var sh=N({cos_:wA});function NA(r){let e={x:T(r,"x","cosh","float32")};return v.runKernel(Wo,e)}var ah=N({cosh_:NA});function IA(r,t=0,e=!1,o=!1){let s={x:T(r,"x","cumprod")},a={axis:t,exclusive:e,reverse:o};return v.runKernel(vs,s,a)}var ih=N({cumprod_:IA});function vA(r,t=0,e=!1,o=!1){let s={x:T(r,"x","cumsum")},a={axis:t,exclusive:e,reverse:o};return v.runKernel(ks,s,a)}var ch=N({cumsum_:vA});function kA(r,t,e,o=!1){let n=T(r,"x","denseBincount"),s=T(t,"weights","denseBincount");E(n.dtype==="int32",()=>`Error in denseBincount: input dtype must be int32, but got ${n.dtype}`),E(n.rank<=2,()=>`Error in denseBincount: input must be at most rank 2, but got rank ${n.rank}.`),E(e>=0,()=>`size must be non-negative, but got ${e}.`),E(s.size===n.size||s.size===0,()=>`Error in denseBincount: weights must have the same shape as x or 0-length, but got x shape: ${n.shape}, weights shape: ${s.shape}.`);let a={x:n,weights:s},i={size:e,binaryOutput:o};return v.runKernel($s,a,i)}var lh=N({denseBincount_:kA});function EA(r,t,e="NHWC"){let o=T(r,"x","depthToSpace","float32"),n=e==="NHWC"?o.shape[1]:o.shape[2],s=e==="NHWC"?o.shape[2]:o.shape[3],a=e==="NHWC"?o.shape[3]:o.shape[1];E(t>1,()=>`blockSize should be > 1 for depthToSpace, but was: ${t}`),E(n*t>=0,()=>`Negative dimension size caused by overflow when multiplying
    ${n} and ${t}  for depthToSpace with input shape
    ${o.shape}`),E(s*t>=0,()=>`Negative dimension size caused by overflow when multiplying
    ${s} and ${t} for depthToSpace with input shape
        ${o.shape}`),E(a%(t*t)===0,()=>`Dimension size must be evenly divisible by ${t*t} but is ${a} for depthToSpace with input shape ${o.shape}`);let i={x:o},c={blockSize:t,dataFormat:e};return v.runKernel(Rs,i,c)}var ph=N({depthToSpace_:EA});function $A(r,t,e,o,n="NHWC",s=[1,1],a){let i=T(r,"x","depthwiseConv2d","float32"),c=T(t,"filter","depthwiseConv2d","float32"),l=i,p=!1;i.rank===3&&(p=!0,l=P(i,[1,i.shape[0],i.shape[1],i.shape[2]])),E(l.rank===4,()=>`Error in depthwiseConv2d: input must be rank 4, but got rank ${l.rank}.`),E(c.rank===4,()=>`Error in depthwiseConv2d: filter must be rank 4, but got rank ${c.rank}.`);let u=n==="NHWC"?l.shape[3]:l.shape[1];E(u===c.shape[2],()=>`Error in depthwiseConv2d: number of input channels (${u}) must match the inChannels dimension in filter ${c.shape[2]}.`),Jt("depthwiseConv2d",o,a);let m={x:l,filter:c},f={strides:e,pad:o,dataFormat:n,dilations:s,dimRoundingMode:a},d=v.runKernel(As,m,f);return p?P(d,[d.shape[1],d.shape[2],d.shape[3]]):d}var ri=N({depthwiseConv2d_:$A});function RA(r){let e={x:T(r,"x","diag")};return v.runKernel(_s,e)}var uh=N({diag_:RA});function AA(r,t,e,o,n=[1,1],s="NHWC"){let a=T(r,"x","dilation2d"),i=T(t,"filter","dilation2d");E(a.rank===3||a.rank===4,()=>`Error in dilation2d: input must be rank 3 or 4, but got rank ${a.rank}.`),E(i.rank===3,()=>`Error in dilation2d: filter must be rank 3, but got rank ${i.rank}.`),E(s==="NHWC",()=>`Error in dilation2d: Only NHWC is currently supported, but got dataFormat of ${s}`);let c=a,l=!1;a.rank===3&&(c=P(a,[1,a.shape[0],a.shape[1],a.shape[2]]),l=!0);let p={x:c,filter:i},u={strides:e,pad:o,dilations:n},m=v.runKernel(Os,p,u);return l?P(m,[m.shape[1],m.shape[2],m.shape[3]]):m}var mh=N({dilation2d_:AA});function FA(r,t){let e=T(r,"a","equal","string_or_numeric"),o=T(t,"b","equal","string_or_numeric");[e,o]=ht(e,o),kt(e.shape,o.shape);let n={a:e,b:o};return v.runKernel(Ko,n)}var al=N({equal_:FA});function DA(r,t,e){let o=T(t,"a","where"),n=T(e,"b","where"),s=T(r,"condition","where","bool"),a=kt(kt(s.shape,o.shape),n.shape),i=mo(s,a),c=mo(o,a),l=mo(n,a),p={condition:i,t:c,e:l};return v.runKernel(wa,p)}var or=N({where_:DA});function _A(r){let e={x:T(r,"x","zerosLike")};return v.runKernel(Ga,e)}var ee=N({zerosLike_:_A});function OA(r,t){let e=T(r,"a","div"),o=T(t,"b","div");[e,o]=ht(e,o);let n=Ct(e,o),s=ee(n),a=al(o,s);return or(a,s,n)}var fh=N({divNoNan_:OA});function PA(r,t){let e=T(r,"t1","dot"),o=T(t,"t2","dot");E((e.rank===1||e.rank===2)&&(o.rank===1||o.rank===2),()=>`Error in dot: inputs must all be rank 1 or 2, but got ranks ${e.rank} and ${o.rank}.`);let n=e.rank===1?e.size:e.shape[1],s=o.rank===1?o.size:o.shape[0];if(E(n===s,()=>`Error in dot: inner dimensions of inputs must match, but got ${n} and ${s}.`),e.rank===1&&o.rank===1){let a=P(e,[1,-1]),i=P(o,[-1,1]),c=wt(a,i);return P(c,[])}else if(e.rank===1&&o.rank===2){let a=P(e,[1,-1]),i=P(o,[o.shape[0],o.shape[1]]),c=wt(a,i);return P(c,[c.size])}else if(e.rank===2&&o.rank===1){let a=P(o,[-1,1]),i=wt(e,a);return P(i,[i.size])}else{let a=P(o,[o.shape[0],o.shape[1]]);return wt(e,a)}}var dh=N({dot_:PA});function LA(r,...t){let e=t.map((n,s)=>T(n,`tensors${s}`,"einsum")),o={equation:r};return v.runKernel(Ps,e,o)}var hh=N({einsum_:LA});function MA(r){let e={x:T(r,"x","elu","float32")};return v.runKernel(Uo,e)}var il=N({elu_:MA});function BA(r){let t=T(r,"x","erf");E(t.dtype==="int32"||t.dtype==="float32",()=>"Input dtype must be `int32` or `float32`."),t.dtype==="int32"&&(t=St(t,"float32"));let e={x:t};return v.runKernel(Ho,e)}var gh=N({erf_:BA});function xh(r,t){for(let e=0;e<r.length;++e)if(r[r.length-e-1]!==t-1-e)return!1;return!0}function o0(r,t,e){let o=r.length+t.length,n=[],s=0,a=0;for(let i=0;i<o;i++)e.indexOf(i)===-1?n.push(r[s++]):n.push(t[a++]);return n}function VA(r,t){let e=[],o=r.length;for(let s=0;s<o;s++)t.indexOf(s)===-1&&e.push(r[s]);let n=t.map(s=>r[s]);return[e,n]}function ho(r,t){let e=t.map(o=>1);return o0(r,e,t)}function zA(r,t,e){E(xh(t,e),()=>`${r} supports only inner-most axes for now. Got axes ${t} and rank-${e} input.`)}function WA(r,t){if(xh(r,t))return null;let e=[];for(let o=0;o<t;++o)r.indexOf(o)===-1&&e.push(o);return r.forEach(o=>e.push(o)),e}function GA(r){return r.map((t,e)=>[e,t]).sort((t,e)=>t[1]-e[1]).map(t=>t[0])}function UA(r,t){let e=[];for(let o=t-r;o<t;++o)e.push(o);return e}function KA(r,t=null,e=!1){let n={x:T(r,"x","max")},s={reductionIndices:t,keepDims:e};return v.runKernel(js,n,s)}var Nr=N({max_:KA});function qA(r,t=null,e=!1){let n={x:T(r,"x","min")},s={axis:t,keepDims:e};return v.runKernel(ta,n,s)}var Yi=N({min_:qA});function XA(r,t){let e=T(r,"base","pow"),o=T(t,"exp","pow");[e,o]=ht(e,o);let n={a:e,b:o};return v.runKernel(hn,n)}var Wr=N({pow_:XA});function at(r,t){if((oe(r)&&t!=="string"||Array.isArray(r))&&t!=="complex64")throw new Error("Error creating a new Scalar: value must be a primitive (number|boolean|string)");if(t==="string"&&oe(r)&&!(r instanceof Uint8Array))throw new Error("When making a scalar from encoded string, the value must be `Uint8Array`.");return Ee(r,[],[],t)}function jA(r){let e={x:T(r,"x","sqrt","float32")};return v.runKernel(kn,e)}var $e=N({sqrt_:jA});function YA(r){let t=T(r,"x","square"),e={};return v.runKernel("Square",{x:t},e)}var le=N({square_:YA});function ZA(r,t=null,e=!1){let o=T(r,"x","sum");o.dtype==="bool"&&(o=St(o,"int32"));let n={x:o},s={axis:t,keepDims:e};return v.runKernel(Ia,n,s)}var Et=N({sum_:ZA});function QA(r,t="euclidean",e=null,o=!1){r=T(r,"x","norm");let n=n0(r,t,e),s=n.shape;if(o){let a=Ao(e,r.shape);s=ho(n.shape,a)}return P(n,s)}function n0(r,t,e=null){if(r.rank===0)return ce(r);if(r.rank!==1&&e===null)return n0(P(r,[-1]),t,e);if(r.rank===1||typeof e=="number"||Array.isArray(e)&&e.length===1){if(t===1)return Et(ce(r),e);if(t===1/0)return Nr(ce(r),e);if(t===-1/0)return Yi(ce(r),e);if(t==="euclidean"||t===2)return $e(Et(Wr(ce(r),at(2,"int32")),e));throw new Error(`Error in norm: invalid ord value: ${t}`)}if(Array.isArray(e)&&e.length===2){if(t===1)return Nr(Et(ce(r),e[0]),e[1]-1);if(t===1/0)return Nr(Et(ce(r),e[1]),e[0]);if(t===-1/0)return Yi(Et(ce(r),e[1]),e[0]);if(t==="fro"||t==="euclidean")return $e(Et(le(r),e));throw new Error(`Error in norm: invalid ord value: ${t}`)}throw new Error(`Error in norm: invalid axis: ${e}`)}var Vn=N({norm_:QA});function JA(r,t=null,e=!1){return Vn(r,"euclidean",t,e)}var yh=N({euclideanNorm_:JA});function tF(r){let e={x:T(r,"x","exp")};return v.runKernel(qo,e)}var Xe=N({exp_:tF});function eF(r,t=0){let e=T(r,"x","expandDims","string_or_numeric");E(t<=e.rank,()=>"Axis must be <= rank of the tensor");let o={input:e},n={dim:t};return v.runKernel(Ls,o,n)}var Gr=N({expandDims_:eF});function rF(r){let e={x:T(r,"x","expm1")};return v.runKernel(Xo,e)}var bh=N({expm1_:rF});function oF(r,t){let e=T(r,"x","tile","string_or_numeric");E(e.rank===t.length,()=>`Error in transpose: rank of input ${e.rank} must match length of reps ${t}.`);let o={x:e},n={reps:t};return v.runKernel(so,o,n)}var go=N({tile_:oF});function nF(r,t,e,o="float32"){t==null&&(t=r);let n=et([r,t],o),s=r<=t?r:t;for(let i=0;i<s;++i)n.set(1,i,i);let a=P(n.toTensor(),[r,t]);if(e==null)return a;if(e.length===1)return go(Gr(a,0),[e[0],1,1]);if(e.length===2)return go(Gr(Gr(a,0),0),[e[0],e[1],1,1]);if(e.length===3)return go(Gr(Gr(Gr(a,0),0),0),[e[0],e[1],e[2],1,1]);throw new Error(`eye() currently supports only 1D and 2D batchShapes, but received ${e.length}D.`)}var cl=N({eye_:nF});function sF(r){let e={x:T(r,"x","floor","float32")};return v.runKernel(jo,e)}var ll=N({floor_:sF});function aF(r,t,e=0,o=0){let n=T(r,"x","gather"),s=T(t,"indices","gather","int32"),a={x:n,indices:s},i={axis:e,batchDims:o};return v.runKernel(Ws,a,i)}var pl=N({gather_:aF});function iF(r,t){let e=T(r,"a","greater","string_or_numeric"),o=T(t,"b","greater","string_or_numeric");[e,o]=ht(e,o),kt(e.shape,o.shape);let n={a:e,b:o};return v.runKernel(Zo,n)}var zn=N({greater_:iF});function cF(r,t){let e=T(r,"a","greaterEqual","string_or_numeric"),o=T(t,"b","greaterEqual","string_or_numeric");[e,o]=ht(e,o),kt(e.shape,o.shape);let n={a:e,b:o};return v.runKernel(Qo,n)}var ul=N({greaterEqual_:cF});function lF(r){let e={x:T(r,"x","isFinite")};return v.runKernel(Jo,e)}var Ch=N({isFinite_:lF});function pF(r){let e={x:T(r,"x","isInf")};return v.runKernel(tn,e)}var Th=N({isInf_:pF});function uF(r){let e={x:T(r,"x","isNaN")};return v.runKernel(en,e)}var Sh=N({isNaN_:uF});function mF(r,t=.2){let o={x:T(r,"x","leakyRelu")},n={alpha:t};return v.runKernel(Ks,o,n)}var ml=N({leakyRelu_:mF});function fF(r,t){let e=T(r,"a","less","string_or_numeric"),o=T(t,"b","less","string_or_numeric");[e,o]=ht(e,o),kt(e.shape,o.shape);let n={a:e,b:o};return v.runKernel(rn,n)}var wh=N({less_:fF});function dF(r,t){let e=T(r,"a","lessEqual","string_or_numeric"),o=T(t,"b","lessEqual","string_or_numeric");[e,o]=ht(e,o),kt(e.shape,o.shape);let n={a:e,b:o};return v.runKernel(on,n)}var oi=N({lessEqual_:dF});function Nh(r,t,e){if(e<=0)throw new Error("The number of values should be positive.");let o={start:r,stop:t,num:e};return v.runKernel(qs,{},o)}function hF(r,t=5,e=1,o=1,n=.5){let s=T(r,"x","localResponseNormalization");E(s.rank===4||s.rank===3,()=>`Error in localResponseNormalization: x must be rank 3 or 4 but got
               rank ${s.rank}.`),E(ro(t),()=>`Error in localResponseNormalization: depthRadius must be an integer but got depthRadius ${t}.`);let a=s,i=!1;s.rank===3&&(i=!0,a=P(s,[1,s.shape[0],s.shape[1],s.shape[2]]));let c={x:a},l={depthRadius:t,bias:e,alpha:o,beta:n},p=v.runKernel(Xs,c,l);return i?P(p,[p.shape[1],p.shape[2],p.shape[3]]):p}var Ih=N({localResponseNormalization_:hF});function gF(r){let e={x:T(r,"x","log","float32")};return v.runKernel(nn,e)}var Ur=N({log_:gF});function xF(r){let e={x:T(r,"x","log1p")};return v.runKernel(sn,e)}var fl=N({log1p_:xF});function s0(r){return E(Fr(r),()=>"The f passed in grad(f) must be a function"),(t,e)=>{let o=T(t,"x","tf.grad","string_or_numeric"),n=e!=null?T(e,"dy","tf.grad"):null;return v.tidy(()=>{let{value:s,grads:a}=v.gradients(()=>r(o),[o],n);return n!=null&&Lt(s.shape,n.shape,"The shape of dy passed in grad(f)(x, dy) must match the shape returned by f(x)"),Op(a),a[0]})}}function a0(r){return E(Fr(r),()=>"The f passed in grads(f) must be a function"),(t,e)=>{E(Array.isArray(t),()=>"The args passed in grads(f)(args) must be an array of `Tensor`s or `TensorLike`s");let o=co(t,"args","tf.grads","string_or_numeric"),n=e!=null?T(e,"dy","tf.grads"):null;return v.tidy(()=>{let{value:s,grads:a}=v.gradients(()=>r(...o),o,n);return n!=null&&Lt(s.shape,n.shape,"The shape of dy passed in grads(f)([x1,...], dy) must match the shape returned by f([x1,...])"),Op(a),a})}}function i0(r){return E(Fr(r),()=>"The f passed in valueAndGrad(f) must be a function"),(t,e)=>{E(t instanceof Ft,()=>"The x passed in valueAndGrad(f)(x) must be a tensor"),E(e==null||e instanceof Ft,()=>"The dy passed in valueAndGrad(f)(x, dy) must be a tensor");let{grads:o,value:n}=v.gradients(()=>r(t),[t],e);return Op(o),{grad:o[0],value:n}}}function c0(r){return E(Fr(r),()=>"The f passed in valueAndGrads(f) must be a function"),(t,e)=>{E(Array.isArray(t)&&t.every(n=>n instanceof Ft),()=>"The args passed in valueAndGrads(f)(args) must be array of tensors"),E(e==null||e instanceof Ft,()=>"The dy passed in valueAndGrads(f)(args, dy) must be a tensor");let o=v.gradients(()=>r(...t),t,e);return e!=null&&Lt(o.value.shape,e.shape,"The shape of dy passed in valueAndGrads(f)([x1,...], dy) must match the shape returned by f([x1,...])"),Op(o.grads),o}}function _p(r,t){E(Fr(r),()=>"The f passed in variableGrads(f) must be a function"),E(t==null||Array.isArray(t)&&t.every(l=>l instanceof Pr),()=>"The varList passed in variableGrads(f, varList) must be an array of variables");let e=t!=null;if(!e){t=[];for(let l in v.registeredVariables)t.push(v.registeredVariables[l])}let o=e?t.filter(l=>!l.trainable):null,n=t.length;t=t.filter(l=>l.trainable),E(t.length>0,()=>`variableGrads() expects at least one of the input variables to be trainable, but none of the ${n} variables is trainable.`);let s=!0,{value:a,grads:i}=v.gradients(r,t,null,s);E(i.some(l=>l!=null),()=>"Cannot find a connection between any variable and the result of the loss function y=f(x). Please make sure the operations that use variables are inside the function f passed to minimize()."),E(a.rank===0,()=>`The f passed in variableGrads(f) must return a scalar, but it returned a rank-${a.rank} tensor`);let c={};return t.forEach((l,p)=>{i[p]!=null&&(c[l.name]=i[p])}),o?.forEach(l=>c[l.name]=null),{value:a,grads:c}}function Se(r){return v.customGrad(r)}function Op(r){if(r.filter(e=>e==null).length>0)throw new Error(`Cannot compute gradient of y=f(x) with respect to x. Make sure that
    the f you passed encloses all operations that lead from x to y.`)}function yF(r){let e={x:T(r,"x","softplus")};return v.runKernel(vn,e)}var dl=N({softplus_:yF});function bF(r){let t=T(r,"x","logSigmoid");return Se(o=>({value:Ce(dl(Ce(o))),gradFunc:a=>q(a,Sr(Ce(o)))}))(t)}var vh=N({logSigmoid_:bF});function CF(r,t){let e=T(r,"a","sub"),o=T(t,"b","sub");[e,o]=ht(e,o);let n={a:e,b:o};return v.runKernel($n,n)}var pt=N({sub_:CF});function TF(r,t=-1){let e=T(r,"logits","logSoftmax");if(t===-1&&(t=e.rank-1),t!==e.rank-1)throw Error(`Log Softmax along a non-last dimension is not yet supported. Logits was rank ${e.rank} and axis was ${t}`);return Se((n,s)=>{let i=Nr(n,t,!0),c=pt(n,i),l=pt(St(c,"float32"),Ur(Et(Xe(c),t,!0)));return s([l]),{value:l,gradFunc:(u,m)=>{let[f]=m,d=!0,g=Xe(f);return pt(u,q(Et(u,t,d),g))}}})(e)}var kh=N({logSoftmax_:TF});function SF(r,t=null,e=!1){let o=T(r,"x","logSumExp"),n=Ao(t,o.shape),s=Nr(o,n,!0),a=pt(o,s),i=Xe(a),c=Et(i,n),l=Ur(c),p=nt(P(s,l.shape),l);if(e){let u=ho(p.shape,n);return P(p,u)}return p}var hl=N({logSumExp_:SF});function wF(r,t){let e=T(r,"a","logicalAnd","bool"),o=T(t,"b","logicalAnd","bool");kt(e.shape,o.shape);let n={a:e,b:o};return v.runKernel(an,n)}var Wn=N({logicalAnd_:wF});function NF(r){let e={x:T(r,"x","logicalNot","bool")};return v.runKernel(cn,e)}var gl=N({logicalNot_:NF});function IF(r,t){let e=T(r,"a","logicalOr","bool"),o=T(t,"b","logicalOr","bool");kt(e.shape,o.shape);let n={a:e,b:o};return v.runKernel(ln,n)}var xl=N({logicalOr_:IF});function vF(r,t){let e=T(r,"a","logicalXor","bool"),o=T(t,"b","logicalXor","bool");return kt(e.shape,o.shape),Wn(xl(r,t),gl(Wn(r,t)))}var Eh=N({logicalXor_:vF});var Pp=2147483648;function kF(r,t,e="left"){let o=T(r,"sortedSequence","searchSorted"),n=T(t,"values","searchSorted"),s=o.shape[o.shape.length-1],a=n.shape[n.shape.length-1],i=P(o,[-1,s]),c=P(n,[-1,a]);if(i.rank<2)throw new Error("Sorted input argument must be at least 2-dimensional");if(i.shape[0]!==c.shape[0])throw new Error("Leading dimension of 'sortedSequence' and 'values' must match.");if(bt(c.shape)>=Pp)throw new Error(`values tensor size must less than ${Pp}`);if(i.shape[1]>=Pp)throw new Error(`trailing dim_size must less than ${Pp} for int32 output type, was ${i.shape[1]}`);let l={sortedSequence:i,values:c},p={side:e};return v.runKernel(Sa,l,p)}var Zi=N({searchSorted_:kF});function $h(r,t){return Zi(r,t,"left")}function EF(r,t,e,o,n){let s=T(r,"x","maxPool"),a=1,i=s,c=!1;s.rank===3&&(c=!0,i=P(s,[1,s.shape[0],s.shape[1],s.shape[2]])),E(i.rank===4,()=>`Error in maxPool: input must be rank 4 but got rank ${i.rank}.`),E(Te(e,a),()=>`Error in maxPool: Either strides or dilations must be 1. Got strides ${e} and dilations '${a}'`),Jt("maxPool",o,n);let l={x:i},p={filterSize:t,strides:e,pad:o,dimRoundingMode:n},u=v.runKernel(Ys,l,p);return c?P(u,[u.shape[1],u.shape[2],u.shape[3]]):u}var yl=N({maxPool_:EF});function $F(r,t=[1,1,1],e,o,n,s="NDHWC"){let a=T(r,"x","maxPool3d"),i=a,c=!1;a.rank===4&&(c=!0,i=P(a,[1,a.shape[0],a.shape[1],a.shape[2],a.shape[3]])),E(i.rank===5,()=>`Error in maxPool3d: x must be rank 5 but got rank ${i.rank}.`),E(s==="NDHWC",()=>`Error in maxPool3d: Only NDHWC is currently supported, but got dataFormat of ${s}`),Jt("maxPool3d",o,n);let l={x:i},p={filterSize:t,strides:e,pad:o,dimRoundingMode:n,dataFormat:s},u=v.runKernel(Zs,l,p);return c?P(u,[u.shape[1],u.shape[2],u.shape[3],u.shape[4]]):u}var Rh=N({maxPool3d_:$F});function RF(r,t,e,o,n=!1){let a={x:T(r,"x","maxPoolWithArgmax")},i={filterSize:t,strides:e,pad:o,includeBatchInIndex:n},c=v.runKernel(Qs,a,i);return{result:c[0],indexes:c[1]}}var Ah=N({maxPoolWithArgmax_:RF});function AF(r,t){let e=T(r,"a","maximum"),o=T(t,"b","maximum");[e,o]=ht(e,o),e.dtype==="bool"&&(e=St(e,"int32"),o=St(o,"int32")),kt(e.shape,o.shape);let n={a:e,b:o};return v.runKernel(pn,n)}var bl=N({maximum_:AF});function FF(r,t=null,e=!1){let n={x:T(r,"x","mean")},s={axis:t,keepDims:e};return v.runKernel(Js,n,s)}var Gn=N({mean_:FF});function je(r,t="float32"){if(t==="complex64"){let o=je(r,"float32"),n=je(r,"float32");return ke(o,n)}let e=Ri(bt(r),t);return v.makeTensor(e,r,t)}function Ir(r,t="float32"){if(t==="complex64"){let o=Ir(r,"float32"),n=je(r,"float32");return ke(o,n)}let e=kc(bt(r),t);return v.makeTensor(e,r,t)}function Fh(r,t,{indexing:e="xy"}={}){if(e!=="xy"&&e!=="ij")throw new TypeError(`${e} is not a valid third argument to meshgrid`);if(r===void 0)return[];let o=T(r,"x","meshgrid",r instanceof Ft?r.dtype:"float32");if(t===void 0)return[o];let n=T(t,"y","meshgrid",t instanceof Ft?t.dtype:"float32"),s=bt(o.shape),a=bt(n.shape);return e==="xy"?(o=P(o,[1,-1]),n=P(n,[-1,1]),[wt(Ir([a,1],o.dtype),o),wt(n,Ir([1,s],n.dtype))]):(o=P(o,[-1,1]),n=P(n,[1,-1]),[wt(o,Ir([1,a],o.dtype)),wt(Ir([s,1],n.dtype),n)])}function DF(r,t){let e=T(r,"a","minimum"),o=T(t,"b","minimum");[e,o]=ht(e,o),e.dtype==="bool"&&(e=St(e,"int32"),o=St(o,"int32")),kt(e.shape,o.shape);let n={a:e,b:o};return v.runKernel(un,n)}var Cl=N({minimum_:DF});function _F(r,t,e){E(e==="reflect"||e==="symmetric",()=>`Invalid mode. Mode must be either reflect or symmetric. Got ${e}.`);let o=T(r,"x","mirrorPad");if(o.rank===0)throw new Error("mirrorPad(scalar) is not defined. Pass non-scalar to mirrorPad");E(t.length===o.rank,()=>`Padding doesn't match input. Must be ${o.rank}. Got ${t.length}.`);let n=e==="reflect"?1:0;for(let i=0;i<o.rank;i++)E(t[i].length===2,()=>"Invalid number of paddings. Must be length of 2 each."),E(t[i][0]>=0&&t[i][0]<=o.shape[i]-n&&t[i][1]>=0&&t[i][1]<=o.shape[i]-n,()=>`Padding in dimension ${i} cannot be greater than or equal to ${o.shape[i]-n} or less than 0 for input of shape ${o.shape}`);let s={paddings:t,mode:e},a={x:o};return v.runKernel(ea,a,s)}var Dh=N({mirrorPad_:_F});function OF(r,t){let e=T(r,"a","mod"),o=T(t,"b","mod");[e,o]=ht(e,o);let n={a:e,b:o};return v.runKernel(mn,n)}var _h=N({mod_:OF});function PF(r,t=null,e=!1){r=T(r,"x","moments");let o=Ao(t,r.shape),n=Gn(r,o,e),s=n.shape;e||(s=ho(n.shape,o));let a=le(pt(St(r,"float32"),P(n,s))),i=Gn(a,o,e);return{mean:n,variance:i}}var Oh=N({moments_:PF});function LF(r,t,e,o){let n=T(t,"data","multiRNNCell"),s=co(e,"c","multiRNNCell"),a=co(o,"h","multiRNNCell"),i=n,c=[];for(let u=0;u<r.length;u++){let m=r[u](i,s[u],a[u]);c.push(m[0]),c.push(m[1]),i=m[1]}let l=[],p=[];for(let u=0;u<c.length;u+=2)l.push(c[u]),p.push(c[u+1]);return[l,p]}var Ph=N({multiRNNCell_:LF});function MF(r,t,e,o=!1){let n=T(r,"logits","multinomial"),s=n.size,a=n.rank;if(s<2)throw new Error(`Error in multinomial: you need at least 2 outcomes, but got ${s}.`);if(a>2)throw new Error(`Rank of probabilities must be 1 or 2, but is ${a}`);e=e||Math.random();let c={logits:a===1?P(n,[1,-1]):n},l={numSamples:t,seed:e,normalized:o},p=v.runKernel(ra,c,l);return a===1?P(p,[p.size]):p}var Lh=N({multinomial_:MF});function BF(r,t){let e=T(r,"a","notEqual","string_or_numeric"),o=T(t,"b","notEqual","string_or_numeric");[e,o]=ht(e,o),kt(e.shape,o.shape);let n={a:e,b:o};return v.runKernel(dn,n)}var Tl=N({notEqual_:BF});function VF(r){let e={x:T(r,"x","onesLike")};return v.runKernel(ia,e)}var Mh=N({onesLike_:VF});function zF(r,t){let e=T(r,"v1","outerProduct"),o=T(t,"v2","outerProduct");E(e.rank===1&&o.rank===1,()=>`Error in outerProduct: inputs must be rank 1, but got ranks ${e.rank} and ${o.rank}.`);let n=P(e,[-1,1]),s=P(o,[1,-1]);return wt(n,s)}var Bh=N({outerProduct_:zF});function WF(r,t,e=0){let o=T(r,"x","pad");if(o.rank===0)throw new Error("pad(scalar) is not defined. Pass non-scalar to pad");let n={paddings:t,constantValue:e},s={x:o};return v.runKernel(pa,s,n)}var vr=N({pad_:WF});function GF(r,t,e=0){return E(t.length===2,()=>"Invalid number of paddings. Must be length of 2."),vr(r,[t],e)}var Vh=N({pad1d_:GF});function UF(r,t,e=0){return E(t.length===2&&t[0].length===2&&t[1].length===2,()=>"Invalid number of paddings. Must be length of 2 each."),vr(r,t,e)}var zh=N({pad2d_:UF});function HF(r,t,e=0){return E(t.length===3&&t[0].length===2&&t[1].length===2&&t[2].length===2,()=>"Invalid number of paddings. Must be length of 2 each."),vr(r,t,e)}var Wh=N({pad3d_:HF});function KF(r,t,e=0){return E(t.length===4&&t[0].length===2&&t[1].length===2&&t[2].length===2&&t[3].length===2,()=>"Invalid number of paddings. Must be length of 2 each."),vr(r,t,e)}var Gh=N({pad4d_:KF});function qF(r,t,e){let o=T(r,"x","spaceToBatchND");E(o.rank>=1+t.length,()=>`input rank ${o.rank} should be > than [blockShape] ${t.length}`),E(e.length===t.length,()=>`paddings.shape[0] ${e.length} must be equal to [blockShape] ${t.length}`),E(o.shape.reduce((a,i,c)=>c>0&&c<=t.length?a&&(i+e[c-1][0]+e[c-1][1])%t[c-1]===0:a,!0),()=>`input spatial dimensions ${o.shape.slice(1)} with paddings ${e.toString()} must be divisible by blockShapes ${t.toString()}`);let n={x:o},s={blockShape:t,paddings:e};return v.runKernel(va,n,s)}var Sl=N({spaceToBatchND_:qF});function XF(r,t,e,o,n,s,a){n==null&&(n=[1,1]),s==null&&(s=1),o===0&&(o="valid");let i=T(r,"x","maxPool"),c=i,l=!1;i.rank===3&&(l=!0,c=P(i,[1,i.shape[0],i.shape[1],i.shape[2]])),E(Te(s,n),()=>`Error in pool: Either strides or dilations must be 1. Got strides ${s} and dilations '${n}'`);let p=zd(c.shape,t,s,n,o),u=[p.dilationHeight,p.dilationWidth],m;o==="same"?m=YF([p.filterHeight,p.filterWidth],u):m=[[0,0],[0,0]];let f=u[0]===1&&u[1]===1,[d,g]=jF([p.inHeight,p.inWidth],u,m),h=f?o:"valid",x=f?c:Sl(c,u,d),S=(e==="avg"?()=>ol(x,t,s,h,a):()=>yl(x,t,s,h,a))(),w=f?S:nl(S,u,g);return l?P(w,[w.shape[1],w.shape[2],w.shape[3]]):w}function jF(r,t,e){let o=e.map(p=>p[0]),n=e.map(p=>p[1]),s=r.concat(o,n),a=t.map((p,u)=>(p-s[u]%p)%p),i=n.map((p,u)=>p+a[u]),c=t.map((p,u)=>[o[u],i[u]]),l=t.map((p,u)=>[0,a[u]]);return[c,l]}function YF(r,t){let o=r.map((a,i)=>a+(a-1)*(t[i]-1)).map(a=>a-1),n=o.map(a=>Math.floor(a/2)),s=o.map((a,i)=>a-n[i]);return o.map((a,i)=>[n[i],s[i]])}var Uh=N({pool_:XF});function ZF(r,t){let e=T(r,"x","prelu"),o=T(t,"alpha","prelu"),n={x:e,alpha:o};return v.runKernel(ua,n)}var wl=N({prelu_:ZF});function QF(r,t=null,e=!1){let o=T(r,"x","prod");o.dtype==="bool"&&(o=St(o,"int32"));let n={x:o},s={axis:t,keepDims:e};return v.runKernel(ma,n,s)}var Hh=N({prod_:QF});function JF(r,t,e,o){let n=r.map((p,u)=>T(p,`tensors${u}`,"raggedGather","int32")),s=T(t,"paramsDenseValues","raggedGather"),a=T(e,"indices","raggedGather","int32"),i={paramsNestedSplits:n,paramsDenseValues:s,indices:a},c={outputRaggedRank:o},l=v.runKernel(fa,i,c);return{outputNestedSplits:l.slice(0,l.length-1),outputDenseValues:l[l.length-1]}}var Kh=N({raggedGather_:JF});function tD(r,t,e,o,n){let s=T(r,"shape","raggedTensorToTensor","int32"),a=T(t,"values","raggedTensorToTensor"),i=T(e,"defaultValue","raggedTensorToTensor",a.dtype),c=o.map((u,m)=>T(u,`tensors${m}`,"raggedTensorToTensor","int32")),l={shape:s,values:a,defaultValue:i,rowPartitionTensors:c},p={rowPartitionTypes:n};return v.runKernel(da,l,p)}var qh=N({raggedTensorToTensor_:tD});function eD(r,t,e){let o=bt(r),n=null;if(e==null||e==="float32")n=new Float32Array(o);else if(e==="int32")n=new Int32Array(o);else if(e==="bool")n=new Uint8Array(o);else throw new Error(`Unknown data type ${e}`);for(let s=0;s<o;s++)n[s]=t();return v.makeTensor(n,r,e)}var Xh=N({rand_:eD});var Vp=Af(eg());var si=class{constructor(t,e,o,n,s){this.mean=t,this.stdDev=e,this.dtype=o,this.nextVal=NaN,this.truncated=n,this.truncated&&(this.upper=this.mean+this.stdDev*2,this.lower=this.mean-this.stdDev*2);let a=s||Math.random();this.random=Vp.alea(a.toString())}nextValue(){if(!isNaN(this.nextVal)){let n=this.nextVal;return this.nextVal=NaN,n}let t,e,o=!1;for(;!o;){let n,s,a;do n=2*this.random()-1,s=2*this.random()-1,a=n*n+s*s;while(a>=1||a===0);let i=Math.sqrt(-2*Math.log(a)/a);t=this.mean+this.stdDev*n*i,e=this.mean+this.stdDev*s*i,(!this.truncated||this.isValidTruncated(t))&&(o=!0)}return(!this.truncated||this.isValidTruncated(e))&&(this.nextVal=this.convertValue(e)),this.convertValue(t)}convertValue(t){return this.dtype==null||this.dtype==="float32"?t:Math.round(t)}isValidTruncated(t){return t<=this.upper&&t>=this.lower}},Mp=class{constructor(t,e,o,n){this.alpha=t,this.beta=1/e,this.dtype=o;let s=n||Math.random();this.randu=Vp.alea(s.toString()),this.randn=new si(0,1,o,!1,this.randu()),t<1?this.d=t+2/3:this.d=t-1/3,this.c=1/Math.sqrt(9*this.d)}nextValue(){let t,e,o,n,s,a;for(;;){do n=this.randn.nextValue(),a=1+this.c*n;while(a<=0);if(a*=a*a,t=n*n,e=1-.331*t*t,o=.5*t+this.d*(1-a+Math.log(a)),s=this.randu(),s<e||Math.log(s)<o)break}return a=1/this.beta*this.d*a,this.alpha<1&&(a*=Math.pow(this.randu(),1/this.alpha)),this.convertValue(a)}convertValue(t){return this.dtype==="float32"?t:Math.round(t)}},Bp=class{constructor(t=0,e=1,o,n){if(this.canReturnFloat=()=>this.dtype==null||this.dtype==="float32",this.min=t,this.range=e-t,this.dtype=o,n==null&&(n=Math.random()),typeof n=="number"&&(n=n.toString()),!this.canReturnFloat()&&this.range<=1)throw new Error(`The difference between ${t} - ${e} <= 1 and dtype is not float`);this.random=Vp.alea(n)}convertValue(t){return this.canReturnFloat()?t:Math.round(t)}nextValue(){return this.convertValue(this.min+this.range*this.random())}};function cD(r,t,e=1,o="float32",n){if(e==null&&(e=1),o==null&&(o="float32"),o!=="float32"&&o!=="int32")throw new Error(`Unsupported data type ${o}`);let s=new Mp(t,e,o,n),a=et(r,o);for(let i=0;i<a.values.length;i++)a.values[i]=s.nextValue();return a.toTensor()}var rg=N({randomGamma_:cD});function lD(r,t=0,e=1,o,n){if(o!=null&&o==="bool")throw new Error(`Unsupported data type ${o}`);let s=new si(t,e,o,!1,n),a=et(r,o);for(let i=0;i<a.values.length;i++)a.values[i]=s.nextValue();return a.toTensor()}var Nl=N({randomNormal_:lD});function pD(r,t,e){if(t!=null&&t==="bool")throw new Error(`Unsupported data type ${t}`);return Nl(r,0,1,t,e)}var og=N({randomStandardNormal_:pD});function uD(r,t=0,e=1,o="float32",n){let s=et(r,o),a=new Bp(t,e,null,n);for(let i=0;i<s.values.length;i++)s.values[i]=a.nextValue();return s.toTensor()}var Il=N({randomUniform_:uD});function xo(r,t,e=1,o="float32"){if(e===0)throw new Error("Cannot have a step of zero");let n={start:r,stop:t,step:e,dtype:o};return v.runKernel(ha,{},n)}function mD(r){let e={x:T(r,"x","reciprocal")};return v.runKernel(gn,e)}var ng=N({reciprocal_:mD});function fD(r){let e={x:T(r,"x","relu")};return v.runKernel(xn,e)}var yo=N({relu_:fD});function dD(r){let e={x:T(r,"x","relu6")};return v.runKernel(yn,e)}var vl=N({relu6_:dD});function hD(r,t){let o={x:T(r,"x","reverse")},n={dims:t};return v.runKernel(Ca,o,n)}var Ve=N({reverse_:hD});function gD(r){let t=T(r,"x","reverse");return E(t.rank===1,()=>`Error in reverse1D: x must be rank 1 but got rank ${t.rank}.`),Ve(t,0)}var sg=N({reverse1d_:gD});function xD(r,t){let e=T(r,"x","reverse");return E(e.rank===2,()=>`Error in reverse2D: x must be rank 2 but got rank ${e.rank}.`),Ve(e,t)}var ag=N({reverse2d_:xD});function yD(r,t){let e=T(r,"x","reverse");return E(e.rank===3,()=>`Error in reverse3D: x must be rank 3 but got rank ${e.rank}.`),Ve(e,t)}var ig=N({reverse3d_:yD});function bD(r,t){let e=T(r,"x","reverse");return E(e.rank===4,()=>`Error in reverse4D: x must be rank 4 but got rank ${e.rank}.`),Ve(e,t)}var cg=N({reverse4d_:bD});function CD(r){let e={x:T(r,"x","round")};return v.runKernel(bn,e)}var kl=N({round_:CD});function TD(r){let e={x:T(r,"x","rsqrt","float32")};return v.runKernel(Cn,e)}var lg=N({rsqrt_:TD});function SD(r){let e={x:T(r,"x","selu")};return v.runKernel(Tn,e)}var pg=N({selu_:SD});function wD(r,t,e,o,n,s=[1,1],a="NHWC"){let i=T(r,"x","separableConv2d"),c=T(t,"depthwiseFilter","separableConv2d"),l=T(e,"pointwiseFilter","separableConv2d"),p=i,u=!1;if(i.rank===3&&(u=!0,p=P(i,[1,i.shape[0],i.shape[1],i.shape[2]])),a==="NCHW")throw new Error("separableConv2d currently does not support dataFormat NCHW; only NHWC is supported");E(p.rank===4,()=>`Error in separableConv2d: input must be rank 4, but got rank ${p.rank}.`),E(c.rank===4,()=>`Error in separableConv2d: depthwise filter must be rank 4, but got rank ${c.rank}.`),E(l.rank===4,()=>`Error in separableConv2d: pointwise filter must be rank 4, but got rank ${c.rank}.`),E(l.shape[0]===1,()=>`Error in separableConv2d: the first dimension of pointwise filter  must be 1, but got ${l.shape[0]}.`),E(l.shape[1]===1,()=>`Error in separableConv2d: the second dimension of pointwise filter must be 1, but got ${l.shape[1]}.`);let m=c.shape[2],f=c.shape[3];E(l.shape[2]===m*f,()=>`Error in separableConv2d: the third dimension of pointwise filter must be ${m*f}, but got ${l.shape[2]}.`);let d=ri(p,c,o,n,a,s),h=fo(d,l,1,"valid",a);return u?P(h,[h.shape[1],h.shape[2],h.shape[3]]):h}var ug=N({separableConv2d_:wD});async function ND(r,t){let e=T(r,"x","setdiff1d"),o=T(t,"y","setdiff1d");E(e.dtype===o.dtype,()=>`x and y should have the same dtype, but got x (${e.dtype}) and y (${o.dtype}).`),E(e.rank===1,()=>`x should be 1D tensor, but got x (${e.shape}).`),E(o.rank===1,()=>`y should be 1D tensor, but got y (${o.shape}).`);let n=await e.data(),s=await o.data(),a=new Set(s),i=0;for(let p=0;p<n.length;p++)a.has(n[p])||i++;let c=new $t([i],e.dtype),l=new $t([i],"int32");for(let p=0,u=0;p<n.length;p++)a.has(n[p])||(c.values[u]=n[p],l.values[u]=p,u++);return[c.toTensor(),l.toTensor()]}var mg=ND;function ID(r){let e={x:T(r,"x","sign")};return v.runKernel(Nn,e)}var fg=N({sign_:ID});function vD(r){let e={x:T(r,"x","sin","float32")};return v.runKernel(Sn,e)}var dg=N({sin_:vD});function kD(r){let e={x:T(r,"x","sinh")};return v.runKernel(wn,e)}var hg=N({sinh_:kD});function ED(r,t,e){let o=T(r,"x","slice1d");return E(o.rank===1,()=>`slice1d expects a rank-1 tensor, but got a rank-${o.rank} tensor`),Tt(o,[t],[e])}var gg=N({slice1d_:ED});function $D(r,t,e){let o=T(r,"x","slice2d");return E(o.rank===2,()=>`slice2d expects a rank-2 tensor, but got a rank-${o.rank} tensor`),Tt(o,t,e)}var xg=N({slice2d_:$D});function RD(r,t,e){let o=T(r,"x","slice3d");return E(o.rank===3,()=>`slice3d expects a rank-3 tensor, but got a rank-${o.rank} tensor`),Tt(o,t,e)}var yg=N({slice3d_:RD});function AD(r,t,e){let o=T(r,"x","slice4d");return E(o.rank===4,()=>`slice4d expects a rank-4 tensor, but got a rank-${o.rank} tensor`),Tt(o,t,e)}var bg=N({slice4d_:AD});function FD(r,t=-1){let e=T(r,"logits","softmax","float32");if(t===-1&&(t=e.rank-1),t!==e.rank-1)throw Error(`Softmax along a non-last dimension is not yet supported. Logits was rank ${e.rank} and dim was ${t}`);let o={logits:e},n={dim:t};return v.runKernel(Ea,o,n)}var Cg=N({softmax_:FD});function DD(r){E(r.dtype==="complex64",()=>`The dtype for tf.spectral.fft() must be complex64 but got ${r.dtype}.`);let t={input:r};return v.runKernel(Ms,t)}var ai=N({fft_:DD});function _D(r){E(r.dtype==="complex64",()=>`The dtype for tf.spectral.ifft() must be complex64 but got ${r.dtype}.`);let t={input:r};return v.runKernel(Us,t)}var Un=N({ifft_:_D});function OD(r){let t=r.shape[r.shape.length-1],e=r.size/t,o;if(t<=2){let n=P(r,[e,t]);o=Un(n)}else{let n=[e,2*(t-1)],s=P(Vr(r),[e,t]),a=P(po(r),[e,t]),i=Ve(Tt(s,[0,1],[e,t-2]),1),c=q(Ve(Tt(a,[0,1],[e,t-2]),1),at(-1)),l=Pt([s,i],1),p=Pt([a,c],1),u=P(ke(l,p),[n[0],n[1]]);o=Un(u)}if(o=Vr(o),r.rank===3&&r.shape[0]!==0){let n=o,s=r.shape[0];o=P(o,[s,o.shape[0]/s,o.shape[1]]),n.dispose()}return o}var El=N({irfft_:OD});function PD(r,t,e=0){let n={x:T(r,"x","split")},s={numOrSizeSplits:t,axis:e};return v.runKernel(ka,n,s)}var Hr=N({split_:PD});function LD(r,t){E(r.dtype==="float32",()=>`The dtype for rfft() must be real value but got ${r.dtype}`);let e=r.shape[r.shape.length-1],o=r.size/e,n;if(t!=null&&t<e){let d=r.shape.map(h=>0),g=r.shape.map(h=>h);g[r.shape.length-1]=t,n=Tt(r,d,g),e=t}else if(t!=null&&t>e){let d=r.shape.map(g=>g);d[r.shape.length-1]=t-e,n=Pt([r,je(d)],r.shape.length-1),e=t}else n=r;let s=ee(n),a=P(ke(n,s),[o,e]),i=ai(a),c=Math.floor(e/2)+1,l=Vr(i),p=po(i),u=Hr(l,[c,e-c],l.shape.length-1),m=Hr(p,[c,e-c],p.shape.length-1),f=n.shape.slice();return f[n.shape.length-1]=c,P(ke(u[0],m[0]),f)}var ii=N({rfft_:LD});function MD(r,t){let e=T(r,"a","squaredDifference"),o=T(t,"b","squaredDifference");[e,o]=ht(e,o),kt(e.shape,o.shape);let n={a:e,b:o},s={};return v.runKernel(En,n,s)}var $l=N({squaredDifference_:MD});function BD(r,t){let e=T(r,"x","squeeze","string_or_numeric");return P(e,Ff(e.shape,t).newShape)}var ci=N({squeeze_:BD});function VD(r,t=0){let e=co(r,"tensors","stack","string_or_numeric");E(e.length>=1,()=>"Pass at least one tensor to tf.stack"),e.length>0&&E(t<=e[0].rank,()=>"Axis must be <= rank of the tensor");let o=e,n={axis:t};return v.runKernel(la,o,n)}var we=N({stack_:VD});function zD(r,t=0){let o={x:T(r,"x","step")},n={alpha:t};return v.runKernel(Fn,o,n)}var Rl=N({step_:zD});function WD(r,t,e,o,n=0,s=0,a=0,i=0,c=0){let p={x:T(r,"x","stridedSlice","string_or_numeric")},u={begin:t,end:e,strides:o,beginMask:n,endMask:s,ellipsisMask:a,newAxisMask:i,shrinkAxisMask:c};return v.runKernel(_a,p,u)}var Tg=N({stridedSlice_:WD});function GD(r){let e={x:T(r,"x","tan","float32")};return v.runKernel(Rn,e)}var Sg=N({tan_:GD});function he(r,t){qe(r);let e=de(r,t);if(e.length!==1)throw new Error("tensor1d() requires values to be a flat/TypedArray");return Ee(r,null,e,t)}function bo(r,t,e){if(qe(r),t!=null&&t.length!==2)throw new Error("tensor2d() requires shape to have two numbers");let o=de(r,e);if(o.length!==2&&o.length!==1)throw new Error("tensor2d() requires values to be number[][] or flat/TypedArray");if(o.length===1&&t==null)throw new Error("tensor2d() requires shape to be provided when `values` are a flat/TypedArray");return Ee(r,t,o,e)}function wg(r,t,e){if(qe(r),t!=null&&t.length!==4)throw new Error("tensor4d() requires shape to have four numbers");let o=de(r,e);if(o.length!==4&&o.length!==1)throw new Error("tensor4d() requires values to be number[][][][] or flat/TypedArray");if(o.length===1&&t==null)throw new Error("tensor4d() requires shape to be provided when `values` are a flat array");return Ee(r,t,o,e)}function Ng(r,t,e){if(qe(r),t!=null&&t.length!==5)throw new Error("tensor5d() requires shape to have five numbers");let o=de(r,e);if(o.length!==5&&o.length!==1)throw new Error("tensor5d() requires values to be number[][][][][] or flat/TypedArray");if(o.length===1&&t==null)throw new Error("tensor5d() requires shape to be provided when `values` are a flat array");return Ee(r,t,o,e)}function Ig(r,t,e){if(qe(r),t!=null&&t.length!==6)throw new Error("tensor6d() requires shape to have six numbers");let o=de(r,e);if(o.length!==6&&o.length!==1)throw new Error("tensor6d() requires values to be number[][][][][][] or flat/TypedArray");if(o.length===1&&t==null)throw new Error("tensor6d() requires shape to be provided when `values` are a flat array");return t=t||o,Ee(r,t,o,e)}function UD(r,t=1,e=!0){let o=T(r,"x","topk");if(o.rank===0)throw new Error("topk() expects the input to be of rank 1 or higher");let n=o.shape[o.shape.length-1];if(t<0)throw new Error(`'k' passed to topk() must be >= 0 but got ${t}`);if(t>n)throw new Error(`'k' passed to topk() must be <= the last dimension (${n}) but got ${t}`);let s={x:o},a={k:t,sorted:e},[i,c]=v.runKernel(Ma,s,a);return{values:i,indices:c}}var vg=N({topk_:UD});function HD(r,t=0,e=1,o,n){if(o!=null&&o==="bool")throw new Error("Unsupported data type $ { dtype }");let s=new si(t,e,o,!0,n),a=et(r,o);for(let i=0;i<a.values.length;i++)a.values[i]=s.nextValue();return a.toTensor()}var kg=N({truncatedNormal_:HD});function KD(r,t=0){let e=T(r,"x","unique","string_or_numeric");E(e.rank>0,()=>"The input tensor must be at least 1D");let o={x:e},n={axis:t},[s,a]=v.runKernel(Va,o,n);return{values:s,indices:a}}var Eg=N({unique_:KD});function qD(r,t,e){let o=T(r,"x","unsortedSegmentSum"),n=T(t,"segmentIds","unsortedSegmentSum","int32");E(ro(e),()=>"numSegments must be of dtype int");let s={x:o,segmentIds:n},a={numSegments:e};return v.runKernel(Wa,s,a)}var $g=N({unsortedSegmentSum_:qD});function XD(r,t=0){let e=T(r,"x","unstack","string_or_numeric");E(t>=-e.shape.length&&t<e.shape.length,()=>`Axis = ${t} is not in [-${e.shape.length}, ${e.shape.length})`);let o={value:e},n={axis:t};return v.runKernel(za,o,n)}var ze=N({unstack_:XD});function Rg(r,t){return Zi(r,t,"right")}function Ag(r,t=!0,e,o){return v.makeVariable(r,t,e,o)}function zp(r,t){let e=[];for(let s=0;s<t.length;s++)t[s]&&e.push(s);let o=et(r,"int32"),n=et([e.length,r.length],"int32");for(let s=0;s<e.length;s++){let a=o.indexToLoc(e[s]),i=s*r.length;n.values.set(a,i)}return n.toTensor()}async function jD(r){let t=T(r,"condition","whereAsync","bool"),e=await t.data(),o=zp(t.shape,e);return r!==t&&t.dispose(),o}var Al=jD;async function YD(r,t,e){let o=T(r,"tensor","boolMask"),n=T(t,"mask","boolMask","bool"),s=e??0,a=n.rank,i=o.shape;E(a>0,()=>"mask cannot be scalar"),Lt(i.slice(s,s+a),n.shape,"mask's shape must match the first K dimensions of tensor's shape,");let c=1;for(let g=s;g<s+a;g++)c*=i[g];let l=i.slice(0,s).concat([c],i.slice(s+a)),p=P(o,l),u=P(n,[-1]),m=await Al(u),f=ci(m,[1]),d=pl(p,f,s);return r!==o&&o.dispose(),t!==n&&n.dispose(),f.dispose(),p.dispose(),u.dispose(),m.dispose(),d}var N0=YD;function ZD(r,t,e,o,n=!0){let s=T(r,"v","movingAverage"),a=T(t,"x","movingAverage"),i=T(e,"decay","movingAverage");Zf(s,a),E(Oe(s.shape,a.shape),()=>"Shape mismatch in v and x");let c=at(1),l=pt(c,i),p=q(pt(a,s),l);if(n){E(o!=null,()=>"When using zeroDebias: true, step is required.");let u=T(o,"step","movingAverage");p=Ct(p,pt(c,Wr(i,u)))}return nt(s,p)}var I0=N({movingAverage_:ZD});function QD(r,t,e){let o=T(r,"indices","scatterND","int32"),n=T(t,"updates","scatterND");$p(n,o,e);let s={indices:o,updates:n},a={shape:e};return v.runKernel(Ta,s,a)}var v0=N({scatterND_:QD});function k0(r,t,e,o){if(r.dtype!=="int32")throw new Error(`tf.sparseToDense() expects the indices to be int32 type, but the dtype was ${r.dtype}.`);if(r.rank>2)throw new Error(`sparseIndices should be a scalar, vector, or matrix, but got shape ${r.shape}.`);let n=r.rank>0?r.shape[0]:1,s=r.rank>1?r.shape[1]:1;if(e.length!==s)throw new Error(`outputShape has incorrect number of elements:, ${e.length}, should be: ${s}.`);let a=t.size;if(!(t.rank===0||t.rank===1&&a===n))throw new Error(`sparseValues has incorrect shape ${t.shape}, should be [] or [${n}]`);if(t.dtype!==o.dtype)throw new Error("sparseValues.dtype must match defaultValues.dtype")}function t_(r,t,e,o=0){let n=T(r,"sparseIndices","sparseToDense","int32"),s=T(t,"sparseValues","sparseToDense","string_or_numeric"),a=T(o,"defaultValue","sparseToDense",s.dtype);k0(n,s,e,a);let i={sparseIndices:n,sparseValues:s,defaultValue:a},c={outputShape:e};return v.runKernel(Da,i,c)}var E0=N({sparseToDense_:t_});function e_(r,t){let e=T(t,"indices","gatherND","int32"),n={params:T(r,"x","gatherND","string_or_numeric"),indices:e};return v.runKernel(Gs,n)}var $0=N({gatherND_:e_});function R0(r,t){if(t==null)return r.shape.slice();if(Oe(r.shape,t))return t;if(r.shape.length===t.length){let e=[];for(let o=0;o<r.shape.length;o++)t[o]==null&&r.shape[o]!=null?e.push(r.shape[o]):e.push(t[o]);return e}return t}function r_(r,t,e,o){let n=T(r,"x","dropout");if(E(n.dtype==="float32",()=>`x has to be a floating point tensor since it's going to be scaled, but got a ${n.dtype} tensor instead.`),E(t>=0&&t<1,()=>`rate must be a float in the range [0, 1), but got ${t}.`),t===0)return r instanceof Ft?n.clone():n;let s=R0(n,e),a=1-t,i=Ct(ll(nt(Il(s,0,1,"float32",o),a)),a);return q(n,i)}var A0=N({dropout_:r_});function Wp(r){return Math.floor(Math.pow(2,Math.ceil(Math.log(r)/Math.log(2))))}function Qi(r,t,e){let o=1-r%2,n=new Float32Array(r);for(let s=0;s<r;++s){let a=2*Math.PI*s/(r+o-1);n[s]=t-e*Math.cos(a)}return he(n,"float32")}async function o_(r,t,e=1){let o=T(r,"predictions","inTopK"),n=T(t,"targets","inTopK");E(o.rank>1,()=>`inTopK() expects the predictions to be of rank 2 or higher, but got ${o.rank}`),E(o.rank-1===n.rank,()=>`predictions rank should be 1 larger than targets rank, but got predictions rank ${o.rank} and targets rank ${n.rank}`),Lt(o.shape.slice(0,o.shape.length-1),n.shape,"predictions's shape should be align with the targets' shape, except the last dimension.");let s=o.shape[o.shape.length-1];E(e>0&&e<=s,()=>`'k' passed to inTopK() must be > 0 && <= the predictions last dimension (${s}), but got ${e}`);let a=await o.data(),i=await n.data(),[c,l]=[a.length/s,s],p=Df("bool",c);for(let u=0;u<c;u++){let m=u*l,f=a.subarray(m,m+l),d=[];for(let g=0;g<f.length;g++)d.push({value:f[g],index:g});d.sort((g,h)=>h.value-g.value),p[u]=0;for(let g=0;g<e;g++)if(d[g].index===i[u]){p[u]=1;break}}return r!==o&&o.dispose(),t!==n&&n.dispose(),be(p,n.shape,"bool")}var F0=o_;var Gp={};It(Gp,{conv2d:()=>_0,depthwiseConv2d:()=>L0,matMul:()=>M0});function n_(r,t,e,o,n,s="NHWC",a){let i=r;r.rank===3&&(i=P(r,[1,r.shape[0],r.shape[1],r.shape[2]]));let c=t;c.rank===3&&(c=P(t,[1,t.shape[0],t.shape[1],t.shape[2]])),E(i.rank===4,()=>`Error in conv2dDerFilter: input must be rank 4, but got shape ${i.shape}.`),E(c.rank===4,()=>`Error in conv2dDerFilter: dy must be rank 4, but got shape ${c.shape}.`),E(e.length===4,()=>`Error in conv2dDerFilter: filterShape must be length 4, but got ${e}.`);let l=s==="NHWC"?i.shape[3]:i.shape[1],p=s==="NHWC"?c.shape[3]:c.shape[1];E(l===e[2],()=>`Error in conv2dDerFilter: depth of input ${l}) must match input depth in filter (${e[2]}.`),E(p===e[3],()=>`Error in conv2dDerFilter: depth of dy (${p}) must match output depth for filter (${e[3]}).`),Jt("conv2dDerFilter",n,a);let u={x:i,dy:c},m={strides:o,pad:n,dataFormat:s,dimRoundingMode:a,filterShape:e};return v.runKernel(Ss,u,m)}var D0=N({conv2DBackpropFilter_:n_});function li(r,t,e){if(e==null||e==="linear")return r;if(e==="relu")return q(r,Rl(t));throw new Error(`Cannot compute gradient for fused activation ${e}.`)}function pi(r,t){let e=t,o=Ep(r.shape,t.shape);return o.length>0&&(e=Et(e,o)),P(e,r.shape)}function ui(r,t,e,o){if(t==="linear")return r;if(t==="relu")return yo(r);if(t==="elu")return il(r);if(t==="relu6")return vl(r);if(t==="prelu")return wl(r,e);if(t==="leakyrelu")return ml(r,o);if(t==="sigmoid")return Sr(r);throw new Error(`Unknown fused activation ${t}.`)}var mi=(r,t)=>!(r>0)||t==="linear";function s_({x:r,filter:t,strides:e,pad:o,dataFormat:n="NHWC",dilations:s=[1,1],dimRoundingMode:a,bias:i,activation:c="linear",preluActivationWeights:l,leakyreluAlpha:p}){if(c=c||"linear",mi(v.state.gradientDepth,c)===!1){E(n==="NHWC",()=>`Error in fused conv2d: got dataFormat of ${n} but only NHWC is currently supported for the case of gradient depth is 0 and the activation is not linear.`);let $=fo(r,t,e,o,n,s,a);return i!=null&&($=nt($,i)),ui($,c,l,p)}let u=T(r,"x","conv2d","float32"),m=T(t,"filter","conv2d","float32"),f=u,d=!1;u.rank===3&&(d=!0,f=P(u,[1,u.shape[0],u.shape[1],u.shape[2]])),E(f.rank===4,()=>`Error in fused conv2d: input must be rank 4, but got rank ${f.rank}.`),E(m.rank===4,()=>`Error in fused conv2d: filter must be rank 4, but got rank ${m.rank}.`),Jt("fused conv2d",o,a);let g=n==="NHWC"?f.shape[3]:f.shape[1];E(m.shape[2]===g,()=>`Error in conv2d: depth of input (${g}) must match input depth for filter ${m.shape[2]}.`),E(Te(e,s),()=>`Error in conv2D: Either strides or dilations must be 1. Got strides ${e} and dilations '${s}'`);let h=ei(f.shape,m.shape,e,s,o,a),x;i!=null&&(x=T(i,"bias","fused conv2d"),[x]=ht(x,u),n==="NHWC"?kt(h.outShape,x.shape):(E(x.shape.length<=1,()=>`Error in fused conv2d: only supports scalar or 1-D Tensor bias for NCHW format but got the bias of rank-${x.shape.length}.`),E(x.shape.length===0||x.shape[0]===h.outChannels||x.shape[0]===1,()=>`Error in fused conv2d: bias shape (${x.shape}) is not compatible with the number of output channels (${h.outChannels})`)));let b;if(l!=null){let $=l.shape;if(E($.length<=1||$.length===3,()=>`Error in fused conv2d: only supports scalar, 1-D Tensor or 3-D Tensor PReLU activation weights but got a tensor of rank-${$.length}.`),$.length===1)E($[0]===1||$[0]===h.outChannels,()=>`Error in fused conv2d: PReLU activation weights (${$}) is not compatible with the number of output channels (${h.outChannels}).`);else if($.length===3)try{kt($,h.outShape)}catch{let A=`Error in fused conv2d: PReLU activation weights (${$}) is not compatible with the output shape of the conv2d (${h.outShape}).`;throw Error(A)}b=T(l,"prelu weights","fused conv2d")}let S=($,R)=>{E(n==="NHWC",()=>`Error in gradient of fused conv2D: got dataFormat of ${n} but only NHWC is currently supported.`);let[A,D,_,O]=R,L=li($,_,c);E(ti(s),()=>`Error in gradient of fused conv2D: dilation rates greater than 1 are not yet supported in gradients. Got dilations '${s}'`);let M=Dp(D.shape,L,A,e,o),V=D0(D,L,A.shape,e,o),B=[M,V];if(O!=null){let G=pi(O,L);B.push(G)}return B},w={x:f,filter:m,bias:x,preluActivationWeights:b},k={strides:e,pad:o,dataFormat:n,dilations:s,dimRoundingMode:a,activation:c,leakyreluAlpha:p};return i==null?Se((R,A,D)=>{let _=v.runKernel(_n,w,k);return D([A,R,_]),d&&(_=P(_,[_.shape[1],_.shape[2],_.shape[3]])),{value:_,gradFunc:S}})(f,m):Se((R,A,D,_)=>{let O=v.runKernel(_n,w,k);return _([A,R,O,D]),d&&(O=P(O,[O.shape[1],O.shape[2],O.shape[3]])),{value:O,gradFunc:S}})(f,m,x)}var _0=N({fusedConv2d_:s_});function a_(r,t,e,o,n,s=[1,1],a){let i=r;r.rank===3&&(i=P(r,[1,r.shape[0],r.shape[1],r.shape[2]]));let c=t;c.rank===3&&(c=P(t,[1,t.shape[0],t.shape[1],t.shape[2]]));let l={x:i,dy:c},p={strides:o,pad:n,dimRoundingMode:a,dilations:s,filterShape:e};return v.runKernel(Fs,l,p)}var O0=N({depthwiseConv2dNativeBackpropFilter_:a_});function i_(r,t,e,o,n,s=[1,1],a){let i=t,c=!1;t.rank===3&&(c=!0,i=P(t,[1,t.shape[0],t.shape[1],t.shape[2]]));let l={dy:i,filter:e},p={strides:o,pad:n,dimRoundingMode:a,dilations:s,inputShape:r},u=v.runKernel(Ds,l,p);return c?P(u,[u.shape[1],u.shape[2],u.shape[3]]):u}var P0=N({depthwiseConv2dNativeBackpropInput_:i_});function c_({x:r,filter:t,strides:e,pad:o,dataFormat:n="NHWC",dilations:s=[1,1],dimRoundingMode:a,bias:i,activation:c="linear",preluActivationWeights:l,leakyreluAlpha:p}){if(mi(v.state.gradientDepth,c)===!1){let k=ri(r,t,e,o,n,s,a);return i!=null&&(k=nt(k,i)),ui(k,c,l,p)}let u=T(r,"x","depthwiseConv2d","float32"),m=T(t,"filter","depthwiseConv2d","float32"),f=u,d=!1;u.rank===3&&(d=!0,f=P(u,[1,u.shape[0],u.shape[1],u.shape[2]])),E(f.rank===4,()=>`Error in fused depthwiseConv2d: input must be rank 4, but got rank ${f.rank}.`),E(m.rank===4,()=>`Error in fused depthwiseConv2d: filter must be rank 4, but got rank ${m.rank}.`),E(f.shape[3]===m.shape[2],()=>`Error in fused depthwiseConv2d: number of input channels (${f.shape[3]}) must match the inChannels dimension in filter ${m.shape[2]}.`),s==null&&(s=[1,1]),E(Te(e,s),()=>`Error in fused depthwiseConv2d: Either strides or dilations must be 1. Got strides ${e} and dilations '${s}'`),Jt("fused depthwiseConv2d",o,a);let g=ei(f.shape,m.shape,e,s,o,a,!0),h;i!=null&&(h=T(i,"bias","fused conv2d"),[h]=ht(h,u),kt(g.outShape,h.shape));let x;l!=null&&(x=T(l,"prelu weights","fused depthwiseConv2d"));let b=(k,$)=>{E(ti(s),()=>`Error in gradient of fused depthwiseConv2d: dilation rates greater than 1 are not yet supported. Got dilations '${s}'`);let[R,A,D,_]=$,O=li(k,D,c),L=P0(A.shape,O,R,e,o,s,a),M=O0(A,O,R.shape,e,o,s,a);if(_!=null){let V=pi(h,O);return[L,M,V]}return[L,M]},S={x:f,filter:m,bias:h,preluActivationWeights:x},w={strides:e,pad:o,dataFormat:n,dilations:s,dimRoundingMode:a,activation:c,leakyreluAlpha:p};return i==null?Se(($,R,A)=>{let D=v.runKernel(On,S,w);return A([R,$,D]),d&&(D=P(D,[D.shape[1],D.shape[2],D.shape[3]])),{value:D,gradFunc:b}})(f,m):Se(($,R,A,D)=>{let _=v.runKernel(On,S,w);return D([R,$,_,A]),d&&(_=P(_,[_.shape[1],_.shape[2],_.shape[3]])),{value:_,gradFunc:b}})(f,m,h)}var L0=N({fusedDepthwiseConv2d_:c_});function l_({a:r,b:t,transposeA:e=!1,transposeB:o=!1,bias:n,activation:s="linear",preluActivationWeights:a,leakyreluAlpha:i=.2}){if(mi(v.state.gradientDepth,s)===!1){let O=wt(r,t,e,o);return n!=null&&(O=nt(O,n)),ui(O,s,a,i)}let c=T(r,"a","fused matMul"),l=T(t,"b","fused matMul");[c,l]=ht(c,l);let p=e?c.shape[c.rank-2]:c.shape[c.rank-1],u=o?l.shape[l.rank-1]:l.shape[l.rank-2],m=e?c.shape[c.rank-1]:c.shape[c.rank-2],f=o?l.shape[l.rank-2]:l.shape[l.rank-1],d=c.shape.slice(0,-2),g=l.shape.slice(0,-2),h=bt(d),x=bt(g);E(p===u,()=>`Error in fused matMul: inner shapes (${p}) and (${u}) of Tensors with shapes ${c.shape} and ${l.shape} and transposeA=${e} and transposeB=${o} must match.`);let S=kt(c.shape.slice(0,-2),l.shape.slice(0,-2)).concat([m,f]),w=e?P(c,[h,p,m]):P(c,[h,m,p]),k=o?P(l,[x,f,u]):P(l,[x,u,f]),$;n!=null&&($=T(n,"bias","fused matMul"),[$]=ht($,c),kt(S,$.shape));let R;a!=null&&(R=T(a,"prelu weights","fused matMul"));let A=(O,L)=>{let[M,V,B,G]=L,U=li(P(O,B.shape),B,s),z,H;if(!e&&!o?(z=wt(U,V,!1,!0),H=wt(M,U,!0,!1)):!e&&o?(z=wt(U,V,!1,!1),H=wt(U,M,!0,!1)):e&&!o?(z=wt(V,U,!1,!0),H=wt(M,U,!1,!1)):(z=wt(V,U,!0,!0),H=wt(U,M,!0,!0)),n!=null){let X=pi(G,U);return[z,H,X]}else return[z,H]},D={a:w,b:k,bias:$,preluActivationWeights:R},_={transposeA:e,transposeB:o,activation:s,leakyreluAlpha:i};return n==null?Se((L,M,V)=>{let B=v.runKernel(Dn,D,_);return V([L,M,B]),{value:P(B,S),gradFunc:A}})(w,k):Se((L,M,V,B)=>{let G=v.runKernel(Dn,D,_);return B([L,M,G,V]),{value:P(G,S),gradFunc:A}})(w,k,$)}var M0=N({fusedMatMul_:l_});function p_(r){return Qi(r,.54,.46)}var B0=N({hammingWindow_:p_});function u_(r){return Qi(r,.5,.5)}var Up=N({hannWindow_:u_});function m_(r,t,e,o=!1,n=0){let s=0,a=[];for(;s+t<=r.size;)a.push(Tt(r,s,t)),s+=e;if(o)for(;s<r.size;){let i=s+t-r.size,c=Pt([Tt(r,s,t-i),wr([i],n)]);a.push(c),s+=e}return a.length===0?bo([],[0,t]):P(Pt(a),[a.length,t])}var Hp=N({frame_:m_});function f_(r,t,e,o,n=Up){o==null&&(o=Wp(t));let s=Hp(r,t,e),a=q(s,n(t));return ii(a,o)}var V0=N({stft_:f_});function d_(r,t,e,o,n="bilinear",s=0){let a=T(r,"image","cropAndResize"),i=T(t,"boxes","cropAndResize","float32"),c=T(e,"boxInd","cropAndResize","int32"),l=i.shape[0];E(a.rank===4,()=>`Error in cropAndResize: image must be rank 4,but got rank ${a.rank}.`),E(i.rank===2&&i.shape[1]===4,()=>`Error in cropAndResize: boxes must be have size [${l},4] but had shape ${i.shape}.`),E(c.rank===1&&c.shape[0]===l,()=>`Error in cropAndResize: boxInd must be have size [${l}] but had shape ${i.shape}.`),E(o.length===2,()=>`Error in cropAndResize: cropSize must be of length 2, but got length ${o.length}.`),E(o[0]>=1&&o[1]>=1,()=>`cropSize must be atleast [1,1], but was ${o}`),E(n==="bilinear"||n==="nearest",()=>`method must be bilinear or nearest, but was ${n}`);let p={image:a,boxes:i,boxInd:c},u={method:n,extrapolationValue:s,cropSize:o};return v.runKernel(Es,p,u)}var z0=N({cropAndResize_:d_});function h_(r){let t=T(r,"image","flipLeftRight","float32");E(t.rank===4,()=>`Error in flipLeftRight: image must be rank 4,but got rank ${t.rank}.`);let e={image:t};return v.runKernel(Vs,e,{})}var W0=N({flipLeftRight_:h_});function g_(r){let t=T(r,"image","grayscaleToRGB"),e=t.rank-1,o=t.shape[e];E(t.rank>=2,()=>`Error in grayscaleToRGB: images must be at least rank 2, but got rank ${t.rank}.`),E(o===1,()=>`Error in grayscaleToRGB: last dimension of a grayscale image should be size 1, but got size ${o}.`);let n=new Array(t.rank);return n.fill(1,0,e),n[e]=3,go(t,n)}var G0=N({grayscaleToRGB_:g_});function x_(r,t,e=0,o=.5){let n=T(r,"image","rotateWithOffset","float32");E(n.rank===4,()=>`Error in rotateWithOffset: image must be rank 4,but got rank ${n.rank}.`);let s={image:n},a={radians:t,fillValue:e,center:o};return v.runKernel(Ua,s,a)}var U0=N({rotateWithOffset_:x_});function nr(r,t,e,o,n,s){o==null&&(o=.5),n==null&&(n=Number.NEGATIVE_INFINITY),s==null&&(s=0);let a=r.shape[0];return e=Math.min(e,a),E(0<=o&&o<=1,()=>`iouThreshold must be in [0, 1], but was '${o}'`),E(r.rank===2,()=>`boxes must be a 2D tensor, but was of rank '${r.rank}'`),E(r.shape[1]===4,()=>`boxes must have 4 columns, but 2nd dimension was ${r.shape[1]}`),E(t.rank===1,()=>"scores must be a 1D tensor"),E(t.shape[0]===a,()=>`scores has incompatible shape with boxes. Expected ${a}, but was ${t.shape[0]}`),E(0<=s&&s<=1,()=>`softNmsSigma must be in [0, 1], but was '${s}'`),{maxOutputSize:e,iouThreshold:o,scoreThreshold:n,softNmsSigma:s}}function y_(r,t,e,o=.5,n=Number.NEGATIVE_INFINITY){let s=T(r,"boxes","nonMaxSuppression","float32"),a=T(t,"scores","nonMaxSuppression","float32"),i=nr(s,a,e,o,n);e=i.maxOutputSize,o=i.iouThreshold,n=i.scoreThreshold;let c={maxOutputSize:e,iouThreshold:o,scoreThreshold:n};return v.runKernel(na,{boxes:s,scores:a},c)}var H0=N({nonMaxSuppression_:y_});function K0(r,t,e){let o=b_(r,t,e),n=o<0?-(o+1):o;r.splice(n,0,t)}function b_(r,t,e){return T_(r,t,e||C_)}function C_(r,t){return r>t?1:r<t?-1:0}function T_(r,t,e){let o=0,n=r.length,s=0,a=!1;for(;o<n;){s=o+(n-o>>>1);let i=e(t,r[s]);i>0?o=s+1:(n=s,a=!i)}return a?o:-o-1}function Kp(r,t,e,o,n){return Fg(r,t,e,o,n,0)}function qp(r,t,e,o,n,s){return Fg(r,t,e,o,n,0,!1,s,!0)}function Xp(r,t,e,o,n,s){return Fg(r,t,e,o,n,s,!0)}function Fg(r,t,e,o,n,s,a=!1,i=!1,c=!1){let l=[];for(let h=0;h<t.length;h++)t[h]>n&&l.push({score:t[h],boxIndex:h,suppressBeginIndex:0});l.sort(q0);let p=s>0?-.5/s:0,u=[],m=[];for(;u.length<e&&l.length>0;){let h=l.pop(),{score:x,boxIndex:b,suppressBeginIndex:S}=h;if(x<n)break;let w=!1;for(let k=u.length-1;k>=S;--k){let $=S_(r,b,u[k]);if($>=o){w=!0;break}if(h.score=h.score*w_(o,p,$),h.score<=n)break}h.suppressBeginIndex=u.length,w||(h.score===x?(u.push(b),m.push(h.score)):h.score>n&&K0(l,h,q0))}let f=u.length,d=e-f;i&&d>0&&(u.push(...new Array(d).fill(0)),m.push(...new Array(d).fill(0)));let g={selectedIndices:u};return a&&(g.selectedScores=m),c&&(g.validOutputs=f),g}function S_(r,t,e){let o=r.subarray(t*4,t*4+4),n=r.subarray(e*4,e*4+4),s=Math.min(o[0],o[2]),a=Math.min(o[1],o[3]),i=Math.max(o[0],o[2]),c=Math.max(o[1],o[3]),l=Math.min(n[0],n[2]),p=Math.min(n[1],n[3]),u=Math.max(n[0],n[2]),m=Math.max(n[1],n[3]),f=(i-s)*(c-a),d=(u-l)*(m-p);if(f<=0||d<=0)return 0;let g=Math.max(s,l),h=Math.max(a,p),x=Math.min(i,u),b=Math.min(c,m),S=Math.max(x-g,0)*Math.max(b-h,0);return S/(f+d-S)}function w_(r,t,e){let o=Math.exp(t*e*e);return e<=r?o:0}function q0(r,t){return r.score-t.score||r.score===t.score&&t.boxIndex-r.boxIndex}async function N_(r,t,e,o=.5,n=Number.NEGATIVE_INFINITY){let s=T(r,"boxes","nonMaxSuppressionAsync"),a=T(t,"scores","nonMaxSuppressionAsync"),i=nr(s,a,e,o,n);e=i.maxOutputSize,o=i.iouThreshold,n=i.scoreThreshold;let c=await Promise.all([s.data(),a.data()]),l=c[0],p=c[1],{selectedIndices:u}=Kp(l,p,e,o,n);return s!==r&&s.dispose(),a!==t&&a.dispose(),he(u,"int32")}var X0=N_;function I_(r,t,e,o=.5,n=Number.NEGATIVE_INFINITY,s=0){let a=T(r,"boxes","nonMaxSuppression"),i=T(t,"scores","nonMaxSuppression"),c=nr(a,i,e,o,n,s);e=c.maxOutputSize,o=c.iouThreshold,n=c.scoreThreshold,s=c.softNmsSigma;let l={boxes:a,scores:i},p={maxOutputSize:e,iouThreshold:o,scoreThreshold:n,softNmsSigma:s},u=v.runKernel(aa,l,p);return{selectedIndices:u[0],selectedScores:u[1]}}var j0=N({nonMaxSuppressionWithScore_:I_});async function v_(r,t,e,o=.5,n=Number.NEGATIVE_INFINITY,s=0){let a=T(r,"boxes","nonMaxSuppressionAsync"),i=T(t,"scores","nonMaxSuppressionAsync"),c=nr(a,i,e,o,n,s);e=c.maxOutputSize,o=c.iouThreshold,n=c.scoreThreshold,s=c.softNmsSigma;let l=await Promise.all([a.data(),i.data()]),p=l[0],u=l[1],{selectedIndices:m,selectedScores:f}=Xp(p,u,e,o,n,s);return a!==r&&a.dispose(),i!==t&&i.dispose(),{selectedIndices:he(m,"int32"),selectedScores:he(f)}}var Y0=v_;function k_(r,t,e,o=.5,n=Number.NEGATIVE_INFINITY,s=!1){let a=T(r,"boxes","nonMaxSuppression"),i=T(t,"scores","nonMaxSuppression"),c=nr(a,i,e,o,n,null),l=c.maxOutputSize,p=c.iouThreshold,u=c.scoreThreshold,m={boxes:a,scores:i},f={maxOutputSize:l,iouThreshold:p,scoreThreshold:u,padToMaxOutputSize:s},d=v.runKernel(sa,m,f);return{selectedIndices:d[0],validOutputs:d[1]}}var Z0=N({nonMaxSuppressionPadded_:k_});async function E_(r,t,e,o=.5,n=Number.NEGATIVE_INFINITY,s=!1){let a=T(r,"boxes","nonMaxSuppressionAsync"),i=T(t,"scores","nonMaxSuppressionAsync"),c=nr(a,i,e,o,n,null),l=c.maxOutputSize,p=c.iouThreshold,u=c.scoreThreshold,[m,f]=await Promise.all([a.data(),i.data()]),{selectedIndices:d,validOutputs:g}=qp(m,f,l,p,u,s);return a!==r&&a.dispose(),i!==t&&i.dispose(),{selectedIndices:he(d,"int32"),validOutputs:at(g,"int32")}}var Q0=E_;function $_(r,t,e=!1,o=!1){let n=T(r,"images","resizeBilinear");E(n.rank===3||n.rank===4,()=>`Error in resizeBilinear: x must be rank 3 or 4, but got rank ${n.rank}.`),E(t.length===2,()=>`Error in resizeBilinear: new shape must 2D, but got shape ${t}.`),E(o===!1||e===!1,()=>"Error in resizeBilinear: If halfPixelCenters is true, alignCorners must be false.");let s=n,a=!1;n.rank===3&&(a=!0,s=P(n,[1,n.shape[0],n.shape[1],n.shape[2]]));let[]=t,i={images:s},c={alignCorners:e,halfPixelCenters:o,size:t},l=v.runKernel(ba,i,c);return a?P(l,[l.shape[1],l.shape[2],l.shape[3]]):l}var J0=N({resizeBilinear_:$_});function R_(r,t,e=!1,o=!1){let n=T(r,"images","resizeNearestNeighbor");E(n.rank===3||n.rank===4,()=>`Error in resizeNearestNeighbor: x must be rank 3 or 4, but got rank ${n.rank}.`),E(t.length===2,()=>`Error in resizeNearestNeighbor: new shape must 2D, but got shape ${t}.`),E(n.dtype==="float32"||n.dtype==="int32",()=>"`images` must have `int32` or `float32` as dtype"),E(o===!1||e===!1,()=>"Error in resizeNearestNeighbor: If halfPixelCenters is true, alignCorners must be false.");let s=n,a=!1;n.rank===3&&(a=!0,s=P(n,[1,n.shape[0],n.shape[1],n.shape[2]]));let[]=t,i={images:s},c={alignCorners:e,halfPixelCenters:o,size:t},l=v.runKernel(ya,i,c);return a?P(l,[l.shape[1],l.shape[2],l.shape[3]]):l}var tC=N({resizeNearestNeighbor_:R_});function A_(r,t="binary",e=!1,o=.5){let n=T(r,"image","threshold"),s=.2989,a=.587,i=.114,c=n.shape[0]*n.shape[1],l=q(he([o]),255),p,u,m,f;if(E(n.rank===3,()=>`Error in threshold: image must be rank 3,but got rank ${n.rank}.`),E(n.shape[2]===3||n.shape[2]===1,()=>`Error in threshold: image color channel must be equal to 3 or 1but got ${n.shape[2]}.`),E(n.dtype==="int32"||n.dtype==="float32",()=>`Error in dtype: image dtype must be int32 or float32,but got dtype ${n.dtype}.`),E(t==="otsu"||t==="binary",()=>`Method must be binary or otsu, but was ${t}`),n.shape[2]===3){[p,u,m]=Hr(n,[1,1,1],-1);let h=q(p,s),x=q(u,a),b=q(m,i);f=nt(nt(h,x),b)}else f=r;if(t==="otsu"){let h=sl(St(kl(f),"int32"),be([]),256);l=F_(h,c)}let d=e?oi(f,l):zn(f,l);return St(q(d,255),"int32")}function F_(r,t){let e=he([-1]),o=he([0]),n=he([0]),s,a,i,c,l,p;for(let u=0;u<r.size-1;u++){s=Tt(r,0,u+1),a=Tt(r,u+1),l=Ct(Et(s),t),p=Ct(Et(a),t);let m=Et(q(s,xo(0,s.size)));i=Ct(m,Et(s));let f=wr(a.shape,s.size),d=nt(xo(0,a.size),f),g=q(a,d);c=Ct(Et(g),Et(a));let h=pt(i,c),x=pt(i,c),b=q(l,p);n=q(q(b,h),x);let S=zn(n,o);o=or(S,n,o),e=or(S,he([u]),e)}return e}var eC=N({threshold_:A_});function D_(r,t,e="nearest",o="constant",n=0,s){let a=T(r,"image","transform","float32"),i=T(t,"transforms","transform","float32");E(a.rank===4,()=>`Error in transform: image must be rank 4,but got rank ${a.rank}.`),E(i.rank===2&&(i.shape[0]===a.shape[0]||i.shape[0]===1)&&i.shape[1]===8,()=>"Error in transform: Input transform should be batch x 8 or 1 x 8"),E(s==null||s.length===2,()=>`Error in transform: outputShape must be [height, width] or null, but got ${s}.`);let c={image:a,transforms:i},l={interpolation:e,fillMode:o,fillValue:n,outputShape:s};return v.runKernel(Ba,c,l)}var rC=N({transform_:D_});function __(r,t,e){E(t%1===0,()=>`bandPart(): numLower must be an integer, got ${t}.`),E(e%1===0,()=>`bandPart(): numUpper must be an integer, got ${e}.`);let o=T(r,"a","bandPart");E(o.rank>=2,()=>`bandPart(): Rank must be at least 2, got ${o.rank}.`);let n=o.shape,[s,a]=o.shape.slice(-2);if(!(t<=s))throw new Error(`bandPart(): numLower (${t}) must not be greater than the number of rows (${s}).`);if(!(e<=a))throw new Error(`bandPart(): numUpper (${e}) must not be greater than the number of columns (${a}).`);t<0&&(t=s),e<0&&(e=a);let i=P(xo(0,s,1,"int32"),[-1,1]),c=xo(0,a,1,"int32"),l=pt(i,c),p=Wn(oi(l,at(+t,"int32")),ul(l,at(-e,"int32"))),u=je([s,a],o.dtype);return P(we(ze(P(o,[-1,s,a])).map(m=>or(p,m,u))),n)}var oC=N({bandPart_:__});function O_(r){let t;if(Array.isArray(r)){t=!1,E(r!=null&&r.length>0,()=>"Gram-Schmidt process: input must not be null, undefined, or empty");let n=r[0].shape[0];for(let s=1;s<r.length;++s)E(r[s].shape[0]===n,()=>`Gram-Schmidt: Non-unique lengths found in the input vectors: (${r[s].shape[0]} vs. ${n})`)}else t=!0,r=Hr(r,r.shape[0],0).map(n=>ci(n,[0]));E(r.length<=r[0].shape[0],()=>`Gram-Schmidt: Number of vectors (${r.length}) exceeds number of dimensions (${r[0].shape[0]}).`);let e=[],o=r;for(let n=0;n<r.length;++n)e.push(v.tidy(()=>{let s=o[n];if(n>0)for(let a=0;a<n;++a){let i=q(Et(q(e[a],s)),e[a]);s=pt(s,i)}return Ct(s,Vn(s,"euclidean"))}));return t?we(e,0):e}var nC=N({gramSchmidt_:O_});function P_(r,t=!1){if(E(r.rank>=2,()=>`qr() requires input tensor to have a rank >= 2, but got rank ${r.rank}`),r.rank===2)return sC(r,t);{let e=r.shape.slice(0,r.shape.length-2).reduce((c,l)=>c*l),o=ze(P(r,[e,r.shape[r.shape.length-2],r.shape[r.shape.length-1]]),0),n=[],s=[];o.forEach(c=>{let[l,p]=sC(c,t);n.push(l),s.push(p)});let a=P(we(n,0),r.shape),i=P(we(s,0),r.shape);return[a,i]}}function sC(r,t=!1){return v.tidy(()=>{E(r.shape.length===2,()=>`qr2d() requires a 2D Tensor, but got a ${r.shape.length}D Tensor.`);let e=r.shape[0],o=r.shape[1],n=cl(e),s=Fe(r),a=bo([[1]],[1,1]),i=Fe(a),c=e>=o?o:e;for(let l=0;l<c;++l){let p=s,u=i,m=n;[i,s,n]=v.tidy(()=>{let f=Tt(s,[l,l],[e-l,1]),d=Vn(f),g=Tt(s,[l,l],[1,1]),h=or(zn(g,0),bo([[-1]]),bo([[1]])),x=pt(g,q(h,d)),b=Ct(f,x);b.shape[0]===1?i=Fe(a):i=Pt([a,Tt(b,[1,0],[b.shape[0]-1,b.shape[1]])],0);let S=Ce(Ct(wt(h,x),d)),w=Tt(s,[l,0],[e-l,o]),k=q(S,i),$=Za(i);if(l===0)s=pt(w,wt(k,wt($,w)));else{let D=pt(w,wt(k,wt($,w)));s=Pt([Tt(s,[0,0],[l,o]),D],0)}let R=Za(k),A=Tt(n,[0,l],[e,n.shape[1]-l]);if(l===0)n=pt(A,wt(wt(A,i),R));else{let D=pt(A,wt(wt(A,i),R));n=Pt([Tt(n,[0,0],[e,l]),D],1)}return[i,s,n]}),Qt([p,u,m])}return!t&&e>o&&(n=Tt(n,[0,0],[e,o]),s=Tt(s,[0,0],[o,o])),[n,s]})}var aC=N({qr_:P_});var Kt;(function(r){r[r.NONE=0]="NONE",r[r.MEAN=1]="MEAN",r[r.SUM=2]="SUM",r[r.SUM_BY_NONZERO_WEIGHTS=3]="SUM_BY_NONZERO_WEIGHTS"})(Kt||(Kt={}));function L_(r,t,e=Kt.SUM_BY_NONZERO_WEIGHTS){let o=T(r,"losses","computeWeightedLoss"),n=null;t!=null&&(n=T(t,"weights","computeWeightedLoss"));let s=n==null?o:q(o,n);if(e===Kt.NONE)return s;if(e===Kt.SUM)return Et(s);if(e===Kt.MEAN){if(n==null)return Gn(s);{let a=o.size/n.size,i=Ct(Et(s),Et(n));return a>1?Ct(i,at(a)):i}}if(e===Kt.SUM_BY_NONZERO_WEIGHTS){if(n==null)return Ct(Et(s),at(o.size));{let a=q(n,Ir(o.shape)),i=St(Et(Tl(a,at(0))),"float32");return Ct(Et(s),i)}}throw Error(`Unknown reduction: ${e}`)}var ge=N({computeWeightedLoss_:L_});function M_(r,t,e,o=Kt.SUM_BY_NONZERO_WEIGHTS){let n=T(r,"labels","absoluteDifference"),s=T(t,"predictions","absoluteDifference"),a=null;e!=null&&(a=T(e,"weights","absoluteDifference")),Lt(n.shape,s.shape,"Error in absoluteDifference: ");let i=ce(pt(n,s));return ge(i,a,o)}var iC=N({absoluteDifference_:M_});function B_(r,t,e,o,n=Kt.SUM_BY_NONZERO_WEIGHTS){let s=T(r,"labels","cosineDistance"),a=T(t,"predictions","cosineDistance"),i=null;o!=null&&(i=T(o,"weights","cosineDistance")),Lt(s.shape,a.shape,"Error in cosineDistance: ");let c=at(1),l=pt(c,Et(q(s,a),e,!0));return ge(l,i,n)}var cC=N({cosineDistance_:B_});function V_(r,t,e,o=Kt.SUM_BY_NONZERO_WEIGHTS){let n=T(r,"labels","hingeLoss"),s=T(t,"predictions","hingeLoss"),a=null;e!=null&&(a=T(e,"weights","hingeLoss")),Lt(n.shape,s.shape,"Error in hingeLoss: ");let i=at(1);n=pt(q(at(2),n),i);let c=yo(pt(i,q(n,s)));return ge(c,a,o)}var lC=N({hingeLoss_:V_});function z_(r,t,e,o=1,n=Kt.SUM_BY_NONZERO_WEIGHTS){let s=T(r,"labels","huberLoss"),a=T(t,"predictions","huberLoss"),i=null;e!=null&&(i=T(e,"weights","huberLoss")),Lt(s.shape,a.shape,"Error in huberLoss: ");let c=at(o),l=ce(pt(a,s)),p=Cl(l,c),u=pt(l,p),m=nt(q(at(.5),le(p)),q(c,u));return ge(m,i,n)}var pC=N({huberLoss_:z_});function W_(r,t,e,o=1e-7,n=Kt.SUM_BY_NONZERO_WEIGHTS){let s=T(r,"labels","logLoss"),a=T(t,"predictions","logLoss"),i=null;e!=null&&(i=T(e,"weights","logLoss")),Lt(s.shape,a.shape,"Error in logLoss: ");let c=at(1),l=at(o),p=Ce(q(s,Ur(nt(a,l)))),u=q(pt(c,s),Ur(nt(pt(c,a),l))),m=pt(p,u);return ge(m,i,n)}var uC=N({logLoss_:W_});function G_(r,t,e,o=Kt.SUM_BY_NONZERO_WEIGHTS){let n=T(r,"labels","meanSquaredError"),s=T(t,"predictions","meanSquaredError"),a=null;e!=null&&(a=T(e,"weights","meanSquaredError")),Lt(n.shape,s.shape,"Error in meanSquaredError: ");let i=$l(n,s);return ge(i,a,o)}var mC=N({meanSquaredError_:G_});function U_(r,t){let e=T(r,"labels","sigmoidCrossEntropyWithLogits"),o=T(t,"logits","sigmoidCrossEntropyWithLogits");Lt(e.shape,o.shape,"Error in sigmoidCrossEntropyWithLogits: ");let n=yo(o),s=q(o,e),a=fl(Xe(Ce(ce(o))));return nt(pt(n,s),a)}function H_(r,t,e,o=0,n=Kt.SUM_BY_NONZERO_WEIGHTS){let s=T(r,"multiClassLabels","sigmoidCrossEntropy"),a=T(t,"logits","sigmoidCrossEntropy"),i=null;if(e!=null&&(i=T(e,"weights","sigmoidCrossEntropy")),Lt(s.shape,a.shape,"Error in sigmoidCrossEntropy: "),o>0){let l=at(o),p=at(1),u=at(.5);s=nt(q(s,pt(p,l)),q(u,l))}let c=U_(s,a);return ge(c,i,n)}var fC=N({sigmoidCrossEntropy_:H_});function K_(r,t,e=-1){if(e===-1&&(e=t.rank-1),e!==t.rank-1)throw Error(`Softmax cross entropy along a non-last dimension is not yet supported. Labels / logits was rank ${t.rank} and dim was ${e}`);return Se((n,s,a)=>{let c=hl(s,[e],!0),l=pt(St(s,"float32"),c);a([n,l]);let p=Ce(q(l,n));return{value:Et(p,[e]),gradFunc:(f,d)=>{let[g,h]=d,x=ho(f.shape,[e]);return[q(P(f,x),pt(St(g,"float32"),Xe(h))),q(P(f,x),pt(Xe(h),St(g,"float32")))]}}})(r,t)}function q_(r,t,e,o=0,n=Kt.SUM_BY_NONZERO_WEIGHTS){let s=T(r,"onehotLabels","softmaxCrossEntropy"),a=T(t,"logits","softmaxCrossEntropy"),i=null;if(e!=null&&(i=T(e,"weights","softmaxCrossEntropy")),Lt(s.shape,a.shape,"Error in softmaxCrossEntropy: "),o>0){let l=at(o),p=at(1),u=at(s.shape[1]);s=nt(q(s,pt(p,l)),Ct(l,u))}let c=K_(s,a);return ge(c,i,n)}var dC=N({softmaxCrossEntropy_:q_});function X_(r,t,e,o){let n=T(r,"indices","sparseFillEmptyRows","int32"),s=T(t,"values","sparseFillEmptyRows"),a=T(e,"denseShape","sparseFillEmptyRows","int32"),i=T(o,"defaultValue","sparseFillEmptyRows",s.dtype);if(n.rank!==2)throw new Error(`Indices should be Tensor2D but received shape
        ${n.shape}`);if(s.rank!==1)throw new Error(`Values should be Tensor1D but received shape ${s.shape}`);if(a.rank!==1)throw new Error(`Dense shape should be Tensor1D but received shape ${a.shape}`);if(i.rank!==0)throw new Error(`Default value should be a scalar but received shape ${i.shape}`);let c={indices:n,values:s,denseShape:a,defaultValue:i},l=v.runKernel($a,c);return{outputIndices:l[0],outputValues:l[1],emptyRowIndicator:l[2],reverseIndexMap:l[3]}}var hC=N({sparseFillEmptyRows_:X_});function j_(r,t,e){let o=T(r,"inputIndices","sparseReshape","int32"),n=T(t,"inputShape","sparseReshape","int32"),s=T(e,"newShape","sparseReshape","int32");if(o.rank!==2)throw new Error(`Input indices should be Tensor2D but received shape
        ${o.shape}`);if(n.rank!==1)throw new Error(`Input shape should be Tensor1D but received shape ${n.shape}`);if(s.rank!==1)throw new Error(`New shape should be Tensor1D but received shape ${s.shape}`);let a={inputIndices:o,inputShape:n,newShape:s},i=v.runKernel(Ra,a);return{outputIndices:i[0],outputShape:i[1]}}var gC=N({sparseReshape_:j_});function Y_(r,t,e){let o=T(r,"data","sparseSegmentMean"),n=T(t,"indices","sparseSegmentMean","int32"),s=T(e,"segmentIds","sparseSegmentMean","int32");if(o.rank<1)throw new Error("Data should be at least 1 dimensional but received scalar");if(n.rank!==1)throw new Error(`Indices should be Tensor1D but received shape
          ${n.shape}`);if(s.rank!==1)throw new Error(`Segment ids should be Tensor1D but received shape
          ${s.shape}`);let a={data:o,indices:n,segmentIds:s};return v.runKernel(Aa,a)}var xC=N({sparseSegmentMean_:Y_});function Z_(r,t,e){let o=T(r,"data","sparseSegmentSum"),n=T(t,"indices","sparseSegmentSum","int32"),s=T(e,"segmentIds","sparseSegmentSum","int32");if(o.rank<1)throw new Error("Data should be at least 1 dimensional but received scalar");if(n.rank!==1)throw new Error(`Indices should be Tensor1D but received shape
         ${n.shape}`);if(s.rank!==1)throw new Error(`Segment ids should be Tensor1D but received shape
         ${s.shape}`);let a={data:o,indices:n,segmentIds:s};return v.runKernel(Fa,a)}var yC=N({sparseSegmentSum_:Z_});function Q_(r,t,e,o,n,s,a,i){let c=T(r,"data","stringNGrams","string");if(c.dtype!=="string")throw new Error("Data must be of datatype string");if(c.shape.length!==1)throw new Error(`Data must be a vector, saw: ${c.shape}`);let l=T(t,"dataSplits","stringNGrams");if(l.dtype!=="int32")throw new Error("Data splits must be of datatype int32");let p={separator:e,nGramWidths:o,leftPad:n,rightPad:s,padWidth:a,preserveShortSequences:i},u={data:c,dataSplits:l},m=v.runKernel(Oa,u,p);return{nGrams:m[0],nGramsSplits:m[1]}}var bC=N({stringNGrams_:Q_});function J_(r,t,e=!0){let o=T(r,"input","stringSplit","string"),n=T(t,"delimiter","stringSplit","string");if(o.rank!==1)throw new Error(`Input should be Tensor1D but received shape ${o.shape}`);if(n.rank!==0)throw new Error(`Delimiter should be a scalar but received shape ${n.shape}`);let s={skipEmpty:e},a={input:o,delimiter:n},i=v.runKernel(Pa,a,s);return{indices:i[0],values:i[1],shape:i[2]}}var CC=N({stringSplit_:J_});function tO(r,t){let e=T(r,"input","stringToHashBucketFast","string"),o={numBuckets:t};if(t<=0)throw new Error("Number of buckets must be at least 1");let n={input:e};return v.runKernel(La,n,o)}var TC=N({stringToHashBucketFast_:tO});var SC={fft:ai,ifft:Un,rfft:ii,irfft:El},wC={hammingWindow:B0,hannWindow:Up,frame:Hp,stft:V0},NC={flipLeftRight:W0,grayscaleToRGB:G0,resizeNearestNeighbor:tC,resizeBilinear:J0,rotateWithOffset:U0,cropAndResize:z0,nonMaxSuppression:H0,nonMaxSuppressionAsync:X0,nonMaxSuppressionWithScore:j0,nonMaxSuppressionWithScoreAsync:Y0,nonMaxSuppressionPadded:Z0,nonMaxSuppressionPaddedAsync:Q0,threshold:eC,transform:rC},IC={bandPart:oC,gramSchmidt:nC,qr:aC},vC={absoluteDifference:iC,computeWeightedLoss:ge,cosineDistance:cC,hingeLoss:lC,huberLoss:pC,logLoss:uC,meanSquaredError:mC,sigmoidCrossEntropy:fC,softmaxCrossEntropy:dC},kC={sparseFillEmptyRows:hC,sparseReshape:gC,sparseSegmentMean:xC,sparseSegmentSum:yC},EC={stringNGrams:bC,stringSplit:CC,stringToHashBucketFast:TC};var Ne=class extends el{minimize(t,e=!1,o){let{value:n,grads:s}=this.computeGradients(t,o);if(o!=null){let a=o.map(i=>({name:i.name,tensor:s[i.name]}));this.applyGradients(a)}else this.applyGradients(s);return Qt(s),e?n:(n.dispose(),null)}get iterations(){return this.iterations_==null&&(this.iterations_=0),this.iterations_}incrementIterations(){this.iterations_=this.iterations+1}computeGradients(t,e){return _p(t,e)}dispose(){this.iterations_!=null&&Qt(this.iterations_)}async saveIterations(){return this.iterations_==null&&(this.iterations_=0),{name:"iter",tensor:at(this.iterations_,"int32")}}async getWeights(){throw new Error("getWeights() is not implemented for this optimizer yet.")}async setWeights(t){throw new Error(`setWeights() is not implemented for this optimizer class ${this.getClassName()}`)}async extractIterations(t){return this.iterations_=(await t[0].tensor.data())[0],t.slice(1)}};Object.defineProperty(Ne,Symbol.hasInstance,{value:r=>r.minimize!=null&&r.computeGradients!=null&&r.applyGradients!=null});var Hn=class extends Ne{constructor(t,e,o=null){super(),this.learningRate=t,this.rho=e,this.epsilon=o,this.accumulatedGrads=[],this.accumulatedUpdates=[],o==null&&(this.epsilon=v.backend.epsilon())}applyGradients(t){(Array.isArray(t)?t.map(o=>o.name):Object.keys(t)).forEach((o,n)=>{let s=v.registeredVariables[o],a=!1;this.accumulatedGrads[n]==null&&(this.accumulatedGrads[n]={originalName:`${o}/accum_grad`,variable:ft(()=>ee(s).variable(a))}),this.accumulatedUpdates[n]==null&&(this.accumulatedUpdates[n]={originalName:`${o}/accum_var`,variable:ft(()=>ee(s).variable(a))});let i=Array.isArray(t)?t[n].tensor:t[o];if(i==null)return;let c=this.accumulatedGrads[n].variable,l=this.accumulatedUpdates[n].variable;ft(()=>{let p=nt(q(c,this.rho),q(le(i),1-this.rho)),u=q(Ct($e(nt(l,this.epsilon)),$e(nt(c,this.epsilon))),i),m=nt(q(l,this.rho),q(le(u),1-this.rho));c.assign(p),l.assign(m);let f=nt(q(u,-this.learningRate),s);s.assign(f)})}),this.incrementIterations()}dispose(){this.accumulatedUpdates!=null&&(Qt(this.accumulatedGrads.map(t=>t.variable)),Qt(this.accumulatedUpdates.map(t=>t.variable)))}async getWeights(){let t=[...this.accumulatedGrads,...this.accumulatedUpdates];return[await this.saveIterations()].concat(t.map(e=>({name:e.originalName,tensor:e.variable})))}async setWeights(t){t=await this.extractIterations(t);let e=t.length/2,o=!1;this.accumulatedGrads=t.slice(0,e).map(n=>({originalName:n.name,variable:n.tensor.variable(o)})),this.accumulatedUpdates=t.slice(e,e*2).map(n=>({originalName:n.name,variable:n.tensor.variable(o)}))}getConfig(){return{learningRate:this.learningRate,rho:this.rho,epsilon:this.epsilon}}static fromConfig(t,e){return new t(e.learningRate,e.rho,e.epsilon)}};Hn.className="Adadelta";De(Hn);var Kn=class extends Ne{constructor(t,e=.1){super(),this.learningRate=t,this.initialAccumulatorValue=e,this.accumulatedGrads=[]}applyGradients(t){(Array.isArray(t)?t.map(o=>o.name):Object.keys(t)).forEach((o,n)=>{let s=v.registeredVariables[o];this.accumulatedGrads[n]==null&&(this.accumulatedGrads[n]={originalName:`${o}/accumulator`,variable:ft(()=>wr(s.shape,this.initialAccumulatorValue).variable(!1))});let a=Array.isArray(t)?t[n].tensor:t[o];if(a==null)return;let i=this.accumulatedGrads[n].variable;ft(()=>{let c=nt(i,le(a));i.assign(c);let l=nt(q(Ct(a,$e(nt(c,v.backend.epsilon()))),-this.learningRate),s);s.assign(l)})}),this.incrementIterations()}dispose(){this.accumulatedGrads!=null&&Qt(this.accumulatedGrads.map(t=>t.variable))}async getWeights(){return[await this.saveIterations()].concat(this.accumulatedGrads.map(t=>({name:t.originalName,tensor:t.variable})))}async setWeights(t){t=await this.extractIterations(t);let e=!1;this.accumulatedGrads=t.map(o=>({originalName:o.name,variable:o.tensor.variable(e)}))}getConfig(){return{learningRate:this.learningRate,initialAccumulatorValue:this.initialAccumulatorValue}}static fromConfig(t,e){return new t(e.learningRate,e.initialAccumulatorValue)}};Kn.className="Adagrad";De(Kn);var qn=class extends Ne{constructor(t,e,o,n=null){super(),this.learningRate=t,this.beta1=e,this.beta2=o,this.epsilon=n,this.accumulatedFirstMoment=[],this.accumulatedSecondMoment=[],ft(()=>{this.accBeta1=at(e).variable(),this.accBeta2=at(o).variable()}),n==null&&(this.epsilon=v.backend.epsilon())}applyGradients(t){let e=Array.isArray(t)?t.map(o=>o.name):Object.keys(t);ft(()=>{let o=pt(1,this.accBeta1),n=pt(1,this.accBeta2);e.forEach((s,a)=>{let i=v.registeredVariables[s],c=!1;this.accumulatedFirstMoment[a]==null&&(this.accumulatedFirstMoment[a]={originalName:`${s}/m`,variable:ft(()=>ee(i).variable(c))}),this.accumulatedSecondMoment[a]==null&&(this.accumulatedSecondMoment[a]={originalName:`${s}/v`,variable:ft(()=>ee(i).variable(c))});let l=Array.isArray(t)?t[a].tensor:t[s];if(l==null)return;let p=this.accumulatedFirstMoment[a].variable,u=this.accumulatedSecondMoment[a].variable,m=nt(q(p,this.beta1),q(l,1-this.beta1)),f=nt(q(u,this.beta2),q(le(l),1-this.beta2)),d=Ct(m,o),g=Ct(f,n);p.assign(m),u.assign(f);let h=nt(q(Ct(d,nt($e(g),this.epsilon)),-this.learningRate),i);i.assign(h)}),this.accBeta1.assign(q(this.accBeta1,this.beta1)),this.accBeta2.assign(q(this.accBeta2,this.beta2))}),this.incrementIterations()}dispose(){this.accBeta1.dispose(),this.accBeta2.dispose(),this.accumulatedFirstMoment!=null&&Qt(this.accumulatedFirstMoment.map(t=>t.variable)),this.accumulatedSecondMoment!=null&&Qt(this.accumulatedSecondMoment.map(t=>t.variable))}async getWeights(){let t=[...this.accumulatedFirstMoment,...this.accumulatedSecondMoment];return[await this.saveIterations()].concat(t.map(e=>({name:e.originalName,tensor:e.variable})))}async setWeights(t){t=await this.extractIterations(t),ft(()=>{this.accBeta1.assign(Wr(this.beta1,this.iterations_+1)),this.accBeta2.assign(Wr(this.beta2,this.iterations_+1))});let e=t.length/2,o=!1;this.accumulatedFirstMoment=t.slice(0,e).map(n=>({originalName:n.name,variable:n.tensor.variable(o)})),this.accumulatedSecondMoment=t.slice(e,e*2).map(n=>({originalName:n.name,variable:n.tensor.variable(o)}))}getConfig(){return{learningRate:this.learningRate,beta1:this.beta1,beta2:this.beta2,epsilon:this.epsilon}}static fromConfig(t,e){return new t(e.learningRate,e.beta1,e.beta2,e.epsilon)}};qn.className="Adam";De(qn);var Xn=class extends Ne{constructor(t,e,o,n=null,s=0){super(),this.learningRate=t,this.beta1=e,this.beta2=o,this.epsilon=n,this.decay=s,this.accumulatedFirstMoment=[],this.accumulatedWeightedInfNorm=[],ft(()=>{this.iteration=at(0).variable(),this.accBeta1=at(e).variable()}),n==null&&(this.epsilon=v.backend.epsilon())}applyGradients(t){let e=Array.isArray(t)?t.map(o=>o.name):Object.keys(t);ft(()=>{let o=pt(1,this.accBeta1),n=Ct(-this.learningRate,nt(q(this.iteration,this.decay),1));e.forEach((s,a)=>{let i=v.registeredVariables[s],c=!1;this.accumulatedFirstMoment[a]==null&&(this.accumulatedFirstMoment[a]={originalName:`${s}/m`,variable:ee(i).variable(c)}),this.accumulatedWeightedInfNorm[a]==null&&(this.accumulatedWeightedInfNorm[a]={originalName:`${s}/v`,variable:ee(i).variable(c)});let l=Array.isArray(t)?t[a].tensor:t[s];if(l==null)return;let p=this.accumulatedFirstMoment[a].variable,u=this.accumulatedWeightedInfNorm[a].variable,m=nt(q(p,this.beta1),q(l,1-this.beta1)),f=q(u,this.beta2),d=ce(l),g=bl(f,d);p.assign(m),u.assign(g);let h=nt(q(Ct(n,o),Ct(m,nt(g,this.epsilon))),i);i.assign(h)}),this.iteration.assign(nt(this.iteration,1)),this.accBeta1.assign(q(this.accBeta1,this.beta1))}),this.incrementIterations()}dispose(){this.accBeta1.dispose(),this.iteration.dispose(),this.accumulatedFirstMoment!=null&&Qt(this.accumulatedFirstMoment.map(t=>t.variable)),this.accumulatedWeightedInfNorm!=null&&Qt(this.accumulatedWeightedInfNorm.map(t=>t.variable))}async getWeights(){throw new Error("getWeights() is not implemented for Adamax yet.")}async setWeights(t){throw new Error("setWeights() is not implemented for Adamax yet.")}getConfig(){return{learningRate:this.learningRate,beta1:this.beta1,beta2:this.beta2,epsilon:this.epsilon,decay:this.decay}}static fromConfig(t,e){return new t(e.learningRate,e.beta1,e.beta2,e.epsilon,e.decay)}};Xn.className="Adamax";De(Xn);var Kr=class extends Ne{constructor(t){super(),this.learningRate=t,this.setLearningRate(t)}applyGradients(t){(Array.isArray(t)?t.map(o=>o.name):Object.keys(t)).forEach((o,n)=>{let s=Array.isArray(t)?t[n].tensor:t[o];if(s==null)return;let a=v.registeredVariables[o];ft(()=>{let i=nt(q(this.c,s),a);a.assign(i)})}),this.incrementIterations()}setLearningRate(t){this.learningRate=t,this.c!=null&&this.c.dispose(),this.c=Be(at(-t))}dispose(){this.c.dispose()}async getWeights(){return[await this.saveIterations()]}async setWeights(t){if(t=await this.extractIterations(t),t.length!==0)throw new Error("SGD optimizer does not have settable weights.")}getConfig(){return{learningRate:this.learningRate}}static fromConfig(t,e){return new t(e.learningRate)}};Kr.className="SGD";De(Kr);var jn=class extends Kr{constructor(t,e,o=!1){super(t),this.learningRate=t,this.momentum=e,this.useNesterov=o,this.accumulations=[],this.m=at(this.momentum)}applyGradients(t){(Array.isArray(t)?t.map(o=>o.name):Object.keys(t)).forEach((o,n)=>{let s=v.registeredVariables[o];this.accumulations[n]==null&&(this.accumulations[n]={originalName:`${o}/momentum`,variable:ft(()=>ee(s).variable(!1))});let a=this.accumulations[n].variable,i=Array.isArray(t)?t[n].tensor:t[o];i!=null&&ft(()=>{let c,l=nt(q(this.m,a),i);this.useNesterov?c=nt(q(this.c,nt(i,q(l,this.m))),s):c=nt(q(this.c,l),s),a.assign(l),s.assign(c)})}),this.incrementIterations()}dispose(){this.m.dispose(),this.accumulations!=null&&Qt(this.accumulations.map(t=>t.variable))}setMomentum(t){this.momentum=t}async getWeights(){return[await this.saveIterations()].concat(this.accumulations.map(t=>({name:t.originalName,tensor:t.variable})))}async setWeights(t){t=await this.extractIterations(t);let e=!1;this.accumulations=t.map(o=>({originalName:o.name,variable:o.tensor.variable(e)}))}getConfig(){return{learningRate:this.learningRate,momentum:this.momentum,useNesterov:this.useNesterov}}static fromConfig(t,e){return new t(e.learningRate,e.momentum,e.useNesterov)}};jn.className="Momentum";De(jn);var Yn=class extends Ne{constructor(t,e=.9,o=0,n=null,s=!1){if(super(),this.learningRate=t,this.decay=e,this.momentum=o,this.epsilon=n,this.accumulatedMeanSquares=[],this.accumulatedMoments=[],this.accumulatedMeanGrads=[],this.centered=s,n==null&&(this.epsilon=v.backend.epsilon()),t==null)throw new Error("learningRate for RMSPropOptimizer must be defined.")}applyGradients(t){(Array.isArray(t)?t.map(o=>o.name):Object.keys(t)).forEach((o,n)=>{let s=v.registeredVariables[o],a=!1;this.accumulatedMeanSquares[n]==null&&(this.accumulatedMeanSquares[n]={originalName:`${o}/rms`,variable:ft(()=>ee(s).variable(a))}),this.accumulatedMoments[n]==null&&(this.accumulatedMoments[n]={originalName:`${o}/momentum`,variable:ft(()=>ee(s).variable(a))}),this.accumulatedMeanGrads[n]==null&&this.centered&&(this.accumulatedMeanGrads[n]={originalName:`${o}/mg`,variable:ft(()=>ee(s).variable(a))});let i=Array.isArray(t)?t[n].tensor:t[o];if(i==null)return;let c=this.accumulatedMeanSquares[n].variable,l=this.accumulatedMoments[n].variable;ft(()=>{let p=nt(q(c,this.decay),q(le(i),1-this.decay));if(this.centered){let u=this.accumulatedMeanGrads[n].variable,m=nt(q(u,this.decay),q(i,1-this.decay)),f=Ct(q(i,this.learningRate),$e(pt(p,nt(le(m),this.epsilon)))),d=nt(q(l,this.momentum),f);c.assign(p),u.assign(m),l.assign(d);let g=pt(s,d);s.assign(g)}else{let u=nt(q(c,this.decay),q(le(i),1-this.decay)),m=nt(q(l,this.momentum),Ct(q(i,this.learningRate),$e(nt(u,this.epsilon))));c.assign(u),l.assign(m);let f=pt(s,m);s.assign(f)}})}),this.incrementIterations()}dispose(){this.accumulatedMeanSquares!=null&&Qt(this.accumulatedMeanSquares.map(t=>t.variable)),this.accumulatedMeanGrads!=null&&this.centered&&Qt(this.accumulatedMeanGrads.map(t=>t.variable)),this.accumulatedMoments!=null&&Qt(this.accumulatedMoments.map(t=>t.variable))}async getWeights(){let t=[...this.accumulatedMeanSquares,...this.accumulatedMoments];return this.centered&&t.push(...this.accumulatedMeanGrads),[await this.saveIterations()].concat(t.map(e=>({name:e.originalName,tensor:e.variable})))}async setWeights(t){t=await this.extractIterations(t);let e=this.centered?t.length/3:t.length/2,o=!1;this.accumulatedMeanSquares=t.slice(0,e).map(n=>({originalName:n.name,variable:n.tensor.variable(o)})),this.accumulatedMoments=t.slice(e,e*2).map(n=>({originalName:n.name,variable:n.tensor.variable(o)})),this.centered&&(this.accumulatedMeanGrads=t.slice(e*2,e*3).map(n=>({originalName:n.name,variable:n.tensor.variable(o)})))}getConfig(){return{learningRate:this.learningRate,decay:this.decay,momentum:this.momentum,epsilon:this.epsilon,centered:this.centered}}static fromConfig(t,e){return new t(e.learningRate,e.decay,e.momentum,e.epsilon,e.centered)}};Yn.className="RMSProp";De(Yn);var sr=class{static sgd(t){return new Kr(t)}static momentum(t,e,o=!1){return new jn(t,e,o)}static rmsprop(t,e=.9,o=0,n=null,s=!1){return new Yn(t,e,o,n,s)}static adam(t=.001,e=.9,o=.999,n=null){return new qn(t,e,o,n)}static adadelta(t=.001,e=.95,o=null){return new Hn(t,e,o)}static adamax(t=.002,e=.9,o=.999,n=null,s=0){return new Xn(t,e,o,n,s)}static adagrad(t,e=.1){return new Kn(t,e)}};var eO={sgd:sr.sgd,momentum:sr.momentum,adadelta:sr.adadelta,adagrad:sr.adagrad,rmsprop:sr.rmsprop,adamax:sr.adamax,adam:sr.adam};var rO=typeof requestAnimationFrame<"u"?requestAnimationFrame:typeof setImmediate<"u"?setImmediate:r=>r();function jp(){return new Promise(r=>rO(()=>r()))}var I={};It(I,{ERF_A1:()=>bO,ERF_A2:()=>CO,ERF_A3:()=>TO,ERF_A4:()=>SO,ERF_A5:()=>wO,ERF_P:()=>yO,PARALLELIZE_THRESHOLD:()=>Yp,RowPartitionType:()=>qr,SELU_SCALE:()=>xO,SELU_SCALEALPHA:()=>gO,applyActivation:()=>ui,assertAndGetBroadcastShape:()=>kt,assertAxesAreInnerMostDims:()=>zA,assertParamsConsistent:()=>oO,assignToTypedArray:()=>$O,axesAreInnerMostDims:()=>xh,calculateShapes:()=>Vb,checkEinsumDimSizes:()=>OO,checkPadOnDimRoundingMode:()=>Jt,combineLocations:()=>o0,combineRaggedTensorToTensorShapes:()=>sO,complexWithEvenIndex:()=>vO,complexWithOddIndex:()=>kO,computeConv2DInfo:()=>ei,computeConv3DInfo:()=>Jb,computeDefaultPad:()=>Wd,computeDilation2DInfo:()=>WR,computeOptimalWindowSize:()=>lO,computeOutAndReduceShapes:()=>VA,computeOutShape:()=>nO,computePool2DInfo:()=>zd,computePool3DInfo:()=>GR,convertConv2DDataFormat:()=>t0,decodeEinsumEquation:()=>DO,eitherStridesOrDilationsAreOne:()=>Te,expandShapeToKeepDim:()=>ho,exponent:()=>AO,exponents:()=>RO,fromStringArrayToUint8:()=>rP,fromUint8ToStringArray:()=>eP,getAxesPermutation:()=>WA,getBroadcastDims:()=>Lb,getComplexWithIndex:()=>EO,getEinsumComputePath:()=>PO,getEinsumPermutation:()=>_O,getFusedBiasGradient:()=>pi,getFusedDyActivation:()=>li,getImageCenter:()=>pO,getInnerMostAxes:()=>UA,getPermuted:()=>mO,getRaggedRank:()=>iO,getReductionAxes:()=>Ep,getReshaped:()=>uO,getReshapedPermuted:()=>fO,getRowPartitionTypesHelper:()=>aO,getSliceBeginCoords:()=>dO,getSliceSize:()=>hO,getSparseFillEmptyRowsIndicesDenseShapeMismatch:()=>VO,getSparseFillEmptyRowsNegativeIndexErrorMessage:()=>zO,getSparseFillEmptyRowsOutOfRangeIndexErrorMessage:()=>WO,getSparseReshapeEmptyTensorZeroOutputDimErrorMessage:()=>HO,getSparseReshapeInputOutputMismatchErrorMessage:()=>qO,getSparseReshapeInputOutputMultipleErrorMessage:()=>KO,getSparseReshapeMultipleNegativeOneOutputDimErrorMessage:()=>GO,getSparseReshapeNegativeOutputDimErrorMessage:()=>UO,getSparseSegmentReductionIndicesOutOfRangeErrorMessage:()=>ZO,getSparseSegmentReductionNegativeSegmentIdsErrorMessage:()=>XO,getSparseSegmentReductionNonIncreasingSegmentIdsErrorMessage:()=>jO,getSparseSegmentReductionSegmentIdOutOfRangeErrorMessage:()=>YO,getUndoAxesPermutation:()=>GA,isIdentityPermutation:()=>LO,log:()=>F$,mergeRealAndImagArrays:()=>NO,prepareAndValidate:()=>Bb,prepareSplitSize:()=>BO,segment_util:()=>_g,shouldFuse:()=>mi,slice_util:()=>ne,splitRealAndImagArrays:()=>IO,tupleValuesAreOne:()=>ti,upcastType:()=>Yt,validateDefaultValueShape:()=>cO,validateInput:()=>$p,validateUpdateShape:()=>Td,warn:()=>Or});function oO(r,t){let e=r[0].length;r.forEach((n,s)=>{E(n.length===e,()=>`Error in concat${e}D: rank of tensors[${s}] must be the same as the rank of the rest (${e})`)}),E(t>=0&&t<e,()=>`Error in concat${e}D: axis must be between 0 and ${e-1}.`);let o=r[0];r.forEach((n,s)=>{for(let a=0;a<e;a++)E(a===t||n[a]===o[a],()=>`Error in concat${e}D: Shape of tensors[${s}] (${n}) does not match the shape of the rest (${o}) along the non-concatenated axis ${s}.`)})}function nO(r,t){let e=r[0].slice();for(let o=1;o<r.length;o++)e[t]+=r[o][t];return e}var qr;(function(r){r[r.FIRST_DIM_SIZE=0]="FIRST_DIM_SIZE",r[r.VALUE_ROWIDS=1]="VALUE_ROWIDS",r[r.ROW_LENGTHS=2]="ROW_LENGTHS",r[r.ROW_SPLITS=3]="ROW_SPLITS",r[r.ROW_LIMITS=4]="ROW_LIMITS",r[r.ROW_STARTS=5]="ROW_STARTS"})(qr||(qr={}));function sO(r,t,e){let o=new Array;if(e==null&&t==null)return o;if(t==null)for(;o.length<r+e.length;)o.push(-1);else o=t.slice();if(e==null)return o;if(r+e.length!==o.length)throw new Error(`rt input.shape and shape=${t} are incompatible: rt input.rank = ${r+e.length}, but shape.rank = ${o.length}`);for(let n=1;n<e.length;++n){let s=e[n],a=o[o.length-e.length+n],i=o[a];if(s>=0)if(i>=0){if(i!==s)throw new Error(`rt input.shape and shape=${t} are incompatible: rt input.shape[${n+r}] = ${s} but shape[${n+r}] = ${i}`)}else o[a]=s}return o}function aO(r){let t={FIRST_DIM_SIZE:qr.FIRST_DIM_SIZE,VALUE_ROWIDS:qr.VALUE_ROWIDS,ROW_LENGTHS:qr.ROW_LENGTHS,ROW_SPLITS:qr.ROW_SPLITS,ROW_LIMITS:qr.ROW_LIMITS,ROW_STARTS:qr.ROW_STARTS},e=[];for(let o of r)if(o in t)e.push(t[o]);else break;return e}function iO(r){return r.length===0?0:r[0]===qr.FIRST_DIM_SIZE?r.length-1:r.length}function cO(r,t){if(r==null||t==null)return;let e=r.length,o=t.length;if(e>=o)throw new Error(`defaultValue.shape=${r} and ragged tensor flatValues.shape=${t}, are incompatible: defaultValue.rank = ${e} must be less than ragged tensor input flatValues.rank = ${o})`);for(let n=0;n<Math.min(e,o-1);++n){let s=r[n],a=t[n+1];if(s>=0&&a>=0&&s!==1&&s!==a)throw new Error(`defaultValue.shape=${r}, and ragged tensor input flatValues.shape=${t} are incompatible: defaultValue.shape[${n-r.length}] = ${s} but ragged tensor input.flatValues.shape[${n-r.length}] = ${a}`)}}var Yp=30;function lO(r){return r<=Yp?r:$i(r,Math.floor(Math.sqrt(r)))}function pO(r,t,e){let o=e*(typeof r=="number"?r:r[0]),n=t*(typeof r=="number"?r:r[1]);return[o,n]}function uO(r,t,e,o=!0){let n=[];if(o)n=n.concat(t.slice(0)),n.push(r[0]/e),n=n.concat(r.slice(1));else{n=n.concat(r[0]);let s=t.length;for(let a=0;a<s;++a)n=n.concat([r[a+1]/t[a],t[a]]);n=n.concat(r.slice(s+1))}return n}function mO(r,t,e=!0){let o=[];if(e){o.push(t);for(let n=t+1;n<r;++n)n<=2*t?(o.push(n),o.push(n-(t+1))):o.push(n)}else{let n=[],s=[];for(let a=1;a<r;++a)a>=t*2+1||a%2===1?s.push(a):n.push(a);o.push(...n),o.push(0),o.push(...s)}return o}function fO(r,t,e,o=!0){let n=[];o?n.push(r[0]/e):n.push(r[0]*e);for(let s=1;s<r.length;++s)s<=t.length?o?n.push(t[s-1]*r[s]):n.push(r[s]/t[s-1]):n.push(r[s]);return n}function dO(r,t){let e=[0];for(let o=0;o<t;++o)e.push(r[o][0]);return e}function hO(r,t,e){let o=r.slice(0,1);for(let n=0;n<e;++n)o.push(r[n+1]-t[n][0]-t[n][1]);return o}var gO=1.7580993408473768,xO=1.0507009873554805;var yO=.3275911,bO=.254829592,CO=-.284496736,TO=1.421413741,SO=-1.453152027,wO=1.061405429;function NO(r,t){if(r.length!==t.length)throw new Error(`Cannot merge real and imag arrays of different lengths. real:${r.length}, imag: ${t.length}.`);let e=new Float32Array(r.length*2);for(let o=0;o<e.length;o+=2)e[o]=r[o/2],e[o+1]=t[o/2];return e}function IO(r){let t=new Float32Array(r.length/2),e=new Float32Array(r.length/2);for(let o=0;o<r.length;o+=2)t[o/2]=r[o],e[o/2]=r[o+1];return{real:t,imag:e}}function vO(r){let t=Math.ceil(r.length/4),e=new Float32Array(t),o=new Float32Array(t);for(let n=0;n<r.length;n+=4)e[Math.floor(n/4)]=r[n],o[Math.floor(n/4)]=r[n+1];return{real:e,imag:o}}function kO(r){let t=Math.floor(r.length/4),e=new Float32Array(t),o=new Float32Array(t);for(let n=2;n<r.length;n+=4)e[Math.floor(n/4)]=r[n],o[Math.floor(n/4)]=r[n+1];return{real:e,imag:o}}function EO(r,t){let e=r[t*2],o=r[t*2+1];return{real:e,imag:o}}function $O(r,t,e,o){r[o*2]=t,r[o*2+1]=e}function RO(r,t){let e=new Float32Array(r/2),o=new Float32Array(r/2);for(let n=0;n<Math.ceil(r/2);n++){let s=(t?2:-2)*Math.PI*(n/r);e[n]=Math.cos(s),o[n]=Math.sin(s)}return{real:e,imag:o}}function AO(r,t,e){let o=(e?2:-2)*Math.PI*(r/t),n=Math.cos(o),s=Math.sin(o);return{real:n,imag:s}}var Dg="->",FO=/->/g,$C=",",RC="...";function DO(r,t){r=r.replace(/\s/g,"");let e=(r.length-r.replace(FO,"").length)/Dg.length;if(e<1)throw new Error("Equations without an arrow are not supported.");if(e>1)throw new Error(`Equation must contain exactly one arrow ("${Dg}").`);let[o,n]=r.split(Dg);E(o.indexOf(RC)===-1,()=>`The ellipsis notation ("${RC}") is not supported yet.`);let s=o.split($C),a=s.length;if(t!==a)throw new Error(`Expected ${a} input tensors, received ${t}`);if(a>2)throw new Error("Support for more than 2 input tensors is not implemented yet.");let i=[];for(let m=0;m<n.length;++m){let f=n[m];if(!s.some(d=>d.indexOf(f)!==-1))throw new Error(`Output subscripts contain the label ${f} not present in the input subscripts.`);i.indexOf(f)===-1&&i.push(f)}for(let m=0;m<o.length;++m){let f=o[m];i.indexOf(f)===-1&&f!==$C&&i.push(f)}let c=new Array(s.length);for(let m=0;m<a;++m){if(new Set(s[m].split("")).size!==s[m].length)throw new Error(`Found duplicate axes in input component ${s[m]}. Support for duplicate axes in input is not implemented yet.`);c[m]=[];for(let f=0;f<s[m].length;++f)c[m].push(i.indexOf(s[m][f]))}let l=i.length,p=n.length,u=[];for(let m=p;m<l;++m)u.push(m);return{allDims:i,summedDims:u,idDims:c}}function _O(r,t){let e=new Array(r);e.fill(-1);for(let n=0;n<t.length;++n)e[t[n]]=n;let o=[];for(let n=0;n<r;++n)e[n]===-1&&o.push(n);return e=e.filter(n=>n!==-1),{permutationIndices:e,expandDims:o}}function OO(r,t,e){let o=new Array(r);for(let n=0;n<e.length;++n){let s=e[n].shape;for(let a=0;a<t[n].length;++a)o[t[n][a]]===void 0?o[t[n][a]]=s[a]:E(o[t[n][a]]===s[a],()=>`Expected dimension ${o[t[n][a]]} at axis ${a} of input shaped ${JSON.stringify(s)}, but got dimension ${s[a]}`)}}function PO(r,t){let e=r,o=[],n=0;r.length===0&&e.push(-1),n=r.length+1;for(let a=0;a<n;++a)o.push([]);let s=[];for(let a=0;a<e.length;++a){let i=e[a],c=MO(t,i);for(let l of c)s.indexOf(l)===-1&&(o[a].push(l),s.push(l))}return{path:e,steps:o}}function LO(r){return r.every((t,e)=>t===e)}function MO(r,t){let e=[];for(let o=0;o<r.length;++o)(r[o].length===0||r[o].indexOf(t)!==-1||t===-1)&&e.push(o);return e}function BO(r,t,e=0){let o=[];if(typeof t=="number")E(r.shape[e]%t===0,()=>"Number of splits must evenly divide the axis."),o=new Array(t).fill(r.shape[e]/t);else{let n=t.reduce((a,i)=>(i===-1&&(a+=1),a),0);E(n<=1,()=>"There should be only one negative value in split array.");let s=t.indexOf(-1);if(s!==-1){let a=t.reduce((i,c)=>c>0?i+c:i);t[s]=r.shape[e]-a}E(r.shape[e]===t.reduce((a,i)=>a+i),()=>"The sum of sizes must match the size of the axis dimension."),o=t}return o}function VO(r){return`Received SparseTensor with denseShape[0] = 0 but
  indices.shape[0] = ${r}`}function zO(r,t){return`indices(${r}, 0) is invalid: ${t} < 0`}function WO(r,t,e){return`indices(${r}, 0) is invalid: ${t} >= ${e}`}function GO(r,t){return`only one output dimension may be -1, not both ${r} and ${t}`}function UO(r,t){return`size ${r} must be non-negative, not ${t}`}function HO(){return"reshape cannot infer the missing input size for an empty tensor unless all specified input sizes are non-zero"}function KO(r,t){let e=bt(r),o=bt(t);return`Input to reshape is a SparseTensor with ${e}
  dense values, but the requested shape requires a multiple of ${o}. inputShape=${r} outputShape= ${t}`}function qO(r,t){let e=bt(r),o=bt(t);return`Input to reshape is a tensor with ${e} dense values, but the requested shape has ${o}. inputShape=${r} outputShape=${t}`}function XO(){return"segment ids must be >= 0"}function jO(){return"segment ids are not increasing"}function YO(r,t){return`Segment id ${r} out of range [0, ${t}), possibly because segmentIds input is not sorted.`}function ZO(r,t,e){return`Bad: indices[${r}] == ${t} out of range [0, ${e})`}var _g={};It(_g,{collectGatherOpShapeInfo:()=>tP,computeOutShape:()=>JO,segOpComputeOptimalWindowSize:()=>QO});function QO(r,t){let e=!1,o;for(r<=Yp?(o=r,e=!0):o=$i(r,Math.floor(Math.sqrt(r)));!e;)o>t||o===r?e=!0:o=$i(r,o+1);return o}function JO(r,t,e){let o=[],n=r.length;for(let s=0;s<n;s++)s!==t?o.push(r[s]):o.push(e);return o}function tP(r,t,e,o){let n=t.shape.length,s=r.shape.length;if(o!==0&&(o<-n||o>n))throw new Error(`Expect batchDims in the range of [-${n}, ${n}], but got ${o}`);if(o<0&&(o+=n),o>s)throw new Error(`batchDims (${o}) must be less than rank(x) (
    ${s}).`);if(e<o)throw new Error(`batchDims (${o}) must be less than or equal to axis (${e}).`);for(let u=0;u<o;++u)if(r.shape[u]!==t.shape[u])throw new Error(`x.shape[${u}]: ${r.shape[u]} should be equal to indices.shape[${u}]: ${t.shape[u]}.`);let a=r.shape[e],i=[],c=1,l=1,p=1;for(let u=0;u<o;++u)i.push(r.shape[u]),c*=r.shape[u];for(let u=o;u<e;u++)i.push(r.shape[u]),l*=r.shape[u];for(let u=o;u<n;u++)i.push(t.shape[u]);for(let u=e+1;u<s;u++)i.push(r.shape[u]),p*=r.shape[u];return{batchSize:c,sliceSize:p,outerSize:l,dimSize:a,outputShape:i}}function eP(r){try{return r.map(t=>Bi(t))}catch(t){throw new Error(`Failed to decode encoded string bytes into utf-8, error: ${t}`)}}function rP(r){return r.map(t=>Ln(t))}var ue={};It(ue,{nonMaxSuppressionV3Impl:()=>Kp,nonMaxSuppressionV4Impl:()=>qp,nonMaxSuppressionV5Impl:()=>Xp,whereImpl:()=>zp});var fi={},Qp={alpha:!1,antialias:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,depth:!1,stencil:!1,failIfMajorPerformanceCaveat:!0};function AC(r,t){fi[r]=t}function We(r,t){if(!(r in fi)||t!=null){let o=nP(r,t);if(o!==null)fi[r]=o;else return console.log("Could not get context for WebGL version",r),null}let e=fi[r];return e==null||e.isContextLost()?(delete fi[r],We(r)):(e.disable(e.DEPTH_TEST),e.disable(e.STENCIL_TEST),e.disable(e.BLEND),e.disable(e.DITHER),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SAMPLE_COVERAGE),e.enable(e.SCISSOR_TEST),e.enable(e.CULL_FACE),e.cullFace(e.BACK),fi[r])}function oP(r){if(typeof OffscreenCanvas<"u"&&r===2)return new OffscreenCanvas(300,150);if(typeof document<"u")return document.createElement("canvas");throw new Error("Cannot create a canvas in this context")}function nP(r,t){if(r!==1&&r!==2)throw new Error("Cannot get WebGL rendering context, WebGL is disabled.");let e=t??oP(r);return e.addEventListener("webglcontextlost",o=>{o.preventDefault(),delete fi[r]},!1),F().getBool("SOFTWARE_WEBGL_ENABLED")&&(Qp.failIfMajorPerformanceCaveat=!1),r===1?e.getContext("webgl",Qp)||e.getContext("experimental-webgl",Qp):e.getContext("webgl2",Qp)}var Zn;(function(r){r[r.DENSE=0]="DENSE",r[r.SHARED_BATCH=1]="SHARED_BATCH"})(Zn||(Zn={}));var xe;(function(r){r[r.RENDER=0]="RENDER",r[r.UPLOAD=1]="UPLOAD",r[r.PIXELS=2]="PIXELS",r[r.DOWNLOAD=3]="DOWNLOAD"})(xe||(xe={}));var me;(function(r){r[r.UNPACKED_FLOAT16=0]="UNPACKED_FLOAT16",r[r.UNPACKED_FLOAT32=1]="UNPACKED_FLOAT32",r[r.PACKED_4X1_UNSIGNED_BYTE=2]="PACKED_4X1_UNSIGNED_BYTE",r[r.PACKED_2X2_FLOAT32=3]="PACKED_2X2_FLOAT32",r[r.PACKED_2X2_FLOAT16=4]="PACKED_2X2_FLOAT16"})(me||(me={}));function di(r,t){return[t,r]}function FC(r,t){return r*t}function Fl(r){let t=y.sizeFromShape(r),e=Math.ceil(t/4);return y.sizeToSquarishShape(e)}function Xr(r,t){return[Math.max(1,Math.ceil(t/2)),Math.max(1,Math.ceil(r/2))]}function DC(r,t){let[e,o]=Xr(r,t);return e*o*4}function Dl(r,t){let e=r,o,n,s,a,i,c,l,p,u,m;return F().getNumber("WEBGL_VERSION")===2?(o=e.R32F,n=e.R16F,s=e.RGBA16F,a=e.RGBA32F,i=e.RED,l=4,p=1,u=e.HALF_FLOAT,m=e.FLOAT,c=e.RGBA8):(o=r.RGBA,n=r.RGBA,s=r.RGBA,a=e.RGBA,i=r.RGBA,l=4,p=4,u=t!=null?t.HALF_FLOAT_OES:null,m=r.FLOAT,c=r.RGBA),{internalFormatFloat:o,internalFormatHalfFloat:n,internalFormatPackedHalfFloat:s,internalFormatPackedFloat:a,textureFormatFloat:i,downloadTextureFormat:c,downloadUnpackNumChannels:l,defaultNumChannels:p,textureTypeHalfFloat:u,textureTypeFloat:m}}function st(r,t){let e=t();return F().getBool("DEBUG")&&sP(r),e}function sP(r){let t=r.getError();if(t!==r.NO_ERROR)throw new Error("WebGL Error: "+cP(r,t))}var aP=596e-10,iP=65504;function _C(r){return!!(F().getBool("WEBGL_RENDER_FLOAT32_ENABLED")||r===0||aP<Math.abs(r)&&Math.abs(r)<iP)}function cP(r,t){switch(t){case r.NO_ERROR:return"NO_ERROR";case r.INVALID_ENUM:return"INVALID_ENUM";case r.INVALID_VALUE:return"INVALID_VALUE";case r.INVALID_OPERATION:return"INVALID_OPERATION";case r.INVALID_FRAMEBUFFER_OPERATION:return"INVALID_FRAMEBUFFER_OPERATION";case r.OUT_OF_MEMORY:return"OUT_OF_MEMORY";case r.CONTEXT_LOST_WEBGL:return"CONTEXT_LOST_WEBGL";default:return`Unknown error code ${t}`}}function _l(r,t){return Co(r,()=>r.getExtension(t),'Extension "'+t+'" not supported on this browser.')}function OC(r,t){let e=Co(r,()=>r.createShader(r.VERTEX_SHADER),"Unable to create vertex WebGLShader.");if(st(r,()=>r.shaderSource(e,t)),st(r,()=>r.compileShader(e)),r.getShaderParameter(e,r.COMPILE_STATUS)===!1)throw console.log(r.getShaderInfoLog(e)),new Error("Failed to compile vertex shader.");return e}function PC(r,t){let e=Co(r,()=>r.createShader(r.FRAGMENT_SHADER),"Unable to create fragment WebGLShader.");if(st(r,()=>r.shaderSource(e,t)),st(r,()=>r.compileShader(e)),F().get("ENGINE_COMPILE_ONLY"))return e;if(r.getShaderParameter(e,r.COMPILE_STATUS)===!1)throw Bg(t,r.getShaderInfoLog(e)),new Error("Failed to compile fragment shader.");return e}var lP=/ERROR: [0-9]+:([0-9]+):/g;function Bg(r,t){let e=lP.exec(t);if(e==null){console.log(`Couldn't parse line number in error: ${t}`),console.log(r);return}let o=+e[1],n=r.split(`
`),s=n.length.toString().length+2,a=n.map((u,m)=>y.rightPad((m+1).toString(),s)+u),i=0;for(let u=0;u<a.length;u++)i=Math.max(a[u].length,i);let c=a.slice(0,o-1),l=a.slice(o-1,o),p=a.slice(o);console.log(c.join(`
`)),console.log(t.split(`
`)[0]),console.log(`%c ${y.rightPad(l[0],i)}`,"border:1px solid red; background-color:#e3d2d2; color:#a61717"),console.log(p.join(`
`))}function LC(r){return Co(r,()=>r.createProgram(),"Unable to create WebGLProgram.")}function MC(r,t){if(st(r,()=>r.linkProgram(t)),!F().get("ENGINE_COMPILE_ONLY")&&r.getProgramParameter(t,r.LINK_STATUS)===!1)throw console.log(r.getProgramInfoLog(t)),new Error("Failed to link vertex and fragment shaders.")}function tu(r,t){if(st(r,()=>r.validateProgram(t)),r.getProgramParameter(t,r.VALIDATE_STATUS)===!1)throw console.log(r.getProgramInfoLog(t)),new Error("Shader program validation failed.")}function BC(r,t){let e=Co(r,()=>r.createBuffer(),"Unable to create WebGLBuffer");return st(r,()=>r.bindBuffer(r.ARRAY_BUFFER,e)),st(r,()=>r.bufferData(r.ARRAY_BUFFER,t,r.STATIC_DRAW)),e}function VC(r,t){let e=Co(r,()=>r.createBuffer(),"Unable to create WebGLBuffer");return st(r,()=>r.bindBuffer(r.ELEMENT_ARRAY_BUFFER,e)),st(r,()=>r.bufferData(r.ELEMENT_ARRAY_BUFFER,t,r.STATIC_DRAW)),e}function zC(r){return Co(r,()=>r.createTexture(),"Unable to create WebGLTexture.")}function WC(r,t){let e=F().getNumber("WEBGL_MAX_TEXTURE_SIZE");if(r<=0||t<=0){let o=`[${r}x${t}]`;throw new Error("Requested texture size "+o+" is invalid.")}if(r>e||t>e){let o=`[${r}x${t}]`,n=`[${e}x${e}]`;throw new Error("Requested texture size "+o+" greater than WebGL maximum on this browser / GPU "+n+".")}}function GC(r){return Co(r,()=>r.createFramebuffer(),"Unable to create WebGLFramebuffer.")}function Vg(r,t,e,o,n,s,a){let i=r.getAttribLocation(t,e);return i===-1?!1:(st(r,()=>r.bindBuffer(r.ARRAY_BUFFER,o)),st(r,()=>r.vertexAttribPointer(i,n,r.FLOAT,!1,s,a)),st(r,()=>r.enableVertexAttribArray(i)),!0)}function pP(r,t,e){mP(r,e),st(r,()=>r.activeTexture(r.TEXTURE0+e)),st(r,()=>r.bindTexture(r.TEXTURE_2D,t))}function UC(r,t,e){return Co(r,()=>r.getUniformLocation(t,e),'uniform "'+e+'" not present in program.')}function HC(r,t,e){return r.getUniformLocation(t,e)}function KC(r,t,e,o){st(r,()=>pP(r,t,o)),st(r,()=>r.uniform1i(e,o))}function eu(r,t,e){st(r,()=>r.bindFramebuffer(r.FRAMEBUFFER,e)),st(r,()=>r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,t,0))}function zg(r,t){st(r,()=>r.bindFramebuffer(r.FRAMEBUFFER,t)),st(r,()=>r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,null,0))}function Ol(r){let t=r.checkFramebufferStatus(r.FRAMEBUFFER);if(t!==r.FRAMEBUFFER_COMPLETE)throw new Error("Error binding framebuffer: "+uP(r,t))}function uP(r,t){switch(t){case r.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:return"FRAMEBUFFER_INCOMPLETE_ATTACHMENT";case r.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:return"FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";case r.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:return"FRAMEBUFFER_INCOMPLETE_DIMENSIONS";case r.FRAMEBUFFER_UNSUPPORTED:return"FRAMEBUFFER_UNSUPPORTED";default:return`unknown error ${t}`}}function Co(r,t,e){let o=st(r,()=>t());if(o==null)throw new Error(e);return o}function mP(r,t){let e=r.MAX_COMBINED_TEXTURE_IMAGE_UNITS-1,o=t+r.TEXTURE0;if(o<r.TEXTURE0||o>e){let n=`[gl.TEXTURE0, gl.TEXTURE${e}]`;throw new Error(`textureUnit must be in ${n}.`)}}function Qn(r,t=2){return y.sizeFromShape(r.slice(0,r.length-t))}function Jn(r){if(r.length===0)throw Error("Cannot get rows and columns of an empty shape array.");return[r.length>1?r[r.length-2]:1,r[r.length-1]]}function ru(r){let t=[1,1,1];return r.length===0||r.length===1&&r[0]===1||(t=[Qn(r),...Jn(r)]),t}function qC(r,t=!1){let e=F().getNumber("WEBGL_MAX_TEXTURE_SIZE"),o=F().getNumber("WEBGL_MAX_SIZE_FOR_NARROW_TEXTURE");o===1/0&&F().getBool("WEBGL_AUTO_SQUARIFY_NARROW_TEXTURE_SHAPE")&&(o=e/2),t&&(e=e*2,o=o*2,r=r.map((i,c)=>c>=r.length-2?y.nearestLargerEven(r[c]):r[c]),r.length===1&&(r=[2,r[0]])),r.length!==2&&(r=y.squeezeShape(r).newShape);let n=y.sizeFromShape(r),s=null;r.length<=1&&n<=e?s=[1,n]:r.length===2&&r[0]<=e&&r[1]<=e?s=r:r.length===3&&r[0]*r[1]<=e&&r[2]<=e?s=[r[0]*r[1],r[2]]:r.length===3&&r[0]<=e&&r[1]*r[2]<=e?s=[r[0],r[1]*r[2]]:r.length===4&&r[0]*r[1]*r[2]<=e&&r[3]<=e?s=[r[0]*r[1]*r[2],r[3]]:r.length===4&&r[0]<=e&&r[1]*r[2]*r[3]<=e&&(s=[r[0],r[1]*r[2]*r[3]]);let a=s!=null&&Math.max(...s)>o&&Math.min(...s)<=(t?2:1)&&Math.min(...s)>0;if(s==null||a)if(t){let i=Qn(r),c=2,l=2;r.length&&([c,l]=Jn(r)),n=i*(c/2)*(l/2),s=y.sizeToSquarishShape(n).map(p=>p*2)}else s=y.sizeToSquarishShape(n);return s}function Jp(r){return r%2===0}function hi(r,t){if(r=r.slice(-2),t=t.slice(-2),y.arraysEqual(r,t)||!r.length||!t.length||r[0]===0||r[1]===0||t[0]===0||t[1]===0)return!0;if(r.length!==t.length){let e=r.slice(-1)[0],o=t.slice(-1)[0];if(e===o||Jp(e)&&Jp(o)&&(r[0]===1||t[0]===1))return!0}return r[1]===t[1]&&Jp(r[0])&&Jp(t[0])}var Pg,Lg;function XC(r){if(Pg==null){let t=We(r);Pg=t.getParameter(t.MAX_TEXTURE_SIZE)}return Pg}function jC(r){if(Lg==null){let t=We(r);Lg=t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS)}return Math.min(16,Lg)}function YC(r){if(r===0)return 0;let t,e=We(r);return Ye(e,"EXT_disjoint_timer_query_webgl2")&&r===2?t=2:Ye(e,"EXT_disjoint_timer_query")?t=1:t=0,t}function Ye(r,t){return r.getExtension(t)!=null}function Wg(r){try{if(We(r)!=null)return!0}catch(t){return console.log("Error when getting WebGL context: ",t),!1}return!1}function ZC(r){if(r===0)return!1;let t=We(r);if(r===1){if(!Ye(t,"OES_texture_float"))return!1}else if(!Ye(t,"EXT_color_buffer_float"))return!1;return Mg(t)}function QC(r){if(r===0)return!1;let t=We(r);if(r===1){if(!Ye(t,"OES_texture_float")||!Ye(t,"WEBGL_color_buffer_float"))return!1}else{if(Ye(t,"EXT_color_buffer_float"))return Mg(t);let o="EXT_color_buffer_half_float";if(Ye(t,o)){let n=t.getExtension(o);return fP(t,n)}return!1}return Mg(t)}function Mg(r){let t=Dl(r),e=r.createTexture();r.bindTexture(r.TEXTURE_2D,e),r.texImage2D(r.TEXTURE_2D,0,t.internalFormatFloat,1,1,0,t.textureFormatFloat,t.textureTypeFloat,null);let s=r.createFramebuffer();r.bindFramebuffer(r.FRAMEBUFFER,s),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,e,0);let a=r.checkFramebufferStatus(r.FRAMEBUFFER)===r.FRAMEBUFFER_COMPLETE;return r.bindTexture(r.TEXTURE_2D,null),r.bindFramebuffer(r.FRAMEBUFFER,null),r.deleteTexture(e),r.deleteFramebuffer(s),a}function fP(r,t){let e=Dl(r,t),o=r.createTexture();r.bindTexture(r.TEXTURE_2D,o),r.texImage2D(r.TEXTURE_2D,0,e.internalFormatHalfFloat,1,1,0,e.textureFormatFloat,e.textureTypeHalfFloat,null);let a=r.createFramebuffer();r.bindFramebuffer(r.FRAMEBUFFER,a),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,o,0);let i=r.checkFramebufferStatus(r.FRAMEBUFFER)===r.FRAMEBUFFER_COMPLETE;return r.bindTexture(r.TEXTURE_2D,null),r.bindFramebuffer(r.FRAMEBUFFER,null),r.deleteTexture(o),r.deleteFramebuffer(a),i}function JC(r){return r!==2?!1:We(r).fenceSync!=null}function jr(r,t){Array.isArray(r)||(r=[r]),r.forEach(e=>{e!=null&&y.assert(e.dtype!=="complex64",()=>`${t} does not support complex64 tensors in the WebGL backend.`)})}var ct=F();ct.registerFlag("HAS_WEBGL",()=>ct.getNumber("WEBGL_VERSION")>0);ct.registerFlag("WEBGL_VERSION",()=>Wg(2)?2:Wg(1)?1:0);ct.registerFlag("WEBGL_CHECK_NUMERICAL_PROBLEMS",()=>!1);ct.registerFlag("WEBGL_BUFFER_SUPPORTED",()=>ct.get("WEBGL_VERSION")===2);ct.registerFlag("WEBGL_CPU_FORWARD",()=>!0);ct.registerFlag("WEBGL_FORCE_F16_TEXTURES",()=>!1);ct.registerFlag("WEBGL_PACK",()=>ct.getBool("HAS_WEBGL"));ct.registerFlag("WEBGL_PACK_NORMALIZATION",()=>ct.getBool("WEBGL_PACK"));ct.registerFlag("WEBGL_PACK_CLIP",()=>ct.getBool("WEBGL_PACK"));ct.registerFlag("WEBGL_PACK_DEPTHWISECONV",()=>ct.getBool("WEBGL_PACK"));ct.registerFlag("WEBGL_PACK_BINARY_OPERATIONS",()=>ct.getBool("WEBGL_PACK"));ct.registerFlag("WEBGL_PACK_UNARY_OPERATIONS",()=>ct.getBool("WEBGL_PACK"));ct.registerFlag("WEBGL_PACK_ARRAY_OPERATIONS",()=>ct.getBool("WEBGL_PACK"));ct.registerFlag("WEBGL_PACK_IMAGE_OPERATIONS",()=>ct.getBool("WEBGL_PACK"));ct.registerFlag("WEBGL_PACK_REDUCE",()=>ct.getBool("WEBGL_PACK"));ct.registerFlag("WEBGL_LAZILY_UNPACK",()=>ct.getBool("WEBGL_PACK"));ct.registerFlag("WEBGL_CONV_IM2COL",()=>ct.getBool("WEBGL_PACK"));ct.registerFlag("WEBGL_MAX_TEXTURE_SIZE",()=>XC(ct.getNumber("WEBGL_VERSION")));ct.registerFlag("WEBGL_MAX_TEXTURES_IN_SHADER",()=>jC(ct.getNumber("WEBGL_VERSION")));ct.registerFlag("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION",()=>{let r=ct.getNumber("WEBGL_VERSION");return r===0?0:YC(r)});ct.registerFlag("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_RELIABLE",()=>ct.getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION")>0&&!io.isMobile());ct.registerFlag("WEBGL_RENDER_FLOAT32_CAPABLE",()=>ZC(ct.getNumber("WEBGL_VERSION")));ct.registerFlag("WEBGL_RENDER_FLOAT32_ENABLED",()=>ct.getBool("WEBGL_FORCE_F16_TEXTURES")?!1:ct.getBool("WEBGL_RENDER_FLOAT32_CAPABLE"));ct.registerFlag("WEBGL_DOWNLOAD_FLOAT_ENABLED",()=>QC(ct.getNumber("WEBGL_VERSION")));ct.registerFlag("WEBGL_FENCE_API_ENABLED",()=>JC(ct.getNumber("WEBGL_VERSION")));ct.registerFlag("WEBGL_SIZE_UPLOAD_UNIFORM",()=>ct.getBool("WEBGL_RENDER_FLOAT32_ENABLED")?4:0);ct.registerFlag("WEBGL_DELETE_TEXTURE_THRESHOLD",()=>-1,r=>{if(r<0&&r!==-1)throw new Error(`WEBGL_DELETE_TEXTURE_THRESHOLD must be -1 (indicating never delete) or at least 0, but got ${r}.`)});ct.registerFlag("WEBGL_FLUSH_THRESHOLD",()=>io.isMobile()?1:-1,r=>{if(r<0&&r!==-1)throw new Error(`WEBGL_FLUSH_THRESHOLD must be -1 (indicating never manual flush) or at least 0, but got ${r}.`)});ct.registerFlag("CPU_HANDOFF_SIZE_THRESHOLD",()=>128);ct.registerFlag("WEBGL_USE_SHAPES_UNIFORMS",()=>!1);ct.registerFlag("TOPK_LAST_DIM_CPU_HANDOFF_SIZE_THRESHOLD",()=>1e5);ct.registerFlag("TOPK_K_CPU_HANDOFF_THRESHOLD",()=>128);ct.registerFlag("WEBGL_EXP_CONV",()=>!1);ct.registerFlag("SOFTWARE_WEBGL_ENABLED",()=>ct.getBool("IS_TEST"));ct.registerFlag("WEBGL_MAX_SIZE_FOR_NARROW_TEXTURE",()=>1/0);ct.registerFlag("WEBGL_AUTO_SQUARIFY_NARROW_TEXTURE_SHAPE",()=>!1);ct.registerFlag("WEBGL2_ISNAN_CUSTOM",()=>!1);function zt(){let r,t,e,o,n,s,a,i,c,l;return F().getNumber("WEBGL_VERSION")===2?(r="#version 300 es",t="in",e="out",o="in",n="texture",s="outputColor",a="out vec4 outputColor;",i=F().getBool("WEBGL2_ISNAN_CUSTOM")?`
      bool isnan_custom(float val) {
        uint floatToUint = floatBitsToUint(val);
        return (floatToUint & 0x7fffffffu) > 0x7f800000u;
      }

      bvec4 isnan_custom(vec4 val) {
        return bvec4(isnan_custom(val.x),
          isnan_custom(val.y), isnan_custom(val.z), isnan_custom(val.w));
      }

      #define isnan(value) isnan_custom(value)
    `:"",c="",l=`
      #define round(value) newRound(value)
      int newRound(float value) {
        return int(floor(value + 0.5));
      }

      ivec4 newRound(vec4 value) {
        return ivec4(floor(value + vec4(0.5)));
      }
    `):(r="",t="attribute",e="varying",o="varying",n="texture2D",s="gl_FragColor",a="",i=`
      #define isnan(value) isnan_custom(value)
      bool isnan_custom(float val) {
        return (val > 0. || val < 1. || val == 0.) ? false : true;
      }
      bvec4 isnan_custom(vec4 val) {
        return bvec4(isnan(val.x), isnan(val.y), isnan(val.z), isnan(val.w));
      }
    `,c=`
      uniform float INFINITY;

      bool isinf(float val) {
        return abs(val) == INFINITY;
      }
      bvec4 isinf(vec4 val) {
        return equal(abs(val), vec4(INFINITY));
      }
    `,l=`
      int round(float value) {
        return int(floor(value + 0.5));
      }

      ivec4 round(vec4 value) {
        return ivec4(floor(value + vec4(0.5)));
      }
    `),{version:r,attribute:t,varyingVs:e,varyingFs:o,texture2D:n,output:s,defineOutput:a,defineSpecialNaN:i,defineSpecialInf:c,defineRound:l}}function kr(r,t,e="index"){let o=y.computeStrides(t);return o.map((n,s)=>{let a=`int ${r[s]} = ${e} / ${n}`,i=s===o.length-1?`int ${r[s+1]} = ${e} - ${r[s]} * ${n}`:`index -= ${r[s]} * ${n}`;return`${a}; ${i};`}).join("")}function gi(r,t,e="index"){let o=y.computeStrides(t);return o.map((n,s)=>{let a=`int ${r[s]} = ${e} / outShapeStrides[${s}]`,i=s===o.length-1?`int ${r[s+1]} = ${e} - ${r[s]} * outShapeStrides[${s}]`:`index -= ${r[s]} * outShapeStrides[${s}]`;return`${a}; ${i};`}).join("")}function dP(r,t){let e=r.length,o=r.map(s=>`${t}[${s}]`),n=new Array(e-1);n[e-2]=o[e-1];for(let s=e-3;s>=0;--s)n[s]=`(${n[s+1]} * ${o[s+1]})`;return n}function tT(r,t,e="index"){let o=r.map((s,a)=>a),n=dP(o,t);return n.map((s,a)=>{let i=`int ${r[a]} = ${e} / ${n[a]}`,c=a===n.length-1?`int ${r[a+1]} = ${e} - ${r[a]} * ${n[a]}`:`index -= ${r[a]} * ${n[a]}`;return`${i}; ${c};`}).join("")}function Ji(r){let t=y.computeStrides(r).map(e=>e.toString());return`
  int getFlatIndex(ivec3 coords) {
    return coords.x * ${t[0]} + coords.y * ${t[1]} + coords.z;
  }
`}function tc(){return`
  int getFlatIndex(ivec3 coords) {
    return coords.x * outShapeStrides[0] + coords.y * outShapeStrides[1] + coords.z;
  }
`}var nu=`
  const float FLOAT_MAX = 1.70141184e38;
  const float FLOAT_MIN = 1.17549435e-38;

  lowp vec4 encode_float(highp float v) {
    if (isnan(v)) {
      return vec4(255, 255, 255, 255);
    }

    highp float av = abs(v);

    if(av < FLOAT_MIN) {
      return vec4(0.0, 0.0, 0.0, 0.0);
    } else if(v > FLOAT_MAX) {
      return vec4(0.0, 0.0, 128.0, 127.0) / 255.0;
    } else if(v < -FLOAT_MAX) {
      return vec4(0.0, 0.0,  128.0, 255.0) / 255.0;
    }

    highp vec4 c = vec4(0,0,0,0);

    highp float e = floor(log2(av));
    highp float m = exp2(fract(log2(av))) - 1.0;

    c[2] = floor(128.0 * m);
    m -= c[2] / 128.0;
    c[1] = floor(32768.0 * m);
    m -= c[1] / 32768.0;
    c[0] = floor(8388608.0 * m);

    highp float ebias = e + 127.0;
    c[3] = floor(ebias / 2.0);
    ebias -= c[3] * 2.0;
    c[2] += floor(ebias) * 128.0;

    c[3] += 128.0 * step(0.0, -v);

    return c / 255.0;
  }
`;var{getBroadcastDims:eT}=I;function rT(r,t,e){let o=[];if(r.forEach(f=>{let d=y.sizeFromShape(f.shapeInfo.logicalShape);if(f.shapeInfo.isUniform?o.push(`uniform float ${f.name}${d>1?`[${d}]`:""};`):(o.push(`uniform sampler2D ${f.name};`),o.push(`uniform int offset${f.name};`)),e.enableShapeUniforms){let{uniformShape:g}=su(e.packedInputs,f.shapeInfo.logicalShape,f.shapeInfo.texShape);switch(g.length){case 1:o.push(`uniform int ${f.name}Shape;`);break;case 2:o.push(`uniform ivec2 ${f.name}Shape;`);break;case 3:o.push(`uniform ivec3 ${f.name}Shape;`);break;case 4:o.push(`uniform ivec4 ${f.name}Shape;`);break;default:break}o.push(`uniform ivec2 ${f.name}TexShape;`)}}),e.enableShapeUniforms){switch(t.logicalShape.length){case 1:o.push("uniform int outShape;");break;case 2:o.push("uniform ivec2 outShape;"),o.push("uniform int outShapeStrides;");break;case 3:o.push("uniform ivec3 outShape;"),o.push("uniform ivec2 outShapeStrides;");break;case 4:o.push("uniform ivec4 outShape;"),o.push("uniform ivec3 outShapeStrides;");break;default:break}o.push("uniform ivec2 outTexShape;")}e.customUniforms&&e.customUniforms.forEach(f=>{o.push(`uniform ${f.type} ${f.name}${f.arrayIndex?`[${f.arrayIndex}]`:""};`)});let n=o.join(`
`),s=r.map(f=>hP(f,t,e.packedInputs,e.enableShapeUniforms)).join(`
`),a=t.texShape,i=zt(),c=yP(i),l,p,u=TP(i);return t.isPacked?(l=gP(t.logicalShape,a,e.enableShapeUniforms),p=CP(i)):(l=xP(t.logicalShape,a,e.enableShapeUniforms),p=bP(i)),e.packedInputs&&(u+=IP),[u,c,p,n,l,s,e.userCode].join(`
`)}function rc(r,t=!1){let e=r.shapeInfo.logicalShape;switch(e.length){case 0:return LP(r,t);case 1:return BP(r,t);case 2:return zP(r,t);case 3:return GP(r,t);case 4:return HP(r,t);case 5:return KP(r);case 6:return qP(r);default:throw new Error(`${e.length}-D input sampling is not yet supported`)}}function oT(r,t){switch(r.shapeInfo.logicalShape.length){case 0:return PP(r);case 1:return MP(r,t);case 2:return VP(r,t);case 3:return WP(r,t);default:return UP(r,t)}}function hP(r,t,e=!1,o){let n="";e?n+=oT(r,o):n+=rc(r,o);let s=r.shapeInfo.logicalShape,a=t.logicalShape;return s.length<=a.length&&(e?n+=XP(r,t):n+=jP(r,t)),n}function gP(r,t,e){switch(r.length){case 0:return nT();case 1:return vP(r,t,e);case 2:return _P(r,t,e);case 3:return EP(r,t,e);default:return RP(r,t,e)}}function xP(r,t,e){switch(r.length){case 0:return nT();case 1:return kP(r,t,e);case 2:return OP(r,t,e);case 3:return $P(r,t,e);case 4:return AP(r,t,e);case 5:return FP(r,t);case 6:return DP(r,t);default:throw new Error(`${r.length}-D output sampling is not yet supported`)}}function yP(r){return`
    float sampleTexture(sampler2D textureSampler, vec2 uv) {
      return ${r.texture2D}(textureSampler, uv).r;
    }
  `}function bP(r){return`
    void setOutput(float val) {
      ${r.output} = vec4(val, 0, 0, 0);
    }
  `}function CP(r){return`
    void setOutput(vec4 val) {
      ${r.output} = val;
    }
  `}function TP(r){return`${r.version}
    precision highp float;
    precision highp int;
    precision highp sampler2D;
    ${r.varyingFs} vec2 resultUV;
    ${r.defineOutput}
    const vec2 halfCR = vec2(0.5, 0.5);

    struct ivec5
    {
      int x;
      int y;
      int z;
      int w;
      int u;
    };

    struct ivec6
    {
      int x;
      int y;
      int z;
      int w;
      int u;
      int v;
    };

    uniform float NAN;
    ${r.defineSpecialNaN}
    ${r.defineSpecialInf}
    ${r.defineRound}

    int imod(int x, int y) {
      return x - y * (x / y);
    }

    int idiv(int a, int b, float sign) {
      int res = a / b;
      int mod = imod(a, b);
      if (sign < 0. && mod != 0) {
        res -= 1;
      }
      return res;
    }

    //Based on the work of Dave Hoskins
    //https://www.shadertoy.com/view/4djSRW
    #define HASHSCALE1 443.8975
    float random(float seed){
      vec2 p = resultUV * seed;
      vec3 p3  = fract(vec3(p.xyx) * HASHSCALE1);
      p3 += dot(p3, p3.yzx + 19.19);
      return fract((p3.x + p3.y) * p3.z);
    }

    ${SP}
    ${wP}
    ${NP}
  `}var SP=`
vec2 uvFromFlat(int texNumR, int texNumC, int index) {
  int texR = index / texNumC;
  int texC = index - texR * texNumC;
  return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);
}
vec2 packedUVfrom1D(int texNumR, int texNumC, int index) {
  int texelIndex = index / 2;
  int texR = texelIndex / texNumC;
  int texC = texelIndex - texR * texNumC;
  return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);
}
`,wP=`
vec2 packedUVfrom2D(int texelsInLogicalRow, int texNumR,
  int texNumC, int row, int col) {
  int texelIndex = (row / 2) * texelsInLogicalRow + (col / 2);
  int texR = texelIndex / texNumC;
  int texC = texelIndex - texR * texNumC;
  return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);
}
`,NP=`
vec2 packedUVfrom3D(int texNumR, int texNumC,
    int texelsInBatch, int texelsInLogicalRow, int b,
    int row, int col) {
  int index = b * texelsInBatch + (row / 2) * texelsInLogicalRow + (col / 2);
  int texR = index / texNumC;
  int texC = index - texR * texNumC;
  return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);
}
`,IP=`
  float getChannel(vec4 frag, vec2 innerDims) {
    vec2 modCoord = mod(innerDims, 2.);
    return modCoord.x == 0. ?
      (modCoord.y == 0. ? frag.r : frag.g) :
      (modCoord.y == 0. ? frag.b : frag.a);
  }
  float getChannel(vec4 frag, int dim) {
    float modCoord = mod(float(dim), 2.);
    return modCoord == 0. ? frag.r : frag.g;
  }
`;function nT(){return`
    int getOutputCoords() {
      return 0;
    }
  `}function vP(r,t,e){let o=[Math.ceil(t[0]/2),Math.ceil(t[1]/2)];return o[0]===1?e?`
      int getOutputCoords() {
        return 2 * int(resultUV.x * ceil(float(outTexShape[1]) / 2.0));
      }
    `:`
      int getOutputCoords() {
        return 2 * int(resultUV.x * ${o[1]}.0);
      }
    `:o[1]===1?e?`
      int getOutputCoords() {
        return 2 * int(resultUV.y * ceil(float(outTexShape[0]) / 2.0));
      }
    `:`
      int getOutputCoords() {
        return 2 * int(resultUV.y * ${o[0]}.0);
      }
    `:e?`
    int getOutputCoords() {
      ivec2 packedTexShape = ivec2(ceil(float(outTexShape[0]) / 2.0), ceil(float(outTexShape[1]) / 2.0));
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(packedTexShape[0], packedTexShape[1]));
      return 2 * (resTexRC.x * packedTexShape[1] + resTexRC.y);
    }
  `:`
    int getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(${o[0]}, ${o[1]}));
      return 2 * (resTexRC.x * ${o[1]} + resTexRC.y);
    }
  `}function kP(r,t,e){return t[0]===1?e?`
      int getOutputCoords() {
        return int(resultUV.x * float(outTexShape[1]));
      }
    `:`
      int getOutputCoords() {
        return int(resultUV.x * ${t[1]}.0);
      }
    `:t[1]===1?e?`
      int getOutputCoords() {
        return int(resultUV.y * float(outTexShape[0]));
      }
    `:`
      int getOutputCoords() {
        return int(resultUV.y * ${t[0]}.0);
      }
    `:e?`
    int getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(outTexShape[0], outTexShape[1]));
      return resTexRC.x * outTexShape[1] + resTexRC.y;
    }
  `:`
    int getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(${t[0]}, ${t[1]}));
      return resTexRC.x * ${t[1]} + resTexRC.y;
    }
  `}function EP(r,t,e){if(e)return`
    ivec3 getOutputCoords() {
      ivec2 packedTexShape = ivec2(ceil(float(outTexShape[0]) / 2.0), ceil(float(outTexShape[1]) / 2.0));
      int texelsInLogicalRow = int(ceil(float(outShape[2]) / 2.0));
      int texelsInBatch = texelsInLogicalRow * int(ceil(float(outShape[1]) / 2.0));
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(packedTexShape[0], packedTexShape[1]));
      int index = resTexRC.x * packedTexShape[1] + resTexRC.y;

      int b = index / texelsInBatch;
      index -= b * texelsInBatch;

      int r = 2 * (index / texelsInLogicalRow);
      int c = imod(index, texelsInLogicalRow) * 2;

      return ivec3(b, r, c);
    }
  `;let o=[Math.ceil(t[0]/2),Math.ceil(t[1]/2)],n=Math.ceil(r[2]/2),s=n*Math.ceil(r[1]/2);return`
    ivec3 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(${o[0]}, ${o[1]}));
      int index = resTexRC.x * ${o[1]} + resTexRC.y;

      int b = index / ${s};
      index -= b * ${s};

      int r = 2 * (index / ${n});
      int c = imod(index, ${n}) * 2;

      return ivec3(b, r, c);
    }
  `}function $P(r,t,e){if(e)return`
  ivec3 getOutputCoords() {
    ivec2 resTexRC = ivec2(resultUV.yx *
                           vec2(outTexShape[0], outTexShape[1]));
    int index = resTexRC.x * outTexShape[1] + resTexRC.y;
    ${gi(["r","c","d"],r)}
    return ivec3(r, c, d);
  }
`;let o=kr(["r","c","d"],r);return`
    ivec3 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(${t[0]}, ${t[1]}));
      int index = resTexRC.x * ${t[1]} + resTexRC.y;
      ${o}
      return ivec3(r, c, d);
    }
  `}function RP(r,t,e){if(e)return`
    ivec4 getOutputCoords() {
      ivec2 packedTexShape = ivec2(ceil(float(outTexShape[0]) / 2.0), ceil(float(outTexShape[1]) / 2.0));
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(packedTexShape[0], packedTexShape[1]));
      int index = resTexRC.x * packedTexShape[1] + resTexRC.y;

      int texelsInLogicalRow = int(ceil(float(outShape[3]) / 2.0));
      int texelsInBatch = texelsInLogicalRow * int(ceil(float(outShape[2]) / 2.0));
      int texelsInBatchN = texelsInBatch * outShape[1];

      int b2 = index / texelsInBatchN;
      index -= b2 * texelsInBatchN;

      int b = index / texelsInBatch;
      index -= b * texelsInBatch;

      int r = 2 * (index / texelsInLogicalRow);
      int c = imod(index, texelsInLogicalRow) * 2;

      return ivec4(b2, b, r, c);
    }
  `;let o=[Math.ceil(t[0]/2),Math.ceil(t[1]/2)],n=Math.ceil(r[r.length-1]/2),s=n*Math.ceil(r[r.length-2]/2),a=s,i="",c="b, r, c";for(let l=2;l<r.length-1;l++)a*=r[r.length-l-1],i=`
      int b${l} = index / ${a};
      index -= b${l} * ${a};
    `+i,c=`b${l}, `+c;return`
    ivec${r.length} getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(${o[0]}, ${o[1]}));
      int index = resTexRC.x * ${o[1]} + resTexRC.y;

      ${i}

      int b = index / ${s};
      index -= b * ${s};

      int r = 2 * (index / ${n});
      int c = imod(index, ${n}) * 2;

      return ivec${r.length}(${c});
    }
  `}function AP(r,t,e){if(e)return`
    ivec4 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
        vec2(outTexShape[0], outTexShape[1]));
      int index = resTexRC.x * outTexShape[1] + resTexRC.y;
      ${gi(["r","c","d","d2"],r)}
      return ivec4(r, c, d, d2);
    }
  `;let o=kr(["r","c","d","d2"],r);return`
    ivec4 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
        vec2(${t[0]}, ${t[1]}));
      int index = resTexRC.x * ${t[1]} + resTexRC.y;
      ${o}
      return ivec4(r, c, d, d2);
    }
  `}function FP(r,t){let e=kr(["r","c","d","d2","d3"],r);return`
    ivec5 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx * vec2(${t[0]},
                             ${t[1]}));

      int index = resTexRC.x * ${t[1]} + resTexRC.y;

      ${e}

      ivec5 outShape = ivec5(r, c, d, d2, d3);
      return outShape;
    }
  `}function DP(r,t){let e=kr(["r","c","d","d2","d3","d4"],r);return`
    ivec6 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
        vec2(${t[0]}, ${t[1]}));
      int index = resTexRC.x * ${t[1]} + resTexRC.y;

      ${e}

      ivec6 result = ivec6(r, c, d, d2, d3, d4);
      return result;
    }
  `}function _P(r,t,e){let o=[Math.ceil(t[0]/2),Math.ceil(t[1]/2)];if(y.arraysEqual(r,t))return e?`
      ivec2 getOutputCoords() {
        ivec2 packedTexShape = ivec2(ceil(float(outTexShape[0]) / 2.0), ceil(float(outTexShape[1]) / 2.0));
        return 2 * ivec2(resultUV.yx * vec2(packedTexShape[0], packedTexShape[1]));
      }
    `:`
      ivec2 getOutputCoords() {
        return 2 * ivec2(resultUV.yx * vec2(${o[0]}, ${o[1]}));
      }
    `;let n=Math.ceil(r[1]/2);return e?`
    ivec2 getOutputCoords() {
      ivec2 packedTexShape = ivec2(ceil(float(outTexShape[0]) / 2.0), ceil(float(outTexShape[1]) / 2.0));
      int texelsInLogicalRow = int(ceil(float(outShape[1]) / 2.0));
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(packedTexShape[0], packedTexShape[1]));

      int index = resTexRC.x * packedTexShape[1] + resTexRC.y;
      int r = 2 * (index / texelsInLogicalRow);
      int c = imod(index, texelsInLogicalRow) * 2;

      return ivec2(r, c);
    }
  `:`
    ivec2 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(${o[0]}, ${o[1]}));

      int index = resTexRC.x * ${o[1]} + resTexRC.y;
      int r = 2 * (index / ${n});
      int c = imod(index, ${n}) * 2;

      return ivec2(r, c);
    }
  `}function OP(r,t,e){return y.arraysEqual(r,t)?e?`
      ivec2 getOutputCoords() {
        return ivec2(resultUV.yx * vec2(outTexShape[0], outTexShape[1]));
      }
    `:`
      ivec2 getOutputCoords() {
        return ivec2(resultUV.yx * vec2(${t[0]}, ${t[1]}));
      }
    `:r[1]===1?e?`
      ivec2 getOutputCoords() {
        ivec2 resTexRC = ivec2(resultUV.yx *
                               vec2(outTexShape[0], outTexShape[1]));
        int index = resTexRC.x * outTexShape[1] + resTexRC.y;
        return ivec2(index, 0);
      }
    `:`
      ivec2 getOutputCoords() {
        ivec2 resTexRC = ivec2(resultUV.yx *
                               vec2(${t[0]}, ${t[1]}));
        int index = resTexRC.x * ${t[1]} + resTexRC.y;
        return ivec2(index, 0);
      }
    `:r[0]===1?e?`
      ivec2 getOutputCoords() {
        ivec2 resTexRC = ivec2(resultUV.yx *
                               vec2(outTexShape[0], outTexShape[1]));
        int index = resTexRC.x * outTexShape[1] + resTexRC.y;
        return ivec2(0, index);
      }
    `:`
      ivec2 getOutputCoords() {
        ivec2 resTexRC = ivec2(resultUV.yx *
                               vec2(${t[0]}, ${t[1]}));
        int index = resTexRC.x * ${t[1]} + resTexRC.y;
        return ivec2(0, index);
      }
    `:e?`
    ivec2 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(outTexShape[0], outTexShape[1]));
      int index = resTexRC.x * outTexShape[1] + resTexRC.y;
      int r = index / outShape[1];
      int c = index - r * outShape[1];
      return ivec2(r, c);
    }
  `:`
    ivec2 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(${t[0]}, ${t[1]}));
      int index = resTexRC.x * ${t[1]} + resTexRC.y;
      int r = index / ${r[1]};
      int c = index - r * ${r[1]};
      return ivec2(r, c);
    }
  `}function xi(r){return`offset${r}`}function PP(r){let t=r.name,e="get"+t.charAt(0).toUpperCase()+t.slice(1),o=zt();return`
    vec4 ${e}() {
      return ${o.texture2D}(${t}, halfCR);
    }
  `}function LP(r,t){let e=r.name,o="get"+e.charAt(0).toUpperCase()+e.slice(1);if(r.shapeInfo.isUniform)return`float ${o}() {return ${e};}`;let[n,s]=r.shapeInfo.texShape;if(n===1&&s===1)return`
      float ${o}() {
        return sampleTexture(${e}, halfCR);
      }
    `;let a=xi(e);if(t)return`
    float ${o}() {
      vec2 uv = uvFromFlat(${e}TexShape[0], ${e}TexShape[1], ${a});
      return sampleTexture(${e}, uv);
    }
  `;let[i,c]=r.shapeInfo.texShape;return`
    float ${o}() {
      vec2 uv = uvFromFlat(${i}, ${c}, ${a});
      return sampleTexture(${e}, uv);
    }
  `}function MP(r,t){let e=r.name,o="get"+e.charAt(0).toUpperCase()+e.slice(1),n=r.shapeInfo.texShape,s=zt();if(t)return`
    vec4 ${o}(int index) {
      ivec2 packedTexShape = ivec2(ceil(float(${e}TexShape[0]) / 2.0), ceil(float(${e}TexShape[1]) / 2.0));
      vec2 uv = packedUVfrom1D(
        packedTexShape[0], packedTexShape[1], index);
      return ${s.texture2D}(${e}, uv);
    }
  `;let a=[Math.ceil(n[0]/2),Math.ceil(n[1]/2)];return`
    vec4 ${o}(int index) {
      vec2 uv = packedUVfrom1D(
        ${a[0]}, ${a[1]}, index);
      return ${s.texture2D}(${e}, uv);
    }
  `}function BP(r,t){let e=r.name,o="get"+e.charAt(0).toUpperCase()+e.slice(1);if(r.shapeInfo.isUniform)return`
      float ${o}(int index) {
        ${oc(r)}
      }
    `;let n=r.shapeInfo.texShape,s=n[0],a=n[1];if(a===1&&s===1)return`
      float ${o}(int index) {
        return sampleTexture(${e}, halfCR);
      }
    `;let i=xi(e);return a===1?t?`
      float ${o}(int index) {
        vec2 uv = vec2(0.5, (float(index + ${i}) + 0.5) / float(${e}TexShape[0]));
        return sampleTexture(${e}, uv);
      }
    `:`
      float ${o}(int index) {
        vec2 uv = vec2(0.5, (float(index + ${i}) + 0.5) / ${s}.0);
        return sampleTexture(${e}, uv);
      }
    `:s===1?t?`
      float ${o}(int index) {
        vec2 uv = vec2((float(index + ${i}) + 0.5) / float(${e}TexShape[1]), 0.5);
        return sampleTexture(${e}, uv);
      }
    `:`
      float ${o}(int index) {
        vec2 uv = vec2((float(index + ${i}) + 0.5) / ${a}.0, 0.5);
        return sampleTexture(${e}, uv);
      }
    `:t?`
    float ${o}(int index) {
      vec2 uv = uvFromFlat(${e}TexShape[0], ${e}TexShape[1], index + ${i});
      return sampleTexture(${e}, uv);
    }
  `:`
    float ${o}(int index) {
      vec2 uv = uvFromFlat(${s}, ${a}, index + ${i});
      return sampleTexture(${e}, uv);
    }
  `}function VP(r,t){let e=r.shapeInfo.logicalShape,o=r.name,n="get"+o.charAt(0).toUpperCase()+o.slice(1),s=r.shapeInfo.texShape,a=s[0],i=s[1],c=zt();if(s!=null&&y.arraysEqual(e,s))return t?`
      vec4 ${n}(int row, int col) {
        vec2 uv = (vec2(col, row) + halfCR) / vec2(${o}TexShape[1], ${o}TexShape[0]);

        return ${c.texture2D}(${o}, uv);
      }
    `:`
      vec4 ${n}(int row, int col) {
        vec2 uv = (vec2(col, row) + halfCR) / vec2(${i}.0, ${a}.0);

        return ${c.texture2D}(${o}, uv);
      }
    `;if(t)return`
    vec4 ${n}(int row, int col) {
      ivec2 packedTexShape = ivec2(ceil(float(${o}TexShape[0]) / 2.0), ceil(float(${o}TexShape[1]) / 2.0));
      int valuesPerRow = int(ceil(float(${o}Shape[1]) / 2.0));
      vec2 uv = packedUVfrom2D(valuesPerRow, packedTexShape[0], packedTexShape[1], row, col);
      return ${c.texture2D}(${o}, uv);
    }
  `;let l=[Math.ceil(s[0]/2),Math.ceil(s[1]/2)],p=Math.ceil(e[1]/2);return`
    vec4 ${n}(int row, int col) {
      vec2 uv = packedUVfrom2D(${p}, ${l[0]}, ${l[1]}, row, col);
      return ${c.texture2D}(${o}, uv);
    }
  `}function zP(r,t){let e=r.shapeInfo.logicalShape,o=r.name,n="get"+o.charAt(0).toUpperCase()+o.slice(1),s=r.shapeInfo.texShape;if(s!=null&&y.arraysEqual(e,s)){if(t)return`
      float ${n}(int row, int col) {
        vec2 uv = (vec2(col, row) + halfCR) / vec2(${o}TexShape[1], ${o}TexShape[0]);
        return sampleTexture(${o}, uv);
      }
    `;let m=s[0],f=s[1];return`
    float ${n}(int row, int col) {
      vec2 uv = (vec2(col, row) + halfCR) / vec2(${f}.0, ${m}.0);
      return sampleTexture(${o}, uv);
    }
  `}let{newShape:a,keptDims:i}=y.squeezeShape(e),c=a;if(c.length<e.length){let m=nc(r,c),f=["row","col"];return`
      ${rc(m,t)}
      float ${n}(int row, int col) {
        return ${n}(${sc(f,i)});
      }
    `}if(r.shapeInfo.isUniform)return`
      float ${n}(int row, int col) {
        int index = round(dot(vec2(row, col), vec2(${e[1]}, 1)));
        ${oc(r)}
      }
    `;let l=s[0],p=s[1],u=xi(o);return p===1?t?`
      float ${n}(int row, int col) {
        float index = dot(vec3(row, col, ${u}), vec3(${o}Shape[1], 1, 1));
        vec2 uv = vec2(0.5, (index + 0.5) / float(${o}TexShape[0]));
        return sampleTexture(${o}, uv);
      }
    `:`
    float ${n}(int row, int col) {
      float index = dot(vec3(row, col, ${u}), vec3(${e[1]}, 1, 1));
      vec2 uv = vec2(0.5, (index + 0.5) / ${l}.0);
      return sampleTexture(${o}, uv);
    }
  `:l===1?t?`
      float ${n}(int row, int col) {
        float index = dot(vec3(row, col, ${u}), vec3(${o}Shape[1], 1, 1));
        vec2 uv = vec2((index + 0.5) / float(${o}TexShape[1]), 0.5);
        return sampleTexture(${o}, uv);
      }
    `:`
    float ${n}(int row, int col) {
      float index = dot(vec3(row, col, ${u}), vec3(${e[1]}, 1, 1));
      vec2 uv = vec2((index + 0.5) / ${p}.0, 0.5);
      return sampleTexture(${o}, uv);
    }
  `:t?`
      float ${n}(int row, int col) {
        // Explicitly use integer operations as dot() only works on floats.
        int index = row * ${o}Shape[1] + col + ${u};
        vec2 uv = uvFromFlat(${o}TexShape[0], ${o}TexShape[1], index);
        return sampleTexture(${o}, uv);
      }
    `:`
  float ${n}(int row, int col) {
    // Explicitly use integer operations as dot() only works on floats.
    int index = row * ${e[1]} + col + ${u};
    vec2 uv = uvFromFlat(${l}, ${p}, index);
    return sampleTexture(${o}, uv);
  }
`}function WP(r,t){let e=r.shapeInfo.logicalShape,o=r.name,n="get"+o.charAt(0).toUpperCase()+o.slice(1),s=r.shapeInfo.texShape,a=[Math.ceil(s[0]/2),Math.ceil(s[1]/2)];if(e[0]===1){let m=e.slice(1),f=[1,2],d=nc(r,m),g=["b","row","col"];return`
        ${oT(d,t)}
        vec4 ${n}(int b, int row, int col) {
          return ${n}(${sc(g,f)});
        }
      `}let i=zt();if(t)return`
    vec4 ${n}(int b, int row, int col) {
      ivec2 packedTexShape = ivec2(ceil(float(${o}TexShape[0]) / 2.0), ceil(float(${o}TexShape[1]) / 2.0));
      int valuesPerRow = int(ceil(float(${o}Shape[2]) / 2.0));
      int texelsInBatch = valuesPerRow * int(ceil(float(${o}Shape[1]) / 2.0));
      vec2 uv = packedUVfrom3D(
        packedTexShape[0], packedTexShape[1], texelsInBatch, valuesPerRow, b, row, col);
      return ${i.texture2D}(${o}, uv);
    }
  `;let c=a[0],l=a[1],p=Math.ceil(e[2]/2),u=p*Math.ceil(e[1]/2);return`
    vec4 ${n}(int b, int row, int col) {
      vec2 uv = packedUVfrom3D(
        ${c}, ${l}, ${u}, ${p}, b, row, col);
      return ${i.texture2D}(${o}, uv);
    }
  `}function GP(r,t){let e=r.shapeInfo.logicalShape,o=r.name,n="get"+o.charAt(0).toUpperCase()+o.slice(1),s=e[1]*e[2],a=e[2],{newShape:i,keptDims:c}=y.squeezeShape(e),l=i;if(l.length<e.length){let g=nc(r,l),h=["row","col","depth"];return`
        ${rc(g,t)}
        float ${n}(int row, int col, int depth) {
          return ${n}(${sc(h,c)});
        }
      `}if(r.shapeInfo.isUniform)return`
      float ${n}(int row, int col, int depth) {
        int index = round(dot(vec3(row, col, depth),
                          vec3(${s}, ${a}, 1)));
        ${oc(r)}
      }
    `;let p=r.shapeInfo.texShape,u=p[0],m=p[1],f=r.shapeInfo.flatOffset;if(m===s&&f==null)return t?`
      float ${n}(int row, int col, int depth) {
        int stride1 = ${o}Shape[2];
        float texR = float(row);
        float texC = dot(vec2(col, depth), vec2(stride1, 1));
        vec2 uv = (vec2(texC, texR) + halfCR) /
                   vec2(${o}TexShape[1], ${o}TexShape[0]);
        return sampleTexture(${o}, uv);
      }
    `:`
        float ${n}(int row, int col, int depth) {
          float texR = float(row);
          float texC = dot(vec2(col, depth), vec2(${a}, 1));
          vec2 uv = (vec2(texC, texR) + halfCR) /
                     vec2(${m}.0, ${u}.0);
          return sampleTexture(${o}, uv);
        }
      `;if(m===a&&f==null)return t?`
      float ${n}(int row, int col, int depth) {
        float texR = dot(vec2(row, col), vec2(${o}Shape[1], 1));
        float texC = float(depth);
        vec2 uv = (vec2(texC, texR) + halfCR) / vec2(${o}TexShape[1], ${o}TexShape[0]);
        return sampleTexture(${o}, uv);
      }
    `:`
    float ${n}(int row, int col, int depth) {
      float texR = dot(vec2(row, col), vec2(${e[1]}, 1));
      float texC = float(depth);
      vec2 uv = (vec2(texC, texR) + halfCR) / vec2(${m}.0, ${u}.0);
      return sampleTexture(${o}, uv);
    }
  `;let d=xi(o);return t?`
    float ${n}(int row, int col, int depth) {
      // Explicitly use integer operations as dot() only works on floats.
      int stride0 = ${o}Shape[1] * ${o}Shape[2];
      int stride1 = ${o}Shape[2];
      int index = row * stride0 + col * stride1 + depth + ${d};
      vec2 uv = uvFromFlat(${o}TexShape[0], ${o}TexShape[1], index);
      return sampleTexture(${o}, uv);
    }
    `:`
      float ${n}(int row, int col, int depth) {
        // Explicitly use integer operations as dot() only works on floats.
        int index = row * ${s} + col * ${a} + depth + ${d};
        vec2 uv = uvFromFlat(${u}, ${m}, index);
        return sampleTexture(${o}, uv);
      }
  `}function UP(r,t){let e=r.name,o="get"+e.charAt(0).toUpperCase()+e.slice(1),n=zt();if(t)return`
    vec4 ${o}(int b2, int b, int row, int col) {
      int valuesPerRow = int(ceil(float(${e}Shape[3]) / 2.0));
      int texelsInBatch = valuesPerRow * int(ceil(float(${e}Shape[2]) / 2.0));
      int index = b * texelsInBatch + (row / 2) * valuesPerRow + (col / 2);
      texelsInBatch *= ${e}Shape[1];
      index = b2 * texelsInBatch + index;
      ivec2 packedTexShape = ivec2(ceil(float(${e}TexShape[0]) / 2.0), ceil(float(${e}TexShape[1]) / 2.0));
      int texR = index / packedTexShape[1];
      int texC = index - texR * packedTexShape[1];
      vec2 uv = (vec2(texC, texR) + halfCR) / vec2(packedTexShape[1], packedTexShape[0]); return ${n.texture2D}(${e}, uv);
    }
  `;let s=r.shapeInfo.logicalShape,a=s.length,i=r.shapeInfo.texShape,c=[Math.ceil(i[0]/2),Math.ceil(i[1]/2)],l=c[0],p=c[1],u=Math.ceil(s[a-1]/2),m=u*Math.ceil(s[a-2]/2),f="int b, int row, int col",d=`b * ${m} + (row / 2) * ${u} + (col / 2)`;for(let g=2;g<a-1;g++)f=`int b${g}, `+f,m*=s[a-g-1],d=`b${g} * ${m} + `+d;return`
    vec4 ${o}(${f}) {
      int index = ${d};
      int texR = index / ${p};
      int texC = index - texR * ${p};
      vec2 uv = (vec2(texC, texR) + halfCR) / vec2(${p}, ${l});
      return ${n.texture2D}(${e}, uv);
    }
  `}function HP(r,t){let e=r.shapeInfo.logicalShape,o=r.name,n="get"+o.charAt(0).toUpperCase()+o.slice(1),s=e[3],a=e[2]*s,i=e[1]*a,{newShape:c,keptDims:l}=y.squeezeShape(e);if(c.length<e.length){let b=nc(r,c),S=["row","col","depth","depth2"];return`
      ${rc(b,t)}
      float ${n}(int row, int col, int depth, int depth2) {
        return ${n}(${sc(S,l)});
      }
    `}if(r.shapeInfo.isUniform)return`
      float ${n}(int row, int col, int depth, int depth2) {
        int index = round(dot(vec4(row, col, depth, depth2),
                          vec4(${i}, ${a}, ${s}, 1)));
        ${oc(r)}
      }
    `;let p=r.shapeInfo.flatOffset,u=r.shapeInfo.texShape,m=u[0],f=u[1],d=`int stride2 = ${o}Shape[3];`,g=`int stride1 = ${o}Shape[2] * stride2;`,h=`int stride0 = ${o}Shape[1] * stride1;`;if(f===i&&p==null)return t?`
      float ${n}(int row, int col, int depth, int depth2) {
        ${d}
        ${g}
        float texR = float(row);
        float texC =
            dot(vec3(col, depth, depth2),
                vec3(stride1, stride2, 1));
        vec2 uv = (vec2(texC, texR) + halfCR) /
                   vec2(${o}TexShape[1], ${o}TexShape[0]);
        return sampleTexture(${o}, uv);
      }
    `:`
      float ${n}(int row, int col, int depth, int depth2) {
        float texR = float(row);
        float texC =
            dot(vec3(col, depth, depth2),
                vec3(${a}, ${s}, 1));
        vec2 uv = (vec2(texC, texR) + halfCR) /
                   vec2(${f}.0, ${m}.0);
        return sampleTexture(${o}, uv);
      }
    `;if(f===s&&p==null)return t?`
      float ${n}(int row, int col, int depth, int depth2) {
        float texR = dot(vec3(row, col, depth),
                         vec3(${o}Shape[1] * ${o}Shape[2], ${o}Shape[2], 1));
        float texC = float(depth2);
        vec2 uv = (vec2(texC, texR) + halfCR) /
                  vec2(${o}TexShape[1], ${o}TexShape[0]);
        return sampleTexture(${o}, uv);
      }
    `:`
      float ${n}(int row, int col, int depth, int depth2) {
        float texR = dot(vec3(row, col, depth),
                         vec3(${e[1]*e[2]}, ${e[2]}, 1));
        float texC = float(depth2);
        vec2 uv = (vec2(texC, texR) + halfCR) /
                  vec2(${f}.0, ${m}.0);
        return sampleTexture(${o}, uv);
      }
    `;let x=xi(o);return t?`
    float ${n}(int row, int col, int depth, int depth2) {
      // Explicitly use integer operations as dot() only works on floats.
      ${d}
      ${g}
      ${h}
      int index = row * stride0 + col * stride1 +
          depth * stride2 + depth2;
      vec2 uv = uvFromFlat(${o}TexShape[0], ${o}TexShape[1], index + ${x});
      return sampleTexture(${o}, uv);
    }
  `:`
    float ${n}(int row, int col, int depth, int depth2) {
      // Explicitly use integer operations as dot() only works on floats.
      int index = row * ${i} + col * ${a} +
          depth * ${s} + depth2;
      vec2 uv = uvFromFlat(${m}, ${f}, index + ${x});
      return sampleTexture(${o}, uv);
    }
  `}function KP(r){let t=r.shapeInfo.logicalShape,e=r.name,o="get"+e.charAt(0).toUpperCase()+e.slice(1),n=t[4],s=t[3]*n,a=t[2]*s,i=t[1]*a,{newShape:c,keptDims:l}=y.squeezeShape(t);if(c.length<t.length){let g=nc(r,c),h=["row","col","depth","depth2","depth3"];return`
      ${rc(g)}
      float ${o}(int row, int col, int depth, int depth2, int depth3) {
        return ${o}(${sc(h,l)});
      }
    `}if(r.shapeInfo.isUniform)return`
      float ${o}(int row, int col, int depth, int depth2, int depth3) {
        float index = dot(
          vec4(row, col, depth, depth2),
          vec4(${i}, ${a}, ${s}, ${n})) +
          depth3;
        ${oc(r)}
      }
    `;let p=r.shapeInfo.flatOffset,u=r.shapeInfo.texShape,m=u[0],f=u[1];if(f===i&&p==null)return`
      float ${o}(int row, int col, int depth, int depth2, int depth3) {
        int texR = row;
        float texC = dot(vec4(col, depth, depth2, depth3),
                         vec4(${a}, ${s}, ${n}, 1));
        vec2 uv = (vec2(texC, texR) + halfCR) /
                   vec2(${f}.0, ${m}.0);
        return sampleTexture(${e}, uv);
      }
    `;if(f===n&&p==null)return`
      float ${o}(int row, int col, int depth, int depth2, int depth3) {
        float texR = dot(
          vec4(row, col, depth, depth2),
          vec4(${t[1]*t[2]*t[3]},
               ${t[2]*t[3]}, ${t[3]}, 1));
        int texC = depth3;
        vec2 uv = (vec2(texC, texR) + halfCR) /
                  vec2(${f}.0, ${m}.0);
        return sampleTexture(${e}, uv);
      }
    `;let d=xi(e);return`
    float ${o}(int row, int col, int depth, int depth2, int depth3) {
      // Explicitly use integer operations as dot() only works on floats.
      int index = row * ${i} + col * ${a} + depth * ${s} +
          depth2 * ${n} + depth3 + ${d};
      vec2 uv = uvFromFlat(${m}, ${f}, index);
      return sampleTexture(${e}, uv);
    }
  `}function qP(r){let t=r.shapeInfo.logicalShape,e=r.name,o="get"+e.charAt(0).toUpperCase()+e.slice(1),{newShape:n,keptDims:s}=y.squeezeShape(t);if(n.length<t.length){let h=nc(r,n),x=["row","col","depth","depth2","depth3","depth4"];return`
      ${rc(h)}
      float ${o}(int row, int col, int depth,
                    int depth2, int depth3, int depth4) {
        return ${o}(${sc(x,s)});
      }
    `}let a=t[5],i=t[4]*a,c=t[3]*i,l=t[2]*c,p=t[1]*l;if(r.shapeInfo.isUniform)return`
      float ${o}(int row, int col, int depth,
                  int depth2, int depth3, int depth4) {
        int index = round(dot(
          vec4(row, col, depth, depth2),
          vec4(${p}, ${l}, ${c}, ${i})) +
          dot(
            vec2(depth3, depth4),
            vec2(${a}, 1)));
        ${oc(r)}
      }
    `;let u=r.shapeInfo.flatOffset,m=r.shapeInfo.texShape,f=m[0],d=m[1];if(d===p&&u==null)return`
      float ${o}(int row, int col, int depth,
                    int depth2, int depth3, int depth4) {
        int texR = row;
        float texC = dot(vec4(col, depth, depth2, depth3),
          vec4(${l}, ${c}, ${i}, ${a})) +
               float(depth4);
        vec2 uv = (vec2(texC, texR) + halfCR) /
                   vec2(${d}.0, ${f}.0);
        return sampleTexture(${e}, uv);
      }
    `;if(d===a&&u==null)return`
      float ${o}(int row, int col, int depth,
                    int depth2, int depth3, int depth4) {
        float texR = dot(vec4(row, col, depth, depth2),
          vec4(${t[1]*t[2]*t[3]*t[4]},
               ${t[2]*t[3]*t[4]},
               ${t[3]*t[4]},
               ${t[4]})) + float(depth3);
        int texC = depth4;
        vec2 uv = (vec2(texC, texR) + halfCR) /
                  vec2(${d}.0, ${f}.0);
        return sampleTexture(${e}, uv);
      }
    `;let g=xi(e);return`
    float ${o}(int row, int col, int depth,
                  int depth2, int depth3, int depth4) {
      // Explicitly use integer operations as dot() only works on floats.
      int index = row * ${p} + col * ${l} + depth * ${c} +
          depth2 * ${i} + depth3 * ${a} + depth4 + ${g};
      vec2 uv = uvFromFlat(${f}, ${d}, index);
      return sampleTexture(${e}, uv);
    }
  `}function oc(r){let t=r.name,e=y.sizeFromShape(r.shapeInfo.logicalShape);return e<2?`return ${t};`:`
    for (int i = 0; i < ${e}; i++) {
      if (i == index) {
        return ${t}[i];
      }
    }
  `}function XP(r,t){let e=r.name,o=e.charAt(0).toUpperCase()+e.slice(1),n="get"+o+"AtOutCoords",s=r.shapeInfo.logicalShape.length,a=t.logicalShape.length,i=eT(r.shapeInfo.logicalShape,t.logicalShape),c=dt(a),l=a-s,p,u=["x","y","z","w","u","v"];s===0?p="":a<2&&i.length>=1?p="coords = 0;":p=i.map(b=>`coords.${u[b+l]} = 0;`).join(`
`);let m="";a<2&&s>0?m="coords":m=r.shapeInfo.logicalShape.map((b,S)=>`coords.${u[S+l]}`).join(", ");let f="return outputValue;",g=y.sizeFromShape(r.shapeInfo.logicalShape)===1,x=y.sizeFromShape(t.logicalShape)===1;if(s===1&&!g&&!x)f=`
      return vec4(outputValue.xy, outputValue.xy);
    `;else if(g&&!x)a===1?f=`
        return vec4(outputValue.x, outputValue.x, 0., 0.);
      `:f=`
        return vec4(outputValue.x);
      `;else if(i.length){let b=s-2,S=s-1;i.indexOf(b)>-1&&i.indexOf(S)>-1?f="return vec4(outputValue.x);":i.indexOf(b)>-1?f="return vec4(outputValue.x, outputValue.y, outputValue.x, outputValue.y);":i.indexOf(S)>-1&&(f="return vec4(outputValue.xx, outputValue.zz);")}return`
    vec4 ${n}() {
      ${c} coords = getOutputCoords();
      ${p}
      vec4 outputValue = get${o}(${m});
      ${f}
    }
  `}function jP(r,t){let e=r.name,o=e.charAt(0).toUpperCase()+e.slice(1),n="get"+o+"AtOutCoords",s=t.texShape,a=r.shapeInfo.texShape,i=r.shapeInfo.logicalShape.length,c=t.logicalShape.length;if(!r.shapeInfo.isUniform&&i===c&&r.shapeInfo.flatOffset==null&&y.arraysEqual(a,s))return`
      float ${n}() {
        return sampleTexture(${e}, resultUV);
      }
    `;let l=dt(c),p=eT(r.shapeInfo.logicalShape,t.logicalShape),u=c-i,m,f=["x","y","z","w","u","v"];i===0?m="":c<2&&p.length>=1?m="coords = 0;":m=p.map(g=>`coords.${f[g+u]} = 0;`).join(`
`);let d="";return c<2&&i>0?d="coords":d=r.shapeInfo.logicalShape.map((g,h)=>`coords.${f[h+u]}`).join(", "),`
    float ${n}() {
      ${l} coords = getOutputCoords();
      ${m}
      return get${o}(${d});
    }
  `}function dt(r){if(r<=1)return"int";if(r===2)return"ivec2";if(r===3)return"ivec3";if(r===4)return"ivec4";if(r===5)return"ivec5";if(r===6)return"ivec6";throw Error(`GPU for rank ${r} is not yet supported`)}function su(r,t,e){let{newShape:o,keptDims:n}=y.squeezeShape(t),s=t.length,a=r&&s===3&&t[0]===1,i=a?t.slice(1):o,c=!r&&s>1&&!y.arraysEqual(t,e)&&o.length<s||a;return{useSqueezeShape:c,uniformShape:c?i:t,keptDims:n}}function nc(r,t){let e=JSON.parse(JSON.stringify(r));return e.shapeInfo.logicalShape=t,e}function sc(r,t){return t.map(e=>r[e]).join(", ")}function aT(r,t,e,o){let n=e.map((p,u)=>{let m={logicalShape:p.shape,texShape:p.isUniform?null:p.texData.texShape,isUniform:p.isUniform,isPacked:p.isUniform?!1:p.texData.isPacked,flatOffset:null};return p.texData!=null&&p.texData.slice!=null&&p.texData.slice.flatOffset>0&&(m.flatOffset=p.texData.slice.flatOffset),{name:t.variableNames[u],shapeInfo:m}}),s=n.map(p=>p.shapeInfo),a={logicalShape:o.shape,texShape:o.texData.texShape,isUniform:!1,isPacked:o.texData.isPacked,flatOffset:null},i=rT(n,a,t),c=PC(r.gl,i),l=r.createProgram(c);return F().get("ENGINE_COMPILE_ONLY")?{program:t,fragmentShader:c,source:i,webGLProgram:l,inShapeInfos:s,outShapeInfo:a,uniformLocations:null,customUniformLocations:null,infLoc:null,nanLoc:null,inShapesLocations:null,inTexShapesLocations:null,outShapeLocation:null,outShapeStridesLocation:null,outTexShapeLocation:null}:Object.assign({program:t,fragmentShader:c,source:i,webGLProgram:l,inShapeInfos:s,outShapeInfo:a},Gg(r,t,l))}function Gg(r,t,e){let o={},n={},s={},a=[],i,c,l,p=null,u=null;u=r.getUniformLocation(e,"NAN",!1),F().getNumber("WEBGL_VERSION")===1&&(p=r.getUniformLocation(e,"INFINITY",!1));let m=!1;for(let f=0;f<t.variableNames.length;f++){let d=t.variableNames[f];o[d]=r.getUniformLocation(e,d,m),o[`offset${d}`]=r.getUniformLocation(e,`offset${d}`,m),t.enableShapeUniforms&&(n[`${d}Shape`]=r.getUniformLocation(e,`${d}Shape`,m),s[`${d}TexShape`]=r.getUniformLocation(e,`${d}TexShape`,m))}return t.enableShapeUniforms&&(i=r.getUniformLocation(e,"outShape",m),l=r.getUniformLocation(e,"outShapeStrides",m),c=r.getUniformLocation(e,"outTexShape",m)),t.customUniforms&&t.customUniforms.forEach((f,d)=>{a[d]=r.getUniformLocation(e,f.name,m)}),{uniformLocations:o,customUniformLocations:a,infLoc:p,nanLoc:u,inShapesLocations:n,inTexShapesLocations:s,outShapeLocation:i,outShapeStridesLocation:l,outTexShapeLocation:c}}function sT(r,t){if(r.length!==t.length)throw Error(`Binary was compiled with ${r.length} inputs, but was executed with ${t.length} inputs`);r.forEach((e,o)=>{let n=e.logicalShape,s=t[o],a=s.shape;if(!y.arraysEqual(n,a))throw Error(`Binary was compiled with different shapes than the current args. Shapes ${n} and ${a} must match`);if(e.isUniform&&s.isUniform)return;let i=e.texShape,c=s.isUniform?null:s.texData.texShape;if(!y.arraysEqual(i,c))throw Error(`Binary was compiled with different texture shapes than the current args. Shape ${i} and ${c} must match`)})}function iT(r,t,e,o,n){t.program.enableShapeUniforms||(sT(t.inShapeInfos,e),sT([t.outShapeInfo],[o]));let s=o.texData.texture,a=o.texData.texShape;o.texData.isPacked?r.setOutputPackedMatrixTexture(s.texture,a[0],a[1]):r.setOutputMatrixTexture(s.texture,a[0],a[1]),r.setProgram(t.webGLProgram),F().getNumber("WEBGL_VERSION")===1&&t.infLoc!==null&&r.gl.uniform1f(t.infLoc,1/0),t.nanLoc!==null&&r.gl.uniform1f(t.nanLoc,NaN),e.forEach((c,l)=>{let p=t.program.variableNames[l],u=t.uniformLocations[p],m=t.uniformLocations[`offset${p}`],f=t.inShapesLocations[`${p}Shape`],d=t.inTexShapesLocations[`${p}TexShape`];if(f){let{uniformShape:g}=su(t.program.packedInputs,c.shape,c.texData.texShape);switch(g.length){case 1:r.gl.uniform1iv(f,new Int32Array(g));break;case 2:r.gl.uniform2iv(f,new Int32Array(g));break;case 3:r.gl.uniform3iv(f,new Int32Array(g));break;case 4:r.gl.uniform4iv(f,new Int32Array(g));break;default:break}}if(d&&r.gl.uniform2i(d,c.texData.texShape[0],c.texData.texShape[1]),u!=null){if(c.isUniform){if(y.sizeFromShape(c.shape)<2)r.gl.uniform1f(u,c.uniformValues[0]);else{let g=c.uniformValues;g instanceof Float32Array||(g=new Float32Array(g)),r.gl.uniform1fv(u,g)}return}c.texData.slice!=null&&m!=null&&r.gl.uniform1i(m,c.texData.slice.flatOffset),r.setInputMatrixTexture(c.texData.texture.texture,u,l)}});let i=t.outShapeLocation;if(i)switch(o.shape.length){case 1:r.gl.uniform1iv(i,new Int32Array(o.shape));break;case 2:r.gl.uniform2iv(i,new Int32Array(o.shape));break;case 3:r.gl.uniform3iv(i,new Int32Array(o.shape));break;case 4:r.gl.uniform4iv(i,new Int32Array(o.shape));break;default:break}if(t.outShapeStridesLocation){let c=y.computeStrides(o.shape);switch(o.shape.length){case 2:r.gl.uniform1iv(t.outShapeStridesLocation,new Int32Array(c));break;case 3:r.gl.uniform2iv(t.outShapeStridesLocation,new Int32Array(c));break;case 4:r.gl.uniform3iv(t.outShapeStridesLocation,new Int32Array(c));break;default:break}}t.outTexShapeLocation&&r.gl.uniform2i(t.outTexShapeLocation,o.texData.texShape[0],o.texData.texShape[1]),t.program.customUniforms&&n&&t.program.customUniforms.forEach((c,l)=>{let p=t.customUniformLocations[l],u=n[l];if(c.type==="float")r.gl.uniform1fv(p,u);else if(c.type==="vec2")r.gl.uniform2fv(p,u);else if(c.type==="vec3")r.gl.uniform3fv(p,u);else if(c.type==="vec4")r.gl.uniform4fv(p,u);else if(c.type==="int")r.gl.uniform1iv(p,u);else if(c.type==="ivec2")r.gl.uniform2iv(p,u);else if(c.type==="ivec3")r.gl.uniform3iv(p,u);else if(c.type==="ivec4")r.gl.uniform4iv(p,u);else throw Error(`uniform type ${c.type} is not supported yet.`)}),r.executeProgram()}function cT(r,t,e){let o="";t.concat(e).forEach(a=>{let i=a.texData!=null&&a.texData.slice!=null&&a.texData.slice.flatOffset>0;if(r.enableShapeUniforms&&!a.isUniform){let c=a.texData.texShape,{useSqueezeShape:l,uniformShape:p,keptDims:u}=su(r.packedInputs,a.shape,c),m="",f="",d="";if(p.length===1&&r.packedInputs){let k=[Math.ceil(c[0]/2),Math.ceil(c[1]/2)];m=`${k[0]>1}_${k[1]>1}`}else if(p.length===2&&!r.packedInputs)f=`${p[0]>1}_${p[1]>1}`;else if(p.length>2&&!r.packedInputs){let k=y.computeStrides(p);d=`${k[0]===c[1]}_${k[k.length-1]===c[1]}`}let g=a.shape.length,h=p.length===2&&y.arraysEqual(a.shape,c),x=y.sizeFromShape(a.shape)===1,b=I.getBroadcastDims(a.shape,e.shape),S=!r.packedInputs&&g===e.shape.length&&y.arraysEqual(c,e.texData.texShape),w=r.packedInputs||p.length>2?"":`${c[0]>1}_${c[1]>1}`;o+=`${g}_${S}_${l?u:""}_${p.length}_${x}_${b}_${h}_${m}_${f}_${d}_${w}_${i}`}else{let c=a.isUniform?"uniform":a.texData.texShape;o+=`${a.shape}_${c}_${i}`}});let n=r.userCode,s=r.constructor.name;return s+="_"+o+"_"+n+`${F().getNumber("WEBGL_VERSION")}`,s}function Dt(r){return F().getBool("WEBGL_USE_SHAPES_UNIFORMS")&&r<=4}var au=class{constructor(t){this.variableNames=["A"],this.packedInputs=!1,this.packedOutput=!0,this.outPackingScheme=Zn.DENSE,this.customUniforms=[{name:"texShape",type:"ivec2"}];let e=zt();this.outputShape=t,this.enableShapeUniforms=Dt(this.outputShape.length),this.userCode=`
      ivec3 outCoordsFromFlatIndex(int index) {
        ${this.enableShapeUniforms?gi(["r","c","d"],t):kr(["r","c","d"],t)}
        return ivec3(r, c, d);
      }

      void main() {
        ivec2 resTexRC = ivec2(resultUV.yx * vec2(texShape[0], texShape[1]));
        int index = 4 * (resTexRC.x * texShape[1] + resTexRC.y);

        vec4 result = vec4(0.);

        for (int i=0; i<4; i++) {
          int flatIndex = index + i;
          ivec3 rc = outCoordsFromFlatIndex(flatIndex);
          result[i] = getA(rc.x, rc.y, rc.z);
        }

        ${e.output} = result;
      }
    `}};var iu=class{constructor(t){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.outPackingScheme=Zn.DENSE,this.customUniforms=[{name:"texShape",type:"ivec2"}];let e=zt();this.outputShape=t,this.enableShapeUniforms=Dt(this.outputShape.length),this.userCode=`
      ivec3 outCoordsFromFlatIndex(int index) {
        ${this.enableShapeUniforms?gi(["r","c","d"],t):kr(["r","c","d"],t)}
        return ivec3(r, c, d);
      }

      void main() {
        ivec2 resTexRC = ivec2(resultUV.yx * vec2(texShape[0], texShape[1]));
        int index = 4 * (resTexRC.x * texShape[1] + resTexRC.y);

        vec4 result = vec4(0.);

        for (int i=0; i<4; i++) {
          int flatIndex = index + i;
          ivec3 rc = outCoordsFromFlatIndex(flatIndex);
          result[i] = getChannel(getA(rc.x, rc.y, rc.z), vec2(rc.y, rc.z));
        }

        ${e.output} = result;
      }
    `}};var cu=class{constructor(t){this.variableNames=["A"],this.outTexUsage=xe.DOWNLOAD;let e=zt();this.outputShape=t,this.userCode=`
      ${nu}

      void main() {
        float x = getAAtOutCoords();
        ${e.output} = encode_float(x);
      }
    `}};var lu=class{constructor(t){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!1,this.outTexUsage=xe.DOWNLOAD;let e=zt();this.outputShape=t,this.userCode=`
      ${nu}

      void main() {
        ivec3 coords = getOutputCoords();
        float x = getChannel(getAAtOutCoords(), vec2(coords.y, coords.z));
        ${e.output} = encode_float(x);
      }
    `}};var pu=class{constructor(t,e=!1){this.variableNames=["A"],this.customUniforms=[{name:"texShape",type:"ivec2"}];let o=zt();this.outputShape=t,this.enableShapeUniforms=Dt(this.outputShape.length);let n="result";e&&(n="floor(result * 255. + 0.5)"),this.userCode=`
      ${this.enableShapeUniforms?tc():Ji(t)}

      void main() {
        ivec3 coords = getOutputCoords();

        int flatIndex = getFlatIndex(coords);
        int offset = imod(flatIndex, 4);

        flatIndex = idiv(flatIndex, 4, 1.);

        int r = flatIndex / texShape[1];
        int c = imod(flatIndex, texShape[1]);
        vec2 uv = (vec2(c, r) + halfCR) / vec2(texShape[1], texShape[0]);
        vec4 values = ${o.texture2D}(A, uv);

        float result;

        if(offset == 0) {
          result = values[0];
        } else if(offset == 1) {
          result = values[1];
        } else if(offset == 2) {
          result = values[2];
        } else {
          result = values[3];
        }

        ${o.output} = vec4(${n}, 0., 0., 0.);
      }
    `}};var uu=class{constructor(t,e=!1){this.variableNames=["A"],this.packedInputs=!1,this.packedOutput=!0,this.customUniforms=[{name:"texShape",type:"ivec2"}];let o=zt();this.outputShape=t,this.enableShapeUniforms=Dt(this.outputShape.length);let n="",s="result";e&&(s="floor(result * 255. + 0.5)");for(let a=0;a<=1;a++)for(let i=0;i<=1;i++){let c=a*2+i;n+=`
          localCoords = coords;
          if(localCoords[2] + ${i} < ${this.enableShapeUniforms?"outShape[2]":`${t[2]}`}) {
          localCoords[2] += ${i};
          if (localCoords[1] + ${a} < ${this.enableShapeUniforms?"outShape[1]":`${t[1]}`}) {
            localCoords[1] += ${a};

            flatIndex = getFlatIndex(localCoords);
            offset = imod(flatIndex, 4);

            flatIndex = idiv(flatIndex, 4, 1.);

            int r = flatIndex / texShape[1];
            int c = imod(flatIndex, texShape[1]);
            vec2 uv = (vec2(c, r) + halfCR) / vec2(texShape[1], texShape[0]);
            values = ${o.texture2D}(A, uv);

            if (offset == 0) {
              result[${c}] = values[0];
            } else if (offset == 1) {
              result[${c}] = values[1];
            } else if (offset == 2) {
              result[${c}] = values[2];
            } else {
              result[${c}] = values[3];
            }
          }
        }
        `}this.userCode=`
        ${this.enableShapeUniforms?tc():Ji(t)}

        void main() {
          ivec3 coords = getOutputCoords();

          vec4 result = vec4(0.);
          int flatIndex, r, c, offset;
          ivec3 localCoords;
          vec2 uv;
          vec4 values;

          ${n}

          ${o.output} = ${s};
        }
    `}};function lT(r){let t=zt(),e=`${t.version}
    precision highp float;
    ${t.attribute} vec3 clipSpacePos;
    ${t.attribute} vec2 uv;
    ${t.varyingVs} vec2 resultUV;

    void main() {
      gl_Position = vec4(clipSpacePos, 1);
      resultUV = uv;
    }`;return OC(r,e)}function pT(r){let t=new Float32Array([-1,1,0,0,1,-1,-1,0,0,0,1,1,0,1,1,1,-1,0,1,0]);return BC(r,t)}function uT(r){let t=new Uint16Array([0,1,2,2,1,3]);return VC(r,t)}function Pl(r,t,e,o,n,s){WC(t,e);let a=zC(r),i=r.TEXTURE_2D;return st(r,()=>r.bindTexture(i,a)),st(r,()=>r.texParameteri(i,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE)),st(r,()=>r.texParameteri(i,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE)),st(r,()=>r.texParameteri(i,r.TEXTURE_MIN_FILTER,r.NEAREST)),st(r,()=>r.texParameteri(i,r.TEXTURE_MAG_FILTER,r.NEAREST)),F().getNumber("WEBGL_VERSION")===1?st(r,()=>r.texImage2D(i,0,o,t,e,0,n,s,null)):st(r,()=>r.texStorage2D(i,1,o,t,e)),st(r,()=>r.bindTexture(r.TEXTURE_2D,null)),{texture:a,texShape:[e,t]}}function Ug(r){return r.internalFormatFloat}function mT(r,t,e,o){let[n,s]=di(t,e);return Pl(r,n,s,Ug(o),o.textureFormatFloat,r.FLOAT)}function Hg(r){return r.internalFormatHalfFloat}function fT(r,t,e,o){let[n,s]=di(t,e);return Pl(r,n,s,Hg(o),o.textureFormatFloat,o.textureTypeHalfFloat)}function Kg(r){return r.downloadTextureFormat}function dT(r,t,e,o){let[n,s]=di(t,e);return Pl(r,n,s,Kg(o),r.RGBA,r.UNSIGNED_BYTE)}function qg(r){return r.internalFormatPackedFloat}function hT(r,t,e,o){let[n,s]=Xr(t,e);return Pl(r,n,s,qg(o),r.RGBA,r.FLOAT)}function Xg(r){return r.internalFormatPackedHalfFloat}function gT(r,t,e,o){let[n,s]=Xr(t,e);return Pl(r,n,s,Xg(o),r.RGBA,o.textureTypeHalfFloat)}function xT(r,t,e){return st(r,()=>r.bindBuffer(r.ARRAY_BUFFER,e)),Vg(r,t,"clipSpacePos",e,3,20,0)&&Vg(r,t,"uv",e,2,20,12)}function yT(r,t,e,o,n,s){st(r,()=>r.bindTexture(r.TEXTURE_2D,t));let a,i,c;n instanceof Uint8Array?(a=new Uint8Array(e*o*4),i=r.UNSIGNED_BYTE,c=r.RGBA):(a=new Float32Array(e*o*4),i=r.FLOAT,c=s.internalFormatPackedFloat),a.set(n),F().getNumber("WEBGL_VERSION")===2?st(r,()=>r.texSubImage2D(r.TEXTURE_2D,0,0,0,e,o,r.RGBA,i,a)):st(r,()=>r.texImage2D(r.TEXTURE_2D,0,c,e,o,0,r.RGBA,i,a)),st(r,()=>r.bindTexture(r.TEXTURE_2D,null))}function bT(r,t,e){st(r,()=>r.bindTexture(r.TEXTURE_2D,t)),e.data instanceof Uint8Array?F().getNumber("WEBGL_VERSION")===2?st(r,()=>r.texSubImage2D(r.TEXTURE_2D,0,0,0,e.width,e.height,r.RGBA,r.UNSIGNED_BYTE,e.data)):st(r,()=>r.texImage2D(r.TEXTURE_2D,0,r.RGBA,e.width,e.height,0,r.RGBA,r.UNSIGNED_BYTE,e.data)):F().getNumber("WEBGL_VERSION")===2?st(r,()=>r.texSubImage2D(r.TEXTURE_2D,0,0,0,r.RGBA,r.UNSIGNED_BYTE,e)):st(r,()=>r.texImage2D(r.TEXTURE_2D,0,r.RGBA,r.RGBA,r.UNSIGNED_BYTE,e)),st(r,()=>r.bindTexture(r.TEXTURE_2D,null))}function CT(r,t,e,o){let n=r.createBuffer();st(r,()=>r.bindBuffer(r.PIXEL_PACK_BUFFER,n));let i=4*4*t*e;return st(r,()=>r.bufferData(r.PIXEL_PACK_BUFFER,i,r.STREAM_READ)),st(r,()=>r.readPixels(0,0,e,t,r.RGBA,r.FLOAT,0)),st(r,()=>r.bindBuffer(r.PIXEL_PACK_BUFFER,null)),n}function TT(r,t,e){let o=r,n=new Float32Array(e);return o.bindBuffer(o.PIXEL_PACK_BUFFER,t),o.getBufferSubData(o.PIXEL_PACK_BUFFER,0,n),o.bindBuffer(o.PIXEL_PACK_BUFFER,null),n}function ST(r,t,e,o){let[n,s]=di(t,e),a=4,i=new Uint8Array(FC(t*e,a));return st(r,()=>r.readPixels(0,0,n,s,o.downloadTextureFormat,r.UNSIGNED_BYTE,i)),new Float32Array(i.buffer)}function wT(r,t,e,o,n,s,a,i){let c=r,l=new Float32Array(DC(s,a));return c.bindBuffer(c.PIXEL_PACK_BUFFER,t),c.getBufferSubData(c.PIXEL_PACK_BUFFER,0,l),c.bindBuffer(c.PIXEL_PACK_BUFFER,null),l}function NT(r,t,e){let o=new Float32Array(t*e*4);return st(r,()=>r.readPixels(0,0,e,t,r.RGBA,r.FLOAT,o)),o}var ac=class{constructor(t){this.outputTexture=null,this.program=null,this.disposed=!1,this.vertexAttrsAreBound=!1,this.itemsToPoll=[];let e=F().getNumber("WEBGL_VERSION");t!=null?(this.gl=t,AC(e,t)):this.gl=We(e);let o="WEBGL_color_buffer_float",n="EXT_color_buffer_half_float";if(this.parallelCompilationExtension=this.gl.getExtension("KHR_parallel_shader_compile"),F().getNumber("WEBGL_VERSION")===1){let s="OES_texture_float",a="OES_texture_half_float";if(this.textureFloatExtension=_l(this.gl,s),Ye(this.gl,a))this.textureHalfFloatExtension=_l(this.gl,a);else if(F().get("WEBGL_FORCE_F16_TEXTURES"))throw new Error("GL context does not support half float textures, yet the environment flag WEBGL_FORCE_F16_TEXTURES is set to true.");if(this.colorBufferFloatExtension=this.gl.getExtension(o),Ye(this.gl,n))this.colorBufferHalfFloatExtension=_l(this.gl,n);else if(F().get("WEBGL_FORCE_F16_TEXTURES"))throw new Error("GL context does not support color renderable half floats, yet the environment flag WEBGL_FORCE_F16_TEXTURES is set to true.")}else if(o="EXT_color_buffer_float",Ye(this.gl,o))this.colorBufferFloatExtension=this.gl.getExtension(o);else if(Ye(this.gl,n))this.colorBufferHalfFloatExtension=this.gl.getExtension(n);else throw new Error("GL context does not support color renderable floats");this.vertexBuffer=pT(this.gl),this.indexBuffer=uT(this.gl),this.framebuffer=GC(this.gl),this.textureConfig=Dl(this.gl,this.textureHalfFloatExtension)}get debug(){return F().getBool("DEBUG")}dispose(){if(this.disposed)return;this.program!=null&&console.warn("Disposing a GPGPUContext that still has a bound WebGLProgram. This is probably a resource leak, delete the program with GPGPUContext.deleteProgram before disposing."),this.outputTexture!=null&&console.warn("Disposing a GPGPUContext that still has a bound output matrix texture.  This is probably a resource leak, delete the output matrix texture with GPGPUContext.deleteMatrixTexture before disposing.");let t=this.gl;st(t,()=>t.finish()),st(t,()=>t.bindFramebuffer(t.FRAMEBUFFER,null)),st(t,()=>t.deleteFramebuffer(this.framebuffer)),st(t,()=>t.bindBuffer(t.ARRAY_BUFFER,null)),st(t,()=>t.bindBuffer(t.ELEMENT_ARRAY_BUFFER,null)),st(t,()=>t.deleteBuffer(this.indexBuffer)),this.disposed=!0}createFloat32MatrixTexture(t,e){return this.throwIfDisposed(),mT(this.gl,t,e,this.textureConfig)}createFloat16MatrixTexture(t,e){return this.throwIfDisposed(),fT(this.gl,t,e,this.textureConfig)}createUnsignedBytesMatrixTexture(t,e){return this.throwIfDisposed(),dT(this.gl,t,e,this.textureConfig)}uploadPixelDataToTexture(t,e){this.throwIfDisposed(),bT(this.gl,t,e)}uploadDenseMatrixToTexture(t,e,o,n){this.throwIfDisposed(),yT(this.gl,t,e,o,n,this.textureConfig)}createFloat16PackedMatrixTexture(t,e){return this.throwIfDisposed(),gT(this.gl,t,e,this.textureConfig)}createPackedMatrixTexture(t,e){return this.throwIfDisposed(),hT(this.gl,t,e,this.textureConfig)}deleteMatrixTexture(t){this.throwIfDisposed(),this.outputTexture===t&&(zg(this.gl,this.framebuffer),this.outputTexture=null),st(this.gl,()=>this.gl.deleteTexture(t))}downloadByteEncodedFloatMatrixFromOutputTexture(t,e,o){return this.downloadMatrixDriver(t,()=>ST(this.gl,e,o,this.textureConfig))}downloadPackedMatrixFromBuffer(t,e,o,n,s,a){return wT(this.gl,t,e,o,n,s,a,this.textureConfig)}downloadFloat32MatrixFromBuffer(t,e){return TT(this.gl,t,e)}createBufferFromTexture(t,e,o){this.bindTextureToFrameBuffer(t);let n=CT(this.gl,e,o,this.textureConfig);return this.unbindTextureToFrameBuffer(),n}createAndWaitForFence(){let t=this.createFence(this.gl);return this.pollFence(t)}createFence(t){let e,o;if(F().getBool("WEBGL_FENCE_API_ENABLED")){let n=t,s=n.fenceSync(n.SYNC_GPU_COMMANDS_COMPLETE,0);t.flush(),o=()=>{let a=n.clientWaitSync(s,0,0);return a===n.ALREADY_SIGNALED||a===n.CONDITION_SATISFIED},e=s}else F().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION")>0?(e=this.beginQuery(),this.endQuery(),o=()=>this.isQueryAvailable(e,F().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION"))):o=()=>!0;return{query:e,isFencePassed:o}}downloadMatrixFromPackedTexture(t,e,o){return this.downloadMatrixDriver(t,()=>NT(this.gl,e,o))}createProgram(t){this.throwIfDisposed();let e=this.gl;this.vertexShader==null&&(this.vertexShader=lT(e));let o=LC(e);return st(e,()=>e.attachShader(o,this.vertexShader)),st(e,()=>e.attachShader(o,t)),MC(e,o),this.debug&&tu(e,o),this.vertexAttrsAreBound||(this.setProgram(o),this.vertexAttrsAreBound=xT(e,this.program,this.vertexBuffer)),o}deleteProgram(t){this.throwIfDisposed(),t===this.program&&(this.program=null),t!=null&&st(this.gl,()=>this.gl.deleteProgram(t))}setProgram(t){this.throwIfDisposed(),this.program=t,this.program!=null&&this.debug&&tu(this.gl,this.program),st(this.gl,()=>this.gl.useProgram(t))}getUniformLocation(t,e,o=!0){return this.throwIfDisposed(),o?UC(this.gl,t,e):HC(this.gl,t,e)}getAttributeLocation(t,e){return this.throwIfDisposed(),st(this.gl,()=>this.gl.getAttribLocation(t,e))}getUniformLocationNoThrow(t,e){return this.throwIfDisposed(),this.gl.getUniformLocation(t,e)}setInputMatrixTexture(t,e,o){this.throwIfDisposed(),this.throwIfNoProgram(),KC(this.gl,t,e,o)}setOutputMatrixTexture(t,e,o){this.setOutputMatrixTextureDriver(t,o,e)}setOutputPackedMatrixTexture(t,e,o){this.throwIfDisposed();let[n,s]=Xr(e,o);this.setOutputMatrixTextureDriver(t,n,s)}setOutputMatrixWriteRegion(t,e,o,n){this.setOutputMatrixWriteRegionDriver(o,t,n,e)}setOutputPackedMatrixWriteRegion(t,e,o,n){throw new Error("setOutputPackedMatrixWriteRegion not implemented.")}debugValidate(){this.program!=null&&tu(this.gl,this.program),Ol(this.gl)}executeProgram(){this.throwIfDisposed(),this.throwIfNoProgram();let t=this.gl;this.debug&&this.debugValidate(),st(t,()=>t.drawElements(t.TRIANGLES,6,t.UNSIGNED_SHORT,0))}blockUntilAllProgramsCompleted(){this.throwIfDisposed(),st(this.gl,()=>this.gl.finish())}getQueryTimerExtension(){return this.disjointQueryTimerExtension==null&&(this.disjointQueryTimerExtension=_l(this.gl,F().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION")===2?"EXT_disjoint_timer_query_webgl2":"EXT_disjoint_timer_query")),this.disjointQueryTimerExtension}getQueryTimerExtensionWebGL2(){return this.getQueryTimerExtension()}getQueryTimerExtensionWebGL1(){return this.getQueryTimerExtension()}beginQuery(){if(F().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION")===2){let o=this.gl,n=this.getQueryTimerExtensionWebGL2(),s=o.createQuery();return o.beginQuery(n.TIME_ELAPSED_EXT,s),s}let t=this.getQueryTimerExtensionWebGL1(),e=t.createQueryEXT();return t.beginQueryEXT(t.TIME_ELAPSED_EXT,e),e}endQuery(){if(F().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION")===2){let e=this.gl,o=this.getQueryTimerExtensionWebGL2();e.endQuery(o.TIME_ELAPSED_EXT);return}let t=this.getQueryTimerExtensionWebGL1();t.endQueryEXT(t.TIME_ELAPSED_EXT)}async waitForQueryAndGetTime(t){return await y.repeatedTry(()=>this.disposed||this.isQueryAvailable(t,F().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION"))),this.getQueryTime(t,F().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION"))}getQueryTime(t,e){if(e===0)return null;if(e===2){let o=this.gl;return o.getQueryParameter(t,o.QUERY_RESULT)/1e6}else{let o=this.getQueryTimerExtensionWebGL1();return o.getQueryObjectEXT(t,o.QUERY_RESULT_EXT)/1e6}}isQueryAvailable(t,e){if(e===0)return!0;if(e===2){let o=this.gl,n=this.getQueryTimerExtensionWebGL2(),s=o.getQueryParameter(t,o.QUERY_RESULT_AVAILABLE);return this.disjoint==null&&(this.disjoint=this.gl.getParameter(n.GPU_DISJOINT_EXT)),s&&!this.disjoint}else{let o=this.getQueryTimerExtensionWebGL1(),n=o.getQueryObjectEXT(t,o.QUERY_RESULT_AVAILABLE_EXT);return this.disjoint==null&&(this.disjoint=this.gl.getParameter(o.GPU_DISJOINT_EXT)),n&&!this.disjoint}}pollFence(t){return new Promise(e=>{this.addItemToPoll(()=>t.isFencePassed(),()=>e())})}pollItems(){let t=JP(this.itemsToPoll.map(e=>e.isDoneFn));for(let e=0;e<=t;++e){let{resolveFn:o}=this.itemsToPoll[e];o()}this.itemsToPoll=this.itemsToPoll.slice(t+1)}addItemToPoll(t,e){if(this.itemsToPoll.push({isDoneFn:t,resolveFn:e}),this.itemsToPoll.length>1)return;let o;"setTimeoutCustom"in F().platform&&(o=F().platform.setTimeoutCustom.bind(F().platform)),y.repeatedTry(()=>(this.pollItems(),this.itemsToPoll.length===0),()=>0,null,o)}bindTextureToFrameBuffer(t){this.throwIfDisposed(),eu(this.gl,t,this.framebuffer),this.debug&&Ol(this.gl)}unbindTextureToFrameBuffer(){this.outputTexture!=null?(eu(this.gl,this.outputTexture,this.framebuffer),this.debug&&Ol(this.gl)):zg(this.gl,this.framebuffer)}downloadMatrixDriver(t,e){this.bindTextureToFrameBuffer(t);let o=e();return this.unbindTextureToFrameBuffer(),o}setOutputMatrixTextureDriver(t,e,o){this.throwIfDisposed();let n=this.gl;eu(n,t,this.framebuffer),this.debug&&Ol(n),this.outputTexture=t,st(n,()=>n.viewport(0,0,e,o)),st(n,()=>n.scissor(0,0,e,o))}setOutputMatrixWriteRegionDriver(t,e,o,n){this.throwIfDisposed(),st(this.gl,()=>this.gl.scissor(t,e,o,n))}throwIfDisposed(){if(this.disposed)throw new Error("Attempted to use disposed GPGPUContext.")}throwIfNoProgram(){if(this.program==null)throw new Error("No GPU program is currently set.")}};function JP(r){let t=0;for(;t<r.length&&r[t]();++t);return t-1}var Sx={};It(Sx,{addImpl:()=>Zg,bincountImpl:()=>lc,bincountReduceImpl:()=>mu,castImpl:()=>Yg,ceilImpl:()=>Qg,concatImpl:()=>fu,equalImpl:()=>Jg,expImpl:()=>ex,expm1Impl:()=>ox,floorImpl:()=>nx,gatherNdImpl:()=>du,gatherV2Impl:()=>hu,greaterEqualImpl:()=>ax,greaterImpl:()=>sx,lessEqualImpl:()=>cx,lessImpl:()=>ix,linSpaceImpl:()=>gu,logImpl:()=>lx,maxImpl:()=>xu,maximumImpl:()=>px,minimumImpl:()=>ux,multiplyImpl:()=>Ll,negImpl:()=>mx,notEqualImpl:()=>fx,prodImpl:()=>dx,raggedGatherImpl:()=>yu,raggedTensorToTensorImpl:()=>bu,rangeImpl:()=>Cu,rsqrtImpl:()=>gx,scatterImpl:()=>To,sigmoidImpl:()=>QT,simpleAbsImpl:()=>jg,sliceImpl:()=>yx,sparseFillEmptyRowsImpl:()=>Tu,sparseReshapeImpl:()=>Su,sparseSegmentReductionImpl:()=>uc,sqrtImpl:()=>eS,squaredDifferenceImpl:()=>bx,stridedSliceImpl:()=>wu,stringNGramsImpl:()=>Nu,stringSplitImpl:()=>Iu,stringToHashBucketFastImpl:()=>vu,subImpl:()=>Tx,tileImpl:()=>ku,topKImpl:()=>Eu,transposeImpl:()=>pc,uniqueImpl:()=>$u});function W(r,t){Array.isArray(r)||(r=[r]),r.forEach(e=>{e!=null&&y.assert(e.dtype!=="complex64",()=>`${t} does not support complex64 tensors in the CPU backend.`)})}function jg(r){let t=new Float32Array(r.length);for(let e=0;e<r.length;++e)t[e]=Math.abs(r[e]);return t}var tL=r=>{let{x:t}=r.inputs,e=r.backend;W(t,"abs");let o=new Float32Array(y.sizeFromShape(t.shape)),n=e.data.get(t.dataId).values;return o=jg(n),e.makeOutput(o,t.shape,t.dtype)},IT={kernelName:as,backendName:"cpu",kernelFunc:tL};function yt(r){return(t,e,o,n,s)=>{let a=I.assertAndGetBroadcastShape(t,e),i=a.length,c=y.computeStrides(a),l=y.sizeFromShape(a),p=y.getTypedArrayFromDType(s,l),u=t.length,m=e.length,f=y.computeStrides(t),d=y.computeStrides(e),g=I.getBroadcastDims(t,a),h=I.getBroadcastDims(e,a);if(g.length+h.length===0)for(let x=0;x<p.length;++x)p[x]=r(o[x%o.length],n[x%n.length]);else for(let x=0;x<p.length;++x){let b=y.indexToLoc(x,i,c),S=b.slice(-u);g.forEach(R=>S[R]=0);let w=y.locToIndex(S,u,f),k=b.slice(-m);h.forEach(R=>k[R]=0);let $=y.locToIndex(k,m,d);p[x]=r(o[w],n[$])}return[p,a]}}function se(r){let{inputs:t,backend:e}=r,{real:o,imag:n}=t,s=e.data.get(o.dataId).values,a=e.data.get(n.dataId).values,i=e.makeTensorInfo(o.shape,"complex64"),c=e.data.get(i.dataId);return c.complexTensorInfos={real:e.makeTensorInfo(o.shape,"float32",s),imag:e.makeTensorInfo(n.shape,"float32",a)},i}var vT={kernelName:ys,backendName:"cpu",kernelFunc:se};function ic(r,t,e="float32"){if(e==="complex64"){let n=ic(r,t,"float32"),s=ic(r,t,"float32");return se({inputs:{real:n,imag:s},backend:r})}let o=y.makeZerosTypedArray(y.sizeFromShape(t),e);return r.makeTensorInfo(t,e,o)}function ye(r){let{inputs:t,backend:e}=r,{x:o}=t;return e.incRef(o.dataId),{dataId:o.dataId,shape:o.shape,dtype:o.dtype}}var kT={kernelName:no,backendName:"cpu",kernelFunc:ye};function ar(r){let{inputs:t,backend:e}=r,{input:o}=t,n=e.data.get(o.dataId).complexTensorInfos.real,s=e.data.get(n.dataId).values;return e.makeTensorInfo(n.shape,n.dtype,s)}var ET={kernelName:ga,backendName:"cpu",kernelFunc:ar};function Yg(r,t,e,o){if(o==="int32"){let n=Int32Array.from(r);return[t,"int32",n]}if(o==="bool"){let n=y.toTypedArray([0],e),[s,a]=yt((i,c)=>i!==c?1:0)(t,[],r,n,"bool");return[a,"bool",s]}throw new Error(`Error in Cast: failed to cast ${e} to ${o}`)}function ir(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{dtype:s}=o;if(s==="complex64"){if(n.dtype==="complex64")return ye({inputs:{x:n},backend:e});let p=ic(e,n.shape,n.dtype),u=ir({inputs:{x:n},backend:e,attrs:{dtype:"float32"}}),m=se({inputs:{real:u,imag:p},backend:e});return e.disposeIntermediateTensorInfo(p),e.disposeIntermediateTensorInfo(u),m}if(n.dtype==="complex64"){let p=ar({inputs:{input:n},backend:e}),u=ir({inputs:{x:p},backend:e,attrs:{dtype:s}});return e.disposeIntermediateTensorInfo(p),u}if(!y.hasEncodingLoss(n.dtype,s)){let p=ye({inputs:{x:n},backend:e});return{dataId:p.dataId,shape:p.shape,dtype:s}}let a=e.data.get(n.dataId).values,[i,c,l]=Yg(a,n.shape,n.dtype,s);return e.makeTensorInfo(i,c,l)}var $T={kernelName:oo,backendName:"cpu",kernelFunc:ir};function vt(r,t,e,o){return e==null?({inputs:n,backend:s})=>{let{a,b:i}=n,c=s;W([a,i],r);let l=c.data.get(a.dataId).values,p=c.data.get(i.dataId).values,u=a.dtype==="string"?I.fromUint8ToStringArray(l):l,m=a.dtype==="string"?I.fromUint8ToStringArray(p):p,f=o||a.dtype,[d,g]=t(a.shape,i.shape,u,m,f);return c.makeTensorInfo(g,f,d)}:({inputs:n,backend:s})=>{let{a,b:i}=n,c=s;if(a.dtype==="complex64"||i.dtype==="complex64"){let l=ir({inputs:{x:a},backend:c,attrs:{dtype:"complex64"}}),p=c.data.get(l.dataId),u=p.complexTensorInfos.real,m=p.complexTensorInfos.imag,f=c.data.get(u.dataId).values,d=c.data.get(m.dataId).values,g=ir({inputs:{x:i},backend:c,attrs:{dtype:"complex64"}}),h=c.data.get(g.dataId),x=h.complexTensorInfos.real,b=h.complexTensorInfos.imag,S=c.data.get(x.dataId).values,w=c.data.get(b.dataId).values,[k,$,R]=e(a.shape,i.shape,f,d,S,w),A=c.makeTensorInfo(R,"float32",k),D=c.makeTensorInfo(R,"float32",$),_=se({inputs:{real:A,imag:D},backend:c});return c.disposeIntermediateTensorInfo(l),c.disposeIntermediateTensorInfo(g),c.disposeIntermediateTensorInfo(A),c.disposeIntermediateTensorInfo(D),_}else{let l=c.data.get(a.dataId).values,p=c.data.get(i.dataId).values,u=o||a.dtype,[m,f]=t(a.shape,i.shape,l,p,u);return c.makeTensorInfo(f,u,m)}}}function cc(r){return(t,e,o,n,s,a)=>{let i=I.assertAndGetBroadcastShape(t,e),c=y.sizeFromShape(i),l=i.length,p=y.computeStrides(i),u=y.getTypedArrayFromDType("float32",c),m=y.getTypedArrayFromDType("float32",c),f=I.getBroadcastDims(t,i),d=I.getBroadcastDims(e,i),g=I.mergeRealAndImagArrays(o,n),h=I.mergeRealAndImagArrays(s,a),x=t.length,b=y.computeStrides(t),S=e.length,w=y.computeStrides(e);if(f.length+d.length===0)for(let k=0;k<u.length;k++){let $=k%g.length,R=k%h.length,A=r(g[$*2],g[$*2+1],h[R*2],h[R*2+1]);u[k]=A.real,m[k]=A.imag}else for(let k=0;k<u.length;k++){let $=y.indexToLoc(k,l,p),R=$.slice(-x);f.forEach(L=>R[L]=0);let A=y.locToIndex(R,x,b),D=$.slice(-S);d.forEach(L=>D[L]=0);let _=y.locToIndex(D,S,w),O=r(g[A*2],g[A*2+1],h[_*2],h[_*2+1]);u[k]=O.real,m[k]=O.imag}return[u,m,i]}}var Zg=yt((r,t)=>r+t),eL=cc((r,t,e,o)=>({real:r+e,imag:t+o})),Yr=vt(_r,Zg,eL),RT={kernelName:_r,backendName:"cpu",kernelFunc:Yr};function lc(r,t,e,o,n){let s=y.sizeFromShape(o),a=y.makeZerosTypedArray(n,e);for(let i=0;i<r.length;i++){let c=r[i];if(c<0)throw new Error("Input x must be non-negative!");c>=n||(s>0?a[c]+=t[i]:a[c]+=1)}return a}function mu(r,t,e,o=!1){let n=r.shape[0],s=r.shape[1],a=et([n,e],t.dtype);for(let i=0;i<n;i++)for(let c=0;c<s;c++){let l=r.get(i,c);if(l<0)throw new Error("Input x must be non-negative!");l>=e||(o?a.set(1,i,l):t.size>0?a.set(a.get(i,l)+t.get(i,c),i,l):a.set(a.get(i,l)+1,i,l))}return a}function Re(r){return(t,e,o)=>{let n=y.getTypedArrayFromDType(e,t.length);for(let s=0;s<t.length;++s)n[s]=r(t[s],o);return n}}function lt(r,t,e){return({inputs:o,attrs:n,backend:s})=>{let{x:a}=o;if(W(a,r),a.dtype==="string"||e==="string")throw new Error("unaryKernelFunc does not support string input/output");let i=s,c=i.data.get(a.dataId).values,l=y.sizeFromShape(a.shape),p=e||a.dtype,u=y.getArrayFromDType(p,l);for(let m=0;m<l;++m)u[m]=t(c[m],n);return i.makeTensorInfo(a.shape,p,u)}}function cr(r,t,e){return({inputs:o,attrs:n,backend:s})=>{let{x:a}=o;if(W(a,r),a.dtype==="string"||e==="string")throw new Error("unaryKernelFunc does not support string input/output");let i=s,c=i.data.get(a.dataId).values,l=e||a.dtype,p=t(c,l,n);return i.makeTensorInfo(a.shape,l,p)}}var Qg=Re(r=>Math.ceil(r)),rL=cr(Bo,Qg),AT={kernelName:Bo,backendName:"cpu",kernelFunc:rL};function fu(r,t,e,o){let n=y.getArrayFromDType(e,y.sizeFromShape(t));if(o&&e!=="string"){let s=0;r.forEach(a=>{let i=y.sizeFromShape(a.shape);n.set(a.vals,s),s+=i})}else{let s=0;r.forEach(a=>{let i=e==="string"?I.fromUint8ToStringArray(a.vals):a.vals,c=0;for(let l=0;l<a.shape[0];++l){let p=l*t[1]+s;for(let u=0;u<a.shape[1];++u)n[p+u]=i[c++]}s+=a.shape[1]})}return n}var Jg=yt((r,t)=>r===t?1:0),tx=vt(Ko,Jg,null,"bool"),FT={kernelName:Ko,backendName:"cpu",kernelFunc:tx};var ex=Re(r=>Math.exp(r)),rx=cr(qo,ex,"float32"),DT={kernelName:qo,backendName:"cpu",kernelFunc:rx};var ox=Re(r=>Math.expm1(r)),oL=cr(Xo,ox),_T={kernelName:Xo,backendName:"cpu",kernelFunc:oL};var nx=Re(r=>Math.floor(r)),nL=cr(jo,nx),OT={kernelName:jo,backendName:"cpu",kernelFunc:nL};function du(r,t,e,o,n,s,a,i,c){let l=et([o,s],e);for(let p=0;p<o;p++){let u=[],m=0;for(let f=0;f<n;f++){let d=r[p*n+f];m+=d*a[f],u.push(d)}if(m<0||m>=c/s)throw new Error(`Invalid indices: ${u} does not index into ${i}`);for(let f=0;f<s;f++)l.values[p*s+f]=t.get(...t.indexToLoc(m*s+f))}return l}function hu(r,t,e){let o=et(e,r.dtype);for(let n=0;n<o.size;++n){let a=o.indexToLoc(n).slice(),i=a[0],c=a[2],l=t.locToIndex([i,c]);a[2]=t.values[l];let p=r.locToIndex(a);0<=p&&p<r.values.length&&(o.values[n]=r.values[p])}return o}var sx=yt((r,t)=>r>t?1:0),sL=vt(Zo,sx,null,"bool"),PT={kernelName:Zo,backendName:"cpu",kernelFunc:sL};var ax=yt((r,t)=>r>=t?1:0),aL=vt(Qo,ax,null,"bool"),LT={kernelName:Qo,backendName:"cpu",kernelFunc:aL};var ix=yt((r,t)=>r<t?1:0),iL=vt(rn,ix,null,"bool"),MT={kernelName:rn,backendName:"cpu",kernelFunc:iL};var cx=yt((r,t)=>r<=t?1:0),cL=vt(on,cx,null,"bool"),BT={kernelName:on,backendName:"cpu",kernelFunc:cL};function gu(r,t,e){let o=(t-r)/(e-1),n=y.makeZerosTypedArray(e,"float32");n[0]=r;for(let s=1;s<n.length;s++)n[s]=n[s-1]+o;return n}var lx=Re(r=>Math.log(r)),lL=cr(nn,lx),VT={kernelName:nn,backendName:"cpu",kernelFunc:lL};function xu(r,t,e,o){let n=y.getTypedArrayFromDType(o,y.sizeFromShape(e));for(let s=0;s<n.length;++s){let a=s*t,i=r[a];for(let c=0;c<t;++c){let l=r[a+c];(Number.isNaN(l)||l>i)&&(i=l)}n[s]=i}return n}var px=yt((r,t)=>Math.max(r,t)),pL=vt(pn,px),zT={kernelName:pn,backendName:"cpu",kernelFunc:pL};var ux=yt((r,t)=>Math.min(r,t)),uL=vt(un,ux),WT={kernelName:un,backendName:"cpu",kernelFunc:uL};var Ll=yt((r,t)=>r*t),mL=cc((r,t,e,o)=>({real:r*e-t*o,imag:r*o+t*e})),yi=vt(fn,Ll,mL),GT={kernelName:fn,backendName:"cpu",kernelFunc:yi};function mx(r,t,e){let o=y.createScalarValue(-1,e);return Ll([],t,o,r,e)}function fL(r){let{inputs:t,backend:e}=r,{x:o}=t;W(o,"neg");let n=e.data.get(o.dataId).values,[s,a]=mx(n,o.shape,o.dtype);return e.makeTensorInfo(a,o.dtype,s)}var UT={kernelName:oa,backendName:"cpu",kernelFunc:fL};var fx=yt((r,t)=>r!==t?1:0),dL=vt(dn,fx,null,"bool"),HT={kernelName:dn,backendName:"cpu",kernelFunc:dL};function pc(r,t,e,o,n){let s=t.length,a=y.sizeFromShape(t),i=y.computeStrides(t),c=y.computeStrides(n),l=y.getTypedArrayFromDType(e,y.sizeFromShape(n));for(let p=0;p<a;++p){let u=y.indexToLoc(p,s,i),m=new Array(u.length);for(let d=0;d<m.length;d++)m[d]=u[o[d]];let f=y.locToIndex(m,s,c);l[f]=r[p]}return l}function Wt(r){let{inputs:t,attrs:e,backend:o}=r,{x:n}=t,{perm:s}=e;W(n,"transpose");let a=n.shape.length,i=new Array(a);for(let u=0;u<i.length;u++)i[u]=n.shape[s[u]];let c=o.data.get(n.dataId).values,l=pc(c,n.shape,n.dtype,s,i);return{dataId:o.write(l,i,n.dtype),shape:i,dtype:n.dtype}}var KT={kernelName:ao,backendName:"cpu",kernelFunc:Wt};function dx(r,t,e,o){let[n,s]=I.computeOutAndReduceShapes(r,o),a=Yt(t,"int32"),i=y.makeZerosTypedArray(y.sizeFromShape(n),a),c=y.sizeFromShape(s);for(let l=0;l<i.length;++l){let p=l*c,u=1;for(let m=0;m<c;++m)u*=e[p+m];i[l]=u}return{outVals:i,outShape:n,outDtype:a}}function hL(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,keepDims:a}=o;W(n,"prod");let i=n.shape.length,c=y.parseAxisParam(s,n.shape),l=I.getAxesPermutation(c,i),p=c,u=n,m=[];l!=null&&(u=Wt({inputs:{x:n},backend:e,attrs:{perm:l}}),m.push(u),p=I.getInnerMostAxes(p.length,i));let f=e.data.get(u.dataId).values,{outVals:d,outShape:g,outDtype:h}=dx(u.shape,u.dtype,f,p),x=g;return a&&(x=I.expandShapeToKeepDim(g,c)),m.forEach(b=>e.disposeIntermediateTensorInfo(b)),e.makeTensorInfo(x,h,d)}var qT={kernelName:ma,backendName:"cpu",kernelFunc:hL};function gL(r,t,e){r.forEach((o,n)=>{if(o<0||o>=e){let s=y.indexToLoc(n,t.length,y.computeStrides(t)).join(",");throw new Error(`indices[${s}] = ${o} is not in [0, ${e})`)}})}function xL(r,t){for(let e=0;e<r.length;++e){let o=r[e],n=e===r.length-1?t:r[e+1].length;if(o.length===0)throw new Error("Ragged splits may not be empty");if(o[0]<0)throw new Error("Ragged splits must be non-negative");if(o[o.length-1]>n)throw new Error("Ragged splits must not point past values");for(let s=1;s<o.length;++s)if(o[s-1]>o[s])throw new Error("Ragged splits must be sorted in ascending order")}}function yL(r,t,e,o){let n=[],s=0,a=t.length-1+e.length,i=new Array(a).fill(null).map(()=>[0]);xL(e,o);let c=1;for(let l=0;l<t.length-1;++l){c*=t[l];let p=t[l+1];for(let u=1;u<c+1;++u)i[l].push(u*p)}for(let l=0;l<r.length;++l){let p=r[l],u=r[l]+1;for(let m=0;m<e.length;++m){let f=e[m],d=m+t.length-1;if(d>=0){let g=i[d],h=g[g.length-1]-f[p];for(let x=p;x<u;++x)i[d].push(f[x+1]+h)}p=f[p],u=f[u]}u!==p&&(n.push([p,u]),s+=u-p)}return{outSplits:i,valueSlices:n,numValues:s}}function bL(r){let t=[];for(let e=0;e<r.length;++e){let o=r[e].length,n=y.getArrayFromDType("int32",o);t.push(n),r[e].forEach((s,a)=>n[a]=s)}return t}function XT(r,t){let e=r.slice(0,t);for(;e.length<t;)e.push(1);for(let o=t;o<r.length;o++)e[t-1]*=r[o];return e}function CL(r,t,e,o,n,s){let a=XT(t,2)[1],i=XT(s,2)[1],c=0;for(let l of e)for(let p=l[0];p<l[1];++p){for(let u=0;u<o;++u)n[c*i+u]=r[p*a+u];++c}}function TL(r,t,e,o,n){let s=t.slice();s[0]=n;let a=y.getArrayFromDType(e,y.sizeFromShape(s)),i=r.length,c=i===0?0:i/t[0];return CL(r,t,o,c,a,s),[a,s]}function yu(r,t,e,o,n,s,a,i){if(r.length===0)throw new Error("paramsNestedSplits must be non empty");if(t[0].length===0)throw new Error("Split tensors must not be scalars");let c=t[0][0]-1;if(gL(s,a,c),o.length===0)throw new Error("params.rank must be nonzero");let l=o[0],{outSplits:p,valueSlices:u,numValues:m}=yL(s,a,r,l),f=bL(p),d=TL(e,o,n,u,m);return[f,d[0],d[1]]}var lr=I.RowPartitionType,hx=class r{constructor(t,e,o,n,s,a,i,c,l,p){this.shape=t,this.shapeShape=e,this.values=o,this.valuesShape=n,this.valuesDType=s,this.defaultValue=a,this.defaultValueShape=i,this.rowPartitionValues=c,this.rowPartitionValuesShapes=l,this.rowPartitionTypes=I.getRowPartitionTypesHelper(p),this.raggedRank=I.getRaggedRank(this.rowPartitionTypes)}getRowPartitionTypeByDimension(t){return this.rowPartitionTypes[0]===lr.FIRST_DIM_SIZE?this.rowPartitionTypes[t+1]:this.rowPartitionTypes[t]}getRowPartitionTensor(t){return this.rowPartitionTypes[0]===lr.FIRST_DIM_SIZE?this.rowPartitionValues[t+1]:this.rowPartitionValues[t]}getMaxWidth(t){let e=this.getRowPartitionTensor(t-1);switch(this.getRowPartitionTypeByDimension(t-1)){case lr.VALUE_ROWIDS:return r.getMaxWidthValueRowID(e);case lr.ROW_SPLITS:return r.getMaxWidthRowSplit(e);default:throw new Error(`Cannot handle partition type ${lr[this.getRowPartitionTypeByDimension(t-1)]}`)}}static getMaxWidthRowSplit(t){let e=t.length;if(e===0||e===1)return 0;let o=0;for(let n=0;n<e-1;++n){let s=t[n+1]-t[n];s>o&&(o=s)}return o}static getMaxWidthValueRowID(t){let e=t.length;if(e===0)return 0;let o=0,n=t[0],s=0;for(let a=1;a<e;++a){let i=t[a];i!==n&&(n=i,s=Math.max(a-o,s),o=a)}return Math.max(e-o,s)}tensorShapeFromTensor(t,e,o=!0){if(e.length===0){if(t[0]===-1)return[];throw new Error("The only valid scalar shape tensor is the fully unknown shape specified as -1.")}return YT(t,o)}calculateOutputSize(t){let e=this.valuesShape,o=this.defaultValueShape;I.validateDefaultValueShape(o,e);let n=this.tensorShapeFromTensor(this.shape,this.shapeShape),a=I.combineRaggedTensorToTensorShapes(this.raggedRank,n,e);a[0]<0&&(a[0]=t);for(let i=1;i<=this.raggedRank;++i)a[i]<0&&(a[i]=this.getMaxWidth(i));return a}calculateFirstParentOutputIndex(t,e,o){let n=Math.min(t,o),s=[],a=0;for(let i=0;i<n;++i,a+=e)s.push(a);for(let i=n;i<t;++i)s.push(-1);return y.assert(s.length===t,()=>"Final length of result must be equal to firstDimension."),s}calculateOutputIndexRowSplit(t,e,o,n){let s=t.length,a=[];for(let i=0;i<s-1;++i){let c=t[i+1]-t[i],l=Math.min(n,c),p=e[i];p===-1&&(l=0);for(let u=0;u<l;++u)a.push(p),p+=o;for(let u=0;u<c-l;++u)a.push(-1)}if(s>0&&a.length!==t[s-1])throw new Error("Invalid row split size.");return a}calculateOutputIndexValueRowID(t,e,o,n){let s=t.length,a=[];if(s===0)return[];let i=0,c=t[0];if(c>=e.length)throw new Error(`Got currentValueRowId=${c}, which is not less than ${e.length}`);let l=e[c];a.push(l);for(let p=1;p<s;++p){let u=t[p];if(u===c)l>=0&&(++i,i<n?l+=o:l=-1);else{if(i=0,c=u,u>=e.length)throw new Error(`Got nextValueRowId=${u} which is not less than ${e.length}`);l=e[u]}a.push(l)}if(a.length!==t.length)throw new Error("Invalid row ids.");return a}calculateOutputIndex(t,e,o,n){let s=this.getRowPartitionTensor(t),a=this.getRowPartitionTypeByDimension(t);switch(a){case lr.VALUE_ROWIDS:return this.calculateOutputIndexValueRowID(s,e,o,n);case lr.ROW_SPLITS:if(s.length-1>e.length)throw new Error(`Row partition size is greater than output size: ${s.length-1} > ${e.length}`);return this.calculateOutputIndexRowSplit(s,e,o,n);default:throw new Error(`Unsupported partition type: ${lr[a]}`)}}getFirstDimensionSize(){let t=this.rowPartitionValues[0];if(this.rowPartitionTypes.length===0)throw new Error("No row_partition_types given.");let e=this.rowPartitionTypes[0];switch(e){case lr.FIRST_DIM_SIZE:return t[0];case lr.VALUE_ROWIDS:throw new Error("Cannot handle VALUE_ROWIDS in first dimension.");case lr.ROW_SPLITS:return this.rowPartitionValuesShapes[0][0]-1;default:throw new Error(`Cannot handle type ${lr[e]}`)}}compute(){if(this.rowPartitionValues[0].length<=0)throw new Error("Invalid first partition input. Tensor requires at least one element.");let e=this.getFirstDimensionSize(),o=this.calculateOutputSize(e),n=new Array(this.raggedRank+1);n[n.length-1]=1;for(let c=n.length-2;c>=0;--c)n[c]=n[c+1]*o[c+1];let s=YT(o,!1),a=y.getArrayFromDType(this.valuesDType,y.sizeFromShape(s));if(n[0]*o[0]>0){let c=this.calculateFirstParentOutputIndex(e,n[0],o[0]);for(let l=1;l<=this.raggedRank;++l)c=this.calculateOutputIndex(l-1,c,n[l],o[l]);this.setOutput(this.raggedRank,c,a,s)}return[s,a]}setOutput(t,e,o,n){if(o.length===0)return;let s=this.values,a=o,i=n.slice();i=i.slice(t+1);let c=y.sizeFromShape(i),l=e.length,p=this.defaultValue;if(p.length!==c&&p.length!==1){let d=this.defaultValueShape;ft(()=>{let g=P(p,d);p=mo(g,i).dataSync()})}let u=0,m=0,f=0;for(let d=0;d<=l;++d){let g=d<l?e[d]:-1;if(g===f){++f;continue}if(m<f){let h=s.subarray(u*c),x=a.subarray(m*c),b=(f-m)*c;jT(x,h,b)}if(d>=l){let h=o.length;g=Math.floor(h/c)}if(g>f)if(this.defaultValue.length===1)a.subarray(f*c,g*c).fill(this.defaultValue[0]),f=g;else for(;g>f;){let h=a.slice(f*c);jT(h,p,c),++f}g<0?(u=d+1,m=f):(u=d,m=f,f=m+1)}}};function jT(r,t,e){for(let o=0;o<e;o++)r[o]=t[o]}function YT(r,t){let e=[];for(let o of r){if(o<0){if(!t)throw new Error(`Dimension ${o} must be >= 0`);if(o<-1)throw new Error(`Dimension ${o} must be >= -1`);o=-1}e.push(o)}return e}function bu(r,t,e,o,n,s,a,i,c,l){return new hx(r,t,e,o,n,s,a,i,c,l).compute()}function Cu(r,t,e,o){let n=r===t,s=r<t&&e<0,a=t<r&&e>1;if(n||s||a)return y.makeZerosTypedArray(0,o);let i=Math.abs(Math.ceil((t-r)/e)),c=y.makeZerosTypedArray(i,o);t<r&&e===1&&(e=-1),c[0]=r;for(let l=1;l<c.length;l++)c[l]=c[l-1]+e;return c}var gx=Re(r=>1/Math.sqrt(r)),SL=cr(Cn,gx),ZT={kernelName:Cn,backendName:"cpu",kernelFunc:SL};function To(r,t,e,o,n,s,a,i,c,l){let p=[o/n,n],u=r.values,m=t.values;if(o===0)return et(e,t.dtype);let f=et(p,t.dtype);typeof c=="string"||typeof c=="number"?f.values.fill(c):typeof c=="boolean"&&f.values.fill(+c);for(let d=0;d<s;d++){let g=[],h=0;for(let x=0;x<a;x++){let b=u[d*a+x];g.push(b),h+=b*i[x]}if(h<0||h>=o/n)throw new Error(`Invalid indices: ${g} does not index into ${e}`);for(let x=0;x<n;x++)l?f.values[h*n+x]+=m[d*n+x]:f.values[h*n+x]=t.rank===0?m[0]:m[d*n+x]}return f}var QT=Re(r=>1/(1+Math.exp(-r))),xx=lt(In,r=>1/(1+Math.exp(-r))),JT={kernelName:In,backendName:"cpu",kernelFunc:xx};function yx(r,t,e,o,n){let s=ne.isSliceContinous(o,t,e),a=y.sizeFromShape(e),i=y.computeStrides(o);if(s){let u=ne.computeFlatOffset(t,i);return n==="string"?r.slice(u,u+a):r.subarray(u,u+a)}let c=n==="string"?I.fromUint8ToStringArray(r):r,l=et(o,n,c),p=et(e,n);for(let u=0;u<p.size;++u){let m=p.indexToLoc(u),f=m.map((d,g)=>d+t[g]);p.set(l.get(...f),...m)}return n==="string"?I.fromStringArrayToUint8(p.values):p.values}function pr(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{begin:s,size:a}=o;W(n,"slice");let[i,c]=ne.parseSliceParams(n,s,a);ne.assertParamsValid(n,i,c);let l=e.data.get(n.dataId).values,p=yx(l,i,c,n.shape,n.dtype);return e.makeTensorInfo(c,n.dtype,p)}var tS={kernelName:Na,backendName:"cpu",kernelFunc:pr};function Tu(r,t,e,o,n,s,a){let i=t[0],c=s[0],l=new Array(c),p=new Array(i),u=t[1];if(c===0){if(i!==0)throw new Error(I.getSparseFillEmptyRowsIndicesDenseShapeMismatch(i));let h=y.getArrayFromDType(e,0),x=y.getArrayFromDType(n,0);return[h,[0,u],x,l,p]}let m=!0,f=0,d=new Array(c).fill(0);for(let h=0;h<i;++h){let x=r[h*u];if(x<0)throw new Error(I.getSparseFillEmptyRowsNegativeIndexErrorMessage(h,x));if(x>=c)throw new Error(I.getSparseFillEmptyRowsOutOfRangeIndexErrorMessage(h,x,c));++d[x],m=m&&x>=f,f=x}let g=!0;for(let h=0;h<c;++h){let x=d[h]===0;l[h]=x,g=g&&!x,d[h]=Math.max(d[h],1),h>0&&(d[h]+=d[h-1])}if(g&&m){let h=r,x=o;for(let b=0;b<i;++b)p[b]=b;return[h,[i,u],x,l,p]}else{let h=d[c-1],x=y.getArrayFromDType(e,h*u),b=y.getArrayFromDType(n,h),S=new Array(c).fill(0);for(let w=0;w<i;++w){let k=r[w*u],$=S[k],R=(k===0?0:d[k-1])+$;S[k]++;for(let A=0;A<u;++A)x[R*u+A]=r[w*u+A];b[R]=o[w],p[w]=R}for(let w=0;w<c;++w)if(S[w]===0){let $=w===0?0:d[w-1];x[$*u+0]=w;for(let R=1;R<u;++R)x[$*u+R]=0;b[$]=a}return[x,[h,u],b,l,p]}}function Su(r,t,e,o,n){let s=y.sizeFromShape(o),a=t[0],i=n.length,c=[],l=1,p=-1;for(let h=0;h<i;++h){let x=n[h];if(x===-1){if(p!==-1)throw new Error(I.getSparseReshapeMultipleNegativeOneOutputDimErrorMessage(p,h));p=h,c.push(1)}else{if(x<0)throw new Error(I.getSparseReshapeNegativeOutputDimErrorMessage(h,x));l*=x,c.push(x)}}if(p!==-1){if(l<=0)throw new Error(I.getSparseReshapeEmptyTensorZeroOutputDimErrorMessage());let h=Math.trunc(s/l);if(l*h!==s)throw new Error(I.getSparseReshapeInputOutputMultipleErrorMessage(o,c));c[p]=h}if(y.sizeFromShape(c)!==s)throw new Error(I.getSparseReshapeInputOutputMismatchErrorMessage(o,c));let m=o.length,f=[];if(m>0){f[m-1]=1;for(let h=m-2;h>=0;--h)f[h]=f[h+1]*o[h+1]}let d=[];if(i>0){d[i-1]=1;for(let h=i-2;h>=0;--h)d[h]=d[h+1]*c[h+1]}let g=y.getArrayFromDType(e,a*i);for(let h=0;h<a;++h){let x=0;for(let b=0;b<m;++b)x+=r[h*m+b]*f[b];for(let b=0;b<i;++b)g[h*i+b]=Math.trunc(x/d[b]),x%=d[b]}return[g,[a,i],c]}function uc(r,t,e,o,n,s=!1,a=0){let i=o.length,c=[t[0],r.length/t[0]],l=c[1],u=i>0?n[i-1]+1:0;if(u<0)throw new Error(I.getSparseSegmentReductionNegativeSegmentIdsErrorMessage());let m=t.slice();m[0]=u;let f=m.reduce((S,w)=>S*w,1),d=y.getArrayFromDType(e,f);if(i===0)return u>0&&d.fill(a),[d,m];if(u<=0)throw new Error(I.getSparseSegmentReductionNegativeSegmentIdsErrorMessage());let g=0,h=1,x=0,b=n[g];for(;;){let S=0;if(h<i){if(S=n[h],b===S){++h;continue}if(b>=S)throw new Error(I.getSparseSegmentReductionNonIncreasingSegmentIdsErrorMessage())}if(b<0||b>=u)throw new Error(I.getSparseSegmentReductionSegmentIdOutOfRangeErrorMessage(b,u));b>x&&d.fill(a,x*l,b*l);for(let w=g;w<h;++w){let k=o[w];if(k<0||k>=c[0])throw new Error(I.getSparseSegmentReductionIndicesOutOfRangeErrorMessage(w,o[w],c[0]));for(let $=0;$<l;$++)d[b*l+$]+=r[k*l+$]}if(s)for(let w=0;w<l;w++)d[b*l+w]/=h-g;if(g=h,++h,x=b+1,b=S,h>i)break}return x<u&&d.fill(a,x*l,u*l),[d,m]}var eS=Re(r=>Math.sqrt(r)),wL=lt(kn,r=>Math.sqrt(r)),rS={kernelName:kn,backendName:"cpu",kernelFunc:wL};var bx=yt((r,t)=>{let e=r-t;return e*e}),NL=vt(En,bx),oS={kernelName:En,backendName:"cpu",kernelFunc:NL};function wu(r,t,e,o){let n=et(r,t.dtype);for(let s=0;s<n.size;s++){let a=n.indexToLoc(s),i=new Array(a.length);for(let c=0;c<i.length;c++)i[c]=a[c]*e[c]+o[c];n.set(t.get(...i),...a)}return n}var Cx=class{constructor(t,e,o,n,s,a){this.separator=y.encodeString(t),this.nGramWidths=e,this.leftPad=y.encodeString(o),this.rightPad=y.encodeString(n),this.padWidth=s,this.preserveShort=a}getPadWidth(t){return Math.min(this.padWidth<0?t-1:this.padWidth,t-1)}getNumNGrams(t,e){let o=this.getPadWidth(e);return Math.max(0,t+2*o-e+1)}createNGrams(t,e,o,n,s,a){for(let i=0;i<s;++i){let c=this.getPadWidth(a),l=Math.max(0,c-i),p=Math.max(0,c-(s-(i+1))),u=a-(l+p),m=e+(l>0?0:i-c),f=0;f+=l*this.leftPad.length;for(let b=0;b<u;++b)f+=t[m+b].length;f+=p*this.rightPad.length;let d=l+p+u-1;f+=d*this.separator.length,o[n+i]=new Uint8Array(f);let g=o[n+i],h=0,x=b=>b.forEach(S=>g[h++]=S);for(let b=0;b<l;++b)x(this.leftPad),x(this.separator);for(let b=0;b<u-1;++b)x(t[m+b]),x(this.separator);if(u>0){x(t[m+u-1]);for(let b=0;b<p;++b)x(this.separator),x(this.rightPad)}else{for(let b=0;b<p-1;++b)x(this.rightPad),x(this.separator);x(this.rightPad)}}}compute(t,e){let o=t.length,n=e.length;if(n>0){let c=e[0];if(c!==0)throw new Error(`First split value must be 0, got ${c}`);for(let l=1;l<n;++l){let p=e[l]>=c;if(p=p&&e[l]<=o,!p)throw new Error(`Invalid split value ${e[l]}, must be in [${c}, ${o}]`);c=e[l]}if(c!==o)throw new Error(`Last split value must be data size. Expected ${o}, got ${c}`)}let s=n-1,a=y.getArrayFromDType("int32",n);if(o===0||n===0){let c=new Array(o);for(let l=0;l<=s;++l)a[l]=0;return[c,a]}a[0]=0;for(let c=1;c<=s;++c){let l=e[c]-e[c-1],p=0;this.nGramWidths.forEach(u=>{p+=this.getNumNGrams(l,u)}),this.preserveShort&&l>0&&p===0&&(p=1),a[c]=a[c-1]+p}let i=new Array(a[s]);for(let c=0;c<s;++c){let l=e[c],p=a[c];if(this.nGramWidths.forEach(u=>{let m=e[c+1]-e[c],f=this.getNumNGrams(m,u);this.createNGrams(t,l,i,p,f,u),p+=f}),this.preserveShort&&p===a[c]){let u=e[c+1]-e[c];if(u===0)continue;let m=u+2*this.padWidth;this.createNGrams(t,l,i,p,1,m)}}return[i,a]}};function Nu(r,t,e,o,n,s,a,i){return new Cx(e,o,n,s,a,i).compute(r,t)}function IL(r,t,e,o){if(!r.length)return;if(t.length===0){for(let s=0;s<r.length;++s)o.push(r.subarray(s,s+1));return}if(t.length===1){let s=t[0],a=r.indexOf(s);for(;a!==-1;){let i=r.subarray(0,a);(!e||i.length!==0)&&o.push(i),r=r.subarray(a+1),a=r.indexOf(s)}(!e||r.length!==0)&&o.push(r);return}let n=0;for(let s=0;s<r.length+1;s++)if(s===r.length||t.indexOf(r[s])!==-1){let a=r.subarray(n,s);(!e||a.length!==0)&&o.push(a),n=s+1}}function Iu(r,t,e){let o=r.length,n=[],s=0,a=0,i=new Array(o);for(let m=0;m<o;++m){let f=n.length;IL(r[m],t,e,n);let d=n.length-f;i[m]=d,s+=d,a=Math.max(a,d)}let c=y.getArrayFromDType("int32",s*2),l=new Array(s),p=[o,a],u=0;for(let m=0;m<o;++m)for(let f=0;f<i[m];++f)c[u*2]=m,c[u*2+1]=f,l[u]=n[u],++u;return[c,l,p]}function vu(r,t){let e=y.getArrayFromDType("int32",r.length);for(let o=0;o<r.length;++o)e[o]=y.fingerPrint64(r[o]).modulo(t).getLowBitsUnsigned();return e}var Tx=yt((r,t)=>r-t),vL=cc((r,t,e,o)=>({real:r-e,imag:t-o})),Ml=vt($n,Tx,vL),nS={kernelName:$n,backendName:"cpu",kernelFunc:Ml};function ku(r,t){let e=new Array(r.rank);for(let n=0;n<e.length;n++)e[n]=r.shape[n]*t[n];let o=et(e,r.dtype);for(let n=0;n<o.values.length;++n){let s=o.indexToLoc(n),a=new Array(r.rank);for(let c=0;c<a.length;c++)a[c]=s[c]%r.shape[c];let i=r.locToIndex(a);o.values[n]=r.values[i]}return o}var Bl=(r,t)=>{let e=t.value-r.value;return e===0?r.index-t.index:e};function sS(r,t,e=0,o=r.length-1){for(;o>e;){if(o-e>600){let i=o-e+1,c=t-e+1,l=Math.log(i),p=.5*Math.exp(2*l/3),u=.5*Math.sqrt(l*p*(i-p)/i)*Math.sign(c-i/2),m=Math.max(e,Math.floor(t-c*p/i+u)),f=Math.min(o,Math.floor(t+(i-c)*p/i+u));sS(r,t,m,f)}let n=r[t],s=e,a=o;for(y.swap(r,e,t),Bl(r[o],n)>0&&y.swap(r,e,o);s<a;){for(y.swap(r,s,a),s++,a--;Bl(r[s],n)<0;)s=s+1;for(;Bl(r[a],n)>0;)a=a-1}Bl(r[e],n)===0?y.swap(r,e,a):(a=a+1,y.swap(r,a,o)),a<=t&&(e=a+1),t<=a&&(o=a-1)}}function Eu(r,t,e,o,n){let s=t[t.length-1],[a,i]=[r.length/s,s],c=y.getTypedArrayFromDType(e,a*o),l=y.getTypedArrayFromDType("int32",a*o);for(let u=0;u<a;u++){let m=u*i,f=r.subarray(m,m+i),d=new Array(f.length);f.forEach((b,S)=>d[S]={value:b,index:S}),o<d.length&&(sS(d,o),d=d.slice(0,o)),n&&d.sort(Bl);let g=u*o,h=c.subarray(g,g+o),x=l.subarray(g,g+o);for(let b=0;b<o;b++)h[b]=d[b].value,x[b]=d[b].index}let p=t.slice();return p[p.length-1]=o,[et(p,e,c),et(p,"int32",l)]}function $u(r,t,e,o){let n=y.parseAxisParam(t,e)[0],s=[1,e[0],1];for(let d=0;d<n;d++)s[0]*=e[d];s[1]=e[n];for(let d=n+1;d<e.length;d++)s[2]*=e[d];let a={},i=new Int32Array(e[n]),c=new $t(s,o,r),l=[],p=s[0]===1&&s[2]===1;for(let d=0;d<e[n];d++){let g;if(p)g=r[d].toString();else{let h=[];for(let x=0;x<s[0];x++)for(let b=0;b<s[2];b++)h.push(c.get(x,d,b));g=h.join(",")}if(a[g]!==void 0)i[d]=a[g];else{let h=Object.keys(a).length;a[g]=h,i[d]=h,l.push(d)}}let u=s.slice();u[1]=Object.keys(a).length;let m=new $t(u,o);l.forEach((d,g)=>{for(let h=0;h<s[0];h++)for(let x=0;x<s[2];x++)m.set(c.get(h,d,x),h,g,x)});let f=e.slice();return f[n]=u[1],{outputValues:m.values,outputShape:f,indices:i}}var{addImpl:aS,bincountImpl:Ru,bincountReduceImpl:iS,castImpl:cS,ceilImpl:lS,concatImpl:pS,equalImpl:uS,expImpl:mS,expm1Impl:fS,floorImpl:dS,gatherNdImpl:hS,gatherV2Impl:gS,greaterImpl:xS,greaterEqualImpl:yS,lessImpl:bS,lessEqualImpl:CS,linSpaceImpl:TS,logImpl:SS,maxImpl:wS,maximumImpl:NS,minimumImpl:IS,multiplyImpl:vS,negImpl:kS,notEqualImpl:ES,prodImpl:$S,raggedGatherImpl:RS,raggedTensorToTensorImpl:AS,rangeImpl:FS,rsqrtImpl:DS,scatterImpl:_S,sigmoidImpl:OS,simpleAbsImpl:Au,sliceImpl:PS,sparseFillEmptyRowsImpl:LS,sparseReshapeImpl:MS,sparseSegmentReductionImpl:Fu,sqrtImpl:BS,stridedSliceImpl:VS,stringNGramsImpl:zS,stringSplitImpl:WS,stringToHashBucketFastImpl:GS,subImpl:US,tileImpl:HS,topKImpl:KS,transposeImpl:bi,uniqueImpl:qS}=Sx;function wx(r,t){return["x","y","z","w","u","v"].slice(0,t).map(e=>`${r}.${e}`)}function Xt(r,t){return t===1?[r]:wx(r,t)}function XS(r,t){if(r===1)return"rc";let e="";for(let o=0;o<r;o++)e+=t[o],o<r-1&&(e+=",");return e}var Du=class{constructor(t){if(this.variableNames=["A"],this.packedInputs=!1,this.packedOutput=!0,this.outputShape=t,this.rank=t.length,this.enableShapeUniforms=Dt(this.outputShape.length),this.rank===0)this.userCode=`
        void main() {
          setOutput(vec4(getA(), 0., 0., 0.));
        }
      `;else{let e=Xt("rc",this.rank),o=dt(this.rank),n=this.getOutOfBoundsCondition(e),s=this.getSetup(e),a=this.getOutput(e);this.userCode=`
        void main() {
          ${o} rc = getOutputCoords();

          if(${n}) {
            setOutput(vec4(0));
          } else {
            ${s}

            setOutput(vec4(${a}));
          }
        }
      `}}getSourceCoordsArr(t){let e=[];for(let o=0;o<=1;o++)for(let n=0;n<=1;n++){let s=`${o===0?"r":"rp1"}, ${n===0?"c":"cp1"}`;for(let a=2;a<this.rank;a++)s=`${t[t.length-1-a]},`+s;e.push(s)}return e}getOutOfBoundsCondition(t){if(this.rank===1)return`rc > ${this.enableShapeUniforms?"outShape":this.outputShape[0]}`;let e="";for(let o=this.rank-2;o<this.rank;o++)e+=`${t[o]} >= ${this.enableShapeUniforms?`outShape[${o}]`:this.outputShape[o]}`,o<this.rank-1&&(e+="||");return e}getSetup(t){if(this.rank===1)return"";let e=t.slice(-2),o=this.enableShapeUniforms?`outShape[${this.rank} - 1]`:this.outputShape[this.rank-1],n=this.enableShapeUniforms?`outShape[${this.rank} - 2]`:this.outputShape[this.rank-2];return`
      int r = ${e[0]};
      int c = ${e[1]};
      int rp1 = r + 1;
      int cp1 = c + 1;

      bool cEdge = cp1 >= ${o};
      bool rEdge = rp1 >= ${n};
    `}getOutput(t){let e=this.getSourceCoordsArr(t);return this.rank===1?`getA(rc), (rc + 1 >= ${this.enableShapeUniforms?"outShape":this.outputShape[0]} ? 0. : getA(rc + 1)), 0, 0`:`getA(${e[0]}),
            cEdge ? 0. : getA(${e[1]}),
            rEdge ? 0. : getA(${e[2]}),
            rEdge || cEdge ? 0. : getA(${e[3]})`}};var mc=class{constructor(t,e){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.customUniforms=[{name:"inputShape",type:"ivec3"}],this.outputShape=t,this.enableShapeUniforms=Dt(this.outputShape.length);let o="";for(let n=0;n<4;n++){let s="thisRC = rc;";n%2===1&&(s+="thisRC.z += 1;"),n>1&&(s+="thisRC.y += 1;"),o+=`
        ${s}
        ${n>0?"if(thisRC.y < rows && thisRC.z < cols){":""}
          int flatIndex = getFlatIndex(thisRC);

          ivec3 inputRC = inputCoordsFromReshapedOutCoords(flatIndex);
          vec2 inputRCInnerDims = vec2(float(inputRC.y),float(inputRC.z));

          result[${n}] =
            getChannel(getA(inputRC.x, inputRC.y, inputRC.z), inputRCInnerDims);
        ${n>0?"}":""}
      `}this.userCode=`
      ${kL(e,this.enableShapeUniforms)}
      ${this.enableShapeUniforms?tc():Ji(t)}

      void main() {
        ivec3 rc = getOutputCoords();

        vec4 result = vec4(0.);

        ivec3 thisRC;
        int rows = ${this.enableShapeUniforms?"outShape[1]":t[1]};
        int cols = ${this.enableShapeUniforms?"outShape[2]":t[2]};

        ${o}

        setOutput(result);
      }
    `}};function kL(r,t){return`
    ivec3 inputCoordsFromReshapedOutCoords(int index) {
      ${t?tT(["r","c","d"],"inputShape"):kr(["r","c","d"],r)}
      return ivec3(r, c, d);
    }
  `}var _u=class{constructor(t){this.gpgpu=t,this.numUsedTextures=0,this.numFreeTextures=0,this._numBytesAllocated=0,this._numBytesFree=0,this.freeTextures={},this.logEnabled=!1,this.usedTextures={}}acquireTexture(t,e,o){let n=YS(e,o),s=ZS(t,n,o);s in this.freeTextures||(this.freeTextures[s]=[]),s in this.usedTextures||(this.usedTextures[s]=[]);let a=jS(t,n,this.gpgpu.gl,this.gpgpu.textureConfig,o);if(this.freeTextures[s].length>0){this.numFreeTextures--,this.numUsedTextures++,this._numBytesFree-=a,this.log();let c=this.freeTextures[s].shift();return this.usedTextures[s].push(c),c}let i;return n===me.PACKED_2X2_FLOAT32?i=this.gpgpu.createPackedMatrixTexture(t[0],t[1]):n===me.PACKED_2X2_FLOAT16?i=this.gpgpu.createFloat16PackedMatrixTexture(t[0],t[1]):n===me.UNPACKED_FLOAT32?i=this.gpgpu.createFloat32MatrixTexture(t[0],t[1]):n===me.UNPACKED_FLOAT16?i=this.gpgpu.createFloat16MatrixTexture(t[0],t[1]):n===me.PACKED_4X1_UNSIGNED_BYTE&&(i=this.gpgpu.createUnsignedBytesMatrixTexture(t[0],t[1])),this.usedTextures[s].push(i),this.numUsedTextures++,this._numBytesAllocated+=a,this.log(),i}releaseTexture(t,e,o,n){if(this.freeTextures==null)return;let s=YS(o,n),a=ZS(e,s,n);a in this.freeTextures||(this.freeTextures[a]=[]);let i=jS(e,s,this.gpgpu.gl,this.gpgpu.textureConfig,n),c=F().get("WEBGL_DELETE_TEXTURE_THRESHOLD");c!==-1&&this._numBytesAllocated>c?(this.gpgpu.deleteMatrixTexture(t.texture),this._numBytesAllocated-=i):(this.freeTextures[a].push(t),this.numFreeTextures++,this._numBytesFree+=i),this.numUsedTextures--;let l=this.usedTextures[a],p=l.indexOf(t);if(p<0)throw new Error("Cannot release a texture that was never provided by this texture manager");l.splice(p,1),this.log()}log(){if(!this.logEnabled)return;let t=this.numFreeTextures+this.numUsedTextures;console.log("Free/Used",`${this.numFreeTextures} / ${this.numUsedTextures}`,`(${t})`);let e=this._numBytesFree/this._numBytesAllocated;console.log(`Bytes allocated: ${this._numBytesAllocated}`),console.log(`Bytes unused: ${this._numBytesFree} (${Math.round(100*e)}%)`)}get numBytesAllocated(){return this._numBytesAllocated}get numBytesFree(){return this._numBytesFree}getNumUsedTextures(){return this.numUsedTextures}getNumFreeTextures(){return this.numFreeTextures}dispose(){if(this.freeTextures!=null){for(let t in this.freeTextures)this.freeTextures[t].forEach(e=>{this.gpgpu.deleteMatrixTexture(e.texture)});for(let t in this.usedTextures)this.usedTextures[t].forEach(e=>{this.gpgpu.deleteMatrixTexture(e.texture)});this.freeTextures=null,this.usedTextures=null,this.numUsedTextures=0,this.numFreeTextures=0,this._numBytesAllocated=0,this._numBytesFree=0}}};function EL(r,t){let e=r;if(t===e.R32F)return 4;if(t===e.R16F)return 2;if(t===e.RGBA32F)return 16;if(t===r.RGBA)return 16;if(t===e.RGBA16F)return 8;if(t===e.RGBA8)return 4;throw new Error(`Unknown internal format ${t}`)}function jS(r,t,e,o,n){let s=$L(t,o),a;if(n){let[c,l]=Xr(r[0],r[1]);a=c*l}else{let[c,l]=di(r[0],r[1]);a=c*l}let i=EL(e,s);return a*i}function $L(r,t){switch(r){case me.PACKED_2X2_FLOAT32:return qg(t);case me.PACKED_2X2_FLOAT16:return Xg(t);case me.UNPACKED_FLOAT32:return Ug(t);case me.UNPACKED_FLOAT16:return Hg(t);case me.PACKED_4X1_UNSIGNED_BYTE:return Kg(t);default:throw new Error(`Unknown physical texture type ${r}`)}}function RL(r){return F().getBool("WEBGL_RENDER_FLOAT32_ENABLED")?r?me.PACKED_2X2_FLOAT32:me.UNPACKED_FLOAT32:r?me.PACKED_2X2_FLOAT16:me.UNPACKED_FLOAT16}function YS(r,t){if(r===xe.UPLOAD)return me.PACKED_2X2_FLOAT32;if(r===xe.RENDER||r==null)return RL(t);if(r===xe.DOWNLOAD||r===xe.PIXELS)return me.PACKED_4X1_UNSIGNED_BYTE;throw new Error(`Unknown logical texture type ${r}`)}function ZS(r,t,e){return`${r[0]}_${r[1]}_${t}_${e}`}var Ie=class{constructor(t,e){this.variableNames=["A"],this.outputShape=t,this.enableShapeUniforms=Dt(this.outputShape.length),this.userCode=`
      float unaryOperation(float x) {
        ${e}
      }

      void main() {
        float x = getAAtOutCoords();
        float y = unaryOperation(x);

        setOutput(y);
      }
    `}},re="if (isnan(x)) return x;",QS="return x;",Nx="return abs(x);";var JS="return (x >= 0.0) ? x : (exp(x) - 1.0);",tw=re+`
  return (x < 0.0) ? 0.0 : x;
`,ew=re+`
  return (x < 0.0) ? 0.0 : min(6.0, x);
`,Ci="return x;",rw="return 1.0 / (1.0 + exp(-1.0 * x));";var nw="return x;",sw=`
  vec4 result;

  result.r = (x.r >= 0.0) ? x.r : (exp(x.r) - 1.0);
  result.g = (x.g >= 0.0) ? x.g : (exp(x.g) - 1.0);
  result.b = (x.b >= 0.0) ? x.b : (exp(x.b) - 1.0);
  result.a = (x.a >= 0.0) ? x.a : (exp(x.a) - 1.0);

  return result;
`,aw=`
  vec4 result = x * vec4(greaterThanEqual(x, vec4(0.0)));
  bvec4 isNaN = isnan(x);

  result.r = isNaN.r ? x.r : result.r;
  result.g = isNaN.g ? x.g : result.g;
  result.b = isNaN.b ? x.b : result.b;
  result.a = isNaN.a ? x.a : result.a;

  return result;
`,iw=`
  vec4 result = min(x, vec4(6.)) * vec4(greaterThanEqual(x, vec4(0.0)));
  bvec4 isNaN = isnan(x);

  result.r = isNaN.r ? x.r : result.r;
  result.g = isNaN.g ? x.g : result.g;
  result.b = isNaN.b ? x.b : result.b;
  result.a = isNaN.a ? x.a : result.a;

  return result;
`,cw="return 1.0 / (1.0 + exp(-1.0 * x));",Ze=class{constructor(t,e){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=t,this.enableShapeUniforms=Dt(this.outputShape.length),this.userCode=`
      vec4 unaryOperation(vec4 x) {
        ${e}
      }

      void main() {
        vec4 x = getAAtOutCoords();
        vec4 y = unaryOperation(x);

        setOutput(y);
      }
    `}};var Ou=class{constructor(t){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!1,this.outputShape=t,this.enableShapeUniforms=Dt(this.outputShape.length);let e=t.length,o=Xt("rc",e),n=dt(e),s=XS(e,o),a=o.slice(-2),i=e<=1?"rc":`vec2(${a.join(",")})`;this.userCode=`
      void main() {
        ${n} rc = getOutputCoords();
        vec4 packedInput = getA(${s});

        setOutput(getChannel(packedInput, ${i}));
      }
    `}};var FL=ue.whereImpl,DL=1e-7,_L=1e-4,Pu={};function OL(r){return r in Pu||(Pu[r]={}),Pu[r]}var PL=F().getNumber("CPU_HANDOFF_SIZE_THRESHOLD"),LL=600;function ML(){return F().global.screen==null?1024:F().global.screen.height*F().global.screen.width*window.devicePixelRatio*LL/1024/1024}var Vl=class r extends Ar{constructor(t){if(super(),this.pendingRead=new WeakMap,this.pendingDisposal=new WeakSet,this.dataRefCount=new WeakMap,this.numBytesInGPU=0,this.uploadWaitMs=0,this.downloadWaitMs=0,this.lastGlFlushTime=0,this.warnedAboutMemory=!1,this.pendingDeletes=0,this.disposed=!1,!F().getBool("HAS_WEBGL"))throw new Error("WebGL is not supported on this device");let e;if(t!=null){if(t instanceof ac)e=t;else{let o=We(F().getNumber("WEBGL_VERSION"),t);e=new ac(o)}this.binaryCache={},this.gpgpuCreatedLocally=!1}else{let o=We(F().getNumber("WEBGL_VERSION"));e=new ac(o),this.binaryCache=OL(F().getNumber("WEBGL_VERSION")),this.gpgpuCreatedLocally=!0}this.gpgpu=e,this.canvas=this.gpgpu.gl.canvas,this.textureManager=new _u(this.gpgpu),this.numMBBeforeWarning=ML(),this.texData=new Ro(this,Cr())}nextDataId(){return r.nextDataId++}numDataIds(){return this.texData.numDataIds()-this.pendingDeletes}write(t,e,o){if((F().getBool("WEBGL_CHECK_NUMERICAL_PROBLEMS")||F().getBool("DEBUG"))&&this.checkNumericalProblems(t),o==="complex64"&&t!=null)throw new Error("Cannot write to a complex64 dtype. Please use tf.complex(real, imag).");let n={id:this.nextDataId()};return this.texData.set(n,{shape:e,dtype:o,values:t,usage:xe.UPLOAD,refCount:1}),n}refCount(t){return this.texData.has(t)?this.texData.get(t).refCount:0}incRef(t){let e=this.texData.get(t);e.refCount++}decRef(t){if(this.texData.has(t)){let e=this.texData.get(t);e.refCount--}}move(t,e,o,n,s){if(F().getBool("DEBUG")&&this.checkNumericalProblems(e),n==="complex64")throw new Error("Cannot write to a complex64 dtype. Please use tf.complex(real, imag).");this.texData.set(t,{shape:o,dtype:n,values:e,usage:xe.UPLOAD,refCount:s})}disposeIntermediateTensorInfo(t){this.disposeData(t.dataId)}readSync(t){let e=this.texData.get(t),{values:o,dtype:n,complexTensorInfos:s,slice:a,shape:i,isPacked:c}=e;if(a!=null){let m;c?m=new Ze(i,Ci):m=new Ie(i,Ci);let f=this.runWebGLProgram(m,[{dataId:t,shape:i,dtype:n}],n),d=this.readSync(f.dataId);return this.disposeIntermediateTensorInfo(f),d}if(o!=null)return this.convertAndCacheOnCPU(t);if(n==="string")return o;let l=this.activeTimers!=null,p;l&&(p=y.now());let u;if(n==="complex64"){let m=this.readSync(s.real.dataId),f=this.readSync(s.imag.dataId);u=I.mergeRealAndImagArrays(m,f)}else u=this.getValuesFromTexture(t);return l&&(this.downloadWaitMs+=y.now()-p),this.convertAndCacheOnCPU(t,u)}async read(t){if(this.pendingRead.has(t)){let d=this.pendingRead.get(t);return new Promise(g=>d.push(g))}let e=this.texData.get(t),{values:o,shape:n,slice:s,dtype:a,complexTensorInfos:i,isPacked:c}=e;if(s!=null){let d;c?d=new Ze(n,Ci):d=new Ie(n,Ci);let g=this.runWebGLProgram(d,[{dataId:t,shape:n,dtype:a}],a),h=this.read(g.dataId);return this.disposeIntermediateTensorInfo(g),h}if(o!=null)return this.convertAndCacheOnCPU(t);if(F().getBool("DEBUG")&&!F().getBool("WEBGL_DOWNLOAD_FLOAT_ENABLED")&&F().getNumber("WEBGL_VERSION")===2)throw new Error("tensor.data() with WEBGL_DOWNLOAD_FLOAT_ENABLED=false and WEBGL_VERSION=2 not yet supported.");let l=null,p;if(a!=="complex64"&&F().get("WEBGL_BUFFER_SUPPORTED")){p=this.decode(t);let d=this.texData.get(p.dataId);l=this.gpgpu.createBufferFromTexture(d.texture.texture,...Fl(n))}this.pendingRead.set(t,[]),a!=="complex64"&&await this.gpgpu.createAndWaitForFence();let u;if(a==="complex64"){let d=await Promise.all([this.read(i.real.dataId),this.read(i.imag.dataId)]),g=d[0],h=d[1];u=I.mergeRealAndImagArrays(g,h)}else if(l==null)u=this.getValuesFromTexture(t);else{let d=y.sizeFromShape(n);u=this.gpgpu.downloadFloat32MatrixFromBuffer(l,d)}if(p!=null&&this.disposeIntermediateTensorInfo(p),l!=null){let d=this.gpgpu.gl;st(d,()=>d.deleteBuffer(l))}let m=this.convertAndCacheOnCPU(t,u),f=this.pendingRead.get(t);return this.pendingRead.delete(t),f.forEach(d=>d(m)),this.pendingDisposal.has(t)&&(this.pendingDisposal.delete(t),this.disposeData(t)&&Cr().removeDataId(t,this),this.pendingDeletes--),m}readToGPU(t,e={}){let o=this.texData.get(t),{values:n,shape:s,slice:a,dtype:i,isPacked:c,texture:l}=o;if(i==="complex64")throw new Error("Does not support reading texture for complex64 dtype.");if(a!=null){let f;c?f=new Ze(s,Ci):f=new Ie(s,Ci);let d=this.runWebGLProgram(f,[{dataId:t,shape:s,dtype:i}],i),g=this.readToGPU(d,e);return this.disposeIntermediateTensorInfo(d),g}if(l==null)throw n!=null?new Error("Data is not on GPU but on CPU."):new Error("There is no data on GPU or CPU.");let p=this.decode(t,e.customTexShape),u=Cr().makeTensorFromTensorInfo(p),m=this.texData.get(p.dataId);return Object.assign({tensorRef:u},m.texture)}bufferSync(t){let e=this.readSync(t.dataId);if(t.dtype==="string")try{let o=e.map(n=>y.decodeString(n));return et(t.shape,t.dtype,o)}catch{throw new Error("Failed to decode encoded string bytes into utf-8")}return et(t.shape,t.dtype,e)}checkNumericalProblems(t){if(t!=null)for(let e=0;e<t.length;e++){let o=t[e];if(!_C(o))throw F().getBool("WEBGL_RENDER_FLOAT32_CAPABLE")?Error(`The value ${o} cannot be represented with your current settings. Consider enabling float32 rendering: 'tf.env().set('WEBGL_RENDER_FLOAT32_ENABLED', true);'`):Error(`The value ${o} cannot be represented on this device.`)}}getValuesFromTexture(t){let{shape:e,dtype:o,isPacked:n}=this.texData.get(t),s=y.sizeFromShape(e);if(F().getBool("WEBGL_DOWNLOAD_FLOAT_ENABLED")){let m=this.decode(t),f=this.texData.get(m.dataId),d=this.gpgpu.downloadMatrixFromPackedTexture(f.texture.texture,...Fl(e)).subarray(0,s);return this.disposeIntermediateTensorInfo(m),d}let a=F().getBool("WEBGL_PACK")&&n===!0,i=a?ru(e):e,c=a?new lu(i):new cu(i),l=this.runWebGLProgram(c,[{shape:i,dtype:o,dataId:t}],"float32"),p=this.texData.get(l.dataId),u=this.gpgpu.downloadByteEncodedFloatMatrixFromOutputTexture(p.texture.texture,p.texShape[0],p.texShape[1]).subarray(0,s);return this.disposeIntermediateTensorInfo(l),u}timerAvailable(){return F().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_RELIABLE")>0}time(t){let e=this.activeTimers,o=[],n=!1;this.programTimersStack==null?(this.programTimersStack=o,n=!0):this.activeTimers.push(o),this.activeTimers=o,t();let s=y.flatten(this.activeTimers.map(c=>c.query)).filter(c=>c!=null),a=y.flatten(this.activeTimers.map(c=>c.name)).filter(c=>c!=null);this.activeTimers=e,n&&(this.programTimersStack=null);let i={uploadWaitMs:this.uploadWaitMs,downloadWaitMs:this.downloadWaitMs,kernelMs:null,wallMs:null};return(async()=>{if(F().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_RELIABLE")>0){let c=await Promise.all(s);i.kernelMs=y.sum(c),i.getExtraProfileInfo=()=>c.map((l,p)=>({name:a[p],ms:l})).map(l=>`${l.name}: ${l.ms}`).join(", ")}else i.kernelMs={error:"WebGL query timers are not supported in this environment."};return this.uploadWaitMs=0,this.downloadWaitMs=0,i})()}memory(){return{unreliable:!1,numBytesInGPU:this.numBytesInGPU,numBytesInGPUAllocated:this.textureManager.numBytesAllocated,numBytesInGPUFree:this.textureManager.numBytesFree}}startTimer(){return F().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_RELIABLE")>0?this.gpgpu.beginQuery():{startMs:y.now(),endMs:null}}endTimer(t){return F().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_RELIABLE")>0?(this.gpgpu.endQuery(),t):(t.endMs=y.now(),t)}async getQueryTime(t){if(F().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_RELIABLE")>0)return this.gpgpu.waitForQueryAndGetTime(t);let e=t;return e.endMs-e.startMs}disposeData(t,e=!1){if(this.pendingDisposal.has(t))return!1;if(!this.texData.has(t))return!0;if(e?this.texData.get(t).refCount=0:this.texData.get(t).refCount--,!e&&this.texData.get(t).refCount>0)return!1;if(this.pendingRead.has(t))return this.pendingDisposal.add(t),this.pendingDeletes++,!1;this.releaseGPUData(t);let{complexTensorInfos:o}=this.texData.get(t);return o!=null&&(this.disposeData(o.real.dataId,e),this.disposeData(o.imag.dataId,e)),this.texData.delete(t),!0}releaseGPUData(t){let{texture:e,dtype:o,texShape:n,usage:s,isPacked:a,slice:i}=this.texData.get(t),c=i&&i.origDataId||t,l=this.dataRefCount.get(c);l>1?this.dataRefCount.set(c,l-1):(this.dataRefCount.delete(c),e!=null&&(this.numBytesInGPU-=this.computeBytes(n,o),this.textureManager.releaseTexture(e,n,s,a)));let p=this.texData.get(t);p.texture=null,p.texShape=null,p.isPacked=!1,p.slice=null}getTexture(t){return this.uploadToGPU(t),this.texData.get(t).texture.texture}getDataInfo(t){return this.texData.get(t)}shouldExecuteOnCPU(t,e=PL){return F().getBool("WEBGL_CPU_FORWARD")&&t.every(o=>this.texData.get(o.dataId).texture==null&&y.sizeFromShape(o.shape)<e)}getGPGPUContext(){return this.gpgpu}where(t){I.warn("tf.where() in webgl locks the UI thread. Call tf.whereAsync() instead");let e=t.dataSync();return FL(t.shape,e)}packedUnaryOp(t,e,o){let n=new Ze(t.shape,e),s=this.compileAndRun(n,[t],o);return Cr().makeTensorFromTensorInfo(s)}abs(t){if(this.shouldExecuteOnCPU([t])&&t.dtype!=="complex64"){let n=Au(this.texData.get(t.dataId).values);return this.makeOutput(t.shape,t.dtype,n)}if(F().getBool("WEBGL_PACK_UNARY_OPERATIONS"))return this.packedUnaryOp(t,Nx,t.dtype);let e=new Ie(t.shape,Nx),o=this.compileAndRun(e,[t]);return Cr().makeTensorFromTensorInfo(o)}makeTensorInfo(t,e,o){let n;if(e==="string"&&o!=null&&o.length>0&&y.isString(o[0])){let s=o.map(a=>y.encodeString(a));n=this.write(s,t,e)}else n=this.write(o,t,e);return this.texData.get(n).usage=null,{dataId:n,shape:t,dtype:e}}makeOutput(t,e,o){return Cr().makeTensorFromTensorInfo(this.makeTensorInfo(t,e,o),this)}unpackTensor(t){let e=new Ou(t.shape);return this.runWebGLProgram(e,[t],t.dtype)}packTensor(t){let e=new Du(t.shape);return this.runWebGLProgram(e,[t],t.dtype,null,!0)}packedReshape(t,e){let o=[Qn(t.shape),...Jn(t.shape)],n={dtype:t.dtype,shape:o,dataId:t.dataId},s=[Qn(e),...Jn(e)],a=new mc(s,o),i=!0,c=[o],l=this.runWebGLProgram(a,[n],t.dtype,c,i);return{dataId:l.dataId,shape:e,dtype:l.dtype}}decode(t,e){let o=this.texData.get(t),{isPacked:n,shape:s,dtype:a}=o;if(e!=null){let m=y.sizeFromShape(s),f=e[0]*e[1]*4;y.assert(m<=f,()=>"customTexShape is too small. Row * Column * 4 should be equal or larger than the size of the tensor data.")}let i=ru(s),c;n?c=new iu(i):c=new au(i);let l=!0,p=[e??Fl(i)],u=this.runWebGLProgram(c,[{shape:i,dtype:a,dataId:t}],a,p,l,e);return{dtype:a,shape:s,dataId:u.dataId}}runWebGLProgram(t,e,o,n,s=!1,a){let i=this.makeTensorInfo(t.outputShape,o),c=this.texData.get(i.dataId);if(t.packedOutput&&(c.isPacked=!0),t.outPackingScheme===Zn.DENSE){let x=a??Fl(t.outputShape);c.texShape=x.map(b=>b*2)}if(t.outTexUsage!=null&&(c.usage=t.outTexUsage),y.sizeFromShape(i.shape)===0)return c.values=y.getTypedArrayFromDType(i.dtype,0),i;let l=[],p=e.map(x=>{if(x.dtype==="complex64")throw new Error("GPGPUProgram does not support complex64 input. For complex64 dtypes, please separate the program into real and imaginary parts.");let b=this.texData.get(x.dataId);if(b.texture==null){if(!t.packedInputs&&y.sizeFromShape(x.shape)<=F().getNumber("WEBGL_SIZE_UPLOAD_UNIFORM"))return{shape:x.shape,texData:null,isUniform:!0,uniformValues:b.values};t.packedInputs&&(b.isPacked=!0,b.shape=x.shape)}if(this.uploadToGPU(x.dataId),!!b.isPacked!=!!t.packedInputs)x=b.isPacked?this.unpackTensor(x):this.packTensor(x),l.push(x),b=this.texData.get(x.dataId);else if(b.isPacked&&!hi(b.shape,x.shape)){let S=x,w=x.shape;x.shape=b.shape,x=this.packedReshape(x,w),l.push(x),b=this.texData.get(x.dataId),S.shape=w}return{shape:x.shape,texData:b,isUniform:!1}});this.uploadToGPU(i.dataId);let u={shape:i.shape,texData:c,isUniform:!1},m=cT(t,p,u),f=this.getAndSaveBinary(m,()=>aT(this.gpgpu,t,p,u)),d=this.activeTimers!=null,g;d&&(g=this.startTimer()),F().get("ENGINE_COMPILE_ONLY")||iT(this.gpgpu,f,p,u,n),l.forEach(x=>this.disposeIntermediateTensorInfo(x)),d&&(g=this.endTimer(g),this.activeTimers.push({name:t.constructor.name,query:this.getQueryTime(g)}));let h=F().get("WEBGL_FLUSH_THRESHOLD");if(h>0){let x=y.now();x-this.lastGlFlushTime>h&&(this.gpgpu.gl.flush(),this.lastGlFlushTime=x)}if(!F().getBool("WEBGL_LAZILY_UNPACK")&&c.isPacked&&s===!1){let x=this.unpackTensor(i);return this.disposeIntermediateTensorInfo(i),x}return i}compileAndRun(t,e,o,n,s=!1){return o=o||e[0].dtype,this.runWebGLProgram(t,e,o,n,s)}getAndSaveBinary(t,e){return t in this.binaryCache||(this.binaryCache[t]=e()),this.binaryCache[t]}getTextureManager(){return this.textureManager}dispose(){this.disposed||(F().getBool("IS_TEST")||Object.keys(this.binaryCache).forEach(e=>{this.gpgpu.deleteProgram(this.binaryCache[e].webGLProgram),delete this.binaryCache[e]}),this.textureManager.dispose(),this.canvas!=null&&typeof HTMLCanvasElement<"u"&&this.canvas instanceof HTMLCanvasElement?this.canvas.remove():this.canvas=null,this.gpgpuCreatedLocally&&(this.gpgpu.program=null,this.gpgpu.dispose()),this.disposed=!0)}floatPrecision(){return this.floatPrecisionValue==null&&(this.floatPrecisionValue=ft(()=>{if(!F().get("WEBGL_RENDER_FLOAT32_ENABLED")){let t=F().getBool("DEBUG");F().set("DEBUG",!1);let e=this.abs(at(1e-8)).dataSync()[0];if(F().set("DEBUG",t),e>0)return 32}return 16})),this.floatPrecisionValue}epsilon(){return this.floatPrecision()===32?DL:_L}uploadToGPU(t){let e=this.texData.get(t),{shape:o,dtype:n,values:s,texture:a,usage:i,isPacked:c}=e;if(a!=null)return;let l=this.activeTimers!=null,p;l&&(p=y.now());let u=e.texShape;if(u==null&&(u=qC(o,c),e.texShape=u),s!=null){let m=ru(o),f,d=u[1],g=u[0],h=s instanceof Uint8Array||s instanceof Uint8ClampedArray;(c||!h)&&([d,g]=Xr(u[0],u[1])),c?f=new uu(m,h):f=new pu(m,h);let x=h?[g,d]:u,b=this.makeTensorInfo(x,n),S=this.texData.get(b.dataId);h?S.usage=xe.PIXELS:S.usage=xe.UPLOAD,S.texShape=x,this.gpgpu.uploadDenseMatrixToTexture(this.getTexture(b.dataId),d,g,s);let w=[[g,d]],$=this.runWebGLProgram(f,[b],n,w,!0),R=this.texData.get($.dataId);e.texShape=R.texShape,e.isPacked=R.isPacked,e.usage=R.usage,F().get("ENGINE_COMPILE_ONLY")?this.disposeData($.dataId):(e.texture=R.texture,e.values=null,this.texData.delete($.dataId)),this.disposeIntermediateTensorInfo(b),l&&(this.uploadWaitMs+=y.now()-p)}else{let m=this.acquireTexture(u,i,n,c);e.texture=m}}convertAndCacheOnCPU(t,e){let o=this.texData.get(t),{dtype:n}=o;return this.releaseGPUData(t),e!=null&&(o.values=BL(e,n)),o.values}acquireTexture(t,e,o,n){if(this.numBytesInGPU+=this.computeBytes(t,o),!this.warnedAboutMemory&&this.numBytesInGPU>this.numMBBeforeWarning*1024*1024){let s=(this.numBytesInGPU/1024/1024).toFixed(2);this.warnedAboutMemory=!0,console.warn(`High memory usage in GPU: ${s} MB, most likely due to a memory leak`)}return this.textureManager.acquireTexture(t,e,n)}computeBytes(t,e){return t[0]*t[1]*y.bytesPerElement(e)}checkCompileCompletion(){for(let[,t]of Object.entries(this.binaryCache))this.checkCompletion_(t)}async checkCompileCompletionAsync(){let t=[];if(this.gpgpu.parallelCompilationExtension){for(let[,e]of Object.entries(this.binaryCache))t.push(this.checkCompletionAsync_(e));return Promise.all(t)}else{for(let[,e]of Object.entries(this.binaryCache)){let o=new Promise(n=>{try{this.checkCompletion_(e),n(!0)}catch(s){throw s}});t.push(o)}return Promise.all(t)}}async checkCompletionAsync_(t){return this.gpgpu.gl.getProgramParameter(t.webGLProgram,this.gpgpu.parallelCompilationExtension.COMPLETION_STATUS_KHR)?this.checkCompletion_(t):(await jp(),this.checkCompletionAsync_(t))}checkCompletion_(t){if(this.gpgpu.gl.getProgramParameter(t.webGLProgram,this.gpgpu.gl.LINK_STATUS)===!1)throw console.log(this.gpgpu.gl.getProgramInfoLog(t.webGLProgram)),this.gpgpu.gl.getShaderParameter(t.fragmentShader,this.gpgpu.gl.COMPILE_STATUS)===!1?(Bg(t.source,this.gpgpu.gl.getShaderInfoLog(t.fragmentShader)),new Error("Failed to compile fragment shader.")):new Error("Failed to link vertex and fragment shaders.");return!0}getUniformLocations(){for(let[,t]of Object.entries(this.binaryCache)){let{uniformLocations:e,customUniformLocations:o,infLoc:n,nanLoc:s,inShapesLocations:a,inTexShapesLocations:i,outShapeLocation:c,outShapeStridesLocation:l,outTexShapeLocation:p}=Gg(this.gpgpu,t.program,t.webGLProgram);t.uniformLocations=e,t.customUniformLocations=o,t.infLoc=n,t.nanLoc=s,t.inShapesLocations=a,t.inTexShapesLocations=i,t.outShapeLocation=c,t.outShapeStridesLocation=l,t.outTexShapeLocation=p}}};Vl.nextDataId=0;function BL(r,t){if(t==="float32"||t==="complex64")return r;if(t==="int32"||t==="bool"){let e=t==="int32"?new Int32Array(r.length):new Uint8Array(r.length);for(let o=0;o<e.length;++o)e[o]=Math.round(r[o]);return e}else throw new Error(`Unknown dtype ${t}`)}io.isBrowser()&&Jc("webgl",()=>new Vl,2);var fc=`
  if (isnan(a)) return a;
  if (isnan(b)) return b;
`;var Qe=class{constructor(t,e,o){this.variableNames=["A","B"],this.outputShape=I.assertAndGetBroadcastShape(e,o),this.enableShapeUniforms=Dt(this.outputShape.length),this.userCode=`
      float binaryOperation(float a, float b) {
        ${t}
      }

      void main() {
        float a = getAAtOutCoords();
        float b = getBAtOutCoords();
        setOutput(binaryOperation(a, b));
      }
    `}};var Zr=`
  result.r = isNaN.r ? NAN : result.r;
  result.g = isNaN.g ? NAN : result.g;
  result.b = isNaN.b ? NAN : result.b;
  result.a = isNaN.a ? NAN : result.a;
`;var ur=class{constructor(t,e,o,n=!1){this.variableNames=["A","B"],this.supportsBroadcasting=!0,this.packedInputs=!0,this.packedOutput=!0,this.outputShape=I.assertAndGetBroadcastShape(e,o);let s=this.outputShape.length;this.enableShapeUniforms=Dt(s);let a="";if(n)if(s===0||y.sizeFromShape(this.outputShape)===1)a=`
          result.y = 0.;
          result.z = 0.;
          result.w = 0.;
        `;else if(a=`
          ${dt(s)} coords = getOutputCoords();
        `,s===1)this.enableShapeUniforms?a+=`
            result.y = (coords + 1) >= outShape ? 0. : result.y;
            result.z = 0.;
            result.w = 0.;
          `:a+=`
            result.y = (coords + 1) >= ${this.outputShape[0]} ? 0. : result.y;
            result.z = 0.;
            result.w = 0.;
          `;else{let c=Xt("coords",s);this.enableShapeUniforms?a+=`
            bool nextRowOutOfBounds =
              (${c[s-2]} + 1) >= outShape[${s} - 2];
            bool nextColOutOfBounds =
              (${c[s-1]} + 1) >= outShape[${s} - 1];
            result.y = nextColOutOfBounds ? 0. : result.y;
            result.z = nextRowOutOfBounds ? 0. : result.z;
            result.w = nextColOutOfBounds || nextRowOutOfBounds ? 0. : result.w;
          `:a+=`
            bool nextRowOutOfBounds =
              (${c[s-2]} + 1) >= ${this.outputShape[s-2]};
            bool nextColOutOfBounds =
              (${c[s-1]} + 1) >= ${this.outputShape[s-1]};
            result.y = nextColOutOfBounds ? 0. : result.y;
            result.z = nextRowOutOfBounds ? 0. : result.z;
            result.w = nextColOutOfBounds || nextRowOutOfBounds ? 0. : result.w;
          `}this.userCode=`
      vec4 binaryOperation(vec4 a, vec4 b) {
        ${t}
      }

      void main() {
        vec4 a = getAAtOutCoords();
        vec4 b = getBAtOutCoords();

        vec4 result = binaryOperation(a, b);
        ${a}

        setOutput(result);
      }
    `}};function jt(r){let{inputs:t,backend:e}=r,{x:o}=t;return e.incRef(o.dataId),{dataId:o.dataId,shape:o.shape,dtype:o.dtype}}var lw={kernelName:no,backendName:"webgl",kernelFunc:jt};function _e(r){let{inputs:t,backend:e}=r,{real:o,imag:n}=t,s=e.makeTensorInfo(o.shape,"complex64"),a=e.texData.get(s.dataId),i=jt({inputs:{x:o},backend:e}),c=jt({inputs:{x:n},backend:e});return a.complexTensorInfos={real:i,imag:c},s}var pw={kernelName:ys,backendName:"webgl",kernelFunc:_e};var Ix="return (a < 0.) ? b * a : a;",vx=`
  vec4 aLessThanZero = vec4(lessThan(a, vec4(0.)));
  return (aLessThanZero * (b * a)) + ((vec4(1.0) - aLessThanZero) * a);
`;function VL(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{alpha:s}=o,a=e.makeTensorInfo([],"float32",y.createScalarValue(s,"float32")),i=F().getBool("WEBGL_PACK_BINARY_OPERATIONS")?new ur(vx,n.shape,a.shape):new Qe(Ix,n.shape,a.shape),c=e.runWebGLProgram(i,[n,a],"float32");return e.disposeIntermediateTensorInfo(a),c}var uw={kernelName:Ks,backendName:"webgl",kernelFunc:VL};var kx="return (a < 0.) ? b * a : a;",Ex=`
  vec4 aLessThanZero = vec4(lessThan(a, vec4(0.)));
  return (aLessThanZero * (b * a)) + ((vec4(1.0) - aLessThanZero) * a);
`;function zL(r){let{inputs:t,backend:e}=r,{x:o,alpha:n}=t,s=F().getBool("WEBGL_PACK_BINARY_OPERATIONS")?new ur(Ex,o.shape,n.shape):new Qe(kx,o.shape,n.shape);return e.runWebGLProgram(s,[o,n],"float32")}var mw={kernelName:ua,backendName:"webgl",kernelFunc:zL};var mr="if (isnan(x)) return x;";function ot({opSnippet:r,packedOpSnippet:t,cpuKernelImpl:e,dtype:o}){return({inputs:n,backend:s})=>{let{x:a}=n,i=s,c=o||a.dtype;if(i.shouldExecuteOnCPU([a])&&e!=null){let u=i.texData.get(a.dataId),m=e(u.values,c);return i.makeTensorInfo(a.shape,c,m)}let l=F().getBool("WEBGL_PACK_UNARY_OPERATIONS")&&t!=null,p;return l?p=new Ze(a.shape,t):p=new Ie(a.shape,r),i.runWebGLProgram(p,[a],c)}}function Rt({opSnippet:r,packedOpSnippet:t,checkOutOfBounds:e=!1,supportsComplex:o=!1,cpuKernelImpl:n,dtype:s}){return({inputs:a,backend:i})=>{let{a:c,b:l}=a,p=i;if(o&&c.dtype==="complex64"){let d=p.texData.get(c.dataId),g=p.texData.get(l.dataId),[h,x]=[[d.complexTensorInfos.real,g.complexTensorInfos.real],[d.complexTensorInfos.imag,g.complexTensorInfos.imag]].map(S=>{let[w,k]=S,$={dataId:w.dataId,dtype:w.dtype,shape:c.shape},R={dataId:k.dataId,dtype:k.dtype,shape:l.shape},A=new Qe(r,c.shape,l.shape);return p.runWebGLProgram(A,[$,R],Yt(w.dtype,k.dtype))}),b=_e({inputs:{real:h,imag:x},backend:p});return p.disposeIntermediateTensorInfo(h),p.disposeIntermediateTensorInfo(x),b}let u=s||Yt(c.dtype,l.dtype);if((c.dtype==="string"||l.dtype==="string"||p.shouldExecuteOnCPU([c,l]))&&n!=null){let d=p.texData.get(c.dataId).values,g=p.texData.get(l.dataId).values,h=c.dtype==="string"?I.fromUint8ToStringArray(d):d,x=c.dtype==="string"?I.fromUint8ToStringArray(g):g,[b,S]=n(c.shape,l.shape,h,x,u),w=p.makeTensorInfo(S,u),k=p.texData.get(w.dataId);return k.values=b,w}let m=F().getBool("WEBGL_PACK_BINARY_OPERATIONS")&&t!=null,f;return m?f=new ur(t,c.shape,l.shape,e):f=new Qe(r,c.shape,l.shape),p.runWebGLProgram(f,[c,l],u)}}function So(r,t=!1){if(r==="linear")return t?nw:QS;if(r==="relu")return t?aw:tw;if(r==="elu")return t?sw:JS;if(r==="relu6")return t?iw:ew;if(r==="prelu")return t?Ex:kx;if(r==="leakyrelu")return t?vx:Ix;if(r==="sigmoid")return t?cw:rw;throw new Error(`Activation ${r} has not been implemented for the WebGL backend.`)}var dc=class{constructor(t,e,o,n=!1,s=!1,a=!1,i=null,c=!1,l=!1){this.variableNames=["matrixA","matrixB"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=o,this.enableShapeUniforms=Dt(this.outputShape.length);let p=n?t[1]:t[2],u=Math.ceil(p/2),m=n?"i * 2, rc.y":"rc.y, i * 2",f=s?"rc.z, i * 2":"i * 2, rc.z",d=n?["a.xxyy","a.zzww"]:["a.xxzz","a.yyww"],g=s?["b.xzxz","b.ywyw"]:["b.xyxy","b.zwzw"],h="",x="";i&&(c?h=`vec4 activation(vec4 a) {
          vec4 b = getPreluActivationWeightsAtOutCoords();
          ${i}
        }`:l?h=`vec4 activation(vec4 a) {
          vec4 b = getLeakyreluAlphaAtOutCoords();
          ${i}
        }`:h=`vec4 activation(vec4 x) {
          ${i}
        }`,x="result = activation(result);");let b=a?"result += getBiasAtOutCoords();":"";a&&this.variableNames.push("bias"),c&&this.variableNames.push("preluActivationWeights"),l&&this.variableNames.push("leakyreluAlpha");let S="rc.x",w="rc.x";t[0]<e[0]?S=`int(min(float(rc.x), ${t[0]-1}.))`:e[0]<t[0]&&(w=`int(min(float(rc.x), ${e[0]-1}.))`),this.userCode=`
      ${h}
      // Don't use uniform for sharedDimensionPacked for performance.
      const float sharedDimension = ${u}.0;

      vec4 dot2x2ARowBCol(ivec3 rc) {
        vec4 result = vec4(0);
        for (int i = 0; i < ${u}; i++) {
          int batchA = ${S};
          int batchB = ${w};
          vec4 a = getMatrixA(batchA, ${m});
          vec4 b = getMatrixB(batchB, ${f});

          // These swizzled products need to be separately added.
          // See: https://github.com/tensorflow/tfjs/issues/1735
          result += (${d[0]} * ${g[0]});
          result += (${d[1]} * ${g[1]});
        }
        return result;
      }

      void main() {
        ivec3 rc = getOutputCoords();
        vec4 result = dot2x2ARowBCol(rc);

        ${b}

        ${x}

        setOutput(result);
      }
    `}};var $x={REAL:"return areal * breal - aimag * bimag;",IMAG:"return areal * bimag + aimag * breal;"},zl=class{constructor(t,e,o){this.variableNames=["AReal","AImag","BReal","BImag"],this.outputShape=I.assertAndGetBroadcastShape(e,o),this.userCode=`
      float binaryOpComplex(
          float areal, float aimag, float breal, float bimag) {
        ${t}
      }

      void main() {
        float areal = getARealAtOutCoords();
        float aimag = getAImagAtOutCoords();
        float breal = getBRealAtOutCoords();
        float bimag = getBImagAtOutCoords();
        setOutput(binaryOpComplex(areal, aimag, breal, bimag));
      }
    `}};var fw="return a * b;";function Wl(r){let{inputs:t,backend:e}=r,{a:o,b:n}=t,s=I.upcastType(o.dtype,n.dtype);if(o.dtype==="complex64"){let i=e.texData.get(o.dataId),c=e.texData.get(n.dataId),l=new zl($x.REAL,o.shape,n.shape),p=new zl($x.IMAG,o.shape,n.shape),u=[{dataId:i.complexTensorInfos.real.dataId,dtype:i.complexTensorInfos.real.dtype,shape:o.shape},{dataId:i.complexTensorInfos.imag.dataId,dtype:i.complexTensorInfos.imag.dtype,shape:o.shape},{dataId:c.complexTensorInfos.real.dataId,dtype:c.complexTensorInfos.real.dtype,shape:n.shape},{dataId:c.complexTensorInfos.imag.dataId,dtype:c.complexTensorInfos.imag.dtype,shape:n.shape}],m=e.runWebGLProgram(l,u,"float32"),f=e.runWebGLProgram(p,u,"float32"),d=_e({inputs:{real:m,imag:f},backend:e});return e.disposeIntermediateTensorInfo(m),e.disposeIntermediateTensorInfo(f),d}if(e.shouldExecuteOnCPU([o,n])){let i=e.texData.get(o.dataId),c=e.texData.get(n.dataId),[l,p]=vS(o.shape,n.shape,i.values,c.values,s),u=e.makeTensorInfo(p,s),m=e.texData.get(u.dataId);return m.values=l,u}let a;return F().getBool("WEBGL_PACK_BINARY_OPERATIONS")?a=new ur(fw,o.shape,n.shape):a=new Qe(fw,o.shape,n.shape),e.runWebGLProgram(a,[o,n],s)}var dw={kernelName:fn,backendName:"webgl",kernelFunc:Wl};function hw(r,t,e){let o=[Qn(r.shape),...Jn(r.shape)],n={dtype:r.dtype,shape:o,dataId:r.dataId},s=[Qn(t),...Jn(t)],a=new mc(s,o),i=!0,c=[o],l=e.runWebGLProgram(a,[n],r.dtype,c,i);return{dataId:l.dataId,shape:t,dtype:l.dtype}}function K(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{shape:s}=o,a=e,i=y.sizeFromShape(n.shape),c=y.inferFromImplicitShape(s,i),l=y.sizeFromShape(c);y.assert(i===l,()=>`The new shape (${c}) has ${l} elements and the old shape (${n.shape}) has ${i} elements. The new shape and old shape must have the same number of elements.`);let p=a.texData.get(n.dataId);return p.isPacked&&!hi(n.shape,c)&&!(p.texture!==null&&hi(p.shape,c))?hw(n,c,a):(a.incRef(n.dataId),{dataId:n.dataId,shape:c,dtype:n.dtype})}var gw={kernelName:xa,backendName:"webgl",kernelFunc:K};var Gl=class{constructor(t,e){this.variableNames=["x"];let{windowSize:o,batchSize:n,inSize:s,outSize:a}=t;this.outputShape=[n,a];let i=Math.floor(o/4)*4,c=o%4,l="sumValue += dot(values, ones);";if(e!=null){let u=1/e;l=`sumValue += dot(values * ${y.isInt(u)?u.toPrecision(2):u}, ones);`}let p="";s%o>0&&(p=`
        if (inIdx < 0 || inIdx >= ${s}) {
          return 0.0;
        }
      `),this.userCode=`
      const vec4 ones = vec4(1.0, 1.0, 1.0, 1.0);

      float getValue(int batch, int inIdx) {
        ${p}
        return getX(batch, inIdx);
      }

      void main() {
        ivec2 coords = getOutputCoords();
        int batch = coords[0];
        int outIdx = coords[1];
        int inOffset = outIdx * ${o};

        float sumValue = 0.0;

        for (int i = 0; i < ${i}; i += 4) {
          int inIdx = inOffset + i;
          vec4 values = vec4(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            getValue(batch, inIdx + 2),
            getValue(batch, inIdx + 3)
          );

          ${l}
        }

        int inIdx = inOffset + ${i};
        if (${c===1}) {
          vec4 values = vec4(getValue(batch, inIdx), 0.0, 0.0, 0.0);

          ${l}
        } else if (${c===2}) {
          vec4 values = vec4(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1), 0.0, 0.0);

          ${l}
        } else if (${c===3}) {
          vec4 values = vec4(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            getValue(batch, inIdx + 2), 0.0);

          ${l}
        }
        setOutput(sumValue);
      }
    `}};var Lu=class{constructor(t,e){this.variableNames=["x"];let{windowSize:o,batchSize:n,inSize:s,outSize:a}=t;this.outputShape=[n,a];let i="0.0",c="";e==="prod"?i="1.0":e==="min"?(i="1.0 / 1e-20",c="min"):e==="max"&&(i="-1.0 / 1e-20",c="max");let l=`${e}(${e}(${e}(minMaxValue[0], minMaxValue[1]), minMaxValue[2]), minMaxValue[3])`;e==="sum"?l="sumValue":e==="prod"?l="prodValue":e==="all"?l="allValue":e==="any"&&(l="anyValue");let p=Math.floor(o/4)*4,u=o%4,m=`
      if (${e==="sum"}) {
        sumValue += dot(values, ones);
      } else if (${e==="prod"}) {
        vec2 tmp = vec2(values[0], values[1]) * vec2(values[2], values[3]);
        prodValue *= tmp[0] * tmp[1];
      } else {
        minMaxValue = ${c}(values, minMaxValue);
        if (${e==="min"} || ${e==="max"}) {
          minMaxValue = ${c}(values, minMaxValue);
          bvec4 isNaN = isnan(values);
          if (isNaN.r || isNaN.g || isNaN.b || isNaN.a) {
            minMaxValue = vec4(NAN);
          }
        }
      }
    `,f="vec4";e==="all"?(i="1.0",m=`
        bool reducedAllValue = all(values);
        float floatedReducedAllValue = float(reducedAllValue);
        allValue = float(allValue >= 1.0 && floatedReducedAllValue >= 1.0);
      `,f="bvec4"):e==="any"&&(i="0.0",m=`
        bool reducedAnyValue = any(values);
        float floatedReducedAnyValue = float(reducedAnyValue);
        anyValue = float(anyValue >= 1.0 || floatedReducedAnyValue >= 1.0);
      `,f="bvec4");let d="";s%o>0&&(d=`
        if (inIdx < 0 || inIdx >= ${s}) {
          return initializationValue;
        }
      `),this.userCode=`
      const float initializationValue = ${i};
      const vec4 ones = vec4(1.0, 1.0, 1.0, 1.0);

      float getValue(int batch, int inIdx) {
        ${d}
        return getX(batch, inIdx);
      }

      void main() {
        ivec2 coords = getOutputCoords();
        int batch = coords[0];
        int outIdx = coords[1];
        int inOffset = outIdx * ${o};

        vec4 minMaxValue = vec4(${i});
        float prodValue = 1.0;
        float sumValue = 0.0;
        float allValue = 1.0;
        float anyValue = 0.0;

        for (int i = 0; i < ${p}; i += 4) {
          int inIdx = inOffset + i;
          ${f} values = ${f}(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            getValue(batch, inIdx + 2),
            getValue(batch, inIdx + 3)
          );

          ${m}
        }

        int inIdx = inOffset + ${p};
        if (${u===1}) {
          ${f} values = ${f}(
            getValue(batch, inIdx),
            initializationValue,
            initializationValue,
            initializationValue
          );

          ${m}
        } else if (${u===2}) {
          ${f} values = ${f}(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            initializationValue,
            initializationValue
          );

          ${m}
        } else if (${u===3}) {
          ${f} values = ${f}(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            getValue(batch, inIdx + 2),
            initializationValue
          );

          ${m}
        }
        setOutput(${l});
      }
    `}};function GL(r){let t=[];for(;t.length===0||t[t.length-1].outSize!==1;){let e=t.length?t[t.length-1].outSize:r[1],o=I.computeOptimalWindowSize(e);t.push({inSize:e,windowSize:o,outSize:Math.ceil(e/o)})}return t}function Ge(r,t,e,o){let n=GL(r.shape),s=r;for(let a=0;a<n.length;a++){let{inSize:i,windowSize:c,outSize:l}=n[a],p,u;e==="mean"?p=a===0?new Gl({windowSize:c,inSize:i,batchSize:r.shape[0],outSize:l},i):new Gl({windowSize:c,inSize:i,batchSize:r.shape[0],outSize:l}):p=new Lu({windowSize:c,inSize:i,batchSize:r.shape[0],outSize:l},e),u=s,s=o.runWebGLProgram(p,[s],t),u.dataId!==r.dataId&&o.disposeIntermediateTensorInfo(u)}return s}var Mu=class{constructor(t,e){this.variableNames=["A"];let o=new Array(t.length);for(let a=0;a<o.length;a++)o[a]=t[e[a]];this.outputShape=o,this.rank=o.length;let n=dt(this.rank),s=UL(e);this.userCode=`
    void main() {
      ${n} resRC = getOutputCoords();
      setOutput(getA(${s}));
    }
    `}};function UL(r){let t=r.length;if(t>6)throw Error(`Transpose for rank ${t} is not yet supported`);let e=["resRC.x","resRC.y","resRC.z","resRC.w","resRC.u","resRC.v"],o=new Array(t);for(let n=0;n<r.length;n++)o[r[n]]=e[n];return o.join()}var Bu=class{constructor(t,e){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0;let o=new Array(t.length);for(let p=0;p<o.length;p++)o[p]=t[e[p]];if(this.outputShape=o,this.rank=o.length,this.rank>6)throw Error(`Packed transpose for rank ${this.rank} is not yet supported.`);let n=dt(this.rank),s=wx("rc",this.rank),a=new Array(this.rank);for(let p=0;p<e.length;p++)a[e[p]]=s[p];let i=`vec2(${a.slice(-2).join()})`,c=`++${s[this.rank-1]} < ${o[this.rank-1]}`,l=`getChannel(getA(${a.join()}), ${i})`;this.userCode=`
    void main() {
      ${n} rc = getOutputCoords();
      vec4 result = vec4(0.);
      result[0] = ${l};
      if(${c}) {
        result[1] = ${l};
      }
      --${s[this.rank-1]};
      if(++${s[this.rank-2]} < ${o[this.rank-2]}) {
        result[2] = ${l};
        if(${c}) {
          result[3] = ${l};
        }
      }
      setOutput(result);
    }
    `}};function ts(r,t,e){let o=F().getBool("WEBGL_PACK_ARRAY_OPERATIONS")?new Bu(r.shape,t):new Mu(r.shape,t);return e.runWebGLProgram(o,[r],r.dtype)}function xw(r,t,e,o){let n=t,s=r.shape.length,a=y.parseAxisParam(n,r.shape),i=a,c=I.getAxesPermutation(i,s),l=c!=null,p=r;l&&(p=ts(r,c,o),i=I.getInnerMostAxes(i.length,s)),I.assertAxesAreInnerMostDims("sum",i,s);let[u,m]=I.computeOutAndReduceShapes(p.shape,i),f=u;e&&(f=I.expandShapeToKeepDim(u,a));let d=y.sizeFromShape(m),h=y.sizeFromShape(r.shape)/d,x=K({inputs:{x:p},attrs:{shape:[h,d]},backend:o}),b=Mn(r.dtype),S=Ge(x,b,"sum",o),w=K({inputs:{x:S},attrs:{shape:f},backend:o});return o.disposeIntermediateTensorInfo(x),o.disposeIntermediateTensorInfo(S),l&&o.disposeIntermediateTensorInfo(p),w}function Ti(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,keepDims:a}=o;return xw(n,s,a,e)}var yw={kernelName:Ia,backendName:"webgl",kernelFunc:Ti};function Mt(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{perm:s}=o,a=e,i=n.shape.length,c=new Array(i);for(let p=0;p<c.length;p++)c[p]=n.shape[s[p]];let l;if(a.shouldExecuteOnCPU([n])){let u=a.texData.get(n.dataId).values,m=bi(u,n.shape,n.dtype,s,c);l=a.makeTensorInfo(c,n.dtype);let f=a.texData.get(l.dataId);f.values=m}else l=ts(n,s,a);return l}var bw={kernelName:ao,backendName:"webgl",kernelFunc:Mt};var Rx=1e3;function Si({a:r,b:t,transposeA:e,transposeB:o,backend:n,bias:s=null,preluActivationWeights:a=null,leakyreluAlpha:i=0,activation:c=null}){let l=r.shape.length,p=t.shape.length,u=e?r.shape[l-2]:r.shape[l-1],m=o?t.shape[p-1]:t.shape[p-2],f=e?r.shape[l-1]:r.shape[l-2],d=o?t.shape[p-2]:t.shape[p-1],g=r.shape.slice(0,-2),h=t.shape.slice(0,-2),x=y.sizeFromShape(g),b=y.sizeFromShape(h),w=Tr.assertAndGetBroadcastShape(r.shape.slice(0,-2),t.shape.slice(0,-2)).concat([f,d]);y.assert(u===m,()=>`Error in matMul: inner shapes (${u}) and (${m}) of Tensors with shapes ${r.shape} and ${t.shape} and transposeA=${e} and transposeB=${o} must match.`);let k=e?[x,u,f]:[x,f,u],$=o?[b,d,m]:[b,m,d],R=K({inputs:{x:r},backend:n,attrs:{shape:k}}),A=K({inputs:{x:t},backend:n,attrs:{shape:$}}),D=[R,A],_=Math.max(x,b),O=e?R.shape[1]:R.shape[2],L=s!=null,M=a!=null,V=c==="leakyrelu",B=c!=null?So(c,!0):null,G=L||M||V||B!=null,U;if((f===1||d===1)&&O>Rx&&G===!1){let H=R,X=A;e&&(H=Mt({inputs:{x:R},backend:n,attrs:{perm:[0,2,1]}}),D.push(H)),o&&(X=Mt({inputs:{x:A},backend:n,attrs:{perm:[0,2,1]}}),D.push(X));let j=d!==1,Q=d===1,Y=H;j&&(Y=K({inputs:{x:H},backend:n,attrs:{shape:[_,O,1]}}),D.push(Y));let tt=d===1?2:1,Z=X;Q&&(Z=K({inputs:{x:X},backend:n,attrs:{shape:[_,1,O]}}),D.push(Z));let rt=Wl({inputs:{a:Y,b:Z},backend:n});U=Ti({inputs:{x:rt},backend:n,attrs:{axis:tt,keepDims:!0}}),D.push(rt)}else{let H=Yt(r.dtype,t.dtype),X=new dc(k,$,[_,f,d],e,o,L,B,M,V),j=[R,A];if(s!=null&&j.push(s),M&&j.push(a),V){let Q=n.makeTensorInfo([],"float32",y.createScalarValue(i,"float32"));j.push(Q),D.push(Q)}U=n.runWebGLProgram(X,j,H)}let z=K({inputs:{x:U},backend:n,attrs:{shape:w}});D.push(U);for(let H of D)n.disposeIntermediateTensorInfo(H);return z}function HL(r){let{inputs:t,backend:e,attrs:o}=r,{a:n,b:s,bias:a,preluActivationWeights:i}=t,{transposeA:c,transposeB:l,activation:p,leakyreluAlpha:u}=o;return Si({a:n,b:s,transposeA:c,transposeB:l,backend:e,bias:a,preluActivationWeights:i,leakyreluAlpha:u,activation:p})}var Cw={kernelName:Dn,backendName:"webgl",kernelFunc:HL};var Tw="return abs(x);";function KL(r){let{inputs:t,backend:e}=r,{x:o}=t;if(e.shouldExecuteOnCPU([o])&&o.dtype!=="complex64"){let s=e.texData.get(o.dataId),a=Au(s.values);return e.makeTensorInfo(o.shape,o.dtype,a)}let n;return F().getBool("WEBGL_PACK_UNARY_OPERATIONS")?n=new Ze(o.shape,Tw):n=new Ie(o.shape,Tw),e.runWebGLProgram(n,[o],o.dtype)}var Sw={kernelName:as,backendName:"webgl",kernelFunc:KL};var qL=re+`
  if (abs(x) > 1.) {
    return NAN;
  }
  return acos(x);
`,XL=ot({opSnippet:qL}),ww={kernelName:Fo,backendName:"webgl",kernelFunc:XL};var jL=re+`
  if (x < 1.0) return NAN;
return log(x + sqrt(x * x - 1.0));`,YL=ot({opSnippet:jL}),Nw={kernelName:Do,backendName:"webgl",kernelFunc:YL};var Iw="return a + b;",ZL=Rt({opSnippet:Iw,packedOpSnippet:Iw,supportsComplex:!0,cpuKernelImpl:aS}),vw={kernelName:_r,backendName:"webgl",kernelFunc:ZL};var Vu=class{constructor(t,e){this.outputShape=[],this.outputShape=t,this.variableNames=e.map((s,a)=>`T${a}`);let o=[];this.variableNames.forEach(s=>{o.push(`float v${s} = get${s}AtOutCoords();`)});let n=this.variableNames.map(s=>`v${s}`).join(" + ");this.userCode=`
      void main() {
        ${o.join(`
        `)}

        float result = ${n};
        setOutput(result);
      }
    `}};var zu=class{constructor(t,e){this.outputShape=[],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=t,this.variableNames=e.map((s,a)=>`T${a}`);let o=[];this.variableNames.forEach(s=>{o.push(`vec4 v${s} = get${s}AtOutCoords();`)});let n=this.variableNames.map(s=>`v${s}`).join(" + ");this.userCode=`
      void main() {
        ${o.join(`
        `)}

        vec4 result = ${n};
        setOutput(result);
      }
    `}};function Wu(r){let{inputs:t,backend:e}=r,o=t;if(o.length===1)return jt({inputs:{x:o[0]},backend:e});if(o.length>F().get("WEBGL_MAX_TEXTURES_IN_SHADER")){let c=Math.floor(o.length/2),l=Wu({inputs:o.slice(0,c),backend:e}),p=Wu({inputs:o.slice(c),backend:e});return Wu({inputs:[l,p],backend:e})}let n=o.map(c=>c.dtype).reduce((c,l)=>Yt(c,l)),s=o.map(c=>c.shape),i=F().getBool("WEBGL_PACK")?new zu(o[0].shape,s):new Vu(o[0].shape,s);return e.runWebGLProgram(i,o,n)}var kw={kernelName:is,backendName:"webgl",kernelFunc:Wu};function QL(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,keepDims:a}=o,i=n.shape.length,c=y.parseAxisParam(s,n.shape),l=c,p=I.getAxesPermutation(l,i),u=n;p!=null&&(u=Mt({inputs:{x:n},backend:e,attrs:{perm:p}}),l=I.getInnerMostAxes(l.length,i)),I.assertAxesAreInnerMostDims("all",l,i);let[m,f]=I.computeOutAndReduceShapes(u.shape,l),d=y.sizeFromShape(f),g=K({inputs:{x:u},backend:e,attrs:{shape:[-1,d]}}),h=Ge(g,g.dtype,"all",e),x;if(a){let b=I.expandShapeToKeepDim(m,c);x=K({inputs:{x:h},backend:e,attrs:{shape:b}})}else x=K({inputs:{x:h},backend:e,attrs:{shape:m}});return e.disposeIntermediateTensorInfo(g),e.disposeIntermediateTensorInfo(h),p!=null&&e.disposeIntermediateTensorInfo(u),x}var Ew={kernelName:cs,backendName:"webgl",kernelFunc:QL};function JL(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,keepDims:a}=o,i=n.shape.length,c=y.parseAxisParam(s,n.shape),l=c,p=I.getAxesPermutation(l,i),u=n;p!=null&&(u=Mt({inputs:{x:n},backend:e,attrs:{perm:p}}),l=I.getInnerMostAxes(l.length,i)),I.assertAxesAreInnerMostDims("any",l,i);let[m,f]=I.computeOutAndReduceShapes(u.shape,l),d=y.sizeFromShape(f),g=K({inputs:{x:u},backend:e,attrs:{shape:[-1,d]}}),h=Ge(g,g.dtype,"any",e),x;if(a){let b=I.expandShapeToKeepDim(m,c);x=K({inputs:{x:h},backend:e,attrs:{shape:b}})}else x=K({inputs:{x:h},backend:e,attrs:{shape:m}});return e.disposeIntermediateTensorInfo(g),e.disposeIntermediateTensorInfo(h),p!=null&&e.disposeIntermediateTensorInfo(u),x}var $w={kernelName:ls,backendName:"webgl",kernelFunc:JL};var Gu=class{constructor(t,e,o){this.variableNames=["A"];let{windowSize:n,batchSize:s,outSize:a}=t;o||this.variableNames.push("bestIndicesA"),this.outputShape=[s,a];let i=e==="max"?">":"<",c=o?"inOffset + i;":"round(getBestIndicesA(batch, inOffset + i));";this.userCode=`
      void main() {
        ivec2 coords = getOutputCoords();
        int batch = coords[0];
        int outIdx = coords[1];
        int inOffset = outIdx * ${n};

        int bestIndex = inOffset;
        float bestValue = getA(batch, bestIndex);

        for (int i = 0; i < ${n}; i++) {
          int inIdx = ${c};
          float candidate = getA(batch, inIdx);
          if (candidate ${i} bestValue) {
            bestValue = candidate;
            bestIndex = inIdx;
          }
        }
        setOutput(float(bestIndex));
      }
    `}};var Uu=class{constructor(t,e,o,n){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,y.assert(t.length>2,()=>`Packed arg${o.charAt(0).toUpperCase()+o.slice(1)} supports only inputs with rank above 2.`);let s=t[t.length-1],a=Math.ceil(s/e);this.outputShape=t.slice(0,-1),a>1&&this.outputShape.push(a),n||this.variableNames.push("bestIndicesA");let i=this.outputShape,c=i.length,l=dt(c),p=Xt("coords",c),u,m;if(a===1){m=c+1;let A=dt(m);u=`
        ${A} sourceLocR = ${A}(${p.join()}, 0);
        ++${p[c-1]};
        ${A} sourceLocG = ${A}(${p.join()}, 0);
        ++${p[c-2]};
        ${A} sourceLocA = ${A}(${p.join()}, 0);
        --${p[c-1]};
        ${A} sourceLocB = ${A}(${p.join()}, 0);
        --${p[c-2]};`}else m=c,u=`
        ${l} sourceLocR = coords;
        ++${p[c-1]};
        ${l} sourceLocG = coords;
        ++${p[c-2]};
        ${l} sourceLocA = coords;
        --${p[c-1]};
        ${l} sourceLocB = coords;
        --${p[c-2]};`;let f=["x","y","z","w","u","v"].slice(0,m),d="."+f[m-1],g=f.map(A=>"int "+A),h=Xt("sourceLocR",m-1).concat("inIdx.r"),x=Xt("sourceLocG",m-1).concat("inIdx.g"),b=Xt("sourceLocB",m-1).concat("inIdx.b"),S=Xt("sourceLocA",m-1).concat("inIdx.a"),w=o==="max"?"greaterThan":"lessThan",k=n?"":`
          inIdx = round(vec4(getBestIndicesAChannel(${h.join()}),
                             getBestIndicesAChannel(${x.join()}),
                             getBestIndicesAChannel(${b.join()}),
                             getBestIndicesAChannel(${S.join()})));`,$=`vec4(
            getAChannel(${h.join()}),
            hasNextCol ? getAChannel(${x.join()}) : 0.,
            hasNextRow ? getAChannel(${b.join()}) : 0.,
            hasNextRow && hasNextCol ? getAChannel(${S.join()}) : 0.)`,R=n?"":`
      float getBestIndicesAChannel(${g.join()}) {
        return getChannel(getBestIndicesA(${f.join()}),
                                          vec2(${f.slice(-2).join()}));
      }`;this.userCode=`
      float getAChannel(${g.join()}) {
        return getChannel(getA(${f.join()}),
                               vec2(${f.slice(-2).join()}));
      }
      ${R}
      void main() {
        ${l} coords = getOutputCoords();
        bool hasNextCol = ${p[c-1]} < ${i[c-1]-1};
        bool hasNextRow = ${p[c-2]} < ${i[c-2]-1};
        ${u}
        ivec4 srcIdx = ivec4(sourceLocR${d}, sourceLocG${d},
          sourceLocB${d}, sourceLocA${d}) * ${e};
        ivec4 inIdx = srcIdx;
        vec4 bestIndex = vec4(inIdx);
        vec4 bestValue = ${$};

        for (int i = 0; i < ${e}; i++) {
          inIdx = srcIdx;
          ${k}
          vec4 candidate = ${$};
          bvec4 nan = isnan(candidate);
          bvec4 replace = bvec4(
            vec4(${w}(candidate, bestValue)) * (vec4(1.0) - vec4(nan)));

          bestValue = vec4(replace.x  ? candidate.x : bestValue.x,
                           replace.y  ? candidate.y : bestValue.y,
                           replace.z  ? candidate.z : bestValue.z,
                           replace.w  ? candidate.w : bestValue.w);
          bestIndex = mix(bestIndex, vec4(inIdx), vec4(replace));
          srcIdx++;
        }
        setOutput(bestIndex);
      }
    `}};function Rw(r,t,e,o=null){let n=t.shape[0],s=t.shape[1];o!=null&&(n=o.shape[0],s=o.shape[1]);let a=I.computeOptimalWindowSize(s),i={windowSize:a,inSize:s,batchSize:n,outSize:Math.ceil(s/a)},c=new Gu(i,e,o==null),l=[t];o!=null&&l.push(o);let p=r.runWebGLProgram(c,l,"int32");if(p.shape[1]===1)return p;let u=Rw(r,t,e,p);return r.disposeIntermediateTensorInfo(p),u}function Aw(r,t,e,o=null){let n=o!=null?o.shape:t.shape,s=n[n.length-1],a=I.computeOptimalWindowSize(s),i=new Uu(n,a,e,o==null),c=o==null?[t]:[t,o],l=r.runWebGLProgram(i,c,"int32");if(l.shape.length===t.shape.length){let p=Aw(r,t,e,l);return r.disposeIntermediateTensorInfo(l),p}return l}function Hu(r,t,e,o){let n=[e];if(I.assertAxesAreInnerMostDims("arg"+o.charAt(0).toUpperCase()+o.slice(1),n,t.shape.length),!F().getBool("WEBGL_PACK_REDUCE")||t.shape.length<=2){let s=[],a=r.texData.get(t.dataId),i=a!==null&&a.isPacked,c=t;i&&(c=r.unpackTensor(t),s.push(c));let[l,p]=I.computeOutAndReduceShapes(c.shape,n),u=y.sizeFromShape(p),m=K({inputs:{x:c},backend:r,attrs:{shape:[-1,u]}});s.push(m);let f=Rw(r,m,o);s.push(f);let d=K({inputs:{x:f},backend:r,attrs:{shape:l}});return s.forEach(g=>r.disposeIntermediateTensorInfo(g)),d}return Aw(r,t,o)}function t3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s}=o,a=y.parseAxisParam(s,n.shape),i=I.getAxesPermutation(a,n.shape.length),c=n,l=[];i!=null&&(c=Mt({inputs:{x:n},backend:e,attrs:{perm:i}}),l.push(c),a=I.getInnerMostAxes(a.length,c.shape.length)),I.assertAxesAreInnerMostDims("argMax",[a[0]],c.shape.length);let p=Hu(e,c,a[0],"max");return l.forEach(u=>e.disposeIntermediateTensorInfo(u)),p}var Fw={kernelName:ps,backendName:"webgl",kernelFunc:t3};function e3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s}=o,a=y.parseAxisParam(s,n.shape),i=I.getAxesPermutation(a,n.shape.length),c=n,l=[];i!=null&&(c=Mt({inputs:{x:n},backend:e,attrs:{perm:i}}),l.push(c),a=I.getInnerMostAxes(a.length,c.shape.length)),I.assertAxesAreInnerMostDims("argMin",[a[0]],c.shape.length);let p=Hu(e,c,a[0],"min");return l.forEach(u=>e.disposeIntermediateTensorInfo(u)),p}var Dw={kernelName:us,backendName:"webgl",kernelFunc:e3};var r3=re+`
  if (abs(x) > 1.) {
    return NAN;
  }
  return asin(x);
`,o3=ot({opSnippet:r3}),_w={kernelName:_o,backendName:"webgl",kernelFunc:o3};var n3=re+"return log(x + sqrt(x * x + 1.0));",s3=ot({opSnippet:n3}),Ow={kernelName:Oo,backendName:"webgl",kernelFunc:s3};var a3=re+`
  return atan(x);
`,i3=ot({opSnippet:a3}),Pw={kernelName:Po,backendName:"webgl",kernelFunc:i3};var c3=fc+`
  return atan(a, b);
`,l3=`
  vec4 result = atan(a, b);
  bvec4 isNaNA = isnan(a);
  bvec4 isNaNB = isnan(b);
  bvec4 isNaN = bvec4(isNaNA.x || isNaNB.x, isNaNA.y || isNaNB.y, isNaNA.z || isNaNB.z, isNaNA.w || isNaNB.w);
  `+Zr+`
  return result;
`,p3=Rt({opSnippet:c3,packedOpSnippet:l3}),Lw={kernelName:Mo,backendName:"webgl",kernelFunc:p3};var u3=re+`
  if ((x < -1.0) || (x > 1.0)) return NAN;
return (log(1.0 + x) - log(1.0 - x)) / 2.0;`,m3=ot({opSnippet:u3}),Mw={kernelName:Lo,backendName:"webgl",kernelFunc:m3};var Er=class{constructor(t,e,o,n=!1,s=!1){if(this.variableNames=["x"],e==="avg"&&o)throw new Error("Cannot compute positions for average pool.");let a=t.filterWidth,i=t.strideHeight,c=t.strideWidth,l=t.dilationHeight,p=t.dilationWidth,u=t.effectiveFilterHeight,m=t.effectiveFilterWidth,f=t.padInfo.top,d=t.padInfo.left;this.outputShape=t.outShape;let g=e==="avg",h=`((batch  * ${t.inHeight} + xR) * ${t.inWidth} + xC) * ${t.inChannels} + d`,x=`(xR * ${t.inWidth} + xC) * ${t.inChannels} + d`,b="0.0";if(g||(b="-1.0 / 1e-20"),o){let A=">=";this.userCode=`
        const ivec2 strides = ivec2(${i}, ${c});
        const ivec2 pads = ivec2(${f}, ${d});

        void main() {
          ivec4 coords = getOutputCoords();
          int batch = coords[0];
          int d = coords[3];

          ivec2 xRCCorner = coords.yz * strides - pads;
          int xRCorner = xRCCorner.x;
          int xCCorner = xRCCorner.y;

          // max/min x(?, ?, d) to get y(yR, yC, d).
          // ? = to be determined
          float minMaxValue = 0.0;
          float minMaxValueFound = 0.0;
          int minMaxPosition = 0;
          float avgValue = 0.0;

          for (int wR = 0; wR < ${u};
              wR += ${l}) {
            int xR = xRCorner + wR;

            if (xR < 0 || xR >= ${t.inHeight}) {
              continue;
            }

            for (int wC = 0; wC < ${m};
                wC += ${p}) {
              int xC = xCCorner + wC;

              if (xC < 0 || xC >= ${t.inWidth}) {
                continue;
              }

              float value = getX(batch, xR, xC, d);

              // If a min / max value has already been found, use it. If not,
              // use the current value.
              float currMinMaxValue = mix(
                  value, minMaxValue, minMaxValueFound);
              if (value ${A} currMinMaxValue) {
                minMaxValue = value;
                minMaxValueFound = 1.0;
                minMaxPosition = ${n?s?h:x:`wR * ${m} + wC`};
              }
            }
          }
          setOutput(float(minMaxPosition));
        }
      `;return}let S="max",w=`${e}(${e}(${e}(minMaxValue[0], minMaxValue[1]), minMaxValue[2]), minMaxValue[3])`;e==="avg"&&(w="avgValue / count");let k=Math.floor(a/4)*4,$=a%4,R=`
      if (${g}) {
        avgValue += dot(values, ones);
      } else {
        minMaxValue = ${S}(values, minMaxValue);
      }
    `;this.userCode=`
      const ivec2 strides = ivec2(${i}, ${c});
      const ivec2 pads = ivec2(${f}, ${d});
      const float initializationValue = ${b};
      const vec4 ones = vec4(1.0, 1.0, 1.0, 1.0);

      float count = 0.0;

      float getValue(int batch, int xR, int xC, int d) {
        if (xC < 0 || xC >= ${t.inWidth}) {
          return initializationValue;
        }
        count += 1.0;
        return getX(batch, xR, xC, d);
      }

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords[0];
        int d = coords[3];

        ivec2 xRCCorner = coords.yz * strides - pads;
        int xRCorner = xRCCorner.x;
        int xCCorner = xRCCorner.y;

        // max/min x(?, ?, d) to get y(yR, yC, d).
        // ? = to be determined
        vec4 minMaxValue = vec4(${b});
        float avgValue = 0.0;
        count = 0.0;

        for (int wR = 0; wR < ${u};
            wR += ${l}) {
          int xR = xRCorner + wR;

          if (xR < 0 || xR >= ${t.inHeight}) {
            continue;
          }

          for (int wC = 0; wC < ${k}; wC += 4) {
            int xC = xCCorner + wC * ${p};

            vec4 values = vec4(
              getValue(batch, xR, xC, d),
              getValue(batch, xR, xC + ${p}, d),
              getValue(batch, xR, xC + 2 * ${p}, d),
              getValue(batch, xR, xC + 3 * ${p}, d)
            );

            ${R}
          }

          int xC = xCCorner + ${k};
          if (${$===1}) {
            vec4 values = vec4(
              getValue(batch, xR, xC, d),
              initializationValue,
              initializationValue,
              initializationValue
            );

            ${R}
          } else if (${$===2}) {
            vec4 values = vec4(
              getValue(batch, xR, xC, d),
              getValue(batch, xR, xC + ${p}, d),
              initializationValue,
              initializationValue
            );

            ${R}
          } else if (${$===3}) {
            vec4 values = vec4(
              getValue(batch, xR, xC, d),
              getValue(batch, xR, xC + ${p}, d),
              getValue(batch, xR, xC + 2 * ${p}, d),
              initializationValue
            );

            ${R}
          }
        }
        setOutput(${w});
      }
    `}},es=class{constructor(t,e,o,n=!1,s=!1){if(this.variableNames=["x"],e==="avg"&&o)throw new Error("Cannot compute positions for average pool.");let a=t.filterWidth,i=t.strideDepth,c=t.strideHeight,l=t.strideWidth,p=t.dilationDepth,u=t.dilationHeight,m=t.dilationWidth,f=t.effectiveFilterDepth,d=t.effectiveFilterHeight,g=t.effectiveFilterWidth,h=t.padInfo.front,x=t.padInfo.top,b=t.padInfo.left;this.outputShape=t.outShape;let S=e==="avg",w="0.0";if(S||(w="-1.0 / 1e-20"),o){let _=">=";this.userCode=`
        const ivec3 strides =
            ivec3(${i}, ${c}, ${l});
        const ivec3 pads = ivec3(${h}, ${x}, ${b});

        void main() {
          ivec5 coords = getOutputCoords();
          int batch = coords.x;
          int ch = coords.u;

          ivec3 xCorner = ivec3(coords.y, coords.z, coords.w) * strides - pads;
          int xDCorner = xCorner.x;
          int xRCorner = xCorner.y;
          int xCCorner = xCorner.z;

          // max/min x(?, ?, ?, ch) to get y(yD, yR, yC, ch).
          // ? = to be determined
          float minMaxValue = 0.0;
          float minMaxValueFound = 0.0;
          int minMaxPosition = 0;

          for (int wD = 0; wD < ${f};
              wD += ${p}) {
            int xD = xDCorner + wD;

            if (xD < 0 || xD >= ${t.inDepth}) {
              continue;
            }

            for (int wR = 0; wR < ${d};
                wR += ${u}) {
              int xR = xRCorner + wR;

              if (xR < 0 || xR >= ${t.inHeight}) {
                continue;
              }

              for (int wC = 0; wC < ${g};
                  wC += ${m}) {
                int xC = xCCorner + wC;

                if (xC < 0 || xC >= ${t.inWidth}) {
                  continue;
                }

                float value = getX(batch, xD, xR, xC, ch);

                // If a min / max value has already been found, use it. If not,
                // use the current value.
                float currMinMaxValue = mix(
                    value, minMaxValue, minMaxValueFound);
                if (value ${_} currMinMaxValue) {
                  minMaxValue = value;
                  minMaxValueFound = 1.0;
                  minMaxPosition = ${n?s?`(((batch * ${t.inDepth} + xD) * ${t.inHeight} + xR) * ${t.inWidth} + xC) * ${t.inChannels} + ch`:`((xD * ${t.inHeight} + xR) * ${t.inWidth} + xC) * ${t.inChannels} + ch`:`wD * ${d} * ${g} +
                      wR * ${g} + wC`};
                }
              }
            }
          }
          setOutput(float(minMaxPosition));
        }
      `;return}let k="max",$=`${e}(${e}(${e}(minMaxValue[0], minMaxValue[1]), minMaxValue[2]), minMaxValue[3])`;e==="avg"&&($="avgValue / count");let R=Math.floor(a/4)*4,A=a%4,D=`
      if (${S}) {
        avgValue += dot(values, ones);
      } else {
        minMaxValue = ${k}(values, minMaxValue);
      }
    `;this.userCode=`
      const ivec3 strides =
        ivec3(${i}, ${c}, ${l});
      const ivec3 pads = ivec3(${h}, ${x}, ${b});
      const float initializationValue = ${w};
      const vec4 ones = vec4(1.0, 1.0, 1.0, 1.0);

      float count = 0.0;

      float getValue(int batch, int xD, int xR, int xC, int ch) {
        if (xC < 0 || xC >= ${t.inWidth}) {
          return initializationValue;
        }
        count += 1.0;
        return getX(batch, xD, xR, xC, ch);
      }

      void main() {
        ivec5 coords = getOutputCoords();
        int batch = coords.x;
        int ch = coords.u;

        ivec3 xCorner = ivec3(coords.y, coords.z, coords.w) * strides - pads;
        int xDCorner = xCorner.x;
        int xRCorner = xCorner.y;
        int xCCorner = xCorner.z;

        // max/min x(?, ?, ?, d) to get y(yD, yR, yC, ch).
        // ? = to be determined
        vec4 minMaxValue = vec4(${w});
        float avgValue = 0.0;
        count = 0.0;

        for (int wD = 0; wD < ${f};
            wD += ${p}) {
          int xD = xDCorner + wD;

          if (xD < 0 || xD >= ${t.inDepth}) {
            continue;
          }

          for (int wR = 0; wR < ${d};
            wR += ${u}) {
            int xR = xRCorner + wR;

            if (xR < 0 || xR >= ${t.inHeight}) {
              continue;
            }

            for (int wC = 0; wC < ${R}; wC += 4) {
              int xC = xCCorner + wC * ${m};

              vec4 values = vec4(
                getValue(batch, xD, xR, xC, ch),
                getValue(batch, xD, xR, xC + ${m}, ch),
                getValue(batch, xD, xR, xC + 2 * ${m}, ch),
                getValue(batch, xD, xR, xC + 3 * ${m}, ch)
              );

              ${D}
            }

            int xC = xCCorner + ${R};
            if (${A===1}) {
              vec4 values = vec4(
                getValue(batch, xD, xR, xC, ch),
                initializationValue,
                initializationValue,
                initializationValue
              );

              ${D}
            } else if (${A===2}) {
              vec4 values = vec4(
                getValue(batch, xD, xR, xC, ch),
                getValue(batch, xD, xR, xC + ${m}, ch),
                initializationValue,
                initializationValue
              );

              ${D}
            } else if (${A===3}) {
              vec4 values = vec4(
                getValue(batch, xD, xR, xC, ch),
                getValue(batch, xD, xR, xC + ${m}, ch),
                getValue(batch, xD, xR, xC + 2 * ${m}, ch),
                initializationValue
              );

              ${D}
            }
          }
          setOutput(${$});
        }
      }
    `}};function f3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t;jr(n,"avgPool");let{filterSize:s,strides:a,pad:i,dimRoundingMode:c}=o,l=1;y.assert(I.eitherStridesOrDilationsAreOne(a,l),()=>`Error in avgPool: Either strides or dilations must be 1. Got strides ${a} and dilations '${l}'`);let p=I.computePool2DInfo(n.shape,s,a,l,i,c);if(p.filterWidth===1&&p.filterHeight===1&&y.arraysEqual(p.inShape,p.outShape))return jt({inputs:{x:n},backend:e});let u=new Er(p,"avg",!1);return e.runWebGLProgram(u,[n],"float32")}var Bw={kernelName:ms,backendName:"webgl",kernelFunc:f3};function d3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{filterSize:s,strides:a,pad:i,dimRoundingMode:c,dataFormat:l}=o,p=[1,1,1],u=I.computePool3DInfo(n.shape,s,a,p,i,c,l),m=new es(u,"avg",!1);return e.runWebGLProgram(m,[n],"float32")}var Vw={kernelName:fs,backendName:"webgl",kernelFunc:d3};var Ku=class{constructor(t){this.variableNames=["dy"],this.outputShape=t.inShape;let e=t.filterHeight,o=t.filterWidth,n=t.strideHeight,s=t.strideWidth,a=t.dilationHeight,i=t.dilationWidth,c=t.effectiveFilterHeight,l=t.effectiveFilterWidth,p=c-1-t.padInfo.top,u=l-1-t.padInfo.left,m=1/(e*o);this.userCode=`
      const ivec2 pads = ivec2(${p}, ${u});
      const float avgMultiplier = float(${m});

      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];

        ivec2 dyRCCorner = coords.yz - pads;
        int dyRCorner = dyRCCorner.x;
        int dyCCorner = dyRCCorner.y;

        // Convolve dy(?, ?, d) with pos mask(:, :, d) to get dx(xR, xC, d).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;
        for (int wR = 0; wR < ${c};
            wR += ${a}) {
          float dyR = float(dyRCorner + wR) / ${n}.0;

          if (dyR < 0.0 || dyR >= ${t.outHeight}.0 || fract(dyR) > 0.0) {
            continue;
          }
          int idyR = int(dyR);

          for (int wC = 0; wC < ${l};
            wC+= ${i}) {
            float dyC = float(dyCCorner + wC) / ${s}.0;

            if (dyC < 0.0 || dyC >= ${t.outWidth}.0 ||
                fract(dyC) > 0.0) {
              continue;
            }
            int idyC = int(dyC);

            float dyValue = getDy(b, idyR, idyC, d);

            dotProd += dyValue * avgMultiplier;
          }
        }
        setOutput(dotProd);
      }
    `}},qu=class{constructor(t){this.variableNames=["dy"],this.outputShape=t.inShape;let e=t.filterDepth,o=t.filterHeight,n=t.filterWidth,s=t.strideDepth,a=t.strideHeight,i=t.strideWidth,c=t.dilationDepth,l=t.dilationHeight,p=t.dilationWidth,u=t.effectiveFilterDepth,m=t.effectiveFilterHeight,f=t.effectiveFilterWidth,d=u-1-t.padInfo.front,g=m-1-t.padInfo.top,h=f-1-t.padInfo.left,x=1/(e*o*n);this.userCode=`
      const ivec3 pads = ivec3(${d}, ${g}, ${h});
      const float avgMultiplier = float(${x});

      void main() {
        ivec5 coords = getOutputCoords();
        int batch = coords.x;
        int ch = coords.u;

        ivec3 dyCorner = ivec3(coords.y, coords.z, coords.w) - pads;
        int dyDCorner = dyCorner.x;
        int dyRCorner = dyCorner.y;
        int dyCCorner = dyCorner.z;

        // Convolve dy(?, ?, ?, d) with pos mask(:, :, :, ch) to get
        // dx(xD, xR, xC, ch).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;

        for (int wD = 0; wD < ${u};
            wD += ${c}) {
          float dyD = float(dyDCorner + wD) / ${s}.0;

          if (dyD < 0.0 || dyD >= ${t.outDepth}.0 || fract(dyD) > 0.0) {
            continue;
          }
          int idyD = int(dyD);

          for (int wR = 0; wR < ${m};
              wR += ${l}) {
            float dyR = float(dyRCorner + wR) / ${a}.0;

            if (dyR < 0.0 || dyR >= ${t.outHeight}.0 ||
                fract(dyR) > 0.0) {
              continue;
            }
            int idyR = int(dyR);

            for (int wC = 0; wC < ${f};
                wC += ${p}) {
              float dyC = float(dyCCorner + wC) / ${i}.0;

              if (dyC < 0.0 || dyC >= ${t.outWidth}.0 ||
                  fract(dyC) > 0.0) {
                continue;
              }
              int idyC = int(dyC);

              float dyValue = getDy(batch, idyD, idyR, idyC, ch);

              dotProd += dyValue * avgMultiplier;
            }
          }
        }
        setOutput(dotProd);
      }
    `}};function h3(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,input:s}=t,a=s,{filterSize:i,strides:c,pad:l,dimRoundingMode:p}=o,u=[1,1,1],m=I.computePool3DInfo(a.shape,i,c,u,l,p),f=new qu(m);return e.runWebGLProgram(f,[n],a.dtype)}var zw={kernelName:Fc,backendName:"webgl",kernelFunc:h3};function g3(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,input:s}=t,a=s;jr([n,s],"avgPoolGrad");let{filterSize:i,strides:c,pad:l}=o,p=I.computePool2DInfo(a.shape,i,c,1,l),u=new Ku(p);return e.runWebGLProgram(u,[n],a.dtype)}var Ww={kernelName:Ac,backendName:"webgl",kernelFunc:g3};function x3(r){let{inputs:t,backend:e,attrs:o}=r,{a:n,b:s}=t,{transposeA:a,transposeB:i}=o;return Si({a:n,b:s,transposeA:a,transposeB:i,backend:e})}var Gw={kernelName:ds,backendName:"webgl",kernelFunc:x3};var Xu=class{constructor(t,e,o,n,s,a){this.outputShape=[],this.variableNames=["x","mean","variance"],I.assertAndGetBroadcastShape(t,e),I.assertAndGetBroadcastShape(t,o);let i="0.0";n!=null&&(I.assertAndGetBroadcastShape(t,n),this.variableNames.push("offset"),i="getOffsetAtOutCoords()");let c="1.0";s!=null&&(I.assertAndGetBroadcastShape(t,s),this.variableNames.push("scale"),c="getScaleAtOutCoords()"),this.outputShape=t,this.userCode=`
      void main() {
        float x = getXAtOutCoords();
        float mean = getMeanAtOutCoords();
        float variance = getVarianceAtOutCoords();
        float offset = ${i};
        float scale = ${c};
        float inv = scale * inversesqrt(variance + float(${a}));
        setOutput(dot(vec3(x, -mean, offset), vec3(inv, inv, 1)));
      }
    `}};var ju=class{constructor(t,e,o,n,s,a){this.packedInputs=!0,this.packedOutput=!0,this.variableNames=["x","mean","variance"],I.assertAndGetBroadcastShape(t,e),I.assertAndGetBroadcastShape(t,o);let i="vec4(0.0)";n!=null&&(I.assertAndGetBroadcastShape(t,n),this.variableNames.push("offset"),i="getOffsetAtOutCoords()");let c="vec4(1.0)";s!=null&&(I.assertAndGetBroadcastShape(t,s),this.variableNames.push("scale"),c="getScaleAtOutCoords()"),this.outputShape=t,this.userCode=`
      void main() {
        vec4 offset = ${i};
        vec4 scale = ${c};

        vec4 x = getXAtOutCoords();
        vec4 mean = getMeanAtOutCoords();
        vec4 variance = getVarianceAtOutCoords();

        vec4 inv = scale * inversesqrt(variance + vec4(${a}));

        setOutput((x - mean) * inv + offset);
      }
    `}};var y3=({inputs:r,backend:t,attrs:e})=>{let{x:o,mean:n,variance:s,offset:a,scale:i}=r;y.assert(n.shape.length===s.shape.length,()=>"Batch normalization gradient requires mean and variance to have equal ranks."),y.assert(a==null||n.shape.length===a.shape.length,()=>"Batch normalization gradient requires mean and offset to have equal ranks."),y.assert(i==null||n.shape.length===i.shape.length,()=>"Batch normalization gradient requires mean and scale to have equal ranks.");let{varianceEpsilon:c}=e;c==null&&(c=.001);let l=[o,n,s],p=null;a!=null&&(p=a.shape,l.push(a));let u=null;i!=null&&(u=i.shape,l.push(i));let m=F().getBool("WEBGL_PACK_NORMALIZATION")?new ju(o.shape,n.shape,s.shape,p,u,c):new Xu(o.shape,n.shape,s.shape,p,u,c);return t.runWebGLProgram(m,l,l[0].dtype)},Uw={kernelName:zs,backendName:"webgl",kernelFunc:y3};var Yu=class{constructor(t){this.variableNames=["source"],this.outputShape=t,this.rank=t.length;let e=dt(this.rank);this.customUniforms=[{name:"start",arrayIndex:this.rank,type:"int"}];let o=b3(this.rank),n,s=t.map((a,i)=>`sourceLoc.${Ax[i]} = start[${i}] + coords.${Ax[i]};`);n=`
        ${e} sourceLoc;
        ${e} coords = getOutputCoords();
        ${s.join(`
`)}
      `,this.userCode=`
      void main() {
        ${n}
        setOutput(getSource(${o}));
      }
    `}},Ax=["x","y","z","w","u","v"];function b3(r){if(r===1)return"sourceLoc";if(r<=6)return Ax.slice(0,r).map(t=>"sourceLoc."+t).join(",");throw Error(`Slicing for rank ${r} is not yet supported`)}var Zu=class{constructor(t){this.variableNames=["source"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=t,this.rank=t.length,this.customUniforms=[{name:"start",arrayIndex:this.rank,type:"int"}];let e=dt(this.rank),o=Xt("coords",this.rank),n=Xt("sourceLoc",this.rank),s=this.rank===1?"sourceLoc":`vec2(${n.slice(-2).join()})`,a=`getChannel(getSource(${n.join()}), ${s})`,i=`
      result.x = ${a};
      if (++${o[this.rank-1]} < ${t[this.rank-1]}) {
        ++${n[this.rank-1]};
        result.y = ${a};
        --${n[this.rank-1]};
      }
    `,c=this.rank===1?"":`
      --${o[this.rank-1]};
      if (++${o[this.rank-2]} < ${t[this.rank-2]}) {
        ++${n[this.rank-2]};
        result.z = ${a};
        if (++${o[this.rank-1]} < ${t[this.rank-1]}) {
          ++${n[this.rank-1]};
          result.w = ${a};
        }
      }
    `,l=this.rank<=4?`sourceLoc = coords +
            ${e}(${t.map((p,u)=>`start[${u}]`).join()});`:t.map((p,u)=>`${n[u]} = ${o[u]} + start[${u}];`).join(`
`);this.userCode=`
      void main() {
        ${e} coords = getOutputCoords();
        ${e} sourceLoc;
        ${l}
        vec4 result = vec4(0.);
        ${i}
        ${c}
        setOutput(result);
      }
    `}};function C3(r,t,e,o){let n=o.texData.get(r.dataId),s=o.makeTensorInfo(e,r.dtype),a=o.texData.get(s.dataId);Object.assign(a,n),a.refCount=1,a.shape=e,a.dtype=r.dtype;let i=ne.computeFlatOffset(t,y.computeStrides(r.shape));n.slice&&(i+=n.slice.flatOffset),a.slice={flatOffset:i,origDataId:n.slice&&n.slice.origDataId||r.dataId};let c=o.dataRefCount.get(a.slice.origDataId)||1;return o.dataRefCount.set(a.slice.origDataId,c+1),s}function $r(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{begin:s,size:a}=o,[i,c]=ne.parseSliceParams(n,s,a);if(ne.assertParamsValid(n,i,c),y.sizeFromShape(c)===0)return e.makeTensorInfo(c,n.dtype,[]);if(e.shouldExecuteOnCPU([n])||n.dtype==="string"){let u=e.texData.get(n.dataId),m=PS(u.values,i,c,n.shape,n.dtype);return e.makeTensorInfo(c,n.dtype,m)}let{isPacked:l}=e.texData.get(n.dataId),p=ne.isSliceContinous(n.shape,i,c);if(l||!p){let u=F().getBool("WEBGL_PACK_ARRAY_OPERATIONS")?new Zu(c):new Yu(c),m=[i];return e.runWebGLProgram(u,[n],n.dtype,m)}return e.uploadToGPU(n.dataId),C3(n,i,c,e)}var Hw={kernelName:Na,backendName:"webgl",kernelFunc:$r};var T3=r=>{let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{blockShape:s,crops:a}=o;y.assert(n.shape.length<=4,()=>"batchToSpaceND for rank > 4 with a WebGL backend not implemented yet");let i=s.reduce((b,S)=>b*S),c=I.getReshaped(n.shape,s,i),l=I.getPermuted(c.length,s.length),p=I.getReshapedPermuted(n.shape,s,i),u=I.getSliceBeginCoords(a,s.length),m=I.getSliceSize(p,a,s.length),f=[],d=K({inputs:{x:n},backend:e,attrs:{shape:c}}),g=Mt({inputs:{x:d},backend:e,attrs:{perm:l}}),h=K({inputs:{x:g},backend:e,attrs:{shape:p}}),x=$r({inputs:{x:h},backend:e,attrs:{begin:u,size:m}});return f.push(d),f.push(g),f.push(h),f.forEach(b=>e.disposeIntermediateTensorInfo(b)),x},Kw={kernelName:hs,backendName:"webgl",kernelFunc:T3};function S3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,weights:s}=t,{size:a}=o,i=e.readSync(n.dataId),c=e.readSync(s.dataId),l=Ru(i,c,s.dtype,s.shape,a);return e.makeTensorInfo([a],s.dtype,l)}var qw={kernelName:gs,backendName:"webgl",kernelFunc:S3};function w3(r){let{inputs:t,backend:e}=r,{s0:o,s1:n}=t,s=e.readSync(o.dataId),a=e.readSync(n.dataId),i=I.assertAndGetBroadcastShape(Array.from(s),Array.from(a));return e.makeTensorInfo([i.length],"int32",Int32Array.from(i))}var Xw={kernelName:xs,backendName:"webgl",kernelFunc:w3};var N3="return float(a != b);",Fx=Rt({opSnippet:N3,cpuKernelImpl:ES,dtype:"bool"}),jw={kernelName:dn,backendName:"webgl",kernelFunc:Fx};function wo(r){let{inputs:t,backend:e}=r,{input:o}=t,n=e.texData.get(o.dataId);return jt({inputs:{x:n.complexTensorInfos.real},backend:e})}var Yw={kernelName:ga,backendName:"webgl",kernelFunc:wo};var I3="return float(int(x));";function Zw(r,t){let e=new Ie(r.shape,I3),o=t.runWebGLProgram(e,[r],"int32");return{dataId:o.dataId,shape:o.shape,dtype:o.dtype}}function Dx(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{dtype:s}=o;if(s==="complex64"){if(n.dtype==="complex64")return jt({inputs:{x:n},backend:e});let a=je(n.shape),i=Dx({inputs:{x:n},backend:e,attrs:{dtype:"float32"}}),c=_e({inputs:{real:i,imag:a},backend:e});return a.dispose(),e.disposeIntermediateTensorInfo(i),c}if(n.dtype==="complex64"){let a=wo({inputs:{input:n},backend:e}),i=Dx({inputs:{x:a},backend:e,attrs:{dtype:s}});return e.disposeIntermediateTensorInfo(a),i}if(!y.hasEncodingLoss(n.dtype,s)){let a=jt({inputs:{x:n},backend:e});return{dataId:a.dataId,shape:a.shape,dtype:s}}if(e.shouldExecuteOnCPU([n])){let a=e.texData.get(n.dataId).values,[i,c,l]=cS(a,n.shape,n.dtype,s);return e.makeTensorInfo(i,c,l)}if(s==="int32")return Zw(n,e);if(s==="bool"){let a=e.makeTensorInfo([],"bool",y.getTypedArrayFromDType("bool",1)),c=Fx({inputs:{a:n,b:a},backend:e});return e.disposeIntermediateTensorInfo(a),c}throw new Error(`Error in Cast: failed to cast ${n.dtype} to ${s}`)}var Qw={kernelName:oo,backendName:"webgl",kernelFunc:Dx};var Jw="return ceil(x);",v3=ot({opSnippet:Jw,packedOpSnippet:Jw,cpuKernelImpl:lS}),tN={kernelName:Bo,backendName:"webgl",kernelFunc:v3};var Qu=class{constructor(t){this.variableNames=["A"],this.customUniforms=[{name:"minVal",type:"float"},{name:"maxVal",type:"float"}],this.outputShape=t,this.userCode=`

      void main() {
        float value = getAAtOutCoords();
        if (isnan(value)) {
          setOutput(value);
          return;
        }

        setOutput(clamp(value, minVal, maxVal));
      }
    `}};var Ju=class{constructor(t){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.customUniforms=[{name:"minVal",type:"float"},{name:"maxVal",type:"float"}],this.outputShape=t,this.userCode=`
      void main() {
        vec4 value = getAAtOutCoords();

        if (any(isnan(value))) {
          setOutput(value);
          return;
        }

        setOutput(clamp(value, vec4(minVal), vec4(maxVal)));
      }
    `}};function k3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{clipValueMin:s,clipValueMax:a}=o,i;F().getBool("WEBGL_PACK_CLIP")?i=new Ju(n.shape):i=new Qu(n.shape);let c=[[s],[a]];return e.runWebGLProgram(i,[n],n.dtype,c)}var eN={kernelName:Vo,backendName:"webgl",kernelFunc:k3};var tm=class{constructor(t){this.variableNames=["real","imag"],this.outputShape=t,this.userCode=`
      void main() {
        float re = abs(getRealAtOutCoords());
        float im = abs(getImagAtOutCoords());
        float mx = max(re, im);

        // sadly the length function in glsl is not underflow-safe
        // (at least not on Intel GPUs). So the safe solution is
        // to ensure underflow-safety in all cases.
        setOutput(
          mx == 0.0 ? 0.0 : mx * length(vec2(1, min(re, im)/mx))
        );
      }
    `}};function rN(r,t){return{dataId:t.dataId,dtype:t.dtype,shape:r.shape}}function E3(r){let{inputs:t,backend:e}=r,{x:o}=t,n=e.texData.get(o.dataId),s=new tm(o.shape),a=[rN(o,n.complexTensorInfos.real),rN(o,n.complexTensorInfos.imag)];return e.runWebGLProgram(s,a,a[0].dtype)}var oN={kernelName:bs,backendName:"webgl",kernelFunc:E3};var em=class{constructor(t){this.outputShape=[],this.outputShape=I.computeOutShape(t,1),this.variableNames=t.map((a,i)=>`T${i}`);let e=new Array(t.length-1);e[0]=t[0][1];for(let a=1;a<e.length;a++)e[a]=e[a-1]+t[a][1];let o=[`if (yC < ${e[0]}) setOutput(getT0(yR, yC));`];for(let a=1;a<e.length;a++){let i=e[a-1];o.push(`else if (yC < ${e[a]}) setOutput(getT${a}(yR, yC-${i}));`)}let n=e.length,s=e[e.length-1];o.push(`else setOutput(getT${n}(yR, yC-${s}));`),this.userCode=`
      void main() {
        ivec2 coords = getOutputCoords();
        int yR = coords.x;
        int yC = coords.y;

        ${o.join(`
        `)}
      }
    `}};var om=class{constructor(t,e){this.packedInputs=!0,this.packedOutput=!0,this.outputShape=[],this.outputShape=I.computeOutShape(t,e);let o=this.outputShape,n=o.length,s=dt(n),a=Xt("coords",n),i=["x","y","z","w","u","v"].slice(0,n);this.variableNames=t.map((g,h)=>`T${h}`);let c=new Array(t.length-1);c[0]=t[0][e];for(let g=1;g<c.length;g++)c[g]=c[g-1]+t[g][e];let l=i[e],p=i.slice(-2),u=i.join(),m=`if (${l} < ${c[0]}) {
        return getChannel(
            getT0(${u}), vec2(${p.join()}));
        }`;for(let g=1;g<c.length;g++){let h=c[g-1];m+=`
        if (${l} < ${c[g]}  && ${l} >= ${c[g-1]}) {
          return getChannel(
            getT${g}(${rm(i,l,h)}),
            vec2(${rm(p,l,h)}));
        }`}let f=c.length,d=c[c.length-1];m+=`
        return getChannel(
          getT${f}(${rm(i,l,d)}),
          vec2(${rm(p,l,d)}));`,this.userCode=`
      float getValue(${i.map(g=>"int "+g)}) {
        ${m}
      }

      void main() {
        ${s} coords = getOutputCoords();
        vec4 result = vec4(getValue(${a}), 0., 0., 0.);

        ${a[n-1]} = ${a[n-1]} + 1;
        if (${a[n-1]} < ${o[n-1]}) {
          result.g = getValue(${a});
        }

        ${a[n-2]} = ${a[n-2]} + 1;
        if (${a[n-2]} < ${o[n-2]}) {
          result.a = getValue(${a});
        }

        ${a[n-1]} = ${a[n-1]} - 1;
        if (${a[n-2]} < ${o[n-2]} &&
            ${a[n-1]} < ${o[n-1]}) {
          result.b = getValue(${a});
        }
        setOutput(result);
      }
    `}};function rm(r,t,e){let o=r.indexOf(t);return r.map((s,a)=>a===o?`${s} - ${e}`:s).join()}function wi(r){let{inputs:t,backend:e}=r,{input:o}=t,n=e.texData.get(o.dataId);return jt({inputs:{x:n.complexTensorInfos.imag},backend:e})}var nN={kernelName:Hs,backendName:"webgl",kernelFunc:wi};function hc(r,t,e){let o=r[0].dtype;if(o==="complex64"){let u=r.map(h=>wo({inputs:{input:h},backend:e})),m=r.map(h=>wi({inputs:{input:h},backend:e})),f=hc(u,t,e),d=hc(m,t,e),g=_e({inputs:{real:f,imag:d},backend:e});return u.forEach(h=>e.disposeIntermediateTensorInfo(h)),m.forEach(h=>e.disposeIntermediateTensorInfo(h)),e.disposeIntermediateTensorInfo(f),e.disposeIntermediateTensorInfo(d),g}let n=e.shouldExecuteOnCPU(r);if(o==="string"&&(n=!0),n){let u=r.map(b=>{let w=[-1,y.sizeFromShape(b.shape.slice(t))];return K({inputs:{x:b},backend:e,attrs:{shape:w}})}),m=u.map(b=>({vals:e.readSync(b.dataId),shape:b.shape})),f=I.computeOutShape(u.map(b=>b.shape),1),d=u[0].shape[0]===1,g=pS(m,f,o,d),h=I.computeOutShape(r.map(b=>b.shape),t),x=e.makeTensorInfo(h,o,g);return u.forEach(b=>e.disposeIntermediateTensorInfo(b)),x}let s=F().getNumber("WEBGL_MAX_TEXTURES_IN_SHADER");if(r.length>s){let u=[];for(let f=0;f<r.length;f+=s){let d=r.slice(f,f+s);u.push(hc(d,t,e))}let m=hc(u,t,e);for(let f of u)e.disposeIntermediateTensorInfo(f);return m}if(F().getBool("WEBGL_PACK_ARRAY_OPERATIONS")&&r[0].shape.length>1){let u=new om(r.map(m=>m.shape),t);return e.runWebGLProgram(u,r,o)}let{tensors2D:a,outShape:i}=$3(r,t,e),c=new em(a.map(u=>u.shape)),l=e.runWebGLProgram(c,a,o);a.forEach(u=>e.disposeIntermediateTensorInfo(u));let p=K({inputs:{x:l},attrs:{shape:i},backend:e});return e.disposeIntermediateTensorInfo(l),p}function $3(r,t,e){let o=I.computeOutShape(r.map(s=>s.shape),t);return{tensors2D:r.map(s=>K({inputs:{x:s},attrs:{shape:[-1,y.sizeFromShape(s.shape.slice(t))]},backend:e})),outShape:o}}function _x(r){let{inputs:t,backend:e,attrs:o}=r,{axis:n}=o,s=y.parseAxisParam(n,t[0].shape)[0],a=t.map(l=>l.shape);I.assertParamsConsistent(a,s);let i=I.computeOutShape(t.map(l=>l.shape),s);if(y.sizeFromShape(i)===0)return e.makeTensorInfo(i,t[0].dtype,[]);let c=t.filter(l=>y.sizeFromShape(l.shape)>0);return c.length===1?jt({inputs:{x:c[0]},backend:e}):hc(c,s,e)}var sN={kernelName:Cs,backendName:"webgl",kernelFunc:_x};var gc=class{constructor(t,e=!1,o=null,n=!1,s=!1){this.variableNames=["x","W"],this.outputShape=t.outShape;let a=t.padInfo.top,i=t.padInfo.left,c=t.strideHeight,l=t.strideWidth,p=t.dilationHeight,u=t.dilationWidth,m=t.filterHeight,f=t.filterWidth,d=Math.floor(t.inChannels/4)*4,g=t.inChannels%4,h=t.dataFormat==="channelsLast",x=h?1:2,b=h?2:3,S=h?3:1,w="",k="";o&&(n?w=`float activation(float a) {
          float b = getPreluActivationWeightsAtOutCoords();
          ${o}
        }`:s?w=`float activation(float a) {
          float b = getLeakyreluAlphaAtOutCoords();
          ${o}
        }`:w=`
          float activation(float x) {
            ${o}
          }
        `,k="result = activation(result);");let $=e?"result += getBiasAtOutCoords();":"";e&&this.variableNames.push("bias"),n&&this.variableNames.push("preluActivationWeights"),s&&this.variableNames.push("leakyreluAlpha"),this.userCode=`
      ${w}

      const ivec2 strides = ivec2(${c}, ${l});
      const ivec2 pads = ivec2(${a}, ${i});

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords[0];
        int d2 = coords[${S}];

        ivec2 xRCCorner =
            ivec2(coords[${x}], coords[${b}]) * strides - pads;
        int xRCorner = xRCCorner.x;
        int xCCorner = xRCCorner.y;

        // Convolve x(?, ?, d1) with w(:, :, d1, d2) to get y(yR, yC, d2).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;
        for (int wR = 0; wR < ${m}; wR++) {
          int xR = xRCorner + wR * ${p};

          if (xR < 0 || xR >= ${t.inHeight}) {
            continue;
          }

          for (int wC = 0; wC < ${f}; wC++) {
            int xC = xCCorner + wC * ${u};

            if (xC < 0 || xC >= ${t.inWidth}) {
              continue;
            }

            for (int d1 = 0; d1 < ${d}; d1 += 4) {
              vec4 wValues = vec4(
                getW(wR, wC, d1, d2),
                getW(wR, wC, d1 + 1, d2),
                getW(wR, wC, d1 + 2, d2),
                getW(wR, wC, d1 + 3, d2)
              );

              if (${h}) {
                vec4 xValues = vec4(
                  getX(batch, xR, xC, d1),
                  getX(batch, xR, xC, d1 + 1),
                  getX(batch, xR, xC, d1 + 2),
                  getX(batch, xR, xC, d1 + 3)
                );
                dotProd += dot(xValues, wValues);
              } else {
                vec4 xValues = vec4(
                  getX(batch, d1, xR, xC),
                  getX(batch, d1 + 1, xR, xC),
                  getX(batch, d1 + 2, xR, xC),
                  getX(batch, d1 + 3, xR, xC)
                );
                dotProd += dot(xValues, wValues);
              }
            }

            if (${g===1}) {

              if (${h}) {
                dotProd +=
                    getX(batch, xR, xC, ${d}) *
                    getW(wR, wC, ${d}, d2);
              } else {
                dotProd +=
                    getX(batch, ${d}, xR, xC) *
                    getW(wR, wC, ${d}, d2);
              }

            } else if (${g===2}) {
              vec2 wValues = vec2(
                getW(wR, wC, ${d}, d2),
                getW(wR, wC, ${d} + 1, d2)
              );

              if (${h}) {
                vec2 xValues = vec2(
                  getX(batch, xR, xC, ${d}),
                  getX(batch, xR, xC, ${d} + 1)
                );
                dotProd += dot(xValues, wValues);
              } else {
                vec2 xValues = vec2(
                  getX(batch, ${d}, xR, xC),
                  getX(batch, ${d} + 1, xR, xC)
                );
                dotProd += dot(xValues, wValues);
              }

            } else if (${g===3}) {
              vec3 wValues = vec3(
                getW(wR, wC, ${d}, d2),
                getW(wR, wC, ${d} + 1, d2),
                getW(wR, wC, ${d} + 2, d2)
              );

              if (${h}) {
                vec3 xValues = vec3(
                  getX(batch, xR, xC, ${d}),
                  getX(batch, xR, xC, ${d} + 1),
                  getX(batch, xR, xC, ${d} + 2)
                );
                dotProd += dot(xValues, wValues);
              } else {
                vec3 xValues = vec3(
                  getX(batch, ${d}, xR, xC),
                  getX(batch, ${d} + 1, xR, xC),
                  getX(batch, ${d} + 2, xR, xC)
                );
                dotProd += dot(xValues, wValues);
              }

            }
          }
        }

        float result = dotProd;
        ${$}
        ${k}
        setOutput(result);
      }
    `}},nm=class{constructor(t){this.variableNames=["x","W"],this.outputShape=t.outShape;let e=t.padInfo.front,o=t.padInfo.top,n=t.padInfo.left,s=t.strideDepth,a=t.strideHeight,i=t.strideWidth,c=t.dilationDepth,l=t.dilationHeight,p=t.dilationWidth,u=t.filterDepth,m=t.filterHeight,f=t.filterWidth,d=Math.floor(t.inChannels/4)*4,g=t.inChannels%4;this.userCode=`
      const ivec3 strides = ivec3(${s}, ${a}, ${i});
      const ivec3 pads = ivec3(${e}, ${o}, ${n});

      void main() {
        ivec5 coords = getOutputCoords();
        int batch = coords.x;
        int d2 = coords.u;

        ivec3 xFRCCorner = ivec3(coords.y, coords.z, coords.w) * strides - pads;
        int xFCorner = xFRCCorner.x;
        int xRCorner = xFRCCorner.y;
        int xCCorner = xFRCCorner.z;

        // Convolve x(?, ?, ?, d1) with w(:, :, :, d1, d2) to get
        // y(yF, yR, yC, d2). ? = to be determined. : = across all
        // values in that axis.
        float dotProd = 0.0;
        for (int wF = 0; wF < ${u}; wF++) {
          int xF = xFCorner + wF * ${c};

          if (xF < 0 || xF >= ${t.inDepth}) {
            continue;
          }

          for (int wR = 0; wR < ${m}; wR++) {
            int xR = xRCorner + wR * ${l};

            if (xR < 0 || xR >= ${t.inHeight}) {
              continue;
            }

            for (int wC = 0; wC < ${f}; wC++) {
              int xC = xCCorner + wC * ${p};

              if (xC < 0 || xC >= ${t.inWidth}) {
                continue;
              }

              for (int d1 = 0; d1 < ${d}; d1 += 4) {
                vec4 xValues = vec4(
                  getX(batch, xF, xR, xC, d1),
                  getX(batch, xF, xR, xC, d1 + 1),
                  getX(batch, xF, xR, xC, d1 + 2),
                  getX(batch, xF, xR, xC, d1 + 3)
                );
                vec4 wValues = vec4(
                  getW(wF, wR, wC, d1, d2),
                  getW(wF, wR, wC, d1 + 1, d2),
                  getW(wF, wR, wC, d1 + 2, d2),
                  getW(wF, wR, wC, d1 + 3, d2)
                );

                dotProd += dot(xValues, wValues);
              }

              if (${g===1}) {
                dotProd +=
                  getX(batch, xF, xR, xC, ${d}) *
                  getW(wF, wR, wC, ${d}, d2);
              } else if (${g===2}) {
                vec2 xValues = vec2(
                  getX(batch, xF, xR, xC, ${d}),
                  getX(batch, xF, xR, xC, ${d} + 1)
                );
                vec2 wValues = vec2(
                  getW(wF, wR, wC, ${d}, d2),
                  getW(wF, wR, wC, ${d} + 1, d2)
                );
                dotProd += dot(xValues, wValues);
              } else if (${g===3}) {
                vec3 xValues = vec3(
                  getX(batch, xF, xR, xC, ${d}),
                  getX(batch, xF, xR, xC, ${d} + 1),
                  getX(batch, xF, xR, xC, ${d} + 2)
                );
                vec3 wValues = vec3(
                  getW(wF, wR, wC, ${d}, d2),
                  getW(wF, wR, wC, ${d} + 1, d2),
                  getW(wF, wR, wC, ${d} + 2, d2)
                );
                dotProd += dot(xValues, wValues);
              }
            }
          }
        }
        setOutput(dotProd);
      }
    `}};var xc=class{constructor(t,e=!1,o=null,n=!1,s=!1){this.variableNames=["x","W"],this.packedInputs=!0,this.packedOutput=!0,this.customUniforms=[{name:"pads",type:"ivec2"},{name:"strides",type:"ivec2"},{name:"dilations",type:"ivec2"},{name:"inDims",type:"ivec2"}],this.outputShape=t.outShape,this.enableShapeUniforms=Dt(this.outputShape.length);let a=t.padInfo.left,i=t.strideWidth,c=t.dilationWidth,l=t.filterHeight,p=t.filterWidth,u=p,m=`
       int xR; int xC; int xCOffset;
       vec4 wTexel; vec4 previous; vec4 final;`;for(let h=0;h<p;h++)m+=`
           vec4 xTexelC${h*2};
           int xTexelC${h*2}Ready;
           vec4 xTexelC${h*2+1};
           int xTexelC${h*2+1}Ready;
           vec4 xC${h};`;m+=`
     for (int r = 0; r < ${l}; r++) {
      for (int d1 = 0; d1 < ${t.inChannels}; d1 += 2) {
       `;for(let h=0;h<p;h++)m+=`
           xTexelC${h*2} = vec4(0.0);
           xTexelC${h*2}Ready = 0;
           xTexelC${h*2+1} = vec4(0.0);
           xTexelC${h*2+1}Ready = 0;
           xC${h} = vec4(0.0);`;m+=`
         xR = xRCorner + r * dilations[0];
         if (xR >=0 && xR < inDims[0]) {
       `;for(let h=0;h<(u+1)/2;h++){let x=h*2;if(m+=`
           xC = xCCorner + ${x*c};
           `,i===1){if(x<p&&(a%2===1?(m+=`
                 xCOffset = xC + 1;
                 if (xCOffset >= 0 && xCOffset < inDims[1] && xTexelC${x}Ready == 0) {
                   xTexelC${x} = getX(batch, xR, xCOffset, d1);

                   // Need to manually clear unused channels in case
                   // we're reading from recycled texture.
                   if (xCOffset + 1 >= inDims[1]) {
                     xTexelC${x}.zw = vec2(0.0);
                   }
                   xTexelC${x}Ready = 1;
                 }
               `,c===1&&x>0?m+=`
                 xC${x} = vec4(xTexelC${x-2}.zw, xTexelC${x}.xy);
                 `:m+=`
                   xCOffset = xC + 1 - 2;

                   if (xCOffset >= 0 && xCOffset < inDims[1]) {
                     previous = getX(batch, xR, xCOffset, d1);

                     // Need to manually clear unused channels in case
                     // we're reading from recycled texture.
                     if (xCOffset + 1 >= inDims[1]) {
                       previous.zw = vec2(0.0);
                     }

                     xC${x} = vec4(previous.zw, xTexelC${x}.xy);
                   } else {
                     xC${x} = vec4(0.0, 0.0, xTexelC${x}.xy);
                   }
                   `):m+=`
                 if (xC >= 0 && xC < inDims[1] && xTexelC${x}Ready == 0) {
                   xTexelC${x} = getX(batch, xR, xC, d1);
                   if (xC + 1 >= inDims[1]) {
                     xTexelC${x}.zw = vec2(0.0);
                   }
                   xTexelC${x}Ready = 1;
                 }

                 xC${x} = xTexelC${x};
                 `,x+1<p)){let b=a%2===0?y.nearestLargerEven(c):c;c%2===0&&a%2===1||c%2!==0&&a%2!==1?(m+=`
                   xCOffset = xC + imod(pads[1], 2) + ${b};

                   if (xCOffset >= 0 && xCOffset < inDims[1] && xTexelC${x+1}Ready == 0) {
                     xTexelC${x+1} = getX(batch, xR, xCOffset, d1);

                     // Need to manually clear unused channels in case
                     // we're reading from recycled texture.
                     if (xCOffset + 1 >= inDims[1]) {
                       xTexelC${x+1}.zw = vec2(0.0);
                     }
                     xTexelC${x+1}Ready = 1;
                   }
                   `,c>1?m+=`
                     xCOffset -= 2;
                     if (xCOffset >= 0 && xCOffset < inDims[1]) {
                      previous = getX(batch, xR, xCOffset, d1);
                      xC${x+1} = vec4(previous.zw, xTexelC${x+1}.xy);
                     } else {
                      xC${x+1} = vec4(0.0, 0.0, xTexelC${x+1}.xy);
                     }
                     `:m+=`
                     xC${x+1} = vec4(xTexelC${x}.zw, xTexelC${x+1}.xy);
                     `):b===1?m+=`
                     xC${x+1} = xTexelC${x};
                     `:m+=`
                     xCOffset = xC + ${b};

                     if (xCOffset >= 0 && xCOffset < inDims[1] && xTexelC${x+1}Ready == 0) {
                       xTexelC${x+1} = getX(batch, xR, xCOffset, d1);
                       if (xCOffset + 1 >= inDims[1]) {
                         xTexelC${x+1}.zw = vec2(0.0);
                       }
                       xTexelC${x+1}Ready = 1;
                     }

                     xC${x+1} = xTexelC${x+1};
                     `}}else x<p&&(a%2===1?(m+=`
                 xCOffset = xC + 1 - strides[1];
                 if(xCOffset >= 0 && xCOffset < inDims[1] && xTexelC${x}Ready == 0) {
                   xTexelC${x} = getX(batch, xR, xCOffset, d1);
                   // Need to manually clear unused channels in case
                   // we're reading from recycled texture.
                   if (xCOffset + 1 >= inDims[1]) {
                     xTexelC${x}.zw = vec2(0.0);
                   }
                   xTexelC${x}Ready = 1;
                 }

                 if(xC + 1 >= 0 && xC + 1 < inDims[1] && xTexelC${x+1}Ready == 0) {
                   xTexelC${x+1} = getX(batch, xR, xC + 1, d1);
                   // Need to manually clear unused channels in case
                   // we're reading from recycled texture.
                   if (xC + 2 >= inDims[1]) {
                     xTexelC${x+1}.zw = vec2(0.0);
                   }
                   xTexelC${x+1}Ready = 1;
                 }

                 xC${x} = vec4(xTexelC${x}.zw, xTexelC${x+1}.zw);
               `,x+1<p&&(m+=`
                   final = vec4(0.0);
                   xCOffset = xC + 1 + strides[1];
                   if(xCOffset >= 0 && xCOffset < inDims[1]) {
                     final = getX(batch, xR, xCOffset, d1);
                   }
                   xC${x+1} = vec4(xTexelC${x+1}.xy, final.xy);
                 `)):(m+=`
                 if(xC >= 0 && xC < inDims[1] && xTexelC${x}Ready == 0) {
                   xTexelC${x} = getX(batch, xR, xC, d1);
                   if (xC + 1 >= inDims[1]) {
                     xTexelC${x}.zw = vec2(0.0);
                   }
                   xTexelC${x}Ready = 1;
                 }

                 xCOffset = xC + strides[1];
                 if(xCOffset >= 0 && xCOffset < inDims[1] && xTexelC${x+1}Ready == 0) {
                   xTexelC${x+1} = getX(batch, xR, xCOffset, d1);
                   if (xCOffset + 1 >= inDims[1]) {
                     xTexelC${x+1}.zw = vec2(0.);
                   }
                   xTexelC${x+1}Ready = 1;
                 }

                 xC${x} = vec4(
                   xTexelC${x}.xy, xTexelC${x+1}.xy);
               `,x+1<p&&(m+=`
                   xC${x+1} = vec4(xTexelC${x}.zw, xTexelC${x+1}.zw);
                 `)));x<p&&(m+=`
             wTexel = getW(r, ${x}, d1, d2);
             dotProd += xC${x}.xxzz * vec4(wTexel.xy, wTexel.xy);
             if(d1 + 1 < ${t.inChannels}) {
               dotProd += xC${x}.yyww * vec4(wTexel.zw, wTexel.zw);
             }
           `,x+1<p&&(m+=`
               wTexel = getW(r, ${x+1}, d1, d2);
               dotProd += xC${x+1}.xxzz * vec4(wTexel.xy, wTexel.xy);
               if(d1 + 1 < ${t.inChannels}) {
                 dotProd += xC${x+1}.yyww * vec4(wTexel.zw, wTexel.zw);
               }
             `))}m+=`
     }
   `,m+=`
     }
   `,m+=`
     }
   `;let f="",d="";o&&(n?f=`vec4 activation(vec4 a) {
           vec4 b = getPreluActivationWeightsAtOutCoords();
           ${o}
         }`:s?f=`vec4 activation(vec4 a) {
           vec4 b = getLeakyreluAlphaAtOutCoords();
           ${o}
         }`:f=`vec4 activation(vec4 x) {
           ${o}
         }`,d="result = activation(result);");let g=e?"result += getBiasAtOutCoords();":"";e&&this.variableNames.push("bias"),n&&this.variableNames.push("preluActivationWeights"),s&&this.variableNames.push("leakyreluAlpha"),this.userCode=`
       ${f}

       void main() {
         ivec4 coords = getOutputCoords();
         int batch = coords.x;
         ivec2 xRCCorner = coords.yz * strides - pads;
         int d2 = coords.w;
         int xRCorner = xRCCorner.x;
         int xCCorner = xRCCorner.y;

         //intialize dotProd with a small epsilon seems to reduce GPU accuracy loss.
         vec4 dotProd = vec4(0.000000000000001);

         ${m}

         vec4 result = dotProd - vec4(0.000000000000001);
         ${g}
         ${d}
         setOutput(result);
       }
     `}};var sm=class{constructor(t,e){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.customUniforms=[{name:"inputShape",type:"ivec4"},{name:"pad",type:"ivec2"},{name:"stride",type:"ivec2"},{name:"dilation",type:"ivec2"},{name:"inChannels",type:"int"},{name:"itemsPerBlockRow",type:"int"},{name:"outWidth",type:"int"}],this.outputShape=t,this.enableShapeUniforms=Dt(this.outputShape.length);let{dataFormat:o}=e,n=zt(),s=o==="channelsLast",a=s?1:2,i=s?2:3,c=this.enableShapeUniforms?"if(blockIndex < outShape[2] && pos < outShape[1]) {":`if(blockIndex < ${t[2]} && pos < ${t[1]}) {`,l="";for(let p=0;p<=1;p++)for(let u=0;u<=1;u++)l+=`
          blockIndex = rc.z + ${u};
          pos = rc.y + ${p};

          ${c}
            offsetY = int(blockIndex / outWidth) * stride[0] - pad[0];
            d0 = offsetY + dilation[0] * (pos / itemsPerBlockRow);

            if(d0 < inputShape[${a}] && d0 >= 0) {
              // Use custom imod instead mod. On Intel GPU, mod may generate
              // unexpected value.
              // https://github.com/tensorflow/tfjs/issues/5447
              offsetX = imod(blockIndex, outWidth) * stride[1] - pad[1];
              d1 = offsetX + dilation[1] * (imod(pos, itemsPerBlockRow) /
                  inChannels);

              if(d1 < inputShape[${i}] && d1 >= 0) {

                ch = imod(pos, inChannels);

                if (${s}) {
                  innerDims = vec2(d1, ch);
                  result[${p*2+u}] = getChannel(
                    getA(rc.x, d0, int(innerDims.x),
                    int(innerDims.y)), innerDims);
                } else {
                  innerDims = vec2(d0, d1);
                  result[${p*2+u}] = getChannel(
                    getA(rc.x, ch, int(innerDims.x),
                    int(innerDims.y)), innerDims);
                }
              }
            }
          }
        `;this.userCode=`
      void main() {
        ivec3 rc = getOutputCoords();

        vec4 result = vec4(0);

        int blockIndex, pos, offsetY, d0, offsetX, d1, ch;
        vec2 innerDims;

        ${l}

        ${n.output} = result;
      }
    `}};function am(r,t){let e=r.length;return e>=3?t?[...r.slice(0,-3),r[e-3]*r[e-2],r[e-1]]:[...r.slice(0,-3),r[e-3],r[e-2]*r[e-1]]:!t&&e===1&&r[0]>1?[r[0],1]:null}function im({x:r,filter:t,convInfo:e,backend:o,bias:n=null,preluActivationWeights:s=null,leakyreluAlpha:a=0,activation:i=null}){let c=r.shape,l=o.texData.get(r.dataId),p=e.inChannels,u=c[0]*c[1]*c[2],m=e.outChannels,f=e.dataFormat==="channelsLast",d=!1,g=!1,h,x=[];if(s!=null){let w=am(s.shape,f);w!=null&&(s=K({inputs:{x:s},backend:o,attrs:{shape:w}}),x.push(s))}if(n!=null){let w=am(n.shape,f);w!=null&&(n=K({inputs:{x:n},backend:o,attrs:{shape:w}}),x.push(n))}if(!((u===1||m===1)&&p>Rx)&&l.isPacked&&f&&l.texture!=null&&c[2]%2!==0&&y.arraysEqual(l.shape.slice(-3),c.slice(-3))){let w=c[0]*c[1]*(c[2]+1),k={dataId:r.dataId,shape:[1,w,e.inChannels],dtype:r.dtype},$=l.shape;l.shape=l.shape.slice(),l.shape[l.shape.length-2]++,y.assert(hi(l.shape,k.shape),()=>`packed reshape ${l.shape} to ${k.shape} isn't free`);let R=K({inputs:{x:t},backend:o,attrs:{shape:[1,e.inChannels,e.outChannels]}});x.push(R);let A=Si({a:k,b:R,backend:o,transposeA:d,transposeB:g,bias:n,activation:i,preluActivationWeights:s,leakyreluAlpha:a}),D=o.texData.get(A.dataId);y.assert(D.isPacked,()=>"batchMatMul result is expected to be packed"),l.shape=$,D.shape=e.outShape,h=jt({inputs:{x:A},backend:o}),h.shape=e.outShape,x.push(A)}else{let w=e.outHeight*e.outWidth,k=K({inputs:{x:r},backend:o,attrs:{shape:f?[e.batchSize,w,e.inChannels]:[e.batchSize,e.inChannels,w]}}),$=K({inputs:{x:t},backend:o,attrs:{shape:[1,e.inChannels,e.outChannels]}}),R=Si({a:f?k:$,b:f?$:k,transposeA:!f,transposeB:g,backend:o,bias:n,activation:i,preluActivationWeights:s,leakyreluAlpha:a});h=K({inputs:{x:R},backend:o,attrs:{shape:e.outShape}}),x.push(k),x.push($),x.push(R)}for(let w of x)o.disposeIntermediateTensorInfo(w);return h}function cm({x:r,filter:t,convInfo:e,backend:o,bias:n=null,preluActivationWeights:s=null,leakyreluAlpha:a=0,activation:i=null}){let{filterWidth:c,filterHeight:l,inChannels:p,outWidth:u,outHeight:m,dataFormat:f}=e,d=f==="channelsLast",g=c*l*p,h=m*u,x=[e.batchSize,g,h],b=!0,S=!1,w=[];if(s!=null){let z=am(s.shape,d);z!=null&&(s=K({inputs:{x:s},backend:o,attrs:{shape:z}}),w.push(s))}if(n!=null){let z=am(n.shape,d);z!=null&&(n=K({inputs:{x:n},backend:o,attrs:{shape:z}}),w.push(n))}let k=K({inputs:{x:t},backend:o,attrs:{shape:[1,g,y.sizeFromShape(t.shape)/g]}});w.push(k);let $=new sm(x,e),R=[r.shape,[e.padInfo.top,e.padInfo.left],[e.strideHeight,e.strideWidth],[e.dilationHeight,e.dilationWidth],[e.inChannels],[e.filterWidth*e.inChannels],[e.outWidth]],A=o.runWebGLProgram($,[r],"float32",R),D=K({inputs:{x:A},backend:o,attrs:{shape:x}});w.push(A),w.push(D);let _=n!=null,O=s!=null,L=i==="leakyrelu",M=i?So(i,!0):null,V=new dc(d?D.shape:k.shape,d?k.shape:D.shape,d?[e.batchSize,h,e.outChannels]:[e.batchSize,e.outChannels,h],b,S,_,M,O,L),B=d?[D,k]:[k,D];if(n&&B.push(n),O&&B.push(s),L){let z=o.makeTensorInfo([],"float32",y.createScalarValue(a,"float32"));B.push(z),w.push(z)}let G=o.runWebGLProgram(V,B,"float32"),U=K({inputs:{x:G},backend:o,attrs:{shape:e.outShape}});w.push(G);for(let z of w)o.disposeIntermediateTensorInfo(z);return U}function R3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,filter:s}=t,{strides:a,pad:i,dataFormat:c,dilations:l,dimRoundingMode:p}=o,u=I.convertConv2DDataFormat(c),m=I.computeConv2DInfo(n.shape,s.shape,a,l,i,p,!1,u),f;if(m.filterHeight===1&&m.filterWidth===1&&m.dilationHeight===1&&m.dilationWidth===1&&m.strideHeight===1&&m.strideWidth===1&&(m.padInfo.type==="SAME"||m.padInfo.type==="VALID"))f=im({x:n,filter:s,convInfo:m,backend:e});else if(m.strideWidth<=2&&u==="channelsLast"&&F().getBool("WEBGL_EXP_CONV")){let g=new xc(m),h=[[m.padInfo.top,m.padInfo.left],[m.strideHeight,m.strideWidth],[m.dilationHeight,m.dilationWidth],[m.inHeight,m.inWidth]];f=e.runWebGLProgram(g,[n,s],"float32",h)}else if(F().getBool("WEBGL_CONV_IM2COL"))f=cm({x:n,filter:s,convInfo:m,backend:e});else{let g=new gc(m);f=e.runWebGLProgram(g,[n,s],"float32")}let d=K({inputs:{x:f},backend:e,attrs:{shape:m.outShape}});return e.disposeIntermediateTensorInfo(f),d}var aN={kernelName:Ts,backendName:"webgl",kernelFunc:R3};var lm=class{constructor(t){this.variableNames=["x","dy"],this.outputShape=t.filterShape;let e=t.strideHeight,o=t.strideWidth,n=t.padInfo.top,s=t.padInfo.left,a=t.dataFormat==="channelsLast";this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int wR = coords.x;
        int wC = coords.y;
        int d1 = coords.z;
        int d2 = coords.w;

        // Convolve x(?, ?, d1) with dy(:, :, d2) to get dw(wR, wC, d1, d2).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;

        for (int b = 0; b < ${t.batchSize}; b++) {
          for (int yR = 0; yR < ${t.outHeight}; yR++) {
            int xR = wR + yR * ${e} - ${n};

            if (xR < 0 || xR >= ${t.inHeight}) {
              continue;
            }

            for (int yC = 0; yC < ${t.outWidth}; yC++) {
              int xC = wC + yC * ${o} - ${s};

              if (xC < 0 || xC >= ${t.inWidth}) {
                continue;
              }

              if (${a}) {
                float dyValue = getDy(b, yR, yC, d2);
                float xValue = getX(b, xR, xC, d1);
                dotProd += (xValue * dyValue);
              } else {
                float dyValue = getDy(b, d2, yR, yC);
                float xValue = getX(b, d1, xR, xC);
                dotProd += (xValue * dyValue);
              }

            }
          }
        }
        setOutput(dotProd);
      }
    `}},pm=class{constructor(t){this.variableNames=["dy","W"],this.outputShape=t.inShape;let e=t.filterHeight,o=t.filterWidth,n=t.strideHeight,s=t.strideWidth,a=t.dataFormat==="channelsLast",i=e-1-t.padInfo.top,c=o-1-t.padInfo.left,l=a?1:2,p=a?2:3,u=a?3:1;this.userCode=`
      const ivec2 pads = ivec2(${i}, ${c});

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords[0];
        int d1 = coords[${u}];

        ivec2 dyCorner = ivec2(coords[${l}], coords[${p}]) - pads;
        int dyRCorner = dyCorner.x;
        int dyCCorner = dyCorner.y;

        // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;
        for (int wR = 0; wR < ${e}; wR++) {
          float dyR = float(dyRCorner + wR) / ${n}.0;

          if (dyR < 0.0 || dyR >= ${t.outHeight}.0 || fract(dyR) > 0.0) {
            continue;
          }
          int idyR = int(dyR);

          int wRPerm = ${e} - 1 - wR;

          for (int wC = 0; wC < ${o}; wC++) {
            float dyC = float(dyCCorner + wC) / ${s}.0;

            if (dyC < 0.0 || dyC >= ${t.outWidth}.0 ||
                fract(dyC) > 0.0) {
              continue;
            }
            int idyC = int(dyC);

            int wCPerm = ${o} - 1 - wC;

            for (int d2 = 0; d2 < ${t.outChannels}; d2++) {

              if (${a}) {
                float xValue = getDy(batch, idyR, idyC, d2);
                float wValue = getW(wRPerm, wCPerm, d1, d2);
                dotProd += xValue * wValue;
              } else {
                float xValue = getDy(batch, d2, idyR, idyC);
                float wValue = getW(wRPerm, wCPerm, d1, d2);
                dotProd += xValue * wValue;
              }

            }
          }
        }
        setOutput(dotProd);
      }
    `}},um=class{constructor(t){this.variableNames=["x","dy"],this.outputShape=t.filterShape;let e=t.strideDepth,o=t.strideHeight,n=t.strideWidth,s=t.padInfo.front,a=t.padInfo.top,i=t.padInfo.left;this.userCode=`
      void main() {
        ivec5 coords = getOutputCoords();
        int wF = coords.x;
        int wR = coords.y;
        int wC = coords.z;
        int d1 = coords.w;
        int d2 = coords.u;

        float dotProd = 0.0;

        for (int b = 0; b < ${t.batchSize}; b++) {
          for (int yF = 0; yF < ${t.outDepth}; yF++) {
            int xF = wF + yF * ${e} - ${s};

            if (xF < 0 || xF >= ${t.inDepth}) {
              continue;
            }

            for (int yR = 0; yR < ${t.outHeight}; yR++) {
              int xR = wR + yR * ${o} - ${a};

              if (xR < 0 || xR >= ${t.inHeight}) {
                continue;
              }

              for (int yC = 0; yC < ${t.outWidth}; yC++) {
                int xC = wC + yC * ${n} - ${i};

                if (xC < 0 || xC >= ${t.inWidth}) {
                  continue;
                }

                float dyValue = getDy(b, yF, yR, yC, d2);
                float xValue = getX(b, xF, xR, xC, d1);
                dotProd += (xValue * dyValue);
              }
            }
          }
        }
        setOutput(dotProd);
      }
    `}},mm=class{constructor(t){this.variableNames=["dy","W"],this.outputShape=t.inShape;let e=t.filterDepth,o=t.filterHeight,n=t.filterWidth,s=t.strideDepth,a=t.strideHeight,i=t.strideWidth,c=e-1-t.padInfo.front,l=o-1-t.padInfo.top,p=n-1-t.padInfo.left;this.userCode=`
      const ivec3 pads = ivec3(${c}, ${l}, ${p});

      void main() {
        ivec5 coords = getOutputCoords();
        int batch = coords.x;
        int d1 = coords.u;


        ivec3 dyCorner = ivec3(coords.y, coords.z, coords.w) - pads;
        int dyFCorner = dyCorner.x;
        int dyRCorner = dyCorner.y;
        int dyCCorner = dyCorner.z;

        float dotProd = 0.0;
        for (int wF = 0; wF < ${e}; wF++) {
          float dyF = float(dyFCorner + wF) / ${s}.0;

          if (dyF < 0.0 || dyF >= ${t.outDepth}.0 || fract(dyF) > 0.0) {
            continue;
          }
          int idyF = int(dyF);

          int wFPerm = ${e} - 1 - wF;

          for (int wR = 0; wR < ${o}; wR++) {
            float dyR = float(dyRCorner + wR) / ${a}.0;

            if (dyR < 0.0 || dyR >= ${t.outHeight}.0 ||
              fract(dyR) > 0.0) {
              continue;
            }
            int idyR = int(dyR);

            int wRPerm = ${o} - 1 - wR;

            for (int wC = 0; wC < ${n}; wC++) {
              float dyC = float(dyCCorner + wC) / ${i}.0;

              if (dyC < 0.0 || dyC >= ${t.outWidth}.0 ||
                  fract(dyC) > 0.0) {
                continue;
              }
              int idyC = int(dyC);

              int wCPerm = ${n} - 1 - wC;

              for (int d2 = 0; d2 < ${t.outChannels}; d2++) {
                float xValue = getDy(batch, idyF, idyR, idyC, d2);
                float wValue = getW(wFPerm, wRPerm, wCPerm, d1, d2);
                dotProd += xValue * wValue;
              }
            }
          }
        }
        setOutput(dotProd);
      }
    `}};function A3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,dy:s}=t,{strides:a,pad:i,dataFormat:c,dimRoundingMode:l,filterShape:p}=o,u=I.convertConv2DDataFormat(c),m=I.computeConv2DInfo(n.shape,p,a,1,i,l,!1,u),f=new lm(m);return e.runWebGLProgram(f,[n,s],"float32")}var iN={kernelName:Ss,backendName:"webgl",kernelFunc:A3};function F3(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,filter:s}=t,{inputShape:a,strides:i,pad:c,dataFormat:l,dimRoundingMode:p}=o,u=I.convertConv2DDataFormat(l),m=I.computeConv2DInfo(a,s.shape,i,1,c,p,!1,u),f=new pm(m);return e.runWebGLProgram(f,[n,s],"float32")}var cN={kernelName:ws,backendName:"webgl",kernelFunc:F3};function D3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,filter:s}=t,{strides:a,pad:i,dilations:c}=o,l=I.computeConv3DInfo(n.shape,s.shape,a,c,i),p=new nm(l);return e.runWebGLProgram(p,[n,s],"float32")}var lN={kernelName:Ns,backendName:"webgl",kernelFunc:D3};function _3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,dy:s}=t,{strides:a,pad:i,filterShape:c}=o,l=I.computeConv3DInfo(n.shape,c,a,1,i),p=new um(l);return e.runWebGLProgram(p,[n,s],"float32")}var pN={kernelName:Dc,backendName:"webgl",kernelFunc:_3};function O3(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,filter:s}=t,{pad:a,strides:i,inputShape:c}=o,l=I.computeConv3DInfo(c,s.shape,i,1,a),p=new mm(l);return e.runWebGLProgram(p,[n,s],"float32")}var uN={kernelName:Is,backendName:"webgl",kernelFunc:O3};var P3=mr+`
  return cos(x);
`,L3=ot({opSnippet:P3}),mN={kernelName:zo,backendName:"webgl",kernelFunc:L3};var M3=`
  float e2x = exp(-x);
  return (e2x + 1.0 / e2x) / 2.0;
`,B3=ot({opSnippet:M3}),fN={kernelName:Wo,backendName:"webgl",kernelFunc:B3};var fm=class{constructor(t,e,o,n,s){this.variableNames=["Image","Boxes","BoxInd"],this.outputShape=[];let[a,i,c,l]=t,[p]=e,[u,m]=o;this.outputShape=[p,u,m,l];let f=n==="bilinear"?1:0,[d,g]=[`${i-1}.0`,`${c-1}.0`],[h,x,b]=u>1?[`${(i-1)/(u-1)}`,"(y2-y1) * height_ratio",`y1*${d} + float(y)*(height_scale)`]:["0.0","0.0",`0.5 * (y1+y2) * ${d}`],[S,w,k]=m>1?[`${(c-1)/(m-1)}`,"(x2-x1) * width_ratio",`x1*${g} + float(x)*(width_scale)`]:["0.0","0.0",`0.5 * (x1+x2) * ${g}`];this.userCode=`
      const float height_ratio = float(${h});
      const float width_ratio = float(${S});
      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int y = coords[1];
        int x = coords[2];
        int d = coords[3];

        // get box vals
        float y1 = getBoxes(b,0);
        float x1 = getBoxes(b,1);
        float y2 = getBoxes(b,2);
        float x2 = getBoxes(b,3);

        // get image in batch index
        int bInd = round(getBoxInd(b));
        if(bInd < 0 || bInd >= ${a}) {
          return;
        }

        float height_scale = ${x};
        float width_scale = ${w};

        float in_y = ${b};
        if( in_y < 0.0 || in_y > ${d} ) {
          setOutput(float(${s}));
          return;
        }
        float in_x = ${k};
        if( in_x < 0.0 || in_x > ${g} ) {
          setOutput(float(${s}));
          return;
        }

        vec2 sourceFracIndexCR = vec2(in_x,in_y);
        if(${f} == 1) {
          // Compute the four integer indices.
          ivec2 sourceFloorCR = ivec2(sourceFracIndexCR);
          ivec2 sourceCeilCR = ivec2(ceil(sourceFracIndexCR));

          float topLeft = getImage(b, sourceFloorCR.y, sourceFloorCR.x, d);
          float bottomLeft = getImage(b, sourceCeilCR.y, sourceFloorCR.x, d);
          float topRight = getImage(b, sourceFloorCR.y, sourceCeilCR.x, d);
          float bottomRight = getImage(b, sourceCeilCR.y, sourceCeilCR.x, d);

          vec2 fracCR = sourceFracIndexCR - vec2(sourceFloorCR);

          float top = topLeft + (topRight - topLeft) * fracCR.x;
          float bottom = bottomLeft + (bottomRight - bottomLeft) * fracCR.x;
          float newValue = top + (bottom - top) * fracCR.y;
          setOutput(newValue);
        } else {
          // Compute the coordinators of nearest neighbor point.
          ivec2 sourceNearestCR = ivec2(floor(
            sourceFracIndexCR + vec2(0.5,0.5)));
          float newValue = getImage(b, sourceNearestCR.y, sourceNearestCR.x, d);
          setOutput(newValue);
        }
      }
    `}};var V3=r=>{let{inputs:t,backend:e,attrs:o}=r,{image:n,boxes:s,boxInd:a}=t,{cropSize:i,method:c,extrapolationValue:l}=o,p=new fm(n.shape,s.shape,i,c,l);return e.runWebGLProgram(p,[n,s,a],"float32")},dN={kernelName:Es,backendName:"webgl",kernelFunc:V3};var Ni;(function(r){r.Prod="*",r.Sum="+"})(Ni||(Ni={}));var Ul=class{constructor(t,e,o,n){this.op=t,this.outputShape=e,this.variableNames=["x"],this.customUniforms=[{name:"index",type:"float"}];let s=this.outputShape.length,a=this.op===Ni.Prod?"1.0":"0.0",i=o?a:`getX(${hN(s,"coords",this.op)})`,c=this.outputShape[this.outputShape.length-1],l="",p="";o?(l=n?`end != ${c-1}`:"end != 0",p=n?"end + 1":"end - 1"):(l=n?`end + pow2 < ${c}`:"end >= pow2",p=n?"end + pow2":"end - pow2"),this.userCode=`
      void main() {
        ${dt(s)} coords = getOutputCoords();
        int end = ${gN(s,"coords",this.op)};
        float val = ${i};
        int pow2 = int(pow(2.0, index));
        if (${l}) {
          int idx = ${p};
          ${gN(s,"coords",this.op)} = idx;
          val ${this.op}= getX(${hN(s,"coords",this.op)});
        }
        setOutput(val);
      }
    `}};function hN(r,t,e){if(r===1)return`${t}`;if(r===2)return`${t}.x, ${t}.y`;if(r===3)return`${t}.x, ${t}.y, ${t}.z`;if(r===4)return`${t}.x, ${t}.y, ${t}.z, ${t}.w`;throw new Error(`Cumulative ${e} for rank ${r} is not yet supported`)}function gN(r,t,e){if(r===1)return`${t}`;if(r===2)return`${t}.y`;if(r===3)return`${t}.z`;if(r===4)return`${t}.w`;throw new Error(`Cumulative ${e} for rank ${r} is not yet supported`)}function dm(r,t,e,o,n,s){let a=t.shape.length,i=I.getAxesPermutation([o],a),c=t;i!=null&&(c=Mt({inputs:{x:t},backend:e,attrs:{perm:i}}));let l=I.getInnerMostAxes(1,a)[0];if(l!==a-1)throw new Error(`WebGL cumprod shader expects an inner-most axis=${t.shape.length-1} but got axis=${o}`);let p=c.shape[l],u=jt({inputs:{x:c},backend:e});for(let m=0;m<=Math.ceil(Math.log2(p))-1;m++){let f=new Ul(r,c.shape,!1,s),d=[[m]],g=u;u=e.runWebGLProgram(f,[u],u.dtype,d),e.disposeIntermediateTensorInfo(g)}if(n){let m=new Ul(r,c.shape,n,s),f=u;u=e.runWebGLProgram(m,[u],u.dtype),e.disposeIntermediateTensorInfo(f)}if(i!=null){let m=I.getUndoAxesPermutation(i),f=Mt({inputs:{x:u},backend:e,attrs:{perm:m}});return e.disposeIntermediateTensorInfo(u),e.disposeIntermediateTensorInfo(c),f}return u}function z3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,exclusive:a,reverse:i}=o;return dm(Ni.Prod,n,e,s,a,i)}var xN={kernelName:vs,backendName:"webgl",kernelFunc:z3};function W3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,exclusive:a,reverse:i}=o;return dm(Ni.Sum,n,e,s,a,i)}var yN={kernelName:ks,backendName:"webgl",kernelFunc:W3};function G3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,weights:s}=t,{size:a,binaryOutput:i}=o;if(n.shape.length===1){let c=e.readSync(n.dataId),l=e.readSync(s.dataId),p=Ru(c,l,s.dtype,s.shape,a);return e.makeTensorInfo([a],s.dtype,p)}else if(n.shape.length===2){let c=e.bufferSync(n),l=e.bufferSync(s),p=iS(c,l,a,i);return e.makeTensorInfo(p.shape,s.dtype,p.values)}throw new Error(`Error in denseBincount: input must be at most rank 2, but got rank${n.shape.length}.`)}var bN={kernelName:$s,backendName:"webgl",kernelFunc:G3};var hm=class{constructor(t,e,o){this.variableNames=["x"],this.outputShape=[],this.outputShape=t,this.blockSize=e,this.dataFormat=o,this.userCode=`
    void main() {
      ivec4 coords = getOutputCoords();
      int b = coords[0];
      int h = ${this.getHeightCoordString()};
      int w = ${this.getWidthCoordString()};
      int d = ${this.getDepthCoordString()};

      int in_h = h / ${e};
      int offset_h = imod(h, ${e});
      int in_w = w / ${e};
      int offset_w = imod(w, ${e});
      int offset_d = (offset_h * ${e} + offset_w) *
        ${this.getOutputDepthSize()};
      int in_d = d + offset_d;

      float result = ${this.getInputSamplingString()};
      setOutput(result);
    }
  `}getHeightCoordString(){return this.dataFormat==="NHWC"?"coords[1]":"coords[2]"}getWidthCoordString(){return this.dataFormat==="NHWC"?"coords[2]":"coords[3]"}getDepthCoordString(){return this.dataFormat==="NHWC"?"coords[3]":"coords[1]"}getOutputDepthSize(){return this.dataFormat==="NHWC"?this.outputShape[3]:this.outputShape[1]}getInputSamplingString(){return this.dataFormat==="NHWC"?"getX(b, in_h, in_w, in_d)":"getX(b, in_d, in_h, in_w)"}};function U3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{blockSize:s,dataFormat:a}=o,i=n.shape[0],c=a==="NHWC"?n.shape[1]:n.shape[2],l=a==="NHWC"?n.shape[2]:n.shape[3],p=a==="NHWC"?n.shape[3]:n.shape[1],u=c*s,m=l*s,f=p/(s*s),d=a==="NHWC"?[i,u,m,f]:[i,f,u,m],g=new hm(d,s,a);return e.runWebGLProgram(g,[n],n.dtype)}var CN={kernelName:Rs,backendName:"webgl",kernelFunc:U3};var yc=class{constructor(t,e=!1,o=null,n=!1,s=!1){this.variableNames=["x","W"],this.customUniforms=[{name:"pads",type:"ivec2"},{name:"strides",type:"ivec2"},{name:"dilations",type:"ivec2"},{name:"inDims",type:"ivec2"}],this.outputShape=t.outShape,this.enableShapeUniforms=Dt(this.outputShape.length);let a=t.filterHeight,i=t.filterWidth,c=t.outChannels/t.inChannels,l="",p="";o&&(n?l=`float activation(float a) {
          float b = getPreluActivationWeightsAtOutCoords();
          ${o}
        }`:s?l=`float activation(float a) {
          float b = getLeakyreluAlphaAtOutCoords();
          ${o}
        }`:l=`
          float activation(float x) {
            ${o}
          }
        `,p="result = activation(result);");let u=e?"result += getBiasAtOutCoords();":"";e&&this.variableNames.push("bias"),n&&this.variableNames.push("preluActivationWeights"),s&&this.variableNames.push("leakyreluAlpha"),this.userCode=`
      ${l}

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords.x;
        ivec2 xRCCorner = coords.yz * strides - pads;
        int d2 = coords.w;
        int d1 = d2 / ${c};
        int q = d2 - d1 * ${c};

        int xRCorner = xRCCorner.x;
        int xCCorner = xRCCorner.y;

        // Convolve x(?, ?, d1) with w(:, :, d1, q) to get y(yR, yC, d2).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;
        // TO DO(dsmilkov): Flatten the two for loops and vec4 the operations.
        for (int wR = 0; wR < ${a}; wR++) {
          int xR = xRCorner + wR * dilations[0];

          if (xR < 0 || xR >= inDims[0]) {
            continue;
          }

          for (int wC = 0; wC < ${i}; wC++) {
            int xC = xCCorner + wC * dilations[1];

            if (xC < 0 || xC >= inDims[1]) {
              continue;
            }

            float xVal = getX(batch, xR, xC, d1);
            float wVal = getW(wR, wC, d1, q);
            dotProd += xVal * wVal;
          }
        }

        float result = dotProd;
        ${u}
        ${p}
        setOutput(result);
      }
    `}};var bc=class{constructor(t,e=!1,o=null,n=!1,s=!1){this.variableNames=["x","W"],this.packedInputs=!0,this.packedOutput=!0,this.customUniforms=[{name:"pads",type:"ivec2"},{name:"strides",type:"ivec2"},{name:"dilations",type:"ivec2"},{name:"inDims",type:"ivec2"}],this.outputShape=t.outShape,this.enableShapeUniforms=Dt(this.outputShape.length);let a=t.outChannels/t.inChannels,i=t.padInfo.left,c=t.strideWidth,l=t.dilationWidth,p=t.filterHeight,u=t.filterWidth,m=u,f=`
      int xR; int xC; int xCOffset;
      vec4 wTexel; vec4 previous; vec4 final;`;for(let x=0;x<u;x++)f+=`
          vec4 xTexelC${x*2};
          int xTexelC${x*2}Ready;
          vec4 xTexelC${x*2+1};
          int xTexelC${x*2+1}Ready;
          vec4 xC${x};`;f+=`
    for (int r = 0; r < ${p}; r++) {
      `;for(let x=0;x<u;x++)f+=`
          xTexelC${x*2} = vec4(0.0);
          xTexelC${x*2}Ready = 0;
          xTexelC${x*2+1} = vec4(0.0);
          xTexelC${x*2+1}Ready = 0;
          xC${x} = vec4(0.0);`;f+=`
        xR = xRCorner + r * dilations[0];
        if (xR >=0 && xR < inDims[0]) {
      `;for(let x=0;x<(m+1)/2;x++){let b=x*2;if(f+=`
          xC = xCCorner + ${b*l};
          `,c===1){if(b<u&&(i%2===1?(f+=`
                xCOffset = xC + 1;
                if (xCOffset >= 0 && xCOffset < inDims[1] && xTexelC${b}Ready == 0) {
                  xTexelC${b} = getX(batch, xR, xCOffset, d1);

                  // Need to manually clear unused channels in case
                  // we're reading from recycled texture.
                  if (xCOffset + 1 >= inDims[1]) {
                    xTexelC${b}.zw = vec2(0.0);
                  }
                  xTexelC${b}Ready = 1;
                }
              `,l===1&&b>0?f+=`
                xC${b} = vec4(xTexelC${b-2}.zw, xTexelC${b}.xy);
                `:f+=`
                  xCOffset = xC + 1 - 2;

                  if (xCOffset >= 0 && xCOffset < inDims[1]) {
                    previous = getX(batch, xR, xCOffset, d1);

                    // Need to manually clear unused channels in case
                    // we're reading from recycled texture.
                    if (xCOffset + 1 >= inDims[1]) {
                      previous.zw = vec2(0.0);
                    }

                    xC${b} = vec4(previous.zw, xTexelC${b}.xy);
                  } else {
                    xC${b} = vec4(0.0, 0.0, xTexelC${b}.xy);
                  }
                  `):f+=`
                if (xC >= 0 && xC < inDims[1] && xTexelC${b}Ready == 0) {
                  xTexelC${b} = getX(batch, xR, xC, d1);
                  if (xC + 1 >= inDims[1]) {
                    xTexelC${b}.zw = vec2(0.0);
                  }
                  xTexelC${b}Ready = 1;
                }

                xC${b} = xTexelC${b};
                `,b+1<u)){let S=i%2===0?y.nearestLargerEven(l):l;l%2===0&&i%2===1||l%2!==0&&i%2!==1?(f+=`
                  xCOffset = xC + imod(pads[1], 2) + ${S};

                  if (xCOffset >= 0 && xCOffset < inDims[1] && xTexelC${b+1}Ready == 0) {
                    xTexelC${b+1} = getX(batch, xR, xCOffset, d1);

                    // Need to manually clear unused channels in case
                    // we're reading from recycled texture.
                    if (xCOffset + 1 >= inDims[1]) {
                      xTexelC${b+1}.zw = vec2(0.0);
                    }
                    xTexelC${b+1}Ready = 1;
                  }
                  `,l>1?f+=`
                    xCOffset -= 2;
                    if (xCOffset >= 0 && xCOffset < inDims[1]) {
                     previous = getX(batch, xR, xCOffset, d1);
                     xC${b+1} = vec4(previous.zw, xTexelC${b+1}.xy);
                    } else {
                     xC${b+1} = vec4(0.0, 0.0, xTexelC${b+1}.xy);
                    }
                    `:f+=`
                    xC${b+1} = vec4(xTexelC${b}.zw, xTexelC${b+1}.xy);
                    `):S===1?f+=`
                    xC${b+1} = xTexelC${b};
                    `:f+=`
                    xCOffset = xC + ${S};

                    if (xCOffset >= 0 && xCOffset < inDims[1] && xTexelC${b+1}Ready == 0) {
                      xTexelC${b+1} = getX(batch, xR, xCOffset, d1);
                      if (xCOffset + 1 >= inDims[1]) {
                        xTexelC${b+1}.zw = vec2(0.0);
                      }
                      xTexelC${b+1}Ready = 1;
                    }

                    xC${b+1} = xTexelC${b+1};
                    `}}else b<u&&(i%2===1?(f+=`
                xCOffset = xC + 1 - strides[1];
                if(xCOffset >= 0 && xCOffset < inDims[1] && xTexelC${b}Ready == 0) {
                  xTexelC${b} = getX(batch, xR, xCOffset, d1);
                  // Need to manually clear unused channels in case
                  // we're reading from recycled texture.
                  if (xCOffset + 1 >= inDims[1]) {
                    xTexelC${b}.zw = vec2(0.0);
                  }
                  xTexelC${b}Ready = 1;
                }

                if(xC + 1 >= 0 && xC + 1 < inDims[1] && xTexelC${b+1}Ready == 0) {
                  xTexelC${b+1} = getX(batch, xR, xC + 1, d1);
                  // Need to manually clear unused channels in case
                  // we're reading from recycled texture.
                  if (xC + 2 >= inDims[1]) {
                    xTexelC${b+1}.zw = vec2(0.0);
                  }
                  xTexelC${b+1}Ready = 1;
                }

                xC${b} = vec4(xTexelC${b}.zw, xTexelC${b+1}.zw);
              `,b+1<u&&(f+=`
                  final = vec4(0.0);
                  xCOffset = xC + 1 + strides[1];
                  if(xCOffset >= 0 && xCOffset < inDims[1]) {
                    final = getX(batch, xR, xCOffset, d1);
                  }
                  xC${b+1} = vec4(xTexelC${b+1}.xy, final.xy);
                `)):(f+=`
                if(xC >= 0 && xC < inDims[1] && xTexelC${b}Ready == 0) {
                  xTexelC${b} = getX(batch, xR, xC, d1);
                  if (xC + 1 >= inDims[1]) {
                    xTexelC${b}.zw = vec2(0.0);
                  }
                  xTexelC${b}Ready = 1;
                }

                xCOffset = xC + strides[1];
                if(xCOffset >= 0 && xCOffset < inDims[1] && xTexelC${b+1}Ready == 0) {
                  xTexelC${b+1} = getX(batch, xR, xCOffset, d1);
                  if (xCOffset + 1 >= inDims[1]) {
                    xTexelC${b+1}.zw = vec2(0.);
                  }
                  xTexelC${b+1}Ready = 1;
                }

                xC${b} = vec4(
                  xTexelC${b}.xy, xTexelC${b+1}.xy);
              `,b+1<u&&(f+=`
                  xC${b+1} = vec4(xTexelC${b}.zw, xTexelC${b+1}.zw);
                `)));b<u&&(f+=`
            wTexel = getW(r, ${b}, d1, q);
            dotProd += xC${b} * vec4(wTexel.xz, wTexel.xz);
          `,b+1<u&&(f+=`
              wTexel = getW(r, ${b+1}, d1, q);
              dotProd += xC${b+1} * vec4(wTexel.xz, wTexel.xz);
            `))}f+=`
    }
  `,f+=`
      }
    `;let d="",g="";o&&(n?d=`vec4 activation(vec4 a) {
          vec4 b = getPreluActivationWeightsAtOutCoords();
          ${o}
        }`:s?d=`vec4 activation(vec4 a) {
          vec4 b = getLeakyreluAlphaAtOutCoords();
          ${o}
        }`:d=`vec4 activation(vec4 x) {
          ${o}
        }`,g="result = activation(result);");let h=e?"result += getBiasAtOutCoords();":"";e&&this.variableNames.push("bias"),n&&this.variableNames.push("preluActivationWeights"),s&&this.variableNames.push("leakyreluAlpha"),this.userCode=`
      ${d}

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords.x;
        ivec2 xRCCorner = coords.yz * strides - pads;
        int d2 = coords.w;
        int d1 = d2 / ${a};
        int q = d2 - d1 * ${a};
        int xRCorner = xRCCorner.x;
        int xCCorner = xRCCorner.y;

        //intialize dotProd with a small epsilon seems to reduce GPU accuracy loss.
        vec4 dotProd = vec4(0.000000000000001);

        ${f}

        vec4 result = dotProd - vec4(0.000000000000001);
        ${h}
        ${g}
        setOutput(result);
      }
    `}};function H3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,filter:s}=t,{strides:a,pad:i,dilations:c,dimRoundingMode:l}=o,p=c;p==null&&(p=[1,1]),y.assert(I.eitherStridesOrDilationsAreOne(a,p),()=>`Error in depthwiseConv2d: Either strides or dilations must be 1. Got strides ${a} and dilations '${p}'`);let u=I.computeConv2DInfo(n.shape,s.shape,a,p,i,l,!0),m;F().getBool("WEBGL_PACK_DEPTHWISECONV")&&u.strideWidth<=2&&u.outChannels/u.inChannels===1?m=new bc(u):m=new yc(u);let f=[[u.padInfo.top,u.padInfo.left],[u.strideHeight,u.strideWidth],[u.dilationHeight,u.dilationWidth],[u.inHeight,u.inWidth]];return e.runWebGLProgram(m,[n,s],"float32",f)}var TN={kernelName:As,backendName:"webgl",kernelFunc:H3};var gm=class{constructor(t){this.variableNames=["x","dy"],this.outputShape=t.filterShape;let e=t.strideHeight,o=t.strideWidth,n=t.padInfo.top,s=t.padInfo.left,a=t.outChannels/t.inChannels;this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int wR = coords.x;
        int wC = coords.y;
        int d1 = coords.z;
        int dm = coords.w;
        int d2 = d1 * ${a} + dm;

        float dotProd = 0.0;

        // TO DO: Vec4 over the batch size
        for (int b = 0; b < ${t.batchSize}; b++) {
          for (int yR = 0; yR < ${t.outHeight}; yR++) {
            int xR = wR + yR * ${e} - ${n};

            if (xR < 0 || xR >= ${t.inHeight}) {
              continue;
            }

            for (int yC = 0; yC < ${t.outWidth}; yC++) {
              int xC = wC + yC * ${o} - ${s};

              if (xC < 0 || xC >= ${t.inWidth}) {
                continue;
              }

              float dyValue = getDy(b, yR, yC, d2);
              float xValue = getX(b, xR, xC, d1);
              dotProd += (xValue * dyValue);
            }
          }
        }
        setOutput(dotProd);
      }
    `}},xm=class{constructor(t){this.variableNames=["dy","W"],this.outputShape=t.inShape;let e=t.filterHeight,o=t.filterWidth,n=t.strideHeight,s=t.strideWidth,a=e-1-t.padInfo.top,i=o-1-t.padInfo.left,c=t.outChannels/t.inChannels;this.userCode=`
      const ivec2 pads = ivec2(${a}, ${i});

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords[0];
        int d1 = coords[3];
        ivec2 dyCorner = coords.yz - pads;
        int dyRCorner = dyCorner.x;
        int dyCCorner = dyCorner.y;

        float dotProd = 0.0;

        for (int wR = 0; wR < ${e}; wR++) {
          float dyR = float(dyRCorner + wR) / ${n}.0;

          if (dyR < 0.0 || dyR >= ${t.outHeight}.0 || fract(dyR) > 0.0) {
            continue;
          }
          int idyR = int(dyR);

          int wRPerm = ${e} - 1 - wR;

          for (int wC = 0; wC < ${o}; wC++) {
            float dyC = float(dyCCorner + wC) / ${s}.0;

            if (dyC < 0.0 || dyC >= ${t.outWidth}.0 ||
                fract(dyC) > 0.0) {
              continue;
            }
            int idyC = int(dyC);

            int wCPerm = ${o} - 1 - wC;

            // TO DO: Vec4 over the channelMul
            for (int dm = 0; dm < ${c}; dm++) {
              int d2 = d1 * ${c} + dm;
              float xValue = getDy(batch, idyR, idyC, d2);
              float wValue = getW(wRPerm, wCPerm, d1, dm);
              dotProd += xValue * wValue;
            }
          }
        }
        setOutput(dotProd);
      }
    `}};function K3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,dy:s}=t,{strides:a,dilations:i,pad:c,dimRoundingMode:l,filterShape:p}=o,u=I.computeConv2DInfo(n.shape,p,a,i,c,l,!0),m=new gm(u);return e.runWebGLProgram(m,[n,s],"float32")}var SN={kernelName:Fs,backendName:"webgl",kernelFunc:K3};function q3(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,filter:s}=t,{strides:a,dilations:i,pad:c,dimRoundingMode:l,inputShape:p}=o,u=I.computeConv2DInfo(p,s.shape,a,i,c,l,!0),m=new xm(u);return e.runWebGLProgram(m,[n,s],"float32")}var wN={kernelName:Ds,backendName:"webgl",kernelFunc:q3};var ym=class{constructor(t){this.variableNames=["X"],this.outputShape=[t,t],this.userCode=`
      void main() {
          ivec2 coords = getOutputCoords();
          float val = coords[0] == coords[1] ? getX(coords[0]) : 0.0;
          setOutput(val);
      }
    `}};function X3(r){let{inputs:t,backend:e}=r,{x:o}=t,n=[...o.shape,...o.shape],s=y.sizeFromShape(o.shape),a=K({inputs:{x:o},backend:e,attrs:{shape:[s]}}),i=new ym(s),c=e.runWebGLProgram(i,[a],a.dtype),l=K({inputs:{x:c},backend:e,attrs:{shape:n}});return e.disposeIntermediateTensorInfo(a),e.disposeIntermediateTensorInfo(c),l}var NN={kernelName:_s,backendName:"webgl",kernelFunc:X3};var bm=class{constructor(t){this.variableNames=["x","W"],this.outputShape=t.outShape;let{inHeight:e,inWidth:o,padInfo:n,strideHeight:s,strideWidth:a,filterHeight:i,filterWidth:c,dilationHeight:l,dilationWidth:p}=t,{top:u,left:m}=n;this.userCode=`
      const ivec2 strides = ivec2(${s}, ${a});
      const ivec2 pads = ivec2(${u}, ${m});
      const float neg_infinity = -3.4e38;

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords.x;
        int d1 = coords.w;
        ivec2 outTopLeftCorner =
            coords.yz * strides - pads;
        int hBeg = outTopLeftCorner.x;
        int wBeg = outTopLeftCorner.y;

        float curVal = neg_infinity;
        for (int h = 0; h < ${i}; h++) {
          int hIn = hBeg + h * ${l};

          if (hIn >= 0 && hIn < ${e}) {
            for (int w = 0; w < ${c}; w++) {
              int wIn = wBeg + w * ${p};

              if (wIn >= 0 && wIn < ${o}) {
                float xVal = getX(batch, hIn, wIn, d1);
                float wVal = getW(h, w, d1);

                float val = xVal + wVal;
                if (val > curVal) {
                  curVal = val;
                }
              }
            }
          }
        }

        float result = curVal;
        setOutput(result);
      }
    `}};function j3(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,filter:s}=t,{strides:a,pad:i,dilations:c}=o,l=I.computeDilation2DInfo(n.shape,s.shape,a,i,"NHWC",c),p,u=new bm(l);p=e.runWebGLProgram(u,[n,s],"float32");let m=K({inputs:{x:p},backend:e,attrs:{shape:l.outShape}});return e.disposeIntermediateTensorInfo(p),m}var IN={kernelName:Os,backendName:"webgl",kernelFunc:j3};function Y3(r){let{inputs:t,backend:e,attrs:o}=r,{equation:n}=o,s=t,{allDims:a,summedDims:i,idDims:c}=I.decodeEinsumEquation(n,s.length);I.checkEinsumDimSizes(a.length,c,s);let{path:l,steps:p}=I.getEinsumComputePath(i,c),u=p.length,m=null,f=a.length,d=[];for(let g=0;g<u;++g){for(let h of p[g]){let{permutationIndices:x,expandDims:b}=I.getEinsumPermutation(f,c[h]),S;I.isIdentityPermutation(x)?S=s[h]:(S=Mt({inputs:{x:s[h]},backend:e,attrs:{perm:x}}),d.push(S));let w=S.shape.slice();for(let k=0;k<b.length;++k)w.splice(b[k],0,1);y.arraysEqual(S.shape,w)||(S=K({inputs:{x:S},backend:e,attrs:{shape:w}}),d.push(S)),m===null?m=S:(m=Wl({inputs:{a:S,b:m},backend:e}),d.push(m))}g<u-1&&(l[g]>=0&&(m=Ti({inputs:{x:m},backend:e,attrs:{axis:l[g]-(a.length-f),keepDims:!1}}),d.push(m)),f--)}for(let g of d)g!==m&&e.disposeIntermediateTensorInfo(g);return m}var vN={kernelName:Ps,backendName:"webgl",kernelFunc:Y3};var Z3="return (x >= 0.0) ? x : (exp(x) - 1.0);",Q3=`
  vec4 result;

  result.r = (x.r >= 0.0) ? x.r : (exp(x.r) - 1.0);
  result.g = (x.g >= 0.0) ? x.g : (exp(x.g) - 1.0);
  result.b = (x.b >= 0.0) ? x.b : (exp(x.b) - 1.0);
  result.a = (x.a >= 0.0) ? x.a : (exp(x.a) - 1.0);

  return result;
`,J3=ot({opSnippet:Z3,packedOpSnippet:Q3}),kN={kernelName:Uo,backendName:"webgl",kernelFunc:J3};var tM="return (b >= 1.0) ? a : a * (b + 1.0);",eM=`
  vec4 bGTEZero = vec4(greaterThanEqual(b, vec4(0.)));
  return (bGTEZero * a) + ((vec4(1.0) - bGTEZero) * (a * (b + vec4(1.0))));
`,rM=r=>{let{inputs:t,backend:e}=r,{dy:o,y:n}=t,s=F().getBool("WEBGL_PACK_BINARY_OPERATIONS")?new ur(eM,o.shape,n.shape):new Qe(tM,o.shape,n.shape);return e.runWebGLProgram(s,[o,n],o.dtype)},EN={kernelName:_c,backendName:"webgl",kernelFunc:rM};var oM=`
  return vec4(equal(a, b));
`,nM="return float(a == b);",sM=Rt({opSnippet:nM,packedOpSnippet:oM,dtype:"bool",cpuKernelImpl:uS}),$N={kernelName:Ko,backendName:"webgl",kernelFunc:sM};var aM=`
  // Error function is calculated approximately with elementary function.
  // See "Handbook of Mathematical Functions with Formulas,
  // Graphs, and Mathematical Tables", Abramowitz and Stegun.
  float p = ${I.ERF_P};
  float a1 = ${I.ERF_A1};
  float a2 = ${I.ERF_A2};
  float a3 = ${I.ERF_A3};
  float a4 = ${I.ERF_A4};
  float a5 = ${I.ERF_A5};

  float sign = sign(x);
  x = abs(x);
  float t = 1.0 / (1.0 + p * x);
  return sign * (1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*exp(-x*x));
`,iM=ot({opSnippet:aM}),RN={kernelName:Ho,backendName:"webgl",kernelFunc:iM};var cM=mr+`
  return exp(x);
`,lM=`
  vec4 result = exp(x);
  bvec4 isNaN = isnan(x);
  result.r = isNaN.r ? x.r : result.r;
  result.g = isNaN.g ? x.g : result.g;
  result.b = isNaN.b ? x.b : result.b;
  result.a = isNaN.a ? x.a : result.a;

  return result;
`,Ox=ot({opSnippet:cM,packedOpSnippet:lM,cpuKernelImpl:mS,dtype:"float32"}),AN={kernelName:qo,backendName:"webgl",kernelFunc:Ox};function Cm(r){let{inputs:t,attrs:e,backend:o}=r,{dim:n}=e,{input:s}=t,a=s.shape.length,i=s.shape.slice(),c=n;return n<0&&(y.assert(-(a+1)<=n,()=>`Axis must be in the interval [${-(a+1)}, ${a}]`),c=a+n+1),i.splice(c,0,1),K({inputs:{x:s},backend:o,attrs:{shape:i}})}var FN={kernelName:Ls,backendName:"webgl",kernelFunc:Cm};var DN="return exp(x) - 1.0;",pM=ot({opSnippet:DN,packedOpSnippet:DN,cpuKernelImpl:fS}),_N={kernelName:Xo,backendName:"webgl",kernelFunc:pM};var Hl=class{constructor(t,e,o){this.variableNames=["real","imag"];let n=e[1];this.outputShape=e;let s=o?`2.0 * ${Math.PI}`:`-2.0 * ${Math.PI}`,a=o?`${n}.0`:"1.0",i;if(t==="real")i="return real * expR - imag * expI;";else if(t==="imag")i="return real * expI + imag * expR;";else throw new Error(`FFT component must be either "real" or "imag", got ${t}.`);this.userCode=`
      const float exponentMultiplier = ${s};

      float unaryOpComplex(float real, float expR, float imag, float expI) {
        ${i}
      }

      float mulMatDFT(int batch, int index) {
        float indexRatio = float(index) / float(${n});
        float exponentMultiplierTimesIndexRatio =
            exponentMultiplier * indexRatio;

        float result = 0.0;

        for (int i = 0; i < ${n}; i++) {
          // x = (-2|2 * PI / N) * index * i;
          float x = exponentMultiplierTimesIndexRatio * float(i);
          float expR = cos(x);
          float expI = sin(x);
          float real = getReal(batch, i);
          float imag = getImag(batch, i);

          result +=
              unaryOpComplex(real, expR, imag, expI) / ${a};
        }

        return result;
      }

      void main() {
        ivec2 coords = getOutputCoords();
        setOutput(mulMatDFT(coords[0], coords[1]));
      }
    `}};function Tm(r,t,e){let o=e.texData.get(r.dataId),n=y.sizeFromShape(r.shape),s=r.shape[r.shape.length-1],a=n/s,i=K({inputs:{x:r},backend:e,attrs:{shape:[a,s]}}),c=i.shape,l=new Hl("real",c,t),p=new Hl("imag",c,t),u=[{dataId:o.complexTensorInfos.real.dataId,dtype:o.complexTensorInfos.real.dtype,shape:c},{dataId:o.complexTensorInfos.imag.dataId,dtype:o.complexTensorInfos.imag.dtype,shape:c}],m=e.runWebGLProgram(l,u,"float32"),f=e.runWebGLProgram(p,u,"float32"),d=_e({inputs:{real:m,imag:f},backend:e});e.disposeIntermediateTensorInfo(m),e.disposeIntermediateTensorInfo(f);let g=K({inputs:{x:d},backend:e,attrs:{shape:r.shape}});return e.disposeIntermediateTensorInfo(i),e.disposeIntermediateTensorInfo(d),g}function uM(r){let{inputs:t,backend:e}=r,{input:o}=t;return Tm(o,!1,e)}var ON={kernelName:Ms,backendName:"webgl",kernelFunc:uM};var Sm=class{constructor(t,e){this.outputShape=[],this.customUniforms=[{name:"value",type:"float"}],this.variableNames=["x"],this.outputShape=t,this.userCode=`
      void main() {
        // Input can be obtained from uniform value.
        setOutput(value);
      }
    `}};function No(r){let{backend:t,attrs:e}=r,{shape:o,value:n}=e,{dtype:s}=e;if(s=s||y.inferDtype(n),s==="string"){let a=y.getArrayFromDType(s,y.sizeFromShape(o));return a.fill(n),t.makeTensorInfo(o,s,a)}else{let a=new Sm(o,n),i=[[n]];return t.runWebGLProgram(a,[],s,i)}}var PN={kernelName:Bs,backendName:"webgl",kernelFunc:No};var wm=class{constructor(t){this.variableNames=["Image"],this.outputShape=[];let e=t[2];this.outputShape=t,this.userCode=`
        void main() {
          ivec4 coords = getOutputCoords();
          int x = coords[2];

          int coordX = ${e} - x - 1;
          float outputValue;
          if(coordX >= 0 && coordX < ${e}) {
            outputValue = getImage(coords[0], coords[1], coordX, coords[3]);
          } else {
            outputValue = getImage(coords[0], coords[1], coords[2], coords[3]);
          }
          setOutput(outputValue);
        }
    `}};var LN={kernelName:Vs,backendName:"webgl",kernelFunc:({inputs:r,backend:t})=>{let{image:e}=r,o=t,n=new wm(e.shape);return o.runWebGLProgram(n,[e],e.dtype)}};var MN="return floor(x);",mM=ot({opSnippet:MN,packedOpSnippet:MN,cpuKernelImpl:dS}),BN={kernelName:jo,backendName:"webgl",kernelFunc:mM};var fM=`
  float s = sign(a) * sign(b);
  int ia = round(a);
  int ib = round(b);
  if (ib != 0) {
    // Windows (D3D) wants guaranteed non-zero int division at compile-time.
    return float(idiv(ia, ib, s));
  } else {
    return NAN;
  }
`,dM=`
  ivec4 ia = round(a);
  ivec4 ib = round(b);
  bvec4 cond = notEqual(ib, ivec4(0));
  ivec4 result = ivec4(0);
  vec4 s = sign(a) * sign(b);

  // Windows (D3D) wants guaranteed non-zero int division at compile-time.
  if (cond[0]) {
    result[0] = idiv(ia[0], ib[0], s[0]);
  }
  if (cond[1]) {
    result[1] = idiv(ia[1], ib[1], s[1]);
  }
  if (cond[2]) {
    result[2] = idiv(ia[2], ib[2], s[2]);
  }
  if (cond[3]) {
    result[3] = idiv(ia[3], ib[3], s[3]);
  }
  return vec4(result);
`,hM=Rt({opSnippet:fM,packedOpSnippet:dM,dtype:"int32"}),VN={kernelName:Yo,backendName:"webgl",kernelFunc:hM};var Nm=class{constructor(t){this.variableNames=["A"];let e=zt(),[o,n]=t;this.outputShape=t,this.userCode=`
      void main() {
        ivec3 coords = getOutputCoords();
        int texR = coords[0];
        int texC = coords[1];
        int depth = coords[2];
        vec2 uv = (vec2(texC, texR) + halfCR) / vec2(${n}.0, ${o}.0);

        vec4 values = ${e.texture2D}(A, uv);
        float value;
        if (depth == 0) {
          value = values.r;
        } else if (depth == 1) {
          value = values.g;
        } else if (depth == 2) {
          value = values.b;
        } else if (depth == 3) {
          value = values.a;
        }

        setOutput(floor(value * 255.0 + 0.5));
      }
    `}};var Im=class{constructor(t){this.variableNames=["A"],this.packedInputs=!1,this.packedOutput=!0;let e=zt(),[o,n]=t;this.outputShape=t,this.userCode=`
      void main() {
        ivec3 coords = getOutputCoords();
        int texR = coords[0];
        int texC = coords[1];
        int depth = coords[2];

        vec4 result = vec4(0.);

        for(int row=0; row<=1; row++) {
          for(int col=0; col<=1; col++) {
            texC = coords[1] + row;
            depth = coords[2] + col;

            vec2 uv = (vec2(texC, texR) + halfCR) /
                       vec2(${n}.0, ${o}.0);
            vec4 values = ${e.texture2D}(A, uv);
            float value;
            if (depth == 0) {
              value = values.r;
            } else if (depth == 1) {
              value = values.g;
            } else if (depth == 2) {
              value = values.b;
            } else if (depth == 3) {
              value = values.a;
            }

            result[row * 2 + col] = floor(value * 255.0 + 0.5);
          }
        }

        ${e.output} = result;
      }
    `}};var zN={kernelName:Fi,backendName:"webgl",kernelFunc:gM},Cc,Px=F().getBool("CANVAS2D_WILL_READ_FREQUENTLY_FOR_GPU");function gM(r){let{inputs:t,backend:e,attrs:o}=r,{pixels:n}=t,{numChannels:s}=o,a=typeof HTMLVideoElement<"u"&&n instanceof HTMLVideoElement,i=typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement,[c,l]=a?[n.videoWidth,n.videoHeight]:[n.width,n.height],p=[l,c],u=[l,c,s];if(i||a){let g=F().getBool("CANVAS2D_WILL_READ_FREQUENTLY_FOR_GPU");(Cc==null||g!==Px)&&(Px=g,Cc=document.createElement("canvas").getContext("2d",{willReadFrequently:Px})),Cc.canvas.width=c,Cc.canvas.height=l,Cc.drawImage(n,0,0,c,l),n=Cc.canvas}let m=e.makeTensorInfo(p,"int32");e.texData.get(m.dataId).usage=xe.PIXELS,e.gpgpu.uploadPixelDataToTexture(e.getTexture(m.dataId),n);let f=F().getBool("WEBGL_PACK")?new Im(u):new Nm(u),d=e.runWebGLProgram(f,[m],"int32");return e.disposeData(m.dataId),d}function xM(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,filter:s,bias:a,preluActivationWeights:i}=t,{strides:c,pad:l,dataFormat:p,dilations:u,dimRoundingMode:m,activation:f,leakyreluAlpha:d}=o,g=I.convertConv2DDataFormat(p),h=I.computeConv2DInfo(n.shape,s.shape,c,u,l,m,!1,g),x,b=[],S=a!=null,w=i!=null,k=f==="leakyrelu",$=()=>{let A=[n,s],D=(_,O)=>{if(O==="NCHW"&&_.shape.length===1&&_.shape[0]!==1){let L=K({inputs:{x:_},backend:e,attrs:{shape:[_.shape[0],1,1]}});return b.push(L),L}return _};if(S&&A.push(D(a,p)),w&&A.push(D(i,p)),k){let _=e.makeTensorInfo([],"float32",y.createScalarValue(d,"float32"));A.push(_),b.push(_)}return A};if(h.filterHeight===1&&h.filterWidth===1&&h.dilationHeight===1&&h.dilationWidth===1&&h.strideHeight===1&&h.strideWidth===1&&(h.padInfo.type==="SAME"||h.padInfo.type==="VALID"))x=im({x:n,filter:s,convInfo:h,backend:e,bias:a,activation:f,preluActivationWeights:i,leakyreluAlpha:d});else if(h.strideWidth<=2&&g==="channelsLast"&&F().getBool("WEBGL_EXP_CONV")){let A=f?So(f,!0):null,D=new xc(h,S,A,w,k),_=[[h.padInfo.top,h.padInfo.left],[h.strideHeight,h.strideWidth],[h.dilationHeight,h.dilationWidth],[h.inHeight,h.inWidth]],O=$();x=e.runWebGLProgram(D,O,"float32",_)}else if(F().getBool("WEBGL_CONV_IM2COL"))x=cm({x:n,filter:s,convInfo:h,backend:e,bias:a,activation:f,preluActivationWeights:i,leakyreluAlpha:d});else{let A=f?So(f,!1):null,D=new gc(h,S,A,w,k),_=$();x=e.runWebGLProgram(D,_,"float32")}let R=K({inputs:{x},backend:e,attrs:{shape:h.outShape}});return b.push(x),b.forEach(A=>e.disposeIntermediateTensorInfo(A)),R}var WN={kernelName:_n,backendName:"webgl",kernelFunc:xM};function yM(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,filter:s,bias:a,preluActivationWeights:i}=t,{strides:c,pad:l,dilations:p,dimRoundingMode:u,activation:m,leakyreluAlpha:f}=o,d=[],g=p;g==null&&(g=[1,1]),y.assert(I.eitherStridesOrDilationsAreOne(c,g),()=>`Error in depthwiseConv2d: Either strides or dilations must be 1. Got strides ${c} and dilations '${g}'`);let h=I.computeConv2DInfo(n.shape,s.shape,c,g,l,u,!0),x=F().getBool("WEBGL_PACK_DEPTHWISECONV")&&h.strideWidth<=2&&h.outChannels/h.inChannels===1,b=m?So(m,x):null,S=[n,s],w=a!=null,k=i!=null,$=m==="leakyrelu";if(w&&S.push(a),k&&S.push(i),$){let _=e.makeTensorInfo([],"float32",y.createScalarValue(f,"float32"));S.push(_),d.push(_)}let R;x?R=new bc(h,w,b,k,$):R=new yc(h,w,b,k,$);let A=[[h.padInfo.top,h.padInfo.left],[h.strideHeight,h.strideWidth],[h.dilationHeight,h.dilationWidth],[h.inHeight,h.inWidth]],D=e.runWebGLProgram(R,S,"float32",A);return d.forEach(_=>e.disposeIntermediateTensorInfo(_)),D}var GN={kernelName:On,backendName:"webgl",kernelFunc:yM};var vm=class{constructor(t,e,o,n){this.sliceDim=t,this.strides=e,this.paramsShape=n,this.variableNames=["x","indices"],this.outputShape=o;let s=dt(o.length),a=`
    int index;`;for(let i=0;i<this.sliceDim;i++)a+=`
          index = round(getIndices(coords[0], ${i}));
          out_of_bounds = out_of_bounds || index < 0;
          out_of_bounds = out_of_bounds || index >= ${this.paramsShape[i]};
          flattenIndex += index * ${this.strides[i]};`;this.userCode=`
         void main() {
          ${s} coords = getOutputCoords();
          int flattenIndex = 0;
          bool out_of_bounds = false;

          ${a}

          setOutput(out_of_bounds ? 0.0 : getX(flattenIndex, coords[1]));
        }
      `}};function bM(r){let{inputs:t,backend:e}=r,{params:o,indices:n}=t,s=n.shape,a=s[s.length-1],i=y.sizeFromShape(o.shape),[c,l,p,u]=I.prepareAndValidate(o,n),m=K({inputs:{x:n},backend:e,attrs:{shape:[l,a]}}),f=K({inputs:{x:o},backend:e,attrs:{shape:[y.sizeFromShape(o.shape)/p,p]}});if(e.shouldExecuteOnCPU([o,n])||o.dtype==="string"){let x=e.readSync(n.dataId),b=e.bufferSync(o),S=hS(x,b,o.dtype,l,a,p,u,o.shape,i);return e.makeTensorInfo(c,o.dtype,S.values)}let d=new vm(a,u,[l,p],o.shape),g=e.runWebGLProgram(d,[f,m],f.dtype),h=K({inputs:{x:g},backend:e,attrs:{shape:c}});return e.disposeIntermediateTensorInfo(m),e.disposeIntermediateTensorInfo(f),e.disposeIntermediateTensorInfo(g),h}var UN={kernelName:Gs,backendName:"webgl",kernelFunc:bM};var km=class{constructor(t,e){this.variableNames=["A","indices"],this.outputShape=e,this.rank=e.length;let o=dt(this.rank),n=CM(t,2);this.userCode=`
      void main() {
        ${o} resRC = getOutputCoords();
        int index = int(getIndices(resRC.x, resRC.z));
        float inBounds = (index >= 0) && (index < ${t[2]}) ? 1.0 : 0.0;
        setOutput(inBounds * getA(${n}));
      }
    `}};function CM(r,t){let e=["resRC.x","resRC.y","resRC.z","resRC.w"],o=[];for(let n=0;n<r.length;n++)n===2?o.push("index"):o.push(`${e[n]}`);return o.join()}function Lx(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,indices:s}=t,{axis:a,batchDims:i}=o,c=y.parseAxisParam(a,n.shape)[0];if(F().get("DEBUG")){let b=e.readSync(s.dataId),S=n.shape[c];for(let w=0;w<b.length;++w){let k=b[w];y.assert(k<=S-1&&k>=0,()=>`GatherV2: the index value ${k} is not in [0, ${S-1}]`)}}let l=I.segment_util.collectGatherOpShapeInfo(n,s,c,i),p=y.sizeFromShape(s.shape),u=[],m=K({inputs:{x:n},backend:e,attrs:{shape:[l.batchSize,l.outerSize,l.dimSize,l.sliceSize]}}),f=K({inputs:{x:s},backend:e,attrs:{shape:[l.batchSize,p/l.batchSize]}});u.push(m),u.push(f);let d=[l.batchSize,l.outerSize,p/l.batchSize,l.sliceSize];if(e.shouldExecuteOnCPU([n,s])||n.dtype==="string"){let b=e.bufferSync(f),S=e.bufferSync(m),w=gS(S,b,d);return u.forEach(k=>e.disposeIntermediateTensorInfo(k)),e.makeTensorInfo(l.outputShape,w.dtype,w.values)}let g=new km(m.shape,d),h=e.runWebGLProgram(g,[m,f],m.dtype);u.push(h);let x=K({inputs:{x:h},backend:e,attrs:{shape:l.outputShape}});return u.forEach(b=>e.disposeIntermediateTensorInfo(b)),x}var HN={kernelName:Ws,backendName:"webgl",kernelFunc:Lx};var TM="return float(a > b);",SM=`
  return vec4(greaterThan(a, b));
`,wM=Rt({opSnippet:TM,packedOpSnippet:SM,cpuKernelImpl:xS,dtype:"bool"}),KN={kernelName:Zo,backendName:"webgl",kernelFunc:wM};var NM="return float(a >= b);",IM=`
  return vec4(greaterThanEqual(a, b));
`,vM=Rt({opSnippet:NM,packedOpSnippet:IM,dtype:"bool",cpuKernelImpl:yS}),qN={kernelName:Qo,backendName:"webgl",kernelFunc:vM};function kM(r){let{inputs:t,backend:e}=r,{input:o}=t;return Tm(o,!0,e)}var XN={kernelName:Us,backendName:"webgl",kernelFunc:kM};var EM="return float(!isnan(x) && !isinf(x));",$M=ot({opSnippet:EM,dtype:"bool"}),jN={kernelName:Jo,backendName:"webgl",kernelFunc:$M};var RM="return float(isinf(x));",AM=ot({opSnippet:RM,dtype:"bool"}),YN={kernelName:tn,backendName:"webgl",kernelFunc:AM};var FM="return float(isnan(x));",DM=ot({opSnippet:FM,dtype:"bool"}),ZN={kernelName:en,backendName:"webgl",kernelFunc:DM};var _M="return float(a < b);",OM=`
  return vec4(lessThan(a, b));
`,PM=Rt({opSnippet:_M,packedOpSnippet:OM,cpuKernelImpl:bS,dtype:"bool"}),QN={kernelName:rn,backendName:"webgl",kernelFunc:PM};var LM="return float(a <= b);",MM=`
  return vec4(lessThanEqual(a, b));
`,BM=Rt({opSnippet:LM,packedOpSnippet:MM,cpuKernelImpl:CS,dtype:"bool"}),JN={kernelName:on,backendName:"webgl",kernelFunc:BM};function VM(r){let{backend:t,attrs:e}=r,{start:o,stop:n,num:s}=e,a=TS(o,n,s);return t.makeTensorInfo([a.length],"float32",a)}var t1={kernelName:qs,backendName:"webgl",kernelFunc:VM};var zM=mr+`
  return x < 0.0 ? 0./0. : log(x);
`,WM=`
  vec4 result = log(x);
  bvec4 isNaN = isnan(x);
  result.r = isNaN.r ? x.r : (x.r < 0.0 ? 0./0. : result.r);
  result.g = isNaN.g ? x.g : (x.g < 0.0 ? 0./0. : result.g);
  result.b = isNaN.b ? x.b : (x.b < 0.0 ? 0./0. : result.b);
  result.a = isNaN.a ? x.a : (x.a < 0.0 ? 0./0. : result.a);
  return result;
`,GM=ot({opSnippet:zM,packedOpSnippet:WM,cpuKernelImpl:SS}),e1={kernelName:nn,backendName:"webgl",kernelFunc:GM};var UM=mr+`
  return log(1.0 + x);
`,HM=ot({opSnippet:UM}),r1={kernelName:sn,backendName:"webgl",kernelFunc:HM};var KM="return float(a >= 1.0 && b >= 1.0);",qM=`
  return vec4(
    vec4(greaterThanEqual(a, vec4(1.0))) *
    vec4(greaterThanEqual(b, vec4(1.0))));
`,XM=Rt({opSnippet:KM,packedOpSnippet:qM,dtype:"bool"}),o1={kernelName:an,backendName:"webgl",kernelFunc:XM};var jM="return float(!(x >= 1.0));",YM=ot({opSnippet:jM}),n1={kernelName:cn,backendName:"webgl",kernelFunc:YM};var ZM="return float(a >= 1.0 || b >= 1.0);",QM=`
  return min(
    vec4(greaterThanEqual(a, vec4(1.0))) +
    vec4(greaterThanEqual(b, vec4(1.0))),
    vec4(1.0));
`,JM=Rt({opSnippet:ZM,packedOpSnippet:QM,dtype:"bool"}),s1={kernelName:ln,backendName:"webgl",kernelFunc:JM};var Em=class{constructor(t,e,o,n,s){this.variableNames=["x"],this.outputShape=[];let a=e,i=t[3]-1;this.outputShape=t;let c,l=`float(${o}) + float(${n}) * sum`;s===.5?c=`inversesqrt(${l})`:s===1?c=`1.0/(${l})`:c=`exp(log(${l}) * float(-${s}));`,this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int r = coords[1];
        int c = coords[2];
        int d = coords[3];
        float x = getX(b, r, c, d);
        float sum = 0.0;
        for (int j = -${a}; j <= ${a}; j++) {
          int idx = d + j;
          if (idx >= 0 && idx <=  ${i}) {
            float z = getX(b, r, c, idx);
            sum += z * z;
          }
        }
        float val = x * ${c};
        setOutput(val);
      }
    `}};var $m=class{constructor(t,e,o,n,s){this.variableNames=["x"],this.outputShape=[],this.packedInputs=!0,this.packedOutput=!0;let a=e,i=t[3]-1;this.outputShape=t;let c,l=`float(${o}) + float(${n}) * sum`;s===.5?c=`inversesqrt(${l})`:s===1?c=`1.0/(${l})`:c=`exp(log(${l}) * float(-${s}));`,this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords.x;
        int r = coords.y;
        int c = coords.z;
        int d = coords.w;

        bool hasNextCol = d < ${this.outputShape[3]};
        bool hasNextRow = c < ${this.outputShape[2]};

        vec4 sum = vec4(0.);
        vec4 xFragAtOutputCoords = getX(b, r, c, d);

        vec4 xAtOutputCoords = vec4(
          getChannel(xFragAtOutputCoords, vec2(c, d)),
          hasNextCol ?
            getChannel(xFragAtOutputCoords, vec2(c, d + 1)) : 0.0,
          hasNextRow ?
            getChannel(xFragAtOutputCoords , vec2(c + 1, d)) : 0.0,
          (hasNextRow && hasNextCol) ?
            getChannel(xFragAtOutputCoords, vec2(c + 1, d + 1)) : 0.0
        );

        int firstChannel = d - ${a};
        vec2 cache = vec2(0.);
        if(firstChannel >= 0){
          vec4 firstChannelFrag = getX(b, r, c, firstChannel);
          cache.x = getChannel(firstChannelFrag, vec2(c, firstChannel));
            if(hasNextRow){
              cache.y = getChannel(firstChannelFrag, vec2(c + 1, firstChannel));
            }
        }

        ivec2 depth = ivec2(d, d + 1);
        for (int j = - ${a}; j <= ${a}; j++) {
          ivec2 idx = depth + j;
          bvec2 aboveLowerBound = greaterThanEqual(idx, ivec2(0));
          bvec2 belowUpperBound = lessThanEqual(idx, ivec2(${i}));

          bool depthInRange = aboveLowerBound.x && belowUpperBound.x;
          bool depthPlusOneInRange = aboveLowerBound.y && belowUpperBound.y;

          if(depthInRange || depthPlusOneInRange){
            vec4 z = vec4(0.);
            vec4 xFragAtCurrentDepth;
            z.xz = cache.xy;
            if(depthPlusOneInRange && hasNextCol){
              xFragAtCurrentDepth = idx.y != d ?
                getX(b, r, c, idx.y) : xFragAtOutputCoords;
              z.y = getChannel(xFragAtCurrentDepth, vec2(c, idx.y));
              if(hasNextRow){
                z.w = getChannel(xFragAtCurrentDepth, vec2(c + 1, idx.y));
              }
            }
            cache.xy = z.yw;
            sum += z * z;
          }
        }
        vec4 result = xAtOutputCoords * ${c};
        setOutput(result);
      }
    `}};var tB=r=>{let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{depthRadius:s,bias:a,alpha:i,beta:c}=o,l=F().getBool("WEBGL_PACK_NORMALIZATION")?new $m(n.shape,s,a,i,c):new Em(n.shape,s,a,i,c);return e.runWebGLProgram(l,[n],n.dtype)},a1={kernelName:Xs,backendName:"webgl",kernelFunc:tB};var Rm=class{constructor(t,e,o,n,s){this.variableNames=["inputImage","outputImage","dy"],this.outputShape=[],this.outputShape=t,this.depth=t[3],this.depthRadius=e,this.bias=o,this.alpha=n,this.beta=s,this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int r = coords[1];
        int c = coords[2];

        float result = 0.0;
        for (int d = 0; d < ${this.depth}; ++d) {
          int depthBegin = int(max(0.0, float(d - ${e})));
          int depthEnd = int(min(float(${this.depth}),
              float(d + ${e} + 1)));

          const int MIN_DEPTH_BEGIN = 0;
          const int MAX_DEPTH_END = ${this.depth};

          float norm = 0.0;
          for (int k = MIN_DEPTH_BEGIN; k < MAX_DEPTH_END; ++k) {
            if (k < depthBegin){
              continue;
            }
            else if (k >= depthBegin && k < depthEnd) {
              norm += getInputImage(b, r, c, k) * getInputImage(b, r, c, k);
            }
            else {
              break;
            }
          }

          norm = float(${n}) * norm + float(${o});

          for(int k = MIN_DEPTH_BEGIN; k < MAX_DEPTH_END; ++k){
            if (k < depthBegin){
              continue;
            }
            else if (k >= depthBegin && k < depthEnd){
              float dyi = -2.0 * float(${n})
                * float(${s})
                * getInputImage(b ,r ,c, k) * getOutputImage(b, r, c, d)
                / norm;
              if (k == d) {
                dyi += pow(norm, -1.0 * ${s});
              }
              if (k == coords[3]) {
                dyi *= getDy(b, r, c, d);
                result += dyi;
              }
            }
            else {
              break;
            }
          }
      }
      setOutput(result);
      }
    `}};var eB=r=>{let{inputs:t,backend:e,attrs:o}=r,{x:n,y:s,dy:a}=t,{depthRadius:i,bias:c,alpha:l,beta:p}=o,u=new Rm(n.shape,i,c,l,p);return e.runWebGLProgram(u,[n,s,a],n.dtype)},i1={kernelName:Oc,backendName:"webgl",kernelFunc:eB};function c1(r,t,e,o){let n=y.sizeFromShape(t),a=y.sizeFromShape(r.shape)/n,i=K({inputs:{x:r},attrs:{shape:[a,n]},backend:o}),c=Ge(i,r.dtype,"max",o),l=K({inputs:{x:c},attrs:{shape:e},backend:o});return o.disposeIntermediateTensorInfo(i),o.disposeIntermediateTensorInfo(c),l}function Mx(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{reductionIndices:s,keepDims:a}=o,i=n.shape.length,c=y.parseAxisParam(s,n.shape),l=c,p=I.getAxesPermutation(l,i),u=p!=null,m=e.shouldExecuteOnCPU([n]),f=n;if(u){if(m){let S=e.texData.get(f.dataId).values,w=new Array(i);for(let R=0;R<w.length;R++)w[R]=n.shape[p[R]];let k=bi(S,n.shape,n.dtype,p,w);f=e.makeTensorInfo(w,n.dtype);let $=e.texData.get(f.dataId);$.values=k}else f=ts(n,p,e);l=I.getInnerMostAxes(l.length,i)}I.assertAxesAreInnerMostDims("max",l,i);let[d,g]=I.computeOutAndReduceShapes(f.shape,l),h=d;a&&(h=I.expandShapeToKeepDim(d,c));let x;if(m){let S=e.texData.get(f.dataId).values,w=wS(S,y.sizeFromShape(g),h,n.dtype);x=e.makeTensorInfo(h,n.dtype);let k=e.texData.get(x.dataId);k.values=w}else x=c1(f,g,h,e);return u&&e.disposeIntermediateTensorInfo(f),x}var l1={kernelName:js,backendName:"webgl",kernelFunc:Mx};var rB=fc+`
  return max(a, b);
`,oB=`
  vec4 result = vec4(max(a, b));
  bvec4 isNaNA = isnan(a);
  bvec4 isNaNB = isnan(b);
  bvec4 isNaN = bvec4(isNaNA.x || isNaNB.x, isNaNA.y || isNaNB.y, isNaNA.z || isNaNB.z, isNaNA.w || isNaNB.w);
  `+Zr+`
  return result;
`,nB=Rt({opSnippet:rB,packedOpSnippet:oB,cpuKernelImpl:NS}),p1={kernelName:pn,backendName:"webgl",kernelFunc:nB};function sB(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t;jr(n,"maxPool");let{filterSize:s,strides:a,pad:i,dimRoundingMode:c}=o,l=1;y.assert(I.eitherStridesOrDilationsAreOne(a,l),()=>`Error in maxPool: Either strides or dilations must be 1. Got strides ${a} and dilations '${l}'`);let p=I.computePool2DInfo(n.shape,s,a,l,i,c);if(p.filterWidth===1&&p.filterHeight===1&&y.arraysEqual(p.inShape,p.outShape))return jt({inputs:{x:n},backend:e});let u=new Er(p,"max",!1);return e.runWebGLProgram(u,[n],n.dtype)}var u1={kernelName:Ys,backendName:"webgl",kernelFunc:sB};function aB(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{filterSize:s,strides:a,pad:i,dataFormat:c,dimRoundingMode:l}=o,p=[1,1,1],u=I.computePool3DInfo(n.shape,s,a,p,i,l,c),m=new es(u,"max",!1);return e.runWebGLProgram(m,[n],n.dtype)}var m1={kernelName:Zs,backendName:"webgl",kernelFunc:aB};var Am=class{constructor(t){this.variableNames=["dy","maxPos"],this.outputShape=t.inShape;let e=t.strideHeight,o=t.strideWidth,n=t.dilationHeight,s=t.effectiveFilterHeight,a=t.effectiveFilterWidth,i=s-1-t.padInfo.top,c=a-1-t.padInfo.left,l=s*a-1;this.userCode=`
      const ivec2 pads = ivec2(${i}, ${c});

      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];

        ivec2 dyRCCorner = coords.yz - pads;
        int dyRCorner = dyRCCorner.x;
        int dyCCorner = dyRCCorner.y;

        // Convolve dy(?, ?, d) with pos mask(:, :, d) to get dx(xR, xC, d).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;
        for (int wR = 0; wR < ${s};
          wR += ${n}) {
          float dyR = float(dyRCorner + wR) / ${e}.0;

          if (dyR < 0.0 || dyR >= ${t.outHeight}.0 || fract(dyR) > 0.0) {
            continue;
          }
          int idyR = int(dyR);

          for (int wC = 0; wC < ${a}; wC++) {
            float dyC = float(dyCCorner + wC) / ${o}.0;

            if (dyC < 0.0 || dyC >= ${t.outWidth}.0 ||
                fract(dyC) > 0.0) {
              continue;
            }
            int idyC = int(dyC);

            float dyValue = getDy(b, idyR, idyC, d);
            int maxPosValue = ${l} - int(getMaxPos(b, idyR, idyC, d));

            // Get the current value, check it against the value from the
            // position matrix.
            int curPosValue = wR * ${a} + wC;
            float mask = float(maxPosValue == curPosValue ? 1.0 : 0.0);

            dotProd += dyValue * mask;
          }
        }
        setOutput(dotProd);
      }
    `}},Fm=class{constructor(t){this.variableNames=["dy","maxPos"],this.outputShape=t.inShape;let e=t.strideDepth,o=t.strideHeight,n=t.strideWidth,s=t.dilationDepth,a=t.dilationHeight,i=t.dilationWidth,c=t.effectiveFilterDepth,l=t.effectiveFilterHeight,p=t.effectiveFilterWidth,u=c-1-t.padInfo.front,m=l-1-t.padInfo.top,f=p-1-t.padInfo.left,d=c*l*p-1;this.userCode=`
      const ivec3 pads = ivec3(${u}, ${m}, ${f});

      void main() {
        ivec5 coords = getOutputCoords();
        int batch = coords.x;
        int ch = coords.u;

        ivec3 dyCorner = ivec3(coords.y, coords.z, coords.w) - pads;
        int dyDCorner = dyCorner.x;
        int dyRCorner = dyCorner.y;
        int dyCCorner = dyCorner.z;

        // Convolve dy(?, ?, ?, ch) with pos mask(:, :, :, d) to get
        // dx(xD, xR, xC, ch).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;

        for (int wD = 0; wD < ${c};
           wD += ${s}) {
          float dyD = float(dyDCorner + wD) / ${e}.0;

          if (dyD < 0.0 || dyD >= ${t.outDepth}.0 || fract(dyD) > 0.0) {
            continue;
          }
          int idyD = int(dyD);

          for (int wR = 0; wR < ${l};
              wR += ${a}) {
            float dyR = float(dyRCorner + wR) / ${o}.0;

            if (dyR < 0.0 || dyR >= ${t.outHeight}.0 ||
                fract(dyR) > 0.0) {
              continue;
            }
            int idyR = int(dyR);

            for (int wC = 0; wC < ${p};
                wC += ${i}) {
              float dyC = float(dyCCorner + wC) / ${n}.0;

              if (dyC < 0.0 || dyC >= ${t.outWidth}.0 ||
                  fract(dyC) > 0.0) {
                continue;
              }
              int idyC = int(dyC);

              float dyValue = getDy(batch, idyD, idyR, idyC, ch);
              int maxPosValue = ${d} -
                  int(getMaxPos(batch, idyD, idyR, idyC, ch));

              // Get the current value, check it against the value from the
              // position matrix.
              int curPosValue =
                  wD * ${l} * ${p} +
                  wR * ${p} + wC;
              float mask = float(maxPosValue == curPosValue ? 1.0 : 0.0);

              dotProd += dyValue * mask;
            }
          }
        }
        setOutput(dotProd);
      }
    `}};function iB(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,input:s}=t,a=s,{filterSize:i,strides:c,pad:l,dimRoundingMode:p}=o,u=[1,1,1],m=I.computePool3DInfo(a.shape,i,c,u,l,p),f=new es(m,"max",!0),d=e.runWebGLProgram(f,[a],a.dtype),g=new Fm(m),h=e.runWebGLProgram(g,[n,d],a.dtype);return e.disposeIntermediateTensorInfo(d),h}var f1={kernelName:Lc,backendName:"webgl",kernelFunc:iB};function cB(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,input:s,output:a}=t,i=s;jr([s,a],"maxPoolGrad");let{filterSize:c,strides:l,pad:p,dimRoundingMode:u}=o,m=I.computePool2DInfo(i.shape,c,l,1,p,u),f=!0,d=new Er(m,"max",f),g=e.runWebGLProgram(d,[i],i.dtype),h=new Am(m),x=e.runWebGLProgram(h,[n,g],i.dtype);return e.disposeIntermediateTensorInfo(g),x}var d1={kernelName:Pc,backendName:"webgl",kernelFunc:cB};function h1(r,t,e,o){let n=new Er(e,"max",!1),s=o.runWebGLProgram(n,[r],"float32");n=new Er(e,"max",!0,!0,t);let a=o.runWebGLProgram(n,[r],"float32");return[s,a]}var g1={kernelName:Qs,backendName:"webgl",kernelFunc:({inputs:r,attrs:t,backend:e})=>{let{x:o}=r,{filterSize:n,strides:s,pad:a,includeBatchInIndex:i}=t,c=e;y.assert(o.shape.length===4,()=>`Error in maxPool: input must be rank 4 but got rank ${o.shape.length}.`);let l=[1,1];y.assert(I.eitherStridesOrDilationsAreOne(s,l),()=>`Error in maxPool: Either strides or dilations must be 1. Got strides ${s} and dilations '${l}'`);let p=I.computePool2DInfo(o.shape,n,s,l,a),[u,m]=h1(o,i,p,c);return[u,m]}};function x1(r,t,e,o){let n=y.sizeFromShape(t),a=y.sizeFromShape(r.shape)/n,i=K({inputs:{x:r},attrs:{shape:[a,n]},backend:o}),c=Ge(i,"float32","mean",o),l=K({inputs:{x:c},attrs:{shape:e},backend:o});return o.disposeIntermediateTensorInfo(i),o.disposeIntermediateTensorInfo(c),l}var y1={kernelName:Js,backendName:"webgl",kernelFunc:({inputs:r,attrs:t,backend:e})=>{let{x:o}=r,{keepDims:n,axis:s}=t,a=e,i=o.shape.length,c=y.parseAxisParam(s,o.shape),l=c,p=I.getAxesPermutation(l,i),u=p!=null,m=a.shouldExecuteOnCPU([o]),f=[],d=o;if(u){if(m){let w=a.texData.get(d.dataId).values,k=new Array(i);for(let A=0;A<k.length;A++)k[A]=o.shape[p[A]];let $=bi(w,o.shape,o.dtype,p,k);d=a.makeTensorInfo(k,o.dtype);let R=a.texData.get(d.dataId);R.values=$}else d=ts(o,p,a);f.push(d),l=I.getInnerMostAxes(l.length,i)}I.assertAxesAreInnerMostDims("sum",l,i);let[g,h]=I.computeOutAndReduceShapes(d.shape,l),x=g;n&&(x=I.expandShapeToKeepDim(g,c));let b=x1(d,h,x,a);for(let S of f)a.disposeIntermediateTensorInfo(S);return b}};function lB(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,keepDims:a}=o,i=n.shape.length,c=y.parseAxisParam(s,n.shape),l=c,p=I.getAxesPermutation(l,i),u=n;p!=null&&(u=Mt({inputs:{x:n},backend:e,attrs:{perm:p}}),l=I.getInnerMostAxes(l.length,n.shape.length)),I.assertAxesAreInnerMostDims("min",l,i);let[m,f]=I.computeOutAndReduceShapes(u.shape,l),d=y.sizeFromShape(f),g=K({inputs:{x:u},backend:e,attrs:{shape:[-1,d]}}),h=Ge(g,g.dtype,"min",e),x;if(a){let b=I.expandShapeToKeepDim(m,c);x=K({inputs:{x:h},backend:e,attrs:{shape:b}})}else x=K({inputs:{x:h},backend:e,attrs:{shape:m}});return e.disposeIntermediateTensorInfo(g),e.disposeIntermediateTensorInfo(h),p!=null&&e.disposeIntermediateTensorInfo(u),x}var b1={kernelName:ta,backendName:"webgl",kernelFunc:lB};var pB=fc+`
  return min(a, b);
`,uB=`
  vec4 result = vec4(min(a, b));
  bvec4 isNaNA = isnan(a);
  bvec4 isNaNB = isnan(b);
  bvec4 isNaN = bvec4(isNaNA.x || isNaNB.x, isNaNA.y || isNaNB.y, isNaNA.z || isNaNB.z, isNaNA.w || isNaNB.w);
  `+Zr+`
  return result;
`,mB=Rt({opSnippet:pB,packedOpSnippet:uB,cpuKernelImpl:IS}),C1={kernelName:un,backendName:"webgl",kernelFunc:mB};var Dm=class{constructor(t,e,o){this.variableNames=["x"],this.outputShape=e.map((p,u)=>p[0]+t[u]+p[1]);let n=t.length,s=dt(n),a=e.map(p=>p[0]).join(","),i=e.map((p,u)=>p[0]+t[u]).join(","),c=["coords[0]","coords[1]","coords[2]","coords[3]"].slice(0,n),l=o==="reflect"?0:1;if(n===1){this.userCode=`
        int start = ${a};
        int end = ${i};

        void main() {
          int outC = getOutputCoords();
          if (outC < start) {
            outC = start * 2 - outC - ${l};
          } else if(outC >= end) {
            outC = (end - 1) * 2 - outC + ${l};
          }
          setOutput(getX(outC - start));
        }
      `;return}this.userCode=`
      ${s} start = ${s}(${a});
      ${s} end = ${s}(${i});

      void main() {
        ${s} outC = getOutputCoords();
        for (int i = 0; i < ${n}; i++) {
          if (outC[i] < start[i]) {
            outC[i] = start[i] * 2 - outC[i] - ${l};
          } else if(outC[i] >= end[i]) {
            outC[i] = (end[i] - 1) * 2 - outC[i] + ${l};
          }
        }
        ${s} coords = outC - start;
        setOutput(getX(${c}));
      }
    `}};var _m=class{constructor(t,e,o){this.variableNames=["x"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=e.map((d,g)=>d[0]+t[g]+d[1]);let n=t.length,s=dt(n),a=e.map(d=>d[0]).join(","),i=e.map((d,g)=>d[0]+t[g]).join(","),c=Xt("rc",n),l=Xt("source",n),p=`${c[n-1]} < ${this.outputShape[n-1]}`,u=n===1?"source":`vec2(${l.slice(-2).join()})`,m=o==="reflect"?0:1,f="";if(n===1){let d=`
        ${s} source = rc;
        if (source < start) {
          source = start * 2 - source - ${m};
        } else if (source >= end) {
          source = (end - 1) * 2 - source + ${m};
        }
        source -= start;
      `;f=`
        ${s} rc = outputLoc;
        ${d}
        result[0] = getChannel(getX(${l.join()}), ${u});
        ${c[n-1]} += 1;
        if(${p}) {
          ${d}
          result[1] = getChannel(getX(${l.join()}), ${u});
        }
      `}else{let d=`
        ${s} source = rc;
        ${s} lt = ${s}(lessThan(source, start));
        ${s} gte = ${s}(greaterThanEqual(source, end));
        ${s} orig = 1 - (lt + gte);
        source = orig * source +
                lt * (start * 2 - source - ${m}) +
                gte * ((end - 1) * 2 - source + ${m});
        source -= start;
      `;f=`
        ${s} rc = outputLoc;
        ${d}
        result[0] = getChannel(getX(${l.join()}), ${u});
        ${c[n-1]} += 1;
        if(${p}) {
          ${d}
          result[1] = getChannel(getX(${l.join()}), ${u});
        }
        rc = outputLoc;
        ${c[n-2]} += 1;
        if(${c[n-2]} < ${this.outputShape[n-2]}) {
          ${d}
          result[2] = getChannel(getX(${l.join()}), ${u});
          ${c[n-1]} += 1;
          if(${p}) {
            ${d}
            result[3] = getChannel(getX(${l.join()}), ${u});
          }
        }
      `}this.userCode=`
      const ${s} start = ${s}(${a});
      const ${s} end = ${s}(${i});

      void main() {
        ${s} outputLoc = getOutputCoords();
        vec4 result = vec4(0.);
        ${f}
        setOutput(result);
      }
    `}};var fB=({inputs:r,backend:t,attrs:e})=>{let{x:o}=r,{paddings:n,mode:s}=e,a=F().getBool("WEBGL_PACK_ARRAY_OPERATIONS")?new _m(o.shape,n,s):new Dm(o.shape,n,s);return t.runWebGLProgram(a,[o],o.dtype)},T1={kernelName:ea,backendName:"webgl",kernelFunc:fB};var dB=`if (b == 0.0) return NAN;
  return mod(a, b);`,hB=`
  vec4 result = mod(a, b);
  bvec4 isNaN = equal(b, vec4(0.0));
  `+Zr+`
  return result;
`,gB=Rt({opSnippet:dB,packedOpSnippet:hB}),S1={kernelName:mn,backendName:"webgl",kernelFunc:gB};var Om=class{constructor(t,e,o){this.variableNames=["probs"],this.customUniforms=[{name:"seed",type:"float"}],this.outputShape=[t,o],this.userCode=`
      void main() {
        ivec2 coords = getOutputCoords();
        int batch = coords[0];

        float r = random(seed);
        float cdf = 0.0;

        for (int i = 0; i < ${e-1}; i++) {
          cdf += getProbs(batch, i);

          if (r < cdf) {
            setOutput(float(i));
            return;
          }
        }

        // If no other event happened, last event happened.
        setOutput(float(${e-1}));
      }
    `}};var xB=`
if (a == b) {
  return 1.0;
};
return a / b;`,yB=`
  // vec4 one = vec4(equal(a, b));
  // return one + (vec4(1.0) - one) * a / b;
  vec4 result = a / b;
  if(a.x == b.x) {
    result.x = 1.;
  }
  if(a.y == b.y) {
    result.y = 1.;
  }
  if(a.z == b.z) {
    result.z = 1.;
  }
  if(a.w == b.w) {
    result.w = 1.;
  }

  return result;
`,Bx=Rt({opSnippet:xB,packedOpSnippet:yB,checkOutOfBounds:!0}),w1={kernelName:Go,backendName:"webgl",kernelFunc:Bx};var N1="return a - b;",Vx=Rt({opSnippet:N1,packedOpSnippet:N1,supportsComplex:!0,cpuKernelImpl:US}),I1={kernelName:$n,backendName:"webgl",kernelFunc:Vx};function zx(r){let{inputs:t,backend:e,attrs:o}=r,{logits:n}=t,{dim:s}=o,a=y.parseAxisParam([s],n.shape),i=Mx({inputs:{x:n},backend:e,attrs:{reductionIndices:a,keepDims:!1}}),c=I.expandShapeToKeepDim(i.shape,a),l=K({inputs:{x:i},backend:e,attrs:{shape:c}}),p=Vx({inputs:{a:n,b:l},backend:e}),u=Ox({inputs:{x:p},backend:e}),m=Ti({inputs:{x:u},backend:e,attrs:{axis:a,keepDims:!1}}),f=K({inputs:{x:m},backend:e,attrs:{shape:c}}),d=Bx({inputs:{a:u,b:f},backend:e});return e.disposeIntermediateTensorInfo(i),e.disposeIntermediateTensorInfo(l),e.disposeIntermediateTensorInfo(p),e.disposeIntermediateTensorInfo(u),e.disposeIntermediateTensorInfo(m),e.disposeIntermediateTensorInfo(f),d}var v1={kernelName:Ea,backendName:"webgl",kernelFunc:zx};function bB(r){let{inputs:t,backend:e,attrs:o}=r,{logits:n}=t,{numSamples:s,seed:a,normalized:i}=o,c=i?n:zx({inputs:{logits:n},backend:e,attrs:{dim:n.shape.length-1}}),l=c.shape[0],p=c.shape[1],u=new Om(l,p,s),m=[[a]],f=e.runWebGLProgram(u,[c],"int32",m);return i||e.disposeIntermediateTensorInfo(c),f}var k1={kernelName:ra,backendName:"webgl",kernelFunc:bB};var CB=re+`
  return -x;
`,TB=`
  vec4 result = -x;
  bvec4 isNaN = isnan(x);

  result.r = isNaN.r ? x.r : result.r;
  result.g = isNaN.g ? x.g : result.g;
  result.b = isNaN.b ? x.b : result.b;
  result.a = isNaN.a ? x.a : result.a;

  return result;
`;function SB(r){let{inputs:t,backend:e}=r,{x:o}=t;if(e.shouldExecuteOnCPU([o])){let s=e.texData.get(o.dataId),[a,i]=kS(s.values,o.shape,o.dtype);return e.makeTensorInfo(i,o.dtype,a)}let n;return F().getBool("WEBGL_PACK_UNARY_OPERATIONS")?n=new Ze(o.shape,TB):n=new Ie(o.shape,CB),e.runWebGLProgram(n,[o],o.dtype)}var E1={kernelName:oa,backendName:"webgl",kernelFunc:SB};var wB=ue.nonMaxSuppressionV3Impl;function NB(r){I.warn("tf.nonMaxSuppression() in webgl locks the UI thread. Call tf.nonMaxSuppressionAsync() instead");let{inputs:t,backend:e,attrs:o}=r,{boxes:n,scores:s}=t,{maxOutputSize:a,iouThreshold:i,scoreThreshold:c}=o,l=e.readSync(n.dataId),p=e.readSync(s.dataId),{selectedIndices:u}=wB(l,p,a,i,c);return e.makeTensorInfo([u.length],"int32",new Int32Array(u))}var $1={kernelName:na,backendName:"webgl",kernelFunc:NB};var IB=ue.nonMaxSuppressionV4Impl;function vB(r){I.warn("tf.nonMaxSuppression() in webgl locks the UI thread. Call tf.nonMaxSuppressionAsync() instead");let{inputs:t,backend:e,attrs:o}=r,{boxes:n,scores:s}=t,{maxOutputSize:a,iouThreshold:i,scoreThreshold:c,padToMaxOutputSize:l}=o,p=e.readSync(n.dataId),u=e.readSync(s.dataId),{selectedIndices:m,validOutputs:f}=IB(p,u,a,i,c,l);return[e.makeTensorInfo([m.length],"int32",new Int32Array(m)),e.makeTensorInfo([],"int32",new Int32Array([f]))]}var R1={kernelName:sa,backendName:"webgl",kernelFunc:vB};var kB=ue.nonMaxSuppressionV5Impl;function EB(r){I.warn("tf.nonMaxSuppression() in webgl locks the UI thread. Call tf.nonMaxSuppressionAsync() instead");let{inputs:t,backend:e,attrs:o}=r,{boxes:n,scores:s}=t,{maxOutputSize:a,iouThreshold:i,scoreThreshold:c,softNmsSigma:l}=o,p=e.readSync(n.dataId),u=e.readSync(s.dataId),m=a,f=i,d=c,g=l,{selectedIndices:h,selectedScores:x}=kB(p,u,m,f,d,g);return[e.makeTensorInfo([h.length],"int32",new Int32Array(h)),e.makeTensorInfo([x.length],"float32",new Float32Array(x))]}var A1={kernelName:aa,backendName:"webgl",kernelFunc:EB};var Pm=class{constructor(t,e,o,n){this.variableNames=["indices"],this.outputShape=[t,e],this.userCode=`
      void main() {
        ivec2 coords = getOutputCoords();
        int index = round(getIndices(coords.x));
        setOutput(mix(float(${n}), float(${o}),
                      float(index == coords.y)));
      }
    `}};var $B=r=>{let{inputs:t,backend:e,attrs:o}=r,{indices:n}=t,{dtype:s,depth:a,onValue:i,offValue:c}=o,l=y.sizeFromShape(n.shape),p=new Pm(l,a,i,c),u=K({inputs:{x:n},backend:e,attrs:{shape:[l]}}),m=e.runWebGLProgram(p,[u],s);e.disposeIntermediateTensorInfo(u);let f=[...n.shape,a],d=K({inputs:{x:m},backend:e,attrs:{shape:f}});return e.disposeIntermediateTensorInfo(m),d},F1={kernelName:ca,backendName:"webgl",kernelFunc:$B};function Kl(r){let{inputs:t,backend:e}=r,{x:o}=t;if(o.dtype==="complex64"){let n=wo({inputs:{input:o},backend:e}),s=Kl({inputs:{x:n},backend:e}),a=wi({inputs:{input:o},backend:e}),i=Kl({inputs:{x:a},backend:e}),c=_e({inputs:{real:s,imag:i},backend:e});return e.disposeIntermediateTensorInfo(n),e.disposeIntermediateTensorInfo(s),e.disposeIntermediateTensorInfo(a),e.disposeIntermediateTensorInfo(i),c}else return No({attrs:{shape:o.shape,dtype:o.dtype,value:o.dtype==="string"?"":0},backend:e})}var D1={kernelName:Ga,backendName:"webgl",kernelFunc:Kl};function _1(r){let{inputs:t,backend:e}=r,{x:o}=t;if(o.dtype==="string")throw new Error("onesLike is not supported under string dtype");if(o.dtype==="complex64"){let n=wo({inputs:{input:o},backend:e}),s=_1({inputs:{x:n},backend:e}),a=wi({inputs:{input:o},backend:e}),i=Kl({inputs:{x:a},backend:e}),c=_e({inputs:{real:s,imag:i},backend:e});return e.disposeIntermediateTensorInfo(n),e.disposeIntermediateTensorInfo(s),e.disposeIntermediateTensorInfo(a),e.disposeIntermediateTensorInfo(i),c}else return No({attrs:{shape:o.shape,dtype:o.dtype,value:1},backend:e})}var O1={kernelName:ia,backendName:"webgl",kernelFunc:_1};function RB(r){let{inputs:t,backend:e,attrs:o}=r,{axis:n}=o;if(t.length===1)return Cm({inputs:{input:t[0]},backend:e,attrs:{dim:n}});let s=t[0].shape,a=t[0].dtype;t.forEach(p=>{y.assertShapesMatch(s,p.shape,"All tensors passed to stack must have matching shapes"),y.assert(a===p.dtype,()=>"All tensors passed to stack must have matching dtypes")});let i=[],c=t.map(p=>{let u=Cm({inputs:{input:p},backend:e,attrs:{dim:n}});return i.push(u),u}),l=_x({inputs:c,backend:e,attrs:{axis:n}});return i.forEach(p=>e.disposeIntermediateTensorInfo(p)),l}var P1={kernelName:la,backendName:"webgl",kernelFunc:RB};var Lm=class{constructor(t,e,o){this.variableNames=["x"],this.customUniforms=[{name:"value",type:"float"}],this.outputShape=e.map((l,p)=>l[0]+t[p]+l[1]);let n=t.length,s=dt(n),a=e.map(l=>l[0]).join(","),i=e.map((l,p)=>l[0]+t[p]).join(","),c=["coords[0]","coords[1]","coords[2]","coords[3]"].slice(0,n);if(n===1){this.userCode=`
        int start = ${a};
        int end = ${i};

        void main() {
          int outC = getOutputCoords();
          if (outC < start || outC >= end) {
            setOutput(value);
          } else {
            setOutput(getX(outC - start));
          }
        }
      `;return}this.userCode=`
      ${s} start = ${s}(${a});
      ${s} end = ${s}(${i});

      void main() {
        ${s} outC = getOutputCoords();
        if (any(lessThan(outC, start)) || any(greaterThanEqual(outC, end))) {
          setOutput(value);
        } else {
          ${s} coords = outC - start;
          setOutput(getX(${c}));
        }
      }
    `}};var Mm=class{constructor(t,e,o){this.variableNames=["x"],this.packedInputs=!0,this.packedOutput=!0,this.customUniforms=[{name:"value",type:"float"}],this.outputShape=e.map((g,h)=>g[0]+t[h]+g[1]);let n=t.length,s=dt(n),a=e.map(g=>g[0]).join(","),i=e.map((g,h)=>g[0]+t[h]).join(","),c=Xt("rc",n),l=Xt("source",n),p=`${c[n-1]} < ${this.outputShape[n-1]}`,u=n===1?"source":`vec2(${l.slice(-2).join()})`,m=[`${s} rc = outputLoc;`,`${c[n-1]} += 1;
       if(${p}) {
      `,n===1?"":`}
       rc = outputLoc;
       ${c[n-2]} += 1;
       if(${c[n-2]} < ${this.outputShape[n-2]}) {`,n===1?"":`  ${c[n-1]} += 1;
         if(${p}) {`],f=n===1?"rc < start || rc >= end":"any(lessThan(rc, start)) || any(greaterThanEqual(rc, end))",d="";for(let g=0,h=n===1?2:4;g<h;g++)d+=`
        ${m[g]}
        if (${f}) {
          result[${g}] = float(value);
        } else {
          ${s} source = rc - start;
          result[${g}] = getChannel(getX(${l.join()}), ${u});
        }
      `;d+=n===1?"} ":"}}",this.userCode=`
      const ${s} start = ${s}(${a});
      const ${s} end = ${s}(${i});

      void main() {
        ${s} outputLoc = getOutputCoords();
        vec4 result = vec4(0.);
        ${d}
        setOutput(result);
      }
    `}};var Wx=r=>{let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{paddings:s,constantValue:a}=o;if(y.sizeFromShape(n.shape)===0){let l=s.map((p,u)=>p[0]+n.shape[u]+p[1]);return No({backend:e,attrs:{shape:l,value:a,dtype:n.dtype}})}let i=F().getBool("WEBGL_PACK_ARRAY_OPERATIONS")?new Mm(n.shape,s,a):new Lm(n.shape,s,a),c=[[a]];return e.runWebGLProgram(i,[n],n.dtype,c)},L1={kernelName:pa,backendName:"webgl",kernelFunc:Wx};var AB=`
  if(a < 0.0 && floor(b) < b){
    return NAN;
  }
  if (b == 0.0) {
    return 1.0;
  }
  return (round(mod(b, 2.0)) != 1) ?
      pow(abs(a), b) : sign(a) * pow(abs(a), b);
`,FB=`
  // isModRound1 has 1 for components with round(mod(b, 2.0)) == 1, 0 otherwise.
  vec4 isModRound1 = vec4(equal(round(mod(b, 2.0)), ivec4(1)));
  vec4 multiplier = sign(a) * isModRound1 + (vec4(1.0) - isModRound1);
  vec4 result = multiplier * pow(abs(a), b);

  // Ensure that a^0 = 1, including 0^0 = 1 as this correspond to TF and JS
  bvec4 isExpZero = equal(b, vec4(0.0));
  result.r = isExpZero.r ? 1.0 : result.r;
  result.g = isExpZero.g ? 1.0 : result.g;
  result.b = isExpZero.b ? 1.0 : result.b;
  result.a = isExpZero.a ? 1.0 : result.a;

  bvec4 isNaN1 = lessThan(a, vec4(0.0));
  bvec4 isNaN2 = lessThan(floor(b), b);
  bvec4 isNaN = bvec4(isNaN1.x && isNaN2.x, isNaN1.y && isNaN2.y, isNaN1.z && isNaN2.z, isNaN1.w && isNaN2.w);
  `+Zr+`
  return result;
`,DB=Rt({opSnippet:AB,packedOpSnippet:FB}),M1={kernelName:hn,backendName:"webgl",kernelFunc:DB};function _B(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,keepDims:a}=o,i=n.shape.length,c=[],l=y.parseAxisParam(s,n.shape),p=l,u=I.getAxesPermutation(p,i),m=n;u!=null&&(m=Mt({inputs:{x:n},backend:e,attrs:{perm:u}}),p=I.getInnerMostAxes(p.length,i),c.push(m)),I.assertAxesAreInnerMostDims("prod",p,i);let f;if(e.shouldExecuteOnCPU([m])){let d=e.texData.get(m.dataId).values,{outVals:g,outShape:h,outDtype:x}=$S(m.shape,m.dtype,d,p);f=e.makeTensorInfo(h,x,g)}else{let[d,g]=I.computeOutAndReduceShapes(m.shape,p),h=y.sizeFromShape(g),x=K({inputs:{x:m},backend:e,attrs:{shape:[-1,h]}}),b=Mn(n.dtype),S=Ge(x,b,"prod",e);f=K({inputs:{x:S},backend:e,attrs:{shape:d}}),c.push(x),c.push(S)}if(a){c.push(f);let d=I.expandShapeToKeepDim(f.shape,l);f=K({inputs:{x:f},backend:e,attrs:{shape:d}})}return c.forEach(d=>e.disposeIntermediateTensorInfo(d)),f}var B1={kernelName:ma,backendName:"webgl",kernelFunc:_B};function OB(r){let{inputs:t,backend:e,attrs:o}=r,{paramsNestedSplits:n,paramsDenseValues:s,indices:a}=t,{outputRaggedRank:i}=o,c=n.map(x=>e.readSync(x.dataId)),l=n.map(x=>x.shape),p=e.readSync(s.dataId),u=e.readSync(a.dataId),[m,f,d]=RS(c,l,p,s.shape,s.dtype,u,a.shape,i),g=m.map(x=>e.makeTensorInfo([x.length],"int32",x)),h=e.makeTensorInfo(d,s.dtype,f);return g.concat([h])}var V1={kernelName:fa,backendName:"webgl",kernelFunc:OB};function PB(r){let{inputs:t,backend:e,attrs:o}=r,{shape:n,values:s,defaultValue:a,rowPartitionTensors:i}=t,{rowPartitionTypes:c}=o,l=e.readSync(n.dataId),p=e.readSync(s.dataId),u=e.readSync(a.dataId),m=i.map(h=>e.readSync(h.dataId)),f=i.map(h=>h.shape),[d,g]=AS(l,n.shape,p,s.shape,s.dtype,u,a.shape,m,f,c);return e.makeTensorInfo(d,s.dtype,g)}var z1={kernelName:da,backendName:"webgl",kernelFunc:PB};var Gx=r=>{let{backend:t,attrs:e}=r,{start:o,stop:n,step:s,dtype:a}=e,i=FS(o,n,s,a);return t.makeTensorInfo([i.length],a,i)},W1={kernelName:ha,backendName:"webgl",kernelFunc:Gx};var LB="return 1.0 / x;",MB=ot({opSnippet:LB}),G1={kernelName:gn,backendName:"webgl",kernelFunc:MB};var BB=re+`
  return (x < 0.0) ? 0.0 : x;
`,VB=`
  vec4 result = x * vec4(greaterThanEqual(x, vec4(0.0)));
  bvec4 isNaN = isnan(x);

  result.r = isNaN.r ? x.r : result.r;
  result.g = isNaN.g ? x.g : result.g;
  result.b = isNaN.b ? x.b : result.b;
  result.a = isNaN.a ? x.a : result.a;

  return result;
`,zB=ot({opSnippet:BB,packedOpSnippet:VB}),U1={kernelName:xn,backendName:"webgl",kernelFunc:zB};var WB=re+`
  return (x < 0.0) ? 0.0 : min(6.0, x);
`,GB=`
  vec4 result = min(x, vec4(6.)) * vec4(greaterThanEqual(x, vec4(0.0)));
  bvec4 isNaN = isnan(x);

  result.r = isNaN.r ? x.r : result.r;
  result.g = isNaN.g ? x.g : result.g;
  result.b = isNaN.b ? x.b : result.b;
  result.a = isNaN.a ? x.a : result.a;

  return result;
`,UB=ot({opSnippet:WB,packedOpSnippet:GB}),H1={kernelName:yn,backendName:"webgl",kernelFunc:UB};var Bm=class{constructor(t,e,o,n,s){this.variableNames=["A"],this.outputShape=[];let[a,i,c,l]=t;this.outputShape=[a,e,o,l];let p=[n&&e>1?i-1:i,n&&o>1?c-1:c],u=[n&&e>1?e-1:e,n&&o>1?o-1:o],m;s?m="(vec2(yRC) + vec2(0.5)) * effectiveInputOverOutputRatioRC - vec2(0.5)":m="vec2(yRC) * effectiveInputOverOutputRatioRC",this.userCode=`
      const vec2 effectiveInputOverOutputRatioRC = vec2(
          ${p[0]/u[0]},
          ${p[1]/u[1]});
      const vec2 inputShapeRC = vec2(${i}.0, ${c}.0);

      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];
        ivec2 yRC = coords.yz;

        // Fractional source index.
        vec2 sourceFracIndexRC = ${m};

        // Compute the four integer indices.
        ivec2 sourceFloorRC = ivec2(max(sourceFracIndexRC, vec2(0.0)));
        ivec2 sourceCeilRC = ivec2(
          min(inputShapeRC - 1.0, ceil(sourceFracIndexRC)));

        float topLeft = getA(b, sourceFloorRC.x, sourceFloorRC.y, d);
        float bottomLeft = getA(b, sourceCeilRC.x, sourceFloorRC.y, d);
        float topRight = getA(b, sourceFloorRC.x, sourceCeilRC.y, d);
        float bottomRight = getA(b, sourceCeilRC.x, sourceCeilRC.y, d);

        vec2 fracRC = sourceFracIndexRC - vec2(sourceFloorRC);

        float top = topLeft + (topRight - topLeft) * fracRC.y;
        float bottom = bottomLeft + (bottomRight - bottomLeft) * fracRC.y;
        float newValue = top + (bottom - top) * fracRC.x;

        setOutput(newValue);
      }
    `}};var Vm=class{constructor(t,e,o,n,s){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=[];let[a,i,c,l]=t;this.outputShape=[a,e,o,l];let p=[n&&e>1?i-1:i,n&&o>1?c-1:c],u=[n&&e>1?e-1:e,n&&o>1?o-1:o],m;s?m="(vec3(yRC) + vec3(0.5)) * effectiveInputOverOutputRatioRC - vec3(0.5)":m="vec3(yRC) * effectiveInputOverOutputRatioRC",this.userCode=`
      const vec3 effectiveInputOverOutputRatioRC = vec3(
          ${p[0]/u[0]},
          ${p[1]/u[1]},
          ${p[1]/u[1]});
      const vec3 inputShapeRC = vec3(${i}.0, ${c}.0,
                                     ${c}.0);

      float getAValue(int b, int r, int c, int d) {
        return getChannel(getA(b, r, c, d), vec2(c, d));
      }

      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];
        // Calculate values for next column in yRC.z.
        ivec3 yRC = coords.yzz + ivec3(0, 0, 1);

        // Fractional source index.
        vec3 sourceFracIndexRC = ${m};

        // Compute the four integer indices.
        ivec3 sourceFloorRC = ivec3(max(sourceFracIndexRC, vec3(0.0)));
        ivec3 sourceCeilRC = ivec3(
          min(inputShapeRC - 1.0, ceil(sourceFracIndexRC)));

        // Should we calculate next column and row elements in 2x2 packed cell.
        bool hasNextCol = d < ${l-1};
        bool hasNextRow = coords.z < ${o-1};

        // In parallel, construct four corners for all four components in
        // packed 2x2 cell.
        vec4 topLeft = vec4(
          getAValue(b, sourceFloorRC.x, sourceFloorRC.y, d),
          hasNextCol ? getAValue(b, sourceFloorRC.x, sourceFloorRC.y, d + 1)
                     : 0.0,
          hasNextRow ? getAValue(b, sourceFloorRC.x, sourceFloorRC.z, d)
                     : 0.0,
          (hasNextRow && hasNextCol) ?
            getAValue(b, sourceFloorRC.x, sourceFloorRC.z, d + 1) : 0.0);

        vec4 bottomLeft = vec4(
          getAValue(b, sourceCeilRC.x, sourceFloorRC.y, d),
          hasNextCol ? getAValue(b, sourceCeilRC.x, sourceFloorRC.y, d + 1)
                     : 0.0,
          hasNextRow ? getAValue(b, sourceCeilRC.x, sourceFloorRC.z, d)
                     : 0.0,
          (hasNextRow && hasNextCol) ?
            getAValue(b, sourceCeilRC.x, sourceFloorRC.z, d + 1) : 0.0);

        vec4 topRight = vec4(
          getAValue(b, sourceFloorRC.x, sourceCeilRC.y, d),
          hasNextCol ? getAValue(b, sourceFloorRC.x, sourceCeilRC.y, d + 1)
                     : 0.0,
          hasNextRow ? getAValue(b, sourceFloorRC.x, sourceCeilRC.z, d)
                     : 0.0,
          (hasNextRow && hasNextCol) ?
            getAValue(b, sourceFloorRC.x, sourceCeilRC.z, d + 1) : 0.0);

        vec4 bottomRight = vec4(
          getAValue(b, sourceCeilRC.x, sourceCeilRC.y, d),
          hasNextCol ? getAValue(b, sourceCeilRC.x, sourceCeilRC.y, d + 1)
                     : 0.0,
          hasNextRow ? getAValue(b, sourceCeilRC.x, sourceCeilRC.z, d)
                     : 0.0,
          (hasNextRow && hasNextCol) ?
            getAValue(b, sourceCeilRC.x, sourceCeilRC.z, d + 1) : 0.0);

        vec3 fracRC = sourceFracIndexRC - vec3(sourceFloorRC);

        vec4 top = mix(topLeft, topRight, fracRC.yyzz);
        vec4 bottom = mix(bottomLeft, bottomRight, fracRC.yyzz);
        vec4 newValue = mix(top, bottom, fracRC.x);

        setOutput(newValue);
      }
    `}};function HB(r){let{inputs:t,backend:e,attrs:o}=r,{images:n}=t,{alignCorners:s,halfPixelCenters:a,size:i}=o,[c,l]=i,p=F().getBool("WEBGL_PACK_IMAGE_OPERATIONS")?new Vm(n.shape,c,l,s,a):new Bm(n.shape,c,l,s,a);return e.runWebGLProgram(p,[n],"float32")}var K1={kernelName:ba,backendName:"webgl",kernelFunc:HB};var zm=class{constructor(t,e,o){this.variableNames=["dy"],this.outputShape=[],this.outputShape=e;let[,n,s]=e,[,a,i]=t,c=[o&&a>1?n-1:n,o&&i>1?s-1:s],l=[o&&a>1?a-1:a,o&&i>1?i-1:i],p=c[0]/l[0],u=c[1]/l[1],m=1/p,f=1/u,d=Math.ceil(m)*2+2,g=Math.ceil(f)*2+2;this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];
        int r = coords[1];
        int c = coords[2];

        float accumulator = 0.0;

        const float heightScale = float(${p});
        const float widthScale = float(${u});

        const float invHeightScale = float(${m});
        const float invWidthScale = float(${f});

        const int winHeight = int(${d});
        const int winWidth = int(${g});

        // Compute bounds for where in dy we will look
        float startRLerp = floor(float(r) * invHeightScale);
        int startDyR = int(startRLerp - float(winHeight / 2));

        float startCLerp = floor(float(c) * invWidthScale);
        int startDyC = int(startCLerp - float(winWidth / 2));

        // Loop over dy
        for (int dyROffset = 0; dyROffset < winHeight; dyROffset++) {
          int dyR = dyROffset + startDyR;

          // Guard against the window exceeding the bounds of dy
          if (dyR < 0 || dyR >= ${a}) {
            continue;
          }

          for (int dyCOffset = 0; dyCOffset < winWidth; dyCOffset++) {
            int dyC = dyCOffset + startDyC;

            // Guard against the window exceeding the bounds of dy
            if (dyC < 0 || dyC >= ${i}) {
              continue;
            }

            float dxR = float(dyR) * heightScale;
            int topDxRIndex = int(floor(dxR));
            int bottomDxRIndex = int(min(ceil(dxR), ${n-1}.0));
            float dxRLerp = dxR - float(topDxRIndex);
            float inverseDxRLerp = 1.0 - dxRLerp;

            float dxC = float(dyC) * widthScale;
            int leftDxCIndex = int(floor(dxC));
            int rightDxCIndex = int(min(ceil(dxC), ${s-1}.0));
            float dxCLerp = dxC - float(leftDxCIndex);
            float inverseDxCLerp = 1.0 - dxCLerp;

            if (r == topDxRIndex && c == leftDxCIndex) {
              // topLeft
              accumulator +=
                getDy(b, dyR, dyC, d) * inverseDxRLerp * inverseDxCLerp;
            }

            if (r == topDxRIndex && c == rightDxCIndex) {
              // topRight
              accumulator += getDy(b, dyR, dyC, d) * inverseDxRLerp * dxCLerp;
            }

            if (r == bottomDxRIndex && c == leftDxCIndex) {
              // bottomLeft
              accumulator += getDy(b, dyR, dyC, d) * dxRLerp * inverseDxCLerp;
            }

            if (r == bottomDxRIndex && c == rightDxCIndex) {
              // bottomRight
              accumulator += getDy(b, dyR, dyC, d) * dxRLerp * dxCLerp;
            }
          }
        }
        // End loop over dy

        setOutput(accumulator);
      }
    `}};function KB(r){let{inputs:t,backend:e,attrs:o}=r,{images:n,dy:s}=t,{alignCorners:a}=o,i=new zm(s.shape,n.shape,a);return e.runWebGLProgram(i,[s],s.dtype)}var q1={kernelName:Bc,backendName:"webgl",kernelFunc:KB};var Wm=class{constructor(t,e,o,n,s){this.variableNames=["A"],this.outputShape=[];let[a,i,c,l]=t;this.outputShape=[a,e,o,l];let p=[n&&e>1?i-1:i,n&&o>1?c-1:c],u=[n&&e>1?e-1:e,n&&o>1?o-1:o],m=n?"0.5":"0.0",f;s?f="max((vec2(yRC) + vec2(0.5)) * effectiveInputOverOutputRatioRC, vec2(0.0))":f="vec2(yRC) * effectiveInputOverOutputRatioRC",this.userCode=`
      const vec2 effectiveInputOverOutputRatioRC = vec2(
          ${p[0]/u[0]},
          ${p[1]/u[1]});
      const vec2 inputShapeRC = vec2(${i}.0, ${c}.0);

      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];
        ivec2 yRC = coords.yz;

        // Fractional source index.
        vec2 sourceFracIndexRC = ${f};

        // Compute the coordinators of nearest neighbor point.
        ivec2 sourceNearestRC = ivec2(
          min(inputShapeRC - 1.0, floor(sourceFracIndexRC + ${m})));
        float newValue = getA(b, sourceNearestRC.x, sourceNearestRC.y, d);

        setOutput(newValue);
      }
    `}};var Gm=class{constructor(t,e,o,n,s){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=[];let[a,i,c,l]=t;this.outputShape=[a,e,o,l];let p=[n&&e>1?i-1:i,n&&o>1?c-1:c],u=[n&&e>1?e-1:e,n&&o>1?o-1:o],m=n?"0.5":"0.0",f;s?f="max((vec3(yRC) + vec3(0.5)) * effectiveInputOverOutputRatioRC, vec3(0.0))":f="vec3(yRC) * effectiveInputOverOutputRatioRC",this.userCode=`
      const vec3 effectiveInputOverOutputRatioRC = vec3(
          ${p[0]/u[0]},
          ${p[1]/u[1]},
          ${p[1]/u[1]});
      const vec3 inputShapeRC = vec3(${i}.0, ${c}.0,
                                     ${c}.0);

      float getAValue(int b, int r, int c, int d) {
        return getChannel(getA(b, r, c, d), vec2(c, d));
      }

      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];
        // Calculate values for next column in yRC.z.
        ivec3 yRC = coords.yzz + ivec3(0, 0, 1);

        // Fractional source index.
        vec3 sourceFracIndexRC = ${f};

        // Compute the coordinators of nearest neighbor point.
        ivec3 sourceNearestRC = ivec3(
          min(inputShapeRC - 1.0, floor(sourceFracIndexRC + ${m})));

        // Should we calculate next column and row elements in 2x2 packed cell.
        bool hasNextCol = d < ${l-1};
        bool hasNextRow = coords.z < ${o-1};

        vec4 newValue = vec4(
          getAValue(b, sourceNearestRC.x, sourceNearestRC.y, d),
          hasNextCol ? getAValue(b, sourceNearestRC.x, sourceNearestRC.y, d + 1)
                     : 0.0,
          hasNextRow ? getAValue(b, sourceNearestRC.x, sourceNearestRC.z, d)
                     : 0.0,
          (hasNextRow && hasNextCol) ?
            getAValue(b, sourceNearestRC.x, sourceNearestRC.z, d + 1) : 0.0);

        setOutput(newValue);
      }
    `}};function qB(r){let{inputs:t,backend:e,attrs:o}=r,{images:n}=t,{alignCorners:s,halfPixelCenters:a,size:i}=o,[c,l]=i,p=F().getBool("WEBGL_PACK_IMAGE_OPERATIONS")?new Gm(n.shape,c,l,s,a):new Wm(n.shape,c,l,s,a);return e.runWebGLProgram(p,[n],n.dtype)}var X1={kernelName:ya,backendName:"webgl",kernelFunc:qB};var Um=class{constructor(t,e,o){this.variableNames=["dy"],this.outputShape=[],this.outputShape=e;let[,n,s]=e,[,a,i]=t,c=[o&&a>1?n-1:n,o&&i>1?s-1:s],l=[o&&a>1?a-1:a,o&&i>1?i-1:i],p=c[0]/l[0],u=c[1]/l[1],m=1/p,f=1/u,d=Math.ceil(m)*2+2,g=Math.ceil(f)*2+2;this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];
        int r = coords[1];
        int c = coords[2];

        float accumulator = 0.0;

        const float heightScale = float(${p});
        const float widthScale = float(${u});

        const float invHeightScale = float(${m});
        const float invWidthScale = float(${f});

        const int winHeight = int(${d});
        const int winWidth = int(${g});

        // Compute bounds for where in dy we will look
        float startRLerp = floor(float(r) * invHeightScale);
        int startDyR = int(floor(startRLerp - float(winHeight / 2)));

        float startCLerp = floor(float(c) * invWidthScale);
        int startDyC = int(floor(startCLerp - float(winWidth / 2)));

        // Loop over dy
        for (int dyROffset = 0; dyROffset < winHeight; dyROffset++) {
          int dyR = dyROffset + startDyR;

          // Guard against the window exceeding the bounds of dy
          if (dyR < 0 || dyR >= ${a}) {
            continue;
          }

          for (int dyCOffset = 0; dyCOffset < winWidth; dyCOffset++) {
            int dyC = dyCOffset + startDyC;

            // Guard against the window exceeding the bounds of dy
            if (dyC < 0 || dyC >= ${i}) {
              continue;
            }

            float sourceFracRow =
              float(${c[0]}) *
                (float(dyR) / float(${l[0]}));

            float sourceFracCol =
                float(${c[1]}) *
                  (float(dyC) / float(${l[1]}));

            int sourceNearestRow = int(min(
                float(int(${n}) - 1),
                ${o} ? float(round(sourceFracRow)) :
                                  float(floor(sourceFracRow))));

            int sourceNearestCol = int(min(
                float(int(${s}) - 1),
                ${o} ? float(round(sourceFracCol)) :
                                  float(floor(sourceFracCol))));

            if (r == sourceNearestRow && c == sourceNearestCol) {
              accumulator += getDy(b, dyR, dyC, d);
            }
          }
        }
        // End loop over dy

        setOutput(accumulator);
      }
    `}};function XB(r){let{inputs:t,backend:e,attrs:o}=r,{images:n,dy:s}=t,{alignCorners:a}=o,i=new Um(s.shape,n.shape,a);return e.runWebGLProgram(i,[s],s.dtype)}var j1={kernelName:Mc,backendName:"webgl",kernelFunc:XB};var Hm=class{constructor(t,e){this.variableNames=["x"];let o=t.length;if(o>4)throw new Error(`WebGL backend: Reverse of rank-${o} tensor is not yet supported`);if(this.outputShape=t,o===1){this.userCode=`
        void main() {
          int coord = getOutputCoords();
          setOutput(getX(${t[0]} - coord - 1));
        }
      `;return}let n=i=>e.indexOf(i)!==-1&&t[i]!==1?`${t[i]} - coords[${i}] - 1`:`coords[${i}]`,s=t.map((i,c)=>n(c)).join(","),a=dt(o);this.userCode=`
      void main() {
        ${a} coords = getOutputCoords();
        setOutput(getX(${s}));
      }
    `}};var Km=class{constructor(t,e){this.variableNames=["x"],this.packedInputs=!0,this.packedOutput=!0;let o=t.length;if(o>4)throw new Error(`WebGL backend: Reverse of rank-${o} tensor is not yet supported`);this.outputShape=t;let n=Xt("rc",o),s=`${n[o-1]} + 1 < ${this.outputShape[o-1]}`,a=`${n[o-2]} + 1 < ${this.outputShape[o-2]}`,i=dt(o);o===1?this.userCode=`
        void main(){
          int rc = getOutputCoords();
          vec4 result = vec4(0.);
          result.r = getChannel(getX(${t[0]} - rc - 1),
            ${t[0]} - rc - 1);
          if(${s}){
              result.g = getChannel(getX(${t[0]} - (rc  + 1) - 1),
                ${t[0]} - (rc  + 1) - 1);
          }
          setOutput(result);
        }
      `:this.userCode=`
        void main() {
          ${i} rc = getOutputCoords();
          vec4 result = vec4(0.);
          result.r = ${c(n.slice())};
          if(${s}){
            result.g = ${l(n.slice())};
          }
          if(${a}) {
            result.b = ${p(n.slice())};
            if(${s}) {
              result.a = ${u(n.slice())};
            }
          }
          setOutput(result);
        }
    `;function c(d){return m(d)}function l(d){return d[o-1]="("+d[o-1]+" + 1)",m(d)}function p(d){return d[o-2]="("+d[o-2]+" + 1)",m(d)}function u(d){return d[o-1]="("+d[o-1]+" + 1)",d[o-2]="("+d[o-2]+" + 1)",m(d)}function m(d){let g=t.map((b,S)=>f(S,d)),h=g.join(","),x=g.slice(-2).join(",");return`getChannel(getX(${h}), vec2(${x}))`}function f(d,g){return e.indexOf(d)!==-1&&t[d]!==1?`${t[d]} - ${g[d]} - 1`:`${g[d]}`}}};function jB(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{dims:s}=o,a=n.shape.length,i=y.parseAxisParam(s,n.shape);if(a===0)return jt({inputs:{x:n},backend:e});let c=F().getBool("WEBGL_PACK_ARRAY_OPERATIONS")?new Km(n.shape,i):new Hm(n.shape,i);return e.runWebGLProgram(c,[n],n.dtype)}var Y1={kernelName:Ca,backendName:"webgl",kernelFunc:jB};var qm=class{constructor(t,e){this.variableNames=["Image"],this.outputShape=[],this.customUniforms=[{name:"params",type:"vec4"}];let o=t[1],n=t[2];this.outputShape=t;let s="";typeof e=="number"?s=`float outputValue = ${e.toFixed(2)};`:s=`
        vec3 fill = vec3(${e.join(",")});
        float outputValue = fill[coords[3]];`,this.userCode=`
        void main() {
          ivec4 coords = getOutputCoords();
          int x = coords[2];
          int y = coords[1];
          float coordXFloat = (float(x) - params[0]) * params[3] -
            (float(y) - params[1]) * params[2];
          float coordYFloat = (float(x) - params[0]) * params[2] +
            (float(y) - params[1]) * params[3];
          int coordX = int(round(coordXFloat + params[0]));
          int coordY = int(round(coordYFloat + params[1]));
          ${s}
          if(coordX >= 0 && coordX < ${n} && coordY >= 0 && coordY < ${o}) {
            outputValue = getImage(coords[0], coordY, coordX, coords[3]);
          }
          setOutput(outputValue);
        }
    `}};var Z1={kernelName:Ua,backendName:"webgl",kernelFunc:({inputs:r,attrs:t,backend:e})=>{let{image:o}=r,{radians:n,fillValue:s,center:a}=t,i=e,c=new qm(o.shape,s),[l,p]=I.getImageCenter(a,o.shape[1],o.shape[2]),u=[[l,p,Math.sin(n),Math.cos(n)]];return i.runWebGLProgram(c,[o],o.dtype,u)}};var YB=`
  // OpenGL ES does not support round function.
  // The algorithm is based on banker's rounding.
  float base = floor(x);
  if ((x - base) < 0.5) {
    return floor(x);
  } else if ((x - base) > 0.5) {
    return ceil(x);
  } else {
    if (mod(base, 2.0) == 0.0) {
      return base;
    } else {
      return base + 1.0;
    }
  }
`,ZB=ot({opSnippet:YB}),Q1={kernelName:bn,backendName:"webgl",kernelFunc:ZB};var QB="return inversesqrt(x);",JB=ot({opSnippet:QB,cpuKernelImpl:DS}),J1={kernelName:Cn,backendName:"webgl",kernelFunc:JB};var Tc=class{constructor(t,e,o,n,s,a,i=!0){this.variableNames=["updates","indices","defaultValue"],this.outputShape=a;let c=dt(s.length),l=dt(a.length),p="";o===1?p="i":o===2&&(p="i, j");let u=`getIndices(${p})`,m="";n===1?m="i":n===2&&(m="i, coords[1]");let f=`getUpdates(${m})`,d=e>1?"strides[j]":"strides";this.userCode=`
        ${c} strides = ${c}(${s});

        void main() {
          ${l} coords = getOutputCoords();
          float sum = 0.0;
          bool found = false;
          for (int i = 0; i < ${t}; i++) {
            int flattenedIndex = 0;
            for (int j = 0; j < ${e}; j++) {
              int index = round(${u});
              flattenedIndex += index * ${d};
            }
            if (flattenedIndex == coords[0]) {
              sum += ${f};
              found = true;
            }
          }
          setOutput(mix(getDefaultValue(), sum, float(found)));
        }
      `}};function tV(r){let{inputs:t,backend:e,attrs:o}=r,{indices:n,updates:s}=t,{shape:a}=o,{sliceRank:i,numUpdates:c,sliceSize:l,strides:p,outputSize:u}=I.calculateShapes(s,n,a),m=[u/l,l];if(u===0)return e.makeTensorInfo(a,n.dtype);let f=K({inputs:{x:n},backend:e,attrs:{shape:[c,i]}}),d=K({inputs:{x:s},backend:e,attrs:{shape:[c,l]}}),g=e.makeTensorInfo([],"float32",new Float32Array([0])),h=new Tc(c,i,f.shape.length,d.shape.length,p,m),x=e.runWebGLProgram(h,[d,f,g],d.dtype),b=K({inputs:{x},backend:e,attrs:{shape:a}});return e.disposeIntermediateTensorInfo(f),e.disposeIntermediateTensorInfo(d),e.disposeIntermediateTensorInfo(x),e.disposeIntermediateTensorInfo(g),b}var tI={kernelName:Ta,backendName:"webgl",kernelFunc:tV};var Xm=class{constructor(t,e,o,n){this.variableNames=["sortedSequence","values"],this.customUniforms=[{name:"numInputs",type:"int"}],this.outputShape=[t,o];let s="while (left < right) {",a=`for (int i = 0; i < ${Math.ceil(Math.log2(e+1))}; ++i) { if (left >= right) break;`,i=F().getNumber("WEBGL_VERSION")===2?s:a,c=n==="left"?"<":"<=";this.userCode=`
       int findBound(int batch, float value) {
         int left = 0;
         int right = numInputs;
         int mid;
         ${i}
           mid = (left + right) / 2;
           if (getSortedSequence(batch, mid) ${c} value) {
             left = mid + 1;
           } else {
             right = mid;
           }
         }
         return right;
       }

       void main() {
         ivec2 coords = getOutputCoords();
         int batch = coords[0];
         int valueIndex = coords[1];

         float value = getValues(batch, valueIndex);

         setOutput(float(findBound(batch, value)));
       }
     `}};function eV(r){let{inputs:t,backend:e,attrs:o}=r,{sortedSequence:n,values:s}=t,{side:a}=o,i=new Xm(n.shape[0],n.shape[1],s.shape[1],a),c=[[n.shape[1]]];return e.runWebGLProgram(i,[n,s],"int32",c)}var eI={kernelName:Sa,backendName:"webgl",kernelFunc:eV};var jm=class{constructor(t,e,o){this.variableNames=["c","a","b"],this.outputShape=e;let n,s;if(o>4)throw Error(`Where for rank ${o} is not yet supported`);if(o===1)s="resRC",n="resRC";else{let i=["resRC.x","resRC.y","resRC.z","resRC.w"],c=[],l=[];for(let p=0;p<e.length;p++)l.push(`${i[p]}`),p<t&&c.push(`${i[p]}`);n=c.join(),s=l.join()}let a=dt(o);this.userCode=`
      void main() {
        ${a} resRC = getOutputCoords();
        float cVal = getC(${n});
        if (cVal >= 1.0) {
          setOutput(getA(${s}));
        } else {
          setOutput(getB(${s}));
        }
      }
    `}};function rV(r){let{inputs:t,backend:e}=r,{condition:o,t:n,e:s}=t,a=new jm(o.shape.length,n.shape,n.shape.length);return e.runWebGLProgram(a,[o,n,s],Yt(n.dtype,s.dtype))}var rI={kernelName:wa,backendName:"webgl",kernelFunc:rV};var oV=`
  // Stable and Attracting Fixed Point (0, 1) for Normalized Weights.
  // see: https://arxiv.org/abs/1706.02515
  float scaleAlpha = ${I.SELU_SCALEALPHA};
  float scale = ${I.SELU_SCALE};
  return (x >= 0.0) ? scale * x : scaleAlpha * (exp(x) - 1.0);
`,nV=ot({opSnippet:oV}),oI={kernelName:Tn,backendName:"webgl",kernelFunc:nV};var sV=mr+`
  return 1.0 / (1.0 + exp(-1.0 * x));
`,aV=`
  vec4 result = 1.0 / (1.0 + exp(-1.0 * x));
  bvec4 isNaN = isnan(x);

  result.r = isNaN.r ? x.r : result.r;
  result.g = isNaN.g ? x.g : result.g;
  result.b = isNaN.b ? x.b : result.b;
  result.a = isNaN.a ? x.a : result.a;

  return result;
`,iV=ot({opSnippet:sV,packedOpSnippet:aV,cpuKernelImpl:OS}),nI={kernelName:In,backendName:"webgl",kernelFunc:iV};var cV=`
  if (isnan(x)) { return 0.0; }
  return sign(x);
`,lV=ot({opSnippet:cV}),sI={kernelName:Nn,backendName:"webgl",kernelFunc:lV};var pV=mr+`
  return sin(x);
`,uV=ot({opSnippet:pV}),aI={kernelName:Sn,backendName:"webgl",kernelFunc:uV};var mV=`
  float e2x = exp(x);
  return (e2x - 1.0 / e2x) / 2.0;
`,fV=ot({opSnippet:mV}),iI={kernelName:wn,backendName:"webgl",kernelFunc:fV};var dV=`
  float epsilon = 1.1920928955078125e-7;
  float threshold = log(epsilon) + 2.0;

  bool too_large = x > -threshold;
  bool too_small = x < threshold;

  float result;
  float exp_x = exp(x);

  if (too_large){
    result = x;
  }
  else if (too_small){
    result = exp_x;
  }
  else{
    result = log(exp_x + 1.0);
  }
  return result;
`,hV=ot({opSnippet:dV}),cI={kernelName:vn,backendName:"webgl",kernelFunc:hV};var gV=r=>{let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{blockShape:s,paddings:a}=o;y.assert(n.shape.length<=4,()=>"spaceToBatchND for rank > 4 with a WebGL backend not implemented yet");let i=s.reduce((x,b)=>x*b),c=[[0,0]];c.push(...a);for(let x=1+s.length;x<n.shape.length;++x)c.push([0,0]);let l=[],p=Wx({inputs:{x:n},backend:e,attrs:{paddings:c,constantValue:0}}),u=I.getReshaped(p.shape,s,i,!1),m=I.getPermuted(u.length,s.length,!1),f=I.getReshapedPermuted(p.shape,s,i,!1),d=K({inputs:{x:p},backend:e,attrs:{shape:u}}),g=Mt({inputs:{x:d},backend:e,attrs:{perm:m}}),h=K({inputs:{x:g},backend:e,attrs:{shape:f}});return l.push(p),l.push(d),l.push(g),l.forEach(x=>e.disposeIntermediateTensorInfo(x)),h},lI={kernelName:va,backendName:"webgl",kernelFunc:gV};function xV(r){let{inputs:t,backend:e}=r,{indices:o,values:n,denseShape:s,defaultValue:a}=t;if(s.shape.length!==1)throw new Error(`Dense shape must be a vector, saw:
         ${s.shape}`);if(o.shape.length!==2)throw new Error(`Indices must be a matrix, saw:
         ${o.shape}`);if(n.shape.length!==1)throw new Error(`Values must be a vector, saw:
         ${n.shape}`);if(a.shape.length!==0)throw new Error(`Default value must be a scalar, saw:
        ${a.shape}`);let i=e.readSync(o.dataId),c=e.readSync(n.dataId),l=e.readSync(s.dataId),p=e.readSync(a.dataId)[0],[u,m,f,d,g]=LS(i,o.shape,o.dtype,c,n.dtype,l,p);return[e.makeTensorInfo(m,o.dtype,u),e.makeTensorInfo([m[0]],n.dtype,f),e.makeTensorInfo([d.length],"bool",new Uint8Array(d.map(h=>Number(h)))),e.makeTensorInfo([g.length],o.dtype,new Int32Array(g))]}var pI={kernelName:$a,backendName:"webgl",kernelFunc:xV};function yV(r){let{inputs:t,backend:e}=r,{inputIndices:o,inputShape:n,newShape:s}=t;if(o.shape.length!==2)throw new Error(`Input indices should be a matrix but received shape ${o.shape}`);if(n.shape.length!==1)throw new Error(`Input shape should be a vector but received shape ${n.shape}`);if(s.shape.length!==1)throw new Error(`Target shape should be a vector but received shape ${s.shape}`);let a=Array.from(e.readSync(n.dataId)),i=e.readSync(o.dataId),c=Array.from(e.readSync(s.dataId)),[l,p,u]=MS(i,o.shape,o.dtype,a,c);return[e.makeTensorInfo(p,o.dtype,l),e.makeTensorInfo([u.length],s.dtype,new Int32Array(u))]}var uI={kernelName:Ra,backendName:"webgl",kernelFunc:yV};function bV(r){let{inputs:t,backend:e}=r,{data:o,indices:n,segmentIds:s}=t;if(o.shape.length<1)throw new Error("Data should be at least 1 dimensional but received scalar");if(n.shape.length!==1)throw new Error(`Indices should be a vector but received shape
              ${n.shape}`);if(s.shape.length!==1)throw new Error(`Segment ids should be a vector but received shape
              ${s.shape}`);let a=e.readSync(o.dataId),i=e.readSync(n.dataId),c=e.readSync(s.dataId),[l,p]=Fu(a,o.shape,o.dtype,i,c,!0);return e.makeTensorInfo(p,o.dtype,l)}var mI={kernelName:Aa,backendName:"webgl",kernelFunc:bV};function CV(r){let{inputs:t,backend:e}=r,{data:o,indices:n,segmentIds:s}=t;if(o.shape.length<1)throw new Error("Data should be at least 1 dimensional but received scalar");if(n.shape.length!==1)throw new Error(`Indices should be a vector but received shape
             ${n.shape}`);if(s.shape.length!==1)throw new Error(`Segment ids should be a vector but received shape
             ${s.shape}`);let a=e.readSync(o.dataId),i=e.readSync(n.dataId),c=e.readSync(s.dataId),[l,p]=Fu(a,o.shape,o.dtype,i,c);return e.makeTensorInfo(p,o.dtype,l)}var fI={kernelName:Fa,backendName:"webgl",kernelFunc:CV};function TV(r){let{inputs:t,backend:e,attrs:o}=r,{sparseIndices:n,sparseValues:s,defaultValue:a}=t,{outputShape:i}=o,{sliceRank:c,numUpdates:l,sliceSize:p,strides:u,outputSize:m}=I.calculateShapes(s,n,i),f=!1;if(s.dtype==="string"){let x=e.bufferSync(n),b=e.bufferSync(s),S=y.decodeString(e.readSync(a.dataId)[0]),w=_S(x,b,i,m,p,l,c,u,S,f);return e.makeTensorInfo(i,w.dtype,w.values)}let d=new Tc(l,c,n.shape.length,s.shape.length,u,[m,1],f),g=e.runWebGLProgram(d,[s,n,a],s.dtype),h=K({inputs:{x:g},backend:e,attrs:{shape:i}});return e.disposeIntermediateTensorInfo(g),h}var dI={kernelName:Da,backendName:"webgl",kernelFunc:TV};function SV(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{numOrSizeSplits:s,axis:a}=o,i=y.parseAxisParam(a,n.shape)[0],c=I.prepareSplitSize(n,s,i),l=n.shape.length,p=new Array(l).fill(0),u=n.shape.slice();return c.map(m=>{let f=[...u];f[i]=m;let d=$r({inputs:{x:n},backend:e,attrs:{begin:p,size:f}});return p[i]+=m,d})}var hI={kernelName:ka,backendName:"webgl",kernelFunc:SV};var gI="return sqrt(x);",wV=ot({opSnippet:gI,packedOpSnippet:gI,cpuKernelImpl:BS}),xI={kernelName:kn,backendName:"webgl",kernelFunc:wV};var NV="return x * x;",IV=ot({opSnippet:NV}),yI={kernelName:Vc,backendName:"webgl",kernelFunc:IV};var bI="return (a - b) * (a - b);",vV=Rt({opSnippet:bI,packedOpSnippet:bI}),CI={kernelName:En,backendName:"webgl",kernelFunc:vV};function kV({inputs:r,attrs:t,backend:e}){let{x:o}=r,n=re+`
    return x > 0.0 ? 1.0 : float(${t.alpha});
  `,s=new Ie(o.shape,n);return e.runWebGLProgram(s,[o],o.dtype)}var TI={kernelName:Fn,backendName:"webgl",kernelFunc:kV};var Ym=class{constructor(t,e,o){this.variableNames=["x"],this.outputShape=o;let n=o.length,s=dt(o.length),a=dt(o.length),i="";if(n===1)i="coords * strides + begin";else{let c=0;i=o.map((l,p)=>(c++,o.length===1?`coords * strides[${p}] + begin[${p}]`:`coords[${c-1}] * strides[${p}] + begin[${p}]`)).join(",")}this.userCode=`
      ${s} begin = ${s}(${t});
      ${s} strides = ${s}(${e});

      void main() {
        ${a} coords = getOutputCoords();
        setOutput(getX(${i}));
      }
    `}};function EV(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{begin:s,end:a,strides:i,beginMask:c,endMask:l,ellipsisMask:p,newAxisMask:u,shrinkAxisMask:m}=o,{finalShapeSparse:f,finalShape:d,isIdentity:g,sliceDim0:h,isSimpleSlice:x,begin:b,end:S,strides:w}=ne.sliceInfo(n.shape,s,a,i,c,l,p,u,m),k;if(g)k=K({inputs:{x:n},backend:e,attrs:{shape:d}});else if(h||x){y.assert(n.shape.length>=1,()=>`Input must have rank at least 1, got: ${n.shape.length}`);let R=ne.computeOutShape(b,S,w),A=$r({inputs:{x:n},backend:e,attrs:{begin:b,size:R}});k=K({inputs:{x:A},backend:e,attrs:{shape:d}}),e.disposeIntermediateTensorInfo(A)}else if(e.shouldExecuteOnCPU([n])){let A=e.readSync(n.dataId),D=et(n.shape,n.dtype,A),_=VS(f,D,w,b);k=e.makeTensorInfo(d,n.dtype,_.values)}else{let A=new Ym(b,w,f);k=e.runWebGLProgram(A,[n],n.dtype)}let $=K({inputs:{x:k},backend:e,attrs:{shape:d}});return e.disposeIntermediateTensorInfo(k),$}var SI={kernelName:_a,backendName:"webgl",kernelFunc:EV};function $V(r){let{inputs:t,backend:e,attrs:o}=r,{separator:n,nGramWidths:s,leftPad:a,rightPad:i,padWidth:c,preserveShortSequences:l}=o,{data:p,dataSplits:u}=t,m=e.readSync(p.dataId),f=e.readSync(u.dataId),[d,g]=zS(m,f,n,s,a,i,c,l);return[e.makeTensorInfo([d.length],"string",d),e.makeTensorInfo(u.shape,"int32",g)]}var wI={kernelName:Oa,backendName:"webgl",kernelFunc:$V};function RV(r){let{inputs:t,backend:e,attrs:o}=r,{skipEmpty:n}=o,{input:s,delimiter:a}=t;if(s.dtype!=="string")throw new Error("Input must be of datatype string");if(s.shape.length!==1)throw new Error(`Input must be a vector, got shape: ${s.shape}`);if(a.shape.length!==0)throw new Error(`Delimiter must be a scalar, got shape: ${a.shape}`);let i=e.readSync(s.dataId),c=e.readSync(a.dataId)[0],[l,p,u]=WS(i,c,n),m=p.length;return[e.makeTensorInfo([m,2],"int32",l),e.makeTensorInfo([m],"string",p),e.makeTensorInfo([2],"int32",new Int32Array(u))]}var NI={kernelName:Pa,backendName:"webgl",kernelFunc:RV};function AV(r){let{inputs:t,backend:e,attrs:o}=r,{numBuckets:n}=o,{input:s}=t;if(s.dtype!=="string")throw new Error("Input must be of datatype string");if(n<=0)throw new Error("Number of buckets must be at least 1");let a=e.readSync(s.dataId),i=GS(a,n);return e.makeTensorInfo(s.shape,"int32",i)}var II={kernelName:La,backendName:"webgl",kernelFunc:AV};var FV="return tan(x);",DV=ot({opSnippet:FV}),vI={kernelName:Rn,backendName:"webgl",kernelFunc:DV};var _V=`
  float e2x = exp(-2.0 * abs(x));
  return sign(x) * (1.0 - e2x) / (1.0 + e2x);
`,OV=ot({opSnippet:_V}),kI={kernelName:An,backendName:"webgl",kernelFunc:OV};var Zm=class{constructor(t,e){this.variableNames=["A"];let o=new Array(t.length);for(let a=0;a<o.length;a++)o[a]=t[a]*e[a];this.outputShape=o,this.rank=o.length;let n=dt(this.rank),s=PV(t);this.userCode=`
      void main() {
        ${n} resRC = getOutputCoords();
        setOutput(getA(${s}));
      }
    `}};function PV(r){let t=r.length;if(t>5)throw Error(`Tile for rank ${t} is not yet supported`);if(t===1)return`imod(resRC, ${r[0]})`;let e=["resRC.x","resRC.y","resRC.z","resRC.w","resRC.u"],o=[];for(let n=0;n<r.length;n++)o.push(`imod(${e[n]}, ${r[n]})`);return o.join()}function Ux(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{reps:s}=o;if(n.dtype==="string"||n.shape.length>5){let c=e.readSync(n.dataId),l=n.dtype==="string"?c.map(m=>y.decodeString(m)):c,p=et(n.shape,n.dtype,l),u=HS(p,s);return e.makeTensorInfo(u.shape,u.dtype,u.values)}let a=new Zm(n.shape,s);return e.runWebGLProgram(a,[n],n.dtype)}var EI={kernelName:so,backendName:"webgl",kernelFunc:Ux};var Qm=class{constructor(t){this.variableNames=["x","indices"],this.customUniforms=[{name:"n",type:"int"},{name:"firstPass",type:"int"},{name:"negativeInf",type:"float"},{name:"dir",type:"int"},{name:"inc",type:"int"}],this.outputShape=t,this.userCode=`
       void main() {
         ivec2 coords = getOutputCoords();
         int batch = coords[0];
         int elemIdx = coords[1];

         // We compare elements pair-wise within a group of size 2 * inc.
         // The comparing rule for each group alternates between ascending
         // and descending. Within each group, we compare each pair at
         // positions i and i+inc. To decide whether an element at position i
         // is x0 or x1, we mod it by 2 * inc, if the result is smaller than
         // inc, it is in the first half of the group, we denote it as x0,
         // otherwise we denote it as x1.
         // For example, as shown in the Bitonic top K paper referenced above,
         // Figure5(a) shows that element[1] is in the
         // second half of the group when group size is 2, but it is in the
         // first half of the group when group size is 4.

         bool isFirstInPair = imod(elemIdx, 2 * inc) < inc;
         int i = isFirstInPair ? elemIdx : elemIdx - inc;

         int i0 = firstPass == 1 ? i : int(getIndices(batch, i));
         int i1 = firstPass == 1 ? i + inc : int(getIndices(batch, i + inc));
         float x0 = i0 < n ? getX(batch, i0) : negativeInf;
         float x1 = i1 < n ? getX(batch, i1) : negativeInf;

         // Denotes which direction indices are in (ascending or descending).
         bool reverse = imod(elemIdx, 2 * dir) >= dir;
         bool isGreater = x0 > x1 || (x0 == x1 && i1 > i0);
         if (reverse == isGreater) { // Elements in opposite order of direction
           int iTemp = i0;
           i0 = i1;
           i1 = iTemp;
         }
         if (isFirstInPair) {
            setOutput(float(i0));
         } else {
            setOutput(float(i1));
         }
       }
     `}},Jm=class{constructor(t){this.variableNames=["x","indices"],this.customUniforms=[{name:"n",type:"int"},{name:"firstPass",type:"int"},{name:"k",type:"int"}],this.outputShape=t,this.userCode=`
    void main() {
         // Takes max of indices (0, k), (1, k + 1), (2, k + 2) ...
         ivec2 coords = getOutputCoords();
         int batch = coords[0];
         int elemIdx = coords[1];

         // The output size is half of the previous size.
         // If the previous sequence is | | | | _ _ _ _  | | | |  _ _ _ _ (k=4),
         // we only need to output the indices at positions |, the indices at
         // positions _ can be thrown away, see Figure5(b) After Phase 2
         // (Merge phase) in the Bitonic Top K paper referenced above.
         // For example, the paper shows we only need to output the orange bars.
         // The output sequence should look like this | | | | | | | |.
         // Because the sequence is halved, to map the output index back
         // to the previous sequence to find the corresponding value,
         // we need to double the index. When we double the index,
         // we basically interpolate a position, so 2i looks like
         // | _ | _ | _ | _ | _ | _ | _. We move the | to the first k position
         // of each 2k positions by - elemIdx % k. E.g. for output at
         // index 4,5,6,7, we want to get the corresponding element at
         // original index 8,9,10,11, for output at index 8,9,10,11,
         // we want to get the corresponding element at original index
         // 16,17,18,19, so on and so forth.

         int i = elemIdx < k ? elemIdx : (elemIdx * 2 - imod(elemIdx, k));
         int i0 = firstPass == 1 ? i : int(getIndices(batch, i));
         int i1 = firstPass == 1 ? i + k : int(getIndices(batch, i + k));

         float x0 = getX(batch, i0);
         float x1 = i1 < n ? getX(batch, i1) : x0;

         setOutput(x0 >= x1 ? float(i0) : float(i1));
       }
     `}};function Ii(r,t){t!==null&&r.disposeIntermediateTensorInfo(t)}function $I(r){let t=1;for(;t<r;)t*=2;return t}function LV(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{k:s,sorted:a}=o,i=F().getNumber("TOPK_LAST_DIM_CPU_HANDOFF_SIZE_THRESHOLD"),c=F().getNumber("TOPK_K_CPU_HANDOFF_THRESHOLD"),l=n.shape,p=l[l.length-1];if(e.shouldExecuteOnCPU([n])||p<i||s>c){let _=e.readSync(n.dataId),[O,L]=KS(_,l,n.dtype,s,a);return[e.makeTensorInfo(O.shape,O.dtype,O.values),e.makeTensorInfo(L.shape,L.dtype,L.values)]}if(s===0)return l[l.length-1]=0,[e.makeTensorInfo(l,n.dtype,[]),e.makeTensorInfo(l,"int32",[])];if(p===1)return[n,No({attrs:{shape:l,dtype:"int32",value:0},backend:e})];let u=e.texData.get(n.dataId),m=u!==null&&u.isPacked,f=m?e.unpackTensor(n):n,g=y.sizeFromShape(l)/p,h=K({inputs:{x:f},attrs:{shape:[g,p]},backend:e});m&&Ii(e,f);let x=$I(s),b=$I(p),S=null,w=()=>S===null?[h,h]:[h,S],k=(_,O,L)=>{let M=w(),V=new Qm(L),G=[[p],[S===null?1:0],[Number.NEGATIVE_INFINITY],[_],[O]],U=S;S=e.runWebGLProgram(V,M,"int32",G),Ii(e,U)};for(let _=1;_<x;_*=2){let O=_*2;for(let L=_;L>=1;L/=2)k(O,L,[g,b])}for(let _=b;_>x;_/=2){let O=w(),L=new Jm([g,_/2]),V=[[p],[S===null?1:0],[x]],B=S;S=e.runWebGLProgram(L,O,"int32",V),Ii(e,B);let G=x/2,U=G*2;for(let z=G;z>=1;z/=2)k(U,z,S.shape)}let $=S;S=$r({inputs:{x:S},backend:e,attrs:{begin:0,size:[g,s]}}),Ii(e,$);let R=Lx({inputs:{x:h,indices:S},backend:e,attrs:{axis:1,batchDims:1}});Ii(e,h);let A=l.slice(0,-1);A.push(s),$=S,S=K({inputs:{x:S},attrs:{shape:A},backend:e}),Ii(e,$);let D=R;return R=K({inputs:{x:R},attrs:{shape:A},backend:e}),Ii(e,D),[R,S]}var RI={kernelName:Ma,backendName:"webgl",kernelFunc:LV};var tf=class{constructor(t,e,o,n,s,a){this.variableNames=["Image","Transforms"],this.outputShape=a;let i=o==="nearest"?1:2,c;switch(n){case"constant":c=1;break;case"reflect":c=2;break;case"wrap":c=3;break;case"nearest":c=4;break;default:c=1;break}this.userCode=`
            float mapCoord(float outCoord, float len) {
              float inCoord = outCoord;
              if(${c} == 2) {
                if (inCoord < 0.0) {
                  if (len <= 1.0) {
                    inCoord = 0.0;
                  } else {
                    float sz2 = 2.0 * len;
                    if (inCoord < sz2) {
                      inCoord = sz2 * float(int(float(-inCoord / sz2))) +
                      inCoord;
                    }
                    inCoord = inCoord < -len ? inCoord + sz2 : -inCoord - 1.0;
                  }
                } else if (inCoord > len - 1.0) {
                  if (len <= 1.0) {
                    inCoord = 0.0;
                  } else {
                    float sz2 = 2.0 * len;
                    inCoord -= sz2 * float(int(float(inCoord / sz2)));
                    if (inCoord >= len) {
                      inCoord = sz2 - inCoord - 1.0;
                    }
                  }
                }
                return clamp(inCoord, 0.0, len - 1.0);
              } else if (${c} == 3) {
                if (inCoord < 0.0) {
                  if (len <= 1.0) {
                    inCoord = 0.0;
                  } else {
                    float sz = len - 1.0;
                    inCoord += len * (float(int(float(-inCoord / sz))) + 1.0);
                  }
                } else if (inCoord > len - 1.0) {
                  if (len <= 1.0) {
                    inCoord = 0.0;
                  } else {
                    float sz = len - 1.0;
                    inCoord -= len * float(int(float(inCoord / sz)));
                  }
                }
                return clamp(inCoord, 0.0, len - 1.0);
              } else if (${c} == 4) {
                return clamp(outCoord, 0.0, len - 1.0);
              } else {
                return outCoord;
              }
            }

            float readWithFillValue(int batch, int coordY, int coordX,
              int channel) {
              float outputValue;
              if (0 <= coordY && coordY < ${t} && 0 <= coordX && coordX < ${e}) {
                  outputValue = getImage(batch, coordY, coordX, channel);
              } else {
                outputValue = float(${s});
              }
              return outputValue;
            }

            void main() {
              ivec4 coords = getOutputCoords();
              float outputValue;
              int batch = coords[0];
              int x = coords[2];
              int y = coords[1];
              int channel = coords[3];
              float xf = float(x);
              float yf = float(y);
              float a1 = getTransforms(batch, 0);
              float a2 = getTransforms(batch, 1);
              float a3 = getTransforms(batch, 2);
              float b1 = getTransforms(batch, 3);
              float b2 = getTransforms(batch, 4);
              float b3 = getTransforms(batch, 5);
              float c1 = getTransforms(batch, 6);
              float c2 = getTransforms(batch, 7);
              float projection = c1 * xf + c2 * yf + 1.0;
              if (projection == 0.0) {
                outputValue = float(${s});
              } else {
                float inX = (a1 * xf + a2 * yf + a3) / projection;
                float inY = (b1 * xf + b2 * yf + b3) / projection;
                float mapX = mapCoord(inX, float(${e}));
                float mapY = mapCoord(inY, float(${t}));

                if (${i} == 1) {
                  int coordY = int(round(mapY));
                  int coordX = int(round(mapX));
                  outputValue = readWithFillValue(batch, coordY, coordX,
                    channel);
                } else {
                  float yFloor = floor(mapY);
                  float xFloor = floor(mapX);
                  float yCeil = yFloor + 1.0;
                  float xCeil = xFloor + 1.0;
                  float valueYFloor = (xCeil - mapX) *
                  readWithFillValue(batch, int(yFloor), int(xFloor), channel) +
                  (mapX - xFloor) *
                  readWithFillValue(batch, int(yFloor), int(xCeil), channel);
                  float valueYCeil = (xCeil - mapX) *
                  readWithFillValue(batch, int(yCeil), int(xFloor), channel) +
                  (mapX - xFloor) *
                  readWithFillValue(batch, int(yCeil), int(xCeil), channel);
                  outputValue = (yCeil - mapY) * valueYFloor +
                  (mapY - yFloor) * valueYCeil;
                }
              }
              setOutput(outputValue);
            }
        `}};function MV(r){let{inputs:t,backend:e,attrs:o}=r,{image:n,transforms:s}=t,{interpolation:a,fillMode:i,fillValue:c,outputShape:l}=o,[p,u,m,f]=n.shape,[d,g]=l??[u,m],h=[p,d,g,f],x=new tf(u,m,a,i,c,h);return e.runWebGLProgram(x,[n,s],"float32")}var AI={kernelName:Ba,backendName:"webgl",kernelFunc:MV};function BV(r){let{inputs:t,attrs:e,backend:o}=r,{axis:n}=e,{x:s}=t;jr(s,"unique"),console.warn("WARNING: ","UI might be locked temporarily as data is being downloaded");let a=o.readSync(s.dataId),{outputValues:i,outputShape:c,indices:l}=qS(a,n,s.shape,s.dtype);return[o.makeTensorInfo(c,s.dtype,i),o.makeTensorInfo([l.length],"int32",l)]}var FI={kernelName:Va,backendName:"webgl",kernelFunc:BV};function VV(r){let{inputs:t,backend:e,attrs:o}=r,{value:n}=t,{axis:s}=o;s<0&&(s+=n.shape.length);let a=n,i=a.shape.length,c=n.shape[s],l=new Array(i-1),p=0;for(let g=0;g<i;g++)g!==s&&(l[p++]=a.shape[g]);let u=[],m=new Array(i).fill(0),f=a.shape.slice();f[s]=1;let d=new Array(c);for(let g=0;g<d.length;g++){m[s]=g;let h=$r({inputs:{x:a},backend:e,attrs:{begin:m,size:f}}),x=K({inputs:{x:h},backend:e,attrs:{shape:l}});d[g]=x,u.push(h)}return u.forEach(g=>e.disposeIntermediateTensorInfo(g)),d}var DI={kernelName:za,backendName:"webgl",kernelFunc:VV};var ef=class{constructor(t,e){this.variableNames=["x","segmentIds"];let o=t.windowSize,n=t.batchSize,s=t.inSize,a=t.numSegments,i=a*Math.ceil(s/o);this.outputShape=[n,i];let c="0.0",l="sumValue",p=Math.floor(o/4)*4,u=o%4,m=`
        sumValue += dot(values, segFilter);
    `,f="";s%o>0&&(f=`
        if (inIdx < 0 || inIdx >= ${s}) {
          return initializationValue;
        }
      `);let d="";s%o>0&&(d=`
        if (inIdx < 0 || inIdx >= ${s}) {
          return -1.0;
        }
      `),this.userCode=`
      const float initializationValue = ${c};

      float getValue(int batch, int inIdx) {
        ${f}
        return getX(batch, inIdx);
      }

      float getSegmentIdAtIndex(int inIdx) {
        ${d}
        return getSegmentIds(inIdx);
      }

      void main() {
        ivec2 coords = getOutputCoords();
        int batch = coords[0];
        int outIdx = coords[1];
        int inOffset = int(floor(float(outIdx) / float(
          ${a})) * float(${o}));
        int currentSeg = int(mod(float(outIdx), float(${a})));

        float sumValue = 0.0;

        for (int i = 0; i < ${p}; i += 4) {
          int inIdx = inOffset + i;
          vec4 values = vec4(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            getValue(batch, inIdx + 2),
            getValue(batch, inIdx + 3)
          );

          vec4 segFilter = vec4(
            int(getSegmentIdAtIndex(inIdx)) == currentSeg ? 1 : 0,
            int(getSegmentIdAtIndex(inIdx + 1)) == currentSeg ? 1 : 0,
            int(getSegmentIdAtIndex(inIdx + 2)) == currentSeg ? 1 : 0,
            int(getSegmentIdAtIndex(inIdx + 3)) == currentSeg ? 1 : 0
          );

          ${m}
        }

        int inIdx = inOffset + ${p};
        if (${u===1}) {
          vec4 values = vec4(
            getValue(batch, inIdx),
            initializationValue,
            initializationValue,
            initializationValue
          );

          int inIdxSeg = int(getSegmentIdAtIndex(inIdx));

          vec4 segFilter = vec4(
            int(getSegmentIdAtIndex(inIdx)) == currentSeg ? 1 : 0,
            0,
            0,
            0
          );

          ${m}
        } else if (${u===2}) {
          vec4 values = vec4(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            initializationValue,
            initializationValue
          );

          vec4 segFilter = vec4(
            int(getSegmentIdAtIndex(inIdx)) == currentSeg ? 1 : 0,
            int(getSegmentIdAtIndex(inIdx + 1)) == currentSeg ? 1 : 0,
              0,
              0
          );

          ${m}
        } else if (${u===3}) {
          vec4 values = vec4(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            getValue(batch, inIdx + 2),
            initializationValue
          );

          vec4 segFilter = vec4(
            int(getSegmentIdAtIndex(inIdx)) == currentSeg ? 1 : 0,
            int(getSegmentIdAtIndex(inIdx + 1)) == currentSeg ? 1 : 0,
            int(getSegmentIdAtIndex(inIdx + 2)) == currentSeg ? 1 : 0,
            0
          );

          ${m}
        }
        setOutput(${l});
      }
    `}};function zV(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,segmentIds:s}=t,{numSegments:a}=o,i=n.shape.length,c=[],l=0,p=I.getAxesPermutation([l],i),u=n;p!=null&&(u=Mt({inputs:{x:n},backend:e,attrs:{perm:p}}),c.push(u),l=I.getInnerMostAxes(1,i)[0]);let m=I.segment_util.computeOutShape(u.shape,l,a),f=y.sizeFromShape([u.shape[l]]),d=K({inputs:{x:u},backend:e,attrs:{shape:[-1,f]}});c.push(d);let g=Mn(n.dtype),h=(w,k,$,R,A)=>{let D=w.shape[0],_=w.shape[1],O=I.segment_util.segOpComputeOptimalWindowSize(_,A),L={windowSize:O,inSize:_,batchSize:D,numSegments:A},M=new ef(L,k),V=e.compileAndRun(M,[w,$],R);if(c.push(V),V.shape[1]===A)return V;let B=Gx({backend:e,attrs:{start:0,stop:A,step:1,dtype:"float32"}}),G=Ux({inputs:{x:B},backend:e,attrs:{reps:[_/O]}});return c.push(B),c.push(G),h(V,k,G,R,A)},x=h(d,"unsortedSegmentSum",s,g,a),b=K({inputs:{x},backend:e,attrs:{shape:m}}),S=b;if(p!=null){c.push(b);let w=I.getUndoAxesPermutation(p);S=Mt({inputs:{x:S},backend:e,attrs:{perm:w}})}return c.forEach(w=>e.disposeIntermediateTensorInfo(w)),S}var _I={kernelName:Wa,backendName:"webgl",kernelFunc:zV};var WV=[Cw,Sw,ww,Nw,vw,kw,Ew,$w,Fw,Dw,_w,Ow,Pw,Lw,Mw,Bw,Vw,zw,Ww,Gw,Uw,Kw,qw,Xw,Qw,tN,eN,pw,oN,sN,aN,iN,cN,lN,pN,uN,mN,fN,dN,xN,yN,bN,CN,TN,SN,wN,NN,IN,vN,kN,EN,$N,RN,AN,FN,_N,ON,PN,LN,BN,VN,zN,WN,GN,UN,HN,KN,qN,lw,XN,nN,jN,YN,ZN,uw,QN,JN,t1,e1,r1,o1,n1,s1,a1,i1,l1,p1,u1,m1,f1,d1,g1,y1,b1,C1,T1,S1,k1,dw,E1,$1,R1,A1,jw,F1,O1,P1,L1,M1,mw,B1,V1,z1,W1,Yw,w1,G1,U1,H1,gw,K1,q1,X1,j1,Y1,Z1,Q1,J1,tI,eI,rI,oI,nI,sI,aI,iI,Hw,v1,cI,lI,pI,uI,mI,fI,dI,hI,xI,yI,CI,TI,SI,wI,NI,II,I1,yw,vI,kI,EI,RI,AI,bw,FI,DI,_I,D1];for(let r of WV)Oi(r);var GV=ue.whereImpl,ql=class r extends Ar{constructor(){super(),this.blockSize=48,this.firstUse=!0,this.data=new Ro(this,Cr())}nextDataId(){return r.nextDataId++}write(t,e,o){this.firstUse&&(this.firstUse=!1,F().get("IS_NODE")&&I.warn(`
============================
Hi, looks like you are running TensorFlow.js in Node.js. To speed things up dramatically, install our node backend, visit https://github.com/tensorflow/tfjs-node for more details. 
============================`));let n={id:this.nextDataId()};return this.data.set(n,{values:t,dtype:o,refCount:1}),n}makeTensorInfo(t,e,o){let n;if(e==="string"&&o!=null&&o.length>0&&y.isString(o[0])){let s=o.map(a=>y.encodeString(a));n=this.write(s,t,e)}else n=this.write(o,t,e);return{dataId:n,shape:t,dtype:e}}refCount(t){return this.data.has(t)?this.data.get(t).refCount:0}incRef(t){let e=this.data.get(t);e.refCount++}decRef(t){if(this.data.has(t)){let e=this.data.get(t);e.refCount--}}move(t,e,o,n,s){this.data.set(t,{values:e,dtype:n,refCount:s})}numDataIds(){return this.data.numDataIds()}async read(t){return this.readSync(t)}readSync(t){let{dtype:e,complexTensorInfos:o}=this.data.get(t);if(e==="complex64"){let n=this.readSync(o.real.dataId),s=this.readSync(o.imag.dataId);return I.mergeRealAndImagArrays(n,s)}return this.data.get(t).values}bufferSync(t){let e=this.readSync(t.dataId);if(t.dtype==="string")try{let o=e.map(n=>y.decodeString(n));return et(t.shape,t.dtype,o)}catch{throw new Error("Failed to decode encoded string bytes into utf-8")}return et(t.shape,t.dtype,e)}makeOutput(t,e,o){return Cr().makeTensorFromTensorInfo(this.makeTensorInfo(e,o,t),this)}disposeData(t,e=!1){if(this.data.has(t)){if(this.data.get(t).refCount--,!e&&this.data.get(t).refCount>0)return!1;let{complexTensorInfos:o}=this.data.get(t);o!=null&&(this.disposeData(o.real.dataId,!0),this.disposeData(o.imag.dataId,!0)),this.data.delete(t)}return!0}disposeIntermediateTensorInfo(t){this.disposeData(t.dataId)}async time(t){let e=y.now();return t(),{kernelMs:y.now()-e}}memory(){return{unreliable:!0,reasons:["The reported memory is an upper bound. Due to automatic garbage collection, the true allocated memory may be less."]}}where(t){W([t],"where");let e=this.readSync(t.dataId);return GV(t.shape,e)}dispose(){}floatPrecision(){return 32}epsilon(){return super.epsilon()}};ql.nextDataId=0;Jc("cpu",()=>new ql,1);var Hx=lt(Uo,r=>r>=0?r:Math.exp(r)-1),OI={kernelName:Uo,backendName:"cpu",kernelFunc:Hx};function Kx(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{alpha:s}=o;W([n],"leakyRelu");let a=y.sizeFromShape(n.shape),i=e.data.get(n.dataId).values,c=y.getTypedArrayFromDType("float32",a);for(let l=0;l<i.length;l++)c[l]=i[l]<0?s*i[l]:i[l];return e.makeTensorInfo(n.shape,"float32",c)}var PI={kernelName:Ks,backendName:"cpu",kernelFunc:Kx};var UV=yt((r,t)=>r<0?t*r:r);function qx(r){let{inputs:t,backend:e}=r,{x:o,alpha:n}=t;W([o,n],"prelu");let s=e.data.get(o.dataId).values,a=e.data.get(n.dataId).values,[i,c]=UV(o.shape,n.shape,s,a,"float32");return e.makeTensorInfo(c,"float32",i)}var LI={kernelName:ua,backendName:"cpu",kernelFunc:qx};var Xx=lt(xn,r=>Math.max(0,r)),MI={kernelName:xn,backendName:"cpu",kernelFunc:Xx};var jx=lt(yn,r=>Math.min(Math.max(0,r),6)),BI={kernelName:yn,backendName:"cpu",kernelFunc:jx};function vi(r,t,e,o,n){if(e==="linear")return ye({inputs:{x:t},backend:r});if(e==="relu")return Xx({inputs:{x:t},backend:r});if(e==="elu")return Hx({inputs:{x:t},backend:r});if(e==="relu6")return jx({inputs:{x:t},backend:r});if(e==="prelu")return qx({inputs:{x:t,alpha:o},backend:r});if(e==="leakyrelu")return Kx({inputs:{x:t},backend:r,attrs:{alpha:n}});if(e==="sigmoid")return xx({inputs:{x:t},backend:r});throw new Error(`Activation ${e} has not been implemented for the CPU backend.`)}function gt(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{shape:s}=o,a=y.sizeFromShape(n.shape),i=y.inferFromImplicitShape(s,a),c=y.sizeFromShape(i);y.assert(a===c,()=>`The new shape (${i}) has ${c} elements and the old shape (${n.shape}) has ${a} elements. The new shape and old shape must have the same number of elements.`),e.incRef(n.dataId);let l=e.data.get(n.dataId);if(l.complexTensorInfos!=null){let p=l.complexTensorInfos.real,u=l.complexTensorInfos.imag;p.shape=i,u.shape=i}return{dataId:n.dataId,shape:i,dtype:n.dtype}}var VI={kernelName:xa,backendName:"cpu",kernelFunc:gt};function Yx(r){let{inputs:t,backend:e,attrs:o}=r,{a:n,b:s}=t,{transposeA:a,transposeB:i}=o;W([n,s],"matMul");let c=n.shape.length,l=s.shape.length,p=a?n.shape[c-2]:n.shape[c-1],u=i?s.shape[l-1]:s.shape[l-2],m=a?n.shape[c-1]:n.shape[c-2],f=i?s.shape[l-2]:s.shape[l-1],d=n.shape.slice(0,-2),g=s.shape.slice(0,-2),h=y.sizeFromShape(d),x=y.sizeFromShape(g),S=Tr.assertAndGetBroadcastShape(n.shape.slice(0,-2),s.shape.slice(0,-2)).concat([m,f]);y.assert(p===u,()=>`Error in matMul: inner shapes (${p}) and (${u}) of Tensors with shapes ${n.shape} and ${s.shape} and transposeA=${a} and transposeB=${i} must match.`);let w=a?[h,p,m]:[h,m,p],k=i?[x,f,u]:[x,u,f],$=gt({inputs:{x:n},backend:e,attrs:{shape:w}}),R=gt({inputs:{x:s},backend:e,attrs:{shape:k}}),A=a?$.shape[1]:$.shape[2],D=a?$.shape[2]:$.shape[1],_=i?R.shape[1]:R.shape[2],O=Math.max(h,x),L=e.data.get($.dataId).values,M=e.data.get(R.dataId).values,V=y.computeStrides($.shape),B=y.computeStrides(R.shape),[G,U,z]=a?[V[0],1,V[1]]:[V[0],V[1],1],[H,X,j]=i?[1,B[1],B[0]]:[B[1],1,B[0]],Q=D*_,Y=et([O,D,_],$.dtype),tt=Y.values,Z=e.blockSize;for(let rt=0;rt<O;rt++)for(let it=0;it<D;it+=Z)for(let ut=0;ut<_;ut+=Z)for(let mt=0;mt<A;mt+=Z){let xt=Math.min(it+Z,D),Nt=Math.min(ut+Z,_),_t=Math.min(mt+Z,A);for(let Bt=it;Bt<xt;Bt++)for(let Gt=ut;Gt<Nt;Gt++){let qt=0;for(let Ot=mt;Ot<_t;Ot++){let Zt=Math.min(rt,h-1)*G,te=Math.min(rt,x-1)*j,Jr=L[Zt+Bt*U+Ot*z],fe=M[Ot*H+Gt*X+te];qt+=Jr*fe}tt[rt*Q+(Bt*_+Gt)]+=qt}}return e.disposeIntermediateTensorInfo($),e.disposeIntermediateTensorInfo(R),e.makeTensorInfo(S,Y.dtype,Y.values)}var zI={kernelName:ds,backendName:"cpu",kernelFunc:Yx};function HV(r){let{inputs:t,backend:e,attrs:o}=r,{a:n,b:s,bias:a,preluActivationWeights:i}=t,{transposeA:c,transposeB:l,activation:p,leakyreluAlpha:u}=o,m,f,d,g=[];m=Yx({inputs:{a:n,b:s},attrs:{transposeA:c,transposeB:l},backend:e}),a&&(f=Yr({inputs:{a:m,b:a},backend:e}),g.push(m),m=f),p&&(d=vi(e,m,p,i,u),g.push(m),m=d);for(let x of g)e.disposeIntermediateTensorInfo(x);return m}var WI={kernelName:Dn,backendName:"cpu",kernelFunc:HV};var KV=lt(Fo,r=>Math.acos(r)),GI={kernelName:Fo,backendName:"cpu",kernelFunc:KV};var qV=lt(Do,r=>Math.acosh(r)),UI={kernelName:Do,backendName:"cpu",kernelFunc:qV};function XV(r){let{inputs:t,backend:e}=r,o=t;W(t,"addN");let n=o.map(i=>e.data.get(i.dataId).values),s=et(o[0].shape,o[0].dtype),a=s.values;for(let i=0;i<o.length;i++){let c=n[i];for(let l=0;l<a.length;l++)a[l]+=c[l]}return e.makeTensorInfo(s.shape,s.dtype,s.values)}var HI={kernelName:is,backendName:"cpu",kernelFunc:XV};function jV(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,keepDims:a}=o;W(n,"all");let i=y.parseAxisParam(s,n.shape),c=i,l=I.getAxesPermutation(c,n.shape.length),p=n;l!=null&&(p=Wt({inputs:{x:n},backend:e,attrs:{perm:l}}),c=I.getInnerMostAxes(c.length,n.shape.length)),I.assertAxesAreInnerMostDims("all",c,p.shape.length);let[u,m]=I.computeOutAndReduceShapes(p.shape,c),f=y.sizeFromShape(m),d=y.makeZerosTypedArray(y.sizeFromShape(u),p.dtype),g=e.data.get(p.dataId).values;for(let x=0;x<d.length;++x){let b=x*f,S=g[b];for(let w=0;w<f;++w){let k=g[b+w];S=S&&k}d[x]=S}l!=null&&e.disposeIntermediateTensorInfo(p);let h=e.makeTensorInfo(u,p.dtype,d);if(a){let x=I.expandShapeToKeepDim(u,i),b=gt({inputs:{x:h},backend:e,attrs:{shape:x}});return e.disposeIntermediateTensorInfo(h),b}return h}var KI={kernelName:cs,backendName:"cpu",kernelFunc:jV};function YV(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,keepDims:a}=o;W(n,"any");let i=y.parseAxisParam(s,n.shape),c=i,l=I.getAxesPermutation(c,n.shape.length),p=n;l!=null&&(p=Wt({inputs:{x:n},backend:e,attrs:{perm:l}}),c=I.getInnerMostAxes(c.length,n.shape.length)),I.assertAxesAreInnerMostDims("any",c,p.shape.length);let[u,m]=I.computeOutAndReduceShapes(p.shape,c),f=y.sizeFromShape(m),d=y.makeZerosTypedArray(y.sizeFromShape(u),p.dtype),g=e.data.get(p.dataId).values;for(let x=0;x<d.length;++x){let b=x*f,S=g[b];for(let w=0;w<f;++w){let k=g[b+w];S=S||k}d[x]=S}l!=null&&e.disposeIntermediateTensorInfo(p);let h=e.makeTensorInfo(u,p.dtype,d);if(a){let x=I.expandShapeToKeepDim(u,i),b=gt({inputs:{x:h},backend:e,attrs:{shape:x}});return e.disposeIntermediateTensorInfo(h),b}return h}var qI={kernelName:ls,backendName:"cpu",kernelFunc:YV};function ZV(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s}=o;W(n,"argMax");let a=y.parseAxisParam(s,n.shape),i=I.getAxesPermutation(a,n.shape.length),c=n,l=[];i!=null&&(c=Wt({inputs:{x:n},backend:e,attrs:{perm:i}}),l.push(c),a=I.getInnerMostAxes(a.length,c.shape.length)),a=[a[0]],I.assertAxesAreInnerMostDims("argMax",a,c.shape.length);let[p,u]=I.computeOutAndReduceShapes(c.shape,a),m=y.sizeFromShape(p),f=y.makeZerosTypedArray(m,"int32"),d=y.sizeFromShape(u),g=e.data.get(c.dataId).values;for(let h=0;h<f.length;++h){let x=h*d,b=g[x],S=0;for(let w=0;w<d;++w){let k=g[x+w];k>b&&(b=k,S=w)}f[h]=S}return l.forEach(h=>e.disposeIntermediateTensorInfo(h)),e.makeTensorInfo(p,"int32",f)}var XI={kernelName:ps,backendName:"cpu",kernelFunc:ZV};function QV(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s}=o;W(n,"argMin");let a=y.parseAxisParam(s,n.shape),i=I.getAxesPermutation(a,n.shape.length),c=n,l=[];i!=null&&(c=Wt({inputs:{x:n},backend:e,attrs:{perm:i}}),l.push(c),a=I.getInnerMostAxes(a.length,c.shape.length)),a=[a[0]],I.assertAxesAreInnerMostDims("argMin",a,c.shape.length);let[p,u]=I.computeOutAndReduceShapes(c.shape,a),m=y.sizeFromShape(p),f=y.makeZerosTypedArray(m,"int32"),d=y.sizeFromShape(u),g=e.data.get(c.dataId).values;for(let h=0;h<f.length;++h){let x=h*d,b=g[x],S=0;for(let w=0;w<d;++w){let k=g[x+w];k<b&&(b=k,S=w)}f[h]=S}return l.forEach(h=>e.disposeIntermediateTensorInfo(h)),e.makeTensorInfo(p,"int32",f)}var jI={kernelName:us,backendName:"cpu",kernelFunc:QV};var JV=lt(_o,r=>Math.asin(r)),YI={kernelName:_o,backendName:"cpu",kernelFunc:JV};var tz=lt(Oo,r=>Math.asinh(r)),ZI={kernelName:Oo,backendName:"cpu",kernelFunc:tz};var ez=lt(Po,r=>Math.atan(r)),QI={kernelName:Po,backendName:"cpu",kernelFunc:ez};var rz=yt((r,t)=>Math.atan2(r,t)),oz=vt(Mo,rz),JI={kernelName:Mo,backendName:"cpu",kernelFunc:oz};var nz=lt(Lo,r=>Math.atanh(r)),tv={kernelName:Lo,backendName:"cpu",kernelFunc:nz};function Sc(r,t,e,o,n,s){let a=n.strideHeight,i=n.strideWidth,c=n.dilationHeight,l=n.dilationWidth,p=n.effectiveFilterHeight,u=n.effectiveFilterWidth,m=n.padInfo.top,f=n.padInfo.left,d=s==="max"?Number.NEGATIVE_INFINITY:Number.POSITIVE_INFINITY,g=et(n.outShape,e),h=g.values,x=n.outShape[1]*n.outShape[2]*n.outShape[3],b=n.outShape[2]*n.outShape[3],S=n.outShape[3];for(let w=0;w<n.batchSize;++w){let k=w*x,$=w*o[0];for(let R=0;R<n.inChannels;++R)for(let A=0;A<n.outHeight;++A){let D=A*a-m,_=Math.max(0,D),O=Math.min(n.inHeight,p+D),L=k+A*b;for(let M=0;M<n.outWidth;++M){let V=M*i-f,B=Math.max(0,V),G=Math.min(n.inWidth,u+V),U=d,z=0,H=0;for(let j=_;j<O;j+=c){let Q=$+j*o[1];for(let Y=B;Y<G;Y+=l){let tt=Q+Y*o[2],Z=r[tt+R];s==="max"&&Z>U?U=Z:s==="avg"&&(z+=Z,H++)}if(isNaN(U))break}let X=L+M*S+R;h[X]=s==="avg"?z/H:U}}}return g}function rf(r,t,e,o,n=!1,s=!1){let a=et(o.outShape,"int32"),i=o.strideHeight,c=o.strideWidth,l=o.dilationHeight,p=o.dilationWidth,u=o.effectiveFilterHeight,m=o.effectiveFilterWidth,f=o.padInfo.top,d=o.padInfo.left,g=et(t,e,r);for(let h=0;h<o.batchSize;++h)for(let x=0;x<o.inChannels;++x)for(let b=0;b<o.outHeight;++b){let S=b*i-f,w=S;for(;w<0;)w+=l;let k=Math.min(o.inHeight,u+S);for(let $=0;$<o.outWidth;++$){let R=$*c-d,A=R;for(;A<0;)A+=p;let D=Math.min(o.inWidth,m+R),_=Number.NEGATIVE_INFINITY,O=-1;for(let L=w;L<k;L+=l){let M=L-S;for(let V=A;V<D;V+=p){let B=V-R,G=g.get(h,L,V,x);G>_&&(_=G,n?O=s?((h*o.inHeight+L)*o.inWidth+V)*o.inChannels+x:(L*o.inWidth+V)*o.inChannels+x:O=M*m+B)}}a.set(O,h,b,$,x)}}return a}function of(r,t,e,o,n,s){let a=n.strideDepth,i=n.strideHeight,c=n.strideWidth,l=n.dilationDepth,p=n.dilationHeight,u=n.dilationWidth,m=n.effectiveFilterDepth,f=n.effectiveFilterHeight,d=n.effectiveFilterWidth,g=n.padInfo.front,h=n.padInfo.top,x=n.padInfo.left,b=s==="max"?Number.NEGATIVE_INFINITY:Number.POSITIVE_INFINITY,S=et(n.outShape,e),w=S.values,k=n.outShape[1]*n.outShape[2]*n.outShape[3]*n.outShape[4],$=n.outShape[2]*n.outShape[3]*n.outShape[4],R=n.outShape[3]*n.outShape[4],A=n.outShape[4];for(let D=0;D<n.batchSize;++D){let _=D*k,O=D*o[0];for(let L=0;L<n.inChannels;++L)for(let M=0;M<n.outDepth;++M){let V=M*a-g,B=V;for(;B<0;)B+=l;let G=Math.min(n.inDepth,m+V),U=_+M*$;for(let z=0;z<n.outHeight;++z){let H=z*i-h,X=H;for(;X<0;)X+=p;let j=Math.min(n.inHeight,f+H),Q=U+z*R;for(let Y=0;Y<n.outWidth;++Y){let tt=Y*c-x,Z=tt;for(;Z<0;)Z+=u;let rt=Math.min(n.inWidth,d+tt),it=Q+Y*A,ut=b,mt=0,xt=0;for(let _t=B;_t<G;_t+=l){let Bt=O+_t*o[1];for(let Gt=X;Gt<j;Gt+=p){let qt=Bt+Gt*o[2];for(let Ot=Z;Ot<rt;Ot+=u){let Zt=qt+Ot*o[3],te=r[Zt+L];if(s==="max"&&te>ut?ut=te:s==="avg"&&(mt+=te,xt++),isNaN(ut))break}if(isNaN(ut))break}if(isNaN(ut))break}let Nt=it+L;w[Nt]=s==="avg"?mt/xt:ut}}}}return S}function ev(r,t){let e=et(t.outShape,"int32"),o=t.strideDepth,n=t.strideHeight,s=t.strideWidth,a=t.dilationDepth,i=t.dilationHeight,c=t.dilationWidth,l=t.effectiveFilterDepth,p=t.effectiveFilterHeight,u=t.effectiveFilterWidth,m=t.padInfo.front,f=t.padInfo.top,d=t.padInfo.left;for(let g=0;g<t.batchSize;++g)for(let h=0;h<t.inChannels;++h)for(let x=0;x<t.outDepth;++x){let b=x*o-m,S=b;for(;S<0;)S+=a;let w=Math.min(t.inDepth,l+b);for(let k=0;k<t.outHeight;++k){let $=k*n-f,R=$;for(;R<0;)R+=i;let A=Math.min(t.inHeight,p+$);for(let D=0;D<t.outWidth;++D){let _=D*s-d,O=_;for(;O<0;)O+=c;let L=Math.min(t.inWidth,u+_),M=Number.NEGATIVE_INFINITY,V=-1;for(let B=S;B<w;B+=a){let G=B-b;for(let U=R;U<A;U+=i){let z=U-$;for(let H=O;H<L;H+=c){let X=H-_,j=r.get(g,B,U,H,h);j>=M&&(M=j,V=G*p*u+z*p+X)}}}e.set(V,g,x,k,D,h)}}}return e}function sz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t;W(n,"avgPool");let{filterSize:s,strides:a,pad:i,dimRoundingMode:c}=o,l=1;y.assert(I.eitherStridesOrDilationsAreOne(a,l),()=>`Error in avgPool: Either strides or dilations must be 1. Got strides ${a} and dilations '${l}'`);let p=I.computePool2DInfo(n.shape,s,a,l,i,c),u;if(p.filterWidth===1&&p.filterHeight===1&&y.arraysEqual(p.inShape,p.outShape))u=ye({inputs:{x:n},backend:e});else{let m=e.data.get(n.dataId).values,f=y.computeStrides(n.shape),d=Sc(m,n.shape,n.dtype,f,p,"avg");u=e.makeTensorInfo(p.outShape,n.dtype,d.values)}return u}var rv={kernelName:ms,backendName:"cpu",kernelFunc:sz};function az(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{filterSize:s,strides:a,pad:i,dimRoundingMode:c,dataFormat:l}=o;W(n,"avgPool3d");let p=I.computePool3DInfo(n.shape,s,a,1,i,c,l),u=e.data.get(n.dataId).values,m=of(u,n.shape,n.dtype,y.computeStrides(n.shape),p,"avg");return e.makeTensorInfo(m.shape,"float32",m.values)}var ov={kernelName:fs,backendName:"cpu",kernelFunc:az};function iz(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,input:s}=t,{filterSize:a,strides:i,pad:c,dimRoundingMode:l}=o;W([n,s],"avgPool3DGrad");let p=I.computePool3DInfo(s.shape,a,i,1,c,l),u=p.strideDepth,m=p.strideHeight,f=p.strideWidth,d=p.filterDepth,g=p.filterHeight,h=p.filterWidth,x=p.dilationDepth,b=p.dilationHeight,S=p.dilationWidth,w=p.effectiveFilterDepth,k=p.effectiveFilterHeight,$=p.effectiveFilterWidth,R=w-1-p.padInfo.front,A=$-1-p.padInfo.left,D=k-1-p.padInfo.top,_=et(s.shape,"float32"),O=1/(d*g*h),L=e.bufferSync(n);for(let M=0;M<p.batchSize;++M)for(let V=0;V<p.inChannels;++V)for(let B=0;B<p.inDepth;++B)for(let G=0;G<p.inHeight;++G)for(let U=0;U<p.inWidth;++U){let z=B-R,H=G-D,X=U-A,j=0;for(let Q=0;Q<w;Q+=x){let Y=(z+Q)/u;if(!(Y<0||Y>=p.outDepth||Math.floor(Y)!==Y))for(let tt=0;tt<k;tt+=b){let Z=(H+tt)/m;if(!(Z<0||Z>=p.outHeight||Math.floor(Z)!==Z))for(let rt=0;rt<$;rt+=S){let it=(X+rt)/f;if(it<0||it>=p.outWidth||Math.floor(it)!==it)continue;let ut=L.get(M,Y,Z,it,V);j+=ut}}}_.set(j*O,M,B,G,U,V)}return e.makeTensorInfo(_.shape,_.dtype,_.values)}var nv={kernelName:Fc,backendName:"cpu",kernelFunc:iz};function cz(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,input:s}=t,a=s;W([n,s],"avgPoolGrad");let{filterSize:i,strides:c,pad:l}=o,p=I.computePool2DInfo(a.shape,i,c,1,l),u=p.strideHeight,m=p.strideWidth,f=p.filterHeight,d=p.filterWidth,g=p.dilationHeight,h=p.dilationWidth,x=p.effectiveFilterHeight,b=p.effectiveFilterWidth,S=b-1-p.padInfo.left,w=x-1-p.padInfo.top,k=et(a.shape,"float32"),$=1/(f*d),R=e.data.get(n.dataId).values,A=et(n.shape,"float32",R);for(let D=0;D<p.batchSize;++D)for(let _=0;_<p.inChannels;++_)for(let O=0;O<p.inHeight;++O)for(let L=0;L<p.inWidth;++L){let M=O-w,V=L-S,B=0;for(let G=0;G<x;G+=g){let U=(M+G)/u;if(!(U<0||U>=p.outHeight||Math.floor(U)!==U))for(let z=0;z<b;z+=h){let H=(V+z)/m;if(H<0||H>=p.outWidth||Math.floor(H)!==H)continue;let X=A.get(D,U,H,_);B+=X}}k.set(B*$,D,O,L,_)}return e.makeTensorInfo(k.shape,k.dtype,k.values)}var sv={kernelName:Ac,backendName:"cpu",kernelFunc:cz};function lz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,scale:s,offset:a,mean:i,variance:c}=t;y.assert(i.shape.length===c.shape.length,()=>"Batch normalization gradient requires mean and variance to have equal ranks."),y.assert(a==null||i.shape.length===a.shape.length,()=>"Batch normalization gradient requires mean and offset to have equal ranks."),y.assert(s==null||i.shape.length===s.shape.length,()=>"Batch normalization gradient requires mean and scale to have equal ranks."),W([n,i,c,s,a],"batchNorm");let{varianceEpsilon:l}=o;l==null&&(l=.001);let p=e.data.get(n.dataId).values,u=e.data.get(i.dataId).values,m=e.data.get(c.dataId).values,f=s?e.data.get(s.dataId).values:new Float32Array([1]),d=a?e.data.get(a.dataId).values:new Float32Array([0]),g=new Float32Array(p.length),h=d.length,x=f.length,b=m.length,S=u.length,w=0,k=0,$=0,R=0;for(let A=0;A<p.length;++A)g[A]=d[w++]+(p[A]-u[k++])*f[$++]/Math.sqrt(m[R++]+l),w>=h&&(w=0),k>=S&&(k=0),$>=x&&($=0),R>=b&&(R=0);return e.makeTensorInfo(n.shape,n.dtype,g)}var av={kernelName:zs,backendName:"cpu",kernelFunc:lz};function pz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{blockShape:s,crops:a}=o;W([n],"batchToSpaceND");let i=s.reduce((x,b)=>x*b),c=I.getReshaped(n.shape,s,i),l=I.getPermuted(c.length,s.length),p=I.getReshapedPermuted(n.shape,s,i),u=I.getSliceBeginCoords(a,s.length),m=I.getSliceSize(p,a,s.length),f=gt({inputs:{x:n},backend:e,attrs:{shape:c}}),d=Wt({inputs:{x:f},backend:e,attrs:{perm:l}}),g=gt({inputs:{x:d},backend:e,attrs:{shape:p}}),h=pr({inputs:{x:g},backend:e,attrs:{begin:u,size:m}});return e.disposeIntermediateTensorInfo(f),e.disposeIntermediateTensorInfo(d),e.disposeIntermediateTensorInfo(g),h}var iv={kernelName:hs,backendName:"cpu",kernelFunc:pz};function uz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,weights:s}=t,{size:a}=o,i=e.data.get(n.dataId).values,c=e.data.get(s.dataId).values,l=lc(i,c,s.dtype,s.shape,a);return e.makeTensorInfo([a],s.dtype,l)}var cv={kernelName:gs,backendName:"cpu",kernelFunc:uz};function mz(r){let{inputs:t,backend:e}=r,{s0:o,s1:n}=t,s=e.data.get(o.dataId).values,a=e.data.get(n.dataId).values,i=I.assertAndGetBroadcastShape(Array.from(s),Array.from(a));return e.makeTensorInfo([i.length],"int32",Int32Array.from(i))}var lv={kernelName:xs,backendName:"cpu",kernelFunc:mz};var fz=lt(Vo,(r,t)=>{let e=t;return r>e.clipValueMax?e.clipValueMax:r<e.clipValueMin?e.clipValueMin:r}),pv={kernelName:Vo,backendName:"cpu",kernelFunc:fz};var dz=r=>{let{x:t}=r.inputs,e=r.backend,o=new Float32Array(y.sizeFromShape(t.shape)),n=e.data.get(t.dataId),s=n.complexTensorInfos.real,a=n.complexTensorInfos.imag,i=e.data.get(s.dataId).values,c=e.data.get(a.dataId).values;for(let l=0;l<i.length;l++){let p=i[l],u=c[l];o[l]=Math.hypot(p,u)}return e.makeOutput(o,t.shape,"float32")},uv={kernelName:bs,backendName:"cpu",kernelFunc:dz};function Qr(r){let{inputs:t,backend:e}=r,{input:o}=t,n=e.data.get(o.dataId).complexTensorInfos.imag,s=e.data.get(n.dataId).values;return e.makeTensorInfo(n.shape,n.dtype,s)}var mv={kernelName:Hs,backendName:"cpu",kernelFunc:Qr};function rs(r){let{inputs:t,backend:e,attrs:o}=r,{axis:n}=o,s=y.parseAxisParam(n,t[0].shape)[0],a=t.map(g=>g.shape);I.assertParamsConsistent(a,s);let i=I.computeOutShape(t.map(g=>g.shape),s);if(y.sizeFromShape(i)===0)return e.makeTensorInfo(i,t[0].dtype,[]);let c=t.filter(g=>y.sizeFromShape(g.shape)>0);if(c.length===1)return ye({inputs:{x:c[0]},backend:e});if(c[0].dtype==="complex64"){let g=c.map(w=>ar({inputs:{input:w},backend:e})),h=c.map(w=>Qr({inputs:{input:w},backend:e})),x=rs({inputs:g,backend:e,attrs:{axis:s}}),b=rs({inputs:h,backend:e,attrs:{axis:s}}),S=se({inputs:{real:x,imag:b},backend:e});return g.forEach(w=>e.disposeIntermediateTensorInfo(w)),h.forEach(w=>e.disposeIntermediateTensorInfo(w)),e.disposeIntermediateTensorInfo(x),e.disposeIntermediateTensorInfo(b),S}let l=c.map(g=>{let x=[-1,y.sizeFromShape(g.shape.slice(s))];return gt({inputs:{x:g},backend:e,attrs:{shape:x}})}),p=l.map(g=>({vals:e.data.get(g.dataId).values,shape:g.shape}));i=I.computeOutShape(l.map(g=>g.shape),1);let u=l[0].shape[0]===1,m=fu(p,i,t[0].dtype,u),f=I.computeOutShape(c.map(g=>g.shape),s),d=e.makeTensorInfo(f,t[0].dtype,m);return l.forEach(g=>e.disposeIntermediateTensorInfo(g)),d}var fv={kernelName:Cs,backendName:"cpu",kernelFunc:rs};function Zx(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,filter:s}=t,{strides:a,pad:i,dataFormat:c,dilations:l,dimRoundingMode:p}=o;W([n,s],"conv2d");let u=I.convertConv2DDataFormat(c),m=I.computeConv2DInfo(n.shape,s.shape,a,l,i,p,!1,u),f=m.filterHeight,d=m.filterWidth,g=m.dilationHeight,h=m.dilationWidth,x=m.padInfo.left,b=m.padInfo.top,S=m.dataFormat==="channelsLast",w=new $t(m.outShape,n.dtype),k=y.computeStrides(n.shape),$=y.computeStrides(s.shape),R=k[0],A=S?k[1]:k[2],D=S?k[2]:1,_=S?1:k[1],O=w.strides[0],L=S?w.strides[1]:w.strides[2],M=S?w.strides[2]:1,V=S?1:w.strides[1],B=e.data.get(n.dataId).values,G=e.data.get(s.dataId).values,U=w.values;for(let z=0;z<m.batchSize;++z){let H=z*R,X=z*O;for(let j=0;j<m.outHeight;++j){let Q=X+j*L,Y=j*m.strideHeight-b;for(let tt=0;tt<f;++tt){let Z=Y+tt*g;if(Z<0||Z>=m.inHeight)continue;let rt=tt*$[0],it=H+Z*A;for(let ut=0;ut<m.outWidth;++ut){let mt=Q+ut*M,xt=ut*m.strideWidth-x;for(let Nt=0;Nt<d;++Nt){let _t=xt+Nt*h;if(_t<0||_t>=m.inWidth)continue;let Bt=rt+Nt*$[1],Gt=it+_t*D,qt=Bt;for(let Ot=0;Ot<m.inChannels;++Ot){let Zt=B[Gt+Ot*_];for(let te=0;te<m.outChannels;++te)U[mt+te*V]+=Zt*G[qt+te];qt+=m.outChannels}}}}}}return e.makeTensorInfo(w.shape,w.dtype,U)}var dv={kernelName:Ts,backendName:"cpu",kernelFunc:Zx};function hz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,dy:s}=t,{strides:a,pad:i,dataFormat:c,dimRoundingMode:l,filterShape:p}=o;W([n,s],"conv2dBackpropFilter");let u=I.convertConv2DDataFormat(c),m=I.computeConv2DInfo(n.shape,p,a,1,i,l,!1,u),{strideHeight:f,strideWidth:d,filterHeight:g,filterWidth:h}=m,x=m.dataFormat==="channelsLast",b=new $t(m.filterShape,"float32"),S=m.padInfo.left,w=m.padInfo.top,k=e.data.get(n.dataId).values,$=e.data.get(s.dataId).values,R=new $t(n.shape,n.dtype,k),A=new $t(s.shape,s.dtype,$);for(let D=0;D<g;++D){let _=Math.max(0,Math.ceil((w-D)/f)),O=Math.min(m.outHeight,(m.inHeight+w-D)/f);for(let L=0;L<h;++L){let M=Math.max(0,Math.ceil((S-L)/d)),V=Math.min(m.outWidth,(m.inWidth+S-L)/d);for(let B=0;B<m.inChannels;++B)for(let G=0;G<m.outChannels;++G){let U=0;for(let z=0;z<m.batchSize;++z)for(let H=_;H<O;++H){let X=D+H*f-w;for(let j=M;j<V;++j){let Q=L+j*d-S;x?U+=R.get(z,X,Q,B)*A.get(z,H,j,G):U+=R.get(z,B,X,Q)*A.get(z,G,H,j)}}b.set(U,D,L,B,G)}}}return e.makeTensorInfo(b.shape,b.dtype,b.values)}var hv={kernelName:Ss,backendName:"cpu",kernelFunc:hz};function gz(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,filter:s}=t,{inputShape:a,strides:i,pad:c,dataFormat:l,dimRoundingMode:p}=o;W([n,s],"conv2dBackpropInput");let u=y.computeStrides(s.shape),m=y.computeStrides(n.shape),f=I.convertConv2DDataFormat(l),d=I.computeConv2DInfo(a,s.shape,i,1,c,p,!1,f),g=new $t(d.inShape,"float32"),h=g.values,x=e.data.get(n.dataId).values,b=e.data.get(s.dataId).values,[S,w,k]=u,{batchSize:$,filterHeight:R,filterWidth:A,inChannels:D,inHeight:_,inWidth:O,outChannels:L,outHeight:M,outWidth:V,strideHeight:B,strideWidth:G}=d;f=d.dataFormat;let U=R-1-d.padInfo.top,z=A-1-d.padInfo.left,H=f==="channelsLast",X=g.strides[0],j=H?g.strides[1]:g.strides[2],Q=H?g.strides[2]:1,Y=H?1:g.strides[1],tt=m[0],Z=H?m[1]:m[2],rt=H?m[2]:1,it=H?1:m[1];for(let ut=0;ut<$;++ut)for(let mt=0;mt<D;++mt)for(let xt=0;xt<_;++xt){let Nt=xt-U,_t=Math.max(0,Math.ceil(Nt/B)),Bt=Math.min(M,(R+Nt)/B);for(let Gt=0;Gt<O;++Gt){let qt=Gt-z,Ot=Math.max(0,Math.ceil(qt/G)),Zt=Math.min(V,(A+qt)/G),te=0;for(let fe=_t;fe<Bt;++fe){let vo=fe*B-Nt;for(let He=Ot;He<Zt;++He){let os=He*G-qt,dr=tt*ut+Z*fe+rt*He,to=S*(R-1-vo)+w*(A-1-os)+k*mt;for(let ko=0;ko<L;++ko){let Eo=x[dr+it*ko],$o=b[to+ko];te+=Eo*$o}}}let Jr=X*ut+j*xt+Q*Gt+Y*mt;h[Jr]=te}}return e.makeTensorInfo(g.shape,g.dtype,g.values)}var gv={kernelName:ws,backendName:"cpu",kernelFunc:gz};function xz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,filter:s}=t,{strides:a,pad:i,dilations:c}=o;W([n,s],"conv3d");let l=I.computeConv3DInfo(n.shape,s.shape,a,c,i),{filterDepth:p,filterHeight:u,filterWidth:m,dilationDepth:f,dilationHeight:d,dilationWidth:g,padInfo:h}=l,x=h.front,b=h.left,S=h.top,w=new $t(l.outShape,n.dtype),k=e.data.get(n.dataId).values,$=e.data.get(s.dataId).values,R=w.values,A=y.computeStrides(n.shape),D=y.computeStrides(s.shape);for(let _=0;_<l.batchSize;++_){let O=_*A[0],L=_*w.strides[0];for(let M=0;M<l.outDepth;++M){let V=L+M*w.strides[1],B=M*l.strideDepth-x;for(let G=0;G<p;++G){let U=B+G*f;if(U<0||U>=l.inDepth)continue;let z=G*D[0],H=O+U*A[1];for(let X=0;X<l.outHeight;++X){let j=V+X*w.strides[2],Q=X*l.strideHeight-S;for(let Y=0;Y<u;++Y){let tt=Q+Y*d;if(tt<0||tt>=l.inHeight)continue;let Z=z+Y*D[1],rt=H+tt*A[2];for(let it=0;it<l.outWidth;++it){let ut=j+it*l.outChannels,mt=it*l.strideWidth-b;for(let xt=0;xt<m;++xt){let Nt=mt+xt*g;if(Nt<0||Nt>=l.inWidth)continue;let _t=Z+xt*D[2],Bt=rt+Nt*l.inChannels,Gt=_t;for(let qt=0;qt<l.inChannels;++qt){let Ot=k[Bt+qt];for(let Zt=0;Zt<l.outChannels;++Zt)R[ut+Zt]+=Ot*$[Gt+Zt];Gt+=l.outChannels}}}}}}}}return e.makeTensorInfo(w.shape,w.dtype,w.values)}var xv={kernelName:Ns,backendName:"cpu",kernelFunc:xz};function yz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,dy:s}=t,{strides:a,pad:i,filterShape:c}=o;W([n,s],"conv3dBackpropFilterV2");let l=y.computeStrides(n.shape),p=y.computeStrides(s.shape),u=I.computeConv3DInfo(n.shape,c,a,1,i),m=u.strideDepth,f=u.strideHeight,d=u.strideWidth,g=u.filterDepth,h=u.filterHeight,x=u.filterWidth,b=new $t(u.filterShape,"float32"),S=b.values,[w,k,$,R]=b.strides,A=e.data.get(s.dataId).values,[D,_,O,L]=p,M=e.data.get(n.dataId).values,[V,B,G,U]=l,z=u.padInfo.front,H=u.padInfo.left,X=u.padInfo.top;for(let j=0;j<g;++j){let Q=Math.max(0,Math.ceil((z-j)/m)),Y=Math.min(u.outDepth,(u.inDepth+z-j)/m),tt=j*w;for(let Z=0;Z<h;++Z){let rt=Math.max(0,Math.ceil((X-Z)/f)),it=Math.min(u.outHeight,(u.inHeight+X-Z)/f),ut=Z*k+tt;for(let mt=0;mt<x;++mt){let xt=Math.max(0,Math.ceil((H-mt)/d)),Nt=Math.min(u.outWidth,(u.inWidth+H-mt)/d),_t=mt*$+ut;for(let Bt=0;Bt<u.inChannels;++Bt){let Gt=Bt*R+_t;for(let qt=0;qt<u.outChannels;++qt){let Ot=0;for(let Zt=0;Zt<u.batchSize;++Zt){let te=Zt*V,Jr=Zt*D;for(let fe=Q;fe<Y;++fe){let He=(j+fe*m-z)*B+te,os=fe*_+Jr;for(let dr=rt;dr<it;++dr){let ko=(Z+dr*f-X)*G+He,Eo=dr*O+os;for(let $o=xt;$o<Nt;++$o){let kf=(mt+$o*d-H)*U+ko,Ef=$o*L+Eo;Ot+=M[kf+Bt]*A[Ef+qt]}}}}S[Gt+qt]=Ot}}}}}return e.makeTensorInfo(b.shape,b.dtype,b.values)}var yv={kernelName:Dc,backendName:"cpu",kernelFunc:yz};function bz(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,filter:s}=t,{pad:a,strides:i,inputShape:c}=o;W([n],"conv3dBackpropInputV2");let l=y.computeStrides(n.shape),p=y.computeStrides(s.shape),u=I.computeConv3DInfo(c,s.shape,i,1,a),m=new $t(u.inShape,"float32"),f=m.values,[d,g,h,x]=m.strides,b=e.data.get(n.dataId).values,[S,w,k,$]=l,R=e.data.get(s.dataId).values,[A,D,_,O]=p,{batchSize:L,filterDepth:M,filterHeight:V,filterWidth:B,inChannels:G,inDepth:U,inHeight:z,inWidth:H,outChannels:X,outDepth:j,outHeight:Q,outWidth:Y,strideDepth:tt,strideHeight:Z,strideWidth:rt}=u,it=M-1-u.padInfo.front,ut=V-1-u.padInfo.top,mt=B-1-u.padInfo.left;for(let xt=0;xt<L;++xt)for(let Nt=0;Nt<G;++Nt)for(let _t=0;_t<U;++_t){let Bt=_t-it,Gt=Math.max(0,Math.ceil(Bt/tt)),qt=Math.min(j,(M+Bt)/tt);for(let Ot=0;Ot<z;++Ot){let Zt=Ot-ut,te=Math.max(0,Math.ceil(Zt/Z)),Jr=Math.min(Q,(V+Zt)/Z);for(let fe=0;fe<H;++fe){let vo=fe-mt,He=Math.max(0,Math.ceil(vo/rt)),os=Math.min(Y,(B+vo)/rt),dr=0;for(let to=Gt;to<qt;++to){let ko=to*tt-Bt;for(let Eo=te;Eo<Jr;++Eo){let $o=Eo*Z-Zt;for(let vc=He;vc<os;++vc){let kf=vc*rt-vo,Ef=S*xt+w*to+k*Eo+$*vc,ZE=A*(M-1-ko)+D*(V-1-$o)+_*(B-1-kf)+O*Nt;for(let np=0;np<X;++np){let QE=b[Ef+np],JE=R[ZE+np];dr+=QE*JE}}}}f[d*xt+g*_t+h*Ot+x*fe+Nt]=dr}}}return e.makeTensorInfo(m.shape,m.dtype,m.values)}var bv={kernelName:Is,backendName:"cpu",kernelFunc:bz};var Cz=lt(zo,r=>Math.cos(r)),Cv={kernelName:zo,backendName:"cpu",kernelFunc:Cz};var Tz=lt(Wo,r=>Math.cosh(r)),Tv={kernelName:Wo,backendName:"cpu",kernelFunc:Tz};function Sz(r){let{inputs:t,backend:e,attrs:o}=r,{image:n,boxes:s,boxInd:a}=t,{cropSize:i,method:c,extrapolationValue:l}=o,[p,u,m,f]=n.shape,d=s.shape[0],[g,h]=i,x=et([d,g,h,f],"float32"),b=e.data.get(s.dataId).values,S=e.data.get(a.dataId).values,w=e.data.get(n.dataId).values,k=y.computeStrides(n.shape),$=y.computeStrides(x.shape);for(let R=0;R<d;R++){let A=R*4,D=b[A],_=b[A+1],O=b[A+2],L=b[A+3],M=S[R];if(M>=p)continue;let V=g>1?(O-D)*(u-1)/(g-1):0,B=h>1?(L-_)*(m-1)/(h-1):0;for(let G=0;G<g;G++){let U=g>1?D*(u-1)+G*V:.5*(D+O)*(u-1);if(U<0||U>u-1){for(let z=0;z<h;z++)for(let H=0;H<f;H++){let X=H+z*$[2]+G*$[1]+R*$[0];x.values[X]=l}continue}if(c==="bilinear"){let z=Math.floor(U),H=Math.ceil(U),X=U-z;for(let j=0;j<h;j++){let Q=h>1?_*(m-1)+j*B:.5*(_+L)*(m-1);if(Q<0||Q>m-1){for(let rt=0;rt<f;rt++){let it=rt+j*$[2]+G*$[1]+R*$[0];x.values[it]=l}continue}let Y=Math.floor(Q),tt=Math.ceil(Q),Z=Q-Y;for(let rt=0;rt<f;rt++){let it=rt+Y*k[2]+z*k[1]+M*k[0],ut=w[it];it=rt+tt*k[2]+z*k[1]+M*k[0];let mt=w[it];it=rt+Y*k[2]+H*k[1]+M*k[0];let xt=w[it];it=rt+tt*k[2]+H*k[1]+M*k[0];let Nt=w[it],_t=ut+(mt-ut)*Z,Bt=xt+(Nt-xt)*Z;it=rt+j*$[2]+G*$[1]+R*$[0],x.values[it]=_t+(Bt-_t)*X}}}else for(let z=0;z<h;++z){let H=h>1?_*(m-1)+z*B:.5*(_+L)*(m-1);if(H<0||H>m-1){for(let Q=0;Q<f;Q++){let Y=Q+z*$[2]+G*$[1]+R*$[0];x.values[Y]=l}continue}let X=Math.round(H),j=Math.round(U);for(let Q=0;Q<f;Q++){let Y=Q+X*k[2]+j*k[1]+M*k[0],tt=Q+z*$[2]+G*$[1]+R*$[0];x.values[tt]=w[Y]}}}}return e.makeTensorInfo(x.shape,x.dtype,x.values)}var Sv={kernelName:Es,backendName:"cpu",kernelFunc:Sz};function wz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,exclusive:a,reverse:i}=o;W(n,"cumprod");let c=I.getAxesPermutation([s],n.shape.length),l=n;c!=null&&(l=Wt({inputs:{x:n},backend:e,attrs:{perm:c}}));let p=I.getInnerMostAxes(1,n.shape.length)[0];if(p!==l.shape.length-1)throw new Error(`backend.cumprod in CPU expects an inner-most axis=${l.shape.length-1} but got axis=${p}`);let u=Yt(l.dtype,"int32"),m=y.makeOnesTypedArray(y.sizeFromShape(l.shape),u),f=e.data.get(l.dataId).values,d=l.shape[l.shape.length-1],g=i?(x,b)=>x+d-b-1:(x,b)=>x+b;for(let x=0;x<f.length;x+=d)for(let b=0;b<d;b++){let S=g(x,b);if(b===0)m[S]=a?1:f[S];else{let w=g(x,b-1);m[S]=a?f[w]*m[w]:f[S]*m[w]}}let h=e.makeTensorInfo(l.shape,u,m);if(c!=null){let x=I.getUndoAxesPermutation(c),b=Wt({inputs:{x:h},backend:e,attrs:{perm:x}});return e.disposeIntermediateTensorInfo(h),e.disposeIntermediateTensorInfo(l),b}return h}var wv={kernelName:vs,backendName:"cpu",kernelFunc:wz};function Nz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,exclusive:a,reverse:i}=o;W(n,"cumsum");let c=I.getAxesPermutation([s],n.shape.length),l=n;c!=null&&(l=Wt({inputs:{x:n},backend:e,attrs:{perm:c}}));let p=I.getInnerMostAxes(1,n.shape.length)[0];if(p!==l.shape.length-1)throw new Error(`backend.cumsum in CPU expects an inner-most axis=${l.shape.length-1} but got axis=${p}`);let u=Yt(l.dtype,"int32"),m=y.makeZerosTypedArray(y.sizeFromShape(l.shape),u),f=e.data.get(l.dataId).values,d=l.shape[l.shape.length-1],g=i?(x,b)=>x+d-b-1:(x,b)=>x+b;for(let x=0;x<f.length;x+=d)for(let b=0;b<d;b++){let S=g(x,b);if(b===0)m[S]=a?0:f[S];else{let w=g(x,b-1);m[S]=a?f[w]+m[w]:f[S]+m[w]}}let h=e.makeTensorInfo(l.shape,u,m);if(c!=null){let x=I.getUndoAxesPermutation(c),b=Wt({inputs:{x:h},backend:e,attrs:{perm:x}});return e.disposeIntermediateTensorInfo(h),e.disposeIntermediateTensorInfo(l),b}return h}var Nv={kernelName:ks,backendName:"cpu",kernelFunc:Nz};function Iz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,weights:s}=t,{size:a,binaryOutput:i}=o;if(n.shape.length===1){let c=e.data.get(n.dataId).values,l=e.data.get(s.dataId).values,p=lc(c,l,s.dtype,s.shape,a);return e.makeTensorInfo([a],s.dtype,p)}else if(n.shape.length===2){let c=e.bufferSync(n),l=e.bufferSync(s),p=mu(c,l,a,i);return e.makeTensorInfo(p.shape,s.dtype,p.values)}throw new Error(`Error in denseBincount: input must be at most rank 2, but got rank${n.shape.length}.`)}var Iv={kernelName:$s,backendName:"cpu",kernelFunc:Iz};function vz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{blockSize:s,dataFormat:a}=o;y.assert(a==="NHWC",()=>`Only NHWC dataFormat supported on CPU for depthToSpace. Got ${a}`);let i=n.shape[0],c=n.shape[1],l=n.shape[2],p=n.shape[3],u=c*s,m=l*s,f=p/(s*s),d=e.data.get(n.dataId).values,g=new Float32Array(i*u*m*f),h=0;for(let x=0;x<i;++x)for(let b=0;b<u;++b){let S=Math.floor(b/s),w=b%s;for(let k=0;k<m;++k){let $=Math.floor(k/s),R=k%s,A=(w*s+R)*f;for(let D=0;D<f;++D){let O=D+A+p*($+l*(S+c*x));g[h++]=d[O]}}}return e.makeTensorInfo([i,u,m,f],n.dtype,g)}var vv={kernelName:Rs,backendName:"cpu",kernelFunc:vz};function Qx(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,filter:s}=t,{strides:a,pad:i,dilations:c,dimRoundingMode:l}=o;W([n,s],"depthwiseConv2DNative");let p=y.computeStrides(n.shape),u=y.computeStrides(s.shape),m=c;m==null&&(m=[1,1]),y.assert(I.eitherStridesOrDilationsAreOne(a,m),()=>`Error in depthwiseConv2d: Either strides or dilations must be 1. Got strides ${a} and dilations '${m}'`);let f=I.computeConv2DInfo(n.shape,s.shape,a,m,i,l,!0),{filterHeight:d,filterWidth:g,dilationHeight:h,dilationWidth:x,padInfo:b}=f,S=b.left,w=b.top,k=f.outChannels/f.inChannels,$=new $t(f.outShape,n.dtype),R=e.data.get(n.dataId).values,A=e.data.get(s.dataId).values,D=$.values;for(let _=0;_<f.batchSize;++_){let O=_*p[0],L=_*$.strides[0];for(let M=0;M<f.outHeight;++M){let V=L+M*$.strides[1],B=M*f.strideHeight-w;for(let G=0;G<d;++G){let U=B+G*h;if(U<0||U>=f.inHeight)continue;let z=G*u[0],H=O+U*p[1];for(let X=0;X<f.outWidth;++X){let j=V+X*$.strides[2],Q=X*f.strideWidth-S;for(let Y=0;Y<g;++Y){let tt=Q+Y*x;if(tt<0||tt>=f.inWidth)continue;let Z=z+Y*u[1],rt=H+tt*f.inChannels,it=j,ut=Z;for(let mt=0;mt<f.inChannels;++mt){let xt=R[rt+mt];for(let Nt=0;Nt<k;++Nt)D[it+Nt]+=xt*A[ut+Nt];it+=k,ut+=k}}}}}}return e.makeTensorInfo($.shape,$.dtype,$.values)}var kv={kernelName:As,backendName:"cpu",kernelFunc:Qx};function kz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,dy:s}=t,{strides:a,dilations:i,pad:c,dimRoundingMode:l,filterShape:p}=o;W([n,s],"depthwiseConv2dNativeBackpropFilter");let u=I.computeConv2DInfo(n.shape,p,a,i,c,l,!0),{strideHeight:m,strideWidth:f,filterHeight:d,filterWidth:g}=u,h=new $t(u.filterShape,"float32"),x=u.padInfo.left,b=u.padInfo.top,S=u.outChannels/u.inChannels,w=e.data.get(n.dataId).values,k=new $t(n.shape,n.dtype,w),$=e.data.get(s.dataId).values,R=new $t(s.shape,s.dtype,$);for(let A=0;A<d;++A){let D=Math.max(0,Math.ceil((b-A)/m)),_=Math.min(u.outHeight,(u.inHeight+b-A)/m);for(let O=0;O<g;++O){let L=Math.max(0,Math.ceil((x-O)/f)),M=Math.min(u.outWidth,(u.inWidth+x-O)/f);for(let V=0;V<u.outChannels;++V){let B=Math.trunc(V/S),G=V%S,U=0;for(let z=0;z<u.batchSize;++z)for(let H=D;H<_;++H){let X=A+H*m-b;for(let j=L;j<M;++j){let Q=O+j*f-x;U+=k.get(z,X,Q,B)*R.get(z,H,j,V)}}h.set(U,A,O,B,G)}}}return e.makeTensorInfo(h.shape,h.dtype,h.values)}var Ev={kernelName:Fs,backendName:"cpu",kernelFunc:kz};function Ez(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,filter:s}=t,{strides:a,dilations:i,pad:c,dimRoundingMode:l,inputShape:p}=o;W([n,s],"depthwiseConv2DNativeBackpropInput");let u=y.computeStrides(n.shape),m=y.computeStrides(s.shape),f=I.computeConv2DInfo(p,s.shape,a,i,c,l,!0),d=new $t(f.inShape,"float32"),g=d.values,[h,x,b]=d.strides,S=e.data.get(n.dataId).values,[w,k,$]=u,R=e.data.get(s.dataId).values,[A,D,_]=m,{batchSize:O,filterHeight:L,filterWidth:M,inChannels:V,inHeight:B,inWidth:G,outChannels:U,outHeight:z,outWidth:H,strideHeight:X,strideWidth:j}=f,Q=L-1-f.padInfo.top,Y=M-1-f.padInfo.left,tt=U/V;for(let Z=0;Z<O;++Z)for(let rt=0;rt<V;++rt)for(let it=0;it<B;++it){let ut=it-Q,mt=Math.max(0,Math.ceil(ut/X)),xt=Math.min(z,(L+ut)/X);for(let Nt=0;Nt<G;++Nt){let _t=Nt-Y,Bt=Math.max(0,Math.ceil(_t/j)),Gt=Math.min(H,(M+_t)/j),qt=0;for(let Ot=mt;Ot<xt;++Ot){let Zt=Ot*X-ut;for(let te=Bt;te<Gt;++te){let Jr=te*j-_t,fe=w*Z+k*Ot+$*te,vo=A*(L-1-Zt)+D*(M-1-Jr)+_*rt;for(let He=0;He<tt;++He){let os=rt*tt+He,dr=S[fe+os],to=R[vo+He];qt+=dr*to}}}g[h*Z+x*it+b*Nt+rt]=qt}}return e.makeTensorInfo(d.shape,d.dtype,d.values)}var $v={kernelName:Ds,backendName:"cpu",kernelFunc:Ez};function $z(r){let{inputs:t,backend:e}=r,{x:o}=t,n=y.sizeFromShape(o.shape),s=e.data.get(o.dataId).values,a=et([n,n],o.dtype),i=a.values;for(let l=0;l<s.length;l++)i[l*n+l]=s[l];let c=[...o.shape,...o.shape];return e.makeTensorInfo(c,a.dtype,a.values)}var Rv={kernelName:_s,backendName:"cpu",kernelFunc:$z};var Av={kernelName:Os,backendName:"cpu",kernelFunc:({inputs:r,backend:t,attrs:e})=>{let{x:o,filter:n}=r,{strides:s,pad:a,dilations:i}=e,c=t,l=c.data.get(o.dataId).values,p=o.shape.length,u=c.data.get(n.dataId).values,m=n.shape.length,{batchSize:f,inHeight:d,inWidth:g,inChannels:h,outHeight:x,outWidth:b,padInfo:S,strideHeight:w,strideWidth:k,filterHeight:$,filterWidth:R,dilationHeight:A,dilationWidth:D,outShape:_}=I.computeDilation2DInfo(o.shape,n.shape,s,a,"NHWC",i),O=y.sizeFromShape(_),L=_.length,M=y.getArrayFromDType(o.dtype,O);for(let B=0;B<f;++B)for(let G=0;G<x;++G){let U=G*w-S.top;for(let z=0;z<b;++z){let H=z*k-S.left;for(let X=0;X<h;++X){let j=Number.MIN_SAFE_INTEGER;for(let Y=0;Y<$;++Y){let tt=U+Y*A;if(tt>=0&&tt<d)for(let Z=0;Z<R;++Z){let rt=H+Z*D;if(rt>=0&&rt<g){let it=y.locToIndex([B,tt,rt,X],p,y.computeStrides(o.shape)),ut=y.locToIndex([Y,Z,X],m,y.computeStrides(n.shape)),mt=l[it]+u[ut];mt>j&&(j=mt)}}}let Q=y.locToIndex([B,G,z,X],L,y.computeStrides(_));M[Q]=j}}}return{dataId:c.write(y.toTypedArray(M,o.dtype),_,o.dtype),shape:_,dtype:o.dtype}}};var Fv={kernelName:lp,backendName:"cpu",kernelFunc:({inputs:r,backend:t,attrs:e})=>{let{x:o,filter:n,dy:s}=r,{strides:a,pad:i,dilations:c}=e,l=t,p=y.toNestedArray(o.shape,l.data.get(o.dataId).values),u=y.toNestedArray(n.shape,l.data.get(n.dataId).values),{batchSize:m,inHeight:f,inWidth:d,inChannels:g,outHeight:h,outWidth:x,padInfo:b,strideHeight:S,strideWidth:w,filterHeight:k,filterWidth:$,dilationHeight:R,dilationWidth:A,outShape:D}=I.computeDilation2DInfo(o.shape,n.shape,a,i,"NHWC",c);y.assert(s.rank===D.length,()=>`Error in ${lp}, dy must have the same rank as output ${D.length}, but got ${s.rank}`);let _=y.toNestedArray(D,l.data.get(s.dataId).values),O=y.makeZerosNestedTypedArray(n.shape,n.dtype);for(let M=0;M<m;++M)for(let V=0;V<h;++V){let B=V*S-b.top;for(let G=0;G<x;++G){let U=G*w-b.left;for(let z=0;z<g;++z){let H=Number.MIN_SAFE_INTEGER,X=0,j=0;for(let Q=0;Q<k;++Q){let Y=B+Q*R;if(Y>=0&&Y<f)for(let tt=0;tt<$;++tt){let Z=U+tt*A;if(Z>=0&&Z<d){let rt=p[M][Y][Z][z]+u[Q][tt][z];rt>H&&(H=rt,X=Q,j=tt)}}}O[X][j][z]+=_[M][V][G][z]}}}return{dataId:l.write(y.toTypedArray(O,o.dtype),n.shape,n.dtype),shape:n.shape,dtype:n.dtype}}};var Dv={kernelName:cp,backendName:"cpu",kernelFunc:({inputs:r,backend:t,attrs:e})=>{let{x:o,filter:n,dy:s}=r,{strides:a,pad:i,dilations:c}=e,l=t,p=y.toNestedArray(o.shape,l.data.get(o.dataId).values),u=y.toNestedArray(n.shape,l.data.get(n.dataId).values),{batchSize:m,inHeight:f,inWidth:d,inChannels:g,outHeight:h,outWidth:x,padInfo:b,strideHeight:S,strideWidth:w,filterHeight:k,filterWidth:$,dilationHeight:R,dilationWidth:A,outShape:D}=I.computeDilation2DInfo(o.shape,n.shape,a,i,"NHWC",c);y.assert(s.rank===D.length,()=>`Error in ${cp}, dy must have the same rank as output ${D.length}, but got ${s.rank}`);let _=y.toNestedArray(D,l.data.get(s.dataId).values),O=y.makeZerosNestedTypedArray(o.shape,o.dtype);for(let M=0;M<m;++M)for(let V=0;V<h;++V){let B=V*S-b.top;for(let G=0;G<x;++G){let U=G*w-b.left;for(let z=0;z<g;++z){let H=Number.MIN_SAFE_INTEGER,X=B<0?0:B,j=U<0?0:U;for(let Q=0;Q<k;++Q){let Y=B+Q*R;if(Y>=0&&Y<f)for(let tt=0;tt<$;++tt){let Z=U+tt*A;if(Z>=0&&Z<d){let rt=p[M][Y][Z][z]+u[Q][tt][z];rt>H&&(H=rt,X=Y,j=Z)}}}O[M][X][j][z]+=_[M][V][G][z]}}}return{dataId:l.write(y.toTypedArray(O,o.dtype),o.shape,o.dtype),shape:o.shape,dtype:o.dtype}}};function Io(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,keepDims:a}=o;W(n,"sum");let i;n.dtype==="bool"?i=ir({inputs:{x:n},backend:e,attrs:{dtype:"int32"}}):i=ye({inputs:{x:n},backend:e});let c=i.shape.length,l=y.parseAxisParam(s,i.shape),p=I.getAxesPermutation(l,c),u=l,m=i;p!=null&&(m=Wt({inputs:{x:i},backend:e,attrs:{perm:p}}),u=I.getInnerMostAxes(u.length,c)),I.assertAxesAreInnerMostDims("sum",u,m.shape.length);let[f,d]=I.computeOutAndReduceShapes(m.shape,u),g=I.upcastType(m.dtype,"int32"),h=ic(e,f,g),x=y.sizeFromShape(d),b=e.data.get(h.dataId).values,S=e.data.get(m.dataId).values;for(let w=0;w<b.length;++w){let k=w*x,$=0;for(let R=0;R<x;++R)$+=S[k+R];b[w]=$}if(a){let w=I.expandShapeToKeepDim(h.shape,l),k=h;h=gt({inputs:{x:h},backend:e,attrs:{shape:w}}),e.disposeIntermediateTensorInfo(k)}return e.disposeIntermediateTensorInfo(i),p!=null&&e.disposeIntermediateTensorInfo(m),h}var _v={kernelName:Ia,backendName:"cpu",kernelFunc:Io};function Rz(r){let{inputs:t,backend:e,attrs:o}=r,{equation:n}=o,s=t,{allDims:a,summedDims:i,idDims:c}=I.decodeEinsumEquation(n,s.length);I.checkEinsumDimSizes(a.length,c,s);let{path:l,steps:p}=I.getEinsumComputePath(i,c),u=p.length,m=null,f=a.length,d=[];for(let g=0;g<u;++g){for(let h of p[g]){let{permutationIndices:x,expandDims:b}=I.getEinsumPermutation(f,c[h]),S;I.isIdentityPermutation(x)?S=s[h]:(S=Wt({inputs:{x:s[h]},backend:e,attrs:{perm:x}}),d.push(S));let w=S.shape.slice();for(let k=0;k<b.length;++k)w.splice(b[k],0,1);y.arraysEqual(S.shape,w)||(S=gt({inputs:{x:S},backend:e,attrs:{shape:w}}),d.push(S)),m===null?m=S:(m=yi({inputs:{a:S,b:m},backend:e}),d.push(m))}g<u-1&&(l[g]>=0&&(m=Io({inputs:{x:m},backend:e,attrs:{axis:l[g]-(a.length-f),keepDims:!1}}),d.push(m)),f--)}for(let g of d)g!==m&&e.disposeIntermediateTensorInfo(g);return m}var Ov={kernelName:Ps,backendName:"cpu",kernelFunc:Rz};function Az(r){let{inputs:t,backend:e}=r,{dy:o,y:n}=t;W([o,n],"eluGrad");let s=new Float32Array(y.sizeFromShape(n.shape)),a=e.data.get(n.dataId).values,i=e.data.get(o.dataId).values;for(let c=0;c<a.length;++c){let l=a[c];l>=1?s[c]=i[c]:s[c]=i[c]*(l+1)}return e.makeTensorInfo(n.shape,"float32",s)}var Pv={kernelName:_c,backendName:"cpu",kernelFunc:Az};var Fz=I.ERF_P,Dz=I.ERF_A1,_z=I.ERF_A2,Oz=I.ERF_A3,Pz=I.ERF_A4,Lz=I.ERF_A5,Mz=lt(Ho,r=>{let t=Math.sign(r),e=Math.abs(r),o=1/(1+Fz*e);return t*(1-((((Lz*o+Pz)*o+Oz)*o+_z)*o+Dz)*o*Math.exp(-e*e))}),Lv={kernelName:Ho,backendName:"cpu",kernelFunc:Mz};function wc(r){let{inputs:t,backend:e,attrs:o}=r,{input:n}=t,{dim:s}=o,a=n.shape.length,i=n.shape.slice(),c=s;return s<0&&(y.assert(-(a+1)<=s,()=>`Axis must be in the interval [${-(a+1)}, ${a}]`),c=a+s+1),i.splice(c,0,1),gt({inputs:{x:n},backend:e,attrs:{shape:i}})}var Mv={kernelName:Ls,backendName:"cpu",kernelFunc:wc};var Bz=yt((r,t)=>r/t),Xl=vt(Go,Bz),jl={kernelName:Go,backendName:"cpu",kernelFunc:Xl};function nf(r,t,e){let o=r.shape,n=o[0],s=o[1],a=e.data.get(r.dataId),i=a.complexTensorInfos.real,c=a.complexTensorInfos.imag,l=[n,s],p=y.sizeFromShape(l),u=y.getTypedArrayFromDType("float32",p),m=y.getTypedArrayFromDType("float32",p);for(let h=0;h<n;h++){let x=pr({inputs:{x:i},backend:e,attrs:{begin:[h,0],size:[1,s]}}),b=pr({inputs:{x:c},backend:e,attrs:{begin:[h,0],size:[1,s]}}),S=se({inputs:{real:x,imag:b},backend:e}),{real:w,imag:k}=Vz(S,t,e),$=I.mergeRealAndImagArrays(w,k);for(let R=0;R<s;R++){let A=I.getComplexWithIndex($,R);u[h*s+R]=A.real,m[h*s+R]=A.imag}e.disposeIntermediateTensorInfo(x),e.disposeIntermediateTensorInfo(b),e.disposeIntermediateTensorInfo(S)}let f=e.makeTensorInfo(l,"float32",u),d=e.makeTensorInfo(l,"float32",m),g=se({inputs:{real:f,imag:d},backend:e});return e.disposeIntermediateTensorInfo(f),e.disposeIntermediateTensorInfo(d),g}function Vz(r,t,e){let o=y.sizeFromShape(r.shape),n=e.data.get(r.dataId),s=e.data.get(n.complexTensorInfos.real.dataId).values,a=e.data.get(n.complexTensorInfos.imag.dataId).values;if(zz(o)){let i=Jx(s,a,o,t,e),c=[r.shape[0],r.shape[1]];if(t){let l=e.makeTensorInfo(c,"float32",i.real),p=e.makeTensorInfo(c,"float32",i.imag),u=e.makeTensorInfo([],"float32",y.createScalarValue(o,"float32")),m=ye({inputs:{x:u},backend:e}),f=jl.kernelFunc({inputs:{a:l,b:u},backend:e}),d=jl.kernelFunc({inputs:{a:p,b:m},backend:e}),g=e.data.get(f.dataId).values,h=e.data.get(d.dataId).values;return e.disposeIntermediateTensorInfo(l),e.disposeIntermediateTensorInfo(p),e.disposeIntermediateTensorInfo(u),e.disposeIntermediateTensorInfo(m),e.disposeIntermediateTensorInfo(f),e.disposeIntermediateTensorInfo(d),{real:g,imag:h}}return i}else{let i=I.mergeRealAndImagArrays(s,a),c=Wz(i,o,t);return I.splitRealAndImagArrays(c)}}function zz(r){return(r&r-1)===0}function Jx(r,t,e,o,n){if(e===1)return{real:r,imag:t};let s=I.mergeRealAndImagArrays(r,t),a=e/2,i=I.complexWithEvenIndex(s),c=i.real,l=i.imag,p=[c.length],u=n.makeTensorInfo(p,"float32",c),m=n.makeTensorInfo(p,"float32",l),f=se({inputs:{real:u,imag:m},backend:n}),d=I.complexWithOddIndex(s),g=d.real,h=d.imag,x=[g.length],b=n.makeTensorInfo(x,"float32",g),S=n.makeTensorInfo(x,"float32",h),w=se({inputs:{real:b,imag:S},backend:n}),k=Jx(c,l,a,o,n),$=k.real,R=k.imag,A=[$.length],D=n.makeTensorInfo(A,"float32",$),_=n.makeTensorInfo(A,"float32",R),O=se({inputs:{real:D,imag:_},backend:n}),L=Jx(g,h,a,o,n),M=L.real,V=L.imag,B=[M.length],G=n.makeTensorInfo(B,"float32",M),U=n.makeTensorInfo(B,"float32",V),z=se({inputs:{real:G,imag:U},backend:n}),H=I.exponents(e,o),X=[H.real.length],j=n.makeTensorInfo(X,"float32",H.real),Q=n.makeTensorInfo(X,"float32",H.imag),Y=se({inputs:{real:j,imag:Q},backend:n}),tt=yi({inputs:{a:Y,b:z},backend:n}),Z=Yr({inputs:{a:O,b:tt},backend:n}),rt=Ml({inputs:{a:O,b:tt},backend:n}),it=ar({inputs:{input:Z},backend:n}),ut=ar({inputs:{input:rt},backend:n}),mt=Qr({inputs:{input:Z},backend:n}),xt=Qr({inputs:{input:rt},backend:n}),Nt=rs({inputs:[it,ut],backend:n,attrs:{axis:0}}),_t=rs({inputs:[mt,xt],backend:n,attrs:{axis:0}}),Bt=n.data.get(Nt.dataId).values,Gt=n.data.get(_t.dataId).values;return n.disposeIntermediateTensorInfo(u),n.disposeIntermediateTensorInfo(m),n.disposeIntermediateTensorInfo(f),n.disposeIntermediateTensorInfo(b),n.disposeIntermediateTensorInfo(S),n.disposeIntermediateTensorInfo(w),n.disposeIntermediateTensorInfo(D),n.disposeIntermediateTensorInfo(_),n.disposeIntermediateTensorInfo(O),n.disposeIntermediateTensorInfo(G),n.disposeIntermediateTensorInfo(U),n.disposeIntermediateTensorInfo(z),n.disposeIntermediateTensorInfo(j),n.disposeIntermediateTensorInfo(Q),n.disposeIntermediateTensorInfo(Y),n.disposeIntermediateTensorInfo(tt),n.disposeIntermediateTensorInfo(Z),n.disposeIntermediateTensorInfo(rt),n.disposeIntermediateTensorInfo(it),n.disposeIntermediateTensorInfo(mt),n.disposeIntermediateTensorInfo(ut),n.disposeIntermediateTensorInfo(xt),n.disposeIntermediateTensorInfo(Nt),n.disposeIntermediateTensorInfo(_t),{real:Bt,imag:Gt}}function Wz(r,t,e){let o=new Float32Array(t*2);for(let n=0;n<t;n++){let s=0,a=0;for(let i=0;i<t;i++){let c=I.exponent(n*i,t,e),l=I.getComplexWithIndex(r,i);s+=l.real*c.real-l.imag*c.imag,a+=l.real*c.imag+l.imag*c.real}e&&(s/=t,a/=t),I.assignToTypedArray(o,s,a,n)}return o}function Gz(r){let{inputs:t,backend:e}=r,{input:o}=t,n=y.sizeFromShape(o.shape),s=o.shape[o.shape.length-1],a=n/s,i=gt({inputs:{x:o},backend:e,attrs:{shape:[a,s]}}),c=nf(i,!1,e),l=gt({inputs:{x:c},backend:e,attrs:{shape:o.shape}});return e.disposeIntermediateTensorInfo(i),e.disposeIntermediateTensorInfo(c),l}var Bv={kernelName:Ms,backendName:"cpu",kernelFunc:Gz};function Yl(r){let{backend:t,attrs:e}=r,{shape:o,value:n,dtype:s}=e,a=s||y.inferDtype(n),i=y.getArrayFromDType(a,y.sizeFromShape(o));return Uz(i,n,a),t.makeTensorInfo(o,a,i)}var Vv={kernelName:Bs,backendName:"cpu",kernelFunc:Yl};function Uz(r,t,e){r.fill(t)}var zv={kernelName:Vs,backendName:"cpu",kernelFunc:({inputs:r,attrs:t,backend:e})=>{let{image:o}=r,n=e,s=y.getTypedArrayFromDType(o.dtype,y.sizeFromShape(o.shape)),[a,i,c,l]=o.shape,p=n.data.get(o.dataId).values;for(let m=0;m<a;m++){let f=m*c*i*l;for(let d=0;d<i;d++){let g=d*(c*l);for(let h=0;h<c;h++){let x=h*l;for(let b=0;b<l;b++){let S=Math.round(c-h-1),w=f+g+x+b,k=p[w];if(S>=0&&S<c){let $=S*l,R=f+g+$+b;k=p[R]}s[w]=k}}}}return{dataId:n.write(s,o.shape,o.dtype),shape:o.shape,dtype:o.dtype}}};var Hz=yt((r,t)=>Math.floor(r/t)),Kz=vt(Yo,Hz,null,"int32"),Wv={kernelName:Yo,backendName:"cpu",kernelFunc:Kz};function qz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,filter:s,bias:a,preluActivationWeights:i}=t,{strides:c,pad:l,dataFormat:p,dilations:u,dimRoundingMode:m,activation:f,leakyreluAlpha:d}=o,g=Zx({inputs:{x:n,filter:s},backend:e,attrs:{strides:c,pad:l,dataFormat:p,dilations:u,dimRoundingMode:m}});if(a){let h=g;if(p==="NCHW"&&a.shape.length===1&&a.shape[0]!==1){let x=gt({inputs:{x:a},backend:e,attrs:{shape:[a.shape[0],1,1]}});g=Yr({inputs:{a:g,b:x},backend:e}),e.disposeIntermediateTensorInfo(x)}else g=Yr({inputs:{a:g,b:a},backend:e});e.disposeIntermediateTensorInfo(h)}if(f){let h=g;if(p==="NCHW"&&f==="prelu"&&i.shape.length===1&&i.shape[0]!==1){let x=gt({inputs:{x:i},backend:e,attrs:{shape:[i.shape[0],1,1]}});g=vi(e,g,f,x,d),e.disposeIntermediateTensorInfo(x)}else g=vi(e,g,f,i,d);e.disposeIntermediateTensorInfo(h)}return g}var Gv={kernelName:_n,backendName:"cpu",kernelFunc:qz};function Xz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,filter:s,bias:a,preluActivationWeights:i}=t,{strides:c,pad:l,dataFormat:p,dilations:u,dimRoundingMode:m,activation:f,leakyreluAlpha:d}=o,g=Qx({inputs:{x:n,filter:s},backend:e,attrs:{strides:c,pad:l,dataFormat:p,dilations:u,dimRoundingMode:m}});if(a){let h=g;g=Yr({inputs:{a:g,b:a},backend:e}),e.disposeIntermediateTensorInfo(h)}if(f){let h=g;g=vi(e,g,f,i,d),e.disposeIntermediateTensorInfo(h)}return g}var Uv={kernelName:On,backendName:"cpu",kernelFunc:Xz};function jz(r){let{inputs:t,backend:e}=r,{params:o,indices:n}=t,s=y.sizeFromShape(o.shape),a=n.shape,i=a[a.length-1],[c,l,p,u]=I.prepareAndValidate(o,n);if(l===0)return e.makeTensorInfo(c,o.dtype,[]);let m=e.data.get(n.dataId).values,f=e.bufferSync(o),d=du(m,f,o.dtype,l,i,p,u,o.shape,s);return e.makeTensorInfo(c,o.dtype,d.values)}var Hv={kernelName:Gs,backendName:"cpu",kernelFunc:jz};function Yz(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,indices:s}=t,{axis:a,batchDims:i}=o;W([n,s],"gatherV2");let c=y.parseAxisParam(a,n.shape)[0],l=e.data.get(s.dataId).values,p=n.shape[c];for(let w=0;w<l.length;++w){let k=l[w];y.assert(k<=p-1&&k>=0,()=>`GatherV2: the index value ${k} is not in [0, ${p-1}]`)}let u=i;i==null&&(u=0);let m=y.sizeFromShape(s.shape),f=I.segment_util.collectGatherOpShapeInfo(n,s,c,u),d=gt({inputs:{x:n},backend:e,attrs:{shape:[f.batchSize,f.outerSize,f.dimSize,f.sliceSize]}}),g=gt({inputs:{x:s},backend:e,attrs:{shape:[f.batchSize,m/f.batchSize]}}),h=[f.batchSize,f.outerSize,m/f.batchSize,f.sliceSize],x=e.bufferSync(g),b=e.bufferSync(d),S=hu(b,x,h);return e.disposeIntermediateTensorInfo(d),e.disposeIntermediateTensorInfo(g),e.makeTensorInfo(f.outputShape,S.dtype,S.values)}var Kv={kernelName:Ws,backendName:"cpu",kernelFunc:Yz};function Zz(r){let{inputs:t,backend:e}=r,{input:o}=t,n=y.sizeFromShape(o.shape),s=o.shape[o.shape.length-1],a=n/s,i=gt({inputs:{x:o},backend:e,attrs:{shape:[a,s]}}),c=nf(i,!0,e),l=gt({inputs:{x:c},backend:e,attrs:{shape:o.shape}});return e.disposeIntermediateTensorInfo(i),e.disposeIntermediateTensorInfo(c),l}var qv={kernelName:Us,backendName:"cpu",kernelFunc:Zz};var Qz=lt(Jo,r=>Number.isFinite(r)?1:0,"bool"),Xv={kernelName:Jo,backendName:"cpu",kernelFunc:Qz};var Jz=lt(tn,r=>Math.abs(r)===1/0?1:0,"bool"),jv={kernelName:tn,backendName:"cpu",kernelFunc:Jz};var tW=lt(en,r=>Number.isNaN(r)?1:0,"bool"),Yv={kernelName:en,backendName:"cpu",kernelFunc:tW};function eW(r){let{backend:t,attrs:e}=r,{start:o,stop:n,num:s}=e,a=gu(o,n,s);return t.makeTensorInfo([a.length],"float32",a)}var Zv={kernelName:qs,backendName:"cpu",kernelFunc:eW};var rW=lt(sn,r=>Math.log1p(r)),Qv={kernelName:sn,backendName:"cpu",kernelFunc:rW};var oW=yt((r,t)=>r&&t),nW=vt(an,oW,null,"bool"),Jv={kernelName:an,backendName:"cpu",kernelFunc:nW};var sW=lt(cn,r=>r?0:1,"bool"),tk={kernelName:cn,backendName:"cpu",kernelFunc:sW};var aW=yt((r,t)=>r||t),iW=vt(ln,aW,null,"bool"),ek={kernelName:ln,backendName:"cpu",kernelFunc:iW};function cW(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{depthRadius:s,bias:a,alpha:i,beta:c}=o;W(n,"LRN");let l=n.shape[3],p=l-1,u=e.data.get(n.dataId).values,m=y.sizeFromShape(n.shape),f=new Float32Array(m);function d(g){let h=g%l,x=g-h+Math.max(0,h-s),b=g-h+Math.min(h+s,p),S=0;for(;x<=b;x++){let w=u[x];S+=w*w}return S}for(let g=0;g<m;g++){let h=d(g),x=u[g]*Math.pow(a+i*h,-c);f[g]=x}return e.makeTensorInfo(n.shape,n.dtype,f)}var rk={kernelName:Xs,backendName:"cpu",kernelFunc:cW};function lW(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,y:s,dy:a}=t,{depthRadius:i,bias:c,alpha:l,beta:p}=o;W(a,"LRNGrad");let u=y.sizeFromShape(a.shape),m=a.shape[3],f=e.data.get(a.dataId).values,d=e.data.get(n.dataId).values,g=e.data.get(s.dataId).values,h=new Float32Array(u),x=u;for(let b=0;b<x;b++){let S=b%m,w=b-S+Math.max(0,S-i),k=b-S+Math.min(m,S+i+1),$=0;for(let R=w;R<k;R++)$+=Math.pow(d[R],2);$=l*$+c;for(let R=w;R<k;R++){let A=-2*l*p*d[R]*g[b]/$;b===R&&(A+=Math.pow($,-p)),A*=f[b],h[R]+=A}}return e.makeTensorInfo(a.shape,n.dtype,h)}var ok={kernelName:Oc,backendName:"cpu",kernelFunc:lW};function ty(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{reductionIndices:s,keepDims:a}=o,i=e,c=n.shape,l=c.length,p=y.parseAxisParam(s,c),u=p,m=I.getAxesPermutation(u,l),f=i.data.get(n.dataId).values;if(m!=null){let w=new Array(l);for(let k=0;k<w.length;k++)w[k]=c[m[k]];f=pc(f,c,n.dtype,m,w),u=I.getInnerMostAxes(u.length,l),c=w}W(n,"max"),I.assertAxesAreInnerMostDims("max",u,l);let[d,g]=I.computeOutAndReduceShapes(c,u),h=y.sizeFromShape(g),x=xu(f,h,d,n.dtype),b=i.write(x,d,n.dtype),S=d;return a&&(S=I.expandShapeToKeepDim(d,p)),{dataId:b,shape:S,dtype:n.dtype}}var nk={kernelName:js,backendName:"cpu",kernelFunc:ty};function pW(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t;W(n,"maxPool");let{filterSize:s,strides:a,pad:i,dimRoundingMode:c}=o,l=1;y.assert(I.eitherStridesOrDilationsAreOne(a,l),()=>`Error in maxPool: Either strides or dilations must be 1. Got strides ${a} and dilations '${l}'`);let p=I.computePool2DInfo(n.shape,s,a,l,i,c),u;if(p.filterWidth===1&&p.filterHeight===1&&y.arraysEqual(p.inShape,p.outShape))u=ye({inputs:{x:n},backend:e});else{let m=e.data.get(n.dataId).values,f=y.computeStrides(n.shape),d=Sc(m,n.shape,n.dtype,f,p,"max");u=e.makeTensorInfo(p.outShape,n.dtype,d.values)}return u}var sk={kernelName:Ys,backendName:"cpu",kernelFunc:pW};function uW(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{filterSize:s,strides:a,pad:i,dimRoundingMode:c,dataFormat:l}=o;W(n,"maxPool3d");let p=I.computePool3DInfo(n.shape,s,a,1,i,c,l),u=e.data.get(n.dataId).values,m=of(u,n.shape,n.dtype,y.computeStrides(n.shape),p,"max");return e.makeTensorInfo(m.shape,"float32",m.values)}var ak={kernelName:Zs,backendName:"cpu",kernelFunc:uW};function mW(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,input:s}=t,{filterSize:a,strides:i,pad:c,dimRoundingMode:l}=o;W([n,s],"maxPool3DGrad");let p=I.computePool3DInfo(s.shape,a,i,1,c,l),u=e.bufferSync(s),m=ev(u,p),f=p.strideDepth,d=p.strideHeight,g=p.strideWidth,h=p.dilationDepth,x=p.dilationHeight,b=p.dilationWidth,S=p.effectiveFilterDepth,w=p.effectiveFilterHeight,k=p.effectiveFilterWidth,$=S-1-p.padInfo.front,R=k-1-p.padInfo.left,A=w-1-p.padInfo.top,D=et(s.shape,"float32"),_=e.bufferSync(n);for(let O=0;O<p.batchSize;++O)for(let L=0;L<p.inChannels;++L)for(let M=0;M<p.inDepth;++M)for(let V=0;V<p.inHeight;++V)for(let B=0;B<p.inWidth;++B){let G=M-$,U=V-A,z=B-R,H=0;for(let X=0;X<S;X+=h){let j=(G+X)/f;if(!(j<0||j>=p.outDepth||Math.floor(j)!==j))for(let Q=0;Q<w;Q+=x){let Y=(U+Q)/d;if(!(Y<0||Y>=p.outHeight||Math.floor(Y)!==Y))for(let tt=0;tt<k;tt+=b){let Z=(z+tt)/g;if(Z<0||Z>=p.outWidth||Math.floor(Z)!==Z)continue;let rt=S*w*k-1-m.get(O,j,Y,Z,L),it=X*w*k+Q*k+tt,ut=rt===it?1:0;if(ut===0)continue;let mt=_.get(O,j,Y,Z,L);H+=mt*ut}}}D.set(H,O,M,V,B,L)}return e.makeTensorInfo(D.shape,D.dtype,D.values)}var ik={kernelName:Lc,backendName:"cpu",kernelFunc:mW};function fW(r){let{inputs:t,backend:e,attrs:o}=r,{dy:n,input:s,output:a}=t,i=s;W([s,a],"maxPoolGrad");let{filterSize:c,strides:l,pad:p,dimRoundingMode:u}=o,m=I.computePool2DInfo(i.shape,c,l,1,p,u),f=e.data.get(i.dataId).values,d=et(m.outShape,i.dtype,rf(f,i.shape,i.dtype,m).values),g=m.strideHeight,h=m.strideWidth,x=m.dilationHeight,b=m.dilationWidth,S=m.effectiveFilterHeight,w=m.effectiveFilterWidth,k=w-1-m.padInfo.left,$=S-1-m.padInfo.top,R=et(i.shape,"float32"),A=e.data.get(n.dataId).values,D=et(n.shape,"float32",A);for(let _=0;_<m.batchSize;++_)for(let O=0;O<m.inChannels;++O)for(let L=0;L<m.inHeight;++L)for(let M=0;M<m.inWidth;++M){let V=L-$,B=M-k,G=0;for(let U=0;U<S;U+=x){let z=(V+U)/g;if(!(z<0||z>=m.outHeight||Math.floor(z)!==z))for(let H=0;H<w;H+=b){let X=(B+H)/h;if(X<0||X>=m.outWidth||Math.floor(X)!==X)continue;let j=S*w-1-d.get(_,z,X,O),Q=U*w+H,Y=j===Q?1:0;if(Y===0)continue;let tt=D.get(_,z,X,O);G+=tt*Y}}R.set(G,_,L,M,O)}return e.makeTensorInfo(R.shape,R.dtype,R.values)}var ck={kernelName:Pc,backendName:"cpu",kernelFunc:fW};function lk(r,t,e,o,n){let s=y.computeStrides(t),a=Sc(r,t,e,s,n,"max"),i=rf(r,t,e,n,!0,o);return[a.values,i.values]}var pk={kernelName:Qs,backendName:"cpu",kernelFunc:({inputs:r,attrs:t,backend:e})=>{let{x:o}=r,{filterSize:n,strides:s,pad:a,includeBatchInIndex:i}=t,c=e;W(o,"MaxPoolWithArgmax");let l=c.data.get(o.dataId).values,p=I.computePool2DInfo(o.shape,n,s,[1,1],a),[u,m]=lk(l,o.shape,o.dtype,i,p),f=c.write(u,p.outShape,o.dtype),d=c.write(m,p.outShape,o.dtype);return[{dataId:f,shape:p.outShape,dtype:o.dtype},{dataId:d,shape:p.outShape,dtype:"int32"}]}};function dW(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,keepDims:a}=o,i=y.parseAxisParam(s,n.shape),l=I.computeOutAndReduceShapes(n.shape,i)[1],p=y.sizeFromShape(l),u=[],m=e.makeTensorInfo([],"float32",new Float32Array([p]));u.push(m);let f=ir({inputs:{x:n},backend:e,attrs:{dtype:"float32"}});u.push(f);let d=Xl({inputs:{a:f,b:m},backend:e});u.push(d);let g=Io({inputs:{x:d},backend:e,attrs:{axis:s,keepDims:a}});return u.forEach(h=>e.disposeIntermediateTensorInfo(h)),g}var uk={kernelName:Js,backendName:"cpu",kernelFunc:dW};function hW(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{axis:s,keepDims:a}=o;W(n,"min");let i=y.parseAxisParam(s,n.shape),c=i,l=I.getAxesPermutation(c,n.shape.length),p=n;l!=null&&(p=Wt({inputs:{x:n},backend:e,attrs:{perm:l}}),c=I.getInnerMostAxes(c.length,n.shape.length)),I.assertAxesAreInnerMostDims("min",c,p.shape.length);let[u,m]=I.computeOutAndReduceShapes(p.shape,c),f=y.sizeFromShape(m),d=y.makeZerosTypedArray(y.sizeFromShape(u),p.dtype),g=e.data.get(p.dataId).values;for(let x=0;x<d.length;++x){let b=x*f,S=g[b];for(let w=0;w<f;++w){let k=g[b+w];(Number.isNaN(k)||k<S)&&(S=k)}d[x]=S}l!=null&&e.disposeIntermediateTensorInfo(p);let h=e.makeTensorInfo(u,p.dtype,d);if(a){let x=I.expandShapeToKeepDim(u,i),b=gt({inputs:{x:h},backend:e,attrs:{shape:x}});return e.disposeIntermediateTensorInfo(h),b}return h}var mk={kernelName:ta,backendName:"cpu",kernelFunc:hW};function gW(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{paddings:s,mode:a}=o;W(n,"mirrorPad");let i=s.map((S,w)=>S[0]+n.shape[w]+S[1]),c=s.map(S=>S[0]),l=s.map((S,w)=>S[0]+n.shape[w]),p=a==="reflect"?0:1,u=e.data.get(n.dataId).values,m=n.shape.length,f=y.computeStrides(n.shape),d=y.sizeFromShape(i),g=i.length,h=y.computeStrides(i),x=y.getTypedArrayFromDType(n.dtype,d);for(let S=0;S<d;S++){let w=y.indexToLoc(S,g,h);for(let $=0;$<g;$++)w[$]<c[$]?w[$]=c[$]*2-w[$]-p:w[$]>=l[$]&&(w[$]=(l[$]-1)*2-w[$]+p);w=w.map(($,R)=>$-c[R]);let k=y.locToIndex(w,m,f);x[S]=u[k]}return{dataId:e.write(x,i,n.dtype),shape:i,dtype:n.dtype}}var fk={kernelName:ea,backendName:"cpu",kernelFunc:gW};var xW=yt((r,t)=>{let e=r%t;return r<0&&t<0||r>=0&&t>=0?e:(e+t)%t}),yW=vt(mn,xW),dk={kernelName:mn,backendName:"cpu",kernelFunc:yW};var gk=Af(eg());function ey(r){let{inputs:t,backend:e,attrs:o}=r,{logits:n}=t,{dim:s}=o,a=n.shape.length,i=s;if(i===-1&&(i=a-1),i!==a-1)throw Error(`Softmax along a non-last dimension is not yet supported. Logits was rank ${a} and dim was ${i}`);let c=y.parseAxisParam([i],n.shape),l=ty({inputs:{x:n},backend:e,attrs:{reductionIndices:c,keepDims:!1}}),p=I.expandShapeToKeepDim(l.shape,c),u=gt({inputs:{x:l},backend:e,attrs:{shape:p}}),m=Ml({inputs:{a:n,b:u},backend:e}),f=rx({inputs:{x:m},backend:e}),d=Io({inputs:{x:f},backend:e,attrs:{axis:c,keepDims:!1}}),g=gt({inputs:{x:d},backend:e,attrs:{shape:p}}),h=Xl({inputs:{a:f,b:g},backend:e});return e.disposeIntermediateTensorInfo(l),e.disposeIntermediateTensorInfo(u),e.disposeIntermediateTensorInfo(m),e.disposeIntermediateTensorInfo(f),e.disposeIntermediateTensorInfo(d),e.disposeIntermediateTensorInfo(g),h}var hk={kernelName:Ea,backendName:"cpu",kernelFunc:ey};function bW(r){let{inputs:t,backend:e,attrs:o}=r,{logits:n}=t,{numSamples:s,seed:a,normalized:i}=o;W(n,"multinomial");let c=i?n:ey({inputs:{logits:n},backend:e,attrs:{dim:-1}}),l=c.shape[0],p=c.shape[1],u=e.data.get(c.dataId).values,m=[l,s],f=y.makeZerosTypedArray(y.sizeFromShape(m),"int32");for(let d=0;d<l;++d){let g=d*p,h=new Float32Array(p-1);h[0]=u[g];for(let S=1;S<h.length;++S)h[S]=h[S-1]+u[g+S];let x=gk.alea(a.toString()),b=d*s;for(let S=0;S<s;++S){let w=x();f[b+S]=h.length;for(let k=0;k<h.length;k++)if(w<h[k]){f[b+S]=k;break}}}return i||e.disposeIntermediateTensorInfo(c),e.makeTensorInfo(m,"int32",f)}var xk={kernelName:ra,backendName:"cpu",kernelFunc:bW};var CW=ue.nonMaxSuppressionV3Impl;function TW(r){let{inputs:t,backend:e,attrs:o}=r,{boxes:n,scores:s}=t,{maxOutputSize:a,iouThreshold:i,scoreThreshold:c}=o;W(n,"NonMaxSuppression");let l=e.data.get(n.dataId).values,p=e.data.get(s.dataId).values,{selectedIndices:u}=CW(l,p,a,i,c);return e.makeTensorInfo([u.length],"int32",new Int32Array(u))}var yk={kernelName:na,backendName:"cpu",kernelFunc:TW};var SW=ue.nonMaxSuppressionV4Impl;function wW(r){let{inputs:t,backend:e,attrs:o}=r,{boxes:n,scores:s}=t,{maxOutputSize:a,iouThreshold:i,scoreThreshold:c,padToMaxOutputSize:l}=o;W(n,"NonMaxSuppressionPadded");let p=e.data.get(n.dataId).values,u=e.data.get(s.dataId).values,{selectedIndices:m,validOutputs:f}=SW(p,u,a,i,c,l);return[e.makeTensorInfo([m.length],"int32",new Int32Array(m)),e.makeTensorInfo([],"int32",new Int32Array([f]))]}var bk={kernelName:sa,backendName:"cpu",kernelFunc:wW};var NW=ue.nonMaxSuppressionV5Impl;function IW(r){let{inputs:t,backend:e,attrs:o}=r,{boxes:n,scores:s}=t,{maxOutputSize:a,iouThreshold:i,scoreThreshold:c,softNmsSigma:l}=o;W(n,"NonMaxSuppressionWithScore");let p=e.data.get(n.dataId).values,u=e.data.get(s.dataId).values,m=a,f=i,d=c,g=l,{selectedIndices:h,selectedScores:x}=NW(p,u,m,f,d,g);return[e.makeTensorInfo([h.length],"int32",new Int32Array(h)),e.makeTensorInfo([x.length],"float32",new Float32Array(x))]}var Ck={kernelName:aa,backendName:"cpu",kernelFunc:IW};function vW(r){let{inputs:t,backend:e,attrs:o}=r,{indices:n}=t,{dtype:s,depth:a,onValue:i,offValue:c}=o;W(n,"oneHot");let l=y.sizeFromShape(n.shape),p=new Float32Array(l*a);p.fill(c);let u=e.data.get(n.dataId).values;for(let m=0;m<l;++m)u[m]>=0&&u[m]<a&&(p[m*a+u[m]]=i);return e.makeTensorInfo([...n.shape,a],s,p)}var Tk={kernelName:ca,backendName:"cpu",kernelFunc:vW};function Zl(r){let{inputs:t,backend:e}=r,{x:o}=t;if(o.dtype==="string")throw new Error("zerosLike is not supported for string tensors");if(o.dtype==="complex64"){let n=ar({inputs:{input:o},backend:e}),s=Zl({inputs:{x:n},backend:e}),a=Qr({inputs:{input:o},backend:e}),i=Zl({inputs:{x:a},backend:e}),c=se({inputs:{real:s,imag:i},backend:e});return e.disposeIntermediateTensorInfo(n),e.disposeIntermediateTensorInfo(s),e.disposeIntermediateTensorInfo(a),e.disposeIntermediateTensorInfo(i),c}else return Yl({backend:e,attrs:{shape:o.shape,value:0,dtype:o.dtype}})}var Sk={kernelName:Ga,backendName:"cpu",kernelFunc:Zl};function wk(r){let{inputs:t,backend:e}=r,{x:o}=t;if(o.dtype==="string")throw new Error("onesLike is not supported for string tensors");if(o.dtype==="complex64"){let n=ar({inputs:{input:o},backend:e}),s=wk({inputs:{x:n},backend:e}),a=Qr({inputs:{input:o},backend:e}),i=Zl({inputs:{x:a},backend:e}),c=se({inputs:{real:s,imag:i},backend:e});return e.disposeIntermediateTensorInfo(n),e.disposeIntermediateTensorInfo(s),e.disposeIntermediateTensorInfo(a),e.disposeIntermediateTensorInfo(i),c}else return Yl({backend:e,attrs:{shape:o.shape,value:1,dtype:o.dtype}})}var Nk={kernelName:ia,backendName:"cpu",kernelFunc:wk};function ry(r){let{inputs:t,backend:e,attrs:o}=r,{axis:n}=o;if(t.length===1)return wc({inputs:{input:t[0]},backend:e,attrs:{dim:n}});let s=t[0].shape,a=t[0].dtype;t.forEach(p=>{y.assertShapesMatch(s,p.shape,"All tensors passed to stack must have matching shapes"),y.assert(a===p.dtype,()=>"All tensors passed to stack must have matching dtypes")});let i=[],c=t.map(p=>{let u=wc({inputs:{input:p},backend:e,attrs:{dim:n}});return i.push(u),u}),l=rs({inputs:c,backend:e,attrs:{axis:n}});return i.forEach(p=>e.disposeIntermediateTensorInfo(p)),l}var Ik={kernelName:la,backendName:"cpu",kernelFunc:ry};function kW(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{paddings:s,constantValue:a}=o;W(n,"pad");let i=s.map((b,S)=>b[0]+n.shape[S]+b[1]),c=s.map(b=>b[0]),l=e.data.get(n.dataId).values,p=y.sizeFromShape(n.shape),u=n.shape.length,m=y.computeStrides(n.shape),f=y.sizeFromShape(i),d=i.length,g=y.computeStrides(i),h=y.getTypedArrayFromDType(n.dtype,f);a!==0&&h.fill(a);for(let b=0;b<p;b++){let w=y.indexToLoc(b,u,m).map(($,R)=>$+c[R]),k=y.locToIndex(w,d,g);h[k]=l[b]}return{dataId:e.write(h,i,n.dtype),shape:i,dtype:n.dtype}}var sf={kernelName:pa,backendName:"cpu",kernelFunc:kW};var EW=yt((r,t)=>Math.pow(r,t)),$W=vt(hn,EW),vk={kernelName:hn,backendName:"cpu",kernelFunc:$W};function RW(r){let{inputs:t,backend:e,attrs:o}=r,{paramsNestedSplits:n,paramsDenseValues:s,indices:a}=t,{outputRaggedRank:i}=o,c=n.map(x=>e.data.get(x.dataId).values),l=n.map(x=>x.shape),p=e.data.get(s.dataId).values,u=e.data.get(a.dataId).values,[m,f,d]=yu(c,l,p,s.shape,s.dtype,u,a.shape,i),g=m.map(x=>e.makeTensorInfo([x.length],"int32",x)),h=e.makeTensorInfo(d,s.dtype,f);return g.concat([h])}var kk={kernelName:fa,backendName:"cpu",kernelFunc:RW};function AW(r){let{inputs:t,backend:e,attrs:o}=r,{shape:n,values:s,defaultValue:a,rowPartitionTensors:i}=t,{rowPartitionTypes:c}=o,l=e.data.get(n.dataId).values,p=e.data.get(s.dataId).values,u=e.data.get(a.dataId).values,m=i.map(h=>e.data.get(h.dataId).values),f=i.map(h=>h.shape),[d,g]=bu(l,n.shape,p,s.shape,s.dtype,u,a.shape,m,f,c);return e.makeTensorInfo(d,s.dtype,g)}var Ek={kernelName:da,backendName:"cpu",kernelFunc:AW};function FW(r){let{backend:t,attrs:e}=r,{start:o,stop:n,dtype:s,step:a}=e,i=Cu(o,n,a,s);return t.makeTensorInfo([i.length],s,i)}var $k={kernelName:ha,backendName:"cpu",kernelFunc:FW};var DW=lt(gn,r=>1/r),Rk={kernelName:gn,backendName:"cpu",kernelFunc:DW};function _W(r){let{inputs:t,backend:e,attrs:o}=r,{images:n}=t,{alignCorners:s,halfPixelCenters:a,size:i}=o;W(n,"resizeBilinear");let c=y.computeStrides(n.shape),[l,p]=i,[u,m,f,d]=n.shape,g=e.data.get(n.dataId).values,h=new Float32Array(y.sizeFromShape([u,l,p,d])),x=[s&&l>1?m-1:m,s&&p>1?f-1:f],b=[s&&l>1?l-1:l,s&&p>1?p-1:p],S=0,w=x[0]/b[0],k=x[1]/b[1];for(let $=0;$<u;$++)for(let R=0;R<l;R++){let A;a?A=w*(R+.5)-.5:A=w*R;let D=Math.max(0,Math.floor(A)),_=A-D,O=Math.min(m-1,Math.ceil(A)),L=$*c[0]+D*c[1],M=$*c[0]+O*c[1];for(let V=0;V<p;V++){let B;a?B=k*(V+.5)-.5:B=k*V;let G=Math.max(0,Math.floor(B)),U=B-G,z=Math.min(f-1,Math.ceil(B)),H=L+G*c[2],X=M+G*c[2],j=L+z*c[2],Q=M+z*c[2];for(let Y=0;Y<d;Y++){let tt=g[H+Y],Z=g[X+Y],rt=g[j+Y],it=g[Q+Y],ut=tt+(rt-tt)*U,mt=Z+(it-Z)*U,xt=ut+(mt-ut)*_;h[S++]=xt}}}return e.makeTensorInfo([u,l,p,d],"float32",h)}var Ak={kernelName:ba,backendName:"cpu",kernelFunc:_W};function OW(r){let{inputs:t,backend:e,attrs:o}=r,{images:n,dy:s}=t,{alignCorners:a}=o;W([s,n],"resizeBilinearGrad");let i=y.computeStrides(n.shape),[c,l,p,u]=n.shape,[,m,f]=s.shape,d=new Float32Array(c*l*p*u),g=[a&&m>1?l-1:l,a&&f>1?p-1:p],h=[a&&m>1?m-1:m,a&&f>1?f-1:f],x=g[0]/h[0],b=g[1]/h[1],S=e.data.get(s.dataId).values,w=0;for(let k=0;k<c;k++){let $=k*i[0];for(let R=0;R<m;R++){let A=R*x,D=Math.floor(A),_=Math.min(Math.ceil(A),l-1),O=$+D*i[1],L=$+_*i[1],M=A-D,V=1-M;for(let B=0;B<f;B++){let G=B*b,U=Math.floor(G),z=Math.min(Math.ceil(G),p-1),H=G-U,X=1-H,j=O+U*i[2],Q=O+z*i[2],Y=L+U*i[2],tt=L+z*i[2],Z=V*X,rt=V*H,it=M*X,ut=M*H;for(let mt=0;mt<u;mt++){let xt=S[w++];d[j+mt]+=xt*Z,d[Q+mt]+=xt*rt,d[Y+mt]+=xt*it,d[tt+mt]+=xt*ut}}}}return e.makeTensorInfo([c,p,l,u],"float32",d)}var Fk={kernelName:Bc,backendName:"cpu",kernelFunc:OW};function PW(r){let{inputs:t,backend:e,attrs:o}=r,{images:n}=t,{alignCorners:s,halfPixelCenters:a,size:i}=o;W(n,"resizeNearestNeighbor");let c=y.computeStrides(n.shape),[l,p]=i,[u,m,f,d]=n.shape,g=e.data.get(n.dataId).values,h=new Float32Array(u*l*p*d),x=[s&&l>1?m-1:m,s&&p>1?f-1:f],b=[s&&l>1?l-1:l,s&&p>1?p-1:p],S=x[0]/b[0],w=x[1]/b[1],k=0;for(let $=0;$<u;$++){let R=$*c[0];for(let A=0;A<l;A++){let D=a?S*(A+.5):S*A,_=Math.min(m-1,s?Math.round(D):Math.floor(D));a&&(_=Math.max(0,_));let O=R+_*c[1];for(let L=0;L<p;L++){let M=a?w*(L+.5):w*L,V=Math.min(f-1,s?Math.round(M):Math.floor(M));a&&(V=Math.max(0,V));let B=O+V*c[2];for(let G=0;G<d;G++){let U=g[B+G];h[k++]=U}}}}return e.makeTensorInfo([u,l,p,d],n.dtype,h)}var Dk={kernelName:ya,backendName:"cpu",kernelFunc:PW};function LW(r){let{inputs:t,backend:e,attrs:o}=r,{images:n,dy:s}=t,{alignCorners:a}=o;W([s,n],"resizeNearestNeighborGrad");let i=y.computeStrides(n.shape),c=y.computeStrides(s.shape),[l,p,u,m]=n.shape,[,f,d]=s.shape,g=new Float32Array(l*p*u*m),h=e.data.get(s.dataId).values,x=[a&&f>1?p-1:p,a&&d>1?u-1:u],b=[a&&f>1?f-1:f,a&&d>1?d-1:d],S=x[0]/b[0],w=x[1]/b[1],k=1/S,$=1/w,R=Math.ceil(k)*2+2,A=Math.ceil($)*2+2;for(let D=0;D<l;D++){let _=D*i[0];for(let O=0;O<p;O++){let L=_+O*i[1],M=Math.floor(O*k),V=Math.floor(M-R/2);for(let B=0;B<u;B++){let G=L+B*i[2],U=Math.floor(B*$),z=Math.floor(U-A/2);for(let H=0;H<m;H++){let X=0;for(let j=0;j<R;j++){let Q=j+V;if(Q<0||Q>=f)continue;let Y=_+Q*c[1],tt=Q*S,Z=Math.min(p-1,a?Math.round(tt):Math.floor(tt));if(O===Z)for(let rt=0;rt<A;rt++){let it=rt+z;if(it<0||it>=d)continue;let ut=Y+it*c[2],mt=it*w,xt=Math.min(u-1,a?Math.round(mt):Math.floor(mt));B===xt&&(X+=h[ut+H])}}g[G+H]=X}}}}return e.makeTensorInfo(n.shape,n.dtype,g)}var _k={kernelName:Mc,backendName:"cpu",kernelFunc:LW};function MW(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{dims:s}=o;W(n,"reverse");let a=n.shape.length,i=y.parseAxisParam(s,n.shape);if(a===0)return ye({inputs:{x:n},backend:e});let c=new $t(n.shape,n.dtype),l=e.bufferSync(n);for(let p=0;p<c.size;p++){let u=c.indexToLoc(p),m=u.slice();i.forEach(f=>m[f]=n.shape[f]-1-m[f]),c.set(l.get(...m),...u)}return e.makeTensorInfo(c.shape,c.dtype,c.values)}var Ok={kernelName:Ca,backendName:"cpu",kernelFunc:MW};var Pk={kernelName:Ua,backendName:"cpu",kernelFunc:({inputs:r,attrs:t,backend:e})=>{let{image:o}=r,{radians:n,fillValue:s,center:a}=t,i=e,c=y.getTypedArrayFromDType(o.dtype,y.sizeFromShape(o.shape)),[l,p,u,m]=o.shape,[f,d]=I.getImageCenter(a,p,u),g=255,h=Math.sin(n),x=Math.cos(n),b=i.data.get(o.dataId).values;for(let w=0;w<l;w++){let k=w*u*p*m;for(let $=0;$<p;$++){let R=$*(u*m);for(let A=0;A<u;A++){let D=A*m;for(let _=0;_<m;_++){let O=[l,$,A,_],L=O[2],M=O[1],V=(L-f)*x-(M-d)*h,B=(L-f)*h+(M-d)*x;V=Math.round(V+f),B=Math.round(B+d);let G=s;if(typeof s!="number"&&(_===3?G=g:G=s[_]),V>=0&&V<u&&B>=0&&B<p){let z=B*(u*m),H=V*m,X=k+z+H+_;G=b[X]}let U=k+R+D+_;c[U]=G}}}}return{dataId:i.write(c,o.shape,o.dtype),shape:o.shape,dtype:o.dtype}}};var BW=lt(bn,r=>{let t=Math.floor(r);return r-t<.5?Math.floor(r):r-t>.5?Math.ceil(r):t%2===0?t:t+1}),Lk={kernelName:bn,backendName:"cpu",kernelFunc:BW};function VW(r){let{inputs:t,backend:e,attrs:o}=r,{indices:n,updates:s}=t,{shape:a}=o,{sliceRank:i,numUpdates:c,sliceSize:l,strides:p,outputSize:u}=I.calculateShapes(s,n,a),m=!0,f=e.bufferSync(n),d=e.bufferSync(s),g=To(f,d,a,u,l,c,i,p,0,m);return e.makeTensorInfo(a,g.dtype,g.values)}var Mk={kernelName:Ta,backendName:"cpu",kernelFunc:VW};function zW(r,t){let e=0,o=r.length,n=0;for(;e<o;)n=Math.floor((e+o)/2),r[n]<t?e=n+1:o=n;return o}function WW(r,t){let e=0,o=r.length,n=0;for(;e<o;)n=Math.floor((e+o)/2),r[n]<=t?e=n+1:o=n;return o}function Bk(r,t,e,o,n,s){let a=y.getArrayFromDType("int32",e*n);for(let i=0;i<e;++i){let c=r.slice(i*o,(i+1)*o),l=i*n;for(let p=0;p<n;++p)a[l+p]=s==="left"?zW(c,t[p+l]):WW(c,t[p+l])}return a}function GW(r){let{inputs:t,backend:e,attrs:o}=r,{sortedSequence:n,values:s}=t,{side:a}=o,i=e.data.get(n.dataId).values,c=e.data.get(s.dataId).values,l=Bk(i,c,n.shape[0],n.shape[1],s.shape[1],a);return e.makeTensorInfo(s.shape,"int32",l)}var Vk={kernelName:Sa,backendName:"cpu",kernelFunc:GW};function UW(r){let{inputs:t,backend:e}=r,{condition:o,t:n,e:s}=t;W([o,n,s],"select");let a=o.shape.length,i=e.data.get(o.dataId).values,c=e.data.get(n.dataId).values,l=e.data.get(s.dataId).values,p=Yt(n.dtype,s.dtype),u=y.makeZerosTypedArray(y.sizeFromShape(n.shape),p),m=0,f=a===0||a>1||n.shape.length===1?1:y.sizeFromShape(n.shape.slice(1));for(let d=0;d<i.length;d++)for(let g=0;g<f;g++)i[d]===1?u[m++]=c[d]:u[m++]=l[d];return e.makeTensorInfo(n.shape,p,u)}var zk={kernelName:wa,backendName:"cpu",kernelFunc:UW};var HW=I.SELU_SCALEALPHA,KW=I.SELU_SCALE,qW=lt(Tn,r=>r>=0?KW*r:HW*(Math.exp(r)-1)),Wk={kernelName:Tn,backendName:"cpu",kernelFunc:qW};var XW=lt(Nn,r=>r<0?-1:r>0?1:0),Gk={kernelName:Nn,backendName:"cpu",kernelFunc:XW};var jW=lt(Sn,r=>Math.sin(r)),Uk={kernelName:Sn,backendName:"cpu",kernelFunc:jW};var YW=lt(wn,r=>Math.sinh(r)),Hk={kernelName:wn,backendName:"cpu",kernelFunc:YW};var ZW=11920928955078125e-23,Kk=Math.log(ZW)+2,QW=lt(vn,r=>{let t=r>-Kk,e=r<Kk,o=Math.exp(r),n;return e?n=o:t?n=r:n=Math.log(1+o),n}),qk={kernelName:vn,backendName:"cpu",kernelFunc:QW};function JW(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{blockShape:s,paddings:a}=o;W([n],"spaceToBatchND");let i=y.sizeFromShape(s),c=[[0,0]];c.push(...a);for(let $=1+s.length;$<n.shape.length;++$)c.push([0,0]);let l=sf.kernelFunc({inputs:{x:n},backend:e,attrs:{paddings:c,constantValue:0}}),p=I.getReshaped(l.shape,s,i,!1),u=I.getPermuted(p.length,s.length,!1),m=I.getReshapedPermuted(l.shape,s,i,!1),g=gt({inputs:{x:l},backend:e,attrs:{shape:p}}),b=Wt({inputs:{x:g},backend:e,attrs:{perm:u}}),k=gt({inputs:{x:b},backend:e,attrs:{shape:m}});return e.disposeIntermediateTensorInfo(l),e.disposeIntermediateTensorInfo(g),e.disposeIntermediateTensorInfo(b),k}var Xk={kernelName:va,backendName:"cpu",kernelFunc:JW};function tG(r){let{inputs:t,backend:e}=r,{indices:o,values:n,denseShape:s,defaultValue:a}=t;if(s.shape.length!==1)throw new Error(`Dense shape must be a vector, saw:
        ${s.shape}`);if(o.shape.length!==2)throw new Error(`Indices must be a matrix, saw:
        ${o.shape}`);if(n.shape.length!==1)throw new Error(`Values must be a vector, saw:
        ${n.shape}`);if(a.shape.length!==0)throw new Error(`Default value must be a scalar, saw:
        ${a.shape}`);let i=e.data.get(o.dataId).values,c=e.data.get(n.dataId).values,l=e.data.get(s.dataId).values,p=e.data.get(a.dataId).values[0],[u,m,f,d,g]=Tu(i,o.shape,o.dtype,c,n.dtype,l,p);return[e.makeTensorInfo(m,o.dtype,u),e.makeTensorInfo([m[0]],n.dtype,f),e.makeTensorInfo([d.length],"bool",new Uint8Array(d.map(h=>Number(h)))),e.makeTensorInfo([g.length],o.dtype,new Int32Array(g))]}var jk={kernelName:$a,backendName:"cpu",kernelFunc:tG};function eG(r){let{inputs:t,backend:e}=r,{inputIndices:o,inputShape:n,newShape:s}=t;if(o.shape.length!==2)throw new Error(`Input indices should be a matrix but received shape
        ${o.shape}`);if(n.shape.length!==1)throw new Error(`Input shape should be a vector but received shape
        ${n.shape}`);if(s.shape.length!==1)throw new Error(`Target shape should be a vector but received shape ${s.shape}`);let a=Array.from(e.data.get(n.dataId).values),i=e.data.get(o.dataId).values,c=Array.from(e.data.get(s.dataId).values),[l,p,u]=Su(i,o.shape,o.dtype,a,c);return[e.makeTensorInfo(p,o.dtype,l),e.makeTensorInfo([u.length],s.dtype,new Int32Array(u))]}var Yk={kernelName:Ra,backendName:"cpu",kernelFunc:eG};function rG(r){let{inputs:t,backend:e}=r,{data:o,indices:n,segmentIds:s}=t;if(o.shape.length<1)throw new Error("Data should be at least 1 dimensional but received scalar");if(n.shape.length!==1)throw new Error(`Indices should be a vector but received shape
          ${n.shape}`);if(s.shape.length!==1)throw new Error(`Segment ids should be a vector but received shape
          ${s.shape}`);if(n.shape[0]!==s.shape[0])throw new Error("segmentIds and indices should have same size.");let a=e.data.get(o.dataId).values,i=e.data.get(n.dataId).values,c=e.data.get(s.dataId).values,[l,p]=uc(a,o.shape,o.dtype,i,c,!0);return e.makeTensorInfo(p,o.dtype,l)}var Zk={kernelName:Aa,backendName:"cpu",kernelFunc:rG};function oG(r){let{inputs:t,backend:e}=r,{data:o,indices:n,segmentIds:s}=t;if(o.shape.length<1)throw new Error("Data should be at least 1 dimensional but received scalar");if(n.shape.length!==1)throw new Error(`Indices should be a vector but received shape
         ${n.shape}`);if(s.shape.length!==1)throw new Error(`Segment ids should be a vector but received shape
         ${s.shape}`);if(n.shape[0]!==s.shape[0])throw new Error("segmentIds and indices should have same size.");let a=e.data.get(o.dataId).values,i=e.data.get(n.dataId).values,c=e.data.get(s.dataId).values,[l,p]=uc(a,o.shape,o.dtype,i,c);return e.makeTensorInfo(p,o.dtype,l)}var Qk={kernelName:Fa,backendName:"cpu",kernelFunc:oG};function nG(r){let{inputs:t,backend:e,attrs:o}=r,{sparseIndices:n,sparseValues:s,defaultValue:a}=t,{outputShape:i}=o,{sliceRank:c,numUpdates:l,sliceSize:p,strides:u,outputSize:m}=I.calculateShapes(s,n,i),f=!1,d=e.bufferSync(n),g;switch(s.dtype){case"bool":{let h=e.bufferSync(s),x=!!e.data.get(a.dataId).values[0];g=To(d,h,i,m,p,l,c,u,x,f);break}case"float32":{let h=e.bufferSync(s),x=e.data.get(a.dataId).values[0];g=To(d,h,i,m,p,l,c,u,x,f);break}case"int32":{let h=e.bufferSync(s),x=e.data.get(a.dataId).values[0];g=To(d,h,i,m,p,l,c,u,x,f);break}case"string":{let h=e.bufferSync(s),x=y.decodeString(e.data.get(a.dataId).values[0]);g=To(d,h,i,m,p,l,c,u,x,f);break}default:throw new Error(`Unsupported type ${s.dtype}`)}return e.makeTensorInfo(i,g.dtype,g.values)}var Jk={kernelName:Da,backendName:"cpu",kernelFunc:nG};function sG(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{numOrSizeSplits:s,axis:a}=o,i=y.parseAxisParam(a,n.shape)[0],c=I.prepareSplitSize(n,s,i),l=new Array(n.shape.length).fill(0),p=n.shape.slice();return c.map(u=>{let m=[...p];m[i]=u;let f=pr({inputs:{x:n},backend:e,attrs:{begin:l,size:m}});return l[i]+=u,f})}var tE={kernelName:ka,backendName:"cpu",kernelFunc:sG};var eE={kernelName:Vc,backendName:"cpu",kernelFunc:({inputs:r,backend:t})=>{let{x:e}=r,o=t;W(e,"square");let n=o.data.get(e.dataId).values,s=new Float32Array(n.length);for(let i=0;i<n.length;++i){let c=n[i];s[i]=c*c}return{dataId:o.write(s,e.shape,e.dtype),shape:e.shape,dtype:e.dtype}}};var aG=lt(Fn,(r,t)=>{let e=t;return isNaN(r)?NaN:r>0?1:e.alpha}),rE={kernelName:Fn,backendName:"cpu",kernelFunc:aG};function iG(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{begin:s,end:a,strides:i,beginMask:c,endMask:l,ellipsisMask:p,newAxisMask:u,shrinkAxisMask:m}=o;W(n,"stridedSlice");let{finalShapeSparse:f,finalShape:d,isIdentity:g,sliceDim0:h,isSimpleSlice:x,begin:b,end:S,strides:w}=ne.sliceInfo(n.shape,s,a,i,c,l,p,u,m),k;if(g)k=gt({inputs:{x:n},backend:e,attrs:{shape:d}});else if(h||x){y.assert(n.shape.length>=1,()=>`Input must have rank at least 1, got: ${n.shape.length}`);let $=ne.computeOutShape(b,S,w),R=pr({inputs:{x:n},backend:e,attrs:{begin:b,size:$}});k=gt({inputs:{x:R},backend:e,attrs:{shape:d}}),e.disposeIntermediateTensorInfo(R)}else{let $=e.bufferSync(n),R=wu(f,$,w,b);k=e.makeTensorInfo(d,R.dtype,R.values)}return k}var oE={kernelName:_a,backendName:"cpu",kernelFunc:iG};function cG(r){let{inputs:t,backend:e,attrs:o}=r,{separator:n,nGramWidths:s,leftPad:a,rightPad:i,padWidth:c,preserveShortSequences:l}=o,{data:p,dataSplits:u}=t,m=e.data.get(p.dataId).values,f=e.data.get(u.dataId).values,[d,g]=Nu(m,f,n,s,a,i,c,l);return[e.makeTensorInfo([d.length],"string",d),e.makeTensorInfo(u.shape,"int32",g)]}var nE={kernelName:Oa,backendName:"cpu",kernelFunc:cG};function lG(r){let{inputs:t,backend:e,attrs:o}=r,{skipEmpty:n}=o,{input:s,delimiter:a}=t;if(s.dtype!=="string")throw new Error("Input must be of datatype string");if(s.shape.length!==1)throw new Error(`Input must be a vector, got shape: ${s.shape}`);if(a.shape.length!==0)throw new Error(`Delimiter must be a scalar, got shape: ${a.shape}`);let i=e.data.get(s.dataId).values,c=e.data.get(a.dataId).values[0],[l,p,u]=Iu(i,c,n),m=p.length;return[e.makeTensorInfo([m,2],"int32",l),e.makeTensorInfo([m],"string",p),e.makeTensorInfo([2],"int32",new Int32Array(u))]}var sE={kernelName:Pa,backendName:"cpu",kernelFunc:lG};function pG(r){let{inputs:t,backend:e,attrs:o}=r,{numBuckets:n}=o,{input:s}=t;if(s.dtype!=="string")throw new Error("Input must be of datatype string");if(n<=0)throw new Error("Number of buckets must be at least 1");let a=e.data.get(s.dataId).values,i=vu(a,n);return e.makeTensorInfo(s.shape,"int32",i)}var aE={kernelName:La,backendName:"cpu",kernelFunc:pG};var uG=lt(Rn,r=>Math.tan(r)),iE={kernelName:Rn,backendName:"cpu",kernelFunc:uG};var mG=lt(An,r=>Math.tanh(r)),cE={kernelName:An,backendName:"cpu",kernelFunc:mG};function fG(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{reps:s}=o;W(n,"tile");let a=ku(e.bufferSync(n),s);return e.makeTensorInfo(a.shape,a.dtype,a.values)}var lE={kernelName:so,backendName:"cpu",kernelFunc:fG};function dG(r){let{inputs:t,backend:e,attrs:o}=r,{x:n}=t,{k:s,sorted:a}=o;W(n,"topk");let i=e.data.get(n.dataId).values,[c,l]=Eu(i,n.shape,n.dtype,s,a);return[e.makeTensorInfo(c.shape,c.dtype,c.values),e.makeTensorInfo(l.shape,l.dtype,l.values)]}var pE={kernelName:Ma,backendName:"cpu",kernelFunc:dG};function hG(r){let{inputs:t,attrs:e,backend:o}=r,{image:n,transforms:s}=t,{interpolation:a,fillMode:i,fillValue:c,outputShape:l}=e,[p,u,m,f]=n.shape,[d,g]=l??[u,m],h=[p,d,g,f],x=y.computeStrides(n.shape),b=x[0],S=x[1],w=x[2],k=y.computeStrides(h),$=k[0],R=k[1],A=k[2],D=y.getTypedArrayFromDType(n.dtype,y.sizeFromShape(h));D.fill(c);let _=o.data.get(n.dataId).values,O=o.data.get(s.dataId).values;for(let M=0;M<p;++M){let V=s.shape[0]===1?O:O.subarray(M*8,M*8+8);for(let B=0;B<d;++B)for(let G=0;G<g;++G)for(let U=0;U<f;++U){let z,H=V[6]*G+V[7]*B+1;if(H===0)continue;let X=(V[0]*G+V[1]*B+V[2])/H,j=(V[3]*G+V[4]*B+V[5])/H,Q=uE(X,m,i),Y=uE(j,u,i);switch(a){case"nearest":z=CG(_,u,m,b,S,w,M,Y,Q,U,c);break;case"bilinear":z=TG(_,u,m,b,S,w,M,Y,Q,U,c);break;default:throw new Error(`Error in Transform: Expect 'nearest' or 'bilinear', but got ${a}`)}let tt=M*$+B*R+G*A+U;D[tt]=z}return o.makeTensorInfo(h,n.dtype,D)}return{dataId:o.write(D,h,n.dtype),shape:n.shape,dtype:n.dtype}}var mE={kernelName:Ba,backendName:"cpu",kernelFunc:hG};function uE(r,t,e){switch(e){case"reflect":return gG(r,t);case"wrap":return xG(r,t);case"nearest":return bG(r,t);case"constant":default:return yG(r,t)}}function gG(r,t){let e=r;if(e<0)if(t<=1)e=0;else{let o=2*t;e<o&&(e=o*Math.trunc(-e/o)+e),e=e<-t?e+o:-e-1}else if(e>t-1)if(t<=1)e=0;else{let o=2*t;e-=o*Math.trunc(e/o),e>=t&&(e=o-e-1)}return y.clamp(0,e,t-1)}function xG(r,t){let e=r;if(e<0)if(t<=1)e=0;else{let o=t-1;e+=t*(Math.trunc(-e/o)+1)}else if(e>t-1)if(t<=1)e=0;else{let o=t-1;e-=t*Math.trunc(e/o)}return y.clamp(0,e,t-1)}function yG(r,t){return r}function bG(r,t){return y.clamp(0,r,t-1)}function Ql(r,t,e,o,n,s,a,i,c,l,p){let u=a*o+i*n+c*s+l;return 0<=i&&i<t&&0<=c&&c<e?r[u]:p}function CG(r,t,e,o,n,s,a,i,c,l,p){let u=Math.round(i),m=Math.round(c);return Ql(r,t,e,o,n,s,a,u,m,l,p)}function TG(r,t,e,o,n,s,a,i,c,l,p){let u=Math.floor(i),m=Math.floor(c),f=u+1,d=m+1,g=(d-c)*Ql(r,t,e,o,n,s,a,u,m,l,p)+(c-m)*Ql(r,t,e,o,n,s,a,u,d,l,p),h=(d-c)*Ql(r,t,e,o,n,s,a,f,m,l,p)+(c-m)*Ql(r,t,e,o,n,s,a,f,d,l,p);return(f-i)*g+(i-u)*h}function SG(r){let{inputs:t,attrs:e,backend:o}=r,{axis:n}=e,{x:s}=t;W(s,"unique");let a=o.data.get(s.dataId).values,{outputValues:i,outputShape:c,indices:l}=$u(a,n,s.shape,s.dtype);return[o.makeTensorInfo(c,s.dtype,i),o.makeTensorInfo([l.length],"int32",l)]}var fE={kernelName:Va,backendName:"cpu",kernelFunc:SG};function wG(r){let{inputs:t,backend:e,attrs:o}=r,{value:n}=t,{axis:s}=o;s<0&&(s+=n.shape.length);let a=n.shape.length,i=n.shape[s],c=new Array(a-1),l=0;for(let f=0;f<a;f++)f!==s&&(c[l++]=n.shape[f]);let p=new Array(a).fill(0),u=n.shape.slice();u[s]=1;let m=new Array(i);for(let f=0;f<m.length;f++){p[s]=f;let d=pr({inputs:{x:n},backend:e,attrs:{begin:p,size:u}});m[f]=gt({inputs:{x:d},backend:e,attrs:{shape:c}}),e.disposeIntermediateTensorInfo(d)}return m}var dE={kernelName:za,backendName:"cpu",kernelFunc:wG};function NG(r){let{inputs:t,backend:e,attrs:o}=r,{x:n,segmentIds:s}=t,{numSegments:a}=o;W(n,"unsortedSegmentSum");let i=n.shape.length,c=s.shape.length,l=[],p=[],u=i-c,m=s;for(let d=0;d<u;++d){let g=wc({inputs:{input:m},backend:e,attrs:{dim:d+1}});m=g,p.push(g)}for(let d=0;d<a;++d){let g=y.createScalarValue(d,"int32"),h=e.makeTensorInfo([],"int32",g),x=tx({inputs:{a:h,b:m},backend:e}),b=ir({inputs:{x},backend:e,attrs:{dtype:"float32"}}),S=yi({inputs:{a:b,b:n},backend:e}),w=Io({inputs:{x:S},backend:e,attrs:{axis:0,keepDims:!1}});l.push(w),p.push(h),p.push(x),p.push(b),p.push(S),p.push(w)}let f=ry({inputs:l,backend:e,attrs:{axis:0}});return p.forEach(d=>e.disposeIntermediateTensorInfo(d)),f}var hE={kernelName:Wa,backendName:"cpu",kernelFunc:NG};var IG=[WI,IT,GI,UI,RT,HI,KI,qI,XI,jI,YI,ZI,QI,JI,tv,rv,ov,nv,sv,zI,av,iv,cv,lv,$T,AT,pv,vT,uv,fv,dv,hv,gv,xv,yv,bv,Cv,Tv,Sv,wv,Nv,Iv,vv,kv,Ev,$v,Rv,Av,Fv,Dv,Ov,OI,Pv,FT,Lv,DT,Mv,_T,Bv,Vv,zv,OT,Wv,Gv,Uv,Hv,Kv,PT,LT,kT,qv,mv,Xv,jv,Yv,PI,MT,BT,Zv,VT,Qv,Jv,tk,ek,rk,ok,nk,zT,sk,ak,ik,ck,pk,uk,mk,WT,fk,dk,xk,GT,UT,yk,bk,Ck,HT,Tk,Nk,Ik,sf,vk,LI,qT,kk,Ek,$k,ET,jl,Rk,MI,BI,VI,Ak,Fk,Dk,_k,Ok,Pk,Lk,ZT,Mk,Vk,zk,Wk,JT,Gk,Uk,Hk,tS,hk,qk,Xk,jk,Yk,Zk,Qk,Jk,tE,rS,eE,oS,rE,oE,nE,sE,aE,nS,_v,iE,cE,lE,pE,mE,KT,fE,dE,hE,Sk];for(let r of IG)Oi(r);var vG=F();vG.registerFlag("KEEP_INTERMEDIATE_TENSORS",()=>!1,r=>{r&&console.warn("Keep intermediate tensors is ON. This will print the values of all intermediate tensors during model inference. Not all models support this mode. For details, check e2e/benchmarks/ model_config.js. This significantly impacts performance.")});var Je;(function(r){r[r.DT_INVALID=0]="DT_INVALID",r[r.DT_FLOAT=1]="DT_FLOAT",r[r.DT_DOUBLE=2]="DT_DOUBLE",r[r.DT_INT32=3]="DT_INT32",r[r.DT_UINT8=4]="DT_UINT8",r[r.DT_INT16=5]="DT_INT16",r[r.DT_INT8=6]="DT_INT8",r[r.DT_STRING=7]="DT_STRING",r[r.DT_COMPLEX64=8]="DT_COMPLEX64",r[r.DT_INT64=9]="DT_INT64",r[r.DT_BOOL=10]="DT_BOOL",r[r.DT_QINT8=11]="DT_QINT8",r[r.DT_QUINT8=12]="DT_QUINT8",r[r.DT_QINT32=13]="DT_QINT32",r[r.DT_BFLOAT16=14]="DT_BFLOAT16",r[r.DT_QINT16=15]="DT_QINT16",r[r.DT_QUINT16=16]="DT_QUINT16",r[r.DT_UINT16=17]="DT_UINT16",r[r.DT_COMPLEX128=18]="DT_COMPLEX128",r[r.DT_HALF=19]="DT_HALF",r[r.DT_RESOURCE=20]="DT_RESOURCE",r[r.DT_VARIANT=21]="DT_VARIANT",r[r.DT_UINT32=22]="DT_UINT32",r[r.DT_UINT64=23]="DT_UINT64",r[r.DT_FLOAT_REF=101]="DT_FLOAT_REF",r[r.DT_DOUBLE_REF=102]="DT_DOUBLE_REF",r[r.DT_INT32_REF=103]="DT_INT32_REF",r[r.DT_UINT8_REF=104]="DT_UINT8_REF",r[r.DT_INT16_REF=105]="DT_INT16_REF",r[r.DT_INT8_REF=106]="DT_INT8_REF",r[r.DT_STRING_REF=107]="DT_STRING_REF",r[r.DT_COMPLEX64_REF=108]="DT_COMPLEX64_REF",r[r.DT_INT64_REF=109]="DT_INT64_REF",r[r.DT_BOOL_REF=110]="DT_BOOL_REF",r[r.DT_QINT8_REF=111]="DT_QINT8_REF",r[r.DT_QUINT8_REF=112]="DT_QUINT8_REF",r[r.DT_QINT32_REF=113]="DT_QINT32_REF",r[r.DT_BFLOAT16_REF=114]="DT_BFLOAT16_REF",r[r.DT_QINT16_REF=115]="DT_QINT16_REF",r[r.DT_QUINT16_REF=116]="DT_QUINT16_REF",r[r.DT_UINT16_REF=117]="DT_UINT16_REF",r[r.DT_COMPLEX128_REF=118]="DT_COMPLEX128_REF",r[r.DT_HALF_REF=119]="DT_HALF_REF",r[r.DT_RESOURCE_REF=120]="DT_RESOURCE_REF",r[r.DT_VARIANT_REF=121]="DT_VARIANT_REF",r[r.DT_UINT32_REF=122]="DT_UINT32_REF",r[r.DT_UINT64_REF=123]="DT_UINT64_REF"})(Je||(Je={}));var gE;(function(r){let t;(function(e){e[e.LEGACY=0]="LEGACY",e[e.V1=1]="V1",e[e.V2=2]="V2"})(t=r.CheckpointFormatVersion||(r.CheckpointFormatVersion={}))})(gE||(gE={}));var EG={};function af(r){return EG[r]}function C(r,t,e,o,n){let s=t.inputParams[r];if(s&&s.inputIndexStart!==void 0){let i=s.inputIndexStart,c=s.inputIndexEnd===0?void 0:s.inputIndexEnd===void 0?i+1:s.inputIndexEnd;if(s.type==="tensor")return ae(t.inputNames[s.inputIndexStart],e,o,n);if(s.type==="tensors")return t.inputNames.slice(i,c).map(m=>ae(m,e,o,n));let l=ae(t.inputNames.slice(i)[0],e,o,n),p=l.dataSync();return s.type==="number"?p[0]:y.toNestedArray(l.shape,p)}let a=t.attrParams[r];return a&&a.value}function ae(r,t,e,o){let[n,s]=Ae(r);if(o!=null){let i=o.getHashTableHandleByName(n);if(i!=null)return i}let a=e.currentContextIds.find(i=>!!t[cf(n,i)]);return a!==void 0?t[cf(n,a)][s]:void 0}function xE(r,t,e){return t[cf(r,e.currentContextId)]}function fr(r,t){let[e,o,n]=Ae(r);return[cf(e,t&&t.currentContextId),o,n]}function cf(r,t){return t?`${r}-${t}`:r}function Ae(r){let t=r.split(":");if(t.length===1)return[r,0,void 0];let e=t[0],o=t.length===3?t[1]:void 0,n=Number(t[t.length-1]);return[e,n,o]}function Jl(r,t,e){let o=C("pad",r,t,e);if(o==="explicit"){o=C("explicitPaddings",r,t,e);let n=[[0,0],[0,0],[0,0],[0,0]];for(let s=0;s<4;s++)n[s][0]=o[s*2],n[s][1]=o[s*2+1];return n}return o}function Rr(r){return r.kept?r:Fe(r)}var oy={};It(oy,{json:()=>$G});var $G=[{tfOpName:"Add",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"AddV2",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"AddN",category:"arithmetic",inputs:[{start:0,end:0,name:"tensors",type:"tensors"}]},{tfOpName:"BiasAdd",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0}]},{tfOpName:"Sub",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"RealDiv",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Div",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"DivNoNan",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"FloorDiv",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Mul",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Maximum",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Minimum",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Pow",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"SquaredDifference",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Mod",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"FloorMod",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]}];var ny={};It(ny,{json:()=>RG});var RG=[{tfOpName:"Abs",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Acos",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Asin",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Atan",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Atan2",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"y",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Ceil",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"ClipByValue",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"clipValueMin",type:"number"},{start:2,name:"clipValueMax",type:"number"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Complex",category:"basic_math",inputs:[{start:0,name:"real",type:"tensor"},{start:1,name:"imag",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"ComplexAbs",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Cos",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Cosh",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Elu",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Exp",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Floor",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Log",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Imag",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"Tout",name:"outputType",type:"dtype",notSupported:!0}]},{tfOpName:"Neg",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Real",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"Tout",name:"outputType",type:"dtype",notSupported:!0}]},{tfOpName:"Prelu",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"alpha",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Relu",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Relu6",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Selu",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Sigmoid",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Sin",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Sinh",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Sqrt",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Rsqrt",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Square",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Tan",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Tanh",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Sign",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Round",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Expm1",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Log1p",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Reciprocal",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Softplus",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Asinh",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Acosh",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Atanh",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Erf",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Prod",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axes",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool",notSupported:!0},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"LeakyRelu",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"alpha",name:"alpha",type:"number",defaultValue:.2},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"IsNan",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]}];var sy={};It(sy,{json:()=>AG});var AG=[{tfOpName:"EmptyTensorList",category:"control",inputs:[{start:0,name:"elementShape",type:"shape"},{start:1,name:"maxNumElements",type:"number"}],attrs:[{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"LoopCond",category:"control",inputs:[{start:0,name:"pred",type:"tensor"}]},{tfOpName:"Switch",category:"control",inputs:[{start:0,name:"data",type:"tensor"},{start:1,name:"pred",type:"tensor"}]},{tfOpName:"Merge",category:"control",inputs:[{start:0,end:0,name:"tensors",type:"tensors"}]},{tfOpName:"Enter",category:"control",inputs:[{start:0,name:"tensor",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"frame_name",name:"frameName",type:"string"},{tfName:"is_constant",name:"isConstant",type:"bool"}]},{tfOpName:"Exit",category:"control",inputs:[{start:0,name:"tensor",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"NextIteration",category:"control",inputs:[{start:0,name:"tensor",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"TensorArrayV3",category:"control",inputs:[{start:0,name:"size",type:"number"}],attrs:[{tfName:"dtype",name:"dtype",type:"dtype"},{tfName:"element_shape",name:"elementShape",type:"shape"},{tfName:"dynamic_size",name:"dynamicSize",type:"bool"},{tfName:"clear_after_read",name:"clearAfterRead",type:"bool"},{tfName:"identical_element_shapes",name:"identicalElementShapes",type:"bool"},{tfName:"tensor_array_name",name:"name",type:"string"}]},{tfOpName:"TensorArrayWriteV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"tensor"},{start:1,name:"index",type:"number"},{start:2,name:"tensor",type:"tensor"},{start:3,name:"flowIn",type:"number"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"TensorArrayReadV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"tensor"},{start:1,name:"index",type:"number"},{start:2,name:"flowIn",type:"number"}],attrs:[{tfName:"dtype",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"TensorArrayGatherV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"tensor"},{start:1,name:"indices",type:"number[]"},{start:2,name:"flowIn",type:"number"}],attrs:[{tfName:"dtype",name:"dtype",type:"dtype"},{tfName:"element_shape",name:"elementShape",type:"shape"}]},{tfOpName:"TensorArrayScatterV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"tensor"},{start:1,name:"indices",type:"number[]"},{start:2,name:"tensor",type:"tensor"},{start:3,name:"flowIn",type:"number"}],attrs:[{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"TensorArrayConcatV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"tensor"},{start:1,name:"flowIn",type:"number"}],attrs:[{tfName:"dtype",name:"dtype",type:"dtype"},{tfName:"element_shape_except0",name:"elementShapeExcept0",type:"shape",notSupported:!0}]},{tfOpName:"TensorArraySplitV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"tensor"},{start:1,name:"tensor",type:"tensor"},{start:2,name:"lengths",type:"number[]"},{start:3,name:"flowIn",type:"number"}],attrs:[{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"TensorArraySizeV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"tensor"},{start:1,name:"flowIn",type:"number"}]},{tfOpName:"TensorArrayCloseV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"tensor"}]},{tfOpName:"StatelessIf",category:"control",inputs:[{start:0,name:"cond",type:"tensor"},{start:1,end:0,name:"args",type:"tensors"}],attrs:[{tfName:"then_branch",name:"thenBranch",type:"func"},{tfName:"else_branch",name:"elseBranch",type:"func"}]},{tfOpName:"If",category:"control",inputs:[{start:0,name:"cond",type:"tensor"},{start:1,end:0,name:"args",type:"tensors"}],attrs:[{tfName:"then_branch",name:"thenBranch",type:"func"},{tfName:"else_branch",name:"elseBranch",type:"func"}]},{tfOpName:"StatelessWhile",category:"control",inputs:[{start:0,end:0,name:"args",type:"tensors"}],attrs:[{tfName:"cond",name:"cond",type:"func"},{tfName:"body",name:"body",type:"func"}]},{tfOpName:"While",category:"control",inputs:[{start:0,end:0,name:"args",type:"tensors"}],attrs:[{tfName:"cond",name:"cond",type:"func"},{tfName:"body",name:"body",type:"func"}]},{tfOpName:"TensorListScatter",category:"control",inputs:[{start:0,name:"tensor",type:"tensor"},{start:1,name:"indices",type:"number[]"},{start:2,name:"elementShape",type:"shape"}],attrs:[{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"TensorListScatterV2",category:"control",inputs:[{start:0,name:"tensor",type:"tensor"},{start:1,name:"indices",type:"number[]"},{start:2,name:"elementShape",type:"shape"},{start:3,name:"numElements",type:"number"}],attrs:[{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"TensorListGather",category:"control",inputs:[{start:0,name:"tensorListId",type:"tensor"},{start:1,name:"indices",type:"number[]"},{start:2,name:"elementShape",type:"shape"}],attrs:[{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"TensorListGetItem",category:"control",inputs:[{start:0,name:"tensorListId",type:"tensor"},{start:1,name:"index",type:"number"},{start:2,name:"elementShape",type:"shape"}],attrs:[{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"TensorListSetItem",category:"control",inputs:[{start:0,name:"tensorListId",type:"tensor"},{start:1,name:"index",type:"number"},{start:2,name:"tensor",type:"tensor"}],attrs:[{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"TensorListReserve",category:"control",inputs:[{start:0,name:"elementShape",type:"shape"},{start:1,name:"numElements",type:"number"}],attrs:[{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"TensorListFromTensor",category:"control",inputs:[{start:0,name:"tensor",type:"tensor"},{start:1,name:"elementShape",type:"shape"}],attrs:[{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"TensorListStack",category:"control",inputs:[{start:0,name:"tensorListId",type:"tensor"},{start:1,name:"elementShape",type:"shape"}],attrs:[{tfName:"element_dtype",name:"elementDType",type:"dtype"},{tfName:"num_elements",name:"numElements",type:"dtype"}]},{tfOpName:"TensorListSplit",category:"control",inputs:[{start:0,name:"tensor",type:"tensor"},{start:1,name:"elementShape",type:"shape"},{start:2,name:"lengths",type:"number[]"}],attrs:[{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"TensorListConcat",category:"control",inputs:[{start:0,name:"tensorListId",type:"tensor"}],attrs:[{tfName:"element_shape",name:"elementShape",type:"shape"},{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"TensorListConcatV2",category:"control",inputs:[{start:0,name:"tensorListId",type:"tensor"}],attrs:[{tfName:"element_shape",name:"elementShape",type:"shape"},{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"TensorListPopBack",category:"control",inputs:[{start:0,name:"tensorListId",type:"tensor"},{start:1,name:"elementShape",type:"shape"}],attrs:[{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"TensorListPushBack",category:"control",inputs:[{start:0,name:"tensorListId",type:"tensor"},{start:1,name:"tensor",type:"tensor"}],attrs:[{tfName:"element_dtype",name:"elementDType",type:"dtype"}]},{tfOpName:"TensorListLength",category:"control",inputs:[{start:0,name:"tensorListId",type:"tensor"}]},{tfOpName:"TensorListResize",category:"control",inputs:[{start:0,name:"tensorListId",type:"tensor"},{start:1,name:"size",type:"number"}]}];var ay={};It(ay,{json:()=>FG});var FG=[{tfOpName:"AvgPool",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0},{tfName:"ksize",name:"kernelSize",type:"number[]"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"MaxPool",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0},{tfName:"ksize",name:"kernelSize",type:"number[]"},{tfName:"explicit_paddings",name:"explicitPaddings",type:"number[]",defaultValue:[],notSupported:!0},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"MaxPoolWithArgmax",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"ksize",name:"kernelSize",type:"number[]"},{tfName:"include_batch_in_index",name:"includeBatchInIndex",type:"bool"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"AvgPool3D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0},{tfName:"ksize",name:"kernelSize",type:"number[]"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"MaxPool3D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0},{tfName:"ksize",name:"kernelSize",type:"number[]"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Conv1D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"}],attrs:[{tfName:"stride",name:"stride",type:"number"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NWC"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"dilation",name:"dilation",type:"number",defaultValue:1}]},{tfOpName:"Conv2D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"useCudnnOnGpu",name:"useCudnnOnGpu",type:"bool"},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NHWC"},{tfName:"explicit_paddings",name:"explicitPaddings",type:"number[]",defaultValue:[]},{tfName:"dilations",name:"dilations",type:"number[]"}]},{tfOpName:"_FusedConv2D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"},{start:2,end:0,name:"args",type:"tensors"}],attrs:[{tfName:"num_args",name:"numArgs",type:"number"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"explicit_paddings",name:"explicitPaddings",type:"number[]",defaultValue:[]},{tfName:"use_cudnn_on_gpu",name:"useCudnnOnGpu",type:"bool",defaultValue:!0},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NHWC"},{tfName:"dilations",name:"dilations",type:"number[]",defaultValue:[1,1,1,1]},{tfName:"fused_ops",name:"fusedOps",type:"string[]",defaultValue:[]},{tfName:"epsilon",name:"epsilon",type:"number",defaultValue:1e-4},{tfName:"leakyrelu_alpha",name:"leakyreluAlpha",type:"number",defaultValue:.2}]},{tfOpName:"Conv2DBackpropInput",category:"convolution",inputs:[{start:2,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"},{start:0,name:"outputShape",type:"number[]"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0},{tfName:"explicit_paddings",name:"explicitPaddings",type:"number[]",defaultValue:[]},{tfName:"dilations",name:"dilations",type:"number[]",notSupported:!0}]},{tfOpName:"DepthwiseConv2d",category:"convolution",inputs:[{start:0,name:"input",type:"tensor"},{start:1,name:"filter",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NHWC"},{tfName:"explicit_paddings",name:"explicitPaddings",type:"number[]",defaultValue:[]},{tfName:"dilations",name:"dilations",type:"number[]"}]},{tfOpName:"DepthwiseConv2dNative",category:"convolution",inputs:[{start:0,name:"input",type:"tensor"},{start:1,name:"filter",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NHWC"},{tfName:"explicit_paddings",name:"explicitPaddings",type:"number[]",defaultValue:[]},{tfName:"dilations",name:"dilations",type:"number[]"}]},{tfOpName:"FusedDepthwiseConv2dNative",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"},{start:2,end:0,name:"args",type:"tensors"}],attrs:[{tfName:"num_args",name:"numArgs",type:"number"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NHWC"},{tfName:"dilations",name:"dilations",type:"number[]",defaultValue:[1,1,1,1]},{tfName:"fused_ops",name:"fusedOps",type:"string[]",defaultValue:[]},{tfName:"explicit_paddings",name:"explicitPaddings",type:"number[]",defaultValue:[]}]},{tfOpName:"Conv3D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NHWC"},{tfName:"dilations",name:"dilations",type:"number[]"}]},{tfOpName:"Dilation2D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"rates",name:"dilations",type:"number[]"},{tfName:"padding",name:"pad",type:"string"}]}];var iy={};It(iy,{json:()=>DG});var DG=[{tfOpName:"Fill",category:"creation",inputs:[{start:0,name:"shape",type:"number[]"},{start:1,name:"value",type:"number"}],attrs:[{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"LinSpace",category:"creation",inputs:[{start:0,name:"start",type:"number"},{start:1,name:"stop",type:"number"},{start:2,name:"num",type:"number"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"OneHot",category:"creation",inputs:[{start:0,name:"indices",type:"tensor"},{start:1,name:"depth",type:"number"},{start:2,name:"onValue",type:"number",defaultValue:1},{start:3,name:"offValue",type:"number",defaultValue:0}],attrs:[{tfName:"axis",name:"axis",type:"number",notSupported:!0},{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"Ones",category:"creation",inputs:[{start:0,name:"shape",type:"number[]"}],attrs:[{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"OnesLike",category:"creation",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"dtype",name:"dtype",type:"dtype"}]},{tfOpName:"RandomStandardNormal",category:"creation",inputs:[{start:0,name:"shape",type:"number[]"}],attrs:[{tfName:"seed",name:"seed",type:"number",defaultValue:0},{tfName:"seed2",name:"seed2",type:"number",defaultValue:0,notSupported:!0},{tfName:"dtype",name:"dtype",type:"dtype"},{tfName:"T",name:"T",type:"number",notSupported:!0}]},{tfOpName:"RandomUniform",category:"creation",inputs:[{start:0,name:"shape",type:"number[]"}],attrs:[{tfName:"minval",name:"minval",type:"number",defaultValue:0},{tfName:"maxval",name:"maxval",type:"number",defaultValue:1},{tfName:"dtype",name:"dtype",type:"dtype"},{tfName:"seed",name:"seed",type:"number",defaultValue:0},{tfName:"seed2",name:"seed2",type:"number",defaultValue:0,notSupported:!0},{tfName:"T",name:"T",type:"number",notSupported:!0}]},{tfOpName:"Range",category:"creation",inputs:[{start:0,name:"start",type:"number"},{start:1,name:"stop",type:"number"},{start:2,name:"step",type:"number",defaultValue:0}],attrs:[{tfName:"Tidx",name:"dtype",type:"dtype"}]},{tfOpName:"TruncatedNormal",category:"creation",inputs:[{start:0,name:"shape",type:"number[]"}],attrs:[{tfName:"means",name:"mean",type:"number",defaultValue:0},{tfName:"stddev",name:"stdDev",type:"number",defaultValue:1},{tfName:"seed",name:"seed",type:"number"},{tfName:"seed2",name:"seed2",type:"number",defaultValue:0,notSupported:!0},{tfName:"dtype",name:"dtype",type:"dtype"},{tfName:"T",name:"T",type:"number",notSupported:!0}]},{tfOpName:"Zeros",category:"creation",inputs:[{start:0,name:"shape",type:"number[]"}],attrs:[{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"ZerosLike",category:"creation",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"Multinomial",category:"creation",inputs:[{start:0,name:"logits",type:"tensor"},{start:1,name:"numSamples",type:"number"}],attrs:[{tfName:"seed",name:"seed",type:"number"},{tfName:"seed2",name:"seed2",type:"number"},{tfName:"T",name:"dtype",type:"dtype"},{tfName:"output_dtype",name:"output_dtype",type:"dtype"}]}];var cy={};It(cy,{json:()=>_G});var _G=[{tfOpName:"NonMaxSuppressionV2",category:"dynamic",inputs:[{start:0,name:"boxes",type:"tensor"},{start:1,name:"scores",type:"tensor"},{start:2,name:"maxOutputSize",type:"number"},{start:3,name:"iouThreshold",type:"number"}]},{tfOpName:"NonMaxSuppressionV3",category:"dynamic",inputs:[{start:0,name:"boxes",type:"tensor"},{start:1,name:"scores",type:"tensor"},{start:2,name:"maxOutputSize",type:"number"},{start:3,name:"iouThreshold",type:"number"},{start:4,name:"scoreThreshold",type:"number"}]},{tfOpName:"NonMaxSuppressionV4",category:"dynamic",inputs:[{start:0,name:"boxes",type:"tensor"},{start:1,name:"scores",type:"tensor"},{start:2,name:"maxOutputSize",type:"number"},{start:3,name:"iouThreshold",type:"number"},{start:4,name:"scoreThreshold",type:"number"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"T_threshold",name:"threshold",type:"dtype",notSupported:!0},{tfName:"pad_to_max_output_size",name:"padToMaxOutputSize",type:"bool"}]},{tfOpName:"NonMaxSuppressionV5",category:"dynamic",inputs:[{start:0,name:"boxes",type:"tensor"},{start:1,name:"scores",type:"tensor"},{start:2,name:"maxOutputSize",type:"number"},{start:3,name:"iouThreshold",type:"number"},{start:4,name:"scoreThreshold",type:"number"},{start:5,name:"softNmsSigma",type:"number"}]},{tfOpName:"Where",category:"dynamic",inputs:[{start:0,name:"condition",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"ListDiff",category:"dynamic",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"y",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]}];var ly={};It(ly,{json:()=>OG});var OG=[{tfOpName:"LowerBound",category:"evaluation",inputs:[{start:0,name:"sortedSequence",type:"tensor"},{start:1,name:"values",type:"tensor"}]},{tfOpName:"TopKV2",category:"evaluation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"k",type:"number"}],attrs:[{tfName:"sorted",name:"sorted",type:"bool"}]},{tfOpName:"UpperBound",category:"evaluation",inputs:[{start:0,name:"sortedSequence",type:"tensor"},{start:1,name:"values",type:"tensor"}]},{tfOpName:"Unique",category:"evaluation",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"UniqueV2",category:"evaluation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number"}]}];var py={};It(py,{json:()=>PG});var PG=[{tfOpName:"PlaceholderWithDefault",category:"graph",inputs:[{start:0,name:"default",type:"tensor"}],attrs:[{tfName:"shape",name:"shape",type:"shape"},{tfName:"dtype",name:"dtype",type:"dtype"}]},{tfOpName:"Placeholder",category:"graph",attrs:[{tfName:"shape",name:"shape",type:"shape"},{tfName:"dtype",name:"dtype",type:"dtype"}]},{tfOpName:"Const",category:"graph"},{tfOpName:"Identity",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"IdentityN",category:"graph",inputs:[{start:0,end:0,name:"x",type:"tensors"}]},{tfOpName:"Snapshot",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"Rank",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"Size",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"Shape",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"ShapeN",category:"graph",inputs:[{start:0,end:0,name:"x",type:"tensors"}]},{tfOpName:"Print",category:"graph",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"data",type:"tensors"}],attrs:[{tfName:"message",name:"message",type:"string"},{tfName:"first_n",name:"firstN",type:"number",notSupported:!0},{tfName:"summarize",name:"summarize",type:"number",defaultValue:3}]},{tfOpName:"NoOp",category:"graph",inputs:[]},{tfOpName:"StopGradient",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"FakeQuantWithMinMaxVars",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"min",name:"min",type:"number"},{tfName:"max",name:"max",type:"number"}]}];var uy={};It(uy,{json:()=>LG});var LG=[{tfOpName:"HashTable",category:"hash_table",inputs:[],attrs:[{tfName:"shared_name",name:"sharedName",type:"string"},{tfName:"use_node_name_sharing",name:"useNodeNameSharing",type:"bool"},{tfName:"key_dtype",name:"keyDType",type:"dtype"},{tfName:"value_dtype",name:"valueDType",type:"dtype"}]},{tfOpName:"HashTableV2",category:"hash_table",inputs:[],attrs:[{tfName:"shared_name",name:"sharedName",type:"string"},{tfName:"use_node_name_sharing",name:"useNodeNameSharing",type:"bool"},{tfName:"key_dtype",name:"keyDType",type:"dtype"},{tfName:"value_dtype",name:"valueDType",type:"dtype"}]},{tfOpName:"LookupTableImport",category:"hash_table",inputs:[{start:0,name:"tableHandle",type:"tensor"},{start:1,name:"keys",type:"tensor"},{start:2,name:"values",type:"tensor"}],attrs:[{tfName:"Tin",name:"tIn",type:"dtype",notSupported:!0},{tfName:"Tout",name:"tOut",type:"dtype",notSupported:!0}]},{tfOpName:"LookupTableImportV2",category:"hash_table",inputs:[{start:0,name:"tableHandle",type:"tensor"},{start:1,name:"keys",type:"tensor"},{start:2,name:"values",type:"tensor"}],attrs:[{tfName:"Tin",name:"tIn",type:"dtype",notSupported:!0},{tfName:"Tout",name:"tOut",type:"dtype",notSupported:!0}]},{tfOpName:"LookupTableFind",category:"hash_table",inputs:[{start:0,name:"tableHandle",type:"tensor"},{start:1,name:"keys",type:"tensor"},{start:2,name:"defaultValue",type:"tensor"}],attrs:[{tfName:"Tin",name:"tIn",type:"dtype",notSupported:!0},{tfName:"Tout",name:"tOut",type:"dtype",notSupported:!0}]},{tfOpName:"LookupTableFindV2",category:"hash_table",inputs:[{start:0,name:"tableHandle",type:"tensor"},{start:1,name:"keys",type:"tensor"},{start:2,name:"defaultValue",type:"tensor"}],attrs:[{tfName:"Tin",name:"tIn",type:"dtype",notSupported:!0},{tfName:"Tout",name:"tOut",type:"dtype",notSupported:!0}]},{tfOpName:"LookupTableSize",category:"hash_table",inputs:[{start:0,name:"tableHandle",type:"tensor"}]},{tfOpName:"LookupTableSizeV2",category:"hash_table",inputs:[{start:0,name:"tableHandle",type:"tensor"}]}];var my={};It(my,{json:()=>MG});var MG=[{tfOpName:"ResizeBilinear",category:"image",inputs:[{start:0,name:"images",type:"tensor"},{start:1,name:"size",type:"number[]"}],attrs:[{tfName:"align_corners",name:"alignCorners",type:"bool"},{tfName:"half_pixel_centers",name:"halfPixelCenters",type:"bool"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"ResizeNearestNeighbor",category:"image",inputs:[{start:0,name:"images",type:"tensor"},{start:1,name:"size",type:"number[]"}],attrs:[{tfName:"align_corners",name:"alignCorners",type:"bool"},{tfName:"half_pixel_centers",name:"halfPixelCenters",type:"bool"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"CropAndResize",category:"image",inputs:[{start:0,name:"image",type:"tensor"},{start:1,name:"boxes",type:"tensor"},{start:2,name:"boxInd",type:"tensor"},{start:3,name:"cropSize",type:"number[]"}],attrs:[{tfName:"method",name:"method",type:"string"},{tfName:"extrapolation_value",name:"extrapolationValue",type:"number"}]},{tfOpName:"ImageProjectiveTransformV3",category:"image",inputs:[{start:0,name:"images",type:"tensor"},{start:1,name:"transforms",type:"tensor"},{start:2,name:"outputShape",type:"number[]"},{start:3,name:"fillValue",type:"number"}],attrs:[{tfName:"interpolation",name:"interpolation",type:"string"},{tfName:"fill_mode",name:"fillMode",type:"string"}]}];var fy={};It(fy,{json:()=>BG});var BG=[{tfOpName:"Equal",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"NotEqual",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Greater",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"GreaterEqual",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Less",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"LessEqual",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"LogicalAnd",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"LogicalNot",category:"logical",inputs:[{start:0,name:"a",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"LogicalOr",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Select",category:"logical",inputs:[{start:0,name:"condition",type:"tensor"},{start:1,name:"a",type:"tensor"},{start:2,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"SelectV2",category:"logical",inputs:[{start:0,name:"condition",type:"tensor"},{start:1,name:"a",type:"tensor"},{start:2,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]}];var dy={};It(dy,{json:()=>VG});var VG=[{tfOpName:"_FusedMatMul",category:"matrices",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"},{start:2,end:0,name:"args",type:"tensors"}],attrs:[{tfName:"num_args",name:"numArgs",type:"number"},{tfName:"fused_ops",name:"fusedOps",type:"string[]",defaultValue:[]},{tfName:"epsilon",name:"epsilon",type:"number",defaultValue:1e-4},{tfName:"transpose_a",name:"transposeA",type:"bool",defaultValue:!1},{tfName:"transpose_b",name:"transposeB",type:"bool",defaultValue:!1},{tfName:"leakyrelu_alpha",name:"leakyreluAlpha",type:"number",defaultValue:.2},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"MatMul",category:"matrices",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"transpose_a",name:"transposeA",type:"bool",defaultValue:!1},{tfName:"transpose_b",name:"transposeB",type:"bool",defaultValue:!1},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"BatchMatMul",category:"matrices",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"adj_x",name:"transposeA",type:"bool",defaultValue:!1},{tfName:"adj_y",name:"transposeB",type:"bool",defaultValue:!1},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"BatchMatMulV2",category:"matrices",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"adj_x",name:"transposeA",type:"bool",defaultValue:!1},{tfName:"adj_y",name:"transposeB",type:"bool",defaultValue:!1},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Transpose",category:"matrices",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"perm",type:"number[]"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Einsum",category:"matrices",inputs:[{start:0,end:0,name:"tensors",type:"tensors"}],attrs:[{tfName:"equation",name:"equation",type:"string"},{tfName:"N",name:"n",type:"number",defaultValue:2},{tfName:"T",name:"dtype",type:"dtype"}]}];var hy={};It(hy,{json:()=>zG});var zG=[{tfOpName:"EuclideanNorm",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool",defaultValue:!1}]},{tfOpName:"FusedBatchNorm",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"scale",type:"tensor"},{start:2,name:"offset",type:"tensor"},{start:3,name:"mean",type:"tensor"},{start:4,name:"variance",type:"tensor"}],attrs:[{tfName:"epsilon",name:"epsilon",type:"number",defaultValue:.001},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0}]},{tfOpName:"FusedBatchNormV2",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"scale",type:"tensor"},{start:2,name:"offset",type:"tensor"},{start:3,name:"mean",type:"tensor"},{start:4,name:"variance",type:"tensor"}],attrs:[{tfName:"epsilon",name:"epsilon",type:"number",defaultValue:.001},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0}]},{tfOpName:"FusedBatchNormV3",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"scale",type:"tensor"},{start:2,name:"offset",type:"tensor"},{start:3,name:"mean",type:"tensor"},{start:4,name:"variance",type:"tensor"}],attrs:[{tfName:"epsilon",name:"epsilon",type:"number",defaultValue:.001},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0}]},{tfOpName:"LRN",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"depth_radius",name:"radius",type:"number",defaultValue:5},{tfName:"bias",name:"bias",type:"number",defaultValue:1},{tfName:"alpha",name:"alpha",type:"number",defaultValue:1},{tfName:"beta",name:"beta",type:"number",defaultValue:.5}]},{tfOpName:"Softmax",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"LogSoftmax",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"SparseToDense",category:"normalization",inputs:[{start:0,name:"sparseIndices",type:"tensor"},{start:1,name:"outputShape",type:"number[]"},{start:2,name:"sparseValues",type:"tensor"},{start:3,name:"defaultValue",type:"tensor"}],attrs:[{tfName:"validate_indices",name:"validateIndices",type:"bool",defaultValue:!0,notSupported:!0}]}];var gy={};It(gy,{json:()=>WG});var WG=[{tfOpName:"Bincount",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"size",type:"number"},{start:2,name:"weights",type:"tensor"}]},{tfOpName:"DenseBincount",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"size",type:"number"},{start:2,name:"weights",type:"tensor"}],attrs:[{tfName:"binary_output",name:"binaryOutput",type:"bool"}]},{tfOpName:"Max",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"Mean",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"Min",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"Sum",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"All",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"Any",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"ArgMax",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number"}]},{tfOpName:"ArgMin",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number"}]},{tfOpName:"Prod",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"Cumprod",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number"}],attrs:[{tfName:"exclusive",name:"exclusive",type:"bool"},{tfName:"reverse",name:"reverse",type:"bool"}]},{tfOpName:"Cumsum",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number"}],attrs:[{tfName:"exclusive",name:"exclusive",type:"bool"},{tfName:"reverse",name:"reverse",type:"bool"}]}];var xy={};It(xy,{json:()=>GG});var GG=[{tfOpName:"ConcatV2",category:"slice_join",inputs:[{start:0,end:-1,name:"tensors",type:"tensors"},{start:-1,name:"axis",type:"number"}],attrs:[{tfName:"N",name:"n",type:"number",defaultValue:2}]},{tfOpName:"Concat",category:"slice_join",inputs:[{start:1,end:0,name:"tensors",type:"tensors"},{start:0,name:"axis",type:"number"}],attrs:[{tfName:"N",name:"n",type:"number",defaultValue:2}]},{tfOpName:"GatherV2",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"indices",type:"tensor"},{start:2,name:"axis",type:"number",defaultValue:0}],attrs:[{tfName:"batch_dims",name:"batchDims",type:"number",defaultValue:0}]},{tfOpName:"Gather",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"indices",type:"tensor"}],attrs:[{tfName:"validate_indices",name:"validateIndices",type:"bool",notSupported:!0}]},{tfOpName:"Reverse",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"dims",type:"bool[]"}]},{tfOpName:"ReverseV2",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}]},{tfOpName:"Slice",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"begin",type:"number[]"},{start:2,name:"size",type:"number[]"}]},{tfOpName:"StridedSlice",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"begin",type:"number[]"},{start:2,name:"end",type:"number[]"},{start:3,name:"strides",type:"number[]"}],attrs:[{tfName:"begin_mask",name:"beginMask",type:"number",defaultValue:0},{tfName:"end_mask",name:"endMask",type:"number",defaultValue:0},{tfName:"new_axis_mask",name:"newAxisMask",type:"number",defaultValue:0},{tfName:"ellipsis_mask",name:"ellipsisMask",type:"number",defaultValue:0},{tfName:"shrink_axis_mask",name:"shrinkAxisMask",type:"number",defaultValue:0}]},{tfOpName:"Pack",category:"slice_join",inputs:[{start:0,end:0,name:"tensors",type:"tensors"}],attrs:[{tfName:"axis",name:"axis",type:"number",defaultValue:0}]},{tfOpName:"Unpack",category:"slice_join",inputs:[{start:0,name:"tensor",type:"tensor"}],attrs:[{tfName:"axis",name:"axis",type:"number",defaultValue:0},{tfName:"num",name:"num",type:"number",defaultValue:0,notSupported:!0}]},{tfOpName:"Tile",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"reps",type:"number[]"}]},{tfOpName:"Split",category:"slice_join",inputs:[{start:0,name:"axis",type:"number",defaultValue:0},{start:1,name:"x",type:"tensor"}],attrs:[{tfName:"num_split",name:"numOrSizeSplits",type:"number",defaultValue:1}]},{tfOpName:"SplitV",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"numOrSizeSplits",type:"number[]"},{start:2,name:"axis",type:"number",defaultValue:0}]},{tfOpName:"ScatterNd",category:"slice_join",inputs:[{start:0,name:"indices",type:"tensor"},{start:1,name:"values",type:"tensor"},{start:2,name:"shape",type:"number[]"}]},{tfOpName:"GatherNd",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"indices",type:"tensor"}]},{tfOpName:"SparseToDense",category:"slice_join",inputs:[{start:0,name:"sparseIndices",type:"tensor"},{start:1,name:"outputShape",type:"number[]"},{start:2,name:"sparseValues",type:"tensor"},{start:3,name:"defaultValue",type:"tensor"}],attrs:[{tfName:"validate_indices",name:"validateIndices",type:"bool",defaultValue:!1,notSupported:!0}]}];var yy={};It(yy,{json:()=>UG});var UG=[{tfOpName:"SparseFillEmptyRows",category:"sparse",inputs:[{start:0,name:"indices",type:"tensor"},{start:1,name:"values",type:"tensor"},{start:2,name:"denseShape",type:"tensor"},{start:3,name:"defaultValue",type:"tensor"}]},{tfOpName:"SparseReshape",category:"sparse",inputs:[{start:0,name:"inputIndices",type:"tensor"},{start:1,name:"inputShape",type:"tensor"},{start:2,name:"newShape",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"SparseSegmentMean",category:"sparse",inputs:[{start:0,name:"data",type:"tensor"},{start:1,name:"indices",type:"tensor"},{start:2,name:"segmentIds",type:"tensor"}]},{tfOpName:"SparseSegmentSum",category:"sparse",inputs:[{start:0,name:"data",type:"tensor"},{start:1,name:"indices",type:"tensor"},{start:2,name:"segmentIds",type:"tensor"}]}];var by={};It(by,{json:()=>HG});var HG=[{tfOpName:"FFT",category:"spectral",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"IFFT",category:"spectral",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"RFFT",category:"spectral",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"fft_length",type:"number",notSupported:!0}]},{tfOpName:"IRFFT",category:"spectral",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"fft_length",type:"number",notSupported:!0}]}];var Cy={};It(Cy,{json:()=>KG});var KG=[{tfOpName:"StringNGrams",category:"string",inputs:[{start:0,name:"data",type:"tensor"},{start:1,name:"dataSplits",type:"tensor"}],attrs:[{tfName:"separator",name:"separator",type:"string"},{tfName:"ngram_widths",name:"nGramWidths",type:"number[]"},{tfName:"left_pad",name:"leftPad",type:"string"},{tfName:"right_pad",name:"rightPad",type:"string"},{tfName:"pad_width",name:"padWidth",type:"number"},{tfName:"preserve_short_sequences",name:"preserveShortSequences",type:"bool"}],outputs:["ngrams","ngrams_splits"]},{tfOpName:"StringSplit",category:"string",inputs:[{start:0,name:"input",type:"tensor"},{start:1,name:"delimiter",type:"tensor"}],attrs:[{tfName:"skip_empty",name:"skipEmpty",type:"bool"}],outputs:["indices","values","shape"]},{tfOpName:"StringToHashBucketFast",category:"string",inputs:[{start:0,name:"input",type:"tensor"}],attrs:[{tfName:"num_buckets",name:"numBuckets",type:"number"}]}];var Ty={};It(Ty,{json:()=>qG});var qG=[{tfOpName:"Cast",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"SrcT",name:"sdtype",type:"dtype",notSupported:!0},{tfName:"DstT",name:"dtype",type:"dtype"}]},{tfOpName:"ExpandDims",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number"}]},{tfOpName:"MirrorPad",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"padding",type:"number[]"}],attrs:[{tfName:"mode",name:"mode",type:"string"}]},{tfOpName:"Pad",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"padding",type:"number[]"}],attrs:[{tfName:"constant_value",name:"constantValue",type:"number",defaultValue:0}]},{tfOpName:"PadV2",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"padding",type:"number[]"},{start:2,name:"constantValue",type:"number",defaultValue:0}]},{tfOpName:"Reshape",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"shape",type:"number[]"}]},{tfOpName:"Squeeze",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"axis",tfDeprecatedName:"squeeze_dims",name:"axis",type:"number[]"}]},{tfOpName:"SpaceToBatchND",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"blockShape",type:"number[]"},{start:2,name:"paddings",type:"number[]"}]},{tfOpName:"BatchToSpaceND",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"blockShape",type:"number[]"},{start:2,name:"crops",type:"number[]"}]},{tfOpName:"DepthToSpace",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"block_size",name:"blockSize",type:"number"},{tfName:"data_format",name:"dataFormat",type:"string"}]},{tfOpName:"BroadcastTo",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"shape",type:"number[]"}],attrs:[]},{tfOpName:"BroadcastArgs",category:"transformation",inputs:[{start:0,name:"s0",type:"tensor"},{start:1,name:"s1",type:"tensor"}],attrs:[]}];var tp=class{static get Instance(){return this._instance||(this._instance=new this)}constructor(){let t=[oy,ny,sy,ay,iy,cy,ly,py,uy,my,fy,dy,hy,gy,xy,yy,by,Cy,Ty],e=[].concat(...t.map(o=>o.json));this.opMappers=e.reduce((o,n)=>(o[n.tfOpName]=n,o),{})}transformGraph(t,e={}){let o=t.node,n=[],s=[],a=[],i=o.reduce((g,h)=>(g[h.name]=this.mapNode(h),h.op.startsWith("Placeholder")?n.push(g[h.name]):h.op==="Const"?s.push(g[h.name]):(h.input==null||h.input.length===0)&&a.push(g[h.name]),g),{}),c=[],l=[],p={},u={};e!=null&&(p=this.mapSignatureEntries(e.inputs),u=this.mapSignatureEntries(e.outputs));let m=Object.keys(i);m.forEach(g=>{let h=i[g];h.inputNames.forEach((x,b)=>{let[S,,w]=fr(x),k=i[S];if(k.outputs!=null){let $=k.outputs.indexOf(w);if($!==-1){let R=`${S}:${$}`;h.inputNames[b]=R}}h.inputs.push(k),k.children.push(h)})}),Object.keys(u).length===0?m.forEach(g=>{let h=i[g];h.children.length===0&&l.push(h)}):Object.keys(u).forEach(g=>{let[h]=fr(g),x=i[h];x!=null&&(x.signatureKey=u[g],l.push(x))}),Object.keys(p).length>0?Object.keys(p).forEach(g=>{let[h]=fr(g),x=i[h];x&&(x.signatureKey=p[g],c.push(x))}):c=n;let f={};t.library!=null&&t.library.function!=null&&(f=t.library.function.reduce((g,h)=>(g[h.signature.name]=this.mapFunction(h),g),{}));let d={nodes:i,inputs:c,outputs:l,weights:s,placeholders:n,signature:e,functions:f};return a.length>0&&(d.initNodes=a),d}mapSignatureEntries(t){return Object.keys(t||{}).reduce((e,o)=>(e[t[o].name]=o,e),{})}mapNode(t){let e=af(t.op)||this.opMappers[t.op]||{};t.attr==null&&(t.attr={});let o={name:t.name,op:t.op,category:e.category,inputNames:(t.input||[]).map(n=>n.startsWith("^")?n.slice(1):n),inputs:[],children:[],inputParams:{},attrParams:{},rawAttrs:t.attr,outputs:e.outputs};return e.inputs!=null&&(o.inputParams=e.inputs.reduce((n,s)=>(n[s.name]={type:s.type,inputIndexStart:s.start,inputIndexEnd:s.end},n),{})),e.attrs!=null&&(o.attrParams=e.attrs.reduce((n,s)=>{let a=s.type,i;switch(s.type){case"string":i=lf(t.attr,s.tfName,s.defaultValue),i===void 0&&s.tfDeprecatedName&&(i=lf(t.attr,s.tfDeprecatedName,s.defaultValue));break;case"string[]":i=gf(t.attr,s.tfName,s.defaultValue),i===void 0&&s.tfDeprecatedName&&(i=gf(t.attr,s.tfDeprecatedName,s.defaultValue));break;case"number":i=uf(t.attr,s.tfName,s.defaultValue||0),i===void 0&&s.tfDeprecatedName&&(i=uf(t.attr,s.tfDeprecatedName,s.defaultValue));break;case"number[]":i=hf(t.attr,s.tfName,s.defaultValue),i===void 0&&s.tfDeprecatedName&&(i=hf(t.attr,s.tfDeprecatedName,s.defaultValue));break;case"bool":i=pf(t.attr,s.tfName,s.defaultValue),i===void 0&&s.tfDeprecatedName&&(i=pf(t.attr,s.tfDeprecatedName,s.defaultValue));break;case"bool[]":i=yf(t.attr,s.tfName,s.defaultValue),i===void 0&&s.tfDeprecatedName&&(i=yf(t.attr,s.tfDeprecatedName,s.defaultValue));break;case"shape":i=df(t.attr,s.tfName,s.defaultValue),i===void 0&&s.tfDeprecatedName&&(i=df(t.attr,s.tfDeprecatedName,s.defaultValue));break;case"shape[]":i=xf(t.attr,s.tfName,s.defaultValue),i===void 0&&s.tfDeprecatedName&&(i=xf(t.attr,s.tfDeprecatedName,s.defaultValue));break;case"dtype":i=mf(t.attr,s.tfName,s.defaultValue),i===void 0&&s.tfDeprecatedName&&(i=mf(t.attr,s.tfDeprecatedName,s.defaultValue));break;case"dtype[]":i=ff(t.attr,s.tfName,s.defaultValue),i===void 0&&s.tfDeprecatedName&&(i=ff(t.attr,s.tfDeprecatedName,s.defaultValue));break;case"func":i=yE(t.attr,s.tfName,s.defaultValue),i===void 0&&s.tfDeprecatedName&&(i=yE(t.attr,s.tfDeprecatedName,s.defaultValue));break;case"tensor":case"tensors":break;default:throw new Error(`Unsupported param type: ${s.type} for op: ${t.op}`)}return n[s.name]={value:i,type:a},n},{})),o}mapFunction(t){let e=t.nodeDef,o=[],n=[],s={};e!=null&&(s=e.reduce((u,m)=>(u[m.name]=this.mapNode(m),m.op==="Const"&&n.push(u[m.name]),u),{}));let a=[],i=[];t.signature.inputArg.forEach(u=>{let[m]=fr(u.name),f={name:m,op:"Placeholder",inputs:[],inputNames:[],category:"graph",inputParams:{},attrParams:{dtype:{value:Sy(u.type),type:"dtype"}},children:[]};f.signatureKey=u.name,a.push(f),s[m]=f}),Object.keys(s).forEach(u=>{let m=s[u];m.inputNames.forEach((f,d)=>{let[g,,h]=fr(f),x=s[g];if(x.outputs!=null){let b=x.outputs.indexOf(h);if(b!==-1){let S=`${g}:${b}`;m.inputNames[d]=S}}m.inputs.push(x),x.children.push(m)})});let l=t.ret;t.signature.outputArg.forEach(u=>{let[m,f]=fr(l[u.name]),d=s[m];d!=null&&(d.defaultOutput=f,i.push(d))});let p=this.mapArgsToSignature(t);return{nodes:s,inputs:a,outputs:i,weights:n,placeholders:o,signature:p}}mapArgsToSignature(t){return{methodName:t.signature.name,inputs:t.signature.inputArg.reduce((e,o)=>(e[o.name]=this.mapArgToTensorInfo(o),e),{}),outputs:t.signature.outputArg.reduce((e,o)=>(e[o.name]=this.mapArgToTensorInfo(o,t.ret),e),{})}}mapArgToTensorInfo(t,e){let o=t.name;return e!=null&&(o=e[o]),{name:o,dtype:t.type}}};function XG(r){let t=F().global;if(typeof t.atob<"u")return t.atob(r);if(typeof Buffer<"u")return new Buffer(r,"base64").toString();throw new Error("Unable to decode base64 in this environment. Missing built-in atob() or Buffer()")}function bE(r,t){let e=Array.isArray(r)?String.fromCharCode.apply(null,r):XG(r);return t?e:e.toLowerCase()}function lf(r,t,e,o=!1){let n=r[t];return n!=null?bE(n.s,o):e}function pf(r,t,e){let o=r[t];return o?o.b:e}function uf(r,t,e){let o=r[t]||{},n=o.i!=null?o.i:o.f!=null?o.f:e;return typeof n=="number"?n:parseInt(n,10)}function Sy(r){switch(typeof r=="string"&&(r=Je[r]),r){case Je.DT_FLOAT:case Je.DT_HALF:return"float32";case Je.DT_INT32:case Je.DT_INT64:case Je.DT_INT8:case Je.DT_UINT8:return"int32";case Je.DT_BOOL:return"bool";case Je.DT_DOUBLE:return"float32";case Je.DT_STRING:return"string";default:return null}}function yE(r,t,e){let o=r[t];return o&&o.func?o.func.name:e}function mf(r,t,e){let o=r[t];return o&&o.type?Sy(o.type):e}function ff(r,t,e){let o=r[t];return o&&o.list&&o.list.type?o.list.type.map(n=>Sy(n)):e}function CE(r){if(!r.unknownRank)return r.dim!=null?r.dim.map(t=>typeof t.size=="number"?t.size:parseInt(t.size,10)):[]}function df(r,t,e){let o=r[t];return o&&o.shape?CE(o.shape):e}function hf(r,t,e){let o=r[t];return o?((o.list.f&&o.list.f.length?o.list.f:o.list.i)||[]).map(n=>typeof n=="number"?n:parseInt(n,10)):e}function gf(r,t,e,o=!1){let n=r[t];return n&&n.list&&n.list.s?n.list.s.map(s=>bE(s,o)):e}function xf(r,t,e){let o=r[t];return o&&o.list&&o.list.shape?o.list.shape.map(n=>CE(n)):e}function yf(r,t,e){let o=r[t];return o&&o.list&&o.list.b?o.list.b:e}var bf=class{constructor(t,e,o){this.node=t,this.tensorMap=e,this.context=o,this.inputs=[],this.attrs={},this.inputs=t.inputNames.map(n=>this.getInput(n)),t.rawAttrs!=null&&(this.attrs=Object.keys(t.rawAttrs).reduce((n,s)=>(n[s]=this.getAttr(s),n),{}))}getInput(t){return ae(t,this.tensorMap,this.context)}getAttr(t,e){let o=this.node.rawAttrs[t];if(o.tensor!=null)return ae(t,this.tensorMap,this.context);if(o.i!=null||o.f!=null)return uf(this.node.rawAttrs,t,e);if(o.s!=null)return lf(this.node.rawAttrs,t,e);if(o.b!=null)return pf(this.node.rawAttrs,t,e);if(o.shape!=null)return df(this.node.rawAttrs,t,e);if(o.type!=null)return mf(this.node.rawAttrs,t,e);if(o.list!=null){if(o.list.i!=null||o.list.f!=null)return hf(this.node.rawAttrs,t,e);if(o.list.s!=null)return gf(this.node.rawAttrs,t,e);if(o.list.shape!=null)return xf(this.node.rawAttrs,t,e);if(o.list.b!=null)return yf(this.node.rawAttrs,t,e);if(o.list.type!=null)return ff(this.node.rawAttrs,t,e)}return e}};var At={};It(At,{OP_SCOPE_SUFFIX:()=>xp,abs:()=>ce,acos:()=>Ed,acosh:()=>$d,add:()=>nt,addN:()=>Rd,all:()=>Ad,any:()=>Fd,argMax:()=>Dd,argMin:()=>_d,asin:()=>Od,asinh:()=>Pd,atan:()=>Ld,atan2:()=>Md,atanh:()=>Bd,avgPool:()=>ol,avgPool3d:()=>Gd,basicLSTMCell:()=>Ud,batchNorm:()=>uo,batchNorm2d:()=>Hd,batchNorm3d:()=>Kd,batchNorm4d:()=>qd,batchToSpaceND:()=>nl,bincount:()=>sl,booleanMaskAsync:()=>N0,broadcastArgs:()=>Xd,broadcastTo:()=>mo,buffer:()=>et,cast:()=>St,ceil:()=>jd,clipByValue:()=>Yd,clone:()=>Fe,complex:()=>ke,concat:()=>Pt,concat1d:()=>Zd,concat2d:()=>Qd,concat3d:()=>Jd,concat4d:()=>th,conv1d:()=>eh,conv2d:()=>fo,conv2dTranspose:()=>rh,conv3d:()=>oh,conv3dTranspose:()=>nh,cos:()=>sh,cosh:()=>ah,cosineWindow:()=>Qi,cumprod:()=>ih,cumsum:()=>ch,denseBincount:()=>lh,depthToSpace:()=>ph,depthwiseConv2d:()=>ri,diag:()=>uh,dilation2d:()=>mh,div:()=>Ct,divNoNan:()=>fh,dot:()=>dh,dropout:()=>A0,einsum:()=>hh,elu:()=>il,enclosingPowerOfTwo:()=>Wp,equal:()=>al,erf:()=>gh,euclideanNorm:()=>yh,exp:()=>Xe,expandDims:()=>Gr,expm1:()=>bh,eye:()=>cl,fft:()=>ai,fill:()=>wr,floor:()=>ll,floorDiv:()=>rl,fused:()=>Gp,gather:()=>pl,gatherND:()=>$0,greater:()=>zn,greaterEqual:()=>ul,ifft:()=>Un,imag:()=>po,image:()=>NC,inTopKAsync:()=>F0,irfft:()=>El,isFinite:()=>Ch,isInf:()=>Th,isNaN:()=>Sh,leakyRelu:()=>ml,less:()=>wh,lessEqual:()=>oi,linalg:()=>IC,linspace:()=>Nh,localResponseNormalization:()=>Ih,log:()=>Ur,log1p:()=>fl,logSigmoid:()=>vh,logSoftmax:()=>kh,logSumExp:()=>hl,logicalAnd:()=>Wn,logicalNot:()=>gl,logicalOr:()=>xl,logicalXor:()=>Eh,losses:()=>vC,lowerBound:()=>$h,matMul:()=>wt,max:()=>Nr,maxPool:()=>yl,maxPool3d:()=>Rh,maxPoolWithArgmax:()=>Ah,maximum:()=>bl,mean:()=>Gn,meshgrid:()=>Fh,min:()=>Yi,minimum:()=>Cl,mirrorPad:()=>Dh,mod:()=>_h,moments:()=>Oh,movingAverage:()=>I0,mul:()=>q,multiRNNCell:()=>Ph,multinomial:()=>Lh,neg:()=>Ce,norm:()=>Vn,notEqual:()=>Tl,oneHot:()=>qi,ones:()=>Ir,onesLike:()=>Mh,op:()=>N,outerProduct:()=>Bh,pad:()=>vr,pad1d:()=>Vh,pad2d:()=>zh,pad3d:()=>Wh,pad4d:()=>Gh,pool:()=>Uh,pow:()=>Wr,prelu:()=>wl,print:()=>Yc,prod:()=>Hh,raggedGather:()=>Kh,raggedTensorToTensor:()=>qh,rand:()=>Xh,randomGamma:()=>rg,randomNormal:()=>Nl,randomStandardNormal:()=>og,randomUniform:()=>Il,range:()=>xo,real:()=>Vr,reciprocal:()=>ng,relu:()=>yo,relu6:()=>vl,reshape:()=>P,reverse:()=>Ve,reverse1d:()=>sg,reverse2d:()=>ag,reverse3d:()=>ig,reverse4d:()=>cg,rfft:()=>ii,round:()=>kl,rsqrt:()=>lg,scalar:()=>at,scatterND:()=>v0,searchSorted:()=>Zi,selu:()=>pg,separableConv2d:()=>ug,setdiff1dAsync:()=>mg,sigmoid:()=>Sr,sign:()=>fg,signal:()=>wC,sin:()=>dg,sinh:()=>hg,slice:()=>Tt,slice1d:()=>gg,slice2d:()=>xg,slice3d:()=>yg,slice4d:()=>bg,softmax:()=>Cg,softplus:()=>dl,spaceToBatchND:()=>Sl,sparse:()=>kC,sparseToDense:()=>E0,spectral:()=>SC,split:()=>Hr,sqrt:()=>$e,square:()=>le,squaredDifference:()=>$l,squeeze:()=>ci,stack:()=>we,step:()=>Rl,stridedSlice:()=>Tg,string:()=>EC,sub:()=>pt,sum:()=>Et,tan:()=>Sg,tanh:()=>ji,tensor:()=>be,tensor1d:()=>he,tensor2d:()=>bo,tensor3d:()=>tl,tensor4d:()=>wg,tensor5d:()=>Ng,tensor6d:()=>Ig,tile:()=>go,topk:()=>vg,transpose:()=>Za,truncatedNormal:()=>kg,unique:()=>Eg,unsortedSegmentSum:()=>$g,unstack:()=>ze,upperBound:()=>Rg,variable:()=>Ag,where:()=>or,whereAsync:()=>Al,zeros:()=>je,zerosLike:()=>ee});var TE=(r,t,e,o=At)=>{switch(r.op){case"BiasAdd":case"AddV2":case"Add":return[o.add(C("a",r,t,e),C("b",r,t,e))];case"AddN":return[o.addN(C("tensors",r,t,e))];case"FloorMod":case"Mod":return[o.mod(C("a",r,t,e),C("b",r,t,e))];case"Mul":return[o.mul(C("a",r,t,e),C("b",r,t,e))];case"RealDiv":case"Div":return[o.div(C("a",r,t,e),C("b",r,t,e))];case"DivNoNan":return[o.divNoNan(C("a",r,t,e),C("b",r,t,e))];case"FloorDiv":return[o.floorDiv(C("a",r,t,e),C("b",r,t,e))];case"Sub":return[o.sub(C("a",r,t,e),C("b",r,t,e))];case"Minimum":return[o.minimum(C("a",r,t,e),C("b",r,t,e))];case"Maximum":return[o.maximum(C("a",r,t,e),C("b",r,t,e))];case"Pow":return[o.pow(C("a",r,t,e),C("b",r,t,e))];case"SquaredDifference":return[o.squaredDifference(C("a",r,t,e),C("b",r,t,e))];default:throw TypeError(`Node type ${r.op} is not implemented`)}};var SE=(r,t,e,o=At)=>{switch(r.op){case"Abs":case"ComplexAbs":return[o.abs(C("x",r,t,e))];case"Acos":return[o.acos(C("x",r,t,e))];case"Acosh":return[o.acosh(C("x",r,t,e))];case"Asin":return[o.asin(C("x",r,t,e))];case"Asinh":return[o.asinh(C("x",r,t,e))];case"Atan":return[o.atan(C("x",r,t,e))];case"Atan2":return[o.atan2(C("x",r,t,e),C("y",r,t,e))];case"Atanh":return[o.atanh(C("x",r,t,e))];case"Ceil":return[o.ceil(C("x",r,t,e))];case"Complex":return[o.complex(C("real",r,t,e),C("imag",r,t,e))];case"Cos":return[o.cos(C("x",r,t,e))];case"Cosh":return[o.cosh(C("x",r,t,e))];case"Elu":return[o.elu(C("x",r,t,e))];case"Erf":return[o.erf(C("x",r,t,e))];case"Exp":return[o.exp(C("x",r,t,e))];case"Expm1":return[o.expm1(C("x",r,t,e))];case"Floor":return[o.floor(C("x",r,t,e))];case"Log":return[o.log(C("x",r,t,e))];case"Log1p":return[o.log1p(C("x",r,t,e))];case"Imag":return[o.imag(C("x",r,t,e))];case"Neg":return[o.neg(C("x",r,t,e))];case"Reciprocal":return[o.reciprocal(C("x",r,t,e))];case"Real":return[o.real(C("x",r,t,e))];case"Relu":return[o.relu(C("x",r,t,e))];case"Round":return[o.round(C("x",r,t,e))];case"Selu":return[o.selu(C("x",r,t,e))];case"Sigmoid":return[o.sigmoid(C("x",r,t,e))];case"Sin":return[o.sin(C("x",r,t,e))];case"Sign":return[o.sign(C("x",r,t,e))];case"Sinh":return[o.sinh(C("x",r,t,e))];case"Softplus":return[o.softplus(C("x",r,t,e))];case"Sqrt":return[o.sqrt(C("x",r,t,e))];case"Square":return[o.square(C("x",r,t,e))];case"Tanh":return[o.tanh(C("x",r,t,e))];case"Tan":return[o.tan(C("x",r,t,e))];case"ClipByValue":return[o.clipByValue(C("x",r,t,e),C("clipValueMin",r,t,e),C("clipValueMax",r,t,e))];case"Relu6":return[o.relu6(C("x",r,t,e))];case"Rsqrt":return[o.rsqrt(ae(r.inputNames[0],t,e))];case"Prod":return[o.prod(C("x",r,t,e),C("axes",r,t,e))];case"LeakyRelu":return[o.leakyRelu(C("x",r,t,e),C("alpha",r,t,e))];case"Prelu":return[o.prelu(C("x",r,t,e),C("alpha",r,t,e))];case"IsNan":return[o.isNaN(ae(r.inputNames[0],t,e))];default:throw TypeError(`Node type ${r.op} is not implemented`)}};function Ue(r,t,e=""){if(!(typeof r=="number"||typeof t=="number")){y.assert(r.length===t.length,()=>e+` Shapes ${r} and ${t} must match`);for(let o=0;o<r.length;o++){let n=r[o],s=t[o];y.assert(n<0||s<0||n===s,()=>e+` Shapes ${r} and ${t} must match`)}}}function wE(r){return!(typeof r=="number"||r.some(t=>t<0))}function Nc(r,t,e){let o=Cf(r,e),n=!wE(o);if(n&&t.length===0)throw new Error(`Tried to calculate elements of an empty list with non-fully-defined elementShape: ${o}`);if(n&&t.forEach(s=>{o=Cf(s.shape,o)}),!wE(o))throw new Error(`Non-fully-defined elementShape: ${o}`);return o}function Cf(r,t){if(typeof r=="number")return t;if(typeof t=="number")return r;if(r.length!==t.length)throw new Error(`Incompatible ranks during merge: ${r} vs. ${t}`);let e=[];for(let o=0;o<r.length;++o){let n=r[o],s=t[o];if(n>=0&&s>=0&&n!==s)throw new Error(`Incompatible shape during merge: ${r} vs. ${t}`);e[o]=n>=0?n:s}return e}var Tf=class{constructor(t,e,o,n,s,a,i){this.name=t,this.dtype=e,this.maxSize=o,this.elementShape=n,this.identicalElementShapes=s,this.dynamicSize=a,this.clearAfterRead=i,this.tensors=[],this.closed_=!1,this.idTensor=at(0),Be(this.idTensor)}get id(){return this.idTensor.id}get closed(){return this.closed_}clearAndClose(t){this.tensors.forEach(e=>{(t==null||!t.has(e.tensor.id))&&e.tensor.dispose()}),this.tensors=[],this.closed_=!0,this.idTensor.dispose()}size(){return this.tensors.length}read(t){if(this.closed_)throw new Error(`TensorArray ${this.name} has already been closed.`);if(t<0||t>=this.size())throw new Error(`Tried to read from index ${t}, but array size is: ${this.size()}`);let e=this.tensors[t];if(e.cleared)throw new Error(`TensorArray ${this.name}: Could not read index ${t} twice because it was cleared after a previous read (perhaps try setting clear_after_read = false?).`);return this.clearAfterRead&&(e.cleared=!0),e.read=!0,e.tensor}readMany(t){return t.map(e=>this.read(e))}write(t,e){if(this.closed_)throw new Error(`TensorArray ${this.name} has already been closed.`);if(t<0||!this.dynamicSize&&t>=this.maxSize)throw new Error(`Tried to write to index ${t}, but array is not resizeable and size is: ${this.maxSize}`);let o=this.tensors[t]||{};if(e.dtype!==this.dtype)throw new Error(`TensorArray ${this.name}: Could not write to TensorArray index ${t},
          because the value dtype is ${e.dtype}, but TensorArray dtype is ${this.dtype}.`);if(this.size()===0&&(this.elementShape==null||this.elementShape.length===0)&&(this.elementShape=e.shape),Ue(this.elementShape,e.shape,`TensorArray ${this.name}: Could not write to TensorArray index ${t}.`),o.read)throw new Error(`TensorArray ${this.name}: Could not write to TensorArray index ${t}, because it has already been read.`);if(o.written)throw new Error(`TensorArray ${this.name}: Could not write to TensorArray index ${t}, because it has already been written.`);o.tensor=e,Be(e),o.written=!0,this.tensors[t]=o}writeMany(t,e){if(t.length!==e.length)throw new Error(`TensorArray ${this.name}: could not write multiple tensors,because the index size: ${t.length} is not the same as tensors size: ${e.length}.`);t.forEach((o,n)=>this.write(o,e[n]))}gather(t,e){if(e&&e!==this.dtype)throw new Error(`TensorArray dtype is ${this.dtype} but gather requested dtype ${e}`);if(t)t=t.slice(0,this.size());else{t=[];for(let n=0;n<this.size();n++)t.push(n)}if(t.length===0)return be([],[0].concat(this.elementShape));let o=this.readMany(t);return Ue(this.elementShape,o[0].shape,"TensorArray shape mismatch: "),we(o,0)}concat(t){if(t&&t!==this.dtype)throw new Error(`TensorArray dtype is ${this.dtype} but concat requested dtype ${t}`);if(this.size()===0)return be([],[0].concat(this.elementShape));let e=[];for(let n=0;n<this.size();n++)e.push(n);let o=this.readMany(e);return Ue(this.elementShape,o[0].shape,`TensorArray shape mismatch: tensor array shape (${this.elementShape}) vs first tensor shape (${o[0].shape})`),Pt(o,0)}scatter(t,e){if(e.dtype!==this.dtype)throw new Error(`TensorArray dtype is ${this.dtype} but tensor has dtype ${e.dtype}`);if(t.length!==e.shape[0])throw new Error(`Expected len(indices) == tensor.shape[0], but saw: ${t.length} vs. ${e.shape[0]}`);let o=Math.max(...t);if(!this.dynamicSize&&o>=this.maxSize)throw new Error(`Max index must be < array size (${o}  vs. ${this.maxSize})`);this.writeMany(t,ze(e,0))}split(t,e){if(e.dtype!==this.dtype)throw new Error(`TensorArray dtype is ${this.dtype} but tensor has dtype ${e.dtype}`);let o=0,n=t.map(c=>(o+=c,o));if(o!==e.shape[0])throw new Error(`Expected sum of lengths to be equal to
          tensor.shape[0], but sum of lengths is
        ${o}, and tensor's shape is: ${e.shape}`);if(!this.dynamicSize&&t.length!==this.maxSize)throw new Error(`TensorArray's size is not equal to the size of lengths (${this.maxSize} vs. ${t.length}), and the TensorArray is not marked as dynamically resizeable`);let s=o===0?0:e.size/o,a=[];ft(()=>{e=P(e,[1,o,s]);for(let c=0;c<t.length;++c){let p=[0,c===0?0:n[c-1],0],u=[1,t[c],s];a[c]=P(Tt(e,p,u),this.elementShape)}return a});let i=[];for(let c=0;c<t.length;c++)i[c]=c;this.writeMany(i,a)}};var Ic=class r{constructor(t,e,o,n=-1){this.tensors=t,this.elementShape=e,this.elementDtype=o,t?.forEach(s=>{if(o!==s.dtype)throw new Error(`Invalid data types; op elements ${o}, but list elements ${s.dtype}`);Ue(e,s.shape,"TensorList shape mismatch: "),Be(s)}),this.idTensor=at(0),this.maxNumElements=n,Be(this.idTensor)}get id(){return this.idTensor.id}copy(){return new r([...this.tensors],this.elementShape,this.elementDtype)}clearAndClose(t){this.tensors.forEach(e=>{(t==null||!t.has(e.id))&&e.dispose()}),this.tensors.length=0,this.idTensor.dispose()}size(){return this.tensors.length}stack(t,e,o=-1){if(e!==this.elementDtype)throw new Error(`Invalid data types; op elements ${e}, but list elements ${this.elementDtype}`);if(o!==-1&&this.tensors.length!==o)throw new Error(`Operation expected a list with ${o} elements but got a list with ${this.tensors.length} elements.`);Ue(t,this.elementShape,"TensorList shape mismatch: ");let n=Nc(this.elementShape,this.tensors,t);return ft(()=>{let s=this.tensors.map(a=>P(a,n));return we(s,0)})}popBack(t,e){if(e!==this.elementDtype)throw new Error(`Invalid data types; op elements ${e}, but list elements ${this.elementDtype}`);if(this.size()===0)throw new Error("Trying to pop from an empty list.");let o=Nc(this.elementShape,this.tensors,t),n=this.tensors.pop();return n.kept=!1,Ue(n.shape,t,"TensorList shape mismatch: "),P(n,o)}pushBack(t){if(t.dtype!==this.elementDtype)throw new Error(`Invalid data types; op elements ${t.dtype}, but list elements ${this.elementDtype}`);if(Ue(t.shape,this.elementShape,"TensorList shape mismatch: "),this.maxNumElements===this.size())throw new Error("Trying to push element into a full list.");Be(t),this.tensors.push(t)}resize(t){if(t<0)throw new Error(`TensorListResize expects size to be non-negative. Got: ${t}`);if(this.maxNumElements!==-1&&t>this.maxNumElements)throw new Error(`TensorListResize input size ${t} is greater maxNumElement ${this.maxNumElements}.`);let e=new r([],this.elementShape,this.elementDtype,this.maxNumElements);e.tensors.length=t;for(let o=0;o<Math.min(this.tensors.length,t);++o)e.tensors[o]=this.tensors[o];return e}getItem(t,e,o){if(o!==this.elementDtype)throw new Error(`Invalid data types; op elements ${o}, but list elements ${this.elementDtype}`);if(t<0||t>this.tensors.length)throw new Error(`Trying to access element ${t} in a list with ${this.tensors.length} elements.`);if(this.tensors[t]==null)throw new Error(`element at index ${t} is null.`);Ue(this.tensors[t].shape,e,"TensorList shape mismatch: ");let n=Nc(this.elementShape,this.tensors,e);return P(this.tensors[t],n)}setItem(t,e){if(e.dtype!==this.elementDtype)throw new Error(`Invalid data types; op elements ${e.dtype}, but list elements ${this.elementDtype}`);if(t<0||this.maxNumElements!==-1&&t>=this.maxNumElements)throw new Error(`Trying to set element ${t} in a list with max ${this.maxNumElements} elements.`);Ue(this.elementShape,e.shape,"TensorList shape mismatch: "),Be(e),this.tensors[t]!=null&&(this.tensors[t].kept=!1),this.tensors[t]=e}gather(t,e,o){if(e!==this.elementDtype)throw new Error(`Invalid data types; op elements ${e}, but list elements ${this.elementDtype}`);Ue(this.elementShape,o,"TensorList shape mismatch: "),t=t.slice(0,this.size());let n=Nc(this.elementShape,this.tensors,o);return t.length===0?be([],[0].concat(n)):ft(()=>{let s=t.map(a=>P(this.tensors[a],n));return we(s,0)})}concat(t,e){if(t&&t!==this.elementDtype)throw new Error(`TensorList dtype is ${this.elementDtype} but concat requested dtype ${t}`);Ue(this.elementShape,e,"TensorList shape mismatch: ");let o=Nc(this.elementShape,this.tensors,e);return this.size()===0?be([],[0].concat(o)):ft(()=>{let n=this.tensors.map(s=>P(s,o));return Pt(n,0)})}};function NE(r,t,e){let o=r.dtype;if(r.shape.length<1)throw new Error(`Tensor must be at least a vector, but saw shape: ${r.shape}`);if(r.dtype!==e)throw new Error(`Invalid data types; op elements ${r.dtype}, but list elements ${e}`);let n=r.shape.slice(1);Ue(n,t,"TensorList shape mismatch: ");let s=ze(r);return new Ic(s,t,o)}function IE(r,t,e,o){return new Ic([],r,t,o)}function vE(r,t,e,o){if(t.length!==r.shape[0])throw new Error(`Expected len(indices) == tensor.shape[0], but saw: ${t.length} vs. ${r.shape[0]}`);let n=Math.max(...t);if(o!=null&&o!==-1&&n>=o)throw new Error(`Max index must be < array size (${n}  vs. ${o})`);let s=new Ic([],e,r.dtype,o),a=ze(r,0);return t.forEach((i,c)=>{s.setItem(i,a[c])}),s}function kE(r,t,e){let o=0,n=t.map(p=>(o+=p,o));if(o!==r.shape[0])throw new Error(`Expected sum of lengths to be equal to
          tensor.shape[0], but sum of lengths is
        ${o}, and tensor's shape is: ${r.shape}`);let s=r.shape.slice(1),a=Cf(s,e),i=o===0?0:r.size/o,c=ft(()=>{let p=[];r=P(r,[1,o,i]);for(let u=0;u<t.length;++u){let f=[0,u===0?0:n[u-1],0],d=[1,t[u],i];p[u]=P(Tt(r,f,d),a)}return r.dispose(),p}),l=new Ic([],e,r.dtype,t.length);for(let p=0;p<c.length;p++)l.setItem(p,c[p]);return l}var EE=async(r,t,e)=>{switch(r.op){case"If":case"StatelessIf":{let o=C("thenBranch",r,t,e),n=C("elseBranch",r,t,e),s=C("cond",r,t,e),a=C("args",r,t,e);return(await s.data())[0]?e.functionMap[o].executeFunctionAsync(a,e.tensorArrayMap,e.tensorListMap):e.functionMap[n].executeFunctionAsync(a,e.tensorArrayMap,e.tensorListMap)}case"While":case"StatelessWhile":{let o=C("body",r,t,e),n=C("cond",r,t,e),s=C("args",r,t,e),a=await e.functionMap[n].executeFunctionAsync(s,e.tensorArrayMap,e.tensorListMap),i=s.map(p=>p.id),c=await a[0].data();a.forEach(p=>{!p.kept&&i.indexOf(p.id)===-1&&p.dispose()});let l=s;for(;c[0];){let p=l;l=await e.functionMap[o].executeFunctionAsync(l,e.tensorArrayMap,e.tensorListMap);let u=l.map(f=>f.id);p.forEach(f=>{!f.kept&&i.indexOf(f.id)===-1&&u.indexOf(f.id)===-1&&f.dispose()});let m=await e.functionMap[n].executeFunctionAsync(l,e.tensorArrayMap,e.tensorListMap);c=await m[0].data(),m.forEach(f=>{!f.kept&&i.indexOf(f.id)===-1&&u.indexOf(f.id)===-1&&f.dispose()})}return l}case"LoopCond":{let o=C("pred",r,t,e);return[Rr(o)]}case"Switch":{let o=C("pred",r,t,e),n=C("data",r,t,e);return n.kept||(n=Rr(n)),(await o.data())[0]?[void 0,n]:[n,void 0]}case"Merge":{let o=r.inputNames.find(n=>ae(n,t,e)!==void 0);if(o){let n=ae(o,t,e);return[Rr(n)]}return}case"Enter":{let o=C("frameName",r,t,e),n=C("tensor",r,t,e);return e.enterFrame(o),[Rr(n)]}case"Exit":{let o=C("tensor",r,t,e);return e.exitFrame(),[Rr(o)]}case"NextIteration":{let o=C("tensor",r,t,e);return e.nextIteration(),[Rr(o)]}case"TensorArrayV3":{let o=C("size",r,t,e),n=C("dtype",r,t,e),s=C("elementShape",r,t,e),a=C("dynamicSize",r,t,e),i=C("clearAfterRead",r,t,e),c=C("identicalElementShapes",r,t,e),l=C("name",r,t,e),p=new Tf(l,n,o,s,c,a,i);return e.addTensorArray(p),[p.idTensor,at(1)]}case"TensorArrayWriteV3":{let o=C("tensorArrayId",r,t,e),n=C("index",r,t,e),s=C("tensor",r,t,e),a=e.getTensorArray(o.id);return a.write(n,s),[a.idTensor]}case"TensorArrayReadV3":{let o=C("tensorArrayId",r,t,e),n=C("index",r,t,e);return[e.getTensorArray(o.id).read(n)]}case"TensorArrayGatherV3":{let o=C("tensorArrayId",r,t,e),n=C("indices",r,t,e),s=C("dtype",r,t,e);return[e.getTensorArray(o.id).gather(n,s)]}case"TensorArrayScatterV3":{let o=C("tensorArrayId",r,t,e),n=C("indices",r,t,e),s=C("tensor",r,t,e),a=e.getTensorArray(o.id);return a.scatter(n,s),[a.idTensor]}case"TensorArrayConcatV3":{let o=C("tensorArrayId",r,t,e),n=e.getTensorArray(o.id),s=C("dtype",r,t,e);return[n.concat(s)]}case"TensorArraySplitV3":{let o=C("tensorArrayId",r,t,e),n=C("tensor",r,t,e),s=C("lengths",r,t,e),a=e.getTensorArray(o.id);return a.split(s,n),[a.idTensor]}case"TensorArraySizeV3":{let o=C("tensorArrayId",r,t,e),n=e.getTensorArray(o.id);return[at(n.size(),"int32")]}case"TensorArrayCloseV3":{let o=C("tensorArrayId",r,t,e),n=e.getTensorArray(o.id);return n.clearAndClose(),[n.idTensor]}case"TensorListSetItem":{let o=C("tensorListId",r,t,e),n=C("index",r,t,e),s=C("tensor",r,t,e),a=e.getTensorList(o.id);return a.setItem(n,s),[a.idTensor]}case"TensorListGetItem":{let o=C("tensorListId",r,t,e),n=C("index",r,t,e),s=C("elementShape",r,t,e),a=C("elementDType",r,t,e);return[e.getTensorList(o.id).getItem(n,s,a)]}case"TensorListScatterV2":case"TensorListScatter":{let o=C("indices",r,t,e),n=C("tensor",r,t,e),s=C("elementShape",r,t,e),a=C("numElements",r,t,e),i=vE(n,o,s,a);return e.addTensorList(i),[i.idTensor]}case"TensorListReserve":case"EmptyTensorList":{let o=C("elementShape",r,t,e),n=C("elementDType",r,t,e),s;r.op==="TensorListReserve"?s="numElements":s="maxNumElements";let a=C(s,r,t,e),i=r.op==="TensorListReserve"?-1:a,c=IE(o,n,a,i);return e.addTensorList(c),[c.idTensor]}case"TensorListGather":{let o=C("tensorListId",r,t,e),n=C("indices",r,t,e),s=C("elementShape",r,t,e),a=C("elementDType",r,t,e);return[e.getTensorList(o.id).gather(n,a,s)]}case"TensorListStack":{let o=C("tensorListId",r,t,e),n=C("elementShape",r,t,e),s=C("elementDType",r,t,e),a=C("numElements",r,t,e);return[e.getTensorList(o.id).stack(n,s,a)]}case"TensorListFromTensor":{let o=C("tensor",r,t,e),n=C("elementShape",r,t,e),s=C("elementDType",r,t,e),a=NE(o,n,s);return e.addTensorList(a),[a.idTensor]}case"TensorListConcat":case"TensorListConcatV2":{let o=C("tensorListId",r,t,e),n=e.getTensorList(o.id),s=C("dtype",r,t,e),a=C("elementShape",r,t,e);return[n.concat(s,a)]}case"TensorListPushBack":{let o=C("tensorListId",r,t,e),n=C("tensor",r,t,e),s=e.getTensorList(o.id);return s.pushBack(n),[s.idTensor]}case"TensorListPopBack":{let o=C("tensorListId",r,t,e),n=C("elementShape",r,t,e),s=C("elementDType",r,t,e);return[e.getTensorList(o.id).popBack(n,s)]}case"TensorListSplit":{let o=C("tensor",r,t,e),n=C("elementShape",r,t,e),s=C("lengths",r,t,e),a=kE(o,s,n);return e.addTensorList(a),[a.idTensor]}case"TensorListLength":{let o=C("tensorListId",r,t,e),n=e.getTensorList(o.id);return[at(n.size(),"int32")]}case"TensorListResize":{let o=C("tensorListId",r,t,e),n=C("size",r,t,e),a=e.getTensorList(o.id).resize(n);return e.addTensorList(a),[a.idTensor]}default:throw TypeError(`Node type ${r.op} is not implemented`)}};function $E(r,t,e){let[o,n]=C("fusedOps",r,t,e),s=o==="biasadd",a=!s,i=n==="prelu",c=o==="fusedbatchnorm",l=C("numArgs",r,t,e);if(s){if(i&&l!==2)throw new Error("FusedConv2d and DepthwiseConv2d with BiasAdd and Prelu must have two extra arguments: bias and alpha.");if(!i&&s&&l!==1)throw new Error("FusedConv2d and DepthwiseConv2d with BiasAdd must have one extra argument: bias.")}if(c)throw new Error("FusedConv2d and DepthwiseConv2d with FusedBatchNorm is not supported");let p=C("strides",r,t,e),u=Jl(r,t,e),m=C("dataFormat",r,t,e).toUpperCase(),f=C("dilations",r,t,e),[d,g]=C("args",r,t,e);a&&(g=d,d=void 0);let h=C("leakyreluAlpha",r,t,e);return{stride:p,pad:u,dataFormat:m,dilations:f,biasArg:d,preluArg:g,activationFunc:n,leakyreluAlpha:h}}var RE=(r,t,e,o=At)=>{switch(r.op){case"Conv1D":{let n=C("stride",r,t,e),s=C("pad",r,t,e),a=C("dataFormat",r,t,e).toUpperCase(),i=C("dilation",r,t,e);return[o.conv1d(C("x",r,t,e),C("filter",r,t,e),n,s,a,i)]}case"Conv2D":{let n=C("strides",r,t,e),s=Jl(r,t,e),a=C("dataFormat",r,t,e).toUpperCase(),i=C("dilations",r,t,e);return[o.conv2d(C("x",r,t,e),C("filter",r,t,e),[n[1],n[2]],s,a,[i[1],i[2]])]}case"_FusedConv2D":{let{stride:n,pad:s,dataFormat:a,dilations:i,biasArg:c,preluArg:l,activationFunc:p,leakyreluAlpha:u}=$E(r,t,e);return[o.fused.conv2d({x:C("x",r,t,e),filter:C("filter",r,t,e),strides:[n[1],n[2]],pad:s,dataFormat:a,dilations:[i[1],i[2]],bias:c,activation:p,preluActivationWeights:l,leakyreluAlpha:u})]}case"FusedDepthwiseConv2dNative":{let{stride:n,pad:s,dataFormat:a,dilations:i,biasArg:c,preluArg:l,activationFunc:p,leakyreluAlpha:u}=$E(r,t,e);return[o.fused.depthwiseConv2d({x:C("x",r,t,e),filter:C("filter",r,t,e),strides:[n[1],n[2]],pad:s,dataFormat:a,dilations:[i[1],i[2]],bias:c,activation:p,preluActivationWeights:l,leakyreluAlpha:u})]}case"Conv2DBackpropInput":case"Conv2dTranspose":{let n=C("outputShape",r,t,e),s=C("strides",r,t,e),a=Jl(r,t,e);return[o.conv2dTranspose(C("x",r,t,e),C("filter",r,t,e),n,[s[1],s[2]],a)]}case"DepthwiseConv2dNative":case"DepthwiseConv2d":{let n=C("strides",r,t,e),s=Jl(r,t,e),a=C("dilations",r,t,e),i=C("dataFormat",r,t,e).toUpperCase();return[o.depthwiseConv2d(C("input",r,t,e),C("filter",r,t,e),[n[1],n[2]],s,i,[a[1],a[2]])]}case"Conv3D":{let n=C("strides",r,t,e),s=C("pad",r,t,e),a=C("dataFormat",r,t,e).toUpperCase(),i=C("dilations",r,t,e);return[o.conv3d(C("x",r,t,e),C("filter",r,t,e),[n[1],n[2],n[3]],s,a,[i[1],i[2],i[3]])]}case"AvgPool":{let n=C("strides",r,t,e),s=C("pad",r,t,e),a=C("kernelSize",r,t,e);return[o.avgPool(C("x",r,t,e),[a[1],a[2]],[n[1],n[2]],s)]}case"MaxPool":{let n=C("strides",r,t,e),s=C("pad",r,t,e),a=C("kernelSize",r,t,e);return[o.maxPool(C("x",r,t,e),[a[1],a[2]],[n[1],n[2]],s)]}case"MaxPoolWithArgmax":{let n=C("strides",r,t,e),s=C("pad",r,t,e),a=C("kernelSize",r,t,e),i=C("includeBatchInIndex",r,t,e),{result:c,indexes:l}=o.maxPoolWithArgmax(C("x",r,t,e),[a[1],a[2]],[n[1],n[2]],s,i);return[c,l]}case"AvgPool3D":{let n=C("strides",r,t,e),s=C("pad",r,t,e),a=C("kernelSize",r,t,e);return[o.avgPool3d(C("x",r,t,e),[a[1],a[2],a[3]],[n[1],n[2],n[3]],s)]}case"MaxPool3D":{let n=C("strides",r,t,e),s=C("pad",r,t,e),a=C("kernelSize",r,t,e);return[o.maxPool3d(C("x",r,t,e),[a[1],a[2],a[3]],[n[1],n[2],n[3]],s)]}case"Dilation2D":{let n=C("strides",r,t,e),s=C("pad",r,t,e),a=C("dilations",r,t,e),i=n[1],c=n[2],l=a[1],p=a[2];return[o.dilation2d(C("x",r,t,e),C("filter",r,t,e),[i,c],s,[l,p],"NHWC")]}default:throw TypeError(`Node type ${r.op} is not implemented`)}};var AE=(r,t,e,o=At)=>{switch(r.op){case"Fill":{let n=C("shape",r,t,e),s=C("dtype",r,t,e),a=C("value",r,t,e);return[o.fill(n,a,s)]}case"LinSpace":{let n=C("start",r,t,e),s=C("stop",r,t,e),a=C("num",r,t,e);return[o.linspace(n,s,a)]}case"Multinomial":{let n=C("logits",r,t,e),s=C("numSamples",r,t,e),a=C("seed",r,t,e);return[o.multinomial(n,s,a)]}case"OneHot":{let n=C("indices",r,t,e),s=C("depth",r,t,e),a=C("onValue",r,t,e),i=C("offValue",r,t,e),c=C("dtype",r,t,e);return[o.oneHot(n,s,a,i,c)]}case"Ones":return[o.ones(C("shape",r,t,e),C("dtype",r,t,e))];case"OnesLike":return[o.onesLike(C("x",r,t,e))];case"RandomStandardNormal":return[o.randomStandardNormal(C("shape",r,t,e),C("dtype",r,t,e),C("seed",r,t,e))];case"RandomUniform":return[o.randomUniform(C("shape",r,t,e),C("minval",r,t,e),C("maxval",r,t,e),C("dtype",r,t,e))];case"Range":{let n=C("start",r,t,e),s=C("stop",r,t,e),a=C("step",r,t,e);return[o.range(n,s,a,C("dtype",r,t,e))]}case"TruncatedNormal":{let n=C("shape",r,t,e),s=C("mean",r,t,e),a=C("stdDev",r,t,e),i=C("seed",r,t,e);return[o.truncatedNormal(n,s,a,C("dtype",r,t,e),i)]}case"Zeros":return[o.zeros(C("shape",r,t,e),C("dtype",r,t,e))];case"ZerosLike":return[o.zerosLike(C("x",r,t,e))];default:throw TypeError(`Node type ${r.op} is not implemented`)}};function wy(r,t,e){let o=C("boxes",r,t,e),n=C("scores",r,t,e),s=C("maxOutputSize",r,t,e),a=C("iouThreshold",r,t,e),i=C("scoreThreshold",r,t,e),c=C("softNmsSigma",r,t,e);return{boxes:o,scores:n,maxOutputSize:s,iouThreshold:a,scoreThreshold:i,softNmsSigma:c}}var FE=async(r,t,e,o,n=At)=>{switch(r.op){case"NonMaxSuppressionV5":{let{boxes:s,scores:a,maxOutputSize:i,iouThreshold:c,scoreThreshold:l,softNmsSigma:p}=wy(r,t,e),u=await n.image.nonMaxSuppressionWithScoreAsync(s,a,i,c,l,p);return[u.selectedIndices,u.selectedScores]}case"NonMaxSuppressionV4":{let{boxes:s,scores:a,maxOutputSize:i,iouThreshold:c,scoreThreshold:l}=wy(r,t,e),p=C("padToMaxOutputSize",r,t,e),u=await n.image.nonMaxSuppressionPaddedAsync(s,a,i,c,l,p);return[u.selectedIndices,u.validOutputs]}case"NonMaxSuppressionV3":case"NonMaxSuppressionV2":{let{boxes:s,scores:a,maxOutputSize:i,iouThreshold:c,scoreThreshold:l}=wy(r,t,e);return[await n.image.nonMaxSuppressionAsync(s,a,i,c,l)]}case"Where":{let s=n.cast(C("condition",r,t,e),"bool"),a=[await n.whereAsync(s)];return s.dispose(),a}case"ListDiff":return n.setdiff1dAsync(C("x",r,t,e),C("y",r,t,e));default:throw TypeError(`Node type ${r.op} is not implemented`)}};var DE=(r,t,e,o=At)=>{switch(r.op){case"LowerBound":{let n=C("sortedSequence",r,t,e),s=C("values",r,t,e);return[o.lowerBound(n,s)]}case"TopKV2":{let n=C("x",r,t,e),s=C("k",r,t,e),a=C("sorted",r,t,e),i=o.topk(n,s,a);return[i.values,i.indices]}case"UpperBound":{let n=C("sortedSequence",r,t,e),s=C("values",r,t,e);return[o.upperBound(n,s)]}case"Unique":{let n=C("x",r,t,e),s=o.unique(n);return[s.values,s.indices]}case"UniqueV2":{let n=C("x",r,t,e),s=C("axis",r,t,e),a=o.unique(n,s);return[a.values,a.indices]}default:throw TypeError(`Node type ${r.op} is not implemented`)}};var _E=(r,t,e,o=At)=>{switch(r.op){case"Const":return t[r.name];case"PlaceholderWithDefault":let n=C("default",r,t,e);return[ae(r.name,t,e)||n];case"Placeholder":return[ae(r.name,t,e)];case"Identity":case"StopGradient":case"FakeQuantWithMinMaxVars":{let p=C("x",r,t,e);return[Rr(p)]}case"IdentityN":return C("x",r,t,e).map(p=>Rr(p));case"Snapshot":let s=C("x",r,t,e);return[Rr(s)];case"Shape":return[o.tensor1d(C("x",r,t,e).shape,"int32")];case"ShapeN":return C("x",r,t,e).map(p=>o.tensor1d(p.shape));case"Size":return[o.scalar(C("x",r,t,e).size,"int32")];case"Rank":return[o.scalar(C("x",r,t,e).rank,"int32")];case"NoOp":return[o.scalar(1)];case"Print":let a=C("x",r,t,e),i=C("data",r,t,e),c=C("message",r,t,e),l=C("summarize",r,t,e);console.warn("The graph has a tf.print() operation,usually used for debugging, which slows down performance."),console.log(c);for(let p=0;p<i.length;p++)console.log(Array.prototype.slice.call(i[p].dataSync()).slice(0,l));return[a];default:throw TypeError(`Node type ${r.op} is not implemented`)}};var Sf=class{constructor(t,e){this.keyDType=t,this.valueDType=e,this.handle=at(0),this.tensorMap=new Map,Be(this.handle)}get id(){return this.handle.id}clearAndClose(){this.tensorMap.forEach(t=>t.dispose()),this.tensorMap.clear(),this.handle.dispose()}size(){return this.tensorMap.size}tensorSize(){return at(this.size(),"int32")}async import(t,e){this.checkKeyAndValueTensor(t,e);let o=await t.data();return this.tensorMap.forEach(n=>n.dispose()),this.tensorMap.clear(),ft(()=>{let n=ze(e),s=o.length,a=n.length;y.assert(s===a,()=>`The number of elements doesn't match, keys has ${s} elements, the values has ${a} elements.`);for(let i=0;i<s;i++){let c=o[i],l=n[i];Be(l),this.tensorMap.set(c,l)}return this.handle})}async find(t,e){this.checkKeyAndValueTensor(t,e);let o=await t.data();return ft(()=>{let n=[];for(let s=0;s<o.length;s++){let a=o[s],i=this.findWithDefault(a,e);n.push(i)}return we(n)})}findWithDefault(t,e){let o=this.tensorMap.get(t);return o??e}checkKeyAndValueTensor(t,e){if(t.dtype!==this.keyDType)throw new Error(`Expect key dtype ${this.keyDType}, but got ${t.dtype}`);if(e.dtype!==this.valueDType)throw new Error(`Expect value dtype ${this.valueDType}, but got ${e.dtype}`)}};var OE=async(r,t,e,o)=>{switch(r.op){case"HashTable":case"HashTableV2":{let n=C("keyDType",r,t,e),s=C("valueDType",r,t,e),a=new Sf(n,s);return o.addHashTable(r.name,a),[a.handle]}case"LookupTableImport":case"LookupTableImportV2":{let n=C("tableHandle",r,t,e,o),s=C("keys",r,t,e),a=C("values",r,t,e);return[await o.getHashTableById(n.id).import(s,a)]}case"LookupTableFind":case"LookupTableFindV2":{let n=C("tableHandle",r,t,e,o),s=C("keys",r,t,e),a=C("defaultValue",r,t,e);return[await o.getHashTableById(n.id).find(s,a)]}case"LookupTableSize":case"LookupTableSizeV2":{let n=C("tableHandle",r,t,e,o);return[o.getHashTableById(n.id).tensorSize()]}default:throw TypeError(`Node type ${r.op} is not implemented`)}};var PE=(r,t,e,o=At)=>{switch(r.op){case"ResizeBilinear":{let n=C("images",r,t,e),s=C("size",r,t,e),a=C("alignCorners",r,t,e),i=C("halfPixelCenters",r,t,e);return[o.image.resizeBilinear(n,[s[0],s[1]],a,i)]}case"ResizeNearestNeighbor":{let n=C("images",r,t,e),s=C("size",r,t,e),a=C("alignCorners",r,t,e),i=C("halfPixelCenters",r,t,e);return[o.image.resizeNearestNeighbor(n,[s[0],s[1]],a,i)]}case"CropAndResize":{let n=C("image",r,t,e),s=C("boxes",r,t,e),a=C("boxInd",r,t,e),i=C("cropSize",r,t,e),c=C("method",r,t,e),l=C("extrapolationValue",r,t,e);return[o.image.cropAndResize(n,s,a,i,c,l)]}case"ImageProjectiveTransformV3":{let n=C("images",r,t,e),s=C("transforms",r,t,e),a=C("outputShape",r,t,e),i=C("fillValue",r,t,e),c=C("interpolation",r,t,e),l=C("fillMode",r,t,e);return[o.image.transform(n,s,c.toLowerCase(),l.toLowerCase(),i,a)]}default:throw TypeError(`Node type ${r.op} is not implemented`)}};var LE=(r,t,e,o=At)=>{switch(r.op){case"Equal":return[o.equal(C("a",r,t,e),C("b",r,t,e))];case"NotEqual":return[o.notEqual(C("a",r,t,e),C("b",r,t,e))];case"Greater":return[o.greater(C("a",r,t,e),C("b",r,t,e))];case"GreaterEqual":return[o.greaterEqual(C("a",r,t,e),C("b",r,t,e))];case"Less":return[o.less(C("a",r,t,e),C("b",r,t,e))];case"LessEqual":return[o.lessEqual(C("a",r,t,e),C("b",r,t,e))];case"LogicalAnd":return[o.logicalAnd(C("a",r,t,e),C("b",r,t,e))];case"LogicalNot":return[o.logicalNot(C("a",r,t,e))];case"LogicalOr":return[o.logicalOr(C("a",r,t,e),C("b",r,t,e))];case"Select":case"SelectV2":return[o.where(C("condition",r,t,e),C("a",r,t,e),C("b",r,t,e))];default:throw TypeError(`Node type ${r.op} is not implemented`)}};var ME=(r,t,e,o=At)=>{switch(r.op){case"BatchMatMul":case"BatchMatMulV2":case"MatMul":return[o.matMul(C("a",r,t,e),C("b",r,t,e),C("transposeA",r,t,e),C("transposeB",r,t,e))];case"Einsum":return[o.einsum(C("equation",r,t,e),...C("tensors",r,t,e))];case"Transpose":return[o.transpose(C("x",r,t,e),C("perm",r,t,e))];case"_FusedMatMul":let[n,s]=C("fusedOps",r,t,e),a=n==="biasadd",i=s==="prelu",c=C("numArgs",r,t,e),l=C("leakyreluAlpha",r,t,e);if(a){if(i&&c!==2)throw new Error("Fused MatMul with BiasAdd and Prelu must have two extra arguments: bias and alpha.");if(!i&&c!==1)throw new Error("Fused MatMul with BiasAdd must have one extra argument: bias.")}let[p,u]=C("args",r,t,e);return[o.fused.matMul({a:C("a",r,t,e),b:C("b",r,t,e),transposeA:C("transposeA",r,t,e),transposeB:C("transposeB",r,t,e),bias:p,activation:s,preluActivationWeights:u,leakyreluAlpha:l})];default:throw TypeError(`Node type ${r.op} is not implemented`)}};var BE=(r,t,e,o=At)=>{switch(r.op){case"EuclideanNorm":return[o.euclideanNorm(C("x",r,t,e),C("axis",r,t,e),C("keepDims",r,t,e))];case"FusedBatchNorm":case"FusedBatchNormV2":return[o.batchNorm(C("x",r,t,e),C("mean",r,t,e),C("variance",r,t,e),C("offset",r,t,e),C("scale",r,t,e),C("epsilon",r,t,e))];case"FusedBatchNormV3":return[o.batchNorm(C("x",r,t,e),C("mean",r,t,e),C("variance",r,t,e),C("offset",r,t,e),C("scale",r,t,e),C("epsilon",r,t,e))];case"LRN":return[o.localResponseNormalization(C("x",r,t,e),C("radius",r,t,e),C("bias",r,t,e),C("alpha",r,t,e),C("beta",r,t,e))];case"Softmax":return[o.softmax(C("x",r,t,e))];case"LogSoftmax":return[o.logSoftmax(C("x",r,t,e))];case"SparseToDense":return[o.sparseToDense(C("sparseIndices",r,t,e),C("outputShape",r,t,e),C("sparseValues",r,t,e),C("defaultValue",r,t,e))];default:throw TypeError(`Node type ${r.op} is not implemented`)}};var VE=(r,t,e,o=At)=>{switch(r.op){case"Max":{let i=C("axis",r,t,e),c=C("keepDims",r,t,e);return[o.max(C("x",r,t,e),i,c)]}case"Mean":{let i=C("axis",r,t,e),c=C("keepDims",r,t,e);return[o.mean(C("x",r,t,e),i,c)]}case"Min":{let i=C("axis",r,t,e),c=C("keepDims",r,t,e);return[o.min(C("x",r,t,e),i,c)]}case"Sum":{let i=C("axis",r,t,e),c=C("keepDims",r,t,e);return[o.sum(C("x",r,t,e),i,c)]}case"All":{let i=C("axis",r,t,e),c=C("keepDims",r,t,e);return[o.all(C("x",r,t,e),i,c)]}case"Any":{let i=C("axis",r,t,e),c=C("keepDims",r,t,e);return[o.any(C("x",r,t,e),i,c)]}case"ArgMax":{let i=C("axis",r,t,e);return[o.argMax(C("x",r,t,e),i)]}case"ArgMin":{let i=C("axis",r,t,e);return[o.argMin(C("x",r,t,e),i)]}case"Prod":{let i=C("axis",r,t,e),c=C("keepDims",r,t,e);return[o.prod(C("x",r,t,e),i,c)]}case"Cumprod":{let i=C("axis",r,t,e),c=C("exclusive",r,t,e),l=C("reverse",r,t,e);return[o.cumprod(C("x",r,t,e),i,c,l)]}case"Cumsum":{let i=C("axis",r,t,e),c=C("exclusive",r,t,e),l=C("reverse",r,t,e);return[o.cumsum(C("x",r,t,e),i,c,l)]}case"Bincount":let n=C("x",r,t,e),s=C("weights",r,t,e),a=C("size",r,t,e);return[o.bincount(n,s,a)];case"DenseBincount":{let i=C("x",r,t,e),c=C("weights",r,t,e),l=C("size",r,t,e),p=C("binaryOutput",r,t,e);return[o.denseBincount(i,c,l,p)]}default:throw TypeError(`Node type ${r.op} is not implemented`)}};var zE=(r,t,e,o=At)=>{switch(r.op){case"ConcatV2":case"Concat":{let n=C("n",r,t,e),s=C("axis",r,t,e),a=C("tensors",r,t,e);return a=a.slice(0,n),[o.concat(a,s)]}case"Gather":{let n=C("x",r,t,e),s=C("indices",r,t,e);return[o.gather(n,o.cast(s,"int32"),0)]}case"GatherV2":{let n=C("axis",r,t,e),s=C("batchDims",r,t,e),a=C("x",r,t,e),i=C("indices",r,t,e);return[o.gather(a,o.cast(i,"int32"),n,s)]}case"Reverse":{let n=C("dims",r,t,e),s=[];for(let i=0;i<n.length;i++)n[i]&&s.push(i);let a=C("x",r,t,e);return[o.reverse(a,s)]}case"ReverseV2":{let n=C("axis",r,t,e),s=C("x",r,t,e);return[o.reverse(s,n)]}case"Slice":{let n=C("begin",r,t,e),s=C("size",r,t,e);return[o.slice(C("x",r,t,e),n,s)]}case"StridedSlice":{let n=C("begin",r,t,e),s=C("end",r,t,e),a=C("strides",r,t,e),i=C("beginMask",r,t,e),c=C("endMask",r,t,e),l=C("ellipsisMask",r,t,e),p=C("newAxisMask",r,t,e),u=C("shrinkAxisMask",r,t,e),m=C("x",r,t,e);return[o.stridedSlice(m,n,s,a,i,c,l,p,u)]}case"Pack":return ft(()=>{let n=C("axis",r,t,e),s=C("tensors",r,t,e),a=s[0].shape,i=o.squeeze(s[0]).shape,c=s.map(l=>{let p=y.arraysEqual(l.shape,a);if(!p&&!y.arraysEqual(o.squeeze(l).shape,i))throw new Error("the input tensors shape does not match");return p?l:o.reshape(l,a)});return[o.stack(c,n)]});case"Unpack":{let n=C("axis",r,t,e),s=C("tensor",r,t,e);return o.unstack(s,n)}case"Tile":{let n=C("reps",r,t,e);return[o.tile(C("x",r,t,e),n)]}case"Split":case"SplitV":{let n=C("axis",r,t,e),s=C("numOrSizeSplits",r,t,e),a=C("x",r,t,e);return o.split(a,s,n)}case"ScatterNd":{let n=C("indices",r,t,e),s=C("values",r,t,e),a=C("shape",r,t,e);return[o.scatterND(n,s,a)]}case"GatherNd":{let n=C("x",r,t,e),s=C("indices",r,t,e);return[o.gatherND(n,s)]}case"SparseToDense":{let n=C("sparseIndices",r,t,e),s=C("outputShape",r,t,e),a=C("sparseValues",r,t,e),i=C("defaultValue",r,t,e);return[o.sparseToDense(n,a,s,a.dtype===i.dtype?i:o.cast(i,a.dtype))]}default:throw TypeError(`Node type ${r.op} is not implemented`)}};var WE=(r,t,e,o=At)=>{switch(r.op){case"SparseFillEmptyRows":{let{outputIndices:n,outputValues:s,emptyRowIndicator:a,reverseIndexMap:i}=o.sparse.sparseFillEmptyRows(C("indices",r,t,e),C("values",r,t,e),C("denseShape",r,t,e),C("defaultValue",r,t,e));return[n,s,a,i]}case"SparseReshape":{let{outputIndices:n,outputShape:s}=o.sparse.sparseReshape(C("inputIndices",r,t,e),C("inputShape",r,t,e),C("newShape",r,t,e));return[n,s]}case"SparseSegmentMean":return[o.sparse.sparseSegmentMean(C("data",r,t,e),C("indices",r,t,e),C("segmentIds",r,t,e))];case"SparseSegmentSum":return[o.sparse.sparseSegmentSum(C("data",r,t,e),C("indices",r,t,e),C("segmentIds",r,t,e))];default:throw TypeError(`Node type ${r.op} is not implemented`)}};var GE=(r,t,e,o=At)=>{switch(r.op){case"FFT":return[o.fft(C("x",r,t,e))];case"IFFT":return[o.ifft(C("x",r,t,e))];case"RFFT":return[o.rfft(C("x",r,t,e))];case"IRFFT":return[o.irfft(C("x",r,t,e))];default:throw TypeError(`Node type ${r.op} is not implemented`)}};var UE=(r,t,e,o=At)=>{switch(r.op){case"StringNGrams":{let{nGrams:n,nGramsSplits:s}=o.string.stringNGrams(C("data",r,t,e),C("dataSplits",r,t,e),C("separator",r,t,e),C("nGramWidths",r,t,e),C("leftPad",r,t,e),C("rightPad",r,t,e),C("padWidth",r,t,e),C("preserveShortSequences",r,t,e));return[n,s]}case"StringSplit":{let{indices:n,values:s,shape:a}=o.string.stringSplit(C("input",r,t,e),C("delimiter",r,t,e),C("skipEmpty",r,t,e));return[n,s,a]}case"StringToHashBucketFast":return[o.string.stringToHashBucketFast(C("input",r,t,e),C("numBuckets",r,t,e))];default:throw TypeError(`Node type ${r.op} is not implemented`)}};var HE=(r,t,e,o=At)=>{switch(r.op){case"Cast":return[o.cast(C("x",r,t,e),C("dtype",r,t,e))];case"ExpandDims":{let n=C("axis",r,t,e);return[o.expandDims(C("x",r,t,e),n)]}case"Squeeze":{let n=C("axis",r,t,e);return[o.squeeze(C("x",r,t,e),n)]}case"Reshape":return[o.reshape(C("x",r,t,e),C("shape",r,t,e))];case"MirrorPad":return[o.mirrorPad(C("x",r,t,e),C("padding",r,t,e),C("mode",r,t,e))];case"PadV2":case"Pad":return[o.pad(C("x",r,t,e),C("padding",r,t,e),C("constantValue",r,t,e))];case"SpaceToBatchND":{let n=C("blockShape",r,t,e),s=C("paddings",r,t,e);return[o.spaceToBatchND(C("x",r,t,e),n,s)]}case"BatchToSpaceND":{let n=C("blockShape",r,t,e),s=C("crops",r,t,e);return[o.batchToSpaceND(C("x",r,t,e),n,s)]}case"DepthToSpace":{let n=C("blockSize",r,t,e),s=C("dataFormat",r,t,e).toUpperCase();return[o.depthToSpace(C("x",r,t,e),n,s)]}case"BroadcastTo":return[o.broadcastTo(C("x",r,t,e),C("shape",r,t,e))];case"BroadcastArgs":return[o.broadcastArgs(C("s0",r,t,e),C("s1",r,t,e))];default:throw TypeError(`Node type ${r.op} is not implemented`)}};function Ny(r,t,e,o,n=ft){let s=((a,i,c)=>{switch(a.category){case"arithmetic":return n(()=>TE(a,i,c));case"basic_math":return n(()=>SE(a,i,c));case"control":return EE(a,i,c);case"convolution":return n(()=>RE(a,i,c));case"creation":return n(()=>AE(a,i,c));case"dynamic":return FE(a,i,c);case"evaluation":return n(()=>DE(a,i,c));case"image":return n(()=>PE(a,i,c));case"graph":return n(()=>_E(a,i,c));case"logical":return n(()=>LE(a,i,c));case"matrices":return n(()=>ME(a,i,c));case"normalization":return n(()=>BE(a,i,c));case"reduction":return n(()=>VE(a,i,c));case"slice_join":return n(()=>zE(a,i,c));case"sparse":return n(()=>WE(a,i,c));case"spectral":return n(()=>GE(a,i,c));case"string":return n(()=>UE(a,i,c));case"transformation":return n(()=>HE(a,i,c));case"hash_table":return OE(a,i,c,o);case"custom":let l=af(a.op);if(l&&l.customExecutor)return l.customExecutor(new bf(a,i,c));throw TypeError(`Custom op ${a.op} is not registered.`);default:throw TypeError(`Unknown op '${a.op}'. File an issue at https://github.com/tensorflow/tfjs/issues so we can add it, or register a custom execution with tf.registerOp()`)}})(r,t,e);return y.isPromise(s)?s.then(a=>[].concat(a)):[].concat(s)}var ep=class{constructor(t={},e={},o={},n={}){this.weightMap=t,this.tensorArrayMap=e,this.tensorListMap=o,this.functionMap=n,this.rootContext={id:0,frameName:"",iterationId:0},this.contexts=[this.rootContext],this.lastId=0,this.generateCurrentContextIds()}newFrame(t,e){return{id:t,frameName:e,iterationId:0}}set currentContext(t){this.contexts!==t&&(this.contexts=t,this.generateCurrentContextIds())}get currentContext(){return this.contexts}get currentContextId(){return this._currentContextIds[0]}get currentContextIds(){return this._currentContextIds}generateCurrentContextIds(){let t=[];for(let e=0;e<this.contexts.length-1;e++){let o=this.contexts.slice(0,this.contexts.length-e);t.push(this.contextIdforContexts(o))}t.push(""),this._currentContextIds=t}contextIdforContexts(t){return t?t.map(e=>e.id===0&&e.iterationId===0?"":`${e.frameName}-${e.iterationId}`).join("/"):""}enterFrame(t){this.contexts&&(this.lastId++,this.contexts=this.contexts.slice(),this.contexts.push(this.newFrame(this.lastId,t)),this._currentContextIds.unshift(this.contextIdforContexts(this.contexts)))}exitFrame(){if(this.contexts&&this.contexts.length>1)this.contexts=this.contexts.slice(),this.contexts.splice(-1),this.currentContextIds.shift();else throw new Error("Cannot exit frame, the context is empty")}nextIteration(){if(this.contexts&&this.contexts.length>0){this.contexts=this.contexts.slice(),this.lastId++;let t=Object.assign({},this.contexts[this.contexts.length-1]);t.iterationId+=1,t.id=this.lastId,this.contexts.splice(-1,1,t),this._currentContextIds.splice(0,1,this.contextIdforContexts(this.contexts))}else throw new Error("Cannot increase frame iteration, the context is empty")}getWeight(t){return this.weightMap[t]}addTensorArray(t){this.tensorArrayMap[t.id]=t}getTensorArray(t){return this.tensorArrayMap[t]}addTensorList(t){this.tensorListMap[t.id]=t}getTensorList(t){return this.tensorListMap[t]}dispose(t){for(let e in this.tensorArrayMap)this.tensorArrayMap[e].clearAndClose(t);for(let e in this.tensorListMap)this.tensorListMap[e].clearAndClose(t)}};function Iy(r,t,e,o){let n=new Set,s=[],a=null,i=null,c=new Set,l=Object.keys(r).map(m=>Ae(m)[0]),p=[];o!=null&&(p=o.map(m=>Ae(m.name)[0]));let u=[...t];for(;u.length>0;){let m=u.pop();if((vy(m)||x4(m)||y4(m))&&a==null&&(a=m,i=a.children.map(f=>f.name).filter(f=>n.has(f))),n.add(m.name),e[m.name]==null&&l.indexOf(m.name)===-1&&p.indexOf(m.name)===-1){if(m.inputs.length===0){s.push(m.name);continue}m.inputs.forEach(f=>{c.has(f.name)||(c.add(f.name),u.push(f))})}}return{inputs:r,outputs:t,usedNodes:n,missingInputs:s,dynamicNode:a,syncInputs:i}}function KE(r,t,e){let{usedNodes:o,inputs:n}=e,s=[],a=Object.keys(n).map(p=>Ae(p)[0]).map(p=>r.nodes[p]),i=r.initNodes;a.forEach(p=>{o.has(p.name)&&s.push(p)}),r.weights.forEach(p=>{o.has(p.name)&&s.push(p)}),i?.forEach(p=>{o.has(p.name)&&s.push(p)});let c=new Set,l=[];for(;s.length>0;){let p=s.pop();c.add(p.name),t[p.name]||l.push(p),p.children.forEach(u=>{!c.has(u.name)&&o.has(u.name)&&u.inputs.every(m=>c.has(m.name))&&s.push(u)})}return l}var d4=["Switch","Merge","Enter","Exit","NextIteration","StatelessIf","StatelessWhile","if","While"],h4=["NonMaxSuppressionV2","NonMaxSuppressionV3","NonMaxSuppressionV5","Where"],g4=["HashTable","HashTableV2","LookupTableImport","LookupTableImportV2","LookupTableFind","LookupTableFindV2","LookupTableSize","LookupTableSizeV2"];function vy(r){return d4.indexOf(r.op)>=0}function x4(r){return h4.indexOf(r.op)>=0}function y4(r){return g4.indexOf(r.op)>=0}var rp=class r{constructor(t,e){this.graph=t,this.parent=e,this.compiledMap=new Map,this._weightMap={},this.SEPERATOR=",",this._functions={},this._functionExecutorMap={},this.intermediateTensors={},this.keepTensorForDebug=!1,this._outputs=t.outputs,this._inputs=t.inputs,this._initNodes=t.initNodes,this._signature=t.signature,this._functions=t.functions,t.functions!=null&&Object.keys(t.functions).forEach(o=>{this._functionExecutorMap[o]=new r(t.functions[o],this)})}get weightIds(){return this.parent?this.parent.weightIds:this._weightIds}get functionExecutorMap(){return this.parent?this.parent.functionExecutorMap:this._functionExecutorMap}get weightMap(){return this.parent?this.parent.weightMap:this._weightMap}set weightMap(t){let e=Object.keys(t).map(o=>t[o].map(n=>n.id));this._weightIds=[].concat(...e),this._weightMap=t}set resourceManager(t){this._resourceManager=t}get inputs(){return this._inputs.map(t=>({name:t.name,shape:t.attrParams.shape?t.attrParams.shape.value:void 0,dtype:t.attrParams.dtype?t.attrParams.dtype.value:void 0}))}get outputs(){return this._outputs.map(t=>({name:t.name,shape:t.attrParams.shape?t.attrParams.shape.value:void 0,dtype:t.attrParams.dtype?t.attrParams.dtype.value:void 0}))}get inputNodes(){return this._inputs.map(t=>t.signatureKey||t.name)}get outputNodes(){return this._outputs.map(t=>{let e=t.signatureKey||t.name;return t.defaultOutput?`${e}:${t.defaultOutput}`:e})}get functions(){return Object.keys(this._functions).reduce((t,e)=>(t[e]=this._functions[e].signature,t),{})}getCompilationKey(t,e){let o=t.map(s=>s.name).sort(),n=e.map(s=>s.name).sort();return o.join(this.SEPERATOR)+"--"+n.join(this.SEPERATOR)}compile(t,e){let o=Iy(t,e,this.weightMap,this._initNodes),{missingInputs:n,dynamicNode:s,syncInputs:a}=o;if(s!=null)throw new Error(`This execution contains the node '${s.name}', which has the dynamic op '${s.op}'. Please use model.executeAsync() instead. Alternatively, to avoid the dynamic ops, specify the inputs [${a}]`);if(n.length>0){let i=e.map(l=>l.name),c=Object.keys(t);throw new Error(`Cannot compute the outputs [${i}] from the provided inputs [${c}]. Missing the following inputs: [${n}]`)}return KE(this.graph,this.weightMap,o)}execute(t,e){t=this.mapInputs(t);let o=Object.keys(t).sort();this.checkInputs(t),this.checkInputShapeAndType(t),e=this.mapOutputs(e),this.checkOutputs(e);let n=o.map(u=>this.graph.nodes[Ae(u)[0]]),s=e.map(u=>Ae(u)[0]),a=s.map(u=>this.graph.nodes[u]);this.resetIntermediateTensors(),a.length===0&&(a=this._outputs);let i=this.getCompilationKey(n,a),c=this.compiledMap.get(i);c==null&&(c=this.compile(t,a),this.compiledMap.set(i,c));let l={},p={};return ft(()=>{let u=new ep(this.weightMap,l,p,this.functionExecutorMap),m=Object.assign({},this.weightMap);Object.keys(t).forEach(g=>{let[h,x]=Ae(g),b=[];b[x]=t[g],m[h]=b});let f=this.getFrozenTensorIds(m),d={};for(let g=0;g<c.length;g++){let h=c[g];if(!m[h.name]){let x=Ny(h,m,u,this._resourceManager);if(y.isPromise(x))throw new Error(`The execution of the op '${h.op}' returned a promise. Please use model.executeAsync() instead.`);m[h.name]=x,this.checkTensorForDisposal(h.name,h,m,u,f,s,d)}}return this.parent==null&&u.dispose(f),e.map(g=>ae(g,m,u))})}getFrozenTensorIds(t){let e=[].concat.apply([],Object.keys(t).map(o=>t[o]).map(o=>o.map(n=>n.id)));return new Set(e)}checkTensorForDisposal(t,e,o,n,s,a,i){e.category==="control"||a.indexOf(t)!==-1||(o[t].forEach(c=>{c!=null&&(i[c.id]=(i[c.id]||0)+e.children.length)}),e.inputs.forEach(c=>{if(c.category!=="control"){let l=xE(c.name,o,n);l?.forEach(p=>{if(p&&!p.kept&&!s.has(p.id)){let u=i[p.id];if(u===1){if(!this.keepTensorForDebug)p.dispose();else{let[m,f]=fr(e.name,n);this.intermediateTensors[m]?this.intermediateTensors[m][f]=p:(this.intermediateTensors[m]=[],this.intermediateTensors[m][f]=p)}delete i[p.id]}else u!=null&&i[p.id]--}})}}))}async executeAsync(t,e){return this._executeAsync(t,e)}disposeIntermediateTensors(){this.intermediateTensors&&(Object.keys(this.intermediateTensors).forEach(t=>this.intermediateTensors[t].forEach(e=>e.dispose())),this.disposeTensorsMap())}disposeTensorsMap(){this.tensorsMap&&Object.keys(this.tensorsMap).forEach(t=>{this.tensorsMap[t].forEach(o=>{o&&!o.kept&&!o.isDisposed&&!this.keepIds.has(o.id)&&o.dispose()})})}getIntermediateTensors(){return this.tensorsMap}resetIntermediateTensors(){for(let t in this.intermediateTensors)this.intermediateTensors[t].forEach(e=>e.dispose()),delete this.intermediateTensors[t]}async _executeAsync(t,e,o=!1,n={},s={}){o||(t=this.mapInputs(t),this.checkInputs(t),this.checkInputShapeAndType(t),e=this.mapOutputs(e),this.checkOutputs(e));try{this.keepTensorForDebug=F().getBool("KEEP_INTERMEDIATE_TENSORS")}catch(p){console.warn(p.message)}this.resetIntermediateTensors();let a=new ep(this.weightMap,n,s,this.functionExecutorMap);this.tensorsMap=await this.executeWithControlFlow(t,a,e,o);let i=e.map(p=>ae(p,this.tensorsMap,a)),c=i.map(p=>p.id),l=Object.keys(t).map(p=>t[p].id);return this.keepIds=new Set([...c,...l,...this.weightIds]),this.keepTensorForDebug||this.disposeTensorsMap(),this.parent==null&&a.dispose(this.keepIds),i}async executeFunctionAsync(t,e,o){let n=t.reduce((s,a,i)=>(s[this.inputs[i].name]=a,s),{});return this._executeAsync(n,this.outputNodes,!0,e,o)}async executeWithControlFlow(t,e,o,n){let s=Object.keys(t),a=s.map(S=>this.graph.nodes[Ae(S)[0]]),i=o.map(S=>Ae(S)[0]),c=i.map(S=>this.graph.nodes[S]);c.length===0&&(c=this._outputs);let{usedNodes:l,missingInputs:p,dynamicNode:u,syncInputs:m}=Iy(t,c,this.weightMap,this._initNodes),f=[...a,...this.graph.weights,...this._initNodes||[]].map(S=>({node:S,contexts:e.currentContext})),d=Object.assign({},this.weightMap);Object.keys(t).forEach(S=>{let[w,k]=Ae(S),$=[];$[k]=t[S],d[w]=$});let g={},h=this.getFrozenTensorIds(d),x={};for(;f.length>0;){let S=this.processStack(a,f,e,d,x,h,i,g,l);await Promise.all(S)}u==null&&!n&&console.warn("This model execution did not contain any nodes with control flow or dynamic output shapes. You can use model.execute() instead.");let b=c.filter(S=>!vy(S)&&!ae(S.name,d,e)).map(S=>S.name);if(b.length>0){let S="";throw u!=null&&(S=`Alternatively, to avoid the dynamic ops, use model.execute() and specify the inputs [${m}]`),new Error(`Cannot compute the outputs [${b}] from the provided inputs [${s}]. Consider providing the following inputs: [${p}]. ${S}`)}return d}processStack(t,e,o,n,s,a,i,c,l){let p=[];for(;e.length>0;){let u=e.pop();o.currentContext=u.contexts;let m="";if(u.node.op==="Enter"&&C("isConstant",u.node,n,o)&&([m]=fr(u.node.name,o)),n[u.node.name]==null){let f=Ny(u.node,n,o,this._resourceManager);m||([m]=fr(u.node.name,o));let d=o.currentContext;y.isPromise(f)?p.push(f.then(g=>(n[m]=g,o.currentContext=d,this.checkTensorForDisposal(m,u.node,n,o,a,i,c),this.processChildNodes(u.node,e,o,n,s,l),g))):(n[m]=f,this.checkTensorForDisposal(m,u.node,n,o,a,i,c),this.processChildNodes(u.node,e,o,n,s,l))}else this.processChildNodes(u.node,e,o,n,s,l)}return p}processChildNodes(t,e,o,n,s,a){t.children.forEach(i=>{let[c]=fr(i.name,o);s[c]||!a.has(i.name)||(i.op==="Merge"?i.inputNames.some(l=>!!ae(l,n,o))&&(s[c]=!0,e.push({contexts:o.currentContext,node:i})):i.inputNames.every(l=>!!ae(l,n,o))&&(s[c]=!0,e.push({contexts:o.currentContext,node:i})))})}dispose(){Object.keys(this.weightMap).forEach(t=>this.weightMap[t].forEach(e=>e.dispose()))}checkInputShapeAndType(t){Object.keys(t).forEach(e=>{let o=t[e],[n]=Ae(e),s=this.graph.nodes[n];if(s.attrParams.shape&&s.attrParams.shape.value){let a=s.attrParams.shape.value,i=a.length===o.shape.length&&o.shape.every((c,l)=>a[l]===-1||a[l]===c);y.assert(i,()=>`The shape of dict['${s.name}'] provided in model.execute(dict) must be [${a}], but was [${o.shape}]`)}s.attrParams.dtype&&s.attrParams.dtype.value&&y.assert(o.dtype===s.attrParams.dtype.value,()=>`The dtype of dict['${s.name}'] provided in model.execute(dict) must be ${s.attrParams.dtype.value}, but was ${o.dtype}`)})}mapInputs(t){let e={};for(let o in t)if(this._signature!=null&&this._signature.inputs!=null&&this._signature.inputs[o]!=null){let n=this._signature.inputs[o];e[n.name]=t[o]}else e[o]=t[o];return e}checkInputs(t){let e=Object.keys(t).filter(o=>{let[n]=Ae(o);return this.graph.nodes[n]==null});if(e.length>0)throw new Error(`The dict provided in model.execute(dict) has keys: [${e}] that are not part of graph`)}mapOutputs(t){return t.map(e=>this._signature!=null&&this._signature.outputs!=null&&this._signature.outputs[e]!=null?this._signature.outputs[e].name:e,{})}checkOutputs(t){t.forEach(e=>{let[o]=Ae(e);if(!this.graph.nodes[o])throw new Error(`The output '${e}' is not found in the graph`)})}};var wf=class{constructor(t={},e={}){this.hashTableNameToHandle=t,this.hashTableMap=e}addHashTable(t,e){this.hashTableNameToHandle[t]=e.handle,this.hashTableMap[e.id]=e}getHashTableHandleByName(t){return this.hashTableNameToHandle[t]}getHashTableById(t){return this.hashTableMap[t]}dispose(){for(let t in this.hashTableMap)this.hashTableMap[t].clearAndClose(),delete this.hashTableMap[t];for(let t in this.hashTableNameToHandle)this.hashTableNameToHandle[t].dispose(),delete this.hashTableNameToHandle[t]}};var b4="?tfjs-format=file",C4="model.json",Nf=class{constructor(t,e={},o=Ki){this.modelUrl=t,this.loadOptions=e,this.version="n/a",this.io=o,e==null&&(this.loadOptions={}),this.resourceManager=new wf}get modelVersion(){return this.version}get inputNodes(){return this.executor.inputNodes}get outputNodes(){return this.executor.outputNodes}get inputs(){return this.executor.inputs}get outputs(){return this.executor.outputs}get weights(){return this.executor.weightMap}get metadata(){return this.artifacts.userDefinedMetadata}get modelSignature(){return this.signature}get modelStructuredOutputKeys(){return this.structuredOutputKeys}findIOHandler(){let t=this.modelUrl;if(t.load!=null)this.handler=t;else if(this.loadOptions.requestInit!=null)this.handler=this.io.browserHTTPRequest(t,this.loadOptions);else{let e=this.io.getLoadHandlers(t,this.loadOptions);if(e.length===0)e.push(this.io.browserHTTPRequest(t,this.loadOptions));else if(e.length>1)throw new Error(`Found more than one (${e.length}) load handlers for URL '${[t]}'`);this.handler=e[0]}}load(){if(this.findIOHandler(),this.handler.load==null)throw new Error("Cannot proceed with model loading because the IOHandler provided does not have the `load` method implemented.");let t=this.handler.load();return y.isPromise(t)?t.then(e=>this.loadSync(e)):this.loadSync(t)}loadSync(t){this.artifacts=t;let e=this.artifacts.modelTopology,o=this.artifacts.signature;if(this.artifacts.userDefinedMetadata!=null){let s=this.artifacts.userDefinedMetadata;s.signature!=null&&(o=s.signature),s.structuredOutputKeys!=null&&(this.structuredOutputKeys=s.structuredOutputKeys)}this.signature=o,this.version=`${e.versions.producer}.${e.versions.minConsumer}`;let n=this.io.decodeWeights(this.artifacts.weightData,this.artifacts.weightSpecs);if(this.executor=new rp(tp.Instance.transformGraph(e,this.signature)),this.executor.weightMap=this.convertTensorMapToTensorsMap(n),this.executor.resourceManager=this.resourceManager,t.modelInitializer!=null&&t.modelInitializer.node!=null){let s=tp.Instance.transformGraph(t.modelInitializer);this.initializer=new rp(s),this.initializer.weightMap=this.executor.weightMap,this.initializer.resourceManager=this.resourceManager,this.initializer.executeAsync({},[])}return!0}async save(t,e){if(typeof t=="string"){let o=this.io.getSaveHandlers(t);if(o.length===0)throw new Error(`Cannot find any save handlers for URL '${t}'`);if(o.length>1)throw new Error(`Found more than one (${o.length}) save handlers for URL '${t}'`);t=o[0]}if(t.save==null)throw new Error("GraphModel.save() cannot proceed because the IOHandler provided does not have the `save` attribute defined.");return t.save(this.artifacts)}predict(t,e){let o=this.execute(t,this.outputNodes);if(this.structuredOutputKeys){let n=o instanceof Ft?[o]:o,s={};return n.forEach((a,i)=>s[this.structuredOutputKeys[i]]=a),s}return o}normalizeInputs(t){if(!(t instanceof Ft)&&!Array.isArray(t))return t;if(t=Array.isArray(t)?t:[t],t.length!==this.inputNodes.length)throw new Error(`Input tensor count mismatch,the graph model has ${this.inputNodes.length} placeholders, while there are ${t.length} input tensors.`);return this.inputNodes.reduce((e,o,n)=>(e[o]=t[n],e),{})}normalizeOutputs(t){return t=t||this.outputNodes,Array.isArray(t)?t:[t]}execute(t,e){t=this.normalizeInputs(t),e=this.normalizeOutputs(e);let o=this.executor.execute(t,e);return o.length>1?o:o[0]}async executeAsync(t,e){t=this.normalizeInputs(t),e=this.normalizeOutputs(e);let o=await this.executor.executeAsync(t,e);return o.length>1?o:o[0]}getIntermediateTensors(){return this.executor.getIntermediateTensors()}disposeIntermediateTensors(){this.executor.disposeIntermediateTensors()}convertTensorMapToTensorsMap(t){return Object.keys(t).reduce((e,o)=>(e[o]=[t[o]],e),{})}dispose(){this.executor.dispose(),this.initializer&&this.initializer.dispose(),this.resourceManager.dispose()}};async function qE(r,t={},e=Ki){if(r==null)throw new Error("modelUrl in loadGraphModel() cannot be null. Please provide a url or an IOHandler that loads the model");t==null&&(t={}),t.fromTFHub&&typeof r=="string"&&(r=T4(r));let o=new Nf(r,t,e);return await o.load(),o}function T4(r){return r.endsWith("/")||(r=r+"/"),`${r}${C4}${b4}`}var If=21,vf=22050,jE=2,op=256,S4=Math.floor(vf/op),YE=S4*jE,w4=vf*jE-op,N4=op/vf*(YE-w4/op)+.0018,ky=87,I4=3;var v4=88,PZt=v4*I4,XE=r=>12*(Math.log2(r)-Math.log2(440))+69;var Ey=r=>r*op/vf-N4*Math.floor(r/YE);function k4(r){return r.length===0?null:r.reduce((t,e,o)=>r[t]>e?t:o,-1)}function E4(r,t){let e=[],o=[];for(let n=0;n<r.length;n++)for(let s=0;s<r[n].length;s++)r[n][s]>t&&(e.push(n),o.push(s));return[e,o]}function $4(r){let[t,e,o]=r.reduce((a,i)=>{let[c,l,p]=i.reduce((u,m)=>[u[0]+m,u[1]+m*m,u[2]+1],[0,0,0]);return[a[0]+c,a[1]+l,a[2]+p]},[0,0,0]),n=t/o,s=Math.sqrt(1/(o-1)*(e-t*t/o));return[n,s]}function $y(r){return r.reduce((t,e)=>Math.max(t,...e),0)}function R4(r){let t=r[0].map(e=>e.slice());for(let e=1;e<r.length;++e)for(let o=0;o<r[0].length;++o)for(let n=0;n<r[0][0].length;++n)t[o][n]=Math.min(t[o][n],r[e][o][n]);return t}function A4(r,t=1){let e=[];for(let o=0;o<r[0].length;++o)for(let n=0;n<r.length;++n){let s=!0;for(let a=Math.max(0,n-t);s&&a<=Math.min(r.length-1,n+t);++a)a!==n&&(s=s&&r[n][o]>r[a][o]);s&&e.push([n,o])}return e}function F4(r){let t=r[0].map(e=>e.slice());for(let e=1;e<r.length;++e)for(let o=0;o<r[0].length;++o)for(let n=0;n<r[0][0].length;++n)t[o][n]=Math.max(t[o][n],r[e][o][n]);return t}function D4(r){return r!==null}function _4(r,t,e,o){if(e){let n=XE(e)-If;for(let s=0;s<r.length;s++)r[s].fill(0,n);for(let s=0;s<t.length;s++)t[s].fill(0,n)}if(o){let n=XE(o)-If;for(let s=0;s<r.length;s++)r[s].fill(0,0,n);for(let s=0;s<t.length;s++)t[s].fill(0,0,n)}}function O4(r,t,e=2){let o=Array.from(Array(e).keys()).map(i=>i+1).map(i=>{let c=Array(i).fill(Array(t[0].length).fill(0)).concat(t),l=c.slice(i),p=c.slice(0,-i);if(l.length!==p.length)throw new Error(`nPlus length !== minusN length: ${l.length} !== ${p.length}`);return l.map((u,m)=>u.map((f,d)=>f-p[m][d]))}),n=R4(o);n=n.map(i=>i.map(c=>Math.max(c,0))),n=n.map((i,c)=>c<e?i.fill(0):i);let s=$y(r),a=$y(n);return n=n.map(i=>i.map(c=>s*c/a)),F4([r,n])}function P4(r,t,e=.5,o=.3,n=5,s=!0,a=null,i=null,c=!0,l=11){let p=o;if(p===null){let[b,S]=$4(r);p=b+S}let u=r.length;_4(t,r,a,i);let m=t;s&&(m=O4(t,r));let f=m.map(b=>b.map(()=>0));A4(m).forEach(([b,S])=>{f[b][S]=m[b][S]});let[d,g]=E4(f,e);d.reverse(),g.reverse();let h=r.map(b=>b.slice()),x=d.map((b,S)=>{let w=g[S];if(b>=u-1)return null;let k=b+1,$=0;for(;k<u-1&&$<l;)h[k][w]<p?$+=1:$=0,k+=1;if(k-=$,k-b<=n)return null;for(let A=b;A<k;++A)h[A][w]=0,w<ky&&(h[A][w+1]=0),w>0&&(h[A][w-1]=0);let R=r.slice(b,k).reduce((A,D)=>A+D[w],0)/(k-b);return{startFrame:b,durationFrames:k-b,pitchMidi:w+If,amplitude:R}}).filter(D4);if(c===!0)for(;$y(h)>p;){let[b,S]=h.reduce((D,_,O)=>{let L=k4(_);return _[L]>h[D[0]][D[1]]?[O,L]:D},[0,0]);h[b][S]=0;let w=b+1,k=0;for(;w<u-1&&k<l;)h[w][S]<p?k+=1:k=0,h[w][S]=0,S<ky&&(h[w][S+1]=0),S>0&&(h[w][S-1]=0),w+=1;let $=w-1-k;for(w=b-1,k=0;w>0&&k<l;)h[w][S]<p?k+=1:k=0,h[w][S]=0,S<ky&&(h[w][S+1]=0),S>0&&(h[w][S-1]=0),w-=1;let R=w+1+k;if(R<0)throw new Error(`iStart is not positive! value: ${R}`);if($>=u)throw new Error(`iEnd is past end of times. (iEnd, times.length): (${$}, ${u})`);let A=r.slice(R,$).reduce((D,_)=>D+_[S],0)/($-R);$-R<=n||x.push({startFrame:R,durationFrames:$-R,pitchMidi:S+If,amplitude:A})}return x}var L4=r=>r.map(t=>({pitchMidi:t.pitchMidi,amplitude:t.amplitude,pitchBends:t.pitchBends,startTimeSeconds:Ey(t.startFrame),durationSeconds:Ey(t.startFrame+t.durationFrames)-Ey(t.startFrame)}));export{qE as loadGraphModel,L4 as noteFramesToTime,P4 as outputToNotesPoly,Zp as tf};
