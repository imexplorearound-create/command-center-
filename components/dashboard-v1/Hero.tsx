import { Kicker } from "@/components/cc/atoms";
import { selectHeroVoice, type HeroSignals } from "@/lib/maestro/voice/selector";
import { InlineActionButton } from "./InlineActionButton";

type Props = {
  signals: HeroSignals;
  readOnly?: boolean;
};

export function Hero({ signals, readOnly = false }: Props) {
  const voice = selectHeroVoice(signals);
  // H1 só é clicável quando há decisões abertas para saltar — caso calmo
  // mantém tipografia limpa sem affordance "fantasma". Em readOnly (TV)
  // nunca clicável (passivo por definição).
  const clickable = !readOnly && signals.openDecisions > 0;

  return (
    <header style={{ padding: "24px 0 12px" }}>
      <Kicker>01 · Dashboard · {signals.userName}</Kicker>
      <h1 className="h1" style={{ marginTop: 14 }}>
        {clickable ? (
          <InlineActionButton
            action={{ kind: "focus-decisions" }}
            aria-label="Saltar para a coluna de decisões"
          >
            {voice.h1}
          </InlineActionButton>
        ) : (
          voice.h1
        )}
      </h1>
      <p className="lede" style={{ marginTop: 10 }}>
        {voice.subtitle}
      </p>
    </header>
  );
}
