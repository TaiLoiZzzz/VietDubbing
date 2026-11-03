// Academic Glossary Topic Selector for VietDub AI

const TOPIC_DETAILS = {
  software_engineering: { count: 1931, name: "Lập trình & Kỹ thuật Phần mềm" },
  ai_ml: { count: 254, name: "Trí tuệ Nhân tạo & Data Science" },
  cybersecurity_networks: { count: 166, name: "An ninh mạng & Mạng máy tính" },
  medicine_biotech: { count: 147, name: "Y học, Dược học & Sinh học" },
  finance_economics: { count: 142, name: "Kinh tế, Tài chính & Đầu tư" },
  math_statistics: { count: 133, name: "Toán học & Xác suất Thống kê" },
  electronics_robotics: { count: 115, name: "Kỹ thuật Điện tử & Robotics" },
  physics_astronomy: { count: 110, name: "Vật lý & Thiên văn học" },
  psychology_neuroscience: { count: 109, name: "Tâm lý học & Khoa học Thần kinh" },
  marketing_business: { count: 107, name: "Quản trị Kinh doanh & Marketing" }
};

function updateBadge(badge, selectEl) {
  const val = selectEl.value;
  if (val && TOPIC_DETAILS[val]) {
    badge.className = "academic-badge on";
    badge.textContent = `Bảo vệ ${TOPIC_DETAILS[val].count} từ`;
  } else {
    badge.className = "academic-badge off";
    badge.textContent = "Tắt";
  }
}

function initWidgetLogic() {
  const select = document.getElementById("academic-topic-select");
  const badge = document.getElementById("academic-status-badge");
  if (!select || !badge) return;

  // Restore saved selection from storage
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["academic_topic"], (result) => {
      if (result && result.academic_topic) {
        select.value = result.academic_topic;
      } else {
        select.value = "";
      }
      updateBadge(badge, select);
    });
  }

  // Handle user change
  select.addEventListener("change", () => {
    const topic = select.value;
    updateBadge(badge, select);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ academic_topic: topic }, () => {
        console.log("[AcademicSelector] Saved academic topic:", topic);
      });
    }
  });
}

function mountWidget() {
  if (document.getElementById("academic-glossary-widget")) return;

  const main = document.querySelector("#app main") || document.querySelector("#app");
  if (!main) return;

  const widget = document.createElement("div");
  widget.id = "academic-glossary-widget";
  widget.className = "academic-widget-container";
  widget.innerHTML = `
    <div class="academic-widget-header">
      <div class="academic-widget-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        <span>Chủ đề Thuật ngữ Học thuật</span>
      </div>
      <span id="academic-status-badge" class="academic-badge off">Tắt</span>
    </div>
    <div class="academic-select-wrap">
      <select id="academic-topic-select" class="academic-select">
        <option value="">⚪ Tắt (Dịch phổ thông)</option>
        <option value="software_engineering">💻 Lập trình & Kỹ thuật Phần mềm (1.931 từ)</option>
        <option value="ai_ml">🤖 Trí tuệ Nhân tạo & Data Science (254 từ)</option>
        <option value="cybersecurity_networks">🛡️ An ninh mạng & Mạng máy tính (166 từ)</option>
        <option value="medicine_biotech">🧬 Y học, Dược học & Sinh học (147 từ)</option>
        <option value="finance_economics">📈 Kinh tế, Tài chính & Đầu tư (142 từ)</option>
        <option value="math_statistics">📐 Toán học & Xác suất Thống kê (133 từ)</option>
        <option value="electronics_robotics">⚡ Kỹ thuật Điện tử & Robotics (115 từ)</option>
        <option value="physics_astronomy">🌌 Vật lý & Thiên văn học (110 từ)</option>
        <option value="psychology_neuroscience">🧠 Tâm lý học & Khoa học Thần kinh (109 từ)</option>
        <option value="marketing_business">📊 Quản trị Kinh doanh & Marketing (107 từ)</option>
      </select>
    </div>
  `;

  // Insert right below the Language Selector (first element in main)
  if (main.children.length > 0) {
    main.insertBefore(widget, main.children[1] || main.firstChild);
  } else {
    main.appendChild(widget);
  }

  initWidgetLogic();
}

// Observe DOM for Vue mounting
const observer = new MutationObserver(() => {
  if (document.querySelector("#app main") && !document.getElementById("academic-glossary-widget")) {
    mountWidget();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial attempt
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountWidget);
} else {
  mountWidget();
}
