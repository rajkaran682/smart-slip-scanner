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


/* =========================================
   IMAGE SELECTION
========================================= */

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


/* =========================================
   REMOVE IMAGE
========================================= */

removeImage.addEventListener("click", function () {

  selectedFile = null;

  previewImage.src = "";

  previewBox.classList.add("hidden");

  resultSection.classList.add("hidden");

  resultContent.innerHTML = "";

  cameraInput.value = "";
  fileInput.value = "";
});


/* =========================================
   FILE → DATA URL
========================================= */

function fileToDataURL(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}


/* =========================================
   IMAGE PREPROCESSING
========================================= */

function preprocessImage(dataURL, mode = "normal") {

  return new Promise((resolve, reject) => {

    const img = new Image();

    img.onload = function () {

      /*
       * बहुत बड़े फोटो को सीमित करते हैं।
       * इससे मोबाइल पर browser crash होने की संभावना कम होगी।
       */

      const maxWidth = 1800;
      const maxHeight = 2400;

      let width = img.width;
      let height = img.height;

      const ratio = Math.min(
        maxWidth / width,
        maxHeight / height,
        1
      );

      width = Math.round(width * ratio);
      height = Math.round(height * ratio);


      const canvas =
        document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;


      const ctx =
        canvas.getContext("2d", {
          willReadFrequently: true
        });


      ctx.imageSmoothingEnabled = true;

      ctx.drawImage(
        img,
        0,
        0,
        width,
        height
      );


      if (mode === "normal") {

        resolve(
          canvas.toDataURL("image/png")
        );

        return;
      }


      const imageData =
        ctx.getImageData(
          0,
          0,
          width,
          height
        );


      const data =
        imageData.data;


      for (
        let i = 0;
        i < data.length;
        i += 4
      ) {

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];


        let gray =
          0.299 * r +
          0.587 * g +
          0.114 * b;


        /*
         * Contrast
         */

        if (mode === "contrast") {

          gray =
            ((gray - 128) * 1.45) + 128;
        }


        /*
         * Threshold
         */

        if (mode === "threshold") {

          gray =
            gray < 165
              ? 0
              : 255;
        }


        /*
         * Clean
         */

        if (mode === "clean") {

          gray =
            gray < 185
              ? 0
              : 255;
        }


        gray =
          Math.max(
            0,
            Math.min(
              255,
              gray
            )
          );


        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }


      ctx.putImageData(
        imageData,
        0,
        0
      );


      resolve(
        canvas.toDataURL("image/png")
      );

    };


    img.onerror = reject;

    img.src = dataURL;

  });
}


/* =========================================
   OCR LANGUAGE
========================================= */

function getOCRLanguage() {

  const selected =
    languageSelect.value;


  /*
   * अभी Tesseract में Hindi और English
   * उपलब्ध हैं।
   *
   * Mixed/Auto के लिए English fallback
   * रखा गया है।
   *
   * आगे dedicated multilingual
   * handwriting engine लगाया जाएगा।
   */

  if (selected === "hi") {
    return "hin";
  }


  return "eng";
}


/* =========================================
   OCR STATUS
========================================= */

function updateOCRStatus(
  text,
  percent
) {

  const status =
    document.getElementById(
      "ocrStatus"
    );

  const progress =
    document.getElementById(
      "ocrProgress"
    );

  const percentText =
    document.getElementById(
      "ocrPercent"
    );


  if (status) {
    status.textContent = text;
  }


  if (
    progress &&
    typeof percent === "number"
  ) {

    progress.style.width =
      `${percent}%`;
  }


  if (percentText) {

    percentText.textContent =
      `${Math.round(percent)}%`;
  }
}


/* =========================================
   RUN OCR
========================================= */

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

          if (
            typeof message.progress ===
            "number"
          ) {

            updateOCRStatus(
              `${label}: ${message.status || "पढ़ा जा रहा है..."}`,
              message.progress * 100
            );
          }
        }

      }
    );


  return result;
}


/* =========================================
   TEXT CLEANING
========================================= */

function cleanOCRText(text) {

  if (!text) {
    return "";
  }


  return text

    .replace(/\r/g, "")

    /*
     * बहुत ज्यादा spaces हटाएँ
     */

    .replace(/[ \t]+/g, " ")

    /*
     * बहुत सारी खाली lines कम करें
     */

    .replace(/\n{3,}/g, "\n\n")

    .trim();
}


/* =========================================
   SPLIT OCR INTO LINES
========================================= */

function splitIntoLines(text) {

  return cleanOCRText(text)

    .split("\n")

    .map(line =>
      line.trim()
    )

    .filter(line =>
      line.length > 0
    );
}


/* =========================================
   NUMBER NORMALIZATION
========================================= */

