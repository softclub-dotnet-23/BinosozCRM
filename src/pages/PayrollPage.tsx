import { Wallet } from "lucide-react";
import { PlaceholderPage } from "../components/ui/PlaceholderPage";

export default function PayrollPage() {
  return (
    <PlaceholderPage
      title="Зарплаты"
      subtitle="Начисления, удержания и утверждение выплат"
      icon={Wallet}
      note="Полный расчёт зарплат появится здесь. Утверждение текущего расчёта уже доступно на странице «Обзор»."
    />
  );
}
