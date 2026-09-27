const cameraInput = document.getElementById("cameraInput");
const fileInput = document.getElementById("fileInput");

const previewBox = document.getElementById("previewBox");
const previewImage = document.getElementById("previewImage");

const removeImage = document.getElementById("removeImage");
const scanButton = document.getElementById("scanButton");

const resultSection = document.getElementById("resultSection");
const resultContent = document.getElementById("resultContent");

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

  const file = this.files[0];

  handleImage(file);

});


/* Gallery */

fileInput.addEventListener("change", function () {

  const file = this.files[0];

  handleImage(file);

});


/* --------------------------------
   Remove Image
-------------------------------- */

removeImage.addEventListener("click", function () {

  selectedFile = null;

  previewImage.src = "";

  previewBox.classList.add("hidden");

  cameraInput.value = "";

  fileInput.value = "";

  resultSection.classList.add("hidden");

  resultContent.innerHTML = "";

});


/* --------------------------------
   Scan Button
-------------------------------- */

scanButton.addEventListener("click", async function () {

  if (!selectedFile) {

    alert("पहले पर्ची की फोटो चुनें।");

    return;
  }

  scanButton.disabled = true;

  scanButton.textContent = "⏳ फोटो तैयार हो रही है...";

  try {

    /*
      अभी वास्तविक AI OCR अगले चरण में जोड़ा जाएगा।
      फिलहाल selected image को scanner pipeline
      के लिए तैयार किया जा रहा है।
    */

    await new Promise(resolve => setTimeout(resolve, 700));

    resultSection.classList.remove("hidden");

    resultContent.innerHTML = `
      <div class="scan-message">

        <h3>📷 फोटो सफलतापूर्वक प्राप्त हुई</h3>

        <p>
          अब अगला चरण इस फोटो से handwritten
          text, numbers और language पहचानने का होगा।
        </p>

        <div class="scan-status">
          <div>🖼️ Image: तैयार</div>
          <div>🌐 Language: Auto Detect</div>
          <div>✍️ Handwriting: AI processing के लिए तैयार</div>
          <div>🧮 Calculation: अगले चरण में</div>
        </div>

      </div>
    `;

    resultSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {

    console.error(error);

    alert("फोटो तैयार करते समय समस्या हुई।");

  } finally {

    scanButton.disabled = false;

    scanButton.textContent = "🔍 पर्ची पढ़ें";

  }

});
