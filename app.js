// =========================
// API 설정
// =========================
const API = "https://backend-6i2t.onrender.com/predict";
const API_STREAM = "https://backend-6i2t.onrender.com/predict_stream"; // 스트리밍용

// =========================
// DOM 요소 선택
// =========================
const $dropArea = document.getElementById("drop-area");
const $file = document.getElementById("file");
const $preview = document.getElementById("preview");
const $btn = document.getElementById("btn");
const $cropBtn = document.getElementById("crop-btn");
const $wrongBtn = document.getElementById("wrongBtn");
const $correctionForm = document.getElementById("correctionForm");
const $result = document.getElementById("result");
const $loader = document.getElementById("loading");
const $scanLine = document.querySelector(".scan-line");
const $resultText = document.getElementById("resultText");
const $cameraBtn = document.getElementById("camera-btn");
const $previewWrapper = document.querySelector(".preview-wrapper");
const $captureBtn = document.createElement("div");
const $video = document.createElement("video");
const $canvas = document.createElement("canvas");
const $shopTitle = document.getElementById("shopTitle");
const $shopLinks = document.getElementById("shopLinks"); // 쇼핑 링크 컨테이너
const $status = document.getElementById("status");
const $actionButtons = document.querySelector(".action-buttons");
const $resultBox = document.querySelector(".result-box");
const $feedbackSection = document.getElementById("feedbackSection");
const $toggle = document.getElementById("modeToggle");      // 실제 체크박스
const $tooltip = document.getElementById("tooltip");        // 툴팁
const $toggleWrapper = document.querySelector(".toggle-switch"); // 스위치 wrapper
const $container = document.getElementById("progressBarsContainer");

let cropper; // Cropper 인스턴스

const $mainResult = document.getElementById("mainResult");
const $comparePanel = document.getElementById("comparePanel");
const $compareSlots = document.getElementById("compareSlots");
const $btnCompareStart = document.getElementById("btnCompareStart");
const $btnNew = document.getElementById("btnNew");

if ($btnCompareStart) $btnCompareStart.style.display = "none";
if ($btnNew) $btnNew.style.display = "none";

const MAX_COMPARE = 4;

// 전역 슬라이드 interval id
if (!window.__fabric_slide_interval_id) {
  window.__fabric_slide_interval_id = null;
}

// =========================
// 드래그 & 드롭
// =========================
["dragenter", "dragover"].forEach(eventName => {
  $dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    $dropArea.classList.add("highlight");
  });
});

["dragleave", "drop"].forEach(eventName => {
  $dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    $dropArea.classList.remove("highlight");
  });
});

$dropArea.addEventListener("drop", e => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    $file.files = files;
    if ($shopTitle) $shopTitle.style.display = "none";
    showPreview(files[0]);
  }
});

$file.addEventListener("change", () => {
  if ($file.files.length > 0) {
    if ($shopTitle) $shopTitle.style.display = "none";
    showPreview($file.files[0]);
  }
});

// =========================
// 미리보기 표시 + 스캔라인 폭 조정
// =========================
function showPreview(fileOrBlob) {
  const reader = new FileReader();
  reader.onload = e => {
    $preview.onload = () => {
      if ($scanLine) {
        $scanLine.style.width = $preview.clientWidth + "px";
        $scanLine.style.left = $preview.offsetLeft + "px";
      }
    };
    $preview.src = e.target.result;

    // 상태 리셋
    $result.textContent = "";
    $resultText.innerHTML = "";
    if ($shopLinks) $shopLinks.style.display = "none";
    if ($shopTitle) $shopTitle.style.display = "none";
    if ($container) $container.innerHTML = "";
    if ($status) $status.innerText = "";

    if ($previewWrapper) {
      $previewWrapper.classList.add("has-image");
    }
    if ($cropBtn) {
      $cropBtn.style.display = "block"; // 이미지를 올리면 크롭 버튼 보이게
    }

    // 피드백용 전역 이미지 저장
    window.uploadedFile = fileOrBlob;
  };
  reader.readAsDataURL(fileOrBlob);
}

// =========================
// 접근성 오버레이 (있으면)
// =========================
function showOverlay() {
  const overlay = document.getElementById("accessibilityOverlay");
  if (overlay) overlay.style.display = "flex";
}
function closeOverlay() {
  const overlay = document.getElementById("accessibilityOverlay");
  if (overlay) overlay.style.display = "none";
}

// =========================
// "예측이 틀렸어요" → 말풍선 토글
// =========================
if ($wrongBtn && $correctionForm) {
  $correctionForm.style.display = "none"; // 기본은 숨김

  $wrongBtn.addEventListener("click", () => {
    if ($correctionForm.style.display === "none" || $correctionForm.style.display === "") {
      $correctionForm.style.display = "flex";
    } else {
      $correctionForm.style.display = "none";
    }
  });
}

