import{b6 as m,aj as f,ap as $,c as I}from"./index-CPPiSKTm.js";import{j as l}from"./vendor-query-CJJnpQXQ.js";import{r as u}from"./vendor-react-AWgpgJNG.js";/**
 * @license lucide-react v0.470.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=m("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]);/**
 * @license lucide-react v0.470.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=m("Paperclip",[["path",{d:"M13.234 20.252 21 12.3",key:"1cbrk9"}],["path",{d:"m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486",key:"1pkts6"}]]);var d="Progress",p=100,[M]=$(d),[k,j]=M(d),g=u.forwardRef((a,e)=>{const{__scopeProgress:n,value:t=null,max:r,getValueLabel:N=w,...y}=a;(r||r===0)&&!c(r)&&console.error(R(`${r}`,"Progress"));const o=c(r)?r:p;t!==null&&!v(t,o)&&console.error(L(`${t}`,"Progress"));const s=v(t,o)?t:null,E=i(s)?N(s,o):void 0;return l.jsx(k,{scope:n,value:s,max:o,children:l.jsx(f.div,{"aria-valuemax":o,"aria-valuemin":0,"aria-valuenow":i(s)?s:void 0,"aria-valuetext":E,role:"progressbar","data-state":h(s,o),"data-value":s??void 0,"data-max":o,...y,ref:e})})});g.displayName=d;var x="ProgressIndicator",P=u.forwardRef((a,e)=>{const{__scopeProgress:n,...t}=a,r=j(x,n);return l.jsx(f.div,{"data-state":h(r.value,r.max),"data-value":r.value??void 0,"data-max":r.max,...t,ref:e})});P.displayName=x;function w(a,e){return`${Math.round(a/e*100)}%`}function h(a,e){return a==null?"indeterminate":a===e?"complete":"loading"}function i(a){return typeof a=="number"}function c(a){return i(a)&&!isNaN(a)&&a>0}function v(a,e){return i(a)&&!isNaN(a)&&a<=e&&a>=0}function R(a,e){return`Invalid prop \`max\` of value \`${a}\` supplied to \`${e}\`. Only numbers greater than 0 are valid max values. Defaulting to \`${p}\`.`}function L(a,e){return`Invalid prop \`value\` of value \`${a}\` supplied to \`${e}\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${p} if no \`max\` prop is set)
  - \`null\` or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`}var b=g,V=P;const _=u.forwardRef(({className:a,value:e,...n},t)=>l.jsx(b,{ref:t,className:I("relative h-2.5 w-full overflow-hidden rounded-full bg-[rgb(var(--bg-secondary))]",a),...n,children:l.jsx(V,{className:"h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-500 ease-out",style:{width:`${e??0}%`}})}));_.displayName=b.displayName;export{S as E,_ as P,q as a};
