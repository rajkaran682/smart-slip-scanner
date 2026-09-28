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


/* --------------------------------
   Image Selection
-------------------------------- */

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


/* Camera */

cameraInput.addEventListener("change", function () {

  handleImage(this.files[0]);

});


/* Gallery */

fileInput.addEventListener("change", function () {

  handleImage(this.files[0]);

});


/* --------------------------------
   Remove Image
-------------------------------- */

removeImage.addEventListener("click", function () {

  selectedFile = null;

  previewImage.src = "";

  previewBox.classList.add("hidden");

  resultSection.classList.add("hidden");

  resultContent.innerHTML = "";

  cameraInput.value = "";

  fileInput.value = "";

});


/* --------------------------------
   Convert File To Data URL
-------------------------------- */

function fileToDataURL(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = reject;

    reader.readAsDataURL(file);

  });

}


/* --------------------------------
   Number Extraction
-------------------------------- */

function extractNumbers(text) {

  const matches = text.match(
    /[-+]?\d+(?:[.,]\d+)?/g
  );

  if (!matches) {
    return [];
  }

  return matches
    .map(value => value.replace(",", "."))
    .map(value => Number(value))
    .filter(value => Number.isFinite(value));

}


/* --------------------------------
   Calculate Total
-------------------------------- */

function calculateTotal(numbers) {

  return numbers.reduce(
    (total, number) => total + number,
    0
  );

}


/* --------------------------------
   Show OCR Result
-------------------------------- */

function showOCRResult(text, numbers, total) {

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

        ⚠️ हस्तलिखित पर्ची में OCR की गलती हो सकती है।
        अंतिम हिसाब से पहले पहचाने गए अंकों को जाँचें।

      </div>

    </div>

  `;


  const recalculateButton =
    document.getElementById("recalculateButton");


  recalculateButton.addEventListener(
    "click",
    recalculate
  );

}


/* --------------------------------
   Recalculate Edited Numbers
-------------------------------- */

function recalculate() {

  const inputs =
    document.querySelectorAll(
      ".detected-number"
    );

  let total = 0;

  inputs.forEach(input => {

    const value = Number(input.value);

    if (Number.isFinite(value)) {
      total += value;
    }

  });


  document.getElementById(
    "calculatedTotal"
  ).textContent = total;

}


/* --------------------------------
   OCR Language
-------------------------------- */

function getOCRLanguage() {

  const selected =
    languageSelect.value;

  /*
    Tesseract language files are loaded
    separately by language.

    We start with English because
    number recognition is important
    for the first OCR stage.

    More multilingual models will be
    added in the next stages.
  */

  if (selected === "en") {
    return "eng";
  }

  return "eng";

}


/* --------------------------------
   Real OCR
-------------------------------- */

async function runOCR() {

  if (!selectedFile) {

    alert("पहले पर्ची की फोटो चुनें।");

    return;

  }


  if (
    typeof Tesseract === "undefined"
  ) {

    alert(
      "OCR Engine अभी लोड नहीं हुआ। कृपया पेज को Refresh करके फिर प्रयास करें।"
    );

    return;

  }


  scanButton.disabled = true;

  scanButton.textContent =
    "⏳ पर्ची पढ़ी जा रही है...";


  resultSection.classList.remove(
    "hidden"
  );


  resultContent.innerHTML = `

    <div class="ocr-loading">

      <h3>🔍 AI OCR चल रहा है...</h3>

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

    const image =
      await fileToDataURL(selectedFile);


    const language =
      getOCRLanguage();


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


            if (
              message.status
            ) {

              status.textContent =
                message.status;

            }


            if (
              typeof message.progress ===
              "number"
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


    const text =
      result.data.text || "";


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

        <h3>❌ OCR में समस्या हुई</h3>

        <p>
          फोटो को पढ़ा नहीं जा सका।
          कृपया साफ और अच्छी रोशनी वाली
          फोटो से फिर प्रयास करें।
        </p>

      </div>

    `;

  } finally {

    scanButton.disabled = false;

    scanButton.textContent =
      "🔍 पर्ची पढ़ें";

  }

}


/* --------------------------------
   Scan Button
-------------------------------- */

scanButton.addEventListener(
  "click",
  runOCR
);
