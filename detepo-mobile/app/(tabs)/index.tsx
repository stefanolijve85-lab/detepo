import { useEffect, useState } from "react";
import { Text, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [counters, setCounters] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCounters();
  }, []);

  const fetchCounters = async () => {
    try {
      setLoading(true);

      const response = await fetch("https://dashboard.detepo.com/api/counters");

      const json = await response.json();

      console.log("COUNTERS:", json);

      setCounters(json);
    } catch (e) {
      console.log(e);
      setError("Fout bij ophalen data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold" }}>Detepo Tellers</Text>

        {loading && <ActivityIndicator size="large" />}

        {error && <Text style={{ color: "red" }}>{error}</Text>}

        {counters.map((c) => (
          <View
            key={c.uuid}
            style={{
              marginTop: 20,
              padding: 15,
              backgroundColor: "#eee",
              borderRadius: 10,
            }}
          >
            <Text style={{ fontWeight: "bold" }}>{c.uuid}</Text>

            <Text>IN: {c.today_in}</Text>
            <Text>OUT: {c.today_out}</Text>

            <Text>Status: {c.online ? "Online" : "Offline"}</Text>

            <Text>Batterij: {c.battery}%</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}
