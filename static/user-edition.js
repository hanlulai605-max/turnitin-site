document.addEventListener("DOMContentLoaded", function () {
  var tabs = Array.from(document.querySelectorAll("[data-service-tab]"));
  var panels = Array.from(document.querySelectorAll("[data-service-panel]"));
  var codeInput = document.getElementById("submit-code");
  var usagePanel = document.getElementById("card-usage");
  var feedback = document.getElementById("card-usage-feedback");
  var pendingRequest = null;
  var timer = null;

  function activatePanel(name) {
    tabs.forEach(function (tab) {
      var active = tab.dataset.serviceTab === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    panels.forEach(function (panel) {
      var active = panel.dataset.servicePanel === name;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { activatePanel(tab.dataset.serviceTab); });
  });

  function clearUsage(message) {
    if (usagePanel) {
      usagePanel.hidden = true;
      usagePanel.classList.remove("exhausted");
    }
    if (feedback) feedback.textContent = message || "";
  }

  function setUsage(result) {
    if (!usagePanel) return;
    usagePanel.querySelector('[data-usage="edition"]').textContent = result.edition;
    usagePanel.querySelector('[data-usage="total"]').textContent = result.total_uses;
    usagePanel.querySelector('[data-usage="used"]').textContent = result.used_count;
    usagePanel.querySelector('[data-usage="remaining"]').textContent = result.remaining_uses;
    usagePanel.hidden = false;
    usagePanel.classList.toggle("exhausted", !result.available);
    if (feedback) feedback.textContent = result.available ? "卡密可用，可继续提交" : "此卡密次数已用完，不能继续提交";
  }

  async function identifyEdition() {
    var code = (codeInput.value || "").trim().toUpperCase();
    codeInput.value = code;
    if (!/^JW-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      clearUsage();
      return;
    }
    if (pendingRequest) pendingRequest.abort();
    pendingRequest = new AbortController();
    var data = new FormData();
    data.append("code", code);
    try {
      var response = await fetch("/api/card/type", { method: "POST", body: data, signal: pendingRequest.signal });
      var result = await response.json();
      if (!response.ok || !result.ok) {
        clearUsage("未识别到有效兑换码，请检查后重试");
        return;
      }
      setUsage(result);
    } catch (error) {
      if (error.name !== "AbortError") clearUsage("卡密信息暂不可用，提交时仍会由系统校验");
    }
  }

  if (codeInput) {
    codeInput.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(identifyEdition, 450);
    });
    codeInput.closest("form").addEventListener("reset", function () {
      setTimeout(function () { clearUsage(); }, 0);
    });
    if (codeInput.value) identifyEdition();
  }

  if (document.querySelector("#query-result-area .query-result")) activatePanel("query");
  window.activateUserServicePanel = activatePanel;
});
