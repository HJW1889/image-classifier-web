const API = "https://backend-6i2t.onrender.com/predict";

const $dropArea = document.getElementById("drop-area");
const $file = document.getElementById("file");
const $preview = document.getElementById("preview");
const $cropBtn = document.getElementById("crop-btn");
const $btn = document.getElementById("btn");
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
const $shopLinks = document.getElementById("shopLinks"); // 쇼핑 링크 컨테이너
const $actionButtons = document.querySelector(".action-buttons");
const $resultBox = document.querySelector(".result-box");
const $feedbackSection = document.getElementById("feedbackSection");

// ====== 드래그 & 드롭 ======
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
    const shopTitle = document.getElementById("shopTitle");
    if (shopTitle) shopTitle.style.display = "none";
    showPreview(files[0]);
  }
});

$file.addEventListener("change", () => {
  if ($file.files.length > 0) {
    const shopTitle = document.getElementById("shopTitle");
    if (shopTitle) shopTitle.style.display = "none";
    showPreview($file.files[0]);
  }
});

// ====== 미리보기 표시 ======
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
    const shopTitle = document.getElementById("shopTitle");
    if (shopTitle) shopTitle.style.display = "none";

    // 미리보기 세트 상태 업데이트
    if ($previewWrapper) {
      $previewWrapper.classList.add("has-image");
    }
    if ($cropBtn) {
      $cropBtn.style.display = "block"; // 이미지를 올리면 크롭 아이콘 보이게
    }

    // 피드백용 전역 이미지 저장
    window.uploadedFile = fileOrBlob;
  };
  reader.readAsDataURL(fileOrBlob);
}

// ====== 접근성 오버레이 (있으면) ======
function showOverlay() {
  const overlay = document.getElementById("accessibilityOverlay");
  if (overlay) overlay.style.display = "flex";
}
function closeOverlay() {
  const overlay = document.getElementById("accessibilityOverlay");
  if (overlay) overlay.style.display = "none";
}

// ====== "예측이 틀렸어요" → 말풍선 토글 ======
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

// ====== 서버 업로드 및 예측 ======
$btn.addEventListener("click", async () => {
  let uploadFile = $file.files[0] || $file._cameraBlob || window.uploadedFile;
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
  if ($cropBtn) $cropBtn.style.display = "none"; // 예측할 때는 크롭 버튼 숨김

  const fd = new FormData();
  fd.append("file", uploadFile);

  $loader.style.display = "inline-block";
  if ($scanLine) $scanLine.style.display = "block";
  $result.textContent = "";
  $resultText.innerHTML = "";
  if ($shopLinks) $shopLinks.style.display = "none";
  const shopTitle = document.getElementById("shopTitle");
  if (shopTitle) shopTitle.style.display = "none";

  try {
    const res = await fetch(API, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "요청 실패");

    if (data.predictions?.length) {
      let progressBarsHtml = "";

      data.predictions.forEach((p) => {
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

      const progressContainer = document.getElementById("progressBarsContainer");
      if (progressContainer) {
        progressContainer.innerHTML = progressBarsHtml;

        // fade-in + 애니메이션
        progressContainer.style.opacity = 0;
        progressContainer.style.transform = "translateY(20px)";
        progressContainer.style.transition = "opacity 0.5s, transform 0.5s";

        setTimeout(() => {
          progressContainer.style.opacity = 1;
          progressContainer.style.transform = "translateY(0)";

          document.querySelectorAll(".progress-bar").forEach((bar) => {
            const percent = bar.dataset.percent;
            bar.style.transition = "width 1.2s cubic-bezier(.42,0,.58,1)";
            bar.style.width = percent + "%";
          });
        }, 100);
      }

    } else if (data.error) {
      $result.textContent = "백엔드 에러: " + data.error;
    } else {
      $result.textContent = "예측 결과를 받지 못했습니다.";
    }

    if (data.ko_name) {
      $resultText.innerHTML = `
        <h3>${data.ko_name} (${data.predicted_fabric})</h3>
        <p>🧺 세탁법: ${data.wash_method}</p>
        <p>🌬️ 건조법: ${data.dry_method}</p>
        <p>⚠️ 주의사항: ${data.special_note}</p>
      `;

      // 예측 성공 → 결과 박스 + 액션 버튼 + 피드백 섹션 등장
      if ($resultBox) $resultBox.classList.add("active");
      if ($actionButtons) {
        $actionButtons.style.display = "flex";
        $actionButtons.classList.add("show");
      }
      if ($feedbackSection) $feedbackSection.style.display = "block";

      // 피드백용 전역 predicted 값 저장
      window.predictedClass = data.predicted_fabric;
      window.uploadedFile = uploadFile;

      // 🔗 예측된 재질명으로 쇼핑몰 링크 생성
      const fabricName = data.ko_name || data.predicted_fabric;
      const query = encodeURIComponent(fabricName);

      const shopLinksData = [
        {
          name: "네이버 쇼핑",
          url: `https://search.shopping.naver.com/search/all?query=${query}`,
          img: "./images/1.jpg"
        },
        {
          name: "무신사",
          url: `https://www.musinsa.com/search/musinsa/integration?keyword=${query}`,
          img: "./images/2.jpg"
        },
        {
          name: "스파오",
          url: `https://www.spao.com/product/search.html?keyword=${query}`,
          img: "./images/3.jpg"
        }
      ];

      if ($shopLinks) {
        $shopLinks.innerHTML = shopLinksData
          .map(link => `
            <a href="${link.url}" target="_blank" class="shop-link">
              <img src="${link.img}" alt="${link.name} 로고">
            </a>
          `)
          .join("");
        $shopLinks.style.display = "flex";
      }
      if (shopTitle) shopTitle.style.display = "block";
    }
  } catch (e) {
    $result.textContent = "에러: " + e.message;
    $resultText.innerText = "에러: " + e.message;
  } finally {
    $loader.style.display = "none";
    if ($scanLine) $scanLine.style.display = "none";
  }
});

// ====== 카메라 촬영 ======
$cameraBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    $video.srcObject = stream;
    $video.autoplay = true;
    $video.playsInline = true;

    $previewWrapper.innerHTML = "";
    $previewWrapper.appendChild($video);

    await new Promise(resolve => {
      $video.onloadedmetadata = () => {
        $video.play();
        resolve();
      };
    });

    $captureBtn.className = "capture-circle";
    $previewWrapper.appendChild($captureBtn);

    $captureBtn.onclick = async () => {
      $canvas.width = $video.videoWidth;
      $canvas.height = $video.videoHeight;
      $canvas.getContext("2d").drawImage($video, 0, 0);

      const blob = await new Promise(resolve => $canvas.toBlob(resolve, "image/png"));

      // 스트림 종료
      stream.getTracks().forEach(track => track.stop());

      // 미리보기 표시
      showPreview(blob); // 공통 로직 사용
      $previewWrapper.innerHTML = "";
      $previewWrapper.appendChild($preview);
      if ($scanLine) $previewWrapper.appendChild($scanLine);

      // 카메라 블롭 저장
      $file._cameraBlob = blob;
    };
  } catch (err) {
    alert("카메라를 사용할 수 없습니다: " + err.message);
  }
});

// ====== 5분마다 서버에 ping ======
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

// -----------------------------
// ⭐ 방명록 서버 API 연결 버전 ⭐
// -----------------------------
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

// ====== 정정 피드백 제출 ======
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

// 서버로 전송하는 함수
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
