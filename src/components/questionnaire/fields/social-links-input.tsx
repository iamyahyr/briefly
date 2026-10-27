"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";

type Props = {
  id: string;
  networks: string[];
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
};

const PLACEHOLDERS: Record<string, string> = {
  instagram: "@…",
  facebook: "facebook.com/…",
  tiktok: "@…",
  x: "@…",
  linkedin: "linkedin.com/company/…",
  youtube: "youtube.com/@…",
  google: "maps.app.goo.gl/…",
};

export function SocialLinksInput({ id, networks, value, onChange }: Props) {
  const t = useTranslations("fields");
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {networks.map((network, index) => {
        const label = t.has(`networks.${network}` as "networks.x")
          ? t(`networks.${network}` as "networks.x")
          : network;
        const inputId = index === 0 ? id : `${id}-${network}`;
        return (
          <div key={network} className="grid gap-1">
            <label htmlFor={inputId} className="text-xs text-muted-foreground">
              {label}
            </label>
            <Input
              id={inputId}
              value={value[network] ?? ""}
              placeholder={PLACEHOLDERS[network]}
              maxLength={300}
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(e) => onChange({ ...value, [network]: e.target.value })}
            />
          </div>
        );
      })}
    </div>
  );
}
