"use client";

import {
  Archive,
  ArrowUpRight,
  BadgePercent,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  Eye,
  EyeOff,
  FileImage,
  ImagePlus,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MessageCircleMore,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/catalog";
import type { Campaign, Category, Product, QuoteSummary } from "@/lib/types";

type Tab = "overview" | "products" | "campaign" | "quotes";
type ProductDraft = Omit<Product, "categorySlug" | "categoryName">;

const emptyProduct: ProductDraft = {
  id: "",
  slug: "",
  name: "",
  eyebrow: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  priceCents: null,
  oldPriceCents: null,
  priceLabel: null,
  badge: null,
  features: [],
  images: [],
  active: true,
  featured: false,
  sortOrder: 100,
};

function toDraft(product: Product): ProductDraft {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    eyebrow: product.eyebrow,
    shortDescription: product.shortDescription,
    description: product.description,
    categoryId: product.categoryId,
    priceCents: product.priceCents,
    oldPriceCents: product.oldPriceCents,
    priceLabel: product.priceLabel,
    badge: product.badge,
    features: [...product.features],
    images: [...product.images],
    active: product.active,
    featured: product.featured,
    sortOrder: product.sortOrder,
  };
}

function currencyInput(value: number | null) {
  return value === null ? "" : (value / 100).toFixed(2).replace(".", ",");
}

