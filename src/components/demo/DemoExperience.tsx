import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuestGuide, SECTIONS, type SectionId } from "@/components/guest/GuestGuide";
import { getVillaMare } from "@/components/guest/villaMare";
import { GuideEditor, type GuideEditorActions } from "@/components/app/GuideEditor";
import { DemoManager } from "@/components/demo/DemoManager";
import type { GuideSection, SectionMedia } from "@/lib/data/properties";
import { useI18n } from "@/lib/i18n";
import arrivalAsset from "@/assets/hostbuddy-arrival.jpg.asset.json";

type Mode="guest"|"manager";
const sectionIcon:Record<string,string>=Object.fromEntries(SECTIONS.map(section=>[section.id,section.icon]));
const asSection=(value:Record<string,unknown>)=>value as unknown as GuideSection;
const asMedia=(value:Record<string,unknown>)=>value as unknown as SectionMedia;

export function DemoExperience({compact=false}:{compact?:boolean}){
  const{locale,t}=useI18n();const storageKey=`hostbuddy.demo.${locale}`;
  const base=getVillaMare(locale);
  const stored=typeof window==="undefined"?null:window.sessionStorage.getItem(storageKey);
  const initial=stored?(()=>{try{return JSON.parse(stored) as {data:typeof base;sections:GuideSection[];media:SectionMedia[]}}catch{return null}})():null;
  const initialSections=()=>SECTIONS.filter(section=>section.id!=="pool"||base.pool).map((section,index)=>asSection({id:`demo-${section.id}`,property_id:"demo",section_key:section.id,title:t(section.key),icon:section.icon,cta_label:null,sort_order:index,is_visible:true,content:{items:[{label:"",text:section.id==="arrival"?base.arrival:section.id==="house"?base.house:section.id==="departure"?base.departure:section.id==="pool"?base.pool:""}]},created_at:"",updated_at:""}));
  const[data,setData]=useState(initial?.data??base);const[sections,setSections]=useState(initial?.sections??initialSections);const[media,setMedia]=useState(initial?.media??[]);const[mode,setMode]=useState<Mode>("guest");const[section,setSection]=useState<SectionId>("welcome");const[saved,setSaved]=useState(false);const[hero,setHero]=useState(arrivalAsset.url);
  useEffect(()=>{const next=typeof window==="undefined"?null:window.sessionStorage.getItem(storageKey);if(next){try{const parsed=JSON.parse(next) as typeof initial; if(parsed){setData(parsed.data);setSections(parsed.sections);setMedia(parsed.media)}}catch{/* keep localized defaults */}}else{setData(base);setSections(initialSections());setMedia([])}},[locale]);
  useEffect(()=>{try{window.sessionStorage.setItem(storageKey,JSON.stringify({data,sections,media}))}catch{/* local demo may exceed quota */}},[data,media,sections,storageKey]);
  const flash=()=>{setSaved(true);window.setTimeout(()=>setSaved(false),1500)};
  const actions=useMemo<GuideEditorActions>(()=>({
    ensure:async()=>sections,
    add:async(_propertyId,order,template)=>{const created=asSection({id:`demo-${crypto.randomUUID()}`,property_id:"demo",section_key:template.key,title:template.title,icon:template.icon,cta_label:null,sort_order:order,is_visible:true,content:{items:[]},created_at:"",updated_at:""});setSections(current=>[...current,created]);return created},
    save:async(current,values)=>{const updated={...current,title:values.title,icon:values.icon,cta_label:values.ctaLabel||null,is_visible:values.isVisible,content:{items:values.text?[{label:"",text:values.text}]:[]}} as GuideSection;setSections(items=>items.map(item=>item.id===updated.id?updated:item));const key=current.section_key as SectionId;if(key==="arrival"||key==="house"||key==="departure"||key==="pool")setData(value=>({...value,[key]:values.text}));return updated},
    reorder:async next=>setSections(next),remove:async id=>setSections(items=>items.filter(item=>item.id!==id)),
    upload:async(_org,_property,sectionId,file)=>{const url=URL.createObjectURL(file);const created=asMedia({id:`demo-media-${crypto.randomUUID()}`,organization_id:"demo",property_id:"demo",section_id:sectionId,media_type:file.type.startsWith("image/")?"image":"video",storage_path:url,mime_type:file.type,file_size:file.size,sort_order:media.length,caption:null,alt_text:null,created_at:""});setMedia(items=>[...items,created]);if(file.type.startsWith("image/"))setHero(url);return created},
    updateMedia:async(item,values)=>{const updated={...item,alt_text:values.altText??item.alt_text,caption:values.caption??item.caption};setMedia(items=>items.map(current=>current.id===item.id?updated:current));return updated},
    removeMedia:async item=>setMedia(items=>items.filter(current=>current.id!==item.id)),resolveMediaUrl:async item=>item.storage_path,
  }),[media.length,sections]);
  const labels=Object.fromEntries(sections.map(item=>[item.section_key,item.title])) as Partial<Record<SectionId,string>>;
  const showGuest=(next:SectionId="welcome")=>{setSection(next);setMode("guest")};
  const editor=<GuideEditor compact data={{property:{id:"demo",organization_id:"demo",status:"published"},fields:[],sections,media}} actions={actions} onChanged={flash} onPreview={()=>showGuest()}/>;
  return <div className="demo-container w-full">
    <div className="mx-auto mb-4 grid max-w-md grid-cols-2 rounded-full border bg-card/95 p-1.5 py-2.5 shadow-soft" role="tablist"><Button className="min-h-12 whitespace-nowrap text-sm text-foreground hover:text-foreground" role="tab" aria-selected={mode==="guest"} variant={mode==="guest"?"default":"ghost"} onClick={()=>showGuest()}>{t("demo.guest")}</Button><Button className="min-h-12 whitespace-nowrap text-sm text-foreground hover:text-foreground" role="tab" aria-selected={mode==="manager"} variant={mode==="manager"?"default":"ghost"} onClick={()=>setMode("manager")}>{t("demo.manager")}</Button></div>
    <div className={`demo-frame mx-auto w-full overflow-hidden border bg-background shadow-soft ${compact?"rounded-xl":"max-w-6xl rounded-xl"}`}><div className="demo-viewport overflow-y-auto overflow-x-hidden bg-background text-foreground">{mode==="guest"?<div className="mx-auto max-w-3xl p-3 @sm:p-6"><GuestGuide data={data} section={section} onSection={setSection} heroImage={hero} labels={labels}/></div>:<DemoManager editor={editor} onPreview={()=>showGuest()}/>}</div></div>
    <div aria-live="polite" className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 font-semibold text-ink-foreground transition ${saved?"opacity-100":"pointer-events-none opacity-0"}`}><Save className="mr-2 inline h-4 w-4"/>{t("demo.saved")}</div>
  </div>;
}
