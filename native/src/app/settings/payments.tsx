import { Stack, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import { Badge, Button, Card, Empty, Group, Icon, Notice, Row, Screen } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { applePayAvailable } from "~/lib/orders";
import { idState } from "~/lib/verification";
import { colors, space, type } from "~/lib/theme";

type StripeStatus = {
  configured?: boolean;
  error?: string;
  accountId?: string;
  fullyReady?: boolean;
  detailsSubmitted?: boolean;
  accountDetails?: { businessName?: string | null; email?: string | null; country?: string | null; currency?: string | null; payoutBank?: { bankName?: string | null; last4?: string | null } | null };
};

type SavedCard = { brand: string; last4: string; expMonth: number; expYear: number };

/** Payment methods for customers and the Stripe payout connection for shovelers — the website's Settings → Payment. */
export default function PaymentSettings() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const operator = profile?.role === "operator";
  const accountId = profile?.stripeConnectAccountId;
  const id = idState(profile);
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    if (!operator || !accountId) return;
    setChecking(true);
    setError("");
    try {
      const data = await api<StripeStatus>("/api/stripe/account-status", { accountId });
      if (data.configured === false) setError(data.error || "Card payments aren’t available right now.");
      else setStatus(data);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Couldn’t check your payment account.");
    } finally {
      setChecking(false);
    }
  }, [operator, accountId]);

  useEffect(() => {
    void check();
  }, [check]);

  /**
   * Stripe collects identity and bank details on its own secure pages; the app opens them and checks again on return.
   * A finished account opens its Stripe Express dashboard instead, where payouts and the bank account are managed.
   */
  const connect = async () => {
    setConnecting(true);
    setError("");
    try {
      const created = await api<{ accountId?: string; configured?: boolean; error?: string }>("/api/stripe/create-connect-account", {
        email: user?.email || profile?.email,
        operatorId: user?.uid,
        businessName: profile?.businessName || profile?.displayName,
      });
      if (created.configured === false || !created.accountId) throw new Error(created.error || "Card payments aren’t available right now.");
      const link = await api<{ onboardingUrl?: string; error?: string }>("/api/stripe/account-link", { accountId: created.accountId, native: true, ...(status?.fullyReady ? { mode: "manage" } : {}) });
      const url = link.onboardingUrl ? new URL(link.onboardingUrl) : null;
      if (!url || url.protocol !== "https:" || !["connect.stripe.com", "onboarding.stripe.com"].includes(url.hostname)) throw new Error(link.error || "Stripe returned an unexpected setup address.");
      // A private session skips iOS's "wants to use stripe.com to Sign In" alert, which reads as a login
      // to someone setting up payouts. Each Stripe link is already signed in, so no shared cookies are needed.
      await WebBrowser.openAuthSessionAsync(url.href, "snowd://connect-return", { preferEphemeralSession: true });
      const data = await api<StripeStatus>("/api/stripe/account-status", { accountId: created.accountId });
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stripe setup couldn’t open. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  const cards = ((profile as { stripePaymentMethods?: SavedCard[] } | null)?.stripePaymentMethods || []) as SavedCard[];
  const details = status?.accountDetails;

  return (
    <>
      <Stack.Screen options={{ title: operator ? "Payouts" : "Payment methods" }} />
      <Screen refreshControl={operator ? <RefreshControl refreshing={checking} onRefresh={() => void check()} /> : undefined}>
        {operator ? (
          <>
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Icon name="building.columns.fill" size={20} color={colors.accent} />
                <Text style={[type.headline, { flex: 1 }]}>Stripe Connect</Text>
                <Badge label={status?.fullyReady ? "Connected" : status?.detailsSubmitted ? "In review" : accountId ? "Setup needed" : "Not connected"} tone={status?.fullyReady ? "green" : status?.detailsSubmitted ? "orange" : "gray"} />
              </View>
              <Text style={type.callout}>{`Set up Stripe to accept ${applePayAvailable ? "card and Apple Pay" : "card"} payments and get paid to your Canadian bank account. You can take cash jobs without it.`}</Text>
              {id !== "verified" ? (
                <Notice
                  tone={id === "rejected" ? "orange" : "blue"}
                  text={
                    id === "pending"
                      ? "Your ID is in review. You can set up Stripe now; customers can pay you by card once SNOWD verifies your ID."
                      : id === "rejected"
                        ? "SNOWD couldn’t verify your ID. Upload a new photo in ID verification so customers can pay you by card."
                        : "Customers can pay you by card once SNOWD verifies your ID. Upload it in ID verification; you can set up Stripe in the meantime."
                  }
                />
              ) : null}
              {status?.fullyReady ? (
                <View style={{ backgroundColor: colors.mintSoft, borderRadius: 14, padding: space.md, gap: 8 }}>
                  <Text style={{ color: colors.mint, fontWeight: "800" }}>Card payments and bank payouts are on.</Text>
                  {details?.businessName ? <Text style={type.caption}>Business · {details.businessName}</Text> : null}
                  {details?.email ? <Text style={type.caption}>Stripe email · {details.email}</Text> : null}
                  <Text style={type.caption}>Region · {[details?.country, details?.currency?.toUpperCase()].filter(Boolean).join(" · ") || "Canada · CAD"}</Text>
                  {details?.payoutBank ? <Text style={type.caption}>Payout account · {details.payoutBank.bankName || "Bank account"} ending in {details.payoutBank.last4}</Text> : null}
                </View>
              ) : status?.detailsSubmitted ? (
                <Notice tone="orange" text="Stripe is reviewing your details. Pull down to check again, or continue setup if Stripe asked for more information." />
              ) : null}
              <Notice text={error} />
              <Button
                title={status?.fullyReady ? "Manage Stripe account" : accountId ? "Continue setup" : "Connect with Stripe"}
                icon={status?.fullyReady ? "arrow.up.right.square" : "creditcard.fill"}
                variant={status?.fullyReady ? "secondary" : "primary"}
                loading={connecting}
                onPress={connect}
              />
              {id === "missing" || id === "rejected" ? (
                <Button title="Verify my ID" icon="person.text.rectangle.fill" variant="secondary" onPress={() => router.push("/settings/verification")} />
              ) : null}
              <Text style={type.caption}>
                {status?.fullyReady
                  ? "Your Stripe dashboard opens in a secure sheet, where you can change your bank account and see payouts."
                  : "Stripe, SNOWD’s payment partner, opens in a secure sheet to confirm your identity and bank account. You come back here when you finish."}
              </Text>
            </Card>
          </>
        ) : (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="creditcard.fill" size={20} color={colors.accent} />
              <Text style={type.headline}>Saved cards</Text>
            </View>
            {cards.length ? (
              cards.map((card, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: space.md, borderRadius: 14, backgroundColor: colors.surfaceAlt }}>
                  <Icon name="creditcard" size={18} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.headline, { textTransform: "capitalize" }]}>{card.brand} •••• {card.last4}</Text>
                    <Text style={type.caption}>Expires {card.expMonth}/{card.expYear}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Empty icon="creditcard" title="No saved cards" body={`You ${applePayAvailable ? "choose Apple Pay or enter a card" : "enter a card"} securely when you book. Nothing is charged until the work is done.`} />
            )}
          </Card>
        )}

        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", paddingHorizontal: 4 }}>
          <Icon name="lock.shield.fill" size={14} color={colors.muted} />
          <Text style={[type.caption, { flex: 1 }]}>Payments are processed securely by Stripe. SNOWD never stores your full card number.</Text>
        </View>

        <Group>
          <Row icon="list.bullet.rectangle.fill" label={operator ? "Your money" : "Payment history"} onPress={() => router.push("/settings/transactions")} />
          <Row icon="doc.text.fill" label="Payments, cancellations & refunds" onPress={() => router.push("/settings/policy?policy=payments")} last />
        </Group>
      </Screen>
    </>
  );
}
