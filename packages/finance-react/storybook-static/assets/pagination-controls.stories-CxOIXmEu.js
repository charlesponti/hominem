import{fn as d}from"./index-BcR7jcGp.js";import{j as a}from"./jsx-runtime-u17CrQMm.js";import{c as y}from"./index-Dl4kXw-x.js";import"./index-C8ZoV04-.js";import{c as P}from"./utils-Cd13OnTz.js";import{S as k}from"./index-eyG2US4j.js";import{c as g}from"./createLucideIcon-CIcgGv2a.js";const z=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],C=g("chevron-left",z);const _=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],j=g("chevron-right",_),N=y("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",{variants:{variant:{default:"bg-secondary text-secondary-foreground hover:bg-secondary/80",primary:"bg-primary text-primary-foreground hover:bg-primary/90",destructive:"bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",outline:"border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",secondary:"bg-secondary text-secondary-foreground hover:bg-secondary/80",ghost:"hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",link:"text-primary underline-offset-4 hover:underline"},size:{default:"h-9 px-4 py-2 has-[>svg]:px-3",md:"h-9 px-4 py-2 has-[>svg]:px-3",xs:"h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",sm:"h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",lg:"h-10 rounded-md px-6 has-[>svg]:px-4",icon:"size-9","icon-xs":"size-6 rounded-md [&_svg:not([class*='size-'])]:size-3","icon-sm":"size-8","icon-lg":"size-10"}},defaultVariants:{variant:"default",size:"md"}});function c({className:e,variant:n="default",size:t="md",asChild:r=!1,isLoading:u=!1,title:v,children:f,type:h="button",...m}){const x=r?k:"button",b=f??v;return a.jsx(x,{"data-slot":"button","data-variant":n,"data-size":t,disabled:u||m.disabled,className:P(N({variant:n,size:t,className:e})),type:r?void 0:h,...m,children:b})}c.__docgenInfo={description:"",methods:[],displayName:"Button",props:{asChild:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},isLoading:{required:!1,tsType:{name:"union",raw:"boolean | undefined",elements:[{name:"boolean"},{name:"undefined"}]},description:"",defaultValue:{value:"false",computed:!1}},size:{required:!1,tsType:{name:"union",raw:`| 'default'
| 'sm'
| 'md'
| 'lg'
| 'xs'
| 'icon'
| 'icon-xs'
| 'icon-sm'
| 'icon-lg'`,elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"},{name:"literal",value:"'xs'"},{name:"literal",value:"'icon'"},{name:"literal",value:"'icon-xs'"},{name:"literal",value:"'icon-sm'"},{name:"literal",value:"'icon-lg'"}]},description:"",defaultValue:{value:"'md'",computed:!1}},title:{required:!1,tsType:{name:"union",raw:"string | undefined",elements:[{name:"string"},{name:"undefined"}]},description:""},variant:{required:!1,tsType:{name:"union",raw:`| 'default'
| 'primary'
| 'destructive'
| 'ghost'
| 'link'
| 'outline'
| 'secondary'`,elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'primary'"},{name:"literal",value:"'destructive'"},{name:"literal",value:"'ghost'"},{name:"literal",value:"'link'"},{name:"literal",value:"'outline'"},{name:"literal",value:"'secondary'"}]},description:"",defaultValue:{value:"'default'",computed:!1}},type:{defaultValue:{value:"'button'",computed:!1},required:!1}}};const p=({currentPage:e,totalPages:n,onPageChange:t})=>{const r=()=>{e>0&&t(e-1)},u=()=>{e<n-1&&t(e+1)};return n===0?null:a.jsx("div",{className:"flex items-center justify-center mt-4",children:a.jsxs("div",{className:"flex items-center space-x-2",children:[a.jsxs(c,{variant:"outline",size:"sm",onClick:r,disabled:e===0,children:[a.jsx(C,{className:"size-4"}),"Previous"]}),a.jsxs("span",{className:"text-sm",children:["Page ",e+1," of ",n]}),a.jsxs(c,{variant:"outline",size:"sm",onClick:u,disabled:e>=n-1,children:["Next",a.jsx(j,{className:"size-4"})]})]})})};p.__docgenInfo={description:"",methods:[],displayName:"PaginationControls",props:{currentPage:{required:!0,tsType:{name:"number"},description:""},totalPages:{required:!0,tsType:{name:"number"},description:""},onPageChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(page: number) => void",signature:{arguments:[{type:{name:"number"},name:"page"}],return:{name:"void"}}},description:""}}};const B={title:"Finance/PaginationControls",component:p,tags:["autodocs"]},s={args:{currentPage:0,totalPages:5,onPageChange:d()}},i={args:{currentPage:2,totalPages:5,onPageChange:d()}},o={args:{currentPage:4,totalPages:5,onPageChange:d()}},l={args:{currentPage:0,totalPages:1,onPageChange:d()}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    currentPage: 0,
    totalPages: 5,
    onPageChange: fn()
  }
}`,...s.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    currentPage: 2,
    totalPages: 5,
    onPageChange: fn()
  }
}`,...i.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    currentPage: 4,
    totalPages: 5,
    onPageChange: fn()
  }
}`,...o.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    currentPage: 0,
    totalPages: 1,
    onPageChange: fn()
  }
}`,...l.parameters?.docs?.source}}};const D=["Default","MiddlePage","LastPage","SinglePage"];export{s as Default,o as LastPage,i as MiddlePage,l as SinglePage,D as __namedExportsOrder,B as default};
