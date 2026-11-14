import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { Button, Group, Row, Screen } from '~/components/ui';
import { type } from '~/lib/theme';

export default function AdminHome() {
  const router = useRouter();
  const go = (section: string) => router.push(`/admin/section?section=${section}`);
  return <Screen>
    <Text style={type.title}>Manage SNOWD</Text>
    <Text style={type.callout}>Review accounts, coordinate work and help customers.</Text>
    <Group>
      <Row icon="person.badge.shield.checkmark.fill" label="Verifications" onPress={() => go('verifications')} />
      <Row icon="list.clipboard" label="Work orders" onPress={() => go('jobs')} />
      <Row icon="person.crop.circle" label="Accounts" onPress={() => go('accounts')} />
      <Row icon="bubble.left.and.bubble.right" label="Customer support" onPress={() => go('support')} />
      <Row icon="creditcard" label="Payments" onPress={() => go('payments')} />
      <Row icon="tag.fill" label="Fees & discounts" onPress={() => go('pricing')} />
      <Row icon="clock" label="Admin activity" onPress={() => go('activity')} last />
    </Group>
    <Button title="Back to Profile" variant="ghost" onPress={() => router.replace("/profile")} />
  </Screen>;
}
