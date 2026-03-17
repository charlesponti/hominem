import{fn as i}from"./index-BcR7jcGp.js";import{j as e}from"./jsx-runtime-u17CrQMm.js";import{S,a as x,b as v,c as C,d as Y}from"./select-CIqVgBVO.js";import{r as k}from"./index-C8ZoV04-.js";import{c as w}from"./createLucideIcon-CIcgGv2a.js";import"./utils-Cd13OnTz.js";import"./index-tsHynRqG.js";import"./index-d_wwNP9Y.js";import"./index-eyG2US4j.js";const j=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],D=w("calendar",j);function d({selectedMonthYear:n,onMonthChange:c,monthsBack:a=12,className:p="w-[200px]",placeholder:g="Select month"}){const M=k.useMemo(()=>{const t=[],u=new Date;for(let l=0;l<a;l++){const m=new Date(u.getFullYear(),u.getMonth()-l,1),f=m.getFullYear(),y=(m.getMonth()+1).toString().padStart(2,"0");t.push({value:`${f}-${y}`,label:m.toLocaleString("default",{month:"long",year:"numeric"})})}return t},[a]);return e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(D,{className:"size-4"}),e.jsxs(S,{value:n,onValueChange:c,children:[e.jsx(x,{className:p,children:e.jsx(v,{placeholder:g})}),e.jsx(C,{children:M.map(t=>e.jsx(Y,{value:t.value,children:t.label},t.value))})]})]})}const h=()=>{const n=new Date,c=n.getFullYear(),a=(n.getMonth()+1).toString().padStart(2,"0");return`${c}-${a}`};d.__docgenInfo={description:"",methods:[],displayName:"DateMonthSelect",props:{selectedMonthYear:{required:!0,tsType:{name:"string"},description:""},onMonthChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},monthsBack:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"12",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'w-[200px]'",computed:!1}},placeholder:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'Select month'",computed:!1}}}};const E={title:"Finance/DateMonthSelect",component:d,tags:["autodocs"],argTypes:{monthsBack:{control:{type:"number",min:1,max:36}}}},r={args:{selectedMonthYear:h(),onMonthChange:i(),monthsBack:12}},o={args:{selectedMonthYear:h(),onMonthChange:i(),monthsBack:3}},s={args:{selectedMonthYear:h(),onMonthChange:i(),monthsBack:24}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    selectedMonthYear: getCurrentMonthYear(),
    onMonthChange: fn(),
    monthsBack: 12
  }
}`,...r.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    selectedMonthYear: getCurrentMonthYear(),
    onMonthChange: fn(),
    monthsBack: 3
  }
}`,...o.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    selectedMonthYear: getCurrentMonthYear(),
    onMonthChange: fn(),
    monthsBack: 24
  }
}`,...s.parameters?.docs?.source}}};const I=["Default","FewMonths","ManyMonths"];export{r as Default,o as FewMonths,s as ManyMonths,I as __namedExportsOrder,E as default};
