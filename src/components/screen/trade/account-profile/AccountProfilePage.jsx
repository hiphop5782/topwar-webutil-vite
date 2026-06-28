import { useMemo, useState } from "react";
import "./AccountProfilePage.css";
import { sampleAccount } from "./data/sampleAccount";
import ProfileHeader from "./components/ProfileHeader";
import SummaryDashboard from "./components/SummaryDashboard";
import TabNavigation from "./components/TabNavigation";
import OverviewTab from "./components/OverviewTab";
import MarchTab from "./components/MarchTab";
import BaseSkinTab from "./components/BaseSkinTab";
import DecorTab from "./components/DecorTab";
import BeastTab from "./components/BeastTab";
import FormationTab from "./components/FormationTab";
import InventoryTab from "./components/InventoryTab";

const TABS = [
    { id: "overview", label: "Summary" },
    { id: "troops", label: "Troops" },
    { id: "bases", label: "Base Skin" },
    { id: "decor", label: "Queue / Decor" },
    { id: "beasts", label: "Beast" },
    { id: "formation", label: "Formation" },
    { id: "inventory", label: "Enigma / Etc" },
];

export default function AccountProfilePage() {
    const [activeTab, setActiveTab] = useState(TABS[0].id);
    const account = sampleAccount;

    const activePanel = useMemo(() => {
        switch (activeTab) {
            case "bases":
                return <BaseSkinTab baseSkins={account.baseSkins} />;
            case "decor":
                return <DecorTab decors={account.decors} />;
            case "beasts":
                return <BeastTab beasts={account.beasts} />;
            case "formation":
                return <FormationTab formation={account.formation} />;
            case "inventory":
                return <InventoryTab inventory={account.inventory} enigma={account.enigma} />;
            case "overview":
                return <OverviewTab account={account} onSelectTab={setActiveTab} />;
            case "troops":
            default:
                return <MarchTab branches={account.branches} supportHeroes={account.supportHeroes} />;
        }
    }, [account, activeTab]);

    return (
        <main className="account-profile-page">
            <div className="account-profile-shell">
                <ProfileHeader profile={account.profile} />
                <SummaryDashboard account={account} />
                <TabNavigation tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
                <section className="account-profile-panel">{activePanel}</section>
            </div>
        </main>
    );
}
