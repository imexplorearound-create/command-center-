import { Kicker } from "@/components/cc/atoms";
import { selectHeroVoice, type HeroSignals } from "@/lib/maestro/voice/selector";

type Props = {
  signals: HeroSignals;
};

export function Hero({ signals }: Props) {
  const voice = selectHeroVoice(signals);

  return (
    <header style={{ padding: "24px 0 12px" }}>
      <Kicker>01 · Dashboard · {signals.userName}</Kicker>
      <h1 className="h1" style={{ marginTop: 14 }}>
        {voice.h1}
      </h1>
      <p className="lede" style={{ marginTop: 10 }}>
        {voice.subtitle}
      </p>
    </header>
  );
}
