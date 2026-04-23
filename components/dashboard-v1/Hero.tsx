import { Kicker } from "@/components/cc/atoms";

type Props = {
  userName: string;
  openDecisionsCount: number;
};

export function Hero({ userName, openDecisionsCount }: Props) {
  const h1 =
    openDecisionsCount > 0
      ? `Bom dia, ${userName}. Estás a ${openDecisionsCount} decis${openDecisionsCount === 1 ? "ão" : "ões"} de um dia limpo.`
      : `Bom dia, ${userName}. Nada urgente.`;

  const subtitle =
    openDecisionsCount > 0
      ? "A tripulação processou eventos nas últimas horas. Abaixo o que precisa da tua atenção hoje."
      : "Tens espaço para trabalho focado. O feed da manhã está em baixo.";

  return (
    <header style={{ padding: "24px 0 12px" }}>
      <Kicker>01 · Dashboard · {userName}</Kicker>
      <h1 className="h1" style={{ marginTop: 14 }}>
        {h1}
      </h1>
      <p className="lede" style={{ marginTop: 10 }}>
        {subtitle}
      </p>
    </header>
  );
}
