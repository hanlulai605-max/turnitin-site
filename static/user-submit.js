document.addEventListener("DOMContentLoaded", function () {
  var form = document.querySelector('form[action="/submit"]');
  if (!form) return;
  form.querySelectorAll("[required]").forEach(function (field) { field.removeAttribute("required"); });
  var button = form.querySelector("button[type=submit]");
  var fileInput = form.querySelector("input[name=document]");
  var uploadZone = form.querySelector(".upload-drop");
  var uploadState = document.createElement("span");
  uploadState.className = "upload-file-state";
  if (uploadZone) uploadZone.appendChild(uploadState);
  function updateFileState() {
    var file = fileInput && fileInput.files.length ? fileInput.files[0] : null;
    uploadState.textContent = file ? "✓ 已选择：" + file.name : "";
    if (uploadZone) uploadZone.classList.toggle("has-file", !!file);
  }
  if (fileInput) fileInput.addEventListener("change", updateFileState);
  if (uploadZone && fileInput) {
    ["dragenter", "dragover"].forEach(function (eventName) { uploadZone.addEventListener(eventName, function (event) { event.preventDefault(); uploadZone.classList.add("is-dragover"); }); });
    ["dragleave", "drop"].forEach(function (eventName) { uploadZone.addEventListener(eventName, function (event) { event.preventDefault(); uploadZone.classList.remove("is-dragover"); }); });
    uploadZone.addEventListener("drop", function (event) {
      if (!event.dataTransfer.files.length) return;
      var transfer = new DataTransfer();
      transfer.items.add(event.dataTransfer.files[0]);
      fileInput.files = transfer.files;
      fileInput.dispatchEvent(new Event("change", {bubbles:true}));
    });
  }
  function closeModal() { var modal = document.getElementById("submit-feedback-modal"); if (modal) modal.remove(); }
  function showModal(title, message, success, code) {
    closeModal();
    var modal = document.createElement("div");
    modal.id = "submit-feedback-modal";
    modal.className = "submit-modal-backdrop";
    modal.innerHTML = "<div class=\"submit-modal\" role=\"dialog\" aria-modal=\"true\"><div class=\"success-mark " + (success ? "" : "error-mark") + "\">" + (success ? "✓" : "!") + "</div><h2>" + title + "</h2><p>" + message + "</p><div class=\"modal-actions\"><button type=\"button\" class=\"button secondary modal-close-button\">确认</button>" + (success ? "<button type=\"button\" class=\"button modal-query-button\">立即查询</button>" : "") + "</div></div>";
    document.body.appendChild(modal);
    modal.querySelector(".modal-close-button").addEventListener("click", closeModal);
    modal.addEventListener("click", function (event) { if (event.target === modal) closeModal(); });
    var queryButton = modal.querySelector(".modal-query-button");
    if (queryButton) queryButton.addEventListener("click", function () { closeModal(); if (window.activateUserServicePanel) window.activateUserServicePanel("query"); var queryInput = document.querySelector('#query-form input[name="code"]'); if (queryInput) queryInput.value = code; var queryForm = document.getElementById("query-form"); if (queryForm) queryForm.scrollIntoView({ behavior: "smooth", block: "center" }); });
  }
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var codeInput = form.querySelector("input[name=code]");
    var code = codeInput.value.trim();
    if (!code) { showModal("请输入卡密", "请输入有效卡密后再提交检测。", false); codeInput.focus(); return; }
    if (!fileInput.files.length) { showModal("请选择文档文件", "请先选择需要检测的文档文件。", false); fileInput.focus(); return; }
    button.disabled = true;
    button.textContent = "提交中…";
    try {
      var response = await fetch("/api/submit", { method: "POST", body: new FormData(form), headers: { "X-Requested-With": "XMLHttpRequest" } });
      var data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "提交失败，请检查卡密和文件");
      form.reset();
      updateFileState();
      var remainingText = data.card_usage ? " 当前卡密剩余 " + data.card_usage.remaining_uses + " 次。" : "";
      showModal("提交成功", "文档已进入检测队列，请稍后凭卡密查询检测结果。" + remainingText, true, data.code);
    } catch (error) { showModal("提交失败", error.message || "提交失败，请稍后重试。", false); }
    finally { button.disabled = false; button.textContent = "提交检测"; }
  });
});
