import{j as e}from"./jsx-runtime-u17CrQMm.js";import{B as r}from"./badge-Dl_s_Qhy.js";import{c as d}from"./createLucideIcon-CIcgGv2a.js";import"./index-Dl4kXw-x.js";import"./utils-Cd13OnTz.js";import"./index-C8ZoV04-.js";import"./index-eyG2US4j.js";const l=[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],u=d("circle-check-big",l);function i({status:c}){switch(c){case"active":return e.jsxs(r,{variant:"default",className:"bg-muted text-foreground border-border",children:[e.jsx(u,{className:"size-3 mr-1"}),"Active"]});case"error":return e.jsxs(r,{variant:"destructive",children:[e.jsxs("svg",{className:"size-3 mr-1",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",role:"img","aria-label":"Error icon",children:[e.jsx("title",{children:"Error"}),e.jsx("path",{d:"M12 9v4"}),e.jsx("path",{d:"M12 17h.01"}),e.jsx("circle",{cx:"12",cy:"12",r:"10"})]}),"Error"]});case"pending_expiration":return e.jsxs(r,{variant:"secondary",className:"bg-warning-subtle text-warning border-warning-subtle",children:[e.jsxs("svg",{className:"size-3 mr-1",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",role:"img","aria-label":"Clock icon",children:[e.jsx("title",{children:"Pending Expiration"}),e.jsx("circle",{cx:"12",cy:"12",r:"10"}),e.jsx("polyline",{points:"12 6 12 12 16 14"})]}),"Expiring Soon"]});case"revoked":return e.jsx(r,{variant:"outline",className:"text-muted-foreground",children:"Revoked"});default:return e.jsx(r,{variant:"outline",children:"Unknown"})}}i.__docgenInfo={description:"",methods:[],displayName:"PlaidStatusBadge",props:{status:{required:!0,tsType:{name:"union",raw:"'active' | 'error' | 'pending_expiration' | 'revoked' | null",elements:[{name:"literal",value:"'active'"},{name:"literal",value:"'error'"},{name:"literal",value:"'pending_expiration'"},{name:"literal",value:"'revoked'"},{name:"null"}]},description:""}}};const j={title:"Finance/PlacidStatusBadge",component:i,tags:["autodocs"],argTypes:{status:{control:"select",options:["active","error","pending_expiration","revoked",null]}}},s={args:{status:"active"}},a={args:{status:"error"}},t={args:{status:"pending_expiration"}},n={args:{status:"revoked"}},o={args:{status:null}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'active'
  }
}`,...s.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'error'
  }
}`,...a.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'pending_expiration'
  }
}`,...t.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'revoked'
  }
}`,...n.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    status: null
  }
}`,...o.parameters?.docs?.source}}};const f=["Active","Error","PendingExpiration","Revoked","Unknown"];export{s as Active,a as Error,t as PendingExpiration,n as Revoked,o as Unknown,f as __namedExportsOrder,j as default};
