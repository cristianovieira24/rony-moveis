"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileImage,
  LoaderCircle,
  MessageCircle,
  Upload,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { whatsappUrl } from "@/lib/whatsapp";
import { useSelection } from "./selection-provider";

const projectTypes = [
  { value: "produto", label: "Um produto", detail: "Cadeira, poltrona, mesa ou outro item" },
  { value: "planejado", label: "Móvel planejado", detail: "Projeto sob medida para um ambiente" },
  { value: "ambiente", label: "Ambiente completo", detail: "Casa, escritório ou espaço comercial" },
];

const interests = [
  "Cadeiras de escritório",
  "Poltronas",
  "Mesas e estações",
  "Armários e organização",
  "Estofados",
  "Móveis planejados",
  "Móveis de aço",
];

const budgets = ["Até R$ 2 mil", "R$ 2 a 5 mil", "R$ 5 a 10 mil", "Acima de R$ 10 mil", "Prefiro conversar"];
const timelines = ["O quanto antes", "Nos próximos 30 dias", "Entre 1 e 3 meses", "Ainda estou pesquisando"];

export function QuoteWizard() {
  const { items } = useSelection();
  const [step, setStep] = useState(1);
  const [projectType, setProjectType] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Goiânia");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const progress = `${(step / 3) * 100}%`;
  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(projectType && categories.length);
    if (step === 2) return Boolean(timeline);
    return Boolean(name.trim() && phone.trim().length >= 8);
  }, [categories.length, name, phone, projectType, step, timeline]);

  const toggleInterest = (value: string) => {
    setCategories((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter((file) => file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024);
    setFiles((current) => [...current, ...valid].slice(0, 3));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canContinue || submitting) return;
    setSubmitting(true);
    setError("");

    const payload = new FormData();
    payload.set("name", name);
    payload.set("phone", phone);
    payload.set("email", email);
    payload.set("city", city);
    payload.set("projectType", projectType);
    payload.set("categories", JSON.stringify(categories));
    payload.set("selectedProducts", JSON.stringify(items.map((item) => ({ name: item.name, slug: item.slug, quantity: item.quantity }))));
    payload.set("dimensions", dimensions);
    payload.set("budget", budget);
    payload.set("timeline", timeline);
    payload.set("notes", notes);
    files.forEach((file) => payload.append("files", file));

    try {
      const response = await fetch("/api/quotes", { method: "POST", body: payload });
      const data = (await response.json()) as { whatsappUrl?: string; error?: string };
      if (!response.ok || !data.whatsappUrl) throw new Error(data.error || "Não foi possível enviar agora.");
      window.location.href = data.whatsappUrl;
    } catch (cause) {
      const fallback = [
        "Olá, Rony Móveis! Gostaria de solicitar um orçamento.",
        `Nome: ${name}`,
        `Interesse: ${categories.join(", ")}`,
        dimensions ? `Medidas/ambiente: ${dimensions}` : "",
        budget ? `Faixa: ${budget}` : "",
        timeline ? `Prazo: ${timeline}` : "",
        notes ? `Observações: ${notes}` : "",
      ].filter(Boolean).join("\n");
      setError(cause instanceof Error ? cause.message : "Houve um problema ao salvar os dados.");
      window.open(whatsappUrl(fallback), "_blank", "noopener,noreferrer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="quote-wizard">
      <div className="quote-progress" aria-label={`Etapa ${step} de 3`}>
        <div className="quote-progress-bar"><span style={{ width: progress }} /></div>
        <span>0{step} / 03</span>
      </div>

      <form onSubmit={submit}>
        {step === 1 && (
          <div className="quote-step quote-step-active">
            <div className="quote-step-head">
              <span>Etapa 01</span>
              <h2>O que você está buscando?</h2>
              <p>Escolha a opção mais próxima. Você pode explicar melhor depois.</p>
            </div>
            <div className="choice-grid choice-grid-three">
              {projectTypes.map((item) => (
                <button type="button" className={`choice-card ${projectType === item.value ? "is-selected" : ""}`} onClick={() => setProjectType(item.value)} key={item.value}>
                  <span className="choice-check">{projectType === item.value && <Check size={15} />}</span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </button>
              ))}
            </div>
            <fieldset className="interest-fieldset">
              <legend>O que entra nessa conversa?</legend>
              <div className="interest-pills">
                {interests.map((item) => (
                  <button type="button" className={categories.includes(item) ? "is-selected" : ""} onClick={() => toggleInterest(item)} key={item}>
                    {categories.includes(item) && <Check size={14} />} {item}
                  </button>
                ))}
              </div>
            </fieldset>
            {items.length > 0 && (
              <div className="quote-selection-note"><Check size={17} /><p>Também vamos incluir {items.length} {items.length === 1 ? "produto que você guardou" : "produtos que você guardou"} na sua seleção.</p></div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="quote-step quote-step-active">
            <div className="quote-step-head">
              <span>Etapa 02</span>
              <h2>Ajude a gente a entender o cenário.</h2>
              <p>Mesmo uma informação aproximada já melhora bastante o atendimento.</p>
            </div>
            <label className="form-field form-field-wide">
              <span>Ambiente e medidas <small>(opcional)</small></span>
              <textarea value={dimensions} onChange={(event) => setDimensions(event.target.value)} rows={4} placeholder="Ex.: home office de 2,80 × 3,20 m; preciso de bancada, armário e espaço para impressora." />
            </label>
            <div className="form-columns">
              <fieldset className="form-field">
                <legend>Faixa de investimento <small>(opcional)</small></legend>
                <div className="stacked-options">
                  {budgets.map((item) => <button type="button" className={budget === item ? "is-selected" : ""} onClick={() => setBudget(item)} key={item}>{budget === item && <Check size={14} />}{item}</button>)}
                </div>
              </fieldset>
              <fieldset className="form-field">
                <legend>Quando você pretende resolver?</legend>
                <div className="stacked-options">
                  {timelines.map((item) => <button type="button" className={timeline === item ? "is-selected" : ""} onClick={() => setTimeline(item)} key={item}>{timeline === item && <Check size={14} />}{item}</button>)}
                </div>
              </fieldset>
            </div>
            <label className="form-field form-field-wide">
              <span>Mais alguma informação? <small>(opcional)</small></span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Cores, materiais, quantidade, restrições ou qualquer detalhe importante." />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="quote-step quote-step-active">
            <div className="quote-step-head">
              <span>Etapa 03</span>
              <h2>Para quem a gente responde?</h2>
              <p>Seu pedido será registrado e a conversa continua pelo WhatsApp.</p>
            </div>
            <div className="form-columns contact-fields">
              <label className="form-field"><span>Seu nome *</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos chamar você?" autoComplete="name" /></label>
              <label className="form-field"><span>WhatsApp *</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(62) 99999-9999" inputMode="tel" autoComplete="tel" /></label>
              <label className="form-field"><span>E-mail <small>(opcional)</small></span><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" type="email" autoComplete="email" /></label>
              <label className="form-field"><span>Cidade</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Goiânia" autoComplete="address-level2" /></label>
            </div>
            <div className="upload-zone">
              <input id="quote-files" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => addFiles(event.target.files)} />
              <label htmlFor="quote-files"><Upload size={22} /><strong>Adicionar fotos ou referências</strong><span>Até 3 imagens, com no máximo 5 MB cada.</span></label>
            </div>
            {files.length > 0 && (
              <div className="upload-list">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`}><FileImage size={18} /><span>{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover ${file.name}`}><X size={15} /></button></div>
                ))}
              </div>
            )}
            <div className="quote-final-note"><MessageCircle size={19} /><p>Ao continuar, o WhatsApp será aberto com um resumo pronto. Você revisa a mensagem antes de enviar.</p></div>
            {error && <p className="form-error">{error} O WhatsApp foi aberto mesmo assim.</p>}
          </div>
        )}

        <div className="quote-nav">
          {step > 1 ? <button type="button" className="button button-ghost" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} /> Voltar</button> : <span />}
          {step < 3 ? (
            <button type="button" className="button button-primary" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>Continuar <ArrowRight size={17} /></button>
          ) : (
            <button type="submit" className="button button-whatsapp" disabled={!canContinue || submitting}>
              {submitting ? <LoaderCircle className="spin" size={18} /> : <MessageCircle size={18} />}
              {submitting ? "Preparando…" : "Continuar no WhatsApp"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

