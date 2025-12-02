// =========================
// API 설정
// =========================
const API = "https://backend-6i2t.onrender.com/predict";
const API_STREAM = "https://backend-6i2t.onrender.com/predict_stream";
const API_BASE = "https://backend-6i2t.onrender.com";
const API_guestbook = "https://backend-6i2t.onrender.com/guestbook";

// =========================
// DOM 요소 선택
// =========================
const $dropArea = document.getElementById("drop-area");
const $file = document.getElementById("file");
const $preview = document.getElementById("preview");
const $btn = document.getElementById("btn");
const $result = document.getElementById("result");
const $resultText = document.getElementById("resultText");
const $loader = document.getElementById("loading");
const $scanLine = document.querySelector(".scan-line");
const $cameraBtn = document.getElementById("camera-btn");
const $previewWrapper = document.querySelector(".preview-wrapper");
const $captureBtn = document.createElement("div");
const $video = document.createElement("video");
const $canvas = document.createElement("canvas");
const $shopTitle = document.getElementById("shopTitle");
const $shopLinks = document.getElementById("shopLinks");
const $status = document.getElementById("status");

const $btnCompareStart = document.getElementById("btnCompareStart");
const $btnNew = document.getElementById("btnNew");
const $comparePanel = document.getElementById("comparePanel");
const $compareSlots = document.getElementById("compareSlots");

const $wrongBtn = document.getElementById("wrongBtn");
const $feedbackSection = document.getElementById("feedbackSection");
const $correctionForm = document.getElementById("correctionForm");
const $submitCorrection = document.getElementById("submitCorrection");
const $correctLabel = document.getElementById("correctLabel");

let cropper = null;

// =========================
// 비교 저장 공간
// =========================
let compareHistory = [];
const MAX_COMPARE = 4;

// =========================
// 초기 UI 숨김
// =========================
$btnCompareStart.style.display = "none";
$btnNew.style.display = "none";
$comparePanel.style.display = "none";

// =========================
// 드래그 & 드롭
// =========================
["dragenter", "dragover"].forEach(eventName => {
  $dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    $dropArea.classList.add("highlight");
  });
});

["dragleave", "drop"].forEach(eventName => {
  $dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    $dropArea.classList.remove("highlight");
  });
});

$dropArea.addEventListener("drop", e => {
  if (e.dataTransfer.files.length > 0) {
    showPreview(e.dataTransfer.files[0]);
  }
});

// =========================
// 이미지 미리보기
// =========================
function showPreview(fileOrBlob) {
  const reader = new FileReader();

  reader.onload = e => {
    $preview.src = e.target.result;
    $preview.style.display = "block";

    resetResultDisplay();

    // 크롭 버튼 항상 표시
    const cropBtn = document.getElementById("crop-btn");
    cropBtn.style.display = "block";
  };

  reader.readAsDataURL(fileOrBlob);
  $file._cameraBlob = fileOrBlob;
}

// =========================
// 결과 지우기 (전체 초기화 X)
// =========================
function resetResultDisplay() {
  $result.innerHTML = "";
  $status.innerText = "";
  $container.innerHTML = "";
  $resultText.innerHTML = "";
  $shopLinks.style.display = "none";
  $shopTitle.style.display = "none";
}

// =========================
// 크롭 기능
// =========================
document.getElementById("crop-btn").addEventListener("click", () => {
  if (!cropper) {
    cropper = new Cropper($preview, {
      viewMode: 1,
      autoCrop: false,
      movable: true,
      zoomable: true
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "확인";
    confirmBtn.className = "predict-btn";
    confirmBtn.id = "cropConfirmBtn";
    document.querySelector(".analysis-row").appendChild(confirmBtn);

    confirmBtn.addEventListener("click", () => {
      cropper.getCroppedCanvas().toBlob(blob => {
        const reader = new FileReader();
        reader.onload = e => {
          $preview.src = e.target.result;
          $file._cameraBlob = blob;
          cropper.destroy();
          cropper = null;
          confirmBtn.remove();
        };
        reader.readAsDataURL(blob);
      });
    });
  }
});

// =========================
// 백업 저장
// =========================
function saveCurrentResultSnapshot() {
  const imgSrc = $preview?.src || "";

  const html = `
    <div class="raw-result">${$result.innerHTML}</div>
    <div class="raw-bars">${document.getElementById("progressBarsContainer").innerHTML}</div>
    <div class="raw-text">${$resultText.innerHTML}</div>
  `;

  return { img: imgSrc, html };
}

$btnCompareStart.addEventListener("click", () => {
  const snap = saveCurrentResultSnapshot();
  compareHistory.push(snap);
  if (compareHistory.length > MAX_COMPARE) compareHistory.shift();
  renderCompareSlots();
  $comparePanel.style.display = "block";
});

// =========================
// 비교 슬롯 출력
// =========================
function renderCompareSlots() {
  $compareSlots.innerHTML = "";

  // 카드가 하나도 없으면 comparePanel 숨김
  if (compareHistory.length === 0) {
    $comparePanel.style.display = "none";
    return;
  }

  compareHistory.forEach((item, idx) => {
    const slot = document.createElement("div");
    slot.className = "compare-card";

    slot.innerHTML = `
      <button class="compare-delete" data-idx="${idx}">×</button>

      <div class="compare-image">
        <img src="${item.img}" />
      </div>

      <div class="compare-result">
        ${item.html}
      </div>
    `;

    $compareSlots.appendChild(slot);
  });

  // 삭제 버튼
  document.querySelectorAll(".compare-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.idx);
      compareHistory.splice(i, 1);
      renderCompareSlots();   // ← 다시 렌더링 (0개면 comparePanel 숨김)
    });
  });

  // 백업 내용이 있으면 comparePanel 보여주기
  $comparePanel.style.display = "block";
}