// =========================
// 토스트 메시지 (비교 기능용)
// =========================
function showMessage(msg, duration = 2000) {
  const box = document.getElementById("message-box");
  if (!box) {
    alert(msg);
    return;
  }

  box.textContent = msg;
  box.classList.add("show");

  if (box._hideTimer) clearTimeout(box._hideTimer);

  box._hideTimer = setTimeout(() => {
    box.classList.remove("show");
  }, duration);
}

// =========================
// 데모/일반 모드 토글 툴팁
// =========================
function updateTooltipText() {
  if (!$toggle || !$tooltip) return;
  if ($toggle.checked) {
    $tooltip.textContent = "데모 모드입니다!";
  } else {
    $tooltip.textContent = "일반 모드입니다! 직접 체험해보세요!";
  }
}

if ($toggleWrapper && $tooltip && $toggle) {
  $toggleWrapper.addEventListener("mouseenter", () => {
    updateTooltipText();
    $tooltip.style.opacity = "1";
  });
  $toggleWrapper.addEventListener("mouseleave", () => {
    $tooltip.style.opacity = "0";
  });
  $toggle.addEventListener("change", updateTooltipText);
}

// =========================
// 이미지 크롭 기능 (Cropper.js)
// =========================
if ($cropBtn) {
  let confirmBtn = null;

  $cropBtn.addEventListener("click", () => {
    if (!$preview || !$preview.src) {
      alert("먼저 이미지를 업로드하세요!");
      return;
    }

    // 기존 Cropper 제거
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }

    cropper = new Cropper($preview, {
      viewMode: 1,
      autoCrop: false,
      background: false,
      modal: true,
      movable: true,
      zoomable: true,
      rotatable: false,
      scalable: false
    });

    // 확인 버튼이 이미 있으면 중복 생성 방지
    if (!confirmBtn) {
      confirmBtn = document.createElement("button");
      confirmBtn.textContent = "확인";
      confirmBtn.className = "predict-btn crop-confirm-btn";
      if ($previewWrapper) $previewWrapper.appendChild(confirmBtn);

      confirmBtn.addEventListener("click", () => {
        if (!cropper) return;
        cropper.getCroppedCanvas().toBlob(blob => {
          const reader2 = new FileReader();
          reader2.onload = e2 => {
            $preview.src = e2.target.result;
            $file._cameraBlob = blob;     // 잘라낸 이미지 업로드용 저장
            window.uploadedFile = blob;   // 피드백용도 갱신
            cropper.destroy();
            cropper = null;
            if (confirmBtn) {
              confirmBtn.remove();
              confirmBtn = null;
            }
          };
          reader2.readAsDataURL(blob);
        }, "image/png");
      });
    }
  });
}

// =========================
// 초기 상태로 리셋 (비교/새 분석용)
// =========================
function goToInitialState() {
  if ($preview) {
    $preview.src = "";
    $preview.style.display = "none";
  }
  if ($result) $result.innerHTML = "";
  if ($container) $container.innerHTML = "";
  if ($resultText) $resultText.innerHTML = "";
  if ($btnCompareStart) $btnCompareStart.style.display = "none";
  if ($btnNew) $btnNew.style.display = "none";
  if ($shopLinks) $shopLinks.style.display = "none";
  if ($shopTitle) $shopTitle.style.display = "none";
  if ($status) $status.innerText = "";
  if ($cropBtn) $cropBtn.style.display = "none";
  if ($previewWrapper) $previewWrapper.classList.remove("has-image");
}

// =========================
// 예측 결과 비교 기능
// =========================
let compareHistory = []; // { html, img }
let compareActive = false;

function renderCompareSlots() {
  if (!$compareSlots) return;
  $compareSlots.innerHTML = "";
  compareHistory.forEach((item) => {
    const slot = document.createElement("div");
    slot.className = "compare-slot";
    slot.innerHTML = item.html;
    $compareSlots.appendChild(slot);
  });
}

function saveCurrentResultSnapshot() {
  const imgSrc = $preview?.src || "";
  const html = `
    <div class="compare-card">
      <div class="compare-image"><img src="${imgSrc}" alt="preview" /></div>
      <div class="compare-result">
        <div class="raw-result">${$result.innerHTML}</div>
        <div class="raw-bars">${$container.innerHTML}</div>
        <div class="raw-text">${$resultText.innerHTML}</div>
      </div>
    </div>
  `;
  return { html, img: imgSrc };
}

