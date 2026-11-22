/**
 * VietDub AI - Custom AI Translation & Audio Balance Add-on
 * Module cho phép người dùng tự dịch phụ đề bằng ChatGPT / Claude / Gemini bên ngoài:
 * 1. Tự động tải phụ đề gốc qua service của app nếu chưa có.
 * 2. Xuất phụ đề đã làm sạch kèm Prompt chuyên nghiệp (Game/GTA bạo lực vs Bài giảng học thuật).
 * 3. Chặn triệt để Google Translate và Segmentation ghi đè bản dịch AI tùy chỉnh.
 * 4. Xóa sạch cache audio cũ, nạp cả googleTranslation & aiTranslation để Edge-TTS đọc chuẩn 100% bản dịch AI.
 * 5. Điều khiển âm lượng tiếng gốc (Game sound/video) và âm lượng thuyết minh AI song song mượt mà.
 * 6. Cho phép hoàn tác về Google Translate mặc định bất kỳ lúc nào chỉ bằng 1 nút bấm.
 */

(function () {
  "use strict";

  const MODAL_ID = "vietdub-ai-custom-modal";
  const BTN_ID = "vietdub-ai-custom-btn";
  const STYLE_ID = "vietdub-ai-custom-style";

  // Lấy âm lượng đã lưu (mặc định tiếng gốc 30%, thuyết minh 100%)
  function getSavedVolumes() {
    let orig = 30;
    let trans = 100;
    try {
      const savedOrig = localStorage.getItem("vietdub_orig_vol");
      const savedTrans = localStorage.getItem("vietdub_trans_vol");
      if (savedOrig !== null && !isNaN(Number(savedOrig))) orig = Math.max(0, Math.min(100, Number(savedOrig)));
      if (savedTrans !== null && !isNaN(Number(savedTrans))) trans = Math.max(0, Math.min(100, Number(savedTrans)));
    } catch (e) {}
    return { orig, trans };
  }

  // 1. Nhúng CSS giao diện Dark theme chuẩn YouTube
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .vietdub-ai-custom-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        outline: none;
        cursor: pointer;
        padding: 0 6px;
        height: 100%;
        color: #fff;
        vertical-align: middle;
        position: relative;
        transition: transform 0.2s, opacity 0.2s;
      }
      .vietdub-ai-custom-btn:hover {
        transform: scale(1.08);
      }
      .vietdub-ai-custom-btn svg {
        fill: #ff334b;
        filter: drop-shadow(0 0 4px rgba(255, 51, 75, 0.5));
      }
      .vietdub-ai-custom-btn-badge {
        position: absolute;
        top: 6px;
        right: 2px;
        background: #ff0033;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        padding: 1px 3px;
        border-radius: 4px;
        line-height: 1;
        letter-spacing: 0.5px;
      }

      /* Modal Overlay */
      .vietdub-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.78);
        backdrop-filter: blur(6px);
        z-index: 999999999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.25s ease, visibility 0.25s ease;
      }
      .vietdub-modal-overlay.active {
        opacity: 1;
        visibility: visible;
      }

      /* Modal Container */
      .vietdub-modal-box {
        background: #18181b;
        border: 1px solid #3f3f46;
        border-radius: 14px;
        width: 90%;
        max-width: 680px;
        max-height: 92vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
        color: #f4f4f5;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        overflow: hidden;
        animation: vietdubZoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes vietdubZoomIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }

      /* Header */
      .vietdub-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        border-bottom: 1px solid #27272a;
        background: #202024;
      }
      .vietdub-modal-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        font-weight: 700;
        color: #fafafa;
      }
      .vietdub-modal-title span.badge {
        background: #ff0033;
        color: #fff;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
      }
      .vietdub-modal-close {
        background: none;
        border: none;
        color: #a1a1aa;
        font-size: 22px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        line-height: 1;
        transition: color 0.15s, background 0.15s;
      }
      .vietdub-modal-close:hover {
        color: #fff;
        background: #3f3f46;
      }

      /* Body */
      .vietdub-modal-body {
        padding: 16px 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      /* Step Box */
      .vietdub-step-card {
        background: #27272a;
        border: 1px solid #3f3f46;
        border-radius: 10px;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .vietdub-step-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .vietdub-step-title {
        font-size: 13px;
        font-weight: 600;
        color: #e4e4e7;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .vietdub-step-desc {
        font-size: 12px;
        color: #a1a1aa;
        line-height: 1.45;
      }

      /* Volume Controls Grid */
      .vietdub-volume-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 4px;
      }
      .vietdub-volume-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .vietdub-volume-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #d4d4d8;
      }
      .vietdub-vol-val {
        font-size: 12px;
        font-weight: 700;
        color: #38bdf8;
      }
      .vietdub-slider {
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: #3f3f46;
        outline: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .vietdub-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #ff0033;
        cursor: pointer;
        box-shadow: 0 0 6px rgba(255, 0, 51, 0.6);
        transition: transform 0.15s;
      }
      .vietdub-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      .vietdub-orig-slider::-webkit-slider-thumb {
        background: #38bdf8;
        box-shadow: 0 0 6px rgba(56, 189, 248, 0.6);
      }

      /* Buttons */
      .vietdub-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        padding: 9px 16px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .vietdub-btn-export {
        background: #3b82f6;
        color: #fff;
      }
      .vietdub-btn-export:hover {
        background: #2563eb;
      }
      .vietdub-btn-export.copied {
        background: #10b981 !important;
      }
      .vietdub-btn-revert {
        background: #475569;
        color: #cbd5e1;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 6px;
      }
      .vietdub-btn-revert:hover {
        background: #64748b;
        color: #fff;
      }
      .vietdub-btn-apply {
        background: #ff0033;
        color: #fff;
        font-size: 13px;
        padding: 10px 18px;
      }
      .vietdub-btn-apply:hover {
        background: #e6002e;
        box-shadow: 0 0 15px rgba(255, 0, 51, 0.4);
      }

      /* Textarea */
      .vietdub-textarea {
        width: 100%;
        height: 130px;
        background: #18181b;
        border: 1px solid #3f3f46;
        border-radius: 8px;
        color: #fafafa;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        padding: 10px;
        resize: vertical;
        box-sizing: border-box;
      }
      .vietdub-textarea:focus {
        outline: none;
        border-color: #ff0033;
        box-shadow: 0 0 0 1px #ff0033;
      }

      /* Status Alert */
      .vietdub-status {
        font-size: 12px;
        padding: 8px 12px;
        border-radius: 6px;
        display: none;
      }
      .vietdub-status.error {
        display: block;
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid #ef4444;
        color: #fca5a5;
      }
      .vietdub-status.success {
        display: block;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid #10b981;
        color: #6ee7b7;
      }

      /* Footer */
      .vietdub-modal-footer {
        padding: 12px 20px;
        border-top: 1px solid #27272a;
        background: #202024;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .vietdub-footer-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .vietdub-footer-right {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .vietdub-btn-cancel {
        background: transparent;
        color: #a1a1aa;
        border: 1px solid #3f3f46;
      }
      .vietdub-btn-cancel:hover {
        background: #27272a;
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  // 2. Tạo câu Prompt đỉnh cao cho AI
  function buildSystemPrompt(cleanJsonList) {
    return `Bạn là chuyên gia dịch thuật và lồng tiếng (dubbing) video/phim/game đỉnh cao.
Nhiệm vụ của bạn là dịch mảng JSON phụ đề dưới đây sang tiếng Việt khẩu ngữ đời thường, tự nhiên, diễn cảm, chuẩn phong cách lồng tiếng thời gian thực.

=== NGUYÊN TẮC VÀ PHONG CÁCH DỊCH (BẮT BUỘC) ===

1. BIẾN HÓA LINH HOẠT THEO NGỮ CẢNH VIDEO:
   - Nếu là GAME / PHIM HÀNH ĐỘNG / ĐƯỜNG PHỐ (GTA 6, Call of Duty, bắn súng, xã hội đen, chửi nhau): 
     -> DỊCH CỰC CĂNG, THOẢI MÁI DÙNG TỪ LÓNG VÀ CHỬI THỀ ĐÚNG LỰC (đ*o, v*i, m* kiếp, chết tiệt, cút m* mày đi, chó chết...). Xưng hô "mày - tao", "anh em - tao" đúng chất giang hồ, combat gay cấn, không né tránh từ ngữ tục tĩu nếu bối cảnh đòi hỏi!
   - Nếu là BÀI GIẢNG / KHOA HỌC / CÔNG NGHỆ / HỌC THUẬT:
     -> Dịch chuẩn xác, học thuật, bám sát thuật ngữ chuyên ngành (Software, AI, Kinh tế, Y khoa...). Giữ nguyên các thuật ngữ tiếng Anh phổ biến (như API, Machine Learning, Framework, Cache, Deploy...) nếu dịch sang tiếng Việt nghe gượng gạo. Xưng hô chuẩn mực: "mình - các bạn", "tôi - quý vị".
   - Nếu là VLOG / NÓI CHUYỆN / STREAMER:
     -> Xưng hô thân mật, hài hước, bắt trend giới trẻ Việt Nam.

2. QUY TẮC TỐC ĐỘ (KHÔNG ĐƯỢC CHẬM TRỄ SO VỚI VIDEO):
   - Tuyệt đối chú ý trường "dur" (thời lượng giây) của từng câu. 
   - Tốc độ nói tiếng Việt chuẩn là: 1 giây nói được khoảng 3 - 4 từ.
   - Câu nào có "dur" ngắn (1.0s - 2.0s): PHẢI DỊCH NGẮN GỌN, ĐANH THÉP, SÚC TÍCH, không dịch rườm rà làm giọng đọc bị trễ nhịp hoặc đè lên câu sau!

3. BẢO TOÀN 100% CẤU TRÚC JSON:
   - Giữ nguyên vẹn tất cả các trường: "index", "start", "end", "dur".
   - CHỈ DỊCH VÀ THAY THẾ nội dung bên trong trường "text".

4. ĐẦU RA:
   - CHỈ TRẢ VỀ DUY NHẤT MẢNG JSON HỢP LỆ (bắt đầu bằng [ và kết thúc bằng ]).
   - KHÔNG kèm lời chào, KHÔNG giải thích, KHÔNG bọc markdown thừa thãi.

DANH SÁCH PHỤ ĐỀ CẦN DỊCH:
${JSON.stringify(cleanJsonList, null, 2)}`;
  }

  // 3. Cài đặt các Hook chặn Google Translate & Ducking âm thanh
  function installCustomAiHooks(player) {
    if (!player) return;

    // A. Chặn kiểm tra cần phân đoạn (Segmentation) khi đang bật AI
    if (!player._origCheckNeedsSegmentation && typeof player.checkNeedsSegmentation === "function") {
      player._origCheckNeedsSegmentation = player.checkNeedsSegmentation.bind(player);
      player.checkNeedsSegmentation = function (t, e) {
        if (player._customAiActive) {
          console.log("[VietDub AI Hook] Bỏ qua Segmentation để bảo vệ mảng câu dịch AI");
          return false;
        }
        return player._origCheckNeedsSegmentation(t, e);
      };
    }

    // B. Chặn chạy tiến trình phân đoạn ghi đè phụ đề
    if (!player._origProcessSubtitlesSegmentation && typeof player.processSubtitlesSegmentation === "function") {
      player._origProcessSubtitlesSegmentation = player.processSubtitlesSegmentation.bind(player);
      player.processSubtitlesSegmentation = async function (t, e) {
        if (player._customAiActive) {
          console.log("[VietDub AI Hook] Đã chặn processSubtitlesSegmentation ghi đè");
          return Promise.resolve();
        }
        return player._origProcessSubtitlesSegmentation(t, e);
      };
    }

    // C. Chặn TranslateService gọi Google Translate online ghi đè câu dịch
    if (player.translateService) {
      if (!player.translateService._origGoogleTranslate && typeof player.translateService.googleTranslate === "function") {
        player.translateService._origGoogleTranslate = player.translateService.googleTranslate.bind(player.translateService);
        player.translateService.googleTranslate = async function (t, e, n) {
          if (player._customAiActive) {
            console.log("[VietDub AI Hook] Đã chặn Google Translate ghi đè bản dịch AI!");
            if (t && Array.isArray(t.subtitles)) {
              t.subtitles.forEach((s) => {
                if (s.isCustomAi) {
                  s.googleTranslation = s.aiTranslation || s.googleTranslation;
                }
              });
            }
            return Promise.resolve();
          }
          return player.translateService._origGoogleTranslate(t, e, n);
        };
      }

      if (!player.translateService._origGoogleTranslateSubtitles && typeof player.translateService.googleTranslateSubtitles === "function") {
        player.translateService._origGoogleTranslateSubtitles = player.translateService.googleTranslateSubtitles.bind(player.translateService);
        player.translateService.googleTranslateSubtitles = async function (t, e, n, i) {
          if (player._customAiActive) {
            return Promise.resolve();
          }
          return player.translateService._origGoogleTranslateSubtitles(t, e, n, i);
        };
      }

      if (!player.translateService._origGoogleTranslateViaOfficialApi && typeof player.translateService.googleTranslateViaOfficialApi === "function") {
        player.translateService._origGoogleTranslateViaOfficialApi = player.translateService.googleTranslateViaOfficialApi.bind(player.translateService);
        player.translateService.googleTranslateViaOfficialApi = async function (t) {
          if (player._customAiActive) {
            return Promise.resolve();
          }
          return player.translateService._origGoogleTranslateViaOfficialApi(t);
        };
      }
    }

    // D. Hook vào metadataPostProcessor để duy trì danh sách phụ đề tùy chỉnh
    if (!player._origMetadataPostProcessor && typeof player.metadataPostProcessor === "function") {
      player._origMetadataPostProcessor = player.metadataPostProcessor.bind(player);
      player.metadataPostProcessor = function (m, med) {
        player._origMetadataPostProcessor(m, med);
        if (player._customAiActive && window._vietdubCustomSubtitles) {
          m.subtitles = window._vietdubCustomSubtitles;
        }
      };
    }

    // E. Hook vào dubbingEngine setter để tự động triệt tiêu chế độ Ducking (tắt tiếng video khi nói)
    if (!player._hasDubbingEnginePropertyHook) {
      player._hasDubbingEnginePropertyHook = true;
      let _engine = player.dubbingEngine;
      try {
        Object.defineProperty(player, "dubbingEngine", {
          configurable: true,
          enumerable: true,
          get: () => _engine,
          set: (newEng) => {
            _engine = newEng;
            if (newEng && player._customAiActive) {
              neutralizeDucking(newEng);
            }
          }
        });
      } catch (e) {
        console.warn("[VietDub AI] Không thể defineProperty dubbingEngine:", e);
      }
      if (_engine && player._customAiActive) {
        neutralizeDucking(_engine);
      }
    }

    // F. Chặn shouldSkipTranslationForMetadata (không bao giờ bỏ qua dịch sang tiếng Việt)
    if (!player._origShouldSkipTranslationForMetadata && typeof player.shouldSkipTranslationForMetadata === "function") {
      player._origShouldSkipTranslationForMetadata = player.shouldSkipTranslationForMetadata.bind(player);
      player.shouldSkipTranslationForMetadata = async function (a) {
        if (player._customAiActive) {
          console.log("[VietDub AI Hook] shouldSkipTranslationForMetadata => false (luôn dịch tiếng Việt)");
          return false;
        }
        return player._origShouldSkipTranslationForMetadata(a);
      };
    }
  }

  // Triệt tiêu cơ chế Ducking/Mute khi nói: Giữ âm thanh video gốc chạy song song liên tục
  function neutralizeDucking(engine) {
    if (!engine) return;

    const getTargetVol = () => {
      const { orig } = getSavedVolumes();
      return Math.max(0, Math.min(1, orig / 100));
    };

    // Ghi đè bộ điều khiển âm lượng video
    engine.initVideoVolumeControl = function () {
      return {
        updateVideoOriginVolume: () => {
          if (this.media) {
            const tv = getTargetVol();
            this.media.muted = (tv === 0);
            this.media.volume = tv;
          }
        },
        closeVideoOriginVolume: () => {
          // TUYỆT ĐỐI KHÔNG MUTE KHI NÓI - DUY TRÌ ÂM LƯỢNG GỐC SONG SONG
          if (this.media) {
            const tv = getTargetVol();
            this.media.muted = (tv === 0);
            this.media.volume = tv;
          }
        },
        openVideoOriginVolume: () => {
          // TUYỆT ĐỐI KHÔNG NHẢY VỌT LÊN 100% - GIỮ ĐÚNG ÂM LƯỢNG NGƯỜI DÙNG CHỌN
          if (this.media) {
            const tv = getTargetVol();
            this.media.muted = (tv === 0);
            this.media.volume = tv;
          }
        },
        terminate: () => {}
      };
    };

    engine.videoVolumeControl = engine.initVideoVolumeControl();

    // Vô hiệu hóa track origin ducking cues nếu có
    if (engine.media && engine.media.textTracks) {
      for (let i = 0; i < engine.media.textTracks.length; i++) {
        const tr = engine.media.textTracks[i];
        if (tr.label && tr.label.startsWith("youtube-dubbing-origin-")) {
          tr.mode = "disabled";
          if (tr.cues) {
            while (tr.cues.length > 0) {
              try { tr.removeCue(tr.cues[0]); } catch (e) { break; }
            }
          }
        }
      }
    }

    if (engine.media) {
      const tv = getTargetVol();
      engine.media.muted = (tv === 0);
      engine.media.volume = tv;
    }
  }

  // 4. Áp dụng âm lượng tiếng gốc & thuyết minh đa tầng (Phát Song Song)
  let isVolumeGuarded = false;
  function guardMediaVolume(media) {
    if (!media || media._hasVietdubVolumeGuard) return;
    media._hasVietdubVolumeGuard = true;
    media.addEventListener("volumechange", () => {
      const player = window.youtubeDubbingPlayer;
      if (!player || !player._customAiActive || isVolumeGuarded) return;
      const { orig } = getSavedVolumes();
      const targetVol = orig / 100;
      // Nếu video bị mute hoặc volume bị lệch quá mức do engine cố tình ducking/mute
      if (Math.abs(media.volume - targetVol) > 0.05 || (targetVol > 0 && media.muted)) {
        isVolumeGuarded = true;
        media.muted = (targetVol === 0);
        media.volume = targetVol;
        setTimeout(() => { isVolumeGuarded = false; }, 40);
      }
    });
  }

  function applyVolumeSettings(origPercent, transPercent) {
    const player = window.youtubeDubbingPlayer;
    const media = player && typeof player.findMedia === "function" ? player.findMedia() : document.querySelector("video");

    // 1. Áp dụng trực tiếp vào thẻ Video gốc (Game sound / tiếng gốc)
    if (media) {
      guardMediaVolume(media);
      const targetVolume = Math.max(0, Math.min(1, origPercent / 100));
      media.muted = (targetVolume === 0);
      media.volume = targetVolume;
    }

    // 2. Báo cho Player và Dubbing Engine cập nhật các luồng âm thanh
    if (player) {
      if (typeof player.handleNotifyOriginalVolumeChange === "function") {
        player.handleNotifyOriginalVolumeChange(origPercent);
      }
      if (typeof player.handleNotifyTranslationVolumeChange === "function") {
        player.handleNotifyTranslationVolumeChange(transPercent);
      }
      if (player.dubbingEngine) {
        neutralizeDucking(player.dubbingEngine);
        if (typeof player.dubbingEngine.onVolumeChange === "function") {
          player.dubbingEngine.onVolumeChange();
        }
        if (typeof player.dubbingEngine.updateCurrentDubbingVolume === "function") {
          player.dubbingEngine.updateCurrentDubbingVolume();
        }
      }
    }

    // 3. Lưu vào localStorage và chrome.storage.local để ghi nhớ
    try {
      localStorage.setItem("vietdub_orig_vol", String(origPercent));
      localStorage.setItem("vietdub_trans_vol", String(transPercent));
      if (typeof chrome !== "undefined" && chrome?.storage?.local) {
        chrome.storage.local.get("local:settings", (res) => {
          const settings = (res && res["local:settings"]) || {};
          settings.originalVolume = origPercent;
          settings.translationVolume = transPercent;
          settings.videoVolumeControlModel = false; // Tắt hoàn toàn ducking tự động của extension
          chrome.storage.local.set({ "local:settings": settings });
        });
      }
    } catch (e) {}
  }

  // 5. Đảm bảo phụ đề gốc được tải về từ YouTube
  async function ensureSubtitlesLoaded() {
    const player = window.youtubeDubbingPlayer;
    if (!player) {
      throw new Error("Không tìm thấy trình phát YouTube. Hãy mở một video YouTube để tiếp tục.");
    }

    const media = typeof player.findMedia === "function" ? player.findMedia() : document.querySelector("video");
    if (!media) {
      throw new Error("Không tìm thấy video trên trang.");
    }

    // Nếu đã có sẵn subtitles trong metadata
    if (player.metadata && Array.isArray(player.metadata.subtitles) && player.metadata.subtitles.length > 0) {
      return player.metadata.subtitles;
    }

    let meta = null;
    if (typeof player.getMetadata === "function") {
      try {
        meta = await player.getMetadata(media);
      } catch (e) {
        console.warn("[VietDub AI] player.getMetadata error:", e);
      }
    }
    if (!meta) meta = player.metadata;
    if (!meta && window.metaDataStorage && typeof player.getVid === "function") {
      const vid = player.getVid(media);
      if (vid) meta = window.metaDataStorage.getMetadata(vid);
    }
    if (!meta) {
      throw new Error("Không lấy được thông tin video từ YouTube. Vui lòng thử lại sau vài giây.");
    }

    if ((!meta.subtitles || meta.subtitles.length === 0) && player.runtimeSubtitleSourceService) {
      console.log("[VietDub AI] Đang kích hoạt tải phụ đề gốc qua app...");
      try {
        await player.runtimeSubtitleSourceService.rebuildByPriority({
          metadata: meta,
          mediaElement: media,
          siteDubbingRules: player.siteDubbingRules,
          isMember: true,
          subtitlePriority: "platform"
        });
      } catch (e) {
        console.warn("[VietDub AI] rebuildByPriority error:", e);
      }

      if ((!meta.subtitles || meta.subtitles.length === 0) && meta.platformSubtitleTracks && meta.platformSubtitleTracks.length > 0) {
        for (const tr of meta.platformSubtitleTracks) {
          try {
            const loaded = await player.runtimeSubtitleSourceService.tryLoadPlatformTrackContent({
              metadata: meta,
              track: tr,
              mediaElement: media,
              siteDubbingRules: player.siteDubbingRules
            });
            if (loaded && player.runtimeSubtitleSourceService.hasTrackContent(loaded)) {
              player.runtimeSubtitleSourceService.applyPlatformTrackToMetadata(meta, tr, loaded, player.siteDubbingRules.site);
              break;
            }
          } catch (err) {}
        }
      }
    }

    player.metadata = meta;

    if (!meta.subtitles || meta.subtitles.length === 0) {
      throw new Error("Video này hiện chưa tải được phụ đề gốc. Bạn có thể bật phụ đề CC trên video hoặc bấm thử nút Dubbing 1 lần rồi mở lại.");
    }

    return meta.subtitles;
  }

  // 6. Trích xuất phụ đề sạch để copy
  async function extractCleanSubtitles() {
    const subtitles = await ensureSubtitlesLoaded();
    return subtitles.map((s, idx) => ({
      index: idx,
      start: Number(Number(s.start || 0).toFixed(2)),
      end: Number(Number(s.end || 0).toFixed(2)),
      dur: Number(Number((s.end - s.start) || s.dur || 0).toFixed(2)),
      text: (s.text || "").trim()
    }));
  }

  // 7. Tạo Modal giao diện hoàn chỉnh
  function createModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    const { orig: initOrigVol, trans: initTransVol } = getSavedVolumes();

    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "vietdub-modal-overlay";
    modal.innerHTML = `
      <div class="vietdub-modal-box">
        <div class="vietdub-modal-header">
          <div class="vietdub-modal-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#ff0033">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.72V7h2a3 3 0 0 1 3 3v1h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-1H3a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1v-1a3 3 0 0 1 3-3h2V5.72A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-3 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-6 5v1h6v-1z"/>
            </svg>
            VietDub AI - Dịch Thủ Công Bằng ChatGPT / Claude
            <span class="badge">Nâng cao</span>
          </div>
          <button type="button" class="vietdub-modal-close" title="Đóng">&times;</button>
        </div>

        <div class="vietdub-modal-body">
          <!-- Bước 1: Sao chép sub & prompt -->
          <div class="vietdub-step-card">
            <div class="vietdub-step-header">
              <div class="vietdub-step-title">
                <span>1.</span> Sao Chép Phụ Đề & Prompt Chuyên Nghiệp
              </div>
              <span id="vietdub-sub-count" style="font-size:12px; color:#10b981; font-weight:600;">Đang kiểm tra...</span>
            </div>
            <div class="vietdub-step-desc">
              Phụ đề đã làm sạch ký tự thừa. Prompt: <b>Game/GTA 6 chửi thề cực gắt</b>, <b>bài giảng chuẩn thuật ngữ</b>, khống chế từ theo thời lượng để không bị chậm video.
            </div>
            <button type="button" id="vietdub-btn-copy" class="vietdub-btn vietdub-btn-export">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
              Sao Chép Sub Sạch & Prompt Đỉnh Cao
            </button>
          </div>

          <!-- Bước 2: Dán bản dịch AI -->
          <div class="vietdub-step-card">
            <div class="vietdub-step-header">
              <div class="vietdub-step-title">
                <span>2.</span> Dán Bản Dịch Tiếng Việt Từ AI
              </div>
            </div>
            <div class="vietdub-step-desc">
              Dán mảng JSON tiếng Việt từ ChatGPT / Claude vào đây. Hệ thống tự nhận diện các trường <code>text</code> / <code>aiTranslation</code> / <code>translation</code> và tự loại bỏ thẻ \`\`\`json.
            </div>
            <textarea id="vietdub-json-input" class="vietdub-textarea" placeholder='[\n  {\n    "index": 0,\n    "start": 0,\n    "end": 1.202,\n    "dur": 1.202,\n    "text": "Liệu họ có làm thế không?"\n  }\n]'></textarea>
            <div id="vietdub-status" class="vietdub-status"></div>
          </div>

          <!-- Bước 3: Cài đặt Âm Lượng Video Gốc & Thuyết Minh -->
          <div class="vietdub-step-card">
            <div class="vietdub-step-header">
              <div class="vietdub-step-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#38bdf8">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                <span>3.</span> Điều Chỉnh Âm Lượng (Nghe Tiếng Gốc + Thuyết Minh)
              </div>
            </div>
            <div class="vietdub-volume-grid">
              <div class="vietdub-volume-row">
                <div class="vietdub-volume-label">
                  <span>Âm lượng video gốc (Tiếng game, nhạc nền):</span>
                  <span id="vietdub-orig-vol-val" class="vietdub-vol-val">${initOrigVol}%</span>
                </div>
                <input type="range" id="vietdub-orig-vol" class="vietdub-slider vietdub-orig-slider" min="0" max="100" value="${initOrigVol}" />
              </div>
              <div class="vietdub-volume-row">
                <div class="vietdub-volume-label">
                  <span>Âm lượng thuyết minh AI (VietDub Voice):</span>
                  <span id="vietdub-trans-vol-val" class="vietdub-vol-val">${initTransVol}%</span>
                </div>
                <input type="range" id="vietdub-trans-vol" class="vietdub-slider" min="0" max="100" value="${initTransVol}" />
              </div>
            </div>
          </div>
        </div>

        <div class="vietdub-modal-footer">
          <div class="vietdub-footer-left">
            <button type="button" id="vietdub-btn-revert" class="vietdub-btn vietdub-btn-revert" title="Trở về chế độ dịch tự động bằng Google Translate">
              ↩ Dùng lại Google Dịch
            </button>
          </div>
          <div class="vietdub-footer-right">
            <button type="button" id="vietdub-btn-cancel" class="vietdub-btn vietdub-btn-cancel">Đóng</button>
            <button type="button" id="vietdub-btn-apply" class="vietdub-btn vietdub-btn-apply">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Áp Dụng Bản Dịch & Lồng Tiếng Ngay
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Bắt sự kiện đóng modal
    const closeModal = () => {
      modal.classList.remove("active");
    };
    modal.querySelector(".vietdub-modal-close").addEventListener("click", closeModal);
    modal.querySelector("#vietdub-btn-cancel").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    // Lắng nghe thay đổi Slider Âm Lượng
    const sliderOrig = modal.querySelector("#vietdub-orig-vol");
    const labelOrig = modal.querySelector("#vietdub-orig-vol-val");
    const sliderTrans = modal.querySelector("#vietdub-trans-vol");
    const labelTrans = modal.querySelector("#vietdub-trans-vol-val");

    const onVolumeChange = () => {
      const origVal = Number(sliderOrig.value);
      const transVal = Number(sliderTrans.value);
      labelOrig.textContent = `${origVal}%`;
      labelTrans.textContent = `${transVal}%`;
      applyVolumeSettings(origVal, transVal);
    };

    sliderOrig.addEventListener("input", onVolumeChange);
    sliderOrig.addEventListener("change", onVolumeChange);
    sliderTrans.addEventListener("input", onVolumeChange);
    sliderTrans.addEventListener("change", onVolumeChange);

    // Sự kiện Copy Prompt
    const btnCopy = modal.querySelector("#vietdub-btn-copy");
    btnCopy.addEventListener("click", async () => {
      try {
        btnCopy.disabled = true;
        btnCopy.textContent = "Đang tải phụ đề...";
        const cleanList = await extractCleanSubtitles();
        const fullPrompt = buildSystemPrompt(cleanList);
        await navigator.clipboard.writeText(fullPrompt);

        btnCopy.classList.add("copied");
        btnCopy.textContent = `✓ Đã Copy ${cleanList.length} câu! Giờ hãy dán vào ChatGPT / Claude`;
        setTimeout(() => {
          btnCopy.classList.remove("copied");
          btnCopy.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
            Sao Chép Lại Sub & Prompt
          `;
          btnCopy.disabled = false;
        }, 3500);
      } catch (err) {
        btnCopy.disabled = false;
        btnCopy.textContent = "Sao Chép Thất Bại";
        showStatus(modal, err.message, "error");
      }
    });

    // Sự kiện Khôi phục về Google Translate
    const btnRevert = modal.querySelector("#vietdub-btn-revert");
    btnRevert.addEventListener("click", async () => {
      const player = window.youtubeDubbingPlayer;
      if (player) {
        player._customAiActive = false;
        window._vietdubCustomSubtitles = null;
        if (player.dubbingEngine) {
          try {
            await player.dubbingEngine.destroy(true);
          } catch (e) {}
          player.dubbingEngine = null;
          player.isDubbingStarted = false;
        }
        showStatus(modal, "Đã hủy chế độ dịch AI thủ công. Giờ bạn có thể dùng lại Google Dịch tự động!", "success");
        setTimeout(async () => {
          closeModal();
          if (typeof player.start === "function") {
            await player.start();
          }
        }, 800);
      }
    });

    // Sự kiện Áp dụng bản dịch & Lồng tiếng ngay
    const btnApply = modal.querySelector("#vietdub-btn-apply");
    btnApply.addEventListener("click", async () => {
      const input = modal.querySelector("#vietdub-json-input").value.trim();
      if (!input) {
        showStatus(modal, "Vui lòng dán dữ liệu JSON dịch được từ ChatGPT vào ô trước!", "error");
        return;
      }

      try {
        let raw = input;
        if (raw.startsWith("```")) {
          raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("Dữ liệu không hợp lệ: Phải là một mảng JSON [ ... ]!");
        }

        const player = window.youtubeDubbingPlayer;
        if (!player) {
          throw new Error("Không tìm thấy trình phát video YouTube trên trang.");
        }

        const media = typeof player.findMedia === "function" ? player.findMedia() : document.querySelector("video");
        if (!media) {
          throw new Error("Không tìm thấy thẻ video trên trang YouTube.");
        }

        // Cài đặt Hooks bảo vệ bản dịch AI không bị Google Translate ghi đè
        installCustomAiHooks(player);
        player._customAiActive = true;

        if (!player.metadata) player.metadata = {};

        // 1. DỪNG ENGINE CŨ TRƯỚC TIÊN (không xóa bản dịch mới)
        if (player.dubbingEngine) {
          try {
            await player.dubbingEngine.destroy(false);
          } catch (e) {}
          player.dubbingEngine = null;
          player.isDubbingStarted = false;
        }

        // Tự động tắt phụ đề CC gốc của YouTube nếu đang bật (tránh bị đè chữ tiếng Anh của YouTube)
        const ytpSubtitlesBtn = document.querySelector(".ytp-subtitles-button");
        if (ytpSubtitlesBtn && ytpSubtitlesBtn.getAttribute("aria-pressed") === "true") {
          ytpSubtitlesBtn.click();
        }

        // 2. Chuẩn hóa toàn bộ mảng JSON nạp vào với cơ chế Getter/Setter bảo vệ bản dịch
        const finalSubs = parsed.map((item, idx) => {
          const trans = (item.aiTranslation || item.translation || item.text || "").trim();
          const orig = (item.text || trans).trim();
          const start = Number(item.start) || 0;
          const end = Number(item.end) || (start + 2);
          const dur = Number(item.dur) || Math.max(0.5, end - start);

          const sub = {
            index: typeof item.index === "number" ? item.index : idx,
            start: Number(start.toFixed(2)),
            end: Number(end.toFixed(2)),
            dur: Number(dur.toFixed(2)),
            text: orig, // Giữ câu gốc để hiển thị song ngữ nếu cần
            isCustomAi: true
          };

          let _transVal = trans;
          // Khóa bất khả xâm phạm: Không bất kỳ hàm nội bộ nào của engine có thể reset về undefined hoặc rỗng!
          Object.defineProperty(sub, "aiTranslation", {
            configurable: true,
            enumerable: true,
            get: () => _transVal,
            set: (v) => {
              if (v && typeof v === "string" && v.trim()) _transVal = v.trim();
            }
          });

          Object.defineProperty(sub, "googleTranslation", {
            configurable: true,
            enumerable: true,
            get: () => _transVal,
            set: (v) => {
              if (v && typeof v === "string" && v.trim()) _transVal = v.trim();
            }
          });

          return sub;
        });

        // Xóa sạch dấu vết phân đoạn của Microsoft Segmentation & cache audio cũ
        finalSubs.forEach((s) => {
          delete s.microsoftSegmentation;
          delete s.audioBlobUrl;
          delete s.audioUrl;
          delete s.audioId;
          delete s.id;
          delete s.segments;
        });

        // 3. Nạp thẳng mảng phụ đề thuần Việt 100% vào metadata
        player.metadata.subtitles = finalSubs;
        window._vietdubCustomSubtitles = finalSubs;

        // Cập nhật âm lượng đã chọn
        const origVal = Number(sliderOrig.value);
        const transVal = Number(sliderTrans.value);
        applyVolumeSettings(origVal, transVal);

        showStatus(modal, `Đã nạp ${finalSubs.length} câu dịch thuần Việt! Đang khởi tạo Edge-TTS...`, "success");

        // 4. Khởi động Dubbing Engine với bản dịch AI mới
        setTimeout(async () => {
          closeModal();
          try {
            player.isDubbingStarted = true;
            if (typeof player.changePlayBtnState === "function") {
              player.changePlayBtnState(player.metadata.subtitleLevel || 1);
            }

            // Ưu tiên chạy startRealtimeDubbing trực tiếp để tránh qua Vg Google Translate
            if (typeof player.startRealtimeDubbing === "function") {
              await player.startRealtimeDubbing(player.metadata, media, true, true, 1);
            } else if (typeof player.start === "function") {
              await player.start();
            }

            // Triệt tiêu ngay cơ chế Ducking của engine mới tạo và thiết lập âm lượng video song song
            if (player.dubbingEngine) {
              neutralizeDucking(player.dubbingEngine);
            }
            applyVolumeSettings(origVal, transVal);

            console.log("[VietDub AI] Đã kích hoạt lồng tiếng AI thuần Việt chạy SONG SONG với âm lượng tiếng gốc:", origVal);
          } catch (e) {
            console.error("[VietDub AI] Lỗi khi kích hoạt lồng tiếng:", e);
          }
        }, 600);

      } catch (err) {
        showStatus(modal, `Lỗi đọc JSON: ${err.message}`, "error");
      }
    });

    return modal;
  }

  function showStatus(modal, message, type) {
    const el = modal.querySelector("#vietdub-status");
    if (!el) return;
    el.className = `vietdub-status ${type}`;
    el.textContent = message;
    el.style.display = "block";
  }

  // 8. Mở Modal và tự động cập nhật số câu thoại & âm lượng
  async function openModal() {
    const modal = createModal();
    modal.classList.add("active");

    // Đồng bộ lại slider âm lượng hiện tại
    const { orig: currentOrigVol, trans: currentTransVol } = getSavedVolumes();
    const sliderOrig = modal.querySelector("#vietdub-orig-vol");
    const labelOrig = modal.querySelector("#vietdub-orig-vol-val");
    const sliderTrans = modal.querySelector("#vietdub-trans-vol");
    const labelTrans = modal.querySelector("#vietdub-trans-vol-val");
    if (sliderOrig && labelOrig) {
      sliderOrig.value = currentOrigVol;
      labelOrig.textContent = `${currentOrigVol}%`;
    }
    if (sliderTrans && labelTrans) {
      sliderTrans.value = currentTransVol;
      labelTrans.textContent = `${currentTransVol}%`;
    }

    const countEl = modal.querySelector("#vietdub-sub-count");
    countEl.textContent = "Đang kiểm tra phụ đề...";
    countEl.style.color = "#3b82f6";

    try {
      const cleanList = await extractCleanSubtitles();
      countEl.textContent = `Sẵn sàng ${cleanList.length} câu thoại`;
      countEl.style.color = "#10b981";
    } catch (e) {
      countEl.textContent = "Chưa nạp phụ đề (bấm Sao chép để nạp)";
      countEl.style.color = "#f59e0b";
    }
  }

  // 9. Gắn nút vào thanh điều khiển YouTube (.ytp-right-controls)
  function injectButtonIntoPlayer() {
    if (document.getElementById(BTN_ID)) return;

    const rightControls = document.querySelector(".ytp-right-controls");
    if (!rightControls) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = BTN_ID;
    btn.className = "ytp-button vietdub-ai-custom-btn";
    btn.setAttribute("title", "VietDub AI: Tự dịch phụ đề với ChatGPT / Claude");
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.72V7h2a3 3 0 0 1 3 3v1h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-1H3a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1v-1a3 3 0 0 1 3-3h2V5.72A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-3 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-6 5v1h6v-1z"/>
      </svg>
      <span class="vietdub-ai-custom-btn-badge">AI</span>
    `;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });

    const vietDubBtn = rightControls.querySelector(".youtube-dubbing-button");
    if (vietDubBtn) {
      rightControls.insertBefore(btn, vietDubBtn.nextSibling);
    } else {
      rightControls.prepend(btn);
    }
  }

  // 10. Khởi chạy và quan sát DOM
  function init() {
    injectStyles();
    injectButtonIntoPlayer();

    // Theo dõi DOM khi chuyển video YouTube
    const observer = new MutationObserver(() => {
      injectButtonIntoPlayer();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