// =========================
// 새 분석 시작 (전체 초기화)
// =========================
$btnNew.addEventListener("click", () => {
  $preview.src = "";
  $preview.style.display = "none";
  $file.value = "";

  resetResultDisplay();
  document.getElementById("crop-btn").style.display = "none";

  $btnCompareStart.style.display = "none";

  // 비교는 남겨둠
});

// =========================
// 예측 실행
// =========================
$btn.addEventListener("click", async () => {
  const uploadFile = $file.files[0] || $file._cameraBlob;
  if (!uploadFile) return alert("이미지를 업로드하세요!");

  resetResultDisplay();

  const fd = new FormData();
  fd.append("file", uploadFile);

  $loader.style.display = "inline-block";
  $scanLine.style.display = "block";

  try {
    const res = await fetch(API_STREAM, { method: "POST", body: fd });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let chunk = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunk += decoder.decode(value);
      let lines = chunk.split("\n");
      chunk = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;

        let parsed;
        try { parsed = JSON.parse(line); }
        catch { continue; }

        if (parsed.status) $status.innerText = parsed.status;

        if (parsed.result) {
          showPrediction(parsed.result);
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    $loader.style.display = "none";
    $scanLine.style.display = "none";
    $btnCompareStart.style.display = "block";
    $btnNew.style.display = "block";
  }
});

// =========================
// 예측 UI 표시
// =========================
function showPrediction(r) {
  const $container = document.getElementById("progressBarsContainer");

  $container.innerHTML = r.predictions.map(p => `
    <div class="progress-row">
      <span class="progress-label">${p.label}</span>
      <div class="progress-wrapper">
        <div class="progress-bar" style="width:${(p.score * 100).toFixed(1)}%"></div>
      </div>
      <span class="progress-percent">${(p.score * 100).toFixed(1)}%</span>
    </div>
  `).join("");

  $resultText.innerHTML = `
    <h3>${r.ko_name} (${r.predicted_fabric})</h3>
    <p>🧺 ${r.wash_method}</p>
    <p>🌬️ ${r.dry_method}</p>
    <p>⚠️ ${r.special_note}</p>
  `;

  showShopLinks(r);
}

// =========================
// 쇼핑몰 슬라이드
// =========================
function showShopLinks(r) {
  const fabric = (r.predicted_fabric || "").toLowerCase();
  const query = encodeURIComponent(r.ko_name);

  const shopImages = {
    naver: [`./images/naver/${fabric}1.jpg`, `./images/naver/${fabric}2.jpg`],
    musinsa: [`./images/musinsa/${fabric}3.jpg`, `./images/musinsa/${fabric}4.jpg`],
    spao: [`./images/spao/${fabric}5.jpg`, `./images/spao/${fabric}6.jpg`]
  };

  const shops = [
    { name: "네이버 쇼핑", url: `https://search.shopping.naver.com/search/all?query=${query}`, images: shopImages.naver },
    { name: "무신사", url: `https://www.musinsa.com/search/musinsa/integration?keyword=${query}`, images: shopImages.musinsa },
    { name: "스파오", url: `https://www.spao.com/product/search.html?keyword=${query}`, images: shopImages.spao }
  ];

  $shopLinks.innerHTML = shops.map(shop => `
    <a href="${shop.url}" target="_blank" class="shop-link">
      ${shop.images.map((img, i) => `<img class="${i === 0 ? "active" : ""}" src="${img}">`).join("")}
    </a>
  `).join("");

  $shopTitle.style.display = "block";
  $shopLinks.style.display = "flex";
}

// =========================
// 카메라 촬영
// =========================
$cameraBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    $video.srcObject = stream;
    $video.autoplay = true;
    $video.playsInline = true;

    $previewWrapper.innerHTML = "";
    $previewWrapper.appendChild($video);

    const captureBtn = document.createElement("div");
    captureBtn.className = "capture-circle";
    $previewWrapper.appendChild(captureBtn);

    captureBtn.onclick = async () => {
      $canvas.width = $video.videoWidth;
      $canvas.height = $video.videoHeight;
      $canvas.getContext("2d").drawImage($video, 0, 0);

      const blob = await new Promise(resolve => $canvas.toBlob(resolve, "image/png"));

      stream.getTracks().forEach(t => t.stop());
      showPreview(blob);
    };
  } catch {
    alert("카메라 사용 불가");
  }
});

// =========================
// 정정 제출
// =========================
$wrongBtn.addEventListener("click", () => {
  $correctionForm.style.display =
    $correctionForm.style.display === "flex" ? "none" : "flex";
});

$submitCorrection.addEventListener("click", async () => {
  const formData = new FormData();
  formData.append("predicted", $correctLabel.value);
  formData.append("image", $file._cameraBlob);

  await fetch("https://feedback-server-derm.onrender.com/feedback", {
    method: "POST",
    body: formData
  });

  alert("정정 정보가 전송되었습니다!");
});
