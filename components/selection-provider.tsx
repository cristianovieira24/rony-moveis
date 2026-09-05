"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { SITE_URL } from "@/lib/catalog";
import { whatsappUrl } from "@/lib/whatsapp";

export type SelectionItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  quantity: number;
};

type SelectionContextValue = {
  items: SelectionItem[];
  total: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: Omit<SelectionItem, "quantity">) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  has: (id: string) => boolean;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);
const STORAGE_KEY = "rony-moveis-selection";

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SelectionItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) setItems(JSON.parse(stored));
      } catch {
        // A seleção é apenas uma conveniência local; o catálogo continua utilizável.
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignora bloqueios de armazenamento do navegador.
    }
  }, [hydrated, items]);

  const add = useCallback((item: Omit<SelectionItem, "quantity">) => {
    setItems((current) => {
      if (current.some((entry) => entry.id === item.id)) return current;
      return [...current, { ...item, quantity: 1 }];
    });
    setOpen(true);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) } : item,
      ),
    );
  }, []);

  const value = useMemo<SelectionContextValue>(
    () => ({
      items,
      total: items.reduce((sum, item) => sum + item.quantity, 0),
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      add,
      remove,
      setQuantity,
      has: (id) => items.some((item) => item.id === id),
    }),
    [add, isOpen, items, remove, setQuantity],
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
      <SelectionDrawer />
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) throw new Error("useSelection precisa estar dentro de SelectionProvider");
  return context;
}

function SelectionDrawer() {
  const { items, total, isOpen, close, remove, setQuantity } = useSelection();
  const message = [
    "Olá, Rony Móveis! Montei uma seleção no site e gostaria de atendimento:",
    "",
    ...items.map(
      (item, index) => `${index + 1}. ${item.name} — qtd. ${item.quantity}\n${SITE_URL}/produto/${item.slug}`,
    ),
    "",
    "Podem me informar disponibilidade, opções e condições?",
  ].join("\n");

  return (
    <div className={`selection-layer ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
      <button className="selection-scrim" onClick={close} aria-label="Fechar seleção" />
      <aside className="selection-drawer" aria-label="Minha seleção" role="dialog" aria-modal="true">
        <div className="selection-head">
          <div>
            <span className="eyebrow">Pedido de atendimento</span>
            <h2>Minha seleção</h2>
          </div>
          <button className="icon-button" onClick={close} aria-label="Fechar">
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="selection-empty">
            <span className="selection-empty-icon"><ShoppingBag size={26} strokeWidth={1.5} /></span>
            <h3>Guarde o que chamou sua atenção.</h3>
            <p>Adicione produtos e envie tudo junto para a nossa equipe pelo WhatsApp.</p>
            <button className="text-link" onClick={close}>Continuar explorando <ChevronRight size={16} /></button>
          </div>
        ) : (
          <>
            <div className="selection-list">
              {items.map((item) => (
                <article className="selection-item" key={item.id}>
                  <img src={item.image} alt="" />
                  <div className="selection-item-copy">
                    <strong>{item.name}</strong>
                    <div className="quantity-control" aria-label={`Quantidade de ${item.name}`}>
                      <button onClick={() => setQuantity(item.id, item.quantity - 1)} aria-label="Diminuir">
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => setQuantity(item.id, item.quantity + 1)} aria-label="Aumentar">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <button className="selection-remove" onClick={() => remove(item.id)} aria-label={`Remover ${item.name}`}>
                    <Trash2 size={17} strokeWidth={1.7} />
                  </button>
                </article>
              ))}
            </div>
            <div className="selection-foot">
              <p><Check size={16} /> {total} {total === 1 ? "item selecionado" : "itens selecionados"}</p>
              <a className="button button-whatsapp button-full" href={whatsappUrl(message)} target="_blank" rel="noreferrer">
                Pedir atendimento no WhatsApp <ChevronRight size={18} />
              </a>
              <small>Nenhuma compra é feita pelo site. Nossa equipe confirma tudo com você.</small>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
