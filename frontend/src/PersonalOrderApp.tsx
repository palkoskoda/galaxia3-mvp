import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Check, CheckCheck, Clock3, ExternalLink, Mail, MapPin, Minus, Plus, RefreshCw, Settings2, Soup, Utensils, ArrowUpRight, HelpCircle, LayoutGrid, Truck, CreditCard, X, AlertCircle, Save, FileText } from 'lucide-react';
import type { MenuDay } from './personal/menu-parser.mjs';
import { formatOrderEmail } from './personal/order-domain.mjs';
import { preferredWeek } from './personal/menu-weeks.mjs';
import { blankProfile, readState, storeDraft } from './personal/storage';
import type { Draft, Profile, LocalOrder as Order } from './personal/storage';
type Code = 'A'|'B'|'C'|'D';
type WeekSource = {weekStart:string|null;kind:'website'|'email-pdf';label:string;stale:boolean;importedAt?:string;receivedAt?:string;pdfUrl?:string};
type Menu = {days:MenuDay[];fetchedAt:string|null;stale:boolean;error?:string;weekSources?:WeekSource[]};
const CODES:Code[] = ['A','B','C','D'];
const DAYS = ['Nedeľa','Pondelok','Utorok','Streda','Štvrtok','Piatok','Sobota'];
const emptyMenu:Menu = {days:[],fetchedAt:null,stale:false};
const dateText = (date:string,year=false) => new Intl.DateTimeFormat('sk-SK',{day:'numeric',month:'numeric',...(year?{year:'numeric'}:{})}).format(new Date(date+'T12:00:00Z'));
const addDays = (date:string,days:number) => new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
const todaySK = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Bratislava',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const monday = (date:string) => addDays(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7));
const labelDay = (date:string) => DAYS[new Date(date+'T12:00:00Z').getUTCDay()];
const stamp = (date:string) => new Intl.DateTimeFormat('sk-SK',{timeZone:'Europe/Bratislava',day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(date));
function canSelect(date:string,code:Code) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Bratislava',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = Number(parts.hour)*60+Number(parts.minute);
  if (date<today) return false;
  if (code==='D') return date>today || minutes<480;
  return date>addDays(today,1) || (date===addDays(today,1)&&minutes<870);
}
function emailText(draft:Draft,origin:string) {
  return formatOrderEmail(draft,origin).text;
}

