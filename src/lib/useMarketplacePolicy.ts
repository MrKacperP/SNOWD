'use client';
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_POLICY, validatePolicy, type MarketplacePolicy } from './admin/pricing';
import { quoteMarketplace } from './marketplacePricing';

export function useMarketplacePolicy(baseUrl = '') {
  const [policy, setPolicy] = useState<MarketplacePolicy>(DEFAULT_POLICY);
  const [pricingReady, setReady] = useState(false);
  const [pricingError, setError] = useState('');
  const refreshPricing = useCallback(async () => {
    setReady(false);
    try {
      const response = await fetch(`${baseUrl}/api/marketplace-pricing`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setPolicy(validatePolicy(data.policy)); setReady(true); setError('');
    } catch { setError('Could not load current fees. Refresh before booking.'); }
  }, [baseUrl]);
  useEffect(() => { void refreshPricing(); }, [refreshPricing]);
  return { policy, pricingReady, pricingError, refreshPricing, quote: (price: number, method: string) => quoteMarketplace(price, method, policy) };
}
