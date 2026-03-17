import{fn as o}from"./index-BcR7jcGp.js";import{j as e}from"./jsx-runtime-u17CrQMm.js";import{L as C}from"./label-6qQqSLJA.js";import{S as b,a as S,b as x,c as v,d as a}from"./select-CIqVgBVO.js";import{r as j}from"./index-C8ZoV04-.js";import"./index-tsHynRqG.js";import"./index-d_wwNP9Y.js";import"./index-eyG2US4j.js";import"./utils-Cd13OnTz.js";import"./createLucideIcon-CIcgGv2a.js";function d({selectedTag:m,onTagChange:p,tags:u,isLoading:T=!1,placeholder:f="All tags",label:h="Tag",className:y}){const i=j.useId(),g=u||[];return e.jsxs("div",{className:`space-y-2 ${y||""}`,children:[e.jsx(C,{htmlFor:i,children:h}),e.jsxs(b,{name:"tag",value:m,onValueChange:p,children:[e.jsx(S,{id:i,children:e.jsx(x,{placeholder:f})}),e.jsxs(v,{children:[e.jsx(a,{value:"all",children:"All tags"}),T?e.jsx(a,{value:"loading",disabled:!0,children:"Loading tags..."}):g.length===0?e.jsx(a,{value:"no-tags",disabled:!0,children:"No tags available"}):g.map(l=>e.jsx(a,{value:l.id,children:l.name},l.id))]})]})]})}d.__docgenInfo={description:"",methods:[],displayName:"TagSelect",props:{selectedTag:{required:!0,tsType:{name:"string"},description:""},onTagChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},tags:{required:!0,tsType:{name:"Array",elements:[{name:"TagOption"}],raw:"TagOption[]"},description:""},isLoading:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},placeholder:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'All tags'",computed:!1}},label:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'Tag'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:""}}};const O={title:"Finance/CategorySelect",component:d,tags:["autodocs"],argTypes:{isLoading:{control:"boolean"}}},c=[{id:"food",name:"Food & Dining"},{id:"transport",name:"Transportation"},{id:"utilities",name:"Utilities"},{id:"shopping",name:"Shopping"},{id:"entertainment",name:"Entertainment"}],s={args:{selectedTag:"all",onTagChange:o(),tags:c,label:"Category"}},t={args:{selectedTag:"food",onTagChange:o(),tags:c,label:"Category"}},n={args:{selectedTag:"all",onTagChange:o(),tags:[],isLoading:!0,label:"Category"}},r={args:{selectedTag:"all",onTagChange:o(),tags:[],isLoading:!1,label:"Category"}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    selectedTag: 'all',
    onTagChange: fn(),
    tags: sampleTags,
    label: 'Category'
  }
}`,...s.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    selectedTag: 'food',
    onTagChange: fn(),
    tags: sampleTags,
    label: 'Category'
  }
}`,...t.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    selectedTag: 'all',
    onTagChange: fn(),
    tags: [],
    isLoading: true,
    label: 'Category'
  }
}`,...n.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    selectedTag: 'all',
    onTagChange: fn(),
    tags: [],
    isLoading: false,
    label: 'Category'
  }
}`,...r.parameters?.docs?.source}}};const w=["Default","WithSelectedTag","Loading","Empty"];export{s as Default,r as Empty,n as Loading,t as WithSelectedTag,w as __namedExportsOrder,O as default};
