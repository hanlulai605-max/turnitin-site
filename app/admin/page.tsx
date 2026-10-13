"use client";

import { useState, useEffect } from "react";

function buildUrl(base: string, params: Record<string, string>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) usp.set(k, v);
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

export default function AdminPage() {
  const [tab, setTab] = useState<"codes" | "orders">("codes");
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [codes, setCodes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [importText, setImportText] = useState("");
  const [importEdition, setImportEdition] = useState("standard");
  const [importMsg, setImportMsg] = useState("");
  const [uploadingId, setUploadingId] = useState<string>("");

  useEffect(() => {
    if (!authed || !key) return;
    fetch(buildUrl("/api/admin", { tab, key }))
      .then(r => r.json())
      .then(d => {
        if (d.error) { setAuthed(false); return; }
        if (tab === "codes") setCodes(d.codes || []);
        else setOrders(d.orders || []);
      });
  }, [tab, authed, key]);

  const handleAuth = () => { setAuthed(true); };

  const handleImport = async () => {
    const codeList = importText.split(/[\s,，\n]+/).filter(Boolean);
    if (codeList.length === 0) { setImportMsg("请输入卡密"); return; }
    const res = await fetch(buildUrl("/api/admin", { key }), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import-codes", codes: codeList, edition: importEdition }),
    });
    const d = await res.json();
    if (d.ok) {
      setImportMsg(`成功导入 ${d.imported} / ${d.total} 个卡密`);
      setImportText("");
      const r2 = await fetch(buildUrl("/api/admin", { tab: "codes", key }));
      const d2 = await r2.json();
      setCodes(d2.codes || []);
    } else {
      setImportMsg(d.error || "导入失败");
    }
  };

  const handleUpdateOrder = async (orderId: string) => {
    const status = prompt("状态 (pending/processing/done/failed):", "processing");
    if (!status) return;
    const reportUrl = prompt("报告 URL (可选):", "") || "";
    const message = prompt("备注 (可选):", "") || "";
    await fetch(buildUrl("/api/admin", { key }), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-order", orderId, status, reportUrl, message }),
    });
    const r2 = await fetch(buildUrl("/api/admin", { tab: "orders", key }));
    const d2 = await r2.json();
    setOrders(d2.orders || []);
  };

  const handleUploadReport = async (orderId: string, file: File) => {
    setUploadingId(orderId);
    try {
      const fd = new FormData();
      fd.append("orderId", orderId);
      fd.append("status", "done");
      fd.append("report", file);
      const res = await fetch("/api/worker/upload-report", {
        method: "POST",
        headers: { "x-worker-key": "worker456" },
        body: fd,
      });
      const d = await res.json();
      if (res.ok) {
        const r2 = await fetch(buildUrl("/api/admin", { tab: "orders", key }));
        const d2 = await r2.json();
        setOrders(d2.orders || []);
        alert("报告上传成功！\n用户下载地址：/api/report/" + orderId);
      } else {
        alert("上传失败：" + (d.error || "未知错误"));
      }
    } catch (e: any) {
      alert("上传失败：" + e.message);
    } finally {
      setUploadingId("");
    }
  };

  if (!authed) {
    return (
      <div style={{ maxWidth: 400, margin: "100px auto" }}>
        <h1 style={{ fontFamily: "ui-monospace", color: "#5d8db8" }}>管理后台登录</h1>
        <div className="panel" style={{ background: "#18212b", border: "1px solid #2b3947", borderRadius: 14, padding: 24 }}>
          <label className="field-label">管理员密码</label>
          <input value={key} onChange={e => setKey(e.target.value)} type="password" placeholder="默认 admin123" />
          <button className="button" onClick={handleAuth} style={{ marginTop: 16 }}>登录</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">TURNITIN <span>管理后台</span></a>
        <nav><a href="/">返回前台</a></nav>
      </header>

      <main className="container">
        <nav className="admin-tabs">
          <a className={`admin-tab ${tab === "codes" ? "active" : ""}`} onClick={e => { e.preventDefault(); setTab("codes"); }} href="#">卡密管理</a>
          <a className={`admin-tab ${tab === "orders" ? "active" : ""}`} onClick={e => { e.preventDefault(); setTab("orders"); }} href="#">订单管理</a>
        </nav>

        {tab === "codes" && (
          <>
            <div className="panel" style={{ marginBottom: 20 }}>
              <h2>批量导入卡密</h2>
              <label className="field-label">卡密（每行一个，或用逗号/空格分隔）</label>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY-YYYY"
                rows={6}
                style={{ width: "100%", background: "#0f151b", border: "1px solid #2b3947", borderRadius: 8, padding: 12, color: "#edf1eb", marginTop: 6, fontFamily: "ui-monospace" }}
              />
              <label className="field-label">版本</label>
              <select value={importEdition} onChange={e => setImportEdition(e.target.value)}>
                <option value="standard">standard</option>
                <option value="advanced">advanced</option>
                <option value="ai">ai</option>
              </select>
              <div style={{ marginTop: 14 }}>
                <button className="button" onClick={handleImport}>导入</button>
                {importMsg && <span style={{ marginLeft: 12, color: "#2cc39a" }}>{importMsg}</span>}
              </div>
            </div>

            <div className="panel">
              <h2>卡密列表（最近 {codes.length} 条）</h2>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>卡密</th><th>版本</th><th>已用</th><th>总数</th><th>状态</th><th>创建时间</th></tr></thead>
                  <tbody>
                    {codes.map((c: any) => (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td><code>{c.code}</code></td>
                        <td>{c.edition}</td>
                        <td>{c.used}</td>
                        <td>{c.total}</td>
                        <td>
                          {c.active ? (c.used >= c.total ? <span className="status warn">已用完</span> : <span className="status ok">可用</span>) : <span className="status warn">禁用</span>}
                        </td>
                        <td>{c.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === "orders" && (
          <div className="panel">
            <h2>订单列表（最近 {orders.length} 条）</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>订单号</th><th>卡密</th><th>文件名</th><th>状态</th><th>报告链接</th><th>操作</th></tr></thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id}>
                      <td><code>{o.order_id}</code></td>
                      <td><code>{o.code}</code></td>
                      <td>{o.filename}</td>
                      <td>
                        <span className={`status ${o.status === "done" ? "ok" : "warn"}`}>
                          {o.status === "pending" ? "待处理" : o.status === "processing" ? "检测中" : o.status === "done" ? "已完成" : o.status}
                        </span>
                      </td>
                      <td>
                        {o.report_file ? (
                          <a href={`/api/report/${o.order_id}`} target="_blank">本地报告 ✓</a>
                        ) : o.report_url ? (
                          <a href={o.report_url} target="_blank">上游链接</a>
                        ) : "-"}
                      </td>
                      <td>
                        <label className="upload-button" style={{ marginRight: 6, fontSize: 12 }}>
                          {uploadingId === o.order_id ? "上传中..." : "📄 上传报告"}
                          <input
                            type="file"
                            accept=".pdf"
                            style={{ display: "none" }}
                            disabled={!!uploadingId}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadReport(o.order_id, f);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <button className="text-button" onClick={() => handleUpdateOrder(o.order_id)}>更新</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
