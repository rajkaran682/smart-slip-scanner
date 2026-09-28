const cameraInput = document.getElementById("cameraInput");
const fileInput = document.getElementById("fileInput");

const previewBox = document.getElementById("previewBox");
const previewImage = document.getElementById("previewImage");

const removeImage = document.getElementById("removeImage");
const scanButton = document.getElementById("scanButton");

const resultSection = document.getElementById("resultSection");
const resultContent = document.getElementById("resultContent");

const languageSelect = document.getElementById("language");

let selectedFile = null;


/* ================================
   IMAGE SELECTION
================================ */

function handleImage(file) {

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("कृपया केवल फोटो चुनें।");
    return;
  }

  selectedFile = file;

  const reader = new FileReader();

  reader.onload = function (event) {

    previewImage.src = event.target.result;

    previewBox.classList.remove("hidden");

    resultSection.classList.add("hidden");

    resultContent.innerHTML = "";
  };

  reader.readAsDataURL(file);
}


cameraInput.addEventListener("change", function () {
  handleImage(this.files[0]);
});


fileInput.addEventListener("change", function () {
  handleImage(this.files[0]);
});


/* ================================
   REMOVE IMAGE
================================ */

removeImage.addEventListener("click", function () {

  selectedFile = null;

  previewImage.src = "";

  previewBox.classList.add("hidden");

  resultSection.classList.add("hidden");

  resultContent.innerHTML = "";

  cameraInput.value = "";
  fileInput.value = "";
});


/* ================================
   FILE → DATA URL
================================ */

function fileToDataURL(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}


/* ================================
   IMAGE PREPROCESSING
================================ */

function preprocessImage(dataURL, mode = "normal") {

  return new Promise((resolve, reject) => {

    const img = new Image();

    img.onload = function () {

      const scale = 2;

      const canvas = document.createElement("canvas");

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");

      ctx.imageSmoothingEnabled = false;

      ctx.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
      );

      if (mode === "normal") {

        resolve(canvas.toDataURL("image/png"));

        return;
      }


      const imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const data = imageData.data;


      for (let i = 0; i < data.length; i += 4) {

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        let gray =
          0.299 * r +
          0.587 * g +
          0.114 * b;


        if (mode === "contrast") {

          gray =
            ((gray - 128) * 1.7) + 128;

        }


        if (mode === "threshold") {

          gray =
            gray < 175 ? 0 : 255;

        }


        if (mode === "adaptive") {

          gray =
            gray < 145 ? 0 : 255;

        }


        gray =
          Math.max(0, Math.min(255, gray));


        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }


      ctx.putImageData(imageData, 0, 0);

      resolve(canvas.toDataURL("image/png"));
    };


    img.onerror = reject;

    img.src = dataURL;

  });
}


/* ================================
   NUMBER EXTRACTION
================================ */

function extractNumbers(text) {

  const normalized = text
    .replace(/O/gi, "0")
    .replace(/[|Il]/g, "1")
    .replace(/[Ss]/g, "5");


  const matches =
    normalized.match(
      /[-+]?\d+(?:[.,]\d+)?/g
    );


  if (!matches) {
    return [];
  }


  return matches
    .map(value =>
      value
        .replace(",", ".")
        .trim()
    )
    .map(Number)
    .filter(value =>
      Number.isFinite(value)
    );
}


/* ================================
   TOTAL
================================ */

function calculateTotal(numbers) {

  return numbers.reduce(
    (total, number) => total + number,
    0
  );
}


/* ================================
   OCR RESULT
================================ */

function showOCRResult(
  text,
  numbers,
  total
) {

  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");


  const numberRows = numbers.length

    ? numbers.map((number, index) => {

        return `
          <div class="number-row">
            <span>${index + 1}</span>

            <input
              class="detected-number"
              type="number"
              step="any"
              value="${number}"
            >
          </div>
        `;

      }).join("")

    : `
      <p>
        कोई स्पष्ट संख्या नहीं मिली।
      </p>
    `;


  resultContent.innerHTML = `

    <div class="ocr-result">

      <h3>🔤 पहचाया गया टेक्स्ट</h3>

      <div class="ocr-text">
        ${escapedText || "कोई टेक्स्ट नहीं मिला।"}
      </div>


      <h3>🔢 पहचाने गए अंक</h3>

      <div id="numberList">
        ${numberRows}
      </div>


      <div class="total-box">

        <span>कुल</span>

        <strong id="calculatedTotal">
          ${total}
        </strong>

      </div>


      <button
        id="recalculateButton"
        class="primary"
      >
        🧮 दोबारा हिसाब करें
      </button>


      <div class="ocr-note">

        ⚠️ OCR परिणाम को अंतिम मानने से पहले
        अंकों की जाँच करें।

      </div>

    </div>
  `;


  document
    .getElementById("recalculateButton")
    .addEventListener(
      "click",
      recalculate
    );
}


