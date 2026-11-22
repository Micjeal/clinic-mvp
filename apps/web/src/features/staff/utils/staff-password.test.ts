import {describe,expect,it} from "vitest";
import {staffPasswordChangeSchema} from "@clinic/validation";

describe("staff temporary password setup",()=>{
  it("requires a 12-character password and matching confirmation",()=>{
    expect(staffPasswordChangeSchema.safeParse({currentPassword:"temporary-password",newPassword:"short",confirmPassword:"short"}).success).toBe(false);
    expect(staffPasswordChangeSchema.safeParse({currentPassword:"temporary-password",newPassword:"a private passphrase",confirmPassword:"a private passphrase"}).success).toBe(true);
    expect(staffPasswordChangeSchema.safeParse({currentPassword:"temporary-password",newPassword:"a private passphrase",confirmPassword:"another passphrase"}).success).toBe(false);
  });
});
