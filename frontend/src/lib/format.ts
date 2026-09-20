export function formatAmount(value: number | bigint, decimals: number = 7): string {
  const num = typeof value === "bigint" ? Number(value) / 10 ** decimals : value;
  if (Math.abs(num) >= 1_000_000) {
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (Math.abs(num) >= 1) {
    return num.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  return num.toLocaleString("en-US", { minimumFractionDigits: 7, maximumFractionDigits: 7 });
}

export function formatPrice(value: number, decimals: number = 6): string {
  return value.toFixed(decimals);
}

export function formatBps(bps: number): string {
  return `${bps} bps`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatRate(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatUSDC(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "Expired";
  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((secondsLeft % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export function stroopsToHuman(stroops: bigint | number): number {
  return Number(stroops) / 1e7;
}

export function humanToStroops(human: number): bigint {
  return BigInt(Math.round(human * 1e7));
}
