import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, ScreenTitle } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Vehicle } from "@/lib/database.types";
import { colors, radius, spacing } from "@/theme";

export default function Vehicles() {
  const { session } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("vehicles")
      .select("*")
      .eq("customer_id", session.user.id)
      .order("created_at", { ascending: false });
    setVehicles(data ?? []);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function resetForm() {
    setMake("");
    setModel("");
    setYear("");
    setColor("");
    setPlate("");
  }

  async function addVehicle() {
    if (!session) return;
    if (!make.trim() && !model.trim()) {
      Alert.alert("Add a vehicle", "Enter at least a make or model.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vehicles").insert({
      customer_id: session.user.id,
      make: make.trim() || null,
      model: model.trim() || null,
      year: year ? Number(year) : null,
      color: color.trim() || null,
      license_plate: plate.trim() || null,
    });
    setSaving(false);
    if (error) {
      Alert.alert("Could not save", error.message);
      return;
    }
    resetForm();
    setModalOpen(false);
    load();
  }

  async function removeVehicle(v: Vehicle) {
    Alert.alert("Remove vehicle", `Remove ${vehicleLabel(v)}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await supabase.from("vehicles").delete().eq("id", v.id);
          load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <ScreenTitle title="My Vehicles" subtitle="Manage the cars on your account." />
        <FlatList
          data={vehicles}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: 120 }}
          ListEmptyComponent={
            <Text style={styles.muted}>No vehicles yet. Add your first one below.</Text>
          }
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleName}>{vehicleLabel(item)}</Text>
                <Text style={styles.muted}>
                  {[item.color, item.license_plate].filter(Boolean).join(" · ") || "—"}
                </Text>
              </View>
              <Pressable onPress={() => removeVehicle(item)} hitSlop={10}>
                <Text style={{ color: colors.danger, fontWeight: "700" }}>Remove</Text>
              </Pressable>
            </Card>
          )}
        />
      </View>

      <View style={styles.fabWrap}>
        <Button title="+ Add Vehicle" onPress={() => setModalOpen(true)} />
      </View>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <ScreenTitle title="Add Vehicle" />
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Field label="Make" value={make} onChangeText={setMake} placeholder="Toyota" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Model" value={model} onChangeText={setModel} placeholder="Camry" />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Field label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="2022" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Color" value={color} onChangeText={setColor} placeholder="Silver" />
                </View>
              </View>
              <Field label="License plate" value={plate} onChangeText={setPlate} autoCapitalize="characters" placeholder="ABC1234" />
              <Button title="Save Vehicle" onPress={addVehicle} loading={saving} />
              <Button title="Cancel" variant="ghost" onPress={() => setModalOpen(false)} />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function vehicleLabel(v: Vehicle) {
  return (
    [v.year, v.make, v.model].filter(Boolean).join(" ") ||
    v.nickname ||
    v.license_plate ||
    "Vehicle"
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center" },
  vehicleName: { color: colors.text, fontSize: 17, fontWeight: "700" },
  muted: { color: colors.textMuted, marginTop: 2 },
  fabWrap: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderRadius: radius.lg, padding: spacing.lg },
});