export default function PersonalOrderApp() {
  const [menu,setMenu]=useState<Menu>(emptyMenu);
  const [orders,setOrders]=useState<Order[]>([]);
  const [week,setWeek]=useState('');
  const [draft,setDraft]=useState<Draft>({weekStart:'',profile:{...blankProfile},selections:{},note:'',sendAt:null});
  const [current,setCurrent]=useState<Order|null>(null);
  const [view,setView]=useState('menu');
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [notice,setNotice]=useState('');
  const [modal,setModal]=useState<'email'|'profile'|null>(null);
  const [origin,setOrigin]=useState('');
  const draftRef=useRef(draft);
  draftRef.current=draft;
  const busy=false,locked=false;
  const account={name:draft.profile.name||'Môj výber',email:draft.profile.email||'Údaje doručenia'};
  const days=menu.days.filter(d=>monday(d.date)===week);
  const source=menu.weekSources?.find(item=>item.weekStart===week);
  const activeStale=source?.stale??menu.stale;
  const total=Object.values(draft.selections).reduce((sum,day)=>sum+Object.values(day).reduce((n,q)=>n+(q??0),0),0);
  const selectedDays=Object.values(draft.selections).filter(d=>Object.values(d).some(n=>(n??0)>0)).length;
  const profileValid=!!(draft.profile.name.trim()&&draft.profile.address.trim()&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.profile.email));

  function selectWeek(next:string,all=orders,defaultProfile=draftRef.current.profile) {
    const order=all.find(o=>o.weekStart===next)??null;
    setWeek(next);setCurrent(order);
    setDraft(order?{weekStart:next,profile:defaultProfile,selections:order.selections,note:order.note,sendAt:null}:{weekStart:next,profile:defaultProfile,selections:{},note:'',sendAt:null});
    setDirty(false);
  }
  async function fetchMenu(force=false):Promise<Menu> {
    const response=await fetch('/api/menu'+(force?'?refresh=1':''),{signal:AbortSignal.timeout(15_000)});
    const result=await response.json() as Menu;
    if(!response.ok&&!result.days?.length)throw new Error(result.error||'Menu sa nepodarilo načítať.');
    return result;
  }
  useEffect(()=>{
    let active=true;
    let all:Order[]=[];
    let profile:Profile={...blankProfile};
    try{const state=readState(window.localStorage);all=state.orders;profile=state.profile;setOrders(all);setDraft(d=>({...d,profile}));}
    catch{setNotice('Uložený výber sa nepodarilo načítať. Prehliadač môže mať zablokované ukladanie.');}
    setOrigin(window.location.origin);
    void fetchMenu().then(result=>{
      if(!active)return;
      setMenu(result);
      selectWeek(preferredWeek(result.days,todaySK()),all,profile);
    }).catch(()=>{if(active){selectWeek(addDays(monday(todaySK()),7),all,profile);setNotice('Jedálny lístok sa nepodarilo načítať. Skús Obnoviť lístok.');}}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  // Initial storage/menu load only. User edits are saved separately below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  function edit(patch:Partial<Draft>){setDraft(d=>({...d,...patch}));setDirty(true);}
  function persist(snapshot=draftRef.current):Order {
    const order=storeDraft(window.localStorage,snapshot);
    setOrders(previous=>[order,...previous.filter(item=>item.weekStart!==order.weekStart)]);
    if(snapshot.weekStart===draftRef.current.weekStart){setCurrent(order);setDirty(false);}
    return order;
  }
  async function saveDraft(){try{return persist();}catch{setNotice('Výber sa nepodarilo uložiť do prehliadača. Ostáva v tomto otvorenom okne; pred zatvorením si skopíruj text e-mailu.');return null;}}
  useEffect(()=>{
    if(!dirty||loading||!draft.weekStart)return;
    const timer=setTimeout(()=>{void saveDraft();},300);
    return()=>clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[draft,dirty,loading]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);
  async function changeWeek(next:string){if(dirty&&!(await saveDraft()))return;selectWeek(next);}
  async function refresh(){
    if(dirty&&!(await saveDraft()))return;
    setRefreshing(true);
    try{
      const result=await fetchMenu(true);setMenu(result);
      if(week&&addDays(week,4)<todaySK())selectWeek(preferredWeek(result.days,todaySK()));
      setNotice(result.weekSources?.some(item=>item.kind==='email-pdf')?'Menu z e-mailových PDF je načítané.':result.error??'Jedálny lístok je načítaný.');
    }catch(e){setNotice((e as Error).message);}finally{setRefreshing(false);}
  }
  function quantity(date:string,code:Code,delta:number){const count=Math.max(0,Math.min(20,(draft.selections[date]?.[code]??0)+delta));edit({selections:{...draft.selections,[date]:{...draft.selections[date],[code]:count}}});}
  function openGmail(){
    if(!profileValid){setModal('profile');return;}
    if(activeStale){setNotice('Pred prípravou e-mailu obnov jedálny lístok.');return;}
    for(const [date,meals] of Object.entries(draft.selections))for(const code of CODES){
      if((meals[code]??0)>0&&(!canSelect(date,code)||!menu.days.some(day=>day.date===date))){setNotice(`Skontroluj výber na ${dateText(date)}. Jedlo ${code} už nemožno objednať alebo nie je v aktuálnom lístku.`);return;}
    }
    const message=formatOrderEmail(draft,origin);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=galaxia.obedy%40gmail.com&su=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.text)}`,'_blank','noopener,noreferrer');
    setNotice('V Gmaile skontroluj pripravenú správu a potvrď odoslanie. Ak sa Gmail neotvoril, použi náhľad a skopíruj text.');
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Moje obedy, úvod"><span className="brand-mark"><Utensils size={24}/></span><span>galaxia<span className="brand-sub">MOJE OBEDY</span></span></a>
      <div className="workspace-label">TVÔJ OBEDOVÝ PLÁN</div>
      <nav aria-label="Hlavné menu">
        <button className={view==='menu'?'nav-item active':'nav-item'} onClick={()=>setView('menu')}><CalendarDays size={19}/>Jedálny lístok<span className="nav-dot"/></button>
        <button className={view==='order'?'nav-item active':'nav-item'} onClick={()=>setView('order')}><FileText size={19}/>Moja objednávka{total>0&&<span className="nav-count">{total}</span>}</button>
        <div className="nav-divider"/><span className="nav-section">ČOSKORO</span>
        {[{id:'payments',name:'Platby',icon:CreditCard},{id:'delivery',name:'Rozvoz',icon:Truck},{id:'restaurant',name:'Pre reštauráciu',icon:LayoutGrid},{id:'schedule',name:'Plánovanie',icon:Clock3}].map(({id,name,icon:Icon})=><button key={id} className={view===id?'nav-item active':'nav-item'} onClick={()=>setView(id)}><Icon size={19}/>{name}<span className="soon-dot"/></button>)}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><span className="tip-icon"><Utensils size={18}/></span><p>Dobrý obed.<br/><strong>O starosť menej.</strong></p><span className="tip-spark">✧</span></div><button className="account-button" onClick={()=>setModal('profile')}><span className="avatar">{account?.name?.slice(0,1).toUpperCase()??'M'}</span><span><strong>Údaje doručenia</strong><small>{account?.email??'Ulož si svoj výber'}</small></span><Settings2 size={17}/></button></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Moje obedy<span>/</span><strong>{view==='menu'?'Jedálny lístok':view==='order'?'Moja objednávka':'Pripravuje sa'}</strong></div><div className="top-actions"><span className="private-label"><span/>Ukladanie v prehliadači</span><button className="icon-button" aria-label="Informácie o aplikácii" onClick={()=>setNotice('Moje obedy je nezávislý pomocník. Objednávka je potvrdená až reštauráciou. Jedálny lístok pochádza z galaxia-krupina.sk.')}><HelpCircle size={19}/></button></div></header>
      <main>
        <div className="page-heading"><div><div className="eyebrow">JEDLO VYRIEŠENÉ. TÝŽDEŇ JEDNODUCHŠÍ.</div><h1>{view==='menu'?'Čo bude na obed?':view==='order'?'Tvoj týždeň na tanieri.':'Na tomto sa ešte varí.'}</h1><p>{view==='menu'?'Vyber si obľúbené jedlá. My pripravíme objednávku.':view==='order'?'Všetko skontroluj na jednom mieste a priprav e-mail.':'Ďalšie možnosti pribudnú postupne. Zatiaľ si vyber dobrý obed.'}</p></div><span className="heading-illustration" aria-hidden="true"><Utensils size={31}/><span>✧</span></span></div>
        <div className="info-banner"><CheckCheck size={17}/><span>Výber sa ukladá v tomto prehliadači. E-mail odošleš zo svojho Gmailu.</span></div>
        {notice&&<div className="notice" role="status"><AlertCircle size={18}/><span>{notice}</span><button className="icon-button" aria-label="Zavrieť oznámenie" onClick={()=>setNotice('')}><X size={17}/></button></div>}
        {['menu','order'].includes(view)?<>
          <div className="week-toolbar"><div className="week-picker"><span className="calendar-square"><CalendarDays size={20}/></span><div><span className="small-label">TÝŽDENNÉ MENU</span><strong>{week?`${dateText(week)} – ${dateText(addDays(week,4),true)}`:'Načítavam…'}</strong></div><div className="week-arrows"><button disabled={!week||busy} aria-label="Predchádzajúci týždeň" onClick={()=>void changeWeek(addDays(week,-7))}><ChevronLeft size={19}/></button><button disabled={!week||busy} aria-label="Ďalší týždeň" onClick={()=>void changeWeek(addDays(week,7))}><ChevronRight size={19}/></button></div></div><button className="refresh-button" onClick={()=>void refresh()} disabled={refreshing}><RefreshCw size={16} className={refreshing?'spinning':''}/><span>{refreshing?'Načítavam…':'Obnoviť lístok'}</span></button></div>
          {activeStale&&<div className="warning-banner"><AlertCircle size={18}/>{menu.error} Pred odoslaním bude potrebné overenie aktuálneho lístka.</div>}
          <div className="content-grid"><section className="menu-column" aria-label="Jedálny lístok">
            {loading?<div className="empty-card"><RefreshCw className="spinning"/><h2>Načítavam čerstvé menu…</h2><p>Z overených PDF a webu Galaxie.</p></div>:view==='order'?<div className="order-details panel"><span className="small-label">REKAPITULÁCIA OBJEDNÁVKY</span><h2>{total?`${total} ${total===1?'obed':total<5?'obedy':'obedov'} na ${selectedDays} ${selectedDays===1?'deň':selectedDays<5?'dni':'dní'}`:'Zatiaľ tu nie je žiadny obed.'}</h2>{Object.keys(draft.selections).sort().filter(date=>Object.values(draft.selections[date]).some(q=>(q??0)>0)).map(date=><div className="recap-day" key={date}><h3>{labelDay(date)} <span>{dateText(date)}</span></h3>{CODES.filter(c=>(draft.selections[date][c]??0)>0).map(c=><div className="recap-meal" key={c}><b>{draft.selections[date][c]}× {c}</b><span>{menu.days.find(d=>d.date===date)?.meals.find(m=>m.code===c)?.name??'Názov jedla už nie je v aktuálnom lístku'}</span></div>)}</div>)}<button className="secondary-button" onClick={()=>setView('menu')}>Upraviť výber <ArrowUpRight size={16}/></button></div>:days.length?days.map(day=>{
              const count=Object.values(draft.selections[day.date]??{}).reduce((n,q)=>n+(q??0),0);
              return <article className={'day-card'+(day.date<todaySK()?' past-day':'')} key={day.date}>
                <div className="day-heading"><div className="day-date"><span className="day-number">{new Date(day.date+'T12:00:00Z').getUTCDate()}</span><span><h2>{labelDay(day.date)}</h2><small>{new Intl.DateTimeFormat('sk-SK',{month:'long'}).format(new Date(day.date+'T12:00:00Z'))}</small></span></div>{count?<span className="selected-badge"><Check size={13}/>{count} {count===1?'obed':count<5?'obedy':'obedov'}</span>:<span className="day-hint">{day.date<todaySK()?'Ukončené':'Vyber si z ponuky'}</span>}</div>
                <div className="soup-row"><Soup size={17}/><span><b>Polievka</b>{day.soup.name}</span><small>{day.soup.weight}</small></div>
                <div className="meal-list">{day.meals.map(meal=>{
                  const q=draft.selections[day.date]?.[meal.code]??0;const available=canSelect(day.date,meal.code);
                  return <div className={'meal-row'+(q?' is-selected':'')} key={meal.code}><span className={'meal-letter'+(meal.code==='A'?' fit-letter':'')}>{meal.code}</span><div className="meal-description"><p>{meal.name}{meal.code==='A'&&<span className="fit-tag">FIT</span>}</p><small>{meal.weight}{!available&&<span className="closed-hint"> · Po uzávierke</span>}</small></div><div className={'stepper'+(q?' has-value':'')}><button aria-label={`Odobrať ${meal.code}, ${labelDay(day.date)}`} disabled={locked||q===0} onClick={()=>quantity(day.date,meal.code,-1)}><Minus size={14}/></button><output aria-label={`Počet ${meal.code}, ${labelDay(day.date)}`}>{q}</output><button aria-label={`Pridať ${meal.code}, ${labelDay(day.date)}`} disabled={locked||!available||q>=20} onClick={()=>quantity(day.date,meal.code,1)}><Plus size={14}/></button></div></div>;
                })}</div>
                {day.extra&&<div className="extra-row"><span>Príloha navyše</span>{day.extra.name}<small>{day.extra.price??''} · objednaj v poznámke</small></div>}
              </article>;
            }):<div className="empty-card"><CalendarDays size={37}/><span className="small-label">EŠTE CHVÍĽU STRPENIA</span><h2>Na tento týždeň menu ešte nie je.</h2><p>Menu pridáme z e-mailového PDF Galaxie alebo načítame z jej webu. Zatiaľ si môžeš pozrieť posledný dostupný lístok.</p><button className="secondary-button" onClick={()=>{if(menu.days.length)void changeWeek(monday(menu.days[menu.days.length-1].date));else void refresh();}}>{menu.days.length?'Posledné dostupné menu':'Skúsiť načítať znova'}<ArrowUpRight size={16}/></button></div>}
            <div className="source-footer"><span><span className="source-dot"/>Zdroj: <a href={source?.pdfUrl??'https://galaxia-krupina.sk/'} target="_blank" rel="noreferrer">{source?.kind==='email-pdf'?'PDF z e-mailu Galaxie':'galaxia-krupina.sk'} <ExternalLink size={11}/></a>{(source?.importedAt??menu.fetchedAt)&&<small> · {source?.kind==='email-pdf'?'pridané':'načítané'} {stamp((source?.importedAt??menu.fetchedAt)!)}</small>}</span><p>A–C deň vopred do 14:30 · D v deň rozvozu do 8:00</p></div>
          </section><aside className="summary-column" aria-label="Súhrn objednávky"><div className="summary panel"><div className="summary-heading"><h2>Moja objednávka</h2><span className="summary-icon"><Utensils size={18}/></span></div><div className="summary-period">{week&&`${dateText(week)} – ${dateText(addDays(week,4),true)}`}</div>
              <div className="summary-stats"><div><strong>{total.toString().padStart(2,'0')}</strong><span>OBEDOV</span></div><div className="stat-line"/><div><strong>{selectedDays.toString().padStart(2,'0')}</strong><span>DNÍ S OBEDOM</span></div></div>
              <div className="summary-days">{[0,1,2,3,4].map(offset=>{const date=week?addDays(week,offset):'';const picks=CODES.filter(c=>(draft.selections[date]?.[c]??0)>0);return <div key={offset}><span>{['Pondelok','Utorok','Streda','Štvrtok','Piatok'][offset]}</span><strong className={picks.length?'picked':''}>{picks.length?picks.map(c=>`${draft.selections[date][c]}× ${c}`).join(', '):'—'}</strong></div>;})}</div>
              <button className="delivery-block" onClick={()=>setModal('profile')}><MapPin size={18}/><span><small>DORUČENIE</small><strong>{draft.profile.address||'Doplniť adresu doručenia'}</strong></span><ChevronRight size={16}/></button>
              <label className="note-label" htmlFor="order-note">Poznámka pre reštauráciu <span>voliteľné</span></label><textarea id="order-note" disabled={locked} value={draft.note} maxLength={1000} onChange={e=>edit({note:e.target.value})} placeholder="Napr. zvoniť pri bráne…" rows={2}/>
              <div className={'save-state'+(dirty?' unsaved':'')} aria-live="polite">{dirty?<Save size={13}/>:<CheckCheck size={14}/>}<span>{dirty?'Ukladám výber…':current?'Uložené v tomto prehliadači':'Výber sa uloží v tomto prehliadači'}</span></div>
              <button className="primary-button" disabled={!total||loading} onClick={openGmail}><Mail size={17}/>Pripraviť e-mail v Gmaile<ArrowUpRight size={16}/></button><button className="email-preview-button" disabled={!total} onClick={()=>setModal('email')}>Pozrieť znenie e-mailu</button>
              <div className="schedule-section"><div className="schedule-heading"><Clock3 size={17}/><strong>Automatické odosielanie</strong><span className="pill">PRIPRAVUJE SA</span></div><p>Zatiaľ si výber uložíš a odoslanie potvrdíš vo svojom Gmaile. Meno, adresu ani výber neukladáme na server.</p></div>
            </div><div className="summary-footnote"><Mail size={15}/><p>Objednávka pôjde na<br/><strong>galaxia.obedy@gmail.com</strong></p></div></aside></div>
        </>:<div className="coming-soon panel"><div className="coming-icon">{view==='delivery'?<Truck size={40}/>:view==='payments'?<CreditCard size={40}/>:<LayoutGrid size={40}/>}</div><span className="pill">PRIPRAVUJE SA</span><h2>{view==='payments'?'Platby na jednom mieste.':view==='delivery'?'Prehľadnejší rozvoz.':view==='schedule'?'Obedy pripravené, e-mail načas.':'Viac možností pre reštauráciu.'}</h2><p>Zatiaľ sa sústredíme na to najdôležitejšie.<br/>Aby bol dobrý obed vzdialený len pár kliknutí.</p><button className="secondary-button" onClick={()=>setView('menu')}>Vybrať si obedy <ArrowUpRight size={16}/></button></div>}
        <footer className="app-footer"><span>Moje obedy <span>·</span> Nezávislý osobný pomocník</span><span>Prijatie objednávky potvrdzuje Galaxia.</span></footer>
      </main>
    </div>
    {modal&&<div className="modal-backdrop" onClick={event=>{if(event.target===event.currentTarget)setModal(null);}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close icon-button" aria-label="Zavrieť" onClick={()=>setModal(null)}><X size={21}/></button>{modal==='profile'?<><span className="modal-icon"><MapPin size={24}/></span><h2 id="modal-title">Kam prinesú obed?</h2><p>Údaje sa uložia iba v tomto prehliadači a vložia sa do e-mailu.</p><form onSubmit={event=>{event.preventDefault();setModal(null);void saveDraft();}}><label>Meno a priezvisko<input autoFocus required maxLength={120} value={draft.profile.name} onChange={event=>edit({profile:{...draft.profile,name:event.target.value}})}/></label><label>Adresa doručenia<input required maxLength={300} placeholder="Ulica, číslo, obec" value={draft.profile.address} onChange={event=>edit({profile:{...draft.profile,address:event.target.value}})}/></label><label>Tvoj e-mail<input type="email" required maxLength={254} value={draft.profile.email} onChange={event=>edit({profile:{...draft.profile,email:event.target.value}})}/></label><button className="primary-button" type="submit"><Check size={17}/>Uložiť údaje</button></form></>:<><span className="modal-icon"><Mail size={24}/></span><h2 id="modal-title">Takto bude vyzerať e-mail.</h2><p>Komu: <strong>galaxia.obedy@gmail.com</strong></p><pre className="email-preview">{emailText(draft,origin)}</pre><button className="secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText(emailText(draft,origin));setNotice('Text e-mailu je skopírovaný.');}catch{setNotice('Text môžeš označiť a skopírovať ručne.');}}}>Skopírovať text</button></>}</section></div>}
  </div>;
}