function normalizeNumber(value) {

  if (!value) {
    return null;
  }


  let number =
    value
      .replace(/[Oo]/g, "0")
      .replace(/[Il|]/g, "1")
      .replace(/[Ss]/g, "5")
      .replace(/[Bb]/g, "8")
      .replace(/,/g, ".")
      .replace(/[^\d.-]/g, "");


  /*
   * शुरुआत में अकेला minus हो
   * तो हटाएँ।
   */

  number =
    number.replace(
      /^(?!-)\D+/,
      ""
    );


  const parsed =
    Number(number);


  if (
    !Number.isFinite(parsed)
  ) {

    return null;
  }


  /*
   * बहुत बड़े OCR numbers अक्सर
   * noise होते हैं।
   */

  if (
    Math.abs(parsed) > 100000
  ) {

    return null;
  }


  return parsed;
}


/* =========================================
   FIND NUMBER-LIKE VALUES IN ONE LINE
========================================= */

function extractNumbersFromLine(line) {

  if (!line) {
    return [];
  }


  /*
   * केवल ऐसे groups पकड़ें जिनमें
   * digit मौजूद हो।
   *
   * अकेले punctuation को number
   * नहीं मानेंगे।
   */

  const matches =
    line.match(
      /[-+]?\d+(?:[.,]\d+)?/g
    );


  if (!matches) {
    return [];
  }


  const numbers = [];


  matches.forEach(raw => {

    const value =
      normalizeNumber(raw);


    if (
      value === null
    ) {
      return;
    }


    /*
     * एक digit वाला 0/1/5
     * handwriting OCR में बहुत बार
     * noise बन जाता है।
     *
     * लेकिन यदि line में text कम है
     * तो उसे पूरी तरह reject नहीं करेंगे।
     */

    numbers.push({
      raw,
      value
    });

  });


  return numbers;
}


/* =========================================
   CHECK WHETHER LINE LOOKS LIKE A PRICE
========================================= */

function looksLikeAmountLine(line) {

  if (!line) {
    return false;
  }


  const lower =
    line.toLowerCase();


  /*
   * आम amount keywords
   */

  const amountWords = [
    "total",
    "amount",
    "price",
    "rate",
    "rs",
    "₹",
    "rup",
    "qty",
    "quantity",
    "item",
    "pcs",
    "piece",
    "kg",
    "gm",
    "litre",
    "liter",
    "cost",
    "sum",
    "योग",
    "कुल",
    "रकम",
    "भाव",
    "दाम",
    "कीमत",
    "मात्रा"
  ];


  for (
    const word of amountWords
  ) {

    if (
      lower.includes(word)
    ) {

      return true;
    }
  }


  /*
   * अगर line में number है और
   * line छोटी है तो यह slip का
   * amount/quantity line हो सकता है।
   */

  const numbers =
    extractNumbersFromLine(line);


  if (
    numbers.length > 0 &&
    line.length <= 45
  ) {

    return true;
  }


  return false;
}


/* =========================================
   BUILD CANDIDATE AMOUNTS
========================================= */

function buildAmountCandidates(
  text,
  confidence
) {

  const lines =
    splitIntoLines(text);


  const candidates = [];


  lines.forEach(
    (line, lineIndex) => {

      const numbers =
        extractNumbersFromLine(
          line
        );


      if (
        numbers.length === 0
      ) {

        return;
      }


      const isAmountLine =
        looksLikeAmountLine(
          line
        );


      /*
       * बहुत लंबी OCR line में
       * मिलने वाले सारे numbers को
       * amount नहीं मानेंगे।
       */

      if (
        !isAmountLine &&
        line.length > 70
      ) {

        return;
      }


      numbers.forEach(
        (item, numberIndex) => {

          /*
           * अकेले 0 को सामान्य OCR noise
           * मानने की संभावना अधिक है।
           */

          if (
            item.value === 0 &&
            numbers.length === 1 &&
            line.length < 8
          ) {

            return;
          }


          candidates.push({

            id:
              `amount-${lineIndex}-${numberIndex}`,

            value:
              item.value,

            raw:
              item.raw,

            line:
              line,

            confidence:
              Number.isFinite(confidence)
                ? Math.round(confidence)
                : 0

          });

        }
      );

    }
  );


  return candidates;
}


/* =========================================
   REMOVE DUPLICATES
========================================= */

function removeDuplicateCandidates(
  candidates
) {

  const unique = [];

  const seen = new Set();


  candidates.forEach(item => {

    const key =
      `${item.value}|${item.line}`;


    if (
      seen.has(key)
    ) {

      return;
    }


    seen.add(key);

    unique.push(item);
  });


  return unique;
}


/* =========================================
   DISPLAY OCR RESULT
========================================= */