function parseCurrency(value: string) {
  if (!value.trim()) return null;
  const normalized = value.replace(/\s/g, "").replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function makeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function AdminDashboard({
  products: initialProducts,
  categories,
  campaign: initialCampaign,
  quotes: initialQuotes,
  adminName,
  signOutPath,
}: {
  products: Product[];
  categories: Category[];
  campaign: Campaign;
  quotes: QuoteSummary[];
  adminName: string;
  signOutPath: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [products, setProducts] = useState(initialProducts);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [campaign, setCampaign] = useState(initialCampaign);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<QuoteSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const campaignFileRef = useRef<HTMLInputElement>(null);

  const visibleProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => !needle || `${product.name} ${product.categoryName}`.toLowerCase().includes(needle));
  }, [products, search]);

  const activeProducts = products.filter((product) => product.active).length;
  const offers = products.filter((product) => product.active && product.oldPriceCents).length;
  const newQuotes = quotes.filter((quote) => quote.status === "novo").length;

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Visão geral", icon: <LayoutDashboard size={18} /> },
    { id: "products", label: "Produtos", icon: <Boxes size={18} /> },
    { id: "campaign", label: "Destaque do site", icon: <BadgePercent size={18} /> },
    { id: "quotes", label: "Orçamentos", icon: <MessageCircleMore size={18} /> },
  ];

  const navigate = (next: Tab) => {
    setTab(next);
    setMobileNav(false);
  };

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  };

  async function uploadImage(file: File) {
    if (!draft) return;
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Falha no upload.");
      setDraft((current) => current ? { ...current, images: [...current.images, data.url as string] } : current);
      flash("Imagem enviada.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function uploadCampaignImage(file: File) {
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Falha no upload.");
      setCampaign((current) => ({ ...current, imageUrl: data.url as string }));
      flash("Nova imagem carregada. Salve o destaque para publicar.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
      if (campaignFileRef.current) campaignFileRef.current.value = "";
    }
  }

  async function saveProduct() {
    if (!draft || saving) return;
    if (!draft.name.trim() || !draft.slug.trim() || !draft.categoryId) {
      flash("Preencha nome, endereço e categoria.");
      return;
    }
    setSaving(true);
    try {
      const isNew = !draft.id;
      const response = await fetch(isNew ? "/api/admin/products" : `/api/admin/products/${draft.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.");
      const category = categories.find((item) => item.id === draft.categoryId);
      const fullProduct: Product = {
        ...draft,
        id: draft.id || (data.id as string),
        categoryName: category?.name ?? "",
        categorySlug: category?.slug ?? "",
      };
      setProducts((current) => isNew ? [...current, fullProduct] : current.map((item) => item.id === fullProduct.id ? fullProduct : item));
      setDraft(null);
      flash(isNew ? "Produto criado." : "Produto atualizado.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Excluir “${product.name}”? Essa ação remove o produto e as imagens enviadas para ele.`)) return;
    const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    if (response.ok) {
      setProducts((current) => current.filter((item) => item.id !== product.id));
      flash("Produto excluído.");
    } else {
      flash("Não foi possível excluir o produto.");
    }
  }

  async function saveCampaign() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/campaign", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(campaign),
      });
      if (!response.ok) throw new Error("Não foi possível salvar o destaque.");
      flash("Destaque atualizado.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function updateQuoteStatus(id: string, status: string) {
    const response = await fetch(`/api/admin/quotes/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (response.ok) {
      setQuotes((current) => current.map((quote) => quote.id === id ? { ...quote, status } : quote));
      flash("Status atualizado.");
    } else {
      flash("Não foi possível atualizar o status.");
    }
  }

  return (
    <main className="admin-shell">
      <aside className={`admin-sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="admin-brand"><img src="/brand/logo-horizontal-clara.svg" alt="Rony Móveis" /><span>Administração</span></div>
        <nav>
          {navItems.map((item) => (
            <button className={tab === item.id ? "is-active" : ""} onClick={() => navigate(item.id)} key={item.id}>{item.icon}<span>{item.label}</span>{item.id === "quotes" && newQuotes > 0 && <b>{newQuotes}</b>}</button>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <a href="/" target="_blank">Ver site <ArrowUpRight size={15} /></a>
          <a href={signOutPath}>Sair <LogOut size={15} /></a>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-button" onClick={() => setMobileNav((value) => !value)}>{mobileNav ? <X size={20} /> : <Menu size={20} />}</button>
          <div><span>Painel Rony Móveis</span><strong>Olá, {adminName.split(" ")[0]}</strong></div>
          <a href="/" target="_blank">Visualizar site <ArrowUpRight size={15} /></a>
        </header>

        <div className="admin-content">
          {tab === "overview" && (
            <section className="admin-view">
              <div className="admin-page-title"><div><span>Visão geral</span><h1>O que está acontecendo no site.</h1></div><button className="admin-primary" onClick={() => { setDraft({ ...emptyProduct, categoryId: categories[0]?.id ?? "" }); setTab("products"); }}><Plus size={17} /> Novo produto</button></div>
              <div className="admin-stats">
                <article><span className="stat-icon"><Boxes size={19} /></span><p>Produtos visíveis</p><strong>{activeProducts}</strong><button onClick={() => navigate("products")}>Gerenciar <ChevronRight size={14} /></button></article>
                <article><span className="stat-icon"><CircleDollarSign size={19} /></span><p>Ofertas ativas</p><strong>{offers}</strong><button onClick={() => navigate("products")}>Revisar <ChevronRight size={14} /></button></article>
                <article><span className="stat-icon"><MessageCircleMore size={19} /></span><p>Novos orçamentos</p><strong>{newQuotes}</strong><button onClick={() => navigate("quotes")}>Atender <ChevronRight size={14} /></button></article>
              </div>
              <div className="admin-overview-grid">
                <article className="admin-panel">
                  <div className="admin-panel-head"><div><span>Produtos</span><h2>Atualizados recentemente</h2></div><button onClick={() => navigate("products")}>Ver todos</button></div>
                  <div className="admin-mini-list">
                    {products.slice(0, 5).map((product) => <div key={product.id}><img src={product.images[0]} alt="" /><p><strong>{product.name}</strong><span>{product.categoryName}</span></p><em className={product.active ? "is-active" : ""}>{product.active ? "Visível" : "Oculto"}</em></div>)}
                  </div>
                </article>
                <article className="admin-panel admin-hero-preview">
                  <div className="admin-panel-head"><div><span>Página inicial</span><h2>Destaque atual</h2></div><button onClick={() => navigate("campaign")}>Editar</button></div>
                  <img src={campaign.imageUrl} alt="" />
                  <h3>{campaign.title}</h3>
                  <p>{campaign.description}</p>
                </article>
              </div>
            </section>
          )}

          {tab === "products" && (
            <section className="admin-view">
              <div className="admin-page-title"><div><span>Catálogo</span><h1>Produtos e projetos.</h1></div><button className="admin-primary" onClick={() => setDraft({ ...emptyProduct, categoryId: categories[0]?.id ?? "" })}><PackagePlus size={17} /> Adicionar produto</button></div>
              <div className="admin-toolbar"><label><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto…" /></label><span>{visibleProducts.length} itens</span></div>
              <div className="admin-product-table">
                <div className="admin-table-head"><span>Produto</span><span>Categoria</span><span>Preço</span><span>Status</span><span>Ações</span></div>
                {visibleProducts.map((product) => (
                  <article key={product.id}>
                    <div className="admin-product-name"><img src={product.images[0]} alt="" /><p><strong>{product.name}</strong><span>/{product.slug}</span></p></div>
                    <span>{product.categoryName}</span>
                    <span>{formatPrice(product.priceCents) ?? product.priceLabel ?? "Sob consulta"}</span>
                    <span className={`admin-status ${product.active ? "is-active" : ""}`}>{product.active ? <Eye size={14} /> : <EyeOff size={14} />}{product.active ? "Visível" : "Oculto"}{product.featured && <Star size={13} fill="currentColor" />}</span>
                    <div className="admin-row-actions"><button onClick={() => setDraft(toDraft(product))} aria-label={`Editar ${product.name}`}><Pencil size={16} /></button><button onClick={() => deleteProduct(product)} aria-label={`Excluir ${product.name}`}><Trash2 size={16} /></button></div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {tab === "campaign" && (
            <section className="admin-view">
              <div className="admin-page-title"><div><span>Página inicial</span><h1>Destaque principal.</h1></div><button className="admin-primary" onClick={saveCampaign} disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Salvar destaque</button></div>
              <div className="campaign-editor">
                <div className="admin-form-card">
                  <label><span>Chamada pequena</span><input value={campaign.eyebrow} onChange={(event) => setCampaign({ ...campaign, eyebrow: event.target.value })} /></label>
                  <label><span>Título principal</span><textarea rows={3} value={campaign.title} onChange={(event) => setCampaign({ ...campaign, title: event.target.value })} /></label>
                  <label><span>Texto de apoio</span><textarea rows={4} value={campaign.description} onChange={(event) => setCampaign({ ...campaign, description: event.target.value })} /></label>
                  <div className="admin-form-columns"><label><span>Texto do botão</span><input value={campaign.ctaLabel} onChange={(event) => setCampaign({ ...campaign, ctaLabel: event.target.value })} /></label><label><span>Destino do botão</span><input value={campaign.ctaHref} onChange={(event) => setCampaign({ ...campaign, ctaHref: event.target.value })} /></label></div>
                  <label><span>Endereço da imagem</span><input value={campaign.imageUrl} onChange={(event) => setCampaign({ ...campaign, imageUrl: event.target.value })} /></label>
                  <div className="campaign-upload"><input ref={campaignFileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && uploadCampaignImage(event.target.files[0])} /><button type="button" onClick={() => campaignFileRef.current?.click()} disabled={uploading}>{uploading ? <LoaderCircle className="spin" size={16} /> : <ImagePlus size={16} />} Enviar uma nova imagem</button><small>JPG, PNG ou WebP de até 8 MB.</small></div>
                  <label className="admin-toggle"><input type="checkbox" checked={campaign.active} onChange={(event) => setCampaign({ ...campaign, active: event.target.checked })} /><span>Exibir este destaque na página inicial</span></label>
                </div>
                <div className="campaign-preview"><span>Prévia</span><div><img src={campaign.imageUrl} alt="" /><section><small>{campaign.eyebrow}</small><h2>{campaign.title}</h2><p>{campaign.description}</p><b>{campaign.ctaLabel}</b></section></div></div>
              </div>
            </section>
          )}

          {tab === "quotes" && (
            <section className="admin-view">
              <div className="admin-page-title"><div><span>Atendimento</span><h1>Pedidos de orçamento.</h1></div></div>
              {quotes.length ? (
                <div className="quote-admin-list">
                  {quotes.map((quote) => {
                    const digits = quote.phone.replace(/\D/g, "");
                    const number = digits.startsWith("55") ? digits : `55${digits}`;
                    return <article key={quote.id}><div className="quote-admin-id"><span>{quote.id.slice(0, 8).toUpperCase()}</span><small>{new Date(quote.createdAt).toLocaleDateString("pt-BR")}</small></div><div><strong>{quote.name}</strong><span>{quote.projectType} · {quote.phone}</span></div><select value={quote.status} onChange={(event) => updateQuoteStatus(quote.id, event.target.value)}><option value="novo">Novo</option><option value="em_atendimento">Em atendimento</option><option value="concluido">Concluído</option><option value="arquivado">Arquivado</option></select><div className="quote-row-actions"><button onClick={() => setSelectedQuote(quote)}>Detalhes <Eye size={14} /></button><a href={`https://wa.me/${number}?text=${encodeURIComponent(`Olá, ${quote.name}! Aqui é da Rony Móveis. Recebemos seu pedido de orçamento ${quote.id.slice(0, 8).toUpperCase()}.`)}`} target="_blank" rel="noreferrer">Responder <ArrowUpRight size={14} /></a></div></article>;
                  })}
                </div>
              ) : (
                <div className="admin-empty"><Archive size={26} /><h2>Nenhum orçamento por aqui ainda.</h2><p>Os pedidos enviados pelo formulário aparecerão nesta área.</p></div>
              )}
            </section>
          )}
        </div>
      </section>

      {selectedQuote && (
        <div className="admin-modal-layer">
          <button className="admin-modal-scrim" onClick={() => setSelectedQuote(null)} aria-label="Fechar detalhes" />
          <section className="quote-detail-panel" role="dialog" aria-modal="true" aria-label="Detalhes do orçamento">
            <header><div><span>Orçamento {selectedQuote.id.slice(0, 8).toUpperCase()}</span><h2>{selectedQuote.name}</h2></div><button onClick={() => setSelectedQuote(null)} aria-label="Fechar"><X size={20} /></button></header>
            <div className="quote-detail-body">
              <div className="quote-detail-grid"><div><span>WhatsApp</span><strong>{selectedQuote.phone}</strong></div><div><span>E-mail</span><strong>{selectedQuote.email || "Não informado"}</strong></div><div><span>Cidade</span><strong>{selectedQuote.city}</strong></div><div><span>Prazo</span><strong>{selectedQuote.timeline}</strong></div><div><span>Tipo</span><strong>{selectedQuote.projectType}</strong></div><div><span>Faixa</span><strong>{selectedQuote.budget || "Não informada"}</strong></div></div>
              <section><span>Interesses</span><div className="quote-detail-tags">{selectedQuote.categories.map((item) => <b key={item}>{item}</b>)}</div></section>
              {selectedQuote.selectedProducts.length > 0 && <section><span>Produtos selecionados</span><ul>{selectedQuote.selectedProducts.map((item) => <li key={item.slug}>{item.name} <small>{item.quantity}x</small></li>)}</ul></section>}
              {selectedQuote.dimensions && <section><span>Ambiente e medidas</span><p>{selectedQuote.dimensions}</p></section>}
              {selectedQuote.notes && <section><span>Observações</span><p>{selectedQuote.notes}</p></section>}
              {selectedQuote.files.length > 0 && <section><span>Referências enviadas</span><div className="quote-detail-images">{selectedQuote.files.map((file) => <a href={file.url} target="_blank" rel="noreferrer" key={file.url}><img src={file.url} alt={file.filename} /><small>{file.filename}</small></a>)}</div></section>}
            </div>
          </section>
        </div>
      )}

      {draft && (
        <div className="admin-modal-layer">
          <button className="admin-modal-scrim" onClick={() => setDraft(null)} aria-label="Fechar edição" />
          <section className="product-editor" role="dialog" aria-modal="true" aria-label="Editar produto">
            <header><div><span>{draft.id ? "Editar produto" : "Novo produto"}</span><h2>{draft.name || "Produto sem nome"}</h2></div><button onClick={() => setDraft(null)} aria-label="Fechar"><X size={20} /></button></header>
            <div className="product-editor-body">
              <div className="admin-form-card">
                <div className="admin-form-columns"><label><span>Nome *</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value, slug: draft.id ? draft.slug : makeSlug(event.target.value) })} /></label><label><span>Endereço *</span><input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: makeSlug(event.target.value) })} /></label></div>
                <div className="admin-form-columns"><label><span>Categoria *</span><select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label><span>Chamada curta</span><input value={draft.eyebrow} onChange={(event) => setDraft({ ...draft, eyebrow: event.target.value })} placeholder="Ex.: Base excêntrica" /></label></div>
                <label><span>Resumo do card</span><textarea rows={2} value={draft.shortDescription} onChange={(event) => setDraft({ ...draft, shortDescription: event.target.value })} /></label>
                <label><span>Descrição completa</span><textarea rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
                <div className="admin-form-columns"><label><span>Preço atual</span><input value={currencyInput(draft.priceCents)} onChange={(event) => setDraft({ ...draft, priceCents: parseCurrency(event.target.value) })} inputMode="decimal" placeholder="1.580,00" /></label><label><span>Preço anterior (DE)</span><input value={currencyInput(draft.oldPriceCents)} onChange={(event) => setDraft({ ...draft, oldPriceCents: parseCurrency(event.target.value) })} inputMode="decimal" placeholder="2.119,49" /></label></div>
                <div className="admin-form-columns"><label><span>Texto quando não há preço</span><input value={draft.priceLabel ?? ""} onChange={(event) => setDraft({ ...draft, priceLabel: event.target.value || null })} placeholder="Sob medida" /></label><label><span>Selo</span><input value={draft.badge ?? ""} onChange={(event) => setDraft({ ...draft, badge: event.target.value || null })} placeholder="Oferta, Novidade…" /></label></div>
                <label><span>Diferenciais <small>(um por linha)</small></span><textarea rows={4} value={draft.features.join("\n")} onChange={(event) => setDraft({ ...draft, features: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label>
                <div className="admin-form-columns"><label><span>Ordem no catálogo</span><input type="number" min="0" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) || 0 })} /></label><div className="admin-toggle-stack"><label className="admin-toggle"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /><span>Visível no site</span></label><label className="admin-toggle"><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} /><span>Mostrar em destaque</span></label></div></div>
              </div>

              <div className="product-image-editor">
                <div className="product-image-editor-head"><div><FileImage size={18} /><span>Fotos do produto</span></div><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && uploadImage(event.target.files[0])} /><button onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />} Enviar foto</button></div>
                {draft.images.length ? <div className="product-image-list">{draft.images.map((image, index) => <div key={`${image}-${index}`}><img src={image} alt="" /><span>{index === 0 ? "Capa" : `Foto ${index + 1}`}</span><button onClick={() => setDraft({ ...draft, images: draft.images.filter((_, imageIndex) => imageIndex !== index) })} aria-label="Remover imagem"><Trash2 size={15} /></button></div>)}</div> : <div className="product-image-empty"><ImagePlus size={28} /><strong>Adicione a primeira foto</strong><span>A primeira imagem será usada como capa.</span></div>}
                <label className="manual-image-url"><span>Ou use um endereço de imagem</span><div><input placeholder="/images/… ou https://…" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); const value = event.currentTarget.value.trim(); if (value) { setDraft({ ...draft, images: [...draft.images, value] }); event.currentTarget.value = ""; } } }} /><button onClick={(event) => { const input = event.currentTarget.previousElementSibling as HTMLInputElement; const value = input.value.trim(); if (value) { setDraft({ ...draft, images: [...draft.images, value] }); input.value = ""; } }}><Plus size={16} /></button></div></label>
              </div>
            </div>
            <footer><button className="admin-secondary" onClick={() => setDraft(null)}>Cancelar</button><button className="admin-primary" onClick={saveProduct} disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}{saving ? "Salvando…" : "Salvar produto"}</button></footer>
          </section>
        </div>
      )}

      {notice && <div className="admin-notice"><Check size={16} /> {notice}</div>}
    </main>
  );
}
