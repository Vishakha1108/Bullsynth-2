import { useEffect, useState } from 'react';
import {
  BOT_API_CONFIG,
  getAlphaHealth,
  getAlphaStatus,
  getMarketMakerHealth,
  getMarketMakerStatus,
  type AlphaStatus,
  type BotHealth,
  type MarketMakerStatus,
} from '../services/botsApi';

const STATUS_POLL_MS = 1000;
const HEALTH_POLL_MS = 8000;
const STALE_AFTER_MS = 10_000;
const HEALTH_FRESH_MS = 20_000;

interface BotPollState<TStatus> {
  status: TStatus | null;
  health: BotHealth | null;
  lastStatusAt: number | null;
  lastHealthAt: number | null;
  statusError: string | null;
  healthError: string | null;
}

interface DerivedBotState<TStatus> extends BotPollState<TStatus> {
  isStale: boolean;
  isDisconnected: boolean;
  isHealthy: boolean;
}

export interface BotPollingSnapshot {
  alpha: DerivedBotState<AlphaStatus>;
  marketMaker: DerivedBotState<MarketMakerStatus>;
}

function createInitialState<TStatus>(): BotPollState<TStatus> {
  return {
    status: null,
    health: null,
    lastStatusAt: null,
    lastHealthAt: null,
    statusError: null,
    healthError: null,
  };
}

function deriveState<TStatus>(raw: BotPollState<TStatus>): DerivedBotState<TStatus> {
  const now = Date.now();
  const hasFreshStatus = raw.lastStatusAt !== null && now - raw.lastStatusAt <= STALE_AFTER_MS;
  const isHealthy = raw.health?.status === 'ok' && raw.lastHealthAt !== null && now - raw.lastHealthAt <= HEALTH_FRESH_MS;
  const isStale = raw.status !== null && !hasFreshStatus;

  return {
    ...raw,
    isStale,
    isDisconnected: !isHealthy && !hasFreshStatus,
    isHealthy,
  };
}

export function useBotPolling(): BotPollingSnapshot {
  const [alpha, setAlpha] = useState<BotPollState<AlphaStatus>>(createInitialState);
  const [marketMaker, setMarketMaker] = useState<BotPollState<MarketMakerStatus>>(createInitialState);

  useEffect(() => {
    let cancelled = false;

    const pollAlphaStatus = async () => {
      try {
        const status = await getAlphaStatus(BOT_API_CONFIG.alphaBaseUrl);
        if (cancelled) return;
        setAlpha((prev) => ({
          ...prev,
          status,
          lastStatusAt: Date.now(),
          statusError: null,
        }));
      } catch (error) {
        if (cancelled) return;
        setAlpha((prev) => ({
          ...prev,
          statusError: error instanceof Error ? error.message : 'Failed to fetch Alpha status',
        }));
      }
    };

    const pollMMStatus = async () => {
      try {
        const status = await getMarketMakerStatus(BOT_API_CONFIG.mmBaseUrl);
        if (cancelled) return;
        setMarketMaker((prev) => ({
          ...prev,
          status,
          lastStatusAt: Date.now(),
          statusError: null,
        }));
      } catch (error) {
        if (cancelled) return;
        setMarketMaker((prev) => ({
          ...prev,
          statusError: error instanceof Error ? error.message : 'Failed to fetch MM status',
        }));
      }
    };

    const pollAlphaHealth = async () => {
      try {
        const health = await getAlphaHealth(BOT_API_CONFIG.alphaBaseUrl);
        if (cancelled) return;
        setAlpha((prev) => ({
          ...prev,
          health,
          lastHealthAt: Date.now(),
          healthError: null,
        }));
      } catch (error) {
        if (cancelled) return;
        setAlpha((prev) => ({
          ...prev,
          healthError: error instanceof Error ? error.message : 'Failed to fetch Alpha health',
        }));
      }
    };

    const pollMMHealth = async () => {
      try {
        const health = await getMarketMakerHealth(BOT_API_CONFIG.mmBaseUrl);
        if (cancelled) return;
        setMarketMaker((prev) => ({
          ...prev,
          health,
          lastHealthAt: Date.now(),
          healthError: null,
        }));
      } catch (error) {
        if (cancelled) return;
        setMarketMaker((prev) => ({
          ...prev,
          healthError: error instanceof Error ? error.message : 'Failed to fetch MM health',
        }));
      }
    };

    const pollAllStatus = () => {
      void pollAlphaStatus();
      void pollMMStatus();
    };

    const pollAllHealth = () => {
      void pollAlphaHealth();
      void pollMMHealth();
    };

    pollAllStatus();
    pollAllHealth();

    const statusTimer = window.setInterval(pollAllStatus, STATUS_POLL_MS);
    const healthTimer = window.setInterval(pollAllHealth, HEALTH_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(statusTimer);
      window.clearInterval(healthTimer);
    };
  }, []);

  return {
    alpha: deriveState(alpha),
    marketMaker: deriveState(marketMaker),
  };
}