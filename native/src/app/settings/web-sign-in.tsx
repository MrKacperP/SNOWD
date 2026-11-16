import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack } from "expo-router";
import { useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import { Button, Screen } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { type } from "~/lib/theme";

export default function WebSignIn() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const scanned = useRef(false);
  const reset = () => { scanned.current = false; setId(""); setError(""); setDone(false); };
  return <><Stack.Screen options={{ title: "Scan to sign in" }} /><Screen>
    <Text style={type.title}>Sign in on your computer</Text>
    {!user ? <Text style={type.body}>Sign in to SNOWD first, then return here.</Text> : done ? <><Text style={type.body}>Approved. Your computer will sign in automatically.</Text><Button title="Scan another code" onPress={reset} /></> : id ? <>
      <Text style={type.body}>Sign in to the browser showing this QR code as {user.email || user.phoneNumber || "your SNOWD account"}?</Text>
      <Text style={type.body}>Only continue if you opened this code on your own computer. This gives that browser access to your account.</Text>
      <Button title={busy ? "Signing in…" : "Confirm browser sign-in"} disabled={busy} onPress={async () => {
        setBusy(true); setError("");
        try { await api("/api/auth/qr", { action: "approve", id }); setDone(true); }
        catch (err) { setError(err instanceof Error ? err.message : "Couldn’t approve sign-in."); }
        finally { setBusy(false); }
      }} />
      <Button title="Cancel" variant="secondary" disabled={busy} onPress={reset} />
    </> : permission?.granted ? <>
      <Text style={type.body}>On snowd.ca, choose “Log in with QR code”, then point your camera at the code.</Text>
      <View style={{ height: 320, borderRadius: 20, overflow: "hidden" }}>
        <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => {
          if (scanned.current) return;
          scanned.current = true;
          const match = /^snowd:\/\/web-sign-in\?id=([a-f0-9]{64})$/.exec(data);
          if (!match) { setError("This isn’t a SNOWD sign-in code. Open a new code on snowd.ca."); return; }
          setError(""); setId(match[1]);
        }} />
      </View>
    </> : <><Text style={type.body}>Allow camera access to scan the sign-in code.</Text><Button title={permission?.canAskAgain === false ? "Open camera settings" : "Allow camera"} onPress={() => { if (permission?.canAskAgain === false) void Linking.openSettings(); else void requestPermission(); }} /></>}
    {error ? <><Text accessibilityRole="alert" style={type.body}>{error}</Text>{!id && <Button title="Try again" onPress={reset} />}</> : null}
  </Screen></>;
}
