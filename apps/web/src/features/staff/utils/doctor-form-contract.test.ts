import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const components = [
  "../components/staff-detail-manager.tsx",
  "../components/public-profile-editor.tsx",
  "../components/publishing-controls.tsx",
];

function source(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

function tagName(node: ts.JsxOpeningLikeElement) {
  return node.tagName.getText();
}

describe("unified Doctor form boundaries", () => {
  it("contains no nested forms and gives every button an explicit type", () => {
    for (const component of components) {
      const file = ts.createSourceFile(component, source(component), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node, formDepth = 0) => {
        const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
        const isForm = opening ? tagName(opening) === "form" : false;
        if (isForm) expect(formDepth, `${component} contains a nested form`).toBe(0);
        if (opening && tagName(opening) === "button") {
          const typeAttribute = opening.attributes.properties.find((property) => ts.isJsxAttribute(property) && property.name.getText() === "type");
          expect(typeAttribute, `${component} contains a button without an explicit type`).toBeTruthy();
        }
        node.forEachChild((child) => visit(child, formDepth + (isForm ? 1 : 0)));
      };
      visit(file);
    }
  });

  it("keeps profile and publishing submissions independent", () => {
    expect(source("../components/public-profile-editor.tsx")).toContain("saveClinicianProfileAction");
    expect(source("../components/publishing-controls.tsx")).toContain("saveClinicianPublishingAction");
    expect(source("../components/publishing-controls.tsx")).not.toContain("saveClinicianProfileAction");
  });

  it("keeps select, drop, preview, replace and remove photo behavior in one editor", () => {
    const profileEditor = source("../components/public-profile-editor.tsx");
    for (const behavior of ["onDragEnter", "onDragOver", "onDragLeave", "onDrop", "Select image", "Replace image", "Remove image", "doctor_photo"]) {
      expect(profileEditor).toContain(behavior);
    }
  });
});
