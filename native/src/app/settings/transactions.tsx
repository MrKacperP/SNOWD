import { Stack, useRouter } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { activitySummary } from "@/lib/activitySummary";
import { estimatedTimeSaved, timeSavedLabel } from "@/lib/clientValue";
import { jobDisplayPrice, transactionDisplayAmount } from "@/lib/marketplacePricing";
import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";
import type { Job, OperatorProfile, Transaction } from "@/lib/types";
import { dateMillis } from "@/lib/workOrders";
import { Badge, Button, Card, Chip, Empty, Icon, Notice, Screen, SectionTitle, type Tone } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { db } from "~/lib/firebase";
import { money } from "~/lib/format";
import { colors, radius, space, type } from "~/lib/theme";

const STATUS: Record<Transaction["status"], [string, Tone]> = { paid: ["Paid", "green"], held: ["On hold", "orange"], refunded: ["Refunded", "blue"], cancelled: ["Cancelled", "gray"] };
const cents = (value: number) => money(value / 100);
const dateText = (value: unknown) => {
  const ms = dateMillis(value);
  return ms ? new Date(ms).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "";
};

/** Earnings, activity and payment history — the website's Transactions and Activity pages. */
export default function Transactions() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const operator = profile?.role === "operator";
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | Transaction["status"]>("all");
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!uid) return;
    const field = operator ? "operatorId" : "clientId";
    const stopT = onSnapshot(
      query(collection(db, "transactions"), where(field, "==", uid)),
      (snap) => {
        setTransactions(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Transaction));
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError("Some payment information couldn’t load. Pull down or reopen this page.");
      },
    );
    const stopJ = onSnapshot(query(collection(db, "jobs"), where(field, "==", uid)), (snap) => setJobs(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Job)), () => {});
    return () => {
      stopT();
      stopJ();
    };
  }, [uid, operator]);

  const paid = transactions.filter((t) => t.status === "paid");
  const total = paid.reduce((sum, t) => sum + transactionDisplayAmount(t, operator), 0);
  const cash = paid.filter((t) => t.paymentMethod === "cash").reduce((sum, t) => sum + transactionDisplayAmount(t, operator), 0);
  const list = transactions.filter((t) => filter === "all" || t.status === filter).sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt));
  const outstanding = jobs.filter((job) => (["accepted", "en-route", "in-progress"].includes(job.status) || (job.paymentMethod === "cash" && job.status === "completed")) && job.paymentStatus === "pending");
  const summary = useMemo(() => {
    const now = Date.now();
    return activitySummary(jobs, transactions, now - days * 86400000, now);
  }, [jobs, transactions, days]);
  const saved = estimatedTimeSaved(jobs);
  const completed = jobs.filter((j) => j.status === "completed").length;
  const cashOnly = operator && !canAcceptPlatformPayments(profile as OperatorProfile);

  return (
    <>
      <Stack.Screen options={{ title: operator ? "Your money" : "Payments" }} />
      <Screen>
        <Notice text={error} />
        {operator ? (
          <>
            <Card style={{ backgroundColor: colors.ink, borderColor: colors.ink }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" }}>Total earned · CAD</Text>
              <Text style={{ color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: -0.6, fontVariant: ["tabular-nums"] }}>{cents(total)}</Text>
              <View style={{ flexDirection: "row", gap: space.lg }}>
                <Text style={{ color: "rgba(255,255,255,0.8)" }}>Cash {cents(cash)}</Text>
                <Text style={{ color: "rgba(255,255,255,0.8)" }}>Card {cents(total - cash)}</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: "#4d7cff", overflow: "hidden" }}>
                <View style={{ width: `${total ? (cash / total) * 100 : 0}%`, height: "100%", backgroundColor: colors.sun }} />
              </View>
            </Card>

            <SectionTitle>Activity</SectionTitle>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[7, 30, 90].map((d) => (
                <Chip key={d} label={`Past ${d} days`} selected={days === d} onPress={() => setDays(d)} />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: space.md }}>
              {[
                ["Paid earnings", cents(summary.paidCents)],
                ["Requests", String(summary.requests)],
                ["Completed", String(summary.completed)],
              ].map(([label, value]) => (
                <Card key={label} style={{ flex: 1, gap: 4, padding: space.md }}>
                  <Text style={type.caption}>{label}</Text>
                  <Text style={[type.headline, { fontSize: 19, fontVariant: ["tabular-nums"] }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
                </Card>
              ))}
            </View>
            <Card onPress={() => router.push("/jobs")} style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[type.body, { flex: 1 }]}>Active work orders</Text>
              <Text style={[type.title, { fontVariant: ["tabular-nums"] }]}>{summary.active}</Text>
              <Icon name="chevron.right" size={13} color={colors.faint} />
            </Card>
            {cashOnly ? <Notice tone="blue" text="You’re taking cash jobs. Connect Stripe in Payouts to also accept cards and Apple Pay." /> : null}
          </>
        ) : (
          <Card style={{ backgroundColor: colors.accentSoft, borderColor: "#d6defe" }}>
            <Text style={type.overline}>More winter, less work</Text>
            <Text style={type.title}>{saved > 0 ? `You’ve saved ${timeSavedLabel(saved)}` : "Make time for your snow day"}</Text>
            <Text style={type.callout}>{completed ? `${completed} completed ${completed === 1 ? "visit" : "visits"} · estimated from service time.` : "Your time saved appears after your first completed visit."}</Text>
            <Text style={[type.caption, { color: colors.ink }]}>{loading ? "Loading…" : `For ${cents(total)} CAD paid in total`}</Text>
          </Card>
        )}

        {outstanding.length ? (
          <>
            <SectionTitle>Payments to settle</SectionTitle>
            {outstanding.map((job) => (
              <Card key={job.id} onPress={() => router.push(`/job/${job.id}`)} style={{ flexDirection: "row", alignItems: "center" }}>
                <Icon name={job.paymentMethod === "cash" ? "banknote.fill" : "creditcard.fill"} size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={type.headline} numberOfLines={1}>{job.address || "Snow removal"}</Text>
                  <Text style={type.caption}>{job.paymentMethod === "cash" ? (operator ? "Cash · collect on completion" : "Cash · pay the shoveler directly") : "Card payment needed"}</Text>
                </View>
                <Text style={type.headline}>{money(jobDisplayPrice(job, operator))}</Text>
              </Card>
            ))}
          </>
        ) : null}

        <SectionTitle>Payment history</SectionTitle>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["all", "paid", "held", "refunded"] as const).map((value) => (
            <Chip key={value} label={value === "all" ? "All" : STATUS[value][0]} selected={filter === value} onPress={() => setFilter(value)} />
          ))}
        </View>
        {!loading && !list.length ? (
          <Empty icon="wallet.pass" title={filter === "all" ? "Your payment history starts here" : `No ${STATUS[filter as Transaction["status"]]?.[0].toLowerCase()} payments`} body={filter === "all" ? "Completed jobs and receipts appear here automatically." : "Choose another filter to see more."} />
        ) : null}
        {list.length ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border, overflow: "hidden" }}>
            {list.map((t, i) => (
              <Pressable key={t.id} onPress={() => t.jobId && router.push(`/job/${t.jobId}`)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, padding: space.md, borderBottomWidth: i === list.length - 1 ? 0 : 0.5, borderBottomColor: colors.border }, pressed && { backgroundColor: colors.surfaceAlt }]}>
                <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: t.paymentMethod === "cash" ? colors.mintSoft : colors.accentSoft }}>
                  <Icon name={t.paymentMethod === "cash" ? "banknote.fill" : "creditcard.fill"} size={16} color={t.paymentMethod === "cash" ? colors.mint : colors.accent} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.headline} numberOfLines={1}>{operator ? t.clientName || "Customer" : t.operatorName || "Shoveler"}</Text>
                  <Text style={type.caption} numberOfLines={1}>{t.description || "Snow removal"} · {dateText(t.createdAt)}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[type.headline, { fontVariant: ["tabular-nums"] }]}>{operator && t.status === "paid" ? "+" : ""}{cents(transactionDisplayAmount(t, operator))}</Text>
                  <Badge label={STATUS[t.status]?.[0] || t.status} tone={STATUS[t.status]?.[1]} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Button title={operator ? "Manage how I get paid" : "Payment methods"} variant="secondary" icon="gearshape.fill" onPress={() => router.push("/settings/payments")} />
      </Screen>
    </>
  );
}
