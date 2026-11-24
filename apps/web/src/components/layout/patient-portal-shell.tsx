"use client";

import { Wallet, ArrowLeft,Bell,CalendarDays,CalendarPlus,CircleHelp,Cross,LayoutDashboard,LogOut,Menu,PanelLeftClose,PanelLeftOpen,UserRound,X} from "lucide-react";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useRef,useState} from "react";

import {patientSignOutAction} from "@/server/actions/auth.actions";
import {listPortalNotificationsAction,markAllNotificationsReadAction,markNotificationReadAction} from "@/server/actions/notification.actions";
import type {PortalNotification} from "@/server/services/notification.service";
import {ThemeToggle} from "@/components/layout/theme-toggle";

const portalNavigation=[
  {href:"/portal",label:"Overview",icon:LayoutDashboard},
  {href:"/portal/appointments",label:"Appointments",icon:CalendarDays},
  {href:"/portal/billing",label:"Billing & Results",icon:Wallet},
  {href:"/portal/appointments/new",label:"Book Appointment",mobileLabel:"Book",icon:CalendarPlus},
  {href:"/portal/profile",label:"My Profile",mobileLabel:"Profile",icon:UserRound},
  {href:"/portal/help",label:"Help & Contact",icon:CircleHelp},
] as const;

function isActiveRoute(pathname:string,href:string){
  if(href==="/portal")return pathname===href;
  return pathname===href||pathname.startsWith(`${href}/`);
}

function PortalNavigation({close}:{close?:()=>void}){
  const pathname=usePathname();
  return <nav aria-label="Patient portal navigation" className="patient-portal-nav">
    {portalNavigation.map(item=>{const Icon=item.icon,active=isActiveRoute(pathname,item.href);return <Link aria-current={active?"page":undefined} className={active?"is-active":""} href={item.href} key={item.href} onClick={close}><Icon aria-hidden="true" /><span>{item.label}</span></Link>;})}
  </nav>;
}

function SignOutButton({className="patient-portal-signout"}:{className?:string}){
  return <form action={patientSignOutAction}><button className={className} type="submit"><LogOut aria-hidden="true" />Sign Out</button></form>;
}

function MobileBottomNavigation(){
  const pathname=usePathname();
  const items=portalNavigation.filter(item=>item.href!=="/portal/help");
  return <nav aria-label="Patient portal mobile navigation" className="patient-bottom-nav">
    {items.map(item=>{const Icon=item.icon,active=isActiveRoute(pathname,item.href),isBook=item.href==="/portal/appointments/new";return <Link aria-current={active?"page":undefined} className={`${active?"is-active ":""}${isBook?"patient-bottom-nav__book":""}`.trim()} href={item.href} key={item.href}><span><Icon aria-hidden="true" /></span><small>{"mobileLabel" in item?item.mobileLabel:item.label}</small></Link>;})}
  </nav>;
}

function formatNotificationTime(value:string){
  return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
}

function NotificationBell({notifications}:{notifications:PortalNotification[]}){
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [items,setItems]=useState(notifications);
  const [prevNotifications,setPrevNotifications]=useState(notifications);
  const buttonRef=useRef<HTMLButtonElement>(null);
  const panelRef=useRef<HTMLDivElement>(null);
  if(prevNotifications!==notifications){setPrevNotifications(notifications);setItems(notifications);}
  const unreadCount=items.filter(item=>!item.readAt).length;
  useEffect(()=>{let alive=true;void listPortalNotificationsAction().then(list=>{if(alive)setItems(list);}).catch(()=>{});return()=>{alive=false};},[]);

  useEffect(()=>{
    if(!open)return;
    const onPointerDown=(event:PointerEvent)=>{
      if(panelRef.current?.contains(event.target as Node)||buttonRef.current?.contains(event.target as Node))return;
      setOpen(false);
    };
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);buttonRef.current?.focus();}};
    document.addEventListener("pointerdown",onPointerDown);
    document.addEventListener("keydown",onKeyDown);
    return()=>{document.removeEventListener("pointerdown",onPointerDown);document.removeEventListener("keydown",onKeyDown);};
  },[open]);

  const markRead=async(id:string)=>{
    setItems(prev=>prev.map(item=>item.id===id?{...item,readAt:item.readAt??new Date().toISOString()}:item));
    try{await markNotificationReadAction(id);}catch{/* keep optimistic state */}
    router.refresh();
  };
  const markAll=async()=>{
    const now=new Date().toISOString();
    setItems(prev=>prev.map(item=>item.readAt?item:{...item,readAt:now}));
    try{await markAllNotificationsReadAction();}catch{/* keep optimistic state */}
    router.refresh();
  };

  return <div className="patient-notifications">
    <button aria-expanded={open} aria-haspopup="true" aria-label={unreadCount?`Notifications, ${unreadCount} unread`:"Notifications"} className="patient-notifications__button" onClick={()=>setOpen(value=>!value)} ref={buttonRef} type="button">
      <Bell aria-hidden="true" />
      {unreadCount>0?<span aria-hidden="true" className="patient-notifications__badge">{unreadCount>9?"9+":unreadCount}</span>:null}
    </button>
    {open?<div className="patient-notifications__panel" ref={panelRef}>
      <div className="patient-notifications__header"><strong>Notifications</strong>{unreadCount>0?<button onClick={()=>void markAll()} type="button">Mark all read</button>:null}</div>
      {items.length?<ul className="patient-notifications__list">
        {items.map(item=><li className={item.readAt?"is-read":"is-unread"} key={item.id}>
          <button className="patient-notifications__item" onClick={()=>{if(!item.readAt)void markRead(item.id);}} type="button">
            <span className="patient-notifications__item-text"><strong>{item.subject}</strong><small>{item.message}</small><time dateTime={item.createdAt}>{formatNotificationTime(item.createdAt)}</time></span>
            {!item.readAt?<span aria-hidden="true" className="patient-notifications__dot"/>:null}
          </button>
        </li>)}
      </ul>:<p className="patient-notifications__empty">You&apos;re all caught up. Appointment updates will appear here.</p>}
    </div>:null}
  </div>;
}

