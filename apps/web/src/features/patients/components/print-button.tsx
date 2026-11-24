"use client";

export function PrintButton() {
  return <button className="btn" onClick={() => window.print()} type="button">Print / Save as PDF</button>;
}
