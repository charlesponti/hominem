import{fn as a}from"./index-BcR7jcGp.js";import{j as e}from"./jsx-runtime-u17CrQMm.js";import{L as y}from"./label-6qQqSLJA.js";import{S as C,a as L,b as S,c as j,d as c}from"./select-CIqVgBVO.js";import{r as T}from"./index-C8ZoV04-.js";import"./index-tsHynRqG.js";import"./index-d_wwNP9Y.js";import"./index-eyG2US4j.js";import"./utils-Cd13OnTz.js";import"./createLucideIcon-CIcgGv2a.js";function p({selectedAccount:g,onAccountChange:A,accounts:i=[],isLoading:f=!1,placeholder:h="All accounts",label:b="Account",className:v,showLabel:x=!1}){const d=T.useId(),m=e.jsxs(C,{name:"account",value:g,onValueChange:A,children:[e.jsx(L,{id:d,className:v,children:e.jsx(S,{placeholder:h})}),e.jsxs(j,{className:"max-h-[250px] overflow-y-auto",children:[e.jsx(c,{value:"all",children:"All accounts"}),f?e.jsx(c,{value:"loading",disabled:!0,children:"Loading accounts..."}):i.length===0?e.jsx(c,{value:"no-accounts",disabled:!0,children:"No accounts available"}):i.map(l=>e.jsx(c,{value:l.id,children:l.name},l.id))]})]});return x?e.jsxs("div",{className:"space-y-2",children:[e.jsx(y,{htmlFor:d,children:b}),m]}):m}p.__docgenInfo={description:"",methods:[],displayName:"AccountSelect",props:{selectedAccount:{required:!0,tsType:{name:"string"},description:""},onAccountChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},accounts:{required:!1,tsType:{name:"Array",elements:[{name:"Account"}],raw:"Account[]"},description:"",defaultValue:{value:"[]",computed:!1}},isLoading:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},placeholder:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'All accounts'",computed:!1}},label:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'Account'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:""},showLabel:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};const O={title:"Finance/AccountSelect",component:p,tags:["autodocs"],argTypes:{isLoading:{control:"boolean"},showLabel:{control:"boolean"}}},u=[{id:"acc-1",name:"Chase Checking"},{id:"acc-2",name:"Chase Savings"},{id:"acc-3",name:"Amex Gold"},{id:"acc-4",name:"Capital One"}],n={args:{selectedAccount:"all",onAccountChange:a(),accounts:u,label:"Account"}},t={args:{selectedAccount:"acc-1",onAccountChange:a(),accounts:u,label:"Account"}},s={args:{selectedAccount:"all",onAccountChange:a(),accounts:u,showLabel:!0,label:"Account"}},o={args:{selectedAccount:"all",onAccountChange:a(),accounts:[],isLoading:!0,label:"Account"}},r={args:{selectedAccount:"all",onAccountChange:a(),accounts:[],isLoading:!1,label:"Account"}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    selectedAccount: 'all',
    onAccountChange: fn(),
    accounts: sampleAccounts,
    label: 'Account'
  }
}`,...n.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    selectedAccount: 'acc-1',
    onAccountChange: fn(),
    accounts: sampleAccounts,
    label: 'Account'
  }
}`,...t.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    selectedAccount: 'all',
    onAccountChange: fn(),
    accounts: sampleAccounts,
    showLabel: true,
    label: 'Account'
  }
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    selectedAccount: 'all',
    onAccountChange: fn(),
    accounts: [],
    isLoading: true,
    label: 'Account'
  }
}`,...o.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    selectedAccount: 'all',
    onAccountChange: fn(),
    accounts: [],
    isLoading: false,
    label: 'Account'
  }
}`,...r.parameters?.docs?.source}}};const k=["Default","WithSelectedAccount","WithLabel","Loading","Empty"];export{n as Default,r as Empty,o as Loading,s as WithLabel,t as WithSelectedAccount,k as __namedExportsOrder,O as default};
