
    create index if not exists invoice_items_invoice_idx
      on public.invoice_items(invoice_id);

    create index if not exists prescription_items_prescription_idx
      on public.prescription_items(prescription_id);
  ;
