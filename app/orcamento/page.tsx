import { QuoteWizard } from "@/components/quote-wizard";

export const metadata = {
  title: "Solicite um orçamento | Rony Móveis",
  description: "Conte o que você precisa e envie referências para receber atendimento da Rony Móveis pelo WhatsApp.",
};

export default function QuotePage() {
  return (
    <main className="quote-page">
      <section className="quote-intro">
        <span className="eyebrow">Orçamento guiado</span>
        <h1>Quanto melhor a conversa começa, melhor a proposta chega.</h1>
        <p>Leva poucos minutos. No fim, você continua o atendimento pelo WhatsApp com todas as informações organizadas.</p>
      </section>
      <QuoteWizard />
    </main>
  );
}