function addSnapshotIfSpace() {
  if (!compareActive) return;
  if (compareHistory.length >= MAX_COMPARE) {
    showMessage("이미 4개까지 저장되었습니다.");
    return;
  }
  const snap = saveCurrentResultSnapshot();
  const last = compareHistory[compareHistory.length - 1];
  if (!last || last.html !== snap.html) {
    compareHistory.push(snap);
    renderCompareSlots();
  }
}

if ($btnCompareStart) {
  $btnCompareStart.addEventListener("click", () => {
    const hasResult =
      ($result && $result.innerHTML.trim()) ||
      ($resultText && $resultText.innerHTML.trim());

    if (!hasResult) {
      showMessage("먼저 예측을 완료해주세요!");
      return;
    }

    const snap = saveCurrentResultSnapshot();
    const last = compareHistory[compareHistory.length - 1];
    if (!last || last.html !== snap.html) {
      compareHistory.push(snap);
    }

    compareActive = true;
    if ($comparePanel) $comparePanel.style.display = "block";
    renderCompareSlots();

    if (compareHistory.length >= MAX_COMPARE) {
      showMessage("최대 4개까지 기록됩니다. 새로 분석하기만 가능해요!");
    }

    // 메인 영역 초기화 후 새 이미지 업로드 가능
    goToInitialState();
  });
}

if ($btnNew) {
  $btnNew.addEventListener("click", () => {
    compareActive = false;
    compareHistory = [];
    if ($comparePanel) $comparePanel.style.display = "none";
    renderCompareSlots();
    goToInitialState();
  });
}

