import {beforeEach,describe,expect,it,vi} from "vitest";

vi.mock("server-only",()=>({}));

vi.mock("@/server/permissions/require-permission",()=>({requirePermission:vi.fn()}));
vi.mock("@/config/clinic",()=>({clinicOrganizationId:vi.fn(()=>"org-1")}));
vi.mock("@/lib/supabase/server",()=>({createClient:vi.fn()}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:vi.fn()}));
vi.mock("@/server/repositories/settings.repository",()=>({
  DEFAULT_ORGANIZATION_SETTINGS:{
    default_date_format:"d mmm yyyy",default_time_format:"24h",default_locale:"en-UG",
    online_booking_enabled:true,booking_min_advance_minutes:0,booking_max_advance_days:30,
    patient_cancellation_enabled:true,cancellation_cutoff_hours:0,
    in_app_notifications_enabled:true,email_notifications_enabled:true,
    appointment_reminders_enabled:false,reminder_hours_before:24,brand_color:"#0d9488",
  },
  findOrganizationSettings:vi.fn(),
  findOrganizationSettingsAdmin:vi.fn(),
  listOrganizationSettingsAdmin:vi.fn(),
  upsertOrganizationSettings:vi.fn(),
  findOrganizationProfile:vi.fn(),
  updateOrganizationProfile:vi.fn(),
  updateOrganizationProfileAdmin:vi.fn(),
  insertAuditLog:vi.fn(),
  listAuditLogs:vi.fn(),
}));
vi.mock("@/server/repositories/staff-management.repository",()=>({listStaffDirectory:vi.fn()}));

import {requirePermission} from "@/server/permissions/require-permission";
import {createClient} from "@/lib/supabase/server";
import * as repo from "@/server/repositories/settings.repository";
import {
  getSettingsContext,
  listSettingsFacilities,
  listSettingsRoles,
  listSettingsStaff,
  saveOrganizationLogo,
  updateAppointmentSettings,
  updateBrandingSettings,
  updateGeneralSettings,
  updateLocalizationSettings,
  updateNotificationSettings,
  updateOrganizationProfile,
} from "./settings.service";
import {AuthorizationError,ValidationError} from "@/server/errors";

const staff=(roleId="role-admin")=>({user:{id:"user-1",email:"admin@clinic.test"},membership:{organization_id:"org-1",role_id:roleId,primary_facility_id:null,is_active:true,must_change_password:false}});
const settingsRow={organization_id:"org-1",default_date_format:"d mmm yyyy",default_time_format:"24h",default_locale:"en-UG",online_booking_enabled:true,booking_min_advance_minutes:0,booking_max_advance_days:30,patient_cancellation_enabled:true,cancellation_cutoff_hours:0,in_app_notifications_enabled:true,email_notifications_enabled:true,appointment_reminders_enabled:false,reminder_hours_before:24,brand_color:"#0d9488",created_at:"2026-01-01T00:00:00Z",updated_at:"2026-01-02T00:00:00Z",updated_by:"user-1"};
const orgRow={id:"org-1",name:"Test Clinic",legal_name:null,email:null,phone:null,website:null,timezone:"Africa/Kampala",currency_code:"UGX",description:null,address_line:null,city:null,district:null,country_code:"UG",emergency_phone:null,logo_path:null,status:"active",is_public:true,created_at:"2026-01-01T00:00:00Z",updated_at:"2026-01-01T00:00:00Z"};

beforeEach(()=>{vi.clearAllMocks();vi.mocked(requirePermission).mockResolvedValue(staff() as never);});

describe("settings.service permission enforcement",()=>{
  it("rejects every mutation when the actor lacks permission",async()=>{
    vi.mocked(requirePermission).mockRejectedValue(new AuthorizationError());
    await expect(updateGeneralSettings({default_date_format:"dd/mm/yyyy",default_time_format:"24h",default_locale:"en-UG"})).rejects.toBeInstanceOf(AuthorizationError);
    await expect(updateAppointmentSettings({online_booking_enabled:false,booking_min_advance_minutes:0,booking_max_advance_days:30,patient_cancellation_enabled:true,cancellation_cutoff_hours:0})).rejects.toBeInstanceOf(AuthorizationError);
    await expect(updateNotificationSettings({in_app_notifications_enabled:true,email_notifications_enabled:true,appointment_reminders_enabled:false,reminder_hours_before:24})).rejects.toBeInstanceOf(AuthorizationError);
    await expect(updateBrandingSettings({brand_color:"#0d9488"})).rejects.toBeInstanceOf(AuthorizationError);
    await expect(updateOrganizationProfile({name:"X"})).rejects.toBeInstanceOf(AuthorizationError);
    await expect(updateLocalizationSettings({timezone:"UTC",currency_code:"USD"})).rejects.toBeInstanceOf(AuthorizationError);
    await expect(listSettingsFacilities()).rejects.toBeInstanceOf(AuthorizationError);
    await expect(listSettingsRoles()).rejects.toBeInstanceOf(AuthorizationError);
    expect(repo.upsertOrganizationSettings).not.toHaveBeenCalled();
    expect(repo.updateOrganizationProfile).not.toHaveBeenCalled();
    expect(repo.insertAuditLog).not.toHaveBeenCalled();
  });

  it("scopes every read and write to the actor's organization",async()=>{
    vi.mocked(repo.findOrganizationSettings).mockResolvedValue(settingsRow as never);
    vi.mocked(repo.upsertOrganizationSettings).mockResolvedValue(settingsRow as never);
    await updateGeneralSettings({default_date_format:"yyyy-mm-dd",default_time_format:"12h",default_locale:"en-US"});
    expect(repo.upsertOrganizationSettings).toHaveBeenCalledWith("org-1",{default_date_format:"yyyy-mm-dd",default_time_format:"12h",default_locale:"en-US"},"user-1");
    expect(repo.insertAuditLog).toHaveBeenCalledWith(expect.objectContaining({organizationId:"org-1",actorUserId:"user-1",action:"settings.general.update"}));
  });
});

