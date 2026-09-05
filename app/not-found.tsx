import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="not-found">
      <span className="eyebrow">Página não encontrada</span>
      <h1>Esse caminho não leva a nenhum móvel.</h1>
      <p>O produto pode ter saído do catálogo ou o endereço foi digitado incorretamente.</p>
      <Link className="button button-primary" href="/catalogo"><ArrowLeft size={17} /> Voltar ao catálogo</Link>
    </main>
  );
}