// =========================
// 서버 업로드 및 예측 (스트리밍 버전)
// =========================
$btn.addEventListener("click", async () => {
  let uploadFile = ($file.files && $file.files[0]) || $file._cameraBlob || window.uploadedFile;
  if (!uploadFile) {
    alert("이미지를 선택하거나 촬영하세요!");
    return;
  }

  // 상태 초기화
  if ($resultBox) $resultBox.classList.remove("active");
  if ($actionButtons) {
    $actionButtons.classList.remove("show");
    $actionButtons.style.display = "none";
  }
  if ($feedbackSection) $feedbackSection.style.display = "none";
  if ($correctionForm) $correctionForm.style.display = "none";

  if ($previewWrapper) $previewWrapper.classList.add("has-image");
  if ($cropBtn) $cropBtn.style.display = "none"; // 예측 중에는 숨김

  const fd = new FormData();
  fd.append("file", uploadFile);

  $loader.style.display = "inline-block";
  if ($scanLine) $scanLine.style.display = "block";
  $result.textContent = "";
  $resultText.innerHTML = "";
  if ($shopLinks) $shopLinks.style.display = "none";
  if ($shopTitle) $shopTitle.style.display = "none";
  if ($container) $container.innerHTML = "";
  if ($status) $status.innerText = "";

  // 슬라이드 interval 초기화
  if (window.__fabric_slide_interval_id) {
    clearInterval(window.__fabric_slide_interval_id);
    window.__fabric_slide_interval_id = null;
  }

  try {
    const res = await fetch(API_STREAM, { method: "POST", body: fd });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "요청 실패");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let chunk = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunk += decoder.decode(value, { stream: true });
      let lines = chunk.split("\n");
      chunk = lines.pop(); // 마지막 불완전 줄은 다음 반복에서 처리

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let parsed;
        try {
          parsed = JSON.parse(trimmed);
        } catch (e) {
          console.warn("JSON 파싱 실패한 라인:", trimmed, e);
          continue;
        }

        // 진행 상태 표시
        if (parsed.status && $status) {
          $status.innerText = parsed.status;
        }

        // 최종 결과
        if (parsed.result) {
          const r = parsed.result;

          // --- 프로그래스바 (신버전 구조 유지) ---
          if (r?.predictions?.length && $container) {
            let progressBarsHtml = "";

            r.predictions.forEach((p) => {
              const percent = (p.score * 100).toFixed(1);

              progressBarsHtml += `
                <div class="progress-row">
                  <span class="progress-label">${p.label}</span>
                  <div class="progress-wrapper">
                    <div class="progress-bar" data-percent="${percent}" style="width:0"></div>
                  </div>
                  <span class="progress-percent">${percent}%</span>
                </div>
              `;
            });

            $container.innerHTML = progressBarsHtml;

            // fade-in + 애니메이션 (추가)
            $container.style.opacity = 0;
            $container.style.transform = "translateY(20px)";
            $container.style.transition = "opacity 0.5s, transform 0.5s";

            setTimeout(() => {
              $container.style.opacity = 1;
              $container.style.transform = "translateY(0)";

              $container.querySelectorAll(".progress-bar").forEach((bar) => {
                const percent = bar.dataset.percent;
                bar.style.transition = "width 1.2s cubic-bezier(.42,0,.58,1)";
                bar.style.width = percent + "%";
              });
            }, 100);

            $result.textContent = "";
          } else if (parsed.error) {
            $result.textContent = "백엔드 에러: " + parsed.error;
          } else if (!$container.innerHTML) {
            $result.textContent = "예측 결과를 받지 못했습니다.";
          }

          // --- 상세 정보 + 쇼핑몰 슬라이드 + 피드백/버튼 ---
          if (r.ko_name) {
            const koName = r.ko_name || "";
            const predictedFabric = r.predicted_fabric || "";
            const wash = r.wash_method || "정보 없음";
            const dry = r.dry_method || "정보 없음";
            const special = r.special_note || "정보 없음";

            $resultText.innerHTML = `
              <h3>${koName} (${predictedFabric})</h3>
              <p>🧺 세탁법: ${wash}</p>
              <p>🌬️ 건조법: ${dry}</p>
              <p>⚠️ 주의사항: ${special}</p>
            `;

            // 결과 박스 + 액션 버튼 + 피드백 섹션 등장
            if ($resultBox) $resultBox.classList.add("active");
            if ($actionButtons) {
              $actionButtons.style.display = "flex";
              $actionButtons.classList.add("show");
            }
            if ($feedbackSection) $feedbackSection.style.display = "block";

            // 피드백용 전역 predicted 값 저장
            window.predictedClass = predictedFabric || koName;
            window.uploadedFile = uploadFile;

            // 쇼핑몰 링크 + 이미지 슬라이드
            const fabric = (predictedFabric || "").toLowerCase();
            const query = encodeURIComponent(koName || predictedFabric);

            const shopImages = {
              naver: [`./images/naver/${fabric}1.jpg`, `./images/naver/${fabric}2.jpg`],
              musinsa: [`./images/musinsa/${fabric}3.jpg`, `./images/musinsa/${fabric}4.jpg`],
              spao: [`./images/spao/${fabric}5.jpg`, `./images/spao/${fabric}6.jpg`]
            };

            const shopLinksData = [
              { name: "네이버 쇼핑", url: `https://search.shopping.naver.com/search/all?query=${query}`, images: shopImages.naver },
              { name: "무신사", url: `https://www.musinsa.com/search/musinsa/integration?keyword=${query}`, images: shopImages.musinsa },
              { name: "스파오", url: `https://www.spao.com/product/search.html?keyword=${query}`, images: shopImages.spao }
            ];

            if ($shopLinks) {
              $shopLinks.innerHTML = shopLinksData
                .map(shop => `
                  <a href="${shop.url}" target="_blank" class="shop-link">
                    ${shop.images.map((img, i) => `
                      <img src="${img}" alt="${shop.name} 이미지 ${i + 1}" class="${i === 0 ? "active" : ""}">
                    `).join("")}
                  </a>
                `)
                .join("");

              $shopLinks.style.display = "flex";
            }
            if ($shopTitle) $shopTitle.style.display = "block";

            // 슬라이드 interval 재설정
            if (window.__fabric_slide_interval_id) {
              clearInterval(window.__fabric_slide_interval_id);
              window.__fabric_slide_interval_id = null;
            }

            let currentSlide = 0;
            window.__fabric_slide_interval_id = setInterval(() => {
              if (!$shopLinks) return;
              $shopLinks.querySelectorAll("a").forEach((aTag) => {
                const imgs = aTag.querySelectorAll("img");
                imgs.forEach((img, i) => {
                  img.classList.toggle("active", i === (currentSlide % imgs.length));
                });
              });
              currentSlide++;
            }, 2000);
          }

          // 비교 모드일 때는 결과 자동 스냅샷 추가
          addSnapshotIfSpace();

          // 비교 버튼은 예측 완료 후 활성화
          if ($btnCompareStart) $btnCompareStart.style.display = "inline-block";
          if ($btnNew) $btnNew.style.display = "inline-block";
        }

        if (parsed.error) {
          $result.textContent = "백엔드 에러: " + parsed.error;
        }
      }
    }

    // 남아있는 마지막 청크 처리(옵션)
    const trailing = chunk.trim();
    if (trailing) {
      try {
        const parsed = JSON.parse(trailing);
        if (parsed.status && $status) $status.innerText = parsed.status;
      } catch (e) {
        console.warn("마지막 청크 JSON 파싱 실패:", trailing);
      }
    }
  } catch (e) {
    $result.textContent = "에러: " + (e.message || e);
    $resultText.innerText = "에러: " + (e.message || e);
  } finally {
    $loader.style.display = "none";
    if ($scanLine) $scanLine.style.display = "none";
  }
});

