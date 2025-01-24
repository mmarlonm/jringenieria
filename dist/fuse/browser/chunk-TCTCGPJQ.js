import{c as e,d as o,g as t,h as i,i as m,j as a}from"./chunk-ZO5B7NB7.js";var s=(()=>{let r=class r{};r.standard="cubic-bezier(0.4, 0.0, 0.2, 1)",r.deceleration="cubic-bezier(0.0, 0.0, 0.2, 1)",r.acceleration="cubic-bezier(0.4, 0.0, 1, 1)",r.sharp="cubic-bezier(0.4, 0.0, 0.6, 1)";let d=r;return d})(),n=(()=>{let r=class r{};r.complex="375ms",r.entering="225ms",r.exiting="195ms";let d=r;return d})();var f=e("expandCollapse",[i("void, collapsed",t({height:"0"})),i("*, expanded",t("*")),a("void <=> false, collapsed <=> false, expanded <=> false",[]),a("void <=> *, collapsed <=> expanded",o("{{timings}}"),{params:{timings:`${n.entering} ${s.deceleration}`}})]);var l=e("fadeIn",[i("void",t({opacity:0})),i("*",t({opacity:1})),a("void => false",[]),a("void => *",o("{{timings}}"),{params:{timings:`${n.entering} ${s.deceleration}`}})]),c=e("fadeInTop",[i("void",t({opacity:0,transform:"translate3d(0, -100%, 0)"})),i("*",t({opacity:1,transform:"translate3d(0, 0, 0)"})),a("void => false",[]),a("void => *",o("{{timings}}"),{params:{timings:`${n.entering} ${s.deceleration}`}})]),p=e("fadeInBottom",[i("void",t({opacity:0,transform:"translate3d(0, 100%, 0)"})),i("*",t({opacity:1,transform:"translate3d(0, 0, 0)"})),a("void => false",[]),a("void => *",o("{{timings}}"),{params:{timings:`${n.entering} ${s.deceleration}`}})]),g=e("fadeInLeft",[i("void",t({opacity:0,transform:"translate3d(-100%, 0, 0)"})),i("*",t({opacity:1,transform:"translate3d(0, 0, 0)"})),a("void => false",[]),a("void => *",o("{{timings}}"),{params:{timings:`${n.entering} ${s.deceleration}`}})]),v=e("fadeInRight",[i("void",t({opacity:0,transform:"translate3d(100%, 0, 0)"})),i("*",t({opacity:1,transform:"translate3d(0, 0, 0)"})),a("void => false",[]),a("void => *",o("{{timings}}"),{params:{timings:`${n.entering} ${s.deceleration}`}})]),$=e("fadeOut",[i("*",t({opacity:1})),i("void",t({opacity:0})),a("false => void",[]),a("* => void",o("{{timings}}"),{params:{timings:`${n.exiting} ${s.acceleration}`}})]),u=e("fadeOutTop",[i("*",t({opacity:1,transform:"translate3d(0, 0, 0)"})),i("void",t({opacity:0,transform:"translate3d(0, -100%, 0)"})),a("false => void",[]),a("* => void",o("{{timings}}"),{params:{timings:`${n.exiting} ${s.acceleration}`}})]),x=e("fadeOutBottom",[i("*",t({opacity:1,transform:"translate3d(0, 0, 0)"})),i("void",t({opacity:0,transform:"translate3d(0, 100%, 0)"})),a("false => void",[]),a("* => void",o("{{timings}}"),{params:{timings:`${n.exiting} ${s.acceleration}`}})]),y=e("fadeOutLeft",[i("*",t({opacity:1,transform:"translate3d(0, 0, 0)"})),i("void",t({opacity:0,transform:"translate3d(-100%, 0, 0)"})),a("false => void",[]),a("* => void",o("{{timings}}"),{params:{timings:`${n.exiting} ${s.acceleration}`}})]),I=e("fadeOutRight",[i("*",t({opacity:1,transform:"translate3d(0, 0, 0)"})),i("void",t({opacity:0,transform:"translate3d(100%, 0, 0)"})),a("false => void",[]),a("* => void",o("{{timings}}"),{params:{timings:`${n.exiting} ${s.acceleration}`}})]);var O=e("shake",[a("void => false",[]),a("void => *, * => true",[o("{{timings}}",m([t({transform:"translate3d(0, 0, 0)",offset:0}),t({transform:"translate3d(-10px, 0, 0)",offset:.1}),t({transform:"translate3d(10px, 0, 0)",offset:.2}),t({transform:"translate3d(-10px, 0, 0)",offset:.3}),t({transform:"translate3d(10px, 0, 0)",offset:.4}),t({transform:"translate3d(-10px, 0, 0)",offset:.5}),t({transform:"translate3d(10px, 0, 0)",offset:.6}),t({transform:"translate3d(-10px, 0, 0)",offset:.7}),t({transform:"translate3d(10px, 0, 0)",offset:.8}),t({transform:"translate3d(-10px, 0, 0)",offset:.9}),t({transform:"translate3d(0, 0, 0)",offset:1})]))],{params:{timings:"0.8s cubic-bezier(0.455, 0.03, 0.515, 0.955)"}})]);var h=e("slideInTop",[i("void",t({transform:"translate3d(0, -100%, 0)"})),i("*",t({transform:"translate3d(0, 0, 0)"})),a("void => false",[]),a("void => *",o("{{timings}}"),{params:{timings:`${n.entering} ${s.deceleration}`}})]),B=e("slideInBottom",[i("void",t({transform:"translate3d(0, 100%, 0)"})),i("*",t({transform:"translate3d(0, 0, 0)"})),a("void => false",[]),a("void => *",o("{{timings}}"),{params:{timings:`${n.entering} ${s.deceleration}`}})]),L=e("slideInLeft",[i("void",t({transform:"translate3d(-100%, 0, 0)"})),i("*",t({transform:"translate3d(0, 0, 0)"})),a("void => false",[]),a("void => *",o("{{timings}}"),{params:{timings:`${n.entering} ${s.deceleration}`}})]),R=e("slideInRight",[i("void",t({transform:"translate3d(100%, 0, 0)"})),i("*",t({transform:"translate3d(0, 0, 0)"})),a("void => false",[]),a("void => *",o("{{timings}}"),{params:{timings:`${n.entering} ${s.deceleration}`}})]),T=e("slideOutTop",[i("*",t({transform:"translate3d(0, 0, 0)"})),i("void",t({transform:"translate3d(0, -100%, 0)"})),a("false => void",[]),a("* => void",o("{{timings}}"),{params:{timings:`${n.exiting} ${s.acceleration}`}})]),z=e("slideOutBottom",[i("*",t({transform:"translate3d(0, 0, 0)"})),i("void",t({transform:"translate3d(0, 100%, 0)"})),a("false => void",[]),a("* => void",o("{{timings}}"),{params:{timings:`${n.exiting} ${s.acceleration}`}})]),b=e("slideOutLeft",[i("*",t({transform:"translate3d(0, 0, 0)"})),i("void",t({transform:"translate3d(-100%, 0, 0)"})),a("false => void",[]),a("* => void",o("{{timings}}"),{params:{timings:`${n.exiting} ${s.acceleration}`}})]),k=e("slideOutRight",[i("*",t({transform:"translate3d(0, 0, 0)"})),i("void",t({transform:"translate3d(100%, 0, 0)"})),a("false => void",[]),a("* => void",o("{{timings}}"),{params:{timings:`${n.exiting} ${s.acceleration}`}})]);var C=e("zoomIn",[i("void",t({opacity:0,transform:"scale(0.5)"})),i("*",t({opacity:1,transform:"scale(1)"})),a("void => false",[]),a("void => *",o("{{timings}}"),{params:{timings:`${n.entering} ${s.deceleration}`}})]),A=e("zoomOut",[i("*",t({opacity:1,transform:"scale(1)"})),i("void",t({opacity:0,transform:"scale(0.5)"})),a("false => void",[]),a("* => void",o("{{timings}}"),{params:{timings:`${n.exiting} ${s.acceleration}`}})]);var Z=[f,l,c,p,g,v,$,u,x,y,I,O,h,B,L,R,T,z,b,k,C,A];export{Z as a};
