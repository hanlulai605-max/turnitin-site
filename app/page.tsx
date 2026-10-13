"use client";

import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [tab, setTab] = useState<"submit" | "query">("submit");
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [queryCode, setQueryCode] = useState("");
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 拖拽上传
  useEffect(() => {
    const zone = document.querySelector(".upload-drop");
    if (!zone) return;
    const prevent = (e: Event) => e.preventDefault();
    const handleDrop = (e: any) => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f) setFile(f);
    };
    zone.addEventListener("dragover", prevent);
    zone.addEventListener("drop", handleDrop);
    return () => {
      zone.removeEventListener("dragover", prevent);
      zone.removeEventListener("drop", handleDrop);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setUploadMsg({ type: "error", text: "请输入兑换码" }); return; }
    if (!file) { setUploadMsg({ type: "error", text: "请上传检测文件" }); return; }
    setUploading(true);
    setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append("code", code.trim());
      fd.append("document", file);
      const res = await fetch("/api/submit", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setUploadMsg({ type: "success", text: `提交成功！订单号：${data.orderId}，请在 5-15 分钟后切换到"查询报告"查看结果。` });
        setCode(""); setFile(null);
      } else {
        setUploadMsg({ type: "error", text: data.error || "提交失败" });
      }
    } catch (err: any) {
      setUploadMsg({ type: "error", text: "网络错误，请稍后重试" });
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryCode.trim()) return;
    setQuerying(true);
    setQueryResult(null);
    try {
      const res = await fetch(`/api/query?code=${encodeURIComponent(queryCode.trim())}`);
      const data = await res.json();
      if (res.ok) {
        setQueryResult(data);
      } else {
        setQueryResult({ error: data.error || "查询失败" });
      }
    } catch {
      setQueryResult({ error: "网络错误" });
    } finally {
      setQuerying(false);
    }
  };

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">TURNITIN <span>文档检测</span></a>
        <nav><a href="/">用户提交</a></nav>
      </header>

      <main className="container">
        <div className="user-workspace">
          <section className="service-card" aria-labelledby="service-title">
            <header className="service-brand">
              <span>DOCUMENT INTELLIGENCE</span>
              <h1 id="service-title">Turnitin</h1>
              <p>论文检测服务</p>
            </header>

            <nav className="service-tabs" aria-label="服务功能">
              <button
                type="button"
                className={`service-tab ${tab === "submit" ? "active" : ""}`}
                onClick={() => setTab("submit")}
              >提交检测</button>
              <button
                type="button"
                className={`service-tab ${tab === "query" ? "active" : ""}`}
                onClick={() => setTab("query")}
              >查询报告</button>
            </nav>

            {tab === "submit" ? (
              <div className="service-panel active" data-service-panel="submit">
                <form className="submit-form" onSubmit={handleSubmit}>
                  <label className="field-label" htmlFor="submit-code">兑换码</label>
                  <div className="code-field">
                    <input
                      id="submit-code"
                      name="code"
                      required
                      autoComplete="off"
                      placeholder="请输入您的兑换码"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                    <span>自动识别版本</span>
                  </div>

                  <label className="field-label">上传文件</label>
                  <label className="upload-drop" htmlFor="document-upload">
                    <input
                      id="document-upload"
                      type="file"
                      name="document"
                      required
                      accept=".pdf,.doc,.docx,.txt,.rtf,.pptx"
                      ref={fileInputRef}
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <strong>{file ? `已选择：${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)` : "点击选择，或将文件拖拽到这里"}</strong>
                    <small>支持 PDF、DOC、DOCX、TXT、RTF、PPTX 格式，最大 50MB</small>
                  </label>

                  <button className="button submit-button" type="submit" disabled={uploading}>
                    {uploading ? "提交中..." : "提交检测"}
                  </button>
                </form>

                {uploadMsg && (
                  <div className={`alert ${uploadMsg.type === "error" ? "error" : "success"}`}>
                    {uploadMsg.text}
                  </div>
                )}

                <aside className="service-notes" aria-label="服务说明">
                  <strong>提交前请确认</strong>
                  <ul>
                    <li>提交后 5-15 分钟点击查询报告，可查看报告</li>
                    <li>全程自助操作，安全独享，不泄露不收录</li>
                    <li>结果准确。提交检测后 5-10 分钟完成，可下载报告；如遇官网高峰期可能延长。AI 可检测正文满 350 词以上、全文不超过 30000 词的英文/日文/西班牙文论文</li>
                    <li>检测完成后请及时下载报告，系统不定时删除；也可以下载后手动删除</li>
                  </ul>
                </aside>
              </div>
            ) : (
              <div className="service-panel active" data-service-panel="query">
                <section className="query-section">
                  <div className="section-heading">
                    <div>
                      <span className="section-index">02</span>
                      <h2>查询报告</h2>
                    </div>
                    <p>使用提交文档时的兑换码查询</p>
                  </div>
                  <form onSubmit={handleQuery}>
                    <label className="field-label" htmlFor="query-code">兑换码</label>
                    <input
                      id="query-code"
                      name="code"
                      required
                      autoComplete="off"
                      placeholder="输入提交时使用的兑换码"
                      value={queryCode}
                      onChange={(e) => setQueryCode(e.target.value)}
                    />
                    <button className="button" type="submit" disabled={querying}>
                      {querying ? "查询中..." : "查询检测结果"}
                    </button>
                  </form>

                  <div id="query-result-area" aria-live="polite">
                    {queryResult?.error && (
                      <div className="alert error">{queryResult.error}</div>
                    )}
                    {queryResult && !queryResult.error && (
                      <div className="result">
                        <h3>查询结果</h3>
                        <p>订单号：<code>{queryResult.orderId}</code></p>
                        <p>状态：<span className={`status ${queryResult.status === "done" ? "ok" : "warn"}`}>
                          {queryResult.status === "done" ? "已完成" : queryResult.status === "processing" ? "检测中" : "待处理"}
                        </span></p>
                        {queryResult.status === "done" && (queryResult.downloadUrl || queryResult.reportUrl) && (
                          <div className="result-links" style={{ marginTop: 14 }}>
                            <a href={queryResult.downloadUrl || queryResult.reportUrl} target="_blank" rel="noreferrer" className="button">
                              {queryResult.hasLocalReport ? "📥 下载检测报告（本地）" : "📥 下载检测报告"}
                            </a>
                          </div>
                        )}
                        {queryResult.status !== "done" && (
                          <p className="muted" style={{ marginTop: 10 }}>检测尚未完成，请稍后刷新此页面重试</p>
                        )}
                        {queryResult.message && <p className="muted">{queryResult.message}</p>}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </section>

          <section className="wechat">
            <div>
              <p className="eyebrow">CONTACT</p>
              <h2>需要帮助？联系服务人员</h2>
              <p>微信号：<strong>essay1178</strong></p>
            </div>
            <div style={{ width: 130, height: 130, background: "#fff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a2ae", fontSize: 12 }}>
              微信二维码<br/>（待替换）
            </div>
          </section>
        </div>
      </main>

      <footer>文档检测服务 · 结果自提交起保留 24 小时</footer>
    </>
  );
}