// =========================
// 카메라 촬영
// =========================
$cameraBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    $video.srcObject = stream;
    $video.autoplay = true;
    $video.playsInline = true;

    if ($previewWrapper) {
      $previewWrapper.innerHTML = "";
      $previewWrapper.appendChild($video);
    }

    await new Promise(resolve => {
      $video.onloadedmetadata = () => {
        $video.play();
        resolve();
      };
    });

    $captureBtn.className = "capture-circle";
    if ($previewWrapper) $previewWrapper.appendChild($captureBtn);

    $captureBtn.onclick = async () => {
      $canvas.width = $video.videoWidth;
      $canvas.height = $video.videoHeight;
      $canvas.getContext("2d").drawImage($video, 0, 0);

      const blob = await new Promise(resolve => $canvas.toBlob(resolve, "image/png"));

      // 스트림 종료
      stream.getTracks().forEach(track => track.stop());

      // 미리보기 표시
      showPreview(blob);
      if ($previewWrapper) {
        $previewWrapper.innerHTML = "";
        $previewWrapper.appendChild($preview);
        if ($scanLine) $previewWrapper.appendChild($scanLine);
      }

      // 카메라 블롭 저장
      $file._cameraBlob = blob;
      window.uploadedFile = blob;

      // 필요하면 자동 예측 시작
      // $btn.click();
    };
  } catch (err) {
    alert("카메라를 사용할 수 없습니다: " + err.message);
  }
});

// =========================
// 5분마다 서버 ping
// =========================
setInterval(async () => {
  try {
    const res = await fetch("https://backend-6i2t.onrender.com/ping");
    if (res.ok) {
      console.log("서버 ping 성공");
    }
  } catch (err) {
    console.warn("서버 ping 실패:", err);
  }
}, 5 * 60 * 1000); // 5분

// =========================
// ⭐ 방명록 서버 API 연결 ⭐
// =========================
const API_guestbook = "https://backend-6i2t.onrender.com/guestbook";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const feed = document.getElementById("guestbookFeed");

  if (!form || !feed) return;

  // 1) 방명록 목록 불러오기
  async function loadGuestbook() {
    feed.innerHTML = "";
    const res = await fetch(API_guestbook);
    const list = await res.json();

    list.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${item.name}</strong>
        <div class="date">${item.created_at}</div>
        <p>${item.message}</p>
        ${item.contactInfo ? `<small>연락처: ${item.contactInfo}</small>` : ""}
        <button class="deleteBtn" data-id="${item.id}">삭제</button>
      `;
      feed.appendChild(li);
    });
  }

  // 2) 방명록 작성
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const contactInfo = document.getElementById("contactInfo").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!name || !message) {
      alert("이름과 메모는 필수입니다!");
      return;
    }

    await fetch(API_guestbook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contactInfo, message })
    });

    form.reset();
    loadGuestbook();
  });

  // 3) 방명록 삭제
  feed.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("deleteBtn")) return;

    const id = e.target.dataset.id;

    if (confirm("정말 삭제할까요?")) {
      await fetch(`${API_guestbook}/${id}`, {
        method: "DELETE"
      });
      loadGuestbook();
    }
  });

  // 4) 초기 로드
  loadGuestbook();
});

// =========================
// 정정 피드백 제출
// =========================
const $submitCorrection = document.getElementById("submitCorrection");
const $correctLabel = document.getElementById("correctLabel");

if ($submitCorrection && $correctLabel) {
  $submitCorrection.addEventListener("click", () => {
    const corrected = $correctLabel.value;

    if (!window.uploadedFile) {
      alert("이미지가 없습니다. 다시 업로드해주세요.");
      return;
    }
    if (!window.predictedClass) {
      alert("예측 결과가 아직 없습니다.");
      return;
    }

    sendFeedback(window.predictedClass, corrected, window.uploadedFile);
  });
}

// 서버로 정정 피드백 전송
async function sendFeedback(predicted, corrected, file) {
  const formData = new FormData();
  formData.append("predicted", predicted);
  formData.append("corrected", corrected);
  formData.append("image", file);

  try {
    const res = await fetch("https://feedback-server-derm.onrender.com/feedback", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    console.log("Feedback response:", data);
    alert("정정 정보가 성공적으로 전송되었습니다! 감사합니다 😊");
  } catch (err) {
    alert("정정 정보 전송 중 오류가 발생했습니다: " + err.message);
  }
}
