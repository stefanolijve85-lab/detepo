import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { useBLE } from "@/hooks/useBLE";
import { State } from "react-native-ble-plx";

export default function BluetoothScanScreen() {
  const {
    bleState,
    devices,
    step,
    statusMessage,
    startScan,
    connectAndProvision,
    reset,
  } = useBLE();

  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    reset();

    if (bleState === State.PoweredOn) {
      startScan();
    }
  }, [bleState]);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>FP111 LIVE</Text>

      <Text style={{ marginTop: 10 }}>Status: {statusMessage}</Text>

      {step === "scanning" && (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setSelected(item);
                connectAndProvision(item);
              }}
              style={{
                padding: 15,
                marginTop: 10,
                backgroundColor: "#eee",
                borderRadius: 10,
              }}
            >
              <Text>{item.name}</Text>
              <Text>RSSI: {item.rssi}</Text>
            </Pressable>
          )}
        />
      )}

      {step === "connected" && (
        <Text style={{ marginTop: 20, color: "green" }}>
          ✅ Verbonden met teller
        </Text>
      )}

      <Pressable
        onPress={startScan}
        style={{
          marginTop: 20,
          padding: 15,
          backgroundColor: "black",
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white" }}>Scan opnieuw</Text>
      </Pressable>
    </View>
  );
}