/* ================================
   RECALCULATE
================================ */

function recalculate() {

  const inputs =
    document.querySelectorAll(
      ".detected-number"
    );


  let total = 0;


  inputs.forEach(input => {

    const value =
      Number(input.value);

    if (Number.isFinite(value)) {
      total += value;
    }
  });


  document.getElementById(
    "calculatedTotal"
  ).textContent = total;
}


/* ================================
   OCR LANGUAGE
================================ */

function getOCRLanguage() {

  const selected =
    languageSelect.value;

  if (selected === "hi") {
    return "hin";
  }

  return "eng";
}


/* ================================
   RUN ONE OCR
================================ */

async function runOneOCR(
  image,
  language,
  label
) {

  const result =
    await Tesseract.recognize(
      image,
      language,
      {

        logger: message => {

          const status =
            document.getElementById(
              "ocrStatus"
            );

          const progress =
            document.getElementById(
              "ocrProgress"
            );

          const percent =
            document.getElementById(
              "ocrPercent"
            );


          if (status && message.status) {

            status.textContent =
              `${label}: ${message.status}`;
          }


          if (
            progress &&
            typeof message.progress === "number"
          ) {

            const value =
              Math.round(
                message.progress * 100
              );

            progress.style.width =
              `${value}%`;

            percent.textContent =
              `${value}%`;
          }
        }
      }
    );


  return result;
}


/* ================================
   REAL OCR PIPELINE
================================ */

async function runOCR() {

  if (!selectedFile) {

    alert(
      "पहले पर्ची की फोटो चुनें।"
    );

    return;
  }


  if (
    typeof Tesseract ===
    "undefined"
  ) {

    alert(
      "OCR Engine लोड नहीं हुआ। पेज Refresh करके फिर प्रयास करें।"
    );

    return;
  }


  scanButton.disabled = true;

  scanButton.textContent =
    "⏳ AI OCR चल रहा है...";


  resultSection.classList.remove(
    "hidden"
  );


  resultContent.innerHTML = `

    <div class="ocr-loading">

      <h3>
        🔍 पर्ची को समझा जा रहा है...
      </h3>

      <p id="ocrStatus">
        फोटो तैयार की जा रही है...
      </p>

      <div class="progress-box">

        <div
          id="ocrProgress"
          class="progress-bar"
          style="width:0%"
        ></div>

      </div>

      <p id="ocrPercent">
        0%
      </p>

    </div>
  `;


  try {

    const original =
      await fileToDataURL(
        selectedFile
      );


    const normal =
      await preprocessImage(
        original,
        "normal"
      );


    const contrast =
      await preprocessImage(
        original,
        "contrast"
      );


    const threshold =
      await preprocessImage(
        original,
        "threshold"
      );


    const adaptive =
      await preprocessImage(
        original,
        "adaptive"
      );


    const language =
      getOCRLanguage();


    const results = [];


    results.push(
      await runOneOCR(
        normal,
        language,
        "Original"
      )
    );


    results.push(
      await runOneOCR(
        contrast,
        language,
        "Contrast"
      )
    );


    results.push(
      await runOneOCR(
        threshold,
        language,
        "Threshold"
      )
    );


    results.push(
      await runOneOCR(
        adaptive,
        language,
        "Clean"
      )
    );


    /*
      फिलहाल सबसे ज्यादा recognized
      text वाला परिणाम चुना जा रहा है।
    */

    results.sort(
      (a, b) =>
        (b.data.text || "").length -
        (a.data.text || "").length
    );


    const best =
      results[0];


    const text =
      best.data.text || "";


    const numbers =
      extractNumbers(text);


    const total =
      calculateTotal(numbers);


    showOCRResult(
      text,
      numbers,
      total
    );


    resultSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });


  } catch (error) {

    console.error(
      "OCR Error:",
      error
    );


    resultContent.innerHTML = `

      <div class="ocr-error">

        <h3>
          ❌ OCR में समस्या हुई
        </h3>

        <p>
          फोटो को पढ़ा नहीं जा सका।
          कृपया साफ फोटो से फिर प्रयास करें।
        </p>

      </div>
    `;

  } finally {

    scanButton.disabled = false;

    scanButton.textContent =
      "🔍 पर्ची पढ़ें";
  }
}


/* ================================
   SCAN BUTTON
================================ */

scanButton.addEventListener(
  "click",
  runOCR
);