function showOCRResult(
  text,
  candidates,
  confidence
) {

  const safeText =
    (text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");


  const rows =
    candidates.length

      ? candidates
          .map(
            (item, index) => {

              const warning =
                item.confidence < 55
                  ? "low-confidence"
                  : "";


              return `

                <div
                  class="number-row ${warning}"
                >

                  <span>
                    ${index + 1}
                  </span>

                  <input
                    class="detected-number"
                    type="number"
                    step="any"
                    value="${item.value}"
                  >

                  <small>
                    ${item.confidence}%
                  </small>

                </div>

              `;
            }
          )
          .join("")

      : `

          <p>
            अभी कोई भरोसेमंद रकम नहीं मिली।
          </p>

        `;


  resultContent.innerHTML = `

    <div class="ocr-result">

      <h3>
        🔤 पहचाया गया टेक्स्ट
      </h3>

      <div class="ocr-text">
        ${
          safeText ||
          "कोई टेक्स्ट नहीं मिला।"
        }
      </div>


      <div class="confidence-box">

        <strong>
          OCR Confidence:
        </strong>

        ${Math.round(confidence)}%

      </div>


      <h3>
        💰 संभावित रकम / अंक
      </h3>


      <p class="ocr-help">

        केवल OCR से संभावित रकम दिखाई गई हैं।
        कृपया गलत अंक सुधारें और फिर Total देखें।

      </p>


      <div id="numberList">

        ${rows}

      </div>


      <div class="total-box">

        <span>
          कुल
        </span>

        <strong id="calculatedTotal">
          0
        </strong>

      </div>


      <button
        id="recalculateButton"
        class="primary"
      >
        🧮 दोबारा हिसाब करें
      </button>


      <div class="ocr-note">

        ⚠️ यह handwriting OCR है।
        OCR को अंतिम सत्य न मानें।
        कम confidence वाले अंकों की जाँच करें।

      </div>

    </div>

  `;


  document
    .getElementById(
      "recalculateButton"
    )
    .addEventListener(
      "click",
      recalculate
    );


  /*
   * शुरुआत में भी total calculate करें।
   */

  recalculate();
}


/* =========================================
   RECALCULATE
========================================= */

function recalculate() {

  const inputs =
    document.querySelectorAll(
      ".detected-number"
    );


  let total = 0;


  inputs.forEach(input => {

    const value =
      Number(input.value);


    if (
      Number.isFinite(value)
    ) {

      total += value;
    }

  });


  const totalElement =
    document.getElementById(
      "calculatedTotal"
    );


  if (totalElement) {

    totalElement.textContent =
      Number.isInteger(total)
        ? total
        : total.toFixed(2);
  }
}


/* =========================================
   MAIN OCR PIPELINE
========================================= */

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
    "⏳ पर्ची समझी जा रही है...";


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

    updateOCRStatus(
      "फोटो तैयार की जा रही है...",
      2
    );


    const original =
      await fileToDataURL(
        selectedFile
      );


    /*
     * अभी केवल 2 useful variants
     * रखे गए हैं।
     *
     * इससे mobile पर OCR का load
     * कम होगा।
     */

    const normal =
      await preprocessImage(
        original,
        "normal"
      );


    const clean =
      await preprocessImage(
        original,
        "clean"
      );


    const language =
      getOCRLanguage();


    updateOCRStatus(
      "पहला OCR चल रहा है...",
      5
    );


    const first =
      await runOneOCR(
        normal,
        language,
        "Original"
      );


    updateOCRStatus(
      "दूसरा OCR चल रहा है...",
      50
    );


    const second =
      await runOneOCR(
        clean,
        language,
        "Clean"
      );


    /*
     * दोनों परिणामों में से
     * बेहतर confidence चुनें।
     */

    const firstConfidence =
      Number(
        first?.data?.confidence || 0
      );


    const secondConfidence =
      Number(
        second?.data?.confidence || 0
      );


    const best =
      secondConfidence >
      firstConfidence
        ? second
        : first;


    const text =
      cleanOCRText(
        best?.data?.text || ""
      );


    const confidence =
      Number(
        best?.data?.confidence || 0
      );


    updateOCRStatus(
      "OCR परिणाम व्यवस्थित किया जा रहा है...",
      92
    );


    /*
     * अब पूरे OCR text के हर digit को
     * जोड़ने के बजाय line-based candidates
     * बनाए जाते हैं।
     */

    let candidates =
      buildAmountCandidates(
        text,
        confidence
      );


    candidates =
      removeDuplicateCandidates(
        candidates
      );


    /*
     * अधिकतम 30 candidates ही दिखाएँ।
     *
     * यह सुरक्षा है ताकि OCR noise से
     * सैकड़ों numbers की सूची न बने।
     */

    candidates =
      candidates.slice(
        0,
        30
      );


    updateOCRStatus(
      "परिणाम तैयार है...",
      100
    );


    showOCRResult(
      text,
      candidates,
      confidence
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
          पर्ची को पढ़ा नहीं जा सका।
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


/* =========================================
   SCAN BUTTON
========================================= */

scanButton.addEventListener(
  "click",
  runOCR
);
