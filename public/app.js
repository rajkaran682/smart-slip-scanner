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
   IMAGE
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


cameraInput.addEventListener(
  "change",
  function () {
    handleImage(this.files[0]);
  }
);


fileInput.addEventListener(
  "change",
  function () {
    handleImage(this.files[0]);
  }
);


/* =========================================
   REMOVE
========================================= */

removeImage.addEventListener(
  "click",
  function () {

    selectedFile = null;

    previewImage.src = "";

    previewBox.classList.add("hidden");

    resultSection.classList.add("hidden");

    resultContent.innerHTML = "";

    cameraInput.value = "";
    fileInput.value = "";

  }
);


/* =========================================
   FILE → DATA URL
========================================= */

function fileToDataURL(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () => resolve(reader.result);

      reader.onerror =
        reject;

      reader.readAsDataURL(file);

    }
  );
}


/* =========================================
   IMAGE PREPROCESSING
========================================= */

function preprocessImage(
  dataURL,
  mode = "normal"
) {

  return new Promise(
    (resolve, reject) => {

      const img =
        new Image();

      img.onload =
        function () {

          const maxWidth = 1800;
          const maxHeight = 2400;

          let width = img.width;
          let height = img.height;

          const ratio =
            Math.min(
              maxWidth / width,
              maxHeight / height,
              1
            );

          width =
            Math.round(
              width * ratio
            );

          height =
            Math.round(
              height * ratio
            );


          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = width;
          canvas.height = height;


          const ctx =
            canvas.getContext(
              "2d",
              {
                willReadFrequently: true
              }
            );


          ctx.drawImage(
            img,
            0,
            0,
            width,
            height
          );


          if (
            mode === "normal"
          ) {

            resolve(
              canvas.toDataURL(
                "image/png"
              )
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


            if (
              mode === "contrast"
            ) {

              gray =
                ((gray - 128) * 1.45)
                + 128;
            }


            if (
              mode === "clean"
            ) {

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
            canvas.toDataURL(
              "image/png"
            )
          );

        };


      img.onerror = reject;

      img.src = dataURL;

    }
  );
}


/* =========================================
   LANGUAGE
========================================= */

function getOCRLanguage() {

  const selected =
    languageSelect.value;


  /*
   * हिंदी
   */

  if (
    selected === "hi"
  ) {

    return "hin";
  }


  /*
   * English
   */

  if (
    selected === "en"
  ) {

    return "eng";
  }


  /*
   * Hindi + English
   *
   * Tesseract.js में दोनों traineddata
   * उपलब्ध होने पर संयुक्त OCR।
   */

  if (
    selected === "mixed" ||
    selected === "auto"
  ) {

    return "eng+hin";
  }


  return "eng+hin";
}


/* =========================================
   STATUS
========================================= */

function updateStatus(
  message,
  progress
) {

  const status =
    document.getElementById(
      "ocrStatus"
    );

  const progressBar =
    document.getElementById(
      "ocrProgress"
    );

  const percent =
    document.getElementById(
      "ocrPercent"
    );


  if (status) {
    status.textContent =
      message;
  }


  if (
    progressBar &&
    typeof progress === "number"
  ) {

    progressBar.style.width =
      `${progress}%`;
  }


  if (percent) {

    percent.textContent =
      `${Math.round(progress)}%`;
  }
}


/* =========================================
   LOCAL TESSERACT OCR
========================================= */

async function runTesseractOCR(
  image,
  language,
  label
) {

  return await Tesseract.recognize(
    image,
    language,
    {

      logger: message => {

        if (
          typeof message.progress ===
          "number"
        ) {

          updateStatus(
            `${label}: ${
              message.status ||
              "पढ़ा जा रहा है..."
            }`,
            message.progress * 100
          );
        }

      }

    }
  );
}


/* =========================================
   TRY DEDICATED AI
========================================= */

async function runHandwritingAI(
  image,
  language
) {

  try {

    const response =
      await fetch(
        "/api/ocr/handwriting",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            image,

            language

          })

        }
      );


    if (!response.ok) {

      return null;
    }


    const data =
      await response.json();


    if (
      !data.success ||
      !data.data
    ) {

      return null;
    }


    return data;

  } catch (error) {

    console.log(
      "Dedicated handwriting AI unavailable."
    );

    return null;
  }
}


/* =========================================
   CLEAN TEXT
========================================= */

function cleanText(text) {

  return (text || "")

    .replace(/\r/g, "")

    .replace(
      /[ \t]+/g,
      " "
    )

    .replace(
      /\n{3,}/g,
      "\n\n"
    )

    .trim();
}


