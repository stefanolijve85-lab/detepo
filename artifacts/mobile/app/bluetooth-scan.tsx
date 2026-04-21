import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBLE, BLEDevice } from "@/hooks/useBLE";
import { State } from "react-native-ble-plx";

const SERVER_URL = "dashboard.detepo.com:443";

// ─── Scan step ──────────────────────────────────────────────────────────────
function ScanStep({
  devices,
  step,
  bleState,
  onStart,
  onSelect,
}: {
  devices: BLEDevice[];
  step: string;
  bleState: State;
  onStart: () => void;
  onSelect: (d: BLEDevice) => void;
}) {
  const colors = useColors();
  const { t } = useLanguage();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (step === "scanning") {
      pulse.value = withRepeat(withTiming(0.4, { duration: 900 }), -1, true);
    } else {
      pulse.value = 1;
    }
  }, [step]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const bleOff = bleState === State.PoweredOff;
  const bleUnauth = bleState === State.Unauthorized;
  const isScanning = step === "scanning";

  return (
    <View style={styles.stepWrap}>
      {/* Status block */}
      <View style={[styles.scanHero, { backgroundColor: colors.surface1 }]}>
        <Animated.View
          style={[
            styles.scanRing,
            { borderColor: isScanning ? colors.cyan : colors.surface2 },
            isScanning && pulseStyle,
          ]}
        >
          <View style={[styles.scanInner, { backgroundColor: isScanning ? "rgba(0,200,224,0.1)" : colors.surface2 }]}>
            <Feather
              name="bluetooth"
              size={32}
              color={isScanning ? colors.cyan : colors.textTertiary}
            />
          </View>
        </Animated.View>

        <Text style={[styles.scanTitle, { color: colors.foreground }]}>
          {bleOff
            ? t("ble.scan.bleOff")
            : bleUnauth
            ? t("ble.scan.bleUnauth")
            : isScanning
            ? t("ble.scan.scanning")
            : t("ble.scan.ready")}
        </Text>
        <Text style={[styles.scanSub, { color: colors.textSecondary }]}>
          {bleOff
            ? t("ble.scan.bleOffSub")
            : bleUnauth
            ? t("ble.scan.bleUnauthSub")
            : isScanning
            ? t("ble.scan.scanningSub", { n: devices.length })
            : t("ble.scan.readySub")}
        </Text>
      </View>

      {/* Scan button */}
      <Pressable
        onPress={onStart}
        disabled={isScanning || bleOff || bleUnauth}
        style={[
          styles.primaryBtn,
          { backgroundColor: isScanning || bleOff || bleUnauth ? colors.surface2 : colors.cyan },
        ]}
      >
        {isScanning ? (
          <ActivityIndicator color={colors.foreground} size="small" />
        ) : (
          <Feather name="search" size={16} color={colors.background} />
        )}
        <Text
          style={[
            styles.primaryBtnText,
            { color: isScanning || bleOff || bleUnauth ? colors.textSecondary : colors.background },
          ]}
        >
          {isScanning ? t("ble.scan.btnScanning") : t("ble.scan.btnStart")}
        </Text>
      </Pressable>

      {/* Found devices */}
      {devices.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            {t("ble.scan.foundTitle")}
          </Text>
          {devices.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => onSelect(d)}
              style={[styles.deviceRow, { backgroundColor: colors.surface1 }]}
            >
              <View style={[styles.deviceIcon, { backgroundColor: "rgba(0,200,224,0.1)" }]}>
                <Feather name="bluetooth" size={16} color={colors.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.deviceName, { color: colors.foreground }]}>{d.name}</Text>
                <Text style={[styles.deviceMeta, { color: colors.textTertiary }]}>
                  {t("ble.scan.signal", { rssi: d.rssi })}
                </Text>
              </View>
              <View style={styles.signalBar}>
                {[1, 2, 3, 4].map((bar) => {
                  const active = d.rssi > -90 + bar * 15;
                  return (
                    <View
                      key={bar}
                      style={[
                        styles.signalSegment,
                        { height: bar * 4 + 4 },
                        { backgroundColor: active ? colors.cyan : colors.surface2 },
                      ]}
                    />
                  );
                })}
              </View>
              <Feather name="chevron-right" size={14} color={colors.textTertiary} style={{ marginLeft: 8 }} />
            </Pressable>
          ))}
        </>
      )}

      {!isScanning && devices.length === 0 && (
        <View style={[styles.infoCard, { backgroundColor: colors.surface1 }]}>
          <Feather name="info" size={14} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t("ble.scan.info")}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Configure step ──────────────────────────────────────────────────────────
function ConfigureStep({
  device,
  onConfirm,
  onBack,
}: {
  device: BLEDevice;
  onConfirm: (ssid: string, password: string, label: string, serial: string) => void;
  onBack: () => void;
}) {
  const colors = useColors();
  const { t } = useLanguage();
  const [label, setLabel] = useState(device.name);
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [serial, setSerial] = useState("");
  const [showPw, setShowPw] = useState(false);

  const canContinue =
    ssid.trim().length > 0 &&
    password.trim().length >= 8 &&
    serial.trim().length > 0;

  return (
    <View style={styles.stepWrap}>
      {/* Device summary */}
      <View style={[styles.selectedDevice, { backgroundColor: colors.surface1 }]}>
        <View style={[styles.deviceIcon, { backgroundColor: "rgba(0,200,224,0.1)" }]}>
          <Feather name="bluetooth" size={18} color={colors.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.deviceName, { color: colors.foreground }]}>{device.name}</Text>
          <Text style={[styles.deviceMeta, { color: colors.textTertiary }]}>{t("ble.config.selected")}</Text>
        </View>
        <Pressable onPress={onBack}>
          <Text style={[styles.changeBtn, { color: colors.cyan }]}>{t("ble.config.change")}</Text>
        </Pressable>
      </View>

      {/* Form */}
      <View style={[styles.formCard, { backgroundColor: colors.surface1 }]}>
        <Text style={[styles.formTitle, { color: colors.foreground }]}>{t("ble.config.title")}</Text>

        {/* Serial number — physical ownership proof */}
        <View style={[styles.infoCard, { backgroundColor: "rgba(0,200,224,0.06)", marginBottom: 8 }]}>
          <Feather name="shield" size={13} color={colors.cyan} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t("ble.config.serialHint")}
          </Text>
        </View>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>{t("ble.config.serial")}</Text>
          <TextInput
            value={serial}
            onChangeText={(v) => setSerial(v.toUpperCase().trim())}
            placeholder={t("ble.config.serialPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[styles.input, { backgroundColor: colors.surface2, color: colors.foreground, borderColor: "rgba(255,255,255,0.07)" }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>{t("ble.config.name")}</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder={t("ble.config.namePlaceholder")}
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { backgroundColor: colors.surface2, color: colors.foreground, borderColor: "rgba(255,255,255,0.07)" }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>{t("ble.config.ssid")}</Text>
          <TextInput
            value={ssid}
            onChangeText={setSsid}
            placeholder={t("ble.config.ssidPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { backgroundColor: colors.surface2, color: colors.foreground, borderColor: "rgba(255,255,255,0.07)" }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>{t("ble.config.pwd")}</Text>
          <View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t("ble.config.pwdPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { backgroundColor: colors.surface2, color: colors.foreground, borderColor: "rgba(255,255,255,0.07)", paddingRight: 44 }]}
            />
            <Pressable onPress={() => setShowPw((v) => !v)} style={styles.eyeBtn}>
              <Feather name={showPw ? "eye-off" : "eye"} size={16} color={colors.textTertiary} />
            </Pressable>
          </View>
          {password.length > 0 && password.length < 8 && (
            <Text style={[styles.fieldHint, { color: colors.amber }]}>
              {t("ble.config.pwdShort")}
            </Text>
          )}
        </View>

        <View style={[styles.serverInfo, { backgroundColor: colors.surface2 }]}>
          <Feather name="server" size={12} color={colors.textTertiary} />
          <Text style={[styles.serverText, { color: colors.textTertiary }]}>
            {t("ble.config.server", { server: SERVER_URL })}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => canContinue && onConfirm(ssid.trim(), password, label.trim(), serial.trim())}
        style={[styles.primaryBtn, { backgroundColor: canContinue ? colors.cyan : colors.surface2 }]}
      >
        <Feather name="link" size={16} color={canContinue ? colors.background : colors.textTertiary} />
        <Text style={[styles.primaryBtnText, { color: canContinue ? colors.background : colors.textTertiary }]}>
          {t("ble.config.connect")}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Progress step ────────────────────────────────────────────────────────────
function ProgressStep({ step, message, logLines }: { step: string; message: string; logLines: string[] }) {
  const colors = useColors();
  const { t } = useLanguage();
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 1200 }), -1);
  }, []);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  // Progress stages and their labels
  const stages: Array<{ key: string; label: string }> = [
    { key: "connecting",    label: t("ble.progress.stage.connecting") },
    { key: "waitingWifi",   label: t("ble.progress.stage.waitingWifi") },
    { key: "sendingWifi",   label: t("ble.progress.stage.sendingWifi") },
    { key: "sendingServer", label: t("ble.progress.stage.sendingServer") },
  ];
  const currentIdx = stages.findIndex((s) => s.key === step);

  return (
    <View style={[styles.stepWrap, styles.centeredStep]}>
      <Animated.View style={spinStyle}>
        <Feather
          name={step === "connecting" ? "bluetooth" : "refresh-cw"}
          size={40}
          color={colors.cyan}
        />
      </Animated.View>
      <Text style={[styles.progressTitle, { color: colors.foreground }]}>
        {step === "connecting" ? t("ble.progress.connecting") : t("ble.progress.configuring")}
      </Text>
      <Text style={[styles.progressSub, { color: colors.textSecondary }]}>{message}</Text>

      {/* Stage pills */}
      <View style={styles.stageRow}>
        {stages.map((s, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;
          return (
            <View key={s.key} style={styles.stagePillWrap}>
              <View style={[
                styles.stagePill,
                { backgroundColor: done ? "rgba(0,229,160,0.12)" : active ? "rgba(0,200,224,0.12)" : "rgba(255,255,255,0.04)" },
              ]}>
                {done
                  ? <Feather name="check" size={9} color={colors.green} />
                  : active
                  ? <ActivityIndicator size={9} color={colors.cyan} />
                  : <View style={[styles.stageDot, { backgroundColor: colors.surface2 }]} />}
                <Text style={[styles.stagePillText, { color: done ? colors.green : active ? colors.cyan : colors.textTertiary }]}>
                  {s.label}
                </Text>
              </View>
              {i < stages.length - 1 && (
                <View style={[styles.stageLine, { backgroundColor: done ? "rgba(0,229,160,0.3)" : "rgba(255,255,255,0.06)" }]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Live log window */}
      {logLines.length > 0 && (
        <View style={[styles.logBox, { backgroundColor: colors.surface1, borderColor: "rgba(255,255,255,0.05)" }]}>
          <ScrollView
            style={{ maxHeight: 120 }}
            contentContainerStyle={{ gap: 2 }}
            showsVerticalScrollIndicator={false}
          >
            {logLines.map((line, i) => (
              <Text key={i} style={[styles.logLine, { color: colors.textSecondary }]} numberOfLines={1}>
                {line}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}

      {step === "waitingWifi" && (
        <View style={[styles.infoCard, { backgroundColor: colors.surface1, width: "100%" }]}>
          <Feather name="clock" size={13} color={colors.amber} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t("ble.progress.waitingTip")}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Done step ───────────────────────────────────────────────────────────────
function DoneStep({ deviceName, onClose }: { deviceName: string; onClose: () => void }) {
  const colors = useColors();
  const { t } = useLanguage();
  return (
    <View style={[styles.stepWrap, styles.centeredStep]}>
      <View style={[styles.doneCircle, { backgroundColor: "rgba(0,229,160,0.12)", borderColor: "rgba(0,229,160,0.3)" }]}>
        <Feather name="check" size={36} color={colors.green} />
      </View>
      <Text style={[styles.progressTitle, { color: colors.foreground }]}>{t("ble.done.title")}</Text>
      <Text style={[styles.progressSub, { color: colors.textSecondary }]}>
        {t("ble.done.body", { name: deviceName })}
      </Text>
      <Pressable
        onPress={onClose}
        style={[styles.primaryBtn, { backgroundColor: colors.green, marginTop: 12 }]}
      >
        <Feather name="check-circle" size={16} color={colors.background} />
        <Text style={[styles.primaryBtnText, { color: colors.background }]}>{t("common.close")}</Text>
      </Pressable>
    </View>
  );
}

// ─── Error step ──────────────────────────────────────────────────────────────
function ErrorStep({ message, onRetry }: { message: string; onRetry: () => void }) {
  const colors = useColors();
  const { t } = useLanguage();
  return (
    <View style={[styles.stepWrap, styles.centeredStep]}>
      <View style={[styles.doneCircle, { backgroundColor: "rgba(255,59,92,0.1)", borderColor: "rgba(255,59,92,0.25)" }]}>
        <Feather name="alert-triangle" size={34} color={colors.red} />
      </View>
      <Text style={[styles.progressTitle, { color: colors.foreground }]}>{t("ble.error.title")}</Text>
      <Text style={[styles.progressSub, { color: colors.textSecondary }]}>{message}</Text>
      <Pressable onPress={onRetry} style={[styles.primaryBtn, { backgroundColor: colors.surface1, marginTop: 12 }]}>
        <Feather name="refresh-cw" size={16} color={colors.cyan} />
        <Text style={[styles.primaryBtnText, { color: colors.cyan }]}>{t("common.retry")}</Text>
      </Pressable>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function BluetoothScanScreen() {
  const { isAuthenticated, loading, token } = useAuth();
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { bleState, devices, step, statusMessage, errorMessage, logLines, pairedDeviceName, startScan, connectAndProvision, reset } = useBLE();
  const [selectedDevice, setSelectedDevice] = useState<BLEDevice | null>(null);

  const isWeb = Platform.OS === "web";

  if (loading) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

  function handleSelectDevice(d: BLEDevice) {
    setSelectedDevice(d);
  }

  function handleBack() {
    setSelectedDevice(null);
  }

  function handleProvision(ssid: string, password: string, label: string, serial: string) {
    if (!selectedDevice) return;
    connectAndProvision(selectedDevice, ssid, password, label, serial, token);
  }

  function handleClose() {
    reset();
    router.back();
  }

  function handleRetry() {
    reset();
    setSelectedDevice(null);
  }

  const PROVISIONING_STEPS = ["connecting", "waitingWifi", "sendingWifi", "sendingServer"] as const;
  const showProgress = (PROVISIONING_STEPS as readonly string[]).includes(step);
  const showConfigure = !!(selectedDevice && !showProgress && step !== "done" && step !== "error");
  const showDone = step === "done";
  const showError = step === "error";
  const showScan = !showConfigure && !showProgress && !showDone && !showError;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 20 : insets.top + 8 }]}>
        <Pressable onPress={handleClose} style={styles.backBtn}>
          <Feather name="x" size={20} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t("ble.headerTitle")}</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>{t("ble.headerSub")}</Text>
        </View>
        <View style={[styles.blePill, { backgroundColor: bleState === State.PoweredOn ? "rgba(0,229,160,0.1)" : "rgba(255,59,92,0.1)" }]}>
          <Feather
            name="bluetooth"
            size={11}
            color={bleState === State.PoweredOn ? colors.green : colors.red}
          />
          <Text style={[styles.blePillText, { color: bleState === State.PoweredOn ? colors.green : colors.red }]}>
            {bleState === State.PoweredOn ? t("common.on") : t("common.off")}
          </Text>
        </View>
      </View>

      {/* Step progress indicator */}
      <View style={styles.steps}>
        {[t("ble.steps.scan"), t("ble.steps.config"), t("ble.steps.pair"), t("ble.steps.done")].map((label, i) => {
          const done =
            (i === 0 && (showConfigure || showProgress || showDone)) ||
            (i === 1 && (showProgress || showDone)) ||
            (i === 2 && showDone) ||
            (i === 3 && showDone);
          const active =
            (i === 0 && showScan) ||
            (i === 1 && showConfigure) ||
            (i === 2 && showProgress) ||
            (i === 3 && showDone);
          return (
            <View key={label} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  done || active ? { backgroundColor: colors.cyan } : { backgroundColor: colors.surface2 },
                ]}
              >
                {done && <Feather name="check" size={8} color={colors.background} />}
              </View>
              <Text style={[styles.stepLabel, { color: active || done ? colors.cyan : colors.textTertiary }]}>
                {label}
              </Text>
              {i < 3 && <View style={[styles.stepLine, { backgroundColor: done ? colors.cyan : colors.surface2 }]} />}
            </View>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {showScan && (
          <ScanStep
            devices={devices}
            step={step}
            bleState={bleState}
            onStart={startScan}
            onSelect={handleSelectDevice}
          />
        )}
        {showConfigure && selectedDevice && (
          <ConfigureStep
            device={selectedDevice}
            onConfirm={handleProvision}
            onBack={handleBack}
          />
        )}
        {showProgress && (
          <ProgressStep step={step} message={statusMessage} logLines={logLines} />
        )}
        {showDone && (
          <DoneStep deviceName={pairedDeviceName} onClose={handleClose} />
        )}
        {showError && (
          <ErrorStep message={errorMessage} onRetry={handleRetry} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  headerSub: { fontSize: 10, marginTop: 1 },
  blePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  blePillText: { fontSize: 10, fontWeight: "600" },
  steps: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 0,
  },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 8, marginLeft: 4, fontWeight: "500" },
  stepLine: { height: 1, width: 20, marginHorizontal: 4 },
  body: { padding: 16, gap: 12 },
  stepWrap: { gap: 12 },
  centeredStep: { alignItems: "center", paddingTop: 40, gap: 16 },
  scanHero: {
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  scanRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  scanInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  scanTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  scanSub: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryBtnText: { fontSize: 14, fontWeight: "700" },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "500",
    marginTop: 4,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 14,
  },
  deviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceName: { fontSize: 13, fontWeight: "700" },
  deviceMeta: { fontSize: 10, marginTop: 2 },
  signalBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 20,
  },
  signalSegment: { width: 4, borderRadius: 2 },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 12,
    padding: 14,
    alignItems: "flex-start",
  },
  infoText: { fontSize: 12, lineHeight: 18, flex: 1 },
  selectedDevice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 14,
  },
  changeBtn: { fontSize: 12, fontWeight: "600" },
  formCard: { borderRadius: 14, padding: 16, gap: 16 },
  formTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 9, letterSpacing: 1.2, fontWeight: "500" },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  fieldHint: { fontSize: 10, marginTop: 2 },
  serverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    padding: 10,
  },
  serverText: { fontSize: 10 },
  progressTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  progressSub: { fontSize: 13, textAlign: "center", lineHeight: 20, maxWidth: 280 },
  stageRow: { width: "100%", gap: 4 },
  stagePillWrap: { gap: 4 },
  stagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stageDot: { width: 8, height: 8, borderRadius: 4 },
  stagePillText: { fontSize: 11, fontWeight: "500", flex: 1 },
  stageLine: { height: 1, marginLeft: 14 },
  logBox: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  logLine: { fontSize: 10, fontFamily: "monospace" },
  doneCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
