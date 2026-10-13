document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("query-form");
  if (!form) return;
  var button = document.getElementById("query-button");
  var defaultButtonText = button.textContent;
  var feedback = document.getElementById("query-feedback");
  var resultArea = document.getElementById("query-result-area");
  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char];
    });
  }
  function resultCard(label, title, name, path, kind, code) {
    if (path) {
      var downloadLabel = kind === "ai" ? "下载 AI 率报告" : "下载重复率报告";
      return "<article class=\"result-card\"><p class=\"result-icon ok-icon\">✓</p><div><p class=\"eyebrow\">" + label + "</p><h3>" + title + "</h3><p class=\"muted\">" + escapeHtml(name) + "</p><a class=\"result-link result-download-button\" href=\"/result/" + encodeURIComponent(code) + "/" + kind + "\" download>" + downloadLabel + "</a></div></article>";
    }
    return "<article class=\"result-card\"><p class=\"result-icon wait-icon\">…</p><div><p class=\"eyebrow\">" + label + "</p><h3>" + title + "</h3><p class=\"muted\">正在处理</p></div></article>";
  }
  function usageSummary(usage) {
    if (!usage) return "";
    return "<section class=\"query-usage " + (usage.available ? "" : "exhausted") + "\"><strong>卡密次数</strong><span>总次数 " + usage.total_uses + "</span><span>已使用 " + usage.used_count + "</span><span class=\"remaining\">剩余 " + usage.remaining_uses + " 次</span></section>";
  }
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var code = form.querySelector("input[name=code]").value.trim();
    if (!code) return;
    button.disabled = true;
    button.textContent = "查询中…";
    feedback.textContent = "";
    feedback.className = "query-feedback loading";
    try {
      var response = await fetch("/api/query", {method:"POST", body:new FormData(form), headers:{"X-Requested-With":"XMLHttpRequest"}});
      var data = await response.json();
      if (!data.order) {
        resultArea.innerHTML = "";
        feedback.textContent = data.message || "未找到订单";
        feedback.className = "query-feedback error-text";
        return;
      }
      resultArea.innerHTML = usageSummary(data.card_usage) + (data.orders || [data.order]).map(function (order) {
      var history = (order.history || data.history || []).map(function (item, index, list) {
        return "<div class=\"timeline-item " + (index === list.length - 1 ? "current" : "") + "\"><span class=\"timeline-dot\"></span><div><strong>" + escapeHtml(item.to_status) + "</strong><small>" + escapeHtml(item.note) + " · " + escapeHtml(item.changed_at) + "</small></div></div>";
      }).join("");
      return "<section class=\"query-result\"><div class=\"result-heading\"><div><p class=\"eyebrow\">ORDER RESULT</p><h2>" + escapeHtml(order.document_name) + "</h2><p class=\"muted\">卡密：" + escapeHtml(order.card_code || order.code) + " · " + escapeHtml(order.submitted_at) + " · " + (order.check_type === "dup" ? "查重" : "查重 + AI") + "</p></div><span class=\"status " + (order.status === "已完成" ? "ok" : "warn") + "\">" + escapeHtml(order.status) + "</span></div><div class=\"status-timeline\">" + history + "</div><div class=\"result-grid\">" + (order.check_type === "dup" ? "" : resultCard("AI RATE", "AI 率检测文件", order.ai_name, order.ai_path, "ai", order.code)) + resultCard("DUPLICATE RATE", "重复率检测文件", order.dup_name, order.dup_path, "dup", order.code) + "</div></section>";
      }).join("");
      feedback.textContent = "查询成功，结果已更新";
      feedback.className = "query-feedback success-text";
    } catch (error) {
      feedback.textContent = "网络异常，请稍后重试";
      feedback.className = "query-feedback error-text";
    } finally {
      button.disabled = false;
      button.textContent = defaultButtonText;
    }
  });
});
