"use client";

import { useMemo, useState } from "react";

export type PermissionItem = { key: string; description: string | null };

const GROUP_ORDER = ["patient", "appointment", "encounter", "clinical", "lab", "pharmacy", "billing", "inventory", "triage", "facility", "department", "service", "staff", "settings", "organization", "audit"];

function groupKey(permission: string) {
  return permission.split(".")[0] ?? permission;
}

export function PermissionPicker({
  permissions,
  selected,
  name = "permissions",
}: {
  permissions: PermissionItem[];
  selected: string[];
  name?: string;
}) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(selected));

  const groups = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const permission of permissions) {
      const key = groupKey(permission.key);
      const list = map.get(key) ?? [];
      list.push(permission);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => {
      const ai = GROUP_ORDER.indexOf(a);
      const bi = GROUP_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [permissions]);

  const toggle = (key: string) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (items: PermissionItem[], enable: boolean) => {
    setChecked((current) => {
      const next = new Set(current);
      for (const item of items) {
        if (enable) next.add(item.key);
        else next.delete(item.key);
      }
      return next;
    });
  };

  return (
    <div className="staff-permission-picker">
      {groups.map(([group, items]) => {
        const allOn = items.every((item) => checked.has(item.key));
        return (
          <fieldset className="staff-permission-group" key={group}>
            <legend>
              <span>{group.replace(/_/g, " ")}</span>
              <button
                className="staff-permission-group__toggle"
                onClick={() => toggleGroup(items, !allOn)}
                type="button"
              >
                {allOn ? "Clear" : "All"}
              </button>
            </legend>
            <div className="staff-permission-group__items">
              {items.map((permission) => (
                <label className="staff-permission-item" key={permission.key} title={permission.description ?? permission.key}>
                  <input
                    checked={checked.has(permission.key)}
                    name={name}
                    onChange={() => toggle(permission.key)}
                    type="checkbox"
                    value={permission.key}
                  />
                  <code>{permission.key}</code>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
