import { ArrowUpRight, Camera, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getPublicSnapshot } from "@/lib/server-data";
import { whatsappUrl } from "@/lib/whatsapp";

export const revalidate = 3600;

export const metadata = {
  title: "Contato e loja",
  description: "Fale com a Rony Móveis, visite a loja no Setor Sudoeste em Goiânia ou peça atendimento pelo WhatsApp.",
};

export default async function ContactPage() {
  const { settings } = await getPublicSnapshot();
  return (
    <main className="contact-page">
      <section className="contact-hero section-pad">
        <div>
          <span className="eyebrow">Rony Móveis em Goiânia</span>
          <h1>Converse com quem entende o seu espaço.</h1>
          <p>Consulte produtos, disponibilidade, medidas, acabamentos ou comece um projeto planejado com atendimento próximo.</p>
          <a className="button button-whatsapp" href={whatsappUrl("Olá, Rony Móveis! Vim pelo site e gostaria de atendimento.", settings.whatsappNumber)} target="_blank" rel="noreferrer"><MessageCircle size={19} /> Chamar no WhatsApp <ArrowUpRight size={17} /></a>
        </div>
        <img src="/images/spaces/loja-rony.webp" alt="Fachada da Rony Móveis em Goiânia" />
      </section>
      <section className="contact-grid section-pad">
        <a href={whatsappUrl("Olá, Rony Móveis! Gostaria de atendimento.", settings.whatsappNumber)} target="_blank" rel="noreferrer"><MessageCircle /><span>WhatsApp<strong>{settings.phone}</strong></span><ArrowUpRight /></a>
        <a href={`tel:+${settings.whatsappNumber}`}><Phone /><span>Telefone<strong>{settings.phone}</strong></span><ArrowUpRight /></a>
        <a href={`mailto:${settings.email}`}><Mail /><span>E-mail<strong>{settings.email}</strong></span><ArrowUpRight /></a>
        <a href={settings.instagramUrl} target="_blank" rel="noreferrer"><Camera /><span>Instagram<strong>@ronymoveisgoiania</strong></span><ArrowUpRight /></a>
        <a className="contact-location" href={settings.mapUrl} target="_blank" rel="noreferrer"><MapPin /><span>Onde estamos<strong>{settings.address}</strong></span><ArrowUpRight /></a>
        <div><Clock /><span>Atendimento<strong>{settings.openingHours}</strong></span></div>
      </section>
    </main>
  );
}
