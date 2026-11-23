import {beforeEach,describe,expect,it,vi} from "vitest";

vi.mock("server-only",()=>({}));

const insertMock=vi.fn();
const selectMock=vi.fn();
const updateMock=vi.fn();

vi.mock("@/lib/supabase/admin",()=>({
  createAdminClient:()=>({
    from:()=>({insert:insertMock,select:selectMock,update:updateMock}),
  }),
}));

import {sendNotification,listPortalNotifications,markNotificationRead,markAllNotificationsRead,countUnreadPortalNotifications} from "./notification.service";

function query(result:{data?:unknown;error?:unknown;count?:number}){
  const chain:any={};
  for(const method of ["eq","is","order","limit","select","update","insert"]){
    chain[method]=vi.fn(()=>chain);
  }
  chain.then=(resolve:(value:unknown)=>void,reject?:(reason:unknown)=>void)=>Promise.resolve(result).then(resolve,reject);
  return chain;
}

beforeEach(()=>{
  vi.clearAllMocks();
  insertMock.mockResolvedValue({error:null});
});

describe("sendNotification",()=>{
  it("marks in-app notifications as sent immediately",async()=>{
    await sendNotification({type:"appointment_requested",recipientEmail:"p@example.com",subject:"Hi",message:"There"});
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({channel:"in_app",status:"sent",recipient_email:"p@example.com"}));
    expect(insertMock.mock.calls[0][0].sent_at).toBeTruthy();
  });

  it("keeps email-channel notifications pending for a future sender",async()=>{
    await sendNotification({type:"appointment_requested",recipientEmail:"p@example.com",subject:"Hi",message:"There",channel:"email"});
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({channel:"email",status:"pending",sent_at:null}));
  });
});

describe("listPortalNotifications",()=>{
  it("maps rows to portal shape and filters to in-app channel",async()=>{
    const q=query({data:[{id:"n1",type:"appointment_cancelled",subject:"Cancelled",message:"Your appointment",created_at:"2026-01-01T00:00:00Z",read_at:null}],error:null});
    selectMock.mockReturnValue(q);
    const items=await listPortalNotifications("p@example.com");
    expect(items).toEqual([{id:"n1",type:"appointment_cancelled",subject:"Cancelled",message:"Your appointment",createdAt:"2026-01-01T00:00:00Z",readAt:null}]);
    expect(selectMock).toHaveBeenCalledWith("id,type,subject,message,created_at,read_at");
    expect(q.eq).toHaveBeenCalledWith("recipient_email","p@example.com");
    expect(q.eq).toHaveBeenCalledWith("channel","in_app");
  });
});

describe("markNotificationRead",()=>{
  it("scopes the update to the recipient email and unread rows",async()=>{
    const q=query({error:null});
    updateMock.mockReturnValue(q);
    await markNotificationRead("n1","p@example.com");
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({read_at:expect.any(String)}));
    expect(q.eq).toHaveBeenCalledWith("id","n1");
    expect(q.eq).toHaveBeenCalledWith("recipient_email","p@example.com");
    expect(q.is).toHaveBeenCalledWith("read_at",null);
  });
});

describe("markAllNotificationsRead",()=>{
  it("marks only unread in-app notifications for the recipient",async()=>{
    const q=query({error:null});
    updateMock.mockReturnValue(q);
    await markAllNotificationsRead("p@example.com");
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({read_at:expect.any(String)}));
    expect(q.eq).toHaveBeenCalledWith("recipient_email","p@example.com");
    expect(q.eq).toHaveBeenCalledWith("channel","in_app");
    expect(q.is).toHaveBeenCalledWith("read_at",null);
  });
});

describe("countUnreadPortalNotifications",()=>{
  it("returns the unread count",async()=>{
    selectMock.mockReturnValue(query({count:3,error:null}));
    await expect(countUnreadPortalNotifications("p@example.com")).resolves.toBe(3);
  });
});