describe("settings.service defaults and context",()=>{
  it("returns database defaults when no settings row exists",async()=>{
    vi.mocked(repo.findOrganizationProfile).mockResolvedValue(orgRow as never);
    vi.mocked(repo.findOrganizationSettings).mockResolvedValue(null);
    const context=await getSettingsContext();
    expect(context.effective.online_booking_enabled).toBe(true);
    expect(context.effective.booking_max_advance_days).toBe(30);
    expect(context.effective.brand_color).toBe("#0d9488");
    expect(context.effective.organization_id).toBe("org-1");
  });

  it("overlays stored settings on top of defaults",async()=>{
    vi.mocked(repo.findOrganizationProfile).mockResolvedValue(orgRow as never);
    vi.mocked(repo.findOrganizationSettings).mockResolvedValue({...settingsRow,online_booking_enabled:false,reminder_hours_before:48} as never);
    const context=await getSettingsContext();
    expect(context.effective.online_booking_enabled).toBe(false);
    expect(context.effective.reminder_hours_before).toBe(48);
    expect(context.effective.default_date_format).toBe("d mmm yyyy");
  });
});

describe("settings.service organization profile",()=>{
  it("audits before/after values for changed keys only",async()=>{
    vi.mocked(repo.findOrganizationProfile).mockResolvedValue(orgRow as never);
    vi.mocked(repo.updateOrganizationProfile).mockResolvedValue({...orgRow,name:"Renamed Clinic"} as never);
    await updateOrganizationProfile({name:"Renamed Clinic"});
    const auditCall=vi.mocked(repo.insertAuditLog).mock.calls[0]?.[0];
    expect(auditCall?.action).toBe("settings.organization.update");
    expect(auditCall?.before).toEqual({name:"Test Clinic"});
    expect(auditCall?.after).toEqual({name:"Renamed Clinic"});
  });

  it("updates localization through the organization record",async()=>{
    vi.mocked(repo.findOrganizationProfile).mockResolvedValue(orgRow as never);
    vi.mocked(repo.updateOrganizationProfile).mockResolvedValue({...orgRow,timezone:"UTC",currency_code:"USD"} as never);
    await updateLocalizationSettings({timezone:"UTC",currency_code:"USD"});
    expect(repo.updateOrganizationProfile).toHaveBeenCalledWith("org-1",{timezone:"UTC",currency_code:"USD"});
    expect(repo.insertAuditLog).toHaveBeenCalledWith(expect.objectContaining({action:"settings.localization.update"}));
  });
});

describe("settings.service logo upload",()=>{
  it("rejects unsupported mime types before touching storage",async()=>{
    vi.mocked(repo.findOrganizationProfile).mockResolvedValue(orgRow as never);
    const file=new File(["x"],"logo.gif",{type:"image/gif"});
    await expect(saveOrganizationLogo({file,remove:false})).rejects.toBeInstanceOf(ValidationError);
    expect(repo.updateOrganizationProfileAdmin).not.toHaveBeenCalled();
  });

  it("rejects files over 2 MB",async()=>{
    vi.mocked(repo.findOrganizationProfile).mockResolvedValue(orgRow as never);
    const file=new File([new Uint8Array(2*1024*1024+1)],"logo.png",{type:"image/png"});
    await expect(saveOrganizationLogo({file,remove:false})).rejects.toBeInstanceOf(ValidationError);
  });

  it("uploads a valid logo under the organization folder and audits the change",async()=>{
    vi.mocked(repo.findOrganizationProfile).mockResolvedValue(orgRow as never);
    const upload=vi.fn().mockResolvedValue({data:{path:"org-1/logo-x.png"},error:null});
    const remove=vi.fn().mockResolvedValue({data:null,error:null});
    const getPublicUrl=vi.fn(()=>({data:{publicUrl:"https://cdn.test/logo-x.png"}}));
    vi.mocked(createClient).mockResolvedValue({storage:{from:vi.fn(()=>({upload,remove,getPublicUrl}))}} as never);
    vi.mocked(repo.updateOrganizationProfileAdmin).mockResolvedValue({...orgRow,logo_path:"org-1/logo-x.png"} as never);
    const file=new File([new Uint8Array([1,2,3])],"logo.png",{type:"image/png"});
    const result=await saveOrganizationLogo({file,remove:false});
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^org-1\/logo-.+\.png$/),file,expect.anything());
    expect(repo.updateOrganizationProfileAdmin).toHaveBeenCalledWith("org-1",{logo_path:expect.stringMatching(/^org-1\/logo-/)});
    expect(result.logoUrl).toBe("https://cdn.test/logo-x.png");
    expect(repo.insertAuditLog).toHaveBeenCalledWith(expect.objectContaining({action:"settings.branding.logo"}));
  });
});