/* =========================================
   NUMBER EXTRACTION
========================================= */

function extractNumbers(text) {

  if (!text) {
    return [];
  }


  const matches =
    text.match(
      /[-+]?\d+(?:[.,]\d+)?/g
    );


  if (!matches) {
    return [];
  }


  const values = [];


  matches.forEach(
    raw => {

      let cleaned =
        raw
          .replace(/,/g, ".")
          .replace(
            /[^\d.-]/g,
            ""
          );


      const value =
        Number(cleaned);


      if (
        Number.isFinite(value) &&
        Math.abs(value) <= 100000
      ) {

        values.push(value);
      }

    }
  );


  return values;
}


/* =========================================
   DISPLAY RESULT
========================================= */

function showResult(
  text,
  confidence,
  numbers,
  engine
) {

  const safeText =
    (text || "")
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      );


  const rows =
    numbers.length

      ? numbers
          .slice(0, 30)
          .map(
            (number, index) => {

              return `

                <div
                  class="number-row"
                >

                  <span>
                    ${index + 1}
                  </span>

                  <input
                    class="detected-number"
                    type="number"
                    step="any"
                    value="${number}"
                  >

                </div>

              `;

            }
          )
          .join("")

      : `

          <p>
            कोई स्पष्ट अंक नहीं मिला।
          </p>

        `;


  resultContent.innerHTML = `

    <div class="ocr-result">

      <h3>
        🔤 पहचाया गया टेक्स्ट
      </h3>

      <div
        class="ocr-text"
        contenteditable="true"
        id="editableOCRText"
      >
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


      <div class="confidence-box">

        <strong>
          OCR Engine:
        </strong>

        ${engine}

      </div>


      <h3>
        🔢 संभावित अंक
      </h3>

      <p class="ocr-help">

        OCR से मिले अंकों को जाँचें।
        गलत अंक को आप सीधे बदल सकते हैं।

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

        ⚠️ कम confidence वाले OCR परिणाम
        को अंतिम सत्य न मानें।

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


  inputs.forEach(
    input => {

      const value =
        Number(input.value);


      if (
        Number.isFinite(value)
      ) {

        total += value;
      }

    }
  );


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
   MAIN SCAN
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
    "⏳ AI OCR चल रहा है...";


  resultSection.classList.remove(
    "hidden"
  );


  resultContent.innerHTML = `

    <div class="ocr-loading">

      <h3>
        🔍 पर्ची को पढ़ा जा रहा है...
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

    updateStatus(
      "फोटो तैयार की जा रही है...",
      2
    );


    const original =
      await fileToDataURL(
        selectedFile
      );


    const language =
      getOCRLanguage();


    /*
     * पहले dedicated handwriting
     * endpoint को मौका देंगे।
     */

    updateStatus(
      "Handwriting AI जाँचा जा रहा है...",
      5
    );


    const aiResult =
      await runHandwritingAI(
        original,
        language
      );


    if (aiResult) {

      const data =
        aiResult.data;


      const text =
        cleanText(
          data.text ||
          data.result ||
          ""
        );


      const confidence =
        Number(
          data.confidence ||
          0
        );


      const numbers =
        Array.isArray(
          data.numbers
        )
          ? data.numbers
          : extractNumbers(text);


      showResult(
        text,
        confidence,
        numbers,
        "Dedicated Handwriting AI"
      );


      return;
    }


    /*
     * Dedicated AI उपलब्ध नहीं है,
     * इसलिए local Tesseract fallback।
     */

    updateStatus(
      "Local Hindi + English OCR चल रहा है...",
      10
    );


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


    const result =
      await runTesseractOCR(
        normal,
        language,
        "Original"
      );


    updateStatus(
      "दूसरी साफ image से जाँच...",
      55
    );


    const result2 =
      await runTesseractOCR(
        clean,
        language,
        "Clean"
      );


    const confidence1 =
      Number(
        result?.data?.confidence || 0
      );


    const confidence2 =
      Number(
        result2?.data?.confidence || 0
      );


    const best =
      confidence2 > confidence1
        ? result2
        : result;


    const text =
      cleanText(
        best?.data?.text || ""
      );


    const confidence =
      Number(
        best?.data?.confidence || 0
      );


    const numbers =
      extractNumbers(text);


    updateStatus(
      "परिणाम तैयार किया जा रहा है...",
      100
    );


    showResult(
      text,
      confidence,
      numbers,
      "Local Tesseract"
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
          कृपया फिर प्रयास करें।
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
   BUTTON
========================================= */

scanButton.addEventListener(
  "click",
  runOCR
);
