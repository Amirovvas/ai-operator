"use client";

import { useMemo, useState } from "react";
import { Building2, Mail, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import { useGetContacts } from "@/hooks/contacts/useGetContacts";
import { useCreateContact } from "@/hooks/contacts/useCreateContact";
import { useUpdateContact } from "@/hooks/contacts/useUpdateContact";
import { useDeleteContact } from "@/hooks/contacts/useDeleteContact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface IContact {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface IForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
}

const emptyForm: IForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  notes: "",
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const Contacts = () => {
  const { data: contacts, isLoading } = useGetContacts();
  const { mutate: createContact, isPending: isCreating } = useCreateContact();
  const { mutate: updateContact, isPending: isUpdating } = useUpdateContact();
  const { mutate: deleteContact } = useDeleteContact();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<IForm>(emptyForm);

  const list = (contacts as IContact[] | undefined) || [];
  // без useMemo пересчитывалось бы на каждый keystroke в форме создания/
  // редактирования контакта — та печать не имеет отношения к поиску
  const filtered = useMemo(
    () =>
      list.filter((contact) =>
        `${contact.name} ${contact.company} ${contact.email}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [list, search],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (contact: IContact) => {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      notes: contact.notes,
    });
    setOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      updateContact(
        { id: editingId, ...form },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      createContact(form, { onSuccess: () => setOpen(false) });
    }
  };

  return (
    <main className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Contacts</h1>
          <p className="text-xs text-muted-foreground">{list.length} total</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contacts..."
              className="w-56 pl-8"
            />
          </div>

          <Button onClick={openCreate}>
            <Plus /> Add contact
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading contacts...</p>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center">
            <p className="text-sm font-medium text-foreground">
              No contacts yet
            </p>
            <p className="text-xs text-muted-foreground">
              Add your first contact to get started.
            </p>
            <Button size="sm" onClick={openCreate} className="mt-2">
              <Plus /> Add contact
            </Button>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Contact</th>
                  <th className="px-4 py-2.5 font-medium">Company</th>
                  <th className="px-4 py-2.5 font-medium">Contact info</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filtered.map((contact) => (
                  <tr key={contact.id} className="group hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {initials(contact.name)}
                        </div>
                        <span className="font-medium text-foreground">
                          {contact.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {contact.company ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="size-3.5" /> {contact.company}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        {contact.email && (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <Mail className="size-3.5" /> {contact.email}
                          </span>
                        )}
                        {contact.phone && (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <Phone className="size-3.5" /> {contact.phone}
                          </span>
                        )}
                        {!contact.email && !contact.phone && "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(contact)}
                        >
                          <Pencil />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => deleteContact(contact.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>
                {editingId ? "Edit contact" : "Add contact"}
              </SheetTitle>
              <SheetDescription>
                {editingId
                  ? "Update this contact's details."
                  : "Add a new contact to your CRM."}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Name
                </label>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, name: event.target.value }))
                  }
                  placeholder="Contact name"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Company
                </label>
                <Input
                  value={form.company}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, company: event.target.value }))
                  }
                  placeholder="Company name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((f) => ({ ...f, email: event.target.value }))
                    }
                    placeholder="contact@company.com"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Phone
                  </label>
                  <Input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((f) => ({ ...f, phone: event.target.value }))
                    }
                    placeholder="+1 555 123 4567"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, notes: event.target.value }))
                  }
                  placeholder="Notes about this contact..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </div>
            </div>

            <SheetFooter>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {editingId ? "Save changes" : "Add contact"}
              </Button>
              <SheetClose render={<Button type="button" variant="outline" />}>
                Cancel
              </SheetClose>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </main>
  );
};

export default Contacts;
