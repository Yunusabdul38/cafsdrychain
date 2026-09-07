import SettingsView from "@/components/dashboard/SettingsView";
import RelayerWalletCard from "@/components/admin/RelayerWalletCard";
import PaymentSettingsCard from "@/components/admin/PaymentSettingsCard";

export default function AdminSettings() {
  return (
    <SettingsView>
      <div className="grid gap-6 lg:grid-cols-2">
        <RelayerWalletCard />
        <PaymentSettingsCard />
      </div>
    </SettingsView>
  );
}
