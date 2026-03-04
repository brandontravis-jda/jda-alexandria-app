export interface Stat {
  _key: string;
  number: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

export interface StatsCounterProps {
  _type: "statsCounter";
  _key: string;
  stats: Stat[];
}
