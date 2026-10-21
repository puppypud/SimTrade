"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import {
  Cog6ToothIcon,
  ChatBubbleBottomCenterTextIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

export default function AdminConfigTab() {
  const [activeSubTab, setActiveSubTab] = useState("risk");
  const [riskConfigs, setRiskConfigs] = useState<Record<string, any>>({});
  const [feedbackConfigs, setFeedbackConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // For editing Risk Config
  const [selectedTraderType, setSelectedTraderType] = useState("SCALPER");
  const [editingRisk, setEditingRisk] = useState<any>(null);

  // For editing Feedback Config
  const [selectedFeedbackType, setSelectedFeedbackType] = useState("FOMO_ALERT");
  const [editingFeedback, setEditingFeedback] = useState<any>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const riskRes = await axios.get("http://localhost:8080/broker/admin/configs/risk");
      const feedbackRes = await axios.get("http://localhost:8080/broker/admin/configs/feedback");
      
      setRiskConfigs(riskRes.data);
      setFeedbackConfigs(feedbackRes.data);

      if (riskRes.data["SCALPER"]) {
        setEditingRisk({ ...riskRes.data["SCALPER"] });
      }
      
      const feedbackKeys = Object.keys(feedbackRes.data);
      if (feedbackKeys.length > 0) {
        setSelectedFeedbackType(feedbackKeys[0]);
        setEditingFeedback({ ...feedbackRes.data[feedbackKeys[0]] });
      }
    } catch (error) {
      console.error("Error fetching configs:", error);
      toast.error("ไม่สามารถดึงข้อมูล Config ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // --- Handlers for Risk Config ---
  const handleTraderTypeChange = (type: string) => {
    setSelectedTraderType(type);
    setEditingRisk({ ...riskConfigs[type] });
  };

  const handleRiskChange = (field: string, value: string) => {
    setEditingRisk((prev: any) => ({ ...prev, [field]: Number(value) }));
  };

  const saveRiskConfig = async () => {
    try {
      await axios.put(`http://localhost:8080/broker/admin/configs/risk/${selectedTraderType}`, editingRisk);
      toast.success("บันทึกเกณฑ์ความเสี่ยงเรียบร้อยแล้ว");
      fetchConfigs();
    } catch (error) {
      console.error("Save risk config error:", error);
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  // --- Handlers for Feedback Config ---
  const handleFeedbackTypeChange = (type: string) => {
    setSelectedFeedbackType(type);
    setEditingFeedback({ ...feedbackConfigs[type] });
  };

  const handleFeedbackChange = (field: string, value: string) => {
    setEditingFeedback((prev: any) => ({ ...prev, [field]: value }));
  };

  const saveFeedbackConfig = async () => {
    try {
      await axios.put(`http://localhost:8080/broker/admin/configs/feedback/${selectedFeedbackType}`, editingFeedback);
      toast.success("บันทึกข้อความแจ้งเตือนเรียบร้อยแล้ว");
      fetchConfigs();
    } catch (error) {
      console.error("Save feedback config error:", error);
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-muted">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sub-Tab Navigation */}
      <div className="flex gap-2 border-b border-theme-border pb-2">
        <button
          onClick={() => setActiveSubTab("risk")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeSubTab === "risk"
              ? "bg-gold text-surface"
              : "bg-surface text-muted hover:bg-surface-hover"
          }`}
        >
          <ChartBarIcon className="w-5 h-5" />
          เกณฑ์ตรวจจับพฤติกรรม (Risk Criteria)
        </button>
        <button
          onClick={() => setActiveSubTab("feedback")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeSubTab === "feedback"
              ? "bg-gold text-surface"
              : "bg-surface text-muted hover:bg-surface-hover"
          }`}
        >
          <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
          ข้อความแจ้งเตือน (Feedback Templates)
        </button>
      </div>

      {/* --- RISK CONFIG SECTION --- */}
      {activeSubTab === "risk" && editingRisk && (
        <div className="bg-surface border border-theme-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Cog6ToothIcon className="w-6 h-6 text-gold" />
              ตั้งค่าเกณฑ์ความเสี่ยง
            </h2>
            <div className="flex gap-2">
              {Object.keys(riskConfigs).map((type) => (
                <button
                  key={type}
                  onClick={() => handleTraderTypeChange(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedTraderType === type
                      ? "bg-gold/20 text-gold border border-gold/50"
                      : "bg-background text-muted border border-theme-border hover:border-gold/30"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FOMO Config */}
            <div className="p-4 bg-background rounded-lg border border-theme-border space-y-4">
              <h3 className="font-semibold text-gold flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-4 h-4" /> FOMO (กลัวตกรถ)
              </h3>
              <InputField label="Max Orders (ครั้ง)" value={editingRisk.fomoMaxOrders} onChange={(v) => handleRiskChange("fomoMaxOrders", v)} />
              <InputField label="Price Surge (%)" value={editingRisk.fomoPriceSurgePercent} onChange={(v) => handleRiskChange("fomoPriceSurgePercent", v)} />
            </div>

            {/* Panic Sell Config */}
            <div className="p-4 bg-background rounded-lg border border-theme-border space-y-4">
              <h3 className="font-semibold text-red-400 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" /> Panic Sell (ตื่นตระหนก)
              </h3>
              <InputField label="Price Drop (%)" value={editingRisk.panicSellPriceDropPercent} onChange={(v) => handleRiskChange("panicSellPriceDropPercent", v)} />
              <InputField label="Volume Sold (%)" value={editingRisk.panicSellVolumePercent} onChange={(v) => handleRiskChange("panicSellVolumePercent", v)} />
            </div>

            {/* Sell Early Config */}
            <div className="p-4 bg-background rounded-lg border border-theme-border space-y-4">
              <h3 className="font-semibold text-blue-400 flex items-center gap-2">
                <InformationCircleIcon className="w-4 h-4" /> Sell Early (รีบขายหมู)
              </h3>
              <InputField label="Expected Profit (%)" value={editingRisk.takeProfitExpectedPercent} onChange={(v) => handleRiskChange("takeProfitExpectedPercent", v)} />
              <InputField label="Trigger Early (%)" value={editingRisk.sellingTooEarlyTriggerPercent} onChange={(v) => handleRiskChange("sellingTooEarlyTriggerPercent", v)} />
            </div>

            {/* Holding Losers Config */}
            <div className="p-4 bg-background rounded-lg border border-theme-border space-y-4">
              <h3 className="font-semibold text-orange-400 flex items-center gap-2">
                <ShieldCheckIcon className="w-4 h-4" /> Hold Losers (ทนรวยไม่ได้ ทนขาดทุนเก่ง)
              </h3>
              <InputField label="Loss Trigger (%)" value={editingRisk.holdingLoserLossPercent} onChange={(v) => handleRiskChange("holdingLoserLossPercent", v)} />
              <InputField label="Max Days Hold (วัน)" value={editingRisk.holdingLoserMaxDays} onChange={(v) => handleRiskChange("holdingLoserMaxDays", v)} />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={saveRiskConfig} className="bg-gold text-surface px-6 py-2 rounded-lg font-bold hover:bg-gold/80 transition-all">
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      )}

      {/* --- FEEDBACK CONFIG SECTION --- */}
      {activeSubTab === "feedback" && editingFeedback && (
        <div className="bg-surface border border-theme-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-gold" />
              จัดการข้อความแจ้งเตือนระบบ
            </h2>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar list */}
            <div className="w-full md:w-1/3 flex flex-col gap-2">
              {Object.keys(feedbackConfigs).map((type) => (
                <button
                  key={type}
                  onClick={() => handleFeedbackTypeChange(type)}
                  className={`p-3 text-left rounded-lg transition-all border ${
                    selectedFeedbackType === type
                      ? "bg-gold/10 border-gold/50 text-gold font-bold"
                      : "bg-background border-theme-border text-muted hover:border-gold/30"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Editor */}
            <div className="w-full md:w-2/3 space-y-4 bg-background p-5 rounded-lg border border-theme-border">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">หัวข้อ (Title)</label>
                <input
                  type="text"
                  value={editingFeedback.title}
                  onChange={(e) => handleFeedbackChange("title", e.target.value)}
                  className="w-full bg-surface border border-theme-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">ระดับความรุนแรง (Severity)</label>
                <select
                  value={editingFeedback.severity}
                  onChange={(e) => handleFeedbackChange("severity", e.target.value)}
                  className="w-full bg-surface border border-theme-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold"
                >
                  <option value="WARNING">WARNING (แจ้งเตือนสีส้ม)</option>
                  <option value="DANGER">DANGER (อันตรายสีแดง)</option>
                  <option value="INFO">INFO (ข้อมูลสีฟ้า)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">ข้อความ (Message)</label>
                <textarea
                  rows={4}
                  value={editingFeedback.message}
                  onChange={(e) => handleFeedbackChange("message", e.target.value)}
                  className="w-full bg-surface border border-theme-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={saveFeedbackConfig} className="bg-gold text-surface px-6 py-2 rounded-lg font-bold hover:bg-gold/80 transition-all">
                  บันทึกข้อความ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({ label, value, onChange }: { label: string; value: any; onChange: (val: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted">{label}</span>
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 bg-surface border border-theme-border rounded-lg px-2 py-1 text-sm text-right text-foreground focus:outline-none focus:border-gold"
      />
    </div>
  );
}

// Icons
function ArrowTrendingUpIcon(props: any) {
  return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>;
}
function ShieldCheckIcon(props: any) {
  return <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>;
}
