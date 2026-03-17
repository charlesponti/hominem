import{j as t}from"./jsx-runtime-u17CrQMm.js";import{c as n}from"./utils-Cd13OnTz.js";function c({className:p,progress:o=0}){return t.jsx("div",{className:n("w-full h-[2px] border-t border-foreground overflow-hidden",p),children:t.jsx("div",{className:n("h-full border-t border-warning"),style:{width:`${Math.min(100,Math.max(0,o))}%`,opacity:o===100?0:.8}})})}c.__docgenInfo={description:"",methods:[],displayName:"ProgressBar",props:{className:{required:!1,tsType:{name:"string"},description:""},progress:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"0",computed:!1}}}};const i={title:"Finance/ProgressBar",component:c,tags:["autodocs"],argTypes:{progress:{control:{type:"range",min:0,max:100,step:5}}}},r={args:{progress:50}},e={args:{progress:0}},s={args:{progress:100}},a={args:{progress:75}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    progress: 50
  }
}`,...r.parameters?.docs?.source}}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    progress: 0
  }
}`,...e.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    progress: 100
  }
}`,...s.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    progress: 75
  }
}`,...a.parameters?.docs?.source}}};const l=["Default","Empty","Full","Partial"];export{r as Default,e as Empty,s as Full,a as Partial,l as __namedExportsOrder,i as default};