export function PatientPortalShell({children,clinic,patient,notifications=[]}:{children:React.ReactNode;clinic:string;patient:{name:string;email:string;initials:string};notifications?:PortalNotification[]}){
  const [accountOpen,setAccountOpen]=useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const accountButtonRef=useRef<HTMLButtonElement>(null),drawerRef=useRef<HTMLElement>(null),closeButtonRef=useRef<HTMLButtonElement>(null);
  const closeAccount=()=>{setAccountOpen(false);requestAnimationFrame(()=>accountButtonRef.current?.focus());};

  useEffect(()=>{
    if(!accountOpen)return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    closeButtonRef.current?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){closeAccount();return;}
      if(event.key!=="Tab")return;
      const focusable=drawerRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if(!focusable?.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener("keydown",onKeyDown);
    return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener("keydown",onKeyDown);};
  },[accountOpen]);

  return <div className={`patient-portal-shell${sidebarCollapsed?" is-sidebar-collapsed":""}`}>
    <a className="skip-link" href="#portal-main-content">Skip to portal content</a>
    <aside className="patient-portal-sidebar">
      <div className="patient-portal-brand-row"><Link aria-label={`${clinic} patient portal overview`} className="patient-portal-brand" href="/portal"><span><Cross aria-hidden="true" /></span><span><strong>{clinic}</strong><small>Patient portal</small></span></Link><button aria-expanded={!sidebarCollapsed} aria-label={sidebarCollapsed?"Expand sidebar":"Collapse sidebar"} className="patient-sidebar-toggle" onClick={()=>setSidebarCollapsed(value=>!value)} title={sidebarCollapsed?"Expand sidebar":"Collapse sidebar"} type="button">{sidebarCollapsed?<PanelLeftOpen aria-hidden="true"/>:<PanelLeftClose aria-hidden="true"/>}</button></div>
      <PortalNavigation />
      <div className="patient-sidebar-profile"><span className="patient-avatar" aria-hidden="true">{patient.initials}</span><span><strong>{patient.name}</strong><small>Patient</small></span></div>
      <div className="patient-portal-sidebar__footer"><Link href="/"><ArrowLeft aria-hidden="true" />Back to Hospital Website</Link><SignOutButton /></div>
    </aside>
    <div className="patient-portal-workspace">
      <header className="patient-portal-topbar">
        <Link className="patient-portal-topbar__clinic" href="/portal"><span><Cross aria-hidden="true" /></span><span><strong>{clinic}</strong><small>Patient portal</small></span></Link>
        <div className="patient-topbar-actions"><ThemeToggle /><NotificationBell notifications={notifications}/><button aria-controls="patient-account-drawer" aria-expanded={accountOpen} className="patient-account-control" onClick={()=>setAccountOpen(true)} ref={accountButtonRef} type="button"><span className="patient-avatar" aria-hidden="true">{patient.initials}</span><span><strong>{patient.name}</strong><small>Patient account</small></span><Menu aria-hidden="true" /></button></div>
      </header>
      <main className="patient-portal-main" id="portal-main-content">{children}</main>
    </div>
    <MobileBottomNavigation />
    <div className={`patient-account-layer${accountOpen?" is-open":""}`}>
      <button aria-label="Close account menu" className="patient-account-backdrop" onClick={closeAccount} tabIndex={accountOpen?0:-1} type="button" />
      <aside aria-hidden={!accountOpen} aria-label="Patient account menu" className="patient-account-drawer" id="patient-account-drawer" inert={!accountOpen} ref={drawerRef}>
        <div className="patient-account-drawer__heading"><div><span className="patient-avatar" aria-hidden="true">{patient.initials}</span><span><strong>{patient.name}</strong><small>{patient.email}</small></span></div><button aria-label="Close account menu" onClick={closeAccount} ref={closeButtonRef} type="button"><X aria-hidden="true" /></button></div>
        <nav aria-label="Patient account links"><Link href="/portal/help" onClick={closeAccount}><CircleHelp aria-hidden="true" />Help & Contact</Link><Link href="/" onClick={closeAccount}><ArrowLeft aria-hidden="true" />Back to Hospital Website</Link></nav>
        <SignOutButton className="patient-account-signout" />
      </aside>
    </div>
  </div>;
}
